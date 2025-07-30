/**
 * Configuration constants for Passage Web React SDK
 */

// Base URLs
export const DEFAULT_WEB_BASE_URL = "https://ui.getpassage.ai";
export const DEFAULT_API_BASE_URL = "https://api.getpassage.ai";
export const DEFAULT_SOCKET_URL = "https://api.getpassage.ai";

// Path constants
export const CONNECT_PATH = "/connect";
export const DEFAULT_SOCKET_NAMESPACE = "/ws";

// API endpoint paths
export const INTENT_TOKEN_PATH = "/intent-token";

// LocalStorage keys
export const PASSAGE_DATA_RESULTS_KEY = "passage_data_results";

// Full URLs (convenience constants)
export const DEFAULT_CONNECT_URL = `${DEFAULT_WEB_BASE_URL}${CONNECT_PATH}`;
export const DEFAULT_LOGGER_ENDPOINT = `${DEFAULT_WEB_BASE_URL}/api/logger`;

// Configuration defaults object
export const CONFIG_DEFAULTS = {
  webUrl: DEFAULT_WEB_BASE_URL,
  apiUrl: DEFAULT_API_BASE_URL,
  socketUrl: DEFAULT_SOCKET_URL,
  socketNamespace: DEFAULT_SOCKET_NAMESPACE,
} as const;

export const USER_AGENT = "passage-web-react";
