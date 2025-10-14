/**
 * Security Validation Functions
 * Ensures proper cohesion between userRoles, roles, profiles, and clients tables
 */

import { supabase } from '../supabase';
import { logger } from '../logger';

export interface SecurityReport {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
  tableCounts: {
    profiles: number;
    userRoles: number;
    roles: number;
    clients: number;
  };
}

/**
 * Validates the overall security cohesion of the new permission system
 */
export const validateSecurityCohesion = async (): Promise<{
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}> => {
  const issues: string[] = [];
  const recommendations: string[] = [];

  try {
    logger.debug("🔍 Starting security cohesion validation");

    // 1. Test table accessibility
    const tableChecks = await Promise.allSettled([
      supabase.from('profiles').select('user_id').limit(1),
      supabase.from('clients').select('id').limit(1),
      supabase.from('userroles').select('id').limit(1),
      supabase.from('roles').select('id').limit(1)
    ]);

    const tableResults = tableChecks.map((result, index) => {
      const tableNames = ['profiles', 'clients', 'userroles', 'roles'];
      if (result.status === 'rejected') {
        issues.push(`Table '${tableNames[index]}' is not accessible: ${result.reason}`);
        return false;
      }
      return true;
    });

    if (!tableResults.every(Boolean)) {
      return { isValid: false, issues, recommendations };
    }

    // 2. Test JOIN operations between tables
    const joinTests = await Promise.allSettled([
      // Test userRoles JOIN with profiles
      supabase
        .from('userroles')
        .select(`
          user_id,
          role_id,
          client_id,
          is_global,
          roles(name),
          profiles(email)
        `)
        .limit(1),
      
      // Test userRoles JOIN with clients
      supabase
        .from('userroles')
        .select(`
          client_id,
          role_id,
          is_global,
          roles(name),
          clients(name)
        `)
        .not('client_id', 'is', null)
        .limit(1)
    ]);

    const joinResults = joinTests.map((result, index) => {
      const joinNames = ['userroles → profiles', 'userroles → clients'];
      if (result.status === 'rejected') {
        issues.push(`JOIN failed for ${joinNames[index]}: ${result.reason}`);
        return false;
      }
      return true;
    });

    if (!joinResults.every(Boolean)) {
      return { isValid: false, issues, recommendations };
    }

    // 3. Check for orphaned records
    const orphanChecks = await Promise.allSettled([
      // Check for userRoles records with non-existent profiles
      supabase
        .from('userroles')
        .select('user_id')
        .not('user_id', 'in', `(SELECT user_id FROM profiles)`),
      
      // Check for userRoles records with non-existent clients
      supabase
        .from('userroles')
        .select('client_id')
        .not('client_id', 'is', null)
        .not('client_id', 'in', `(SELECT id FROM clients)`)
    ]);

    const orphanResults = orphanChecks.map((result, index) => {
      const orphanTypes = ['profiles', 'clients'];
      if (result.status === 'fulfilled' && result.value.data && result.value.data.length > 0) {
        issues.push(`Found ${result.value.data.length} orphaned userroles records referencing non-existent ${orphanTypes[index]}`);
        return false;
      }
      return true;
    });

    if (!orphanResults.every(Boolean)) {
      recommendations.push('Clean up orphaned userroles records');
    }

    // 4. Validate role consistency
    const roleCheck = await supabase
      .from('userroles')
      .select('role_id, roles(name)')
      .not('role_id', 'in', `(SELECT id FROM roles)`);

    if (roleCheck.data && roleCheck.data.length > 0) {
      issues.push(`Found ${roleCheck.data.length} userroles records with invalid role_id references`);
      recommendations.push('Fix invalid role_id references in userroles table');
    }

    // 5. Check for duplicate access records
    const duplicateCheck = await supabase
      .from('userroles')
      .select('user_id, client_id, role_id')
      .not('client_id', 'is', null);

    if (duplicateCheck.data) {
      const duplicates = duplicateCheck.data.filter((record, index, array) =>
        array.findIndex(r => 
          r.user_id === record.user_id && 
          r.client_id === record.client_id && 
          r.role_id === record.role_id
        ) !== index
      );
      
      if (duplicates.length > 0) {
        issues.push(`Found ${duplicates.length} duplicate userroles records`);
        recommendations.push('Remove duplicate userroles records');
      }
    }

    // 6. Validate global role records (is_global = true)
    const globalRoleCheck = await supabase
      .from('userroles')
      .select('user_id, role_id, is_global, roles(name)')
      .eq('is_global', true);

    if (globalRoleCheck.data) {
      const invalidGlobalRoles = globalRoleCheck.data.filter(record => 
        record.roles?.name !== 'admin'
      );
      
      if (invalidGlobalRoles.length > 0) {
        issues.push(`Found ${invalidGlobalRoles.length} global roles that are not admin`);
        recommendations.push('Only admin roles should have is_global = true');
      }
    }

    // 7. Check for users without any roles
    const usersWithoutRoles = await supabase
      .from('profiles')
      .select('user_id')
      .not('user_id', 'in', `(SELECT user_id FROM userroles)`);

    if (usersWithoutRoles.data && usersWithoutRoles.data.length > 0) {
      issues.push(`Found ${usersWithoutRoles.data.length} users without any roles assigned`);
      recommendations.push('Assign default roles to users without role assignments');
    }

    const isValid = issues.length === 0;

    logger.debug("✅ Security cohesion validation completed", {
      isValid,
      issuesCount: issues.length,
      recommendationsCount: recommendations.length
    });

    return { isValid, issues, recommendations };

  } catch (error) {
    logger.error("❌ Error in validateSecurityCohesion:", error);
    return {
      isValid: false,
      issues: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      recommendations: ['Fix validation errors and retry']
    };
  }
};

/**
 * Validates user access for a specific user
 */
export const validateUserAccess = async (userId: string): Promise<{
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}> => {
  const issues: string[] = [];
  const recommendations: string[] = [];

  try {
    logger.debug("🔍 Validating user access", { userId });

    // Check if user profile exists
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, email, first_name, last_name')
      .eq('user_id', userId)
      .single();

    if (profileError || !userProfile) {
      issues.push(`User profile not found for user ${userId}`);
      recommendations.push('Create user profile in profiles table');
      return { isValid: false, issues, recommendations };
    }

    // Check for user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('userroles')
      .select(`
        role_id,
        client_id,
        is_global,
        roles(name)
      `)
      .eq('user_id', userId);

    if (rolesError) {
      issues.push(`Error fetching user roles: ${rolesError.message}`);
      return { isValid: false, issues, recommendations };
    }

    if (!userRoles || userRoles.length === 0) {
      issues.push(`No roles assigned to user ${userId}`);
      recommendations.push('Assign at least one role to the user');
      return { isValid: false, issues, recommendations };
    }

    // Validate role assignments
    const globalRoles = userRoles.filter(role => role.is_global);
    const clientRoles = userRoles.filter(role => !role.is_global);

    if (globalRoles.length > 1) {
      issues.push(`User has multiple global roles (${globalRoles.length})`);
      recommendations.push('Users should have at most one global role');
    }

    // Check for invalid global roles
    const invalidGlobalRoles = globalRoles.filter(role => role.roles?.name !== 'admin');
    if (invalidGlobalRoles.length > 0) {
      issues.push(`User has global role that is not admin: ${invalidGlobalRoles.map(r => r.roles?.name).join(', ')}`);
      recommendations.push('Only admin roles should be global');
    }

    // Check for duplicate client roles
    const clientIds = clientRoles.map(role => role.client_id).filter(Boolean);
    const duplicateClientIds = clientIds.filter((id, index) => clientIds.indexOf(id) !== index);
    if (duplicateClientIds.length > 0) {
      issues.push(`User has duplicate roles for clients: ${duplicateClientIds.join(', ')}`);
      recommendations.push('Remove duplicate client role assignments');
    }

    const isValid = issues.length === 0;

    logger.debug("✅ User access validation completed", {
      userId,
      isValid,
      issuesCount: issues.length,
      globalRoles: globalRoles.length,
      clientRoles: clientRoles.length
    });

    return { isValid, issues, recommendations };

  } catch (error) {
    logger.error("❌ Error in validateUserAccess:", error);
    return {
      isValid: false,
      issues: [`User validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      recommendations: ['Fix validation errors and retry']
    };
  }
};

/**
 * Generates a comprehensive security report
 */
export const getSecurityReport = async (): Promise<SecurityReport> => {
  try {
    logger.debug("🔍 Generating comprehensive security report");

    const [cohesionResult, profileCounts, userRoleCounts, roleCounts, clientCounts] = await Promise.all([
      validateSecurityCohesion(),
      supabase.from('profiles').select('user_id', { count: 'exact', head: true }),
      supabase.from('userroles').select('id', { count: 'exact', head: true }),
      supabase.from('roles').select('id', { count: 'exact', head: true }),
      supabase.from('clients').select('id', { count: 'exact', head: true })
    ]);

    return {
      isValid: cohesionResult.isValid,
      issues: cohesionResult.issues,
      recommendations: cohesionResult.recommendations,
      tableCounts: {
        profiles: profileCounts.count || 0,
        userroles: userRoleCounts.count || 0,
        roles: roleCounts.count || 0,
        clients: clientCounts.count || 0
      }
    };

  } catch (error) {
    logger.error("❌ Error generating security report:", error);
    return {
      isValid: false,
      issues: [`Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      recommendations: ['Fix errors and retry report generation'],
      tableCounts: {
        profiles: 0,
        userroles: 0,
        roles: 0,
        clients: 0
      }
    };
  }
};