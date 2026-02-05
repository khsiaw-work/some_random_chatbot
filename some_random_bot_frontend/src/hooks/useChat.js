import { useState, useRef } from 'react';
import { CHAT_CONFIG } from '../config';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("");
  const abortControllerRef = useRef(null);

  // --- STATE HELPERS ---

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  // ... (Your existing prepareRequest, fetchStream, etc.) ...

  // --- NEW FUNCTION ---
  const loadSession = (history) => {
    // Stop any ongoing generation first
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setCurrentStatus("");
    setMessages(history);
  };
  const clearChat = () => {
      loadSession([]);
  };

  const updateLastMessage = (content) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const lastMsg = newMessages[newMessages.length - 1];
      if (lastMsg) lastMsg.content = content;
      return newMessages;
    });
  };

  // --- CORE FUNCTIONS ---

  // 1. PREPARE: Adds user message and resets state
  const prepareRequest = (input) => {
    addMessage(CHAT_CONFIG.ROLES.USER, input);
    setIsLoading(true);
    setCurrentStatus("Initializing...");

    // Create new controller
    const controller = new AbortController();
    abortControllerRef.current = controller;
    return controller;
  };

  // 2. FETCH: Performs the API call
  const fetchStream = async (input, controller) => {
    return fetch(CHAT_CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
      signal: controller.signal
    });
  };

  /**
   * 3. PARSE SIGNAL: Decides action based on event type
   * Returns object with updated text and bubble status
   */
  const handleStreamSignal = (data, currentFullText, isBubbleCreated) => {
    let newText = currentFullText;
    let newIsBubbleCreated = isBubbleCreated;

    switch (data.type) {
      case "status":
        setCurrentStatus(data.text);
        break;

      case "content": {
        setCurrentStatus("Writing..."); // Optional: Keep or remove status when writing
        const safeChunk = data.text || "";
        newText = currentFullText + safeChunk;

        // CHECK: Do we need to create the bubble first?
        if (!newIsBubbleCreated) {
          addMessage(CHAT_CONFIG.ROLES.ASSISTANT, newText);
          newIsBubbleCreated = true;
        } else {
          updateLastMessage(newText);
        }
        break;
      }

      case "done":
        setIsLoading(false);
        setCurrentStatus("");
        break;

      case "error":
        console.error("Backend Error:", data.text);
        // If error happens before content, we might want to show it in a bubble
        if (!newIsBubbleCreated) {
           addMessage(CHAT_CONFIG.ROLES.ASSISTANT, `Error: ${data.text}`);
           newIsBubbleCreated = true;
        }
        break;

      default:
        break;
    }

    return { newText, newIsBubbleCreated };
  };

  /**
   * 4. PROCESS: Reads the stream and dispatches signals
   */
  const processStream = async (response) => {
    // REMOVED: addMessage call here. We wait for content now.

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let fullResponse = "";
    let isBubbleCreated = false; // <--- Track state locally in the loop

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.replace("data: ", "");
          try {
            const data = JSON.parse(jsonStr);

            // Pass the current state into the handler
            const result = handleStreamSignal(data, fullResponse, isBubbleCreated);

            // Update local state from the result
            fullResponse = result.newText;
            isBubbleCreated = result.newIsBubbleCreated;

          } catch (e) {
            console.error("JSON Parse error", e);
          }
        }
      }
    }
  };

  /**
   * 5. ERROR HANDLER
   */
  const handleError = (error) => {
    if (error.name === 'AbortError') {
      console.log("Fetch aborted by user");
    } else {
      console.error("Connection error:", error);
      addMessage(CHAT_CONFIG.ROLES.ASSISTANT, CHAT_CONFIG.SYSTEM_MESSAGES.ERROR_CONNECT);
    }
  };

  // --- PUBLIC API ---

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setCurrentStatus("");
    addMessage(CHAT_CONFIG.ROLES.SYSTEM, CHAT_CONFIG.SYSTEM_MESSAGES.STOPPED);
  };

  const sendMessage = async (input) => {
    if (!input.trim()) return;

    const controller = prepareRequest(input);

    try {
      const response = await fetchStream(input, controller);

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      await processStream(response);

    } catch (error) {
      handleError(error);
    } finally {
      // Final cleanup
      setIsLoading(false);
      setCurrentStatus("");
      abortControllerRef.current = null;
    }
  };

  return {
    messages,
    isLoading,
    currentStatus,
    sendMessage,
    stopGeneration,
    loadSession,    // <--- EXPORTED
    clearChat       // <--- EXPORTED
  };
};