/**
 * Azure DevOps Integration
 * Integrates auto-remediation with Azure Pipelines CI/CD
 */

import { RemediationOrchestrator, DetectedError } from '../core/remediation-orchestrator.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AzureDevOpsConfig {
  organization: string;
  project: string;
  personalAccessToken: string;
  pipelineId?: number;
  buildId?: number;
  repositoryUrl?: string;
  branchName?: string;
}

export class AzureDevOpsIntegration {
  private config: AzureDevOpsConfig;
  private orchestrator: RemediationOrchestrator;

  constructor(config: AzureDevOpsConfig, orchestrator: RemediationOrchestrator) {
    this.config = config;
    this.orchestrator = orchestrator;
  }

  /**
   * Run auto-remediation on pipeline failures
   */
  async handlePipelineFailure(buildId: number): Promise<void> {
    console.log(`🔍 Analyzing failed build: ${buildId}`);

    try {
      // Get build logs
      const logs = await this.getBuildLogs(buildId);

      // Extract errors from logs
      const errors = this.extractErrorsFromLogs(logs);

      console.log(`Found ${errors.length} errors in build logs`);

      // Attempt to remediate each error
      for (const error of errors) {
        console.log(`\nAttempting to fix: ${error.message}`);
        
        const result = await this.orchestrator.manualRemediate(error);

        if (result.success) {
          console.log(`✅ Fixed: ${result.fixApplied}`);
          
          // Create PR with fix
          await this.createPullRequestWithFix(result, error);
        } else {
          console.log(`❌ Could not auto-fix: ${error.message}`);
        }
      }

    } catch (error) {
      console.error('Failed to handle pipeline failure:', error);
      throw error;
    }
  }

  /**
   * Get build logs from Azure DevOps
   */
  private async getBuildLogs(buildId: number): Promise<string> {
    try {
      const url = `https://dev.azure.com/${this.config.organization}/${this.config.project}/_apis/build/builds/${buildId}/logs?api-version=7.0`;
      
      const command = `curl -u :${this.config.personalAccessToken} "${url}"`;
      const { stdout } = await execAsync(command);
      
      return stdout;
    } catch (error) {
      console.error('Failed to get build logs:', error);
      return '';
    }
  }

  /**
   * Extract errors from build logs
   */
  private extractErrorsFromLogs(logs: string): DetectedError[] {
    const errors: DetectedError[] = [];
    const lines = logs.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Common error patterns in build logs
      if (this.isErrorLine(line)) {
        const error: DetectedError = {
          id: this.generateErrorId(line),
          timestamp: new Date(),
          category: this.categorizeError(line),
          severity: this.determineSeverity(line),
          source: 'azure-devops-pipeline',
          message: line.trim(),
          context: {
            buildId: this.config.buildId,
            lineNumber: i + 1,
            previousLine: i > 0 ? lines[i - 1] : '',
            nextLine: i < lines.length - 1 ? lines[i + 1] : ''
          }
        };

        errors.push(error);
      }
    }

    return errors;
  }

  /**
   * Check if line contains an error
   */
  private isErrorLine(line: string): boolean {
    const errorPatterns = [
      /error/i,
      /failed/i,
      /exception/i,
      /syntax error/i,
      /cannot find/i,
      /does not exist/i,
      /test.*failed/i,
      /build.*failed/i,
      /\[error\]/i
    ];

    return errorPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Categorize error
   */
  private categorizeError(line: string): DetectedError['category'] {
    if (/test/i.test(line)) return 'test';
    if (/syntax|parse/i.test(line)) return 'syntax';
    if (/security|authentication/i.test(line)) return 'security';
    if (/dependency|package|module/i.test(line)) return 'dependency';
    return 'runtime';
  }

  /**
   * Determine severity
   */
  private determineSeverity(line: string): DetectedError['severity'] {
    if (/critical|fatal|security/i.test(line)) return 'critical';
    if (/error/i.test(line)) return 'high';
    if (/warning/i.test(line)) return 'medium';
    return 'low';
  }

  /**
   * Generate error ID
   */
  private generateErrorId(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }

  /**
   * Create pull request with fix
   */
  private async createPullRequestWithFix(
    result: any,
    error: DetectedError
  ): Promise<void> {
    try {
      console.log('Creating pull request with fix...');

      // Create a new branch
      const branchName = `auto-fix/${error.id}`;
      await execAsync(`git checkout -b ${branchName}`);

      // Commit changes
      await execAsync('git add .');
      await execAsync(`git commit -m "Auto-fix: ${result.fixApplied}

Applied by auto-remediation system.
Error: ${error.message}
Fix: ${result.fixApplied}
Tests: ${result.testsPassed}/${result.testsRun} passed
"`);

      // Push branch
      await execAsync(`git push origin ${branchName}`);

      // Create PR via Azure DevOps API
      const prUrl = await this.createPRViaAPI(branchName, result, error);
      
      console.log(`✅ Pull request created: ${prUrl}`);

    } catch (error) {
      console.error('Failed to create pull request:', error);
    }
  }

  /**
   * Create PR via Azure DevOps REST API
   */
  private async createPRViaAPI(
    branchName: string,
    result: any,
    error: DetectedError
  ): Promise<string> {
    const url = `https://dev.azure.com/${this.config.organization}/${this.config.project}/_apis/git/repositories/${this.config.repositoryUrl}/pullrequests?api-version=7.0`;

    const prData = {
      sourceRefName: `refs/heads/${branchName}`,
      targetRefName: `refs/heads/${this.config.branchName || 'main'}`,
      title: `[Auto-Fix] ${result.fixApplied}`,
      description: `## Automated Fix

**Error Detected:**
\`\`\`
${error.message}
\`\`\`

**Fix Applied:**
${result.fixApplied}

**Test Results:**
- Tests Run: ${result.testsRun}
- Tests Passed: ${result.testsPassed}
- Duration: ${result.duration}ms

**Details:**
- Error ID: ${error.id}
- Category: ${error.category}
- Severity: ${error.severity}
- Source: ${error.source}

This fix was automatically applied by the auto-remediation system.
Please review and merge if appropriate.

---
*Generated by Auto-Remediation System*
`,
      reviewers: []
    };

    try {
      const command = `curl -X POST -u :${this.config.personalAccessToken} \
        -H "Content-Type: application/json" \
        -d '${JSON.stringify(prData)}' \
        "${url}"`;

      const { stdout } = await execAsync(command);
      const response = JSON.parse(stdout);

      return response.url || 'PR created';
    } catch (error) {
      console.error('Failed to create PR via API:', error);
      throw error;
    }
  }

  /**
   * Add pipeline status comment
   */
  async addPipelineComment(message: string): Promise<void> {
    console.log(`💬 Adding pipeline comment: ${message}`);
    // Would use Azure DevOps API to add comment
  }

  /**
   * Queue new build after fix
   */
  async queueBuild(): Promise<void> {
    console.log('🔄 Queueing new build...');
    
    try {
      const url = `https://dev.azure.com/${this.config.organization}/${this.config.project}/_apis/build/builds?api-version=7.0`;

      const buildData = {
        definition: { id: this.config.pipelineId },
        sourceBranch: this.config.branchName || 'main'
      };

      const command = `curl -X POST -u :${this.config.personalAccessToken} \
        -H "Content-Type: application/json" \
        -d '${JSON.stringify(buildData)}' \
        "${url}"`;

      await execAsync(command);
      console.log('✅ Build queued successfully');

    } catch (error) {
      console.error('Failed to queue build:', error);
    }
  }
}

/**
 * Azure Pipeline YAML Integration
 */
export function generatePipelineYAML(): string {
  return `# Azure Pipeline with Auto-Remediation
# This pipeline automatically fixes errors when builds fail

trigger:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  REMEDIATION_ENABLED: 'true'

stages:
  - stage: Build
    jobs:
      - job: BuildAndTest
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
            displayName: 'Install Node.js'

          - script: |
              npm install
              npm run build
            displayName: 'Build'

          - script: |
              npm test
            displayName: 'Run Tests'
            continueOnError: true

          - script: |
              if [ "$(REMEDIATION_ENABLED)" == "true" ]; then
                echo "Running auto-remediation..."
                npm run auto-remediate -- --build-id $(Build.BuildId)
              fi
            displayName: 'Auto-Remediation'
            condition: failed()

          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: '**/test-results.xml'
            condition: always()

  - stage: Deploy
    dependsOn: Build
    condition: succeeded()
    jobs:
      - deployment: DeployToProduction
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: |
                    echo "Deploying to production..."
                  displayName: 'Deploy'
`;
}

/**
 * Setup script for Azure DevOps integration
 */
export function generateSetupScript(): string {
  return `#!/bin/bash
# Setup Auto-Remediation for Azure DevOps

echo "🔧 Setting up Auto-Remediation for Azure DevOps..."

# Install dependencies
npm install

# Build the system
npm run build

# Configure Azure DevOps
echo "Please provide your Azure DevOps configuration:"
read -p "Organization: " ORG
read -p "Project: " PROJECT
read -p "Personal Access Token: " PAT

# Create config file
cat > azure-devops-config.json << EOF
{
  "organization": "$ORG",
  "project": "$PROJECT",
  "personalAccessToken": "$PAT",
  "branchName": "main"
}
EOF

echo "✅ Configuration saved to azure-devops-config.json"

# Add pipeline task
echo ""
echo "Add this task to your azure-pipelines.yml:"
echo ""
echo "  - script: |"
echo "      npm run auto-remediate -- --build-id \\$(Build.BuildId)"
echo "    displayName: 'Auto-Remediation'"
echo "    condition: failed()"
echo ""

echo "✅ Setup complete!"
`;
}
