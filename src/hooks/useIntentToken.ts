/**
 * React hook for working with intent tokens
 */

import { useState, useEffect, useMemo } from 'react';
import {
  decodeIntentToken,
  getWriteResources,
  hasWriteOperations,
  isWriteOperationCompleted,
  getSuccessMessage,
  shouldShowViewResults,
  IntentTokenPayload,
  WriteResourceInfo
} from '../utils/intentToken';
import { logger } from '../logger';

export interface UseIntentTokenResult {
  /** The decoded token payload */
  payload: IntentTokenPayload | null;
  /** Session ID from the token */
  sessionId: string | null;
  /** Write resources in the token */
  writeResources: WriteResourceInfo[];
  /** Whether token has write operations */
  hasWrites: boolean;
  /** Whether to show view results button */
  showViewResults: boolean;
  /** Check if write operation is completed */
  checkWriteCompleted: () => Promise<{
    completed: boolean;
    resourceType?: string;
    amount?: string | number;
    totalBalance?: string | number;
  }>;
  /** Get formatted success message */
  getSuccessMessage: (integrationName: string, amount?: string | number, totalBalance?: string | number) => string;
  /** Loading state for async operations */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

/**
 * Hook for working with intent tokens
 * Provides decoded token data and utility functions
 */
export function useIntentToken(token: string | null | undefined): UseIntentTokenResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Decode the token
  const payload = useMemo(() => {
    if (!token) return null;

    try {
      return decodeIntentToken(token);
    } catch (err) {
      logger.error('[useIntentToken] Failed to decode token:', err);
      setError(err instanceof Error ? err : new Error('Failed to decode token'));
      return null;
    }
  }, [token]);

  // Extract session ID
  const sessionId = payload?.sessionId || null;

  // Get write resources
  const writeResources = useMemo(() => {
    if (!payload) return [];
    return getWriteResources(payload);
  }, [payload]);

  // Check if has write operations
  const hasWrites = useMemo(() => {
    if (!payload) return false;
    return hasWriteOperations(payload);
  }, [payload]);

  // Check if should show view results
  const showViewResults = useMemo(() => {
    if (!payload) return false;
    return shouldShowViewResults(payload);
  }, [payload]);

  // Check if write operation is completed
  const checkWriteCompleted = async () => {
    if (!payload || !token) {
      return { completed: false };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await isWriteOperationCompleted(payload, token);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to check write operation');
      setError(error);
      logger.error('[useIntentToken] Failed to check write operation:', err);
      return { completed: false };
    } finally {
      setIsLoading(false);
    }
  };

  // Get formatted success message
  const getSuccessMessageFormatted = (
    integrationName: string,
    amount?: string | number,
    totalBalance?: string | number
  ) => {
    if (!payload) {
      return `Your ${integrationName} account was connected`;
    }
    return getSuccessMessage(payload, integrationName, amount, totalBalance);
  };

  // Clear error when token changes
  useEffect(() => {
    setError(null);
  }, [token]);

  return {
    payload,
    sessionId,
    writeResources,
    hasWrites,
    showViewResults,
    checkWriteCompleted,
    getSuccessMessage: getSuccessMessageFormatted,
    isLoading,
    error
  };
}