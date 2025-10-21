/**
 * Shortcode resolution utilities for Passage SDK
 * Handles resolving short codes to intent tokens and configuration
 */

import { logger } from '../logger';
import { getConfig } from './passage';

export interface ShortCodeConfig {
  shortCode: string;
  intentToken: string;
  integrationName: string;
}

export interface IntentTokenResponse {
  intentToken: string;
  sessionId?: string;
  resources?: Record<string, any>;
  returnUrl?: string;
}

/**
 * Resolve a short code to get the intent token and configuration
 * @param shortCode The short code to resolve
 * @returns Promise with the resolved intent token and config
 */
export async function resolveShortCode(shortCode: string): Promise<IntentTokenResponse> {
  const config = getConfig();
  const apiUrl = config.apiUrl || 'https://api.getpassage.ai';

  try {
    logger.info('[ShortCode] Resolving short code:', shortCode);

    // First, try to fetch the intent-token-link configuration
    const configResponse = await fetch(
      `${apiUrl}/intent-token-links/short-code/${encodeURIComponent(shortCode)}`
    );

    let integrationName = 'account'; // default

    if (configResponse.ok) {
      const configData = await configResponse.json();
      integrationName = configData.integrationName || 'account';
      logger.debug('[ShortCode] Found configuration:', configData);
    }

    // Now resolve the short code to get the actual intent token
    const tokenResponse = await fetch(
      `${apiUrl}/intent-token?shortCode=${encodeURIComponent(shortCode)}`
    );

    if (!tokenResponse.ok) {
      throw new Error(`Failed to resolve short code: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.intentToken) {
      throw new Error('No intent token returned from short code resolution');
    }

    logger.info('[ShortCode] Successfully resolved to intent token');

    return {
      intentToken: tokenData.intentToken,
      sessionId: tokenData.sessionId,
      resources: tokenData.resources,
      returnUrl: tokenData.returnUrl
    };
  } catch (error) {
    logger.error('[ShortCode] Failed to resolve short code:', error);
    throw error;
  }
}

/**
 * Validate an intent token by checking its format and optionally verifying with the server
 * @param intentToken The intent token to validate
 * @param verify Whether to verify with the server (default: false)
 */
export async function validateIntentToken(
  intentToken: string,
  verify: boolean = false
): Promise<boolean> {
  try {
    // Basic JWT format validation
    const parts = intentToken.split('.');
    if (parts.length !== 3) {
      logger.warn('[ShortCode] Invalid intent token format');
      return false;
    }

    if (verify) {
      const config = getConfig();
      const apiUrl = config.apiUrl || 'https://api.getpassage.ai';

      // Verify with server
      const response = await fetch(`${apiUrl}/intent-token/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ intentToken })
      });

      return response.ok;
    }

    return true;
  } catch (error) {
    logger.error('[ShortCode] Failed to validate intent token:', error);
    return false;
  }
}

/**
 * Get configuration for a short code without resolving to intent token
 * Useful for displaying integration information before connection
 */
export async function getShortCodeConfig(shortCode: string): Promise<ShortCodeConfig | null> {
  const config = getConfig();
  const apiUrl = config.apiUrl || 'https://api.getpassage.ai';

  try {
    const response = await fetch(
      `${apiUrl}/intent-token-links/short-code/${encodeURIComponent(shortCode)}`
    );

    if (!response.ok) {
      logger.warn('[ShortCode] No configuration found for short code');
      return null;
    }

    const data = await response.json();

    return {
      shortCode: data.shortCode,
      intentToken: data.intentToken || '',
      integrationName: data.integrationName || 'account'
    };
  } catch (error) {
    logger.error('[ShortCode] Failed to get short code config:', error);
    return null;
  }
}

/**
 * Build a QR code URL with optional short code
 * @param baseUrl The base URL for the QR code
 * @param shortCode Optional short code to append
 */
export function buildQRCodeUrl(baseUrl: string, shortCode?: string): string {
  if (!shortCode) {
    return baseUrl;
  }

  const url = new URL(baseUrl);
  url.searchParams.set('shortCode', shortCode);

  return url.toString();
}