import type { WebSocketManager } from "./websocket-manager";
import type * as React from "react";

export type ConnectionStatus =
  | "pending"
  | "connecting"
  | "connected"
  | "rejected"
  | "data_processing"
  | "data_available"
  | "error";

export interface PassageConfig {
  /**
   * Web URL for the Passage web app UI
   * @default "https://ui.getpassage.ai"
   */
  webUrl?: string;

  /**
   * API URL for backend API calls
   * @default "https://api.getpassage.ai"
   */
  apiUrl?: string;

  /**
   * Socket server URL for websocket connections
   * @default "https://api.getpassage.ai"
   */
  socketUrl?: string;

  /**
   * Socket namespace
   * @default "/ws"
   */
  socketNamespace?: string;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Custom styles for the modal
   */
  customStyles?: PassageModalStyles;
}

export interface PassageModalStyles {
  container?: React.CSSProperties;
  content?: React.CSSProperties;
  header?: React.CSSProperties;
  body?: React.CSSProperties;
  footer?: React.CSSProperties;
}

export interface PassagePrompt {
  name: string;
  value: string;
  outputType?: "text" | "json" | "boolean" | "number";
  outputFormat?: string;
}

export interface PassagePromptResponse {
  name: string;
  content: string;
  outputType?: "text" | "json" | "boolean" | "number";
  outputFormat?: string;
  response?: any;
}

export interface PassageInitializeOptions {
  /**
   * Publishable key for authentication
   */
  publishableKey: string;

  /**
   * Integration ID for the connection
   */
  integrationId?: string;

  /**
   * Prompts to process after connection
   */
  prompts?: PassagePrompt[];

  /**
   * Products to process after connection
   */
  products?: string[];

  /**
   * Session arguments for the connection
   */
  sessionArgs?: any;

  /**
   * Enable recording mode for the session
   */
  record?: boolean;

  /**
   * Resources for the connection
   */
  resources?: {
    [key: string]: {
      [key in "read" | "write"]?: {
        [key: string]: any;
      };
    };
  };

  /**
   * Callbacks
   */
  onConnectionComplete?: (data: PassageSuccessData) => void;
  onError?: (error: PassageErrorData) => void;
  onDataComplete?: (data: PassageDataResult) => void;
  onPromptComplete?: (prompt: PassagePromptResponse) => void;
  onExit?: (reason?: string) => void;
}

export interface PassageOpenOptions {
  /**
   * The intent token for authentication (optional - will use provider state if not provided)
   */
  intentToken?: string;

  /**
   * Optional prompts to process after connection
   */
  prompts?: PassagePrompt[];

  /**
   * Called when the connection is successfully established
   */
  onConnectionComplete?: (data: PassageSuccessData) => void;

  /**
   * Called when there's an error during connection
   */
  onError?: (error: PassageErrorData) => void;

  /**
   * Called when data is complete
   */
  onDataComplete?: (data: PassageDataResult) => void;

  /**
   * Called when a prompt is successfully processed
   */
  onPromptComplete?: (prompt: PassagePromptResponse) => void;

  /**
   * Called when the user manually closes the modal before connection
   */
  onExit?: (reason?: string) => void;

  /**
   * Presentation style for the modal
   * @default "modal"
   */
  presentationStyle?: "modal" | "embed";

  /**
   * Container element for embed mode
   */
  container?: string | HTMLElement;
}

export interface PassageDataResult {
  /**
   * The data from the connection
   */
  data?: any[];

  /**
   * Prompts and their result
   */
  prompts?: Array<PassagePromptResponse>;
}

export interface PassageStoredDataResult extends PassageDataResult {
  /**
   * The intent token for this connection session
   */
  intentToken?: string;

  /**
   * When this data was collected
   */
  timestamp?: string;
}

export interface PassageSuccessData {
  connectionId?: string;
  status?: ConnectionStatus;
  metadata?: {
    completedAt?: string;
    promptResults?: any;
    [key: string]: any;
  };
  data?: any;
  pageData?: {
    cookies?: Array<{
      name: string;
      value: string;
      domain: string;
    }>;
    localStorage?: Array<{
      name: string;
      value: string;
    }>;
    sessionStorage?: Array<{
      name: string;
      value: string;
    }>;
    html?: string;
    url?: string;
  };
  sessionInfo?: {
    cookies: any[];
    localStorage: any[];
    sessionStorage: any[];
  };
}

export interface PassageErrorData {
  error: string;
  code?: string;
  details?: any;
  data?: any;
}

export type ConnectionPromptResultStatus = "completed" | "failed" | "pending";

export interface ConnectionUpdate {
  id: string;
  status: ConnectionStatus;
  data?: any;
  promptResults: {
    name: string;
    promptId: string;
    status: ConnectionPromptResultStatus;
    result: string;
  }[];
}

export interface PassageContextValue {
  initialize: (options: PassageInitializeOptions) => Promise<void>;
  open: (options?: PassageOpenOptions) => Promise<void>;
  close: () => Promise<void>;
  disconnect: () => Promise<void>;
  getData: () => Promise<PassageStoredDataResult[]>;
}

export interface StatusUpdateMessage {
  status: ConnectionStatus;
  message?: string;
  timestamp?: string;
  metadata?: any;
}
