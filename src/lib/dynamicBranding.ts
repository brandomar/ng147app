import { BrandConfig } from '../config/branding';
import { getDefaultBrandConfig } from './brandDefaults';

/**
 * Dynamic branding utilities that work with the BrandContext
 * This replaces the static BRAND_CONFIG for runtime updates
 */

export const getDynamicBrandConfig = (): BrandConfig => {
  // Try to get from localStorage first (for SSR compatibility)
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('brand-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure we always have a complete config by merging with defaults
        const mergedConfig = { ...getDefaultBrandConfig(), ...parsed };
        // Validate that required fields exist
        if (mergedConfig.roles && mergedConfig.companyName) {
          return mergedConfig;
        }
      }
    } catch (error) {
      // Silently fail and use default config
    }
  }
  
  return getDefaultBrandConfig();
};

export const getClientTypeOptions = (brandConfig?: BrandConfig) => {
  const config = brandConfig || getDynamicBrandConfig();

  // Add safety checks - return default options if config is incomplete
  if (!config || !config.roles || !config.companyName) {
    return [
      { value: "client", label: "External Client" },
      { value: "primary", label: "Primary Dashboard" },
    ];
  }

  return [
    { value: "client", label: "External Client" },
    { value: "primary", label: `${config.companyName} Company` },
  ];
};

export const getAdminCompanyName = (brandConfig?: BrandConfig): string => {
  const config = brandConfig || getDynamicBrandConfig();
  return config?.companyName || "Dashboard";
};

export const getAdminCompanySlug = (brandConfig?: BrandConfig): string => {
  const config = brandConfig || getDynamicBrandConfig();
  return (config?.companyName || "Dashboard")
    .toLowerCase()
    .replace(/\s+/g, "-");
};

export const getSheetTypeForClientType = (
  clientType: string,
  brandConfig?: BrandConfig
) => {
  const config = brandConfig || getDynamicBrandConfig();
  if (clientType === "primary") {
    return "admin-dashboard";
  }
  return "client-dashboard";
};

export const getAdminDashboardTitle = (brandConfig?: BrandConfig): string => {
  const config = brandConfig || getDynamicBrandConfig();
  return config?.applicationName || "Dashboard";
};

export const getCompanyName = (brandConfig?: BrandConfig): string => {
  const config = brandConfig || getDynamicBrandConfig();
  return config?.companyName || 'Dashboard';
};

