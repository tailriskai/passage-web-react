import { jwtDecode } from "jwt-decode";
import { DEFAULT_WEB_BASE_URL, LOGGER_PATH } from "./config";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LoggerTransport {
  log(
    level: LogLevel,
    message: string,
    metadataOrContext?: string | Record<string, unknown> | Error | unknown
  ): void;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  sessionId?: string;
}

interface SDKLogEntry extends LogEntry {
  source: "sdk";
  sdkName: string;
  sdkVersion?: string;
  appVersion?: string;
  platform?: string;
  deviceInfo?: Record<string, unknown>;
}

interface HttpTransportConfig {
  endpoint: string;
  sdkName: string;
  sdkVersion?: string;
  appVersion?: string;
  platform?: string;
  deviceInfo?: Record<string, unknown>;
  intentToken?: string;
  sessionId?: string;
  batchSize?: number;
  flushInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
}

interface LoggerConfig {
  enableHttpTransport?: boolean;
  httpTransport?: Partial<HttpTransportConfig> & {
    endpoint?: string;
    sdkName?: string;
    intentToken?: string;
  };
}

class ConsoleTransport implements LoggerTransport {
  log(
    level: LogLevel,
    message: string,
    metadataOrContext?: string | Record<string, unknown> | Error | unknown
  ): void {
    const args = metadataOrContext ? [metadataOrContext] : [];
    switch (level) {
      case "debug":
        console.log(message, ...args);
        break;
      case "info":
        console.info(message, ...args);
        break;
      case "warn":
        console.warn(message, ...args);
        break;
      case "error":
        console.error(message, ...args);
        break;
    }
  }
}

class HttpTransport implements LoggerTransport {
  private config: HttpTransportConfig;
  private queue: SDKLogEntry[] = [];
  private flushTimer?: number;
  private isProcessing: boolean = false;
  private sessionId: string | null;

  constructor(config: HttpTransportConfig) {
    this.config = {
      batchSize: 10,
      flushInterval: 5000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };

    this.sessionId = this.extractSessionId();
    this.setupEventHandlers();
    this.scheduleFlush();
  }

  private extractSessionId(): string | null {
    // If explicit sessionId provided, use it
    if (this.config.sessionId) {
      return this.config.sessionId;
    }

    // If intentToken provided, decode it to get sessionId
    if (this.config.intentToken) {
      try {
        const decoded = jwtDecode(this.config.intentToken) as {
          sessionId: string;
        };
        return decoded.sessionId;
      } catch (error) {
        console.warn("Failed to decode intent token for session ID:", error);
        return null;
      }
    }

    // No intentToken available, return null
    return null;
  }

  private setupEventHandlers(): void {
    // Web page visibility API
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          this.flush();
        }
      });

      // Flush on page unload
      window.addEventListener("beforeunload", () => {
        this.flush();
      });

      // Flush on page freeze (mobile safari)
      window.addEventListener("pagehide", () => {
        this.flush();
      });
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = window.setTimeout(() => {
      this.flush();
      this.scheduleFlush();
    }, this.config.flushInterval);
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    metadataOrContext?: string | Record<string, unknown> | Error | unknown
  ): SDKLogEntry {
    let context: string | undefined;
    let metadata: Record<string, unknown> = {};

    if (metadataOrContext !== undefined && metadataOrContext !== null) {
      if (typeof metadataOrContext === "string") {
        context = metadataOrContext;
      } else if (metadataOrContext instanceof Error) {
        // If it's an Error object, serialize it properly
        metadata = {
          name: metadataOrContext.name,
          message: metadataOrContext.message,
          stack: metadataOrContext.stack,
          ...Object.getOwnPropertyNames(metadataOrContext).reduce(
            (acc, key) => {
              acc[key] = (metadataOrContext as any)[key];
              return acc;
            },
            {} as Record<string, any>
          ),
        };
      } else if (typeof metadataOrContext === "object") {
        // Pass the whole object directly as metadata
        metadata = { ...(metadataOrContext as Record<string, unknown>) };
      } else {
        // Handle primitive types or unknown values
        metadata = { value: metadataOrContext };
      }
    }

    return {
      source: "sdk" as const,
      level,
      message,
      context: context || "SDK", // Default context as expected by backend
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId ?? undefined,
      sdkName: this.config.sdkName,
      sdkVersion: this.config.sdkVersion,
      appVersion: this.config.appVersion,
      platform: this.config.platform,
      deviceInfo: this.config.deviceInfo,
    };
  }

  log(
    level: LogLevel,
    message: string,
    metadataOrContext?: string | Record<string, unknown> | Error | unknown
  ): void {
    const entry = this.createLogEntry(level, message, metadataOrContext);
    this.queue.push(entry);

    // Flush if batch size reached
    if (this.queue.length >= this.config.batchSize!) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const logsToSend = [...this.queue];
    this.queue = [];

    try {
      await this.sendLogs(logsToSend);
    } catch (error) {
      // Re-queue failed logs (with limit to prevent infinite growth)
      if (this.queue.length < 100) {
        this.queue.unshift(...logsToSend);
      }
      console.warn("Failed to send logs to server:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendLogs(
    logs: SDKLogEntry[],
    retryCount: number = 0
  ): Promise<void> {
    try {
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ logs }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (retryCount < this.config.maxRetries!) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.retryDelay! * (retryCount + 1))
        );
        return this.sendLogs(logs, retryCount + 1);
      }
      throw error;
    }
  }

  // Cleanup method
  destroy(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.flush(); // Final flush
  }
}

class Logger {
  private transports: LoggerTransport[] = [new ConsoleTransport()];
  private enabled: boolean = false; // Default to disabled
  private debugMode: boolean = false;
  private config: LoggerConfig;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      enableHttpTransport: true, // Default to enabled
      httpTransport: {
        endpoint: buildLoggerEndpoint(DEFAULT_WEB_BASE_URL),
        sdkName: "web-react",
        ...config.httpTransport,
      },
      ...config,
    };

    // Auto-configure HTTP transport if enabled
    if (
      this.config.enableHttpTransport &&
      this.config.httpTransport?.endpoint &&
      this.config.httpTransport?.sdkName
    ) {
      this.setupDefaultHttpTransport();
    }
  }

  // Update the base URL used to build the logger endpoint (e.g., https://ui.getpassage.ai)
  setWebBaseUrl(webBaseUrl: string): void {
    try {
      const newEndpoint = buildLoggerEndpoint(webBaseUrl);
      // Persist on config so subsequent updates reuse the latest value
      if (!this.config.httpTransport) this.config.httpTransport = {} as any;
      (this.config.httpTransport as any).endpoint = newEndpoint;

      // If an HTTP transport exists, replace it to pick up the new endpoint
      const existing = this.transports.find(
        (t) => t instanceof HttpTransport
      ) as HttpTransport | undefined;

      if (existing) {
        this.removeTransport(existing);
      }

      // Keep any known properties, including intentToken if present
      if (this.config.httpTransport) {
        this.addHttpTransport(this.config.httpTransport as any);
      }
    } catch (error) {
      console.warn("Failed to set logger web base URL:", error);
    }
  }

  private setupDefaultHttpTransport(): void {
    try {
      // Only add if we don't already have an HTTP transport
      const hasHttpTransport = this.transports.some(
        (transport) => transport instanceof HttpTransport
      );
      if (!hasHttpTransport && this.config.httpTransport) {
        const httpConfig = this.config.httpTransport as HttpTransportConfig;
        this.addHttpTransport(httpConfig);
      }
    } catch (error) {
      console.warn("Failed to setup default HTTP transport:", error);
    }
  }

  addTransport(transport: LoggerTransport): void {
    this.transports.push(transport);
  }

  removeTransport(transport: LoggerTransport): void {
    this.transports = this.transports.filter((t) => t !== transport);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setDebugMode(debug: boolean): void {
    this.debugMode = debug;
    this.enabled = debug;
  }

  updateIntentToken(intentToken: string | null): void {
    // Update HTTP transport config if it exists
    const httpTransport = this.transports.find(
      (transport) => transport instanceof HttpTransport
    ) as HttpTransport | undefined;

    if (httpTransport) {
      // Remove existing HTTP transport
      this.removeTransport(httpTransport);

      // Add new HTTP transport with updated intent token
      if (this.config.httpTransport) {
        // Persist token on config for future rebuilds
        (this.config.httpTransport as any).intentToken =
          intentToken || undefined;
        this.addHttpTransport(this.config.httpTransport as any);
      }
    }
  }

  private logToTransports(
    level: LogLevel,
    message: string,
    metadataOrContext?: string | Record<string, unknown> | Error | unknown
  ): void {
    if (!this.enabled) return;

    this.transports.forEach((transport) => {
      try {
        transport.log(level, message, metadataOrContext);
      } catch (error) {
        // Prevent errors in transports from breaking the app
        console.error("Logger transport error:", error);
      }
    });
  }

  debug(
    message: string,
    metadataOrContext?: string | Record<string, unknown> | Error | unknown
  ): void {
    this.logToTransports("debug", message, metadataOrContext);
  }

  log(
    message: string,
    metadataOrContext?: string | Record<string, unknown> | Error | unknown
  ): void {
    this.logToTransports("debug", message, metadataOrContext);
  }

  info(
    message: string,
    metadataOrContext?: string | Record<string, unknown> | Error | unknown
  ): void {
    this.logToTransports("info", message, metadataOrContext);
  }

  warn(
    message: string,
    metadataOrContext?: string | Record<string, unknown> | Error | unknown
  ): void {
    this.logToTransports("warn", message, metadataOrContext);
  }

  error(
    message: string,
    metadataOrContext?: string | Record<string, unknown> | Error | unknown
  ): void {
    this.logToTransports("error", message, metadataOrContext);
  }

  // Convenience method to add HTTP transport with sensible defaults
  addHttpTransport(
    config: Partial<HttpTransportConfig> & { endpoint: string; sdkName: string }
  ): HttpTransport {
    try {
      // Get platform and device info for web environment
      let platform: string = "web";
      let deviceInfo: Record<string, unknown> | undefined;

      if (typeof navigator !== "undefined") {
        deviceInfo = {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
        };

        // Add connection info if available (Network Information API)
        const connection =
          (navigator as any).connection ||
          (navigator as any).mozConnection ||
          (navigator as any).webkitConnection;
        if (connection) {
          deviceInfo.connection = {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
          };
        }

        // Get screen info if available
        if (typeof screen !== "undefined") {
          deviceInfo.screen = {
            width: screen.width,
            height: screen.height,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth,
          };
        }

        // Get window info if available
        if (typeof window !== "undefined") {
          deviceInfo.viewport = {
            width: window.innerWidth,
            height: window.innerHeight,
          };
        }
      }

      const transport = new HttpTransport({
        platform,
        deviceInfo,
        ...config,
      });

      this.addTransport(transport);
      return transport;
    } catch (error) {
      console.error("Failed to add HTTP transport:", error);
      throw error;
    }
  }
}

// Get configuration from environment or defaults
function getDefaultLoggerConfig(): LoggerConfig {
  // Try to get configuration from environment or window
  const config: LoggerConfig = {
    enableHttpTransport: true,
    httpTransport: {
      endpoint: buildLoggerEndpoint(DEFAULT_WEB_BASE_URL),
      sdkName: "web-react-js",
    },
  };

  // Check for global configuration (if set by app)
  if (typeof window !== "undefined" && (window as any).PASSAGE_LOGGER_CONFIG) {
    const globalConfig = (window as any).PASSAGE_LOGGER_CONFIG;
    Object.assign(config, globalConfig);
  }

  return config;
}

// Helper to build endpoint from a base web URL and the configured path
function buildLoggerEndpoint(baseUrl: string): string {
  try {
    const trimmedBase = baseUrl.replace(/\/$/, "");
    const trimmedPath = LOGGER_PATH.replace(/^\//, "");
    return `${trimmedBase}/${trimmedPath}`;
  } catch {
    // Fallback to path as-is if something goes wrong
    const trimmedPath = LOGGER_PATH.replace(/^\//, "");
    return `/${trimmedPath}`;
  }
}

// Export singleton instance with default configuration
export const logger = new Logger(getDefaultLoggerConfig());

// Export classes for advanced usage
export { Logger, HttpTransport, ConsoleTransport };

// Export types for TypeScript users
export type { HttpTransportConfig, LogEntry, SDKLogEntry, LoggerConfig };
