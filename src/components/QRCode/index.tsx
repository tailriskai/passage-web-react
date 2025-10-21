import React, { useState, useEffect, CSSProperties } from 'react';
import QRCodeLib from 'qrcode';

export interface QRCodeProps {
  /** The value to encode in the QR code */
  value: string;
  /** Size of the QR code (default: 256) */
  size?: number;
  /** Background color (default: #FFFFFF) */
  backgroundColor?: string;
  /** Foreground color (default: #000000) */
  foregroundColor?: string;
  /** Error correction level (default: 'M') */
  level?: 'L' | 'M' | 'Q' | 'H';
  /** Optional className for styling */
  className?: string;
  /** Optional inline styles */
  style?: CSSProperties;
  /** Alt text for the QR code image */
  alt?: string;
}

/**
 * QR Code component for displaying QR codes
 * Uses the qrcode library to generate data URLs
 */
export const QRCode: React.FC<QRCodeProps> = ({
  value,
  size = 256,
  backgroundColor = '#FFFFFF',
  foregroundColor = '#000000',
  level = 'M',
  className,
  style,
  alt = 'QR Code'
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    QRCodeLib.toDataURL(
      value,
      {
        width: size,
        margin: 1,
        color: {
          dark: foregroundColor,
          light: backgroundColor
        },
        errorCorrectionLevel: level
      },
      (err, url) => {
        if (err) {
          console.error('[QRCode] Error generating QR code:', err);
        } else {
          setQrCodeDataUrl(url);
        }
      }
    );
  }, [value, size, backgroundColor, foregroundColor, level]);

  if (!qrCodeDataUrl) {
    return (
      <div
        className={className}
        style={{
          display: 'inline-block',
          ...style
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size,
            height: size,
            backgroundColor: '#F3F4F6',
            borderRadius: '4px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <style>
            {`
              @keyframes qr-pulse {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 0.8; }
              }
              @keyframes qr-shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
            `}
          </style>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              animation: 'qr-shimmer 2s infinite',
              position: 'absolute',
              top: 0,
              left: 0
            }}
          />
          <div
            style={{
              width: '80%',
              height: '80%',
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              animation: 'qr-pulse 1.5s ease-in-out infinite'
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'inline-block',
        ...style
      }}
    >
      <img
        src={qrCodeDataUrl}
        alt={alt}
        width={size}
        height={size}
        style={{
          display: 'block',
          maxWidth: '100%',
          height: 'auto',
          width: '100%'
        }}
      />
    </div>
  );
};

export default QRCode;