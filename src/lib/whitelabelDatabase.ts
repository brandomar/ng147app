/**
 * Whitelabel Database Service Layer
 * 
 * This module provides whitelabel-aware database functions that use
 * brand configuration instead of hardcoded names.
 */

import { supabase } from './supabase';
import { logger } from './logger';
import { BRAND_CONFIG } from '../config/branding';
import { useBrand } from '../contexts/BrandContext';

/**
 * Whitelabel-aware sync function
 * Uses brand configuration to determine function name
 */
export const syncGoogleSheets = async (
  userId: string, 
  googleSheetId: string, 
  sheetName?: string, 
  selectedTabs?: Array<{name: string, gid: string, url: string}>
) => {
  logger.debug('🔧 Whitelabel sync function called');
  
  // Use brand configuration to determine function name
  const functionName = BRAND_CONFIG.functions.syncGoogleSheets;
  
  // For now, we'll use the existing function but with dynamic naming
  // In a full implementation, you'd call the appropriate function based on config
  if (functionName === 'syncGoogleSheetsAdmin') {
    // Import and call the existing function
    const { syncGoogleSheetsAdmin } = await import('./database');
    return await syncGoogleSheetsAdmin(userId, googleSheetId, sheetName, selectedTabs);
  }
  
  // Add other function mappings as needed
  throw new Error(`Unsupported sync function: ${functionName}`);
};

/**
 * Whitelabel-aware sync status function
 */
export const getSyncStatus = async (userId: string, googleSheetId: string) => {
  logger.debug('🔧 Whitelabel get sync status called');
  
  const functionName = BRAND_CONFIG.functions.getSyncStatus;
  
  if (functionName === 'getAdminSyncStatus') {
    const { getAdminSyncStatus } = await import('./database');
    return await getAdminSyncStatus(userId, googleSheetId);
  }
  
  throw new Error(`Unsupported sync status function: ${functionName}`);
};

/**
 * Whitelabel-aware update sync status function
 */
export const updateSyncStatus = async (
  userId: string, 
  googleSheetId: string, 
  sheetName: string, 
  status: string, 
  message?: string
) => {
  logger.debug('🔧 Whitelabel update sync status called');
  
  const functionName = BRAND_CONFIG.functions.updateSyncStatus;
  
  if (functionName === 'updateAdminSyncStatus') {
    const { updateAdminSyncStatus } = await import('./database');
    return await updateAdminSyncStatus(userId, googleSheetId, sheetName, status, message);
  }
  
  throw new Error(`Unsupported update sync status function: ${functionName}`);
};

/**
 * Whitelabel-aware metric configurations function
 */
export const getMetricConfigurations = async (userId: string, sheetName?: string) => {
  logger.debug('🔧 Whitelabel get metric configurations called');
  
  const functionName = BRAND_CONFIG.functions.getMetricConfigurations;
  
  if (functionName === 'getAdminMetricConfigurations') {
    const { getAdminMetricConfigurations } = await import('./database');
    return await getAdminMetricConfigurations(userId, sheetName);
  }
  
  throw new Error(`Unsupported metric configurations function: ${functionName}`);
};

/**
 * Whitelabel-aware role checking
 */
export const isAdminRole = (role: string): boolean => {
  return role === BRAND_CONFIG.roles.admin;
};

export const isStaffRole = (role: string): boolean => {
  return role === BRAND_CONFIG.roles.staff || role === BRAND_CONFIG.roles.admin;
};

export const isClientRole = (role: string): boolean => {
  return role === BRAND_CONFIG.roles.client;
};

/**
 * Whitelabel-aware section names
 */
export const getAdminSection = (): string => {
  return 'admin';
};

export const getClientSection = (): string => {
  return 'client';
};

/**
 * Whitelabel-aware UI text
 */
export const getAdminDashboardTitle = (): string => {
  return BRAND_CONFIG.applicationName;
};

export const getCompanyName = (): string => {
  return BRAND_CONFIG.companyName;
};

/**
 * Whitelabel-aware client type options
 */
export const getClientTypeOptions = () => {
  return [
    { value: 'client', label: 'External Client' },
    { value: BRAND_CONFIG.roles.admin, label: `${BRAND_CONFIG.companyName} Company` },
  ];
};

/**
 * Whitelabel-aware sheet type mapping
 */
export const getSheetTypeForClientType = (clientType: string): string => {
  if (clientType === BRAND_CONFIG.roles.admin) {
    return `${BRAND_CONFIG.roles.admin}-dashboard`;
  }
  return 'client-dashboard';
};

/**
 * Whitelabel-aware company name for admin clients
 */
export const getAdminCompanyName = (): string => {
  return BRAND_CONFIG.companyName;
};

/**
 * Whitelabel-aware company slug for admin clients
 */
export const getAdminCompanySlug = (): string => {
  return BRAND_CONFIG.companySlug;
};
