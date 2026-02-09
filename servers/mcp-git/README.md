# MCP Git Server

Intelligent Git operations for code archaeology, history search, and branch comparison.

## Features

- **5 Tools** for comprehensive Git intelligence
- **Multi-Repository**: Search across multiple repos simultaneously
- **Code Archaeology**: Find when/why code changed
- **Similar Code Detection**: Find duplicate or similar patterns
- **Branch Comparison**: Understand divergence between branches
- **Safe & Sandboxed**: Read-only operations within configured paths

## Tools

### git_search_history
Search commit history for patterns in messages or file changes.

**Parameters:**
- `pattern` (required): Search pattern (regex supported)
- `repo` (optional): Specific repository path
- `file_type` (optional): Filter by extension (e.g., ".sql")
- `author` (optional): Filter by author name/email
- `since` (optional): Only commits after date (ISO format)
- `max_results` (optional): Limit results (default: 50)

**Example:**
```json
{
  "tool": "git_search_history",
  "arguments": {
    "pattern": "fix.*bug",
    "file_type": ".py",
    "since": "2024-01-01",
    "max_results": 20
  }
}
```

---

### git_get_file_history
Get commit history for a specific file with diffs.

**Parameters:**
- `path` (required): File path relative to repo root
- `repo` (optional): Repository path
- `limit` (optional): Number of commits (default: 10)

**Example:**
```json
{
  "tool": "git_get_file_history",
  "arguments": {
    "path": "src/models/sales_model.py",
    "limit": 5
  }
}
```

**Returns:**
- Commit hash, date, author, message
- Full diff showing what changed

---

### git_find_similar_code
Find similar code snippets in repository history.

**Parameters:**
- `snippet` (required): Code snippet to search for
- `repo` (optional): Repository path  
- `similarity_threshold` (optional): 0.0-1.0 (default: 0.8)

**Example:**
```json
{
  "tool": "git_find_similar_code",
  "arguments": {
    "snippet": "def calculate_total_sales(df):",
    "similarity_threshold": 0.7
  }
}
```

---

### git_get_recent_changes
Get recent commits with file change statistics.

**Parameters:**
- `repo` (optional): Repository path
- `author` (optional): Filter by author
- `days` (optional): Days to look back (default: 7)
- `max_results` (optional): Limit results (default: 50)

**Example:**
```json
{
  "tool": "git_get_recent_changes",
  "arguments": {
    "author": "john@company.com",
    "days": 14
  }
}
```

**Returns:**
- Commit info, files changed, additions/deletions

---

### git_compare_branches
Compare two branches showing commits ahead/behind.

**Parameters:**
- `base` (required): Base branch name
- `compare` (required): Branch to compare
- `repo` (optional): Repository path (required if multiple repos)

**Example:**
```json
{
  "tool": "git_compare_branches",
  "arguments": {
    "base": "main",
    "compare": "feature/new-dashboard"
  }
}
```

**Returns:**
- Commits ahead/behind
- Files changed count
- List of commits unique to compare branch

---

## Configuration

```json
{
  "client_id": "client-a",
  "repo_roots": [
    "/path/to/repo1",
    "/path/to/repo2"
  ],
  "max_results": 100,
  "max_file_size_mb": 10
}
```

### Configuration Options

**client_id**: Unique identifier for this client  
**repo_roots**: Array of repository paths (absolute paths)  
**max_results**: Maximum results for search operations  
**max_file_size_mb**: Maximum file size to process

---

## Use Cases

### 1. Code Archaeology
**When was this pattern introduced?**
```json
{
  "tool": "git_search_history",
  "arguments": {
    "pattern": "CALCULATE.*FILTER",
    "file_type": ".dax"
  }
}
```

### 2. Bug Investigation
**Find all commits related to a bug fix:**
```json
{
  "tool": "git_search_history",
  "arguments": {
    "pattern": "fix.*performance",
    "since": "2024-01-01"
  }
}
```

### 3. File Evolution
**See how a file changed over time:**
```json
{
  "tool": "git_get_file_history",
  "arguments": {
    "path": "pipelines/daily_etl.sql",
    "limit": 10
  }
}
```

### 4. Code Review Preparation
**What changed recently?**
```json
{
  "tool": "git_get_recent_changes",
  "arguments": {
    "days": 7
  }
}
```

### 5. Merge Planning
**How far apart are these branches?**
```json
{
  "tool": "git_compare_branches",
  "arguments": {
    "base": "main",
    "compare": "develop"
  }
}
```

### 6. Duplicate Code Detection
**Find similar implementations:**
```json
{
  "tool": "git_find_similar_code",
  "arguments": {
    "snippet": "SELECT * FROM sales WHERE date >= '2024-01-01'"
  }
}
```

---

## Security

- ✅ **Read-Only**: No write operations to Git repos
- ✅ **Path Validation**: All operations sandboxed to configured repos
- ✅ **No Traversal**: Rejects `..` and paths outside repo roots
- ✅ **Safe Patterns**: No dangerous Git operations

---

## Running

```bash
cd servers/mcp-git
npm install
npm run build

# Set configuration
export CONFIG_PATH=examples/config.json

npm run dev
```

---

## Integration with Other Servers

### With mcp-code-search
Use git_search_history to find when code was added, then mcp-code-search to analyze current state.

### With mcp-docs-generator
Use git_get_file_history to track documentation changes over time.

### With mcp-kb
Use git_search_history to find similar issues resolved in the past.

---

## Limitations

**Current Implementation:**
- Simple text-based similarity matching
- No semantic code analysis
- Searches HEAD and history, not working directory

**Future Enhancements:**
- Advanced fuzzy code matching
- AST-based similarity detection
- Working directory diff analysis
- Git blame integration
- Stash inspection

---

## Troubleshooting

**Problem:** "Repository path does not exist"
```
Solution: Ensure repo_roots contain valid absolute paths
Check: ls -la /path/to/repo
```

**Problem:** "Git instance not found"
```
Solution: Verify repository is a valid Git repo
Check: cd /path/to/repo && git status
```

**Problem:** "Pattern matches too many commits"
```
Solution: Add more filters or reduce max_results
- Use file_type to narrow scope
- Add author filter
- Use since date
```

---

## Examples

See `examples/` for:
- `config.json` - Basic configuration
- `queries.md` - Common query patterns

---

**For full specs:** See `../../continuation.md`
