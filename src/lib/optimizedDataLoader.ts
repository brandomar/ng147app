import { supabase } from './supabase';
import { logger } from './logger';
import { getAccessibleClients } from './database/permissions';
import { MetricEntry, TimeFrame, Client } from '../types';

// Request cache to prevent duplicate API calls
const requestCache = new Map<string, { data: any; timestamp: number; promise?: Promise<any> }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache for user permissions and client access
const userPermissionsCache = new Map<string, { data: any; timestamp: number }>();
const clientAccessCache = new Map<string, { data: any; timestamp: number }>();

interface OptimizedDataLoader {
  // Batch load all dashboard data
  loadDashboardData: (userId: string, clientId?: string) => Promise<{
    userPermissions: any;
    clientAccess: any;
    brandSettings: any;
    notifications: any;
    metrics: MetricEntry[];
    clients: Client[];
  }>;
  
  // Load metrics with pagination
  loadMetricsPaginated: (userId: string, clientId?: string, page?: number, limit?: number) => Promise<{
    data: MetricEntry[];
    hasMore: boolean;
    total: number;
  }>;
  
  // Clear caches
  clearCache: () => void;
  clearUserCache: (userId: string) => void;
}

/**
 * Optimized data loader that implements:
 * - Request deduplication
 * - Intelligent caching
 * - Batch loading
 * - Pagination
 */
export const optimizedDataLoader: OptimizedDataLoader = {
  
  /**
   * Load all dashboard data in a single optimized batch
   */
  async loadDashboardData(userId: string, clientId?: string) {
    const cacheKey = `dashboard_${userId}_${clientId || 'staff'}`;
    
    // Check cache first
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      logger.debug('📊 Using cached dashboard data');
      return cached.data;
    }

    // If there's already a request in progress, wait for it
    if (cached?.promise) {
      logger.debug('📊 Waiting for existing dashboard data request');
      return await cached.promise;
    }

    // Create new request
    const requestPromise = this._loadDashboardDataInternal(userId, clientId);
    requestCache.set(cacheKey, { 
      data: null, 
      timestamp: Date.now(), 
      promise: requestPromise 
    });

    try {
      const result = await requestPromise;
      requestCache.set(cacheKey, { 
        data: result, 
        timestamp: Date.now() 
      });
      return result;
    } catch (error) {
      requestCache.delete(cacheKey);
      throw error;
    }
  },

  /**
   * Internal method to load dashboard data with optimized queries
   */
  async _loadDashboardDataInternal(userId: string, clientId?: string) {
    logger.debug('🚀 Loading dashboard data with optimizations:', { userId, clientId });

    const startTime = Date.now();

    // Batch all database queries in parallel
    const [
      userPermissions,
      clientAccess,
      brandSettings,
      notifications,
      metrics,
      clients
    ] = await Promise.all([
      this._getUserPermissions(userId),
      this._getClientAccess(userId),
      this._getBrandSettings(),
      this._getNotifications(userId),
      this._getMetricsOptimized(userId, clientId),
      this._getAccessibleClients(userId)
    ]);

    const loadTime = Date.now() - startTime;
    logger.debug('✅ Dashboard data loaded in parallel:', { 
      loadTime: `${loadTime}ms`,
      metricsCount: metrics.length,
      clientsCount: clients.length
    });

    return {
      userPermissions,
      clientAccess,
      brandSettings,
      notifications,
      metrics,
      clients
    };
  },

  /**
   * Load metrics with pagination to avoid large payloads
   */
  async loadMetricsPaginated(userId: string, clientId?: string, page = 0, limit = 100) {
    const offset = page * limit;
    const cacheKey = `metrics_${userId}_${clientId || 'staff'}_${page}_${limit}`;
    
    // Check cache
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      let query = supabase
        .from('metrics')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (clientId && clientId !== 'undefined') {
        query = query.eq('client_id', clientId);
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('❌ Error loading paginated metrics:', error);
        return { data: [], hasMore: false, total: 0 };
      }

      const result = {
        data: data || [],
        hasMore: (count || 0) > offset + limit,
        total: count || 0
      };

      // Cache the result
      requestCache.set(cacheKey, { 
        data: result, 
        timestamp: Date.now() 
      });

      return result;
    } catch (error) {
      logger.error('❌ Exception loading paginated metrics:', error);
      return { data: [], hasMore: false, total: 0 };
    }
  },

  /**
   * Get user permissions with caching
   */
  async _getUserPermissions(userId: string) {
    const cacheKey = `permissions_${userId}`;
    const cached = userPermissionsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Get user role from new permission system
      const { data: userroles, error } = await supabase
        .from('userroles')
        .select('roles(name), is_global')
        .eq('user_id', userId);

      if (error) {
        logger.error('❌ Error loading user permissions:', error);
        return null;
      }

      // Use new role names directly
      const globalRole = userroles?.find(role => role.is_global) || userroles?.[0];
      const result = globalRole ? { role: globalRole.roles?.name || 'client' } : { role: 'client' };
      
      userPermissionsCache.set(cacheKey, { 
        data: result, 
        timestamp: Date.now() 
      });

      return result;
    } catch (error) {
      logger.error('❌ Exception loading user permissions:', error);
      return null;
    }
  },

  /**
   * Get client access with caching
   */
  async _getClientAccess(userId: string) {
    const cacheKey = `client_access_${userId}`;
    const cached = clientAccessCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const result = await getAccessibleClients(userId);
      
      if (result.error) {
        logger.error('❌ Error loading client access:', result.error);
        return [];
      }

      const clientAccess = result.data || [];
      clientAccessCache.set(cacheKey, { 
        data: clientAccess, 
        timestamp: Date.now() 
      });

      return clientAccess;
    } catch (error) {
      logger.error('❌ Exception loading client access:', error);
      return [];
    }
  },

  /**
   * Get brand settings with caching
   */
  async _getBrandSettings() {
    const cacheKey = 'brand_settings';
    const cached = requestCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase
        .from('brand_settings')
        .select('*')
        .single();

      if (error) {
        logger.error('❌ Error loading brand settings:', error);
        return null;
      }

      const result = data;
      requestCache.set(cacheKey, { 
        data: result, 
        timestamp: Date.now() 
      });

      return result;
    } catch (error) {
      logger.error('❌ Exception loading brand settings:', error);
      return null;
    }
  },

  /**
   * Get notifications with caching
   */
  async _getNotifications(userId: string) {
    const cacheKey = `notifications_${userId}`;
    const cached = requestCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        logger.error('❌ Error loading notifications:', error);
        return [];
      }

      const result = data || [];
      requestCache.set(cacheKey, { 
        data: result, 
        timestamp: Date.now() 
      });

      return result;
    } catch (error) {
      logger.error('❌ Exception loading notifications:', error);
      return [];
    }
  },

  /**
   * Get metrics with optimized query
   * IMPORTANT: No limit - we need ALL metrics from ALL tabs for proper aggregation
   */
  async _getMetricsOptimized(userId: string, clientId?: string) {
    try {
      let query = supabase
        .from('metrics')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
        // NO LIMIT - we need all metrics from all tabs to aggregate properly

      if (clientId && clientId !== 'undefined') {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('❌ Error loading metrics:', error);
        return [];
      }

      // Log comprehensive details about what we loaded
      const uniqueSheets = [...new Set(data?.map(m => m.sheet_name).filter(Boolean))];
      const uniqueTabs = [...new Set(data?.map(m => m.tab_name).filter(Boolean))];
      const uniqueMetrics = [...new Set(data?.map(m => m.metric_name).filter(Boolean))];
      
      logger.info('📊 Metrics loaded from database:', {
        totalMetrics: data?.length || 0,
        uniqueSheets: uniqueSheets.length,
        uniqueTabs: uniqueTabs.length,
        uniqueMetricNames: uniqueMetrics.length,
        sheets: uniqueSheets,
        tabs: uniqueTabs,
        sampleMetrics: data?.slice(0, 3).map(m => ({
          metric_name: m.metric_name,
          sheet_name: m.sheet_name,
          tab_name: m.tab_name,
          date: m.date,
          value: m.value
        }))
      });

      return data || [];
    } catch (error) {
      logger.error('❌ Exception loading metrics:', error);
      return [];
    }
  },

  /**
   * Get accessible clients
   */
  async _getAccessibleClients(userId: string) {
    try {
      const { data, error } = await supabase.rpc("get_accessible_clients", {
        p_user_id: userId,
      });

      if (error) {
        logger.error('❌ Error loading accessible clients:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('❌ Exception loading accessible clients:', error);
      return [];
    }
  },

  /**
   * Clear all caches
   */
  clearCache() {
    requestCache.clear();
    userPermissionsCache.clear();
    clientAccessCache.clear();
    logger.debug('🧹 All caches cleared');
  },

  /**
   * Clear cache for specific user
   */
  clearUserCache(userId: string) {
    // Clear user-specific caches
    for (const [key] of requestCache) {
      if (key.includes(userId)) {
        requestCache.delete(key);
      }
    }
    
    userPermissionsCache.delete(`permissions_${userId}`);
    clientAccessCache.delete(`client_access_${userId}`);
    
    logger.debug('🧹 User cache cleared:', { userId });
  },

  /**
   * Invalidate specific cache entry
   */
  invalidateCache(cacheKey: string) {
    requestCache.delete(cacheKey);
    logger.debug('🧹 Cache invalidated:', { cacheKey });
  }
};

export default optimizedDataLoader;
