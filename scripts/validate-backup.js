#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  return args;
}

function printHelp() {
  console.log(`
Backup File Validation Script

Usage: node scripts/validate-backup.js <file1> [file2] [...]

Arguments:
  <file>       Path to SQL backup file to validate

Options:
  --help, -h   Show this help message

Examples:
  # Validate single backup file
  node scripts/validate-backup.js supabase/backups/sql-scripts/complete_production_schema.sql

  # Validate multiple backup files
  node scripts/validate-backup.js supabase/backups/sql-scripts/*.sql

  # Validate all backups in directory
  node scripts/validate-backup.js supabase/backups/sql-scripts/*

What This Script Checks:
  ✓ File exists and is readable
  ✓ File is not empty (>0 bytes)
  ✓ File contains valid SQL syntax patterns
  ✓ File has SQL commands (CREATE, INSERT, ALTER, etc.)
  ✓ No obvious syntax errors
  ✓ Reasonable file structure
  ✓ Estimates restore time based on file size

What This Script Does NOT Check:
  ✗ PostgreSQL version compatibility
  ✗ Foreign key constraint violations
  ✗ Data integrity or corruption
  ✗ Hardcoded values that need updating
  ✗ Schema conflicts with target database
`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function estimateRestoreTime(sizeInBytes) {
  const sizeInMB = sizeInBytes / (1024 * 1024);

  if (sizeInMB < 1) {
    return '< 1 minute';
  } else if (sizeInMB < 10) {
    return '1-2 minutes';
  } else if (sizeInMB < 50) {
    return '2-5 minutes';
  } else if (sizeInMB < 100) {
    return '5-10 minutes';
  } else if (sizeInMB < 500) {
    return '10-30 minutes';
  } else {
    return '30+ minutes';
  }
}

function detectBackupType(content) {
  const hasSchema = content.includes('CREATE TABLE') ||
                   content.includes('CREATE FUNCTION') ||
                   content.includes('CREATE POLICY');

  const hasData = content.includes('INSERT INTO') ||
                 content.includes('COPY ') ||
                 /VALUES\s*\(/i.test(content);

  if (hasSchema && hasData) {
    return 'Complete (Schema + Data)';
  } else if (hasSchema) {
    return 'Schema Only';
  } else if (hasData) {
    return 'Data Only';
  } else {
    return 'Unknown / Empty';
  }
}

function countSqlStatements(content) {
  const statements = {
    create: (content.match(/CREATE\s+(TABLE|FUNCTION|POLICY|INDEX|SEQUENCE|TYPE|EXTENSION)/gi) || []).length,
    insert: (content.match(/INSERT\s+INTO/gi) || []).length,
    alter: (content.match(/ALTER\s+TABLE/gi) || []).length,
    drop: (content.match(/DROP\s+(TABLE|FUNCTION|POLICY|INDEX)/gi) || []).length,
    grant: (content.match(/GRANT\s+/gi) || []).length,
    comment: (content.match(/COMMENT\s+ON/gi) || []).length,
  };

  return statements;
}

function findPotentialIssues(content, filePath) {
  const issues = [];
  const warnings = [];

  if (content.length === 0) {
    issues.push('File is empty (0 bytes)');
  }

  if (!/CREATE|INSERT|ALTER|GRANT/i.test(content)) {
    issues.push('No SQL commands detected (CREATE, INSERT, ALTER, GRANT)');
  }

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('supabase/') || line.startsWith('./')) {
      issues.push(`Line ${i + 1}: Looks like a file path instead of SQL: "${line.substring(0, 50)}..."`);
    }

    if (/syntax error|ERROR:/i.test(line)) {
      issues.push(`Line ${i + 1}: Contains error message: "${line.substring(0, 50)}..."`);
    }

    if (line.includes('localhost') && !line.startsWith('--')) {
      warnings.push(`Line ${i + 1}: Contains 'localhost' - may need updating for production`);
    }

    if (/your-password|changeme|test123/i.test(line) && !line.startsWith('--')) {
      warnings.push(`Line ${i + 1}: Contains placeholder password - verify before use`);
    }
  }

  const dropStatements = content.match(/DROP\s+(TABLE|DATABASE|SCHEMA)/gi);
  if (dropStatements && dropStatements.length > 5) {
    warnings.push(`Contains ${dropStatements.length} DROP statements - review carefully before restore`);
  }

  if (content.includes('TRUNCATE')) {
    warnings.push('Contains TRUNCATE statements - will delete existing data');
  }

  if (!/ROW LEVEL SECURITY/i.test(content) && /CREATE TABLE/i.test(content)) {
    warnings.push('No Row Level Security (RLS) policies detected - security risk');
  }

  return { issues, warnings };
}

function analyzeSqlStructure(content) {
  const analysis = {
    tables: new Set(),
    functions: new Set(),
    extensions: new Set(),
    estimatedRows: 0,
  };

  const tableMatches = content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?/gi);
  for (const match of tableMatches) {
    analysis.tables.add(match[1]);
  }

  const functionMatches = content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+["']?(\w+)["']?/gi);
  for (const match of functionMatches) {
    analysis.functions.add(match[1]);
  }

  const extensionMatches = content.matchAll(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+["']?(\w+)["']?/gi);
  for (const match of extensionMatches) {
    analysis.extensions.add(match[1]);
  }

  const insertMatches = content.match(/INSERT\s+INTO/gi);
  if (insertMatches) {
    analysis.estimatedRows = insertMatches.length;
  }

  return analysis;
}

function validateBackupFile(filePath) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`📄 Validating: ${filePath}`);
  console.log(`${'═'.repeat(80)}\n`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ FAIL: File does not exist`);
    return false;
  }

  let stats;
  try {
    stats = fs.statSync(filePath);
  } catch (error) {
    console.error(`❌ FAIL: Cannot read file: ${error.message}`);
    return false;
  }

  console.log(`📊 File Information:`);
  console.log(`   Size: ${formatBytes(stats.size)}`);
  console.log(`   Last Modified: ${stats.mtime.toLocaleString()}`);
  console.log(`   Estimated Restore Time: ${estimateRestoreTime(stats.size)}`);

  if (stats.size === 0) {
    console.error(`\n❌ FAIL: File is empty (0 bytes)`);
    return false;
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`\n❌ FAIL: Cannot read file content: ${error.message}`);
    return false;
  }

  const lines = content.split('\n');
  console.log(`   Lines: ${lines.length.toLocaleString()}`);

  const backupType = detectBackupType(content);
  console.log(`   Type: ${backupType}`);

  const statements = countSqlStatements(content);
  console.log(`\n📝 SQL Statement Summary:`);
  console.log(`   CREATE statements: ${statements.create}`);
  console.log(`   INSERT statements: ${statements.insert}`);
  console.log(`   ALTER statements: ${statements.alter}`);
  console.log(`   DROP statements: ${statements.drop}`);
  console.log(`   GRANT statements: ${statements.grant}`);
  console.log(`   COMMENT statements: ${statements.comment}`);

  const structure = analyzeSqlStructure(content);
  console.log(`\n🗂️  Database Structure:`);
  console.log(`   Tables: ${structure.tables.size}`);
  if (structure.tables.size > 0 && structure.tables.size <= 20) {
    console.log(`   Table names: ${Array.from(structure.tables).join(', ')}`);
  }
  console.log(`   Functions: ${structure.functions.size}`);
  console.log(`   Extensions: ${structure.extensions.size}`);
  if (structure.estimatedRows > 0) {
    console.log(`   Estimated data rows: ~${structure.estimatedRows.toLocaleString()}`);
  }

  const { issues, warnings } = findPotentialIssues(content, filePath);

  if (issues.length > 0) {
    console.log(`\n❌ Issues Found (${issues.length}):`);
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${warnings.length}):`);
    warnings.forEach((warning, i) => {
      console.log(`   ${i + 1}. ${warning}`);
    });
  }

  const isValid = issues.length === 0;

  console.log(`\n${'─'.repeat(80)}`);
  if (isValid) {
    console.log(`✅ VALIDATION PASSED: Backup file appears valid`);
    console.log(`\n💡 Next Steps:`);
    console.log(`   1. Review any warnings above`);
    console.log(`   2. Test restore on non-production environment`);
    console.log(`   3. Create pre-restore backup before applying`);
    console.log(`   4. Run restore: node scripts/restore-database.js --file "${filePath}"`);
  } else {
    console.log(`❌ VALIDATION FAILED: Issues found (see above)`);
    console.log(`\n💡 Recommendations:`);
    console.log(`   1. Fix issues listed above`);
    console.log(`   2. Generate new backup if file is corrupted`);
    console.log(`   3. Do not use this file for restore until fixed`);
  }
  console.log(`${'─'.repeat(80)}`);

  return isValid;
}

function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    SQL Backup File Validation Tool                            ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`);

  const filePaths = parseArgs();

  let totalFiles = 0;
  let validFiles = 0;
  let invalidFiles = 0;

  for (const filePath of filePaths) {
    totalFiles++;
    const isValid = validateBackupFile(filePath);
    if (isValid) {
      validFiles++;
    } else {
      invalidFiles++;
    }
  }

  if (totalFiles > 1) {
    console.log(`\n\n${'═'.repeat(80)}`);
    console.log(`📊 Summary: Validated ${totalFiles} file(s)`);
    console.log(`   ✅ Valid: ${validFiles}`);
    console.log(`   ❌ Invalid: ${invalidFiles}`);
    console.log(`${'═'.repeat(80)}\n`);
  }

  process.exit(invalidFiles > 0 ? 1 : 0);
}

main();
