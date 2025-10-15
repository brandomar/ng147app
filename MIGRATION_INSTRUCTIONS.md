# Database Migration Instructions

Your Supabase database is currently empty and needs to be initialized. Here's how to apply the migrations:

## Option 1: Restore from Complete Backup (Recommended - Fastest)

This is the fastest way to get your database up and running.

### Steps:

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Navigate to your project: `hcmgntizubslgadpcxtv`

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "+ New Query"

3. **Load and Execute Backup**
   - Open the file: `supabase/backups/sql-scripts/complete_production_schema.sql`
   - Copy the ENTIRE file contents (108KB)
   - Paste into the SQL Editor
   - Click "Run" to execute

4. **Verify Tables Were Created**
   - Go to "Table Editor" in the left sidebar
   - You should see tables like:
     - `clients`
     - `users`
     - `metrics`
     - `user_roles`
     - `profiles`
     - `brand_settings`
     - And many more...

5. **Test the Application**
   ```bash
   npm run dev
   ```
   - Open http://localhost:5173
   - Try signing up/logging in

---

## Option 2: Use the Restore Script (Alternative)

If you have `psql` command-line tools installed:

```bash
# Get your database connection string from Supabase Dashboard
# Settings → Database → Connection String (URI format)

# Run the restore script
npm run db:restore -- --target production --file supabase/backups/sql-scripts/complete_production_schema.sql
```

This will:
- Validate the backup file
- Create a pre-restore backup
- Apply the schema
- Verify the restore

---

## Option 3: Apply Migrations Manually (Most Control)

If you prefer to apply migrations step-by-step:

### Prerequisites
```bash
# Make sure you have Supabase CLI installed
npm install -g supabase

# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref hcmgntizubslgadpcxtv
```

### Apply the Schema

Since the production baseline is empty, first apply the complete schema via SQL Editor (Option 1 above), then:

```bash
# Apply all migrations in order
npx supabase db push
```

This will apply any migrations that aren't yet in the database.

---

## What the Schema Includes

The complete production schema contains:

### Tables (20+)
- `users` - User accounts and authentication
- `profiles` - User profile information
- `roles` - Permission roles (admin, staff, client)
- `user_roles` - User role assignments
- `clients` - Client accounts and settings
- `metrics` - Metric data and tracking
- `brand_settings` - Whitelabel branding configuration
- `discovered_metrics` - Google Sheets metric discovery
- `data_sources` - External data source configurations
- `invitations` - User invitation system
- And more...

### Functions (40+)
- `get_accessible_clients()` - Get clients user can access
- `check_user_permission()` - Permission checking
- `accept_invitation()` - Invitation handling
- Database utility functions
- Permission and security functions

### Security
- Row Level Security (RLS) policies on all tables
- Secure functions with proper access control
- Data isolation between clients

### Extensions
- `pg_graphql` - GraphQL support
- `pg_stat_statements` - Performance monitoring
- `pgcrypto` - Cryptographic functions
- `supabase_vault` - Secrets management
- `uuid-ossp` - UUID generation

---

## Verification Checklist

After applying the schema, verify:

- [ ] Can access Supabase Dashboard
- [ ] Tables appear in Table Editor
- [ ] Can sign up for new account
- [ ] Can log in with account
- [ ] No errors in browser console
- [ ] Application loads correctly

---

## Troubleshooting

### Error: "relation already exists"
**Solution**: Database already has tables. Either:
1. Drop all tables first (dangerous!)
2. Or skip to Option 3 and just apply new migrations

### Error: "permission denied"
**Solution**: Make sure you're using your Supabase project connection string with the correct password

### SQL Editor times out
**Solution**: The file might be too large for browser. Use Option 2 (restore script) instead

### Tables created but application won't start
**Solution**:
1. Check `.env` file has correct Supabase credentials
2. Restart dev server: `npm run dev`
3. Check browser console for errors

---

## Current Project Details

- **Project Ref**: `hcmgntizubslgadpcxtv`
- **Project URL**: `https://hcmgntizubslgadpcxtv.supabase.co`
- **Schema File**: `supabase/backups/sql-scripts/complete_production_schema.sql`
- **Schema Size**: 108,292 bytes (~106 KB)
- **Estimated Time**: 1-2 minutes

---

## Need Help?

1. See [DATABASE_RESTORE.md](docs/deployment/DATABASE_RESTORE.md) for detailed restore guide
2. Check [NEW_INSTANCE_SETUP.md](docs/deployment/NEW_INSTANCE_SETUP.md) for full setup instructions
3. Review error messages in Supabase Dashboard → Logs

---

**Next Step**: Choose Option 1 (recommended) and execute the complete_production_schema.sql file in the Supabase SQL Editor.
