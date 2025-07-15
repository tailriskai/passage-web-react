// Components
export { PassageProvider } from "./Provider";

// Hooks
export { usePassage } from "./usePassage";

// WebSocket Manager - for backward compatibility
export { WebSocketManager } from "./websocket-manager";

// Types
export type {
  PassageConfig,
  PassageInitializeOptions,
  PassageOpenOptions,
  PassageConnectOptions,
  PassagePrompt,
  PassagePromptResponse,
  PassageDataResult,
  PassageSuccessData,
  PassageErrorData,
  PassageContextValue,
  ConnectionStatus,
  PassageModalStyles,
  ConnectionUpdate,
  ConnectionPromptResultStatus,
  StatusUpdateMessage,
} from "./types";

// Configuration constants
export {
  DEFAULT_WEB_BASE_URL,
  DEFAULT_API_BASE_URL,
  DEFAULT_SOCKET_URL,
  DEFAULT_SOCKET_NAMESPACE,
  CONNECT_PATH,
  CONFIG_DEFAULTS,
} from "./config";
