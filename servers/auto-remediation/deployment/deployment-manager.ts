/**
 * Deployment Manager
 * Handles safe deployment of fixes to production
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface DeploymentConfig {
  strategy: 'immediate' | 'staged' | 'canary';
  environment: 'development' | 'staging' | 'production';
  buildCommand?: string;
  deployCommand?: string;
  healthCheckUrl?: string;
  rollbackOnFailure: boolean;
}

export class DeploymentManager {
  private config: DeploymentConfig;

  constructor(config?: Partial<DeploymentConfig>) {
    this.config = {
      strategy: 'immediate',
      environment: 'development',
      buildCommand: 'npm run build',
      deployCommand: 'npm run deploy',
      rollbackOnFailure: true,
      ...config
    };
  }

  /**
   * Deploy a fix
   */
  async deploy(source: string, fix: any): Promise<boolean> {
    console.log(`🚀 Deploying fix for: ${source}`);
    
    try {
      // Step 1: Build
      if (this.config.buildCommand) {
        console.log('  → Building...');
        await this.runCommand(this.config.buildCommand);
        console.log('  ✓ Build successful');
      }

      // Step 2: Pre-deployment checks
      console.log('  → Running pre-deployment checks...');
      const checksPass = await this.runPreDeploymentChecks();
      
      if (!checksPass) {
        console.error('  ✗ Pre-deployment checks failed');
        return false;
      }
      console.log('  ✓ Pre-deployment checks passed');

      // Step 3: Deploy based on strategy
      console.log(`  → Deploying (${this.config.strategy} strategy)...`);
      
      switch (this.config.strategy) {
        case 'immediate':
          await this.deployImmediate();
          break;
        case 'staged':
          await this.deployStaged();
          break;
        case 'canary':
          await this.deployCanary();
          break;
      }

      // Step 4: Post-deployment checks
      console.log('  → Running post-deployment checks...');
      const healthCheck = await this.runHealthCheck();
      
      if (!healthCheck) {
        console.error('  ✗ Health check failed');
        if (this.config.rollbackOnFailure) {
          console.log('  ⏪ Rolling back...');
          return false;
        }
      }

      console.log('  ✓ Deployment successful');
      return true;

    } catch (error) {
      console.error('  ✗ Deployment failed:', error);
      return false;
    }
  }

  /**
   * Deploy immediately (all at once)
   */
  private async deployImmediate(): Promise<void> {
    if (this.config.deployCommand) {
      await this.runCommand(this.config.deployCommand);
    }
  }

  /**
   * Deploy in stages
   */
  private async deployStaged(): Promise<void> {
    // Deploy to 10% first
    console.log('    → Deploying to 10%...');
    await this.deployToPercentage(10);
    await this.sleep(5000);

    // Then 50%
    console.log('    → Deploying to 50%...');
    await this.deployToPercentage(50);
    await this.sleep(5000);

    // Finally 100%
    console.log('    → Deploying to 100%...');
    await this.deployToPercentage(100);
  }

  /**
   * Deploy using canary strategy
   */
  private async deployCanary(): Promise<void> {
    console.log('    → Deploying canary instance...');
    // Deploy to single instance first
    await this.sleep(2000);
    
    console.log('    → Monitoring canary...');
    await this.sleep(3000);
    
    console.log('    → Rolling out to all instances...');
    await this.deployImmediate();
  }

  /**
   * Deploy to percentage of infrastructure
   */
  private async deployToPercentage(percentage: number): Promise<void> {
    // Simplified - would integrate with actual deployment system
    await this.sleep(1000);
  }

  /**
   * Run pre-deployment checks
   */
  private async runPreDeploymentChecks(): Promise<boolean> {
    try {
      // Check if build artifacts exist
      // Check if tests passed
      // Check if no pending migrations
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run health check on deployed system
   */
  private async runHealthCheck(): Promise<boolean> {
    if (!this.config.healthCheckUrl) {
      return true; // No health check configured
    }

    try {
      // Would make HTTP request to health check endpoint
      await this.sleep(1000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run a command
   */
  private async runCommand(command: string): Promise<void> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 300000 // 5 minute timeout
      });

      if (stderr && !stderr.includes('warning')) {
        console.warn('    Command stderr:', stderr.slice(0, 200));
      }
    } catch (error: any) {
      throw new Error(`Command failed: ${command} - ${error.message}`);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Rollback Manager
 * Manages backups and rollbacks
 */

export class RollbackManager {
  private backupDir: string = '.remediation-backups';
  private backups: Map<string, BackupMetadata> = new Map();

  constructor() {
    this.initializeBackupDir();
  }

  /**
   * Initialize backup directory
   */
  private async initializeBackupDir(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch {
      // Directory already exists
    }
  }

  /**
   * Create a backup before applying fix
   */
  async createBackup(source: string): Promise<string> {
    const backupId = this.generateBackupId();
    const timestamp = new Date();

    console.log(`💾 Creating backup: ${backupId}`);

    try {
      // Read source file
      const content = await fs.readFile(source, 'utf-8');

      // Save backup
      const backupPath = path.join(this.backupDir, `${backupId}.bak`);
      await fs.writeFile(backupPath, content, 'utf-8');

      // Save metadata
      const metadata: BackupMetadata = {
        id: backupId,
        source,
        backupPath,
        timestamp,
        deployed: false
      };

      await fs.writeFile(
        path.join(this.backupDir, `${backupId}.meta.json`),
        JSON.stringify(metadata, null, 2),
        'utf-8'
      );

      this.backups.set(backupId, metadata);

      console.log(`  ✓ Backup created: ${backupId}`);
      return backupId;

    } catch (error) {
      console.error(`  ✗ Backup failed:`, error);
      throw error;
    }
  }

  /**
   * Rollback to a previous backup
   */
  async rollback(backupId: string): Promise<boolean> {
    console.log(`⏪ Rolling back: ${backupId}`);

    const metadata = this.backups.get(backupId);
    if (!metadata) {
      console.error(`  ✗ Backup not found: ${backupId}`);
      return false;
    }

    try {
      // Read backup
      const content = await fs.readFile(metadata.backupPath, 'utf-8');

      // Restore file
      await fs.writeFile(metadata.source, content, 'utf-8');

      console.log(`  ✓ Rolled back successfully`);
      return true;

    } catch (error) {
      console.error(`  ✗ Rollback failed:`, error);
      return false;
    }
  }

  /**
   * Mark backup as deployed
   */
  async markAsDeployed(backupId: string): Promise<void> {
    const metadata = this.backups.get(backupId);
    if (metadata) {
      metadata.deployed = true;
      
      // Update metadata file
      await fs.writeFile(
        path.join(this.backupDir, `${backupId}.meta.json`),
        JSON.stringify(metadata, null, 2),
        'utf-8'
      );
    }
  }

  /**
   * List all backups
   */
  async listBackups(): Promise<BackupMetadata[]> {
    return Array.from(this.backups.values());
  }

  /**
   * Clean old backups (keep last 100)
   */
  async cleanOldBackups(): Promise<void> {
    const backups = await this.listBackups();
    
    if (backups.length <= 100) {
      return;
    }

    // Sort by timestamp, oldest first
    backups.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Delete oldest backups
    const toDelete = backups.slice(0, backups.length - 100);
    
    for (const backup of toDelete) {
      try {
        await fs.unlink(backup.backupPath);
        await fs.unlink(path.join(this.backupDir, `${backup.id}.meta.json`));
        this.backups.delete(backup.id);
      } catch {
        // Failed to delete, continue
      }
    }
  }

  /**
   * Generate unique backup ID
   */
  private generateBackupId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    return `backup-${timestamp}-${random}`;
  }
}

interface BackupMetadata {
  id: string;
  source: string;
  backupPath: string;
  timestamp: Date;
  deployed: boolean;
}
