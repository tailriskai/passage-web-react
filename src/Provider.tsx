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
import type {
  PassageConfig,
  PassageContextValue,
  PassageOpenOptions,
  PassageSuccessData,
  PassageErrorData,
  ConnectionStatus,
  ConnectionUpdate,
} from "./types";

export const PassageContext = createContext<PassageContextValue | null>(null);

interface PassageProviderProps {
  children: React.ReactNode;
  config?: PassageConfig;
}

export const PassageProvider: React.FC<PassageProviderProps> = ({
  children,
  config = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [intentToken, setIntentToken] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [connectionData, setConnectionData] = useState<ConnectionUpdate | null>(
    null
  );
  const [presentationStyle, setPresentationStyle] = useState<"modal" | "embed">(
    "modal"
  );
  const [container, setContainer] = useState<HTMLElement | null>(null);

  const optionsRef = useRef<PassageOpenOptions | null>(null);
  const wsManager = WebSocketManager.getInstance();

  // Configure debug mode
  useEffect(() => {
    console.log("[PassageProvider] Setting debug mode:", config.debug || false);
    wsManager.setDebug(config.debug || false);
  }, [config.debug]);

  // Handle connection updates - now works independently of isOpen
  useEffect(() => {
    if (!intentToken) {
      console.log(
        "[PassageProvider] Skipping connection listener setup - no intentToken"
      );
      return;
    }

    console.log(
      "[PassageProvider] Setting up connection listener for intentToken:",
      intentToken
    );

    const unsubscribeConnection = wsManager.addConnectionListener(
      (connection: ConnectionUpdate) => {
        console.log(
          "[PassageProvider] Connection update received:",
          connection
        );

        // Store the connection data
        setConnectionData(connection);

        // Note: Status is now only set from status events, not connection updates

        // Handle terminal states
        if (connection.status === "data_available") {
          console.log(
            "[PassageProvider] Connection successful - data_available status reached"
          );
          const successData: PassageSuccessData = {
            connectionId: connection.id,
            status: connection.status,
            metadata: {
              completedAt: new Date().toISOString(),
              promptResults: connection.promptResults,
            },
          };

          console.log(
            "[PassageProvider] Calling onSuccess callback with data:",
            successData
          );
          optionsRef.current?.onSuccess?.(successData);

          // Note: Removed auto-close functionality - connection stays open
        } else if (
          connection.status === "error" ||
          connection.status === "rejected"
        ) {
          console.log(
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

          console.log(
            "[PassageProvider] Calling onError callback with data:",
            errorData
          );
          optionsRef.current?.onError?.(errorData);
        }
      }
    );

    // Add dedicated status listener
    const unsubscribeStatus = wsManager.addStatusListener(
      (newStatus: ConnectionStatus) => {
        console.log("[PassageProvider] Status event received:", newStatus);

        // This is the ONLY place where status should be set
        setStatus(newStatus);

        // Notify status change callback
        if (optionsRef.current?.onStatusChange) {
          console.log(
            "[PassageProvider] Calling onStatusChange callback with status:",
            newStatus
          );
          optionsRef.current.onStatusChange(newStatus);
        }
      }
    );

    // Set up message listener for all websocket events
    const unsubscribeMessage = wsManager.addMessageListener(
      (eventName: string, data: any) => {
        console.log(
          "[PassageProvider] WebSocket message received:",
          eventName,
          data
        );

        // Handle status events from messages
        if (eventName === "status") {
          // Status can be an array or string
          const statusValue = Array.isArray(data) ? data[0] : data;
          if (statusValue) {
            console.log(
              "[PassageProvider] Status from message event:",
              statusValue
            );
            // Trigger the status listener
            wsManager.emitStatus(statusValue);
          }
        }

        // Call onMessage callback if provided
        if (optionsRef.current?.onMessage) {
          console.log(
            "[PassageProvider] Calling onMessage callback with:",
            eventName,
            data
          );
          optionsRef.current.onMessage(eventName, data);
        }
      }
    );

    return () => {
      console.log("[PassageProvider] Cleaning up listeners");
      unsubscribeConnection();
      unsubscribeStatus();
      unsubscribeMessage();
    };
  }, [intentToken]);

  // New method to connect WebSocket without opening modal
  const connectWebSocket = useCallback(
    async (token: string, options?: PassageOpenOptions) => {
      console.log(
        "[PassageProvider] Connecting WebSocket with token:",
        token,
        "options:",
        options
      );

      try {
        // Check if already connected with same token
        if (wsManager.isActive() && wsManager.getIntentToken() === token) {
          console.log("[PassageProvider] Already connected with same token");

          // Set state from existing connection
          setIntentToken(token);
          const currentConnection = wsManager.getCurrentConnection();
          if (currentConnection) {
            setConnectionData(currentConnection);
            // Note: Status will be set by status events
          }

          return;
        }

        // Store options
        optionsRef.current = options || null;

        // Set initial state
        setIntentToken(token);
        // Note: Status will be set by status events from WebSocket

        // Connect WebSocket
        const socketUrl =
          config.socketUrl || "https://prod-gravy-connect-api.onrender.com";
        const socketNamespace = config.socketNamespace || "/ws";

        console.log(
          "[PassageProvider] Connecting to WebSocket:",
          socketUrl + socketNamespace
        );
        await wsManager.connect(token, socketUrl, socketNamespace);

        console.log("[PassageProvider] WebSocket connected successfully");
      } catch (error) {
        console.error("[PassageProvider] Failed to connect WebSocket:", error);

        const errorData: PassageErrorData = {
          error:
            error instanceof Error
              ? error.message
              : "Failed to connect WebSocket",
          code: "WEBSOCKET_CONNECTION_ERROR",
        };

        console.log(
          "[PassageProvider] Calling onError callback due to connection failure"
        );
        options?.onError?.(errorData);

        // Clean up on error
        console.log("[PassageProvider] Cleaning up after error");
        setIntentToken(null);
        // Status will be cleared by status events
      }
    },
    [config]
  );

  const open = useCallback(
    async (token: string, options?: PassageOpenOptions) => {
      console.log(
        "[PassageProvider] Opening Passage with token:",
        token,
        "options:",
        options
      );
      try {
        // Store options
        optionsRef.current = options || null;

        // Set initial state
        setIntentToken(token);
        // Note: Status will be set by status events from WebSocket
        setPresentationStyle(options?.presentationStyle || "modal");

        // Handle embed mode
        if (options?.presentationStyle === "embed" && options.container) {
          console.log(
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
          console.log(
            "[PassageProvider] Reusing existing WebSocket connection"
          );

          // Get current connection data
          const currentConnection = wsManager.getCurrentConnection();
          if (currentConnection) {
            setConnectionData(currentConnection);
            // Note: Status will be set by status events
          }
        } else {
          // Connect WebSocket
          const socketUrl =
            config.socketUrl || "https://prod-gravy-connect-api.onrender.com";
          const socketNamespace = config.socketNamespace || "/ws";

          console.log(
            "[PassageProvider] Connecting to WebSocket:",
            socketUrl + socketNamespace
          );
          await wsManager.connect(token, socketUrl, socketNamespace);
        }

        setIsOpen(true);
        console.log("[PassageProvider] Passage opened successfully");
      } catch (error) {
        console.error("[PassageProvider] Failed to open Passage:", error);

        const errorData: PassageErrorData = {
          error:
            error instanceof Error ? error.message : "Failed to open Passage",
          code: "OPEN_ERROR",
        };

        console.log(
          "[PassageProvider] Calling onError callback due to open failure"
        );
        options?.onError?.(errorData);

        // Clean up on error
        console.log("[PassageProvider] Cleaning up after error");
        setIntentToken(null);
        // Status will be cleared by status events
      }
    },
    [config]
  );

  const close = useCallback(() => {
    console.log("[PassageProvider] Closing Passage");

    // Note: We don't disconnect WebSocket here anymore to allow reuse
    // Only disconnect if explicitly requested

    // Call onClose callback
    if (optionsRef.current?.onClose) {
      console.log("[PassageProvider] Calling onClose callback");
      optionsRef.current.onClose();
    }

    // Reset modal state but keep connection
    console.log("[PassageProvider] Resetting modal state");
    setIsOpen(false);
    setPresentationStyle("modal");
    setContainer(null);
  }, []);

  // New method to disconnect WebSocket
  const disconnect = useCallback(() => {
    console.log("[PassageProvider] Disconnecting WebSocket");
    wsManager.disconnect();

    // Reset all state
    setIsOpen(false);
    setIntentToken(null);
    setStatus(null);
    setConnectionData(null);
    setPresentationStyle("modal");
    setContainer(null);
    optionsRef.current = null;
  }, []);

  // New method to reset state without disconnecting WebSocket
  const reset = useCallback(() => {
    console.log("[PassageProvider] Resetting Passage state");

    // Close any open modals
    setIsOpen(false);

    // Clear all state
    setIntentToken(null);
    setStatus(null);
    setConnectionData(null);
    setPresentationStyle("modal");
    setContainer(null);
    optionsRef.current = null;

    // Disconnect WebSocket if active
    if (wsManager.isActive()) {
      console.log("[PassageProvider] Disconnecting active WebSocket");
      wsManager.disconnect();
    }
  }, []);

  const contextValue: PassageContextValue = {
    isOpen,
    status,
    open,
    close,
    intentToken,
    connectionData,
    // Expose WebSocket manager methods for direct access
    wsManager,
    // New methods
    connectWebSocket,
    disconnect,
    reset,
    isWebSocketConnected: wsManager.isActive(),
  };

  // Render embedded content
  useEffect(() => {
    if (presentationStyle === "embed" && container && isOpen) {
      console.log("[PassageProvider] Setting up embed portal");
      // Create a div for React portal if it doesn't exist
      let portalDiv = container.querySelector(
        ".passage-embed-portal"
      ) as HTMLDivElement;
      if (!portalDiv) {
        portalDiv = document.createElement("div");
        portalDiv.className = "passage-embed-portal";
        container.appendChild(portalDiv);
        console.log("[PassageProvider] Created embed portal div");
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
            intentToken={intentToken}
            status={status}
            baseUrl={config.baseUrl || "https://gravy-connect-infra-web.vercel.app/"}
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
            intentToken={intentToken}
            status={status}
            baseUrl={config.baseUrl || "https://gravy-connect-infra-web.vercel.app/"}
            onClose={close}
            customStyles={config.customStyles}
            presentationStyle="embed"
          />
        </div>
      )}
    </PassageContext.Provider>
  );
};
