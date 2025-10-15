# Database Restore Guide

Complete guide for restoring your Supabase database from SQL backup files.

## Understanding the Error

If you encounter this error:
```
ERROR:  42601: syntax error at or near "supabase"
LINE 1: supabase/backups/sql-scripts/complete_production_schema.sql
```

**Root Cause**: You're trying to execute a file path as a SQL command instead of reading the file contents.

**Wrong Approach**:
```sql
-- This sends the file path as a SQL command (will fail)
supabase/backups/sql-scripts/complete_production_schema.sql
```

**Correct Approach**: Use proper tools to read and execute the file contents (see methods below).

## Restore Methods

### Method 1: Using Supabase SQL Editor (Recommended for Production)

**Best for**: Small to medium-sized backups, production databases

1. **Open Supabase Dashboard**
   - Navigate to your project at https://supabase.com/dashboard
   - Go to SQL Editor section

2. **Prepare the SQL File**
   - Open the backup file locally: `supabase/backups/sql-scripts/complete_production_schema.sql`
   - Copy the entire contents of the file

3. **Execute in SQL Editor**
   - Paste the SQL contents into the SQL Editor
   - Review the SQL statements before executing
   - Click "Run" to execute
   - Monitor the execution progress and check for errors

4. **Verify the Restore**
   - Check that all tables exist: Go to Table Editor
   - Verify row counts match expectations
   - Test application functionality

**Limitations**:
- Large files may timeout (>100MB)
- May need to split into smaller chunks
- Browser memory constraints apply

---

### Method 2: Using psql Command-Line (Recommended for Local Development)

**Best for**: Local development, large backup files, automated scripts

**Prerequisites**:
- PostgreSQL client tools installed
- Connection string from Supabase (Settings → Database → Connection String)

**Steps**:

1. **Get Connection String**
   ```bash
   # From Supabase Dashboard → Settings → Database
   # Use the "Connection String" in URI format
   ```

2. **Execute Restore**
   ```bash
   # Basic restore from backup file
   psql "postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres" \
     -f supabase/backups/sql-scripts/complete_production_schema.sql

   # With verbose output
   psql "postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres" \
     -f supabase/backups/sql-scripts/complete_production_schema.sql \
     -v ON_ERROR_STOP=1 \
     -e
   ```

3. **For Local Supabase**
   ```bash
   # If running local Supabase with `npx supabase start`
   psql "postgresql://postgres:postgres@localhost:54322/postgres" \
     -f supabase/backups/sql-scripts/complete_production_schema.sql
   ```

**Command Flags Explained**:
- `-f FILE`: Read commands from file
- `-v ON_ERROR_STOP=1`: Stop on first error
- `-e`: Echo commands before executing
- `-q`: Quiet mode (suppress notices)

---

### Method 3: Using Automated Script (Recommended for Frequent Restores)

**Best for**: Frequent restores, team workflows, CI/CD pipelines

Use the provided restore script:

```bash
# Restore to local database
node scripts/restore-database.js --target local

# Restore to production (requires confirmation)
node scripts/restore-database.js --target production --file supabase/backups/sql-scripts/complete_production_schema.sql

# Dry run (validate without executing)
node scripts/restore-database.js --dry-run --file supabase/backups/sql-scripts/complete_production_schema.sql
```

See `scripts/restore-database.js` for more options.

---

## Backup File Types

### Schema-Only Backups
**Files**: `*_schema.sql`, `production_baseline.sql`
- Contains table structures, functions, policies
- No actual data
- Fast to restore
- Use for: Setting up new environments

### Data-Only Backups
**Files**: `*_data.sql`, `backup.sql`
- Contains INSERT statements only
- Assumes schema already exists
- Use for: Copying data between environments

### Complete Backups
**Files**: `complete_production_schema.sql`, `complete-export.sql`
- Contains both schema AND data
- Self-contained, can restore to empty database
- Larger file size
- Use for: Full disaster recovery

---

## Common Restore Scenarios

### Scenario 1: Setting Up New Instance from Backup

```bash
# 1. Create new Supabase project
# 2. Get connection details from Supabase dashboard

# 3. Restore complete backup
psql "YOUR_CONNECTION_STRING" -f supabase/backups/sql-scripts/complete_production_schema.sql

# 4. Verify tables exist
psql "YOUR_CONNECTION_STRING" -c "\dt"

# 5. Test application connection
npm run dev
```

### Scenario 2: Copying Production Data to Staging

```bash
# 1. Export from production (already done - backup file exists)

# 2. Restore schema to staging first
psql "STAGING_CONNECTION_STRING" -f supabase/migrations/20251005220000_production_baseline.sql

# 3. Restore data only
psql "STAGING_CONNECTION_STRING" -f supabase/backups/sql-scripts/production_data.sql

# 4. Verify and test
```

### Scenario 3: Recovering from Accidental Data Loss

```bash
# 1. STOP ALL APPLICATIONS immediately to prevent further changes

# 2. Create backup of current state (even if corrupted)
node scripts/export-database.js

# 3. Restore from last known good backup
psql "YOUR_CONNECTION_STRING" -f supabase/backups/sql-scripts/complete_production_schema.sql

# 4. Verify data integrity
# 5. Resume application operations
```

---

## Pre-Restore Checklist

Before restoring a database, verify:

- [ ] You have a current backup of the target database
- [ ] You've tested the restore process on a non-production environment
- [ ] All applications accessing the database are stopped or in maintenance mode
- [ ] You have the correct connection credentials
- [ ] The backup file is not corrupted (check file size > 0)
- [ ] You have sufficient disk space on the target database
- [ ] You've reviewed the SQL file for any hardcoded values that need updating
- [ ] Team members are notified of the restore operation

---

## Troubleshooting

### Error: "syntax error at or near [file path]"
**Problem**: File path sent as SQL command
**Solution**: Use `-f` flag with psql or copy file contents

### Error: "permission denied"
**Problem**: Insufficient database privileges
**Solution**: Use superuser credentials or check RLS policies

### Error: "relation already exists"
**Problem**: Tables already exist in target database
**Solution**:
- Drop existing tables first (dangerous!)
- Or use `DROP TABLE IF EXISTS` in backup file
- Or restore to clean database

### Error: "out of memory"
**Problem**: Backup file too large for browser/memory
**Solution**: Use psql command-line instead of SQL Editor

### Restore Hangs or Takes Too Long
**Problem**: Large dataset or slow connection
**Solution**:
- Use local database connection if possible
- Split backup into smaller chunks
- Disable indexes during restore, rebuild after
- Use `COPY` instead of `INSERT` for large datasets

### Partial Restore Success
**Problem**: Some tables restored, others failed
**Solution**:
- Check error logs for specific failures
- May need to restore failed tables individually
- Verify foreign key dependencies are in correct order

---

## Best Practices

1. **Always Test First**: Restore to a test environment before production
2. **Create Pre-Restore Backup**: Always backup current state before restoring
3. **Use Version Control**: Keep backup files in git with meaningful names
4. **Document Changes**: Add comments to backup files explaining what changed
5. **Automate Regular Backups**: Use scheduled jobs for consistent backups
6. **Validate After Restore**: Always verify data integrity after restoration
7. **Monitor Disk Space**: Ensure sufficient space before large restores
8. **Use Transactions**: Wrap restores in transactions when possible for rollback capability

---

## Security Considerations

⚠️ **CRITICAL SECURITY WARNINGS**:

- Never commit backup files containing production data to version control
- Never share backup files via unsecured channels (email, Slack, etc.)
- Use encrypted connections when transferring backup files
- Sanitize data before sharing backups with external parties
- Keep connection strings and passwords secure (use environment variables)
- Audit who has access to backup files and database credentials
- Consider encrypting backup files at rest

---

## Automated Backup Schedule

Recommended backup strategy:

- **Hourly**: Schema-only backups (lightweight, fast recovery of structure)
- **Daily**: Complete backups (full disaster recovery capability)
- **Weekly**: Archived backups (long-term retention)
- **Before Major Changes**: Manual backup before deployments or migrations

Use Supabase's built-in backup features or set up your own automation with the export scripts.

---

## Additional Resources

- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [PostgreSQL Backup & Restore](https://www.postgresql.org/docs/current/backup.html)
- [Project Export Scripts](../../scripts/export-database.js)
- [New Instance Setup Guide](./NEW_INSTANCE_SETUP.md)

---

*Last Updated: 2025-10-15*
