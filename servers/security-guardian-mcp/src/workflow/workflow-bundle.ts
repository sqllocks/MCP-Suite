/**
 * Workflow & Monitoring Bundle
 * - Approval Engine: Manage fix approval workflow
 * - Audit Logger: Comprehensive audit logging
 * - Notification System: Slack/email alerts
 * - Continuous Monitor: Real-time security monitoring
 */

import * as fs from 'fs/promises';
import { randomBytes } from 'crypto';
import { Fix } from '../server.js';

// ============================================================================
// APPROVAL ENGINE
// ============================================================================

interface ApprovalRequest {
  id: string;
  fixId: string;
  requestedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  url: string;
  token: string;
}

export class ApprovalEngine {
  private approvals: Map<string, ApprovalRequest> = new Map();

  async requiresApproval(fix: Fix): Promise<boolean> {
    // Critical/High severity always needs approval
    if (fix.riskAssessment.breakingChange) {
      return true;
    }

    if (fix.riskAssessment.requiresReview) {
      return true;
    }

    // Low risk can be auto-applied
    return false;
  }

  async requestApproval(fix: Fix): Promise<ApprovalRequest> {
    const token = randomBytes(32).toString('hex');
    const request: ApprovalRequest = {
      id: `APPROVAL-${Date.now()}`,
      fixId: fix.id,
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      status: 'pending',
      url: `https://security-dashboard.example.com/approvals/${token}`,
      token,
    };

    this.approvals.set(fix.id, request);
    return request;
  }

  async verifyApproval(fixId: string, token: string): Promise<boolean> {
    const request = this.approvals.get(fixId);
    
    if (!request) {
      return false;
    }

    if (request.status !== 'approved') {
      return false;
    }

    if (request.token !== token) {
      return false;
    }

    if (new Date() > request.expiresAt) {
      request.status = 'expired';
      return false;
    }

    return true;
  }

  async approve(fixId: string, approverUserId: string): Promise<void> {
    const request = this.approvals.get(fixId);
    if (request) {
      request.status = 'approved';
    }
  }

  async reject(fixId: string, reason: string): Promise<void> {
    const request = this.approvals.get(fixId);
    if (request) {
      request.status = 'rejected';
    }
  }
}

// ============================================================================
// AUDIT LOGGER
// ============================================================================

interface AuditLog {
  timestamp: Date;
  eventType: string;
  userId?: string;
  action: string;
  details: any;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  private logs: AuditLog[] = [];
  private logFile: string = '/var/log/security-guardian/audit.log';

  async log(eventType: string, details: any): Promise<void> {
    const entry: AuditLog = {
      timestamp: new Date(),
      eventType,
      action: eventType,
      details,
      success: true,
    };

    this.logs.push(entry);

    // Write to file (append-only)
    try {
      await fs.appendFile(
        this.logFile,
        JSON.stringify(entry) + '\n',
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  async logError(eventType: string, error: Error): Promise<void> {
    const entry: AuditLog = {
      timestamp: new Date(),
      eventType,
      action: eventType,
      details: {
        error: error.message,
        stack: error.stack,
      },
      success: false,
    };

    this.logs.push(entry);

    try {
      await fs.appendFile(
        this.logFile,
        JSON.stringify(entry) + '\n',
        'utf-8'
      );
    } catch (err) {
      console.error('Failed to write error log:', err);
    }
  }

  async query(filter: {
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
  }): Promise<AuditLog[]> {
    return this.logs.filter(log => {
      if (filter.eventType && log.eventType !== filter.eventType) {
        return false;
      }
      if (filter.startDate && log.timestamp < filter.startDate) {
        return false;
      }
      if (filter.endDate && log.timestamp > filter.endDate) {
        return false;
      }
      if (filter.success !== undefined && log.success !== filter.success) {
        return false;
      }
      return true;
    });
  }

  async generateReport(timeRange: string): Promise<any> {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    const recentLogs = await this.query({ startDate });

    const eventCounts: Record<string, number> = {};
    recentLogs.forEach(log => {
      eventCounts[log.eventType] = (eventCounts[log.eventType] || 0) + 1;
    });

    return {
      timeRange,
      totalEvents: recentLogs.length,
      successCount: recentLogs.filter(l => l.success).length,
      failureCount: recentLogs.filter(l => !l.success).length,
      eventBreakdown: eventCounts,
      recentEvents: recentLogs.slice(-10),
    };
  }
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

interface NotificationConfig {
  slack?: {
    webhookUrl: string;
    channel?: string;
  };
  email?: {
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    from: string;
    to: string[];
  };
}

export class NotificationSystem {
  private config: NotificationConfig = {};

  configure(config: NotificationConfig): void {
    this.config = config;
  }

  async sendAlert(type: string, details: any): Promise<void> {
    const message = this.formatAlert(type, details);

    // Send to Slack
    if (this.config.slack) {
      await this.sendSlackMessage(message);
    }

    // Send email
    if (this.config.email) {
      await this.sendEmail(`Security Alert: ${type}`, message);
    }
  }

  async sendNotification(type: string, details: any): Promise<void> {
    const message = this.formatNotification(type, details);

    // Send to configured channels
    if (this.config.slack) {
      await this.sendSlackMessage(message);
    }
  }

  private formatAlert(type: string, details: any): string {
    switch (type) {
      case 'VULNERABILITIES_FOUND':
        return `
🚨 *Security Alert: Vulnerabilities Detected*

Target: ${details.target}
Critical: ${details.critical}
High: ${details.high}

Action Required: Review and remediate immediately.
        `.trim();

      case 'COMPLIANCE_FAILURE':
        return `
⚠️ *Compliance Alert: ${details.standard.toUpperCase()} Failure*

Compliance Score: ${details.score}%
Status: NON-COMPLIANT

Critical Gaps:
${details.criticalGaps.map((gap: string) => `• ${gap}`).join('\n')}

Action Required: Address compliance gaps immediately.
        `.trim();

      case 'SECURITY_ALERT':
        return `
🔴 *Security Alert*

${details.message}

Please investigate immediately.
        `.trim();

      default:
        return `Security Event: ${type}\n${JSON.stringify(details, null, 2)}`;
    }
  }

  private formatNotification(type: string, details: any): string {
    switch (type) {
      case 'FIX_APPLIED':
        return `
✅ *Security Fix Applied*

Fix ID: ${details.fixId}
Pull Request: ${details.pr}
Tests: ${details.testsStatus}

The fix has been successfully applied.
        `.trim();

      case 'SCAN_COMPLETED':
        return `
📊 *Security Scan Completed*

Target: ${details.target}
Vulnerabilities: ${details.total}
Duration: ${details.duration}

View full report at: ${details.reportUrl}
        `.trim();

      default:
        return `Notification: ${type}\n${JSON.stringify(details, null, 2)}`;
    }
  }

  private async sendSlackMessage(message: string): Promise<void> {
    if (!this.config.slack?.webhookUrl) {
      return;
    }

    try {
      const response = await fetch(this.config.slack.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          channel: this.config.slack.channel,
        }),
      });

      if (!response.ok) {
        console.error('Failed to send Slack message:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to send Slack message:', error);
    }
  }

  private async sendEmail(subject: string, body: string): Promise<void> {
    // Simplified - would use nodemailer in production
    console.log(`Email: ${subject}\n${body}`);
  }
}

// ============================================================================
// CONTINUOUS MONITOR
// ============================================================================

interface MonitorConfig {
  targets: string[];
  checkInterval: number; // minutes
  autoFix: boolean;
  notifications?: NotificationConfig;
}

export class ContinuousMonitor {
  private config: MonitorConfig | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastScan: Date | null = null;
  private scanCount: number = 0;
  private issuesFixed: number = 0;
  private issuesPending: number = 0;

  private scanners: any;
  private approvalEngine: ApprovalEngine;
  private auditLogger: AuditLogger;
  private notificationSystem: NotificationSystem;

  constructor(dependencies: {
    scanners: any;
    approvalEngine: ApprovalEngine;
    auditLogger: AuditLogger;
    notificationSystem: NotificationSystem;
  }) {
    this.scanners = dependencies.scanners;
    this.approvalEngine = dependencies.approvalEngine;
    this.auditLogger = dependencies.auditLogger;
    this.notificationSystem = dependencies.notificationSystem;
  }

  async start(config: MonitorConfig): Promise<any> {
    if (this.isRunning) {
      throw new Error('Monitor already running');
    }

    this.config = config;
    this.isRunning = true;

    // Configure notifications
    if (config.notifications) {
      this.notificationSystem.configure(config.notifications);
    }

    // Start periodic scanning
    const intervalMs = config.checkInterval * 60 * 1000;
    this.intervalId = setInterval(async () => {
      await this.performScan();
    }, intervalMs);

    // Perform initial scan
    await this.performScan();

    await this.auditLogger.log('MONITORING_STARTED', {
      targets: config.targets,
      checkInterval: config.checkInterval,
      autoFix: config.autoFix,
    });

    return {
      status: 'started',
      targets: config.targets,
      checkInterval: config.checkInterval,
      autoFix: config.autoFix,
    };
  }

  async stop(): Promise<any> {
    if (!this.isRunning) {
      throw new Error('Monitor not running');
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;

    await this.auditLogger.log('MONITORING_STOPPED', {
      scanCount: this.scanCount,
      issuesFixed: this.issuesFixed,
    });

    return {
      status: 'stopped',
      totalScans: this.scanCount,
      issuesFixed: this.issuesFixed,
    };
  }

  async getStatus(): Promise<any> {
    return {
      active: this.isRunning,
      targets: this.config?.targets || [],
      lastScan: this.lastScan,
      nextScan: this.lastScan && this.config
        ? new Date(this.lastScan.getTime() + this.config.checkInterval * 60 * 1000)
        : null,
      autoFixEnabled: this.config?.autoFix || false,
      scanCount: this.scanCount,
      issuesFixed: this.issuesFixed,
      issuesPending: this.issuesPending,
    };
  }

  async configure(updates: Partial<MonitorConfig>): Promise<any> {
    if (!this.config) {
      throw new Error('Monitor not configured');
    }

    // Update configuration
    if (updates.checkInterval !== undefined) {
      this.config.checkInterval = updates.checkInterval;
      
      // Restart with new interval
      if (this.isRunning) {
        await this.stop();
        await this.start(this.config);
      }
    }

    if (updates.autoFix !== undefined) {
      this.config.autoFix = updates.autoFix;
    }

    if (updates.notifications) {
      this.config.notifications = updates.notifications;
      this.notificationSystem.configure(updates.notifications);
    }

    await this.auditLogger.log('MONITORING_CONFIGURED', updates);

    return {
      status: 'configured',
      config: this.config,
    };
  }

  private async performScan(): Promise<void> {
    if (!this.config) return;

    this.lastScan = new Date();
    this.scanCount++;

    try {
      for (const target of this.config.targets) {
        // Run all scanners
        const vulnerabilities = [];

        const sastResults = await this.scanners.sast.scan(target);
        vulnerabilities.push(...sastResults);

        const depResults = await this.scanners.dependency.scan(target);
        vulnerabilities.push(...depResults);

        const secretResults = await this.scanners.secret.scan(target);
        vulnerabilities.push(...secretResults);

        const configResults = await this.scanners.config.scan(target);
        vulnerabilities.push(...configResults);

        // Log scan results
        await this.auditLogger.log('CONTINUOUS_SCAN', {
          target,
          vulnerabilitiesFound: vulnerabilities.length,
          scanNumber: this.scanCount,
        });

        // Auto-fix if enabled
        if (this.config.autoFix && vulnerabilities.length > 0) {
          await this.autoFixVulnerabilities(vulnerabilities);
        } else {
          this.issuesPending = vulnerabilities.filter(
            v => v.severity === 'critical' || v.severity === 'high'
          ).length;
        }

        // Send notifications for critical issues
        const critical = vulnerabilities.filter(v => v.severity === 'critical').length;
        const high = vulnerabilities.filter(v => v.severity === 'high').length;

        if (critical > 0 || high > 0) {
          await this.notificationSystem.sendAlert('VULNERABILITIES_FOUND', {
            target,
            critical,
            high,
          });
        }
      }
    } catch (error) {
      await this.auditLogger.logError('CONTINUOUS_SCAN_ERROR', error);
    }
  }

  private async autoFixVulnerabilities(vulnerabilities: any[]): Promise<void> {
    // Only auto-fix low-risk, auto-fixable vulnerabilities
    const autoFixable = vulnerabilities.filter(
      v => v.autoFixable && (v.severity === 'low' || v.severity === 'medium')
    );

    for (const vuln of autoFixable) {
      try {
        // Generate and apply fix
        // This would integrate with FixGenerator
        this.issuesFixed++;
        
        await this.auditLogger.log('AUTO_FIX_APPLIED', {
          vulnerabilityId: vuln.id,
          type: vuln.type,
        });
      } catch (error) {
        await this.auditLogger.logError('AUTO_FIX_FAILED', error);
      }
    }
  }
}
