/**
 * Remediation Logger
 * Comprehensive logging for all remediation activities
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { RemediationResult } from '../core/remediation-orchestrator.js';

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  metadata?: Record<string, any>;
}

export class RemediationLogger {
  private logDir: string = './logs/remediation';
  private logFile: string = 'remediation.log';
  private auditFile: string = 'remediation-audit.log';
  private buffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize logger
   */
  private async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch {
      // Directory already exists
    }

    // Auto-flush buffer every 5 seconds
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', 'general', message, metadata);
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', 'general', message, metadata);
  }

  /**
   * Log error message
   */
  error(message: string, metadata?: Record<string, any>): void {
    this.log('error', 'general', message, metadata);
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', 'general', message, metadata);
  }

  /**
   * Generic log method
   */
  private log(
    level: LogEntry['level'],
    category: string,
    message: string,
    metadata?: Record<string, any>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      metadata
    };

    this.buffer.push(entry);

    // Console output
    const color = this.getColor(level);
    const emoji = this.getEmoji(level);
    console.log(`${emoji} [${level.toUpperCase()}] ${message}`);

    // Flush if buffer is large
    if (this.buffer.length >= 50) {
      this.flush();
    }
  }

  /**
   * Log remediation result to audit trail
   */
  async logRemediation(result: RemediationResult): Promise<void> {
    const entry = {
      timestamp: new Date(),
      errorId: result.errorId,
      success: result.success,
      fixApplied: result.fixApplied,
      testsRun: result.testsRun,
      testsPassed: result.testsPassed,
      deployed: result.deployed,
      duration: result.duration,
      rollbackAvailable: result.rollbackAvailable,
      logs: result.logs
    };

    // Write to audit log
    const auditPath = path.join(this.logDir, this.auditFile);
    const line = JSON.stringify(entry) + '\n';
    
    try {
      await fs.appendFile(auditPath, line, 'utf-8');
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }

    // Also log summary
    if (result.success) {
      this.info(`Remediation successful: ${result.errorId}`, {
        fixApplied: result.fixApplied,
        deployed: result.deployed,
        duration: result.duration
      });
    } else {
      this.error(`Remediation failed: ${result.errorId}`, {
        duration: result.duration
      });
    }
  }

  /**
   * Flush log buffer to file
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const entries = [...this.buffer];
    this.buffer = [];

    const logPath = path.join(this.logDir, this.logFile);
    const lines = entries.map(e => JSON.stringify(e) + '\n').join('');

    try {
      await fs.appendFile(logPath, lines, 'utf-8');
    } catch (error) {
      console.error('Failed to write log file:', error);
      // Put entries back in buffer
      this.buffer = [...entries, ...this.buffer];
    }
  }

  /**
   * Get color for log level
   */
  private getColor(level: LogEntry['level']): string {
    switch (level) {
      case 'error': return '\x1b[31m'; // Red
      case 'warn': return '\x1b[33m'; // Yellow
      case 'info': return '\x1b[32m'; // Green
      case 'debug': return '\x1b[36m'; // Cyan
      default: return '\x1b[0m'; // Reset
    }
  }

  /**
   * Get emoji for log level
   */
  private getEmoji(level: LogEntry['level']): string {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🐛';
      default: return '📝';
    }
  }

  /**
   * Read recent logs
   */
  async getRecentLogs(limit: number = 100): Promise<LogEntry[]> {
    const logPath = path.join(this.logDir, this.logFile);
    
    try {
      const content = await fs.readFile(logPath, 'utf-8');
      const lines = content.trim().split('\n');
      const entries = lines
        .slice(-limit)
        .map(line => JSON.parse(line) as LogEntry);
      
      return entries;
    } catch {
      return [];
    }
  }

  /**
   * Read audit logs
   */
  async getAuditLogs(limit: number = 50): Promise<any[]> {
    const auditPath = path.join(this.logDir, this.auditFile);
    
    try {
      const content = await fs.readFile(auditPath, 'utf-8');
      const lines = content.trim().split('\n');
      const entries = lines
        .slice(-limit)
        .map(line => JSON.parse(line));
      
      return entries;
    } catch {
      return [];
    }
  }

  /**
   * Generate daily report
   */
  async generateDailyReport(): Promise<{
    date: string;
    totalRemediations: number;
    successful: number;
    failed: number;
    averageDuration: number;
    topFixes: string[];
  }> {
    const auditLogs = await this.getAuditLogs(1000);
    const today = new Date().toISOString().split('T')[0];
    
    const todaysLogs = auditLogs.filter(log => {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0];
      return logDate === today;
    });

    const successful = todaysLogs.filter(l => l.success).length;
    const failed = todaysLogs.filter(l => !l.success).length;
    
    const durations = todaysLogs.map(l => l.duration || 0);
    const averageDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // Count fix types
    const fixCounts: Record<string, number> = {};
    for (const log of todaysLogs) {
      if (log.fixApplied) {
        fixCounts[log.fixApplied] = (fixCounts[log.fixApplied] || 0) + 1;
      }
    }

    const topFixes = Object.entries(fixCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([fix]) => fix);

    return {
      date: today,
      totalRemediations: todaysLogs.length,
      successful,
      failed,
      averageDuration: Math.round(averageDuration),
      topFixes
    };
  }

  /**
   * Cleanup
   */
  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }
}
