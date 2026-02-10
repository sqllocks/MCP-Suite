#!/usr/bin/env node

/**
 * Apply SOC 2 Security Updates to All MCP Servers
 * 
 * This script updates all 28 servers with comprehensive security implementations:
 * - Input validation with Joi schemas
 * - Rate limiting
 * - Parent process validation
 * - Request timeouts
 * - Memory monitoring
 * - Prompt injection detection
 * - Security logging
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SERVERS_DIR = path.join(__dirname, '../servers');

const STANDARD_SERVERS = [
  'auto-remediation',
  'humanizer-mcp',
  'mcp-code-search',
  'mcp-code-sync',
  'mcp-diagram-generator',
  'mcp-docs-generator',
  'mcp-docs-rag',
  'mcp-document-generator',
  'mcp-error-diagnosis',
  'mcp-export',
  'mcp-fabric-live',
  'mcp-fabric-search',
  'mcp-frequency-tracking',
  'mcp-git',
  'mcp-impact-analysis',
  'mcp-kb',
  'mcp-memory',
  'mcp-microsoft-docs',
  'mcp-ml-inference',
  'mcp-nl-interface',
  'mcp-observability',
  'mcp-stream-processor',
  'mcp-synthetic-data-generator',
  'mcp-tokenization-secure',
  'mcp-vscode-workspace',
  'security-guardian-mcp'
];

const CUSTOM_SERVERS = [
  'mcp-sql-explorer',
  'mcp-orchestrator-v1'
];

console.log('🔒 Applying SOC 2 Security Updates to MCP-SUITE');
console.log('================================================\n');

// Function to add security imports and initialization
function addSecurityToServer(serverPath, serverName) {
  const indexPath = path.join(serverPath, 'src/index.ts');
  
  if (!fs.existsSync(indexPath)) {
    console.log(`  ⚠️  ${serverName}: index.ts not found, skipping`);
    return false;
  }

  let content = fs.readFileSync(indexPath, 'utf8');

  // Check if already updated
  if (content.includes('createSecurityValidator')) {
    console.log(`  ✓ ${serverName}: Already secured`);
    return true;
  }

  // Add security imports after other imports from shared
  const sharedImportRegex = /from '@mcp-suite\/shared';/;
  if (sharedImportRegex.test(content)) {
    content = content.replace(
      sharedImportRegex,
      `from '@mcp-suite/shared';\nimport {\n  createSecurityValidator,\n  createRateLimiter,\n  SecurityValidator,\n  RateLimiter,\n  SECURITY_LIMITS,\n  inputSchemas\n} from '@mcp-suite/shared';`
    );
  }

  // Add security properties to class
  const classMatch = content.match(/class (\w+) \{/);
  if (classMatch) {
    const afterClassDecl = content.indexOf('{', content.indexOf(classMatch[0])) + 1;
    const securityProperties = `
  private securityValidator: SecurityValidator;
  private rateLimiter: RateLimiter;
  private requestCount: number = 0;`;
    
    content = content.slice(0, afterClassDecl) + securityProperties + content.slice(afterClassDecl);
  }

  // Initialize security in constructor after logger initialization
  const loggerInitRegex = /this\.logger = createLogger\(/;
  if (loggerInitRegex.test(content)) {
    const loggerEndMatch = content.match(/this\.logger = createLogger\([^)]+\);/);
    if (loggerEndMatch) {
      const insertPos = content.indexOf(loggerEndMatch[0]) + loggerEndMatch[0].length;
      const securityInit = `\n\n    // Initialize security\n    this.securityValidator = createSecurityValidator(this.logger);\n    this.rateLimiter = createRateLimiter(SECURITY_LIMITS.MAX_REQUESTS_PER_MINUTE, 60000);\n    \n    // Validate parent process\n    this.securityValidator.validateParentProcess();\n    \n    // Start memory monitoring\n    setInterval(() => {\n      this.securityValidator.checkMemoryUsage();\n    }, SECURITY_LIMITS.MEMORY_CHECK_INTERVAL_MS);`;
      
      content = content.slice(0, insertPos) + securityInit + content.slice(insertPos);
    }
  }

  // Add security validation to tool handlers
  // Find the tool execution handler
  const handlerRegex = /private async handle\w+\(args: any\)/g;
  const handlers = content.match(handlerRegex);
  
  if (handlers) {
    handlers.forEach(handler => {
      const handlerName = handler.match(/handle(\w+)/)[1];
      const handlerStart = content.indexOf(handler);
      const handlerBodyStart = content.indexOf('{', handlerStart) + 1;
      
      // Add security checks at the start of the handler
      const securityChecks = `
    this.requestCount++;
    
    // Rate limiting
    const canProceed = await this.rateLimiter.consume();
    if (!canProceed) {
      this.logger.warn('Rate limit exceeded', { handler: '${handlerName}' });
      return createErrorResponse('Rate limit exceeded. Please try again later.');
    }

    // Input validation
    try {
      const validated = this.securityValidator.validateInput(inputSchemas.standardTool, args);
      const sanitized = this.securityValidator.sanitizeInput(validated.input);
      
      // Prompt injection detection
      this.securityValidator.checkPromptInjection(sanitized);
      
      // Use sanitized input
      args.input = sanitized;
    } catch (error: any) {
      this.logger.error('Security validation failed', { error: error.message });
      return createErrorResponse(error.message || 'Invalid input');
    }
`;
      
      // Only add if not already present
      const nextSection = content.substring(handlerBodyStart, handlerBodyStart + 500);
      if (!nextSection.includes('Rate limiting') && !nextSection.includes('requestCount++')) {
        content = content.slice(0, handlerBodyStart) + securityChecks + content.slice(handlerBodyStart);
      }
    });
  }

  // Add request timeout to model manager calls
  content = content.replace(
    /await this\.modelManager\.generate\(([^)]+)\)/g,
    'await Promise.race([\n        this.modelManager.generate($1),\n        new Promise((_, reject) => \n          setTimeout(() => reject(new Error(\'Request timeout\')), SECURITY_LIMITS.REQUEST_TIMEOUT_MS)\n        )\n      ])'
  );

  // Sanitize error responses - replace specific error messages with generic ones for security
  content = content.replace(
    /return createErrorResponse\(error\);/g,
    'return createErrorResponse(\'An error occurred processing your request\');'
  );

  // Write updated content
  fs.writeFileSync(indexPath, content, 'utf8');
  console.log(`  ✅ ${serverName}: Security applied`);
  return true;
}

// Apply to all servers
let updated = 0;
let skipped = 0;
let errors = 0;

console.log('Standard Servers:\n');
for (const server of STANDARD_SERVERS) {
  try {
    const serverPath = path.join(SERVERS_DIR, server);
    if (addSecurityToServer(serverPath, server)) {
      updated++;
    } else {
      skipped++;
    }
  } catch (error) {
    console.log(`  ❌ ${server}: Error - ${error.message}`);
    errors++;
  }
}

console.log('\nCustom Servers:\n');
for (const server of CUSTOM_SERVERS) {
  try {
    const serverPath = path.join(SERVERS_DIR, server);
    if (addSecurityToServer(serverPath, server)) {
      updated++;
    } else {
      skipped++;
    }
  } catch (error) {
    console.log(`  ❌ ${server}: Error - ${error.message}`);
    errors++;
  }
}

console.log('\n================================================');
console.log('Summary:');
console.log(`  ✅ Updated: ${updated}`);
console.log(`  ⚠️  Skipped: ${skipped}`);
console.log(`  ❌ Errors: ${errors}`);
console.log(`  📝 Total: ${STANDARD_SERVERS.length + CUSTOM_SERVERS.length}`);

if (updated > 0) {
  console.log('\n🔨 Rebuilding all updated servers...\n');
  
  const allServers = [...STANDARD_SERVERS, ...CUSTOM_SERVERS];
  let rebuilt = 0;
  let buildErrors = 0;
  
  for (const server of allServers) {
    try {
      const serverPath = path.join(SERVERS_DIR, server);
      process.chdir(serverPath);
      
      console.log(`Building ${server}...`);
      execSync('npm install --silent', { stdio: 'pipe' });
      execSync('npm run build', { stdio: 'pipe' });
      console.log(`  ✅ ${server} built successfully`);
      rebuilt++;
    } catch (error) {
      console.log(`  ❌ ${server} build failed`);
      buildErrors++;
    }
  }
  
  console.log('\n================================================');
  console.log('Build Summary:');
  console.log(`  ✅ Rebuilt: ${rebuilt}`);
  console.log(`  ❌ Build Errors: ${buildErrors}`);
}

console.log('\n🎉 Security updates complete!');
console.log('\nNext steps:');
console.log('1. Review the updated code in each server');
console.log('2. Test each server individually');
console.log('3. Update integration tests');
console.log('4. Review security logs');

process.exit(errors > 0 ? 1 : 0);
