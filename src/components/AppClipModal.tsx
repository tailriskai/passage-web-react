import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '../logger';
import type { GenerateAppClipResponse, BrandingConfig } from '../types';
import { DesktopView } from './AppClipPage/DesktopView';
import { AndroidView } from './AppClipPage/AndroidView';
import { applyBranding, resetBranding } from '../utils/branding';

export interface AppClipModalProps {
  isOpen: boolean;
  appClipData: GenerateAppClipResponse;
  branding: BrandingConfig | null;
  onClose: () => void;
  logoUrl?: string;
}

/**
 * AppClipModal - Modal overlay for App Clip flow
 *
 * Uses transparent overlay pattern similar to PassageModal but renders
 * AppClipPage content directly without iframe
 */
export const AppClipModal: React.FC<AppClipModalProps> = ({
  isOpen,
  appClipData,
  branding,
  onClose,
  logoUrl
}) => {
  logger.debug('[AppClipModal] Component render:', {
    isOpen,
    hasBranding: !!branding,
    hasAppClipData: !!appClipData,
    brandingIntegrationName: branding?.integrationName,
    shortToken: appClipData?.shortToken
  });

  // Device detection states
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIosMobile, setIsIosMobile] = useState(false);
  const [forceDesktopView, setForceDesktopView] = useState(false);

  // QR code state
  const [qrCodeSize, setQrCodeSize] = useState(() => {
    if (typeof window === 'undefined') return 200;
    const width = window.innerWidth;
    if (width <= 375) return 100;
    if (width <= 480) return 116;
    if (width <= 768) return 160;
    return 200;
  });

  // Build QR code URL
  const qrCodeUrl = appClipData.shortToken
    ? `https://appclip.apple.com/id?p=com.passage.authenticator.Clip&shortCode=${encodeURIComponent(appClipData.shortToken)}`
    : appClipData.url;

  // Device detection
  useEffect(() => {
    // Check for testing query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const forceAndroid = urlParams.get('android') === 'true';
    const forceIos = urlParams.get('ios') === 'true';

    // Detect Android and iOS mobile devices
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroidDevice = /android/.test(userAgent);
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isMobileDevice = /android|webos|iphone|ipod|ipad|blackberry|iemobile|opera mini/i.test(userAgent);

    // Allow query params to override detection for testing
    setIsAndroid(forceAndroid || (isAndroidDevice && isMobileDevice));
    setIsIosMobile(forceIos || (isIosDevice && isMobileDevice));
  }, []);

  // Apply branding when modal opens
  useEffect(() => {
    logger.debug('[AppClipModal] Branding effect triggered:', { isOpen, hasBranding: !!branding });

    if (isOpen && branding) {
      logger.info('[AppClipModal] ==== Applying branding ====');
      logger.debug('[AppClipModal] Branding details:', {
        integrationName: branding.integrationName,
        colorPrimary: branding.colorPrimary,
        colorBackground: branding.colorBackground,
        colorCardBackground: branding.colorCardBackground,
        colorText: branding.colorText,
        colorTextSecondary: branding.colorTextSecondary,
        logoUrl: branding.logoUrl
      });
      applyBranding(branding);
      logger.info('[AppClipModal] ✓ Branding applied successfully');
    } else if (isOpen && !branding) {
      logger.warn('[AppClipModal] ⚠️  Modal is open but no branding provided, using defaults');
      applyBranding(null);
    } else {
      logger.debug('[AppClipModal] Modal not open, skipping branding');
    }

    // Reset branding when modal closes
    return () => {
      if (!isOpen) {
        logger.debug('[AppClipModal] Resetting branding (cleanup)');
        resetBranding();
      }
    };
  }, [isOpen, branding]);

  // Update QR code size on window resize
  useEffect(() => {
    const updateQrCodeSize = () => {
      const width = window.innerWidth;
      if (width <= 375) {
        setQrCodeSize(100);
      } else if (width <= 480) {
        setQrCodeSize(116);
      } else if (width <= 768) {
        setQrCodeSize(160);
      } else {
        setQrCodeSize(200);
      }
    };

    window.addEventListener('resize', updateQrCodeSize);
    return () => window.removeEventListener('resize', updateQrCodeSize);
  }, []);

  // Determine which view to show
  const showDesktopView = !isAndroid || forceDesktopView;
  const integrationName = branding?.integrationName || 'account';
  const finalLogoUrl = branding?.logoUrl || logoUrl;

  // Create overlay background color from branding with 0.5 opacity
  const overlayBackgroundColor = branding?.colorBackground
    ? `${branding.colorBackground}80` // Append 80 for 50% opacity in hex
    : 'rgba(0, 0, 0, 0.5)';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="app-clip-modal-overlay"
          className="passage-app-clip-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: overlayBackgroundColor,
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          pointerEvents: "auto",
        }}
        onClick={onClose} // Close on overlay click
      >
        {/* Modal content container - prevents click propagation */}
        <motion.div
          key="app-clip-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()} // Prevent close on content click
          style={{
            position: "relative",
            maxWidth: "90vw",
            maxHeight: "90vh",
            overflow: "auto",
            pointerEvents: "auto",
          }}
        >
          {/* Render AppClipPage views directly */}
          {!showDesktopView ? (
            <AndroidView
              onSendToIos={() => setForceDesktopView(true)}
              logoUrl={finalLogoUrl}
              modalMode={true}
            />
          ) : (
            <DesktopView
              isLoading={false}
              integrationName={integrationName}
              qrCodeUrl={qrCodeUrl}
              qrCodeSize={qrCodeSize}
              isIosMobile={isIosMobile}
              logoUrl={finalLogoUrl}
              modalMode={true}
            />
          )}
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
