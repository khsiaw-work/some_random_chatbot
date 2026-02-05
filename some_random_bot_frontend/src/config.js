export const CHAT_CONFIG = {
  // Backend endpoint
  API_URL: "http://localhost:8000/chat",

  // Messages
  SYSTEM_MESSAGES: {
    STOPPED: "Generation stopped",
    ERROR_CONNECT: "Something went wrong, could not connect to backend.",
    THINKING: "AI is thinking..."
  },

  // Role names (internal constants)
  ROLES: {
    USER: 'user',
    ASSISTANT: 'assistant',
    SYSTEM: 'system'
  }
};