import { useContext } from "react";
import { PassageContext } from "./Provider";
import type { PassageContextValue } from "./types";

/**
 * Hook to access the Passage context and methods
 *
 * @returns {PassageContextValue} Object containing:
 * - initialize: Initialize Passage with publishable key and configuration
 * - open: Open the Passage modal (requires initialization first)
 * - close: Close the Passage modal
 * - getData: Get stored session data and prompts
 * - connect: Connect to Passage in headless mode
 * - disconnect: Disconnect from Passage
 */
export const usePassage = (): PassageContextValue => {
  const context = useContext(PassageContext);

  if (!context) {
    throw new Error(
      "usePassage must be used within a PassageProvider. " +
        "Make sure to wrap your app with <PassageProvider>."
    );
  }

  return context;
};
