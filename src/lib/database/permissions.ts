/**
 * Permission Management Service
 * New centralized service for role-based permissions using the normalized schema
 */

import { supabase } from '../supabase';
import { logger } from '../logger';

// ===== TYPES =====

export interface Role {
  id: string;
  name: 'admin' | 'staff' | 'client';
  description: string;
  permissions: RolePermissions;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolePermissions {
  canManageUsers: boolean;
  canManageClients: boolean;
  canManageBranding: boolean;
  canViewAllData: boolean;
  canInviteUsers: boolean;
  canManageRoles: boolean;
  canSyncData: boolean;
  canExportData: boolean;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  client_id: string | null;
  is_global: boolean;
  granted_by: string | null;
  granted_by_email: string | null;
  created_at: string;
  updated_at: string;
  role: Role; // Joined data
}

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ===== CORE PERMISSION FUNCTIONS =====

/**
 * Get user's effective permissions for a specific client (or global)
 */
export const getUserPermissions = async (userId: string, clientId?: string): Promise<{ data: RolePermissions | null; error: any }> => {
  try {
    logger.debug('🔐 Getting user permissions:', { userId, clientId });

    const { data, error } = await supabase.rpc('get_user_permissions', {
      p_user_id: userId,
      p_client_id: clientId || null
    });

    if (error) {
      logger.error('❌ Error getting user permissions:', error);
      return { data: null, error };
    }

    // Convert JSONB to RolePermissions object
    const permissions: RolePermissions = {
      canManageUsers: data?.canManageUsers === true || false,
      canManageClients: data?.canManageClients === true || false,
      canManageBranding: data?.canManageBranding === true || false,
      canViewAllData: data?.canViewAllData === true || false,
      canInviteUsers: data?.canInviteUsers === true || false,
      canManageRoles: data?.canManageRoles === true || false,
      canSyncData: data?.canSyncData === true || false,
      canExportData: data?.canExportData === true || false,
    };

    logger.debug('✅ User permissions retrieved:', { userId, clientId, permissions });
    return { data: permissions, error: null };

  } catch (error) {
    logger.error('❌ Exception in getUserPermissions:', error);
    return { data: null, error };
  }
};

/**
 * Check if user has a specific permission
 */
export const hasPermission = async (userId: string, permission: keyof RolePermissions): Promise<{ data: boolean; error: any }> => {
  try {
    logger.debug('🔐 Checking permission:', { userId, permission });

    const { data, error } = await supabase.rpc('has_permission', {
      p_user_id: userId,
      p_permission: permission
    });

    if (error) {
      logger.error('❌ Error checking permission:', error);
      return { data: false, error };
    }

    const hasPermission = data === true;
    logger.debug('✅ Permission check result:', { userId, permission, hasPermission });
    return { data: hasPermission, error: null };

  } catch (error) {
    logger.error('❌ Exception in hasPermission:', error);
    return { data: false, error };
  }
};

/**
 * Get all roles for a user (global + client-specific)
 */
export const getUserRoles = async (userId: string, clientId?: string): Promise<{ data: UserRole[] | null; error: any }> => {
  try {
    logger.debug("🔐 Getting user roles:", { userId, clientId });

    // Use direct query with proper joins to get the expected structure
    const { data, error } = await supabase
      .from("userroles")
      .select(
        `
        *,
        role:roles(id, name, description, permissions, is_system_role, created_at, updated_at)
      `
      )
      .eq("user_id", userId)
      .order("is_global", { ascending: false }); // Global roles first

    if (error) {
      logger.error("❌ Error getting user roles:", error);
      return { data: null, error };
    }

    logger.debug("✅ User roles retrieved:", {
      userId,
      clientId,
      count: data?.length || 0,
    });
    return { data: data || [], error: null };
  } catch (error) {
    logger.error('❌ Exception in getUserRoles:', error);
    return { data: null, error };
  }
};

/**
 * Check if user is a global admin
 */
export const isGlobalAdmin = async (userId: string): Promise<{ data: boolean; error: any }> => {
  try {
    logger.debug('🔐 Checking if user is global admin:', { userId });

    const { data, error } = await supabase.rpc('is_global_admin', {
      p_user_id: userId
    });

    if (error) {
      logger.error('❌ Error checking global admin status:', error);
      return { data: false, error };
    }

    const isAdmin = data === true;
    logger.debug('✅ Global admin check result:', { userId, isAdmin });
    return { data: isAdmin, error: null };

  } catch (error) {
    logger.error('❌ Exception in isGlobalAdmin:', error);
    return { data: false, error };
  }
};

/**
 * Check if user can access a specific client
 */
export const canAccessClient = async (userId: string, clientId: string): Promise<{ data: boolean; error: any }> => {
  try {
    logger.debug('🔐 Checking client access:', { userId, clientId });

    const { data, error } = await supabase.rpc('can_access_client', {
      p_user_id: userId,
      p_client_id: clientId
    });

    if (error) {
      logger.error('❌ Error checking client access:', error);
      return { data: false, error };
    }

    const canAccess = data === true;
    logger.debug('✅ Client access check result:', { userId, clientId, canAccess });
    return { data: canAccess, error: null };

  } catch (error) {
    logger.error('❌ Exception in canAccessClient:', error);
    return { data: false, error };
  }
};

/**
 * Get all clients accessible to a user
 */
export const getAccessibleClients = async (userId: string): Promise<{ data: any[] | null; error: any }> => {
  try {
    logger.debug('🔐 Getting accessible clients:', { userId });

    const { data, error } = await supabase.rpc('get_accessible_clients', {
      p_user_id: userId
    });

    if (error) {
      logger.error('❌ Error getting accessible clients:', error);
      return { data: null, error };
    }

    logger.debug('✅ Accessible clients retrieved:', { userId, count: data?.length || 0 });
    return { data: data || [], error: null };

  } catch (error) {
    logger.error('❌ Exception in getAccessibleClients:', error);
    return { data: null, error };
  }
};

/**
 * Get user profile from profiles table
 */
export const getUserProfile = async (userId: string): Promise<{ data: UserProfile | null; error: any }> => {
  try {
    logger.debug('🔐 Getting user profile:', { userId });

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        logger.warn('⚠️ No profile found for user:', { userId });
        return { data: null, error: null };
      }
      logger.error('❌ Error getting user profile:', error);
      return { data: null, error };
    }

    logger.debug('✅ User profile retrieved:', { userId, email: data?.email });
    return { data: data, error: null };

  } catch (error) {
    logger.error('❌ Exception in getUserProfile:', error);
    return { data: null, error };
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<{ data: UserProfile | null; error: any }> => {
  try {
    logger.debug('🔐 Updating user profile:', { userId, updates });

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      logger.error('❌ Error updating user profile:', error);
      return { data: null, error };
    }

    logger.debug('✅ User profile updated:', { userId });
    return { data: data, error: null };

  } catch (error) {
    logger.error('❌ Exception in updateUserProfile:', error);
    return { data: null, error };
  }
};

/**
 * Create user profile (for new users)
 */
export const createUserProfile = async (profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: UserProfile | null; error: any }> => {
  try {
    logger.debug('🔐 Creating user profile:', { user_id: profileData.user_id, email: profileData.email });

    const { data, error } = await supabase
      .from('profiles')
      .insert([profileData])
      .select('*')
      .single();

    if (error) {
      logger.error('❌ Error creating user profile:', error);
      return { data: null, error };
    }

    logger.debug('✅ User profile created:', { user_id: profileData.user_id });
    return { data: data, error: null };

  } catch (error) {
    logger.error('❌ Exception in createUserProfile:', error);
    return { data: null, error };
  }
};

// ===== ROLE MANAGEMENT FUNCTIONS =====

/**
 * Get all available roles
 */
export const getAllRoles = async (): Promise<{ data: Role[] | null; error: any }> => {
  try {
    logger.debug('🔐 Getting all roles');

    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');

    if (error) {
      logger.error('❌ Error getting all roles:', error);
      return { data: null, error };
    }

    logger.debug('✅ All roles retrieved:', { count: data?.length || 0 });
    return { data: data || [], error: null };

  } catch (error) {
    logger.error('❌ Exception in getAllRoles:', error);
    return { data: null, error };
  }
};

/**
 * Assign role to user
 */
export const assignUserRole = async (
  userId: string, 
  roleId: string, 
  clientId?: string, 
  isGlobal: boolean = false
): Promise<{ data: UserRole | null; error: any }> => {
  try {
    logger.debug('🔐 Assigning user role:', { userId, roleId, clientId, isGlobal });

    const roleData = {
      user_id: userId,
      role_id: roleId,
      client_id: isGlobal ? null : clientId,
      is_global: isGlobal,
      granted_by_email: 'system@role-assignment'
    };

    const { data, error } = await supabase
      .from('userroles')
      .insert([roleData])
      .select(`
        *,
        role:roles(*)
      `)
      .single();

    if (error) {
      logger.error('❌ Error assigning user role:', error);
      return { data: null, error };
    }

    logger.debug('✅ User role assigned:', { userId, roleId, clientId });
    return { data: data, error: null };

  } catch (error) {
    logger.error('❌ Exception in assignUserRole:', error);
    return { data: null, error };
  }
};

/**
 * Remove role from user
 */
export const removeUserRole = async (userRoleId: string): Promise<{ data: boolean; error: any }> => {
  try {
    logger.debug('🔐 Removing user role:', { userRoleId });

    const { error } = await supabase
      .from('userroles')
      .delete()
      .eq('id', userRoleId);

    if (error) {
      logger.error('❌ Error removing user role:', error);
      return { data: false, error };
    }

    logger.debug('✅ User role removed:', { userRoleId });
    return { data: true, error: null };

  } catch (error) {
    logger.error('❌ Exception in removeUserRole:', error);
    return { data: false, error };
  }
};
