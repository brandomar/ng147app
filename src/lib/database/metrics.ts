/**
 * Metrics Management Functions
 * Metric data operations, configurations, and analytics
 */

import { supabase } from '../supabase';
import { logger } from '../logger';
import { TimeFrame, MetricEntry } from '../../types';

// ===== METRIC ENTRIES =====
export const getMetricEntries = async (category: string, timeFrame: TimeFrame = 'daily', userId?: string, clientId?: string) => {
  try {
    // Use new simplified metrics table with RPC function
    const { data: metricsData, error: metricsError } = await supabase.rpc('get_metrics_by_category', {
      p_user_id: userId && userId !== '' ? userId : null,
      p_client_id: clientId && clientId !== '' ? clientId : null,
      p_category: category,
      p_time_frame: timeFrame
    });

    if (metricsError) {
      logger.error('❌ Error fetching metrics by category:', metricsError);
      return { data: [], error: metricsError };
    }

    logger.debug('✅ Metric entries loaded:', { 
      category, 
      timeFrame, 
      count: metricsData?.length || 0 
    });

    return { data: metricsData || [], error: null };
  } catch (error) {
    logger.error('❌ Error in getMetricEntries:', error);
    return { data: [], error };
  }
};

export const getAllMetricEntries = async (timeFrame: TimeFrame = 'daily', userId?: string, clientId?: string, clientTabId?: string) => {
  try {
    let query = supabase
      .from('metrics')
      .select('*')
      .order('date', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (clientTabId) {
      query = query.eq('client_tab_id', clientTabId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('❌ Error fetching all metric entries:', error);
      return { data: [], error };
    }

    logger.debug('✅ All metric entries loaded:', { 
      count: data?.length || 0,
      userId,
      clientId,
      clientTabId
    });

    return { data: data || [], error: null };
  } catch (error) {
    logger.error('❌ Error in getAllMetricEntries:', error);
    return { data: [], error };
  }
};

export const getTodayMetrics = async (userId: string, clientId?: string) => {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    let query = supabase
      .from('metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('❌ Error fetching today\'s metrics:', error);
      return { data: [], error };
    }

    logger.debug('✅ Today\'s metrics loaded:', { 
      count: data?.length || 0,
      userId,
      clientId
    });

    return { data: data || [], error: null };
  } catch (error) {
    logger.error('❌ Error in getTodayMetrics:', error);
    return { data: [], error };
  }
};

export const getRecentMetrics = async (userId: string, clientId?: string, limit: number = 10) => {
  try {
    let query = supabase
      .from('metrics')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('❌ Error fetching recent metrics:', error);
      return { data: [], error };
    }

    logger.debug('✅ Recent metrics loaded:', { 
      count: data?.length || 0,
      userId,
      clientId,
      limit
    });

    return { data: data || [], error: null };
  } catch (error) {
    logger.error('❌ Error in getRecentMetrics:', error);
    return { data: [], error };
  }
};

export const addMetricEntry = async (entry: Omit<MetricEntry, 'id' | 'created_at'>) => {
  try {
    const { data, error } = await supabase
      .from('metrics')
      .insert(entry)
      .select()
      .single();

    if (error) {
      logger.error('❌ Error adding metric entry:', error);
      return { data: null, error };
    }

    logger.debug('✅ Metric entry added:', { id: data.id });
    return { data, error: null };
  } catch (error) {
    logger.error('❌ Error in addMetricEntry:', error);
    return { data: null, error };
  }
};

export const updateMetricEntry = async (id: string, updates: Partial<MetricEntry>) => {
  try {
    const { data, error } = await supabase
      .from('metrics')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('❌ Error updating metric entry:', error);
      return { data: null, error };
    }

    logger.debug('✅ Metric entry updated:', { id });
    return { data, error: null };
  } catch (error) {
    logger.error('❌ Error in updateMetricEntry:', error);
    return { data: null, error };
  }
};

export const deleteMetricEntry = async (entryId: string) => {
  try {
    const { error } = await supabase
      .from('metrics')
      .delete()
      .eq('id', entryId);

    if (error) {
      logger.error('❌ Error deleting metric entry:', error);
      return { data: null, error };
    }

    logger.debug('✅ Metric entry deleted:', { entryId });
    return { data: { success: true }, error: null };
  } catch (error) {
    logger.error('❌ Error in deleteMetricEntry:', error);
    return { data: null, error };
  }
};

// ===== METRIC CONFIGURATIONS =====
export const getStaffMetricConfigurations = async (userId: string, sheetName?: string) => {
  try {
    let query = supabase
      .from('metrics')
      .select('*')
      .eq('user_id', userId);

    if (sheetName) {
      query = query.eq('sheet_name', sheetName);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('❌ Error fetching staff metric configurations:', error);
      return { data: [], error };
    }

    // Process the data into the standard format
    const configurations = data?.flatMap((record: any) => {
      if (!record.metric_configs) {
        return [];
      }

      return record.metric_configs.map((config: any) => ({
        id: config.id,
        client_id: record.client_id,
        metric_name: config.metric_name,
        category: config.category,
        enabled: config.enabled,
        sheet_name: record.sheet_name,
        created_at: record.created_at
      }));
    }) || [];

    logger.debug('✅ Staff metric configurations loaded:', { 
      userId, 
      sheetName,
      count: configurations.length 
    });

    return { data: configurations, error: null };
  } catch (error) {
    logger.error('❌ Error in getStaffMetricConfigurations:', error);
    return { data: [], error };
  }
};

export const getConfiguredMetricEntries = async (
  timeFrame: TimeFrame = 'daily', 
  userId?: string, 
  clientId?: string, 
  clientTabId?: string, 
  sheetName?: string, 
  tabName?: string
) => {
  // Create cache key for deduplication
  const cacheKey = `configured_metrics_${userId}_${clientId}_${clientTabId}_${sheetName}_${tabName}_${timeFrame}`;
  
  try {
    let query = supabase
      .from('metrics')
      .select('*')
      .order('date', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (clientTabId) {
      query = query.eq('client_tab_id', clientTabId);
    }

    if (sheetName) {
      query = query.eq('sheet_name', sheetName);
    }

    if (tabName) {
      query = query.eq('tab_name', tabName);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('❌ Error fetching configured metric entries:', error);
      return { data: [], error };
    }

    logger.debug('✅ Configured metric entries loaded:', { 
      count: data?.length || 0,
      userId,
      clientId,
      clientTabId,
      sheetName,
      tabName
    });

    return { data: data || [], error: null };
  } catch (error) {
    logger.error('❌ Error in getConfiguredMetricEntries:', error);
    return { data: [], error };
  }
};

export const deleteStaffMetricConfiguration = async (configId: string) => {
  try {
    const { error } = await supabase
      .from('metrics')
      .update({
        metric_configs: []
      })
      .eq('id', configId);

    if (error) {
      logger.error('❌ Error deleting staff metric configuration:', error);
      return { data: null, error };
    }

    logger.debug('✅ Staff metric configuration deleted:', { configId });
    return { data: { success: true }, error: null };
  } catch (error) {
    logger.error('❌ Error in deleteStaffMetricConfiguration:', error);
    return { data: null, error };
  }
};

export const deleteMetricConfiguration = async (_configId: string) => {
  try {
    // This function is kept for compatibility but may not be needed
    logger.debug('⚠️ deleteMetricConfiguration called - may be deprecated');
    return { data: { success: true }, error: null };
  } catch (error) {
    logger.error('❌ Error in deleteMetricConfiguration:', error);
    return { data: null, error };
  }
};

// ===== METRIC DISCOVERY =====
export const getDiscoveredMetrics = async (userId: string, clientId?: string) => {
  try {
    let query = supabase
      .from('metrics')
      .select('*')
      .eq('user_id', userId);

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('❌ Error fetching discovered metrics:', error);
      return { data: [], error };
    }

    logger.debug('✅ Discovered metrics loaded:', { 
      userId,
      clientId,
      count: data?.length || 0
    });

    return { data: data || [], error: null };
  } catch (error) {
    logger.error('❌ Error in getDiscoveredMetrics:', error);
    return { data: [], error };
  }
};

// ===== OPTIMIZED DASHBOARD DATA =====
export const getOptimizedDashboardData = async (userId: string, clientId?: string) => {
  try {
    logger.debug('🚀 Loading dashboard data with optimizations:', { userId, clientId });
    const startTime = Date.now();
    
    // Use the optimized data loader
    const result = await import('../optimizedDataLoader').then(m => 
      m.optimizedDataLoader.loadDashboardData(userId, clientId)
    );
    
    // Handle null result
    if (!result) {
      logger.warn('⚠️ Optimized data loader returned null, using fallback');
      return { data: null, error: { message: 'Data loader returned null' } };
    }
    
    const { data, error } = result;
    
    const loadTime = Date.now() - startTime;
    logger.debug('✅ Optimized dashboard data loaded:', { 
      loadTime: `${loadTime}ms`,
      metricsCount: data?.metrics?.length || 0,
      clientsCount: data?.clients?.length || 0
    });
    
    return { data, error: null };
  } catch (error) {
    logger.error('❌ Error loading optimized dashboard data:', error);
    return { data: null, error };
  }
};

export const getHierarchicalDataStructure = async (userId: string) => {
  try {
    logger.debug("🏗️ Building hierarchical data structure for user:", userId);

    // Get all clients accessible to this user
    const { data: clients } = await import("./clients").then((m) =>
      m.getClients()
    );

    if (!clients || clients.length === 0) {
      logger.debug("📊 No clients found for hierarchical structure");
      return { data: [], error: null };
    }

    // Get all metrics for this user to extract sheets, tabs, and metrics
    const { data: allMetrics, error: metricsError } = await supabase
      .from("metrics")
      .select("client_id, sheet_name, tab_name, metric_name")
      .eq("user_id", userId)
      .not("sheet_name", "is", null);

    if (metricsError) {
      logger.error(
        "❌ Error fetching metrics for hierarchical structure:",
        metricsError
      );
    }

    // Build hierarchical structure with actual data
    const hierarchicalData = clients.map((client) => {
      // Get metrics for this client
      const clientMetrics = (allMetrics || []).filter(
        (m) => m.client_id === client.id
      );

      // Group by sheet name
      const sheetMap = new Map<string, { tabs: Map<string, Set<string>> }>();

      clientMetrics.forEach((metric) => {
        if (!metric.sheet_name) return;

        if (!sheetMap.has(metric.sheet_name)) {
          sheetMap.set(metric.sheet_name, { tabs: new Map() });
        }

        const sheet = sheetMap.get(metric.sheet_name)!;
        const tabName = metric.tab_name || "Default";

        if (!sheet.tabs.has(tabName)) {
          sheet.tabs.set(tabName, new Set());
        }

        if (metric.metric_name) {
          sheet.tabs.get(tabName)!.add(metric.metric_name);
        }
      });

      // Convert to array structure expected by HierarchicalSheetSelector
      const sheets = Array.from(sheetMap.entries()).map(
        ([sheetName, sheetData], sheetIndex) => ({
          id: `${client.id}-sheet-${sheetIndex}`,
          name: sheetName,
          url: client.google_sheets_url || "",
          type: (client.data_source === "excel-import"
            ? "excel"
            : "google-sheets") as "google-sheets" | "excel",
          isExpanded: false,
          isSelected: true, // Default to selected
          tabs: Array.from(sheetData.tabs.entries()).map(
            ([tabName, metrics], tabIndex) => ({
              id: `${client.id}-sheet-${sheetIndex}-tab-${tabIndex}`,
              name: tabName,
              gid: `${tabIndex}`,
              url: `${client.google_sheets_url}#gid=${tabIndex}`,
              isSelected: true, // Default to selected
              metrics: Array.from(metrics),
            })
          ),
          metrics: Array.from(
            new Set(
              Array.from(sheetData.tabs.values()).flatMap((m) => Array.from(m))
            )
          ),
        })
      );

      return {
        id: client.id,
        name: client.name,
        sheets: sheets,
        isExpanded: false,
        isSelected: sheets.length > 0, // Select client if it has sheets
      };
    });

    logger.debug("🔍 Hierarchical Data Structure:", {
      dataLength: hierarchicalData.length,
      totalSheets: hierarchicalData.reduce(
        (sum, c) => sum + c.sheets.length,
        0
      ),
      totalTabs: hierarchicalData.reduce(
        (sum, c) =>
          sum + c.sheets.reduce((s, sheet) => s + sheet.tabs.length, 0),
        0
      ),
      firstClient: hierarchicalData[0],
      firstClientSheets: hierarchicalData[0]?.sheets?.length || 0,
      sampleSheet: hierarchicalData[0]?.sheets?.[0],
    });

    return { data: hierarchicalData, error: null };
  } catch (error) {
    logger.error('❌ Error building hierarchical data structure:', error);
    return { data: [], error };
  }
};

// ===== METRIC CLEANUP =====
export const cleanupOrphanedMetricEntries = async (userId: string) => {
  try {
    // Find metrics that don't have corresponding discovered metrics
    const { data: orphanedMetrics, error: findError } = await supabase
      .from('metrics')
      .select('id, metric_name, sheet_name')
      .eq('user_id', userId)
      .not('metric_name', 'in', `(SELECT DISTINCT metric_name FROM metrics WHERE user_id = '${userId}')`);

    if (findError) {
      logger.error('❌ Error finding orphaned metrics:', findError);
      return { data: null, error: findError };
    }

    if (orphanedMetrics && orphanedMetrics.length > 0) {
      const { error: deleteError } = await supabase
        .from('metrics')
        .delete()
        .in('id', orphanedMetrics.map(m => m.id));

      if (deleteError) {
        logger.error('❌ Error deleting orphaned metrics:', deleteError);
        return { data: null, error: deleteError };
      }

      logger.info(`✅ Cleaned up ${orphanedMetrics.length} orphaned metric entries`);
    }

    return { data: { cleaned: orphanedMetrics?.length || 0 }, error: null };
  } catch (error) {
    logger.error('❌ Error in cleanupOrphanedMetricEntries:', error);
    return { data: null, error };
  }
};

export const cleanupDuplicatedMetricsBeforeSync = async (userId: string, clientId?: string) => {
  try {
    logger.debug('🧹 Cleaning up old duplicated metrics before sync...');
    
    // Find existing metrics for this user/client combination
    let query = supabase
      .from('metrics')
      .select('id, metric_name, date, value')
      .eq('user_id', userId);

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data: existingMetrics, error } = await query;

    if (error) {
      logger.error('❌ Error finding existing metrics for cleanup:', error);
      return { data: null, error };
    }

    if (existingMetrics && existingMetrics.length > 0) {
      // Delete existing metrics to prevent duplicates
      const { error: deleteError } = await supabase
        .from('metrics')
        .delete()
        .eq('user_id', userId)
        .eq('client_id', clientId || '');

      if (deleteError) {
        logger.error('❌ Error deleting existing metrics:', deleteError);
        return { data: null, error: deleteError };
      }

      logger.info(`✅ Cleaned up ${existingMetrics.length} old metric entries - ready for optimized sync`);
    }

    return { data: { cleaned: existingMetrics?.length || 0 }, error: null };
  } catch (error) {
    logger.error('❌ Error in cleanupDuplicatedMetricsBeforeSync:', error);
    return { data: null, error };
  }
};
