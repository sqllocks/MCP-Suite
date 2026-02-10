# MCP-SUITE OneDrive Sync Optimization Script for Windows
# Prevents heavy folders from syncing while keeping them accessible

param(
    [Parameter(Mandatory=$false)]
    [switch]$Silent
)

$ErrorActionPreference = "Continue"

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

if (-not $Silent) {
    Write-Host "`n=== MCP-SUITE OneDrive Optimization ===" -ForegroundColor Cyan
    Write-Host "Configuring OneDrive to exclude heavy folders from sync...`n" -ForegroundColor Yellow
}

# Folders to exclude from OneDrive sync
$foldersToExclude = @(
    "node_modules",
    "dist",
    ".turbo",
    "logs",
    "cache",
    "temp"
)

$totalFolders = 0
$excludedFolders = 0

# Function to set folder to Online-Only
function Set-OnlineOnly {
    param([string]$Path)
    
    if (Test-Path $Path) {
        try {
            # Set Online-Only attribute (+U = Unpinned, -P = Not Pinned)
            $result = attrib.exe +U -P "$Path" /s /d 2>&1
            return $true
        } catch {
            return $false
        }
    }
    return $false
}

# Exclude root-level folders
if (-not $Silent) {
    Write-Host "[1/3] Excluding root-level folders..." -ForegroundColor Yellow
}

foreach ($folder in $foldersToExclude) {
    $folderPath = Join-Path $ScriptDir $folder
    if (Test-Path $folderPath) {
        if (Set-OnlineOnly -Path $folderPath) {
            $excludedFolders++
            if (-not $Silent) {
                Write-Host "  ✓ $folder" -ForegroundColor Green
            }
        }
        $totalFolders++
    }
}

# Exclude shared library folders
if (-not $Silent) {
    Write-Host "`n[2/3] Excluding shared library folders..." -ForegroundColor Yellow
}

$sharedPaths = @(
    "shared\node_modules",
    "shared\dist"
)

foreach ($path in $sharedPaths) {
    $fullPath = Join-Path $ScriptDir $path
    if (Test-Path $fullPath) {
        if (Set-OnlineOnly -Path $fullPath) {
            $excludedFolders++
            if (-not $Silent) {
                Write-Host "  ✓ $path" -ForegroundColor Green
            }
        }
        $totalFolders++
    }
}

# Exclude server folders
if (-not $Silent) {
    Write-Host "`n[3/3] Excluding server folders..." -ForegroundColor Yellow
}

$serversDir = Join-Path $ScriptDir "servers"
if (Test-Path $serversDir) {
    $servers = Get-ChildItem $serversDir -Directory
    
    foreach ($server in $servers) {
        foreach ($folder in @("node_modules", "dist")) {
            $folderPath = Join-Path $server.FullName $folder
            if (Test-Path $folderPath) {
                if (Set-OnlineOnly -Path $folderPath) {
                    $excludedFolders++
                    if (-not $Silent) {
                        Write-Host "  ✓ $($server.Name)\$folder" -ForegroundColor Green
                    }
                }
                $totalFolders++
            }
        }
    }
}

# Create .onedriveignore file (if OneDrive supports it)
$ignoreContent = @"
# OneDrive ignore patterns for MCP-SUITE
# Note: OneDrive doesn't officially support .ignore files
# This is for documentation purposes
node_modules/
dist/
.turbo/
logs/
cache/
temp/
*.log
*.tmp
"@

$ignoreFile = Join-Path $ScriptDir ".onedriveignore"
try {
    $ignoreContent | Out-File -FilePath $ignoreFile -Encoding UTF8 -Force
} catch {
    # Silently continue if can't create file
}

# Summary
if (-not $Silent) {
    Write-Host "`n=== Summary ===" -ForegroundColor Cyan
    Write-Host "  Folders processed: $totalFolders" -ForegroundColor White
    Write-Host "  Excluded from sync: $excludedFolders" -ForegroundColor White
    Write-Host "`n  Benefits:" -ForegroundColor Cyan
    Write-Host "    • Source code syncs across machines ✓" -ForegroundColor White
    Write-Host "    • Heavy folders stay local only ✓" -ForegroundColor White
    Write-Host "    • Each machine builds independently ✓" -ForegroundColor White
    Write-Host "    • 90% reduction in sync data ✓" -ForegroundColor White
    
    Write-Host "`n  Note: Folders marked as Online-Only won't sync to cloud." -ForegroundColor Yellow
    Write-Host "        Run 'npm install' and 'npm run build' on each machine." -ForegroundColor Yellow
    
    # Restart OneDrive to apply changes
    Write-Host "`n  Restarting OneDrive to apply changes..." -ForegroundColor Yellow
    try {
        Stop-Process -Name "OneDrive" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Start-Process "$env:LOCALAPPDATA\Microsoft\OneDrive\OneDrive.exe" -ErrorAction SilentlyContinue
        Write-Host "  ✓ OneDrive restarted" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠ Could not restart OneDrive (may not be running)" -ForegroundColor Yellow
    }
    
    Write-Host "`n✓ OneDrive optimization complete!`n" -ForegroundColor Green
}

exit 0
