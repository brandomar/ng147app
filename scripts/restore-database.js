#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_BACKUP_FILE = path.join(__dirname, '..', 'supabase', 'backups', 'sql-scripts', 'complete_production_schema.sql');
const LOCAL_CONNECTION_STRING = 'postgresql://postgres:postgres@localhost:54322/postgres';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    target: 'local',
    file: DEFAULT_BACKUP_FILE,
    dryRun: false,
    verbose: false,
    skipConfirmation: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--target':
        options.target = args[++i];
        break;
      case '--file':
      case '-f':
        options.file = args[++i];
        break;
      case '--dry-run':
      case '--validate':
        options.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--yes':
      case '-y':
        options.skipConfirmation = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        if (args[i].startsWith('--')) {
          console.error(`❌ Unknown option: ${args[i]}`);
          console.log('Use --help for usage information');
          process.exit(1);
        }
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Database Restore Script

Usage: node scripts/restore-database.js [options]

Options:
  --target <type>        Target environment: 'local' or 'production' (default: local)
  --file, -f <path>      Path to SQL backup file (default: supabase/backups/sql-scripts/complete_production_schema.sql)
  --dry-run, --validate  Validate backup file without executing restore
  --verbose, -v          Show detailed output during restore
  --yes, -y              Skip confirmation prompts (use with caution!)
  --help, -h             Show this help message

Examples:
  # Restore to local database
  node scripts/restore-database.js --target local

  # Restore to production (requires confirmation)
  node scripts/restore-database.js --target production --file backups/production.sql

  # Validate backup file without executing
  node scripts/restore-database.js --dry-run --file backups/production.sql

  # Restore with verbose output
  node scripts/restore-database.js --target local --verbose

Environment Variables:
  SUPABASE_DB_URL        Connection string for production database
                         Format: postgresql://user:pass@host:port/database

Important Notes:
  - Always backup current database before restoring
  - Test restore on non-production environment first
  - Production restores require explicit confirmation
  - Use --dry-run to validate backup files before restore
`);
}

function validateBackupFile(filePath) {
  console.log(`\n🔍 Validating backup file: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: Backup file not found: ${filePath}`);
    return false;
  }

  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    console.error(`❌ Error: Backup file is empty (0 bytes)`);
    return false;
  }

  console.log(`✅ File exists: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').length;

    const hasSqlCommands = content.includes('CREATE') ||
                          content.includes('INSERT') ||
                          content.includes('ALTER') ||
                          content.includes('UPDATE');

    if (!hasSqlCommands) {
      console.warn(`⚠️  Warning: File doesn't appear to contain SQL commands`);
      return false;
    }

    console.log(`✅ Contains ${lines} lines of SQL`);
    console.log(`✅ Backup file appears valid`);
    return true;
  } catch (error) {
    console.error(`❌ Error reading backup file: ${error.message}`);
    return false;
  }
}

function getConnectionString(target) {
  if (target === 'local') {
    return LOCAL_CONNECTION_STRING;
  } else if (target === 'production') {
    const prodUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
    if (!prodUrl) {
      console.error(`❌ Error: Production connection string not found`);
      console.error(`   Set SUPABASE_DB_URL environment variable`);
      console.error(`   Example: export SUPABASE_DB_URL="postgresql://user:pass@host:port/database"`);
      process.exit(1);
    }
    return prodUrl;
  } else {
    console.error(`❌ Error: Unknown target: ${target}`);
    console.error(`   Valid targets: 'local', 'production'`);
    process.exit(1);
  }
}

function testConnection(connectionString) {
  console.log(`\n🔌 Testing database connection...`);

  try {
    const result = execSync(
      `psql "${connectionString}" -c "SELECT version();" -t`,
      { encoding: 'utf8', stdio: 'pipe' }
    );

    console.log(`✅ Connection successful`);
    if (result.includes('PostgreSQL')) {
      const version = result.trim().split(' ')[1];
      console.log(`   PostgreSQL version: ${version}`);
    }
    return true;
  } catch (error) {
    console.error(`❌ Connection failed: ${error.message}`);
    console.error(`\nTroubleshooting:`);
    console.error(`  - Check that database is running`);
    console.error(`  - Verify connection string is correct`);
    console.error(`  - Ensure network access to database`);
    return false;
  }
}

function createPreRestoreBackup(connectionString) {
  console.log(`\n💾 Creating pre-restore backup...`);

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupDir = path.join(__dirname, '..', 'supabase', 'backups', 'pre-restore');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFile = path.join(backupDir, `backup-before-restore-${timestamp}.sql`);

    execSync(
      `pg_dump "${connectionString}" -f "${backupFile}"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );

    const stats = fs.statSync(backupFile);
    console.log(`✅ Pre-restore backup created: ${backupFile}`);
    console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    return backupFile;
  } catch (error) {
    console.error(`⚠️  Warning: Failed to create pre-restore backup: ${error.message}`);
    console.error(`   Continuing without backup (not recommended)`);
    return null;
  }
}

async function confirmRestore(target, backupFile) {
  console.log(`\n⚠️  RESTORE CONFIRMATION REQUIRED ⚠️`);
  console.log(`\nTarget: ${target.toUpperCase()}`);
  console.log(`Backup file: ${backupFile}`);
  console.log(`\nThis will:`);
  console.log(`  - Execute SQL commands from the backup file`);
  console.log(`  - May overwrite existing data`);
  console.log(`  - Cannot be easily undone`);

  const answer = await askQuestion(`\nType 'YES' to proceed with restore: `);

  return answer.trim().toLowerCase() === 'yes';
}

function performRestore(connectionString, backupFile, verbose) {
  console.log(`\n🚀 Starting database restore...`);
  console.log(`   This may take several minutes for large backups\n`);

  try {
    const flags = [
      '-f', `"${backupFile}"`,
      '-v', 'ON_ERROR_STOP=1',
    ];

    if (verbose) {
      flags.push('-e');
    }

    const command = `psql "${connectionString}" ${flags.join(' ')}`;

    const result = execSync(command, {
      encoding: 'utf8',
      stdio: verbose ? 'inherit' : 'pipe',
      maxBuffer: 50 * 1024 * 1024
    });

    console.log(`\n✅ Database restore completed successfully!`);

    return true;
  } catch (error) {
    console.error(`\n❌ Restore failed!`);
    console.error(`\nError details:`);
    console.error(error.message);

    if (error.stderr) {
      console.error(`\nDatabase errors:`);
      console.error(error.stderr);
    }

    console.error(`\nRestore was incomplete. You may need to:`);
    console.error(`  1. Check the error messages above`);
    console.error(`  2. Review the backup file for issues`);
    console.error(`  3. Restore from pre-restore backup if needed`);

    return false;
  }
}

function verifyRestore(connectionString) {
  console.log(`\n🔍 Verifying restore...`);

  try {
    const tableCount = execSync(
      `psql "${connectionString}" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" -t`,
      { encoding: 'utf8', stdio: 'pipe' }
    );

    console.log(`✅ Found ${tableCount.trim()} tables in public schema`);

    const tables = execSync(
      `psql "${connectionString}" -c "\\dt" -t`,
      { encoding: 'utf8', stdio: 'pipe' }
    );

    if (tables.trim()) {
      console.log(`\nKey tables present:`);
      const tableList = tables.trim().split('\n').slice(0, 10);
      tableList.forEach(table => {
        const parts = table.trim().split('|');
        if (parts.length >= 2) {
          console.log(`  - ${parts[1].trim()}`);
        }
      });

      if (tables.trim().split('\n').length > 10) {
        console.log(`  ... and ${tables.trim().split('\n').length - 10} more`);
      }
    }

    return true;
  } catch (error) {
    console.error(`⚠️  Warning: Could not verify restore: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════╗
║     Database Restore Script                   ║
╚═══════════════════════════════════════════════╝
`);

  const options = parseArgs();

  console.log(`Configuration:`);
  console.log(`  Target: ${options.target}`);
  console.log(`  Backup file: ${options.file}`);
  console.log(`  Dry run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log(`  Verbose: ${options.verbose ? 'Yes' : 'No'}`);

  if (!validateBackupFile(options.file)) {
    process.exit(1);
  }

  if (options.dryRun) {
    console.log(`\n✅ Validation complete (dry run mode)`);
    console.log(`\nTo perform actual restore, remove --dry-run flag`);
    rl.close();
    process.exit(0);
  }

  const connectionString = getConnectionString(options.target);

  if (!testConnection(connectionString)) {
    rl.close();
    process.exit(1);
  }

  if (options.target === 'production' && !options.skipConfirmation) {
    const confirmed = await confirmRestore(options.target, options.file);
    if (!confirmed) {
      console.log(`\n❌ Restore cancelled by user`);
      rl.close();
      process.exit(0);
    }
  } else if (options.target === 'local') {
    console.log(`\n⚠️  Restoring to LOCAL database`);
  }

  const preRestoreBackup = createPreRestoreBackup(connectionString);

  const success = performRestore(connectionString, options.file, options.verbose);

  if (success) {
    verifyRestore(connectionString);

    console.log(`\n╔═══════════════════════════════════════════════╗`);
    console.log(`║  ✅ Restore completed successfully!           ║`);
    console.log(`╚═══════════════════════════════════════════════╝`);

    if (preRestoreBackup) {
      console.log(`\nPre-restore backup saved at:`);
      console.log(`  ${preRestoreBackup}`);
    }

    console.log(`\nNext steps:`);
    console.log(`  1. Test your application connectivity`);
    console.log(`  2. Verify critical data is present`);
    console.log(`  3. Run any post-restore scripts if needed`);

    rl.close();
    process.exit(0);
  } else {
    console.log(`\n╔═══════════════════════════════════════════════╗`);
    console.log(`║  ❌ Restore failed - see errors above        ║`);
    console.log(`╚═══════════════════════════════════════════════╝`);

    if (preRestoreBackup) {
      console.log(`\nTo rollback, restore from pre-restore backup:`);
      console.log(`  node scripts/restore-database.js --file "${preRestoreBackup}"`);
    }

    rl.close();
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`\n❌ Unexpected error: ${error.message}`);
  console.error(error.stack);
  rl.close();
  process.exit(1);
});
