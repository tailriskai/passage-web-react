import { useContext, useCallback } from "react";
import { PassageContext } from "./Provider";
import type { PassageContextValue } from "./types";
import * as passage from "./core/passage";
import { resolveShortCode } from "./core/shortcode";

/**
 * Hook to access the Passage context and methods
 *
 * This hook now provides access to both the context (for legacy compatibility)
 * and direct access to the core functions
 *
 * @returns {PassageContextValue & AdditionalMethods} Object containing:
 * - All context methods for backward compatibility
 * - Direct access to core functions
 */
export const usePassage = () => {
  const context = useContext(PassageContext);

  // Create wrapped versions of core functions
  const configure = useCallback(passage.configure, []);
  const initialize = useCallback(passage.initialize, []);
  const open = useCallback(passage.open, []);
  const close = useCallback(passage.close, []);
  const navigate = useCallback(passage.navigate, []);
  const completeRecording = useCallback(passage.completeRecording, []);
  const captureRecordingData = useCallback(passage.captureRecordingData, []);
  const clearWebViewData = useCallback(passage.clearWebViewData, []);
  const clearWebViewState = useCallback(passage.clearWebViewState, []);
  const releaseResources = useCallback(passage.releaseResources, []);
  const openExternalURL = useCallback(passage.openExternalURL, []);
  const resolveShortCodeWrapped = useCallback(resolveShortCode, []);

  // If context exists, merge with core functions
  if (context) {
    return {
      ...context,
      // Add core functions
      configure,
      navigate,
      completeRecording,
      captureRecordingData,
      clearWebViewData,
      clearWebViewState,
      releaseResources,
      openExternalURL,
      resolveShortCode: resolveShortCodeWrapped
    };
  }

  // If no context (using without provider), return core functions only
  return {
    configure,
    initialize,
    open,
    close,
    navigate,
    completeRecording,
    captureRecordingData,
    clearWebViewData,
    clearWebViewState,
    releaseResources,
    openExternalURL,
    resolveShortCode: resolveShortCodeWrapped,
    // Placeholder for context methods
    getData: () => null,
    isModalOpen: false,
    isInitialized: passage.getIsInitialized(),
    sessionId: passage.getSessionId()
  };
};
