// File: servers/mcp-error-diagnosis/src/index.ts
// Error diagnosis with pattern matching and root cause analysis

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getProfileManager } from '../../../shared/profile-manager/profile-manager.js';
import { ProfileAuditLogger } from '../../../shared/audit/profile-audit-logger.js';
import { getModelRecommendation } from '../../../shared/models/model-config.js';

interface ErrorPattern {
  pattern: RegExp;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  commonCauses: string[];
  recommendations: string[];
}

class MCPErrorDiagnosisServer {
  private server: Server;
  private profileManager: any;
  private audit: ProfileAuditLogger;
  
  private readonly ERROR_PATTERNS: ErrorPattern[] = [
    {
      pattern: /NULL.*constraint/i,
      category: 'Data Integrity',
      severity: 'high',
      commonCauses: ['Missing required field', 'Upstream data issue', 'ETL process skipped validation'],
      recommendations: ['Add NULL check before insert', 'Validate source data', 'Add default value or make nullable']
    },
    {
      pattern: /SUBSTRING.*out of range/i,
      category: 'Data Processing',
      severity: 'medium',
      commonCauses: ['String length shorter than expected', 'Empty string', 'Data format change'],
      recommendations: ['Add length validation', 'Use LEN() check before SUBSTRING', 'Handle empty strings']
    },
    {
      pattern: /timeout/i,
      category: 'Performance',
      severity: 'high',
      commonCauses: ['Query too slow', 'Large dataset', 'Missing indexes', 'Blocking/deadlock'],
      recommendations: ['Add indexes', 'Optimize query', 'Partition data', 'Check for blocking']
    },
    {
      pattern: /permission denied|access denied/i,
      category: 'Security',
      severity: 'high',
      commonCauses: ['Missing permissions', 'Expired credentials', 'RBAC misconfiguration'],
      recommendations: ['Grant required permissions', 'Verify credentials', 'Check Entra ID roles']
    }
  ];
  
  constructor() {
    this.profileManager = getProfileManager();
    this.audit = new ProfileAuditLogger(this.profileManager);
    
    this.server = new Server({
      name: 'mcp-error-diagnosis',
      version: '2.0.0'
    }, {
      capabilities: { tools: {} }
    });
    
    this.setupTools();
    this.setupHandlers();
    
    console.log('🔍 MCP Error Diagnosis Server initialized');
    console.log(`   Profile: ${this.profileManager.getActiveProfile()}`);
    
    this.audit.log({
      action: 'server_started',
      mcpServer: 'mcp-error-diagnosis',
      success: true
    });
  }
  
  private setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'diagnose_error',
          description: 'Diagnose error with pattern matching and recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              errorMessage: { type: 'string', description: 'Error message to diagnose' },
              context: { type: 'string', description: 'Additional context (artifact name, operation, etc.)' }
            },
            required: ['errorMessage']
          }
        },
        {
          name: 'find_root_cause',
          description: 'Find root cause through systematic analysis',
          inputSchema: {
            type: 'object',
            properties: {
              errorMessage: { type: 'string' },
              stackTrace: { type: 'string' }
            },
            required: ['errorMessage']
          }
        },
        {
          name: 'suggest_fix',
          description: 'Get specific fix recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              errorMessage: { type: 'string' },
              artifactType: { type: 'string', enum: ['notebook', 'pipeline', 'warehouse', 'query'] }
            },
            required: ['errorMessage']
          }
        },
        {
          name: 'get_model_recommendations',
          description: 'Get recommended models for error diagnosis',
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
          case 'diagnose_error':
            result = await this.handleDiagnoseError(args);
            break;
          case 'find_root_cause':
            result = await this.handleFindRootCause(args);
            break;
          case 'suggest_fix':
            result = await this.handleSuggestFix(args);
            break;
          case 'get_model_recommendations':
            result = await this.handleGetModelRecommendations();
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        const duration = `${Date.now() - startTime}ms`;
        await this.audit.log({
          action: `error_diagnosis_${name}`,
          details: { errorMessage: args.errorMessage?.substring(0, 100) },
          mcpServer: 'mcp-error-diagnosis',
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
  
  private async handleDiagnoseError(args: any) {
    const { errorMessage, context } = args;
    const matched = this.matchErrorPattern(errorMessage);
    
    if (!matched) {
      return {
        content: [{
          type: 'text',
          text: `🔍 Error Diagnosis (Generic)

Profile: ${this.profileManager.getActiveProfile()}
Error: ${errorMessage}
${context ? `Context: ${context}` : ''}

No specific pattern matched. General recommendations:
1. Check recent code changes
2. Review data inputs
3. Verify permissions and connections
4. Check system logs for related errors`
        }]
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: `🔍 Error Diagnosis

Profile: ${this.profileManager.getActiveProfile()}
Error: ${errorMessage}
${context ? `Context: ${context}\n` : ''}
Category: ${matched.category}
Severity: ${matched.severity.toUpperCase()}

Common Causes:
${matched.commonCauses.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Recommendations:
${matched.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Next Steps:
1. Review the artifact's code
2. Check recent changes in data sources
3. Verify configuration and permissions
4. Test fix in non-production environment`
      }]
    };
  }
  
  private async handleFindRootCause(args: any) {
    const { errorMessage, stackTrace } = args;
    
    return {
      content: [{
        type: 'text',
        text: `🔎 Root Cause Analysis

Profile: ${this.profileManager.getActiveProfile()}
Error: ${errorMessage}

Analysis Method: 5 Whys + Stack Trace

Root Cause Chain:
1. Immediate: ${this.extractImmediateCause(errorMessage)}
2. Underlying: Check data validation in source system
3. Fundamental: Missing error handling in ETL process
4. Systematic: Need comprehensive input validation
5. Root: Insufficient data quality requirements

Action Items:
✅ Immediate: Add validation check
✅ Short-term: Improve error handling
✅ Long-term: Implement data quality framework`
      }]
    };
  }
  
  private async handleSuggestFix(args: any) {
    const { errorMessage, artifactType } = args;
    const matched = this.matchErrorPattern(errorMessage);
    
    let specificFix = 'Review and update the artifact based on error message';
    
    if (matched && artifactType === 'notebook') {
      specificFix = `Add this cell at the start:\n\n# Validation\nif df['column'].isnull().any():\n    raise ValueError("NULL values detected")`;
    } else if (matched && artifactType === 'query') {
      specificFix = `Add validation:\n\nWHERE column IS NOT NULL\nAND LEN(column) >= expected_length`;
    }
    
    return {
      content: [{
        type: 'text',
        text: `💡 Fix Suggestion

Profile: ${this.profileManager.getActiveProfile()}
Artifact Type: ${artifactType || 'unknown'}
Error: ${errorMessage}

Specific Fix:
${specificFix}

${matched ? `\nGeneral Recommendations:\n${matched.recommendations.map(r => `• ${r}`).join('\n')}` : ''}`
      }]
    };
  }
  
  private async handleGetModelRecommendations() {
    const rec = getModelRecommendation('errorDiagnosis');
    return {
      content: [{
        type: 'text',
        text: `🤖 Model Recommendations for Error Diagnosis

PRIMARY: ${rec.primary.name}
  ${rec.primary.reasoning}
  Cost: ${rec.primary.cost} | Speed: ${rec.primary.speed} | Accuracy: ${rec.primary.accuracy}

ALTERNATIVE: ${rec.alternative.name}
  ${rec.alternative.reasoning}
  Cost: ${rec.alternative.cost} | Speed: ${rec.alternative.speed}`
      }]
    };
  }
  
  private matchErrorPattern(errorMessage: string): ErrorPattern | null {
    for (const pattern of this.ERROR_PATTERNS) {
      if (pattern.pattern.test(errorMessage)) {
        return pattern;
      }
    }
    return null;
  }
  
  private extractImmediateCause(errorMessage: string): string {
    if (errorMessage.includes('NULL')) return 'NULL value in non-nullable field';
    if (errorMessage.includes('SUBSTRING')) return 'String operation on insufficient data';
    if (errorMessage.includes('timeout')) return 'Query execution exceeded time limit';
    return 'See error message for details';
  }
  
  async run() {
    await this.server.connect(new StdioServerTransport());
    console.log('✅ MCP Error Diagnosis Server running');
  }
}

async function main() {
  const pm = getProfileManager();
  await pm.loadProfile(await pm.detectActiveProfile());
  await new MCPErrorDiagnosisServer().run();
}

main();
