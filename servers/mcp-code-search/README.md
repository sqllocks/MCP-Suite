# MCP Code Search Server

Search GitHub and local repositories with security sandboxing.

## Features

- **GitHub Search**: Search public repositories with @octokit/rest
- **Local Search**: Fast file search with glob patterns
- **Security**: Path validation, file size limits, extension whitelist
- **Context Lines**: Show code before/after matches
- **File Tree**: ASCII directory structure viewer

## Tools

### search_repo
Search local codebase (sandboxed to client_repo_root).

### get_file
Read file contents with path validation and size limits.

### get_file_structure
Get ASCII directory tree.

### github_code_search
Search GitHub repositories (requires token).

## Configuration

```json
{
  "client_id": "client-a",
  "github_token": "ghp_xxx",
  "client_repo_root": "/path/to/repos",
  "allowed_file_extensions": [".sql", ".py"],
  "max_file_size_mb": 5
}
```

## Running

```bash
export CONFIG_PATH=/path/to/config.json
npm run dev
```
