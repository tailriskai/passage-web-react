import React, { useEffect, useState } from 'react';
import { useShortCode } from '../../hooks/useShortCode';
import { AndroidView } from './AndroidView';
import { DesktopView } from './DesktopView';
import { applyBranding, resetBranding } from '../../utils/branding';
import type { BrandingConfig } from '../../types';

export interface AppClipPageProps {
  /** Optional short code from URL params */
  shortCode?: string;
  /** Base URL for QR code generation */
  baseUrl?: string;
  /** Optional logo URL */
  logoUrl?: string;
  /** Optional integration name override */
  integrationName?: string;
  /** Callback when intent token is resolved */
  onIntentTokenResolved?: (intentToken: string) => void;
}

/**
 * AppClipPage component - Displays App Clip UI for connecting accounts
 *
 * This component provides device detection, QR code display, and SMS functionality.
 */
export const AppClipPage: React.FC<AppClipPageProps> = ({
  shortCode: propShortCode,
  baseUrl = 'https://app.getpassage.com',
  logoUrl,
  integrationName: propIntegrationName,
  onIntentTokenResolved
}) => {
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

  // Get shortCode from props or URL params
  const shortCode = propShortCode || (() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('shortCode') || urlParams.get('shortcode');
  })();

  // Use hooks to resolve short code and handle intent token
  const {
    intentToken,
    config,
    isLoading: isResolvingShortCode,
    error: shortCodeError
  } = useShortCode(shortCode);


  // Build QR code URL
  const qrCodeUrl = shortCode
    ? `https://appclip.apple.com/id?p=com.passage.authenticator.Clip&shortCode=${encodeURIComponent(shortCode)}`
    : baseUrl;

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

  // Set default light theme on mount
  useEffect(() => {
    document.documentElement.style.setProperty('--color-background', '#ffffff');
    document.documentElement.style.setProperty('--color-card-background', '#f5f5f5');
  }, []);

  // Apply branding when config loads
  useEffect(() => {
    if (config) {
      const brandingConfig: BrandingConfig = {
        integrationName: config.integrationName || '',
        colorPrimary: config.colorPrimary,
        colorBackground: config.colorBackground,
        colorCardBackground: config.colorCardBackground,
        colorText: config.colorText,
        colorTextSecondary: config.colorTextSecondary,
        logoUrl: config.logoUrl
      };
      applyBranding(brandingConfig);
    }

    return () => {
      resetBranding();
    };
  }, [config]);

  // Update QR code size on window resize
  useEffect(() => {
    const updateQrCodeSize = () => {
      const width = window.innerWidth;
      if (width <= 375) {
        setQrCodeSize(100); // Small screens (iPhone SE, etc.)
      } else if (width <= 480) {
        setQrCodeSize(116); // Medium mobile screens
      } else if (width <= 768) {
        setQrCodeSize(160); // Tablets and small desktops
      } else {
        setQrCodeSize(200); // Desktop screens
      }
    };

    window.addEventListener('resize', updateQrCodeSize);
    return () => window.removeEventListener('resize', updateQrCodeSize);
  }, []);


  // Notify when intent token is resolved
  useEffect(() => {
    if (intentToken && onIntentTokenResolved) {
      onIntentTokenResolved(intentToken);
    }
  }, [intentToken, onIntentTokenResolved]);

  // Determine which view to show
  const showDesktopView = !isAndroid || forceDesktopView;
  const integrationName = config?.integrationName || propIntegrationName || 'account';
  const isLoadingConfig = isResolvingShortCode && !!shortCode;

  if (!showDesktopView) {
    // Android mobile view
    return <AndroidView onSendToIos={() => setForceDesktopView(true)} />;
  }

  // Desktop/iOS view
  return (
    <DesktopView
      isLoading={isLoadingConfig}
      integrationName={integrationName}
      qrCodeUrl={qrCodeUrl}
      qrCodeSize={qrCodeSize}
      isIosMobile={isIosMobile}
      logoUrl={logoUrl}
    />
  );
};

export default AppClipPage;