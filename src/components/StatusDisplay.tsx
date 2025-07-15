import React from "react";
import { motion } from "framer-motion";
import { logger } from "../logger";
import type { ConnectionStatus } from "../types";

interface StatusDisplayProps {
  status: ConnectionStatus;
  className?: string;
}

const statusConfig: Partial<
  Record<
    ConnectionStatus,
    {
      text: string;
      color: string;
      icon: string;
      description: string;
    }
  >
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

  logger.debug("[StatusDisplay] Rendering status:", status, "config:", config);

  if (!config) {
    logger.error("[StatusDisplay] Unknown status:", status);
    return null;
  }

  return (
    <motion.div
      className={`passage-status ${className}`}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <motion.div
        layout
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "8px",
        }}
      >
        <motion.span
          key={`icon-${status}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={{ fontSize: "24px" }}
        >
          {config.icon}
        </motion.span>
        <motion.span
          key={`text-${status}`}
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          style={{
            fontSize: "18px",
            fontWeight: "600",
            color: config.color,
          }}
        >
          {config.text}
        </motion.span>
      </motion.div>
      <motion.p
        key={`description-${status}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        style={{
          margin: 0,
          color: "#6B7280",
          fontSize: "14px",
        }}
      >
        {config.description}
      </motion.p>

      {/* Progress indicator for processing states */}
      {(status === "connecting" || status === "data_processing") && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{
            marginTop: "16px",
            height: "4px",
            backgroundColor: "#E5E7EB",
            borderRadius: "2px",
            overflow: "hidden",
            originX: 0,
          }}
        >
          <motion.div
            className="passage-progress-bar"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{
              duration: 1.5,
              ease: "easeInOut",
              repeat: Infinity,
              delay: 0.5,
            }}
            style={{
              height: "100%",
              backgroundColor: config.color,
            }}
          />
        </motion.div>
      )}
    </motion.div>
  );
};
