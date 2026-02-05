import { useState, useEffect } from 'react'
import './App.css'
import { useChat } from './hooks/useChat'
import ChatWindow from './components/ChatWindow'
import InputArea from './components/InputArea'
import Sidebar from './components/SideBar'
import { CHAT_CONFIG } from './config'

function App() {
  // 1. Setup Sessions State
  const [sessions, setSessions] = useState([
    { id: 1, title: 'New Chat', messages: [] }
  ]);
  const [activeSessionId, setActiveSessionId] = useState(1);

  // sidebar visibiility
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 2. Import Chat Hooks
  const {
    messages,
    isLoading,
    currentStatus,
    sendMessage,
    stopGeneration,
    loadSession,
    clearChat
  } = useChat();

// --- SYNC LOGIC ---
  useEffect(() => {
    // We wrap the update in a setTimeout to push it to the next event loop tick.
    // This prevents the "Synchronous setState" error.
    const timeoutId = setTimeout(() => {

      setSessions(prevSessions => {
        const currentSession = prevSessions.find(s => s.id === activeSessionId);

        // 1. Loop Breaker: If data is already identical, do nothing.
        if (currentSession && currentSession.messages === messages) {
          return prevSessions;
        }

        // 2. Update the session
        return prevSessions.map(session => {
          if (session.id === activeSessionId) {
            // Auto-generate title logic
            let newTitle = session.title;
            if (session.title === 'New Chat' && messages.length > 0) {
              const firstUserMsg = messages.find(m => m.role === CHAT_CONFIG.ROLES.USER);
              if (firstUserMsg) {
                newTitle = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
              }
            }
            return { ...session, title: newTitle, messages: messages };
          }
          return session;
        });
      });

    }, 0); // 0ms delay is enough to break the synchronous cycle

    // Cleanup function to prevent memory leaks if component unmounts quickly
    return () => clearTimeout(timeoutId);

  }, [messages, activeSessionId]);

  // --- HANDLERS ---

  const handleNewChat = () => {
    const newId = Date.now();
    const newSession = { id: newId, title: 'New Chat', messages: [] };

    setSessions(prev => [newSession, ...prev]); // Add to top
    setActiveSessionId(newId);
    clearChat(); // Reset the useChat hook
  };

  const handleSelectSession = (id) => {
    if (id === activeSessionId) return;

    // 1. Find the session data
    const sessionToLoad = sessions.find(s => s.id === id);
    if (!sessionToLoad) return;

    // 2. Load it into useChat
    setActiveSessionId(id);
    loadSession(sessionToLoad.messages);
  };

  const handleDeleteSession = (id) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);

      // If we deleted the active session, switch to another one
      if (id === activeSessionId) {
        if (filtered.length > 0) {
          const nextSession = filtered[0];
          setActiveSessionId(nextSession.id);
          loadSession(nextSession.messages);
        } else {
          // If no sessions left, create a new one
          const newId = Date.now();
          setActiveSessionId(newId);
          clearChat();
          return [{ id: newId, title: 'New Chat', messages: [] }];
        }
      }
      return filtered;
    });
  };

  const handleRenameSession = (id, newTitle) => {
      setSessions(prev => prev.map(session =>
        session.id === id ? { ...session, title: newTitle } : session
      ));
  };

  return (
    <div className="app-container">
      <Sidebar
        isOpen={isSidebarOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession} // <--- Pass it here
      />

      <main className="main-content">
        <header className="chat-header">
          {/* NEW: Toggle Button */}
          <button
            className="menu-btn"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle Sidebar"
          >
            ☰
          </button>

          <h1>Some Random Bot Chat</h1>
        </header>

        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          currentStatus={currentStatus}
        />

        <InputArea
          onSend={sendMessage}
          onStop={stopGeneration}
          isLoading={isLoading}
        />
      </main>
    </div>
  )
}

export default App