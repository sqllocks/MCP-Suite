# ⚡ **MCP-SUITE QUICK START**

Get up and running in 10 minutes!

---

## ✅ **PRE-FLIGHT CHECK**

Before you start, verify:

```bash
# Check Node.js
node --version  # Should be v18+

# Check npm
npm --version  # Should be v9+

# Check Ollama
ollama list  # Should show your models

# Check PM2 (install if needed)
pm2 --version  # or: npm install -g pm2
```

---

## 🚀 **5-STEP INSTALLATION**

### **Step 1: Install Dependencies** (2 min)

```bash
cd MCP-SUITE
npm install
```

**Expected:** `added 1247 packages`

---

### **Step 2: Build TypeScript** (1 min)

```bash
npm run build
```

**Expected:** `Build complete` or no errors

---

### **Step 3: Configure Environment** (2 min)

```bash
# Copy template
cp .env.example .env

# Edit it
nano .env  # or use your editor
```

**Required changes:**
```bash
MCP_PROFILE=Personal

# Generate JWT secrets (run 4 times):
openssl rand -base64 32  # Mac/Linux
# Paste each into .env for each profile

PERSONAL_JWT_SECRET=<paste-here>
PATHGROUP_JWT_SECRET=<paste-here>
BEACON_JWT_SECRET=<paste-here>
EYESOUTH_JWT_SECRET=<paste-here>
```

**Save and exit!**

---

### **Step 4: Create Workspace** (1 min)

```bash
# Mac
mkdir -p ~/OneDrive/VSCode/Personal/general-workspace/{data,cache,logs,temp}

# Windows
New-Item -ItemType Directory -Path "C:\Users\suref\OneDrive\VSCode\Personal\general-workspace\data" -Force
New-Item -ItemType Directory -Path "C:\Users\suref\OneDrive\VSCode\Personal\general-workspace\cache" -Force
New-Item -ItemType Directory -Path "C:\Users\suref\OneDrive\VSCode\Personal\general-workspace\logs" -Force
New-Item -ItemType Directory -Path "C:\Users\suref\OneDrive\VSCode\Personal\general-workspace\temp" -Force
```

---

### **Step 5: Start Servers** (1 min)

```bash
# Mac
./mcp-control.sh start-all

# Windows
.\mcp-control.ps1 -Command start-all
```

**Expected:**
```
Starting MCP Orchestrator... ✓
Starting mcp-sql-explorer... ✓
Starting security-guardian-mcp... ✓
Starting mcp-docs-rag... ✓
Starting mcp-error-diagnosis... ✓

All servers started: 5/5 online
```

---

## ✅ **VERIFY IT'S WORKING**

```bash
# Check health
curl http://localhost:3000/health

# Expected response:
{
  "status": "ok",
  "orchestrator": "online",
  "servers": { "total": 30, "online": 5 },
  "ollama": "ok"
}

# List servers
curl http://localhost:3000/api/servers

# Test SQL Explorer
curl -X POST http://localhost:3001/generate \
  -H "Content-Type: application/json" \
  -d '{"description": "Find all users"}'
```

---

## 🎮 **COMMON COMMANDS**

```bash
# Mac
./mcp-control.sh status          # Show all processes
./mcp-control.sh logs orchestrator  # View logs
./mcp-control.sh stop-all        # Stop everything
./mcp-control.sh restart-all     # Restart everything

# Windows
.\mcp-control.ps1 -Command status
.\mcp-control.ps1 -Command logs -Server orchestrator
.\mcp-control.ps1 -Command stop-all
.\mcp-control.ps1 -Command restart-all
```

---

## 🚨 **TROUBLESHOOTING**

### **Problem: "Module not found"**

```bash
# Make sure you built it
npm run build
```

### **Problem: "Port already in use"**

```bash
# Find and kill the process
# Mac
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### **Problem: "Ollama not connecting"**

```bash
# Start Ollama
ollama serve  # Mac/Linux
Start-Process ollama -ArgumentList "serve"  # Windows

# Verify models
ollama list
```

### **Problem: "PM2 command not found"**

```bash
npm install -g pm2

# Windows: Also install PM2 service
npm install -g pm2-windows-service
pm2-service-install
```

---

## 📚 **NEXT STEPS**

1. ✅ **Working?** → Read README.md for full documentation
2. ✅ **Build more servers?** → See "Building Remaining Servers" in README
3. ✅ **Switch profiles?** → Change MCP_PROFILE in .env
4. ✅ **Enable critical mode?** → See CRITICAL_MODE section in README

---

## 🎊 **YOU'RE READY!**

**What you have running:**

- ✅ MCP Orchestrator (port 3000)
- ✅ SQL Explorer (port 3001)
- ✅ Security Guardian (port 3015)
- ✅ Docs RAG (port 3005)
- ✅ Error Diagnosis (port 3014)

**Access the orchestrator:**
- Health: http://localhost:3000/health
- Servers: http://localhost:3000/api/servers

**Total time:** ~10 minutes ⚡

---

**Questions?** Check README.md or the installation guides!
