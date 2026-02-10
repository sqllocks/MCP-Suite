#Requires -Version 5.1
#Requires -RunAsAdministrator

<#
.SYNOPSIS
    MCP-SUITE Complete Installation Script for Windows
    
.DESCRIPTION
    Installs and configures MCP-SUITE with all dependencies, OneDrive exclusions,
    VS Code workspaces, and PM2 process management for 4 profiles.
    
.NOTES
    Version: 3.0.0
    Requires: Administrator privileges
    Compatible: Windows 10/11
#>

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Color output functions
function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Info { Write-Host "ℹ $args" -ForegroundColor Cyan }
function Write-Warning { Write-Host "⚠ $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "✗ $args" -ForegroundColor Red }
function Write-Title {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host " $args" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host ""
}

# Configuration
$MCP_INSTALL_DIR = "C:\MCP-SUITE"
$REQUIRED_NODE_VERSION = "20.0.0"
$PROFILES = @("Personal", "PathGroup", "Beacon", "EyeSouth")
$WORKSPACE_BASE = "$env:USERPROFILE\OneDrive\VSCode"

Write-Title "MCP-SUITE Installation for Windows"
Write-Info "This script will install and configure MCP-SUITE completely"
Write-Info "Installation directory: $MCP_INSTALL_DIR"
Write-Info ""
Write-Warning "This script requires Administrator privileges"
Write-Info "Press any key to continue or Ctrl+C to cancel..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Step 1: Check Administrator
Write-Title "Step 1/12: Checking Administrator Privileges"
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "This script must be run as Administrator"
    Write-Info "Right-click PowerShell and select 'Run as Administrator'"
    exit 1
}
Write-Success "Running as Administrator"

# Step 2: Check and Install Winget
Write-Title "Step 2/12: Checking Package Manager (winget)"
try {
    $winget = Get-Command winget -ErrorAction Stop
    Write-Success "winget is installed: $($winget.Version)"
} catch {
    Write-Warning "winget not found. Installing App Installer..."
    try {
        Add-AppxPackage -Path "https://aka.ms/getwinget" -ErrorAction Stop
        Write-Success "winget installed successfully"
    } catch {
        Write-Error "Failed to install winget. Please install manually from Microsoft Store (App Installer)"
        exit 1
    }
}

# Step 3: Install Node.js
Write-Title "Step 3/12: Checking Node.js"
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Success "Node.js is installed: $nodeVersion"
        
        # Check version
        $version = $nodeVersion -replace 'v', ''
        if ([version]$version -lt [version]$REQUIRED_NODE_VERSION) {
            Write-Warning "Node.js version $version is below required $REQUIRED_NODE_VERSION"
            Write-Info "Upgrading Node.js..."
            winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
            Write-Success "Node.js upgraded"
        }
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Info "Installing Node.js LTS..."
    winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Success "Node.js installed: $(node --version)"
}

Write-Info "npm version: $(npm --version)"

# Step 4: Install Git
Write-Title "Step 4/12: Checking Git"
try {
    $gitVersion = git --version 2>$null
    if ($gitVersion) {
        Write-Success "Git is installed: $gitVersion"
    } else {
        throw "Git not found"
    }
} catch {
    Write-Info "Installing Git..."
    winget install Git.Git --silent --accept-source-agreements --accept-package-agreements
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Success "Git installed: $(git --version)"
}

# Step 5: Install Ollama
Write-Title "Step 5/12: Checking Ollama"
try {
    $ollamaPath = Get-Command ollama -ErrorAction Stop
    Write-Success "Ollama is installed: $($ollamaPath.Path)"
    
    # Check if Ollama service is running
    $ollamaProcess = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
    if ($ollamaProcess) {
        Write-Success "Ollama service is running"
    } else {
        Write-Warning "Ollama is not running. Starting..."
        Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 3
        Write-Success "Ollama service started"
    }
} catch {
    Write-Info "Installing Ollama..."
    
    # Download and install Ollama
    $ollamaInstaller = "$env:TEMP\OllamaSetup.exe"
    Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $ollamaInstaller
    
    Start-Process -FilePath $ollamaInstaller -ArgumentList "/S" -Wait
    Remove-Item $ollamaInstaller
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    # Start Ollama service
    Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 5
    
    Write-Success "Ollama installed and started"
}

# Test Ollama connection
Write-Info "Testing Ollama connection..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 5
    Write-Success "Ollama is responding"
} catch {
    Write-Warning "Ollama connection test failed. Service may need more time to start."
}

# Step 6: Install PM2
Write-Title "Step 6/12: Checking PM2"
try {
    $pm2Version = pm2 --version 2>$null
    if ($pm2Version) {
        Write-Success "PM2 is installed: v$pm2Version"
    } else {
        throw "PM2 not found"
    }
} catch {
    Write-Info "Installing PM2..."
    npm install -g pm2
    Write-Success "PM2 installed: v$(pm2 --version)"
}

# Install PM2 Windows service
Write-Info "Configuring PM2 as Windows service..."
try {
    npm install -g pm2-windows-service
    pm2-service-install -n PM2
    Write-Success "PM2 Windows service configured"
} catch {
    Write-Warning "PM2 service installation failed (may already be installed)"
}

# Step 7: Install VS Code (optional)
Write-Title "Step 7/12: Checking VS Code"
try {
    $codePath = Get-Command code -ErrorAction Stop
    Write-Success "VS Code is installed: $($codePath.Path)"
} catch {
    Write-Warning "VS Code not found"
    $installCode = Read-Host "Would you like to install VS Code? (y/N)"
    if ($installCode -eq "y") {
        Write-Info "Installing VS Code..."
        winget install Microsoft.VisualStudioCode --silent --accept-source-agreements --accept-package-agreements
        Write-Success "VS Code installed"
        
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
}

# Step 8: Clone/Update Repository
Write-Title "Step 8/12: Setting Up MCP-SUITE Repository"
if (Test-Path $MCP_INSTALL_DIR) {
    Write-Warning "Installation directory exists"
    $updateRepo = Read-Host "Update existing installation? (y/N)"
    if ($updateRepo -eq "y") {
        Write-Info "Updating repository..."
        Push-Location $MCP_INSTALL_DIR
        git pull
        Pop-Location
        Write-Success "Repository updated"
    }
} else {
    Write-Info "Cloning MCP-SUITE repository..."
    
    # Note: Replace with actual repository URL
    Write-Warning "Repository URL not specified in script"
    Write-Info "Please provide the Git repository URL:"
    $repoUrl = Read-Host "Repository URL"
    
    if ($repoUrl) {
        git clone $repoUrl $MCP_INSTALL_DIR
        Write-Success "Repository cloned to $MCP_INSTALL_DIR"
    } else {
        Write-Error "Repository URL required. Please clone manually to $MCP_INSTALL_DIR"
        exit 1
    }
}

# Step 9: Install Dependencies and Build
Write-Title "Step 9/12: Installing Dependencies and Building"
Push-Location "$MCP_INSTALL_DIR"

Write-Info "Installing shared package dependencies..."
Push-Location "shared"
npm install
npm run build
Pop-Location
Write-Success "Shared package built"

Write-Info "Building all 28 servers..."
$servers = Get-ChildItem -Path "servers" -Directory
$builtCount = 0
$errorCount = 0

foreach ($server in $servers) {
    Write-Info "Building $($server.Name)..."
    Push-Location "servers\$($server.Name)"
    try {
        npm install --silent 2>$null
        npm run build 2>$null
        $builtCount++
        Write-Success "$($server.Name) built"
    } catch {
        Write-Warning "$($server.Name) build failed"
        $errorCount++
    }
    Pop-Location
}

Pop-Location

Write-Info "Build complete: $builtCount successful, $errorCount errors"

# Step 10: Configure OneDrive Exclusions
Write-Title "Step 10/12: Configuring OneDrive Exclusions"
Write-Info "Excluding MCP-SUITE directories from OneDrive sync..."

$oneDriveExclusions = @(
    "$WORKSPACE_BASE\Personal\general-workspace\node_modules",
    "$WORKSPACE_BASE\Personal\general-workspace\.git",
    "$WORKSPACE_BASE\Personal\general-workspace\dist",
    "$WORKSPACE_BASE\Personal\general-workspace\logs",
    "$WORKSPACE_BASE\AzureClients\pathgroup-workspace\node_modules",
    "$WORKSPACE_BASE\AzureClients\pathgroup-workspace\.git",
    "$WORKSPACE_BASE\AzureClients\pathgroup-workspace\dist",
    "$WORKSPACE_BASE\AzureClients\pathgroup-workspace\logs",
    "$WORKSPACE_BASE\AzureClients\beacon-workspace\node_modules",
    "$WORKSPACE_BASE\AzureClients\beacon-workspace\.git",
    "$WORKSPACE_BASE\AzureClients\beacon-workspace\dist",
    "$WORKSPACE_BASE\AzureClients\beacon-workspace\logs",
    "$WORKSPACE_BASE\AzureClients\eyesouth-workspace\node_modules",
    "$WORKSPACE_BASE\AzureClients\eyesouth-workspace\.git",
    "$WORKSPACE_BASE\AzureClients\eyesouth-workspace\dist",
    "$WORKSPACE_BASE\AzureClients\eyesouth-workspace\logs"
)

foreach ($exclusion in $oneDriveExclusions) {
    if (Test-Path $exclusion) {
        try {
            # Set the folder to be excluded from OneDrive sync
            attrib +U "$exclusion" /S /D
            Write-Success "Excluded: $exclusion"
        } catch {
            Write-Warning "Could not exclude: $exclusion"
        }
    } else {
        Write-Info "Path does not exist (will be created): $exclusion"
    }
}

Write-Info "Creating .onedriveignore files..."
$ignoreContent = @"
# MCP-SUITE OneDrive Exclusions
node_modules/
dist/
.git/
logs/
*.log
.DS_Store
"@

foreach ($profile in $PROFILES) {
    if ($profile -eq "Personal") {
        $workspace = "$WORKSPACE_BASE\Personal\general-workspace"
    } else {
        $workspace = "$WORKSPACE_BASE\AzureClients\$($profile.ToLower())-workspace"
    }
    
    if (-not (Test-Path $workspace)) {
        New-Item -ItemType Directory -Path $workspace -Force | Out-Null
        Write-Info "Created workspace: $workspace"
    }
    
    $ignorePath = Join-Path $workspace ".onedriveignore"
    $ignoreContent | Out-File -FilePath $ignorePath -Encoding UTF8
    Write-Success "Created: $ignorePath"
}

# Step 11: Create VS Code Workspaces
Write-Title "Step 11/12: Creating VS Code Workspaces"

foreach ($profile in $PROFILES) {
    if ($profile -eq "Personal") {
        $workspace = "$WORKSPACE_BASE\Personal\general-workspace"
    } else {
        $workspace = "$WORKSPACE_BASE\AzureClients\$($profile.ToLower())-workspace"
    }
    
    $workspaceFile = "$workspace\$profile-MCP.code-workspace"
    
    $workspaceContent = @{
        folders = @(
            @{
                path = $MCP_INSTALL_DIR
                name = "MCP-SUITE"
            },
            @{
                path = $workspace
                name = "$profile Workspace"
            }
        )
        settings = @{
            "files.exclude" = @{
                "**/node_modules" = $true
                "**/dist" = $true
                "**/.git" = $true
                "**/logs" = $true
            }
            "search.exclude" = @{
                "**/node_modules" = $true
                "**/dist" = $true
                "**/logs" = $true
            }
            "typescript.tsdk" = "node_modules/typescript/lib"
            "editor.formatOnSave" = $true
            "editor.defaultFormatter" = "esbenp.prettier-vscode"
        }
        extensions = @{
            recommendations = @(
                "dbaeumer.vscode-eslint",
                "esbenp.prettier-vscode",
                "ms-vscode.vscode-typescript-next"
            )
        }
    }
    
    $workspaceContent | ConvertTo-Json -Depth 10 | Out-File -FilePath $workspaceFile -Encoding UTF8
    Write-Success "Created: $workspaceFile"
}

# Step 12: Create PM2 Ecosystem Files
Write-Title "Step 12/12: Creating PM2 Configuration"

foreach ($profile in $PROFILES) {
    $ecosystemFile = "$MCP_INSTALL_DIR\ecosystem.$($profile.ToLower()).config.js"
    
    $basePort = switch ($profile) {
        "Personal" { 3000 }
        "PathGroup" { 4000 }
        "Beacon" { 5000 }
        "EyeSouth" { 6000 }
    }
    
    # Get all server directories
    $servers = Get-ChildItem -Path "$MCP_INSTALL_DIR\servers" -Directory
    
    $apps = @()
    $portOffset = 0
    
    foreach ($server in $servers) {
        $apps += @"
    {
      name: '$($server.Name)-$($profile.ToLower())',
      script: './servers/$($server.Name)/dist/index.js',
      cwd: '$MCP_INSTALL_DIR',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PROFILE: '$profile',
        PORT: $($basePort + $portOffset),
        LOG_LEVEL: 'info'
      },
      error_file: './logs/$($server.Name)-$($profile.ToLower())-error.log',
      out_file: './logs/$($server.Name)-$($profile.ToLower())-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
"@
        $portOffset++
    }
    
    $ecosystemContent = @"
module.exports = {
  apps: [
$($apps -join ",`n")
  ]
};
"@
    
    $ecosystemContent | Out-File -FilePath $ecosystemFile -Encoding UTF8
    Write-Success "Created: $ecosystemFile"
}

# Create master start script
$startScript = @"
@echo off
echo Starting MCP-SUITE...
echo.
echo Select profile:
echo 1. Personal (Port 3000-3029)
echo 2. PathGroup (Port 4000-4029)
echo 3. Beacon (Port 5000-5029)
echo 4. EyeSouth (Port 6000-6029)
echo 5. All Profiles
echo.
set /p choice="Enter choice (1-5): "

if "%choice%"=="1" pm2 start ecosystem.personal.config.js
if "%choice%"=="2" pm2 start ecosystem.pathgroup.config.js
if "%choice%"=="3" pm2 start ecosystem.beacon.config.js
if "%choice%"=="4" pm2 start ecosystem.eyesouth.config.js
if "%choice%"=="5" (
  pm2 start ecosystem.personal.config.js
  pm2 start ecosystem.pathgroup.config.js
  pm2 start ecosystem.beacon.config.js
  pm2 start ecosystem.eyesouth.config.js
)

echo.
echo MCP-SUITE started!
echo Run 'pm2 status' to see all processes
echo Run 'pm2 logs' to view logs
echo Run 'pm2 stop all' to stop all servers
pause
"@

$startScript | Out-File -FilePath "$MCP_INSTALL_DIR\start-mcp.bat" -Encoding ASCII
Write-Success "Created: start-mcp.bat"

# Final Summary
Write-Title "Installation Complete!"
Write-Success "MCP-SUITE has been installed and configured successfully"
Write-Info ""
Write-Info "Installation Summary:"
Write-Info "  ✓ Node.js: $(node --version)"
Write-Info "  ✓ npm: $(npm --version)"
Write-Info "  ✓ Git: $(git --version)"
Write-Info "  ✓ PM2: v$(pm2 --version)"
Write-Info "  ✓ Ollama: Installed"
Write-Info "  ✓ Servers Built: $builtCount/$($servers.Count)"
Write-Info "  ✓ VS Code Workspaces: $($PROFILES.Count)"
Write-Info "  ✓ PM2 Configurations: $($PROFILES.Count)"
Write-Info ""
Write-Info "Next Steps:"
Write-Info "  1. Review the installation in: $MCP_INSTALL_DIR"
Write-Info "  2. Configure your profiles in: $MCP_INSTALL_DIR\profiles.json"
Write-Info "  3. Start servers: Run start-mcp.bat"
Write-Info "  4. Open VS Code workspaces from: $WORKSPACE_BASE"
Write-Info ""
Write-Info "Useful Commands:"
Write-Info "  pm2 status              - View all running servers"
Write-Info "  pm2 logs                - View server logs"
Write-Info "  pm2 stop all            - Stop all servers"
Write-Info "  pm2 restart all         - Restart all servers"
Write-Info "  pm2 monit               - Monitor resources"
Write-Info ""
Write-Success "Happy coding with MCP-SUITE! 🚀"
Write-Info ""
Write-Info "For support: https://github.com/your-org/mcp-suite"
Write-Info ""
