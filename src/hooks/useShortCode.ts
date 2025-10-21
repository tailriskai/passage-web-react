/**
 * React hook for shortcode resolution
 */

import { useState, useEffect } from 'react';
import {
  resolveShortCode,
  getShortCodeConfig,
  IntentTokenResponse,
  ShortCodeConfig
} from '../core/shortcode';
import { logger } from '../logger';

export interface UseShortCodeResult {
  /** The resolved intent token */
  intentToken: string | null;
  /** Session ID from resolved token */
  sessionId: string | null;
  /** Resources from resolved token */
  resources: Record<string, any> | null;
  /** Return URL from resolved token */
  returnUrl: string | null;
  /** Short code configuration */
  config: ShortCodeConfig | null;
  /** Loading state */
  isLoading: boolean;
  /** Resolution state */
  isResolved: boolean;
  /** Error state */
  error: Error | null;
  /** Manually trigger resolution */
  resolve: () => Promise<void>;
  /** Clear resolved data */
  clear: () => void;
}

/**
 * Hook for resolving short codes to intent tokens
 * @param shortCode The short code to resolve
 * @param autoResolve Whether to automatically resolve on mount (default: true)
 */
export function useShortCode(
  shortCode: string | null | undefined,
  autoResolve: boolean = true
): UseShortCodeResult {
  const [intentToken, setIntentToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [resources, setResources] = useState<Record<string, any> | null>(null);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const [config, setConfig] = useState<ShortCodeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Resolve the short code
  const resolve = async () => {
    if (!shortCode) {
      logger.warn('[useShortCode] No short code provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, try to get the config (non-blocking)
      const configPromise = getShortCodeConfig(shortCode);

      // Resolve the short code to get intent token
      const response = await resolveShortCode(shortCode);

      setIntentToken(response.intentToken);
      setSessionId(response.sessionId || null);
      setResources(response.resources || null);
      setReturnUrl(response.returnUrl || null);
      setIsResolved(true);

      // Wait for config if it hasn't resolved yet
      const configData = await configPromise;
      if (configData) {
        setConfig(configData);
      }

      logger.info('[useShortCode] Successfully resolved short code');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to resolve short code');
      setError(error);
      logger.error('[useShortCode] Failed to resolve short code:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear resolved data
  const clear = () => {
    setIntentToken(null);
    setSessionId(null);
    setResources(null);
    setReturnUrl(null);
    setConfig(null);
    setIsResolved(false);
    setError(null);
  };

  // Auto-resolve on mount if enabled
  useEffect(() => {
    if (autoResolve && shortCode && !isResolved && !isLoading) {
      resolve();
    }
  }, [shortCode, autoResolve]);

  // Clear when short code changes
  useEffect(() => {
    if (isResolved) {
      clear();
    }
  }, [shortCode]);

  return {
    intentToken,
    sessionId,
    resources,
    returnUrl,
    config,
    isLoading,
    isResolved,
    error,
    resolve,
    clear
  };
}