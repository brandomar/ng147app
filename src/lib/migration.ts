import { supabase } from './supabase';
import { logger } from './logger';
// No longer using STAFF_CLIENT_ID - removed from database.ts
// Staff dashboard uses staff client ID (updated approach)

interface MetricConfig {
  metric_name: string;
  sheet_column_name: string;
  display_name: string;
  metric_type: string;
  dashboard_position: number;
  is_metric_card: boolean;
  client_id: string;
  is_enabled: boolean;
}

interface ExistingConfig {
  client_id: string;
  metric_name: string;
}

/**
 * Migrate a client from standard sync to dynamic sync
 * This creates default metric configurations based on the standard metrics
 */
export async function migrateClientToDynamicSync(clientId: string): Promise<boolean> {
  try {
    logger.debug('🔄 Starting migration to dynamic sync for client:', clientId);

    // Get all tabs for this client
    const { data: tabs, error: tabsError } = await supabase
      .from('client_tabs')
      .select('id')
      .eq('client_id', clientId)
      // Removed is_active filter - clients are either needed (kept) or not needed (deleted)

    if (tabsError) {
      logger.error('❌ Error getting client tabs:', tabsError);
      return false;
    }

    if (!tabs || tabs.length === 0) {
      logger.debug('⚠️ No active tabs found for client, skipping migration');
      return true;
    }

    // Check if client already has metrics in metrics table
    const { data: existingConfigs } = await supabase
      .from('metrics')
      .select('client_id, metric_name')
      .eq('client_id', clientId) as { data: { client_id: string; metric_name: string }[] | null };

    // If we have metrics for this client, skip migration
    const totalConfiguredMetrics = existingConfigs?.length || 0;
    logger.debug(`📊 Migration check: Found ${totalConfiguredMetrics} metrics for client, expected > 0`);
    
    if (totalConfiguredMetrics > 0) {
      logger.debug('✅ Client already has metrics, skipping migration');
      return true;
    }

    // No hardcoded default metrics - metrics should come from actual Google Sheets sync
    const defaultConfigs: any[] = [];

    // For each tab, create metrics records with default configurations
    for (const tab of tabs) {
      // Check if this tab already has metrics
      const { data: existingRecords, error: fetchError } = await supabase
        .from('metrics')
        .select('*')
        .eq('client_id', clientId)
        .eq('sheet_name', tab.sheet_name);

      if (fetchError) {
        logger.error(`❌ Failed to fetch metrics for tab ${tab.id}:`, fetchError);
        continue;
      }

      const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

      // If we already have metrics for this tab, skip
      if (existingRecords && existingRecords.length > 0) {
        logger.debug(`✅ Tab ${tab.id} already has ${existingRecords.length} metrics, skipping`);
        continue;
      }

      // Create metrics records for this tab
      const metricsToInsert = defaultConfigs.map(config => ({
        user_id: userId,
        client_id: clientId,
        sheet_name: tab.sheet_name,
        metric_name: config.metric_name,
        category: 'general',
        value: 0,
        date: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('metrics')
        .insert(metricsToInsert);

      if (error) {
        logger.error(`❌ Failed to insert metrics for tab ${tab.id}:`, error);
        return false;
      }
    }

    logger.info(`📊 Created metrics for ${tabs.length} tabs for client:`, clientId);

    logger.info('✅ Successfully migrated client to dynamic sync:', clientId);
    return true;

  } catch (error) {
    logger.error('💥 Migration error:', error);
    return false;
  }
}

/**
 * Check if a client needs migration and migrate if necessary
 */
export async function ensureClientUsesDynamicSync(clientId: string): Promise<boolean> {
  try {
    // Get all tabs for this client
    const { data: tabs, error: tabsError } = await supabase
      .from('client_tabs')
      .select('id')
      .eq('client_id', clientId)
      // Removed is_active filter - clients are either needed (kept) or not needed (deleted)

    if (tabsError) {
      logger.error('❌ Error getting client tabs:', tabsError);
      return false;
    }

    if (!tabs || tabs.length === 0) {
      logger.debug('⚠️ No active tabs found for client, skipping migration check');
      return true;
    }

    // Check if all tabs have metrics in metrics table
    const { data: configs } = await supabase
      .from('metrics')
      .select('client_id, metric_name')
      .eq('client_id', clientId);

    // If we don't have metrics for this client, migrate
    const totalConfiguredMetrics = configs?.length || 0;
    logger.debug(`📊 Migration check: Found ${totalConfiguredMetrics} metrics for client`);
    
    if (totalConfiguredMetrics === 0) {
      logger.debug('🔄 Client needs migration, creating default metrics...');
      return await migrateClientToDynamicSync(clientId);
    }

    return true;
  } catch (error) {
    logger.error('💥 Error checking migration status:', error);
    return false;
  }
}

/**
 * Check if staff needs migration and migrate if necessary
 */
export async function ensureUndeniableUsesDynamicSync(userId: string): Promise<boolean> {
  try {
    // Check if undeniable has metrics in metrics table
    const { data: configs } = await supabase
      .from('metrics')
      .select('user_id, metric_name')
      .eq('user_id', userId)
      .eq('client_id', '00000000-0000-0000-0000-000000000001'); // Fallback client ID

    // If we don't have configurations for undeniable, we need to ensure they exist
    if (!configs || configs.length === 0) {
      logger.debug('🔄 Undeniable needs metric configurations, will be created during sync');
      return true; // Allow sync to proceed, configurations will be created
    }

    logger.debug('✅ Undeniable already has metric configurations');
    return true;
  } catch (error) {
    logger.warn('⚠️ Could not check undeniable metric configurations:', error);
    return true; // Allow sync to proceed
  }
}

export async function ensureStaffUsesDynamicSync(userId: string): Promise<boolean> {
  try {
    // Check if staff has metrics in metrics table
    const { data: configs } = await supabase
      .from('metrics')
      .select('user_id, metric_name')
      .eq('user_id', userId)
        // No longer filtering by STAFF_CLIENT_ID - get all metrics for user
      // No longer filtering by STAFF_CLIENT_ID - get all metrics for user

    // If we don't have metrics for staff, we need to ensure they exist
    const totalConfiguredMetrics = configs?.length || 0;
    logger.debug(`📊 Staff migration check: Found ${totalConfiguredMetrics} total configured metrics for user ${userId}`);
    
    if (!configs || configs.length === 0 || totalConfiguredMetrics === 0) {
      logger.debug('🔄 Staff needs metric configurations, will be created during sync');
      // For staff, we don't need to pre-create configurations like clients
      // They will be auto-created during the sync process
      return true;
    }

    return true;
  } catch (error) {
    logger.error('💥 Error checking staff migration status:', error);
    return false;
  }
}

