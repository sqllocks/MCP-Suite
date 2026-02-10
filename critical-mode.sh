#!/bin/bash

# Critical Mode Toggle Script for Mac
# Enables/disables critical mode across all MCP servers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

PROFILE=${MCP_PROFILE:-Personal}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Parse arguments
ENABLE=false
DISABLE=false
STATUS=false
REASON=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --profile)
      PROFILE="$2"
      shift 2
      ;;
    --enable)
      ENABLE=true
      shift
      ;;
    --disable)
      DISABLE=true
      shift
      ;;
    --status)
      STATUS=true
      shift
      ;;
    --reason)
      REASON="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Show status
if [ "$STATUS" = true ]; then
  CURRENT_MODE=$(grep -o 'CRITICAL_MODE=.*' .env 2>/dev/null | cut -d= -f2 || echo "false")
  echo -e "${GREEN}Critical Mode Status for profile: $PROFILE${NC}"
  echo "  Current mode: $CURRENT_MODE"
  
  if [ "$CURRENT_MODE" = "true" ]; then
    echo -e "  ${YELLOW}Critical mode is ENABLED${NC}"
  else
    echo -e "  ${GREEN}Critical mode is DISABLED (normal operation)${NC}"
  fi
  exit 0
fi

# Enable critical mode
if [ "$ENABLE" = true ]; then
  echo -e "${YELLOW}Enabling critical mode for profile: $PROFILE${NC}"
  
  if [ -z "$REASON" ]; then
    echo -e "${RED}Error: --reason is required when enabling critical mode${NC}"
    exit 1
  fi
  
  # Update .env file
  if grep -q "^CRITICAL_MODE=" .env 2>/dev/null; then
    sed -i.bak 's/^CRITICAL_MODE=.*/CRITICAL_MODE=true/' .env
  else
    echo "CRITICAL_MODE=true" >> .env
  fi
  
  # Log the reason
  TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
  echo "$TIMESTAMP - Critical mode ENABLED - Reason: $REASON" >> logs/critical-mode.log
  
  echo -e "${GREEN}✓ Critical mode enabled${NC}"
  echo "  Reason: $REASON"
  echo "  Profile: $PROFILE"
  echo ""
  echo "⚠️  Servers will use better models or cloud APIs (may incur costs)"
  echo "   Remember to disable when resolved!"
  echo ""
  echo "Restart servers for changes to take effect:"
  echo "  ./mcp-control.sh restart-all"
  
  exit 0
fi

# Disable critical mode
if [ "$DISABLE" = true ]; then
  echo -e "${GREEN}Disabling critical mode for profile: $PROFILE${NC}"
  
  # Update .env file
  if grep -q "^CRITICAL_MODE=" .env 2>/dev/null; then
    sed -i.bak 's/^CRITICAL_MODE=.*/CRITICAL_MODE=false/' .env
  else
    echo "CRITICAL_MODE=false" >> .env
  fi
  
  # Log the change
  TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
  echo "$TIMESTAMP - Critical mode DISABLED" >> logs/critical-mode.log
  
  echo -e "${GREEN}✓ Critical mode disabled${NC}"
  echo "  Profile: $PROFILE"
  echo "  Servers will return to normal operation"
  echo ""
  echo "Restart servers for changes to take effect:"
  echo "  ./mcp-control.sh restart-all"
  
  exit 0
fi

# No action specified - show help
echo "Critical Mode Toggle Script"
echo ""
echo "Usage: $0 [options]"
echo ""
echo "Options:"
echo "  --profile <name>    Profile to use (default: $PROFILE)"
echo "  --enable            Enable critical mode"
echo "  --disable           Disable critical mode"
echo "  --status            Show current critical mode status"
echo "  --reason <text>     Reason for enabling (required with --enable)"
echo ""
echo "Examples:"
echo "  $0 --status"
echo "  $0 --enable --reason \"Production incident\""
echo "  $0 --disable"
echo ""
exit 1
