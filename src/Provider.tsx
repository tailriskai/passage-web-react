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
import { analytics, ANALYTICS_EVENTS } from "./analytics";
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
  PassageStoredDataResult,
  PassageSuccessData,
  PassageErrorData,
  PassagePrompt,
  ConnectionStatus,
  ConnectionUpdate,
  PassagePromptResponse,
} from "./types";

export const PassageContext = createContext<PassageContextValue | null>(null);

// Helper function to decode JWT and extract sessionId
const decodeJWT = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    logger.error('Error decoding JWT:', error);
    return null;
  }
};

// LocalStorage helper functions
const getStoredDataResults = (): Array<{
  intentToken: string;
  data: {
    data: any;
    prompts: PassagePromptResponse[];
  };
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

const storePromptResult = (
  intentToken: string,
  promptResult: PassagePromptResponse
): void => {
  try {
    const existing = getStoredDataResults();
    const prompts =
      existing.find((p) => p.intentToken === intentToken)?.data.prompts || [];
    const prompt = prompts.find((p: any) => p.name === promptResult.name);
    if (prompt) {
      prompt.content = promptResult.content;
      prompt.outputType = promptResult.outputType;
      prompt.outputFormat = promptResult.outputFormat;
      prompt.response = promptResult.response;
      prompt.name = promptResult.name;
    }

    // Update the localStorage with the updated data
    localStorage.setItem(PASSAGE_DATA_RESULTS_KEY, JSON.stringify(existing));
  } catch (error) {
    logger.error("[PassageProvider] Failed to store prompt result:", error);
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
  const [intentToken, setIntentToken] = useState<string | null>(null);
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
  const onPromptCompleteRef = useRef<
    ((prompt: PassagePromptResponse) => void) | undefined
  >(undefined);
  const onExitRef = useRef<((reason?: string) => void) | undefined>(undefined);

  const wsManager = WebSocketManager.getInstance();

  // Update logger and analytics intent token helper function
  const updateIntentToken = useCallback((token: string | null) => {
    logger.updateIntentToken(token);
    analytics.updateIntentToken(token);
    logger.debug(
      "[PassageProvider] Updated logger and analytics with intent token:",
      {
        hasIntentToken: !!token,
      }
    );
  }, []);

  // Initialize logger and analytics with debug mode
  useEffect(() => {
    logger.setDebugMode(config.debug ?? false);
    // Ensure logger endpoint follows current web base URL
    logger.setWebBaseUrl(config.webUrl || DEFAULT_WEB_BASE_URL);

    // Configure analytics
    analytics.configure({
      enabled: true, // Always enabled for analytics
      webBaseUrl: config.webUrl || DEFAULT_WEB_BASE_URL,
    });

    // Initialize logger and analytics with current intent token (if any)
    updateIntentToken(intentTokenRef.current);
    logger.debug("[PassageProvider] Initialized with config:", config);

    // Track configuration
    analytics.track(ANALYTICS_EVENTS.SDK_CONFIGURE_START, {
      debug: config.debug,
      webUrl: config.webUrl,
    });
  }, [config.debug, config.webUrl, updateIntentToken]);

  // Generate intent token
  const generateIntentToken = useCallback(
    async (
      publishableKey: string,
      prompts: PassagePrompt[] = [],
      integrationId?: string,
      products?: string[],
      sessionArgs?: any,
      record?: boolean,
      resources?: any
    ): Promise<string> => {
      try {
        const apiUrl = config.apiUrl || DEFAULT_API_BASE_URL;

        const payload = {
          integrationId,
          prompts,
          products,
          sessionArgs,
          record,
          resources,
        };

        // Always log resources to console for debugging
        console.log("[PassageProvider] Resources before payload creation:", resources);
        console.log("[PassageProvider] Full payload being sent:", payload);
        console.log("[PassageProvider] Stringified payload:", JSON.stringify(payload));

        logger.debug(
          "[PassageProvider] Generating intent token with payload:",
          {
            publishableKey,
            promptsCount: prompts.length,
            prompts: prompts.map((p) => ({
              name: p.name,
              value: p.value,
              outputType: p.outputType,
              outputFormat: p.outputFormat,
            })),
            integrationId,
            products,
            sessionArgs,
            record,
            resources,
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
          let errorMessage = `Failed to generate intent token: ${response.status}`;

          try {
            const errorData = await response.json();

            // Handle validation errors with detailed messages
            if (errorData.errorCode === "VALIDATION_001" && errorData.details) {
              const validationErrors = Object.values(errorData.details)
                .map((detail: any) => {
                  const resourceName = detail.property || "Unknown";
                  const constraints =
                    detail.constraints?.custom ||
                    detail.constraints?.message ||
                    "Validation failed";
                  return `${resourceName}: ${constraints}`;
                })
                .join("; ");

              errorMessage = `Validation failed: ${validationErrors}`;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (parseError) {
            // If we can't parse the error response, use the default message
            logger.warn(
              "[PassageProvider] Could not parse error response:",
              parseError
            );
          }

          throw new Error(errorMessage);
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
      // Always log resources to console for debugging
      console.log("[PassageProvider] Initializing with options:", options);
      console.log("[PassageProvider] Resources received in initialize:", options.resources);

      logger.debug("[PassageProvider] Initializing with options:", {
        publishableKey: options.publishableKey,
        hasPrompts: !!options.prompts?.length,
        promptsCount: options.prompts?.length || 0,
        integrationId: options.integrationId,
        products: options.products,
        sessionArgs: options.sessionArgs,
        record: options.record,
        resources: options.resources,
      });

      try {
        // Generate intent token
        const token = await generateIntentToken(
          options.publishableKey,
          options.prompts || [],
          options.integrationId,
          options.products,
          options.sessionArgs,
          options.record,
          options.resources
        );
        intentTokenRef.current = token;
        setIntentToken(token);
        updateIntentToken(token);
        logger.debug("[PassageProvider] Initialization complete");

        // Track successful configuration
        analytics.track(ANALYTICS_EVENTS.SDK_CONFIGURE_SUCCESS);

        // Store callbacks
        onConnectionCompleteRef.current = options.onConnectionComplete;
        onErrorRef.current = options.onError;
        onDataCompleteRef.current = options.onDataComplete;
        onPromptCompleteRef.current = options.onPromptComplete;
        onExitRef.current = options.onExit;
      } catch (error) {
        logger.error("[PassageProvider] Initialization failed:", error);

        // Track configuration error
        analytics.track(ANALYTICS_EVENTS.SDK_CONFIGURE_ERROR, {
          error:
            error instanceof Error ? error.message : "Initialization failed",
        });

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
        logger.debug("[PassageProvider] WebSocket message received:", {
          eventName,
          data,
        });

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
            // Note: onConnectionComplete is now called only on "done" event with success:true
          } else if (connection.status === "data_available") {
            logger.debug(
              "[PassageProvider] Data available - data_available status reached"
            );

            // Update session data
            const sessionDataResult: PassageDataResult = {
              data: connection.data,
              prompts: connection.promptResults.map((promptResult) => ({
                name: promptResult.name,
                content: promptResult.result,
                response: promptResult.result,
              })),
              intentToken: intentTokenRef.current || undefined,
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

            // Track connection error
            analytics.track(ANALYTICS_EVENTS.SDK_ON_ERROR, {
              connectionId: connection.id,
              status: connection.status,
              error:
                connection.status === "rejected"
                  ? "Connection rejected"
                  : "Connection failed",
            });

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
              const promptResponse: PassagePromptResponse = {
                name: singlePrompt.name,
                outputType: singlePrompt.outputType,
                outputFormat: singlePrompt.outputFormat,
                content: singlePrompt.result?.content || "",
                response: singlePrompt,
              };

              if (intentTokenRef.current) {
                storePromptResult(intentTokenRef.current, promptResponse);
              }

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

        // Handle direct data_available event
        if (eventName === "data_available") {
          logger.debug(
            "[PassageProvider] Direct data_available event received:",
            data
          );

          // Update status
          setStatus("data_available");

          // Create session data result
          const sessionDataResult: PassageDataResult = {
            data: data?.data || data || [],
            prompts: data?.prompts || [],
            intentToken: intentTokenRef.current || undefined,
          };

          setSessionData(sessionDataResult);

          // Store in localStorage if we have an intentToken
          if (intentTokenRef.current) {
            storeDataResult(intentTokenRef.current, sessionDataResult);
          }

          logger.debug(
            "[PassageProvider] Calling onDataComplete callback from data_available event:",
            sessionDataResult
          );
          onDataCompleteRef.current?.(sessionDataResult);
        }

        // Handle done event
        if (eventName === "done") {
          const success = data?.success !== false; // Default to true if not specified
          const resultData = data?.data;

          logger.debug("[PassageProvider] Done event received:", {
            success,
            hasData: !!resultData,
          });

          if (success) {
            // Track successful completion
            analytics.track(ANALYTICS_EVENTS.SDK_ON_SUCCESS, {
              connectionId: connectionData?.id,
              status: "done",
              success: true,
            });

            const successData: PassageSuccessData = {
              connectionId: connectionData?.id || "",
              status: "done",
              metadata: {
                completedAt: new Date().toISOString(),
                promptResults: connectionData?.promptResults || [],
              },
              data: resultData || connectionData?.promptResults || [],
              intentToken: intentTokenRef.current || undefined,
            };

            logger.debug(
              "[PassageProvider] Calling onConnectionComplete callback from done event:",
              successData
            );
            onConnectionCompleteRef.current?.(successData);

            // Also call onDataComplete with the result data
            const dataResult: PassageDataResult = {
              data: resultData || connectionData?.data || [],
              prompts:
                connectionData?.promptResults?.map((promptResult: any) => ({
                  name: promptResult.name,
                  content: promptResult.result || promptResult.content || "",
                  response:
                    promptResult.result ||
                    promptResult.response ||
                    promptResult,
                  outputType: promptResult.outputType,
                  outputFormat: promptResult.outputFormat,
                })) || [],
              intentToken: intentTokenRef.current || undefined,
            };

            logger.debug(
              "[PassageProvider] Calling onDataComplete callback from done event:",
              dataResult
            );
            onDataCompleteRef.current?.(dataResult);

            // Store in localStorage if we have an intentToken
            if (intentTokenRef.current) {
              storeDataResult(intentTokenRef.current, dataResult);
            }
          } else {
            // Handle done with failure
            const errorMessage =
              (resultData as any)?.error || "Operation completed with failure";

            // Track error
            analytics.track(ANALYTICS_EVENTS.SDK_ON_ERROR, {
              connectionId: connectionData?.id,
              status: "done",
              success: false,
              error: errorMessage,
            });

            const errorData: PassageErrorData = {
              error: errorMessage,
              code: "DONE_FAILURE",
              data: resultData,
            };

            logger.debug(
              "[PassageProvider] Calling onError callback from done event (success:false):",
              errorData
            );
            onErrorRef.current?.(errorData);
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
            intentToken: intentTokenRef.current || undefined,
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

        // Set initial state - batch updates to prevent multiple renders
        intentTokenRef.current = token;
        setIntentToken(token);
        updateIntentToken(token);

        // Track open request
        analytics.track(ANALYTICS_EVENTS.SDK_OPEN_REQUEST, {
          presentationStyle: options.presentationStyle || "modal",
          hasPrompts: !!options.prompts?.length,
        });

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

        // Batch state updates to prevent multiple renders
        setPresentationStyle(options.presentationStyle || "modal");
        setStatus("pending");
        setIsOpen(true);

        logger.debug("[PassageProvider] Passage opened successfully");

        // Track modal opened
        analytics.track(ANALYTICS_EVENTS.SDK_MODAL_OPENED, {
          presentationStyle: options.presentationStyle || "modal",
        });
      } catch (error) {
        logger.error("[PassageProvider] Failed to open Passage:", error);

        // Track open error
        analytics.track(ANALYTICS_EVENTS.SDK_OPEN_ERROR, {
          error:
            error instanceof Error ? error.message : "Failed to open Passage",
        });

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

    // Track modal closed
    analytics.track(ANALYTICS_EVENTS.SDK_MODAL_CLOSED, {
      status: status || "unknown",
      presentationStyle: presentationStyle,
    });

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

  // Get data method - returns cached data from localStorage
  const getData = useCallback(async (): Promise<PassageStoredDataResult[]> => {
    // Return cached data from localStorage
    const storedResults = getStoredDataResults();

    if (storedResults.length > 0) {
      logger.debug(
        "[PassageProvider] Returning stored data results:",
        storedResults
      );
      // Return the stored results with metadata, including extracted connectionId
      return storedResults.map((result) => {
        // Extract connectionId from JWT sessionId
        const decoded = decodeJWT(result.intentToken);
        const connectionId = decoded?.sessionId || undefined;

        return {
          intentToken: result.intentToken,
          timestamp: result.timestamp,
          data: result.data.data,
          prompts: result.data.prompts.map((prompt) => ({
            name: prompt.name,
            content: prompt.content,
            outputType: prompt.outputType,
            outputFormat: prompt.outputFormat,
            response: prompt.response,
          })),
          connectionId
        };
      });
    }

    // If no stored data and we have session data, return session data with current intent token
    if (sessionData) {
      logger.debug("[PassageProvider] Returning cached session data");

      // Extract connectionId from current intent token
      const currentToken = intentTokenRef.current;
      let connectionId: string | undefined;
      if (currentToken) {
        const decoded = decodeJWT(currentToken);
        connectionId = decoded?.sessionId;
      }

      return [
        {
          intentToken: currentToken || "current-session",
          timestamp: new Date().toISOString(),
          data: sessionData.data,
          prompts: sessionData.prompts || [],
          connectionId
        },
      ];
    }

    // If no data available, return empty array
    logger.debug("[PassageProvider] No data available");
    return [
      {
        data: [],
        prompts: [],
      },
    ];
  }, [sessionData]);

  // Fetch resource method - fetches resources using current intent token
  const fetchResource = useCallback(async (resourceNames: string[]): Promise<any> => {
    const currentToken = intentTokenRef.current;

    if (!currentToken) {
      logger.error("[PassageProvider] No intent token available");
      throw new Error("No intent token available. Please initialize first.");
    }

    // Decode JWT to get sessionId as connectionId and available resources
    const decoded = decodeJWT(currentToken);
    const connectionId = decoded?.sessionId;
    const tokenResources = decoded?.resources || {};

    if (!connectionId) {
      logger.error("[PassageProvider] Could not extract sessionId from intent token");
      throw new Error("Invalid intent token - no sessionId found");
    }

    logger.debug("[PassageProvider] Decoded token resources:", tokenResources);
    logger.debug("[PassageProvider] Requested resources:", resourceNames);

    // Filter requested resources to only those defined in the token
    const availableResources = resourceNames.filter(resource => {
      // Extract base resource name (e.g., "trip-read" -> "trip")
      const baseName = resource.replace(/-read$/, '').replace(/-write$/, '');
      const accessType = resource.includes('-write') ? 'write' : 'read';

      // Check if this resource and access type exists in token
      const isAvailable = tokenResources[baseName] && tokenResources[baseName][accessType];

      if (!isAvailable) {
        logger.warn(`[PassageProvider] Resource ${resource} not available in token. Available resources:`, tokenResources);
      }

      return isAvailable;
    });

    if (availableResources.length === 0) {
      logger.warn("[PassageProvider] No valid resources to fetch from those requested");
      return [];
    }

    logger.debug("[PassageProvider] Fetching available resources", {
      connectionId,
      resources: availableResources,
      hasIntentToken: !!currentToken
    });

    try {
      const apiUrl = config.apiUrl || DEFAULT_API_BASE_URL;
      const fetchPromises = availableResources.map(async (resource) => {
        // Extract resource name from the value (e.g., "trip-read" -> "trip")
        let resourceName = resource.replace(/-read$/, '').replace(/-write$/, '');
        const originalResourceName = resourceName;

        // Special cases for API endpoint naming:
        // - "trip" should be pluralized to "trips"
        // - "accountInfo" should be "account-info"
        if (resourceName === 'trip') {
          resourceName = 'trips';
        } else if (resourceName === 'accountInfo') {
          resourceName = 'account-info';
        }

        const url = `${apiUrl}/connections/${connectionId}/${resourceName}?limit=1000`;

        logger.debug(`[PassageProvider] Fetching resource ${resourceName} from: ${url}`);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-intent-token': currentToken,
            'Accept': 'application/json',
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error(`[PassageProvider] Failed to fetch ${resourceName}: ${response.status} - ${errorText}`);
          return null;
        }

        const data = await response.json();
        logger.debug(`[PassageProvider] Successfully fetched ${resourceName} data`);

        return {
          resourceName: originalResourceName, // Return the original name for clarity
          data
        };
      });

      const results = await Promise.all(fetchPromises);
      const validResults = results.filter(r => r !== null);

      // Store in localStorage for future retrieval
      if (currentToken && validResults.length > 0) {
        storeDataResult(currentToken, {
          data: validResults,
          prompts: sessionData?.prompts || []
        });
      }

      logger.debug("[PassageProvider] Returning fetched resource data:", validResults);
      return validResults;

    } catch (error) {
      logger.error("[PassageProvider] Error fetching resources:", error);
      throw error;
    }
  }, [sessionData, config.apiUrl]);

  const contextValue: PassageContextValue = {
    initialize,
    open,
    close,
    disconnect,
    getData,
    fetchResource,
    intentToken,
  };

  // No longer needed - we'll use React Portal directly

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

      {/* For embed mode, render using React Portal into container */}
      {presentationStyle === "embed" &&
        container &&
        isOpen &&
        typeof window !== "undefined" &&
        ReactDOM.createPortal(
          <PassageModal
            isOpen={isOpen}
            intentToken={intentTokenRef.current}
            status={status}
            baseUrl={config.webUrl || DEFAULT_WEB_BASE_URL}
            onClose={close}
            customStyles={config.customStyles}
            presentationStyle="embed"
          />,
          container
        )}
    </PassageContext.Provider>
  );
};
