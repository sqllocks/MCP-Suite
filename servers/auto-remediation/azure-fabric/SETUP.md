# 🔷 Azure & Microsoft Fabric Integration Guide

Complete guide for integrating auto-remediation with your Azure/Fabric environment.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Service Setup](#service-setup)
5. [Testing](#testing)
6. [CI/CD Integration](#cicd-integration)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

### Required Tools
- ✅ Node.js 18+ installed
- ✅ Azure CLI installed (`az`)
- ✅ Git installed
- ✅ Access to Azure subscription

### Azure Resources You'll Monitor
- Azure SQL Database
- Azure Synapse Analytics
- Microsoft Fabric Workspace
- Azure Data Factory
- Azure DevOps (optional)

### Permissions Required
- **Azure SQL**: `db_datareader` on system tables
- **Synapse**: Synapse Administrator or Contributor
- **Fabric**: Workspace Admin or Contributor
- **ADF**: Data Factory Contributor
- **DevOps**: Project Admin (for PR creation)

---

## 🚀 Quick Start

### Step 1: Install

```bash
cd /path/to/your/project
npm install
npm run build
```

### Step 2: Configure

```bash
# Generate sample configuration
node -e "
const { generateSampleConfig } = require('./dist/azure-fabric/config.js');
const fs = require('fs');
fs.writeFileSync('azure-config.json', generateSampleConfig());
console.log('✅ Configuration file created: azure-config.json');
"

# Edit the configuration
nano azure-config.json
```

### Step 3: Test Connection

```bash
# Test Azure connections
npm run azure-test
```

### Step 4: Start Monitoring

```bash
# Start in dry-run mode first
npm run azure-monitor -- --dry-run

# Once verified, start in live mode
npm run azure-monitor
```

---

## ⚙️ Configuration

### Configuration File: `azure-config.json`

```json
{
  "azureSQL": {
    "enabled": true,
    "server": "your-server.database.windows.net",
    "database": "your-database",
    "useManagedIdentity": true,
    "pollInterval": 5
  },
  "synapse": {
    "enabled": true,
    "workspaceName": "your-synapse-workspace",
    "pollInterval": 10
  },
  "fabric": {
    "enabled": true,
    "workspaceName": "your-fabric-workspace",
    "warehouseName": "your-warehouse",
    "lakehouseName": "your-lakehouse",
    "pollInterval": 5,
    "logPaths": [
      "./logs/fabric-warehouse.log",
      "./logs/fabric-lakehouse.log"
    ]
  },
  "adf": {
    "enabled": true,
    "factoryName": "your-data-factory",
    "resourceGroup": "your-resource-group",
    "pollInterval": 15
  },
  "remediation": {
    "autoFixEnabled": true,
    "autoTestEnabled": true,
    "autoDeployEnabled": false,
    "requireApproval": true
  }
}
```

### Environment Variables

For sensitive data, use environment variables:

```bash
# Create .env file
cat > .env << EOF
AZURE_SQL_CONNECTION_STRING="your-connection-string"
AZURE_DEVOPS_PAT="your-personal-access-token"
TEAMS_WEBHOOK_URL="your-teams-webhook"
EOF

# Load environment variables
export $(cat .env | xargs)
```

---

## 🔧 Service Setup

### Azure SQL Setup

#### 1. Enable Query Store (Recommended)
```sql
ALTER DATABASE YourDatabase  
SET QUERY_STORE = ON;
```

#### 2. Grant Permissions
```sql
-- Grant read access to system views
GRANT VIEW DATABASE STATE TO [YourUser];
GRANT VIEW SERVER STATE TO [YourUser];
```

#### 3. Configure Monitoring
```javascript
// In your code
const config = {
  azureSQL: {
    enabled: true,
    server: 'your-server.database.windows.net',
    database: 'your-database',
    // Option 1: Use Managed Identity (Recommended)
    useManagedIdentity: true,
    // Option 2: Use Connection String
    connectionString: process.env.AZURE_SQL_CONNECTION_STRING
  }
};
```

---

### Synapse Setup

#### 1. Install Azure CLI Extension
```bash
az extension add --name synapse
```

#### 2. Login to Azure
```bash
az login
az account set --subscription "Your Subscription"
```

#### 3. Test Connection
```bash
az synapse workspace show \
  --name your-workspace \
  --resource-group your-resource-group
```

#### 4. Configure Monitoring
```javascript
const config = {
  synapse: {
    enabled: true,
    workspaceName: 'your-synapse-workspace',
    dedicatedPoolName: 'your-sql-pool',
    pollInterval: 10
  }
};
```

---

### Microsoft Fabric Setup

#### 1. Create Log Directory
```bash
mkdir -p ./logs
```

#### 2. Configure Fabric Logging

In your Fabric notebooks or pipelines, send logs to the directory:

```python
# Python (in Fabric notebook)
import logging

logging.basicConfig(
    filename='./logs/fabric-notebook.log',
    level=logging.ERROR,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

try:
    # Your code
    pass
except Exception as e:
    logging.error(f"Error in notebook: {str(e)}")
```

```sql
-- T-SQL (in Fabric warehouse)
-- Use RAISERROR to log to error log
RAISERROR('Custom error message', 16, 1) WITH LOG;
```

#### 3. Configure Monitoring
```javascript
const config = {
  fabric: {
    enabled: true,
    workspaceName: 'your-fabric-workspace',
    warehouseName: 'your-warehouse',
    lakehouseName: 'your-lakehouse',
    logPaths: [
      './logs/fabric-warehouse.log',
      './logs/fabric-lakehouse.log',
      './logs/fabric-notebook.log'
    ]
  }
};
```

---

### Azure Data Factory Setup

#### 1. Grant Permissions
```bash
# Grant ADF Contributor role
az role assignment create \
  --role "Data Factory Contributor" \
  --assignee your-user@company.com \
  --scope /subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.DataFactory/factories/{factory-name}
```

#### 2. Get Factory Details
```bash
az datafactory show \
  --name your-factory \
  --resource-group your-resource-group
```

#### 3. Configure Monitoring
```javascript
const config = {
  adf: {
    enabled: true,
    factoryName: 'your-data-factory',
    resourceGroup: 'your-resource-group',
    subscriptionId: 'your-subscription-id',
    pollInterval: 15
  }
};
```

---

### Azure DevOps Setup

#### 1. Create Personal Access Token (PAT)

1. Go to Azure DevOps → User Settings → Personal Access Tokens
2. Click "New Token"
3. Name: `Auto-Remediation`
4. Scopes:
   - **Code**: Read & Write
   - **Build**: Read & Execute
   - **Pull Request Threads**: Read & Write
5. Copy the token

#### 2. Configure DevOps Integration
```javascript
const config = {
  devops: {
    enabled: true,
    organization: 'your-org',
    project: 'your-project',
    personalAccessToken: process.env.AZURE_DEVOPS_PAT,
    autoCreatePR: true,
    branchName: 'main'
  }
};
```

#### 3. Add to Pipeline

Add this to your `azure-pipelines.yml`:

```yaml
# After your build/test steps
- script: |
    npm run auto-remediate -- --build-id $(Build.BuildId)
  displayName: 'Auto-Remediation'
  condition: failed()
  continueOnError: true
```

---

## 🧪 Testing

### Test Individual Services

```bash
# Test Azure SQL connection
npm run test-azure-sql

# Test Synapse connection
npm run test-synapse

# Test Fabric logs
npm run test-fabric

# Test ADF connection
npm run test-adf

# Test all services
npm run test-azure-all
```

### Simulate Errors

```bash
# Generate test error in Fabric
node scripts/generate-test-error.js --service fabric

# Watch auto-remediation in action
npm run azure-monitor
```

---

## 🔄 CI/CD Integration

### Option 1: Azure DevOps Pipeline

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'

  - script: npm install
    displayName: 'Install Dependencies'

  - script: npm run build
    displayName: 'Build'

  - script: npm test
    displayName: 'Run Tests'
    continueOnError: true

  - script: |
      npm run auto-remediate -- \
        --build-id $(Build.BuildId) \
        --branch $(Build.SourceBranch)
    displayName: 'Auto-Remediation'
    condition: failed()
    env:
      AZURE_DEVOPS_PAT: $(AZURE_DEVOPS_PAT)
```

### Option 2: GitHub Actions

```yaml
name: Build with Auto-Remediation

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Test
        run: npm test
        continue-on-error: true

      - name: Auto-Remediation
        if: failure()
        run: npm run auto-remediate
        env:
          AZURE_CONFIG: ${{ secrets.AZURE_CONFIG }}
```

---

## 📊 Monitoring

### View Real-time Status

```bash
# Dashboard view
npm run azure-dashboard

# Logs view
npm run azure-logs

# Metrics view
npm run azure-metrics
```

### Microsoft Teams Notifications

1. Create incoming webhook in Teams channel
2. Add to configuration:

```json
{
  "notifications": {
    "enabled": true,
    "teamsWebhook": "https://your-webhook-url",
    "notifyOnFailure": true
  }
}
```

### View Reports

```bash
# Daily report
npm run azure-report -- --daily

# Weekly report
npm run azure-report -- --weekly

# Custom date range
npm run azure-report -- --from 2024-01-01 --to 2024-01-31
```

---

## 🔍 Troubleshooting

### Issue: Azure CLI not authenticated

```bash
az login
az account set --subscription "Your Subscription"
```

### Issue: Managed Identity not working

```bash
# Check if MI is enabled
az webapp identity show --name your-app --resource-group your-rg

# Enable MI
az webapp identity assign --name your-app --resource-group your-rg

# Grant SQL permissions
az sql server ad-admin create \
  --resource-group your-rg \
  --server-name your-server \
  --display-name your-app \
  --object-id $(az webapp identity show --name your-app --resource-group your-rg --query principalId -o tsv)
```

### Issue: Cannot access Fabric logs

```bash
# Verify log directory exists and is writable
mkdir -p ./logs
chmod 755 ./logs

# Test log writing
echo "test" > ./logs/test.log
```

### Issue: DevOps PR creation fails

```bash
# Verify PAT has correct permissions
# Test git access
git ls-remote https://${AZURE_DEVOPS_PAT}@dev.azure.com/org/project/_git/repo
```

### Issue: High memory usage

```javascript
// Reduce polling frequency
{
  "azureSQL": { "pollInterval": 10 },
  "synapse": { "pollInterval": 20 },
  "fabric": { "pollInterval": 10 },
  "adf": { "pollInterval": 30 }
}
```

---

## 📚 Additional Resources

### Documentation
- [Azure SQL Error Handling](https://docs.microsoft.com/sql/t-sql/language-elements/error-handling)
- [Synapse Monitoring](https://docs.microsoft.com/azure/synapse-analytics/monitoring/how-to-monitor)
- [Fabric Documentation](https://learn.microsoft.com/fabric/)
- [ADF Pipeline Monitoring](https://docs.microsoft.com/azure/data-factory/monitor-visually)

### Tools
- [Azure SQL Query Performance](https://docs.microsoft.com/azure/azure-sql/database/query-performance-insight-use)
- [Synapse Studio](https://docs.microsoft.com/azure/synapse-analytics/get-started)
- [Fabric Workspace](https://powerbi.microsoft.com/)

---

## 🎯 Best Practices

### 1. Start with Dry Run
Always test with `--dry-run` first to see what changes would be made.

### 2. Enable Notifications
Set up Teams/Slack notifications so you're alerted to fixes.

### 3. Regular Reviews
Review auto-remediation logs weekly to identify patterns.

### 4. Gradual Rollout
- Week 1: Dry run only
- Week 2: Auto-fix with manual approval
- Week 3: Auto-fix + auto-test
- Week 4+: Full automation (if confident)

### 5. Healthcare/PHI
If handling PHI, enable HIPAA mode:
```json
{
  "healthcare": {
    "hipaaMode": true,
    "phiLoggingEnabled": false,
    "auditAllAccess": true,
    "encryptionRequired": true
  }
}
```

---

## 🔐 Security Considerations

### Secrets Management
- ✅ Use Azure Key Vault for connection strings
- ✅ Use Managed Identity where possible
- ✅ Rotate PATs every 90 days
- ✅ Never commit secrets to git

### Network Security
- ✅ Use private endpoints for Azure SQL
- ✅ Enable firewall rules
- ✅ Use VNet integration

### Audit Logging
- ✅ Enable Azure SQL auditing
- ✅ Send logs to Log Analytics
- ✅ Set up alerts for suspicious activity

---

## 📞 Support

- **Issues**: Create GitHub issue
- **Questions**: Check documentation first
- **Urgent**: Contact your Azure support team

---

**Your Azure/Fabric environment is now self-healing! 🔷✨**
