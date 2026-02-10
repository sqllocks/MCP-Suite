import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as path from 'path';
import { config, createLogger, createModelManager, createToolDefinition, createTextContent, createErrorResponse } from '@mcp-suite/shared';
// CRITICAL: Redirect console to stderr FIRST to prevent JSON-RPC corruption
console.log = console.error;
console.info = console.error;
console.warn = console.error;
const SERVER_NAME = 'mcp-orchestrator-v1';
class MCPOrchestrator {
    constructor() {
        this.requestCount = 0;
        this.registeredServers = new Map();
        this.startTime = new Date();
        // Logger writes to stderr (no stdout pollution)
        this.logger = createLogger({
            serviceName: SERVER_NAME,
            level: process.env.LOG_LEVEL || 'info',
            logToFile: true,
            logDir: path.join(config.getWorkspace(), 'logs')
        });
        this.modelManager = createModelManager(config.getOllamaUrl(), this.logger, config.getModelForServer(SERVER_NAME));
        this.server = new Server({
            name: SERVER_NAME,
            version: '3.0.0'
        }, {
            capabilities: {
                tools: {}
            }
        });
        this.setupHandlers();
        this.logger.info(`${SERVER_NAME} initialized`);
    }
    setupHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    createToolDefinition('get_status', 'Get orchestrator status including uptime, registered servers, and system info', {
                        includeServers: {
                            type: 'boolean',
                            description: 'Include list of registered servers in response'
                        }
                    }, []),
                    createToolDefinition('register_server', 'Register a new MCP server with the orchestrator', {
                        name: {
                            type: 'string',
                            description: 'Server name (e.g., mcp-error-diagnosis)'
                        },
                        port: {
                            type: 'number',
                            description: 'Server port number (optional for MCP servers)'
                        },
                        model: {
                            type: 'string',
                            description: 'Model used by the server (optional)'
                        },
                        capabilities: {
                            type: 'array',
                            description: 'List of server capabilities (optional)',
                            items: { type: 'string' }
                        }
                    }, ['name']),
                    createToolDefinition('list_servers', 'List all registered MCP servers', {
                        statusFilter: {
                            type: 'string',
                            description: 'Filter by status (online, offline, all)',
                            enum: ['online', 'offline', 'all']
                        }
                    }, []),
                    createToolDefinition('get_server_info', 'Get detailed information about a specific registered server', {
                        name: {
                            type: 'string',
                            description: 'Name of the server to query'
                        }
                    }, ['name'])
                ]
            };
        });
        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            this.requestCount++;
            switch (name) {
                case 'get_status':
                    return await this.handleGetStatus(args);
                case 'register_server':
                    return await this.handleRegisterServer(args);
                case 'list_servers':
                    return await this.handleListServers(args);
                case 'get_server_info':
                    return await this.handleGetServerInfo(args);
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        });
    }
    async handleGetStatus(args) {
        try {
            const { includeServers = true } = args;
            const uptime = Date.now() - this.startTime.getTime();
            const memUsage = process.memoryUsage();
            const status = {
                profile: config.getCurrentProfileName(),
                workspace: config.getWorkspace(),
                platform: process.platform,
                model: this.modelManager.getCurrentModel(),
                uptime: `${Math.floor(uptime / 1000)}s`,
                uptimeMs: uptime,
                requestCount: this.requestCount,
                registeredServers: this.registeredServers.size,
                memory: {
                    used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
                    total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
                },
                criticalMode: config.isCriticalMode(),
                timestamp: new Date().toISOString()
            };
            let response = JSON.stringify(status, null, 2);
            if (includeServers && this.registeredServers.size > 0) {
                const servers = Array.from(this.registeredServers.values());
                response += '\n\nRegistered Servers:\n';
                response += JSON.stringify(servers, null, 2);
            }
            this.logger.info('Status retrieved', {
                tool: 'get_status',
                includeServers,
                serverCount: this.registeredServers.size
            });
            return createTextContent(response);
        }
        catch (error) {
            this.logger.error('Status retrieval failed', {
                tool: 'get_status',
                error: error.message
            });
            return createErrorResponse(error);
        }
    }
    async handleRegisterServer(args) {
        const { name, port, model, capabilities } = args;
        if (!name) {
            return createErrorResponse('Missing required parameter: name');
        }
        try {
            const serverInfo = {
                name,
                port,
                model,
                capabilities: capabilities || [],
                registeredAt: new Date(),
                status: 'online'
            };
            this.registeredServers.set(name, serverInfo);
            this.logger.info('Server registered', {
                tool: 'register_server',
                serverName: name,
                port,
                model
            });
            const response = {
                success: true,
                message: `Server '${name}' registered successfully`,
                server: serverInfo,
                totalServers: this.registeredServers.size,
                timestamp: new Date().toISOString()
            };
            return createTextContent(JSON.stringify(response, null, 2));
        }
        catch (error) {
            this.logger.error('Server registration failed', {
                tool: 'register_server',
                serverName: name,
                error: error.message
            });
            return createErrorResponse(error);
        }
    }
    async handleListServers(args) {
        try {
            const { statusFilter = 'all' } = args;
            let servers = Array.from(this.registeredServers.values());
            if (statusFilter !== 'all') {
                servers = servers.filter(s => s.status === statusFilter);
            }
            const response = {
                servers,
                total: servers.length,
                online: servers.filter(s => s.status === 'online').length,
                offline: servers.filter(s => s.status === 'offline').length,
                filter: statusFilter,
                timestamp: new Date().toISOString()
            };
            this.logger.info('Servers listed', {
                tool: 'list_servers',
                filter: statusFilter,
                count: servers.length
            });
            return createTextContent(JSON.stringify(response, null, 2));
        }
        catch (error) {
            this.logger.error('Server listing failed', {
                tool: 'list_servers',
                error: error.message
            });
            return createErrorResponse(error);
        }
    }
    async handleGetServerInfo(args) {
        const { name } = args;
        if (!name) {
            return createErrorResponse('Missing required parameter: name');
        }
        try {
            const server = this.registeredServers.get(name);
            if (!server) {
                return createErrorResponse(`Server '${name}' not found in registry`);
            }
            this.logger.info('Server info retrieved', {
                tool: 'get_server_info',
                serverName: name
            });
            return createTextContent(JSON.stringify(server, null, 2));
        }
        catch (error) {
            this.logger.error('Server info retrieval failed', {
                tool: 'get_server_info',
                serverName: name,
                error: error.message
            });
            return createErrorResponse(error);
        }
    }
    async start() {
        try {
            // Check Ollama health
            const isHealthy = await this.modelManager.checkHealth();
            if (!isHealthy) {
                this.logger.warn('Ollama not available, starting anyway');
            }
            const transport = new StdioServerTransport();
            await this.server.connect(transport);
            this.logger.info(`${SERVER_NAME} MCP server started`, {
                model: this.modelManager.getCurrentModel(),
                tools: ['get_status', 'register_server', 'list_servers', 'get_server_info']
            });
        }
        catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }
}
const orchestrator = new MCPOrchestrator();
orchestrator.start();
export default MCPOrchestrator;
//# sourceMappingURL=index.js.map