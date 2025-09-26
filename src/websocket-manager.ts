import { io, Socket } from "socket.io-client";
import { logger } from "./logger";
import { analytics, ANALYTICS_EVENTS } from "./analytics";
import type {
  ConnectionStatus,
  StatusUpdateMessage,
  ConnectionUpdate,
} from "./types";
import { DEFAULT_SOCKET_NAMESPACE, DEFAULT_SOCKET_URL } from "./config";

export class WebSocketManager {
  private static instance: WebSocketManager | null = null;
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private intentToken: string | null = null;
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private connectionListeners: Set<(connection: ConnectionUpdate) => void> =
    new Set();
  private messageListeners: Set<(eventName: string, data: any) => void> =
    new Set();
  private currentConnection: ConnectionUpdate | null = null;
  private headlessCleanup: (() => void) | null = null;

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  setDebug(debug: boolean): void {
    logger.setDebugMode(debug);
    logger.debug("[WebSocketManager] Debug mode set to:", debug);
  }

  setHeadlessCleanup(cleanup: () => void): void {
    this.headlessCleanup = cleanup;
  }

  async connect(
    intentToken: string,
    socketUrl: string = DEFAULT_SOCKET_URL,
    namespace: string = DEFAULT_SOCKET_NAMESPACE
  ): Promise<void> {
    if (this.socket?.connected && this.intentToken === intentToken) {
      logger.debug(
        "[WebSocketManager] Already connected with same intent token"
      );
      return;
    }

    // Disconnect existing connection if any
    if (this.socket) {
      logger.debug(
        "[WebSocketManager] Disconnecting existing socket before creating new connection"
      );
      this.disconnect();
    }

    this.intentToken = intentToken;

    logger.debug(
      `[WebSocketManager] Connecting to ${socketUrl}${namespace} with intent token:`,
      intentToken
    );

    // Track remote control connection start
    analytics.track(ANALYTICS_EVENTS.SDK_REMOTE_CONTROL_CONNECT_START, {
      socketUrl,
      namespace,
    });

    this.socket = io(`${socketUrl}${namespace}`, {
      transports: ["websocket", "polling"],
      timeout: 10000,
      forceNew: true,
      query: {
        intentToken: this.intentToken,
        agentName: "passage-react-js/1.0",
      },
    });

    this.setupEventHandlers();

    // Wait for connection
    return new Promise((resolve, reject) => {
      let isResolved = false;

      const timeout = setTimeout(() => {
        if (!isResolved) {
          logger.debug(
            "[WebSocketManager] Connection timeout after 10 seconds"
          );
          reject(new Error("WebSocket connection timeout"));
        }
      }, 10000);

      const cleanup = () => {
        isResolved = true;
        clearTimeout(timeout);
      };

      this.socket!.once("connect", () => {
        this.isConnected = true;
        logger.debug(
          "[WebSocketManager] Connected to WebSocket server, socket ID:",
          this.socket?.id
        );

        // Track successful WebSocket connection
        analytics.track(ANALYTICS_EVENTS.SDK_REMOTE_CONTROL_CONNECT_SUCCESS, {
          socketId: this.socket?.id,
        });

        // Don't resolve yet - wait for welcome or connection message
      });

      this.socket!.once("connect_error", (error) => {
        cleanup();
        logger.debug("[WebSocketManager] Connection error:", error.message);

        // Track connection error
        analytics.track(ANALYTICS_EVENTS.SDK_REMOTE_CONTROL_CONNECT_ERROR, {
          error: error.message,
        });

        reject(error);
      });

      // Resolve when we get welcome or connection message
      this.socket!.once("welcome", () => {
        cleanup();
        logger.debug(
          "[WebSocketManager] Received welcome message, connection established"
        );
        resolve();
      });

      // Also resolve on connection data
      this.socket!.once("connection", () => {
        cleanup();
        logger.debug(
          "[WebSocketManager] Received connection data, connection established"
        );
        resolve();
      });
    });
  }

  private setupEventHandlers(): void {
    if (!this.socket) {
      logger.debug(
        "[WebSocketManager] No socket available for event handler setup"
      );
      return;
    }

    logger.debug("[WebSocketManager] Setting up event handlers");

    this.socket.on("disconnect", (reason) => {
      logger.debug(
        "[WebSocketManager] Disconnected from WebSocket server:",
        reason
      );
      this.isConnected = false;

      // Track disconnection
      analytics.track(ANALYTICS_EVENTS.SDK_REMOTE_CONTROL_DISCONNECT, {
        reason,
      });
    });

    this.socket.on("error", (error) => {
      logger.debug("[WebSocketManager] WebSocket error:", error);
    });

    // Handle connection event with ConnectionUpdate data
    this.socket.on("connection", (data: ConnectionUpdate) => {
      logger.debug("[WebSocketManager] Received 'connection' event:", data);
      this.currentConnection = data;

      // Notify message listeners
      this.notifyMessageListeners("connection", data);

      // Notify connection listeners
      this.notifyConnectionListeners(data);

      // Also notify status listeners with the status from connection data
      this.notifyStatusListeners(data.status);
    });

    // Primary status event handler
    this.socket.on("status", (status: ConnectionStatus) => {
      logger.debug("[WebSocketManager] Received 'status' event:", status);

      // Notify message listeners
      this.notifyMessageListeners("status", status);

      this.notifyStatusListeners(status);
    });

    // Handle status updates with message format
    this.socket.on("status_update", (message: StatusUpdateMessage) => {
      logger.debug(
        "[WebSocketManager] Received 'status_update' event:",
        message
      );

      // Notify message listeners
      this.notifyMessageListeners("status_update", message);

      this.notifyStatusListeners(message.status);
    });

    // Handle connection status updates with different event names
    this.socket.on(
      "connection_status",
      (data: { status: ConnectionStatus }) => {
        logger.debug(
          "[WebSocketManager] Received 'connection_status' event:",
          data
        );

        // Notify message listeners
        this.notifyMessageListeners("connection_status", data);

        this.notifyStatusListeners(data.status);
      }
    );

    // Support for individual status events
    const statusEvents: ConnectionStatus[] = [
      "pending",
      "connecting",
      "connected",
      "rejected",
      "data_processing",
      "data_available",
      "error",
    ];

    statusEvents.forEach((status) => {
      this.socket!.on(status, (data?: any) => {
        logger.debug(
          `[WebSocketManager] Received individual '${status}' event:`,
          data
        );

        // Notify message listeners
        this.notifyMessageListeners(status, data);

        this.notifyStatusListeners(status);
      });
    });

    // Handle DATA_COMPLETE event
    this.socket.on("DATA_COMPLETE", (data: any) => {
      logger.debug("[WebSocketManager] Received 'DATA_COMPLETE' event:", data);
      this.notifyMessageListeners("DATA_COMPLETE", data);
    });

    // Handle PROMPT_COMPLETE event
    this.socket.on("PROMPT_COMPLETE", (data: any) => {
      logger.debug(
        "[WebSocketManager] Received 'PROMPT_COMPLETE' event:",
        data
      );
      this.notifyMessageListeners("PROMPT_COMPLETE", data);
    });

    // Handle prompt events (new format)
    this.socket.on("prompt", (data: any) => {
      logger.debug("[WebSocketManager] Received 'prompt' event:", data);
      this.notifyMessageListeners("prompt", data);
    });

    // Handle done command event
    this.socket.on("done", (data: any) => {
      logger.debug("[WebSocketManager] Received 'done' event:", data);
      this.notifyMessageListeners("done", data);
    });

    // Log all events for debugging
    if (logger["enabled"]) {
      this.socket.onAny((eventName, ...args) => {
        logger.debug(`[WebSocketManager] Received event '${eventName}':`, args);

        // Notify message listeners for all events in debug mode
        this.notifyMessageListeners(eventName, args);
      });
    }

    this.socket.on("welcome", (data) => {
      logger.debug("[WebSocketManager] Welcome message from server:", data);

      // Notify message listeners
      this.notifyMessageListeners("welcome", data);
    });

    this.socket.on("connect", () => {
      logger.debug(
        "[WebSocketManager] Socket reconnected, ID:",
        this.socket?.id
      );

      // Notify message listeners
      this.notifyMessageListeners("connect", { socketId: this.socket?.id });
    });

    this.socket.on("reconnect", (attemptNumber) => {
      logger.debug("[WebSocketManager] Socket reconnected after", {
        attemptNumber,
        attempts: "attempts",
      });

      // Notify message listeners
      this.notifyMessageListeners("reconnect", { attemptNumber });
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      logger.debug("[WebSocketManager] Reconnection attempt #", attemptNumber);

      // Notify message listeners
      this.notifyMessageListeners("reconnect_attempt", { attemptNumber });
    });

    this.socket.on("reconnect_error", (error) => {
      logger.debug("[WebSocketManager] Reconnection error:", error.message);

      // Notify message listeners
      this.notifyMessageListeners("reconnect_error", { error: error.message });
    });

    this.socket.on("reconnect_failed", () => {
      logger.debug("[WebSocketManager] Reconnection failed");

      // Notify message listeners
      this.notifyMessageListeners("reconnect_failed", {});
    });
  }

  private notifyStatusListeners(status: ConnectionStatus): void {
    logger.debug(
      `[WebSocketManager] Notifying ${this.statusListeners.size} listeners of status:`,
      status
    );

    // Validate status against known values
    const validStatuses: ConnectionStatus[] = [
      "pending",
      "connecting",
      "connected",
      "rejected",
      "data_processing",
      "data_available",
      "error",
    ];

    if (!validStatuses.includes(status)) {
      logger.debug(
        "[WebSocketManager] WARNING: Received unknown status:",
        status
      );
    }

    this.statusListeners.forEach((listener) => {
      try {
        logger.debug(
          "[WebSocketManager] Calling status listener with:",
          status
        );
        listener(status);
      } catch (error) {
        logger.error("[WebSocketManager] Error in status listener:", error);
      }
    });
  }

  private notifyConnectionListeners(connection: ConnectionUpdate): void {
    logger.debug(
      `[WebSocketManager] Notifying ${this.connectionListeners.size} listeners of connection update:`,
      connection
    );

    this.connectionListeners.forEach((listener) => {
      try {
        logger.debug(
          "[WebSocketManager] Calling connection listener with:",
          connection
        );
        listener(connection);
      } catch (error) {
        logger.error("[WebSocketManager] Error in connection listener:", error);
      }
    });
  }

  private notifyMessageListeners(eventName: string, data: any): void {
    logger.debug(
      `[WebSocketManager] Notifying ${this.messageListeners.size} listeners of message:`,
      {
        eventName,
        data,
      }
    );

    this.messageListeners.forEach((listener) => {
      try {
        logger.debug("[WebSocketManager] Calling message listener with:", {
          eventName,
          data,
        });
        listener(eventName, data);
      } catch (error) {
        logger.error("[WebSocketManager] Error in message listener:", error);
      }
    });
  }

  addStatusListener(listener: (status: ConnectionStatus) => void): () => void {
    logger.debug(
      "[WebSocketManager] Adding status listener, total listeners:",
      this.statusListeners.size + 1
    );
    this.statusListeners.add(listener);

    // Return unsubscribe function
    return () => {
      logger.debug(
        "[WebSocketManager] Removing status listener, remaining listeners:",
        this.statusListeners.size - 1
      );
      this.statusListeners.delete(listener);
    };
  }

  addConnectionListener(
    listener: (connection: ConnectionUpdate) => void
  ): () => void {
    logger.debug(
      "[WebSocketManager] Adding connection listener, total listeners:",
      this.connectionListeners.size + 1
    );
    this.connectionListeners.add(listener);

    // If we already have a connection, immediately notify the new listener
    if (this.currentConnection) {
      logger.debug(
        "[WebSocketManager] Immediately notifying new listener with current connection"
      );
      listener(this.currentConnection);
    }

    // Return unsubscribe function
    return () => {
      logger.debug(
        "[WebSocketManager] Removing connection listener, remaining listeners:",
        this.connectionListeners.size - 1
      );
      this.connectionListeners.delete(listener);
    };
  }

  addMessageListener(
    listener: (eventName: string, data: any) => void
  ): () => void {
    logger.debug(
      "[WebSocketManager] Adding message listener, total listeners:",
      this.messageListeners.size + 1
    );
    this.messageListeners.add(listener);

    // Return unsubscribe function
    return () => {
      logger.debug(
        "[WebSocketManager] Removing message listener, remaining listeners:",
        this.messageListeners.size - 1
      );
      this.messageListeners.delete(listener);
    };
  }

  getCurrentConnection(): ConnectionUpdate | null {
    return this.currentConnection;
  }

  emitStatus(status: ConnectionStatus): void {
    logger.debug("[WebSocketManager] Manually emitting status:", status);
    this.notifyStatusListeners(status);
  }

  disconnect(): void {
    if (this.socket) {
      logger.debug("[WebSocketManager] Disconnecting WebSocket, clearing", {
        statusListenersCount: this.statusListeners.size,
        listeners: "listeners",
      });

      // Track manual disconnection
      analytics.track(ANALYTICS_EVENTS.SDK_REMOTE_CONTROL_DISCONNECT, {
        reason: "manual",
      });

      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.intentToken = null;
      this.statusListeners.clear();
      this.connectionListeners.clear();
      this.messageListeners.clear();
      this.currentConnection = null;

      // Call headless cleanup if set
      if (this.headlessCleanup) {
        this.headlessCleanup();
        this.headlessCleanup = null;
      }
    } else {
      logger.debug("[WebSocketManager] No socket to disconnect");
    }
  }

  isActive(): boolean {
    const active = this.isConnected && this.socket?.connected === true;
    logger.debug("[WebSocketManager] Socket active check:", {
      active,
      isConnected: this.isConnected,
      socketConnected: this.socket?.connected,
    });
    return active;
  }

  getIntentToken(): string | null {
    logger.debug("[WebSocketManager] Getting intent token:", this.intentToken);
    return this.intentToken;
  }
}
