/**
 * Database Module - Legacy Compatibility Layer
 * This file maintains backward compatibility while using the new modular structure
 */

// Re-export everything from the new modular database structure
export * from './database/index';

// Explicitly export types for compatibility
export type { SyncStatus, SyncStatusUpdate } from './database/index';

// Legacy compatibility - maintain exact same exports as before
export {
  // Core functions
  clearRequestCache,
  clearBrandSettingsCache,
  forceReloadAllData,
  enableCacheBypass,
  disableCacheBypass,
  clearAllCachesAndReload,

  // Session management
  getCurrentUserSession,
  getCurrentAuthenticatedUser,

  // Brand settings
  getBrandSettings,

  // User management
  getUserRole,
  getUserClientAccess,
  getUserRoleAndPermissions,
  ensureUserProfile,

  // Client management
  getClients,
  getClientById,
  getClientName,
  addClient,
  updateClient,
  deleteClient,
  getClientAccess,
  grantClientAccess,
  updateClientAccess,
  revokeClientAccess,
  canAccessClient,
  getClientTabs,
  createClientTab,
  updateClientTab,
  deleteClientTab,
  assignClientOwnership,
  assignAllUnownedClients,
  getClientDataSources,
  createGoogleSheetsDataSources,
  deleteDataSource,

  // Metrics management
  getMetricEntries,
  getAllMetricEntries,
  getTodayMetrics,
  getRecentMetrics,
  addMetricEntry,
  updateMetricEntry,
  deleteMetricEntry,
  getStaffMetricConfigurations,
  getConfiguredMetricEntries,
  deleteStaffMetricConfiguration,
  deleteMetricConfiguration,
  getDiscoveredMetrics,
  cleanupOrphanedMetricEntries,
  cleanupDuplicatedMetricsBeforeSync,
  getOptimizedDashboardData,
  getHierarchicalDataStructure,

  // Goals management
  getClientGoals,
  updateClientGoals,
  calculateGoalProgress,
  isOverTarget,
  getProgressColor,

  // Sync functions
  testGoogleSheetsAccess,
  syncGoogleSheetsStaff,
  syncGoogleSheetsUndeniable,
  discoverGoogleSheetsTabs,
  updateClientSyncStatus,
  getClientSyncStatus,
  updateStaffSyncStatus,
  updateUndeniableSyncStatus,
  getUndeniableSyncStatus,
} from "./database/index";