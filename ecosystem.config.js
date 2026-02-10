// PM2 Ecosystem Configuration for MCP-SUITE
// This file is dynamically generated based on the current profile

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const profilesConfig = JSON.parse(fs.readFileSync('profiles.json', 'utf-8'));
const currentProfile = process.env.MCP_PROFILE || 'Personal';
const profile = profilesConfig.profiles[currentProfile];

if (!profile) {
  console.error(`Profile "${currentProfile}" not found`);
  process.exit(1);
}

const platform = process.platform;
const platformConfig = profile.platforms[platform];

if (!platformConfig) {
  console.error(`Platform "${platform}" not configured for profile "${currentProfile}"`);
  process.exit(1);
}

const basePort = profile.networking.basePort;
const workspace = platformConfig.workspace;
const logDir = path.join(workspace, 'logs');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Generate server list (excluding orchestrator which is started separately)
const servers = [
  'mcp-sql-explorer',
  'mcp-fabric-live',
  'mcp-fabric-search',
  'mcp-export',
  'mcp-docs-rag',
  'mcp-kb',
  'mcp-code-search',
  'mcp-code-sync',
  'mcp-git',
  'mcp-vscode-workspace',
  'mcp-docs-generator',
  'mcp-document-generator',
  'mcp-diagram-generator',
  'mcp-error-diagnosis',
  'security-guardian-mcp',
  'auto-remediation',
  'mcp-tokenization-secure',
  'mcp-microsoft-docs',
  'mcp-ml-inference',
  'mcp-synthetic-data-generator',
  'mcp-nl-interface',
  'humanizer-mcp',
  'mcp-observability',
  'mcp-stream-processor',
  'mcp-memory',
  'mcp-frequency-tracking',
  'mcp-impact-analysis',
  'mcp-workflow-automation',
  'mcp-data-pipeline'
];

// Generate PM2 app configurations
const apps = servers.map((serverName, index) => ({
  name: `${currentProfile.toLowerCase()}-${serverName}`,
  script: `./servers/${serverName}/dist/index.js`,
  cwd: __dirname,
  instances: 1,
  exec_mode: 'fork',
  watch: false,
  max_memory_restart: '500M',
  env: {
    MCP_PROFILE: currentProfile,
    NODE_ENV: 'production',
    PORT: basePort + index + 1,
    SERVER_NAME: serverName
  },
  error_file: path.join(logDir, `${serverName}-error.log`),
  out_file: path.join(logDir, `${serverName}-out.log`),
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  merge_logs: true,
  autorestart: true,
  max_restarts: 10,
  min_uptime: '10s'
}));

module.exports = {
  apps
};
