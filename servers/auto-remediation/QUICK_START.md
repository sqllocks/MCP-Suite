# 🚀 Quick Start Guide

Get the Auto-Remediation System running in 5 minutes!

---

## Step 1: Installation (1 minute)

```bash
# Navigate to the auto-remediation directory
cd auto-remediation

# Install dependencies
npm install

# Build the system
npm run build
```

---

## Step 2: Run the Demo (2 minutes)

```bash
# Run the interactive demo
npm run demo
```

This will show you:
- How errors are detected
- How the system finds matching fix patterns
- How fixes are applied (in dry-run mode, so no actual changes)
- How tests are run
- The complete remediation workflow

---

## Step 3: View Available Patterns (1 minute)

```bash
# See all fix patterns
npm run patterns
```

This shows all 12 pre-built fix patterns for:
- Security issues (7 patterns)
- Runtime errors (1 pattern)
- Syntax errors (1 pattern)
- Test failures (1 pattern)
- Dependencies (1 pattern)
- Audit logging (1 pattern)

---

## Step 4: Start Monitoring (1 minute)

```bash
# Start in safe mode (fixes but doesn't deploy)
npm run start

# OR start in dry-run mode (no changes at all)
npm run dry-run

# OR start in production mode (full automation)
npm run production
```

The system is now:
- ✅ Monitoring log files for errors
- ✅ Watching for test failures
- ✅ Scanning for security issues
- ✅ Listening for runtime errors

---

## Usage Examples

### Example 1: Dry Run (Preview Only)

```bash
npm run dry-run
```

**What it does:**
- Detects errors
- Finds matching fix patterns
- Shows what would be changed
- **Does NOT make any actual changes**

**Use when:**
- Testing the system
- Evaluating fix patterns
- Learning how it works

---

### Example 2: Safe Mode (Fix but Don't Deploy)

```bash
npm run start
```

**What it does:**
- Detects errors
- Applies fixes
- Runs tests
- **Does NOT deploy to production**

**Use when:**
- Running in development
- Want to review fixes before deploying
- Need manual approval for deployment

---

### Example 3: Production Mode (Full Automation)

```bash
npm run production
```

**What it does:**
- Detects errors
- Applies fixes
- Runs tests
- Deploys to production automatically

**Use when:**
- System is proven and trusted
- Want complete automation
- Monitoring is in place

---

## Common Commands

```bash
# Check system status
npm run status

# View recent logs
npm run logs

# View audit trail
npm run logs -- --audit

# List fix patterns
npm run patterns

# Run system tests
npm test

# Clean up backups and logs
npm run clean
```

---

## Integration with Existing System

### For MCP Security Suite

```typescript
// In your MCP server
import { startAutoRemediation } from '../auto-remediation';

// Start auto-remediation
const remediation = await startAutoRemediation({
  autoFixEnabled: true,
  autoTestEnabled: true,
  autoDeployEnabled: false,
  requireApproval: true,
  dryRun: false
});

// The system will now automatically monitor and fix issues
// in your MCP servers
```

---

## Monitoring & Alerts

### Set up webhooks for notifications

```typescript
const remediation = await startAutoRemediation({
  notificationWebhook: 'https://your-webhook-url.com',
  // ... other config
});
```

### View daily reports

```bash
npm run status
```

---

## Safety Features

✅ **Automatic Backups**: Every fix creates a backup
✅ **Rollback Support**: Instant rollback on failure
✅ **Test Validation**: Only deploy if tests pass
✅ **Dry Run Mode**: Preview changes before applying
✅ **Approval Required**: Manual approval for critical fixes
✅ **Audit Trail**: Complete log of all changes

---

## Troubleshooting

### System won't start

```bash
# Check dependencies
npm install

# Rebuild
npm run build

# Check logs
npm run logs
```

### Fixes not working

1. Check if patterns match your error types
2. Review logs: `npm run logs`
3. Try dry-run mode first: `npm run dry-run`
4. Verify file permissions

### Tests failing

1. Check test command in config
2. Verify tests run manually: `npm test`
3. Review test output in logs

---

## Next Steps

1. ✅ **Read the full README.md** for detailed documentation
2. ✅ **Customize fix patterns** for your specific needs
3. ✅ **Set up monitoring** and alerting
4. ✅ **Configure deployment** strategy
5. ✅ **Review security** best practices

---

## Support

- **Documentation**: See README.md
- **Demo**: Run `npm run demo`
- **Patterns**: Run `npm run patterns`
- **Status**: Run `npm run status`

---

**Ready to eliminate manual error fixing? Let's go! 🚀**
