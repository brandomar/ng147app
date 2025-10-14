/**
 * Client Management Functions
 * Client CRUD operations, access control, and management
 * Uses new permission system exclusively
 */

import { supabase } from '../supabase';
import { logger } from '../logger';
import { Client } from '../../types';
import {
  canAccessClient as checkClientAccess,
  assignUserRole,
  getAccessibleClients,
} from "./permissions";

// ===== CLIENT CRUD OPERATIONS =====
export const getClients = async () => {
  try {
    logger.debug("🔄 Using new permission system for getClients");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: [], error: { message: "User not authenticated" } };
    }

    const result = await getAccessibleClients(user.id);
    if (result.error) {
      logger.error("❌ Error fetching accessible clients:", result.error);
      return { data: [], error: result.error };
    }

    // The RPC function returns full client records, no mapping needed
    const clients = result.data || [];

    logger.debug("✅ Loaded accessible clients:", { count: clients.length });
    return { data: clients, error: null };
  } catch (error) {
    logger.error("❌ Error in getClients:", error);
    return { data: [], error };
  }
};

export const getClientById = async (clientId: string) => {
  try {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (error) {
      logger.error("❌ Error fetching client by ID:", error);
      return { data: null, error };
    }

    logger.debug("✅ Loaded client by ID:", { clientId });
    return { data, error: null };
  } catch (error) {
    logger.error("❌ Error in getClientById:", error);
    return { data: null, error };
  }
};

export const getClientName = async (clientId: string) => {
  try {
    const { data, error } = await getClientById(clientId);
    if (error || !data) {
      return { data: null, error };
    }
    return { data: data.name, error: null };
  } catch (error) {
    logger.error("❌ Error in getClientName:", error);
    return { data: null, error };
  }
};

export const addClient = async (clientData: Partial<Client>) => {
  try {
    const { data, error } = await supabase
      .from("clients")
      .insert([clientData])
      .select()
      .single();

    if (error) {
      logger.error("❌ Error adding client:", error);
      return { data: null, error };
    }

    logger.debug("✅ Client added:", { clientId: data.id });
    return { data, error: null };
  } catch (error) {
    logger.error("❌ Error in addClient:", error);
    return { data: null, error };
  }
};

export const updateClient = async (clientId: string, updates: Partial<Client>) => {
  try {
    const { data, error } = await supabase
      .from("clients")
      .update(updates)
      .eq("id", clientId)
      .select()
      .single();

    if (error) {
      logger.error("❌ Error updating client:", error);
      return { data: null, error };
    }

    logger.debug("✅ Client updated:", { clientId });
    return { data, error: null };
  } catch (error) {
    logger.error("❌ Error in updateClient:", error);
    return { data: null, error };
  }
};

export const deleteClient = async (clientId: string) => {
  try {
    // Delete related data first
    await supabase.from("userroles").delete().eq("client_id", clientId);

    await supabase
      .from("client_tabs")
      .delete()
      .eq("client_id", clientId);

    await supabase
      .from("discovered_metrics")
      .delete()
      .eq("client_id", clientId);

    await supabase
      .from("metric_entries")
      .delete()
      .eq("client_id", clientId);

    // Delete the client
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (error) {
      logger.error("❌ Error deleting client:", error);
      return { data: null, error };
    }

    logger.debug("✅ Client deleted:", { clientId });
    return { data: { success: true }, error: null };
  } catch (error) {
    logger.error("❌ Error in deleteClient:", error);
    return { data: null, error };
  }
};

// ===== CLIENT ACCESS CONTROL =====
export const getClientAccess = async (clientId: string) => {
  try {
    const { data, error } = await supabase
      .from("userroles")
      .select(`
        *,
        roles(name),
        profiles(email, first_name, last_name)
      `)
      .eq("client_id", clientId);

    if (error) {
      logger.error("❌ Error fetching client access:", error);
      return { data: null, error };
    }

    logger.debug("✅ Loaded client access:", { clientId, count: data?.length || 0 });
    return { data: data || [], error: null };
  } catch (error) {
    logger.error("❌ Error in getClientAccess:", error);
    return { data: null, error };
  }
};

export const grantClientAccess = async (
  userId: string,
  clientId: string,
  roleName: string
) => {
  try {
    logger.debug("🔄 Using new permission system for grantClientAccess");

    // Get the role ID for the role name
    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", roleName)
      .single();

    if (rolesError || !roles) {
      logger.error("❌ Error finding role:", rolesError);
      return { data: null, error: rolesError || { message: "Role not found" } };
    }

    const { data, error } = await assignUserRole(
      userId,
      roles.id,
      clientId,
      false // Client-specific roles are never global
    );

    if (error) {
      logger.error("❌ Error assigning user role:", error);
      return { data: null, error };
    }

    logger.debug("✅ Client access granted:", { userId, clientId, roleName });
    return { data, error: null };
  } catch (error) {
    logger.error("❌ Error in grantClientAccess:", error);
    return { data: null, error };
  }
};

export const updateClientAccess = async (
  accessId: string,
  updates: { role_id?: string; client_id?: string }
) => {
  try {
    const { data, error } = await supabase
      .from("userroles")
      .update(updates)
      .eq("id", accessId)
      .select()
      .single();

    if (error) {
      logger.error("❌ Error updating client access:", error);
      return { data: null, error };
    }

    logger.debug("✅ Client access updated:", { accessId });
    return { data, error: null };
  } catch (error) {
    logger.error("❌ Error in updateClientAccess:", error);
    return { data: null, error };
  }
};

export const revokeClientAccess = async (accessId: string) => {
  try {
    const { error } = await supabase
      .from("userroles")
      .delete()
      .eq("id", accessId);

    if (error) {
      logger.error("❌ Error revoking client access:", error);
      return { data: null, error };
    }

    logger.debug("✅ Client access revoked:", { accessId });
    return { data: { success: true }, error: null };
  } catch (error) {
    logger.error("❌ Error in revokeClientAccess:", error);
    return { data: null, error };
  }
};

export const canAccessClient = async (userId: string, clientId: string) => {
  try {
    logger.debug("🔄 Using new permission system for canAccessClient");

    const canAccess = await checkClientAccess(userId, clientId);
    return { data: canAccess, error: null };
  } catch (error) {
    logger.error("❌ Error in canAccessClient:", error);
    return { data: false, error };
  }
};

// ===== CLIENT TABS =====
export const getClientTabs = async (clientId: string) => {
  try {
    const { data, error } = await supabase
      .from("client_tabs")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("❌ Error fetching client tabs:", error);
      return { data: null, error };
    }

    logger.debug("✅ Loaded client tabs:", {
      clientId,
      count: data?.length || 0,
    });
    return { data: data || [], error: null };
  } catch (error) {
    logger.error("❌ Error in getClientTabs:", error);
    return { data: null, error };
  }
};

export const createClientTab = async (tabData: {
  client_id: string;
  tab_name: string;
  sheet_url?: string;
  sheet_name?: string;
  configuration?: Record<string, any>;
}) => {
  try {
    const { data, error } = await supabase
      .from("client_tabs")
      .insert([tabData])
      .select()
      .single();

    if (error) {
      logger.error("❌ Error creating client tab:", error);
      return { data: null, error };
    }

    logger.debug("✅ Client tab created:", { tabId: data.id });
    return { data, error: null };
  } catch (error) {
    logger.error("❌ Error in createClientTab:", error);
    return { data: null, error };
  }
};

export const updateClientTab = async (
  tabId: string,
  updates: Record<string, any>
) => {
  try {
    const { data, error } = await supabase
      .from("client_tabs")
      .update(updates)
      .eq("id", tabId)
      .select()
      .single();

    if (error) {
      logger.error("❌ Error updating client tab:", error);
      return { data: null, error };
    }

    logger.debug("✅ Client tab updated:", { tabId });
    return { data, error: null };
  } catch (error) {
    logger.error("❌ Error in updateClientTab:", error);
    return { data: null, error };
  }
};

export const deleteClientTab = async (tabId: string) => {
  try {
    const { error } = await supabase
      .from("client_tabs")
      .delete()
      .eq("id", tabId);

    if (error) {
      logger.error("❌ Error deleting client tab:", error);
      return { data: null, error };
    }

    logger.debug("✅ Client tab deleted:", { tabId });
    return { data: { success: true }, error: null };
  } catch (error) {
    logger.error("❌ Error in deleteClientTab:", error);
    return { data: null, error };
  }
};

// ===== CLIENT OWNERSHIP =====
export const assignClientOwnership = async (clientId: string) => {
  try {
    // Get all users with admin role
    const { data: adminRole } = await supabase
      .from("roles")
      .select("id")
      .eq("name", "admin")
      .single();
    const { data: adminUsers, error: usersError } = await supabase
      .from("userroles")
      .select("user_id, profiles(email)")
      .eq("role_id", adminRole?.id)
      .eq("is_global", true);

    if (usersError) {
      logger.error("❌ Error fetching admin users:", usersError);
      return;
    }

    if (!adminUsers || adminUsers.length === 0) {
      logger.warn("⚠️ No admin users found to assign client ownership");
      return;
    }

    // Create userroles records for each admin user
    const accessRecords = adminUsers.map((user: any) => ({
      user_id: user.user_id,
      role_id: adminRole?.id,
      client_id: clientId,
      is_global: false,
      granted_by: user.user_id,
      granted_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("userroles")
      .insert(accessRecords)
      .select();

    if (error) {
      logger.error("❌ Error assigning client ownership:", error);
      return;
    }

    logger.debug("✅ Client ownership assigned to admin users:", {
      clientId,
      count: accessRecords.length,
    });
  } catch (error) {
    logger.error("❌ Error in assignClientOwnership:", error);
  }
};

export const assignAllUnownedClients = async () => {
  try {
    // Get all clients
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, name");

    if (clientsError) {
      logger.error("❌ Error fetching clients:", clientsError);
      return;
    }

    if (!clients || clients.length === 0) {
      logger.debug("No clients found to assign");
      return;
    }

    // Get all users with admin role
    const { data: adminRole } = await supabase
      .from("roles")
      .select("id")
      .eq("name", "admin")
      .single();
    const { data: adminUsers, error: usersError } = await supabase
      .from("userroles")
      .select("user_id, profiles(email)")
      .eq("role_id", adminRole?.id)
      .eq("is_global", true);

    if (usersError) {
      logger.error("❌ Error fetching admin users:", usersError);
      return;
    }

    if (!adminUsers || adminUsers.length === 0) {
      logger.warn("⚠️ No admin users found to assign client ownership");
      return;
    }

    const adminRoleId = adminRole?.id;

    for (const client of clients) {
      // Check existing assignments for this client
      const { data: existingAssignments } = await supabase
        .from("userroles")
        .select("user_id")
        .eq("client_id", client.id)
        .eq("role_id", adminRoleId);

      const existingUserIds =
        existingAssignments?.map((a: any) => a.user_id) || [];

      // Find admin users not already assigned to this client
      const unassignedAdmins = adminUsers.filter(
        (admin: any) => !existingUserIds.includes(admin.user_id)
      );

      if (unassignedAdmins.length > 0) {
        const accessRecords = unassignedAdmins.map((user: any) => ({
          user_id: user.user_id,
          role_id: adminRoleId,
          client_id: client.id,
          is_global: false,
          granted_by: user.user_id,
          granted_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from("userroles")
          .insert(accessRecords);

        if (error) {
          logger.error("❌ Error assigning client ownership:", error);
          continue;
        }

        logger.debug("✅ Assigned client ownership:", {
          clientId: client.id,
          count: accessRecords.length,
        });
      }
    }

    logger.debug("✅ Completed assigning ownership to all unowned clients");
  } catch (error) {
    logger.error("❌ Error in assignAllUnownedClients:", error);
  }
};

// ===== DATA SOURCES =====
export const getClientDataSources = async (clientId: string) => {
  try {
    const { data, error } = await supabase
      .from("discovered_metrics")
      .select("*")
      .eq("client_id", clientId);

    if (error) {
      logger.error("❌ Error fetching client data sources:", error);
      return { data: null, error };
    }

    logger.debug("✅ Loaded client data sources:", { clientId, count: data?.length || 0 });
    return { data: data || [], error: null };
  } catch (error) {
    logger.error("❌ Error in getClientDataSources:", error);
    return { data: null, error };
  }
};

export const createGoogleSheetsDataSources = async (
  clientId: string,
  dataSources: Array<{
    sheet_url: string;
    sheet_name: string;
    tabs: Array<{
      name: string;
      gid: string;
      url: string;
    }>;
  }>
) => {
  try {
    const records = dataSources.flatMap(source =>
      source.tabs.map(tab => ({
        client_id: clientId,
        sheet_url: source.sheet_url,
        sheet_name: source.sheet_name,
        tab_name: tab.name,
        tab_gid: tab.gid,
        tab_url: tab.url,
        configuration: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
    );

    const { data, error } = await supabase
      .from("discovered_metrics")
      .insert(records)
      .select();

    if (error) {
      logger.error("❌ Error creating Google Sheets data sources:", error);
      return { data: null, error };
    }

    logger.debug("✅ Created Google Sheets data sources:", { 
      clientId, 
      count: records.length 
    });
    return { data, error: null };
  } catch (error) {
    logger.error("❌ Error in createGoogleSheetsDataSources:", error);
    return { data: null, error };
  }
};

export const deleteDataSource = async (dataSourceId: string) => {
  try {
    const { error } = await supabase
      .from("discovered_metrics")
      .delete()
      .eq("id", dataSourceId);

    if (error) {
      logger.error("❌ Error deleting data source:", error);
      return { data: null, error };
    }

    logger.debug("✅ Data source deleted:", { dataSourceId });
    return { data: { success: true }, error: null };
  } catch (error) {
    logger.error("❌ Error in deleteDataSource:", error);
    return { data: null, error };
  }
};