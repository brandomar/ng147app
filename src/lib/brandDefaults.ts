/**
 * Shared brand configuration defaults
 * 
 * This file contains the default brand configuration to ensure consistency
 * across all parts of the application that need brand defaults.
 */

import { BrandConfig } from '../config/branding';

/**
 * Default brand configuration
 * Used as fallback when database configuration is not available
 */
export function getDefaultBrandConfig(): BrandConfig {
  return {
    applicationName: "Dashboard",
    companyName: "Dashboard",
    supportEmail: "support@dashboard.com",
    copyrightText: "© 2024 Dashboard. All rights reserved.",

    primaryColor: "#7B61FF",
    secondaryColor: "#00FFB2",
    accentColor: "#F3C969",
    textColor: "#FFFFFF",

    logoUrl: "/logo.svg",

    defaultSheets: ["Sheet1", "Sheet2", "Sheet3"],
    metricCategories: [
      "ads",
      "growth",
      "performance",
      "cold-email",
      "spam-outreach",
    ],
    defaultTimeFrame: "30d",

    features: {
      enableUserManagement: true,
      enableClientManagement: true,
      enableAnalytics: true,
      enableExport: false,
      enableNotifications: true,
    },

    roles: {
      admin: "admin",
      staff: "staff",
      client: "client",
    },

    sections: {
      admin: "admin",
      client: "client",
    },

    functions: {
      syncGoogleSheets: "syncGoogleSheetsStaff",
      getSyncStatus: "getStaffSyncStatus",
      updateSyncStatus: "updateStaffSyncStatus",
      getMetricConfigurations: "getStaffMetricConfigurations",
    },

    ui: {
      loginTitle: "Welcome to Dashboard",
      welcomeMessage: "Welcome to your dashboard",
    },
  };
}
