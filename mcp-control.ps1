# MCP-SUITE Control Script for Windows
# Manages all MCP servers via PM2

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('start-orchestrator', 'stop-orchestrator', 'start-all', 'stop-all', 'restart-all', 'status', 'logs', 'start-server', 'stop-server', 'optimize-onedrive')]
    [string]$Command,
    
    [Parameter(Mandatory=$false)]
    [string]$Server,
    
    [Parameter(Mandatory=$false)]
    [int]$Lines = 50
)

$ErrorActionPreference = "Stop"

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Load environment variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$Profile = $env:MCP_PROFILE
if (-not $Profile) {
    $Profile = "Personal"
}

# Helper functions
function Log-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Log-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Log-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if PM2 is installed
function Test-PM2 {
    try {
        $null = Get-Command pm2 -ErrorAction Stop
    } catch {
        Log-Error "PM2 is not installed. Please install it with: npm install -g pm2"
        exit 1
    }
}

# Start orchestrator
function Start-Orchestrator {
    Log-Info "Starting MCP Orchestrator for profile: $Profile"
    
    Set-Location "servers\mcp-orchestrator-v1"
    pm2 start dist/index.js --name "$($Profile.ToLower())-orchestrator" --update-env
    Set-Location ..\..
    
    Log-Info "Orchestrator started successfully"
}

# Stop orchestrator
function Stop-Orchestrator {
    Log-Info "Stopping MCP Orchestrator"
    pm2 delete "$($Profile.ToLower())-orchestrator" 2>$null
    Log-Info "Orchestrator stopped"
}

# Start all servers
function Start-All {
    Log-Info "Starting all MCP servers for profile: $Profile"
    
    Start-Orchestrator
    
    # Start all individual servers using PM2 ecosystem file
    pm2 start ecosystem.config.js --update-env
    
    Log-Info "All servers started successfully"
    pm2 list
}

# Stop all servers
function Stop-All {
    Log-Info "Stopping all MCP servers"
    
    pm2 delete all 2>$null
    
    Log-Info "All servers stopped"
}

# Restart all servers
function Restart-All {
    Log-Info "Restarting all MCP servers"
    pm2 restart all
    Log-Info "All servers restarted"
}

# Show status
function Show-Status {
    pm2 list
}

# Show logs
function Show-Logs {
    param(
        [string]$ServerName = "all",
        [int]$LineCount = 50
    )
    
    if ($ServerName -eq "all") {
        pm2 logs --lines $LineCount
    } else {
        pm2 logs $ServerName --lines $LineCount
    }
}

# Start specific server
function Start-Server {
    param([string]$ServerName)
    
    if (-not $ServerName) {
        Log-Error "Server name required"
        exit 1
    }
    
    Log-Info "Starting server: $ServerName"
    pm2 start "$($Profile.ToLower())-$ServerName"
    Log-Info "Server started: $ServerName"
}

# Stop specific server
function Stop-Server {
    param([string]$ServerName)
    
    if (-not $ServerName) {
        Log-Error "Server name required"
        exit 1
    }
    
    Log-Info "Stopping server: $ServerName"
    pm2 stop "$($Profile.ToLower())-$ServerName"
    Log-Info "Server stopped: $ServerName"
}

# Optimize OneDrive sync
function Optimize-OneDrive {
    Log-Info "Running OneDrive optimization..."
    Log-Info "This will exclude heavy folders from OneDrive sync"
    
    try {
        & "$ScriptDir\optimize-onedrive.ps1"
        Log-Info "OneDrive optimization complete!"
    } catch {
        Log-Error "OneDrive optimization failed: $($_.Exception.Message)"
        exit 1
    }
}

# Main command handler
Test-PM2

switch ($Command) {
    'start-orchestrator' { Start-Orchestrator }
    'stop-orchestrator' { Stop-Orchestrator }
    'start-all' { Start-All }
    'stop-all' { Stop-All }
    'restart-all' { Restart-All }
    'status' { Show-Status }
    'logs' { Show-Logs -ServerName $Server -LineCount $Lines }
    'start-server' { Start-Server -ServerName $Server }
    'stop-server' { Stop-Server -ServerName $Server }
    'optimize-onedrive' { Optimize-OneDrive }
}

Write-Host "`nCurrent profile: $Profile" -ForegroundColor Cyan
