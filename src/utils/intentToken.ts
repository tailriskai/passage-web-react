/**
 * Intent token utilities for the Passage SDK
 * Handles JWT decoding, resource analysis, and write operation detection
 */

import { logger } from '../logger';
import { getConfig } from '../core/passage';

// Simple JWT decode function to avoid external dependency
function jwtDecode<T = any>(token: string): T {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    throw new Error('Failed to decode JWT token');
  }
}

export interface ResourceOperation {
  read?: Record<string, unknown>;
  write?: Record<string, unknown>;
}

export interface IntentTokenResources {
  balance?: ResourceOperation;
  payment_method?: ResourceOperation;
  [key: string]: ResourceOperation | undefined;
}

export interface IntentTokenPayload {
  sessionId: string;
  resources?: IntentTokenResources;
  returnUrl?: string;
  products?: string[];
  amount?: string | number;
  operationType?: string;
  // Allow other properties from JWT decode without explicitly defining them
  [key: string]: unknown;
}

export interface WriteResourceInfo {
  resourceType: string;
  hasWrite: boolean;
  writeConfig?: Record<string, unknown>;
}

/**
 * Decodes an intent token and extracts its payload
 */
export function decodeIntentToken(token: string): IntentTokenPayload | null {
  try {
    return jwtDecode<IntentTokenPayload>(token);
  } catch (error) {
    logger.error('Failed to decode intent token:', error);
    return null;
  }
}

/**
 * Extracts write resource information from the intent token
 */
export function getWriteResources(payload: IntentTokenPayload): WriteResourceInfo[] {
  const writeResources: WriteResourceInfo[] = [];

  if (!payload.resources) {
    return writeResources;
  }

  // Check each resource for write permissions
  Object.entries(payload.resources).forEach(([resourceType, resourceConfig]) => {
    if (resourceConfig?.write) {
      writeResources.push({
        resourceType,
        hasWrite: true,
        writeConfig: resourceConfig.write
      });
    }
  });

  return writeResources;
}

/**
 * Checks if the intent token has any write operations
 */
export function hasWriteOperations(payload: IntentTokenPayload): boolean {
  return getWriteResources(payload).length > 0;
}

/**
 * Checks if the write operation is a one-time operation
 * Returns true for balance and payment_method writes
 */
export function isOneTimeWriteOperation(resourceType: string): boolean {
  // Both balance writes (gift card redemption) and payment method writes
  // are considered one-time operations
  return resourceType === 'balance' || resourceType === 'payment_method';
}

interface ResourceDataItem {
  amount?: number | string;
  value?: number | string;
  [key: string]: unknown;
}

/**
 * Fetches resource data to check if write operation was already performed
 */
export async function checkResourceData(
  sessionId: string,
  resourceType: string,
  intentToken?: string
): Promise<{ hasData: boolean; data?: ResourceDataItem[] }> {
  try {
    const config = getConfig();
    const apiUrl = config?.apiUrl || 'https://api.getpassage.ai';
    const endpoint = `${apiUrl}/connections/${sessionId}/${resourceType}`;

    logger.debug(`[checkResourceData] Fetching ${resourceType} data from:`, endpoint);

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    // Add intent token to headers if provided
    if (intentToken) {
      headers['x-intent-token'] = intentToken;
      logger.debug('[checkResourceData] Added intent token to headers');
    }

    const response = await fetch(endpoint, {
      method: 'GET',
      headers
    });

    logger.debug(`[checkResourceData] Response status: ${response.status}`);

    if (!response.ok) {
      // If we get 404, it means no data exists
      if (response.status === 404) {
        logger.debug(`[checkResourceData] No data found (404) for ${resourceType}`);
        return { hasData: false };
      }
      throw new Error(`Failed to fetch ${resourceType} data: ${response.status}`);
    }

    const data = await response.json();
    logger.debug(`[checkResourceData] Response data:`, data);

    // Check if there's actual data
    const hasData = data?.data && Array.isArray(data.data) && data.data.length > 0;

    logger.debug(
      `[checkResourceData] Has data: ${hasData}, data length: ${data?.data?.length || 0}`
    );

    return { hasData, data: data?.data };
  } catch (error) {
    logger.error(`[checkResourceData] Error checking ${resourceType} data:`, error);
    return { hasData: false };
  }
}

/**
 * Checks if a write operation was already performed for a given session
 */
export async function isWriteOperationCompleted(
  payload: IntentTokenPayload,
  intentToken?: string
): Promise<{
  completed: boolean;
  resourceType?: string;
  amount?: string | number;
  totalBalance?: string | number;
}> {
  const writeResources = getWriteResources(payload);
  logger.debug('[isWriteOperationCompleted] Checking write resources:', writeResources);
  logger.debug('[isWriteOperationCompleted] Session ID:', payload.sessionId);

  // Check each write resource to see if it was already completed
  for (const resource of writeResources) {
    logger.debug(`[isWriteOperationCompleted] Checking resource: ${resource.resourceType}`);

    // Only check one-time operations
    if (isOneTimeWriteOperation(resource.resourceType)) {
      logger.debug(`[isWriteOperationCompleted] ${resource.resourceType} is a one-time operation`);

      const result = await checkResourceData(payload.sessionId, resource.resourceType, intentToken);
      logger.debug(`[isWriteOperationCompleted] Resource data check result:`, result);

      if (result.hasData) {
        // For balance, extract the total balance from the API response
        let amount: string | number | undefined;
        let totalBalance: string | number | undefined;

        if (resource.resourceType === 'balance') {
          // The API response contains the total balance, not the specific amount added
          if (result.data?.[0]) {
            const rawTotalBalance = result.data[0].amount || result.data[0].value;
            // Format total balance as currency
            if (rawTotalBalance !== undefined) {
              const numBalance =
                typeof rawTotalBalance === 'number'
                  ? rawTotalBalance
                  : parseFloat(rawTotalBalance.toString());
              totalBalance = `$${numBalance.toFixed(2)}`;
            }
          }

          // Try to get the specific amount that was added from intent token
          const rawAmount = payload.amount || resource.writeConfig?.amount;
          // Format amount as currency if it exists
          if (rawAmount !== undefined && rawAmount !== null) {
            const numAmount =
              typeof rawAmount === 'number' ? rawAmount : parseFloat(rawAmount.toString());
            amount = `$${numAmount.toFixed(2)}`;
          }

          logger.debug(`[isWriteOperationCompleted] Balance information:`, {
            totalBalance,
            amountAdded: amount,
            apiResponseAmount: result.data?.[0]?.amount || result.data?.[0]?.value,
            payloadAmount: payload.amount,
            writeConfigAmount: resource.writeConfig?.amount
          });
        }

        logger.info(
          `[isWriteOperationCompleted] ✅ Write operation completed for ${resource.resourceType}`
        );
        return {
          completed: true,
          resourceType: resource.resourceType,
          amount,
          totalBalance
        };
      }
    }
  }

  logger.debug('[isWriteOperationCompleted] No completed write operations found');
  return { completed: false };
}

/**
 * Formats the success message based on write operations
 */
export function getSuccessMessage(
  payload: IntentTokenPayload,
  integrationName: string,
  amount?: string | number,
  totalBalance?: string | number
): string {
  const { products, operationType } = payload;

  // Check for add-balance operations (gift cards)
  if (products?.includes('add-balance')) {
    let message: string;

    // If we have the specific amount that was added, show it
    if (amount) {
      // Format amount as currency
      let formattedAmount: string;

      if (typeof amount === 'number') {
        formattedAmount = `$${amount.toFixed(2).replace(/\.00$/, '')}`;
      } else {
        const amountStr = amount.toString();
        if (amountStr.startsWith('$')) {
          formattedAmount = amountStr;
        } else if (amountStr.match(/^\d+(\.\d{1,2})?$/)) {
          const numAmount = parseFloat(amountStr);
          formattedAmount = `$${numAmount.toFixed(2).replace(/\.00$/, '')}`;
        } else {
          formattedAmount = amountStr;
        }
      }

      message = `${formattedAmount} was added to your ${integrationName} balance`;
    } else {
      // Generic message when we don't have the specific amount
      message = `Funds were added to your ${integrationName} balance`;
    }

    // Add total balance if available (show it after the main message)
    if (totalBalance !== undefined) {
      let formattedTotal: string;

      if (typeof totalBalance === 'number') {
        formattedTotal = `$${totalBalance.toFixed(2).replace(/\.00$/, '')}`;
      } else {
        const totalStr = totalBalance.toString();
        if (totalStr.startsWith('$')) {
          formattedTotal = totalStr;
        } else if (totalStr.match(/^\d+(\.\d{1,2})?$/)) {
          const numTotal = parseFloat(totalStr);
          formattedTotal = `$${numTotal.toFixed(2).replace(/\.00$/, '')}`;
        } else {
          formattedTotal = totalStr;
        }
      }

      message += `. Balance: ${formattedTotal}`;
    }

    return message;
  }

  // Check for card switch operations
  if (operationType === 'card-switch' || products?.includes('card-switch')) {
    return `A new card was added to your ${integrationName} account`;
  }

  // Check if this is any write operation
  const writeResources = getWriteResources(payload);
  if (writeResources.length > 0) {
    // Generic write operation message
    if (writeResources.some(r => r.resourceType === 'payment_method')) {
      return `Your payment method was updated in ${integrationName}`;
    }
    if (writeResources.some(r => r.resourceType === 'balance')) {
      // Fallback for balance if no amount is specified
      return `Funds were added to your ${integrationName} balance`;
    }
    // Generic write operation
    return `Your ${integrationName} account was updated`;
  }

  // Default message for read-only operations
  return `Your ${integrationName} account was connected`;
}

/**
 * Determines if "View results" button should be shown based on write operations
 */
export function shouldShowViewResults(payload: IntentTokenPayload): boolean {
  // Show "View results" only if there's a returnUrl AND no write operations
  return !!payload.returnUrl && !hasWriteOperations(payload);
}