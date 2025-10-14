#!/usr/bin/env node

/**
 * Debug Configuration Manager
 * 
 * This script helps you manage debug settings via config.json
 * Usage: node scripts/debug-config.js [command] [options]
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

const commands = {
  'set-level': (level) => {
    if (!['debug', 'info', 'warn', 'error'].includes(level)) {
      console.error('❌ Invalid level. Use: debug, info, warn, error');
      process.exit(1);
    }
    
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      config.debug.level = level;
      config.levels.current = level;
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      console.log(`✅ Debug level set to: ${level}`);
    } catch (error) {
      console.error('❌ Failed to update config:', error.message);
      process.exit(1);
    }
  },

  'enable': () => {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      config.debug.enabled = true;
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      console.log('✅ Debug logging enabled');
    } catch (error) {
      console.error('❌ Failed to update config:', error.message);
      process.exit(1);
    }
  },

  'disable': () => {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      config.debug.enabled = false;
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      console.log('✅ Debug logging disabled');
    } catch (error) {
      console.error('❌ Failed to update config:', error.message);
      process.exit(1);
    }
  },

  'status': () => {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      console.log('📊 Current Debug Configuration:');
      console.log(`   Enabled: ${config.debug.enabled}`);
      console.log(`   Level: ${config.debug.level}`);
      console.log(`   Auto-off: ${config.debug.autoOffMinutes} minutes`);
      console.log(`   Timestamp: ${config.debug.showTimestamp}`);
      console.log(`   Component: ${config.debug.showComponent}`);
    } catch (error) {
      console.error('❌ Failed to read config:', error.message);
      process.exit(1);
    }
  },

  'help': () => {
    console.log(`
🔧 Debug Configuration Manager

Usage: node scripts/debug-config.js [command] [options]

Commands:
  set-level <level>    Set debug level (debug, info, warn, error)
  enable              Enable debug logging
  disable             Disable debug logging
  status              Show current configuration
  help                Show this help message

Examples:
  node scripts/debug-config.js set-level debug
  node scripts/debug-config.js enable
  node scripts/debug-config.js status
    `);
  }
};

// Parse command line arguments
const [,, command, ...args] = process.argv;

if (!command || !commands[command]) {
  commands.help();
  process.exit(1);
}

// Execute command
commands[command](...args);
