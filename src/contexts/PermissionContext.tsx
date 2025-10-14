/**
 * Permission Context
 * Centralized permission management using the new normalized schema
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { logger } from '../lib/logger';
import { useAuth } from './AuthContext';
import { 
  getUserPermissions, 
  getUserRoles, 
  isGlobalAdmin as checkIsGlobalAdmin, 
  canAccessClient,
  getAccessibleClients,
  RolePermissions,
  UserRole
} from '../lib/database/permissions';

// ===== TYPES =====

interface PermissionContextType {
  // Permission data
  permissions: RolePermissions | null;
  roles: UserRole[];
  isGlobalAdmin: boolean;
  
  // Permission checking functions
  hasPermission: (permission: keyof RolePermissions) => boolean;
  canAccessClient: (clientId: string) => boolean;
  
  // Accessible data
  accessibleClients: any[];
  
  // Loading and error states
  loading: boolean;
  error: string | null;
  
  // Actions
  refresh: () => Promise<void>;
  checkPermission: (permission: keyof RolePermissions) => Promise<boolean>;
  checkClientAccess: (clientId: string) => Promise<boolean>;
}

// ===== CONTEXT =====

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

// ===== PROVIDER =====

interface PermissionProviderProps {
  children: ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const { user } = useAuth();
  
  // State
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [accessibleClients, setAccessibleClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== PERMISSION LOADING =====

  const loadPermissions = useCallback(async () => {
    if (!user?.id) {
      setPermissions(null);
      setRoles([]);
      setIsGlobalAdmin(false);
      setAccessibleClients([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.debug('🔐 Loading permissions for user:', { userId: user.id });

      // Load permissions, roles, and client access in parallel
      const [
        permissionsResult,
        rolesResult,
        globalAdminResult,
        clientsResult
      ] = await Promise.all([
        getUserPermissions(user.id),
        getUserRoles(user.id),
        checkIsGlobalAdmin(user.id),
        getAccessibleClients(user.id)
      ]);

      // Handle permissions
      if (permissionsResult.error) {
        logger.error('❌ Error loading permissions:', permissionsResult.error);
        setError(permissionsResult.error.message || 'Failed to load permissions');
      } else {
        setPermissions(permissionsResult.data);
      }

      // Handle roles
      if (rolesResult.error) {
        logger.error('❌ Error loading roles:', rolesResult.error);
        setError(rolesResult.error.message || 'Failed to load roles');
      } else {
        setRoles(rolesResult.data || []);
      }

      // Handle global admin status
      if (globalAdminResult.error) {
        logger.error('❌ Error checking global admin status:', globalAdminResult.error);
      } else {
        setIsGlobalAdmin(globalAdminResult.data);
      }

      // Handle accessible clients
      if (clientsResult.error) {
        logger.error('❌ Error loading accessible clients:', clientsResult.error);
      } else {
        setAccessibleClients(clientsResult.data || []);
      }

      logger.debug('✅ Permissions loaded successfully:', {
        userId: user.id,
        hasPermissions: !!permissionsResult.data,
        rolesCount: rolesResult.data?.length || 0,
        isGlobalAdmin: globalAdminResult.data,
        clientsCount: clientsResult.data?.length || 0
      });

    } catch (error) {
      logger.error('❌ Exception loading permissions:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ===== PERMISSION CHECKING FUNCTIONS =====

  const hasPermission = useCallback(
    (permission: keyof RolePermissions): boolean => {
      // Global admins have all permissions
      if (isGlobalAdmin) return true;

      // Check specific permissions
      if (!permissions) return false;
      return permissions[permission] === true;
    },
    [permissions, isGlobalAdmin]
  );

  const canAccessClient = useCallback((clientId: string): boolean => {
    if (isGlobalAdmin) return true;
    return accessibleClients.some(client => client.client_id === clientId);
  }, [isGlobalAdmin, accessibleClients]);

  // ===== ASYNC PERMISSION CHECKING =====

  const checkPermission = useCallback(async (permission: keyof RolePermissions): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { hasPermission: checkPermission } = await import('../lib/database/permissions');
      const result = await checkPermission(user.id, permission);
      return result.data || false;
    } catch (error) {
      logger.error('❌ Error checking permission:', error);
      return false;
    }
  }, [user?.id]);

  const checkClientAccess = useCallback(async (clientId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { canAccessClient: checkClientAccess } = await import('../lib/database/permissions');
      const result = await checkClientAccess(user.id, clientId);
      return result.data || false;
    } catch (error) {
      logger.error('❌ Error checking client access:', error);
      return false;
    }
  }, [user?.id]);

  // ===== REFRESH FUNCTION =====

  const refresh = useCallback(async () => {
    await loadPermissions();
  }, [loadPermissions]);

  // ===== EFFECTS =====

  // Load permissions when user changes
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // ===== CONTEXT VALUE =====

  const value: PermissionContextType = {
    // Permission data
    permissions,
    roles,
    isGlobalAdmin,
    
    // Permission checking functions
    hasPermission,
    canAccessClient,
    
    // Accessible data
    accessibleClients,
    
    // Loading and error states
    loading,
    error,
    
    // Actions
    refresh,
    checkPermission,
    checkClientAccess
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

// ===== HOOK =====

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

// ===== CONVENIENCE HOOKS =====

/**
 * Hook to check if user has a specific permission
 */
export const useHasPermission = (permission: keyof RolePermissions): boolean => {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
};

/**
 * Hook to check if user can access a specific client
 */
export const useCanAccessClient = (clientId: string): boolean => {
  const { canAccessClient } = usePermissions();
  return canAccessClient(clientId);
};

/**
 * Hook to check if user is a global admin
 */
export const useIsGlobalAdmin = (): boolean => {
  const { isGlobalAdmin } = usePermissions();
  return isGlobalAdmin;
};

/**
 * Hook to get accessible clients
 */
export const useAccessibleClients = (): any[] => {
  const { accessibleClients } = usePermissions();
  return accessibleClients;
};
