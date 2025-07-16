import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import ReactDOM from "react-dom";
import { PassageModal } from "./components/PassageModal";
import { WebSocketManager } from "./websocket-manager";
import { logger } from "./logger";
import {
  DEFAULT_WEB_BASE_URL,
  DEFAULT_API_BASE_URL,
  DEFAULT_SOCKET_URL,
  DEFAULT_SOCKET_NAMESPACE,
  INTENT_TOKEN_PATH,
  PASSAGE_DATA_RESULTS_KEY,
} from "./config";
import type {
  PassageConfig,
  PassageContextValue,
  PassageInitializeOptions,
  PassageOpenOptions,
  PassageDataResult,
  PassageSuccessData,
  PassageErrorData,
  PassagePrompt,
  ConnectionStatus,
  ConnectionUpdate,
} from "./types";

export const PassageContext = createContext<PassageContextValue | null>(null);

// LocalStorage helper functions
const getStoredDataResults = (): Array<{
  intentToken: string;
  data: any;
  timestamp: string;
}> => {
  try {
    const stored = localStorage.getItem(PASSAGE_DATA_RESULTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    logger.error(
      "[PassageProvider] Failed to parse stored data results:",
      error
    );
    return [];
  }
};

const storeDataResult = (intentToken: string, data: any): void => {
  try {
    const existing = getStoredDataResults();
    const newResult = {
      intentToken,
      data,
      timestamp: new Date().toISOString(),
    };

    // Add to the beginning of the array (most recent first)
    const updated = [newResult, ...existing];

    localStorage.setItem(PASSAGE_DATA_RESULTS_KEY, JSON.stringify(updated));
    logger.debug(
      "[PassageProvider] Stored data result in localStorage:",
      newResult
    );
  } catch (error) {
    logger.error("[PassageProvider] Failed to store data result:", error);
  }
};

interface PassageProviderProps {
  children: React.ReactNode;
  config?: PassageConfig;
}

export const PassageProvider: React.FC<PassageProviderProps> = ({
  children,
  config = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const intentTokenRef = useRef<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [connectionData, setConnectionData] = useState<ConnectionUpdate | null>(
    null
  );
  const [sessionData, setSessionData] = useState<PassageDataResult | null>(
    null
  );
  const [presentationStyle, setPresentationStyle] = useState<"modal" | "embed">(
    "modal"
  );
  const [container, setContainer] = useState<HTMLElement | null>(null);

  // Store callbacks in refs to avoid re-renders
  const onConnectionCompleteRef = useRef<
    ((data: PassageSuccessData) => void) | undefined
  >(undefined);
  const onErrorRef = useRef<((error: PassageErrorData) => void) | undefined>(
    undefined
  );
  const onDataCompleteRef = useRef<
    ((data: PassageDataResult) => void) | undefined
  >(undefined);
  const onPromptCompleteRef = useRef<((prompt: any) => void) | undefined>(
    undefined
  );
  const onExitRef = useRef<((reason?: string) => void) | undefined>(undefined);

  const wsManager = WebSocketManager.getInstance();

  // Initialize logger with debug mode
  useEffect(() => {
    logger.setDebugMode(config.debug ?? false);
    logger.debug("[PassageProvider] Initialized with config:", config);
  }, [config.debug]);

  // Generate intent token
  const generateIntentToken = useCallback(
    async (
      publishableKey: string,
      prompts: PassagePrompt[] = [],
      integrationId?: string,
      products: string[] = ["history"]
    ): Promise<string> => {
      try {
        const apiUrl = config.apiUrl || DEFAULT_API_BASE_URL;

        const payload = {
          integrationId,
          prompts,
          products,
        };

        logger.debug(
          "[PassageProvider] Generating intent token with payload:",
          {
            publishableKey,
            promptsCount: prompts.length,
            prompts: prompts.map((p) => ({
              name: p.name,
              value: p.value,
            })),
            products,
          }
        );

        const response = await fetch(`${apiUrl}${INTENT_TOKEN_PATH}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Publishable ${publishableKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to generate intent token: ${response.status}`
          );
        }

        const data = await response.json();
        logger.debug("[PassageProvider] Intent token generated successfully");
        return data.intentToken;
      } catch (error) {
        logger.error(
          "[PassageProvider] Failed to generate intent token:",
          error
        );
        throw error;
      }
    },
    [config.apiUrl]
  );

  // Initialize method - generates intent token
  const initialize = useCallback(
    async (options: PassageInitializeOptions) => {
      logger.debug("[PassageProvider] Initializing with options:", {
        publishableKey: options.publishableKey,
        hasPrompts: !!options.prompts?.length,
        promptsCount: options.prompts?.length || 0,
        products: options.products || ["history"],
      });

      try {
        // Generate intent token
        const token = await generateIntentToken(
          options.publishableKey,
          options.prompts || [],
          options.integrationId,
          options.products || ["history"]
        );
        intentTokenRef.current = token;
        logger.debug("[PassageProvider] Initialization complete");

        // Store callbacks
        onConnectionCompleteRef.current = options.onConnectionComplete;
        onErrorRef.current = options.onError;
        onDataCompleteRef.current = options.onDataComplete;
        onPromptCompleteRef.current = options.onPromptComplete;
        onExitRef.current = options.onExit;
      } catch (error) {
        logger.error("[PassageProvider] Initialization failed:", error);
        options.onError?.({
          error:
            error instanceof Error ? error.message : "Initialization failed",
          data: error,
        });
      }
    },
    [generateIntentToken]
  );

  // Handle connection updates
  useEffect(() => {
    if (!intentTokenRef.current) {
      logger.debug(
        "[PassageProvider] Skipping connection listener setup - no intentToken"
      );
      return;
    }

    logger.debug(
      "[PassageProvider] Setting up connection listener for intentToken:",
      intentTokenRef.current
    );

    // Single message listener to handle all events
    const unsubscribeMessage = wsManager.addMessageListener(
      (eventName: string, data: any) => {
        logger.debug(
          "[PassageProvider] WebSocket message received:",
          eventName,
          data
        );

        // Handle connection events
        if (
          eventName === "connection" ||
          eventName === "connection_update" ||
          (data?.id && data?.status)
        ) {
          const connection: ConnectionUpdate = data;
          logger.debug(
            "[PassageProvider] Connection update received:",
            connection
          );

          // Store the connection data
          setConnectionData(connection);

          // Update status from connection data
          setStatus(connection.status);

          // Handle connection status mappings
          if (connection.status === "connected") {
            logger.debug(
              "[PassageProvider] Connection established - connected status reached"
            );

            const successData: PassageSuccessData = {
              connectionId: connection.id,
              status: connection.status,
              metadata: {
                completedAt: new Date().toISOString(),
                promptResults: connection.promptResults,
              },
              data: connection.promptResults,
            };

            logger.debug(
              "[PassageProvider] Calling onConnectionComplete callback with data:",
              successData
            );
            onConnectionCompleteRef.current?.(successData);
          } else if (connection.status === "data_available") {
            logger.debug(
              "[PassageProvider] Data available - data_available status reached"
            );

            // Update session data
            const sessionDataResult: PassageDataResult = {
              data: connection.data,
              prompts: connection.promptResults.map((promptResult) => ({
                prompt: promptResult.promptId,
                results: promptResult.result,
              })),
            };
            setSessionData(sessionDataResult);

            // Store in localStorage if we have an intentToken
            if (intentTokenRef.current) {
              storeDataResult(intentTokenRef.current, sessionDataResult);
            }

            logger.debug(
              "[PassageProvider] Calling onDataComplete callback with data:",
              sessionDataResult
            );
            onDataCompleteRef.current?.(sessionDataResult);
          } else if (
            connection.status === "error" ||
            connection.status === "rejected"
          ) {
            logger.debug(
              "[PassageProvider] Connection failed with status:",
              connection.status
            );
            const errorData: PassageErrorData = {
              error:
                connection.status === "rejected"
                  ? "Connection rejected"
                  : "Connection failed",
              code:
                connection.status === "rejected"
                  ? "CONNECTION_REJECTED"
                  : "CONNECTION_ERROR",
            };

            logger.debug(
              "[PassageProvider] Calling onError callback with data:",
              errorData
            );
            onErrorRef.current?.(errorData);
          }
        }

        // Handle prompt events
        if (eventName === "prompt") {
          const prompt = data;
          logger.debug("[PassageProvider] Prompt event received:", prompt);

          // Handle prompt data - it might be an array or single object
          const prompts = Array.isArray(prompt) ? prompt : [prompt];

          prompts.forEach((singlePrompt: any) => {
            // Handle prompt status mappings
            if (singlePrompt.status === "completed") {
              logger.debug("[PassageProvider] Prompt completed:", singlePrompt);

              // Transform server response to match PassagePromptResponse interface
              const promptResponse = {
                key: singlePrompt.name || singlePrompt.key,
                value: singlePrompt.result?.content || singlePrompt.value || "",
                response: singlePrompt,
              };

              onPromptCompleteRef.current?.(promptResponse);
            }
          });
        }

        // Handle status events
        if (eventName === "status") {
          // Status can be an array or string
          const statusValue: ConnectionStatus = Array.isArray(data)
            ? data[0]
            : data;
          if (statusValue) {
            logger.debug(
              "[PassageProvider] Status event received:",
              statusValue
            );
            setStatus(statusValue);

            // Handle error status
            if (statusValue === "error") {
              const errorData: PassageErrorData = {
                error: "Connection error occurred",
                code: "STATUS_ERROR",
              };
              logger.debug(
                "[PassageProvider] Calling onError callback for error status:",
                errorData
              );
              onErrorRef.current?.(errorData);
            }
          }
        }

        // Handle WebSocket connection errors
        if (eventName === "connect_error") {
          logger.debug("[PassageProvider] WebSocket connection error:", data);
          const errorData: PassageErrorData = {
            error: data?.message || "WebSocket connection failed",
            code: "WEBSOCKET_CONNECTION_ERROR",
            data: data,
          };
          onErrorRef.current?.(errorData);
        }

        // Handle general WebSocket errors
        if (eventName === "error") {
          logger.debug("[PassageProvider] WebSocket error:", data);
          const errorData: PassageErrorData = {
            error: data?.message || "WebSocket error occurred",
            code: "WEBSOCKET_ERROR",
            data: data,
          };
          onErrorRef.current?.(errorData);
        }

        // Handle reconnection errors
        if (eventName === "reconnect_error") {
          logger.debug("[PassageProvider] WebSocket reconnection error:", data);
          const errorData: PassageErrorData = {
            error: data?.error || "WebSocket reconnection failed",
            code: "WEBSOCKET_RECONNECTION_ERROR",
            data: data,
          };
          onErrorRef.current?.(errorData);
        }

        // Handle reconnection failures
        if (eventName === "reconnect_failed") {
          logger.debug("[PassageProvider] WebSocket reconnection failed");
          const errorData: PassageErrorData = {
            error: "WebSocket reconnection failed permanently",
            code: "WEBSOCKET_RECONNECTION_FAILED",
          };
          onErrorRef.current?.(errorData);
        }

        // Legacy event handlers for backward compatibility
        // Handle data complete events (legacy)
        if (eventName === "DATA_COMPLETE") {
          logger.debug(
            "[PassageProvider] Legacy DATA_COMPLETE event received:",
            data
          );
          const sessionDataResult: PassageDataResult = {
            data: data,
            prompts: [],
          };
          setSessionData(sessionDataResult);

          // Store in localStorage if we have an intentToken
          if (intentTokenRef.current) {
            storeDataResult(intentTokenRef.current, sessionDataResult);
          }

          onDataCompleteRef.current?.(sessionDataResult);
        }

        // Handle prompt complete events (legacy)
        if (eventName === "PROMPT_COMPLETE") {
          logger.debug(
            "[PassageProvider] Legacy PROMPT_COMPLETE event received:",
            data
          );
          onPromptCompleteRef.current?.(data);
        }
      }
    );

    return () => {
      logger.debug("[PassageProvider] Cleaning up listeners");
      unsubscribeMessage();
    };
  }, [intentTokenRef.current]);

  // Open method with new signature
  const open = useCallback(
    async (options: PassageOpenOptions = {}) => {
      // Use provided intent token or the stored one
      const token = options.intentToken || intentTokenRef.current;

      if (!token) {
        const error =
          "No intent token available. Initialize first or provide intentToken in options";
        logger.error("[PassageProvider]", error);
        options.onError?.({ error });
        return;
      }

      logger.debug("[PassageProvider] Opening Passage with options:", {
        intentToken: token,
        hasPrompts: !!options.prompts?.length,
        presentationStyle: options.presentationStyle,
      });

      try {
        // Store callbacks
        if (options.onConnectionComplete) {
          onConnectionCompleteRef.current = options.onConnectionComplete;
        }
        if (options.onError) {
          onErrorRef.current = options.onError;
        }
        if (options.onDataComplete) {
          onDataCompleteRef.current = options.onDataComplete;
        }
        if (options.onPromptComplete) {
          onPromptCompleteRef.current = options.onPromptComplete;
        }
        if (options.onExit) {
          onExitRef.current = options.onExit;
        }

        // Set initial state
        intentTokenRef.current = token;
        setPresentationStyle(options.presentationStyle || "modal");

        // Set initial status to pending so QR code shows immediately
        setStatus("pending");

        // Handle embed mode
        if (options.presentationStyle === "embed" && options.container) {
          logger.debug(
            "[PassageProvider] Setting up embed mode with container:",
            options.container
          );
          const containerEl =
            typeof options.container === "string"
              ? (document.querySelector(options.container) as HTMLElement)
              : options.container;

          if (!containerEl) {
            throw new Error("Container element not found");
          }

          setContainer(containerEl);
        }

        // Check if already connected with same token
        if (wsManager.isActive() && wsManager.getIntentToken() === token) {
          logger.debug(
            "[PassageProvider] Reusing existing WebSocket connection"
          );

          // Get current connection data
          const currentConnection = wsManager.getCurrentConnection();
          if (currentConnection) {
            setConnectionData(currentConnection);
          }
        } else {
          // Connect WebSocket
          const socketUrl = config.socketUrl || DEFAULT_SOCKET_URL;
          const socketNamespace =
            config.socketNamespace || DEFAULT_SOCKET_NAMESPACE;

          logger.debug(
            "[PassageProvider] Connecting to WebSocket:",
            socketUrl + socketNamespace
          );
          await wsManager.connect(token, socketUrl, socketNamespace);
        }

        setIsOpen(true);
        logger.debug("[PassageProvider] Passage opened successfully");
      } catch (error) {
        logger.error("[PassageProvider] Failed to open Passage:", error);

        const errorData: PassageErrorData = {
          error:
            error instanceof Error ? error.message : "Failed to open Passage",
          code: "OPEN_ERROR",
        };

        logger.debug(
          "[PassageProvider] Calling onError callback due to open failure"
        );
        options.onError?.(errorData);

        // Clean up on error but preserve intent token for retry
        logger.debug(
          "[PassageProvider] Cleaning up after error (preserving intent token for retry)"
        );
      }
    },
    [config]
  );

  // Close method
  const close = useCallback(async () => {
    logger.debug("[PassageProvider] Closing Passage");

    // If not connected yet, this is a manual exit
    if (!status || status === "pending" || status === "connecting") {
      if (onExitRef.current) {
        logger.debug(
          "[PassageProvider] User manually closed modal before connection"
        );
        onExitRef.current("manual_close");
      }
    }

    // Keep WebSocket connected - only close the modal UI
    logger.debug(
      "[PassageProvider] Keeping WebSocket connected for background events"
    );

    // Reset state but preserve intent token for reopening
    logger.debug(
      "[PassageProvider] Resetting state (preserving intent token and WebSocket)"
    );
    setIsOpen(false);
    // Keep intentToken so modal can be reopened without reinitializing
    setStatus(null);
    setConnectionData(null);
    setSessionData(null);
    setPresentationStyle("modal");
    setContainer(null);

    // Keep callbacks active for background events
    logger.debug(
      "[PassageProvider] Keeping callbacks active for background events"
    );

    logger.debug(
      "[PassageProvider] Modal closed and state cleared (intent token and WebSocket preserved)"
    );
  }, [status]);

  // Disconnect method
  const disconnect = useCallback(async () => {
    logger.debug("[PassageProvider] Disconnecting WebSocket");

    // Disconnect WebSocket if active
    if (wsManager.isActive()) {
      logger.debug("[PassageProvider] Disconnecting active WebSocket");
      wsManager.disconnect();
    }

    // Clear all callbacks on explicit disconnect
    onConnectionCompleteRef.current = undefined;
    onErrorRef.current = undefined;
    onDataCompleteRef.current = undefined;
    onPromptCompleteRef.current = undefined;
    onExitRef.current = undefined;

    logger.debug(
      "[PassageProvider] WebSocket disconnected and callbacks cleared"
    );
  }, []);

  // Get data method
  const getData = useCallback(async (): Promise<PassageDataResult> => {
    // Get stored data from localStorage
    const storedResults = getStoredDataResults();

    if (storedResults.length > 0) {
      logger.debug(
        "[PassageProvider] Returning stored data results:",
        storedResults
      );
      // Return the stored results in the expected format
      return {
        data: storedResults,
        prompts: [],
      };
    }

    // If no stored data and we have session data, return session data
    if (sessionData) {
      logger.debug("[PassageProvider] Returning cached session data");
      return sessionData;
    }

    // If no data available, return empty result
    logger.debug("[PassageProvider] No data available");
    return {
      data: null,
      prompts: [],
    };
  }, [sessionData]);

  const contextValue: PassageContextValue = {
    initialize,
    open,
    close,
    disconnect,
    getData,
  };

  // Render embedded content
  useEffect(() => {
    if (presentationStyle === "embed" && container && isOpen) {
      logger.debug("[PassageProvider] Setting up embed portal");
      // Create a div for React portal if it doesn't exist
      let portalDiv = container.querySelector(
        ".passage-embed-portal"
      ) as HTMLDivElement;
      if (!portalDiv) {
        portalDiv = document.createElement("div");
        portalDiv.className = "passage-embed-portal";
        container.appendChild(portalDiv);
        logger.debug("[PassageProvider] Created embed portal div");
      }
    }
  }, [presentationStyle, container, isOpen]);

  return (
    <PassageContext.Provider value={contextValue}>
      {children}

      {/* Render modal using React Portal to ensure proper z-index stacking */}
      {presentationStyle === "modal" &&
        typeof window !== "undefined" &&
        ReactDOM.createPortal(
          <PassageModal
            isOpen={isOpen}
            intentToken={intentTokenRef.current}
            status={status}
            baseUrl={config.webUrl || DEFAULT_WEB_BASE_URL}
            onClose={close}
            customStyles={config.customStyles}
            presentationStyle="modal"
          />,
          document.body
        )}

      {/* For embed mode, render inline */}
      {presentationStyle === "embed" && container && isOpen && (
        <div className="passage-embed-container">
          <PassageModal
            isOpen={isOpen}
            intentToken={intentTokenRef.current}
            status={status}
            baseUrl={config.webUrl || DEFAULT_WEB_BASE_URL}
            onClose={close}
            customStyles={config.customStyles}
            presentationStyle="embed"
          />
        </div>
      )}
    </PassageContext.Provider>
  );
};
