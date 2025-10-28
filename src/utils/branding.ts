/**
 * Branding utilities for applying dynamic theming to App Clip components
 * Uses CSS custom properties for dynamic color application
 */

import { BrandingConfig } from '../types';
import { logger } from '../logger';

/**
 * Apply branding configuration by setting CSS custom properties on document root
 * @param branding The branding configuration to apply
 */
export function applyBranding(branding: BrandingConfig | null): void {
  const root = document.documentElement;

  // Set default light theme colors first
  root.style.setProperty('--color-background', '#ffffff');
  root.style.setProperty('--color-card-background', '#f5f5f5');
  root.style.setProperty('--color-text', '#000000');
  root.style.setProperty('--color-text-secondary', 'rgba(0, 0, 0, 0.6)');
  root.style.setProperty('--color-primary', '#2563eb');

  logger.debug('[Branding] Set default light theme');

  // If branding is provided, override with custom colors
  if (branding) {
    if (branding.colorPrimary) {
      root.style.setProperty('--color-primary', branding.colorPrimary);
      logger.debug('[Branding] Applied primary color:', branding.colorPrimary);
    }

    if (branding.colorBackground) {
      root.style.setProperty('--color-background', branding.colorBackground);
      logger.debug('[Branding] Applied background color:', branding.colorBackground);
    }

    if (branding.colorCardBackground) {
      root.style.setProperty('--color-card-background', branding.colorCardBackground);
      logger.debug('[Branding] Applied card background color:', branding.colorCardBackground);
    }

    if (branding.colorText) {
      root.style.setProperty('--color-text', branding.colorText);
      logger.debug('[Branding] Applied text color:', branding.colorText);
    }

    if (branding.colorTextSecondary) {
      root.style.setProperty('--color-text-secondary', branding.colorTextSecondary);
      logger.debug('[Branding] Applied secondary text color:', branding.colorTextSecondary);
    }

    logger.info('[Branding] Applied branding for:', branding.integrationName);
  } else {
    logger.warn('[Branding] No branding provided, using default theme');
  }
}

/**
 * Reset branding to default values
 * Call this when the App Clip modal closes
 */
export function resetBranding(): void {
  const root = document.documentElement;

  // Reset to default dark theme (original App Clip theme)
  root.style.setProperty('--color-background', '#000000');
  root.style.setProperty('--color-card-background', 'rgba(15, 16, 20, 0.1)');
  root.style.setProperty('--color-text', '#ffffff');
  root.style.setProperty('--color-text-secondary', 'rgba(255, 255, 255, 0.7)');
  root.style.setProperty('--color-primary', '#2563eb');

  logger.debug('[Branding] Reset to default dark theme');
}
