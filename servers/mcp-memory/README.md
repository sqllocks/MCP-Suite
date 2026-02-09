# mcp-memory

**Profile-aware memory persistence system for MCP**

Store and retrieve conversation context, learnings, patterns, and decisions that persist across sessions.

## Features

- ✅ **Profile-Isolated** - Each client/workspace has completely separate memory
- ✅ **7 Memory Types** - Conversation, Learning, Pattern, Decision, Solution, Preference, Context
- ✅ **Importance Scoring** - 1-10 scale for prioritization
- ✅ **Related Memories** - Link related entries automatically
- ✅ **Auto Cleanup** - Old/unimportant memories removed automatically
- ✅ **Export/Import** - Backup and restore capabilities
- ✅ **Cross-Platform** - Works on Windows, macOS, Linux

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a config file (e.g., `memory-config.json`):

```json
{
  "client_id": "client-a",
  "profile_name": "ClientA",
  "storage_path": "./memory",
  "max_memory_entries": 10000,
  "retention_days": 365,
  "enable_semantic_search": false,
  "max_context_window": 5000,
  "include_related": true
}
```

## Usage

### Environment Setup

```bash
export CONFIG_PATH="/path/to/memory-config.json"
```

### Run Server

```bash
npm start
```

## Tools

### 1. store_memory

Store a new memory entry.

```json
{
  "type": "learning",
  "content": "Client uses dbt for transformations",
  "importance": 8,
  "tags": ["architecture", "dbt"],
  "context": "Initial assessment"
}
```

### 2. search_memory

Search for memories.

```json
{
  "query": "performance optimization",
  "types": ["pattern", "solution"],
  "minImportance": 7,
  "limit": 5
}
```

### 3. get_context

Get relevant context for current conversation.

```json
{
  "query": "working on incremental refresh",
  "limit": 5
}
```

### 4. list_memories

List memories with filters.

### 5. update_memory

Update an existing memory.

### 6. delete_memory

Delete a memory.

### 7. get_memory_stats

Get memory statistics.

### 8. export_memories

Export all memories for backup.

### 9. import_memories

Import memories from backup.

## Memory Types

- **CONVERSATION** - Important conversation snippets
- **LEARNING** - Things learned about client/project
- **PATTERN** - Code or solution patterns
- **DECISION** - Architectural/technical decisions
- **SOLUTION** - Solutions to problems
- **PREFERENCE** - User preferences
- **CONTEXT** - Project context and background

## Storage

Memories are stored as JSON files in the configured `storage_path`:

```
storage_path/
├── mem_1707328800_abc123.json
├── mem_1707328801_def456.json
└── ...
```

Each file contains a complete memory entry with metadata.

## Profile Isolation

**Important:** Each client/profile must have a separate storage path to ensure complete data isolation.

Example structure:
```
~/mcp/clients/client-a/memory/
~/mcp/clients/client-b/memory/
```

## Best Practices

### Importance Scoring

- **10**: Critical project information (deadlines, requirements)
- **8-9**: Important decisions, architecture choices
- **7-8**: Useful patterns, proven solutions
- **5-6**: Preferences, minor details
- **3-4**: Temporary workarounds, one-time issues

### Tags

Use consistent, searchable tags:
- ✅ Good: `["dax", "performance", "optimization"]`
- ❌ Bad: `["misc", "stuff"]`

### Related Memories

Link related memories to build context:
```json
{
  "type": "solution",
  "content": "Fixed timeout by increasing to 120s",
  "relatedTo": ["mem_problem_id"]
}
```

## License

MIT
