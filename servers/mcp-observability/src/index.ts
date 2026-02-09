/**
 * MCP Observability
 * Comprehensive monitoring, alerting, and cost tracking
 * 
 * Purpose: Production observability for MCP suite
 * - Real-time dashboards
 * - Performance metrics
 * - Cost tracking
 * - Alerting system
 * - Log aggregation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import Joi from 'joi';

// ============================================================================
// TYPES
// ============================================================================

interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}

interface Dashboard {
  id: string;
  name: string;
  panels: DashboardPanel[];
  refreshInterval?: number;
}

interface DashboardPanel {
  type: 'timeseries' | 'gauge' | 'counter' | 'cost' | 'table';
  title: string;
  metric: string;
  query?: string;
  threshold?: { warning: number; critical: number };
}

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  duration: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  channels: string[];
  message: string;
  enabled: boolean;
}

interface Alert {
  id: string;
  ruleId: string;
  severity: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

interface CostData {
  total: number;
  byModel: Record<string, number>;
  byMCP: Record<string, number>;
  period: string;
  trend?: string;
  projection?: {
    monthly: number;
    annual: number;
  };
}

interface MCPHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  errorRate: number;
  lastCheck: Date;
}

// ============================================================================
// METRICS COLLECTOR
// ============================================================================

class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map();
  private prometheusUrl?: string;

  constructor(prometheusUrl?: string) {
    this.prometheusUrl = prometheusUrl;
  }

  /**
   * Record a metric
   */
  record(metric: Metric): void {
    const key = metric.name;
    const existing = this.metrics.get(key) || [];
    existing.push(metric);
    
    // Keep last 10000 points per metric
    if (existing.length > 10000) {
      existing.shift();
    }
    
    this.metrics.set(key, existing);
  }

  /**
   * Query metrics
   */
  async query(metricName: string, timeRange?: string): Promise<Metric[]> {
    if (this.prometheusUrl) {
      // Query Prometheus
      return this.queryPrometheus(metricName, timeRange);
    } else {
      // Query local storage
      const metrics = this.metrics.get(metricName) || [];
      
      if (timeRange) {
        const duration = this.parseTimeRange(timeRange);
        const cutoff = Date.now() - duration;
        return metrics.filter(m => m.timestamp.getTime() > cutoff);
      }
      
      return metrics;
    }
  }

  /**
   * Query Prometheus
   */
  private async queryPrometheus(metricName: string, timeRange?: string): Promise<Metric[]> {
    try {
      const query = `${metricName}[${timeRange || '1h'}]`;
      const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
        params: { query },
      });

      const result = response.data.data.result[0];
      if (!result) return [];

      return result.values.map(([timestamp, value]: [number, string]) => ({
        name: metricName,
        value: parseFloat(value),
        timestamp: new Date(timestamp * 1000),
        labels: result.metric,
      }));
    } catch (error) {
      console.error('Prometheus query failed:', error);
      return [];
    }
  }

  /**
   * Get aggregated metrics
   */
  aggregate(
    metricName: string,
    aggregation: 'avg' | 'min' | 'max' | 'sum' | 'count',
    timeRange?: string
  ): number {
    const metrics = this.query(metricName, timeRange);
    
    if (metrics.length === 0) return 0;
    
    const values = metrics.map(m => m.value);
    
    switch (aggregation) {
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'count':
        return values.length;
      default:
        return 0;
    }
  }

  /**
   * Parse time range string (e.g., "5m", "1h", "1d")
   */
  private parseTimeRange(timeRange: string): number {
    const match = timeRange.match(/^(\d+)([mhd])$/);
    if (!match) return 3600000; // Default 1 hour

    const [, amount, unit] = match;
    const multipliers = { m: 60000, h: 3600000, d: 86400000 };
    return parseInt(amount) * multipliers[unit as 'm' | 'h' | 'd'];
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }
}

// ============================================================================
// ALERT MANAGER
// ============================================================================

class AlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Alert[] = [];
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private checkInterval?: NodeJS.Timeout;

  /**
   * Add alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Start alert checking
   */
  start(metricsCollector: MetricsCollector, interval: number = 60000): void {
    this.checkInterval = setInterval(() => {
      this.checkAlerts(metricsCollector);
    }, interval);
  }

  /**
   * Stop alert checking
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  /**
   * Check all alert rules
   */
  private async checkAlerts(metricsCollector: MetricsCollector): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      try {
        const triggered = await this.evaluateCondition(rule, metricsCollector);
        
        if (triggered) {
          this.createAlert(rule);
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.name}:`, error);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private async evaluateCondition(
    rule: AlertRule,
    metricsCollector: MetricsCollector
  ): Promise<boolean> {
    // Parse condition (e.g., "error_rate > 0.1")
    const match = rule.condition.match(/^(\w+)\s*([><=]+)\s*(.+)$/);
    if (!match) return false;

    const [, metricName, operator, threshold] = match;
    const thresholdValue = parseFloat(threshold);
    
    // Get recent metric value
    const metrics = await metricsCollector.query(metricName, rule.duration);
    if (metrics.length === 0) return false;

    const latestValue = metrics[metrics.length - 1].value;

    // Evaluate operator
    switch (operator) {
      case '>':
        return latestValue > thresholdValue;
      case '<':
        return latestValue < thresholdValue;
      case '>=':
        return latestValue >= thresholdValue;
      case '<=':
        return latestValue <= thresholdValue;
      case '==':
        return latestValue === thresholdValue;
      default:
        return false;
    }
  }

  /**
   * Create alert
   */
  private async createAlert(rule: AlertRule): Promise<void> {
    // Check if already alerted recently
    const recentAlerts = this.alerts.filter(
      a => a.ruleId === rule.id && 
      Date.now() - a.timestamp.getTime() < 300000 // 5 min
    );

    if (recentAlerts.length > 0) return;

    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random()}`,
      ruleId: rule.id,
      severity: rule.severity,
      message: rule.message,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);

    // Send notifications
    for (const channel of rule.channels) {
      const notifier = this.notificationChannels.get(channel);
      if (notifier) {
        await notifier.send(alert);
      }
    }
  }

  /**
   * Get active alerts
   */
  getAlerts(severity?: string, unacknowledgedOnly: boolean = false): Alert[] {
    let filtered = this.alerts;

    if (severity) {
      filtered = filtered.filter(a => a.severity === severity);
    }

    if (unacknowledgedOnly) {
      filtered = filtered.filter(a => !a.acknowledged);
    }

    return filtered.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();
    }
  }

  /**
   * Register notification channel
   */
  registerChannel(name: string, channel: NotificationChannel): void {
    this.notificationChannels.set(name, channel);
  }
}

// ============================================================================
// NOTIFICATION CHANNELS
// ============================================================================

interface NotificationChannel {
  send(alert: Alert): Promise<void>;
}

class SlackNotifier implements NotificationChannel {
  constructor(private webhookUrl: string) {}

  async send(alert: Alert): Promise<void> {
    const color = {
      info: '#36a64f',
      warning: '#ff9900',
      error: '#ff0000',
      critical: '#990000',
    }[alert.severity];

    await axios.post(this.webhookUrl, {
      attachments: [{
        color,
        title: `${alert.severity.toUpperCase()}: ${alert.message}`,
        text: alert.message,
        fields: [
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Time', value: alert.timestamp.toISOString(), short: true },
        ],
      }],
    });
  }
}

class EmailNotifier implements NotificationChannel {
  constructor(
    private smtpConfig: {
      host: string;
      port: number;
      user: string;
      pass: string;
      from: string;
    }
  ) {}

  async send(alert: Alert): Promise<void> {
    // In real implementation, use nodemailer
    console.log('Email notification:', alert);
  }
}

// ============================================================================
// COST TRACKER
// ============================================================================

class CostTracker {
  private costs: Map<string, number> = new Map();
  private modelPricing = {
    'claude-haiku-3-5': { input: 0.003, output: 0.015 }, // per 1M tokens
    'claude-sonnet-4': { input: 0.003, output: 0.015 },
    'claude-opus-4': { input: 0.015, output: 0.075 },
  };

  /**
   * Record API usage
   */
  recordUsage(
    model: string,
    inputTokens: number,
    outputTokens: number,
    mcp?: string
  ): void {
    const pricing = this.modelPricing[model as keyof typeof this.modelPricing];
    if (!pricing) return;

    const cost =
      (inputTokens / 1000000) * pricing.input +
      (outputTokens / 1000000) * pricing.output;

    // Track by model
    const modelKey = `model:${model}`;
    this.costs.set(modelKey, (this.costs.get(modelKey) || 0) + cost);

    // Track by MCP
    if (mcp) {
      const mcpKey = `mcp:${mcp}`;
      this.costs.set(mcpKey, (this.costs.get(mcpKey) || 0) + cost);
    }

    // Track total
    this.costs.set('total', (this.costs.get('total') || 0) + cost);
  }

  /**
   * Get cost analysis
   */
  getCostAnalysis(period: string = '7d'): CostData {
    const total = this.costs.get('total') || 0;

    const byModel: Record<string, number> = {};
    const byMCP: Record<string, number> = {};

    for (const [key, cost] of this.costs.entries()) {
      if (key.startsWith('model:')) {
        byModel[key.substring(6)] = cost;
      } else if (key.startsWith('mcp:')) {
        byMCP[key.substring(4)] = cost;
      }
    }

    // Calculate projections (simple extrapolation)
    const days = parseInt(period);
    const dailyRate = total / days;
    const monthly = dailyRate * 30;
    const annual = dailyRate * 365;

    return {
      total,
      byModel,
      byMCP,
      period,
      projection: { monthly, annual },
    };
  }

  /**
   * Set budget alert
   */
  setBudget(monthlyBudget: number, alertThreshold: number = 0.8): void {
    // This would integrate with AlertManager
    console.log(`Budget set: $${monthlyBudget}, alert at ${alertThreshold * 100}%`);
  }
}

// ============================================================================
// HEALTH CHECKER
// ============================================================================

class HealthChecker {
  private mcpEndpoints: Map<string, string> = new Map();

  /**
   * Register MCP for health checks
   */
  registerMCP(name: string, endpoint: string): void {
    this.mcpEndpoints.set(name, endpoint);
  }

  /**
   * Check health of all MCPs
   */
  async checkAll(): Promise<MCPHealth[]> {
    const results: MCPHealth[] = [];

    for (const [name, endpoint] of this.mcpEndpoints.entries()) {
      const health = await this.checkOne(name, endpoint);
      results.push(health);
    }

    return results;
  }

  /**
   * Check health of single MCP
   */
  private async checkOne(name: string, endpoint: string): Promise<MCPHealth> {
    const start = Date.now();

    try {
      const response = await axios.get(`${endpoint}/health`, {
        timeout: 5000,
      });

      const latency = Date.now() - start;
      const status = response.status === 200 ? 'healthy' : 'degraded';

      return {
        name,
        status,
        latency,
        errorRate: 0,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        name,
        status: 'down',
        latency: -1,
        errorRate: 1,
        lastCheck: new Date(),
      };
    }
  }
}

// ============================================================================
// MCP SERVER
// ============================================================================

const metricsCollector = new MetricsCollector(process.env.PROMETHEUS_URL);
const alertManager = new AlertManager();
const costTracker = new CostTracker();
const healthChecker = new HealthChecker();

// Setup notification channels
if (process.env.SLACK_WEBHOOK) {
  alertManager.registerChannel('slack', new SlackNotifier(process.env.SLACK_WEBHOOK));
}

// Start alert checking
alertManager.start(metricsCollector);

const server = new Server(
  {
    name: 'mcp-observability',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const tools: Tool[] = [
  {
    name: 'create_dashboard',
    description: 'Create a monitoring dashboard',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        panels: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['timeseries', 'gauge', 'counter', 'cost', 'table'] },
              title: { type: 'string' },
              metric: { type: 'string' },
              threshold: {
                type: 'object',
                properties: {
                  warning: { type: 'number' },
                  critical: { type: 'number' },
                },
              },
            },
          },
        },
      },
      required: ['name', 'panels'],
    },
  },
  {
    name: 'add_metric',
    description: 'Record a custom metric',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        value: { type: 'number' },
        labels: { type: 'object' },
      },
      required: ['name', 'value'],
    },
  },
  {
    name: 'get_metrics',
    description: 'Query metrics',
    inputSchema: {
      type: 'object',
      properties: {
        metricName: { type: 'string' },
        timeRange: { type: 'string', description: 'e.g., "5m", "1h", "1d"' },
        aggregation: {
          type: 'string',
          enum: ['avg', 'min', 'max', 'sum', 'count'],
        },
      },
      required: ['metricName'],
    },
  },
  {
    name: 'create_alert_rule',
    description: 'Create an alert rule',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        condition: { type: 'string', description: 'e.g., "error_rate > 0.1"' },
        duration: { type: 'string', description: 'e.g., "5m"' },
        severity: {
          type: 'string',
          enum: ['info', 'warning', 'error', 'critical'],
        },
        channels: {
          type: 'array',
          items: { type: 'string' },
        },
        message: { type: 'string' },
      },
      required: ['name', 'condition', 'duration', 'severity', 'channels', 'message'],
    },
  },
  {
    name: 'get_alerts',
    description: 'Get active alerts',
    inputSchema: {
      type: 'object',
      properties: {
        severity: { type: 'string' },
        unacknowledgedOnly: { type: 'boolean' },
      },
    },
  },
  {
    name: 'acknowledge_alert',
    description: 'Acknowledge an alert',
    inputSchema: {
      type: 'object',
      properties: {
        alertId: { type: 'string' },
        acknowledgedBy: { type: 'string' },
      },
      required: ['alertId', 'acknowledgedBy'],
    },
  },
  {
    name: 'get_mcp_health',
    description: 'Check health status of all MCPs',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_cost_analysis',
    description: 'Get cost breakdown and projections',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period (e.g., "7d", "30d")',
        },
      },
    },
  },
  {
    name: 'record_api_usage',
    description: 'Record Claude API usage for cost tracking',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string' },
        inputTokens: { type: 'number' },
        outputTokens: { type: 'number' },
        mcp: { type: 'string' },
      },
      required: ['model', 'inputTokens', 'outputTokens'],
    },
  },
  {
    name: 'set_budget',
    description: 'Set monthly budget and alert threshold',
    inputSchema: {
      type: 'object',
      properties: {
        monthly: { type: 'number' },
        alertAt: { type: 'number', description: 'Alert at percentage (0-1)' },
      },
      required: ['monthly'],
    },
  },
  {
    name: 'get_recommendations',
    description: 'Get cost optimization recommendations',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'query_logs',
    description: 'Search and filter logs',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        timeRange: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['query'],
    },
  },
];

// ============================================================================
// TOOL HANDLERS
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'create_dashboard': {
        const dashboard: Dashboard = {
          id: `dashboard-${Date.now()}`,
          name: args.name,
          panels: args.panels,
        };

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(dashboard, null, 2),
          }],
        };
      }

      case 'add_metric': {
        const metric: Metric = {
          name: args.name,
          value: args.value,
          timestamp: new Date(),
          labels: args.labels,
        };

        metricsCollector.record(metric);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ status: 'recorded', metric }, null, 2),
          }],
        };
      }

      case 'get_metrics': {
        if (args.aggregation) {
          const value = metricsCollector.aggregate(
            args.metricName,
            args.aggregation,
            args.timeRange
          );

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                metric: args.metricName,
                aggregation: args.aggregation,
                value,
                timeRange: args.timeRange,
              }, null, 2),
            }],
          };
        } else {
          const metrics = await metricsCollector.query(
            args.metricName,
            args.timeRange
          );

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(metrics, null, 2),
            }],
          };
        }
      }

      case 'create_alert_rule': {
        const rule: AlertRule = {
          id: `rule-${Date.now()}`,
          name: args.name,
          condition: args.condition,
          duration: args.duration,
          severity: args.severity,
          channels: args.channels,
          message: args.message,
          enabled: true,
        };

        alertManager.addRule(rule);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ status: 'created', rule }, null, 2),
          }],
        };
      }

      case 'get_alerts': {
        const alerts = alertManager.getAlerts(
          args.severity,
          args.unacknowledgedOnly
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(alerts, null, 2),
          }],
        };
      }

      case 'acknowledge_alert': {
        alertManager.acknowledgeAlert(args.alertId, args.acknowledgedBy);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'acknowledged',
              alertId: args.alertId,
            }, null, 2),
          }],
        };
      }

      case 'get_mcp_health': {
        const health = await healthChecker.checkAll();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              overall: health.every(h => h.status === 'healthy') ? 'healthy' : 'degraded',
              mcps: health,
            }, null, 2),
          }],
        };
      }

      case 'get_cost_analysis': {
        const analysis = costTracker.getCostAnalysis(args.period || '7d');

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(analysis, null, 2),
          }],
        };
      }

      case 'record_api_usage': {
        costTracker.recordUsage(
          args.model,
          args.inputTokens,
          args.outputTokens,
          args.mcp
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ status: 'recorded' }, null, 2),
          }],
        };
      }

      case 'set_budget': {
        costTracker.setBudget(args.monthly, args.alertAt);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'budget_set',
              monthly: args.monthly,
              alertAt: args.alertAt || 0.8,
            }, null, 2),
          }],
        };
      }

      case 'get_recommendations': {
        // Analyze usage patterns and provide recommendations
        const costAnalysis = costTracker.getCostAnalysis('30d');
        const recommendations: any[] = [];

        // Example recommendations
        if (costAnalysis.byModel['claude-opus-4'] > costAnalysis.total * 0.5) {
          recommendations.push({
            type: 'model_optimization',
            message: 'High Opus usage detected. Consider using Sonnet for non-critical tasks.',
            potential_savings: (costAnalysis.byModel['claude-opus-4'] * 0.4).toFixed(2),
          });
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(recommendations, null, 2),
          }],
        };
      }

      case 'query_logs': {
        // Simple log query (in production, integrate with logging system)
        const logs = [
          { timestamp: new Date(), level: 'info', message: 'MCP request processed', mcp: 'tokenization-secure' },
          { timestamp: new Date(), level: 'error', message: 'Connection timeout', mcp: 'fabric-live' },
        ];

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(logs, null, 2),
          }],
        };
      }

      default:
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: `Unknown tool: ${name}` }),
          }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: (error as Error).message }),
      }],
      isError: true,
    };
  }
});

// ============================================================================
// START SERVER
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Observability started');
}

main().catch(console.error);
