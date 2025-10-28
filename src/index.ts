// Core Functions
export { configure, open, close, generateAppClip, openAppClip, getConfig } from "./core/passage";
export * from "./core/shortcode";
export * from "./core/intentTokenLink";

// Components
export { PassageProvider } from "./Provider";
export { QRCode } from "./components/QRCode";
export type { QRCodeProps } from "./components/QRCode";
export { AppClipModal } from "./components/AppClipModal";
export type { AppClipModalProps } from "./components/AppClipModal";
// Keep AppClipPage for backward compatibility
export { AppClipPage } from "./components/AppClipPage";
export type { AppClipPageProps } from "./components/AppClipPage";

// Hooks
export { usePassage } from "./usePassage";
export { useIntentToken } from "./hooks/useIntentToken";
export { useShortCode } from "./hooks/useShortCode";
export { usePassageEvents, dispatchPassageEvent } from "./hooks/usePassageEvents";

// Intent Token Utilities
export * from "./utils/intentToken";

// WebSocket Manager
export { WebSocketManager } from "./websocket-manager";

// Types
export type {
  PassageConfig,
  PassageOpenOptions,
  GenerateAppClipOptions,
  GenerateAppClipResponse,
  OpenAppClipOptions,
  PassagePrompt,
  PassagePromptResponse,
  PassageDataResult,
  PassageStoredDataResult,
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
  DEFAULT_UI_BASE_URL,
  DEFAULT_API_BASE_URL,
  DEFAULT_SOCKET_URL,
  DEFAULT_SOCKET_NAMESPACE,
  CONNECT_PATH,
  CONFIG_DEFAULTS,
  PASSAGE_DATA_RESULTS_KEY,
} from "./config";

// Logger
export { logger, Logger, HttpTransport, ConsoleTransport } from "./logger";
export type {
  HttpTransportConfig,
  LogEntry,
  SDKLogEntry,
  LogLevel,
  LoggerTransport,
  LoggerConfig,
} from "./logger";

// Analytics
export { analytics, ANALYTICS_EVENTS } from "./analytics";
export type {
  AnalyticsEvent,
  AnalyticsEventType,
  SDKAnalyticsEvent,
} from "./analytics";
