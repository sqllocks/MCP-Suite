/**
 * Auto Fixer
 * Applies automated fixes to code based on identified patterns
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { FixPattern, FixAction } from '../analysis/pattern-matcher.js';
import { DetectedError } from '../core/remediation-orchestrator.js';

const execAsync = promisify(exec);

export interface AppliedFix {
  patternId: string;
  description: string;
  filesModified: string[];
  commandsExecuted: string[];
  timestamp: Date;
  success: boolean;
  error?: string;
}

export class AutoFixer {
  private dryRun: boolean = false;

  constructor(dryRun: boolean = false) {
    this.dryRun = dryRun;
  }

  /**
   * Apply a fix pattern to resolve an error
   */
  async applyFix(pattern: FixPattern, error: DetectedError): Promise<AppliedFix> {
    const result: AppliedFix = {
      patternId: pattern.id,
      description: pattern.description,
      filesModified: [],
      commandsExecuted: [],
      timestamp: new Date(),
      success: false
    };

    try {
      console.log(`🔧 Applying fix: ${pattern.name}`);
      
      // Execute all fix actions
      for (const action of pattern.fix.actions) {
        await this.executeAction(action, error, result);
      }

      result.success = true;
      console.log(`✅ Fix applied successfully`);
      
    } catch (err) {
      result.error = String(err);
      result.success = false;
      console.error(`❌ Fix failed:`, err);
      throw err;
    }

    return result;
  }

  /**
   * Execute a single fix action
   */
  private async executeAction(
    action: FixAction,
    error: DetectedError,
    result: AppliedFix
  ): Promise<void> {
    switch (action.type) {
      case 'file-replace':
        await this.handleFileReplace(action, error, result);
        break;

      case 'file-insert':
        await this.handleFileInsert(action, error, result);
        break;

      case 'file-delete':
        await this.handleFileDelete(action, error, result);
        break;

      case 'command':
        await this.handleCommand(action, error, result);
        break;

      case 'config-update':
        await this.handleConfigUpdate(action, error, result);
        break;

      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Handle file content replacement
   */
  private async handleFileReplace(
    action: FixAction,
    error: DetectedError,
    result: AppliedFix
  ): Promise<void> {
    const filePath = action.target || error.source;
    
    if (!filePath) {
      throw new Error('No file path specified for replacement');
    }

    console.log(`  → Replacing content in: ${filePath}`);

    if (this.dryRun) {
      console.log(`  [DRY RUN] Would replace in ${filePath}`);
      result.filesModified.push(filePath);
      return;
    }

    try {
      // Read file
      let content = await fs.readFile(filePath, 'utf-8');
      const originalContent = content;

      // Apply replacements
      if (action.find && action.replace) {
        const regex = typeof action.find === 'string' 
          ? new RegExp(this.escapeRegex(action.find), 'g')
          : action.find;
        
        content = content.replace(regex, action.replace);
      }

      // Only write if content changed
      if (content !== originalContent) {
        await fs.writeFile(filePath, content, 'utf-8');
        result.filesModified.push(filePath);
        console.log(`  ✓ Modified: ${filePath}`);
      } else {
        console.log(`  ℹ No changes needed in: ${filePath}`);
      }
    } catch (err) {
      if ((err as any).code === 'ENOENT') {
        console.log(`  ⚠ File not found: ${filePath}`);
      } else {
        throw err;
      }
    }
  }

  /**
   * Handle content insertion
   */
  private async handleFileInsert(
    action: FixAction,
    error: DetectedError,
    result: AppliedFix
  ): Promise<void> {
    const filePath = action.target || error.source;
    
    if (!filePath || !action.content) {
      throw new Error('File path and content required for insertion');
    }

    console.log(`  → Inserting content into: ${filePath}`);

    if (this.dryRun) {
      console.log(`  [DRY RUN] Would insert into ${filePath}`);
      result.filesModified.push(filePath);
      return;
    }

    try {
      let content = await fs.readFile(filePath, 'utf-8');

      // Determine insertion point
      const insertionPoint = this.findInsertionPoint(content, action.content);
      
      // Insert content
      const before = content.slice(0, insertionPoint);
      const after = content.slice(insertionPoint);
      const newContent = before + action.content + '\n' + after;

      await fs.writeFile(filePath, newContent, 'utf-8');
      result.filesModified.push(filePath);
      console.log(`  ✓ Content inserted into: ${filePath}`);
      
    } catch (err) {
      if ((err as any).code === 'ENOENT') {
        // Create new file with content
        await fs.writeFile(filePath, action.content, 'utf-8');
        result.filesModified.push(filePath);
        console.log(`  ✓ Created new file: ${filePath}`);
      } else {
        throw err;
      }
    }
  }

  /**
   * Find appropriate insertion point in file
   */
  private findInsertionPoint(content: string, insertContent: string): number {
    // If inserting import, put at top after other imports
    if (insertContent.includes('import')) {
      const lastImportMatch = content.match(/import.*?from.*;?\n/g);
      if (lastImportMatch) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1];
        const index = content.lastIndexOf(lastImport);
        return index + lastImport.length;
      }
      return 0; // Put at very top if no imports found
    }

    // For other content, find appropriate location
    // This is simplified - in production, would use AST parsing
    return 0;
  }

  /**
   * Handle file deletion
   */
  private async handleFileDelete(
    action: FixAction,
    error: DetectedError,
    result: AppliedFix
  ): Promise<void> {
    const filePath = action.target || error.source;
    
    if (!filePath) {
      throw new Error('No file path specified for deletion');
    }

    console.log(`  → Deleting file: ${filePath}`);

    if (this.dryRun) {
      console.log(`  [DRY RUN] Would delete ${filePath}`);
      result.filesModified.push(filePath);
      return;
    }

    try {
      await fs.unlink(filePath);
      result.filesModified.push(filePath);
      console.log(`  ✓ Deleted: ${filePath}`);
    } catch (err) {
      if ((err as any).code === 'ENOENT') {
        console.log(`  ℹ File already deleted: ${filePath}`);
      } else {
        throw err;
      }
    }
  }

  /**
   * Handle command execution
   */
  private async handleCommand(
    action: FixAction,
    error: DetectedError,
    result: AppliedFix
  ): Promise<void> {
    if (!action.command) {
      throw new Error('No command specified');
    }

    let command = action.command;
    const filePath = action.target || error.source;

    // Build full command
    if (command === 'chmod 600' && filePath) {
      command = `chmod 600 ${filePath}`;
    } else if (command === 'npm install') {
      // Extract package name from error if possible
      const packageMatch = error.message.match(/Cannot find module ['"](.+?)['"]/);
      if (packageMatch) {
        command = `npm install ${packageMatch[1]}`;
      }
    }

    console.log(`  → Executing command: ${command}`);

    if (this.dryRun) {
      console.log(`  [DRY RUN] Would execute: ${command}`);
      result.commandsExecuted.push(command);
      return;
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 120000 // 2 minute timeout
      });

      result.commandsExecuted.push(command);
      
      if (stderr && !stderr.includes('npm WARN')) {
        console.log(`  ⚠ Command output (stderr):`, stderr.slice(0, 200));
      }
      
      console.log(`  ✓ Command executed successfully`);
      
    } catch (err: any) {
      console.error(`  ✗ Command failed:`, err.message);
      throw new Error(`Command failed: ${command} - ${err.message}`);
    }
  }

  /**
   * Handle configuration updates
   */
  private async handleConfigUpdate(
    action: FixAction,
    error: DetectedError,
    result: AppliedFix
  ): Promise<void> {
    const configFile = action.target || 'config.json';
    
    if (!action.configKey) {
      throw new Error('Config key required for config update');
    }

    console.log(`  → Updating config: ${configFile}`);

    if (this.dryRun) {
      console.log(`  [DRY RUN] Would update ${configFile}`);
      result.filesModified.push(configFile);
      return;
    }

    try {
      // Read config
      let config: any = {};
      
      try {
        const content = await fs.readFile(configFile, 'utf-8');
        config = JSON.parse(content);
      } catch {
        // Config file doesn't exist or is invalid, create new
      }

      // Update config
      this.setNestedProperty(config, action.configKey, action.configValue);

      // Write config
      await fs.writeFile(
        configFile,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      result.filesModified.push(configFile);
      console.log(`  ✓ Config updated: ${configFile}`);
      
    } catch (err) {
      throw new Error(`Failed to update config: ${err}`);
    }
  }

  /**
   * Set nested property in object using dot notation
   */
  private setNestedProperty(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Validate fix before applying
   */
  async validateFix(pattern: FixPattern, error: DetectedError): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Check if target files exist
    for (const action of pattern.fix.actions) {
      if (action.type === 'file-replace' || action.type === 'file-insert') {
        const filePath = action.target || error.source;
        
        if (filePath) {
          try {
            await fs.access(filePath);
          } catch {
            if (action.type === 'file-replace') {
              issues.push(`Target file does not exist: ${filePath}`);
            }
          }
        }
      }
    }

    // Check if commands are available
    for (const action of pattern.fix.actions) {
      if (action.type === 'command' && action.command) {
        const command = action.command.split(' ')[0];
        
        try {
          await execAsync(`which ${command}`);
        } catch {
          issues.push(`Command not available: ${command}`);
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Preview what a fix would do (dry run)
   */
  async previewFix(pattern: FixPattern, error: DetectedError): Promise<{
    actions: string[];
    filesAffected: string[];
    commandsToRun: string[];
  }> {
    const actions: string[] = [];
    const filesAffected: string[] = [];
    const commandsToRun: string[] = [];

    for (const action of pattern.fix.actions) {
      const filePath = action.target || error.source;

      switch (action.type) {
        case 'file-replace':
          actions.push(`Replace content in ${filePath}`);
          if (filePath) filesAffected.push(filePath);
          break;

        case 'file-insert':
          actions.push(`Insert content into ${filePath}`);
          if (filePath) filesAffected.push(filePath);
          break;

        case 'file-delete':
          actions.push(`Delete file ${filePath}`);
          if (filePath) filesAffected.push(filePath);
          break;

        case 'command':
          actions.push(`Execute command: ${action.command}`);
          if (action.command) commandsToRun.push(action.command);
          break;

        case 'config-update':
          actions.push(`Update config ${action.target || 'config.json'}`);
          filesAffected.push(action.target || 'config.json');
          break;
      }
    }

    return {
      actions,
      filesAffected: [...new Set(filesAffected)],
      commandsToRun
    };
  }
}
