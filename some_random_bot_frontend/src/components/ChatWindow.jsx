import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

const ChatWindow = ({ messages, isLoading, currentStatus }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStatus]);

  return (
    <div className="chat-window">
      {/* 1. Render all existing messages */}
      {messages.map((msg, index) => (
        <MessageBubble key={index} message={msg} />
      ))}

      {/* 2. Render Status ONLY if loading AND status text exists */}
      {/* This will vanish once 'currentStatus' is cleared in useChat */}
      {isLoading && currentStatus && (
        <div className="status-message">
          <div className="status-spinner"></div>
          <span>{currentStatus}</span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow;