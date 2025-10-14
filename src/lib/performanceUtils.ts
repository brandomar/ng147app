import { logger } from './logger';

/**
 * Simple Performance Utilities
 * Focused on the core performance issues identified in the HAR file
 */

// Simple request cache to prevent duplicate API calls
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Cache a request result to prevent duplicate calls
 */
export const cacheRequest = (key: string, data: any) => {
  requestCache.set(key, { data, timestamp: Date.now() });
  logger.debug('💾 Cached request:', key);
};

/**
 * Get cached request result if still valid
 */
export const getCachedRequest = (key: string) => {
  const cached = requestCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logger.debug('📊 Using cached request:', key);
    return cached.data;
  }
  return null;
};

/**
 * Clear cache for a specific key
 */
export const clearCachedRequest = (key: string) => {
  requestCache.delete(key);
  logger.debug('🧹 Cleared cache for:', key);
};

/**
 * Clear all caches
 */
export const clearAllCaches = () => {
  requestCache.clear();
  logger.info('🧹 All caches cleared');
};

/**
 * Measure performance of a function
 */
export const measurePerformance = async <T>(
  fn: () => Promise<T>, 
  operation: string
): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  
  logger.debug(`⏱️ ${operation}: ${duration.toFixed(2)}ms`);
  
  if (duration > 1000) {
    logger.warn(`🐌 Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`);
  }
  
  return { result, duration };
};

/**
 * Batch multiple API calls into a single Promise.all
 */
export const batchApiCalls = async <T>(
  calls: (() => Promise<T>)[], 
  operation: string
): Promise<T[]> => {
  const start = performance.now();
  
  try {
    const results = await Promise.all(calls.map(call => call()));
    const duration = performance.now() - start;
    
    logger.debug(`🚀 Batched ${calls.length} API calls for ${operation}: ${duration.toFixed(2)}ms`);
    
    return results;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error(`❌ Batched API calls failed for ${operation} after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
};

/**
 * Get performance metrics
 */
export const getPerformanceMetrics = () => {
  return {
    cacheSize: requestCache.size,
    cacheKeys: Array.from(requestCache.keys()),
    cacheDuration: CACHE_DURATION
  };
};

export const performanceUtils = {
  cacheRequest,
  getCachedRequest,
  clearCachedRequest,
  clearAllCaches,
  measurePerformance,
  batchApiCalls,
  getPerformanceMetrics
};

export default performanceUtils;
