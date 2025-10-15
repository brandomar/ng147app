# Database Backups Directory

This directory contains SQL backup files for the Dashboard Undeniable application.

## Directory Structure

```
backups/
├── README.md (this file)
├── sql-scripts/
│   ├── complete_production_schema.sql    # Complete schema + data backup
│   ├── backup.sql                        # Data-only backup (empty)
│   └── database-export.sql               # Data-only export (empty)
└── pre-restore/                          # Auto-created before restores
    └── backup-before-restore-*.sql       # Pre-restore safety backups
```

## Backup File Types

### Schema + Data Backups
**Files**: `complete_production_schema.sql`
- Contains full database structure (tables, functions, policies) AND all data
- Self-contained - can restore to completely empty database
- Size: Large (varies based on data)
- Use for: Complete disaster recovery, setting up new instances

### Data-Only Backups
**Files**: `backup.sql`, `database-export.sql`
- Contains only INSERT statements for data
- Requires schema to already exist in target database
- Size: Varies based on data volume
- Use for: Copying data between environments with same schema

### Migration Files
**Location**: `../migrations/`
- Contains incremental schema changes
- Version-controlled database evolution
- Applied in sequence with `npx supabase db push`
- Use for: Normal development and deployment

## How to Restore from Backup

**⚠️ IMPORTANT**: Never execute the file path as a SQL command! This will cause a syntax error.

### Quick Start

```bash
# Restore to local database
node scripts/restore-database.js --target local

# Restore to production (requires confirmation)
node scripts/restore-database.js --target production

# Validate backup file without executing
node scripts/restore-database.js --dry-run
```

### Manual Restore with psql

```bash
# Get connection string from Supabase Dashboard → Settings → Database

# Restore using psql
psql "YOUR_CONNECTION_STRING" -f supabase/backups/sql-scripts/complete_production_schema.sql
```

### Using Supabase SQL Editor

1. Open backup file in text editor
2. Copy entire file contents
3. Navigate to Supabase Dashboard → SQL Editor
4. Paste contents and click "Run"

**For detailed restore instructions**, see [DATABASE_RESTORE.md](../../docs/deployment/DATABASE_RESTORE.md)

## Creating New Backups

### Using Export Script

```bash
# Export all tables to SQL files
node scripts/export-database.js

# Output: database-export/ directory with individual table files
```

### Using pg_dump

```bash
# Complete backup (schema + data)
pg_dump "YOUR_CONNECTION_STRING" > supabase/backups/sql-scripts/backup-$(date +%Y%m%d).sql

# Schema only
pg_dump "YOUR_CONNECTION_STRING" --schema-only > supabase/backups/sql-scripts/schema-$(date +%Y%m%d).sql

# Data only
pg_dump "YOUR_CONNECTION_STRING" --data-only > supabase/backups/sql-scripts/data-$(date +%Y%m%d).sql
```

### Using Supabase Dashboard

1. Go to Database → Backups
2. Click "Create backup"
3. Download backup file when ready
4. Save to this directory with descriptive name

## Backup File Naming Convention

Use descriptive names with dates:

```
complete_production_schema.sql          # Latest complete backup
backup-20251015-production.sql          # Production backup from Oct 15, 2025
schema-20251015.sql                     # Schema-only backup
data-20251015.sql                       # Data-only backup
backup-before-migration-v2.sql          # Pre-migration backup
backup-before-restore-20251015.sql      # Auto-created safety backup
```

## Backup Best Practices

1. **Create backups before**:
   - Running database migrations
   - Making schema changes
   - Restoring from another backup
   - Major deployments or releases
   - Data cleanup operations

2. **Regular backup schedule**:
   - Hourly: Schema-only (lightweight)
   - Daily: Complete backup
   - Weekly: Archived for long-term retention
   - Before changes: Manual safety backups

3. **Verify backups**:
   - Check file size is reasonable (not 0 bytes)
   - Validate SQL syntax with dry-run
   - Test restore on non-production environment
   - Keep multiple versions for rollback options

4. **Secure backups**:
   - Never commit production data to version control
   - Encrypt sensitive backup files
   - Store backups in multiple locations
   - Use secure transfer methods
   - Limit access to authorized personnel

5. **Document backups**:
   - Include date and purpose in filename
   - Note what changed since last backup
   - Keep log of restore operations
   - Document any manual post-restore steps

## Current Backup Files

### complete_production_schema.sql
- **Size**: 108,292 bytes (~106 KB)
- **Type**: Complete backup (schema + data)
- **Contains**: Full database structure and all production data
- **Last Updated**: Check file modification date
- **Use**: Disaster recovery, new instance setup

### backup.sql
- **Size**: 0 bytes (empty)
- **Type**: Placeholder
- **Contains**: Nothing
- **Status**: Not currently used

### database-export.sql
- **Size**: 0 bytes (empty)
- **Type**: Placeholder
- **Contains**: Nothing
- **Status**: Not currently used

## Troubleshooting

### Error: "syntax error at or near 'supabase'"
**Problem**: File path executed as SQL command
**Solution**: Use proper restore method (see above)
**Details**: [DATABASE_RESTORE.md](../../docs/deployment/DATABASE_RESTORE.md)

### Backup file is empty (0 bytes)
**Problem**: Export failed or was not run
**Solution**: Run export script to generate new backup
```bash
node scripts/export-database.js
```

### Restore fails with "relation already exists"
**Problem**: Tables already exist in target database
**Solution**:
- Restore to clean database, or
- Drop existing tables first (dangerous!), or
- Use data-only backup instead

### Restore hangs or takes too long
**Problem**: Large backup file or slow connection
**Solution**:
- Use local connection if possible
- Split backup into smaller chunks
- Use command-line tools instead of web interface

## Related Documentation

- [DATABASE_RESTORE.md](../../docs/deployment/DATABASE_RESTORE.md) - Complete restore guide
- [NEW_INSTANCE_SETUP.md](../../docs/deployment/NEW_INSTANCE_SETUP.md) - New deployment guide
- [Migration Files](../migrations/) - Schema version control

## Support

If you encounter issues with backups or restores:
1. Check the troubleshooting section above
2. Review [DATABASE_RESTORE.md](../../docs/deployment/DATABASE_RESTORE.md)
3. Validate backup file with `--dry-run` flag
4. Test restore on local environment first

---

**⚠️ Remember**: Always test restores on non-production environments first!

*Last updated: 2025-10-15*
