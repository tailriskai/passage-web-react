import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "../logger";
import type { ConnectionStatus, PassageModalStyles } from "../types";
import { USER_AGENT } from "../config";

interface PassageModalProps {
  isOpen: boolean;
  intentToken: string | null;
  status: ConnectionStatus | null;
  baseUrl: string;
  onClose: () => void;
  customStyles?: PassageModalStyles;
  presentationStyle?: "modal" | "embed";
}

// Define default styles to avoid TypeScript errors
const defaultCustomStyles: PassageModalStyles = {
  content: {},
  header: {},
  body: {},
  footer: {},
  container: {},
};

export const PassageModal: React.FC<PassageModalProps> = ({
  isOpen,
  intentToken,
  status,
  baseUrl,
  onClose,
  customStyles = defaultCustomStyles,
  presentationStyle = "modal",
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [iframeHeight, setIframeHeight] = useState<number>(600); // Default height
  const [iframeWidth, setIframeWidth] = useState<number>(600); // Default width

  // Merge custom styles with defaults
  const mergedStyles = {
    content: { ...defaultCustomStyles.content, ...customStyles.content },
    header: { ...defaultCustomStyles.header, ...customStyles.header },
    body: { ...defaultCustomStyles.body, ...customStyles.body },
    footer: { ...defaultCustomStyles.footer, ...customStyles.footer },
    container: { ...defaultCustomStyles.container, ...customStyles.container },
  };

  useEffect(() => {
    if (intentToken) {
      setIsLoading(false);
      logger.debug("[PassageModal] Intent token available:", intentToken);
    } else {
      setIsLoading(true);
    }
  }, [intentToken]);

  useEffect(() => {
    logger.debug(
      "[PassageModal] Modal state - isOpen:",
      isOpen,
      "status:",
      status,
      "intentToken:",
      intentToken
    );
  }, [isOpen, status, intentToken]);

  // Listen for dimension updates and close events from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      logger.debug(
        "[PassageModal] Received message from origin:",
        event.origin,
        "Expected:",
        new URL(baseUrl).origin
      );

      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        logger.debug("[PassageModal] Message data:", data);

        // Handle universal link opening from iframe (allow from any origin for universal links)
        if (data.type === "PASSAGE_UNIVERSAL_LINK" && data.url) {
          logger.debug(
            "[PassageModal] Received universal link request:",
            data.url
          );
          window.open(data.url, "_blank");
          return;
        }

        // Only accept other messages from the iframe's origin
        if (event.origin !== new URL(baseUrl).origin) {
          logger.debug("[PassageModal] Ignoring message from different origin");
          return;
        }

        // Handle close message from iframe
        if (data.type === "PASSAGE_MODAL_CLOSE") {
          logger.debug("[PassageModal] Received close message from iframe");
          onClose();
          return;
        }

        // Handle both old height-only and new dimensions messages
        if (data.type === "IFRAME_DIMENSIONS_UPDATE") {
          if (typeof data.height === "number") {
            logger.debug("[PassageModal] Received height update:", data.height);
            setIframeHeight(Math.max(data.height, 400)); // Minimum height of 400px
          }
          if (typeof data.width === "number") {
            logger.debug("[PassageModal] Received width update:", data.width);
            setIframeWidth(Math.max(data.width, 300)); // Minimum width of 300px
          }
        } else if (
          data.type === "IFRAME_HEIGHT_UPDATE" &&
          typeof data.height === "number"
        ) {
          // Backward compatibility for old height-only messages
          logger.debug("[PassageModal] Received height update:", data.height);
          setIframeHeight(Math.max(data.height, 400)); // Minimum height of 400px
        }
      } catch (error) {
        // Ignore non-JSON messages
      }
    };

    if (isOpen) {
      window.addEventListener("message", handleMessage);
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [isOpen, baseUrl, onClose]);

  if (!isOpen) {
    logger.debug("[PassageModal] Not rendering - isOpen:", isOpen);
    return null;
  }

  logger.debug("[PassageModal] Status:", status, "intentToken:", intentToken);

  // Show loading state when no intent token yet
  const isInitializing = !intentToken;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2,
        ease: "easeIn",
      },
    },
  };

  if (presentationStyle === "embed") {
    logger.debug("[PassageModal] Rendering in embed mode");

    // Embed mode - render iframe directly without modal wrapper
    return (
      <motion.div
        key="passage-connect-flow-content"
        className="passage-connect-flow"
        layout
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "12px",
          overflow: "hidden",
          backgroundColor: "#FFFFFF",
          ...mergedStyles.content,
        }}
      >
        {isInitializing ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              height: "100%",
              backgroundColor: "#F9FAFB",
            }}
          >
            <div
              style={{
                textAlign: "center",
              }}
            >
              {/* Loading spinner */}
              <div
                className="passage-loading-spinner"
                style={{
                  width: "48px",
                  height: "48px",
                  margin: "0 auto 16px",
                  border: "3px solid #E5E7EB",
                  borderTopColor: "#3B82F6",
                  borderRadius: "50%",
                  animation: "passage-spin 1s linear infinite",
                }}
              />
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "#6B7280",
                }}
              >
                Establishing secure connection...
              </p>
            </div>
          </div>
        ) : (
          <iframe
            src={`${baseUrl}/connect?intentToken=${intentToken || ""}&userAgent=${USER_AGENT}&modal=false`}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
            }}
            title="Passage Connect Flow"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        )}
      </motion.div>
    );
  }

  // Modal presentation - render iframe fullscreen with transparency
  // Let ConnectFlow handle the modal UI entirely
  logger.debug("[PassageModal] Rendering in fullscreen transparent modal mode");
  return (
    <AnimatePresence>
      {/* Fullscreen transparent container */}
      <motion.div
        key="passage-modal-fullscreen"
        className="passage-modal-fullscreen"
        data-passage-modal="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "transparent", // Transparent background
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          pointerEvents: isInitializing ? "auto" : "none", // Allow interactions to pass through to iframe when loaded
        }}
      >
        {isInitializing ? (
          // Show loading state with backdrop when initializing
          <>
            {/* Loading backdrop */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                zIndex: 1,
              }}
              onClick={onClose}
            />
            {/* Loading content */}
            <motion.div
              style={{
                position: "relative",
                zIndex: 2,
                width: "400px",
                height: "300px",
                backgroundColor: "#FFFFFF",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                pointerEvents: "auto",
              }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div style={{ textAlign: "center" }}>
                {/* Loading spinner */}
                <div
                  className="passage-loading-spinner"
                  style={{
                    width: "48px",
                    height: "48px",
                    margin: "0 auto 16px",
                    border: "3px solid #E5E7EB",
                    borderTopColor: "#3B82F6",
                    borderRadius: "50%",
                    animation: "passage-spin 1s linear infinite",
                  }}
                />
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#6B7280",
                  }}
                >
                  Establishing secure connection...
                </p>
              </div>

              {/* Close button for loading state */}
              <button
                onClick={onClose}
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  fontWeight: "bold",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
                }}
              >
                ×
              </button>
            </motion.div>
          </>
        ) : (
          // Render fullscreen iframe - let ConnectFlow handle the modal
          <iframe
            src={`${baseUrl}/connect?intentToken=${intentToken || ""}&userAgent=${USER_AGENT}&modal=true`}
            style={{
              width: "100vw",
              height: "100vh",
              border: "none",
              display: "block",
              backgroundColor: "transparent",
              pointerEvents: "auto", // Enable interactions with iframe content
            }}
            title="Passage Connect Flow"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        )}
      </motion.div>

      {/* CSS Animations */}
      <style>{`
        @keyframes passage-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Ensure Passage modal is always on top */
        .passage-modal-fullscreen {
          z-index: 99999 !important;
        }
        
        /* Mobile responsive styles */
        @media (max-width: 768px) {
          .passage-modal-fullscreen iframe {
            width: 100vw !important;
            height: 100vh !important;
          }
        }
      `}</style>
    </AnimatePresence>
  );
};
