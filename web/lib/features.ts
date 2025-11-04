/**
 * Feature flags for open source / self-hosted mode
 *
 * This module provides feature flags to enable/disable functionality
 * based on deployment type (self-hosted vs hosted/SaaS)
 */

/**
 * Check if payments are enabled
 * Returns false for self-hosted deployments
 */
export function isPaymentsEnabled(): boolean {
  // If self-hosted mode is enabled, payments are always disabled
  if (process.env.NEXT_PUBLIC_SELF_HOSTED === 'true') {
    return false;
  }

  // Check explicit payments flag
  if (process.env.ENABLE_PAYMENTS === 'false') {
    return false;
  }

  // Default: payments enabled for hosted instances
  return true;
}

/**
 * Check if this is a self-hosted deployment
 */
export function isSelfHosted(): boolean {
  return process.env.NEXT_PUBLIC_SELF_HOSTED === 'true';
}

/**
 * Check if analytics are enabled
 * Can be disabled for privacy-focused self-hosted deployments
 */
export function isAnalyticsEnabled(): boolean {
  // Disable in self-hosted by default
  if (isSelfHosted()) {
    return process.env.ENABLE_ANALYTICS === 'true'; // Opt-in for self-hosted
  }

  // Enabled by default for hosted instances
  return process.env.ENABLE_ANALYTICS !== 'false';
}

/**
 * Get deployment mode for logging/debugging
 */
export function getDeploymentMode(): 'self-hosted' | 'hosted' {
  return isSelfHosted() ? 'self-hosted' : 'hosted';
}
