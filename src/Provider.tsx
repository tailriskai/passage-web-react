import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import ReactDOM from 'react-dom';
import { PassageModal } from './components/PassageModal';
import { AppClipModal } from './components/AppClipModal';
import { WebSocketManager } from './websocket-manager';
import { logger } from './logger';
import { analytics, ANALYTICS_EVENTS } from './analytics';
import {
  DEFAULT_UI_BASE_URL,
  DEFAULT_SOCKET_URL,
  DEFAULT_SOCKET_NAMESPACE,
} from './config';
import type {
  PassageConfig,
  PassageContextValue,
  PassageOpenOptions,
  GenerateAppClipOptions,
  GenerateAppClipResponse,
  OpenAppClipOptions,
  ConnectionStatus,
  ConnectionUpdate,
  PassageDataResult,
  PassageSuccessData,
  PassageErrorData,
  BrandingConfig,
} from './types';
import { configure, generateAppClip as coreGenerateAppClip, openAppClip as coreOpenAppClip } from './core/passage';

export const PassageContext = createContext<PassageContextValue | null>(null);

interface PassageProviderProps {
  children: React.ReactNode;
  config: PassageConfig;
}

export const PassageProvider: React.FC<PassageProviderProps> = ({
  children,
  config,
}) => {
  // Main modal state
  const [isOpen, setIsOpen] = useState(false);
  const [intentToken, setIntentToken] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [presentationStyle, setPresentationStyle] = useState<'modal' | 'embed'>('modal');
  const [container, setContainer] = useState<HTMLElement | null>(null);

  // AppClip modal state
  const [isAppClipOpen, setIsAppClipOpen] = useState(false);
  const [appClipData, setAppClipData] = useState<GenerateAppClipResponse | null>(null);
  const [appClipBranding, setAppClipBranding] = useState<BrandingConfig | null>(null);

  // Store callbacks in refs
  const onConnectionCompleteRef = useRef<((data: PassageSuccessData) => void) | undefined>(undefined);
  const onErrorRef = useRef<((error: PassageErrorData) => void) | undefined>(undefined);
  const onDataCompleteRef = useRef<((data: PassageDataResult) => void) | undefined>(undefined);
  const onExitRef = useRef<((reason?: string) => void) | undefined>(undefined);

  const wsManager = WebSocketManager.getInstance();

  // Configure logger and analytics on mount
  useEffect(() => {
    logger.setDebugMode(config.debug ?? false);
    logger.setWebBaseUrl(config.uiUrl || DEFAULT_UI_BASE_URL);

    analytics.configure({
      enabled: true,
      webBaseUrl: config.uiUrl || DEFAULT_UI_BASE_URL,
    });

    // Configure core module
    configure(config);

    logger.debug('[PassageProvider] Initialized with config:', config);
  }, [config]);

  // Listen for passage:open events from core module
  useEffect(() => {
    const handleOpen = (event: CustomEvent<PassageOpenOptions>) => {
      const options = event.detail;
      logger.debug('[PassageProvider] Received passage:open event', options);

      open(options);
    };

    const handleClose = () => {
      logger.debug('[PassageProvider] Received passage:close event');
      close();
    };

    const handleOpenAppClip = (event: CustomEvent<{
      appClipData: GenerateAppClipResponse;
      branding: BrandingConfig | null;
      callbacks: {
        onConnectionComplete?: (data: PassageSuccessData) => void;
        onConnectionError?: (error: PassageErrorData) => void;
        onDataComplete?: (data: PassageDataResult) => void;
        onExit?: (reason?: string) => void;
      };
    }>) => {
      logger.info('[PassageProvider] ==== Received passage:openAppClip event ====');
      const { appClipData, branding, callbacks } = event.detail;

      logger.debug('[PassageProvider] Event detail:', {
        hasAppClipData: !!appClipData,
        hasBranding: !!branding,
        brandingIntegrationName: branding?.integrationName,
        connectionId: appClipData?.connectionId,
        shortToken: appClipData?.shortToken,
        hasCallbacks: !!(callbacks?.onConnectionComplete || callbacks?.onConnectionError)
      });

      if (branding) {
        logger.info('[PassageProvider] ✓ Branding received:', {
          integrationName: branding.integrationName,
          colorPrimary: branding.colorPrimary,
          colorBackground: branding.colorBackground,
          colorCardBackground: branding.colorCardBackground,
          colorText: branding.colorText,
          colorTextSecondary: branding.colorTextSecondary,
          logoUrl: branding.logoUrl
        });
      } else {
        logger.warn('[PassageProvider] ⚠️  No branding received in event');
      }

      // Store callbacks
      onConnectionCompleteRef.current = callbacks.onConnectionComplete;
      onErrorRef.current = callbacks.onConnectionError;
      onDataCompleteRef.current = callbacks.onDataComplete;
      onExitRef.current = callbacks.onExit;

      // Open app clip modal with branding
      logger.debug('[PassageProvider] Setting state to open app clip modal...');
      setAppClipData(appClipData);
      setAppClipBranding(branding);
      setIsAppClipOpen(true);
      logger.info('[PassageProvider] ✓ App clip modal state updated (should open now)');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('passage:open', handleOpen as EventListener);
      window.addEventListener('passage:close', handleClose as EventListener);
      window.addEventListener('passage:openAppClip', handleOpenAppClip as EventListener);

      return () => {
        window.removeEventListener('passage:open', handleOpen as EventListener);
        window.removeEventListener('passage:close', handleClose as EventListener);
        window.removeEventListener('passage:openAppClip', handleOpenAppClip as EventListener);
      };
    }
  }, []);

  // Handle WebSocket connection updates
  useEffect(() => {
    if (!intentToken) {
      return;
    }

    logger.debug('[PassageProvider] Setting up WebSocket listeners for token:', intentToken);

    const unsubscribeMessage = wsManager.addMessageListener(
      (eventName: string, data: any) => {
        logger.debug('[PassageProvider] WebSocket message received:', {
          eventName,
          data,
        });

        // Handle connection events
        if (
          eventName === 'connection' ||
          eventName === 'connection_update' ||
          (data?.id && data?.status)
        ) {
          const connection: ConnectionUpdate = data;
          setStatus(connection.status);

          if (connection.status === 'data_available') {
            const sessionDataResult: PassageDataResult = {
              data: connection.data,
              prompts: connection.promptResults.map((promptResult) => ({
                name: promptResult.name,
                content: promptResult.result,
                response: promptResult.result,
              })),
              intentToken: intentToken,
            };

            onDataCompleteRef.current?.(sessionDataResult);
          } else if (
            connection.status === 'error' ||
            connection.status === 'rejected'
          ) {
            const errorData: PassageErrorData = {
              error:
                connection.status === 'rejected'
                  ? 'Connection rejected'
                  : 'Connection failed',
              code:
                connection.status === 'rejected'
                  ? 'CONNECTION_REJECTED'
                  : 'CONNECTION_ERROR',
            };

            onErrorRef.current?.(errorData);
          }
        }

        // Handle done event
        if (eventName === 'done') {
          const success = data?.success !== false;
          const resultData = data?.data;

          if (success) {
            analytics.track(ANALYTICS_EVENTS.SDK_ON_SUCCESS, {
              status: 'done',
              success: true,
            });

            const successData: PassageSuccessData = {
              connectionId: data?.connectionId || '',
              status: 'done',
              metadata: {
                completedAt: new Date().toISOString(),
              },
              data: resultData || [],
              intentToken: intentToken,
            };

            onConnectionCompleteRef.current?.(successData);
          } else {
            const errorMessage = (resultData as any)?.error || 'Operation completed with failure';

            analytics.track(ANALYTICS_EVENTS.SDK_ON_ERROR, {
              status: 'done',
              success: false,
              error: errorMessage,
            });

            const errorData: PassageErrorData = {
              error: errorMessage,
              code: 'DONE_FAILURE',
              data: resultData,
            };

            onErrorRef.current?.(errorData);
          }
        }

        // Handle WebSocket errors
        if (eventName === 'connect_error' || eventName === 'error') {
          const errorData: PassageErrorData = {
            error: data?.message || 'WebSocket error occurred',
            code: 'WEBSOCKET_ERROR',
            data: data,
          };
          onErrorRef.current?.(errorData);
        }
      }
    );

    return () => {
      logger.debug('[PassageProvider] Cleaning up WebSocket listeners');
      unsubscribeMessage();
    };
  }, [intentToken]);

  // Open method
  const open = useCallback(
    async (options: PassageOpenOptions) => {
      const token = options.token;

      if (!token) {
        const error = 'Token is required to open Passage';
        logger.error('[PassageProvider]', error);
        options.onConnectionError?.({ error });
        return;
      }

      logger.debug('[PassageProvider] Opening Passage with token');

      try {
        // Store callbacks
        onConnectionCompleteRef.current = options.onConnectionComplete;
        onErrorRef.current = options.onConnectionError;
        onDataCompleteRef.current = options.onDataComplete;
        onExitRef.current = options.onExit;

        // Set state
        setIntentToken(token);

        // Track open request
        analytics.track(ANALYTICS_EVENTS.SDK_OPEN_REQUEST, {
          presentationStyle: options.presentationStyle || 'modal',
        });

        // Handle embed mode
        if (options.presentationStyle === 'embed' && options.container) {
          const containerEl =
            typeof options.container === 'string'
              ? (document.querySelector(options.container) as HTMLElement)
              : options.container;

          if (!containerEl) {
            throw new Error('Container element not found');
          }

          setContainer(containerEl);
        }

        // Connect WebSocket
        const socketUrl = config.socketUrl || DEFAULT_SOCKET_URL;
        const socketNamespace = config.socketNamespace || DEFAULT_SOCKET_NAMESPACE;

        await wsManager.connect(token, socketUrl, socketNamespace);

        // Update state
        setPresentationStyle(options.presentationStyle || 'modal');
        setStatus('pending');
        setIsOpen(true);

        logger.debug('[PassageProvider] Passage opened successfully');

        // Track modal opened
        analytics.track(ANALYTICS_EVENTS.SDK_MODAL_OPENED, {
          presentationStyle: options.presentationStyle || 'modal',
        });
      } catch (error) {
        logger.error('[PassageProvider] Failed to open Passage:', error);

        analytics.track(ANALYTICS_EVENTS.SDK_OPEN_ERROR, {
          error: error instanceof Error ? error.message : 'Failed to open Passage',
        });

        const errorData: PassageErrorData = {
          error: error instanceof Error ? error.message : 'Failed to open Passage',
          code: 'OPEN_ERROR',
        };

        options.onConnectionError?.(errorData);
      }
    },
    [config]
  );

  // Close method
  const close = useCallback(() => {
    logger.debug('[PassageProvider] Closing Passage');

    analytics.track(ANALYTICS_EVENTS.SDK_MODAL_CLOSED, {
      status: status || 'unknown',
      presentationStyle: presentationStyle,
    });

    if (!status || status === 'pending' || status === 'connecting') {
      onExitRef.current?.('manual_close');
    }

    // Reset state
    setIsOpen(false);
    setStatus(null);
    setPresentationStyle('modal');
    setContainer(null);

    logger.debug('[PassageProvider] Modal closed');
  }, [status, presentationStyle]);

  // Generate app clip method
  const generateAppClipMethod = useCallback(
    async (options: GenerateAppClipOptions): Promise<GenerateAppClipResponse> => {
      return await coreGenerateAppClip(options);
    },
    []
  );

  // Open app clip method - delegates to core module which handles branding
  const openAppClipMethod = useCallback(
    async (options: OpenAppClipOptions): Promise<void> => {
      logger.info('[PassageProvider] openAppClip called, delegating to core module');
      // Call the core openAppClip function which handles:
      // 1. Generating intent token
      // 2. Fetching/extracting branding
      // 3. Dispatching passage:openAppClip event (which we listen to above)
      await coreOpenAppClip(options);
    },
    []
  );

  // Close app clip modal
  const closeAppClip = useCallback(() => {
    logger.debug('[PassageProvider] Closing app clip modal');
    setIsAppClipOpen(false);
    setAppClipData(null);
    setAppClipBranding(null);
    onExitRef.current?.('manual_close');
  }, []);

  // Log AppClipModal rendering conditions
  useEffect(() => {
    logger.debug('[PassageProvider] AppClipModal render conditions:', {
      isAppClipOpen,
      hasAppClipData: !!appClipData,
      hasBranding: !!appClipBranding,
      brandingIntegrationName: appClipBranding?.integrationName,
      windowAvailable: typeof window !== 'undefined'
    });

    if (isAppClipOpen && appClipData) {
      logger.info('[PassageProvider] ✓ AppClipModal should be rendering now');
    } else if (isAppClipOpen && !appClipData) {
      logger.warn('[PassageProvider] ⚠️  isAppClipOpen=true but no appClipData!');
    }
  }, [isAppClipOpen, appClipData, appClipBranding]);

  const contextValue: PassageContextValue = {
    open,
    close,
    generateAppClip: generateAppClipMethod,
    openAppClip: openAppClipMethod,
  };

  return (
    <PassageContext.Provider value={contextValue}>
      {children}

      {/* Main Passage Modal */}
      {presentationStyle === 'modal' &&
        typeof window !== 'undefined' &&
        ReactDOM.createPortal(
          <PassageModal
            isOpen={isOpen}
            intentToken={intentToken}
            status={status}
            baseUrl={config.uiUrl || DEFAULT_UI_BASE_URL}
            onClose={close}
            customStyles={config.customStyles}
            presentationStyle="modal"
          />,
          document.body
        )}

      {/* Embed mode */}
      {presentationStyle === 'embed' &&
        container &&
        isOpen &&
        typeof window !== 'undefined' &&
        ReactDOM.createPortal(
          <PassageModal
            isOpen={isOpen}
            intentToken={intentToken}
            status={status}
            baseUrl={config.uiUrl || DEFAULT_UI_BASE_URL}
            onClose={close}
            customStyles={config.customStyles}
            presentationStyle="embed"
          />,
          container
        )}

      {/* App Clip Modal */}
      {isAppClipOpen &&
        appClipData &&
        typeof window !== 'undefined' &&
        ReactDOM.createPortal(
          <AppClipModal
            isOpen={isAppClipOpen}
            appClipData={appClipData}
            branding={appClipBranding}
            onClose={closeAppClip}
          />,
          document.body
        )}
    </PassageContext.Provider>
  );
};
