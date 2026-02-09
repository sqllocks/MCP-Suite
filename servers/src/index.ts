// File: servers/mcp-orchestrator/src/index.ts
// Multi-model orchestration server - routes tasks to appropriate models

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getProfileManager } from '../../../shared/profile-manager/profile-manager.js';
import { ProfileAuditLogger } from '../../../shared/audit/profile-audit-logger.js';
import { getModelRecommendation } from '../../../shared/models/model-config.js';

interface TaskClassification {
  complexity: 'simple' | 'medium' | 'complex';
  taskType: 'strategy' | 'coding' | 'formatting' | 'analysis' | 'data_processing';
  recommendedModel: string;
  reasoning: string;
  subtasks?: SubTask[];
}

interface SubTask {
  id: string;
  description: string;
  assignedModel: string;
  dependencies: string[];
  priority: number;
}

interface ExecutionResult {
  taskId: string;
  subtaskResults: SubTaskResult[];
  finalResponse: string;
  totalCost: number;
  totalDuration: number;
  modelsUsed: Map<string, number>;
}

interface SubTaskResult {
  subtaskId: string;
  model: string;
  result: any;
  duration: number;
  cost: number;
  success: boolean;
}

class MCPOrchestratorServer {
  private server: Server;
  private profileManager: typeof import('../../../shared/profile-manager/profile-manager.js').ProfileManager.prototype;
  private audit: ProfileAuditLogger;
  
  constructor() {
    this.profileManager = getProfileManager();
    this.audit = new ProfileAuditLogger(this.profileManager);
    
    this.server = new Server({
      name: 'mcp-orchestrator',
      version: '2.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });
    
    this.setupTools();
    this.setupHandlers();
    
    console.log(`🎯 MCP Orchestrator Server initialized`);
    console.log(`   Profile: ${this.profileManager.getActiveProfile()}`);
    
    this.audit.log({
      action: 'server_started',
      mcpServer: 'mcp-orchestrator',
      success: true
    });
  }
  
  private setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'classify_task',
          description: 'Classify a task and recommend appropriate model',
          inputSchema: {
            type: 'object',
            properties: {
              task: {
                type: 'string',
                description: 'Task description'
              }
            },
            required: ['task']
          }
        },
        {
          name: 'orchestrate_workflow',
          description: 'Split complex task into subtasks and assign to appropriate models',
          inputSchema: {
            type: 'object',
            properties: {
              task: {
                type: 'string',
                description: 'Complex task to orchestrate'
              },
              executionMode: {
                type: 'string',
                enum: ['parallel', 'sequential', 'hybrid'],
                description: 'How to execute subtasks'
              }
            },
            required: ['task']
          }
        },
        {
          name: 'get_routing_plan',
          description: 'Get detailed routing plan without execution',
          inputSchema: {
            type: 'object',
            properties: {
              task: {
                type: 'string',
                description: 'Task to plan'
              }
            },
            required: ['task']
          }
        },
        {
          name: 'get_cost_report',
          description: 'Get cost analysis for different model combinations',
          inputSchema: {
            type: 'object',
            properties: {
              task: {
                type: 'string',
                description: 'Task to analyze'
              }
            },
            required: ['task']
          }
        },
        {
          name: 'get_model_recommendations',
          description: 'Get recommended models for orchestration',
          inputSchema: {
            type: 'object',
            properties: {}
          }
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
          case 'classify_task':
            result = await this.handleClassifyTask(args);
            break;
          
          case 'orchestrate_workflow':
            result = await this.handleOrchestrateWorkflow(args);
            break;
          
          case 'get_routing_plan':
            result = await this.handleGetRoutingPlan(args);
            break;
          
          case 'get_cost_report':
            result = await this.handleGetCostReport(args);
            break;
          
          case 'get_model_recommendations':
            result = await this.handleGetModelRecommendations();
            break;
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        const duration = `${Date.now() - startTime}ms`;
        
        await this.audit.log({
          action: `orchestrator_${name}`,
          details: { args },
          mcpServer: 'mcp-orchestrator',
          duration,
          success: true
        });
        
        return result;
        
      } catch (error: any) {
        const duration = `${Date.now() - startTime}ms`;
        
        await this.audit.log({
          action: `orchestrator_${name}`,
          details: { args },
          mcpServer: 'mcp-orchestrator',
          duration,
          success: false,
          errorMessage: error.message
        });
        
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    });
  }
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Tool Handlers
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  private async handleClassifyTask(args: any) {
    const { task } = args;
    
    console.log(`🔍 Classifying task: ${task.substring(0, 50)}...`);
    
    const classification = this.classifyTask(task);
    
    return {
      content: [{
        type: 'text',
        text: `🎯 Task Classification

Task: ${task}

Complexity: ${classification.complexity.toUpperCase()}
Task Type: ${classification.taskType}
Recommended Model: ${classification.recommendedModel}

Reasoning:
${classification.reasoning}

Profile: ${this.profileManager.getActiveProfile()}

Cost Estimate:
- Simple tasks (Haiku): $0.0001-0.001 per request
- Medium tasks (Sonnet): $0.001-0.01 per request
- Complex tasks (Opus): $0.01-0.10 per request`
      }]
    };
  }
  
  private async handleOrchestrateWorkflow(args: any) {
    const { task, executionMode = 'hybrid' } = args;
    
    console.log(`🎼 Orchestrating workflow: ${task.substring(0, 50)}...`);
    console.log(`   Execution mode: ${executionMode}`);
    
    // Classify and split into subtasks
    const classification = this.classifyTask(task);
    const subtasks = this.splitIntoSubtasks(task, classification);
    
    // Create execution plan
    const plan = this.createExecutionPlan(subtasks, executionMode);
    
    return {
      content: [{
        type: 'text',
        text: `🎼 Workflow Orchestration Plan

Task: ${task}
Execution Mode: ${executionMode}
Subtasks: ${subtasks.length}

Execution Plan:
${plan.map((step, i) => `
${i + 1}. ${step.description}
   Model: ${step.assignedModel}
   Priority: ${step.priority}
   Dependencies: ${step.dependencies.length > 0 ? step.dependencies.join(', ') : 'None'}
`).join('')}

Estimated Performance:
- Total Duration: ${this.estimateDuration(plan, executionMode)}
- Total Cost: $${this.estimateCost(plan)}
- Models Used: ${this.countModels(plan)}

To execute this plan, the orchestrator would:
1. Execute subtasks according to dependencies
2. Collect results from each model
3. Synthesize final response
4. Return consolidated output

Profile: ${this.profileManager.getActiveProfile()}`
      }]
    };
  }
  
  private async handleGetRoutingPlan(args: any) {
    const { task } = args;
    
    console.log(`📋 Creating routing plan: ${task.substring(0, 50)}...`);
    
    const classification = this.classifyTask(task);
    const subtasks = this.splitIntoSubtasks(task, classification);
    
    return {
      content: [{
        type: 'text',
        text: `📋 Detailed Routing Plan

Task: ${task}

Overall Strategy:
- Complexity: ${classification.complexity}
- Primary Model: ${classification.recommendedModel}
- Task Type: ${classification.taskType}

Subtask Breakdown:
${subtasks.map((st, i) => `
${i + 1}. ${st.description}
   → Model: ${st.assignedModel}
   → Why: ${this.getModelReasoning(st.assignedModel, classification.taskType)}
   → Priority: ${st.priority}
   → Estimated Cost: $${this.estimateSubtaskCost(st)}
`).join('')}

Routing Logic:
${this.explainRoutingLogic(classification, subtasks)}

Profile: ${this.profileManager.getActiveProfile()}`
      }]
    };
  }
  
  private async handleGetCostReport(args: any) {
    const { task } = args;
    
    console.log(`💰 Generating cost report: ${task.substring(0, 50)}...`);
    
    const classification = this.classifyTask(task);
    
    // Calculate costs for different strategies
    const allOpus = this.estimateCostForStrategy(task, 'all-opus');
    const optimized = this.estimateCostForStrategy(task, 'optimized');
    const allHaiku = this.estimateCostForStrategy(task, 'all-haiku');
    
    const savings = ((allOpus - optimized) / allOpus * 100).toFixed(1);
    
    return {
      content: [{
        type: 'text',
        text: `💰 Cost Analysis Report

Task: ${task}
Complexity: ${classification.complexity}

Strategy Comparison:

1. All Opus (Highest Quality):
   Cost: $${allOpus.toFixed(4)}
   Speed: Medium
   Accuracy: Excellent
   Use Case: Critical tasks requiring best reasoning

2. Optimized Multi-Model (RECOMMENDED):
   Cost: $${optimized.toFixed(4)}
   Speed: Fast
   Accuracy: Excellent
   Use Case: Most tasks, best balance
   💰 SAVINGS: ${savings}% vs all-Opus

3. All Haiku (Lowest Cost):
   Cost: $${allHaiku.toFixed(4)}
   Speed: Very Fast
   Accuracy: Good
   Use Case: Simple, high-volume tasks

Annual Savings Estimate:
- If you process 1,000 similar tasks/month:
  Optimized vs All-Opus: $${((allOpus - optimized) * 1000 * 12).toFixed(2)}/year
  Optimized vs All-Haiku: Quality gain worth the difference

Profile: ${this.profileManager.getActiveProfile()}`
      }]
    };
  }
  
  private async handleGetModelRecommendations() {
    const recommendations = getModelRecommendation('orchestrator');
    
    return {
      content: [{
        type: 'text',
        text: `🤖 Model Recommendations for Orchestration

PRIMARY (Accuracy Priority):
  ${recommendations.primary.name}
  Provider: ${recommendations.primary.provider}
  Model: ${recommendations.primary.model}
  Cost: ${recommendations.primary.cost} | Speed: ${recommendations.primary.speed} | Accuracy: ${recommendations.primary.accuracy}
  Reasoning: ${recommendations.primary.reasoning}

ALTERNATIVE (Cost Priority):
  ${recommendations.alternative.name}
  Provider: ${recommendations.alternative.provider}
  Model: ${recommendations.alternative.model}
  Cost: ${recommendations.alternative.cost} | Speed: ${recommendations.alternative.speed} | Accuracy: ${recommendations.alternative.accuracy}
  Reasoning: ${recommendations.alternative.reasoning}

OPEN SOURCE:
  ${recommendations.openSource?.name || 'N/A'}
  ${recommendations.openSource ? `Model: ${recommendations.openSource.model}` : ''}
  ${recommendations.openSource ? `Cost: ${recommendations.openSource.cost} | Speed: ${recommendations.openSource.speed} | Accuracy: ${recommendations.openSource.accuracy}` : ''}
  ${recommendations.openSource ? `Reasoning: ${recommendations.openSource.reasoning}` : ''}
  ${recommendations.openSource ? `Deployment: ${recommendations.openSource.deploymentNotes}` : ''}`
      }]
    };
  }
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Helper Methods
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  private classifyTask(task: string): TaskClassification {
    const taskLower = task.toLowerCase();
    
    // Detect task type
    let taskType: TaskClassification['taskType'] = 'analysis';
    if (taskLower.includes('code') || taskLower.includes('script') || taskLower.includes('function')) {
      taskType = 'coding';
    } else if (taskLower.includes('format') || taskLower.includes('style') || taskLower.includes('csv') || taskLower.includes('excel')) {
      taskType = 'formatting';
    } else if (taskLower.includes('strategy') || taskLower.includes('plan') || taskLower.includes('design')) {
      taskType = 'strategy';
    } else if (taskLower.includes('export') || taskLower.includes('data') || taskLower.includes('query')) {
      taskType = 'data_processing';
    }
    
    // Detect complexity
    let complexity: TaskClassification['complexity'] = 'medium';
    const complexityIndicators = {
      simple: ['simple', 'quick', 'basic', 'straightforward', 'single'],
      complex: ['complex', 'advanced', 'multiple', 'intricate', 'comprehensive', 'analyze', 'optimize']
    };
    
    if (complexityIndicators.simple.some(word => taskLower.includes(word))) {
      complexity = 'simple';
    } else if (complexityIndicators.complex.some(word => taskLower.includes(word))) {
      complexity = 'complex';
    }
    
    // Recommend model based on complexity and type
    let recommendedModel = 'claude-sonnet-4';
    let reasoning = 'Balanced performance for medium complexity tasks';
    
    if (complexity === 'complex' || taskType === 'strategy') {
      recommendedModel = 'claude-opus-4';
      reasoning = 'Complex task requiring advanced reasoning and planning capabilities';
    } else if (complexity === 'simple' || taskType === 'formatting') {
      recommendedModel = 'claude-haiku-4';
      reasoning = 'Simple task suitable for fast, cost-effective model';
    }
    
    return {
      complexity,
      taskType,
      recommendedModel,
      reasoning
    };
  }
  
  private splitIntoSubtasks(task: string, classification: TaskClassification): SubTask[] {
    const subtasks: SubTask[] = [];
    
    // Example subtask splitting logic
    if (classification.complexity === 'complex') {
      subtasks.push({
        id: 'analyze',
        description: 'Analyze requirements and plan approach',
        assignedModel: 'claude-opus-4',
        dependencies: [],
        priority: 1
      });
      
      subtasks.push({
        id: 'implement',
        description: 'Implement solution',
        assignedModel: 'claude-sonnet-4',
        dependencies: ['analyze'],
        priority: 2
      });
      
      subtasks.push({
        id: 'format',
        description: 'Format and finalize output',
        assignedModel: 'claude-haiku-4',
        dependencies: ['implement'],
        priority: 3
      });
    } else {
      subtasks.push({
        id: 'execute',
        description: 'Execute task',
        assignedModel: classification.recommendedModel,
        dependencies: [],
        priority: 1
      });
    }
    
    return subtasks;
  }
  
  private createExecutionPlan(subtasks: SubTask[], mode: string): SubTask[] {
    // Sort by priority and dependencies
    return subtasks.sort((a, b) => a.priority - b.priority);
  }
  
  private estimateDuration(plan: SubTask[], mode: string): string {
    if (mode === 'parallel') {
      return '5-10 seconds';
    } else if (mode === 'sequential') {
      return `${plan.length * 3}-${plan.length * 5} seconds`;
    } else {
      return '8-15 seconds';
    }
  }
  
  private estimateCost(plan: SubTask[]): number {
    let total = 0;
    for (const task of plan) {
      if (task.assignedModel.includes('opus')) {
        total += 0.05;
      } else if (task.assignedModel.includes('sonnet')) {
        total += 0.005;
      } else {
        total += 0.0005;
      }
    }
    return total;
  }
  
  private estimateSubtaskCost(subtask: SubTask): number {
    if (subtask.assignedModel.includes('opus')) {
      return 0.05;
    } else if (subtask.assignedModel.includes('sonnet')) {
      return 0.005;
    } else {
      return 0.0005;
    }
  }
  
  private countModels(plan: SubTask[]): number {
    const models = new Set(plan.map(t => t.assignedModel));
    return models.size;
  }
  
  private getModelReasoning(model: string, taskType: string): string {
    if (model.includes('opus')) {
      return 'Best reasoning capabilities for complex analysis';
    } else if (model.includes('sonnet')) {
      return 'Excellent balance of quality and speed';
    } else {
      return 'Fast and cost-effective for simple tasks';
    }
  }
  
  private explainRoutingLogic(classification: TaskClassification, subtasks: SubTask[]): string {
    return `The orchestrator routes tasks based on:
1. Complexity: ${classification.complexity} tasks use ${classification.recommendedModel}
2. Task Type: ${classification.taskType} tasks benefit from specialized models
3. Cost Optimization: Using ${subtasks.length} subtasks reduces cost by 50-90%
4. Quality: Critical subtasks use Opus, routine work uses Sonnet/Haiku`;
  }
  
  private estimateCostForStrategy(task: string, strategy: string): number {
    if (strategy === 'all-opus') {
      return 0.15;
    } else if (strategy === 'all-haiku') {
      return 0.002;
    } else {
      return 0.02; // Optimized mix
    }
  }
  
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log('✅ MCP Orchestrator Server running');
    console.log(`   Profile: ${this.profileManager.getActiveProfile()}`);
  }
}

// Initialize and run server
async function main() {
  try {
    const profileManager = getProfileManager();
    
    const profileId = await profileManager.detectActiveProfile();
    await profileManager.loadProfile(profileId);
    
    console.log(`✅ Profile loaded: ${profileId}`);
    
    const server = new MCPOrchestratorServer();
    await server.run();
    
  } catch (error: any) {
    console.error('Failed to start MCP Orchestrator Server:', error.message);
    process.exit(1);
  }
}

main();
