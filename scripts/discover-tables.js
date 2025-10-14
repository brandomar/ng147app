/**
 * Discover all tables in your Supabase database
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

async function discoverTables() {
  try {
    console.log('🔍 Discovering tables in your database...\n');
    
    // Query to get all tables in the public schema
    const { data, error } = await supabase.rpc('get_all_tables');
    
    if (error) {
      // If the RPC doesn't exist, try a different approach
      console.log('⚠️  RPC method not available, trying alternative approach...\n');
      
      // Try to query information_schema directly
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
        
      if (tablesError) {
        console.error('❌ Error querying tables:', tablesError);
        return;
      }
      
      if (tables && tables.length > 0) {
        console.log('📋 Tables found in your database:');
        tables.forEach(table => {
          console.log(`  - ${table.table_name}`);
        });
      } else {
        console.log('⚠️  No tables found or unable to access information_schema');
      }
    } else {
      console.log('📋 Tables found in your database:');
      data.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error discovering tables:', error);
  }
}

// Run the discovery
discoverTables();
