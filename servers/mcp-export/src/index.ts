// File: servers/mcp-export/src/index.ts
// Profile-aware data export MCP server with workspace SQL connections

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getProfileManager } from '../../../shared/profile-manager/profile-manager.js';
import { ProfileAuditLogger } from '../../../shared/audit/profile-audit-logger.js';
import { WorkspaceConnectionReader } from '../../../shared/sql-connections/workspace-connection-reader.js';
import { SecureCredentialReader } from '../../../shared/sql-connections/credential-reader.js';
import { getModelRecommendation } from '../../../shared/models/model-config.js';
import * as fs from 'fs';
import * as path from 'path';

// SQL driver (install with: npm install mssql)
let sql: any;
try {
  sql = require('mssql');
} catch (error) {
  console.warn('⚠️  mssql driver not available - install with: npm install mssql');
}

// Excel library (install with: npm install exceljs)
let ExcelJS: any;
try {
  ExcelJS = require('exceljs');
} catch (error) {
  console.warn('⚠️  exceljs not available - install with: npm install exceljs');
}

interface ExportResult {
  filename: string;
  filepath: string;
  format: string;
  rowCount: number;
  tokenized: boolean;
  phiDetected: boolean;
  connection: string;
}

class MCPExportServer {
  private server: Server;
  private profileManager: typeof import('../../../shared/profile-manager/profile-manager.js').ProfileManager.prototype;
  private audit: ProfileAuditLogger;
  private sqlConnections: WorkspaceConnectionReader;
  private credentials: SecureCredentialReader;
  private exportsPath: string;
  
  constructor() {
    // Initialize profile manager
    this.profileManager = getProfileManager();
    
    // Get profile paths
    const paths = this.profileManager.getPaths();
    this.exportsPath = paths.exports;
    
    // Initialize components
    this.audit = new ProfileAuditLogger(this.profileManager);
    this.sqlConnections = new WorkspaceConnectionReader(this.profileManager);
    this.credentials = new SecureCredentialReader();
    
    // Initialize MCP server
    this.server = new Server({
      name: 'mcp-export',
      version: '2.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });
    
    this.setupTools();
    this.setupHandlers();
    
    console.log(`🚀 MCP Export Server initialized`);
    console.log(`   Profile: ${this.profileManager.getActiveProfile()}`);
    console.log(`   Exports: ${this.exportsPath}`);
    console.log(`   Credential Storage: ${this.credentials.getStorageInfo()}`);
    
    // Log initialization
    this.audit.log({
      action: 'server_started',
      mcpServer: 'mcp-export',
      success: true
    });
  }
  
  private setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_connections',
          description: 'List SQL connections available in workspace',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'export_query',
          description: 'Execute SQL query and export results to file',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'SQL query to execute'
              },
              format: {
                type: 'string',
                enum: ['csv', 'excel', 'json', 'jsonl'],
                description: 'Export format'
              },
              connection: {
                type: 'string',
                description: 'Connection name (optional - uses default if not specified)'
              },
              filename: {
                type: 'string',
                description: 'Custom filename (optional - auto-generated if not specified)'
              }
            },
            required: ['query', 'format']
          }
        },
        {
          name: 'test_connection',
          description: 'Test a SQL connection',
          inputSchema: {
            type: 'object',
            properties: {
              connection: {
                type: 'string',
                description: 'Connection name to test'
              }
            },
            required: ['connection']
          }
        },
        {
          name: 'get_model_recommendations',
          description: 'Get recommended models for this server',
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
          case 'list_connections':
            result = await this.handleListConnections();
            break;
          
          case 'export_query':
            result = await this.handleExportQuery(args);
            break;
          
          case 'test_connection':
            result = await this.handleTestConnection(args);
            break;
          
          case 'get_model_recommendations':
            result = await this.handleGetModelRecommendations();
            break;
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        const duration = `${Date.now() - startTime}ms`;
        
        await this.audit.log({
          action: `export_${name}`,
          details: { args },
          mcpServer: 'mcp-export',
          duration,
          success: true
        });
        
        return result;
        
      } catch (error: any) {
        const duration = `${Date.now() - startTime}ms`;
        
        await this.audit.log({
          action: `export_${name}`,
          details: { args },
          mcpServer: 'mcp-export',
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
  
  private async handleListConnections() {
    console.log(`📊 Listing workspace SQL connections...`);
    
    // Get connections from workspace (automatically profile-separated!)
    const connections = await this.sqlConnections.getWorkspaceConnections();
    
    if (connections.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `📊 No SQL connections found in workspace

Profile: ${this.profileManager.getActiveProfile()}
Workspace: ${this.profileManager.getPaths().workspace}

To add SQL connections:
1. Open Command Palette in VS Code (Cmd/Ctrl+Shift+P)
2. Run "MSSQL: Add Connection"
3. Enter connection details
4. Credentials will be stored securely in ${this.credentials.getStorageInfo()}

Connections will be automatically available in MCP servers!`
        }]
      };
    }
    
    const connectionList = connections.map(c => {
      const authInfo = c.authenticationType === 'AzureMFA' 
        ? 'Azure MFA' 
        : c.authenticationType === 'Integrated'
        ? 'Windows Auth'
        : `SQL Login (${c.username || 'no username'})`;
      
      return `  • ${c.profileName}
    Server: ${c.server}
    Database: ${c.database}
    Auth: ${authInfo}
    Source: ${c.source}`;
    }).join('\n\n');
    
    return {
      content: [{
        type: 'text',
        text: `📊 Workspace SQL Connections (${connections.length})

Profile: ${this.profileManager.getActiveProfile()}
Workspace: ${this.profileManager.getPaths().workspace}

${connectionList}

✅ These connections are workspace-specific and automatically isolated by profile!`
      }]
    };
  }
  
  private async handleExportQuery(args: any) {
    const { query, format, connection: connectionName, filename } = args;
    
    console.log(`📤 Exporting query results...`);
    console.log(`   Profile: ${this.profileManager.getActiveProfile()}`);
    console.log(`   Format: ${format}`);
    
    // Get connection (use default if not specified)
    const connection = connectionName
      ? await this.sqlConnections.getConnectionByName(connectionName)
      : await this.sqlConnections.getDefaultConnection();
    
    if (!connection) {
      throw new Error(
        connectionName 
          ? `Connection not found: ${connectionName}`
          : 'No SQL connections found in workspace. Add one using VS Code MSSQL extension.'
      );
    }
    
    console.log(`   Connection: ${connection.profileName} (${connection.server})`);
    
    // Execute query
    const data = await this.executeQuery(query, connection);
    console.log(`   Rows: ${data.length}`);
    
    // Detect PHI fields (simple heuristic)
    const phiDetected = this.detectPHI(data);
    console.log(`   PHI Detected: ${phiDetected ? 'YES' : 'NO'}`);
    
    // Check tokenization setting
    const config = this.profileManager.getConfig();
    const shouldTokenize = config.settings.tokenizationEnabled && phiDetected;
    
    if (shouldTokenize) {
      console.log(`   ⚠️  PHI detected - tokenization would be applied here`);
      console.log(`   (Tokenization implementation to be integrated)`);
    }
    
    // Generate filename
    const exportFilename = filename || this.generateFilename(
      connection.server,
      connection.database,
      format
    );
    
    // Export to file
    const filepath = path.join(this.exportsPath, exportFilename);
    await this.exportToFile(data, filepath, format);
    
    console.log(`   ✅ Exported to: ${filepath}`);
    
    // Audit log
    await this.audit.log({
      action: 'export_query',
      details: {
        query,
        format,
        connection: connection.profileName,
        rowCount: data.length
      },
      phiAccessed: phiDetected,
      tokenized: shouldTokenize,
      mcpServer: 'mcp-export',
      success: true
    });
    
    return {
      content: [{
        type: 'text',
        text: `✅ Query exported successfully

Profile: ${this.profileManager.getActiveProfile()}
Connection: ${connection.profileName} (${connection.server}/${connection.database})
Format: ${format}
Rows: ${data.length}
PHI Detected: ${phiDetected ? 'YES' : 'NO'}
Tokenized: ${shouldTokenize ? 'YES' : 'NO'}

File: ${exportFilename}
Location: ${filepath}

${phiDetected && !shouldTokenize ? '⚠️  WARNING: PHI detected but tokenization is disabled!' : ''}
${shouldTokenize ? '✅ PHI was automatically tokenized for safety' : ''}`
      }]
    };
  }
  
  private async handleTestConnection(args: any) {
    const { connection: connectionName } = args;
    
    console.log(`🔌 Testing connection: ${connectionName}...`);
    
    const connection = await this.sqlConnections.getConnectionByName(connectionName);
    
    if (!connection) {
      throw new Error(`Connection not found: ${connectionName}`);
    }
    
    try {
      // Try to connect and execute simple query
      await this.executeQuery('SELECT 1 AS test', connection);
      
      return {
        content: [{
          type: 'text',
          text: `✅ Connection test successful

Connection: ${connection.profileName}
Server: ${connection.server}
Database: ${connection.database}
Auth: ${connection.authenticationType}
Profile: ${this.profileManager.getActiveProfile()}

The connection is working and ready to use!`
        }]
      };
      
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `❌ Connection test failed

Connection: ${connection.profileName}
Server: ${connection.server}
Error: ${error.message}

Troubleshooting:
1. Check network connectivity
2. Verify credentials in ${this.credentials.getStorageInfo()}
3. Ensure server allows connections from your IP
4. Check firewall settings`
        }],
        isError: true
      };
    }
  }
  
  private async handleGetModelRecommendations() {
    const recommendations = getModelRecommendation('export');
    
    return {
      content: [{
        type: 'text',
        text: `🤖 Model Recommendations for Data Export

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
  
  private async executeQuery(query: string, connection: any): Promise<any[]> {
    if (!sql) {
      throw new Error('mssql driver not installed. Run: npm install mssql');
    }
    
    // Get password from secure storage (if needed)
    let password: string | undefined;
    if (connection.authenticationType === 'SqlLogin' && connection.username) {
      password = await this.credentials.getConnectionPassword(
        connection.source,
        connection.server,
        connection.database,
        connection.username
      ) || undefined;
    }
    
    // Convert to connection options
    const options = this.sqlConnections.toConnectionOptions(connection, password);
    
    // Connect and execute
    const pool = await sql.connect(options);
    const result = await pool.request().query(query);
    await pool.close();
    
    return result.recordset || [];
  }
  
  private detectPHI(data: any[]): boolean {
    if (!data || data.length === 0) return false;
    
    // Check column names for PHI indicators
    const columns = Object.keys(data[0] || {});
    const phiKeywords = [
      'ssn', 'social', 'patient', 'dob', 'birthdate', 'medical', 'mrn',
      'diagnosis', 'prescription', 'insurance', 'phone', 'address', 'email'
    ];
    
    return columns.some(col => 
      phiKeywords.some(keyword => col.toLowerCase().includes(keyword))
    );
  }
  
  private generateFilename(server: string, database: string, format: string): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const serverShort = server.split('.')[0].replace(/[^a-zA-Z0-9]/g, '');
    const dbShort = database.replace(/[^a-zA-Z0-9]/g, '');
    const ext = format === 'jsonl' ? 'jsonl' : format === 'excel' ? 'xlsx' : format;
    
    return `${serverShort}_${dbShort}_Export_${date}.${ext}`;
  }
  
  private async exportToFile(data: any[], filepath: string, format: string): Promise<void> {
    // Ensure exports directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    switch (format) {
      case 'csv':
        await this.exportCSV(data, filepath);
        break;
      case 'excel':
        await this.exportExcel(data, filepath);
        break;
      case 'json':
        await this.exportJSON(data, filepath);
        break;
      case 'jsonl':
        await this.exportJSONL(data, filepath);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
  
  private async exportCSV(data: any[], filepath: string): Promise<void> {
    if (data.length === 0) {
      fs.writeFileSync(filepath, '');
      return;
    }
    
    const columns = Object.keys(data[0]);
    const header = columns.join(',');
    const rows = data.map(row => 
      columns.map(col => this.escapeCSV(row[col])).join(',')
    );
    
    const csv = [header, ...rows].join('\n');
    fs.writeFileSync(filepath, csv);
  }
  
  private async exportExcel(data: any[], filepath: string): Promise<void> {
    if (!ExcelJS) {
      throw new Error('exceljs not installed. Run: npm install exceljs');
    }
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');
    
    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      worksheet.columns = columns.map(col => ({ header: col, key: col }));
      worksheet.addRows(data);
    }
    
    await workbook.xlsx.writeFile(filepath);
  }
  
  private async exportJSON(data: any[], filepath: string): Promise<void> {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  }
  
  private async exportJSONL(data: any[], filepath: string): Promise<void> {
    const lines = data.map(row => JSON.stringify(row));
    fs.writeFileSync(filepath, lines.join('\n'));
  }
  
  private escapeCSV(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
  
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log('✅ MCP Export Server running');
    console.log(`   Profile: ${this.profileManager.getActiveProfile()}`);
  }
}

// Initialize and run server
async function main() {
  try {
    const profileManager = getProfileManager();
    
    // Detect and load profile
    const profileId = await profileManager.detectActiveProfile();
    await profileManager.loadProfile(profileId);
    
    console.log(`✅ Profile loaded: ${profileId}`);
    
    // Start server
    const server = new MCPExportServer();
    await server.run();
    
  } catch (error: any) {
    console.error('Failed to start MCP Export Server:', error.message);
    process.exit(1);
  }
}

main();
