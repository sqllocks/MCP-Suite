#!/usr/bin/env node

/**
 * Build All Servers Script
 * Compiles TypeScript for shared library and all MCP servers
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building MCP-SUITE\n');

// Step 1: Build shared library
console.log('📦 Building shared library...');
try {
  process.chdir('shared');
  if (!fs.existsSync('node_modules')) {
    console.log('   Installing shared dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  }
  execSync('npm run build', { stdio: 'inherit' });
  process.chdir('..');
  console.log('   ✓ Shared library built\n');
} catch (error) {
  console.error('   ✗ Failed to build shared library');
  process.exit(1);
}

// Step 2: Get list of all servers
const serversDir = 'servers';
const servers = fs.readdirSync(serversDir).filter(name => {
  const serverPath = path.join(serversDir, name);
  return fs.statSync(serverPath).isDirectory();
});

console.log(`🚀 Building ${servers.length} servers...\n`);

let successCount = 0;
let failCount = 0;

// Step 3: Build each server
for (const serverName of servers) {
  const serverPath = path.join(serversDir, serverName);
  
  try {
    process.chdir(serverPath);
    
    // Install dependencies if needed
    if (!fs.existsSync('node_modules')) {
      console.log(`   [${serverName}] Installing dependencies...`);
      execSync('npm install', { stdio: 'pipe' });
    }
    
    // Build TypeScript
    console.log(`   [${serverName}] Compiling TypeScript...`);
    execSync('npm run build', { stdio: 'pipe' });
    
    console.log(`   ✓ ${serverName}`);
    successCount++;
    
  } catch (error) {
    console.error(`   ✗ ${serverName} - ${error.message}`);
    failCount++;
  } finally {
    process.chdir('../..');
  }
}

// Step 4: Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Build Summary:`);
console.log(`  ✓ Shared library: built`);
console.log(`  ✓ Servers built: ${successCount}/${servers.length}`);
if (failCount > 0) {
  console.log(`  ✗ Failed: ${failCount}`);
}
console.log(${'='.repeat(50)}\n');

if (failCount === 0) {
  console.log('🎉 All builds successful!\n');
  console.log('Next steps:');
  console.log('  1. Configure .env file');
  console.log('  2. Run: node setup-workspace.js --profile Personal');
  console.log('  3. Run: ./mcp-control.sh start-all (Mac)');
  console.log('  3. Run: .\\mcp-control.ps1 -Command start-all (Windows)\n');
} else {
  console.error('⚠️  Some builds failed. Check the errors above.\n');
  process.exit(1);
}
