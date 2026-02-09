#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createLogger, loadConfigFromEnv } from '@mcp-suite/shared';
import { Config, ConfigSchema } from './config.js';
import { ConnectionPool } from './connectors/base-connector.js';
import { MSSQLConnector } from './connectors/mssql-connector.js';
import { PostgresConnector } from './connectors/postgres-connector.js';
import { FabricConnector } from './connectors/fabric-connector.js';

class SQLExplorerServer {
  private server: Server;
  private config: Config;
  private logger: ReturnType<typeof createLogger>;
  private connectionPool: ConnectionPool;

  constructor(config: Config) {
    this.config = config;
    this.logger = createLogger({ name: 'mcp-sql-explorer' });
    this.connectionPool = new ConnectionPool();

    // Create MCP server
    this.server = new Server(
      {
        name: 'mcp-sql-explorer',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.logger.info(
      { client_id: this.config.client_id, connections: Object.keys(this.config.connections) },
      'SQL Explorer Server initialized'
    );
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const connectionNames = Object.keys(this.config.connections);
      
      const tools: Tool[] = [
        {
          name: 'sql_query',
          description: `Execute read-only SQL queries. Available connections: ${connectionNames.join(', ')}`,
          inputSchema: {
            type: 'object',
            properties: {
              connection_name: {
                type: 'string',
                enum: connectionNames,
                description: 'Connection name',
              },
              query: {
                type: 'string',
                description: 'SQL query to execute',
              },
              limit: {
                type: 'number',
                description: 'Maximum rows to return',
                default: 100,
              },
            },
            required: ['connection_name', 'query'],
          },
        },
        {
          name: 'sql_get_schema',
          description: 'Get table schema information',
          inputSchema: {
            type: 'object',
            properties: {
              connection_name: {
                type: 'string',
                enum: connectionNames,
                description: 'Connection name',
              },
              table: {
                type: 'string',
                description: 'Table name',
              },
              schema: {
                type: 'string',
                description: 'Schema name (optional)',
              },
            },
            required: ['connection_name', 'table'],
          },
        },
        {
          name: 'sql_list_tables',
          description: 'List all tables in database',
          inputSchema: {
            type: 'object',
            properties: {
              connection_name: {
                type: 'string',
                enum: connectionNames,
                description: 'Connection name',
              },
              schema: {
                type: 'string',
                description: 'Schema name (optional)',
              },
            },
            required: ['connection_name'],
          },
        },
        {
          name: 'sql_search_columns',
          description: 'Search for columns across all tables',
          inputSchema: {
            type: 'object',
            properties: {
              connection_name: {
                type: 'string',
                enum: connectionNames,
                description: 'Connection name',
              },
              pattern: {
                type: 'string',
                description: 'Column name pattern to search',
              },
              schema: {
                type: 'string',
                description: 'Schema name (optional)',
              },
            },
            required: ['connection_name', 'pattern'],
          },
        },
        {
          name: 'sql_get_stats',
          description: 'Get table statistics',
          inputSchema: {
            type: 'object',
            properties: {
              connection_name: {
                type: 'string',
                enum: connectionNames,
                description: 'Connection name',
              },
              table: {
                type: 'string',
                description: 'Table name',
              },
              schema: {
                type: 'string',
                description: 'Schema name (optional)',
              },
            },
            required: ['connection_name', 'table'],
          },
        },
        {
          name: 'sql_explain_plan',
          description: 'Get query execution plan',
          inputSchema: {
            type: 'object',
            properties: {
              connection_name: {
                type: 'string',
                enum: connectionNames,
                description: 'Connection name',
              },
              query: {
                type: 'string',
                description: 'SQL query to analyze',
              },
            },
            required: ['connection_name', 'query'],
          },
        },
      ];

      // Add Fabric Lakehouse-specific tools if any Lakehouse connections exist
      const hasLakehouse = connectionNames.some(
        name => this.config.connections[name].type === 'fabric-lakehouse'
      );

      if (hasLakehouse) {
        const lakehouseConnections = connectionNames.filter(
          name => this.config.connections[name].type === 'fabric-lakehouse'
        );

        tools.push(
          {
            name: 'fabric_lakehouse_list_files',
            description: 'List files in Fabric Lakehouse',
            inputSchema: {
              type: 'object',
              properties: {
                connection_name: {
                  type: 'string',
                  enum: lakehouseConnections,
                  description: 'Lakehouse connection name',
                },
                path: {
                  type: 'string',
                  description: 'Path to list files from',
                  default: '/',
                },
              },
              required: ['connection_name'],
            },
          },
          {
            name: 'fabric_lakehouse_delta_properties',
            description: 'Get Delta table properties for Fabric Lakehouse',
            inputSchema: {
              type: 'object',
              properties: {
                connection_name: {
                  type: 'string',
                  enum: lakehouseConnections,
                  description: 'Lakehouse connection name',
                },
                table: {
                  type: 'string',
                  description: 'Table name',
                },
                schema: {
                  type: 'string',
                  description: 'Schema name (optional)',
                  default: 'dbo',
                },
              },
              required: ['connection_name', 'table'],
            },
          }
        );
      }

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'sql_query':
            return await this.handleQuery(args);
          case 'sql_get_schema':
            return await this.handleGetSchema(args);
          case 'sql_list_tables':
            return await this.handleListTables(args);
          case 'sql_search_columns':
            return await this.handleSearchColumns(args);
          case 'sql_get_stats':
            return await this.handleGetStats(args);
          case 'sql_explain_plan':
            return await this.handleExplainPlan(args);
          case 'fabric_lakehouse_list_files':
            return await this.handleLakehouseListFiles(args);
          case 'fabric_lakehouse_delta_properties':
            return await this.handleLakehouseDeltaProperties(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        this.logger.error({ error, tool: name }, 'Tool execution failed');
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async getConnector(connectionName: string) {
    const config = this.config.connections[connectionName];
    if (!config) {
      throw new Error(`Connection '${connectionName}' not found`);
    }

    // Create connector based on type
    let connector;
    switch (config.type) {
      case 'mssql':
        connector = new MSSQLConnector(config, this.logger);
        break;
      case 'fabric-warehouse':
      case 'fabric-sql-database':
      case 'fabric-lakehouse':
      case 'synapse-serverless':
      case 'synapse-dedicated':
        connector = new FabricConnector(config, this.logger);
        break;
      case 'postgres':
        connector = new PostgresConnector(config, this.logger);
        break;
      case 'mysql':
        throw new Error('MySQL connector not yet implemented');
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }

    return await this.connectionPool.getConnection(connectionName, config, connector);
  }

  private validateQuery(query: string): void {
    if (!this.config.allow_write_operations) {
      const upperQuery = query.toUpperCase();
      for (const keyword of this.config.dangerous_keywords) {
        if (upperQuery.includes(keyword)) {
          throw new Error(`Query contains dangerous keyword: ${keyword}. Write operations are disabled.`);
        }
      }
    }
  }

  private async handleQuery(args: any) {
    const { connection_name, query, limit = 100 } = args;

    this.logger.info({ connection: connection_name }, 'Executing query');

    // Validate query
    this.validateQuery(query);

    // Get connector
    const connector = await this.getConnector(connection_name);

    // Add LIMIT if not present
    let finalQuery = query.trim();
    if (!finalQuery.toUpperCase().includes('LIMIT') && !finalQuery.toUpperCase().includes('TOP')) {
      finalQuery += ` LIMIT ${Math.min(limit, this.config.max_result_rows)}`;
    }

    // Execute query
    const result = await connector.query(finalQuery);

    // Truncate if needed
    if (result.rows.length > this.config.max_result_rows) {
      result.rows = result.rows.slice(0, this.config.max_result_rows);
      result.rowCount = this.config.max_result_rows;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetSchema(args: any) {
    const { connection_name, table, schema } = args;

    this.logger.info({ connection: connection_name, table }, 'Getting table schema');

    const connector = await this.getConnector(connection_name);
    const tableSchema = await connector.getTableSchema(table, schema);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(tableSchema, null, 2),
        },
      ],
    };
  }

  private async handleListTables(args: any) {
    const { connection_name, schema } = args;

    this.logger.info({ connection: connection_name }, 'Listing tables');

    const connector = await this.getConnector(connection_name);
    const tables = await connector.listTables(schema);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ tables, count: tables.length }, null, 2),
        },
      ],
    };
  }

  private async handleSearchColumns(args: any) {
    const { connection_name, pattern, schema } = args;

    this.logger.info({ connection: connection_name, pattern }, 'Searching columns');

    const connector = await this.getConnector(connection_name);
    const columns = await connector.searchColumns(pattern, schema);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ columns, count: columns.length }, null, 2),
        },
      ],
    };
  }

  private async handleGetStats(args: any) {
    const { connection_name, table, schema } = args;

    this.logger.info({ connection: connection_name, table }, 'Getting table stats');

    const connector = await this.getConnector(connection_name);
    const stats = await connector.getTableStats(table, schema);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(stats, null, 2),
        },
      ],
    };
  }

  private async handleExplainPlan(args: any) {
    const { connection_name, query } = args;

    this.logger.info({ connection: connection_name }, 'Getting explain plan');

    // Validate query
    this.validateQuery(query);

    const connector = await this.getConnector(connection_name);
    const plan = await connector.explainQuery(query);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(plan, null, 2),
        },
      ],
    };
  }

  private async handleLakehouseListFiles(args: any) {
    const { connection_name, path = '/' } = args;

    this.logger.info({ connection: connection_name, path }, 'Listing Lakehouse files');

    const connector = await this.getConnector(connection_name);
    
    if (!(connector instanceof FabricConnector)) {
      throw new Error('This operation is only supported for Fabric Lakehouse connections');
    }

    const files = await connector.getLakehouseFiles(path);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ files, count: files.length }, null, 2),
        },
      ],
    };
  }

  private async handleLakehouseDeltaProperties(args: any) {
    const { connection_name, table, schema = 'dbo' } = args;

    this.logger.info({ connection: connection_name, table }, 'Getting Delta table properties');

    const connector = await this.getConnector(connection_name);
    
    if (!(connector instanceof FabricConnector)) {
      throw new Error('This operation is only supported for Fabric Lakehouse connections');
    }

    const properties = await connector.getDeltaTableProperties(table, schema);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(properties, null, 2),
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('Server running on stdio');
  }

  async shutdown(): Promise<void> {
    await this.connectionPool.closeAll();
    this.logger.info('Server shutdown complete');
  }
}

// Main entry point
async function main() {
  try {
    // Load config from environment variable
    const config = await loadConfigFromEnv('CONFIG_PATH', {
      schema: ConfigSchema,
      defaults: {},
    });

    // Create and run server
    const server = new SQLExplorerServer(config);
    
    // Handle shutdown
    process.on('SIGINT', async () => {
      await server.shutdown();
      process.exit(0);
    });

    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
