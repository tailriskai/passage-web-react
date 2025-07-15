import React from "react";

interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error";
}

interface LogDisplayProps {
  logs: LogEntry[];
}

const LogDisplay: React.FC<LogDisplayProps> = ({ logs }) => {
  if (logs.length === 0) {
    return (
      <div className="log-display">
        <div className="embed-placeholder">
          No activity yet. Click a button to see logs here.
        </div>
      </div>
    );
  }

  return (
    <div className="log-display">
      {logs.map((log, index) => (
        <div key={index} className="log-entry">
          <div className="log-timestamp">{log.timestamp}</div>
          <div
            style={{
              color:
                log.type === "error"
                  ? "#fc8181"
                  : log.type === "success"
                    ? "#68d391"
                    : "#e2e8f0",
            }}
          >
            {log.message}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LogDisplay;
