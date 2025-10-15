-- Seed Default Roles

INSERT INTO public.roles (name, description, permissions, is_system_role) VALUES
('admin', 'Global administrator with full system access', '{
  "canManageUsers": true,
  "canManageClients": true,
  "canManageBranding": true,
  "canViewAllData": true,
  "canInviteUsers": true,
  "canManageRoles": true,
  "canSyncData": true,
  "canExportData": true
}', true),
('staff', 'Staff member with client management access', '{
  "canManageUsers": false,
  "canManageClients": true,
  "canManageBranding": false,
  "canViewAllData": false,
  "canInviteUsers": true,
  "canManageRoles": false,
  "canSyncData": true,
  "canExportData": true
}', true),
('client', 'Client user with read-only access', '{
  "canManageUsers": false,
  "canManageClients": false,
  "canManageBranding": false,
  "canViewAllData": false,
  "canInviteUsers": false,
  "canManageRoles": false,
  "canSyncData": false,
  "canExportData": false
}', true)
ON CONFLICT (name) DO NOTHING;
