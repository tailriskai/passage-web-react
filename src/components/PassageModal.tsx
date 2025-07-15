import React, { useEffect, useState } from "react";
import { QRCode } from "./QRCode";
import { StatusDisplay } from "./StatusDisplay";
import { logger } from "../logger";
import type { ConnectionStatus, PassageModalStyles } from "../types";

interface PassageModalProps {
  isOpen: boolean;
  intentToken: string | null;
  status: ConnectionStatus | null;
  baseUrl: string;
  onClose: () => void;
  customStyles?: PassageModalStyles;
  presentationStyle?: "modal" | "embed";
}

export const PassageModal: React.FC<PassageModalProps> = ({
  isOpen,
  intentToken,
  status,
  baseUrl,
  onClose,
  customStyles = {},
  presentationStyle = "modal",
}) => {
  const [qrValue, setQrValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (intentToken) {
      setIsLoading(true);
      logger.debug(
        "[PassageModal] Generating QR code for intentToken:",
        intentToken
      );
      // Build QR code value - this should match what the mobile app expects
      const qrData = {
        intentToken,
        baseUrl,
        timestamp: new Date().toISOString(),
      };
      const qrString = JSON.stringify(qrData);
      logger.debug("[PassageModal] QR code data:", qrData);
      logger.debug("[PassageModal] QR code string length:", qrString.length);
      setQrValue(qrString);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      setQrValue("");
    }
  }, [intentToken, baseUrl]);

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

  if (!isOpen || !intentToken) {
    logger.debug(
      "[PassageModal] Not rendering - isOpen:",
      isOpen,
      "intentToken:",
      intentToken
    );
    return null;
  }

  const shouldShowQR = status === "pending" || status === "connecting";
  const isComplete = status === "data_available";
  const hasError = status === "error" || status === "rejected";

  logger.debug(
    "[PassageModal] Render state - shouldShowQR:",
    shouldShowQR,
    "isComplete:",
    isComplete,
    "hasError:",
    hasError
  );

  const content = (
    <div
      className="passage-modal-content"
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: presentationStyle === "modal" ? "12px" : "0",
        padding: "32px",
        width: "100%",
        maxWidth: "480px",
        margin: "0 auto",
        boxShadow:
          presentationStyle === "modal"
            ? "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            : "none",
        ...customStyles.content,
      }}
    >
      {/* Header */}
      <div
        className="passage-modal-header"
        style={{
          marginBottom: "32px",
          textAlign: "center",
          ...customStyles.header,
        }}
      >
        <h2
          style={{
            margin: "0 0 8px 0",
            fontSize: "24px",
            fontWeight: "700",
            color: "#111827",
          }}
        >
          {isComplete ? "Connection Complete" : "Connect Your Account"}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "#6B7280",
          }}
        >
          {shouldShowQR
            ? "Scan this QR code with Passage Authenticator"
            : "Follow the progress below"}
        </p>
      </div>

      {/* Body */}
      <div
        className="passage-modal-body"
        style={{
          marginBottom: "24px",
          ...customStyles.body,
        }}
      >
        {/* QR Code */}
        {shouldShowQR && (
          <div
            style={{
              marginBottom: "32px",
            }}
          >
            {isLoading ? (
              <>
                {/* Loading state for QR code */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "16px",
                    backgroundColor: "#F9FAFB",
                    borderRadius: "8px",
                    height: "272px", // Match QR code container height (240px + 32px padding)
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
                      Generating secure connection...
                    </p>
                  </div>
                </div>

                {/* Loading state for link */}
                <div
                  style={{
                    marginTop: "16px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "12px",
                      color: "#6B7280",
                    }}
                  >
                    Or open this link on your mobile device:
                  </p>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "8px 12px",
                      backgroundColor: "#EFF6FF",
                      borderRadius: "6px",
                      border: "1px solid #DBEAFE",
                    }}
                  >
                    <div
                      style={{
                        width: "200px",
                        height: "20px",
                        backgroundColor: "#E5E7EB",
                        borderRadius: "4px",
                        animation: "passage-pulse 1.5s ease-in-out infinite",
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "16px",
                    backgroundColor: "#F9FAFB",
                    borderRadius: "8px",
                  }}
                >
                  <QRCode value={qrValue} size={240} />
                </div>

                {/* Clickable link under QR code */}
                <div
                  style={{
                    marginTop: "16px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "12px",
                      color: "#6B7280",
                    }}
                  >
                    Or open this link on your mobile device:
                  </p>
                  <a
                    href={`passage://connect?intentToken=${intentToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "14px",
                      color: "#3B82F6",
                      textDecoration: "none",
                      wordBreak: "break-all",
                      display: "inline-block",
                      padding: "8px 12px",
                      backgroundColor: "#EFF6FF",
                      borderRadius: "6px",
                      border: "1px solid #DBEAFE",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#DBEAFE";
                      e.currentTarget.style.borderColor = "#BFDBFE";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#EFF6FF";
                      e.currentTarget.style.borderColor = "#DBEAFE";
                    }}
                  >
                    {`passage://connect?intentToken=${intentToken}`}
                  </a>
                </div>
              </>
            )}
          </div>
        )}

        {/* Status Display */}
        {status && <StatusDisplay status={status} />}

        {/* Success Message */}
        {isComplete && (
          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              backgroundColor: "#F0FDF4",
              border: "1px solid #86EFAC",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, color: "#15803D" }}>
              Your accounts have been successfully connected. You can now close
              this window.
            </p>
          </div>
        )}

        {/* Error Message */}
        {hasError && (
          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              backgroundColor: "#FEF2F2",
              border: "1px solid #FCA5A5",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, color: "#991B1B" }}>
              {status === "rejected"
                ? "Connection was rejected. Please try again."
                : "Unable to complete the connection. Please try again or contact support if the issue persists."}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="passage-modal-footer"
        style={{
          display: "flex",
          justifyContent: "center",
          paddingTop: "16px",
          borderTop: "1px solid #E5E7EB",
          ...customStyles.footer,
        }}
      >
        {presentationStyle === "modal" && (
          <button
            onClick={() => {
              logger.debug("[PassageModal] Close button clicked");
              onClose();
            }}
            style={{
              padding: "10px 24px",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              backgroundColor: "#FFFFFF",
              border: "1px solid #D1D5DB",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#F9FAFB";
              e.currentTarget.style.borderColor = "#9CA3AF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#FFFFFF";
              e.currentTarget.style.borderColor = "#D1D5DB";
            }}
          >
            {isComplete || hasError ? "Close" : "Cancel"}
          </button>
        )}
      </div>
    </div>
  );

  if (presentationStyle === "embed") {
    logger.debug("[PassageModal] Rendering in embed mode");
    return content;
  }

  // Modal presentation
  logger.debug("[PassageModal] Rendering in modal mode");
  return (
    <>
      {/* Backdrop */}
      <div
        className="passage-modal-backdrop"
        data-passage-modal="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          animation: "passage-fade-in 0.2s ease-out",
        }}
        onClick={() => {
          logger.debug("[PassageModal] Backdrop clicked");
          onClose();
        }}
      >
        {/* Modal Container */}
        <div
          className="passage-modal-container"
          style={{
            position: "relative",
            width: "90%",
            maxWidth: "480px",
            animation: "passage-slide-up 0.3s ease-out",
            zIndex: 10000,
            ...customStyles.container,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes passage-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes passage-slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes passage-progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        
        @keyframes passage-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes passage-pulse {
          0% { opacity: 0.3; }
          50% { opacity: 0.6; }
          100% { opacity: 0.3; }
        }
        
        /* Ensure Passage modal is always on top */
        .passage-modal-backdrop {
          z-index: 99999 !important;
        }
        
        .passage-modal-container {
          z-index: 100000 !important;
        }
      `}</style>
    </>
  );
};
