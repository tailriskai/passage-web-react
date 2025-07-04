import { io, Socket } from "socket.io-client";
import type {
  ConnectionStatus,
  StatusUpdateMessage,
  ConnectionUpdate,
} from "./types";

const DEFAULT_SOCKET_URL = "https://prod-gravy-connect-api.onrender.com";
const DEFAULT_SOCKET_NAMESPACE = "/ws";

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
  private debug: boolean = false;

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  setDebug(debug: boolean): void {
    this.debug = debug;
    this.log("Debug mode set to:", debug);
  }

  private log(...args: any[]): void {
    if (this.debug) {
      console.log("[PassageWebSDK:WebSocket]", ...args);
    }
  }

  async connect(
    intentToken: string,
    socketUrl: string = DEFAULT_SOCKET_URL,
    namespace: string = DEFAULT_SOCKET_NAMESPACE
  ): Promise<void> {
    if (this.socket?.connected && this.intentToken === intentToken) {
      this.log("Already connected with same intent token");
      return;
    }

    // Disconnect existing connection if any
    if (this.socket) {
      this.log("Disconnecting existing socket before creating new connection");
      this.disconnect();
    }

    this.intentToken = intentToken;

    this.log(
      `Connecting to ${socketUrl}${namespace} with intent token:`,
      intentToken
    );

    this.socket = io(`${socketUrl}${namespace}`, {
      transports: ["websocket", "polling"],
      timeout: 10000,
      forceNew: true,
      query: {
        intentToken: this.intentToken,
      },
    });

    this.setupEventHandlers();

    // Wait for connection
    return new Promise((resolve, reject) => {
      let isResolved = false;

      const timeout = setTimeout(() => {
        if (!isResolved) {
          this.log("Connection timeout after 10 seconds");
          reject(new Error("WebSocket connection timeout"));
        }
      }, 10000);

      const cleanup = () => {
        isResolved = true;
        clearTimeout(timeout);
      };

      this.socket!.once("connect", () => {
        this.isConnected = true;
        this.log("Connected to WebSocket server, socket ID:", this.socket?.id);
        // Don't resolve yet - wait for welcome or connection message
      });

      this.socket!.once("connect_error", (error) => {
        cleanup();
        this.log("Connection error:", error.message);
        reject(error);
      });

      // Resolve when we get welcome or connection message
      this.socket!.once("welcome", () => {
        cleanup();
        this.log("Received welcome message, connection established");
        resolve();
      });

      // Also resolve on connection data
      this.socket!.once("connection", () => {
        cleanup();
        this.log("Received connection data, connection established");
        resolve();
      });
    });
  }

  private setupEventHandlers(): void {
    if (!this.socket) {
      this.log("No socket available for event handler setup");
      return;
    }

    this.log("Setting up event handlers");

    this.socket.on("disconnect", (reason) => {
      this.log("Disconnected from WebSocket server:", reason);
      this.isConnected = false;
    });

    this.socket.on("error", (error) => {
      this.log("WebSocket error:", error);
    });

    // NEW: Handle connection event with ConnectionUpdate data
    this.socket.on("connection", (data: ConnectionUpdate) => {
      this.log("Received 'connection' event:", data);
      this.currentConnection = data;

      // Notify message listeners
      this.notifyMessageListeners("connection", data);

      // Notify connection listeners
      this.notifyConnectionListeners(data);

      // Also notify status listeners with the status from connection data
      this.notifyStatusListeners(data.status);
    });

    // Primary status event handler - matches backend StatusRouterService
    this.socket.on("status", (status: ConnectionStatus) => {
      this.log("Received 'status' event:", status);

      // Notify message listeners
      this.notifyMessageListeners("status", status);

      this.notifyStatusListeners(status);
    });

    // Handle status updates with message format
    this.socket.on("status_update", (message: StatusUpdateMessage) => {
      this.log("Received 'status_update' event:", message);

      // Notify message listeners
      this.notifyMessageListeners("status_update", message);

      this.notifyStatusListeners(message.status);
    });

    // Handle connection status updates with different event names
    this.socket.on(
      "connection_status",
      (data: { status: ConnectionStatus }) => {
        this.log("Received 'connection_status' event:", data);

        // Notify message listeners
        this.notifyMessageListeners("connection_status", data);

        this.notifyStatusListeners(data.status);
      }
    );

    // Legacy support for individual status events
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
        this.log(`Received individual '${status}' event:`, data);

        // Notify message listeners
        this.notifyMessageListeners(status, data);

        this.notifyStatusListeners(status);
      });
    });

    // Log all events for debugging
    if (this.debug) {
      this.socket.onAny((eventName, ...args) => {
        this.log(`Received event '${eventName}':`, args);

        // Notify message listeners for all events in debug mode
        this.notifyMessageListeners(eventName, args);
      });
    }

    this.socket.on("welcome", (data) => {
      this.log("Welcome message from server:", data);

      // Notify message listeners
      this.notifyMessageListeners("welcome", data);
    });

    this.socket.on("connect", () => {
      this.log("Socket reconnected, ID:", this.socket?.id);

      // Notify message listeners
      this.notifyMessageListeners("connect", { socketId: this.socket?.id });
    });

    this.socket.on("reconnect", (attemptNumber) => {
      this.log("Socket reconnected after", attemptNumber, "attempts");

      // Notify message listeners
      this.notifyMessageListeners("reconnect", { attemptNumber });
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      this.log("Reconnection attempt #", attemptNumber);

      // Notify message listeners
      this.notifyMessageListeners("reconnect_attempt", { attemptNumber });
    });

    this.socket.on("reconnect_error", (error) => {
      this.log("Reconnection error:", error.message);

      // Notify message listeners
      this.notifyMessageListeners("reconnect_error", { error: error.message });
    });

    this.socket.on("reconnect_failed", () => {
      this.log("Reconnection failed");

      // Notify message listeners
      this.notifyMessageListeners("reconnect_failed", {});
    });
  }

  private notifyStatusListeners(status: ConnectionStatus): void {
    this.log(
      `Notifying ${this.statusListeners.size} listeners of status:`,
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
      this.log("WARNING: Received unknown status:", status);
    }

    this.statusListeners.forEach((listener) => {
      try {
        this.log("Calling status listener with:", status);
        listener(status);
      } catch (error) {
        console.error(
          "[PassageWebSDK:WebSocket] Error in status listener:",
          error
        );
      }
    });
  }

  private notifyConnectionListeners(connection: ConnectionUpdate): void {
    this.log(
      `Notifying ${this.connectionListeners.size} listeners of connection update:`,
      connection
    );

    this.connectionListeners.forEach((listener) => {
      try {
        this.log("Calling connection listener with:", connection);
        listener(connection);
      } catch (error) {
        console.error(
          "[PassageWebSDK:WebSocket] Error in connection listener:",
          error
        );
      }
    });
  }

  private notifyMessageListeners(eventName: string, data: any): void {
    this.log(
      `Notifying ${this.messageListeners.size} listeners of message:`,
      eventName,
      data
    );

    this.messageListeners.forEach((listener) => {
      try {
        this.log("Calling message listener with:", eventName, data);
        listener(eventName, data);
      } catch (error) {
        console.error(
          "[PassageWebSDK:WebSocket] Error in message listener:",
          error
        );
      }
    });
  }

  addStatusListener(listener: (status: ConnectionStatus) => void): () => void {
    this.log(
      "Adding status listener, total listeners:",
      this.statusListeners.size + 1
    );
    this.statusListeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.log(
        "Removing status listener, remaining listeners:",
        this.statusListeners.size - 1
      );
      this.statusListeners.delete(listener);
    };
  }

  addConnectionListener(
    listener: (connection: ConnectionUpdate) => void
  ): () => void {
    this.log(
      "Adding connection listener, total listeners:",
      this.connectionListeners.size + 1
    );
    this.connectionListeners.add(listener);

    // If we already have a connection, immediately notify the new listener
    if (this.currentConnection) {
      this.log("Immediately notifying new listener with current connection");
      listener(this.currentConnection);
    }

    // Return unsubscribe function
    return () => {
      this.log(
        "Removing connection listener, remaining listeners:",
        this.connectionListeners.size - 1
      );
      this.connectionListeners.delete(listener);
    };
  }

  addMessageListener(
    listener: (eventName: string, data: any) => void
  ): () => void {
    this.log(
      "Adding message listener, total listeners:",
      this.messageListeners.size + 1
    );
    this.messageListeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.log(
        "Removing message listener, remaining listeners:",
        this.messageListeners.size - 1
      );
      this.messageListeners.delete(listener);
    };
  }

  getCurrentConnection(): ConnectionUpdate | null {
    return this.currentConnection;
  }

  emitStatus(status: ConnectionStatus): void {
    this.log("Manually emitting status:", status);
    this.notifyStatusListeners(status);
  }

  disconnect(): void {
    if (this.socket) {
      this.log(
        "Disconnecting WebSocket, clearing",
        this.statusListeners.size,
        "listeners"
      );
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.intentToken = null;
      this.statusListeners.clear();
      this.connectionListeners.clear();
      this.messageListeners.clear();
      this.currentConnection = null;
    } else {
      this.log("No socket to disconnect");
    }
  }

  isActive(): boolean {
    const active = this.isConnected && this.socket?.connected === true;
    this.log(
      "Socket active check:",
      active,
      "isConnected:",
      this.isConnected,
      "socket.connected:",
      this.socket?.connected
    );
    return active;
  }

  getIntentToken(): string | null {
    this.log("Getting intent token:", this.intentToken);
    return this.intentToken;
  }
}
