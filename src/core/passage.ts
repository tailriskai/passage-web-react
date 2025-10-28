/**
 * Core Passage functions for web React SDK
 * These are the main entry points for using Passage
 */

import { logger } from '../logger';
import {
  PassageConfig,
  PassageOpenOptions,
  GenerateAppClipOptions,
  GenerateAppClipResponse,
  OpenAppClipOptions,
  BrandingConfig,
} from '../types';
import { DEFAULT_API_BASE_URL, INTENT_TOKEN_PATH } from '../config';

// Global configuration state
let globalConfig: PassageConfig | null = null;

/**
 * Configure the Passage SDK with global settings
 */
export function configure(config: PassageConfig): void {
  globalConfig = { ...config };

  logger.setDebugMode(config.debug ?? false);
  logger.debug('[Passage] Configured with:', {
    uiUrl: config.uiUrl,
    apiUrl: config.apiUrl,
    socketUrl: config.socketUrl,
    debug: config.debug,
    hasPublishableKey: !!config.publishableKey
  });
}

/**
 * Open the Passage connection flow
 * This opens the modal/embed with the provided intent token
 */
export function open(options: PassageOpenOptions): void {
  logger.info('[Passage] Opening with token');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('passage:open', { detail: options }));
  }
}

/**
 * Close the current Passage flow
 */
export function close(): void {
  logger.info('[Passage] Closing');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('passage:close'));
  }
}

/**
 * Generate an app clip intent token by calling the backend API
 * This method calls POST /intent-token endpoint
 */
export async function generateAppClip(options: GenerateAppClipOptions): Promise<GenerateAppClipResponse> {
  if (!globalConfig) {
    throw new Error('Passage must be configured before calling generateAppClip. Call configure() first.');
  }

  if (!globalConfig.publishableKey) {
    throw new Error('publishableKey is required in PassageConfig to generate app clip tokens.');
  }

  const apiUrl = globalConfig.apiUrl || DEFAULT_API_BASE_URL;
  const endpoint = `${apiUrl}${INTENT_TOKEN_PATH}`;

  logger.debug('[Passage] Generating app clip intent token', {
    endpoint,
    apiUrl,
    integrationId: options.integrationId,
    hasResources: !!options.resources,
    hasReturnUrl: !!options.returnUrl
  });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Publishable ${globalConfig.publishableKey}`
      },
      body: JSON.stringify({
        integrationId: options.integrationId,
        resources: options.resources,
        returnUrl: options.returnUrl,
        userId: options.userId,
        prompts: options.prompts,
        sessionArgs: options.sessionArgs,
        record: options.record,
        debug: options.debug,
        clearAllCookies: options.clearAllCookies,
        interactive: options.interactive,
        adCampaign: options.adCampaign
      })
    });

    if (!response.ok) {
      let errorMessage = `Failed to generate app clip: ${response.status} ${response.statusText}`;

      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
        if (errorData.errorCode === 'VALIDATION_001' && errorData.details) {
          const validationErrors = Object.values(errorData.details)
            .map((detail: any) => {
              const resourceName = detail.property || 'Unknown';
              const constraints = detail.constraints?.custom || detail.constraints?.message || 'Validation failed';
              return `${resourceName}: ${constraints}`;
            })
            .join('; ');
          errorMessage = `Validation failed: ${validationErrors}`;
        }
      } catch (parseError) {
        logger.warn('[Passage] Could not parse error response:', parseError);
      }

      throw new Error(errorMessage);
    }

    const data: GenerateAppClipResponse = await response.json();

    logger.debug('[Passage] App clip intent token generated successfully', {
      connectionId: data.connectionId,
      shortToken: data.shortToken,
      hasUrl: !!data.url
    });

    return data;
  } catch (error) {
    logger.error('[Passage] Failed to generate app clip:', error);
    throw error;
  }
}

/**
 * Open app clip modal by first generating the intent token and fetching branding
 * This is a convenience method that combines generateAppClip + fetching branding + opening the app clip modal
 */
export async function openAppClip(options: OpenAppClipOptions): Promise<void> {
  logger.info('[Passage] ==== Opening app clip - START ====');
  logger.debug('[Passage] openAppClip called with options:', {
    integrationId: options.integrationId,
    hasResources: !!options.resources,
    hasCallbacks: !!(options.onConnectionComplete || options.onConnectionError)
  });

  try {
    // 1. Generate the intent token
    logger.debug('[Passage] STEP 1: Generating intent token...');
    const appClipData = await generateAppClip(options);
    logger.info('[Passage] ✓ Intent token generated:', {
      connectionId: appClipData.connectionId,
      shortToken: appClipData.shortToken,
      hasUrl: !!appClipData.url,
      hasBrandingInResponse: !!appClipData.branding
    });

    // 2. Extract branding configuration from response
    let branding: BrandingConfig | null = null;

    logger.debug('[Passage] STEP 2: Extracting branding configuration...');

    // Extract branding from the app clip response
    if (appClipData.branding) {
      logger.info('[Passage] ✓ Branding found in intent token response');
      branding = appClipData.branding;
      logger.debug('[Passage] Branding details from response:', {
        integrationName: branding.integrationName,
        colorPrimary: branding.colorPrimary,
        colorBackground: branding.colorBackground,
        colorCardBackground: branding.colorCardBackground,
        colorText: branding.colorText,
        colorTextSecondary: branding.colorTextSecondary,
        logoUrl: branding.logoUrl
      });
    } else {
      logger.warn('[Passage] ⚠️  No branding found in intent token response');
    }

    // 3. Dispatch event to open the app clip modal with all data
    logger.debug('[Passage] STEP 3: Dispatching passage:openAppClip event...');
    if (typeof window !== 'undefined') {
      const eventDetail = {
        appClipData,
        branding,
        callbacks: {
          onConnectionComplete: options.onConnectionComplete,
          onConnectionError: options.onConnectionError,
          onDataComplete: options.onDataComplete,
          onExit: options.onExit
        }
      };

      logger.debug('[Passage] Event detail:', {
        hasAppClipData: !!eventDetail.appClipData,
        hasBranding: !!eventDetail.branding,
        brandingIntegrationName: eventDetail.branding?.integrationName,
        hasCallbacks: !!(eventDetail.callbacks.onConnectionComplete || eventDetail.callbacks.onConnectionError)
      });

      window.dispatchEvent(new CustomEvent('passage:openAppClip', {
        detail: eventDetail
      }));

      logger.info('[Passage] ✓ Event dispatched successfully');
    } else {
      logger.error('[Passage] ✗ Window object not available');
    }

    logger.info('[Passage] ==== App clip modal opened - END ====');
  } catch (error) {
    logger.error('[Passage] ✗✗✗ Failed to open app clip ✗✗✗', error);
    throw error;
  }
}

/**
 * Get current configuration
 */
export function getConfig(): PassageConfig | null {
  return globalConfig ? { ...globalConfig } : null;
}

/**
 * Get the publishable key from the current configuration
 */
export function getPublishableKey(): string | undefined {
  return globalConfig?.publishableKey;
}
