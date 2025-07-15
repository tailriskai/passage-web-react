import React, { useEffect, useState } from "react";
import QRCodeLib from "qrcode";
import { logger } from "../logger";

interface QRCodeProps {
  value: string;
  size?: number;
  backgroundColor?: string;
  foregroundColor?: string;
  level?: "L" | "M" | "Q" | "H";
}

export const QRCode: React.FC<QRCodeProps> = ({
  value,
  size = 256,
  backgroundColor = "#FFFFFF",
  foregroundColor = "#000000",
  level = "M",
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  useEffect(() => {
    // Generate QR code as data URL
    QRCodeLib.toDataURL(
      value,
      {
        width: size,
        margin: 1,
        color: {
          dark: foregroundColor,
          light: backgroundColor,
        },
        errorCorrectionLevel: level,
      },
      (err, url) => {
        if (err) {
          logger.error("[QRCode] Error generating QR code:", err);
        } else {
          setQrCodeDataUrl(url);
        }
      }
    );
  }, [value, size, backgroundColor, foregroundColor, level]);

  if (!qrCodeDataUrl) {
    return (
      <div
        className="passage-qr-code"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          backgroundColor: "#F9FAFB",
          borderRadius: "8px",
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
              width: "32px",
              height: "32px",
              margin: "0 auto 8px",
              border: "2px solid #E5E7EB",
              borderTopColor: "#3B82F6",
              borderRadius: "50%",
              animation: "passage-spin 1s linear infinite",
            }}
          />
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "#6B7280",
            }}
          >
            Generating...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="passage-qr-code" style={{ display: "inline-block" }}>
        <img
          src={qrCodeDataUrl}
          alt="QR Code"
          width={size}
          height={size}
          style={{
            display: "block",
            maxWidth: "100%",
            height: "auto",
          }}
        />
      </div>

      {/* CSS Animation for loading spinner */}
      <style>{`
        @keyframes passage-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};
