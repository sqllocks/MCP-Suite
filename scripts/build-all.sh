#!/bin/bash

# Build All MCP Servers Script
# Builds each converted server and reports results

echo "🏗️  Building All MCP Servers"
echo "============================"
echo ""

SERVERS_DIR="/home/claude/Complete-MCP-Suite/MCP-SUITE/servers"
SUCCESS=0
FAILED=0
FAILED_SERVERS=()

# List of servers to build
SERVERS=(
  "auto-remediation"
  "humanizer-mcp"
  "mcp-code-search"
  "mcp-code-sync"
  "mcp-diagram-generator"
  "mcp-docs-generator"
  "mcp-docs-rag"
  "mcp-document-generator"
  "mcp-error-diagnosis"
  "mcp-export"
  "mcp-fabric-live"
  "mcp-fabric-search"
  "mcp-frequency-tracking"
  "mcp-git"
  "mcp-impact-analysis"
  "mcp-kb"
  "mcp-memory"
  "mcp-microsoft-docs"
  "mcp-ml-inference"
  "mcp-nl-interface"
  "mcp-observability"
  "mcp-sql-explorer"
  "mcp-stream-processor"
  "mcp-synthetic-data-generator"
  "mcp-tokenization-secure"
  "mcp-vscode-workspace"
  "security-guardian-mcp"
)

for server in "${SERVERS[@]}"; do
  echo "🔨 Building $server..."
  
  if [ ! -d "$SERVERS_DIR/$server" ]; then
    echo "  ❌ Directory not found"
    FAILED=$((FAILED + 1))
    FAILED_SERVERS+=("$server (not found)")
    continue
  fi
  
  cd "$SERVERS_DIR/$server"
  
  # Install dependencies
  if ! npm install > /dev/null 2>&1; then
    echo "  ❌ npm install failed"
    FAILED=$((FAILED + 1))
    FAILED_SERVERS+=("$server (install)")
    continue
  fi
  
  # Build
  if npm run build > /dev/null 2>&1; then
    echo "  ✅ Built successfully"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "  ❌ Build failed"
    FAILED=$((FAILED + 1))
    FAILED_SERVERS+=("$server (build)")
  fi
done

echo ""
echo "============================"
echo "📊 Build Summary:"
echo "  ✅ Successful: $SUCCESS"
echo "  ❌ Failed: $FAILED"
echo "  📝 Total: ${#SERVERS[@]}"

if [ $FAILED -gt 0 ]; then
  echo ""
  echo "❌ Failed servers:"
  for failed in "${FAILED_SERVERS[@]}"; do
    echo "  - $failed"
  done
  exit 1
else
  echo ""
  echo "🎉 All servers built successfully!"
  exit 0
fi
