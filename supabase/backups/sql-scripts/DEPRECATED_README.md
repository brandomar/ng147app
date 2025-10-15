# DEPRECATED FILE NOTICE

## This file is OUTDATED and should NOT be used

**File**: `DEPRECATED_complete_production_schema.sql`

**Status**: ⚠️ DEPRECATED - DO NOT USE

**Reason**: This file was created before the major permission system refactoring and is missing critical updates:

1. **Missing new permission tables**:
   - `roles` table
   - `userRoles` table
   - `profiles` table

2. **Missing schema updates**:
   - `goals_config` column on clients table
   - Updated RLS policies for new permission system
   - Role name changes (undeniable → admin)

3. **Outdated RLS policies**:
   - Policies reference old `user_client_access` instead of `userRoles`
   - Missing policies for new permission tables

## What to use instead

### For new client deployments:

Use the **current, up-to-date** schema file:
```
supabase/migrations/CLIENT_DEPLOYMENT_COMPLETE_SCHEMA.sql
```

This file includes:
- ✅ All 13 tables (including new permission system)
- ✅ Updated RLS policies
- ✅ goals_config column
- ✅ Default role seeding
- ✅ Complete indexes and constraints

### For documentation:

See the complete setup guide:
```
docs/deployment/CLIENT_DATABASE_SETUP.md
```

## Migration path

If you're running an older database instance with this schema:

1. **Do NOT drop and recreate** - You'll lose data!
2. **Apply incremental migrations** from `supabase/migrations/` folder
3. **Follow the migration guide** in the docs

## Why we're keeping this file

This file is renamed (not deleted) for:
- Historical reference
- Comparison purposes
- Understanding schema evolution
- Debugging legacy issues

## Date deprecated

**2025-10-15** - After major permission system refactoring

---

**WARNING**: Using this deprecated file will result in:
- Missing tables required by the application
- Security vulnerabilities from outdated RLS policies
- Application errors and broken functionality
- Inability to use new features

**DO NOT USE THIS FILE FOR NEW DEPLOYMENTS!**
