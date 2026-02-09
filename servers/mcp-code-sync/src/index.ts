// File: servers/mcp-code-sync/src/index.ts
// Profile-aware code synchronization MCP server

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getProfileManager } from '../../../shared/profile-manager/profile-manager.js';
import { ProfileAuditLogger } from '../../../shared/audit/profile-audit-logger.js';
import { getModelRecommendation } from '../../../shared/models/model-config.js';
import * as fs from 'fs';
import * as path from 'path';

interface ArtifactMetadata {
  id: string;
  name: string;
  type: 'notebook' | 'pipeline' | 'warehouse' | 'lakehouse' | 'semantic_model';
  source: 'fabric' | 'devops' | 'github';
  path: string;
  content?: string;
  lastModified: string;
  size: number;
}

class MCPCodeSyncServer {
  private server: Server;
  private profileManager: typeof import('../../../shared/profile-manager/profile-manager.js').ProfileManager.prototype;
  private audit: ProfileAuditLogger;
  private codeContextPath: string;
  
  constructor() {
    // Initialize profile manager
    this.profileManager = getProfileManager();
    
    // Get profile paths
    const paths = this.profileManager.getPaths();
    this.codeContextPath = paths.codeContext;
    
    // Initialize audit logger
    this.audit = new ProfileAuditLogger(this.profileManager);
    
    // Initialize MCP server
    this.server = new Server({
      name: 'mcp-code-sync',
      version: '2.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });
    
    this.setupTools();
    this.setupHandlers();
    
    console.log(`🚀 MCP Code-Sync Server initialized`);
    console.log(`   Profile: ${this.profileManager.getActiveProfile()}`);
    console.log(`   Code Context: ${this.codeContextPath}`);
    
    // Log initialization
    this.audit.log({
      action: 'server_started',
      mcpServer: 'mcp-code-sync',
      success: true
    });
  }
  
  private setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'sync_code',
          description: 'Sync code from sources (Fabric, DevOps, GitHub) to local cache',
          inputSchema: {
            type: 'object',
            properties: {
              source: {
                type: 'string',
                enum: ['fabric', 'devops', 'github', 'all'],
                description: 'Source to sync from'
              }
            }
          }
        },
        {
          name: 'list_artifacts',
          description: 'List all cached artifacts',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['notebook', 'pipeline', 'warehouse', 'lakehouse', 'semantic_model'],
                description: 'Filter by artifact type (optional)'
              }
            }
          }
        },
        {
          name: 'get_artifact',
          description: 'Get specific artifact content',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Artifact name'
              }
            },
            required: ['name']
          }
        },
        {
          name: 'search_artifacts',
          description: 'Search for artifacts by name or content',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query'
              }
            },
            required: ['query']
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
          case 'sync_code':
            result = await this.handleSyncCode(args);
            break;
          
          case 'list_artifacts':
            result = await this.handleListArtifacts(args);
            break;
          
          case 'get_artifact':
            result = await this.handleGetArtifact(args);
            break;
          
          case 'search_artifacts':
            result = await this.handleSearchArtifacts(args);
            break;
          
          case 'get_model_recommendations':
            result = await this.handleGetModelRecommendations();
            break;
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        const duration = `${Date.now() - startTime}ms`;
        
        // Audit successful operation
        await this.audit.log({
          action: `code_sync_${name}`,
          details: { args },
          mcpServer: 'mcp-code-sync',
          duration,
          success: true
        });
        
        return result;
        
      } catch (error: any) {
        const duration = `${Date.now() - startTime}ms`;
        
        // Audit failed operation
        await this.audit.log({
          action: `code_sync_${name}`,
          details: { args },
          mcpServer: 'mcp-code-sync',
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
  
  private async handleSyncCode(args: any) {
    const source = args?.source || 'all';
    
    console.log(`📥 Syncing code from ${source}...`);
    
    // Mock implementation - in production, integrate with actual APIs
    const artifacts: ArtifactMetadata[] = [
      {
        id: 'notebook-1',
        name: 'DataProcessing',
        type: 'notebook',
        source: 'fabric',
        path: path.join(this.codeContextPath, 'fabric', 'DataProcessing.ipynb'),
        content: '# Sample notebook\nimport pandas as pd',
        lastModified: new Date().toISOString(),
        size: 1024
      },
      {
        id: 'pipeline-1',
        name: 'DailyRefresh',
        type: 'pipeline',
        source: 'fabric',
        path: path.join(this.codeContextPath, 'fabric', 'DailyRefresh.json'),
        content: '{"activities": [{"name": "CopyData"}]}',
        lastModified: new Date().toISOString(),
        size: 512
      }
    ];
    
    // Save artifacts to cache
    for (const artifact of artifacts) {
      await this.saveArtifact(artifact);
    }
    
    return {
      content: [{
        type: 'text',
        text: `✅ Code sync completed

Source: ${source}
Artifacts synced: ${artifacts.length}
Profile: ${this.profileManager.getActiveProfile()}
Cache location: ${this.codeContextPath}

Artifacts:
${artifacts.map(a => `  • ${a.name} (${a.type})`).join('\n')}`
      }]
    };
  }
  
  private async handleListArtifacts(args: any) {
    const typeFilter = args?.type;
    
    const artifacts = await this.listArtifacts();
    const filtered = typeFilter 
      ? artifacts.filter(a => a.type === typeFilter)
      : artifacts;
    
    return {
      content: [{
        type: 'text',
        text: `📦 Cached Artifacts (${filtered.length})

Profile: ${this.profileManager.getActiveProfile()}
${typeFilter ? `Type: ${typeFilter}` : 'All types'}

${filtered.map(a => `• ${a.name} (${a.type}) - ${a.source}`).join('\n') || 'No artifacts found'}`
      }]
    };
  }
  
  private async handleGetArtifact(args: any) {
    const name = args.name;
    
    const artifacts = await this.listArtifacts();
    const artifact = artifacts.find(a => a.name === name);
    
    if (!artifact) {
      return {
        content: [{
          type: 'text',
          text: `❌ Artifact not found: ${name}`
        }]
      };
    }
    
    // Load content
    if (fs.existsSync(artifact.path)) {
      artifact.content = fs.readFileSync(artifact.path, 'utf8');
    }
    
    return {
      content: [{
        type: 'text',
        text: `📄 Artifact: ${artifact.name}

Type: ${artifact.type}
Source: ${artifact.source}
Profile: ${this.profileManager.getActiveProfile()}
Last Modified: ${artifact.lastModified}
Size: ${artifact.size} bytes

Content:
${artifact.content || '(no content available)'}`
      }]
    };
  }
  
  private async handleSearchArtifacts(args: any) {
    const query = args.query.toLowerCase();
    
    const artifacts = await this.listArtifacts();
    const results = artifacts.filter(a =>
      a.name.toLowerCase().includes(query) ||
      a.id.toLowerCase().includes(query) ||
      a.content?.toLowerCase().includes(query)
    );
    
    return {
      content: [{
        type: 'text',
        text: `🔍 Search results for "${args.query}": (${results.length})

Profile: ${this.profileManager.getActiveProfile()}

${results.map(a => `• ${a.name} (${a.type}) - ${a.source}`).join('\n') || 'No matches found'}`
      }]
    };
  }
  
  private async handleGetModelRecommendations() {
    const recommendations = getModelRecommendation('codeSync');
    
    return {
      content: [{
        type: 'text',
        text: `🤖 Model Recommendations for Code Sync

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
  
  private async saveArtifact(artifact: ArtifactMetadata): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(artifact.path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Save content
    if (artifact.content) {
      fs.writeFileSync(artifact.path, artifact.content);
    }
    
    // Save metadata
    const metadataPath = path.join(this.codeContextPath, 'metadata', `${artifact.name}.json`);
    const metadataDir = path.dirname(metadataPath);
    if (!fs.existsSync(metadataDir)) {
      fs.mkdirSync(metadataDir, { recursive: true });
    }
    fs.writeFileSync(metadataPath, JSON.stringify(artifact, null, 2));
  }
  
  private async listArtifacts(): Promise<ArtifactMetadata[]> {
    const metadataDir = path.join(this.codeContextPath, 'metadata');
    
    if (!fs.existsSync(metadataDir)) {
      return [];
    }
    
    const files = fs.readdirSync(metadataDir);
    const artifacts: ArtifactMetadata[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = fs.readFileSync(path.join(metadataDir, file), 'utf8');
        artifacts.push(JSON.parse(content));
      }
    }
    
    return artifacts;
  }
  
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log('✅ MCP Code-Sync Server running');
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
    const server = new MCPCodeSyncServer();
    await server.run();
    
  } catch (error: any) {
    console.error('Failed to start MCP Code-Sync Server:', error.message);
    process.exit(1);
  }
}

main();
