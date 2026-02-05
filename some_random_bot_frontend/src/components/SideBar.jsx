import { useState, useRef, useEffect } from 'react';

// Sub-component for individual items to manage their own edit state
const SessionItem = ({ session, isActive, onSelect, onDelete, onRename }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);
  const inputRef = useRef(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editTitle.trim()) {
      onRename(session.id, editTitle);
    } else {
      setEditTitle(session.title); // Revert if empty
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditTitle(session.title); // Cancel
      setIsEditing(false);
    }
  };

  // Stop propagation ensures clicking buttons doesn't select the chat
  const handleEditClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(session.id);
  };

  return (
    <div
      className={`session-item ${isActive ? 'active' : ''}`}
      onClick={() => !isEditing && onSelect(session.id)}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="rename-input"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSave} // Save on click away
          onKeyDown={handleKeyDown}
        />
      ) : (
        <>
          <span className="session-title" title={session.title}>
            {session.title || "New Chat"}
          </span>

          <div className="session-actions">
            <button className="icon-btn edit-btn" onClick={handleEditClick} title="Rename">
              ✎
            </button>
            <button className="icon-btn delete-btn" onClick={handleDeleteClick} title="Delete">
              ×
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// Main Sidebar Component
const Sidebar = ({ isOpen, sessions, activeSessionId, onSelectSession, onNewChat, onDeleteSession, onRenameSession }) => {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <button onClick={onNewChat} className="new-chat-btn">
          + New Chat
        </button>
      </div>

      <div className="session-list">
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            isActive={session.id === activeSessionId}
            onSelect={onSelectSession}
            onDelete={onDeleteSession}
            onRename={onRenameSession}
          />
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;