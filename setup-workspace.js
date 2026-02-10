#!/usr/bin/env node

/**
 * Workspace Setup Script
 * Creates necessary directories for MCP-SUITE workspace
 */

const fs = require('fs');
const path = require('path');

// Load configuration
require('dotenv').config();

const profilesConfig = JSON.parse(fs.readFileSync('profiles.json', 'utf-8'));
const profileName = process.argv[2] || process.env.MCP_PROFILE || 'Personal';

if (process.argv.includes('--profile')) {
  const profileIndex = process.argv.indexOf('--profile');
  const profileArg = process.argv[profileIndex + 1];
  if (profileArg) {
    profileName = profileArg;
  }
}

const profile = profilesConfig.profiles[profileName];

if (!profile) {
  console.error(`Error: Profile "${profileName}" not found`);
  console.error(`Available profiles: ${Object.keys(profilesConfig.profiles).join(', ')}`);
  process.exit(1);
}

const platform = process.platform;
const platformConfig = profile.platforms[platform];

if (!platformConfig) {
  console.error(`Error: Platform "${platform}" not configured for profile "${profileName}"`);
  process.exit(1);
}

const workspace = platformConfig.workspace;

console.log(`\nCreating workspace for profile: ${profileName}`);
console.log(`Workspace: ${workspace}\n`);

// Directories to create
const directories = [
  workspace,
  path.join(workspace, 'data'),
  path.join(workspace, 'cache'),
  path.join(workspace, 'logs'),
  path.join(workspace, 'temp'),
  path.join(workspace, 'uploads'),
  path.join(workspace, 'exports')
];

console.log('Creating directories:');

directories.forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  ✓ ${dir}`);
    } else {
      console.log(`  • ${dir} (already exists)`);
    }
  } catch (error) {
    console.error(`  ✗ ${dir} (error: ${error.message})`);
    process.exit(1);
  }
});

// Create .gitignore in workspace
const gitignore = `# MCP-SUITE Workspace
# These files should not be synced via OneDrive

# Temporary files
temp/
*.tmp

# Cache files
cache/
*.cache

# Log files
logs/
*.log

# Large data files
data/*.db
data/*.sqlite

# Uploads (may contain sensitive data)
uploads/*
!uploads/.gitkeep

# Node modules if any
node_modules/

# Environment files with secrets
.env
.env.local
`;

const gitignorePath = path.join(workspace, '.gitignore');
if (!fs.existsSync(gitignorePath)) {
  fs.writeFileSync(gitignorePath, gitignore);
  console.log(`\n  ✓ Created .gitignore in workspace`);
}

// Create README in workspace
const readme = `# ${profileName} Workspace

This workspace is used by MCP-SUITE for the ${profileName} profile.

## Directory Structure

- **data/**: Persistent data storage
- **cache/**: Temporary cache files
- **logs/**: Server logs
- **temp/**: Temporary working files
- **uploads/**: User uploaded files
- **exports/**: Generated exports

## OneDrive Sync

This workspace is synced via OneDrive. The following directories should be excluded from sync:
- cache/
- logs/
- temp/

Configure OneDrive to exclude these directories for better performance.

## Profile Information

- Profile: ${profileName}
- Platform: ${platform}
- User: ${platformConfig.user}
- Base Port: ${profile.networking.basePort}

Last updated: ${new Date().toISOString()}
`;

const readmePath = path.join(workspace, 'README.md');
fs.writeFileSync(readmePath, readme);
console.log(`  ✓ Created README.md in workspace`);

console.log(`\n✅ Workspace setup complete!\n`);
console.log(`Profile: ${profileName}`);
console.log(`Workspace: ${workspace}`);

// Run OneDrive optimization if in OneDrive directory
const isOneDrive = workspace.includes('OneDrive') || process.cwd().includes('OneDrive');
if (isOneDrive) {
  console.log(`\n🔄 Running OneDrive optimization...`);
  console.log(`   (Excluding heavy folders from sync)\n`);
  
  const { execSync } = require('child_process');
  try {
    if (platform === 'win32') {
      execSync('powershell -ExecutionPolicy Bypass -File .\\optimize-onedrive.ps1 -Silent', { 
        stdio: 'inherit',
        cwd: __dirname 
      });
    } else if (platform === 'darwin') {
      execSync('bash ./optimize-onedrive.sh --silent', { 
        stdio: 'inherit',
        cwd: __dirname 
      });
    }
    console.log(`   ✓ OneDrive optimization complete`);
    console.log(`   ℹ Heavy folders (node_modules, dist) won't sync to cloud\n`);
  } catch (error) {
    console.log(`   ⚠ OneDrive optimization skipped (not critical)\n`);
  }
}

console.log(`\nYou can now start MCP-SUITE with:`);
console.log(`  ./mcp-control.sh start-all   (Mac)`);
console.log(`  .\\mcp-control.ps1 -Command start-all   (Windows)\n`);
