/**
 * Core Passage functions that mirror the native module API
 * These are pure functions that can be used directly or through hooks
 */

import { logger } from '../logger';
import {
  PassageConfig,
  PassageInitializeOptions,
  PassageOpenOptions,
  PassageSuccessData,
  PassageErrorData,
  PassageDataResult,
  PassagePromptResponse
} from '../types';

// Global configuration state (managed by provider)
let globalConfig: PassageConfig = {};
let isInitialized = false;
let currentSessionId: string | null = null;
let publishableKey: string | null = null;

/**
 * Configure the Passage SDK with global settings
 * Similar to native module's configure method
 */
export function configure(config: PassageConfig): void {
  globalConfig = { ...globalConfig, ...config };

  logger.debug('[Passage] Configured with:', {
    webUrl: config.webUrl,
    apiUrl: config.apiUrl,
    socketUrl: config.socketUrl,
    debug: config.debug
  });
}

/**
 * Initialize the Passage SDK with publishable key
 * Returns a promise that resolves when initialization is complete
 */
export async function initialize(options: PassageInitializeOptions): Promise<boolean> {
  try {
    publishableKey = options.publishableKey;

    // Store initialization options for later use
    if (options.integrationId) {
      globalConfig.integrationId = options.integrationId;
    }

    logger.info('[Passage] Initializing with publishable key');

    // Perform any initialization logic here
    // This might include validating the key, setting up connections, etc.

    isInitialized = true;

    // Call initialization callbacks if provided
    if (options.onConnectionComplete) {
      // Store callback for later use
      globalConfig.onConnectionComplete = options.onConnectionComplete;
    }

    return true;
  } catch (error) {
    logger.error('[Passage] Initialization failed:', error);

    if (options.onError) {
      options.onError({
        error: 'Initialization failed',
        data: error
      });
    }

    throw error;
  }
}

/**
 * Open the Passage flow (modal or embedded)
 * This is the main entry point for user interaction
 */
export function open(options?: PassageOpenOptions): void {
  if (!isInitialized) {
    throw new Error('Passage must be initialized before opening');
  }

  logger.info('[Passage] Opening with options:', options);

  // This will be implemented by the provider/modal component
  // Dispatch an event or update state to trigger the UI
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('passage:open', { detail: options }));
  }
}

/**
 * Close the current Passage flow
 */
export function close(): void {
  logger.info('[Passage] Closing');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('passage:close'));
  }
}

/**
 * Navigate to a specific URL within the Passage flow
 */
export function navigate(url: string): void {
  logger.info('[Passage] Navigating to:', url);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('passage:navigate', { detail: url }));
  }
}

/**
 * Complete recording with optional data
 */
export async function completeRecording(data?: Record<string, any>): Promise<boolean> {
  try {
    logger.info('[Passage] Completing recording with data:', data);

    // Implementation will depend on the backend API
    // This might send data to the server and finalize the session

    return true;
  } catch (error) {
    logger.error('[Passage] Failed to complete recording:', error);
    throw error;
  }
}

/**
 * Capture recording data without completing the session
 */
export async function captureRecordingData(data?: Record<string, any>): Promise<boolean> {
  try {
    logger.info('[Passage] Capturing recording data:', data);

    // Store data for later submission

    return true;
  } catch (error) {
    logger.error('[Passage] Failed to capture recording data:', error);
    throw error;
  }
}

/**
 * Clear all web view data (localStorage, sessionStorage, cookies)
 */
export async function clearWebViewData(): Promise<void> {
  try {
    // Clear localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }

    // Clear sessionStorage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.clear();
    }

    // Clear cookies (limited in browser environment)
    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });

    logger.info('[Passage] Cleared web view data');
  } catch (error) {
    logger.error('[Passage] Failed to clear web view data:', error);
    throw error;
  }
}

/**
 * Clear web view state (in-memory state)
 */
export function clearWebViewState(): void {
  currentSessionId = null;
  logger.info('[Passage] Cleared web view state');
}

/**
 * Release all resources and cleanup
 */
export function releaseResources(): void {
  isInitialized = false;
  publishableKey = null;
  currentSessionId = null;
  globalConfig = {};

  logger.info('[Passage] Released resources');
}

/**
 * Open an external URL in a new tab/window
 */
export function openExternalURL(url: string): void {
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    logger.info('[Passage] Opened external URL:', url);
  }
}

/**
 * Get current configuration
 */
export function getConfig(): PassageConfig {
  return { ...globalConfig };
}

/**
 * Check if SDK is initialized
 */
export function getIsInitialized(): boolean {
  return isInitialized;
}

/**
 * Get current publishable key
 */
export function getPublishableKey(): string | null {
  return publishableKey;
}

/**
 * Get current session ID
 */
export function getSessionId(): string | null {
  return currentSessionId;
}

/**
 * Set current session ID (used internally)
 */
export function setSessionId(sessionId: string | null): void {
  currentSessionId = sessionId;
}