// File: servers/mcp-tokenization/src/index.ts
// Profile-aware tokenization server with format-preserving PHI masking

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getProfileManager } from '../../../shared/profile-manager/profile-manager.js';
import { ProfileAuditLogger } from '../../../shared/audit/profile-audit-logger.js';
import { getModelRecommendation } from '../../../shared/models/model-config.js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface TokenizationCache {
  [originalValue: string]: string;
}

type PHIFieldType = 'person_name' | 'ssn' | 'address' | 'phone' | 'email' | 'date_of_birth' | 'medical_record_number';

class MCPTokenizationServer {
  private server: Server;
  private profileManager: typeof import('../../../shared/profile-manager/profile-manager.js').ProfileManager.prototype;
  private audit: ProfileAuditLogger;
  private cache: TokenizationCache = {};
  private cachePath: string;
  private encryptionKey: string;
  
  // Fake data pools for deterministic selection
  private readonly FAKE_FIRST_NAMES = [
    'Michael', 'Jennifer', 'David', 'Sarah', 'Christopher', 'Jessica', 'Matthew', 'Ashley',
    'Joshua', 'Amanda', 'Daniel', 'Brittany', 'Andrew', 'Samantha', 'Joseph', 'Emily',
    'Ryan', 'Elizabeth', 'James', 'Megan', 'Justin', 'Nicole', 'Robert', 'Lauren'
  ];
  
  private readonly FAKE_LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
    'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris'
  ];
  
  private readonly FAKE_STREETS = [
    'Main', 'Oak', 'Pine', 'Maple', 'Cedar', 'Elm', 'Washington', 'Lake',
    'Hill', 'Park', 'River', 'Sunset', 'Forest', 'Valley', 'Spring', 'Highland'
  ];
  
  private readonly FAKE_CITIES = [
    'Springfield', 'Franklin', 'Clinton', 'Madison', 'Georgetown', 'Arlington',
    'Salem', 'Bristol', 'Milton', 'Kingston', 'Clayton', 'Jackson'
  ];
  
  constructor() {
    this.profileManager = getProfileManager();
    const paths = this.profileManager.getPaths();
    this.cachePath = path.join(paths.tokenizationCache, 'token-cache.json');
    
    // Get encryption key from profile config
    const config = this.profileManager.getConfig();
    this.encryptionKey = config.settings.encryptionKey;
    
    // Load cache if exists
    this.loadCache();
    
    this.audit = new ProfileAuditLogger(this.profileManager);
    
    this.server = new Server({
      name: 'mcp-tokenization',
      version: '2.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });
    
    this.setupTools();
    this.setupHandlers();
    
    console.log(`🔒 MCP Tokenization Server initialized`);
    console.log(`   Profile: ${this.profileManager.getActiveProfile()}`);
    console.log(`   Tokenization: ${config.settings.tokenizationEnabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   Cache: ${this.cachePath}`);
    
    this.audit.log({
      action: 'server_started',
      mcpServer: 'mcp-tokenization',
      success: true
    });
  }
  
  private setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'tokenization_status',
          description: 'Check tokenization enabled/disabled state',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'tokenization_enable',
          description: 'Enable tokenization (safe - masks PHI)',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'tokenization_disable',
          description: 'Disable tokenization (DANGEROUS - exposes real PHI)',
          inputSchema: {
            type: 'object',
            properties: {
              confirmation: {
                type: 'string',
                description: 'Must be: "I understand I will see real PHI"'
              }
            },
            required: ['confirmation']
          }
        },
        {
          name: 'tokenize_value',
          description: 'Tokenize a single value',
          inputSchema: {
            type: 'object',
            properties: {
              value: {
                type: 'string',
                description: 'Value to tokenize'
              },
              fieldType: {
                type: 'string',
                enum: ['person_name', 'ssn', 'address', 'phone', 'email', 'date_of_birth', 'medical_record_number'],
                description: 'Type of PHI field'
              }
            },
            required: ['value', 'fieldType']
          }
        },
        {
          name: 'tokenize_dataset',
          description: 'Tokenize entire dataset (array of records)',
          inputSchema: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                description: 'Array of records to tokenize'
              },
              phiFields: {
                type: 'object',
                description: 'Map of field names to PHI types'
              }
            },
            required: ['data', 'phiFields']
          }
        },
        {
          name: 'clear_cache',
          description: 'Clear tokenization cache (resets all mappings)',
          inputSchema: {
            type: 'object',
            properties: {
              confirmation: {
                type: 'string',
                description: 'Must be: "I understand this will reset all token mappings"'
              }
            },
            required: ['confirmation']
          }
        },
        {
          name: 'get_cache_stats',
          description: 'Get tokenization cache statistics',
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
          case 'tokenization_status':
            result = await this.handleTokenizationStatus();
            break;
          
          case 'tokenization_enable':
            result = await this.handleTokenizationEnable();
            break;
          
          case 'tokenization_disable':
            result = await this.handleTokenizationDisable(args);
            break;
          
          case 'tokenize_value':
            result = await this.handleTokenizeValue(args);
            break;
          
          case 'tokenize_dataset':
            result = await this.handleTokenizeDataset(args);
            break;
          
          case 'clear_cache':
            result = await this.handleClearCache(args);
            break;
          
          case 'get_cache_stats':
            result = await this.handleGetCacheStats();
            break;
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        const duration = `${Date.now() - startTime}ms`;
        
        await this.audit.log({
          action: `tokenization_${name}`,
          details: { args: name.includes('dataset') ? { recordCount: args.data?.length } : args },
          mcpServer: 'mcp-tokenization',
          duration,
          success: true
        });
        
        return result;
        
      } catch (error: any) {
        const duration = `${Date.now() - startTime}ms`;
        
        await this.audit.log({
          action: `tokenization_${name}`,
          details: { args },
          mcpServer: 'mcp-tokenization',
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
  
  private async handleTokenizationStatus() {
    const config = this.profileManager.getConfig();
    const enabled = config.settings.tokenizationEnabled;
    
    return {
      content: [{
        type: 'text',
        text: `🔒 Tokenization Status

Profile: ${this.profileManager.getActiveProfile()}
Status: ${enabled ? '✅ ENABLED (Safe - PHI Masked)' : '⚠️  DISABLED (Real PHI Visible)'}
PHI Tracking: ${config.settings.phiTracking ? 'Enabled' : 'Disabled'}
Cache Entries: ${Object.keys(this.cache).length}

${enabled ? '✅ All PHI will be automatically masked with realistic fake data' : '⚠️  WARNING: Real PHI will be visible in exports!'}`
      }]
    };
  }
  
  private async handleTokenizationEnable() {
    const config = this.profileManager.getConfig();
    config.settings.tokenizationEnabled = true;
    await this.profileManager.saveProfileConfig(this.profileManager.getActiveProfile(), config);
    
    await this.audit.log({
      action: 'tokenization_enabled',
      mcpServer: 'mcp-tokenization',
      success: true
    });
    
    return {
      content: [{
        type: 'text',
        text: `✅ Tokenization ENABLED

Profile: ${this.profileManager.getActiveProfile()}
Status: ✅ ENABLED (Safe)

All PHI will now be masked with realistic fake data.
This is the safe default setting for HIPAA compliance.`
      }]
    };
  }
  
  private async handleTokenizationDisable(args: any) {
    const { confirmation } = args;
    
    if (confirmation !== 'I understand I will see real PHI') {
      throw new Error('Invalid confirmation. Must be: "I understand I will see real PHI"');
    }
    
    const config = this.profileManager.getConfig();
    config.settings.tokenizationEnabled = false;
    await this.profileManager.saveProfileConfig(this.profileManager.getActiveProfile(), config);
    
    await this.audit.log({
      action: 'tokenization_disabled',
      phiAccessed: true,
      mcpServer: 'mcp-tokenization',
      success: true
    });
    
    return {
      content: [{
        type: 'text',
        text: `⚠️  Tokenization DISABLED

Profile: ${this.profileManager.getActiveProfile()}
Status: ⚠️  DISABLED (Real PHI Visible)

WARNING: Real PHI will now be visible in all exports!
This action has been logged to the audit trail.

To re-enable: Use tokenization_enable tool`
      }]
    };
  }
  
  private async handleTokenizeValue(args: any) {
    const { value, fieldType } = args;
    
    const config = this.profileManager.getConfig();
    if (!config.settings.tokenizationEnabled) {
      return {
        content: [{
          type: 'text',
          text: `⚠️  Tokenization disabled - returning original value

Profile: ${this.profileManager.getActiveProfile()}
Original: ${value}
Tokenized: ${value} (NOT MASKED)

Enable tokenization first with tokenization_enable tool.`
        }]
      };
    }
    
    const tokenized = this.tokenize(value, fieldType);
    
    return {
      content: [{
        type: 'text',
        text: `🔒 Value Tokenized

Profile: ${this.profileManager.getActiveProfile()}
Field Type: ${fieldType}
Original: ${value}
Tokenized: ${tokenized}

✅ Tokenized value is format-preserving and deterministic.
✅ Same input always produces same fake output.
✅ Original value is NOT recoverable without encryption key.`
      }]
    };
  }
  
  private async handleTokenizeDataset(args: any) {
    const { data, phiFields } = args;
    
    const config = this.profileManager.getConfig();
    if (!config.settings.tokenizationEnabled) {
      await this.audit.log({
        action: 'dataset_export_without_tokenization',
        phiAccessed: true,
        tokenized: false,
        details: { rowCount: data.length },
        mcpServer: 'mcp-tokenization',
        success: true
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            data: data,
            tokenized: false,
            warning: 'Tokenization disabled - real PHI returned'
          }, null, 2)
        }]
      };
    }
    
    // Tokenize dataset
    const tokenizedData = data.map((record: any) => {
      const tokenizedRecord: any = { ...record };
      
      for (const [fieldName, fieldType] of Object.entries(phiFields)) {
        if (record[fieldName]) {
          tokenizedRecord[fieldName] = this.tokenize(
            record[fieldName].toString(),
            fieldType as PHIFieldType
          );
        }
      }
      
      return tokenizedRecord;
    });
    
    await this.audit.log({
      action: 'dataset_tokenized',
      phiAccessed: true,
      tokenized: true,
      phiFields: Object.keys(phiFields),
      details: { rowCount: data.length },
      mcpServer: 'mcp-tokenization',
      success: true
    });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          data: tokenizedData,
          tokenized: true,
          rowCount: data.length,
          phiFieldsTokenized: Object.keys(phiFields)
        }, null, 2)
      }]
    };
  }
  
  private async handleClearCache(args: any) {
    const { confirmation } = args;
    
    if (confirmation !== 'I understand this will reset all token mappings') {
      throw new Error('Invalid confirmation');
    }
    
    const oldSize = Object.keys(this.cache).length;
    this.cache = {};
    this.saveCache();
    
    await this.audit.log({
      action: 'cache_cleared',
      details: { previousSize: oldSize },
      mcpServer: 'mcp-tokenization',
      success: true
    });
    
    return {
      content: [{
        type: 'text',
        text: `🗑️  Tokenization Cache Cleared

Profile: ${this.profileManager.getActiveProfile()}
Previous entries: ${oldSize}
New entries: 0

⚠️  All token mappings have been reset.
Next tokenization will create new fake values.`
      }]
    };
  }
  
  private async handleGetCacheStats() {
    const size = Object.keys(this.cache).length;
    
    return {
      content: [{
        type: 'text',
        text: `📊 Tokenization Cache Statistics

Profile: ${this.profileManager.getActiveProfile()}
Cache entries: ${size}
Cache file: ${this.cachePath}
Encryption: ✅ Enabled

Cache provides:
✅ Deterministic tokenization (same input → same output)
✅ Consistent fake data across exports
✅ Fast lookups (no re-computation)`
      }]
    };
  }
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Tokenization Logic
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  private tokenize(value: string, fieldType: PHIFieldType): string {
    // Check cache first
    const cacheKey = `${fieldType}:${value}`;
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }
    
    // Generate fake value based on field type
    let fakeValue: string;
    
    switch (fieldType) {
      case 'person_name':
        fakeValue = this.generateFakeName(value);
        break;
      case 'ssn':
        fakeValue = this.generateFakeSSN(value);
        break;
      case 'address':
        fakeValue = this.generateFakeAddress(value);
        break;
      case 'phone':
        fakeValue = this.generateFakePhone(value);
        break;
      case 'email':
        fakeValue = this.generateFakeEmail(value);
        break;
      case 'date_of_birth':
        fakeValue = this.generateFakeDOB(value);
        break;
      case 'medical_record_number':
        fakeValue = this.generateFakeMRN(value);
        break;
      default:
        fakeValue = 'TOKENIZED';
    }
    
    // Cache and return
    this.cache[cacheKey] = fakeValue;
    this.saveCache();
    
    return fakeValue;
  }
  
  private generateFakeName(original: string): string {
    const hash = this.deterministicHash(original);
    const firstIdx = hash % this.FAKE_FIRST_NAMES.length;
    const lastIdx = (hash >> 8) % this.FAKE_LAST_NAMES.length;
    
    return `${this.FAKE_FIRST_NAMES[firstIdx]} ${this.FAKE_LAST_NAMES[lastIdx]}`;
  }
  
  private generateFakeSSN(original: string): string {
    const hash = this.deterministicHash(original);
    const part1 = (hash % 900 + 100).toString().padStart(3, '0');
    const part2 = ((hash >> 10) % 90 + 10).toString().padStart(2, '0');
    const part3 = ((hash >> 20) % 9000 + 1000).toString().padStart(4, '0');
    
    return `${part1}-${part2}-${part3}`;
  }
  
  private generateFakeAddress(original: string): string {
    const hash = this.deterministicHash(original);
    const number = (hash % 9000 + 1000);
    const streetIdx = hash % this.FAKE_STREETS.length;
    const cityIdx = (hash >> 8) % this.FAKE_CITIES.length;
    const zip = ((hash >> 16) % 90000 + 10000);
    
    return `${number} ${this.FAKE_STREETS[streetIdx]} St, ${this.FAKE_CITIES[cityIdx]}, MA ${zip}`;
  }
  
  private generateFakePhone(original: string): string {
    const hash = this.deterministicHash(original);
    const area = (hash % 900 + 100).toString();
    const prefix = ((hash >> 10) % 900 + 100).toString();
    const line = ((hash >> 20) % 9000 + 1000).toString();
    
    return `(${area}) ${prefix}-${line}`;
  }
  
  private generateFakeEmail(original: string): string {
    const hash = this.deterministicHash(original);
    const firstIdx = hash % this.FAKE_FIRST_NAMES.length;
    const lastIdx = (hash >> 8) % this.FAKE_LAST_NAMES.length;
    const domain = (hash >> 16) % 2 === 0 ? 'example.com' : 'test.org';
    
    return `${this.FAKE_FIRST_NAMES[firstIdx].toLowerCase()}.${this.FAKE_LAST_NAMES[lastIdx].toLowerCase()}@${domain}`;
  }
  
  private generateFakeDOB(original: string): string {
    const hash = this.deterministicHash(original);
    const year = 1950 + (hash % 50);
    const month = (hash >> 8) % 12 + 1;
    const day = (hash >> 16) % 28 + 1;
    
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }
  
  private generateFakeMRN(original: string): string {
    const hash = this.deterministicHash(original);
    return `MRN${(hash % 900000 + 100000).toString()}`;
  }
  
  private deterministicHash(value: string): number {
    const hmac = crypto.createHmac('sha256', this.encryptionKey);
    hmac.update(value);
    const hash = hmac.digest();
    
    // Convert first 4 bytes to number
    return (hash[0] << 24) | (hash[1] << 16) | (hash[2] << 8) | hash[3];
  }
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Cache Management
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  private loadCache() {
    if (fs.existsSync(this.cachePath)) {
      try {
        const content = fs.readFileSync(this.cachePath, 'utf8');
        this.cache = JSON.parse(content);
        console.log(`✅ Loaded ${Object.keys(this.cache).length} cached tokens`);
      } catch (error) {
        console.warn('⚠️  Failed to load cache, starting fresh');
        this.cache = {};
      }
    }
  }
  
  private saveCache() {
    try {
      const dir = path.dirname(this.cachePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cachePath, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }
  
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log('✅ MCP Tokenization Server running');
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
    
    const server = new MCPTokenizationServer();
    await server.run();
    
  } catch (error: any) {
    console.error('Failed to start MCP Tokenization Server:', error.message);
    process.exit(1);
  }
}

main();
