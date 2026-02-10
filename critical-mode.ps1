# Critical Mode Toggle Script for Windows
# Enables/disables critical mode across all MCP servers

param(
    [Parameter(Mandatory=$false)]
    [string]$Profile,
    
    [Parameter(Mandatory=$false)]
    [switch]$Enable,
    
    [Parameter(Mandatory=$false)]
    [switch]$Disable,
    
    [Parameter(Mandatory=$false)]
    [switch]$Status,
    
    [Parameter(Mandatory=$false)]
    [string]$Reason
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

if (-not $Profile) {
    $Profile = $env:MCP_PROFILE
    if (-not $Profile) {
        $Profile = "Personal"
    }
}

# Helper functions
function Log-Info {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Green
}

function Log-Warn {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Yellow
}

function Log-Error {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Red
}

# Show status
if ($Status) {
    $CurrentMode = "false"
    if (Test-Path ".env") {
        $envContent = Get-Content ".env"
        $criticalLine = $envContent | Where-Object { $_ -match '^CRITICAL_MODE=' }
        if ($criticalLine) {
            $CurrentMode = $criticalLine -replace 'CRITICAL_MODE=', ''
        }
    }
    
    Log-Info "Critical Mode Status for profile: $Profile"
    Write-Host "  Current mode: $CurrentMode"
    
    if ($CurrentMode -eq "true") {
        Log-Warn "  Critical mode is ENABLED"
    } else {
        Log-Info "  Critical mode is DISABLED (normal operation)"
    }
    exit 0
}

# Enable critical mode
if ($Enable) {
    Log-Warn "Enabling critical mode for profile: $Profile"
    
    if (-not $Reason) {
        Log-Error "Error: -Reason is required when enabling critical mode"
        exit 1
    }
    
    # Update .env file
    $envPath = ".env"
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath
        $newContent = @()
        $found = $false
        
        foreach ($line in $envContent) {
            if ($line -match '^CRITICAL_MODE=') {
                $newContent += "CRITICAL_MODE=true"
                $found = $true
            } else {
                $newContent += $line
            }
        }
        
        if (-not $found) {
            $newContent += "CRITICAL_MODE=true"
        }
        
        $newContent | Set-Content $envPath
    } else {
        "CRITICAL_MODE=true" | Set-Content $envPath
    }
    
    # Log the reason
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logDir = "logs"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir | Out-Null
    }
    "$Timestamp - Critical mode ENABLED - Reason: $Reason" | Add-Content "logs\critical-mode.log"
    
    Log-Info "✓ Critical mode enabled"
    Write-Host "  Reason: $Reason"
    Write-Host "  Profile: $Profile"
    Write-Host ""
    Log-Warn "⚠️  Servers will use better models or cloud APIs (may incur costs)"
    Write-Host "   Remember to disable when resolved!"
    Write-Host ""
    Write-Host "Restart servers for changes to take effect:"
    Write-Host "  .\mcp-control.ps1 -Command restart-all"
    
    exit 0
}

# Disable critical mode
if ($Disable) {
    Log-Info "Disabling critical mode for profile: $Profile"
    
    # Update .env file
    $envPath = ".env"
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath
        $newContent = @()
        $found = $false
        
        foreach ($line in $envContent) {
            if ($line -match '^CRITICAL_MODE=') {
                $newContent += "CRITICAL_MODE=false"
                $found = $true
            } else {
                $newContent += $line
            }
        }
        
        if (-not $found) {
            $newContent += "CRITICAL_MODE=false"
        }
        
        $newContent | Set-Content $envPath
    } else {
        "CRITICAL_MODE=false" | Set-Content $envPath
    }
    
    # Log the change
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logDir = "logs"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir | Out-Null
    }
    "$Timestamp - Critical mode DISABLED" | Add-Content "logs\critical-mode.log"
    
    Log-Info "✓ Critical mode disabled"
    Write-Host "  Profile: $Profile"
    Write-Host "  Servers will return to normal operation"
    Write-Host ""
    Write-Host "Restart servers for changes to take effect:"
    Write-Host "  .\mcp-control.ps1 -Command restart-all"
    
    exit 0
}

# No action specified - show help
Write-Host "Critical Mode Toggle Script"
Write-Host ""
Write-Host "Usage: .\critical-mode.ps1 [options]"
Write-Host ""
Write-Host "Options:"
Write-Host "  -Profile <name>    Profile to use (default: $Profile)"
Write-Host "  -Enable            Enable critical mode"
Write-Host "  -Disable           Disable critical mode"
Write-Host "  -Status            Show current critical mode status"
Write-Host "  -Reason <text>     Reason for enabling (required with -Enable)"
Write-Host ""
Write-Host "Examples:"
Write-Host '  .\critical-mode.ps1 -Status'
Write-Host '  .\critical-mode.ps1 -Enable -Reason "Production incident"'
Write-Host '  .\critical-mode.ps1 -Disable'
Write-Host ""
exit 1
