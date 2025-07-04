import type { WebSocketManager } from "./websocket-manager";

export type ConnectionStatus =
  | "pending"
  | "connecting"
  | "connected"
  | "rejected"
  | "data_processing"
  | "data_available"
  | "error";

export interface PassageConfig {
  baseUrl?: string;
  socketUrl?: string;
  socketNamespace?: string;
  debug?: boolean;
  customStyles?: PassageModalStyles;
}

export interface PassageModalStyles {
  container?: React.CSSProperties;
  content?: React.CSSProperties;
  header?: React.CSSProperties;
  body?: React.CSSProperties;
  footer?: React.CSSProperties;
}

export interface PassageOpenOptions {
  onSuccess?: (data: PassageSuccessData) => void;
  onError?: (error: PassageErrorData) => void;
  onClose?: () => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onMessage?: (eventName: string, data: any) => void;
  presentationStyle?: "modal" | "embed";
  container?: string | HTMLElement;
}

export interface PassageSuccessData {
  connectionId: string;
  status: ConnectionStatus;
  metadata?: {
    completedAt?: string;
    [key: string]: any;
  };
}

export interface PassageErrorData {
  error: string;
  code: string;
  details?: any;
}

export type ConnectionPromptResultStatus = "completed" | "failed" | "pending";

export interface ConnectionUpdate {
  id: string;
  status: ConnectionStatus;
  promptResults: {
    promptId: string;
    status: ConnectionPromptResultStatus;
    result: string;
  }[];
}

export interface PassageContextValue {
  isOpen: boolean;
  status: ConnectionStatus | null;
  open: (intentToken: string, options?: PassageOpenOptions) => Promise<void>;
  close: () => void;
  intentToken: string | null;
  connectionData?: ConnectionUpdate | null;
  wsManager: WebSocketManager;
  connectWebSocket: (
    intentToken: string,
    options?: PassageOpenOptions
  ) => Promise<void>;
  disconnect: () => void;
  reset: () => void;
  isWebSocketConnected: boolean;
}

export interface StatusUpdateMessage {
  status: ConnectionStatus;
  message?: string;
  timestamp?: string;
  metadata?: any;
}
