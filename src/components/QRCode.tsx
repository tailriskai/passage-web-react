import React, { useEffect, useState } from "react";
import QRCodeLib from "qrcode";

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
          console.error("[QRCode] Error generating QR code:", err);
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
          display: "inline-block",
          width: size,
          height: size,
          backgroundColor: "#F3F4F6",
          borderRadius: "8px",
        }}
      />
    );
  }

  return (
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
  );
};
