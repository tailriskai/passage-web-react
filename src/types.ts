import type { WebSocketManager } from "./websocket-manager";
import type * as React from "react";

export type ConnectionStatus =
  | "pending"
  | "connecting"
  | "connected"
  | "rejected"
  | "data_processing"
  | "data_available"
  | "error"
  // Adding this here because it's causing a build issue. This is not a valid status for a connection.
  | "done";

export interface PassageConfig {
  /**
   * Publishable key for API authentication
   * Optional - only required for app clip flow (generateAppClip/openAppClip)
   */
  publishableKey?: string;

  /**
   * UI URL for the Passage web app interface
   * @default "https://ui.getpassage.ai"
   */
  uiUrl?: string;

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

export interface PassageOpenOptions {
  /**
   * The intent token for authentication (required)
   */
  token: string;

  /**
   * Called when the connection is successfully established
   */
  onConnectionComplete?: (data: PassageSuccessData) => void;

  /**
   * Called when there's an error during connection
   */
  onConnectionError?: (error: PassageErrorData) => void;

  /**
   * Called when data is complete
   */
  onDataComplete?: (data: PassageDataResult) => void;

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

export interface GenerateAppClipOptions {
  /**
   * Integration ID for the connection (e.g., "airbnb", "kroger")
   */
  integrationId: string;

  /**
   * Resources to request access to
   */
  resources?: {
    [key: string]: {
      [key in "read" | "write"]?: {
        [key: string]: any;
      };
    };
  };

  /**
   * Return URL after connection completes
   */
  returnUrl?: string;

  /**
   * User ID to associate with this connection
   */
  userId?: string;

  /**
   * Prompts to process after connection
   */
  prompts?: PassagePrompt[];

  /**
   * Session arguments for the connection
   */
  sessionArgs?: any;

  /**
   * Enable recording mode for the session
   */
  record?: boolean;

  /**
   * Enable debug mode
   */
  debug?: boolean;

  /**
   * Clear all cookies before connection
   */
  clearAllCookies?: boolean;

  /**
   * Enable interactive mode
   */
  interactive?: boolean;

  /**
   * Ad campaign tracking information
   */
  adCampaign?: string;
}

export interface GenerateAppClipResponse {
  /**
   * The generated intent token (JWT)
   */
  intentToken: string;

  /**
   * The connection ID (same as sessionId in JWT)
   */
  connectionId: string;

  /**
   * The universal link URL for the app clip
   */
  url: string;

  /**
   * The app clip URL with developer slug and shortCode
   * Format: https://clip.trypassage.ai/{developer-name}?shortCode={shortToken}
   */
  appClipUrl: string;

  /**
   * The short token code
   */
  shortToken: string;

  /**
   * Debug mode flag
   */
  debug: boolean;

  /**
   * Recording mode flag
   */
  record: boolean;

  /**
   * Clear all cookies flag
   */
  clearAllCookies: boolean;

  /**
   * Interactive mode flag
   */
  interactive?: boolean;

  /**
   * Return URL with connection ID appended
   */
  returnUrl?: string;

  /**
   * Branding configuration for the integration
   */
  branding?: BrandingConfig;
}

export interface BrandingConfig {
  /**
   * Integration name for display
   */
  integrationName: string;

  /**
   * Primary brand color (buttons, accents)
   */
  colorPrimary?: string;

  /**
   * Background color for the page
   */
  colorBackground?: string;

  /**
   * Background color for cards/modals
   */
  colorCardBackground?: string;

  /**
   * Primary text color
   */
  colorText?: string;

  /**
   * Secondary/muted text color
   */
  colorTextSecondary?: string;

  /**
   * Logo URL for the integration
   */
  logoUrl?: string;
}

export interface OpenAppClipOptions extends GenerateAppClipOptions {
  /**
   * Called when the connection is successfully established
   */
  onConnectionComplete?: (data: PassageSuccessData) => void;

  /**
   * Called when there's an error during connection
   */
  onConnectionError?: (error: PassageErrorData) => void;

  /**
   * Called when data is complete
   */
  onDataComplete?: (data: PassageDataResult) => void;

  /**
   * Called when the user manually closes the modal
   */
  onExit?: (reason?: string) => void;
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

  /**
   * The intent token for this session
   */
  intentToken?: string;
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

  /**
   * The connection ID if available
   */
  connectionId?: string;
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
  intentToken?: string;
  returnUrl?: string;
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

export interface PassageDataOptions {
  intentToken?: string;
  connectionId?: string;
  resources?: string[];
  fetchFromApi?: boolean;
}

export interface PassageContextValue {
  open: (options: PassageOpenOptions) => Promise<void>;
  close: () => void;
  generateAppClip: (options: GenerateAppClipOptions) => Promise<GenerateAppClipResponse>;
  openAppClip: (options: OpenAppClipOptions) => Promise<void>;
}

export interface StatusUpdateMessage {
  status: ConnectionStatus;
  message?: string;
  timestamp?: string;
  metadata?: any;
}
