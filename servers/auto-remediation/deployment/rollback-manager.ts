/**
 * Rollback Manager
 * Manages backups and rollbacks
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface BackupMetadata {
  id: string;
  source: string;
  backupPath: string;
  timestamp: Date;
  deployed: boolean;
}

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
