// File: servers/mcp-impact-analysis/src/index.ts
// Impact analysis with dependency graphing and blast radius calculation

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getProfileManager } from '../../../shared/profile-manager/profile-manager.js';
import { ProfileAuditLogger } from '../../../shared/audit/profile-audit-logger.js';
import { getModelRecommendation } from '../../../shared/models/model-config.js';

interface Dependency {
  name: string;
  type: 'notebook' | 'pipeline' | 'warehouse' | 'lakehouse' | 'semantic_model';
  relationship: 'uses' | 'usedBy' | 'triggers' | 'triggeredBy';
}

class MCPImpactAnalysisServer {
  private server: Server;
  private profileManager: any;
  private audit: ProfileAuditLogger;
  
  constructor() {
    this.profileManager = getProfileManager();
    this.audit = new ProfileAuditLogger(this.profileManager);
    
    this.server = new Server({
      name: 'mcp-impact-analysis',
      version: '2.0.0'
    }, {
      capabilities: { tools: {} }
    });
    
    this.setupTools();
    this.setupHandlers();
    
    console.log('📊 MCP Impact Analysis Server initialized');
    console.log(`   Profile: ${this.profileManager.getActiveProfile()}`);
    
    this.audit.log({
      action: 'server_started',
      mcpServer: 'mcp-impact-analysis',
      success: true
    });
  }
  
  private setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_impact',
          description: 'Analyze impact of changes to an artifact',
          inputSchema: {
            type: 'object',
            properties: {
              artifactName: { type: 'string', description: 'Name of artifact' },
              changeType: { type: 'string', enum: ['modify', 'delete', 'rename'], description: 'Type of change' }
            },
            required: ['artifactName']
          }
        },
        {
          name: 'get_dependencies',
          description: 'Get all dependencies for an artifact',
          inputSchema: {
            type: 'object',
            properties: {
              artifactName: { type: 'string' },
              depth: { type: 'number', description: 'Depth of dependency tree (default: 3)' }
            },
            required: ['artifactName']
          }
        },
        {
          name: 'calculate_blast_radius',
          description: 'Calculate blast radius of a failure',
          inputSchema: {
            type: 'object',
            properties: {
              artifactName: { type: 'string' },
              failureType: { type: 'string', enum: ['error', 'timeout', 'data_quality'], description: 'Type of failure' }
            },
            required: ['artifactName']
          }
        },
        {
          name: 'get_model_recommendations',
          description: 'Get recommended models for impact analysis',
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
          case 'analyze_impact':
            result = await this.handleAnalyzeImpact(args);
            break;
          case 'get_dependencies':
            result = await this.handleGetDependencies(args);
            break;
          case 'calculate_blast_radius':
            result = await this.handleCalculateBlastRadius(args);
            break;
          case 'get_model_recommendations':
            result = await this.handleGetModelRecommendations();
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        const duration = `${Date.now() - startTime}ms`;
        await this.audit.log({
          action: `impact_analysis_${name}`,
          details: { artifact: args.artifactName },
          mcpServer: 'mcp-impact-analysis',
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
  
  private async handleAnalyzeImpact(args: any) {
    const { artifactName, changeType = 'modify' } = args;
    
    // Mock dependency discovery - in production, would scan actual code/metadata
    const dependencies = this.mockGetDependencies(artifactName);
    const severity = dependencies.usedBy.length > 5 ? 'HIGH' : dependencies.usedBy.length > 2 ? 'MEDIUM' : 'LOW';
    
    return {
      content: [{
        type: 'text',
        text: `📊 Impact Analysis

Profile: ${this.profileManager.getActiveProfile()}
Artifact: ${artifactName}
Change Type: ${changeType}
Impact Severity: ${severity}

Dependencies Found:
• Uses: ${dependencies.uses.length} artifacts
• Used By: ${dependencies.usedBy.length} artifacts
• Triggers: ${dependencies.triggers.length} pipelines
• Triggered By: ${dependencies.triggeredBy.length} schedules

Affected Artifacts:
${dependencies.usedBy.map(d => `  • ${d.name} (${d.type})`).join('\n') || '  None'}

${changeType === 'delete' ? '⚠️  WARNING: Deletion will break downstream dependencies!' : ''}
${changeType === 'rename' ? 'ℹ️  Update all references after rename' : ''}

Recommendations:
1. Test changes in non-production first
2. Notify owners of dependent artifacts
3. ${severity === 'HIGH' ? 'Schedule during maintenance window' : 'Can proceed during business hours'}
4. Monitor downstream artifacts after change`
      }]
    };
  }
  
  private async handleGetDependencies(args: any) {
    const { artifactName, depth = 3 } = args;
    const dependencies = this.mockGetDependencies(artifactName);
    
    return {
      content: [{
        type: 'text',
        text: `🔗 Dependency Graph

Profile: ${this.profileManager.getActiveProfile()}
Artifact: ${artifactName}
Depth: ${depth}

Upstream Dependencies (Uses):
${dependencies.uses.map(d => `  • ${d.name} (${d.type})`).join('\n') || '  None'}

Downstream Dependencies (Used By):
${dependencies.usedBy.map(d => `  • ${d.name} (${d.type})`).join('\n') || '  None'}

Triggers:
${dependencies.triggers.map(d => `  • ${d.name}`).join('\n') || '  None'}

Triggered By:
${dependencies.triggeredBy.map(d => `  • ${d.name}`).join('\n') || '  None'}

Total Dependency Count: ${dependencies.uses.length + dependencies.usedBy.length + dependencies.triggers.length + dependencies.triggeredBy.length}`
      }]
    };
  }
  
  private async handleCalculateBlastRadius(args: any) {
    const { artifactName, failureType = 'error' } = args;
    const dependencies = this.mockGetDependencies(artifactName);
    
    const directImpact = dependencies.usedBy.length;
    const indirectImpact = directImpact * 2; // Simplified - would trace full graph
    const totalImpact = directImpact + indirectImpact;
    
    const radius = totalImpact > 10 ? 'CRITICAL' : totalImpact > 5 ? 'HIGH' : totalImpact > 2 ? 'MEDIUM' : 'LOW';
    
    return {
      content: [{
        type: 'text',
        text: `💥 Blast Radius Analysis

Profile: ${this.profileManager.getActiveProfile()}
Artifact: ${artifactName}
Failure Type: ${failureType}
Blast Radius: ${radius}

Impact Assessment:
• Direct Impact: ${directImpact} artifacts immediately affected
• Indirect Impact: ${indirectImpact} artifacts cascade affected
• Total Impact: ${totalImpact} artifacts potentially affected

Affected Systems:
${dependencies.usedBy.slice(0, 5).map(d => `  • ${d.name} (${d.type}) - DIRECT`).join('\n')}
${dependencies.usedBy.length > 5 ? `  • ... and ${dependencies.usedBy.length - 5} more` : ''}

${radius === 'CRITICAL' ? '🚨 CRITICAL: Failure will cascade across multiple systems!' : ''}
${radius === 'HIGH' ? '⚠️  HIGH: Significant downstream impact expected' : ''}

Mitigation Steps:
1. ${radius === 'CRITICAL' || radius === 'HIGH' ? 'Activate incident response' : 'Standard monitoring'}
2. Notify affected system owners
3. ${failureType === 'data_quality' ? 'Quarantine bad data, prevent propagation' : 'Isolate failed component'}
4. Implement circuit breaker if available`
      }]
    };
  }
  
  private async handleGetModelRecommendations() {
    const rec = getModelRecommendation('impactAnalysis');
    return {
      content: [{
        type: 'text',
        text: `🤖 Model Recommendations for Impact Analysis

PRIMARY: ${rec.primary.name}
  ${rec.primary.reasoning}
  Cost: ${rec.primary.cost} | Speed: ${rec.primary.speed} | Accuracy: ${rec.primary.accuracy}

ALTERNATIVE: ${rec.alternative.name}
  ${rec.alternative.reasoning}
  Cost: ${rec.alternative.cost} | Speed: ${rec.alternative.speed}`
      }]
    };
  }
  
  private mockGetDependencies(artifactName: string): {
    uses: Dependency[];
    usedBy: Dependency[];
    triggers: Dependency[];
    triggeredBy: Dependency[];
  } {
    // Mock dependencies - in production, would scan actual code/metadata
    return {
      uses: [
        { name: 'SourceData', type: 'warehouse', relationship: 'uses' },
        { name: 'ConfigNotebook', type: 'notebook', relationship: 'uses' }
      ],
      usedBy: [
        { name: 'ReportingPipeline', type: 'pipeline', relationship: 'usedBy' },
        { name: 'AnalyticsDashboard', type: 'semantic_model', relationship: 'usedBy' },
        { name: 'DataQualityCheck', type: 'notebook', relationship: 'usedBy' }
      ],
      triggers: [
        { name: 'DailyRefreshPipeline', type: 'pipeline', relationship: 'triggers' }
      ],
      triggeredBy: [
        { name: 'NightlySchedule', type: 'pipeline', relationship: 'triggeredBy' }
      ]
    };
  }
  
  async run() {
    await this.server.connect(new StdioServerTransport());
    console.log('✅ MCP Impact Analysis Server running');
  }
}

async function main() {
  const pm = getProfileManager();
  await pm.loadProfile(await pm.detectActiveProfile());
  await new MCPImpactAnalysisServer().run();
}

main();
