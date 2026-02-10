# 📚 **MCP-SUITE QUICK REFERENCE GUIDE**

## 🎯 **PLATFORM COMPARISON**

| Aspect | Mac (M3 Max 48GB) | Windows (Ryzen 96GB) |
|--------|-------------------|----------------------|
| **Models** | 5 models (~67GB) | 6 models (~135GB) |
| **Primary Model** | qwen2.5-coder:32b (18GB) | qwen2.5:72b (47GB) 🔥 |
| **Security Model** | qwen2.5-coder:32b (18GB) | llama3.1:70b (42GB) 🔥 |
| **Quality** | Good (85%) | Excellent (100%) |
| **Memory Usage** | ~2GB | ~2-3GB |
| **Installation Time** | 25-30 min | 30-35 min |
| **Command Style** | Bash (.sh) | PowerShell (.ps1) |

---

## ⚡ **QUICK START COMMANDS**

### **Mac:**

```bash
# Navigate to MCP-SUITE
cd ~/MCP-SUITE

# Start everything
./mcp-control.sh start-all

# Check status
./mcp-control.sh status

# Stop everything
./mcp-control.sh stop-all
```

### **Windows:**

```powershell
# Navigate to MCP-SUITE
cd C:\Users\suref\MCP-SUITE

# Start everything
.\mcp-control.ps1 -Command start-all

# Check status
.\mcp-control.ps1 -Command status

# Stop everything
.\mcp-control.ps1 -Command stop-all
```

---

## 📋 **COMMON COMMANDS**

### **Start/Stop:**

| Action | Mac | Windows |
|--------|-----|---------|
| Start all | `./mcp-control.sh start-all` | `.\mcp-control.ps1 -Command start-all` |
| Stop all | `./mcp-control.sh stop-all` | `.\mcp-control.ps1 -Command stop-all` |
| Restart all | `./mcp-control.sh restart-all` | `.\mcp-control.ps1 -Command restart-all` |
| Status | `./mcp-control.sh status` | `.\mcp-control.ps1 -Command status` |
| Optimize OneDrive | `./mcp-control.sh optimize-onedrive` | `.\mcp-control.ps1 -Command optimize-onedrive` |

### **Individual Servers:**

| Action | Mac | Windows |
|--------|-----|---------|
| Start server | `./mcp-control.sh start-server mcp-sql-explorer` | `.\mcp-control.ps1 -Command start-server -Server mcp-sql-explorer` |
| Stop server | `./mcp-control.sh stop-server mcp-sql-explorer` | `.\mcp-control.ps1 -Command stop-server -Server mcp-sql-explorer` |
| View logs | `./mcp-control.sh logs mcp-sql-explorer` | `.\mcp-control.ps1 -Command logs -Server mcp-sql-explorer` |

### **Critical Mode:**

| Action | Mac | Windows |
|--------|-----|---------|
| Enable | `./critical-mode.sh --profile Personal --enable` | `.\critical-mode.ps1 -Profile Personal -Enable` |
| Status | `./critical-mode.sh --profile Personal --status` | `.\critical-mode.ps1 -Profile Personal -Status` |
| Disable | `./critical-mode.sh --profile Personal --disable` | `.\critical-mode.ps1 -Profile Personal -Disable` |

---

## 🔍 **HEALTH CHECK COMMANDS**

### **Mac:**

```bash
# Quick health check
curl http://localhost:3000/health

# Check all servers
curl http://localhost:3000/api/servers

# Check Ollama
curl http://localhost:11434/api/tags

# Check disk usage
du -sh ~/OneDrive/VSCode/Personal/general-workspace

# Check memory
./mcp-control.sh status | grep -i memory
```

### **Windows:**

```powershell
# Quick health check
Invoke-WebRequest -Uri http://localhost:3000/health -UseBasicParsing

# Check all servers
Invoke-RestMethod -Uri http://localhost:3000/api/servers

# Check Ollama
Invoke-WebRequest -Uri http://localhost:11434/api/tags -UseBasicParsing

# Check disk usage
Get-ChildItem C:\Users\suref\OneDrive\VSCode\Personal\general-workspace -Recurse | Measure-Object -Property Length -Sum

# Check memory
Get-Process | Where-Object {$_.Name -like "*node*"} | Measure-Object WorkingSet -Sum
```

---

## 🎮 **SWITCHING PROFILES**

### **Mac:**

```bash
# Stop current profile
./mcp-control.sh stop-all

# Set new profile
export MCP_PROFILE=PathGroup

# Update .env file
nano .env
# Change: MCP_PROFILE=PathGroup

# Start new profile
./mcp-control.sh start-all
```

### **Windows:**

```powershell
# Stop current profile
.\mcp-control.ps1 -Command stop-all

# Set new profile
$env:MCP_PROFILE = "PathGroup"

# Update .env file
notepad .env
# Change: MCP_PROFILE=PathGroup

# Start new profile
.\mcp-control.ps1 -Command start-all
```

---

## 🧪 **TESTING COMMANDS**

### **Test Ollama Models:**

**Mac:**
```bash
ollama run llama3.1:8b "test"
ollama run qwen2.5-coder:32b "test"
ollama run command-r:35b "test"
```

**Windows:**
```powershell
ollama run llama3.1:8b "test"
ollama run qwen2.5:72b "test"
ollama run llama3.1:70b "test"
ollama run command-r:35b "test"
```

### **Test MCP Servers:**

**Mac:**
```bash
# Test orchestrator
curl http://localhost:3000/health

# Test SQL Explorer
curl -X POST http://localhost:3001/query \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT 1"}'
```

**Windows:**
```powershell
# Test orchestrator
Invoke-WebRequest http://localhost:3000/health

# Test SQL Explorer
$body = @{query="SELECT 1"} | ConvertTo-Json
Invoke-RestMethod http://localhost:3001/query -Method Post -Body $body -ContentType "application/json"
```

---

## 📊 **PORT ASSIGNMENTS**

| Profile | Port Range | Orchestrator | Servers |
|---------|------------|--------------|---------|
| **Personal** | 3000-3029 | 3000 | 3001-3030 |
| **PathGroup** | 4000-4029 | 4000 | 4001-4030 |
| **Beacon** | 5000-5029 | 5000 | 5001-5030 |
| **EyeSouth** | 6000-6029 | 6000 | 6001-6030 |

---

## 🗺️ **SERVER LIST (All 30 Servers)**

| # | Server Name | Port | Model (Mac) | Model (Windows) |
|---|-------------|------|-------------|-----------------|
| 1 | mcp-orchestrator-v1 | Base | qwen2.5-coder:32b | qwen2.5:72b |
| 2 | mcp-sql-explorer | +1 | qwen2.5-coder:32b | qwen2.5:72b |
| 3 | mcp-fabric-live | +2 | qwen2.5-coder:32b | qwen2.5:72b |
| 4 | mcp-fabric-search | +3 | llama3.1:8b | llama3.1:8b |
| 5 | mcp-export | +4 | llama3.1:8b | llama3.1:8b |
| 6 | mcp-docs-rag | +5 | command-r:35b | command-r:35b |
| 7 | mcp-kb | +6 | command-r:35b | command-r:35b |
| 8 | mcp-code-search | +7 | deepseek-coder:33b | deepseek-coder:33b |
| 9 | mcp-code-sync | +8 | qwen2.5-coder:7b | qwen2.5-coder:7b |
| 10 | mcp-git | +9 | qwen2.5-coder:7b | qwen2.5-coder:7b |
| 11 | mcp-vscode-workspace | +10 | llama3.1:8b | llama3.1:8b |
| 12 | mcp-docs-generator | +11 | qwen2.5-coder:32b | qwen2.5:72b |
| 13 | mcp-document-generator | +12 | qwen2.5-coder:32b | qwen2.5:72b |
| 14 | mcp-diagram-generator | +13 | qwen2.5-coder:32b | qwen2.5:72b |
| 15 | mcp-error-diagnosis | +14 | deepseek-coder:33b | deepseek-coder:33b |
| 16 | security-guardian-mcp | +15 | qwen2.5-coder:32b | llama3.1:70b |
| 17 | auto-remediation | +16 | deepseek-coder:33b | llama3.1:70b |
| 18 | mcp-tokenization-secure | +17 | qwen2.5-coder:32b | llama3.1:70b |
| 19 | mcp-microsoft-docs | +18 | qwen2.5-coder:32b | llama3.1:70b |
| 20 | mcp-ml-inference | +19 | llama3.1:8b | llama3.1:8b |
| 21 | mcp-synthetic-data-gen | +20 | qwen2.5-coder:32b | qwen2.5:72b |
| 22 | mcp-nl-interface | +21 | qwen2.5-coder:32b | qwen2.5:72b |
| 23 | humanizer-mcp | +22 | qwen2.5-coder:32b | qwen2.5:72b |
| 24 | mcp-observability | +23 | llama3.1:8b | llama3.1:8b |
| 25 | mcp-stream-processor | +24 | llama3.1:8b | llama3.1:8b |
| 26 | mcp-memory | +25 | llama3.1:8b | llama3.1:8b |
| 27 | mcp-frequency-tracking | +26 | llama3.1:8b | llama3.1:8b |
| 28 | mcp-orchestrator-v1 | +27 | qwen2.5-coder:32b | qwen2.5:72b |
| 29 | mcp-impact-analysis | +28 | deepseek-coder:33b | deepseek-coder:33b |
| 30 | mcp-fabric-live | +29 | qwen2.5-coder:32b | qwen2.5:72b |

---

## 📁 **FILE LOCATIONS**

### **Mac:**

```
MCP-SUITE Installation:
  ~/MCP-SUITE/

Ollama Models:
  ~/.ollama/models/

Workspaces:
  ~/OneDrive/VSCode/Personal/general-workspace/
  ~/OneDrive/VSCode/AzureClients/pathgroup-workspace/
  ~/OneDrive/VSCode/AzureClients/beacon-workspace/
  ~/OneDrive/VSCode/AzureClients/eyesouth-workspace/

Logs:
  ~/OneDrive/VSCode/Personal/general-workspace/logs/
```

### **Windows:**

```
MCP-SUITE Installation:
  C:\Users\suref\MCP-SUITE\

Ollama Models:
  C:\AI_Models\

Workspaces:
  C:\Users\suref\OneDrive\VSCode\Personal\general-workspace\
  C:\Users\suref\OneDrive\VSCode\AzureClients\pathgroup-workspace\
  C:\Users\suref\OneDrive\VSCode\AzureClients\beacon-workspace\
  C:\Users\suref\OneDrive\VSCode\AzureClients\eyesouth-workspace\

Logs:
  C:\Users\suref\OneDrive\VSCode\Personal\general-workspace\logs\
```

---

## 🚨 **EMERGENCY COMMANDS**

### **Kill Everything:**

**Mac:**
```bash
# Kill all Node processes
pkill -f node

# Kill PM2
pm2 kill

# Kill Ollama
pkill ollama
```

**Windows:**
```powershell
# Kill all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Kill PM2
pm2 kill

# Kill Ollama
Get-Process ollama -ErrorAction SilentlyContinue | Stop-Process -Force
```

### **Restart Everything:**

**Mac:**
```bash
# Stop all
./mcp-control.sh stop-all

# Wait 5 seconds
sleep 5

# Start all
./mcp-control.sh start-all
```

**Windows:**
```powershell
# Stop all
.\mcp-control.ps1 -Command stop-all

# Wait 5 seconds
Start-Sleep -Seconds 5

# Start all
.\mcp-control.ps1 -Command start-all
```

---

## 💡 **PRO TIPS**

### **1. Check What's Running:**

**Mac:**
```bash
# See all MCP processes
ps aux | grep -i mcp

# See all Node processes
ps aux | grep node
```

**Windows:**
```powershell
# See all MCP processes
Get-Process | Where-Object {$_.ProcessName -like "*node*"}

# Detailed view
Get-Process node | Format-Table Id, ProcessName, WorkingSet, CPU
```

### **2. Monitor Resource Usage:**

**Mac:**
```bash
# Watch resources in real-time
watch -n 2 './mcp-control.sh status'
```

**Windows:**
```powershell
# Watch resources in real-time
while ($true) {
    Clear-Host
    .\mcp-control.ps1 -Command status
    Start-Sleep -Seconds 2
}
```

### **3. Quick Log Tail:**

**Mac:**
```bash
# Follow logs in real-time
tail -f ~/OneDrive/VSCode/Personal/general-workspace/logs/orchestrator.log
```

**Windows:**
```powershell
# Follow logs in real-time
Get-Content C:\Users\suref\OneDrive\VSCode\Personal\general-workspace\logs\orchestrator.log -Wait -Tail 50
```

---

## 🎯 **COMMON ISSUES & FIXES**

| Issue | Mac Fix | Windows Fix |
|-------|---------|-------------|
| **Port in use** | `lsof -i :3000` then `kill -9 <PID>` | `Get-NetTCPConnection -LocalPort 3000` then `Stop-Process -Id <PID>` |
| **Ollama not running** | `ollama serve &` | `Start-Process ollama -ArgumentList "serve"` |
| **PM2 not found** | `npm install -g pm2` | `npm install -g pm2` |
| **Out of memory** | `./mcp-control.sh restart-all` | `.\mcp-control.ps1 -Command restart-all` |
| **Server won't start** | Check logs: `./mcp-control.sh logs <server>` | Check logs: `.\mcp-control.ps1 -Command logs -Server <server>` |

---

## ✅ **VERIFICATION CHECKLIST**

Use this after installation or restarts:

**Mac:**
```bash
echo "1. Ollama running?"
curl -s http://localhost:11434/api/tags > /dev/null && echo "✓ Yes" || echo "✗ No"

echo "2. Orchestrator running?"
curl -s http://localhost:3000/health > /dev/null && echo "✓ Yes" || echo "✗ No"

echo "3. All servers online?"
ONLINE=$(curl -s http://localhost:3000/api/servers | grep -o '"online"' | wc -l)
echo "✓ $ONLINE servers online"

echo "4. Memory usage?"
./mcp-control.sh status | grep -i memory
```

**Windows:**
```powershell
Write-Host "1. Ollama running?"
try { Invoke-WebRequest http://localhost:11434/api/tags -UseBasicParsing | Out-Null; Write-Host "✓ Yes" } catch { Write-Host "✗ No" }

Write-Host "2. Orchestrator running?"
try { Invoke-WebRequest http://localhost:3000/health -UseBasicParsing | Out-Null; Write-Host "✓ Yes" } catch { Write-Host "✗ No" }

Write-Host "3. All servers online?"
$servers = Invoke-RestMethod http://localhost:3000/api/servers
Write-Host "✓ $($servers.online) servers online"

Write-Host "4. Memory usage?"
.\mcp-control.ps1 -Command status
```

---

## 📚 **DOCUMENTATION LINKS**

- **Full Mac Guide:** MAC_INSTALLATION_GUIDE.md
- **Full Windows Guide:** WINDOWS_INSTALLATION_GUIDE.md
- **Model Strategy:** REVISED_MODEL_STRATEGY.md
- **Critical Mode:** CRITICAL_MODE_GUIDE.md
- **Cloud APIs:** CLOUD_API_OPTIONS.md

---

## 🎊 **QUICK STATS**

| Metric | Mac | Windows |
|--------|-----|---------|
| **Total Servers** | 30 | 30 |
| **Orchestrator** | 1 | 1 |
| **Total Processes** | 31 | 31 |
| **AI Models** | 5 | 6 |
| **Model Storage** | ~67GB | ~135GB |
| **Runtime Memory** | ~2GB | ~2-3GB |
| **Ports Used** | 30 | 30 |
| **Profiles** | 4 | 4 |

---

**This guide provides quick access to all common commands and operations!**
