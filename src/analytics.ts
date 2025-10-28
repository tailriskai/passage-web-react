import { logger } from "./logger";

// Analytics event types - all events start with SDK_
export const ANALYTICS_EVENTS = {
  SDK_MODAL_OPENED: "SDK_MODAL_OPENED",
  SDK_MODAL_CLOSED: "SDK_MODAL_CLOSED",
  SDK_CONFIGURE_START: "SDK_CONFIGURE_START",
  SDK_CONFIGURE_SUCCESS: "SDK_CONFIGURE_SUCCESS",
  SDK_CONFIGURE_ERROR: "SDK_CONFIGURE_ERROR",
  SDK_CONFIGURATION_REQUEST: "SDK_CONFIGURATION_REQUEST",
  SDK_CONFIGURATION_SUCCESS: "SDK_CONFIGURATION_SUCCESS",
  SDK_CONFIGURATION_ERROR: "SDK_CONFIGURATION_ERROR",
  SDK_OPEN_REQUEST: "SDK_OPEN_REQUEST",
  SDK_OPEN_SUCCESS: "SDK_OPEN_SUCCESS",
  SDK_OPEN_ERROR: "SDK_OPEN_ERROR",
  SDK_ON_SUCCESS: "SDK_ON_SUCCESS",
  SDK_ON_ERROR: "SDK_ON_ERROR",
  SDK_REMOTE_CONTROL_CONNECT_START: "SDK_REMOTE_CONTROL_CONNECT_START",
  SDK_REMOTE_CONTROL_CONNECT_SUCCESS: "SDK_REMOTE_CONTROL_CONNECT_SUCCESS",
  SDK_REMOTE_CONTROL_CONNECT_ERROR: "SDK_REMOTE_CONTROL_CONNECT_ERROR",
  SDK_REMOTE_CONTROL_DISCONNECT: "SDK_REMOTE_CONTROL_DISCONNECT",
  SDK_WEBVIEW_SWITCH: "SDK_WEBVIEW_SWITCH",
  SDK_NAVIGATION_START: "SDK_NAVIGATION_START",
  SDK_NAVIGATION_SUCCESS: "SDK_NAVIGATION_SUCCESS",
  SDK_NAVIGATION_ERROR: "SDK_NAVIGATION_ERROR",
  SDK_COMMAND_RECEIVED: "SDK_COMMAND_RECEIVED",
  SDK_COMMAND_SUCCESS: "SDK_COMMAND_SUCCESS",
  SDK_COMMAND_ERROR: "SDK_COMMAND_ERROR",
} as const;

export type AnalyticsEventType =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export interface AnalyticsEvent {
  event: AnalyticsEventType;
  timestamp?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface SDKAnalyticsEvent extends AnalyticsEvent {
  source: "sdk";
  sdkName: string;
  sdkVersion?: string;
  appVersion?: string;
  platform?: string;
  deviceInfo?: Record<string, unknown>;
}

class AnalyticsManager {
  private enabled: boolean = false;
  private analyticsUrl: string = "https://api.getpassage.ai/analytics";
  private sdkName: string = "web-react";
  private sdkVersion?: string;
  private sessionId: string | null = null; // Only set if extracted from intent token
  private intentToken?: string;
  private eventQueue: (AnalyticsEvent | SDKAnalyticsEvent)[] = [];
  private flushTimer?: ReturnType<typeof setTimeout>;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor() {
    // Don't generate sessionId by default - only set when extracted from intent token
    try {
      // Get SDK version from package.json if available
      if (typeof process !== "undefined" && process.env.npm_package_version) {
        this.sdkVersion = process.env.npm_package_version;
      }
    } catch (error) {
      // Fallback if package.json is not available
      this.sdkVersion = undefined;
    }
  }

  /**
   * Update analytics URL based on web base URL
   */
  setWebBaseUrl(webBaseUrl: string): void {
    try {
      const url = new URL(webBaseUrl);
      // Switch to api subdomain and add analytics path
      const apiUrl = url.origin.replace("ui.", "api.");
      this.analyticsUrl = `${apiUrl}/analytics`;
      logger.debug("[ANALYTICS] Analytics URL updated", {
        webBaseUrl,
        analyticsUrl: this.analyticsUrl,
      });
    } catch (error) {
      logger.warn("[ANALYTICS] Failed to update analytics URL:", error);
      // Keep existing URL as fallback
    }
  }

  /**
   * Update intent token and extract session ID
   */
  updateIntentToken(token: string | null): void {
    if (!token) {
      this.intentToken = undefined;
      this.sessionId = null;
      return;
    }

    this.intentToken = token;
    this.sessionId = this.extractSessionId(token); // Will be string or null
    logger.debug("[ANALYTICS] Intent token updated", {
      sessionId: this.sessionId,
      hasToken: !!token,
    });
  }

  /**
   * Extract session ID from JWT intent token
   */
  private extractSessionId(token: string): string | null {
    if (!token) return null;

    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      let payload = parts[1];
      // Add padding if needed
      while (payload.length % 4 !== 0) {
        payload += "=";
      }

      const decodedBytes = atob(payload);
      const decodedPayload = JSON.parse(decodedBytes);
      return decodedPayload.sessionId || null;
    } catch (error) {
      logger.debug("[ANALYTICS] Failed to decode intent token", error);
      return null;
    }
  }

  configure(config: { enabled?: boolean; webBaseUrl?: string }): void {
    this.enabled = config.enabled ?? true; // Default to enabled

    if (config.webBaseUrl) {
      this.setWebBaseUrl(config.webBaseUrl);
    }

    logger.debug("[ANALYTICS] Configured analytics", {
      enabled: this.enabled,
      analyticsUrl: this.analyticsUrl,
      sdkVersion: this.sdkVersion,
      sdkName: this.sdkName,
      sessionId: this.sessionId,
    });

    if (this.enabled) {
      this.startBatchFlushTimer();
    }
  }

  track(event: AnalyticsEventType, metadata?: Record<string, unknown>): void {
    if (!this.enabled) {
      return;
    }

    // Get device info for web environment
    let deviceInfo: Record<string, unknown> | undefined;
    if (typeof navigator !== "undefined") {
      deviceInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
      };

      // Add screen info if available
      if (typeof screen !== "undefined") {
        deviceInfo.screen = {
          width: screen.width,
          height: screen.height,
          colorDepth: screen.colorDepth,
          pixelDepth: screen.pixelDepth,
        };
      }

      // Add viewport info if available
      if (typeof window !== "undefined") {
        deviceInfo.viewport = {
          width: window.innerWidth,
          height: window.innerHeight,
        };
      }
    }

    const analyticsEvent: SDKAnalyticsEvent = {
      event,
      source: "sdk",
      sdkName: this.sdkName,
      sdkVersion: this.sdkVersion,
      platform: "web",
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
      deviceInfo,
    };

    // Only include sessionId if it was successfully extracted from intent token
    if (this.sessionId) {
      analyticsEvent.sessionId = this.sessionId;
    }

    this.eventQueue.push(analyticsEvent);
    logger.debug("[ANALYTICS] Event queued", {
      event,
      sessionId: this.sessionId,
      queueSize: this.eventQueue.length,
    });

    // Flush immediately if queue is full
    if (this.eventQueue.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (!this.enabled || this.eventQueue.length === 0) {
      return;
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      logger.debug("[ANALYTICS] Flushing events", {
        count: eventsToSend.length,
      });

      const response = await fetch(this.analyticsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          events: eventsToSend,
        }),
      });

      if (response.ok) {
        logger.debug("[ANALYTICS] Events sent successfully", {
          count: eventsToSend.length,
          status: response.status,
        });
      } else {
        logger.error("[ANALYTICS] Failed to send events", {
          status: response.status,
          response: await response.text(),
        });
        // Re-queue events on failure
        this.eventQueue.unshift(...eventsToSend);
      }
    } catch (error) {
      logger.error("[ANALYTICS] Error sending events", error);
      // Re-queue events on error
      this.eventQueue.unshift(...eventsToSend);
    }
  }

  private startBatchFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Flush any remaining events
    this.flush();
  }
}

export const analytics = new AnalyticsManager();
