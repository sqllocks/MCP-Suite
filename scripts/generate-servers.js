const fs = require('fs');
const path = require('path');

// Define all 30 servers with their configurations
const servers = [
  { name: 'mcp-orchestrator-v1', index: 0, description: 'Central orchestration server', skip: true }, // Already created
  { name: 'mcp-sql-explorer', index: 1, description: 'SQL query analysis and generation', skip: true }, // Already created
  { name: 'mcp-fabric-live', index: 2, description: 'Microsoft Fabric live data integration' },
  { name: 'mcp-fabric-search', index: 3, description: 'Microsoft Fabric search capabilities' },
  { name: 'mcp-export', index: 4, description: 'Data export and transformation' },
  { name: 'mcp-docs-rag', index: 5, description: 'Document RAG (Retrieval Augmented Generation)' },
  { name: 'mcp-kb', index: 6, description: 'Knowledge base management' },
  { name: 'mcp-code-search', index: 7, description: 'Code search and analysis' },
  { name: 'mcp-code-sync', index: 8, description: 'Code synchronization across repositories' },
  { name: 'mcp-git', index: 9, description: 'Git operations and management' },
  { name: 'mcp-vscode-workspace', index: 10, description: 'VSCode workspace management' },
  { name: 'mcp-docs-generator', index: 11, description: 'Documentation generation' },
  { name: 'mcp-document-generator', index: 12, description: 'General document generation' },
  { name: 'mcp-diagram-generator', index: 13, description: 'Diagram and visualization generation' },
  { name: 'mcp-error-diagnosis', index: 14, description: 'Error diagnosis and troubleshooting' },
  { name: 'security-guardian-mcp', index: 15, description: 'Security scanning and analysis' },
  { name: 'auto-remediation', index: 16, description: 'Automatic issue remediation' },
  { name: 'mcp-tokenization-secure', index: 17, description: 'Secure tokenization services' },
  { name: 'mcp-microsoft-docs', index: 18, description: 'Microsoft documentation integration' },
  { name: 'mcp-ml-inference', index: 19, description: 'Machine learning inference' },
  { name: 'mcp-synthetic-data-generator', index: 20, description: 'Synthetic data generation' },
  { name: 'mcp-nl-interface', index: 21, description: 'Natural language interface' },
  { name: 'humanizer-mcp', index: 22, description: 'Text humanization and improvement' },
  { name: 'mcp-observability', index: 23, description: 'System observability and monitoring' },
  { name: 'mcp-stream-processor', index: 24, description: 'Stream processing and analytics' },
  { name: 'mcp-memory', index: 25, description: 'Conversation memory management' },
  { name: 'mcp-frequency-tracking', index: 26, description: 'Frequency and pattern tracking' },
  { name: 'mcp-impact-analysis', index: 27, description: 'Code and system impact analysis' },
];

const serverTemplate = (serverName, serverIndex, description) => `import express, { Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import {
  config,
  createLogger,
  createModelManager,
  createAuthManager,
  ModelManager,
  Logger,
  AuthManager
} from '@mcp-suite/shared';

const SERVER_NAME = '${serverName}';
const SERVER_INDEX = ${serverIndex};

class ${toPascalCase(serverName)}Server {
  private app: express.Application;
  private logger: Logger;
  private modelManager: ModelManager;
  private authManager: AuthManager;
  private port: number;
  private profile: string;
  private workspace: string;

  constructor() {
    this.profile = config.getCurrentProfileName();
    this.port = config.getPortForServer(SERVER_NAME, SERVER_INDEX);
    this.workspace = config.getWorkspace();
    
    const logDir = path.join(this.workspace, 'logs');
    this.logger = createLogger(SERVER_NAME, logDir);
    
    this.logger.info(\`Initializing \${SERVER_NAME}\`, {
      profile: this.profile,
      port: this.port
    });

    const ollamaUrl = config.getOllamaUrl();
    const model = config.getModelForServer(SERVER_NAME);
    this.modelManager = createModelManager(ollamaUrl, this.logger, model);
    
    const jwtSecret = config.getJWTSecret();
    this.authManager = createAuthManager(jwtSecret, this.logger);
    
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'ok',
        server: SERVER_NAME,
        port: this.port,
        model: this.modelManager.getCurrentModel(),
        description: '${description}'
      });
    });
    
    this.app.post('/process',
      this.authManager.middleware(),
      async (req: Request, res: Response) => {
        await this.handleProcess(req, res);
      }
    );
  }

  private async handleProcess(req: Request, res: Response): Promise<void> {
    const { input, options } = req.body;
    
    if (!input) {
      return res.status(400).json({
        error: 'Missing input parameter',
        code: 'INVALID_REQUEST'
      });
    }
    
    try {
      const prompt = \`Process the following request for ${description}:\\n\\n\${input}\`;
      const response = await this.modelManager.generate(prompt, options);
      
      this.logger.info('Request processed successfully');
      
      res.json({
        success: true,
        data: {
          input,
          output: response,
          model: this.modelManager.getCurrentModel()
        },
        timestamp: new Date()
      });
    } catch (error: any) {
      this.logger.error('Processing failed', error);
      res.status(500).json({
        error: 'Processing failed',
        details: error.message,
        timestamp: new Date()
      });
    }
  }

  public async start(): Promise<void> {
    try {
      const isHealthy = await this.modelManager.checkHealth();
      
      if (!isHealthy) {
        this.logger.warn('Ollama not available, starting anyway');
      }
      
      this.app.listen(this.port, () => {
        this.logger.info(\`\${SERVER_NAME} started successfully\`, {
          port: this.port,
          model: this.modelManager.getCurrentModel()
        });
      });
    } catch (error) {
      this.logger.error(\`Failed to start \${SERVER_NAME}\`, error);
      process.exit(1);
    }
  }
}

const server = new ${toPascalCase(serverName)}Server();
server.start();

export default ${toPascalCase(serverName)}Server;
`;

const packageTemplate = (serverName, description) => `{
  "name": "@mcp-suite/${serverName}",
  "version": "3.0.0",
  "description": "${description}",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsc && node dist/index.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@mcp-suite/shared": "file:../../shared",
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "typescript": "^5.3.3"
  }
}
`;

const tsconfigTemplate = `{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
`;

function toPascalCase(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function createServer(server) {
  if (server.skip) {
    console.log(`Skipping ${server.name} (already created)`);
    return;
  }
  
  const serverDir = path.join(__dirname, '..', 'servers', server.name);
  const srcDir = path.join(serverDir, 'src');
  
  // Create directories
  if (!fs.existsSync(serverDir)) {
    fs.mkdirSync(serverDir, { recursive: true });
  }
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }
  
  // Create package.json
  fs.writeFileSync(
    path.join(serverDir, 'package.json'),
    packageTemplate(server.name, server.description)
  );
  
  // Create tsconfig.json
  fs.writeFileSync(
    path.join(serverDir, 'tsconfig.json'),
    tsconfigTemplate
  );
  
  // Create src/index.ts
  fs.writeFileSync(
    path.join(srcDir, 'index.ts'),
    serverTemplate(server.name, server.index, server.description)
  );
  
  console.log(`✓ Created ${server.name}`);
}

// Generate all servers
console.log('Generating MCP servers...\n');
servers.forEach(server => createServer(server));
console.log(`\nGenerated ${servers.filter(s => !s.skip).length} servers!`);
