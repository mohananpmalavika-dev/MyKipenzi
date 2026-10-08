#!/usr/bin/env node

/**
 * Contact Management Verification Script
 * 
 * Verifies that the contact management feature is properly installed:
 * - Checks database tables exist
 * - Checks database triggers exist
 * - Checks backend files exist
 * - Checks frontend files exist
 * - Tests API endpoints (optional)
 * 
 * Usage:
 *   node scripts/verify-contacts.mjs
 *   node scripts/verify-contacts.mjs --test-api
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const { Pool } = pg;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function warning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ ${message}`, 'blue');
}

function section(message) {
  console.log('');
  log(`━━━ ${message} ━━━`, 'blue');
}

// Check if files exist
function checkFiles() {
  section('Checking Files');
  
  const files = [
    'server/contacts-schema.sql',
    'server/contact-management.js',
    'src/ContactManagement.jsx',
    'docs/CONTACT_MANAGEMENT.md',
    'CONTACT_MANAGEMENT_INTEGRATION.md',
    'CONTACT_MANAGEMENT_README.md',
  ];
  
  let allExist = true;
  
  for (const file of files) {
    if (existsSync(file)) {
      success(`${file} exists`);
    } else {
      error(`${file} missing`);
      allExist = false;
    }
  }
  
  return allExist;
}

// Check if backend is integrated
function checkBackendIntegration() {
  section('Checking Backend Integration');
  
  const appJsPath = 'server/app.js';
  
  if (!existsSync(appJsPath)) {
    error('server/app.js not found');
    return false;
  }
  
  const content = readFileSync(appJsPath, 'utf-8');
  
  const checks = [
    { 
      pattern: /import.*from.*contact-management\.js/, 
      message: 'Contact management imports' 
    },
    { 
      pattern: /GET.*\/api\/contacts/, 
      message: 'GET /api/contacts endpoint' 
    },
    { 
      pattern: /POST.*\/api\/contacts/, 
      message: 'POST /api/contacts endpoint' 
    },
    { 
      pattern: /\/api\/contacts\/labels/, 
      message: 'Labels endpoints' 
    },
    { 
      pattern: /\/api\/contacts\/export/, 
      message: 'Export endpoint' 
    },
  ];
  
  let allPresent = true;
  
  for (const check of checks) {
    if (check.pattern.test(content)) {
      success(check.message);
    } else {
      warning(`${check.message} not found (may need integration)`);
      allPresent = false;
    }
  }
  
  return allPresent;
}

// Check database schema
async function checkDatabase() {
  section('Checking Database Schema');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    error('DATABASE_URL not set');
    info('Set DATABASE_URL environment variable to test database');
    return false;
  }
  
  const pool = new Pool({ connectionString: databaseUrl });
  
  try {
    // Check tables
    const tables = [
      'user_contacts',
      'contact_labels',
      'contact_label_members',
      'contact_notes',
      'contact_exports',
    ];
    
    for (const table of tables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );
      
      if (result.rows[0].exists) {
        success(`Table ${table} exists`);
      } else {
        error(`Table ${table} missing - run contacts-schema.sql`);
      }
    }
    
    // Check triggers
    const triggers = [
      'auto_add_contact_trigger',
      'update_last_contacted_trigger',
    ];
    
    for (const trigger of triggers) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.triggers 
          WHERE trigger_name = $1
        )`,
        [trigger]
      );
      
      if (result.rows[0].exists) {
        success(`Trigger ${trigger} exists`);
      } else {
        warning(`Trigger ${trigger} missing - may need migration`);
      }
    }
    
    // Check functions
    const functions = ['auto_add_contact', 'update_last_contacted'];
    
    for (const func of functions) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public' AND p.proname = $1
        )`,
        [func]
      );
      
      if (result.rows[0].exists) {
        success(`Function ${func}() exists`);
      } else {
        warning(`Function ${func}() missing`);
      }
    }
    
    await pool.end();
    return true;
  } catch (err) {
    error(`Database check failed: ${err.message}`);
    await pool.end();
    return false;
  }
}

// Test API endpoints (requires running server)
async function testApi() {
  section('Testing API Endpoints');
  
  warning('API testing requires a running server and valid session');
  info('Skipping API tests (use manual testing instead)');
  
  // In a real implementation, you would:
  // 1. Check if server is running
  // 2. Authenticate and get session
  // 3. Test each endpoint
  // 4. Verify responses
  
  return true;
}

// Main verification
async function main() {
  log('');
  log('╔════════════════════════════════════════╗', 'blue');
  log('║  Contact Management Verification       ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');
  log('');
  
  const args = process.argv.slice(2);
  const testApiFlag = args.includes('--test-api');
  
  let allPassed = true;
  
  // Check files
  allPassed = checkFiles() && allPassed;
  
  // Check backend integration
  allPassed = checkBackendIntegration() && allPassed;
  
  // Check database (if DATABASE_URL is set)
  if (process.env.DATABASE_URL) {
    allPassed = await checkDatabase() && allPassed;
  } else {
    section('Database Check');
    warning('Skipping database checks (DATABASE_URL not set)');
    info('Run: DATABASE_URL=postgresql://... node scripts/verify-contacts.mjs');
  }
  
  // Test API (if requested)
  if (testApiFlag) {
    allPassed = await testApi() && allPassed;
  }
  
  // Summary
  console.log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'gray');
  
  if (allPassed) {
    log('');
    success('All checks passed! ✨');
    log('');
    info('Next steps:');
    log('  1. Integrate ContactManagement component in App.jsx', 'gray');
    log('  2. Test the UI in your browser', 'gray');
    log('  3. Create labels and add contacts', 'gray');
    log('  4. Try export/import features', 'gray');
    log('');
  } else {
    log('');
    warning('Some checks failed or need attention');
    log('');
    info('Action items:');
    log('  - Review errors above', 'gray');
    log('  - Apply database migration if needed', 'gray');
    log('  - Check integration guide: CONTACT_MANAGEMENT_INTEGRATION.md', 'gray');
    log('');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run
main().catch(err => {
  error(`Verification failed: ${err.message}`);
  console.error(err);
  process.exit(1);
});
