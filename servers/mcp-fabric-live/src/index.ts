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
import { DefaultAzureCredential, ClientSecretCredential } from '@azure/identity';
import axios, { AxiosInstance } from 'axios';

class FabricLiveServer {
  private server: Server;
  private config: Config;
  private logger: ReturnType<typeof createLogger>;
  private credential: any;
  private fabricApi: AxiosInstance;
  private powerBiApi: AxiosInstance;
  private synapseApi: AxiosInstance;
  private cache: Map<string, { data: any; expires: number }> = new Map();

  constructor(config: Config) {
    this.config = config;
    this.logger = createLogger({ name: 'mcp-fabric-live' });

    // Initialize Azure credentials
    this.initializeCredentials();

    // Create API clients
    this.fabricApi = axios.create({
      baseURL: 'https://api.fabric.microsoft.com/v1',
      headers: { 'Content-Type': 'application/json' },
    });

    this.powerBiApi = axios.create({
      baseURL: 'https://api.powerbi.com/v1.0/myorg',
      headers: { 'Content-Type': 'application/json' },
    });

    this.synapseApi = axios.create({
      baseURL: 'https://management.azure.com',
      headers: { 'Content-Type': 'application/json' },
    });

    // Add auth interceptors
    this.setupAuthInterceptors();

    // Create MCP server
    this.server = new Server(
      {
        name: 'mcp-fabric-live',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.logger.info({ client_id: this.config.client_id }, 'Fabric Live Server initialized');
  }

  private initializeCredentials(): void {
    if (this.config.auth_method === 'service-principal' && this.config.service_principal) {
      this.credential = new ClientSecretCredential(
        this.config.service_principal.tenantId,
        this.config.service_principal.clientId,
        this.config.service_principal.clientSecret
      );
    } else {
      this.credential = new DefaultAzureCredential();
    }
  }

  private setupAuthInterceptors(): void {
    const addAuth = async (config: any) => {
      const token = await this.credential.getToken('https://analysis.windows.net/powerbi/api/.default');
      config.headers.Authorization = `Bearer ${token.token}`;
      return config;
    };

    this.fabricApi.interceptors.request.use(addAuth);
    this.powerBiApi.interceptors.request.use(addAuth);

    const addAzureAuth = async (config: any) => {
      const token = await this.credential.getToken('https://management.azure.com/.default');
      config.headers.Authorization = `Bearer ${token.token}`;
      return config;
    };

    this.synapseApi.interceptors.request.use(addAzureAuth);
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        // Fabric Workspace Tools
        {
          name: 'fabric_list_workspaces',
          description: 'List all accessible Fabric workspaces',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'fabric_get_workspace_items',
          description: 'Get all items in a workspace',
          inputSchema: {
            type: 'object',
            properties: {
              workspace: { type: 'string', description: 'Workspace name or ID' },
              item_type: {
                type: 'string',
                enum: ['SemanticModel', 'Report', 'Dashboard', 'Pipeline', 'Notebook', 'Lakehouse', 'Warehouse'],
                description: 'Filter by item type (optional)',
              },
            },
            required: ['workspace'],
          },
        },

        // Semantic Model Tools
        {
          name: 'fabric_get_semantic_model',
          description: 'Get semantic model structure (tables, measures, relationships)',
          inputSchema: {
            type: 'object',
            properties: {
              workspace: { type: 'string', description: 'Workspace name or ID' },
              model: { type: 'string', description: 'Model name or ID' },
            },
            required: ['workspace', 'model'],
          },
        },
        {
          name: 'fabric_get_model_refresh_history',
          description: 'Get model refresh history',
          inputSchema: {
            type: 'object',
            properties: {
              workspace: { type: 'string', description: 'Workspace name or ID' },
              model: { type: 'string', description: 'Model name or ID' },
              top: { type: 'number', description: 'Number of results', default: 10 },
            },
            required: ['workspace', 'model'],
          },
        },
        {
          name: 'fabric_get_model_measures',
          description: 'Get all DAX measures from a model',
          inputSchema: {
            type: 'object',
            properties: {
              workspace: { type: 'string', description: 'Workspace name or ID' },
              model: { type: 'string', description: 'Model name or ID' },
              table: { type: 'string', description: 'Filter by table (optional)' },
            },
            required: ['workspace', 'model'],
          },
        },

        // Pipeline Tools
        {
          name: 'fabric_list_pipelines',
          description: 'List all pipelines in workspace',
          inputSchema: {
            type: 'object',
            properties: {
              workspace: { type: 'string', description: 'Workspace name or ID' },
            },
            required: ['workspace'],
          },
        },
        {
          name: 'fabric_get_pipeline',
          description: 'Get pipeline configuration',
          inputSchema: {
            type: 'object',
            properties: {
              workspace: { type: 'string', description: 'Workspace name or ID' },
              pipeline: { type: 'string', description: 'Pipeline name or ID' },
            },
            required: ['workspace', 'pipeline'],
          },
        },
        {
          name: 'fabric_get_pipeline_runs',
          description: 'Get pipeline run history',
          inputSchema: {
            type: 'object',
            properties: {
              workspace: { type: 'string', description: 'Workspace name or ID' },
              pipeline: { type: 'string', description: 'Pipeline name or ID' },
              top: { type: 'number', description: 'Number of results', default: 10 },
            },
            required: ['workspace', 'pipeline'],
          },
        },

        // Notebook Tools
        {
          name: 'fabric_list_notebooks',
          description: 'List all notebooks in workspace',
          inputSchema: {
            type: 'object',
            properties: {
              workspace: { type: 'string', description: 'Workspace name or ID' },
            },
            required: ['workspace'],
          },
        },
        {
          name: 'fabric_get_notebook',
          description: 'Get notebook contents',
          inputSchema: {
            type: 'object',
            properties: {
              workspace: { type: 'string', description: 'Workspace name or ID' },
              notebook: { type: 'string', description: 'Notebook name or ID' },
            },
            required: ['workspace', 'notebook'],
          },
        },

        // Lakehouse Tools
        {
          name: 'fabric_list_lakehouses',
          description: 'List all lakehouses in workspace',
          inputSchema: {
            type: 'object',
            properties: {
              workspace: { type: 'string', description: 'Workspace name or ID' },
            },
            required: ['workspace'],
          },
        },
        {
          name: 'fabric_get_lakehouse_tables',
          description: 'List tables in lakehouse',
          inputSchema: {
            type: 'object',
            properties: {
              workspace: { type: 'string', description: 'Workspace name or ID' },
              lakehouse: { type: 'string', description: 'Lakehouse name or ID' },
            },
            required: ['workspace', 'lakehouse'],
          },
        },

        // Synapse Tools
        {
          name: 'synapse_list_pipelines',
          description: 'List Synapse pipelines',
          inputSchema: {
            type: 'object',
            properties: {
              workspace: { type: 'string', description: 'Synapse workspace name' },
            },
            required: ['workspace'],
          },
        },
        {
          name: 'synapse_get_pipeline',
          description: 'Get Synapse pipeline definition',
          inputSchema: {
            type: 'object',
            properties: {
              workspace: { type: 'string', description: 'Synapse workspace name' },
              pipeline: { type: 'string', description: 'Pipeline name' },
            },
            required: ['workspace', 'pipeline'],
          },
        },
        {
          name: 'synapse_list_spark_pools',
          description: 'List Spark pools in Synapse workspace',
          inputSchema: {
            type: 'object',
            properties: {
              workspace: { type: 'string', description: 'Synapse workspace name' },
            },
            required: ['workspace'],
          },
        },
        {
          name: 'synapse_get_notebook',
          description: 'Get Synapse notebook',
          inputSchema: {
            type: 'object',
            properties: {
              workspace: { type: 'string', description: 'Synapse workspace name' },
              notebook: { type: 'string', description: 'Notebook name' },
            },
            required: ['workspace', 'notebook'],
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: any;

        switch (name) {
          // Fabric Workspace
          case 'fabric_list_workspaces':
            result = await this.fabricListWorkspaces();
            break;
          case 'fabric_get_workspace_items':
            result = await this.fabricGetWorkspaceItems(args);
            break;

          // Semantic Models
          case 'fabric_get_semantic_model':
            result = await this.fabricGetSemanticModel(args);
            break;
          case 'fabric_get_model_refresh_history':
            result = await this.fabricGetModelRefreshHistory(args);
            break;
          case 'fabric_get_model_measures':
            result = await this.fabricGetModelMeasures(args);
            break;

          // Pipelines
          case 'fabric_list_pipelines':
            result = await this.fabricListPipelines(args);
            break;
          case 'fabric_get_pipeline':
            result = await this.fabricGetPipeline(args);
            break;
          case 'fabric_get_pipeline_runs':
            result = await this.fabricGetPipelineRuns(args);
            break;

          // Notebooks
          case 'fabric_list_notebooks':
            result = await this.fabricListNotebooks(args);
            break;
          case 'fabric_get_notebook':
            result = await this.fabricGetNotebook(args);
            break;

          // Lakehouses
          case 'fabric_list_lakehouses':
            result = await this.fabricListLakehouses(args);
            break;
          case 'fabric_get_lakehouse_tables':
            result = await this.fabricGetLakehouseTables(args);
            break;

          // Synapse
          case 'synapse_list_pipelines':
            result = await this.synapseListPipelines(args);
            break;
          case 'synapse_get_pipeline':
            result = await this.synapseGetPipeline(args);
            break;
          case 'synapse_list_spark_pools':
            result = await this.synapseListSparkPools(args);
            break;
          case 'synapse_get_notebook':
            result = await this.synapseGetNotebook(args);
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
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

  // ============================================
  // FABRIC WORKSPACE METHODS
  // ============================================

  private async fabricListWorkspaces(): Promise<any> {
    const response = await this.powerBiApi.get('/groups');
    return response.data.value.map((ws: any) => ({
      id: ws.id,
      name: ws.name,
      type: ws.type,
      state: ws.state,
    }));
  }

  private async fabricGetWorkspaceItems(args: any): Promise<any> {
    const { workspace, item_type } = args;
    
    // Get workspace ID
    const workspaces = await this.fabricListWorkspaces();
    const ws = workspaces.find((w: any) => w.name === workspace || w.id === workspace);
    if (!ws) throw new Error(`Workspace not found: ${workspace}`);

    // Get items
    const response = await this.powerBiApi.get(`/groups/${ws.id}/datasets`);
    let items = response.data.value.map((item: any) => ({
      id: item.id,
      name: item.name,
      type: 'SemanticModel',
      lastModified: item.configuredBy,
    }));

    if (item_type) {
      items = items.filter((i: any) => i.type === item_type);
    }

    return items;
  }

  // ============================================
  // SEMANTIC MODEL METHODS
  // ============================================

  private async fabricGetSemanticModel(args: any): Promise<any> {
    const { workspace, model } = args;
    
    // Simplified implementation - in production would use XMLA endpoint
    return {
      name: model,
      tables: [],
      relationships: [],
      message: 'Full XMLA implementation required for complete model inspection',
    };
  }

  private async fabricGetModelRefreshHistory(args: any): Promise<any> {
    const { workspace, model, top = 10 } = args;
    
    const workspaces = await this.fabricListWorkspaces();
    const ws = workspaces.find((w: any) => w.name === workspace || w.id === workspace);
    if (!ws) throw new Error(`Workspace not found: ${workspace}`);

    const datasets = await this.powerBiApi.get(`/groups/${ws.id}/datasets`);
    const dataset = datasets.data.value.find((d: any) => d.name === model || d.id === model);
    if (!dataset) throw new Error(`Model not found: ${model}`);

    const response = await this.powerBiApi.get(`/groups/${ws.id}/datasets/${dataset.id}/refreshes?$top=${top}`);
    
    return response.data.value.map((r: any) => ({
      refreshId: r.requestId,
      startTime: r.startTime,
      endTime: r.endTime,
      status: r.status,
      duration: r.endTime ? new Date(r.endTime).getTime() - new Date(r.startTime).getTime() : undefined,
      errorMessage: r.serviceExceptionJson,
    }));
  }

  private async fabricGetModelMeasures(args: any): Promise<any> {
    const { workspace, model, table } = args;
    
    // Simplified - would require XMLA endpoint in production
    return {
      model,
      measures: [],
      message: 'Full XMLA implementation required for measure extraction',
    };
  }

  // ============================================
  // PIPELINE METHODS (Simplified)
  // ============================================

  private async fabricListPipelines(args: any): Promise<any> {
    const { workspace } = args;
    
    return {
      workspace,
      pipelines: [],
      message: 'Fabric Pipelines API integration required',
    };
  }

  private async fabricGetPipeline(args: any): Promise<any> {
    const { workspace, pipeline } = args;
    
    return {
      name: pipeline,
      activities: [],
      message: 'Fabric Pipelines API integration required',
    };
  }

  private async fabricGetPipelineRuns(args: any): Promise<any> {
    const { workspace, pipeline, top = 10 } = args;
    
    return {
      pipeline,
      runs: [],
      message: 'Fabric Pipelines API integration required',
    };
  }

  // ============================================
  // NOTEBOOK METHODS (Simplified)
  // ============================================

  private async fabricListNotebooks(args: any): Promise<any> {
    const { workspace } = args;
    
    return {
      workspace,
      notebooks: [],
      message: 'Fabric Notebooks API integration required',
    };
  }

  private async fabricGetNotebook(args: any): Promise<any> {
    const { workspace, notebook } = args;
    
    return {
      name: notebook,
      cells: [],
      message: 'Fabric Notebooks API integration required',
    };
  }

  // ============================================
  // LAKEHOUSE METHODS (Simplified)
  // ============================================

  private async fabricListLakehouses(args: any): Promise<any> {
    const { workspace } = args;
    
    return {
      workspace,
      lakehouses: [],
      message: 'Fabric Lakehouses API integration required',
    };
  }

  private async fabricGetLakehouseTables(args: any): Promise<any> {
    const { workspace, lakehouse } = args;
    
    return {
      lakehouse,
      tables: [],
      message: 'Fabric Lakehouses API integration required',
    };
  }

  // ============================================
  // SYNAPSE METHODS (Simplified)
  // ============================================

  private async synapseListPipelines(args: any): Promise<any> {
    const { workspace } = args;
    
    if (!this.config.synapse_workspace) {
      throw new Error('Synapse workspace not configured');
    }

    return {
      workspace,
      pipelines: [],
      message: 'Synapse API integration required',
    };
  }

  private async synapseGetPipeline(args: any): Promise<any> {
    const { workspace, pipeline } = args;
    
    return {
      name: pipeline,
      activities: [],
      message: 'Synapse API integration required',
    };
  }

  private async synapseListSparkPools(args: any): Promise<any> {
    const { workspace } = args;
    
    return {
      workspace,
      sparkPools: [],
      message: 'Synapse API integration required',
    };
  }

  private async synapseGetNotebook(args: any): Promise<any> {
    const { workspace, notebook } = args;
    
    return {
      name: notebook,
      cells: [],
      message: 'Synapse API integration required',
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('Server running on stdio');
  }
}

// Main entry point
async function main() {
  try {
    const config = await loadConfigFromEnv('CONFIG_PATH', {
      schema: ConfigSchema,
      defaults: {},
    });

    const server = new FabricLiveServer(config);
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
