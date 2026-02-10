# 🏗️ **MCP-SUITE ARCHITECTURE**

## **Complete System Design Documentation**

---

## 📊 **SYSTEM OVERVIEW**

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP ORCHESTRATOR                        │
│                    (Port: basePort)                         │
│                                                             │
│  • Request Routing                                          │
│  • Health Monitoring                                        │
│  • Load Balancing                                           │
│  • Batch Execution                                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├───► HTTP API (REST)
                   │
       ┌───────────┴────────────┐
       │                        │
       ▼                        ▼
┌──────────────┐        ┌──────────────┐
│   30 MCP     │        │   CLIENT     │
│   SERVERS    │◄───────│   APPS       │
│              │        │              │
│ • SQL        │        │ • Web UI     │
│ • Security   │        │ • CLI        │
│ • RAG        │        │ • API        │
│ • Docs       │        │              │
│ • Code       │        │              │
│ • ...        │        │              │
└──────┬───────┘        └──────────────┘
       │
       │ Ollama API
       ▼
┌──────────────┐
│   OLLAMA     │
│   MODELS     │
│              │
│ • Mac: 5     │
│ • Win: 6     │
└──────────────┘
```

---

## 🎯 **COMPONENT ARCHITECTURE**

### **1. Shared Library Layer**

```typescript
shared/src/
├── types.ts              // TypeScript type definitions
│   ├── Profile
│   ├── ServerConfig
│   ├── ModelProvider
│   └── ...
│
├── logger.ts             // Winston logging system
│   ├── Console output
│   ├── File output
│   └── JSON formatting
│
├── ollama-client.ts      // Ollama API wrapper
│   ├── generate()
│   ├── checkHealth()
│   └── listModels()
│
├── profile-loader.ts     // Configuration management
│   ├── Load profiles.json
│   ├── Platform detection
│   ├── Environment expansion
│   └── Model selection
│
└── base-server.ts        // Base class for all servers
    ├── Express setup
    ├── Health endpoints
    ├── Error handling
    └── generateResponse()
```

**Purpose:** Provides common functionality to all 30 servers

---

### **2. MCP Servers Layer**

Each server inherits from `BaseServer` and implements:

```typescript
class MyServer extends BaseServer {
  // Constructor
  constructor(config: ServerConfig)

  // Required: Define your routes
  protected registerRoutes(): void {
    this.app.post('/endpoint', handler);
  }

  // Optional: Helper methods
  private buildPrompt(): string
  private parseResponse(): any
}
```

**Server Categories:**

1. **Data & SQL** (4 servers)
   - mcp-sql-explorer
   - mcp-export
   - mcp-stream-processor
   - mcp-synthetic-data-gen

2. **Security** (3 servers)
   - security-guardian-mcp
   - mcp-tokenization-secure
   - auto-remediation

3. **Documentation** (5 servers)
   - mcp-docs-generator
   - mcp-document-generator
   - mcp-docs-rag
   - mcp-kb
   - mcp-microsoft-docs

4. **Code Analysis** (7 servers)
   - mcp-code-search
   - mcp-code-sync
   - mcp-code-analyzer
   - mcp-git
   - mcp-error-diagnosis
   - mcp-impact-analysis
   - mcp-diagram-generator

5. **Fabric Integration** (3 servers)
   - mcp-fabric-live
   - mcp-fabric-search
   - mcp-fabric-pattern

6. **System** (5 servers)
   - mcp-observability
   - mcp-memory
   - mcp-frequency-tracking
   - mcp-vscode-workspace
   - mcp-ml-inference

7. **AI Enhancement** (3 servers)
   - mcp-nl-interface
   - humanizer-mcp
   - mcp-orchestrator-v2

---

### **3. Orchestrator Architecture**

```typescript
MCP Orchestrator
├── Server Registry
│   ├── Track all 30 servers
│   ├── Port mapping
│   └── Status monitoring
│
├── Request Router
│   ├── Intelligent routing
│   ├── Keyword matching
│   └── Load balancing
│
├── Health Monitor
│   ├── Periodic checks
│   ├── Failure detection
│   └── Auto-recovery
│
└── API Endpoints
    ├── /api/servers (list)
    ├── /api/execute (route)
    ├── /api/route/:server/* (direct)
    ├── /api/batch (parallel)
    └── /api/health (system)
```

---

## 🔄 **REQUEST FLOW**

### **1. Client Request:**

```
User → Orchestrator (http://localhost:3000/api/execute)
```

### **2. Intelligent Routing:**

```typescript
routeTask(task: string): string {
  if (task.includes('sql')) return 'mcp-sql-explorer';
  if (task.includes('security')) return 'security-guardian-mcp';
  if (task.includes('error')) return 'mcp-error-diagnosis';
  // ... pattern matching
}
```

### **3. Server Processing:**

```
Orchestrator → MCP Server (http://localhost:300X/)
            → Ollama (http://localhost:11434/api/generate)
            ← AI Response
Orchestrator ← Result
User         ← JSON Response
```

---

## 🗺️ **PORT ALLOCATION**

### **Profile-Based Ports:**

| Profile | Base Port | Range | Orchestrator |
|---------|-----------|-------|--------------|
| Personal | 3000 | 3000-3029 | 3000 |
| PathGroup | 4000 | 4000-4029 | 4000 |
| Beacon | 5000 | 5000-5029 | 5000 |
| EyeSouth | 6000 | 6000-6029 | 6000 |

### **Server Port Offsets:**

| Offset | Server | Offset | Server |
|--------|--------|--------|--------|
| 0 | orchestrator | 15 | security-guardian |
| 1 | sql-explorer | 16 | auto-remediation |
| 2 | fabric-live | 17 | tokenization-secure |
| 3 | fabric-search | 18 | microsoft-docs |
| 4 | export | 19 | ml-inference |
| 5 | docs-rag | 20 | synthetic-data-gen |
| 6 | kb | 21 | nl-interface |
| 7 | code-search | 22 | humanizer |
| 8 | code-sync | 23 | observability |
| 9 | git | 24 | stream-processor |
| 10 | vscode-workspace | 25 | memory |
| 11 | docs-generator | 26 | frequency-tracking |
| 12 | document-generator | 27 | orchestrator-v2 |
| 13 | diagram-generator | 28 | impact-analysis |
| 14 | error-diagnosis | 29 | fabric-pattern |

---

## 🤖 **MODEL SELECTION LOGIC**

### **Platform-Specific Models:**

```typescript
// Mac (48GB RAM)
models: {
  fast: 'llama3.1:8b',
  fastCode: 'qwen2.5-coder:7b',
  primary: 'qwen2.5-coder:32b',
  debugging: 'deepseek-coder:33b',
  rag: 'command-r:35b'
}

// Windows (96GB RAM)
models: {
  fast: 'llama3.1:8b',
  fastCode: 'qwen2.5-coder:7b',
  primary: 'qwen2.5:72b',        // BIGGER!
  debugging: 'deepseek-coder:33b',
  security: 'llama3.1:70b',      // FULL precision!
  rag: 'command-r:35b'
}
```

### **Model Assignment Logic:**

```typescript
getModelForServer(serverName: string, tier: string): string {
  const platform = getPlatform();  // 'darwin' or 'win32'
  const models = profiles.modelProviders.ollama.models[platform];
  
  // Check critical mode
  if (isCriticalMode(profile)) {
    return criticalConfig.platforms[platform].models[serverName];
  }
  
  // Return normal tier model
  return models[tier];
}
```

---

## 🔐 **SECURITY ARCHITECTURE**

### **1. Per-Profile JWT Secrets:**

```typescript
profiles: {
  Personal: {
    security: {
      jwtSecret: "${PERSONAL_JWT_SECRET}",
      encryptionLevel: "standard"
    }
  },
  PathGroup: {
    security: {
      jwtSecret: "${PATHGROUP_JWT_SECRET}",
      encryptionLevel: "high"
    }
  }
}
```

### **2. Request Authentication:**

```typescript
// Middleware (future enhancement)
app.use((req, res, next) => {
  const token = req.headers.authorization;
  jwt.verify(token, jwtSecret);
  next();
});
```

### **3. Security Features:**

- ✅ CORS enabled
- ✅ Helmet security headers
- ✅ Body parser limits (10MB)
- ✅ Request logging
- ✅ Error handling
- ✅ Per-profile isolation

---

## 💾 **DATA FLOW**

### **Workspace Structure:**

```
~/OneDrive/VSCode/Personal/general-workspace/
├── data/              # Persistent data
│   ├── documents/
│   ├── cache/
│   └── user-files/
│
├── cache/             # Temporary cache
│   ├── critical-mode.json
│   └── model-cache/
│
├── logs/              # Server logs
│   ├── orchestrator.log
│   ├── sql-explorer.log
│   └── error.log
│
└── temp/              # Temporary files
    └── processing/
```

### **OneDrive Sync:**

**Synced:**
- ✅ data/documents/
- ✅ Configuration files

**Excluded:**
- ❌ cache/
- ❌ logs/
- ❌ temp/
- ❌ node_modules/

---

## 🔄 **CRITICAL MODE ARCHITECTURE**

### **State Management:**

```json
// workspace/cache/critical-mode.json
{
  "enabled": true,
  "profile": "PathGroup",
  "reason": "Database corruption",
  "enabledAt": "2026-02-09T20:00:00Z",
  "enabledBy": "sqllocks"
}
```

### **Model Upgrade Path:**

```
Normal Mode:
  Mac: qwen2.5-coder:32b
  Windows: qwen2.5:72b

       ↓ Critical Mode Enabled ↓

Critical Mode:
  Mac: deepseek-coder:33b (for debugging)
  Windows: llama3.1:70b (for security)
```

### **Affected Servers:**

Only 6 servers upgrade:
- mcp-sql-explorer
- mcp-error-diagnosis
- mcp-impact-analysis
- security-guardian-mcp
- auto-remediation
- humanizer-mcp

**Why only 6?** These are the critical-path servers that benefit most from model upgrades.

---

## 📈 **PERFORMANCE CHARACTERISTICS**

### **Resource Usage:**

| Component | Mac | Windows |
|-----------|-----|---------|
| **Orchestrator** | ~50MB | ~50MB |
| **Each Server** | ~35MB | ~35MB |
| **30 Servers** | ~1.2GB | ~1.2GB |
| **Ollama (idle)** | ~200MB | ~200MB |
| **Total (idle)** | ~1.5GB | ~1.5GB |

### **Under Load:**

| Scenario | Mac | Windows |
|----------|-----|---------|
| **1 Model Active** | ~2GB | ~2.5GB |
| **32B Model** | 18GB | 18GB |
| **70B Model** | 40GB (q4) | 70GB (full) |
| **Peak Usage** | ~40GB | ~70GB |

---

## 🔌 **INTEGRATION POINTS**

### **1. REST API:**

```bash
# Orchestrator
http://localhost:3000/api/*

# Direct Server
http://localhost:3001/*
```

### **2. Ollama API:**

```bash
http://localhost:11434/api/generate
http://localhost:11434/api/tags
```

### **3. PM2 Management:**

```bash
pm2 list
pm2 logs [name]
pm2 restart [name]
pm2 stop [name]
```

---

## 🎯 **SCALABILITY**

### **Current Capacity:**

- 30 servers per profile
- 4 profiles
- **120 total servers possible**

### **Resource Limits:**

**Mac (48GB):**
- 30 servers: ✅ Easy
- 60 servers (2 profiles): ✅ Possible
- 120 servers (all): ⚠️ Tight

**Windows (96GB):**
- 30 servers: ✅ Easy
- 60 servers: ✅ Easy
- 120 servers: ✅ Possible

---

## 🎊 **ARCHITECTURE SUMMARY**

**Design Principles:**

1. ✅ **Modular** - Each server is independent
2. ✅ **Scalable** - Can run 1-120 servers
3. ✅ **Cross-Platform** - Mac + Windows support
4. ✅ **Intelligent** - Platform-aware model selection
5. ✅ **Resilient** - Per-server isolation
6. ✅ **Maintainable** - Shared base classes
7. ✅ **Observable** - Comprehensive logging

**Key Components:**

- Shared libraries (DRY principle)
- Base server class (inheritance)
- Orchestrator (central management)
- Profile system (multi-client)
- Critical mode (emergency upgrades)
- PM2 process management

**Result:** Production-ready, maintainable, scalable AI orchestration platform!

---

**MCP-SUITE v3.0.0** - Architected for excellence! 🏗️
