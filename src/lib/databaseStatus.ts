/**
 * Database Status Checker
 * 
 * This utility checks if the database is properly configured and has data.
 * It helps identify when the app is using defaults vs actual database data.
 */

import { supabase } from './supabase';
import { logger } from './logger';

export interface DatabaseStatus {
  isConfigured: boolean;
  hasUsers: boolean;
  hasClients: boolean;
  hasBrandSettings: boolean;
  hasMetrics: boolean;
  hasUserProfiles: boolean;
  issues: string[];
  setupGuidance: {
    brandSettings: boolean;
    clients: boolean;
    users: boolean;
    data: boolean;
  };
}

/**
 * Check the overall database configuration status
 */
export const checkDatabaseStatus = async (userId?: string): Promise<DatabaseStatus> => {
  const issues: string[] = [];
  let hasUsers = false;
  let hasClients = false;
  let hasBrandSettings = false;
  let hasMetrics = false;
  let hasUserProfiles = false;
  
  const setupGuidance = {
    brandSettings: false,
    clients: false,
    users: false,
    data: false,
  };

  try {
    // Check if user exists in auth.users (this is handled by Supabase auth)
    if (userId) {
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser.user) {
        hasUsers = true;
      } else {
        issues.push('No authenticated user found');
      }
    }

    // Check if user profile exists in public.users
    if (userId) {
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        issues.push(`Error checking user profile: ${userError.message}`);
      } else if (userProfile) {
        hasUserProfiles = true;
      } else {
        issues.push('User profile not found in public.profiles table');
      }
    }

    // Check if clients exist
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id')
      .limit(1);

    if (clientsError) {
      issues.push(`Error checking clients: ${clientsError.message}`);
    } else if (clients && clients.length > 0) {
      hasClients = true;
    } else {
      issues.push('No clients found in database');
    }

    // Check if brand settings exist
    const { data: brandSettings, error: brandError } = await supabase
      .from('brand_settings')
      .select('id')
      .limit(1);

    if (brandError && brandError.code !== 'PGRST116') {
      issues.push(`Error checking brand settings: ${brandError.message}`);
    } else if (brandSettings && brandSettings.length > 0) {
      hasBrandSettings = true;
    } else {
      issues.push('No brand settings found in database');
    }

    // Check if metrics exist
    const { data: metrics, error: metricsError } = await supabase
      .from('metrics')
      .select('id')
      .limit(1);

    if (metricsError) {
      issues.push(`Error checking metrics: ${metricsError.message}`);
    } else if (metrics && metrics.length > 0) {
      hasMetrics = true;
    } else {
      issues.push('No metrics found in database');
    }

    const isConfigured = hasUsers && hasUserProfiles && hasClients && hasBrandSettings && hasMetrics;

    logger.debug('🔍 Database status check:', {
      isConfigured,
      hasUsers,
      hasUserProfiles,
      hasClients,
      hasBrandSettings,
      hasMetrics,
      issuesCount: issues.length
    });

    // Set up guidance flags
    setupGuidance.brandSettings = !hasBrandSettings;
    setupGuidance.clients = !hasClients;
    setupGuidance.users = !hasUserProfiles;
    setupGuidance.data = !hasMetrics;

    return {
      isConfigured,
      hasUsers,
      hasClients,
      hasBrandSettings,
      hasMetrics,
      hasUserProfiles,
      issues,
      setupGuidance
    };

  } catch (error) {
    logger.error('❌ Error checking database status:', error);
    return {
      isConfigured: false,
      hasUsers: false,
      hasClients: false,
      hasBrandSettings: false,
      hasMetrics: false,
      hasUserProfiles: false,
      issues: [`Database status check failed: ${error}`],
      setupGuidance: {
        brandSettings: true,
        clients: true,
        users: true,
        data: true,
      }
    };
  }
};

/**
 * Create a user profile in public.profiles table
 */
export const createUserProfile = async (userId: string, email: string) => {
  try {
    logger.debug('👤 Creating user profile with client role only:', { userId, email });
    logger.warn('🚨 SECURITY: Frontend can only create client roles - admin roles must be assigned manually');

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        email: email,
        first_name: null,
        last_name: null,
        avatar_url: null,
        preferences: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error('❌ Error creating user profile:', error);
      return { success: false, error };
    }

    logger.debug('✅ User profile created successfully:', data);
    return { success: true, data };

  } catch (error) {
    logger.error('❌ Exception creating user profile:', error);
    return { success: false, error };
  }
};

/**
 * Show database configuration status to user
 */
export const showDatabaseStatus = (status: DatabaseStatus) => {
  if (status.isConfigured) {
    logger.info('✅ Database is properly configured');
    return;
  }

  logger.warn('⚠️ Database configuration issues detected:');
  status.issues.forEach(issue => {
    logger.warn(`  - ${issue}`);
  });

  if (!status.hasUserProfiles) {
    logger.info('💡 To fix user issues: Create a user profile in public.profiles table');
  }
  if (!status.hasClients) {
    logger.info('💡 To fix client issues: Add clients to the database');
  }
  if (!status.hasBrandSettings) {
    logger.info('💡 To fix branding issues: Configure brand settings in the database');
  }
  if (!status.hasMetrics) {
    logger.info('💡 To fix metrics issues: Add metric data to the database');
  }
};
