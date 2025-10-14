/**
 * Simplified Brand Database Service Functions
 * 
 * Handles database operations for white-label brand configuration.
 * Focuses only on visual branding and UI text.
 */

import { supabase } from './supabase';
import { logger } from './logger';
import { BrandConfig } from '../config/branding';
import { isGlobalAdmin, assignUserRole, getAllRoles } from './database/permissions';
import { getDefaultBrandConfig } from "./brandDefaults";

export interface BrandSettingsRecord {
  id: string;
  company_name: string;
  support_email: string;
  application_name: string;
  copyright_text?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color: string;
  logo_file_path?: string;
  login_title: string;
  welcome_message: string;
  updated_at?: string;
  updated_by?: string;
}

/**
 * Get brand settings from database
 */
export const getBrandSettings = async (): Promise<{ data: BrandConfig | null; error: any }> => {
  try {
    logger.debug('🎨 Loading brand settings from database');
    
    // First, ensure the current user has admin role for brand settings access
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (user) {
      // Check if user is global admin, if not, assign admin role
      const isAdmin = await isGlobalAdmin(user.id);
      
      if (!isAdmin) {
        logger.debug('🎨 Assigning admin role to user for brand settings access');
        const { data: roles } = await getAllRoles();
        const adminRole = roles?.find(role => role.name === 'admin');
        
        if (adminRole) {
          await assignUserRole(user.id, adminRole.id, undefined, true); // Global admin
        }
      }
    }
    
    const { data, error } = await supabase
      .from('brand_settings')
      .select('*')
      .single();

    if (error) {
      // Handle specific error codes gracefully
      if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
        logger.debug('🎨 No brand settings found in database, using defaults');
        return { data: null, error: null };
      } else {
        logger.warn('⚠️ No brand settings found in database:', error);
        return { data: null, error };
      }
    }

    if (!data) {
      logger.warn('⚠️ No brand settings found in database');
      return { data: null, error: null };
    }

    // Convert database format to BrandConfig format
    const brandConfig: BrandConfig = {
      companyName: data.company_name || "Dashboard",
      supportEmail: data.support_email || "support@dashboard.com",
      applicationName: data.application_name || "Dashboard",
      copyrightText: data.copyright_text,
      primaryColor: data.primary_color,
      secondaryColor: data.secondary_color,
      accentColor: data.accent_color,
      textColor: data.text_color,
      logoFilePath: data.logo_file_path,

      // Add missing properties that are required for the interface
      logoUrl: data.logo_file_path || "/logo.svg",
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
        syncGoogleSheets: "syncGoogleSheetsAdmin",
        getSyncStatus: "getAdminSyncStatus",
        updateSyncStatus: "updateAdminSyncStatus",
        getMetricConfigurations: "getAdminMetricConfigurations",
      },

      ui: {
        loginTitle: data.login_title || "Welcome to Dashboard",
        welcomeMessage: data.welcome_message || "Welcome to your dashboard",
      },
    };

    logger.debug('🎨 Brand settings loaded from database:', brandConfig);
    return { data: brandConfig, error: null };

  } catch (error) {
    logger.error('❌ Error in getBrandSettings:', error);
    return { data: null, error };
  }
};

/**
 * Update brand settings in database
 */
export const updateBrandSettings = async (updates: Partial<BrandConfig>): Promise<{ data: BrandConfig | null; error: any }> => {
  try {
    logger.debug('🎨 Updating brand settings in database:', updates);
    
    // Check current user and permissions
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    logger.debug('🎨 Current user:', { userId: user?.id, email: user?.email });
    
    if (!user) {
      logger.error('❌ No authenticated user found');
      return { data: null, error: new Error('No authenticated user') };
    }
    
    // Ensure user has admin role for brand settings access
    const isAdmin = await isGlobalAdmin(user.id);
    logger.debug('🎨 User is global admin:', isAdmin);
    
    if (!isAdmin) {
      logger.debug('🎨 Assigning admin role to user for brand settings access');
      const { data: roles } = await getAllRoles();
      const adminRole = roles?.find(role => role.name === 'admin');
      
      if (adminRole) {
        await assignUserRole(user.id, adminRole.id, undefined, true); // Global admin
      }
    }

    // Convert BrandConfig format to database format
    const dbUpdates: Partial<BrandSettingsRecord> = {};
    
    if (updates.companyName !== undefined)
      dbUpdates.company_name = updates.companyName;
    if (updates.supportEmail !== undefined)
      dbUpdates.support_email = updates.supportEmail;
    if (updates.applicationName !== undefined)
      dbUpdates.application_name = updates.applicationName;
    if (updates.copyrightText !== undefined)
      dbUpdates.copyright_text = updates.copyrightText;
    if (updates.primaryColor !== undefined)
      dbUpdates.primary_color = updates.primaryColor;
    if (updates.secondaryColor !== undefined)
      dbUpdates.secondary_color = updates.secondaryColor;
    if (updates.accentColor !== undefined)
      dbUpdates.accent_color = updates.accentColor;
    if (updates.textColor !== undefined)
      dbUpdates.text_color = updates.textColor;
    if (updates.logoFilePath !== undefined)
      dbUpdates.logo_file_path = updates.logoFilePath;

    // Handle UI fields from the ui object
    if (updates.ui !== undefined) {
      if (updates.ui.loginTitle !== undefined)
        dbUpdates.login_title = updates.ui.loginTitle;
      if (updates.ui.welcomeMessage !== undefined)
        dbUpdates.welcome_message = updates.ui.welcomeMessage;
    }

    // First, try to get the existing record to get its ID
    logger.debug("🎨 Checking for existing brand settings record...");
    const { data: existingData, error: existingError } = await supabase
      .from("brand_settings")
      .select("id")
      .single();

    logger.debug("🎨 Existing brand settings query result:", {
      existingData,
      existingError,
    });

    let result;
    if (existingData) {
      // Update existing record
      logger.debug("🎨 Updating existing brand settings record:", {
        id: existingData.id,
        updates: dbUpdates,
      });
      result = await supabase
        .from("brand_settings")
        .update(dbUpdates)
        .eq("id", existingData.id)
        .select("*")
        .single();
    } else {
      // Insert new record
      logger.debug("🎨 Inserting new brand settings record:", dbUpdates);
      result = await supabase
        .from("brand_settings")
        .insert([dbUpdates])
        .select("*")
        .single();
    }

    logger.debug("🎨 Database operation result:", {
      data: result.data,
      error: result.error,
    });

    if (result.error) {
      logger.error("❌ Error updating brand settings:", result.error);
      return { data: null, error: result.error };
    }

    // Verify the data was actually saved by querying it back
    logger.debug("🎨 Verifying data was saved by querying it back...");
    const { data: verifyData, error: verifyError } = await supabase
      .from("brand_settings")
      .select("*")
      .single();

    logger.debug("🎨 Verification query result:", { verifyData, verifyError });

    if (verifyError) {
      logger.error("❌ Failed to verify saved data:", verifyError);
    } else if (!verifyData) {
      logger.error(
        "❌ No data found after save operation - this indicates a serious issue"
      );
    } else {
      logger.info(
        "✅ Data verification successful - brand settings are in database"
      );
    }

    // Convert back to BrandConfig format
    const brandConfig: BrandConfig = {
      companyName: result.data.company_name || "Dashboard",
      supportEmail: result.data.support_email || "support@dashboard.com",
      applicationName: result.data.application_name || "Dashboard",
      copyrightText: result.data.copyright_text,
      primaryColor: result.data.primary_color,
      secondaryColor: result.data.secondary_color,
      accentColor: result.data.accent_color,
      textColor: result.data.text_color,
      logoFilePath: result.data.logo_file_path,

      // Add missing properties that are required for the interface
      logoUrl: result.data.logo_file_path || "/logo.svg",
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
        syncGoogleSheets: "syncGoogleSheetsAdmin",
        getSyncStatus: "getAdminSyncStatus",
        updateSyncStatus: "updateAdminSyncStatus",
        getMetricConfigurations: "getAdminMetricConfigurations",
      },

      ui: {
        loginTitle: result.data.login_title || "Welcome to Dashboard",
        welcomeMessage:
          result.data.welcome_message || "Welcome to your dashboard",
      },
    };

    logger.debug('🎨 Brand settings updated successfully:', brandConfig);
    return { data: brandConfig, error: null };

  } catch (error) {
    logger.error('❌ Error updating brand settings:', error);
    return { data: null, error };
  }
};

/**
 * Reset brand settings to default values
 */
export const resetBrandSettings = async (): Promise<{ data: BrandConfig | null; error: any }> => {
  try {
    logger.debug("🎨 Resetting brand settings to default");

    // Ensure user has admin role for brand settings access
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (user) {
      const isAdmin = await isGlobalAdmin(user.id);

      if (!isAdmin) {
        logger.debug(
          "🎨 Assigning admin role to user for brand settings access"
        );
        const { data: roles } = await getAllRoles();
        const adminRole = roles?.find((role) => role.name === "admin");

        if (adminRole) {
          await assignUserRole(user.id, adminRole.id, undefined, true); // Global admin
        }
      }
    }

    // Use code-based defaults from brandDefaults.ts
    const defaultConfig = getDefaultBrandConfig();

    const defaultSettings = {
      company_name: defaultConfig.companyName,
      support_email: defaultConfig.supportEmail,
      application_name: defaultConfig.applicationName,
      primary_color: defaultConfig.primaryColor,
      secondary_color: defaultConfig.secondaryColor,
      accent_color: defaultConfig.accentColor,
      text_color: defaultConfig.textColor,
      copyright_text:
        defaultConfig.copyrightText || "© 2024 Dashboard. All rights reserved.",
      login_title: defaultConfig.ui.loginTitle,
      welcome_message: defaultConfig.ui.welcomeMessage,
    };

    // First, try to get the existing record to get its ID
    const { data: existingData } = await supabase
      .from("brand_settings")
      .select("id")
      .single();

    let result;
    if (existingData) {
      // Update existing record
      result = await supabase
        .from("brand_settings")
        .update(defaultSettings)
        .eq("id", existingData.id)
        .select("*")
        .single();
    } else {
      // Insert new record
      result = await supabase
        .from("brand_settings")
        .insert([defaultSettings])
        .select("*")
        .single();
    }

    if (result.error) {
      logger.error("❌ Error resetting brand settings:", result.error);
      return { data: null, error: result.error };
    }

    // Convert back to BrandConfig format
    const brandConfig: BrandConfig = {
      companyName: result.data.company_name || "Dashboard",
      companyDescription:
        result.data.company_description || "Multi-tenant dashboard platform",
      supportEmail: result.data.support_email || "support@dashboard.com",
      applicationName: result.data.application_name || "Dashboard",
      copyrightText: result.data.copyright_text,
      primaryColor: result.data.primary_color,
      secondaryColor: result.data.secondary_color,
      accentColor: result.data.accent_color,
      backgroundColor: result.data.background_color,
      textColor: result.data.text_color,
      logoFilePath: result.data.logo_file_path,
      backgroundImageFilePath: result.data.background_image_file_path,

      // Add missing properties that are required for the interface
      logoUrl: result.data.logo_file_path || "/logo.svg",
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
        syncGoogleSheets: "syncGoogleSheetsAdmin",
        getSyncStatus: "getAdminSyncStatus",
        updateSyncStatus: "updateAdminSyncStatus",
        getMetricConfigurations: "getAdminMetricConfigurations",
      },

      ui: {
        loginTitle: result.data.login_title || "Welcome to Dashboard",
        welcomeMessage:
          result.data.welcome_message || "Welcome to your dashboard",
      },
    };

    logger.debug("🎨 Brand settings reset successfully:", brandConfig);
    return { data: brandConfig, error: null };
  } catch (error) {
    logger.error('❌ Error resetting brand settings:', error);
    return { data: null, error };
  }
};
