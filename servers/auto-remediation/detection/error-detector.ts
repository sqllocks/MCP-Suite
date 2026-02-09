/**
 * Error Detector
 * Monitors multiple sources for errors: logs, tests, runtime, security scans
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import { DetectedError } from '../core/remediation-orchestrator.js';

export interface MonitoringConfig {
  logPaths: string[];
  testCommand?: string;
  securityScanInterval: number; // minutes
  runtimeMonitoring: boolean;
  watchedFiles: string[];
}

export class ErrorDetector extends EventEmitter {
  private config: MonitoringConfig;
  private isMonitoring: boolean = false;
  private watchers: any[] = [];
  private intervals: NodeJS.Timeout[] = [];
  private errorCache: Set<string> = new Set();

  constructor(config?: Partial<MonitoringConfig>) {
    super();
    this.config = {
      logPaths: ['./logs', './errors'],
      testCommand: 'npm test',
      securityScanInterval: 60,
      runtimeMonitoring: true,
      watchedFiles: ['**/*.ts', '**/*.js'],
      ...config
    };
  }

  /**
   * Start monitoring for errors
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      throw new Error('Already monitoring');
    }

    this.isMonitoring = true;
    console.log('🔍 Error detection started');

    // Monitor log files
    this.startLogMonitoring();

    // Monitor test failures
    this.startTestMonitoring();

    // Monitor security issues
    this.startSecurityMonitoring();

    // Monitor runtime errors (if enabled)
    if (this.config.runtimeMonitoring) {
      this.startRuntimeMonitoring();
    }

    // Watch for file changes
    this.startFileWatching();
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring(): Promise<void> {
    this.isMonitoring = false;

    // Clear all watchers
    this.watchers.forEach(watcher => {
      if (watcher && typeof watcher.close === 'function') {
        watcher.close();
      }
    });

    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));

    this.watchers = [];
    this.intervals = [];
    console.log('🛑 Error detection stopped');
  }

  /**
   * Monitor log files for errors
   */
  private startLogMonitoring(): void {
    console.log('📋 Monitoring log files...');

    const checkLogs = async () => {
      for (const logPath of this.config.logPaths) {
        try {
          await this.scanLogDirectory(logPath);
        } catch (error) {
          // Log directory might not exist yet
        }
      }
    };

    // Check logs every 10 seconds
    const interval = setInterval(checkLogs, 10000);
    this.intervals.push(interval);

    // Initial check
    checkLogs();
  }

  /**
   * Scan a log directory for errors
   */
  private async scanLogDirectory(dirPath: string): Promise<void> {
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        if (file.endsWith('.log') || file.endsWith('.err')) {
          const filePath = path.join(dirPath, file);
          await this.scanLogFile(filePath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
  }

  /**
   * Scan a specific log file for errors
   */
  private async scanLogFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for error patterns
        if (this.isErrorLine(line)) {
          const error = this.parseLogError(line, filePath, i + 1);
          if (error && !this.isDuplicate(error)) {
            this.emit('error-detected', error);
          }
        }
      }
    } catch (error) {
      // File read error
    }
  }

  /**
   * Check if a log line contains an error
   */
  private isErrorLine(line: string): boolean {
    const errorPatterns = [
      /ERROR/i,
      /CRITICAL/i,
      /FATAL/i,
      /Exception/i,
      /TypeError/i,
      /ReferenceError/i,
      /SyntaxError/i,
      /ECONNREFUSED/i,
      /ENOTFOUND/i,
      /401 Unauthorized/i,
      /403 Forbidden/i,
      /500 Internal Server Error/i,
      /SQL injection detected/i,
      /Authentication failed/i,
      /Rate limit exceeded/i,
      /Audit log tamper detected/i
    ];

    return errorPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Parse an error from a log line
   */
  private parseLogError(line: string, source: string, lineNumber: number): DetectedError | null {
    try {
      // Try to parse as JSON first (structured logging)
      if (line.trim().startsWith('{')) {
        const parsed = JSON.parse(line);
        return {
          id: this.generateErrorId(line),
          timestamp: new Date(parsed.timestamp || Date.now()),
          category: this.categorizeError(parsed.message || line),
          severity: this.determineSeverity(parsed.level || parsed.message),
          source,
          message: parsed.message || parsed.error || line,
          stackTrace: parsed.stack,
          context: parsed
        };
      }

      // Parse plain text log
      return {
        id: this.generateErrorId(line),
        timestamp: new Date(),
        category: this.categorizeError(line),
        severity: this.determineSeverity(line),
        source: `${source}:${lineNumber}`,
        message: line.trim(),
        context: { lineNumber, filePath: source }
      };
    } catch {
      return null;
    }
  }

  /**
   * Monitor test failures
   */
  private startTestMonitoring(): void {
    console.log('🧪 Monitoring test failures...');

    const runTests = async () => {
      if (!this.config.testCommand) return;

      try {
        const testProcess = spawn(this.config.testCommand, [], {
          shell: true,
          cwd: process.cwd()
        });

        let output = '';
        let errorOutput = '';

        testProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        testProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        testProcess.on('close', (code) => {
          if (code !== 0) {
            // Test failed
            const error = this.parseTestFailure(output + errorOutput);
            if (error && !this.isDuplicate(error)) {
              this.emit('error-detected', error);
            }
          }
        });
      } catch (error) {
        console.error('Failed to run tests:', error);
      }
    };

    // Run tests every 5 minutes
    const interval = setInterval(runTests, 5 * 60 * 1000);
    this.intervals.push(interval);
  }

  /**
   * Parse test failure output
   */
  private parseTestFailure(output: string): DetectedError | null {
    return {
      id: this.generateErrorId(output),
      timestamp: new Date(),
      category: 'test',
      severity: 'high',
      source: 'test-runner',
      message: 'Test suite failed',
      context: { output: output.slice(0, 1000) } // Limit size
    };
  }

  /**
   * Monitor for security issues
   */
  private startSecurityMonitoring(): void {
    console.log('🔒 Monitoring security issues...');

    const runSecurityScan = async () => {
      try {
        // Check for common security issues
        const issues = await this.scanForSecurityIssues();
        
        for (const issue of issues) {
          if (!this.isDuplicate(issue)) {
            this.emit('error-detected', issue);
          }
        }
      } catch (error) {
        console.error('Security scan failed:', error);
      }
    };

    // Run security scan based on interval
    const interval = setInterval(
      runSecurityScan,
      this.config.securityScanInterval * 60 * 1000
    );
    this.intervals.push(interval);

    // Initial scan
    runSecurityScan();
  }

  /**
   * Scan for security issues
   */
  private async scanForSecurityIssues(): Promise<DetectedError[]> {
    const issues: DetectedError[] = [];

    // Check file permissions
    try {
      const sensitiveFiles = [
        'shared/security/encryption-manager.ts',
        'shared/security/authentication-manager.ts',
        '.env',
        'config/secrets.json'
      ];

      for (const file of sensitiveFiles) {
        try {
          const stats = await fs.stat(file);
          const mode = stats.mode & parseInt('777', 8);
          
          // Check if file is world-readable
          if (mode & parseInt('004', 8)) {
            issues.push({
              id: this.generateErrorId(`permission-${file}`),
              timestamp: new Date(),
              category: 'security',
              severity: 'high',
              source: file,
              message: `Insecure file permissions: ${file} is world-readable`,
              context: { permissions: mode.toString(8) }
            });
          }
        } catch {
          // File doesn't exist
        }
      }
    } catch (error) {
      // Error checking permissions
    }

    // Check for exposed secrets
    try {
      const codeFiles = await this.findCodeFiles();
      
      for (const file of codeFiles) {
        const content = await fs.readFile(file, 'utf-8');
        
        // Look for hardcoded secrets
        const secretPatterns = [
          { pattern: /password\s*=\s*["'][^"']{5,}["']/i, type: 'password' },
          { pattern: /api[_-]?key\s*=\s*["'][^"']{10,}["']/i, type: 'api_key' },
          { pattern: /secret\s*=\s*["'][^"']{10,}["']/i, type: 'secret' },
          { pattern: /token\s*=\s*["'][^"']{20,}["']/i, type: 'token' }
        ];

        for (const { pattern, type } of secretPatterns) {
          if (pattern.test(content)) {
            issues.push({
              id: this.generateErrorId(`secret-${file}-${type}`),
              timestamp: new Date(),
              category: 'security',
              severity: 'critical',
              source: file,
              message: `Hardcoded ${type} detected in source code`,
              context: { type, file }
            });
          }
        }
      }
    } catch (error) {
      // Error scanning files
    }

    return issues;
  }

  /**
   * Find all code files
   */
  private async findCodeFiles(): Promise<string[]> {
    const files: string[] = [];
    
    // Simple implementation - would use glob in production
    const scanDir = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scanDir(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
            files.push(fullPath);
          }
        }
      } catch {
        // Directory not accessible
      }
    };

    await scanDir(process.cwd());
    return files;
  }

  /**
   * Monitor runtime errors
   */
  private startRuntimeMonitoring(): void {
    console.log('⚡ Monitoring runtime errors...');

    // Hook into process error events
    process.on('uncaughtException', (error) => {
      const detectedError: DetectedError = {
        id: this.generateErrorId(error.message),
        timestamp: new Date(),
        category: 'runtime',
        severity: 'critical',
        source: 'uncaughtException',
        message: error.message,
        stackTrace: error.stack,
        context: { error: error.toString() }
      };

      if (!this.isDuplicate(detectedError)) {
        this.emit('error-detected', detectedError);
      }
    });

    process.on('unhandledRejection', (reason: any) => {
      const detectedError: DetectedError = {
        id: this.generateErrorId(String(reason)),
        timestamp: new Date(),
        category: 'runtime',
        severity: 'high',
        source: 'unhandledRejection',
        message: String(reason),
        stackTrace: reason?.stack,
        context: { reason: String(reason) }
      };

      if (!this.isDuplicate(detectedError)) {
        this.emit('error-detected', detectedError);
      }
    });
  }

  /**
   * Watch for file changes
   */
  private startFileWatching(): void {
    console.log('👀 Watching for file changes...');
    
    // In production, would use chokidar or similar
    // For now, just log that we're watching
  }

  /**
   * Categorize an error based on content
   */
  private categorizeError(message: string): DetectedError['category'] {
    if (/security|authentication|authorization|encryption|sql injection/i.test(message)) {
      return 'security';
    }
    if (/syntax|parse error|unexpected token/i.test(message)) {
      return 'syntax';
    }
    if (/test|expect|assert/i.test(message)) {
      return 'test';
    }
    if (/ECONNREFUSED|ENOTFOUND|dependency|module not found/i.test(message)) {
      return 'dependency';
    }
    return 'runtime';
  }

  /**
   * Determine severity from message
   */
  private determineSeverity(message: string): DetectedError['severity'] {
    if (/critical|fatal|security|authentication|phi|pii/i.test(message)) {
      return 'critical';
    }
    if (/error|failed|exception/i.test(message)) {
      return 'high';
    }
    if (/warning|warn/i.test(message)) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Generate a unique error ID
   */
  private generateErrorId(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }

  /**
   * Check if error is a duplicate
   */
  private isDuplicate(error: DetectedError): boolean {
    if (this.errorCache.has(error.id)) {
      return true;
    }

    this.errorCache.add(error.id);

    // Clean cache if it gets too large
    if (this.errorCache.size > 1000) {
      const entries = Array.from(this.errorCache);
      this.errorCache = new Set(entries.slice(-500));
    }

    return false;
  }
}
