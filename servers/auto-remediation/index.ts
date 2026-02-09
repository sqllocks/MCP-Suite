/**
 * Auto-Remediation System - Main Entry Point
 */

import { RemediationOrchestrator, RemediationConfig } from './core/remediation-orchestrator.js';

/**
 * Start the auto-remediation system
 */
export async function startAutoRemediation(config?: Partial<RemediationConfig>): Promise<RemediationOrchestrator> {
  const defaultConfig: RemediationConfig = {
    autoFixEnabled: true,
    autoTestEnabled: true,
    autoDeployEnabled: false, // Safer default
    requireApproval: true,
    maxRetries: 3,
    dryRun: false
  };

  const orchestrator = new RemediationOrchestrator({
    ...defaultConfig,
    ...config
  });

  await orchestrator.start();
  
  return orchestrator;
}

/**
 * Quick start with defaults
 */
export async function quickStart(): Promise<RemediationOrchestrator> {
  console.log('🚀 Starting Auto-Remediation System with defaults...');
  
  return startAutoRemediation({
    autoFixEnabled: true,
    autoTestEnabled: true,
    autoDeployEnabled: false,
    requireApproval: true,
    dryRun: false
  });
}

/**
 * Dry run mode (no changes)
 */
export async function dryRun(): Promise<RemediationOrchestrator> {
  console.log('🔍 Starting Auto-Remediation System in DRY RUN mode...');
  
  return startAutoRemediation({
    autoFixEnabled: true,
    autoTestEnabled: true,
    autoDeployEnabled: false,
    requireApproval: false,
    dryRun: true
  });
}

/**
 * Production mode (full automation)
 */
export async function productionMode(): Promise<RemediationOrchestrator> {
  console.log('⚡ Starting Auto-Remediation System in PRODUCTION mode...');
  console.warn('⚠️  This will automatically fix, test, and deploy. Use with caution!');
  
  return startAutoRemediation({
    autoFixEnabled: true,
    autoTestEnabled: true,
    autoDeployEnabled: true,
    requireApproval: false, // Full automation
    dryRun: false
  });
}

// Export all components
export { RemediationOrchestrator, RemediationConfig } from './core/remediation-orchestrator.js';
export { ErrorDetector } from './detection/error-detector.js';
export { PatternMatcher, FixPattern } from './analysis/pattern-matcher.js';
export { AutoFixer } from './fixing/auto-fixer.js';
export { TestRunner } from './testing/test-runner.js';
export { DeploymentManager } from './deployment/deployment-manager.js';
export { RollbackManager } from './deployment/rollback-manager.js';
export { RemediationLogger } from './logging/remediation-logger.js';
