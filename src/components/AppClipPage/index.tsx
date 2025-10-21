import React, { useEffect, useState } from 'react';
import { useShortCode } from '../../hooks/useShortCode';
import { useIntentToken } from '../../hooks/useIntentToken';
import { logger } from '../../logger';
import { AndroidView } from './AndroidView';
import { DesktopView } from './DesktopView';

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
  /** Callback when write operation is detected as already completed */
  onWriteOperationCompleted?: (details: {
    resourceType: string;
    amount?: string | number;
    totalBalance?: string | number;
  }) => void;
}

/**
 * AppClipPage component - Exact replica of AppClipMockPage from passage-infra
 *
 * This component provides the same UI and functionality as the AppClipMockPage
 * with device detection, QR code display, SMS functionality, and write operation checking.
 */
export const AppClipPage: React.FC<AppClipPageProps> = ({
  shortCode: propShortCode,
  baseUrl = 'https://app.getpassage.com',
  logoUrl,
  integrationName: propIntegrationName,
  onIntentTokenResolved,
  onWriteOperationCompleted
}) => {
  // Device detection states
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIosMobile, setIsIosMobile] = useState(false);
  const [forceDesktopView, setForceDesktopView] = useState(false);

  // Write operation states
  const [writeOperationAlreadyCompleted, setWriteOperationAlreadyCompleted] = useState(false);
  const [isCheckingWriteOperation, setIsCheckingWriteOperation] = useState(false);
  const [integrationNameForError, setIntegrationNameForError] = useState<string>('');

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

  const {
    payload,
    hasWrites,
    checkWriteCompleted,
    isLoading: isCheckingWrite
  } = useIntentToken(intentToken);

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

  // Check for write operations when intent token is resolved
  useEffect(() => {
    const checkWriteOperations = async () => {
      if (intentToken && payload && hasWrites) {
        setIsCheckingWriteOperation(true);
        logger.info('[AppClipPage] Checking for completed write operations');

        try {
          const result = await checkWriteCompleted();

          if (result.completed && result.resourceType) {
            logger.info('[AppClipPage] Write operation already completed:', result);
            setWriteOperationAlreadyCompleted(true);
            setIntegrationNameForError(config?.integrationName || propIntegrationName || 'account');

            if (onWriteOperationCompleted) {
              onWriteOperationCompleted({
                resourceType: result.resourceType,
                amount: result.amount,
                totalBalance: result.totalBalance
              });
            }
          }
        } catch (error) {
          logger.error('[AppClipPage] Error checking write operation:', error);
        } finally {
          setIsCheckingWriteOperation(false);
        }
      }
    };

    checkWriteOperations();
  }, [intentToken, payload, hasWrites, config, propIntegrationName]);

  // Notify when intent token is resolved
  useEffect(() => {
    if (intentToken && onIntentTokenResolved) {
      onIntentTokenResolved(intentToken);
    }
  }, [intentToken, onIntentTokenResolved]);

  // Determine which view to show
  const showDesktopView = !isAndroid || forceDesktopView;
  const integrationName = integrationNameForError || config?.integrationName || propIntegrationName || 'account';
  const isLoadingConfig = isResolvingShortCode && !!shortCode;

  if (!showDesktopView) {
    // Android mobile view
    return <AndroidView onSendToIos={() => setForceDesktopView(true)} />;
  }

  // Desktop/iOS view
  return (
    <DesktopView
      isLoading={isLoadingConfig}
      isCheckingWriteOperation={isCheckingWriteOperation}
      writeOperationAlreadyCompleted={writeOperationAlreadyCompleted}
      config={config}
      integrationName={integrationName}
      qrCodeUrl={qrCodeUrl}
      qrCodeSize={qrCodeSize}
      isIosMobile={isIosMobile}
      logoUrl={logoUrl}
    />
  );
};

export default AppClipPage;