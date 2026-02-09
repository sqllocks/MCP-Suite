/**
 * MCP Natural Language Interface
 * Convert natural language queries to MCP operations
 * 
 * Purpose: Simplify MCP access through natural language
 * - Intent recognition
 * - Parameter extraction
 * - Query execution
 * - Multi-step planning
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// TYPES
// ============================================================================

interface Intent {
  name: string;
  confidence: number;
  parameters: Record<string, any>;
  mcpCalls: MCPCall[];
}

interface MCPCall {
  mcp: string;
  tool: string;
  args: Record<string, any>;
}

interface QueryExecution {
  query: string;
  intent: Intent;
  results: any[];
  duration: number;
  success: boolean;
  error?: string;
}

interface CustomIntent {
  name: string;
  patterns: string[];
  examples: string[];
  mcpMapping: MCPCall[];
}

// ============================================================================
// INTENT RECOGNIZER
// ============================================================================

class IntentRecognizer {
  private anthropic: Anthropic;
  private customIntents: Map<string, CustomIntent> = new Map();
  private queryHistory: QueryExecution[] = [];

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Parse natural language query
   */
  async parse(query: string): Promise<Intent> {
    // Check custom intents first
    for (const custom of this.customIntents.values()) {
      for (const pattern of custom.patterns) {
        if (this.matchesPattern(query, pattern)) {
          return {
            name: custom.name,
            confidence: 0.95,
            parameters: this.extractParameters(query, pattern),
            mcpCalls: custom.mcpMapping,
          };
        }
      }
    }

    // Use Claude for intent recognition
    const prompt = `
You are an intent classifier for an MCP (Model Context Protocol) system. Given a natural language query, identify:
1. The user's intent
2. Extract relevant parameters
3. Map to MCP operations

Available MCPs and their tools:
- mcp-sql-explorer: execute_query, list_tables, describe_table
- mcp-ml-inference: register_model, load_model, predict, predict_batch
- mcp-export: export_to_csv, export_to_excel, export_to_json
- mcp-tokenization-secure: mask, unmask, mask_bulk
- mcp-document-generator: generate_architecture, generate_report
- mcp-fabric-search: search (web search with Fabric bias)
- mcp-stream-processor: start_stream, publish_to_stream
- mcp-observability: get_metrics, create_alert_rule, get_cost_analysis
- mcp-memory: store, recall, search

Query: "${query}"

Respond in JSON format:
{
  "intent": "string (describe the user's goal)",
  "confidence": number (0-1),
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  },
  "mcpCalls": [
    {
      "mcp": "mcp-name",
      "tool": "tool_name",
      "args": {}
    }
  ]
}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse intent');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      name: parsed.intent,
      confidence: parsed.confidence,
      parameters: parsed.parameters,
      mcpCalls: parsed.mcpCalls,
    };
  }

  /**
   * Execute query
   */
  async execute(query: string): Promise<QueryExecution> {
    const startTime = Date.now();

    try {
      // Parse intent
      const intent = await this.parse(query);

      // Execute MCP calls
      const results: any[] = [];
      
      for (const call of intent.mcpCalls) {
        try {
          const result = await this.executeMCPCall(call);
          results.push(result);
        } catch (error) {
          results.push({ error: (error as Error).message });
        }
      }

      const execution: QueryExecution = {
        query,
        intent,
        results,
        duration: Date.now() - startTime,
        success: true,
      };

      // Store in history
      this.queryHistory.push(execution);
      if (this.queryHistory.length > 1000) {
        this.queryHistory.shift();
      }

      return execution;

    } catch (error) {
      return {
        query,
        intent: { name: 'error', confidence: 0, parameters: {}, mcpCalls: [] },
        results: [],
        duration: Date.now() - startTime,
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Explain what a query will do
   */
  async explain(query: string): Promise<any> {
    const intent = await this.parse(query);

    return {
      query,
      intent: intent.name,
      confidence: intent.confidence,
      steps: intent.mcpCalls.map((call, i) => 
        `${i + 1}. Call ${call.mcp}.${call.tool} with ${JSON.stringify(call.args)}`
      ),
      requiresConfirmation: this.requiresConfirmation(intent),
      warnings: this.getWarnings(intent),
    };
  }

  /**
   * Execute MCP call (simulated)
   */
  private async executeMCPCall(call: MCPCall): Promise<any> {
    // In real implementation, this would call actual MCPs
    // For now, return simulated results
    return {
      mcp: call.mcp,
      tool: call.tool,
      args: call.args,
      result: 'success',
    };
  }

  /**
   * Check if pattern matches query
   */
  private matchesPattern(query: string, pattern: string): boolean {
    const regex = new RegExp(pattern, 'i');
    return regex.test(query);
  }

  /**
   * Extract parameters from query using pattern
   */
  private extractParameters(query: string, pattern: string): Record<string, any> {
    // Simple parameter extraction (can be enhanced)
    const params: Record<string, any> = {};
    
    // Extract numbers
    const numbers = query.match(/\d+/g);
    if (numbers) {
      params.numbers = numbers.map(n => parseInt(n));
    }
    
    // Extract quoted strings
    const quotes = query.match(/"([^"]+)"/g);
    if (quotes) {
      params.strings = quotes.map(q => q.replace(/"/g, ''));
    }
    
    return params;
  }

  /**
   * Check if intent requires user confirmation
   */
  private requiresConfirmation(intent: Intent): boolean {
    const destructiveIntents = [
      'delete',
      'remove',
      'drop',
      'truncate',
      'modify',
      'update',
    ];

    return destructiveIntents.some(keyword =>
      intent.name.toLowerCase().includes(keyword)
    );
  }

  /**
   * Get warnings for intent
   */
  private getWarnings(intent: Intent): string[] {
    const warnings: string[] = [];

    if (this.requiresConfirmation(intent)) {
      warnings.push('This action is destructive and cannot be undone');
    }

    // Check for sensitive data access
    const sensitiveKeywords = ['password', 'ssn', 'credit_card', 'secret'];
    for (const keyword of sensitiveKeywords) {
      if (intent.name.toLowerCase().includes(keyword)) {
        warnings.push('This query involves sensitive data');
        break;
      }
    }

    return warnings;
  }

  /**
   * Add custom intent
   */
  addCustomIntent(intent: CustomIntent): void {
    this.customIntents.set(intent.name, intent);
  }

  /**
   * Get query history
   */
  getHistory(limit: number = 100): QueryExecution[] {
    return this.queryHistory.slice(-limit);
  }

  /**
   * Suggest alternative queries
   */
  suggestAlternatives(query: string): string[] {
    // Simple suggestions based on common patterns
    const suggestions: string[] = [];

    if (query.includes('patient')) {
      suggestions.push('Show me all patients with high readmission risk');
      suggestions.push('Find patients admitted in the last 30 days');
    }

    if (query.includes('transaction') || query.includes('fraud')) {
      suggestions.push('Detect fraudulent transactions in the last 24 hours');
      suggestions.push('Analyze transaction patterns for anomalies');
    }

    if (query.includes('cost') || query.includes('spend')) {
      suggestions.push('Show me Claude API costs for this month');
      suggestions.push('Compare costs by model');
    }

    return suggestions.slice(0, 5);
  }
}

// ============================================================================
// MCP SERVER
// ============================================================================

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}

const intentRecognizer = new IntentRecognizer(apiKey);

const server = new Server(
  {
    name: 'mcp-nl-interface',
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
    name: 'parse_natural_language',
    description: 'Parse a natural language query into structured intent',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language query',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'execute_query',
    description: 'Execute a natural language query',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language query to execute',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'explain_query',
    description: 'Explain what a query will do before executing',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Query to explain',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'suggest_alternatives',
    description: 'Get suggested alternative queries',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Base query for suggestions',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_query_history',
    description: 'Get history of executed queries',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of queries to return',
        },
      },
    },
  },
  {
    name: 'train_custom_intent',
    description: 'Add a custom intent pattern',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        patterns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Regex patterns to match',
        },
        examples: {
          type: 'array',
          items: { type: 'string' },
          description: 'Example queries',
        },
        mcpMapping: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              mcp: { type: 'string' },
              tool: { type: 'string' },
              args: { type: 'object' },
            },
          },
        },
      },
      required: ['name', 'patterns', 'mcpMapping'],
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
      case 'parse_natural_language': {
        const intent = await intentRecognizer.parse(args.query);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(intent, null, 2),
          }],
        };
      }

      case 'execute_query': {
        const execution = await intentRecognizer.execute(args.query);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(execution, null, 2),
          }],
        };
      }

      case 'explain_query': {
        const explanation = await intentRecognizer.explain(args.query);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(explanation, null, 2),
          }],
        };
      }

      case 'suggest_alternatives': {
        const suggestions = intentRecognizer.suggestAlternatives(args.query);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ suggestions }, null, 2),
          }],
        };
      }

      case 'get_query_history': {
        const history = intentRecognizer.getHistory(args.limit);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(history, null, 2),
          }],
        };
      }

      case 'train_custom_intent': {
        const customIntent: CustomIntent = {
          name: args.name,
          patterns: args.patterns,
          examples: args.examples || [],
          mcpMapping: args.mcpMapping,
        };

        intentRecognizer.addCustomIntent(customIntent);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'intent_added',
              name: customIntent.name,
            }, null, 2),
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
  console.error('MCP NL Interface started');
}

main().catch(console.error);
