export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LoggerTransport {
  log(level: LogLevel, message: string, ...args: any[]): void;
}

class ConsoleTransport implements LoggerTransport {
  log(level: LogLevel, message: string, ...args: any[]): void {
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

class Logger {
  private transports: LoggerTransport[] = [new ConsoleTransport()];
  private enabled: boolean = false; // Default to disabled
  private debugMode: boolean = false;

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

  private logToTransports(
    level: LogLevel,
    message: string,
    ...args: any[]
  ): void {
    if (!this.enabled) return;

    this.transports.forEach((transport) => {
      try {
        transport.log(level, message, ...args);
      } catch (error) {
        // Prevent errors in transports from breaking the app
        console.error("Logger transport error:", error);
      }
    });
  }

  debug(message: string, ...args: any[]): void {
    this.logToTransports("debug", message, ...args);
  }

  log(message: string, ...args: any[]): void {
    this.logToTransports("debug", message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.logToTransports("info", message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.logToTransports("warn", message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.logToTransports("error", message, ...args);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export Logger class for advanced usage
export { Logger };
