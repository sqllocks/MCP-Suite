#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Orchestrator } from './orchestrator.js';
import { ConfigSchema, DEFAULT_MODELS, type Config } from './config.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import pino from 'pino';

const logger = pino({ name: 'mcp-orchestrator' });

/**
 * Load configuration
 */
async function loadConfig(): Promise<Config> {
  const configPath = process.env.CONFIG_PATH || path.join(process.cwd(), 'config.json');
  
  try {
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);
    
    // Merge with defaults
    if (!config.models || config.models.length === 0) {
      config.models = DEFAULT_MODELS;
    }
    
    // Add API keys from environment
    for (const model of config.models) {
      if (model.provider === 'anthropic' && !model.apiKey) {
        model.apiKey = process.env.ANTHROPIC_API_KEY;
      }
    }
    
    return ConfigSchema.parse(config);
  } catch (error) {
    logger.warn({ error, configPath }, 'Config not found, using defaults');
    
    // Use defaults
    return ConfigSchema.parse({
      models: DEFAULT_MODELS.map(m => ({
        ...m,
        apiKey: m.provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : undefined,
      })),
    });
  }
}

/**
 * Main server
 */
async function main() {
  const config = await loadConfig();
  const orchestrator = new Orchestrator(config, logger);
  
  logger.info({ 
    models: config.models.filter(m => m.enabled).map(m => m.name),
  }, 'Orchestrator initialized');
  
  const server = new Server(
    {
      name: 'mcp-orchestrator',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
  
  // List tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'orchestrate_task',
          description: 'Execute a task using optimal multi-model orchestration. Automatically decomposes complex requests into subtasks and routes them to the most appropriate AI models (Opus, Sonnet, Haiku) based on complexity and cost.',
          inputSchema: {
            type: 'object',
            properties: {
              request: {
                type: 'string',
                description: 'The user request to orchestrate',
              },
              maxCost: {
                type: 'number',
                description: 'Maximum cost in USD (optional)',
              },
              maxDuration: {
                type: 'number',
                description: 'Maximum duration in seconds (optional)',
              },
              strategy: {
                type: 'string',
                enum: ['sequential', 'parallel', 'hybrid'],
                description: 'Execution strategy (optional, auto-detected by default)',
              },
            },
            required: ['request'],
          },
        },
        {
          name: 'classify_task',
          description: 'Classify a task\'s complexity and get recommended model without executing',
          inputSchema: {
            type: 'object',
            properties: {
              description: {
                type: 'string',
                description: 'Task description',
              },
              prompt: {
                type: 'string',
                description: 'Task prompt',
              },
            },
            required: ['description', 'prompt'],
          },
        },
        {
          name: 'estimate_cost',
          description: 'Estimate the cost of executing a request',
          inputSchema: {
            type: 'object',
            properties: {
              request: {
                type: 'string',
                description: 'The request to estimate',
              },
            },
            required: ['request'],
          },
        },
        {
          name: 'list_models',
          description: 'List all available models and their capabilities',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    };
  });
  
  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      switch (name) {
        case 'orchestrate_task': {
          const result = await orchestrator.orchestrate(args.request, {
            maxCost: args.maxCost,
            maxDuration: args.maxDuration,
            preferredStrategy: args.strategy,
          });
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: result.success,
                  synthesis: result.synthesis,
                  totalCost: result.totalCost,
                  totalDuration: result.totalDuration,
                  tasks: result.results.map(r => ({
                    id: r.taskId,
                    model: r.model,
                    success: r.success,
                    cost: r.cost,
                    duration: r.durationMs,
                  })),
                  details: result.results,
                }, null, 2),
              },
            ],
          };
        }
        
        case 'classify_task': {
          const taskClassifier = orchestrator['classifier'];
          const task = {
            id: 'temp',
            description: args.description,
            prompt: args.prompt,
            priority: 1,
          };
          
          const complexity = taskClassifier.classifyComplexity(task);
          const model = taskClassifier.selectModel(task);
          const cost = taskClassifier.estimateCost(task, model);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  complexity,
                  recommendedModel: model.name,
                  estimatedCost: cost,
                  modelDetails: {
                    provider: model.provider,
                    capabilities: model.capabilities,
                  },
                }, null, 2),
              },
            ],
          };
        }
        
        case 'estimate_cost': {
          // Create a simple estimation by planning
          const plan = await orchestrator['planExecution'](args.request);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  estimatedCost: plan.estimatedCost,
                  estimatedDuration: plan.estimatedDuration,
                  taskCount: plan.tasks.length,
                  strategy: plan.strategy,
                  breakdown: plan.tasks.map(t => ({
                    id: t.id,
                    description: t.description,
                    complexity: t.complexity,
                    preferredModel: t.preferredModel,
                  })),
                }, null, 2),
              },
            ],
          };
        }
        
        case 'list_models': {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  models: config.models.map(m => ({
                    name: m.name,
                    provider: m.provider,
                    model: m.model,
                    enabled: m.enabled,
                    capabilities: m.capabilities,
                    costPer1MInputTokens: m.costPer1MInputTokens,
                    costPer1MOutputTokens: m.costPer1MOutputTokens,
                    maxContext: m.maxContext,
                  })),
                }, null, 2),
              },
            ],
          };
        }
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      logger.error({ error, tool: name }, 'Tool execution failed');
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
        isError: true,
      };
    }
  });
  
  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  logger.info('MCP Orchestrator Server running');
}

main().catch((error) => {
  logger.error({ error }, 'Fatal error');
  process.exit(1);
});
