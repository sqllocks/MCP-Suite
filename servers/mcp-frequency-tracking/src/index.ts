// File: servers/mcp-frequency-tracking/src/index.ts
// Error frequency tracking and pattern detection

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getProfileManager } from '../../../shared/profile-manager/profile-manager.js';
import { ProfileAuditLogger } from '../../../shared/audit/profile-audit-logger.js';
import { getModelRecommendation } from '../../../shared/models/model-config.js';
import * as fs from 'fs';
import * as path from 'path';

interface ErrorRecord {
  timestamp: string;
  errorMessage: string;
  artifact: string;
  count: number;
}

class MCPFrequencyTrackingServer {
  private server: Server;
  private profileManager: any;
  private audit: ProfileAuditLogger;
  private trackingPath: string;
  private errorHistory: ErrorRecord[] = [];
  
  constructor() {
    this.profileManager = getProfileManager();
    this.audit = new ProfileAuditLogger(this.profileManager);
    
    const paths = this.profileManager.getPaths();
    this.trackingPath = path.join(paths.profile, 'error-tracking.json');
    
    this.loadHistory();
    
    this.server = new Server({
      name: 'mcp-frequency-tracking',
      version: '2.0.0'
    }, {
      capabilities: { tools: {} }
    });
    
    this.setupTools();
    this.setupHandlers();
    
    console.log('📈 MCP Frequency Tracking Server initialized');
    console.log(`   Profile: ${this.profileManager.getActiveProfile()}`);
    console.log(`   Tracking: ${this.errorHistory.length} error records`);
    
    this.audit.log({
      action: 'server_started',
      mcpServer: 'mcp-frequency-tracking',
      success: true
    });
  }
  
  private setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'track_error',
          description: 'Track an error occurrence',
          inputSchema: {
            type: 'object',
            properties: {
              errorMessage: { type: 'string', description: 'Error message' },
              artifact: { type: 'string', description: 'Artifact where error occurred' }
            },
            required: ['errorMessage']
          }
        },
        {
          name: 'classify_error',
          description: 'Classify error as one-off or recurring',
          inputSchema: {
            type: 'object',
            properties: {
              errorMessage: { type: 'string' },
              lookbackDays: { type: 'number', description: 'Days to look back (default: 30)' }
            },
            required: ['errorMessage']
          }
        },
        {
          name: 'get_frequency_report',
          description: 'Get error frequency report',
          inputSchema: {
            type: 'object',
            properties: {
              period: { type: 'string', enum: ['day', 'week', 'month'], description: 'Reporting period' },
              top: { type: 'number', description: 'Top N errors (default: 10)' }
            }
          }
        },
        {
          name: 'detect_patterns',
          description: 'Detect temporal patterns in errors',
          inputSchema: {
            type: 'object',
            properties: {
              errorMessage: { type: 'string', description: 'Specific error to analyze (optional)' }
            }
          }
        },
        {
          name: 'get_model_recommendations',
          description: 'Get recommended models for frequency tracking',
          inputSchema: { type: 'object', properties: {} }
        }
      ]
    }));
  }
  
  private setupHandlers() {
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const startTime = Date.now();
      
      try {
        let result;
        
        switch (name) {
          case 'track_error':
            result = await this.handleTrackError(args);
            break;
          case 'classify_error':
            result = await this.handleClassifyError(args);
            break;
          case 'get_frequency_report':
            result = await this.handleGetFrequencyReport(args);
            break;
          case 'detect_patterns':
            result = await this.handleDetectPatterns(args);
            break;
          case 'get_model_recommendations':
            result = await this.handleGetModelRecommendations();
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        const duration = `${Date.now() - startTime}ms`;
        await this.audit.log({
          action: `frequency_tracking_${name}`,
          mcpServer: 'mcp-frequency-tracking',
          duration,
          success: true
        });
        
        return result;
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true
        };
      }
    });
  }
  
  private async handleTrackError(args: any) {
    const { errorMessage, artifact = 'unknown' } = args;
    
    const record: ErrorRecord = {
      timestamp: new Date().toISOString(),
      errorMessage,
      artifact,
      count: 1
    };
    
    this.errorHistory.push(record);
    this.saveHistory();
    
    // Check if recurring
    const recent = this.getRecentOccurrences(errorMessage, 30);
    const isRecurring = recent.length >= 3;
    
    return {
      content: [{
        type: 'text',
        text: `📈 Error Tracked

Profile: ${this.profileManager.getActiveProfile()}
Artifact: ${artifact}
Error: ${errorMessage}

History:
• Total occurrences (30 days): ${recent.length}
• Classification: ${isRecurring ? '🔴 RECURRING' : '🟢 ONE-OFF'}
• First seen: ${recent.length > 0 ? recent[0].timestamp : 'Just now'}
• Last seen: ${new Date().toISOString()}

${isRecurring ? '⚠️  This error is recurring! Recommend root cause analysis.' : '✅ First occurrence - monitor for recurrence.'}`
      }]
    };
  }
  
  private async handleClassifyError(args: any) {
    const { errorMessage, lookbackDays = 30 } = args;
    
    const occurrences = this.getRecentOccurrences(errorMessage, lookbackDays);
    
    let classification = 'ONE-OFF';
    let severity = 'LOW';
    let pattern = 'Random occurrence';
    
    if (occurrences.length >= 10) {
      classification = 'CHRONIC';
      severity = 'CRITICAL';
      pattern = 'Persistent issue requiring immediate attention';
    } else if (occurrences.length >= 3) {
      classification = 'RECURRING';
      severity = 'HIGH';
      pattern = this.analyzePattern(occurrences);
    }
    
    return {
      content: [{
        type: 'text',
        text: `🔍 Error Classification

Profile: ${this.profileManager.getActiveProfile()}
Error: ${errorMessage}
Lookback Period: ${lookbackDays} days

Classification: ${classification}
Severity: ${severity}
Occurrences: ${occurrences.length}

Pattern Analysis:
${pattern}

${occurrences.length > 0 ? `Timeline:
${occurrences.slice(0, 5).map(o => `  • ${o.timestamp} (${o.artifact})`).join('\n')}
${occurrences.length > 5 ? `  • ... and ${occurrences.length - 5} more` : ''}` : ''}

Recommendation:
${classification === 'CHRONIC' ? '🚨 Urgent: Stop and fix before proceeding' : ''}
${classification === 'RECURRING' ? '⚠️  Schedule root cause analysis' : ''}
${classification === 'ONE-OFF' ? '✅ Monitor, no immediate action needed' : ''}`
      }]
    };
  }
  
  private async handleGetFrequencyReport(args: any) {
    const { period = 'month', top = 10 } = args;
    
    const cutoff = new Date();
    if (period === 'day') cutoff.setDate(cutoff.getDate() - 1);
    else if (period === 'week') cutoff.setDate(cutoff.getDate() - 7);
    else cutoff.setDate(cutoff.getDate() - 30);
    
    const recentErrors = this.errorHistory.filter(e => 
      new Date(e.timestamp) >= cutoff
    );
    
    // Group by error message
    const grouped = new Map<string, number>();
    recentErrors.forEach(e => {
      const count = grouped.get(e.errorMessage) || 0;
      grouped.set(e.errorMessage, count + 1);
    });
    
    // Sort by frequency
    const sorted = Array.from(grouped.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, top);
    
    return {
      content: [{
        type: 'text',
        text: `📊 Error Frequency Report

Profile: ${this.profileManager.getActiveProfile()}
Period: Last ${period}
Total Errors: ${recentErrors.length}
Unique Errors: ${grouped.size}

Top ${top} Errors:
${sorted.map(([ msg, count], i) => 
  `${i + 1}. (${count}x) ${msg.substring(0, 80)}${msg.length > 80 ? '...' : ''}`
).join('\n')}

Insights:
• Error Rate: ${(recentErrors.length / (period === 'day' ? 1 : period === 'week' ? 7 : 30)).toFixed(1)} errors/day
• Most Common: ${sorted[0] ? `${sorted[0][0].substring(0, 50)}...` : 'None'}
• Trend: ${recentErrors.length > 50 ? '📈 Increasing' : recentErrors.length > 20 ? '➡️  Stable' : '📉 Decreasing'}`
      }]
    };
  }
  
  private async handleDetectPatterns(args: any) {
    const { errorMessage } = args;
    
    const errors = errorMessage 
      ? this.errorHistory.filter(e => e.errorMessage === errorMessage)
      : this.errorHistory;
    
    const pattern = this.detectTemporalPattern(errors);
    
    return {
      content: [{
        type: 'text',
        text: `🔎 Pattern Detection

Profile: ${this.profileManager.getActiveProfile()}
${errorMessage ? `Error: ${errorMessage}` : 'All Errors'}
Sample Size: ${errors.length}

Detected Patterns:
${pattern}

Recommendations:
• If time-based: Schedule preventive maintenance
• If load-based: Consider scaling resources
• If random: Focus on error handling and recovery`
      }]
    };
  }
  
  private async handleGetModelRecommendations() {
    const rec = getModelRecommendation('frequencyTracking');
    return {
      content: [{
        type: 'text',
        text: `🤖 Model Recommendations for Frequency Tracking

PRIMARY: ${rec.primary.name}
  ${rec.primary.reasoning}
  Cost: ${rec.primary.cost} | Speed: ${rec.primary.speed} | Accuracy: ${rec.primary.accuracy}

ALTERNATIVE: ${rec.alternative.name}
  ${rec.alternative.reasoning}
  Cost: ${rec.alternative.cost} | Speed: ${rec.alternative.speed}`
      }]
    };
  }
  
  private getRecentOccurrences(errorMessage: string, days: number): ErrorRecord[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return this.errorHistory.filter(e => 
      e.errorMessage === errorMessage && new Date(e.timestamp) >= cutoff
    );
  }
  
  private analyzePattern(occurrences: ErrorRecord[]): string {
    if (occurrences.length < 2) return 'Insufficient data for pattern analysis';
    
    // Check for daily pattern
    const hours = occurrences.map(o => new Date(o.timestamp).getHours());
    const nightShift = hours.filter(h => h >= 0 && h <= 6).length;
    
    if (nightShift / hours.length > 0.7) {
      return 'Occurs during nightly batch processing (12am-6am)';
    }
    
    // Check for weekly pattern
    const days = occurrences.map(o => new Date(o.timestamp).getDay());
    const weekends = days.filter(d => d === 0 || d === 6).length;
    
    if (weekends / days.length > 0.7) {
      return 'Occurs primarily on weekends';
    }
    
    return 'No clear temporal pattern detected';
  }
  
  private detectTemporalPattern(errors: ErrorRecord[]): string {
    if (errors.length < 3) return 'Insufficient data for pattern detection';
    
    const pattern = this.analyzePattern(errors);
    
    const intervals = [];
    for (let i = 1; i < errors.length; i++) {
      const diff = new Date(errors[i].timestamp).getTime() - new Date(errors[i-1].timestamp).getTime();
      intervals.push(diff / (1000 * 60 * 60)); // Convert to hours
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    return `${pattern}
    
Statistical Analysis:
• Average interval: ${avgInterval.toFixed(1)} hours
• Pattern type: ${avgInterval < 2 ? 'Burst' : avgInterval < 24 ? 'Frequent' : 'Periodic'}
• Consistency: ${this.calculateConsistency(intervals)}`;
  }
  
  private calculateConsistency(intervals: number[]): string {
    if (intervals.length < 2) return 'Unknown';
    const variance = this.calculateVariance(intervals);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const cv = Math.sqrt(variance) / mean;
    
    if (cv < 0.3) return 'Highly consistent (scheduled?)';
    if (cv < 0.7) return 'Moderately consistent';
    return 'Inconsistent (sporadic)';
  }
  
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }
  
  private loadHistory() {
    if (fs.existsSync(this.trackingPath)) {
      try {
        const content = fs.readFileSync(this.trackingPath, 'utf8');
        this.errorHistory = JSON.parse(content);
      } catch (error) {
        console.warn('Failed to load error history');
        this.errorHistory = [];
      }
    }
  }
  
  private saveHistory() {
    try {
      const dir = path.dirname(this.trackingPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.trackingPath, JSON.stringify(this.errorHistory, null, 2));
    } catch (error) {
      console.error('Failed to save error history:', error);
    }
  }
  
  async run() {
    await this.server.connect(new StdioServerTransport());
    console.log('✅ MCP Frequency Tracking Server running');
  }
}

async function main() {
  const pm = getProfileManager();
  await pm.loadProfile(await pm.detectActiveProfile());
  await new MCPFrequencyTrackingServer().run();
}

main();
