#!/usr/bin/env node

/**
 * MCP Server Conversion Script
 * Automates conversion of HTTP servers to MCP protocol
 */

const fs = require('fs');
const path = require('path');

// Standard servers to convert (25 remaining after error-diagnosis)
const standardServers = [
  { name: 'auto-remediation', tool: 'auto_remediate', description: 'Automatic code and configuration remediation', className: 'AutoRemediation' },
  { name: 'humanizer-mcp', tool: 'humanize_text', description: 'Humanize AI-generated text', className: 'Humanizer' },
  { name: 'mcp-code-search', tool: 'search_code', description: 'Search and find code patterns', className: 'CodeSearch' },
  { name: 'mcp-code-sync', tool: 'sync_code', description: 'Synchronize code across repositories', className: 'CodeSync' },
  { name: 'mcp-diagram-generator', tool: 'generate_diagram', description: 'Generate diagrams from descriptions', className: 'DiagramGenerator' },
  { name: 'mcp-docs-generator', tool: 'generate_docs', description: 'Generate documentation from code', className: 'DocsGenerator' },
  { name: 'mcp-docs-rag', tool: 'query_docs', description: 'Query documentation using RAG', className: 'DocsRag' },
  { name: 'mcp-document-generator', tool: 'generate_document', description: 'Generate structured documents', className: 'DocumentGenerator' },
  { name: 'mcp-export', tool: 'export_data', description: 'Export data in various formats', className: 'Export' },
  { name: 'mcp-fabric-live', tool: 'fabric_live', description: 'Live fabric pattern processing', className: 'FabricLive' },
  { name: 'mcp-fabric-search', tool: 'fabric_search', description: 'Search fabric patterns', className: 'FabricSearch' },
  { name: 'mcp-frequency-tracking', tool: 'track_frequency', description: 'Track term and pattern frequency', className: 'FrequencyTracking' },
  { name: 'mcp-git', tool: 'git_operations', description: 'Git operations and analysis', className: 'Git' },
  { name: 'mcp-impact-analysis', tool: 'analyze_impact', description: 'Analyze code change impact', className: 'ImpactAnalysis' },
  { name: 'mcp-kb', tool: 'query_knowledge_base', description: 'Query knowledge base', className: 'KnowledgeBase' },
  { name: 'mcp-memory', tool: 'manage_memory', description: 'Manage conversation memory', className: 'Memory' },
  { name: 'mcp-microsoft-docs', tool: 'search_ms_docs', description: 'Search Microsoft documentation', className: 'MicrosoftDocs' },
  { name: 'mcp-ml-inference', tool: 'ml_inference', description: 'Machine learning inference', className: 'MLInference' },
  { name: 'mcp-nl-interface', tool: 'natural_language', description: 'Natural language interface', className: 'NaturalLanguage' },
  { name: 'mcp-observability', tool: 'observe_system', description: 'System observability and monitoring', className: 'Observability' },
  { name: 'mcp-stream-processor', tool: 'process_stream', description: 'Process data streams', className: 'StreamProcessor' },
  { name: 'mcp-synthetic-data-generator', tool: 'generate_synthetic_data', description: 'Generate synthetic test data', className: 'SyntheticDataGenerator' },
  { name: 'mcp-tokenization-secure', tool: 'secure_tokenize', description: 'Secure tokenization and detokenization', className: 'TokenizationSecure' },
  { name: 'mcp-vscode-workspace', tool: 'manage_workspace', description: 'Manage VSCode workspace', className: 'VSCodeWorkspace' },
  { name: 'security-guardian-mcp', tool: 'check_security', description: 'Security analysis and recommendations', className: 'SecurityGuardian' }
];

const packageJsonTemplate = {
  "version": "3.0.0",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsc && node dist/index.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@mcp-suite/shared": "file:../../shared",
    "@modelcontextprotocol/sdk": "^1.0.4"
  },
  "devDependencies": {
    "@types/node": "^20.10.5",
    "typescript": "^5.3.3"
  }
};

const tsconfigTemplate = {
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "ESNext",
    "target": "ES2020",
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
};

function convertServer(serverConfig) {
  const { name, tool, description, className } = serverConfig;
  const serverDir = path.join(__dirname, '../servers', name);
  
  console.log(`\n🔄 Converting ${name}...`);

  // Check if server directory exists
  if (!fs.existsSync(serverDir)) {
    console.log(`❌ Server directory not found: ${serverDir}`);
    return false;
  }

  try {
    // Read template
    const templatePath = path.join(__dirname, '../templates/standard-mcp-server.ts');
    let code = fs.readFileSync(templatePath, 'utf8');

    // Replace placeholders
    code = code
      .replace(/__SERVER_NAME__/g, name)
      .replace(/__TOOL_NAME__/g, tool)
      .replace(/__DESCRIPTION__/g, description)
      .replace(/__CLASS_NAME__/g, className);

    // Write new index.ts
    const srcPath = path.join(serverDir, 'src/index.ts');
    fs.writeFileSync(srcPath, code);
    console.log(`  ✅ Updated src/index.ts`);

    // Update package.json
    const pkgPath = path.join(serverDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    
    const newPkg = {
      ...packageJsonTemplate,
      name: pkg.name || `@mcp-suite/${name}`,
      description: `${description} MCP server`
    };
    
    fs.writeFileSync(pkgPath, JSON.stringify(newPkg, null, 2) + '\n');
    console.log(`  ✅ Updated package.json`);

    // Create/update tsconfig.json
    const tsconfigPath = path.join(serverDir, 'tsconfig.json');
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfigTemplate, null, 2) + '\n');
    console.log(`  ✅ Updated tsconfig.json`);

    console.log(`✅ ${name} converted successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to convert ${name}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🚀 MCP Server Conversion Script');
  console.log('================================\n');
  console.log(`Converting ${standardServers.length} standard servers...\n`);

  let successful = 0;
  let failed = 0;

  for (const server of standardServers) {
    const result = convertServer(server);
    if (result) {
      successful++;
    } else {
      failed++;
    }
  }

  console.log('\n================================');
  console.log('📊 Conversion Summary:');
  console.log(`  ✅ Successful: ${successful}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📝 Total: ${standardServers.length}`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some servers failed to convert. Review errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All servers converted successfully!');
    console.log('\nNext steps:');
    console.log('  1. Run: cd servers/<server-name> && npm install && npm run build');
    console.log('  2. Test each server');
    process.exit(0);
  }
}

main();
