/**
 * User Management Functions
 * Updated to use new permission system only
 */

import { supabase } from '../supabase';
import { logger } from '../logger';
import {
  getUserPermissions,
  getUserRoles,
  isGlobalAdmin,
  getUserProfile,
  canAccessClient,
  getAccessibleClients,
} from "./permissions";

// ===== USER ROLE & PERMISSIONS (NEW SYSTEM ONLY) =====
export const getUserRole = async (userId: string) => {
  try {
    // Use new permission system to get user roles
    const rolesResult = await getUserRoles(userId);
    if (rolesResult.error) {
      return { data: null, error: rolesResult.error };
    }

    // Use new role names directly
    const roles = rolesResult.data || [];
    const primaryRole = roles.find(role => role.is_global) || roles[0];
    
    if (!primaryRole) {
      return { data: { role: 'client' }, error: null };
    }

    return { 
      data: { 
        role: primaryRole.role_name || 'client' 
      }, 
      error: null 
    };
  } catch (error) {
    logger.error('Error in getUserRole:', error);
    return { data: null, error };
  }
};

export const getUserClientAccess = async (userId: string) => {
  try {
    // Use new permission system to get accessible clients
    const clientsResult = await getAccessibleClients(userId);
    if (clientsResult.error) {
      return { data: null, error: clientsResult.error };
    }

    // Map to legacy format for backward compatibility
    const clientAccess = clientsResult.data?.map(clientId => ({
      client_id: clientId,
      access_level: 'viewer' // Default access level
    })) || [];

    return { data: clientAccess, error: null };
  } catch (error) {
    logger.error('Error in getUserClientAccess:', error);
    return { data: null, error };
  }
};

export const getUserRoleAndPermissions = async (userId: string) => {
  try {
    // Use new permission system
    const permissionsResult = await getUserPermissions(userId);
    if (permissionsResult.error) {
      return { data: null, error: permissionsResult.error };
    }

    const permissions = permissionsResult.data;
    const isGlobalAdminResult = await isGlobalAdmin(userId);
    const isGlobalAdmin = isGlobalAdminResult.data || false;

    // Return new role names directly
    return {
      data: {
        role: isGlobalAdmin ? 'admin' : 'staff',
        permissions: {
          isAdmin: isGlobalAdmin,
          isStaff: !isGlobalAdmin,
          canManageUsers: permissions?.canManageUsers || false,
          canManageClients: permissions?.canManageClients || false,
          canViewAllData: permissions?.canViewAllData || false
        }
      },
      error: null
    };
  } catch (error) {
    logger.error('Error in getUserRoleAndPermissions:', error);
    return { data: null, error };
  }
};

// ===== USER PROFILE MANAGEMENT =====
export const ensureUserProfile = async (userId: string) => {
  try {
    // Check if profile exists
    const profileResult = await getUserProfile(userId);
    
    if (profileResult.error && profileResult.error.code !== 'PGRST116') {
      return { data: null, error: profileResult.error };
    }
    
    if (profileResult.data) {
      return { data: profileResult.data, error: null };
    }
    
    // Profile doesn't exist, but we can't create it here without user data
    // This should be handled by the AuthContext during sign-in
    return { data: null, error: { message: 'Profile not found' } };
  } catch (error) {
    logger.error('Error in ensureUserProfile:', error);
    return { data: null, error };
  }
};

// ===== EXPORTS =====
// Re-export new permission system functions for convenience
export {
  getUserPermissions,
  getUserRoles,
  isGlobalAdmin,
  getUserProfile,
  canAccessClient,
  getAccessibleClients,
} from "./permissions";