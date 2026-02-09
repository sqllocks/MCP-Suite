import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { MemoryStorage } from './memory-storage.js';
import { MemoryType, type Config, ConfigSchema } from './config.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import pino from 'pino';

// Load configuration
async function loadConfig(): Promise<Config> {
  const configPath = process.env.CONFIG_PATH || path.join(process.cwd(), 'config.json');
  
  try {
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);
    return ConfigSchema.parse(config);
  } catch (error) {
    throw new Error(`Failed to load config from ${configPath}: ${error}`);
  }
}

async function main() {
  const config = await loadConfig();
  const logger = pino({ name: 'mcp-memory' });
  
  // Initialize memory storage
  const storage = new MemoryStorage(config);
  await storage.initialize();
  
  logger.info({ client_id: config.client_id }, 'Memory storage initialized');
  
  const server = new Server(
    {
      name: 'mcp-memory',
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
          name: 'store_memory',
          description: 'Store a new memory entry',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: Object.values(MemoryType),
                description: 'Type of memory',
              },
              content: {
                type: 'string',
                description: 'Memory content',
              },
              importance: {
                type: 'number',
                minimum: 1,
                maximum: 10,
                description: 'Importance score (1-10)',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags for categorization',
              },
              context: {
                type: 'string',
                description: 'Additional context',
              },
              relatedTo: {
                type: 'array',
                items: { type: 'string' },
                description: 'IDs of related memories',
              },
            },
            required: ['type', 'content', 'importance'],
          },
        },
        {
          name: 'search_memory',
          description: 'Search for memories',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              types: {
                type: 'array',
                items: { type: 'string', enum: Object.values(MemoryType) },
                description: 'Filter by memory types',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by tags',
              },
              minImportance: {
                type: 'number',
                description: 'Minimum importance score',
              },
              limit: {
                type: 'number',
                default: 10,
                description: 'Maximum results',
              },
              dateFrom: {
                type: 'string',
                description: 'Filter from date (ISO 8601)',
              },
              dateTo: {
                type: 'string',
                description: 'Filter to date (ISO 8601)',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_context',
          description: 'Get relevant context for current conversation',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Context query',
              },
              limit: {
                type: 'number',
                default: 5,
                description: 'Number of memories to return',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'list_memories',
          description: 'List memories with filters',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: Object.values(MemoryType),
                description: 'Filter by type',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by tags',
              },
              limit: {
                type: 'number',
                default: 20,
                description: 'Maximum results',
              },
            },
          },
        },
        {
          name: 'update_memory',
          description: 'Update an existing memory',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Memory ID',
              },
              updates: {
                type: 'object',
                description: 'Fields to update',
              },
            },
            required: ['id', 'updates'],
          },
        },
        {
          name: 'delete_memory',
          description: 'Delete a memory',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Memory ID',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'get_memory_stats',
          description: 'Get memory statistics',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'export_memories',
          description: 'Export all memories',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'import_memories',
          description: 'Import memories from export',
          inputSchema: {
            type: 'object',
            properties: {
              memories: {
                type: 'array',
                description: 'Array of memory entries',
              },
            },
            required: ['memories'],
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
        case 'store_memory': {
          const entry = await storage.storeMemory({
            type: args.type as MemoryType,
            content: args.content,
            metadata: {
              timestamp: new Date().toISOString(),
              tags: args.tags || [],
              importance: args.importance,
              context: args.context,
              relatedTo: args.relatedTo,
            },
          });
          
          logger.info({ id: entry.id, type: entry.type }, 'Memory stored');
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  id: entry.id,
                  status: 'stored',
                  message: 'Memory stored successfully',
                }, null, 2),
              },
            ],
          };
        }
        
        case 'search_memory': {
          const results = await storage.searchMemories(args);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  results,
                  count: results.length,
                }, null, 2),
              },
            ],
          };
        }
        
        case 'get_context': {
          const results = await storage.searchMemories({
            query: args.query,
            limit: args.limit || 5,
            minImportance: 6, // Only important memories for context
          });
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  context: results,
                  summary: `Found ${results.length} relevant memories`,
                }, null, 2),
              },
            ],
          };
        }
        
        case 'list_memories': {
          const results = await storage.searchMemories({
            query: '',
            types: args.type ? [args.type] : undefined,
            tags: args.tags,
            limit: args.limit || 20,
          });
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  memories: results,
                  count: results.length,
                }, null, 2),
              },
            ],
          };
        }
        
        case 'update_memory': {
          const updated = await storage.updateMemory(args.id, args.updates);
          
          if (!updated) {
            throw new Error(`Memory not found: ${args.id}`);
          }
          
          logger.info({ id: args.id }, 'Memory updated');
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  id: updated.id,
                  status: 'updated',
                  message: 'Memory updated successfully',
                }, null, 2),
              },
            ],
          };
        }
        
        case 'delete_memory': {
          const deleted = await storage.deleteMemory(args.id);
          
          if (!deleted) {
            throw new Error(`Memory not found: ${args.id}`);
          }
          
          logger.info({ id: args.id }, 'Memory deleted');
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  id: args.id,
                  status: 'deleted',
                  message: 'Memory deleted successfully',
                }, null, 2),
              },
            ],
          };
        }
        
        case 'get_memory_stats': {
          const stats = await storage.getStats();
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(stats, null, 2),
              },
            ],
          };
        }
        
        case 'export_memories': {
          const memories = await storage.exportMemories();
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  count: memories.length,
                  export: memories,
                }, null, 2),
              },
            ],
          };
        }
        
        case 'import_memories': {
          const count = await storage.importMemories(args.memories);
          
          logger.info({ count }, 'Memories imported');
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'imported',
                  count,
                  message: `${count} memories imported successfully`,
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
  
  logger.info('MCP Memory Server running');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
