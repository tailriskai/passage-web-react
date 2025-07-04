import React from "react";
import type { ConnectionStatus } from "../types";

interface StatusDisplayProps {
  status: ConnectionStatus;
  className?: string;
}

const statusConfig: Record<
  ConnectionStatus,
  {
    text: string;
    color: string;
    icon: string;
    description: string;
  }
> = {
  pending: {
    text: "Waiting for connection",
    color: "#6B7280",
    icon: "⏳",
    description: "Scan the QR code with your Passage Authenticator app",
  },
  connecting: {
    text: "Connecting",
    color: "#3B82F6",
    icon: "🔄",
    description: "Establishing secure connection with your device",
  },
  connected: {
    text: "Connected",
    color: "#10B981",
    icon: "✓",
    description: "Successfully connected to your device",
  },
  rejected: {
    text: "Connection rejected",
    color: "#F59E0B",
    icon: "⚠️",
    description: "The connection was rejected. Please try again",
  },
  data_processing: {
    text: "Processing data",
    color: "#8B5CF6",
    icon: "⚙️",
    description: "Securely processing your account data",
  },
  data_available: {
    text: "Complete",
    color: "#10B981",
    icon: "✅",
    description: "Your data is ready",
  },
  error: {
    text: "Connection error",
    color: "#EF4444",
    icon: "❌",
    description: "Something went wrong. Please try again",
  },
};

export const StatusDisplay: React.FC<StatusDisplayProps> = ({
  status,
  className = "",
}) => {
  const config = statusConfig[status];

  console.log("[StatusDisplay] Rendering status:", status, "config:", config);

  if (!config) {
    console.error("[StatusDisplay] Unknown status:", status);
    return null;
  }

  return (
    <div className={`passage-status ${className}`}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "8px",
        }}
      >
        <span style={{ fontSize: "24px" }}>{config.icon}</span>
        <span
          style={{
            fontSize: "18px",
            fontWeight: "600",
            color: config.color,
          }}
        >
          {config.text}
        </span>
      </div>
      <p
        style={{
          margin: 0,
          color: "#6B7280",
          fontSize: "14px",
        }}
      >
        {config.description}
      </p>

      {/* Progress indicator for processing states */}
      {(status === "connecting" || status === "data_processing") && (
        <div
          style={{
            marginTop: "16px",
            height: "4px",
            backgroundColor: "#E5E7EB",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            className="passage-progress-bar"
            style={{
              height: "100%",
              backgroundColor: config.color,
              animation: "passage-progress 1.5s ease-in-out infinite",
            }}
          />
        </div>
      )}
    </div>
  );
};
