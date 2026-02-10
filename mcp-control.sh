#!/bin/bash

# MCP-SUITE Control Script for Mac
# Manages all MCP servers via PM2

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

PROFILE=${MCP_PROFILE:-Personal}
LOG_DIR="logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check if PM2 is installed
check_pm2() {
  if ! command -v pm2 &> /dev/null; then
    log_error "PM2 is not installed. Please install it with: npm install -g pm2"
    exit 1
  fi
}

# Start orchestrator
start_orchestrator() {
  log_info "Starting MCP Orchestrator for profile: $PROFILE"
  
  cd servers/mcp-orchestrator-v1
  pm2 start dist/index.js --name "${PROFILE,,}-orchestrator" --update-env
  cd ../..
  
  log_info "Orchestrator started successfully"
}

# Stop orchestrator
stop_orchestrator() {
  log_info "Stopping MCP Orchestrator"
  pm2 delete "${PROFILE,,}-orchestrator" 2>/dev/null || true
  log_info "Orchestrator stopped"
}

# Start all servers
start_all() {
  log_info "Starting all MCP servers for profile: $PROFILE"
  
  start_orchestrator
  
  # Start all individual servers using PM2 ecosystem file
  pm2 start ecosystem.config.js --update-env
  
  log_info "All servers started successfully"
  pm2 list
}

# Stop all servers
stop_all() {
  log_info "Stopping all MCP servers"
  
  pm2 delete all 2>/dev/null || true
  
  log_info "All servers stopped"
}

# Restart all servers
restart_all() {
  log_info "Restarting all MCP servers"
  pm2 restart all
  log_info "All servers restarted"
}

# Show status
show_status() {
  pm2 list
}

# Show logs
show_logs() {
  local server=${1:-all}
  local lines=${2:-50}
  
  if [ "$server" = "all" ]; then
    pm2 logs --lines $lines
  else
    pm2 logs "$server" --lines $lines
  fi
}

# Start specific server
start_server() {
  local server=$1
  if [ -z "$server" ]; then
    log_error "Server name required"
    exit 1
  fi
  
  log_info "Starting server: $server"
  pm2 start "${PROFILE,,}-$server"
  log_info "Server started: $server"
}

# Stop specific server
stop_server() {
  local server=$1
  if [ -z "$server" ]; then
    log_error "Server name required"
    exit 1
  fi
  
  log_info "Stopping server: $server"
  pm2 stop "${PROFILE,,}-$server"
  log_info "Server stopped: $server"
}

# Optimize OneDrive sync
optimize_onedrive() {
  log_info "Running OneDrive optimization..."
  log_info "This will exclude heavy folders from OneDrive sync"
  
  if [ -f "$SCRIPT_DIR/optimize-onedrive.sh" ]; then
    bash "$SCRIPT_DIR/optimize-onedrive.sh"
    log_info "OneDrive optimization complete!"
  else
    log_error "optimize-onedrive.sh not found"
    exit 1
  fi
}

# Main command handler
case "$1" in
  start-orchestrator)
    check_pm2
    start_orchestrator
    ;;
  stop-orchestrator)
    check_pm2
    stop_orchestrator
    ;;
  start-all)
    check_pm2
    start_all
    ;;
  stop-all)
    check_pm2
    stop_all
    ;;
  restart-all)
    check_pm2
    restart_all
    ;;
  status)
    check_pm2
    show_status
    ;;
  logs)
    check_pm2
    show_logs "$2" "$3"
    ;;
  start-server)
    check_pm2
    start_server "$2"
    ;;
  stop-server)
    check_pm2
    stop_server "$2"
  optimize-onedrive)
    optimize_onedrive
    ;;
    ;;
  *)
    echo "MCP-SUITE Control Script"
    echo ""
    echo "Usage: $0 {command} [options]"
    echo ""
    echo "Commands:"
    echo "  start-orchestrator    Start the orchestrator only"
    echo "  stop-orchestrator     Stop the orchestrator"
    echo "  start-all             Start all servers"
    echo "  stop-all              Stop all servers"
    echo "  restart-all           Restart all servers"
    echo "  status                Show server status"
    echo "  logs [server] [lines] View logs (default: all servers, 50 lines)"
    echo "  start-server <name>   Start a specific server"
    echo "  stop-server <name>    Stop a specific server"
    echo ""
    echo "Current profile: $PROFILE"
    exit 1
    ;;
esac
