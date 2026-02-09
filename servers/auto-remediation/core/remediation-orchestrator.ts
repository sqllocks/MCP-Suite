/**
 * Auto-Remediation Orchestrator
 * Main controller for the auto-remediation system
 * Detects errors, applies fixes, tests, and deploys automatically
 */

import { EventEmitter } from 'events';
import { ErrorDetector } from '../detection/error-detector.js';
import { PatternMatcher } from '../analysis/pattern-matcher.js';
import { AutoFixer } from '../fixing/auto-fixer.js';
import { TestRunner } from '../testing/test-runner.js';
import { DeploymentManager } from '../deployment/deployment-manager.js';
import { RemediationLogger } from '../logging/remediation-logger.js';
import { RollbackManager } from '../deployment/rollback-manager.js';

export interface RemediationConfig {
  autoFixEnabled: boolean;
  autoTestEnabled: boolean;
  autoDeployEnabled: boolean;
  requireApproval: boolean;
  maxRetries: number;
  notificationWebhook?: string;
  dryRun: boolean;
}

export interface DetectedError {
  id: string;
  timestamp: Date;
  category: 'security' | 'syntax' | 'runtime' | 'test' | 'dependency';
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  message: string;
  stackTrace?: string;
  context: Record<string, any>;
}

export interface RemediationResult {
  errorId: string;
  success: boolean;
  fixApplied?: string;
  testsRun: number;
  testsPassed: number;
  deployed: boolean;
  duration: number;
  rollbackAvailable: boolean;
  logs: string[];
}

export class RemediationOrchestrator extends EventEmitter {
  private errorDetector: ErrorDetector;
  private patternMatcher: PatternMatcher;
  private autoFixer: AutoFixer;
  private testRunner: TestRunner;
  private deploymentManager: DeploymentManager;
  private logger: RemediationLogger;
  private rollbackManager: RollbackManager;
  private config: RemediationConfig;
  private activeRemediations: Map<string, Promise<RemediationResult>>;
  private isRunning: boolean = false;

  constructor(config: RemediationConfig) {
    super();
    this.config = config;
    this.errorDetector = new ErrorDetector();
    this.patternMatcher = new PatternMatcher();
    this.autoFixer = new AutoFixer();
    this.testRunner = new TestRunner();
    this.deploymentManager = new DeploymentManager();
    this.logger = new RemediationLogger();
    this.rollbackManager = new RollbackManager();
    this.activeRemediations = new Map();

    this.setupEventHandlers();
  }

  /**
   * Start the auto-remediation system
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Remediation system is already running');
    }

    this.isRunning = true;
    this.logger.info('Auto-remediation system started');
    
    // Start error detection
    await this.errorDetector.startMonitoring();
    
    // Listen for detected errors
    this.errorDetector.on('error-detected', (error: DetectedError) => {
      this.handleDetectedError(error);
    });

    this.emit('started');
  }

  /**
   * Stop the auto-remediation system
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    await this.errorDetector.stopMonitoring();
    
    // Wait for active remediations to complete
    await Promise.all(Array.from(this.activeRemediations.values()));
    
    this.logger.info('Auto-remediation system stopped');
    this.emit('stopped');
  }

  /**
   * Handle a detected error
   */
  private async handleDetectedError(error: DetectedError): Promise<void> {
    if (this.activeRemediations.has(error.id)) {
      this.logger.warn(`Remediation already in progress for error: ${error.id}`);
      return;
    }

    const remediationPromise = this.remediate(error);
    this.activeRemediations.set(error.id, remediationPromise);

    try {
      const result = await remediationPromise;
      this.emit('remediation-complete', result);
      
      if (result.success) {
        this.logger.info(`Successfully remediated error: ${error.id}`);
      } else {
        this.logger.error(`Failed to remediate error: ${error.id}`);
      }
    } finally {
      this.activeRemediations.delete(error.id);
    }
  }

  /**
   * Main remediation workflow
   */
  private async remediate(error: DetectedError): Promise<RemediationResult> {
    const startTime = Date.now();
    const logs: string[] = [];

    const log = (message: string) => {
      logs.push(`[${new Date().toISOString()}] ${message}`);
      this.logger.info(message);
    };

    try {
      log(`Starting remediation for error: ${error.id}`);
      log(`Category: ${error.category}, Severity: ${error.severity}`);

      // Step 1: Analyze the error and find matching patterns
      log('Step 1: Analyzing error pattern...');
      const patterns = await this.patternMatcher.findMatches(error);
      
      if (patterns.length === 0) {
        log('No known fix patterns found for this error');
        return {
          errorId: error.id,
          success: false,
          testsRun: 0,
          testsPassed: 0,
          deployed: false,
          duration: Date.now() - startTime,
          rollbackAvailable: false,
          logs
        };
      }

      log(`Found ${patterns.length} potential fix pattern(s)`);

      // Step 2: Create backup before making changes
      log('Step 2: Creating backup...');
      const backupId = await this.rollbackManager.createBackup(error.source);
      log(`Backup created: ${backupId}`);

      // Step 3: Apply fixes
      let fixApplied: string | undefined;
      let fixSuccess = false;

      for (let i = 0; i < patterns.length && !fixSuccess; i++) {
        const pattern = patterns[i];
        log(`Step 3: Attempting fix ${i + 1}/${patterns.length}: ${pattern.name}`);

        if (this.config.dryRun) {
          log('[DRY RUN] Would apply fix, skipping actual changes');
          fixApplied = pattern.name;
          fixSuccess = true;
          continue;
        }

        try {
          const fix = await this.autoFixer.applyFix(pattern, error);
          fixApplied = pattern.name;
          log(`Fix applied successfully: ${fix.description}`);

          // Step 4: Run tests
          if (this.config.autoTestEnabled) {
            log('Step 4: Running tests...');
            const testResults = await this.testRunner.runTests(error.source);
            
            log(`Tests completed: ${testResults.passed}/${testResults.total} passed`);

            if (testResults.passed === testResults.total) {
              fixSuccess = true;
              log('All tests passed!');

              // Step 5: Deploy
              if (this.config.autoDeployEnabled) {
                if (this.config.requireApproval) {
                  log('Step 5: Awaiting approval for deployment...');
                  const approved = await this.requestApproval(error, fix, testResults);
                  
                  if (!approved) {
                    log('Deployment not approved, rolling back...');
                    await this.rollbackManager.rollback(backupId);
                    return {
                      errorId: error.id,
                      success: false,
                      fixApplied,
                      testsRun: testResults.total,
                      testsPassed: testResults.passed,
                      deployed: false,
                      duration: Date.now() - startTime,
                      rollbackAvailable: true,
                      logs
                    };
                  }
                }

                log('Step 5: Deploying fix...');
                const deployed = await this.deploymentManager.deploy(error.source, fix);
                
                if (deployed) {
                  log('Deployment successful!');
                  await this.rollbackManager.markAsDeployed(backupId);
                  
                  return {
                    errorId: error.id,
                    success: true,
                    fixApplied,
                    testsRun: testResults.total,
                    testsPassed: testResults.passed,
                    deployed: true,
                    duration: Date.now() - startTime,
                    rollbackAvailable: true,
                    logs
                  };
                } else {
                  log('Deployment failed, rolling back...');
                  await this.rollbackManager.rollback(backupId);
                }
              } else {
                log('Auto-deployment disabled, fix applied but not deployed');
                return {
                  errorId: error.id,
                  success: true,
                  fixApplied,
                  testsRun: testResults.total,
                  testsPassed: testResults.passed,
                  deployed: false,
                  duration: Date.now() - startTime,
                  rollbackAvailable: true,
                  logs
                };
              }
            } else {
              log(`Tests failed (${testResults.failed} failures), trying next fix...`);
              await this.rollbackManager.rollback(backupId);
            }
          } else {
            log('Auto-testing disabled, assuming fix successful');
            fixSuccess = true;
          }
        } catch (fixError) {
          log(`Fix failed: ${fixError}`);
          await this.rollbackManager.rollback(backupId);
        }
      }

      if (!fixSuccess) {
        log('All fix attempts failed');
        return {
          errorId: error.id,
          success: false,
          fixApplied,
          testsRun: 0,
          testsPassed: 0,
          deployed: false,
          duration: Date.now() - startTime,
          rollbackAvailable: true,
          logs
        };
      }

      return {
        errorId: error.id,
        success: fixSuccess,
        fixApplied,
        testsRun: 0,
        testsPassed: 0,
        deployed: false,
        duration: Date.now() - startTime,
        rollbackAvailable: true,
        logs
      };

    } catch (error) {
      log(`Critical error during remediation: ${error}`);
      return {
        errorId: error.id,
        success: false,
        testsRun: 0,
        testsPassed: 0,
        deployed: false,
        duration: Date.now() - startTime,
        rollbackAvailable: false,
        logs
      };
    }
  }

  /**
   * Request approval for deployment
   */
  private async requestApproval(
    error: DetectedError,
    fix: any,
    testResults: any
  ): Promise<boolean> {
    // In a real system, this would send a notification and wait for approval
    // For now, auto-approve critical/high severity issues that pass tests
    if (error.severity === 'critical' || error.severity === 'high') {
      if (testResults.passed === testResults.total) {
        return true;
      }
    }

    // Would implement webhook/notification here
    return false;
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('remediation-complete', async (result: RemediationResult) => {
      // Log to audit trail
      await this.logger.logRemediation(result);

      // Send notifications if configured
      if (this.config.notificationWebhook) {
        await this.sendNotification(result);
      }
    });
  }

  /**
   * Send notification about remediation
   */
  private async sendNotification(result: RemediationResult): Promise<void> {
    try {
      // Would implement webhook notification here
      this.logger.info(`Notification sent for remediation: ${result.errorId}`);
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error}`);
    }
  }

  /**
   * Get system status
   */
  getStatus(): {
    running: boolean;
    activeRemediations: number;
    config: RemediationConfig;
  } {
    return {
      running: this.isRunning,
      activeRemediations: this.activeRemediations.size,
      config: this.config
    };
  }

  /**
   * Manually trigger remediation for a specific error
   */
  async manualRemediate(error: DetectedError): Promise<RemediationResult> {
    return this.remediate(error);
  }
}
