/**
 * React hook for subscribing to Passage events
 */

import { useEffect, useRef } from 'react';
import { logger } from '../logger';
import type {
  PassageSuccessData,
  PassageErrorData,
  PassageDataResult,
  PassagePromptResponse
} from '../types';

export interface PassageEventHandlers {
  /** Called when connection is successfully established */
  onConnectionComplete?: (data: PassageSuccessData) => void;
  /** Called when there's an error during connection */
  onConnectionError?: (data: PassageErrorData) => void;
  /** Called when data processing is complete */
  onDataComplete?: (data: PassageDataResult) => void;
  /** Called when a prompt is completed */
  onPromptComplete?: (data: PassagePromptResponse) => void;
  /** Called when the flow is exited */
  onExit?: (data: { reason?: string }) => void;
  /** Called when the webview type changes */
  onWebviewChange?: (data: { webviewType: string }) => void;
}

/**
 * Hook for subscribing to Passage events
 * Automatically handles event listener lifecycle
 */
export function usePassageEvents(handlers: PassageEventHandlers): void {
  // Store handlers in ref to avoid re-registering on every render
  const handlersRef = useRef(handlers);

  // Update ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Create event listeners
    const listeners: Array<{ event: string; handler: EventListener }> = [];

    // Connection complete event
    if (handlers.onConnectionComplete) {
      const handleConnectionComplete = ((e: Event) => {
        const customEvent = e as CustomEvent<PassageSuccessData>;
        logger.debug('[usePassageEvents] Connection complete:', customEvent.detail);
        handlersRef.current.onConnectionComplete?.(customEvent.detail);
      }) as EventListener;
      listeners.push({
        event: 'passage:connectionComplete',
        handler: handleConnectionComplete
      });
    }

    // Connection error event
    if (handlers.onConnectionError) {
      const handleConnectionError = ((e: Event) => {
        const customEvent = e as CustomEvent<PassageErrorData>;
        logger.debug('[usePassageEvents] Connection error:', customEvent.detail);
        handlersRef.current.onConnectionError?.(customEvent.detail);
      }) as EventListener;
      listeners.push({
        event: 'passage:connectionError',
        handler: handleConnectionError
      });
    }

    // Data complete event
    if (handlers.onDataComplete) {
      const handleDataComplete = ((e: Event) => {
        const customEvent = e as CustomEvent<PassageDataResult>;
        logger.debug('[usePassageEvents] Data complete:', customEvent.detail);
        handlersRef.current.onDataComplete?.(customEvent.detail);
      }) as EventListener;
      listeners.push({
        event: 'passage:dataComplete',
        handler: handleDataComplete
      });
    }

    // Prompt complete event
    if (handlers.onPromptComplete) {
      const handlePromptComplete = ((e: Event) => {
        const customEvent = e as CustomEvent<PassagePromptResponse>;
        logger.debug('[usePassageEvents] Prompt complete:', customEvent.detail);
        handlersRef.current.onPromptComplete?.(customEvent.detail);
      }) as EventListener;
      listeners.push({
        event: 'passage:promptComplete',
        handler: handlePromptComplete
      });
    }

    // Exit event
    if (handlers.onExit) {
      const handleExit = ((e: Event) => {
        const customEvent = e as CustomEvent<{ reason?: string }>;
        logger.debug('[usePassageEvents] Exit:', customEvent.detail);
        handlersRef.current.onExit?.(customEvent.detail);
      }) as EventListener;
      listeners.push({
        event: 'passage:exit',
        handler: handleExit
      });
    }

    // Webview change event
    if (handlers.onWebviewChange) {
      const handleWebviewChange = ((e: Event) => {
        const customEvent = e as CustomEvent<{ webviewType: string }>;
        logger.debug('[usePassageEvents] Webview change:', customEvent.detail);
        handlersRef.current.onWebviewChange?.(customEvent.detail);
      }) as EventListener;
      listeners.push({
        event: 'passage:webviewChange',
        handler: handleWebviewChange
      });
    }

    // Add all event listeners
    listeners.forEach(({ event, handler }) => {
      window.addEventListener(event, handler);
    });

    // Cleanup function
    return () => {
      listeners.forEach(({ event, handler }) => {
        window.removeEventListener(event, handler);
      });
    };
  }, [
    // Only re-register if specific handlers are added/removed
    !!handlers.onConnectionComplete,
    !!handlers.onConnectionError,
    !!handlers.onDataComplete,
    !!handlers.onPromptComplete,
    !!handlers.onExit,
    !!handlers.onWebviewChange
  ]);
}

/**
 * Dispatch a Passage event programmatically
 * Useful for testing or triggering events from other parts of the app
 */
export function dispatchPassageEvent<T = any>(
  eventType:
    | 'connectionComplete'
    | 'connectionError'
    | 'dataComplete'
    | 'promptComplete'
    | 'exit'
    | 'webviewChange',
  data: T
): void {
  if (typeof window === 'undefined') {
    return;
  }

  const event = new CustomEvent(`passage:${eventType}`, { detail: data });
  window.dispatchEvent(event);

  logger.debug(`[dispatchPassageEvent] Dispatched ${eventType}:`, data);
}