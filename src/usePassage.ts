import { useContext } from "react";
import { PassageContext } from "./Provider";
import type { PassageContextValue } from "./types";

/**
 * Hook to access the Passage context
 * Provides access to open(), close(), generateAppClip(), and openAppClip()
 *
 * @example
 * ```tsx
 * import { usePassage, configure } from '@getpassage/web-react';
 *
 * // Configure once at app startup
 * configure({
 *   publishableKey: 'pk_...',
 *   debug: true
 * });
 *
 * function MyComponent() {
 *   const { open, generateAppClip, openAppClip } = usePassage();
 *
 *   const handleOpen = async () => {
 *     // Generate token server-side or use generateAppClip
 *     const { intentToken } = await generateAppClip({
 *       integrationId: 'airbnb',
 *       resources: { trip: { read: {} } }
 *     });
 *
 *     await open({
 *       token: intentToken,
 *       onConnectionComplete: (data) => console.log(data)
 *     });
 *   };
 *
 *   const handleAppClip = async () => {
 *     await openAppClip({
 *       integrationId: 'airbnb',
 *       resources: { trip: { read: {} } },
 *       onConnectionComplete: (data) => console.log(data)
 *     });
 *   };
 * }
 * ```
 */
export const usePassage = (): PassageContextValue => {
  const context = useContext(PassageContext);

  if (!context) {
    throw new Error('usePassage must be used within a PassageProvider');
  }

  return context;
};
