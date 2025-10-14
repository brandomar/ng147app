import { supabase } from './supabase';
import { logger } from './logger';

// Function to extract spreadsheet ID from Google Sheets URL
function extractSpreadsheetId(url: string): string {
  // Handle both full URLs and just the ID
  if (!url.includes('docs.google.com')) {
    return url; // Already just an ID
  }
  
  // Extract ID from URL pattern: /spreadsheets/d/{ID}/edit
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  
  // If no match found, return the original string
  logger.warn('⚠️ Could not extract spreadsheet ID from URL:', url);
  return url;
}

/**
 * Sync Google Sheets using the dynamic metric configuration system
 * This function reads metric configurations from the database and processes only selected metrics
 */
export async function syncGoogleSheetsDynamic(clientId: string, googleSheetId: string, getColumnsOnly: boolean = false) {
  // Extract the actual spreadsheet ID from the URL
  const actualSpreadsheetId = extractSpreadsheetId(googleSheetId);

  try {
    // Auto-cleanup duplicated metrics before sync for client data too
    const { getCurrentUserSession, cleanupDuplicatedMetricsBeforeSync } = await import('./database');
    const { session, error: sessionError } = await getCurrentUserSession();
    if (session?.user?.id) {
      const cleanupResult = await cleanupDuplicatedMetricsBeforeSync(session.user.id, clientId);
      if (!cleanupResult.success) {
        logger.warn('⚠️ Could not clean up old client metrics, continuing with sync anyway');
      }
    }
    
    if (sessionError) {
      logger.error('❌ Session error:', sessionError);
      throw new Error(`Authentication error: ${sessionError.message}`);
    }

    if (!session?.user) {
      logger.error('❌ No authenticated user found');
      throw new Error('No authenticated user found. Please log in.');
    }
    
    // Get client information including tabs from JSONB column
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, tabs, google_sheets_tabs')
      .eq('id', clientId)
      .single();

    if (clientError) {
      logger.error('❌ Error fetching client:', clientError);
      throw new Error(`Failed to fetch client: ${clientError.message}`);
    }

    // Extract tabs from JSONB column or use google_sheets_tabs
    const tabs = client?.tabs || [];
    const googleSheetsTabs = client?.google_sheets_tabs || [];

    logger.sync('📊 Found tabs for client:', { 
      clientId, 
      clientName: client?.name,
      tabsFromJsonb: tabs?.length || 0,
      googleSheetsTabs: googleSheetsTabs?.length || 0,
      tabs: tabs?.map(t => ({ id: t.id, name: t.name })) || [],
      googleSheetsTabsList: googleSheetsTabs
    });

    if ((!tabs || tabs.length === 0) && (!googleSheetsTabs || googleSheetsTabs.length === 0)) {
      logger.error('❌ No tabs found for client:', { clientId });
      throw new Error('No tabs found for this client');
    }

    // Use google_sheets_tabs if available, otherwise use tabs from JSONB
    const tabNames = googleSheetsTabs.length > 0 ? googleSheetsTabs : tabs.map(t => t.name);
    
    logger.sync('📊 Using tab names for sync:', { 
      tabNames,
      source: googleSheetsTabs.length > 0 ? 'google_sheets_tabs' : 'tabs_jsonb'
    });

    if (!tabNames || tabNames.length === 0) {
      logger.error('❌ No tab names found for sync');
      throw new Error('No tab names found for sync');
    }

    const supabaseUrl = (() => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      if (!url) {
        throw new Error('Missing VITE_SUPABASE_URL environment variable');
      }
      return url;
    })();
    const currentOrigin = window.location.origin;
    const supabaseOrigin = new URL(supabaseUrl).origin;
    const shouldUseProxy = currentOrigin !== supabaseOrigin;
    const edgeFunctionUrl = shouldUseProxy 
      ? '/supabase-functions/google-metric-sync-enhanced'
      : `${supabaseUrl}/functions/v1/google-metric-sync-enhanced`;

    // Process all tabs for this client
    const results = [];
    let totalMetricsProcessed = 0;
    
    for (const tabName of tabNames) {
      logger.sync(`🔄 Syncing tab: ${tabName}`);
      
      const requestBody = {
        user_id: session.user.id,
        client_id: clientId,
        google_sheet_id: actualSpreadsheetId,
        sheet_name: tabName, // Use tab name as sheet name
        tab_name: tabName,
        tab_gid: "0", // Default GID
        sync_type: "admin", // Set sync type for admin clients
        get_columns_only: getColumnsOnly,
      };
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        logger.error(`❌ HTTP Error for tab ${tabName}:`, response.status, response.statusText);
        
        try {
          const errorText = await response.text();
          logger.error('❌ Error response body:', errorText);
        } catch {
          logger.warn('⚠️ Could not parse error response');
        }
        
        // Continue with other tabs even if one fails
        results.push({
          tab_name: tabName,
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        });
        continue;
      }

      const result = await response.json();
      logger.sync(`✅ Tab ${tabName} sync result:`, result);
      
      // DEBUG: Log the actual response from Edge Function
      logger.debug('🔍 Edge Function Response:', {
        tabName,
        success: result.success,
        metricsProcessed: result.metricsProcessed,
        message: result.message,
        fullResult: result
      });
      
      if (result.metricsProcessed) {
        totalMetricsProcessed += result.metricsProcessed;
      }
      
      results.push({
        tab_name: tabName,
        success: true,
        data: result
      });
    }
    
    logger.sync(`✅ All tabs synced. Total metrics processed: ${totalMetricsProcessed}`);
    
    return {
      success: true,
      data: {
        tabs_processed: results.length,
        total_metrics_processed: totalMetricsProcessed,
        results: results
      },
      error: null
    };

  } catch (error: unknown) {
    logger.error('💥 Dynamic sync error:', error);
    
    return {
      success: false,
      data: null,
      error: {
        error: 'Dynamic Sync Error',
        details: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

/**
 * Fallback to standard sync function
 * This is used when metric configurations are not available
 */
async function syncGoogleSheetsStandard(clientId: string, googleSheetId: string) {
  logger.sync('🔄 Falling back to standard sync function...');
  
  // Import the standard sync function
  const { syncGoogleSheets } = await import('./database');
  return await syncGoogleSheets(clientId, googleSheetId);
}

/**
 * Check if a client has metric configurations set up
 */
export async function hasMetricConfigurations(clientId: string): Promise<boolean> {
  try {
    // First get all tabs for this client
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
      return false;
    }

    // Check if any metrics exist for this client
    const { data, error } = await supabase
      .from('metrics')
      .select('metric_name')
      .eq('client_id', clientId)
      .not('metric_name', 'is', null)
      .limit(1);

    if (error) {
      logger.error('❌ Error checking metric configurations:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    logger.error('❌ Error checking metric configurations:', error);
    return false;
  }
}

/**
 * Get metric configurations for a client (for display purposes)
 */
export async function getMetricConfigurations(clientId: string) {
  try {
    // First get all tabs for this client
    const { data: tabs, error: tabsError } = await supabase
      .from('client_tabs')
      .select('id')
      .eq('client_id', clientId)
      // Removed is_active filter - clients are either needed (kept) or not needed (deleted)

    if (tabsError) {
      logger.error('❌ Error getting client tabs:', tabsError);
      return { data: null, error: tabsError };
    }

    if (!tabs || tabs.length === 0) {
      return { data: [], error: null };
    }

    // Get metrics for this client from metrics table
    const { data: metricsData, error } = await supabase
      .from('metrics')
      .select('metric_name, sheet_name, category')
      .eq('client_id', clientId)
      .not('metric_name', 'is', null);

    if (error) {
      logger.error('❌ Error fetching metrics:', error);
      return { data: null, error };
    }

    // Process the data into the standard format
    const uniqueMetrics = Array.from(new Set((metricsData || []).map(m => m.metric_name)));
    const configurations = uniqueMetrics.map((metricName, index) => ({
      id: `metric-${index}`,
      client_id: clientId,
      metric_name: metricName,
      sheet_column_name: metricName,
      display_name: metricName,
      metric_type: 'number',
      is_enabled: true,
      dashboard_position: index + 1,
      is_metric_card: true,
      format_options: {},
      sheet_name: metricsData?.find(m => m.metric_name === metricName)?.sheet_name || 'Unknown',
      created_at: new Date().toISOString()
    }));

    return { data: configurations, error: null };
  } catch (error: unknown) {
    logger.error('❌ Error fetching metric configurations:', error);
    return { data: null, error };
  }
}
