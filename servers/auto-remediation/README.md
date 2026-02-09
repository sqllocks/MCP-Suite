# 🔧 Auto-Remediation System

**Automatically detect, fix, test, and deploy error corrections.**

A comprehensive system that monitors your codebase for errors, automatically applies fixes, runs tests to verify corrections, and deploys the fixes safely to production.

---

## 🎯 Features

### ✅ Automatic Error Detection
- **Log Monitoring**: Scans log files for errors in real-time
- **Test Monitoring**: Detects test failures automatically
- **Security Scanning**: Identifies security vulnerabilities
- **Runtime Monitoring**: Catches uncaught exceptions and unhandled rejections
- **File Watching**: Monitors code changes for issues

### 🔍 Intelligent Pattern Matching
- **12+ Pre-built Fix Patterns**: Common security and code issues
- **Confidence Scoring**: Ranks fixes by likelihood of success
- **Category-based**: Security, syntax, runtime, tests, dependencies
- **Extensible**: Add your own custom fix patterns

### 🛠️ Automated Fixing
- **File Modifications**: Regex-based content replacement
- **Code Insertion**: Smart insertion at appropriate locations
- **Command Execution**: Run npm install, chmod, etc.
- **Config Updates**: Modify JSON configuration files
- **Dry Run Mode**: Preview changes before applying

### 🧪 Comprehensive Testing
- **Test Runner Integration**: Runs npm test automatically
- **Security Verification**: Executes security test scripts
- **Test Result Parsing**: Extracts pass/fail counts
- **Per-fix Validation**: Only deploy if tests pass

### 🚀 Safe Deployment
- **Multiple Strategies**: Immediate, staged, or canary deployments
- **Pre-deployment Checks**: Validation before deployment
- **Health Checks**: Verify system health post-deployment
- **Automatic Rollback**: Reverts on failure

### ⏪ Rollback Protection
- **Automatic Backups**: Creates backups before every fix
- **One-click Rollback**: Restore previous version instantly
- **Backup Management**: Keeps last 100 backups
- **Metadata Tracking**: Full audit trail of all changes

### 📊 Comprehensive Logging
- **Structured Logging**: JSON-formatted log entries
- **Audit Trail**: Immutable record of all remediations
- **Daily Reports**: Automated summaries of activity
- **Log Rotation**: Automatic cleanup of old logs

---

## 🚀 Quick Start

### Installation

```bash
npm install
npm run build
```

### Basic Usage

```bash
# Start with safe defaults
npm run start

# Or use the CLI directly
./cli.ts quick
```

### Advanced Usage

```bash
# Dry run (no changes)
./cli.ts start --dry-run

# Production mode (full automation)
./cli.ts start --production

# Disable auto-deployment
./cli.ts start --no-deploy
```

---

## 📖 Usage Guide

### Starting the System

**Option 1: Quick Start (Recommended)**
```typescript
import { quickStart } from './auto-remediation';

const orchestrator = await quickStart();
// System is now running and monitoring for errors
```

**Option 2: Custom Configuration**
```typescript
import { startAutoRemediation } from './auto-remediation';

const orchestrator = await startAutoRemediation({
  autoFixEnabled: true,      // Enable automatic fixes
  autoTestEnabled: true,     // Run tests after fixes
  autoDeployEnabled: false,  // Require manual deployment
  requireApproval: true,     // Require approval for critical fixes
  maxRetries: 3,             // Maximum fix attempts
  dryRun: false              // Make actual changes
});
```

**Option 3: Production Mode**
```typescript
import { productionMode } from './auto-remediation';

const orchestrator = await productionMode();
// Full automation: detect → fix → test → deploy
```

### Manual Remediation

```typescript
import { DetectedError } from './auto-remediation';

// Create error manually
const error: DetectedError = {
  id: 'manual-001',
  timestamp: new Date(),
  category: 'security',
  severity: 'high',
  source: './src/server.ts',
  message: 'SQL injection vulnerability detected',
  context: {}
};

// Trigger remediation
const result = await orchestrator.manualRemediate(error);

if (result.success) {
  console.log(`Fixed with: ${result.fixApplied}`);
  console.log(`Tests: ${result.testsPassed}/${result.testsRun}`);
  console.log(`Deployed: ${result.deployed}`);
}
```

### CLI Commands

```bash
# Start the system
auto-remediate start [options]

# Quick start with defaults
auto-remediate quick

# List available fix patterns
auto-remediate patterns

# Check system status
auto-remediate status

# View logs
auto-remediate logs
auto-remediate logs --audit
auto-remediate logs --lines 100

# Run system tests
auto-remediate test

# Show system information
auto-remediate info
```

---

## 🔐 Fix Patterns

The system includes 12 pre-built fix patterns:

### Security Fixes
1. **Add Encryption** - Encrypts plaintext data storage
2. **Fix SQL Injection** - Adds parameterized queries
3. **Add Authentication** - Implements auth checks
4. **Add Rate Limiting** - Prevents DOS attacks
5. **Fix File Permissions** - Sets secure permissions (600)
6. **Remove Hardcoded Secrets** - Moves to environment variables
7. **Add Audit Logging** - Implements secure audit trails

### Runtime Fixes
8. **Add Error Handling** - Wraps code in try-catch blocks

### Syntax Fixes
9. **Add Missing Imports** - Imports required modules

### Test Fixes
10. **Update Test Expectations** - Fixes failing assertions

### Dependency Fixes
11. **Install Dependencies** - Runs npm install for missing packages

### Custom Patterns

You can add your own fix patterns:

```typescript
import { PatternMatcher, FixPattern } from './auto-remediation';

const matcher = new PatternMatcher();

const customPattern: FixPattern = {
  id: 'custom-001',
  name: 'My Custom Fix',
  description: 'Fixes a specific issue',
  category: 'security',
  severity: ['high'],
  errorPatterns: [/my error pattern/i],
  fix: {
    type: 'replace',
    actions: [
      {
        type: 'file-replace',
        find: /old code/g,
        replace: 'new code'
      }
    ],
    rollbackable: true,
    estimatedTime: 30
  },
  confidence: 0.9,
  testRequired: true,
  riskLevel: 'medium'
};

matcher.addPattern(customPattern);
```

---

## 📊 Monitoring & Reporting

### Daily Reports

```typescript
import { RemediationLogger } from './auto-remediation';

const logger = new RemediationLogger();
const report = await logger.generateDailyReport();

console.log(`Total Remediations: ${report.totalRemediations}`);
console.log(`Success Rate: ${(report.successful / report.totalRemediations * 100).toFixed(1)}%`);
console.log(`Average Duration: ${report.averageDuration}ms`);
console.log(`Top Fixes:`, report.topFixes);
```

### View Logs

```typescript
// Recent logs
const recentLogs = await logger.getRecentLogs(50);

// Audit trail
const auditLogs = await logger.getAuditLogs(100);
```

### System Status

```typescript
const status = orchestrator.getStatus();

console.log(`Running: ${status.running}`);
console.log(`Active Remediations: ${status.activeRemediations}`);
console.log(`Config:`, status.config);
```

---

## 🔄 Rollback

### Automatic Rollback

The system automatically rolls back if:
- Tests fail after applying a fix
- Deployment health check fails
- Fix application throws an error

### Manual Rollback

```typescript
import { RollbackManager } from './auto-remediation';

const rollback = new RollbackManager();

// List available backups
const backups = await rollback.listBackups();

// Rollback to specific backup
await rollback.rollback(backupId);
```

---

## ⚙️ Configuration

### RemediationConfig Options

```typescript
interface RemediationConfig {
  autoFixEnabled: boolean;        // Enable automatic fixes
  autoTestEnabled: boolean;       // Run tests after fixes
  autoDeployEnabled: boolean;     // Deploy fixes automatically
  requireApproval: boolean;       // Require manual approval
  maxRetries: number;             // Maximum fix attempts (default: 3)
  notificationWebhook?: string;   // Webhook for notifications
  dryRun: boolean;                // Preview mode (no changes)
}
```

### MonitoringConfig Options

```typescript
interface MonitoringConfig {
  logPaths: string[];             // Paths to monitor for errors
  testCommand?: string;           // Command to run tests
  securityScanInterval: number;   // Minutes between security scans
  runtimeMonitoring: boolean;     // Monitor runtime errors
  watchedFiles: string[];         // File patterns to watch
}
```

### DeploymentConfig Options

```typescript
interface DeploymentConfig {
  strategy: 'immediate' | 'staged' | 'canary';
  environment: 'development' | 'staging' | 'production';
  buildCommand?: string;          // Build command
  deployCommand?: string;         // Deploy command
  healthCheckUrl?: string;        // Health check endpoint
  rollbackOnFailure: boolean;     // Auto-rollback on failure
}
```

---

## 🏗️ Architecture

```
auto-remediation/
├── core/
│   └── remediation-orchestrator.ts    # Main controller
├── detection/
│   └── error-detector.ts              # Error monitoring
├── analysis/
│   └── pattern-matcher.ts             # Fix pattern matching
├── fixing/
│   └── auto-fixer.ts                  # Apply fixes
├── testing/
│   └── test-runner.ts                 # Run tests
├── deployment/
│   ├── deployment-manager.ts          # Deploy fixes
│   └── rollback-manager.ts            # Backup & rollback
├── logging/
│   └── remediation-logger.ts          # Logging & auditing
├── index.ts                           # Main exports
└── cli.ts                             # CLI interface
```

### Workflow

```
1. Error Detected
   ↓
2. Pattern Matching
   ↓
3. Create Backup
   ↓
4. Apply Fix
   ↓
5. Run Tests
   ↓ (if tests pass)
6. Deploy
   ↓
7. Health Check
   ↓
8. Log Results
```

---

## 🛡️ Security Considerations

### What Gets Fixed Automatically

✅ **Low Risk (Auto-approved)**
- File permission fixes
- Missing import statements
- Dependency installations
- Test expectation updates

✅ **Medium Risk (Requires Testing)**
- Error handling additions
- Rate limiting implementation
- Audit logging additions

⚠️ **High Risk (Requires Approval)**
- Authentication changes
- Encryption modifications
- SQL query modifications
- Secret management changes

❌ **Never Auto-fixed**
- Deployment credentials
- Database migrations
- Breaking API changes
- Major refactors

### Best Practices

1. **Start with Dry Run**: Always test with `--dry-run` first
2. **Disable Auto-Deploy**: Use `autoDeployEnabled: false` initially
3. **Monitor Logs**: Review audit logs regularly
4. **Test Rollbacks**: Practice rollback procedures
5. **Set Up Approvals**: Use `requireApproval: true` for production

---

## 📈 Performance

### Typical Metrics

- **Error Detection**: < 1 second
- **Pattern Matching**: < 100ms
- **Fix Application**: 5-30 seconds
- **Test Execution**: 10-120 seconds
- **Deployment**: 30-300 seconds

### Optimization Tips

1. **Limit Log Monitoring**: Only monitor critical log files
2. **Adjust Scan Intervals**: Increase intervals for non-critical scans
3. **Disable Unnecessary Features**: Turn off features you don't need
4. **Use Staged Deployments**: Reduce deployment time

---

## 🤝 Contributing

### Adding New Fix Patterns

1. Create pattern definition
2. Test pattern matching
3. Implement fix actions
4. Write tests
5. Submit PR

### Reporting Issues

Please include:
- Error message and stack trace
- System configuration
- Reproduction steps
- Expected vs actual behavior

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

Built for the MCP Multi-Server Suite security remediation project.

---

## 📞 Support

- **Documentation**: See this README
- **Issues**: GitHub Issues
- **Questions**: GitHub Discussions

---

**Made with ❤️ for automated error remediation**
