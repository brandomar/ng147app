/**
 * Google Sheets Sync Functions
 * Synchronization operations for Google Sheets data
 */

import { supabase } from '../supabase';
import { logger } from '../logger';
import { hasPermission, isGlobalAdmin } from "./permissions";

// ===== SYNC STATUS MANAGEMENT =====
export type SyncStatus = "success" | "error" | "never_synced" | "syncing";

export interface SyncStatusUpdate {
  status: SyncStatus;
  last_sync_at?: string;
  last_successful_sync_at?: string;
  sync_error_message?: string;
  total_sync_count?: number;
  successful_sync_count?: number;
}

export const updateClientSyncStatus = async (
  clientId: string,
  status: SyncStatus,
  errorMessage?: string
) => {
  const now = new Date().toISOString();
  const updateData: Partial<SyncStatusUpdate> = {
    status,
    last_sync_at: now,
  };

  if (status === "success") {
    updateData.last_successful_sync_at = now;
    updateData.successful_sync_count = 1; // Will be incremented by the database
    updateData.sync_error_message = undefined;
  } else if (status === "error") {
    updateData.sync_error_message = errorMessage || "Unknown error";
  }

  try {
    const { error } = await supabase.from("client_sync_status").upsert({
      client_id: clientId,
      ...updateData,
    });

    if (error) {
      logger.error("❌ Error updating client sync status:", error);
      return { data: null, error };
    }

    logger.debug("✅ Client sync status updated:", { clientId, status });
    return { data: { success: true }, error: null };
  } catch (error) {
    logger.error("❌ Error in updateClientSyncStatus:", error);
    return { data: null, error };
  }
};

export const getClientSyncStatus = async (clientId: string) => {
  logger.debug("📊 Getting client sync status:", { clientId });

  try {
    const { data, error } = await supabase
      .from("client_sync_status")
      .select(
        "sync_status, last_sync_at, last_successful_sync_at, sync_error_message, total_sync_count, successful_sync_count, sheet_name"
      )
      .eq("client_id", clientId)
      .single();

    if (error && error.code !== "PGRST116") {
      logger.error("❌ Error fetching client sync status:", error);
      return { data: null, error };
    }

    return { data: data || null, error: null };
  } catch (error) {
    logger.error("❌ Error in getClientSyncStatus:", error);
    return { data: null, error };
  }
};

export const updateStaffSyncStatus = async (
  userId: string,
  googleSheetId: string,
  status: SyncStatus,
  errorMessage?: string
) => {
  const now = new Date().toISOString();

  try {
    const { error } = await supabase.rpc("update_staff_sync_status", {
      p_user_id: userId,
      p_google_sheet_id: googleSheetId,
      p_status: status,
      p_last_successful_sync_at: status === "success" ? now : null,
      p_sync_error_message:
        status === "error" ? errorMessage || "Unknown error" : null,
    });

    if (error) {
      logger.error("❌ Error updating staff sync status:", error);
      return { data: null, error };
    }

    logger.debug("🔄 Updating staff sync status:", {
      userId,
      googleSheetId,
      status,
      errorMessage,
    });
    return { data: { success: true }, error: null };
  } catch (error) {
    logger.error("❌ Error in updateStaffSyncStatus:", error);
    return { data: null, error };
  }
};

export const updateUndeniableSyncStatus = async (
  userId: string,
  googleSheetId: string,
  status: SyncStatus,
  errorMessage?: string
) => {
  const now = new Date().toISOString();

  try {
    const { error } = await supabase.rpc("update_undeniable_sync_status", {
      p_user_id: userId,
      p_google_sheet_id: googleSheetId,
      p_status: status,
      p_last_successful_sync_at: status === "success" ? now : null,
      p_sync_error_message:
        status === "error" ? errorMessage || "Unknown error" : null,
    });

    if (error) {
      logger.error("❌ Error updating undeniable sync status:", error);
      return { data: null, error };
    }

    logger.debug("🔄 Updating undeniable sync status:", {
      userId,
      googleSheetId,
      status,
      errorMessage,
    });
    return { data: { success: true }, error: null };
  } catch (error) {
    logger.error("❌ Error in updateUndeniableSyncStatus:", error);
    return { data: null, error };
  }
};

export const getUndeniableSyncStatus = async (
  userId: string,
  googleSheetId: string
) => {
  logger.debug("📊 Getting undeniable sync status:", { userId, googleSheetId });

  try {
    const { data, error } = await supabase
      .from("undeniable_sync_status")
      .select("*")
      .eq("user_id", userId)
      .eq("google_sheet_id", googleSheetId)
      .single();

    if (error && error.code !== "PGRST116") {
      logger.error("❌ Error fetching undeniable sync status:", error);
      return { data: null, error };
    }

    return { data: data || null, error: null };
  } catch (error) {
    logger.error("❌ Error in getUndeniableSyncStatus:", error);
    return { data: null, error };
  }
};

// ===== GOOGLE SHEETS SYNC FUNCTIONS =====
export const testGoogleSheetsAccess = async (
  spreadsheetId: string,
  sheetName?: string
) => {
  logger.debug("🧪 Testing Google Sheets access...");

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      throw new Error("No authenticated user found");
    }

    const supabaseUrl = (() => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      if (!url) {
        throw new Error("Missing VITE_SUPABASE_URL environment variable");
      }
      return url;
    })();

    const shouldUseProxy = false; // Force production URL since local proxy is not running
    const edgeFunctionUrl = shouldUseProxy
      ? "/supabase-functions/google-metric-sync-enhanced"
      : `${supabaseUrl.replace(
          /\/$/,
          ""
        )}/functions/v1/google-metric-sync-enhanced`;

    // Test with GET request to debug endpoint
    const testUrl = `${edgeFunctionUrl}?spreadsheetId=${spreadsheetId}${
      sheetName ? `&sheetName=${encodeURIComponent(sheetName)}` : ""
    }`;

    logger.debug("🧪 Test URL:", testUrl);

    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(shouldUseProxy
          ? {}
          : {
              apikey: (() => {
                const key = import.meta.env.VITE_SUPABASE_TEST_ANON_KEY;
                if (!key) {
                  throw new Error(
                    "Missing VITE_SUPABASE_TEST_ANON_KEY environment variable"
                  );
                }
                return key;
              })(),
            }),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("❌ Test request failed:", errorText);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    logger.debug("🧪 Test result:", result);
    return result;
  } catch (error) {
    logger.error("❌ Test error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const syncGoogleSheetsStaff = async (
  userId: string,
  googleSheetId: string,
  sheetName?: string
) => {
  logger.debug("🔧 syncGoogleSheetsStaff function called");
  logger.debug("📝 Parameters received:", {
    userId,
    googleSheetId,
    sheetName: sheetName || "Sheet1 (default)",
  });

  // Check permissions using new system
  try {
    const canSync = await hasPermission(userId, "canSyncData");
    if (!canSync) {
      logger.error("❌ User does not have permission to sync data");
      return { success: false, error: "Insufficient permissions to sync data" };
    }
  } catch (error) {
    logger.warn("⚠️ Could not check permissions, continuing with sync");
  }

  // Auto-cleanup duplicated metrics before sync (ensures fresh, optimized data)
  const cleanupResult = await cleanupDuplicatedMetricsBeforeSync(userId);
  if (!cleanupResult.success) {
    logger.warn(
      "⚠️ Could not clean up old metrics, continuing with sync anyway"
    );
  }

  // Extract the actual spreadsheet ID from the URL
  const actualSpreadsheetId = extractSpreadsheetId(googleSheetId);
  logger.debug("📊 Extracted spreadsheet ID:", actualSpreadsheetId);

  try {
    logger.debug("🔑 Getting current user session...");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      logger.error("❌ No authenticated user found");
      return { success: false, error: "No authenticated user found" };
    }

    const supabaseUrl = (() => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      if (!url) {
        throw new Error("Missing VITE_SUPABASE_URL environment variable");
      }
      return url;
    })();

    const shouldUseProxy = false; // Force production URL since local proxy is not running
    const edgeFunctionUrl = shouldUseProxy
      ? "/supabase-functions/google-metric-sync-enhanced"
      : `${supabaseUrl.replace(
          /\/$/,
          ""
        )}/functions/v1/google-metric-sync-enhanced`;

    logger.debug("🌐 Edge function URL:", edgeFunctionUrl);
    logger.debug("🔍 Using production Edge Function (local proxy disabled)");
    logger.debug("🔍 Using proxy:", shouldUseProxy);
    logger.debug("🔑 Supabase URL from env:", supabaseUrl);
    logger.debug("🔑 User access token exists:", !!user.access_token);

    const requestBody = {
      user_id: userId,
      google_sheet_id: actualSpreadsheetId,
      sheet_name: sheetName || "Sheet1", // Default to Sheet1 if not specified
      sync_type: "client", // Use client sync type for staff operations
      range: "A:AZ", // Extended range to cover columns A through AZ (52 columns total)
    };

    logger.debug("📤 Request body:", requestBody);

    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...(shouldUseProxy
          ? {}
          : {
              apikey: (() => {
                const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
                if (!key) {
                  throw new Error(
                    "Missing VITE_SUPABASE_ANON_KEY environment variable"
                  );
                }
                return key;
              })(),
            }),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("❌ Staff sync request failed:", errorText);
      await updateStaffSyncStatus(
        userId,
        actualSpreadsheetId,
        "error",
        errorText
      );
      return { success: false, error: errorText };
    }

    const result = await response.json();
    logger.debug("✅ Staff sync result:", result);

    if (result.success) {
      await updateStaffSyncStatus(userId, actualSpreadsheetId, "success");
    } else {
      await updateStaffSyncStatus(
        userId,
        actualSpreadsheetId,
        "error",
        result.error
      );
    }

    return result;
  } catch (error) {
    logger.error("❌ Staff sync error:", error);
    await updateStaffSyncStatus(
      userId,
      actualSpreadsheetId,
      "error",
      error instanceof Error ? error.message : "Unknown error"
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const syncGoogleSheetsUndeniable = async (
  userId: string, 
  googleSheetId: string, 
  sheetName?: string, 
  selectedTabs?: Array<{name: string, gid: string, url: string}>
) => {
  logger.debug('🔧 syncGoogleSheetsUndeniable function called');
  logger.debug('📝 Parameters received:', { userId, googleSheetId, sheetName, selectedTabsCount: selectedTabs?.length || 0 });
  
  // Auto-cleanup duplicated metrics before sync (ensures fresh, optimized data)
  const cleanupResult = await cleanupDuplicatedMetricsBeforeSync(userId);
  if (!cleanupResult.success) {
    logger.warn('⚠️ Could not clean up old metrics, continuing with sync anyway');
  }
  
  // Extract the actual spreadsheet ID from the URL
  const actualSpreadsheetId = extractSpreadsheetId(googleSheetId);
  logger.debug('📊 Extracted spreadsheet ID:', actualSpreadsheetId);

  try {
    logger.debug('🔑 Getting current user session...');
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      logger.error('❌ No authenticated user found');
      return { success: false, error: 'No authenticated user found' };
    }

    const supabaseUrl = (() => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      if (!url) {
        throw new Error('Missing VITE_SUPABASE_URL environment variable');
      }
      return url;
    })();
    
    const shouldUseProxy = false; // Force production URL since local proxy is not running
    const edgeFunctionUrl = shouldUseProxy 
      ? '/supabase-functions/google-metric-sync-enhanced'
      : `${supabaseUrl.replace(/\/$/, '')}/functions/v1/google-metric-sync-enhanced`;

    logger.debug('🌐 Edge function URL:', edgeFunctionUrl);
    logger.debug('🔍 Using production Edge Function (local proxy disabled)');
    logger.debug('🔍 Using proxy:', shouldUseProxy);
    logger.debug('🔑 Supabase URL from env:', supabaseUrl);
    logger.debug('🔑 User access token exists:', !!user.access_token);

    const requestBody = {
      user_id: userId,
      google_sheet_id: actualSpreadsheetId,
      sheet_name: sheetName || 'Sheet1', // Default to Sheet1 if not specified
      sync_type: 'admin', // Use admin sync type for admin operations
      range: 'A:AZ', // Extended range to cover columns A through AZ (52 columns total)
      selected_tabs: selectedTabs || [] // Pass selected tabs if provided
    };

    logger.debug('📤 Request body:', requestBody);

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        ...(shouldUseProxy ? {} : { 'apikey': (() => {
          const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
          if (!key) {
            throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
          }
          return key;
        })() })
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('❌ Undeniable sync request failed:', errorText);
      await updateUndeniableSyncStatus(userId, actualSpreadsheetId, 'error', errorText);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    logger.debug('✅ Undeniable sync result:', result);

    if (result.success) {
      await updateUndeniableSyncStatus(userId, actualSpreadsheetId, 'success');
    } else {
      await updateUndeniableSyncStatus(userId, actualSpreadsheetId, 'error', result.error);
    }

    return result;
    
  } catch (error) {
    logger.error('❌ Undeniable sync error:', error);
    await updateUndeniableSyncStatus(userId, actualSpreadsheetId, 'error', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// ===== HELPER FUNCTIONS =====
const extractSpreadsheetId = (url: string): string => {
  // Extract spreadsheet ID from Google Sheets URL
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
    /spreadsheetId=([a-zA-Z0-9-_]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // If no match found, return the original string
  logger.warn('⚠️ Could not extract spreadsheet ID from URL:', url);
  return url;
};

// Import cleanup function from metrics module
const { cleanupDuplicatedMetricsBeforeSync } = await import('./metrics');

// ===== GOOGLE SHEETS TAB DISCOVERY =====
export const discoverGoogleSheetsTabs = async (
  spreadsheetId: string, 
  userId?: string, 
  clientId?: string
) => {
  logger.debug('🔍 Discovering Google Sheets tabs:', { spreadsheetId, userId, clientId });
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('No authenticated user found');
    }
    
    const user = session.user;

    const supabaseUrl = (() => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      if (!url) {
        throw new Error('Missing VITE_SUPABASE_URL environment variable');
      }
      return url;
    })();
    
    const shouldUseProxy = false; // Force production URL since local proxy is not running
    const edgeFunctionUrl = shouldUseProxy 
      ? '/supabase-functions/google-metric-sync-enhanced'
      : `${supabaseUrl.replace(/\/$/, '')}/functions/v1/google-metric-sync-enhanced`;

    // Call the edge function to discover tabs
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        ...(shouldUseProxy ? {} : { 'apikey': (() => {
          const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
          if (!key) {
            throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
          }
          return key;
        })() })
      },
      body: JSON.stringify({
        discover_sheets_only: true,
        google_sheet_id: spreadsheetId,
        user_id: userId,
        client_id: clientId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('❌ Tab discovery request failed:', errorText);
      return { data: null, error: errorText };
    }

    const result = await response.json();
    logger.debug('✅ Tab discovery result:', result);
    
    if (result.success && result.sheets) {
      return { data: result.sheets, error: null };
    } else {
      return { data: null, error: result.error || 'Failed to discover tabs' };
    }
    
  } catch (error) {
    logger.error('❌ Tab discovery error:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};