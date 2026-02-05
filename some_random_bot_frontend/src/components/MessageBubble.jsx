const MessageBubble = ({ message }) => {
//   const isSystem = message.role === CHAT_CONFIG.ROLES.SYSTEM;
//   const isUser = message.role === CHAT_CONFIG.ROLES.USER;

//   // Dynamic label based on role
//   let label = "AI";
//   if (isUser) label = "You";
//   if (isSystem) label = "System";

  return (
    <div className={`message-bubble ${message.role}`}>
      <div className="message-content">
        {/* <strong>{label}:</strong> */}
        <p>{message.content}</p>
      </div>
    </div>
  );
};

export default MessageBubble;