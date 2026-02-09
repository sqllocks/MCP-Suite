# 🔐 MCP Security Suite Integration Guide

This guide shows how to integrate the Auto-Remediation System with your existing MCP Multi-Server Suite security infrastructure.

---

## Overview

The Auto-Remediation System enhances your MCP security suite by:
- **Automatically detecting** security vulnerabilities
- **Applying fixes** from security audit findings
- **Validating fixes** with the existing SECURITY_VERIFY.sh script
- **Deploying** fixes safely to production

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Security Suite                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────┐      ┌─────────────────────┐      │
│  │  Security Modules   │      │  Auto-Remediation   │      │
│  │  ─────────────────  │◄────►│  ─────────────────  │      │
│  │  • Authentication   │      │  • Error Detection  │      │
│  │  • Encryption       │      │  • Pattern Matching │      │
│  │  • Audit Logging    │      │  • Auto Fixing      │      │
│  │  • Rate Limiting    │      │  • Testing          │      │
│  │  • Input Validation │      │  • Deployment       │      │
│  └─────────────────────┘      └─────────────────────┘      │
│            ▲                            ▲                    │
│            │                            │                    │
│            └────────────┬───────────────┘                    │
│                         │                                    │
│                  ┌──────▼────────┐                          │
│                  │  SECURITY     │                          │
│                  │  VERIFY       │                          │
│                  │  Script       │                          │
│                  └───────────────┘                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Setup

### Install Auto-Remediation System

```bash
# In your MCP suite root directory
git clone <auto-remediation-repo> ./auto-remediation
cd auto-remediation
npm install
npm run build
```

### Configure Paths

```typescript
// auto-remediation/config.ts
export const MCP_CONFIG = {
  rootDir: '../',
  securityModulesDir: '../shared/security',
  serversDir: '../servers',
  securityVerifyScript: '../SECURITY_VERIFY.sh',
  testCommand: 'cd .. && ./SECURITY_VERIFY.sh',
  logDir: '../logs/auto-remediation'
};
```

---

## Step 2: Add MCP-Specific Fix Patterns

```typescript
// auto-remediation/mcp-patterns.ts
import { PatternMatcher, FixPattern } from './index.js';

export function addMCPPatterns(matcher: PatternMatcher): void {
  // Pattern: Missing encryption in tokenization
  matcher.addPattern({
    id: 'mcp-001',
    name: 'Add encryption to tokenization cache',
    description: 'Encrypts plaintext tokenization cache',
    category: 'security',
    severity: ['critical', 'high'],
    errorPatterns: [
      /tokenization.*plaintext/i,
      /cache.*not encrypted/i,
      /tokenization.*security/i
    ],
    fix: {
      type: 'multi',
      actions: [
        {
          type: 'file-replace',
          target: 'servers/mcp-tokenization-secure/src/index.ts',
          find: /this\.cache\.set\((.*?),\s*(.*?)\)/g,
          replace: 'await this.encryption.encryptAndStore($1, $2, { profile })'
        },
        {
          type: 'file-insert',
          target: 'servers/mcp-tokenization-secure/src/index.ts',
          content: `import { EncryptionManager } from '../../../shared/security/encryption-manager.js';`
        }
      ],
      rollbackable: true,
      estimatedTime: 45
    },
    confidence: 0.95,
    testRequired: true,
    riskLevel: 'high'
  });

  // Pattern: Missing authentication check
  matcher.addPattern({
    id: 'mcp-002',
    name: 'Add MCP authentication verification',
    description: 'Adds authentication check to MCP tool handlers',
    category: 'security',
    severity: ['critical', 'high'],
    errorPatterns: [
      /authentication.*missing/i,
      /unauthorized.*access/i,
      /no.*auth.*check/i
    ],
    fix: {
      type: 'insert',
      actions: [
        {
          type: 'file-insert',
          content: `
// Verify authentication
const session = await this.auth.verifySession(arguments.sessionId);
if (!session.valid) {
  await this.audit.log({
    event: 'unauthorized_access_attempt',
    profile: arguments.profile,
    tool: tool.name,
    timestamp: new Date()
  });
  throw new Error('Authentication required');
}
`
        }
      ],
      rollbackable: true,
      estimatedTime: 30
    },
    confidence: 0.9,
    testRequired: true,
    riskLevel: 'high'
  });

  // Pattern: Missing audit log
  matcher.addPattern({
    id: 'mcp-003',
    name: 'Add secure audit logging',
    description: 'Adds audit log entry for sensitive operations',
    category: 'security',
    severity: ['high', 'medium'],
    errorPatterns: [
      /audit.*log.*missing/i,
      /no.*audit.*trail/i,
      /PHI.*access.*not logged/i
    ],
    fix: {
      type: 'insert',
      actions: [
        {
          type: 'file-insert',
          content: `
// Audit log
await this.audit.log({
  event: 'data_access',
  profile: arguments.profile,
  sessionId: arguments.sessionId,
  tool: tool.name,
  timestamp: new Date(),
  details: {
    query: arguments.query,
    resultCount: results.length,
    sensitivity: 'PHI'
  }
});
`
        }
      ],
      rollbackable: true,
      estimatedTime: 20
    },
    confidence: 0.85,
    testRequired: true,
    riskLevel: 'medium'
  });

  // Pattern: Missing rate limit check
  matcher.addPattern({
    id: 'mcp-004',
    name: 'Add rate limiting to MCP tools',
    description: 'Implements rate limiting for MCP tool calls',
    category: 'security',
    severity: ['high', 'medium'],
    errorPatterns: [
      /rate limit.*missing/i,
      /no.*rate.*limit/i,
      /DOS.*vulnerability/i,
      /data exfiltration.*possible/i
    ],
    fix: {
      type: 'insert',
      actions: [
        {
          type: 'file-insert',
          content: `
// Rate limiting
const rateCheck = await this.rateLimiter.checkAllLimits(
  arguments.profile,
  arguments.sessionId,
  tool.name
);

if (!rateCheck.allowed) {
  await this.audit.log({
    event: 'rate_limit_exceeded',
    profile: arguments.profile,
    tool: tool.name,
    timestamp: new Date()
  });
  throw new Error(\`Rate limit exceeded. Retry in \${rateCheck.retryAfter} seconds\`);
}
`
        }
      ],
      rollbackable: true,
      estimatedTime: 25
    },
    confidence: 0.9,
    testRequired: true,
    riskLevel: 'medium'
  });
}
```

---

## Step 3: Configure Test Integration

```typescript
// auto-remediation/mcp-test-runner.ts
import { TestRunner, TestResult } from './testing/test-runner.js';

export class MCPTestRunner extends TestRunner {
  /**
   * Run MCP security verification script
   */
  async runMCPSecurityTests(): Promise<TestResult> {
    return new Promise((resolve) => {
      const scriptPath = '../SECURITY_VERIFY.sh';
      let output = '';
      
      const proc = spawn('bash', [scriptPath]);

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        const result = this.parseSecurityVerifyOutput(output);
        result.duration = 0; // Will be set by caller
        resolve(result);
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        proc.kill();
        resolve({
          total: 0,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: 60000,
          output: 'Security verification timeout',
          failures: [{ test: 'Security Verify', error: 'Timeout' }]
        });
      }, 60000);
    });
  }

  /**
   * Parse SECURITY_VERIFY.sh output
   */
  private parseSecurityVerifyOutput(output: string): TestResult {
    const passes = (output.match(/✅ PASS:/g) || []).length;
    const fails = (output.match(/❌ FAIL:/g) || []).length;

    return {
      total: passes + fails,
      passed: passes,
      failed: fails,
      skipped: 0,
      duration: 0,
      output,
      failures: []
    };
  }
}
```

---

## Step 4: Start Auto-Remediation with MCP

```typescript
// mcp-auto-remediate.ts
import { startAutoRemediation } from './auto-remediation';
import { addMCPPatterns } from './auto-remediation/mcp-patterns.js';
import { PatternMatcher } from './auto-remediation';

async function startMCPAutoRemediation() {
  console.log('🔐 Starting MCP Auto-Remediation System...\n');

  // Add MCP-specific patterns
  const matcher = new PatternMatcher();
  addMCPPatterns(matcher);

  // Start auto-remediation
  const orchestrator = await startAutoRemediation({
    autoFixEnabled: true,
    autoTestEnabled: true,
    autoDeployEnabled: false, // Manual deployment for security
    requireApproval: true,
    maxRetries: 3,
    dryRun: false
  });

  // Listen for remediation events
  orchestrator.on('remediation-complete', (result) => {
    if (result.success) {
      console.log(`✅ Fixed: ${result.errorId}`);
      console.log(`   Fix: ${result.fixApplied}`);
      console.log(`   Tests: ${result.testsPassed}/${result.testsRun}`);
    } else {
      console.log(`❌ Failed: ${result.errorId}`);
    }
  });

  console.log('✅ MCP Auto-Remediation System running\n');
  console.log('Monitoring:');
  console.log('  • Security vulnerabilities');
  console.log('  • Authentication issues');
  console.log('  • Encryption problems');
  console.log('  • Audit log gaps');
  console.log('  • Rate limiting issues\n');

  return orchestrator;
}

// Start the system
startMCPAutoRemediation().catch(console.error);
```

---

## Step 5: Configure Monitoring

```typescript
// mcp-monitoring-config.ts
export const MCP_MONITORING_CONFIG = {
  logPaths: [
    './logs',
    './logs/audit',
    '../shared/security/logs'
  ],
  testCommand: './SECURITY_VERIFY.sh',
  securityScanInterval: 15, // minutes
  runtimeMonitoring: true,
  watchedFiles: [
    '../shared/security/**/*.ts',
    '../servers/mcp-**/src/**/*.ts'
  ]
};
```

---

## Step 6: Deploy

### Development
```bash
cd auto-remediation
npm run start
```

### Production
```bash
cd auto-remediation

# Run security tests first
cd .. && ./SECURITY_VERIFY.sh

# If all tests pass, start auto-remediation
cd auto-remediation
npm run production
```

---

## Monitoring & Maintenance

### Daily Tasks

```bash
# Check status
npm run status

# View recent remediations
npm run logs -- --audit

# Review fix patterns
npm run patterns
```

### Weekly Tasks

```bash
# Run full security scan
cd .. && ./SECURITY_VERIFY.sh

# Check for new vulnerability patterns
npm run patterns

# Review logs for anomalies
npm run logs
```

### Monthly Tasks

```bash
# Clean old backups
npm run clean

# Update fix patterns
# Review and update mcp-patterns.ts

# Test rollback procedures
# Practice rolling back a change
```

---

## Security Considerations

### What Gets Auto-Fixed

✅ **Automatically Fixed**
- Missing encryption calls
- Missing authentication checks
- Missing audit log entries
- Missing rate limit checks
- File permission issues

❌ **Requires Manual Review**
- Changes to encryption keys
- Modifications to authentication logic
- Audit log format changes
- Rate limit threshold changes

---

## Troubleshooting

### Issue: Security tests failing after fix

```bash
# Rollback the fix
npm run logs -- --audit  # Get backup ID
# Use rollback manager to restore

# Review the fix that was applied
npm run logs

# Adjust the fix pattern if needed
```

### Issue: False positive detections

```bash
# Add exclusions to pattern matching
# Edit auto-remediation/mcp-patterns.ts
# Add more specific error patterns
```

### Issue: Slow performance

```bash
# Reduce scan frequency
# Edit mcp-monitoring-config.ts
# Increase securityScanInterval

# Limit watched files
# Reduce watchedFiles patterns
```

---

## Best Practices

1. **Start with Dry Run**: Test all patterns in dry-run mode first
2. **Review Logs Daily**: Check audit logs for unexpected behavior
3. **Test Rollbacks**: Practice rollback procedures regularly
4. **Update Patterns**: Add new patterns as new issues are discovered
5. **Monitor Performance**: Track remediation times and success rates

---

## Support

For MCP-specific integration issues:
1. Check SECURITY_VERIFY.sh output
2. Review auto-remediation logs
3. Verify security module imports
4. Test individual components

---

**Your MCP suite is now self-healing! 🔐✨**
