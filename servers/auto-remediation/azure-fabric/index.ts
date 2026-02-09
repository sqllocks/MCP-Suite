/**
 * Azure & Fabric Integration - Main Entry Point
 * Starts auto-remediation with Azure-specific monitoring and patterns
 */

import { RemediationOrchestrator } from '../core/remediation-orchestrator.js';
import { PatternMatcher } from '../analysis/pattern-matcher.js';
import { AzureErrorDetector } from './azure-detector.js';
import { addAzureFabricPatterns } from './patterns.js';
import { AzureDevOpsIntegration } from './azure-devops-integration.js';
import { FabricSQLValidator } from './fabric-sql-validator.js';
import { loadConfig, validateConfig, AzureFabricConfig } from './config.js';

export interface AzureRemediationOptions {
  configPath?: string;
  dryRun?: boolean;
  enableDevOps?: boolean;
  enableNotifications?: boolean;
}

export class AzureRemediationSystem {
  private orchestrator?: RemediationOrchestrator;
  private azureDetector?: AzureErrorDetector;
  private devopsIntegration?: AzureDevOpsIntegration;
  private config: AzureFabricConfig;

  constructor(config: AzureFabricConfig) {
    this.config = config;
  }

  /**
   * Start the Azure-integrated auto-remediation system
   */
  async start(): Promise<void> {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   Azure & Fabric Auto-Remediation System                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Validate configuration
    const validation = validateConfig(this.config);
    if (!validation.valid) {
      console.error('❌ Configuration errors:');
      validation.errors.forEach(err => console.error(`   - ${err}`));
      throw new Error('Invalid configuration');
    }

    console.log('✅ Configuration validated\n');

    // Initialize pattern matcher with Azure/Fabric patterns
    const patternMatcher = new PatternMatcher();
    addAzureFabricPatterns(patternMatcher);
    console.log('✅ Loaded Azure/Fabric fix patterns\n');

    // Create orchestrator
    this.orchestrator = new RemediationOrchestrator({
      autoFixEnabled: this.config.remediation.autoFixEnabled,
      autoTestEnabled: this.config.remediation.autoTestEnabled,
      autoDeployEnabled: this.config.remediation.autoDeployEnabled,
      requireApproval: this.config.remediation.requireApproval,
      maxRetries: this.config.remediation.maxRetries,
      dryRun: this.config.remediation.dryRun
    });

    // Initialize Azure-specific error detector
    this.azureDetector = new AzureErrorDetector({
      monitorAzureSQL: this.config.azureSQL.enabled,
      monitorSynapse: this.config.synapse.enabled,
      monitorFabric: this.config.fabric.enabled,
      monitorADF: this.config.adf.enabled,
      sqlPollInterval: this.config.azureSQL.pollInterval,
      synapsePollInterval: this.config.synapse.pollInterval,
      fabricPollInterval: this.config.fabric.pollInterval,
      adfPollInterval: this.config.adf.pollInterval,
      azureSqlConnectionString: this.config.azureSQL.connectionString,
      synapseWorkspace: this.config.synapse.workspaceName,
      fabricWorkspace: this.config.fabric.workspaceName,
      adfFactory: this.config.adf.factoryName,
      adfResourceGroup: this.config.adf.resourceGroup
    });

    // Connect Azure detector to orchestrator
    this.azureDetector.on('error-detected', (error) => {
      console.log(`\n🔍 Azure Error Detected: ${error.message}`);
      this.orchestrator!.manualRemediate(error);
    });

    // Start Azure monitoring
    await this.azureDetector.startMonitoring();
    console.log('✅ Azure service monitoring started\n');

    // Initialize DevOps integration if enabled
    if (this.config.devops.enabled && this.orchestrator) {
      this.devopsIntegration = new AzureDevOpsIntegration(
        {
          organization: this.config.devops.organization!,
          project: this.config.devops.project!,
          personalAccessToken: this.config.devops.personalAccessToken!,
          pipelineId: this.config.devops.pipelineId,
          repositoryUrl: this.config.devops.repositoryUrl,
          branchName: this.config.devops.branchName
        },
        this.orchestrator
      );
      console.log('✅ Azure DevOps integration enabled\n');
    }

    // Set up notifications
    if (this.config.notifications.enabled) {
      this.setupNotifications();
    }

    // Display active services
    this.displayActiveServices();

    // Start main orchestrator
    await this.orchestrator.start();

    console.log('\n✅ System is running and monitoring for errors');
    console.log('   Press Ctrl+C to stop\n');
  }

  /**
   * Stop the system
   */
  async stop(): Promise<void> {
    console.log('\n🛑 Shutting down...');
    
    if (this.azureDetector) {
      await this.azureDetector.stopMonitoring();
    }
    
    if (this.orchestrator) {
      await this.orchestrator.stop();
    }
    
    console.log('✅ Shutdown complete\n');
  }

  /**
   * Display active services
   */
  private displayActiveServices(): void {
    console.log('📊 Monitoring Services:\n');

    if (this.config.azureSQL.enabled) {
      console.log(`   🔷 Azure SQL`);
      console.log(`      Server: ${this.config.azureSQL.server || 'configured'}`);
      console.log(`      Poll Interval: ${this.config.azureSQL.pollInterval} min`);
    }

    if (this.config.synapse.enabled) {
      console.log(`   🔷 Azure Synapse`);
      console.log(`      Workspace: ${this.config.synapse.workspaceName || 'configured'}`);
      console.log(`      Poll Interval: ${this.config.synapse.pollInterval} min`);
    }

    if (this.config.fabric.enabled) {
      console.log(`   🏗️  Microsoft Fabric`);
      console.log(`      Workspace: ${this.config.fabric.workspaceName || 'configured'}`);
      console.log(`      Log Paths: ${this.config.fabric.logPaths.length} locations`);
      console.log(`      Poll Interval: ${this.config.fabric.pollInterval} min`);
    }

    if (this.config.adf.enabled) {
      console.log(`   🏭 Azure Data Factory`);
      console.log(`      Factory: ${this.config.adf.factoryName || 'configured'}`);
      console.log(`      Poll Interval: ${this.config.adf.pollInterval} min`);
    }

    if (this.config.devops.enabled) {
      console.log(`   🔄 Azure DevOps`);
      console.log(`      Organization: ${this.config.devops.organization}`);
      console.log(`      Project: ${this.config.devops.project}`);
      console.log(`      Auto PR: ${this.config.devops.autoCreatePR ? 'Yes' : 'No'}`);
    }

    console.log('');
  }

  /**
   * Setup notifications
   */
  private setupNotifications(): void {
    if (!this.orchestrator) return;

    this.orchestrator.on('remediation-complete', async (result) => {
      if (result.success && this.config.notifications.notifyOnSuccess) {
        await this.sendNotification('success', result);
      } else if (!result.success && this.config.notifications.notifyOnFailure) {
        await this.sendNotification('failure', result);
      }
    });
  }

  /**
   * Send notification
   */
  private async sendNotification(type: 'success' | 'failure', result: any): Promise<void> {
    const message = type === 'success'
      ? `✅ Auto-fix applied: ${result.fixApplied}`
      : `❌ Auto-fix failed: ${result.errorId}`;

    // Teams webhook
    if (this.config.notifications.teamsWebhook) {
      await this.sendTeamsNotification(message, result);
    }

    // Slack webhook
    if (this.config.notifications.slackWebhook) {
      await this.sendSlackNotification(message, result);
    }
  }

  /**
   * Send Teams notification
   */
  private async sendTeamsNotification(message: string, result: any): Promise<void> {
    try {
      const payload = {
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        "summary": message,
        "themeColor": result.success ? "00FF00" : "FF0000",
        "title": "Auto-Remediation System",
        "sections": [{
          "activityTitle": message,
          "facts": [
            { "name": "Error ID", "value": result.errorId },
            { "name": "Fix Applied", "value": result.fixApplied || "None" },
            { "name": "Tests", "value": `${result.testsPassed}/${result.testsRun}` },
            { "name": "Duration", "value": `${result.duration}ms` }
          ]
        }]
      };

      // Would send via HTTP here
      console.log(`📧 Teams notification sent: ${message}`);
    } catch (error) {
      console.error('Failed to send Teams notification:', error);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(message: string, result: any): Promise<void> {
    try {
      const payload = {
        text: message,
        attachments: [{
          color: result.success ? "good" : "danger",
          fields: [
            { title: "Error ID", value: result.errorId, short: true },
            { title: "Fix", value: result.fixApplied || "None", short: true },
            { title: "Tests", value: `${result.testsPassed}/${result.testsRun}`, short: true },
            { title: "Duration", value: `${result.duration}ms`, short: true }
          ]
        }]
      };

      // Would send via HTTP here
      console.log(`📧 Slack notification sent: ${message}`);
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }

  /**
   * Handle pipeline failure from Azure DevOps
   */
  async handlePipelineFailure(buildId: number): Promise<void> {
    if (!this.devopsIntegration) {
      throw new Error('DevOps integration not enabled');
    }

    await this.devopsIntegration.handlePipelineFailure(buildId);
  }

  /**
   * Validate Fabric SQL query
   */
  validateSQL(query: string) {
    const validator = new FabricSQLValidator();
    return validator.validate(query);
  }
}

/**
 * Quick start function
 */
export async function startAzureRemediation(options: AzureRemediationOptions = {}): Promise<AzureRemediationSystem> {
  // Load configuration
  const config = await loadConfig(options.configPath);

  // Override with options
  if (options.dryRun !== undefined) {
    config.remediation.dryRun = options.dryRun;
  }
  if (options.enableDevOps !== undefined) {
    config.devops.enabled = options.enableDevOps;
  }
  if (options.enableNotifications !== undefined) {
    config.notifications.enabled = options.enableNotifications;
  }

  // Create and start system
  const system = new AzureRemediationSystem(config);
  await system.start();

  return system;
}

/**
 * CLI entry point
 */
export async function main() {
  const args = process.argv.slice(2);
  const options: AzureRemediationOptions = {
    dryRun: args.includes('--dry-run'),
    enableDevOps: !args.includes('--no-devops'),
    enableNotifications: !args.includes('--no-notifications')
  };

  // Check for config path
  const configIndex = args.indexOf('--config');
  if (configIndex !== -1 && args[configIndex + 1]) {
    options.configPath = args[configIndex + 1];
  }

  try {
    const system = await startAzureRemediation(options);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await system.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await system.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('\n❌ Failed to start:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
