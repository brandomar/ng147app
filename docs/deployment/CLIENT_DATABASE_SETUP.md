# Client Database Setup Guide

Complete guide for setting up the database schema for new client deployments of Dashboard Undeniable.

## Overview

This guide will help you set up a fresh Supabase database for a new client deployment. The database includes:

- **13 tables** for core functionality
- **New permission system** with roles, userRoles, and profiles
- **Row Level Security (RLS)** enabled on all tables
- **Performance indexes** for optimized queries
- **Legacy compatibility** for gradual migration

## Prerequisites

- Supabase project created (free tier works fine for testing)
- Access to Supabase SQL Editor
- Basic understanding of SQL (for troubleshooting)

## Quick Start

### Method 1: Using the Consolidated Migration File (Recommended)

**Best for**: New deployments, clean database setup

1. **Navigate to your Supabase project**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and paste the schema**
   - Open the file: `supabase/migrations/CLIENT_DEPLOYMENT_COMPLETE_SCHEMA.sql`
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Execute the migration**
   - Click "Run" or press Ctrl+Enter (Cmd+Enter on Mac)
   - Wait for completion (should take 5-10 seconds)
   - Check the output for any errors

5. **Verify the setup**
   - Go to "Table Editor" in the left sidebar
   - Confirm you see 13 tables
   - Check that the `roles` table has 3 rows (admin, staff, client)

### Method 2: Using the restore-database script

**Best for**: Copying from an existing database, automated deployments

```bash
# From your project root
node scripts/restore-database.js --target production --file supabase/migrations/CLIENT_DEPLOYMENT_COMPLETE_SCHEMA.sql
```

## Database Schema

### Core Tables (10 tables)

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `brand_settings` | UI customization and branding | Singleton table with colors, logos, text |
| `clients` | Client information and configuration | Multi-tenant data, Google Sheets integration |
| `invitations` | User invitation system | Token-based, expiring invitations |
| `metric_definitions` | Metric metadata | Categories, formulas for calculated metrics |
| `metrics` | Core business data | Time-series data, supports multiple data sources |
| `sync_status` | Google Sheets sync tracking | Error handling, sync statistics |
| `user_notification_preferences` | User notification settings | Per-user preferences |
| `user_notifications` | Notification messages | Read/unread status |
| `users` | Legacy user profiles | Kept for backward compatibility |
| `user_client_access` | Legacy access control | Kept for backward compatibility |

### New Permission System (3 tables)

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `roles` | Role definitions | Feature-based permissions (JSONB), system roles |
| `userRoles` | User role assignments | Global roles for admins, client-specific roles |
| `profiles` | User profiles | Replaces `users` table, integrated with Supabase Auth |

## Understanding the Permission System

### Role Types

The system includes three default roles:

1. **admin** - Full system access
   - Can manage users, clients, branding
   - Can view all data
   - Can invite users and manage roles
   - Can sync data and export

2. **staff** - Client management access
   - Can manage clients (not users)
   - Can invite users to clients
   - Can sync data and export
   - Limited to assigned clients unless global

3. **client** - Read-only access
   - Can view their own client data
   - Cannot manage anything
   - Cannot invite users

### Global vs Client-Specific Roles

- **Global roles** (`is_global = true, client_id IS NULL`)
  - Admins typically have global roles
  - Bypass client-level restrictions
  - Can access all clients

- **Client-specific roles** (`is_global = false, client_id = specific-uuid`)
  - Staff and clients have client-specific roles
  - Can only access their assigned client(s)
  - More secure for multi-tenant setup

## Post-Setup Configuration

After running the migration, you need to:

### 1. Create Your First Admin User

```sql
-- Step 1: Create user via Supabase Auth Dashboard
-- Go to Authentication → Users → Add User
-- Email: your-email@company.com
-- Password: (generate secure password)
-- Copy the user_id from the created user

-- Step 2: Get the admin role_id
SELECT id, name FROM public.roles WHERE name = 'admin';
-- Copy the admin role id

-- Step 3: Assign admin role to the user
INSERT INTO public.userRoles (user_id, role_id, client_id, is_global, granted_by_email)
VALUES (
  'USER_ID_FROM_STEP_1'::uuid,
  'ADMIN_ROLE_ID_FROM_STEP_2'::uuid,
  NULL,  -- NULL for global role
  TRUE,  -- is_global = true for admin
  'system@setup.com'
);

-- Step 4: Create profile for the user
INSERT INTO public.profiles (user_id, email, first_name, last_name)
VALUES (
  'USER_ID_FROM_STEP_1'::uuid,
  'your-email@company.com',
  'Your',
  'Name'
);
```

### 2. Configure Google Sheets API

1. Create a Google Cloud Project
2. Enable Google Sheets API
3. Create Service Account credentials
4. Download JSON key file
5. Add credentials to your `.env` file:

```bash
VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
VITE_GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Deploy Edge Functions

```bash
# Deploy the metric sync function
npx supabase functions deploy google-metric-sync-enhanced

# Deploy the invitation function
npx supabase functions deploy invite-user
```

### 4. Test the Setup

1. **Login to the application**
   - Visit your application URL
   - Login with the admin credentials

2. **Create a test client**
   - Go to "Manage Clients"
   - Click "Add New Client"
   - Fill in client details
   - Add Google Sheets configuration

3. **Invite a test user**
   - From the client page, click "Invite User"
   - Enter email and select role
   - Test the invitation flow

## Troubleshooting

### Issue: "relation does not exist"

**Problem**: Table creation failed
**Solution**:
- Check the SQL output for specific errors
- Ensure you're running the complete schema file
- Try running sections individually if needed

### Issue: "permission denied for table"

**Problem**: RLS policies blocking access
**Solution**:
- Verify the user has been added to `userRoles`
- Check that `is_global` is set correctly for admins
- Ensure the role has appropriate permissions

### Issue: "No roles found"

**Problem**: Role seed data not inserted
**Solution**:
```sql
-- Manually insert roles
INSERT INTO public.roles (name, description, permissions, is_system_role) VALUES
('admin', 'Global administrator', '{"canManageUsers": true, "canManageClients": true, "canManageBranding": true, "canViewAllData": true}', true),
('staff', 'Staff member', '{"canManageClients": true, "canInviteUsers": true}', true),
('client', 'Client user', '{}', true)
ON CONFLICT (name) DO NOTHING;
```

### Issue: Cannot login after setup

**Problem**: Missing profile or userRoles entry
**Solution**:
- Verify profile exists for the user
- Verify userRoles entry exists
- Check that role_id and user_id are correct UUIDs

## Migration from Old Schema

If you're migrating from the old permission system:

1. **Keep both systems running** - The new schema includes legacy tables
2. **Data migration** - Use the migration scripts in `supabase/migrations/`
3. **Gradual transition** - Update application code to use new tables
4. **Final cutover** - Remove legacy table dependencies

## Security Best Practices

1. **Never commit credentials** - Keep `.env` files out of version control
2. **Use environment variables** - Store secrets in Supabase dashboard
3. **Enable RLS everywhere** - All tables have RLS enabled by default
4. **Audit user permissions** - Regularly review userRoles assignments
5. **Use strong passwords** - Enforce password policies in Supabase Auth
6. **Monitor access logs** - Review Supabase logs for suspicious activity

## Database Maintenance

### Regular Tasks

- **Weekly**: Review sync_status for errors
- **Monthly**: Audit userRoles and profiles
- **Quarterly**: Check metrics table size and performance
- **Annually**: Review and update role permissions

### Performance Optimization

The schema includes 30+ indexes for common queries. If you notice slow queries:

1. Check the query plan with `EXPLAIN ANALYZE`
2. Review existing indexes
3. Add custom indexes for your specific use case
4. Consider partitioning the metrics table for large datasets

## Support and Resources

- **Supabase Documentation**: https://supabase.com/docs
- **Project Repository**: Check the `/docs` folder for more guides
- **Database Restore Guide**: `docs/deployment/DATABASE_RESTORE.md`
- **Architecture Guide**: `AGENTS.md`

## Version History

- **2025-01-15**: Current schema with new permission system
- **2025-10-11**: Added roles, userRoles, profiles tables
- **2025-10-13**: Added goals_config to clients table
- **Earlier**: Legacy schema with users and user_client_access

---

**Last Updated**: 2025-10-15
**Schema Version**: Post-Refactor (v2.0)
