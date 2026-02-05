import { useState } from 'react';

const InputArea = ({ onSend, onStop, isLoading }) => {
  const [input, setInput] = useState("");

  const handleSendClick = () => {
    if (input.trim()) {
      onSend(input);
      setInput("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };

  return (
    <div className="input-area">
      <div className="input-wrapper">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your query here..."
          rows="1"
          disabled={isLoading}
        />

        {isLoading ? (
          <button onClick={onStop} className="stop-btn">Stop</button>
        ) : (
          <button onClick={handleSendClick} disabled={!input.trim()}>Send</button>
        )}
      </div>
    </div>
  );
};

export default InputArea;