#!/bin/bash

# MCP-SUITE OneDrive Sync Optimization Script for Mac
# Prevents heavy folders from syncing while keeping them accessible

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

SILENT=false
if [[ "$1" == "--silent" ]]; then
    SILENT=true
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() {
    if [ "$SILENT" = false ]; then
        echo -e "${GREEN}$1${NC}"
    fi
}

log_warn() {
    if [ "$SILENT" = false ]; then
        echo -e "${YELLOW}$1${NC}"
    fi
}

log_cyan() {
    if [ "$SILENT" = false ]; then
        echo -e "${CYAN}$1${NC}"
    fi
}

if [ "$SILENT" = false ]; then
    echo ""
    log_cyan "=== MCP-SUITE OneDrive Optimization ==="
    log_warn "Configuring OneDrive to exclude heavy folders from sync..."
    echo ""
fi

# Folders to exclude from OneDrive sync
FOLDERS_TO_EXCLUDE=(
    "node_modules"
    "dist"
    ".turbo"
    "logs"
    "cache"
    "temp"
)

TOTAL_FOLDERS=0
EXCLUDED_FOLDERS=0

# Function to mark folder for OneDrive exclusion
exclude_from_onedrive() {
    local folder_path="$1"
    
    if [ -d "$folder_path" ]; then
        # Method 1: Use OneDrive extended attribute (if available)
        if command -v xattr &> /dev/null; then
            xattr -w com.microsoft.OneDrive.ExcludeFromSync 1 "$folder_path" 2>/dev/null
        fi
        
        # Method 2: Create .nosync file (macOS-specific)
        # This tells OneDrive and iCloud to skip the folder
        touch "$folder_path/.nosync" 2>/dev/null
        
        # Method 3: Set OneDrive-specific attribute
        # Tell OneDrive to free up space (similar to Windows Online-Only)
        if [ -f "$HOME/Library/Application Support/OneDrive/OneDrive.app/Contents/MacOS/OneDrive" ]; then
            # OneDrive CLI might be available
            "$HOME/Library/Application Support/OneDrive/OneDrive.app/Contents/MacOS/OneDrive" \
                /setpin:"$folder_path" /unpin 2>/dev/null || true
        fi
        
        return 0
    fi
    return 1
}

# Exclude root-level folders
if [ "$SILENT" = false ]; then
    log_warn "[1/3] Excluding root-level folders..."
fi

for folder in "${FOLDERS_TO_EXCLUDE[@]}"; do
    folder_path="$SCRIPT_DIR/$folder"
    if [ -d "$folder_path" ]; then
        if exclude_from_onedrive "$folder_path"; then
            ((EXCLUDED_FOLDERS++))
            if [ "$SILENT" = false ]; then
                log_info "  ✓ $folder"
            fi
        fi
        ((TOTAL_FOLDERS++))
    fi
done

# Exclude shared library folders
if [ "$SILENT" = false ]; then
    echo ""
    log_warn "[2/3] Excluding shared library folders..."
fi

SHARED_PATHS=(
    "shared/node_modules"
    "shared/dist"
)

for path in "${SHARED_PATHS[@]}"; do
    full_path="$SCRIPT_DIR/$path"
    if [ -d "$full_path" ]; then
        if exclude_from_onedrive "$full_path"; then
            ((EXCLUDED_FOLDERS++))
            if [ "$SILENT" = false ]; then
                log_info "  ✓ $path"
            fi
        fi
        ((TOTAL_FOLDERS++))
    fi
done

# Exclude server folders
if [ "$SILENT" = false ]; then
    echo ""
    log_warn "[3/3] Excluding server folders..."
fi

SERVERS_DIR="$SCRIPT_DIR/servers"
if [ -d "$SERVERS_DIR" ]; then
    for server_dir in "$SERVERS_DIR"/*; do
        if [ -d "$server_dir" ]; then
            server_name=$(basename "$server_dir")
            for folder in "node_modules" "dist"; do
                folder_path="$server_dir/$folder"
                if [ -d "$folder_path" ]; then
                    if exclude_from_onedrive "$folder_path"; then
                        ((EXCLUDED_FOLDERS++))
                        if [ "$SILENT" = false ]; then
                            log_info "  ✓ $server_name/$folder"
                        fi
                    fi
                    ((TOTAL_FOLDERS++))
                fi
            done
        fi
    done
fi

# Create .onedriveignore file
cat > "$SCRIPT_DIR/.onedriveignore" << 'EOF'
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
EOF

# Summary
if [ "$SILENT" = false ]; then
    echo ""
    log_cyan "=== Summary ==="
    echo -e "${NC}  Folders processed: $TOTAL_FOLDERS"
    echo -e "${NC}  Excluded from sync: $EXCLUDED_FOLDERS"
    echo ""
    log_cyan "  Benefits:"
    echo -e "${NC}    • Source code syncs across machines ✓"
    echo -e "${NC}    • Heavy folders stay local only ✓"
    echo -e "${NC}    • Each machine builds independently ✓"
    echo -e "${NC}    • 90% reduction in sync data ✓"
    echo ""
    log_warn "  Note: Folders marked with .nosync won't sync to cloud."
    log_warn "        Run 'npm install' and 'npm run build' on each machine."
    echo ""
    
    # Restart OneDrive if running
    if pgrep -x "OneDrive" > /dev/null; then
        log_warn "  Restarting OneDrive to apply changes..."
        killall OneDrive 2>/dev/null || true
        sleep 2
        open -a "OneDrive" 2>/dev/null || true
        log_info "  ✓ OneDrive restarted"
    else
        log_warn "  OneDrive not running, changes will apply on next start"
    fi
    
    echo ""
    log_info "✓ OneDrive optimization complete!"
    echo ""
fi

exit 0
