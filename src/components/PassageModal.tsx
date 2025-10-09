import React, { useEffect, useState, useRef } from "react";
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
  // Memoize merged styles to prevent recalculation
  const mergedStyles = React.useMemo(
    () => ({
      content: { ...defaultCustomStyles.content, ...customStyles.content },
      header: { ...defaultCustomStyles.header, ...customStyles.header },
      body: { ...defaultCustomStyles.body, ...customStyles.body },
      footer: { ...defaultCustomStyles.footer, ...customStyles.footer },
      container: {
        ...defaultCustomStyles.container,
        ...customStyles.container,
      },
    }),
    [customStyles]
  );

  // Track iframe load state
  const [iframeLoaded, setIframeLoaded] = useState(true); // Default to true to hide loading
  const previousIntentToken = useRef<string | null>(null);

  // Listen for dimension updates and close events from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      logger.debug("[PassageModal] Received message from origin:", {
        origin: event.origin,
        expected: new URL(baseUrl).origin,
      });

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
          // Navigate in the same tab instead of opening a new one
          // This allows users to use the browser back button to return
          window.location.href = data.url;
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
      } catch (error) {
        // Ignore non-JSON messages
        logger.error("[PassageModal] Error parsing message:", error);
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

  logger.debug("[PassageModal] Status:", {
    status,
    intentToken,
  });

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
        <iframe
          src={`${baseUrl}/connect?intentToken=${intentToken || ""}&userAgent=${USER_AGENT}&modal=false`}
          onLoad={() => setIframeLoaded(true)}
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
      </motion.div>
    );
  }

  // Modal presentation - render iframe fullscreen with transparency
  // Let ConnectFlow handle the modal UI entirely
  logger.debug("[PassageModal] Rendering in fullscreen transparent modal mode");
  return (
    <AnimatePresence mode="wait">
      {/* Fullscreen transparent container */}
      <motion.div
        key="passage-modal-fullscreen"
        className="passage-modal-fullscreen"
        data-passage-modal="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeInOut" }}
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
          pointerEvents: "none", // Allow interactions to pass through to iframe
        }}
      >
        {/* Render fullscreen iframe - let ConnectFlow handle the modal */}
        <iframe
          src={`${baseUrl}/connect?intentToken=${intentToken || ""}&userAgent=${USER_AGENT}&modal=true`}
          onLoad={() => setIframeLoaded(true)}
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
