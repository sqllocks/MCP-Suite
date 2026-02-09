import type { Logger } from '@mcp-suite/shared';
import type { WorkspaceStructure, WorkspaceItem } from '../parsers/workspace-parser.js';
import type { WorkspaceAnalysis, Finding, Recommendation, Metrics } from '../config.js';

/**
 * Workspace analyzer
 */
export class WorkspaceAnalyzer {
  constructor(private logger?: Logger) {}

  /**
   * Analyze workspace for issues and best practices
   */
  async analyzeWorkspace(
    workspace: WorkspaceStructure,
    checks: string[] = ['performance', 'security', 'best-practices']
  ): Promise<WorkspaceAnalysis> {
    this.logger?.info({ workspace: workspace.name, checks }, 'Analyzing workspace');

    const findings: Finding[] = [];
    const recommendations: Recommendation[] = [];

    // Run requested checks
    if (checks.includes('performance')) {
      findings.push(...this.checkPerformance(workspace));
    }

    if (checks.includes('security')) {
      findings.push(...this.checkSecurity(workspace));
    }

    if (checks.includes('best-practices')) {
      findings.push(...this.checkBestPractices(workspace));
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(workspace);

    // Generate recommendations based on findings
    recommendations.push(...this.generateRecommendations(findings, workspace));

    // Count issues by severity
    const issueCounts = {
      critical: findings.filter((f) => f.severity === 'critical').length,
      high: findings.filter((f) => f.severity === 'high').length,
      medium: findings.filter((f) => f.severity === 'medium').length,
      low: findings.filter((f) => f.severity === 'low').length,
    };

    // Count items by type
    const itemCounts = {
      datasets: workspace.items.filter((i) => i.type === 'dataset').length,
      reports: workspace.items.filter((i) => i.type === 'report').length,
      notebooks: workspace.items.filter((i) => i.type === 'notebook').length,
      pipelines: workspace.items.filter((i) => i.type === 'pipeline').length,
      dataflows: workspace.items.filter((i) => i.type === 'dataflow').length,
    };

    return {
      summary: {
        ...itemCounts,
        issues: issueCounts,
      },
      findings,
      recommendations,
      metrics,
    };
  }

  /**
   * Check for performance issues
   */
  private checkPerformance(workspace: WorkspaceStructure): Finding[] {
    const findings: Finding[] = [];

    // Check for large files
    for (const item of workspace.items) {
      if (item.size > 100 * 1024 * 1024) { // > 100MB
        findings.push({
          id: `perf-large-${item.id}`,
          category: 'performance',
          severity: 'medium',
          title: 'Large file detected',
          description: `${item.name} is ${(item.size / (1024 * 1024)).toFixed(2)}MB`,
          location: item.path,
          recommendation: 'Consider splitting into smaller components or using data compression',
          impact: 'May cause slow load times and increased memory usage',
          effort: 'medium',
        });
      }
    }

    // Check for excessive number of items
    if (workspace.items.length > 50) {
      findings.push({
        id: 'perf-item-count',
        category: 'performance',
        severity: 'low',
        title: 'High number of workspace items',
        description: `Workspace contains ${workspace.items.length} items`,
        location: workspace.path,
        recommendation: 'Consider organizing items into multiple workspaces or using folders',
        impact: 'May impact workspace navigation and load times',
        effort: 'low',
      });
    }

    return findings;
  }

  /**
   * Check for security issues
   */
  private checkSecurity(workspace: WorkspaceStructure): Finding[] {
    const findings: Finding[] = [];

    // Check for potential security issues
    findings.push({
      id: 'sec-review',
      category: 'security',
      severity: 'medium',
      title: 'Security review recommended',
      description: 'Manual security review of workspace permissions and data access',
      location: workspace.path,
      recommendation: 'Review workspace permissions, RLS policies, and sensitivity labels',
      impact: 'Potential unauthorized data access',
      effort: 'medium',
    });

    return findings;
  }

  /**
   * Check for best practices violations
   */
  private checkBestPractices(workspace: WorkspaceStructure): Finding[] {
    const findings: Finding[] = [];

    // Check naming conventions
    const badNames = workspace.items.filter((item) => {
      const name = item.name;
      // Check for spaces, special characters, etc.
      return /[^a-zA-Z0-9\-_]/.test(name) || name.length > 50;
    });

    if (badNames.length > 0) {
      findings.push({
        id: 'bp-naming',
        category: 'best-practices',
        severity: 'low',
        title: 'Non-standard naming conventions',
        description: `${badNames.length} items use non-standard names`,
        location: workspace.path,
        recommendation: 'Use consistent naming: PascalCase or snake_case, avoid spaces and special characters',
        impact: 'Reduced code readability and maintainability',
        effort: 'low',
      });
    }

    // Check for missing descriptions
    const noDescription = workspace.items.filter(
      (item) => !item.metadata.description
    );

    if (noDescription.length > workspace.items.length * 0.5) {
      findings.push({
        id: 'bp-documentation',
        category: 'best-practices',
        severity: 'low',
        title: 'Missing documentation',
        description: `${noDescription.length} items lack descriptions`,
        location: workspace.path,
        recommendation: 'Add descriptions to all workspace items for better discoverability',
        impact: 'Reduced team collaboration and knowledge sharing',
        effort: 'low',
      });
    }

    return findings;
  }

  /**
   * Calculate workspace metrics
   */
  private calculateMetrics(workspace: WorkspaceStructure): Metrics {
    const datasets = workspace.items.filter((i) => i.type === 'dataset');
    const largeTables = workspace.items.filter((i) => i.size > 50 * 1024 * 1024);

    return {
      complexity: {
        avg_dax_complexity: 0, // Would require parsing DAX
        max_dax_complexity: 0,
        total_measures: 0, // Would require parsing
        total_columns: 0,
      },
      performance: {
        large_tables: largeTables.length,
        missing_indexes: 0, // Would require schema analysis
        slow_measures: 0,
      },
      security: {
        rls_enabled: false, // Would require parsing security config
        sensitivity_labels: 0,
        shared_workspaces: 0,
      },
    };
  }

  /**
   * Generate recommendations based on findings
   */
  private generateRecommendations(
    findings: Finding[],
    workspace: WorkspaceStructure
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Group findings by category
    const criticalFindings = findings.filter((f) => f.severity === 'critical');
    const performanceFindings = findings.filter((f) => f.category === 'performance');
    const securityFindings = findings.filter((f) => f.category === 'security');

    // Generate high-priority recommendations
    if (criticalFindings.length > 0) {
      recommendations.push({
        id: 'rec-critical',
        title: 'Address Critical Issues',
        description: `${criticalFindings.length} critical issues require immediate attention`,
        priority: 'high',
        effort: 'high',
        impact: 'high',
        category: 'critical',
      });
    }

    if (performanceFindings.length > 3) {
      recommendations.push({
        id: 'rec-performance',
        title: 'Performance Optimization',
        description: 'Implement performance best practices to improve workspace responsiveness',
        priority: 'high',
        effort: 'medium',
        impact: 'high',
        category: 'performance',
      });
    }

    if (securityFindings.length > 0) {
      recommendations.push({
        id: 'rec-security',
        title: 'Security Hardening',
        description: 'Review and strengthen security configurations',
        priority: 'high',
        effort: 'medium',
        impact: 'high',
        category: 'security',
      });
    }

    // Add general recommendations
    if (workspace.items.length > 30) {
      recommendations.push({
        id: 'rec-organization',
        title: 'Workspace Organization',
        description: 'Improve workspace organization with folders and naming conventions',
        priority: 'medium',
        effort: 'low',
        impact: 'medium',
        category: 'organization',
      });
    }

    return recommendations;
  }
}
