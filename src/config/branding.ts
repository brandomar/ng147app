/**
 * Whitelabel Brand Configuration System
 * 
 * Centralized configuration for all brand-specific elements.
 * Supports environment variables and runtime configuration.
 */

import { getDefaultBrandConfig } from '../lib/brandDefaults';

export interface BrandConfig {
  // Application Information
  applicationName: string;
  companyName: string;
  supportEmail: string;

  // Brand Text Configuration
  copyrightText?: string;

  // Visual Branding
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;

  // Assets (URLs for external assets)
  logoUrl?: string;

  // File Storage (Supabase storage paths)
  logoFilePath?: string;

  // Dashboard Configuration
  defaultSheets: string[];
  metricCategories: string[];
  defaultTimeFrame: string;

  // Feature Flags
  features: {
    enableUserManagement: boolean;
    enableClientManagement: boolean;
    enableAnalytics: boolean;
    enableExport: boolean;
    enableNotifications: boolean;
  };

  // Role Configuration
  roles: {
    admin: string;
    staff: string;
    client: string;
  };

  // Section Names
  sections: {
    admin: string;
    client: string;
  };

  // Function Names (for database functions)
  functions: {
    syncGoogleSheets: string;
    getSyncStatus: string;
    updateSyncStatus: string;
    getMetricConfigurations: string;
  };

  // UI Text
  ui: {
    loginTitle: string;
    welcomeMessage: string;
  };
}

/**
 * Default brand configuration - now using shared utility
 */
const DEFAULT_BRAND_CONFIG: BrandConfig = getDefaultBrandConfig();

/**
 * Load brand configuration from environment variables
 */
function loadBrandConfigFromEnv(): Partial<BrandConfig> {
  const config: Partial<BrandConfig> = {};
  
  // Company Information
  try {
    if (import.meta.env.VITE_COMPANY_NAME) {
      config.companyName = import.meta.env.VITE_COMPANY_NAME;
    }
    if (import.meta.env.VITE_COMPANY_SLUG) {
      config.companySlug = import.meta.env.VITE_COMPANY_SLUG;
    }
    if (import.meta.env.VITE_COMPANY_DESCRIPTION) {
      config.companyDescription = import.meta.env.VITE_COMPANY_DESCRIPTION;
    }
    if (import.meta.env.VITE_SUPPORT_EMAIL) {
      config.supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;
    }
  } catch {
    // Ignore import.meta errors in non-module contexts
  }
  
  // Visual Branding
  try {
    if (import.meta.env.VITE_PRIMARY_COLOR) {
      config.primaryColor = import.meta.env.VITE_PRIMARY_COLOR;
    }
    if (import.meta.env.VITE_SECONDARY_COLOR) {
      config.secondaryColor = import.meta.env.VITE_SECONDARY_COLOR;
    }
    if (import.meta.env.VITE_ACCENT_COLOR) {
      config.accentColor = import.meta.env.VITE_ACCENT_COLOR;
    }
    if (import.meta.env.VITE_BACKGROUND_COLOR) {
      config.backgroundColor = import.meta.env.VITE_BACKGROUND_COLOR;
    }
    if (import.meta.env.VITE_TEXT_COLOR) {
      config.textColor = import.meta.env.VITE_TEXT_COLOR;
    }
  } catch {
    // Ignore import.meta errors in non-module contexts
  }
  
  // Assets
  try {
    if (import.meta.env.VITE_LOGO_URL) {
      config.logoUrl = import.meta.env.VITE_LOGO_URL;
    }
    if (import.meta.env.VITE_BACKGROUND_IMAGE) {
      config.backgroundImage = import.meta.env.VITE_BACKGROUND_IMAGE;
    }
  } catch {
    // Ignore import.meta errors in non-module contexts
  }
  
  // Dashboard Configuration
  try {
    if (import.meta.env.VITE_DEFAULT_SHEETS) {
      config.defaultSheets = import.meta.env.VITE_DEFAULT_SHEETS.split(',');
    }
    if (import.meta.env.VITE_METRIC_CATEGORIES) {
      config.metricCategories = import.meta.env.VITE_METRIC_CATEGORIES.split(',');
    }
    if (import.meta.env.VITE_DEFAULT_TIME_FRAME) {
      config.defaultTimeFrame = import.meta.env.VITE_DEFAULT_TIME_FRAME;
    }
  } catch {
    // Ignore import.meta errors in non-module contexts
  }
  
  // Feature Flags
  try {
    if (import.meta.env.VITE_FEATURES) {
      const features = import.meta.env.VITE_FEATURES.split(',');
      config.features = {
        enableUserManagement: features.includes('user-management'),
        enableClientManagement: features.includes('client-management'),
        enableAnalytics: features.includes('analytics'),
        enableExport: features.includes('export'),
        enableNotifications: features.includes('notifications'),
      };
    }
  } catch {
    // Ignore import.meta errors in non-module contexts
  }
  
  // Role Configuration
  try {
    if (import.meta.env.VITE_ADMIN_ROLE) {
      config.roles = {
        ...config.roles,
        admin: import.meta.env.VITE_ADMIN_ROLE,
      };
    }
    if (import.meta.env.VITE_STAFF_ROLE) {
      config.roles = {
        ...config.roles,
        staff: import.meta.env.VITE_STAFF_ROLE,
      };
    }
    if (import.meta.env.VITE_CLIENT_ROLE) {
      config.roles = {
        ...config.roles,
        client: import.meta.env.VITE_CLIENT_ROLE,
      };
    }
  } catch {
    // Ignore import.meta errors in non-module contexts
  }
  
  // Section Names
  try {
    if (import.meta.env.VITE_ADMIN_SECTION) {
      config.sections = {
        ...config.sections,
        admin: import.meta.env.VITE_ADMIN_SECTION,
      };
    }
    if (import.meta.env.VITE_CLIENT_SECTION) {
      config.sections = {
        ...config.sections,
        client: import.meta.env.VITE_CLIENT_SECTION,
      };
    }
  } catch {
    // Ignore import.meta errors in non-module contexts
  }
  
  // Function Names
  try {
    if (import.meta.env.VITE_SYNC_FUNCTION) {
      config.functions = {
        ...config.functions,
        syncGoogleSheets: import.meta.env.VITE_SYNC_FUNCTION,
      };
    }
    if (import.meta.env.VITE_SYNC_STATUS_FUNCTION) {
      config.functions = {
        ...config.functions,
        getSyncStatus: import.meta.env.VITE_SYNC_STATUS_FUNCTION,
      };
    }
    if (import.meta.env.VITE_UPDATE_SYNC_FUNCTION) {
      config.functions = {
        ...config.functions,
        updateSyncStatus: import.meta.env.VITE_UPDATE_SYNC_FUNCTION,
      };
    }
    if (import.meta.env.VITE_METRIC_CONFIG_FUNCTION) {
      config.functions = {
        ...config.functions,
        getMetricConfigurations: import.meta.env.VITE_METRIC_CONFIG_FUNCTION,
      };
    }
  } catch {
    // Ignore import.meta errors in non-module contexts
  }
  
  // UI Text
  try {
    if (import.meta.env.VITE_LOGIN_TITLE) {
      config.ui = {
        ...config.ui,
        loginTitle: import.meta.env.VITE_LOGIN_TITLE,
      };
    }
    if (import.meta.env.VITE_WELCOME_MESSAGE) {
      config.ui = {
        ...config.ui,
        welcomeMessage: import.meta.env.VITE_WELCOME_MESSAGE,
      };
    }
  } catch {
    // Ignore import.meta errors in non-module contexts
  }
  
  return config;
}

/**
 * Merge environment configuration with defaults
 */
function createBrandConfig(): BrandConfig {
  const envConfig = loadBrandConfigFromEnv();
  return { ...DEFAULT_BRAND_CONFIG, ...envConfig };
}

/**
 * Global brand configuration instance
 * Lazy initialization to avoid import.meta issues
 */
let _brandConfig: BrandConfig | null = null;

export const BRAND_CONFIG = (() => {
  if (!_brandConfig) {
    _brandConfig = createBrandConfig();
  }
  return _brandConfig;
})();

/**
 * Hook for accessing brand configuration in components
 */
export const useBrandConfig = () => BRAND_CONFIG;

/**
 * Utility functions for brand configuration
 */
export const BrandUtils = {
  /**
   * Get CSS custom properties for dynamic theming
   */
  getCSSVariables: (config: BrandConfig) => ({
    '--brand-primary': config.primaryColor,
    '--brand-secondary': config.secondaryColor,
    '--brand-accent': config.accentColor,
    '--brand-background': config.backgroundColor,
    '--brand-text': config.textColor,
  }),
  
  /**
   * Generate Tailwind color configuration
   */
  getTailwindColors: (config: BrandConfig) => ({
    primary: config.primaryColor,
    secondary: config.secondaryColor,
    accent: config.accentColor,
    background: config.backgroundColor,
    text: config.textColor,
  }),
  
  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled: (feature: keyof BrandConfig['features']) => {
    return BRAND_CONFIG.features[feature];
  },
  
  /**
   * Get role display name
   */
  getRoleDisplayName: (role: string) => {
    const roleMap = {
      [BRAND_CONFIG.roles.admin]: 'Admin',
      [BRAND_CONFIG.roles.staff]: 'Staff',
      [BRAND_CONFIG.roles.client]: 'Client',
    };
    return roleMap[role] || role;
  },
  
  /**
   * Get company-specific text
   */
  getCompanyText: (key: keyof BrandConfig['ui']) => {
    return BRAND_CONFIG.ui[key];
  },
};
