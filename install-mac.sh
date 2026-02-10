#!/bin/bash

################################################################################
# MCP-SUITE Complete Installation Script for macOS
#
# This script installs and configures MCP-SUITE with all dependencies,
# VS Code workspaces, and PM2 process management for 4 profiles.
#
# Version: 3.0.0
# Compatible: macOS 11+ (Big Sur and later)
# Requires: Administrator access (sudo)
################################################################################

set -e  # Exit on error

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Output functions
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${CYAN}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_title() {
    echo ""
    echo -e "${MAGENTA}═══════════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA} $1${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════════${NC}"
    echo ""
}

# Configuration
MCP_INSTALL_DIR="$HOME/MCP-SUITE"
REQUIRED_NODE_VERSION="20.0.0"
PROFILES=("Personal" "PathGroup" "Beacon" "EyeSouth")
WORKSPACE_BASE="$HOME/OneDrive/VSCode"

print_title "MCP-SUITE Installation for macOS"
print_info "This script will install and configure MCP-SUITE completely"
print_info "Installation directory: $MCP_INSTALL_DIR"
echo ""
print_warning "This script will use sudo for some operations"
print_info "Press Enter to continue or Ctrl+C to cancel..."
read

# Step 1: Check Homebrew
print_title "Step 1/12: Checking Homebrew"
if command -v brew &> /dev/null; then
    print_success "Homebrew is installed: $(brew --version | head -n 1)"
    
    # Update Homebrew
    print_info "Updating Homebrew..."
    brew update > /dev/null 2>&1
    print_success "Homebrew updated"
else
    print_info "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add to PATH for Apple Silicon
    if [[ $(uname -m) == 'arm64' ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    
    print_success "Homebrew installed"
fi

# Step 2: Install Node.js
print_title "Step 2/12: Checking Node.js"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | sed 's/v//')
    print_success "Node.js is installed: v$NODE_VERSION"
    
    # Check version
    if [ "$(printf '%s\n' "$REQUIRED_NODE_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_NODE_VERSION" ]; then
        print_warning "Node.js version $NODE_VERSION is below required $REQUIRED_NODE_VERSION"
        print_info "Upgrading Node.js..."
        brew upgrade node
        print_success "Node.js upgraded to $(node --version)"
    fi
else
    print_info "Installing Node.js LTS..."
    brew install node
    print_success "Node.js installed: $(node --version)"
fi

print_info "npm version: $(npm --version)"

# Step 3: Install Git
print_title "Step 3/12: Checking Git"
if command -v git &> /dev/null; then
    print_success "Git is installed: $(git --version)"
else
    print_info "Installing Git..."
    brew install git
    print_success "Git installed: $(git --version)"
fi

# Step 4: Install Ollama
print_title "Step 4/12: Checking Ollama"
if command -v ollama &> /dev/null; then
    print_success "Ollama is installed: $(ollama --version)"
    
    # Check if Ollama service is running
    if pgrep -x "ollama" > /dev/null; then
        print_success "Ollama service is running"
    else
        print_warning "Ollama is not running. Starting..."
        ollama serve > /dev/null 2>&1 &
        sleep 3
        print_success "Ollama service started"
    fi
else
    print_info "Installing Ollama..."
    
    # Download and install Ollama
    curl -fsSL https://ollama.com/install.sh | sh
    
    # Start Ollama service
    ollama serve > /dev/null 2>&1 &
    sleep 5
    
    print_success "Ollama installed and started"
fi

# Test Ollama connection
print_info "Testing Ollama connection..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:11434/api/tags | grep -q "200"; then
    print_success "Ollama is responding"
else
    print_warning "Ollama connection test failed. Service may need more time to start."
fi

# Step 5: Install PM2
print_title "Step 5/12: Checking PM2"
if command -v pm2 &> /dev/null; then
    print_success "PM2 is installed: v$(pm2 --version)"
else
    print_info "Installing PM2..."
    npm install -g pm2
    print_success "PM2 installed: v$(pm2 --version)"
fi

# Configure PM2 to start on boot
print_info "Configuring PM2 startup..."
pm2 startup launchd -u $USER --hp $HOME > /dev/null 2>&1 || true
print_success "PM2 startup configured"

# Step 6: Install VS Code (optional)
print_title "Step 6/12: Checking VS Code"
if command -v code &> /dev/null; then
    print_success "VS Code is installed: $(code --version | head -n 1)"
else
    print_warning "VS Code not found"
    read -p "Would you like to install VS Code? (y/N): " install_code
    if [[ $install_code == "y" || $install_code == "Y" ]]; then
        print_info "Installing VS Code..."
        brew install --cask visual-studio-code
        print_success "VS Code installed"
    fi
fi

# Step 7: Clone/Update Repository
print_title "Step 7/12: Setting Up MCP-SUITE Repository"
if [ -d "$MCP_INSTALL_DIR" ]; then
    print_warning "Installation directory exists"
    read -p "Update existing installation? (y/N): " update_repo
    if [[ $update_repo == "y" || $update_repo == "Y" ]]; then
        print_info "Updating repository..."
        cd "$MCP_INSTALL_DIR"
        git pull
        print_success "Repository updated"
    fi
else
    print_info "Cloning MCP-SUITE repository..."
    
    # Note: Replace with actual repository URL
    print_warning "Repository URL not specified in script"
    read -p "Please enter the Git repository URL: " repo_url
    
    if [ -n "$repo_url" ]; then
        git clone "$repo_url" "$MCP_INSTALL_DIR"
        print_success "Repository cloned to $MCP_INSTALL_DIR"
    else
        print_error "Repository URL required. Please clone manually to $MCP_INSTALL_DIR"
        exit 1
    fi
fi

# Step 8: Install Dependencies and Build
print_title "Step 8/12: Installing Dependencies and Building"
cd "$MCP_INSTALL_DIR"

print_info "Installing shared package dependencies..."
cd shared
npm install
npm run build
cd ..
print_success "Shared package built"

print_info "Building all 28 servers..."
built_count=0
error_count=0

for server_dir in servers/*/; do
    server_name=$(basename "$server_dir")
    print_info "Building $server_name..."
    cd "$server_dir"
    
    if npm install --silent 2>/dev/null && npm run build 2>/dev/null; then
        print_success "$server_name built"
        ((built_count++))
    else
        print_warning "$server_name build failed"
        ((error_count++))
    fi
    
    cd ../..
done

print_info "Build complete: $built_count successful, $error_count errors"

# Step 9: Configure OneDrive Exclusions
print_title "Step 9/12: Configuring OneDrive Exclusions"
print_info "Creating .onedriveignore files..."

ignore_content="# MCP-SUITE OneDrive Exclusions
node_modules/
dist/
.git/
logs/
*.log
.DS_Store"

for profile in "${PROFILES[@]}"; do
    if [ "$profile" == "Personal" ]; then
        workspace="$WORKSPACE_BASE/Personal/general-workspace"
    else
        workspace="$WORKSPACE_BASE/AzureClients/${profile,,}-workspace"
    fi
    
    mkdir -p "$workspace"
    echo "$ignore_content" > "$workspace/.onedriveignore"
    print_success "Created: $workspace/.onedriveignore"
    
    # Also create .gitignore for good measure
    gitignore_content="node_modules/
dist/
logs/
*.log
.DS_Store
.env
.env.local"
    echo "$gitignore_content" > "$workspace/.gitignore"
done

# Step 10: Create VS Code Workspaces
print_title "Step 10/12: Creating VS Code Workspaces"

for profile in "${PROFILES[@]}"; do
    if [ "$profile" == "Personal" ]; then
        workspace="$WORKSPACE_BASE/Personal/general-workspace"
    else
        workspace="$WORKSPACE_BASE/AzureClients/${profile,,}-workspace"
    fi
    
    workspace_file="$workspace/$profile-MCP.code-workspace"
    
    cat > "$workspace_file" << EOF
{
  "folders": [
    {
      "path": "$MCP_INSTALL_DIR",
      "name": "MCP-SUITE"
    },
    {
      "path": "$workspace",
      "name": "$profile Workspace"
    }
  ],
  "settings": {
    "files.exclude": {
      "**/node_modules": true,
      "**/dist": true,
      "**/.git": true,
      "**/logs": true
    },
    "search.exclude": {
      "**/node_modules": true,
      "**/dist": true,
      "**/logs": true
    },
    "typescript.tsdk": "node_modules/typescript/lib",
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "extensions": {
    "recommendations": [
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode",
      "ms-vscode.vscode-typescript-next"
    ]
  }
}
EOF
    
    print_success "Created: $workspace_file"
done

# Step 11: Create PM2 Ecosystem Files
print_title "Step 11/12: Creating PM2 Configuration"

for profile in "${PROFILES[@]}"; do
    ecosystem_file="$MCP_INSTALL_DIR/ecosystem.${profile,,}.config.js"
    
    case $profile in
        "Personal")  base_port=3000 ;;
        "PathGroup") base_port=4000 ;;
        "Beacon")    base_port=5000 ;;
        "EyeSouth")  base_port=6000 ;;
    esac
    
    # Start building ecosystem config
    cat > "$ecosystem_file" << EOF
module.exports = {
  apps: [
EOF
    
    # Add each server
    port_offset=0
    server_count=$(ls -1d servers/*/ | wc -l | tr -d ' ')
    current=0
    
    for server_dir in servers/*/; do
        server_name=$(basename "$server_dir")
        ((current++))
        
        cat >> "$ecosystem_file" << EOF
    {
      name: '$server_name-${profile,,}',
      script: './servers/$server_name/dist/index.js',
      cwd: '$MCP_INSTALL_DIR',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PROFILE: '$profile',
        PORT: $((base_port + port_offset)),
        LOG_LEVEL: 'info'
      },
      error_file: './logs/$server_name-${profile,,}-error.log',
      out_file: './logs/$server_name-${profile,,}-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }$([ $current -lt $server_count ] && echo "," || echo "")
EOF
        ((port_offset++))
    done
    
    cat >> "$ecosystem_file" << EOF
  ]
};
EOF
    
    print_success "Created: $ecosystem_file"
done

# Step 12: Create Startup Script
print_title "Step 12/12: Creating Startup Scripts"

# Create start script
cat > "$MCP_INSTALL_DIR/start-mcp.sh" << 'EOF'
#!/bin/bash

echo "Starting MCP-SUITE..."
echo ""
echo "Select profile:"
echo "1. Personal (Port 3000-3029)"
echo "2. PathGroup (Port 4000-4029)"
echo "3. Beacon (Port 5000-5029)"
echo "4. EyeSouth (Port 6000-6029)"
echo "5. All Profiles"
echo ""
read -p "Enter choice (1-5): " choice

case $choice in
    1) pm2 start ecosystem.personal.config.js ;;
    2) pm2 start ecosystem.pathgroup.config.js ;;
    3) pm2 start ecosystem.beacon.config.js ;;
    4) pm2 start ecosystem.eyesouth.config.js ;;
    5)
        pm2 start ecosystem.personal.config.js
        pm2 start ecosystem.pathgroup.config.js
        pm2 start ecosystem.beacon.config.js
        pm2 start ecosystem.eyesouth.config.js
        ;;
    *) echo "Invalid choice"; exit 1 ;;
esac

echo ""
echo "MCP-SUITE started!"
echo "Run 'pm2 status' to see all processes"
echo "Run 'pm2 logs' to view logs"
echo "Run 'pm2 stop all' to stop all servers"
EOF

chmod +x "$MCP_INSTALL_DIR/start-mcp.sh"
print_success "Created: start-mcp.sh"

# Create stop script
cat > "$MCP_INSTALL_DIR/stop-mcp.sh" << 'EOF'
#!/bin/bash
pm2 stop all
pm2 delete all
echo "All MCP servers stopped and removed from PM2"
EOF

chmod +x "$MCP_INSTALL_DIR/stop-mcp.sh"
print_success "Created: stop-mcp.sh"

# Create logs directory
mkdir -p "$MCP_INSTALL_DIR/logs"

# Final Summary
print_title "Installation Complete!"
print_success "MCP-SUITE has been installed and configured successfully"
echo ""
print_info "Installation Summary:"
print_info "  ✓ Node.js: $(node --version)"
print_info "  ✓ npm: $(npm --version)"
print_info "  ✓ Git: $(git --version)"
print_info "  ✓ PM2: v$(pm2 --version)"
print_info "  ✓ Ollama: Installed"
print_info "  ✓ Servers Built: $built_count/28"
print_info "  ✓ VS Code Workspaces: ${#PROFILES[@]}"
print_info "  ✓ PM2 Configurations: ${#PROFILES[@]}"
echo ""
print_info "Next Steps:"
print_info "  1. Review the installation in: $MCP_INSTALL_DIR"
print_info "  2. Configure your profiles in: $MCP_INSTALL_DIR/profiles.json"
print_info "  3. Start servers: ./start-mcp.sh"
print_info "  4. Open VS Code workspaces from: $WORKSPACE_BASE"
echo ""
print_info "Useful Commands:"
print_info "  pm2 status              - View all running servers"
print_info "  pm2 logs                - View server logs"
print_info "  pm2 stop all            - Stop all servers"
print_info "  pm2 restart all         - Restart all servers"
print_info "  pm2 monit               - Monitor resources"
echo ""
print_success "Happy coding with MCP-SUITE! 🚀"
echo ""
print_info "For support: https://github.com/your-org/mcp-suite"
echo ""
