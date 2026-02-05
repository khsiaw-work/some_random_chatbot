import { useState, useRef } from 'react';
import { CHAT_CONFIG } from '../config';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("");
  const abortControllerRef = useRef(null);

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const updateLastMessage = (content) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const lastMsg = newMessages[newMessages.length - 1];
      if (lastMsg) lastMsg.content = content;
      return newMessages;
    });
  };

  const prepareRequest = (input) => {
    addMessage(CHAT_CONFIG.ROLES.USER, input);
    setIsLoading(true);
    setCurrentStatus("Initializing...");

    // NOTE: We do NOT add the Assistant message here anymore.
    // We wait for the first 'content' packet.

    const controller = new AbortController();
    abortControllerRef.current = controller;
    return controller;
  };

  const processStream = async (response) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let fullResponse = "";
    let isBubbleCreated = false; // <--- New Flag

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

            if (data.type === "status") {
              setCurrentStatus(data.text);
            }
            else if (data.type === "content") {
              // --- THE LOGIC CHANGE ---
              if (!isBubbleCreated) {
                // First content chunk? Create the bubble NOW.
                addMessage(CHAT_CONFIG.ROLES.ASSISTANT, data.text);
                fullResponse = data.text;
                isBubbleCreated = true;

                // Optional: Clear status so it doesn't show "Writing..." alongside the bubble
                setCurrentStatus("");
              } else {
                // Bubble exists? Just update it.
                fullResponse += data.text;
                updateLastMessage(fullResponse);
              }
            }
            else if (data.type === "done") {
              setIsLoading(false);
              setCurrentStatus("");
            }
            else if (data.type === "error") {
              console.error("Error:", data.text);
              // If error happens before bubble exists, add an error bubble
              if (!isBubbleCreated) {
                 addMessage(CHAT_CONFIG.ROLES.ASSISTANT, `Error: ${data.text}`);
              }
            }
          } catch (e) {
            console.error("Parse error", e);
          }
        }
      }
    }
  };

  // ... (stopGeneration and handleError remain the same) ...

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setCurrentStatus(""); // Clear status on stop
    addMessage(CHAT_CONFIG.ROLES.SYSTEM, CHAT_CONFIG.SYSTEM_MESSAGES.STOPPED);
  };

  const handleError = (error) => {
    if (error.name === 'AbortError') {
      console.log("Fetch aborted");
    } else {
      console.error("Connection error:", error);
      addMessage(CHAT_CONFIG.ROLES.ASSISTANT, CHAT_CONFIG.SYSTEM_MESSAGES.ERROR_CONNECT);
    }
  };

  const sendMessage = async (input) => {
    if (!input.trim()) return;

    const controller = prepareRequest(input);

    try {
      const response = await fetch(CHAT_CONFIG.API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
        signal: controller.signal
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      await processStream(response);

    } catch (error) {
      handleError(error);
    } finally {
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
    stopGeneration
  };
};