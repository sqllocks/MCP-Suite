# 🍎 **MCP-SUITE INSTALLATION GUIDE - MAC**

## 📋 **PRE-INSTALLATION CHECKLIST**

Before you begin, verify:

```bash
# Check 1: Verify Ollama models (should show 5 models)
ollama list
```

**Expected Output:**
```
NAME                  ID              SIZE      MODIFIED
llama3.1:8b          46e0c10c039e    4.9 GB    ...
qwen2.5-coder:7b     dae161e27b0e    4.7 GB    ...
qwen2.5-coder:32b    b92d6a0bd47e    19 GB     ...
deepseek-coder:33b   acec7c0b0fd9    18 GB     ...
command-r:35b        7d96360d357f    18 GB     ...
```

✅ **If you see all 5 models, continue!**  
❌ **If missing models, go back and download them first**

```bash
# Check 2: Verify OneDrive sync
ls ~/OneDrive/VSCode
```

**Expected Output:**
```
AzureClients  Personal
```

✅ **If you see folders, OneDrive is working!**

```bash
# Check 3: Verify Node.js
node --version
npm --version
```

**Expected Output:**
```
v22.x.x (or v20.x.x or v18.x.x - any recent version)
10.x.x (or 9.x.x or 8.x.x)
```

✅ **If you see version numbers, Node.js is installed!**  
❌ **If "command not found", install Node.js from https://nodejs.org**

---

## 🚀 **INSTALLATION STEPS**

### **STEP 1: Download MCP-SUITE Package** ⏱️ *~1 minute*

```bash
# Navigate to Downloads
cd ~/Downloads

# (You'll download the MCP-Suite package from Claude)
# Extract the zip file (double-click or use unzip)
unzip MCP-Suite-Final-Secured.zip

# Navigate to extracted folder
cd MCP-SUITE
```

**Expected Output:**
```bash
Archive:  MCP-Suite-Final-Secured.zip
   creating: MCP-SUITE/
  inflating: MCP-SUITE/package.json
  inflating: MCP-SUITE/README.md
  ...
```

**Verification:**
```bash
ls
```

**Should see:**
```
README.md           mcp-control.sh      profiles.json
package.json        servers/            shared/
ecosystem.config.js critical-mode.sh    docs/
```

✅ **If you see these files, extraction succeeded!**

---

### **STEP 2: Review Configuration** ⏱️ *~2 minutes*

```bash
# View your profile configuration
cat profiles.json | head -50
```

**Expected Output (partial):**
```json
{
  "profiles": {
    "Personal": {
      "platforms": {
        "darwin": {
          "workspace": "/Users/sqllocks/OneDrive/VSCode/Personal/general-workspace",
          "user": "sqllocks"
        }
      },
      "networking": {
        "basePort": 3000,
        "portRange": [3000, 3029]
      }
    }
  }
}
```

✅ **Verify your username shows "sqllocks"**  
✅ **Verify paths point to OneDrive**

---

### **STEP 3: Install Dependencies** ⏱️ *~5-10 minutes*

```bash
# Install all Node.js dependencies
npm install
```

**Expected Output:**
```
npm WARN deprecated ...
added 1247 packages, and audited 1248 packages in 8m

156 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

**Progress indicators you'll see:**
- `⠋ reify:...` (installing packages)
- `added 1247 packages` (final count)

⏱️ **Time:** 5-10 minutes depending on internet speed

✅ **If you see "found 0 vulnerabilities", installation succeeded!**  
⚠️ **If you see vulnerabilities, that's usually OK for development**

**Verification:**
```bash
# Check node_modules was created
ls node_modules | head
```

**Should see packages like:**
```
@anthropic-ai
@types
typescript
...
```

---

### **STEP 4: Build TypeScript Code** ⏱️ *~2-3 minutes*

```bash
# Compile TypeScript to JavaScript
npm run build
```

**Expected Output:**
```
> mcp-suite@3.0.0 build
> tsc --build

[... compilation messages ...]
✓ Build complete
```

⏱️ **Time:** 2-3 minutes

✅ **If you see "Build complete" or no errors, build succeeded!**

**Verification:**
```bash
# Check that dist/ folders were created
find . -name "dist" -type d | head -5
```

**Should see:**
```
./shared/dist
./servers/mcp-orchestrator-v1/dist
./servers/mcp-sql-explorer/dist
...
```

---

### **STEP 5: Set Up Environment Variables** ⏱️ *~3 minutes*

```bash
# Create .env file from template
cp .env.example .env

# Edit the .env file
nano .env
```

**Required variables to set:**

```bash
# Profile Configuration
MCP_PROFILE=Personal

# JWT Secrets (generate random strings)
PERSONAL_JWT_SECRET=your-random-secret-here-min-32-chars
PATHGROUP_JWT_SECRET=another-random-secret-32-chars
BEACON_JWT_SECRET=third-random-secret-32-chars
EYESOUTH_JWT_SECRET=fourth-random-secret-32-chars

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434

# Optional: API Keys (leave blank if not using)
ANTHROPIC_API_KEY=
TOGETHER_API_KEY=
```

**Generate random secrets:**
```bash
# Generate 4 random JWT secrets
openssl rand -base64 32
openssl rand -base64 32
openssl rand -base64 32
openssl rand -base64 32
```

**Copy each output and paste into .env file**

**Save and exit:** `Ctrl+O`, `Enter`, `Ctrl+X`

**Verification:**
```bash
# Check .env file exists and has secrets
cat .env | grep JWT_SECRET
```

**Should see:**
```
PERSONAL_JWT_SECRET=abc123...
PATHGROUP_JWT_SECRET=def456...
BEACON_JWT_SECRET=ghi789...
EYESOUTH_JWT_SECRET=jkl012...
```

✅ **If you see 4 JWT secrets, configuration complete!**

---

### **STEP 6: Initialize Workspace** ⏱️ *~1 minute*

```bash
# Create workspace directories
node setup-workspace.js --profile Personal
```

**Expected Output:**
```
Creating workspace for profile: Personal
Workspace: /Users/sqllocks/OneDrive/VSCode/Personal/general-workspace

Creating directories:
  ✓ /Users/sqllocks/OneDrive/VSCode/Personal/general-workspace/data
  ✓ /Users/sqllocks/OneDrive/VSCode/Personal/general-workspace/cache
  ✓ /Users/sqllocks/OneDrive/VSCode/Personal/general-workspace/logs
  ✓ /Users/sqllocks/OneDrive/VSCode/Personal/general-workspace/temp

Workspace setup complete!
```

✅ **If you see all checkmarks, workspace created!**

**Verification:**
```bash
# Check workspace directories exist
ls ~/OneDrive/VSCode/Personal/general-workspace/
```

**Should see:**
```
data/  cache/  logs/  temp/
```

---

### **STEP 7: Start MCP Orchestrator** ⏱️ *~30 seconds*

```bash
# Make control script executable
chmod +x mcp-control.sh

# Start the orchestrator
./mcp-control.sh start-orchestrator
```

**Expected Output:**
```
Starting MCP Orchestrator...
Profile: Personal
Port: 3000
Workspace: /Users/sqllocks/OneDrive/VSCode/Personal/general-workspace

[PM2] Starting /Users/sqllocks/MCP-SUITE/servers/mcp-orchestrator-v1/dist/index.js in fork_mode (1 instance)
[PM2] Done.

┌─────┬──────────────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name                 │ mode        │ status  │ cpu     │ memory   │
├─────┼──────────────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ personal-orchestrator│ fork        │ online  │ 0%      │ 45.2mb   │
└─────┴──────────────────────┴─────────────┴─────────┴─────────┴──────────┘

✓ Orchestrator started successfully!
```

✅ **If status shows "online", orchestrator is running!**

**Verification:**
```bash
# Check orchestrator is running
curl http://localhost:3000/health
```

**Expected Response:**
```json
{"status":"ok","profile":"Personal","timestamp":"2026-02-09T..."}
```

✅ **If you see JSON with "status":"ok", it's working!**

---

### **STEP 8: Start Individual Servers** ⏱️ *~2-3 minutes*

```bash
# Start all 30 MCP servers
./mcp-control.sh start-all
```

**Expected Output:**
```
Starting all MCP servers for profile: Personal

Starting server: mcp-sql-explorer... ✓
Starting server: mcp-fabric-live... ✓
Starting server: mcp-fabric-search... ✓
...
[30 servers starting]
...

┌─────┬──────────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                     │ status  │ cpu     │ memory   │
├─────┼──────────────────────────┼─────────┼─────────┼──────────┤
│ 0   │ personal-orchestrator    │ online  │ 0.2%    │ 52.1mb   │
│ 1   │ personal-sql-explorer    │ online  │ 0.1%    │ 38.4mb   │
│ 2   │ personal-fabric-live     │ online  │ 0.1%    │ 35.2mb   │
│ 3   │ personal-fabric-search   │ online  │ 0.1%    │ 32.8mb   │
│ ... │ ...                      │ ...     │ ...     │ ...      │
│ 30  │ personal-kb              │ online  │ 0.1%    │ 28.9mb   │
└─────┴──────────────────────────┴─────────┴─────────┴──────────┘

All servers started: 31/31 online
Total memory: ~1.2GB
```

⏱️ **Time:** 2-3 minutes to start all servers

✅ **If all servers show "online", they're running!**

**Verification:**
```bash
# List all running processes
./mcp-control.sh status
```

**Should show 31 processes (1 orchestrator + 30 servers):**
```
┌─────┬────────────────────────┬─────────┐
│ id  │ name                   │ status  │
├─────┼────────────────────────┼─────────┤
│ 0   │ personal-orchestrator  │ online  │
│ 1-30│ [30 servers]           │ online  │
└─────┴────────────────────────┴─────────┘
```

---

### **STEP 9: Test the System** ⏱️ *~2 minutes*

```bash
# Test orchestrator API
curl http://localhost:3000/api/servers
```

**Expected Response (truncated):**
```json
{
  "servers": [
    {
      "name": "mcp-sql-explorer",
      "status": "online",
      "port": 3001,
      "model": "qwen2.5-coder:32b"
    },
    {
      "name": "mcp-fabric-live",
      "status": "online",
      "port": 3002,
      "model": "qwen2.5-coder:32b"
    },
    ...
  ],
  "total": 30,
  "online": 30
}
```

✅ **If you see 30 servers with "status":"online", system is healthy!**

**Test a specific server:**
```bash
# Test SQL Explorer server
curl -X POST http://localhost:3001/query \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT 1 as test"}'
```

**Expected Response:**
```json
{
  "result": [{"test": 1}],
  "status": "success"
}
```

✅ **If you get a result, servers are working!**

---

### **STEP 10: View Logs** ⏱️ *~1 minute*

```bash
# View orchestrator logs
./mcp-control.sh logs personal-orchestrator --lines 50
```

**Expected Output:**
```
[2026-02-09 14:23:45] INFO: MCP Orchestrator started
[2026-02-09 14:23:45] INFO: Profile: Personal
[2026-02-09 14:23:45] INFO: Port: 3000
[2026-02-09 14:23:46] INFO: Loading model preferences...
[2026-02-09 14:23:46] INFO: Ollama connection: OK
[2026-02-09 14:23:46] INFO: Registering 30 servers...
[2026-02-09 14:23:47] INFO: All servers registered
[2026-02-09 14:23:47] INFO: Orchestrator ready
```

✅ **If you see "Orchestrator ready", it's healthy!**

**View a server's logs:**
```bash
# View SQL Explorer logs
./mcp-control.sh logs personal-sql-explorer --lines 20
```

**Expected Output:**
```
[2026-02-09 14:25:12] INFO: SQL Explorer server starting
[2026-02-09 14:25:12] INFO: Port: 3001
[2026-02-09 14:25:12] INFO: Model: qwen2.5-coder:32b
[2026-02-09 14:25:13] INFO: Ollama connected
[2026-02-09 14:25:13] INFO: Server ready
```

✅ **If you see "Server ready", it's working!**

---

## ✅ **VERIFICATION CHECKLIST**

Run through this checklist to confirm everything works:

```bash
# 1. Check all processes running
./mcp-control.sh status
# ✓ Should show 31 online

# 2. Check orchestrator health
curl http://localhost:3000/health
# ✓ Should return {"status":"ok"}

# 3. Check server list
curl http://localhost:3000/api/servers | grep "online" | wc -l
# ✓ Should show 30

# 4. Check Ollama connectivity
curl http://localhost:11434/api/tags
# ✓ Should return JSON with models

# 5. Check disk usage
du -sh ~/OneDrive/VSCode/Personal/general-workspace
# ✓ Should show reasonable size (< 1GB initially)

# 6. Check memory usage
./mcp-control.sh status | grep -i memory
# ✓ Should show ~1-2GB total
```

**All checks passed?** ✅ **Installation complete!**

---

## 🎮 **USING MCP-SUITE**

### **Start/Stop Commands:**

```bash
# Start everything
./mcp-control.sh start-all

# Stop everything
./mcp-control.sh stop-all

# Restart everything
./mcp-control.sh restart-all

# Start specific server
./mcp-control.sh start-server mcp-sql-explorer

# Stop specific server
./mcp-control.sh stop-server mcp-sql-explorer
```

### **Monitoring:**

```bash
# View all processes
./mcp-control.sh status

# View logs for specific server
./mcp-control.sh logs personal-sql-explorer

# Follow logs in real-time
./mcp-control.sh logs personal-sql-explorer --follow

# View orchestrator dashboard
open http://localhost:3000/dashboard
```

### **Critical Mode (Emergency):**

```bash
# Enable critical mode for better accuracy
./critical-mode.sh --profile Personal --enable --reason "Production issue"

# Check critical mode status
./critical-mode.sh --profile Personal --status

# Disable when resolved
./critical-mode.sh --profile Personal --disable
```

---

## 🧹 **MAINTENANCE**

### **Daily:**

```bash
# Check status
./mcp-control.sh status

# View logs if issues
./mcp-control.sh logs personal-orchestrator
```

### **Weekly:**

```bash
# Clean old logs
find ~/OneDrive/VSCode/Personal/general-workspace/logs -name "*.log" -mtime +7 -delete

# Update models (if new versions)
ollama pull qwen2.5-coder:32b
```

### **Monthly:**

```bash
# Update MCP-SUITE
git pull  # if using git
npm install  # update dependencies
npm run build  # rebuild
./mcp-control.sh restart-all  # restart
```

---

## ❌ **TROUBLESHOOTING**

### **Problem: Server won't start**

```bash
# Check logs
./mcp-control.sh logs personal-orchestrator

# Check port not in use
lsof -i :3000

# Restart everything
./mcp-control.sh stop-all
./mcp-control.sh start-all
```

### **Problem: Ollama not connecting**

```bash
# Check Ollama running
curl http://localhost:11434/api/tags

# If not running, start it
ollama serve

# Check models available
ollama list
```

### **Problem: Out of memory**

```bash
# Check memory usage
./mcp-control.sh status

# Stop unused servers
./mcp-control.sh stop-server mcp-diagram-generator

# Or restart to clear memory
./mcp-control.sh restart-all
```

### **Problem: Port already in use**

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port in profiles.json
nano profiles.json
# Change basePort from 3000 to 4000
```

---

## 📊 **SYSTEM REQUIREMENTS MET**

✅ **Mac M3 Max:** 48GB RAM (using ~2-3GB)  
✅ **Ollama Models:** 5 models (~67GB)  
✅ **Node.js:** v22.x.x  
✅ **Disk Space:** ~10GB for MCP-SUITE + workspace  
✅ **Network:** Ports 3000-3029 available  

---

## 🎊 **INSTALLATION COMPLETE!**

**Time Summary:**
- STEP 1: ~1 min (Download & Extract)
- STEP 2: ~2 min (Review Config)
- STEP 3: ~10 min (Install Dependencies)
- STEP 4: ~3 min (Build TypeScript)
- STEP 5: ~3 min (Environment Setup)
- STEP 6: ~1 min (Initialize Workspace)
- STEP 7: ~1 min (Start Orchestrator)
- STEP 8: ~3 min (Start Servers)
- STEP 9: ~2 min (Test System)
- STEP 10: ~1 min (View Logs)

**Total Time:** ~25-30 minutes

**Your Mac is now running:**
- ✅ MCP Orchestrator (managing everything)
- ✅ 30 MCP Servers (ready to use)
- ✅ 5 Local AI Models (100% private)
- ✅ All for Personal profile

**Next:** Switch to other profiles or try Windows installation!

---

**Need help?** Check logs: `./mcp-control.sh logs personal-orchestrator`
