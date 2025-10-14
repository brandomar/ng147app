/**
 * Export script for your actual database tables
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.log('Make sure you have VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Your actual tables
const TABLES = [
  'brand_settings',
  'clients', 
  'invitations',
  'metric_definitions',
  'metrics',
  'sync_status',
  'user_client_access',
  'user_notification_preferences',
  'user_notifications',
  'users'
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
      return `-- ${tableName.toUpperCase()} (EMPTY)\n-- No data to export\n`;
    }

    console.log(`✅ Found ${data.length} rows in ${tableName}`);

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

    return `-- ${tableName.toUpperCase()} DATA (${data.length} rows)\n${sqlStatements.join('\n')}\n`;
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
  
  for (const table of TABLES) {
    const sql = await exportTable(table);
    if (sql) {
      // Save individual table export
      const filename = `${exportDir}/${table}.sql`;
      fs.writeFileSync(filename, sql);
      console.log(`✅ Exported ${table} to ${filename}`);
      
      allExports.push(sql);
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
  console.log(`2. Copy the supabase/migrations/ folder to your new project`);
  console.log(`3. Run migrations on new database: npx supabase db push`);
  console.log(`4. Import the data using the SQL files in your new project's SQL Editor`);
}

// Run the export
exportAllTables().catch(console.error);
