/**
 * Core Database Functions
 * Essential database operations, caching, and session management
 */

import { supabase } from '../supabase';
import { logger } from '../logger';

// ===== CACHE MANAGEMENT =====
const requestCache = new Map<string, { data: any; timestamp: number; promise?: Promise<any> }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Global request deduplication to prevent duplicate API calls
const activeRequests = new Map<string, Promise<any>>();

export const clearRequestCache = () => {
  requestCache.clear();
  activeRequests.clear();
  logger.debug('🧹 Request cache and active requests cleared');
};

export const clearBrandSettingsCache = () => {
  // Clear brand settings from global cache
  logger.debug('🧹 Brand settings cache cleared');
};

export const forceReloadAllData = () => {
  clearRequestCache();
  logger.info('🔄 Forcing reload of all data');
};

// ===== SESSION MANAGEMENT =====
export const getCurrentUserSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { session, error: null };
  } catch (error) {
    logger.error('❌ Error getting current session:', error);
    return { session: null, error };
  }
};

export const getCurrentAuthenticatedUser = async () => {
  const { session, error } = await getCurrentUserSession();
  if (error) return { user: null, error };
  return { user: session?.user || null, error: null };
};

// ===== BRAND SETTINGS =====
export const getBrandSettings = async (): Promise<{ data: any | null; error: any }> => {
  const cacheKey = 'brand_settings_global';
  
  // Check if request is already in progress
  if (activeRequests.has(cacheKey)) {
    logger.debug('🔄 Brand settings request already in progress, waiting...');
    return await activeRequests.get(cacheKey)!;
  }
  
  if (requestCache.has(cacheKey)) {
    const cached = requestCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      logger.debug('📦 Using cached brand settings');
      return { data: cached.data, error: null };
    }
  }

  // Create the request promise and store it
  const requestPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('brand_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('0 rows') || error.code === 'PGRST301') {
          logger.debug('🎨 No brand settings found in database, using defaults');
          return { data: null, error: null };
        } else {
          logger.warn('⚠️ Brand settings query failed:', error);
          // Return null data instead of error to prevent retries
          return { data: null, error: null };
        }
      }

      if (!data) {
        logger.warn('⚠️ No brand settings found in database');
        return { data: null, error: null };
      }

      // Cache the result
      requestCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return { data, error: null };
    } catch (error) {
      logger.error('❌ Error in getBrandSettings:', error);
      return { data: null, error };
    } finally {
      // Remove from active requests when done
      activeRequests.delete(cacheKey);
    }
  })();

  // Store the promise to prevent duplicate requests
  activeRequests.set(cacheKey, requestPromise);
  
  return await requestPromise;
};

// ===== UTILITY FUNCTIONS =====
export const enableCacheBypass = () => {
  // Disable cache bypass in production for security
  if (import.meta.env.PROD) {
    logger.warn('🚫 Cache bypass disabled in production');
    return;
  }
  localStorage.setItem('bypass_dashboard_cache', 'true');
  logger.debug('🔧 Cache bypass enabled');
};

export const disableCacheBypass = () => {
  // Disable cache bypass in production for security
  if (import.meta.env.PROD) {
    logger.warn('🚫 Cache bypass disabled in production');
    return;
  }
  localStorage.removeItem('bypass_dashboard_cache');
  logger.debug('🔧 Cache bypass disabled');
};

export const clearAllCachesAndReload = () => {
  // Clear all database caches
  clearRequestCache();
  clearBrandSettingsCache();
  logger.info('🧹 All caches cleared and data reloaded');
};
