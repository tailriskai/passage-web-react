/**
 * Configuration constants for Passage Web React SDK
 */

// Base URLs
export const DEFAULT_UI_BASE_URL = "https://ui.runpassage.ai";
export const DEFAULT_API_BASE_URL = "https://api.runpassage.ai";
export const DEFAULT_SOCKET_URL = "https://api.runpassage.ai";

// Path constants
export const CONNECT_PATH = "/connect";
export const DEFAULT_SOCKET_NAMESPACE = "/ws";
export const LOGGER_PATH = `/api/logger`;

// API endpoint paths
export const INTENT_TOKEN_PATH = "/intent-token";
export const ANALYTICS_PATH = "/api/analytics";

// LocalStorage keys
export const PASSAGE_DATA_RESULTS_KEY = "passage_data_results";

// Configuration defaults object
export const CONFIG_DEFAULTS = {
  uiUrl: DEFAULT_UI_BASE_URL,
  apiUrl: DEFAULT_API_BASE_URL,
  socketUrl: DEFAULT_SOCKET_URL,
  socketNamespace: DEFAULT_SOCKET_NAMESPACE,
} as const;

export const USER_AGENT = "passage-web-react";
