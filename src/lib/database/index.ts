/**
 * Database Module Index
 * Centralized exports for all database operations
 */

// ===== CORE FUNCTIONS =====
export {
  clearRequestCache,
  clearBrandSettingsCache,
  forceReloadAllData,
  getCurrentUserSession,
  getCurrentAuthenticatedUser,
  getBrandSettings,
  enableCacheBypass,
  disableCacheBypass,
  clearAllCachesAndReload
} from './core';

// ===== USER MANAGEMENT =====
export {
  getUserRole,
  getUserClientAccess,
  getUserRoleAndPermissions,
  ensureUserProfile
} from './users';

// ===== PERMISSIONS MANAGEMENT =====
export {
  getUserPermissions,
  hasPermission,
  getUserRoles,
  isGlobalAdmin,
  canAccessClient,
  getAccessibleClients,
  getUserProfile,
  updateUserProfile,
  createUserProfile,
  getAllRoles,
  assignUserRole,
  removeUserRole
} from './permissions';

// ===== CLIENT MANAGEMENT =====
export {
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
  getClientTabs,
  createClientTab,
  updateClientTab,
  deleteClientTab,
  assignClientOwnership,
  assignAllUnownedClients,
  getClientDataSources,
  createGoogleSheetsDataSources,
  deleteDataSource
} from './clients';

// ===== METRICS MANAGEMENT =====
export {
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
  getHierarchicalDataStructure
} from './metrics';

// ===== SYNC FUNCTIONS =====
export {
  updateClientSyncStatus,
  getClientSyncStatus,
  updateStaffSyncStatus,
  updateUndeniableSyncStatus,
  getUndeniableSyncStatus,
  testGoogleSheetsAccess,
  syncGoogleSheetsStaff,
  syncGoogleSheetsUndeniable,
  discoverGoogleSheetsTabs
} from './sync';

// ===== SYNC TYPES =====
export type { SyncStatus, SyncStatusUpdate } from './sync';

// ===== SECURITY VALIDATION =====
export {
  validateSecurityCohesion,
  validateUserAccess,
  getSecurityReport
} from './securityValidation';

// ===== GOALS MANAGEMENT =====
export {
  getClientGoals,
  updateClientGoals,
  calculateGoalProgress,
  isOverTarget,
  getProgressColor
} from './goals';

export type { MonthlyTargets, GoalsConfig } from './goals';

// ===== LEGACY COMPATIBILITY =====
// Re-export commonly used functions with their original names for backward compatibility
export { getMetricEntries as getRoleBasedMetrics } from './metrics';
