/**
 * Intent token link management functions
 * Handles creation, management, and retrieval of intent token links with shortcodes
 */

import { logger } from '../logger';
import { getConfig } from './passage';

// Types for intent token links

export interface CreateIntentTokenLinkRequest {
  integrationId: string;
  requestPayload: {
    resources: Record<string, Record<string, unknown>>;
    returnUrl?: string;
  };
  notes?: string;
  expiresAt?: string;
  metadata?: {
    tags?: string[];
  };
  maxSuccessfulConnections?: number;
}

export interface CreateIntentTokenLinkResponse {
  id: string;
  shortToken: string;
  shortCode?: string; // API may return shortCode instead of shortToken
  connectionId?: string;
}

export interface IntentTokenLink {
  id: string;
  shortCode: string;
  developerId: string;
  integrationId: string;
  requestPayload: {
    resources: Record<string, Record<string, unknown>>;
    integrationId?: string;
  };
  usageCount: number;
  notes?: string;
  isActive: boolean;
  expiresAt?: string;
  metadata?: {
    tags?: string[];
  };
  createdAt: string;
  updatedAt: string;
  maxSuccessfulConnections?: number;
  // Computed URLs
  url?: string;
  openUrl?: string;
  resultUrl?: string;
  // Computed resource info
  resourceNames?: string;
  operationNames?: string;
}

export interface IntentTokenLinksResponse {
  data: IntentTokenLink[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    itemCount: number;
  };
  timestamp?: string;
  version?: string;
}

/**
 * Create a new intent token link with shortcode
 * @param data Configuration for the intent token link
 * @param publishableKey Optional publishable key for authorization
 * @returns The created link with shortcode and ID
 */
export async function createIntentTokenLink(
  data: CreateIntentTokenLinkRequest,
  publishableKey?: string
): Promise<CreateIntentTokenLinkResponse> {
  const config = getConfig();
  const apiUrl = config?.apiUrl || 'https://api.getpassage.ai';
  const { getPublishableKey } = await import('./passage');
  const key = publishableKey || getPublishableKey();

  if (!key) {
    throw new Error('Publishable key is required to create intent token links');
  }

  try {
    logger.info('[IntentTokenLink] Creating new intent token link');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Publishable ${key}`
    };

    const response = await fetch(`${apiUrl}/intent-token-links`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to create intent token link: ${response.statusText}`);
    }

    const result = await response.json();

    // API may return shortCode instead of shortToken
    if (result.shortCode && !result.shortToken) {
      result.shortToken = result.shortCode;
    }

    logger.info('[IntentTokenLink] Successfully created:', {
      id: result.id,
      shortToken: result.shortToken || result.shortCode
    });

    return result;
  } catch (error) {
    logger.error('[IntentTokenLink] Failed to create:', error);
    throw error;
  }
}

/**
 * Get all intent token links
 * @param page Page number for pagination
 * @param limit Number of items per page
 * @returns Array of intent token links
 */
export async function getIntentTokenLinks(
  page: number = 1,
  limit: number = 10
): Promise<IntentTokenLink[]> {
  const config = getConfig();
  const apiUrl = config?.apiUrl || 'https://api.getpassage.ai';

  try {
    logger.info('[IntentTokenLink] Fetching intent token links');

    const response = await fetch(
      `${apiUrl}/intent-token-links?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch intent token links: ${response.statusText}`);
    }

    const result: IntentTokenLinksResponse = await response.json();

    // Enhance links with computed URLs
    const enhancedLinks = result.data.map(link => enhanceIntentTokenLink(link));

    logger.info('[IntentTokenLink] Successfully fetched links:', enhancedLinks.length);

    return enhancedLinks;
  } catch (error) {
    logger.error('[IntentTokenLink] Failed to fetch:', error);
    throw error;
  }
}

/**
 * Get a single intent token link by ID
 * @param linkId The ID of the link to retrieve
 * @returns The intent token link
 */
export async function getIntentTokenLink(linkId: string): Promise<IntentTokenLink> {
  const config = getConfig();
  const apiUrl = config?.apiUrl || 'https://api.getpassage.ai';

  try {
    logger.info('[IntentTokenLink] Fetching intent token link:', linkId);

    const response = await fetch(`${apiUrl}/intent-token-links/${linkId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch intent token link: ${response.statusText}`);
    }

    const link = await response.json();

    logger.info('[IntentTokenLink] Successfully fetched link');

    return enhanceIntentTokenLink(link);
  } catch (error) {
    logger.error('[IntentTokenLink] Failed to fetch:', error);
    throw error;
  }
}

/**
 * Update an intent token link
 * @param linkId The ID of the link to update
 * @param data Partial data to update
 * @returns The updated link
 */
export async function updateIntentTokenLink(
  linkId: string,
  data: Partial<IntentTokenLink>
): Promise<IntentTokenLink> {
  const config = getConfig();
  const apiUrl = config?.apiUrl || 'https://api.getpassage.ai';

  try {
    logger.info('[IntentTokenLink] Updating intent token link:', linkId);

    const response = await fetch(`${apiUrl}/intent-token-links/${linkId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to update intent token link: ${response.statusText}`);
    }

    const link = await response.json();

    logger.info('[IntentTokenLink] Successfully updated link');

    return link;
  } catch (error) {
    logger.error('[IntentTokenLink] Failed to update:', error);
    throw error;
  }
}

/**
 * Deactivate an intent token link
 * @param linkId The ID of the link to deactivate
 */
export async function deactivateIntentTokenLink(linkId: string): Promise<void> {
  const config = getConfig();
  const apiUrl = config?.apiUrl || 'https://api.getpassage.ai';

  try {
    logger.info('[IntentTokenLink] Deactivating intent token link:', linkId);

    const response = await fetch(`${apiUrl}/intent-token-links/${linkId}/deactivate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to deactivate intent token link: ${response.statusText}`);
    }

    logger.info('[IntentTokenLink] Successfully deactivated link');
  } catch (error) {
    logger.error('[IntentTokenLink] Failed to deactivate:', error);
    throw error;
  }
}

/**
 * Activate an intent token link
 * @param linkId The ID of the link to activate
 */
export async function activateIntentTokenLink(linkId: string): Promise<void> {
  const config = getConfig();
  const apiUrl = config?.apiUrl || 'https://api.getpassage.ai';

  try {
    logger.info('[IntentTokenLink] Activating intent token link:', linkId);

    const response = await fetch(`${apiUrl}/intent-token-links/${linkId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to activate intent token link: ${response.statusText}`);
    }

    logger.info('[IntentTokenLink] Successfully activated link');
  } catch (error) {
    logger.error('[IntentTokenLink] Failed to activate:', error);
    throw error;
  }
}

/**
 * Delete an intent token link
 * @param linkId The ID of the link to delete
 */
export async function deleteIntentTokenLink(linkId: string): Promise<void> {
  const config = getConfig();
  const apiUrl = config?.apiUrl || 'https://api.getpassage.ai';

  try {
    logger.info('[IntentTokenLink] Deleting intent token link:', linkId);

    const response = await fetch(`${apiUrl}/intent-token-links/${linkId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete intent token link: ${response.statusText}`);
    }

    logger.info('[IntentTokenLink] Successfully deleted link');
  } catch (error) {
    logger.error('[IntentTokenLink] Failed to delete:', error);
    throw error;
  }
}

/**
 * Get connections for an intent token link
 * @param shortCode The shortcode of the link
 * @returns Connection data
 */
export async function getIntentTokenLinkConnections(shortCode: string): Promise<any> {
  const config = getConfig();
  const apiUrl = config?.apiUrl || 'https://api.getpassage.ai';

  try {
    logger.info('[IntentTokenLink] Fetching connections for shortcode:', shortCode);

    const response = await fetch(`${apiUrl}/intent-token-links/${shortCode}/connections`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch connections: ${response.statusText}`);
    }

    const data = await response.json();

    logger.info('[IntentTokenLink] Successfully fetched connections');

    return data;
  } catch (error) {
    logger.error('[IntentTokenLink] Failed to fetch connections:', error);
    throw error;
  }
}

/**
 * Enhance an intent token link with computed URLs and resource info
 * @param link The link to enhance
 * @returns Enhanced link with computed fields
 */
function enhanceIntentTokenLink(link: IntentTokenLink): IntentTokenLink {
  const resourceNames = Object.keys(link.requestPayload.resources);
  const operationNames = Object.values(link.requestPayload.resources).flatMap(
    (resource) => Object.keys(resource)
  );

  return {
    ...link,
    url: `https://clip.trypassage.ai/?shortCode=${link.shortCode}`,
    openUrl: `https://ui.getpassage.ai/connect?shortToken=${link.shortCode}&userAgent=passage-web-react&modal=true`,
    resultUrl: `https://demo.getpassage.ai`,
    resourceNames: resourceNames.join(', '),
    operationNames: operationNames.join(', ')
  };
}

/**
 * Create a simple gift card intent token link
 * Convenience function for common use case
 */
export async function createGiftCardLink(
  integrationId: string,
  amount: number,
  returnUrl?: string,
  expiresIn: number = 86400000, // 24 hours default
  publishableKey?: string
): Promise<CreateIntentTokenLinkResponse> {
  const expiresAt = new Date(Date.now() + expiresIn).toISOString();

  return createIntentTokenLink({
    integrationId,
    requestPayload: {
      resources: {
        balance: {
          write: { amount }
        }
      },
      returnUrl
    },
    notes: `Gift card for $${amount}`,
    expiresAt,
    metadata: {
      tags: ['gift-card', 'auto-generated']
    },
    maxSuccessfulConnections: 1 // Gift cards are typically one-time use
  }, publishableKey);
}

/**
 * Create a card switch intent token link
 * Convenience function for payment method updates
 */
export async function createCardSwitchLink(
  integrationId: string,
  returnUrl?: string,
  expiresIn: number = 86400000, // 24 hours default
  publishableKey?: string
): Promise<CreateIntentTokenLinkResponse> {
  const expiresAt = new Date(Date.now() + expiresIn).toISOString();

  return createIntentTokenLink({
    integrationId,
    requestPayload: {
      resources: {
        payment_method: {
          write: {}
        }
      },
      returnUrl
    },
    notes: 'Card switch operation',
    expiresAt,
    metadata: {
      tags: ['card-switch', 'payment-update']
    }
  }, publishableKey);
}

/**
 * Create a read-only connection link
 * For viewing account information without modifications
 */
export async function createReadOnlyLink(
  integrationId: string,
  resources: string[],
  returnUrl?: string,
  expiresIn: number = 86400000, // 24 hours default
  publishableKey?: string
): Promise<CreateIntentTokenLinkResponse> {
  const expiresAt = new Date(Date.now() + expiresIn).toISOString();

  // Build resources object with read permissions
  const resourcesObj: Record<string, Record<string, unknown>> = {};
  resources.forEach(resource => {
    resourcesObj[resource] = { read: {} };
  });

  return createIntentTokenLink({
    integrationId,
    requestPayload: {
      resources: resourcesObj,
      returnUrl
    },
    notes: 'Read-only connection',
    expiresAt,
    metadata: {
      tags: ['read-only', 'view-access']
    }
  }, publishableKey);
}