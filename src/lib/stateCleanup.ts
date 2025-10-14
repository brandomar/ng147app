/**
 * State Cleanup Utilities
 * 
 * This file contains utilities to clean up fragmented localStorage usage
 * and migrate to the centralized context system.
 */

export const CLEANUP_KEYS = {
  // Staff dashboard keys
  STAFF_GOOGLE_SHEET_ID: 'staff_google_sheet_id',
  STAFF_SHEET_NAME: 'staff_sheet_name',
  STAFF_AVAILABLE_SHEETS: 'staff_available_sheets_',
  STAFF_SELECTED_SHEETS: 'staff_selected_sheets_',
  
  // Client dashboard keys
  CLIENT_SELECTED_SHEETS: 'client_selected_sheets',
  CLIENT_SYNC_STATUS: 'client_sync_status_',
  
  // Temporary keys
  TEMP_SPREADSHEET_CONFIG: 'temp_spreadsheet_config_temp',
} as const;

/**
 * Clean up all fragmented localStorage entries
 */
export const cleanupFragmentedStorage = () => {
  const keysToRemove: string[] = [];
  
  // Get all localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      // Check if this key should be cleaned up
      if (
        key === CLEANUP_KEYS.STAFF_GOOGLE_SHEET_ID ||
        key === CLEANUP_KEYS.STAFF_SHEET_NAME ||
        key.startsWith(CLEANUP_KEYS.STAFF_AVAILABLE_SHEETS) ||
        key.startsWith(CLEANUP_KEYS.STAFF_SELECTED_SHEETS) ||
        key.startsWith(CLEANUP_KEYS.CLIENT_SYNC_STATUS) ||
        key === CLEANUP_KEYS.CLIENT_SELECTED_SHEETS ||
        key === CLEANUP_KEYS.TEMP_SPREADSHEET_CONFIG
      ) {
        keysToRemove.push(key);
      }
    }
  }
  
  // Remove the keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`🧹 Cleaned up localStorage key: ${key}`);
  });
  
  console.log(`✅ Cleaned up ${keysToRemove.length} fragmented localStorage entries`);
  return keysToRemove;
};

/**
 * Migrate existing localStorage data to context format
 */
export const migrateToContextFormat = () => {
  const migrationData = {
    staff: {
      googleSheetId: localStorage.getItem(CLEANUP_KEYS.STAFF_GOOGLE_SHEET_ID) || '',
      sheetName: localStorage.getItem(CLEANUP_KEYS.STAFF_SHEET_NAME) || '',
      availableSheets: [] as string[],
      selectedSheets: new Set<string>()
    },
    client: {
      selectedSheets: new Set<string>()
    }
  };
  
  // Migrate staff available sheets
  const staffSheetId = migrationData.staff.googleSheetId;
  if (staffSheetId) {
    const availableSheetsKey = `${CLEANUP_KEYS.STAFF_AVAILABLE_SHEETS}${staffSheetId}`;
    const selectedSheetsKey = `${CLEANUP_KEYS.STAFF_SELECTED_SHEETS}${staffSheetId}`;
    
    try {
      const availableSheets = localStorage.getItem(availableSheetsKey);
      if (availableSheets) {
        migrationData.staff.availableSheets = JSON.parse(availableSheets);
      }
      
      const selectedSheets = localStorage.getItem(selectedSheetsKey);
      if (selectedSheets) {
        migrationData.staff.selectedSheets = new Set(JSON.parse(selectedSheets));
      }
    } catch (error) {
      console.warn('Failed to migrate staff sheet data:', error);
    }
  }
  
  // Migrate client selected sheets
  try {
    const clientSelectedSheets = localStorage.getItem(CLEANUP_KEYS.CLIENT_SELECTED_SHEETS);
    if (clientSelectedSheets) {
      migrationData.client.selectedSheets = new Set(JSON.parse(clientSelectedSheets));
    }
  } catch (error) {
    console.warn('Failed to migrate client sheet data:', error);
  }
  
  console.log('📦 Migration data prepared:', migrationData);
  return migrationData;
};

/**
 * Complete migration and cleanup process
 */
export const performStateMigration = () => {
  console.log('🚀 Starting state migration and cleanup...');
  
  // Step 1: Migrate existing data
  const migrationData = migrateToContextFormat();
  
  // Step 2: Clean up fragmented storage
  const cleanedKeys = cleanupFragmentedStorage();
  
  // Step 3: Keep only essential keys
  const essentialKeys = [
    CLEANUP_KEYS.STAFF_GOOGLE_SHEET_ID,
    CLEANUP_KEYS.STAFF_SHEET_NAME
  ];
  
  console.log('✅ State migration completed');
  console.log(`📊 Migration data:`, migrationData);
  console.log(`🧹 Cleaned keys:`, cleanedKeys);
  console.log(`🔑 Essential keys preserved:`, essentialKeys);
  
  return {
    migrationData,
    cleanedKeys,
    essentialKeys
  };
};
