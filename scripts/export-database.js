/**
 * Database Export Script
 * Exports all data from your Supabase database to SQL files
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// List of tables to export (add more as needed)
const TABLES_TO_EXPORT = [
  'brand_settings',
  'clients',
  'client_tabs',
  'discovered_metrics',
  'metric_entries',
  'unified_sync_status',
  'user_client_access',
  'user_access_control',
  // Add other tables as needed
];

async function exportTable(tableName) {
  try {
    console.log(`📤 Exporting ${tableName}...`);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*');

    if (error) {
      console.error(`❌ Error exporting ${tableName}:`, error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log(`⚠️  No data found in ${tableName}`);
      return null;
    }

    // Generate SQL INSERT statements
    const sqlStatements = data.map(row => {
      const columns = Object.keys(row);
      const values = columns.map(col => {
        const value = row[col];
        if (value === null) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        return value;
      });
      
      return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
    });

    return sqlStatements.join('\n');
  } catch (error) {
    console.error(`❌ Error exporting ${tableName}:`, error);
    return null;
  }
}

async function exportAllTables() {
  console.log('🚀 Starting database export...\n');
  
  const exportDir = './database-export';
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }

  const allExports = [];
  
  for (const table of TABLES_TO_EXPORT) {
    const sql = await exportTable(table);
    if (sql) {
      // Save individual table export
      const filename = `${exportDir}/${table}.sql`;
      fs.writeFileSync(filename, sql);
      console.log(`✅ Exported ${table} to ${filename}`);
      
      allExports.push(`-- ${table.toUpperCase()} DATA\n${sql}\n`);
    }
  }

  // Create combined export file
  const combinedExport = allExports.join('\n');
  const combinedFilename = `${exportDir}/complete-export.sql`;
  fs.writeFileSync(combinedFilename, combinedExport);
  
  console.log(`\n🎉 Export complete!`);
  console.log(`📁 Individual table files: ${exportDir}/`);
  console.log(`📄 Combined export: ${combinedFilename}`);
  console.log(`\n📋 Next steps:`);
  console.log(`1. Copy the SQL files to your new project`);
  console.log(`2. Run the migrations on your new database`);
  console.log(`3. Import the data using the SQL files`);
}

// Run the export
exportAllTables().catch(console.error);
