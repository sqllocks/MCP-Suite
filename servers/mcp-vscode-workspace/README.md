# MCP VS Code Workspace Server

Automate VS Code workspace creation and management for client projects.

## Features

- **5 Tools** for workspace automation
- **Platform Templates**: Pre-configured for Fabric, Databricks, Snowflake
- **Smart Scaffolding**: Complete project structure in seconds
- **Extension Management**: Platform-specific recommendations
- **Code Snippets**: Ready-to-use templates
- **Debug Configs**: Pre-configured launch settings

## Tools

### workspace_scaffold
Create complete workspace structure for a client project.

**Parameters:**
- `client_name` (required): Client name
- `platform` (required): fabric | databricks | snowflake | multi-cloud
- `output_path` (required): Where to create workspace

**Example:**
```json
{
  "tool": "workspace_scaffold",
  "arguments": {
    "client_name": "ClientA",
    "platform": "fabric",
    "output_path": "/projects"
  }
}
```

**Creates:**
```
ClientA/
├── src/
├── docs/
├── tests/
├── scripts/
├── data/
├── .vscode/
│   ├── settings.json
│   └── extensions.json
├── README.md
└── .gitignore
```

---

### workspace_recommend_extensions
Get recommended VS Code extensions for a platform.

**Parameters:**
- `platform` (required): Platform name

**Example:**
```json
{
  "tool": "workspace_recommend_extensions",
  "arguments": {
    "platform": "fabric"
  }
}
```

**Returns:**
- Extension IDs with descriptions
- Required vs optional flags
- Installation instructions

---

### workspace_create_snippets
Create platform-specific code snippets.

**Parameters:**
- `platform` (required): Platform name
- `output_path` (required): Where to save
- `languages` (optional): Array of languages

**Example:**
```json
{
  "tool": "workspace_create_snippets",
  "arguments": {
    "platform": "fabric",
    "output_path": "/projects/ClientA",
    "languages": ["sql", "python", "dax"]
  }
}
```

**Creates:**
- `.vscode/sql.code-snippets`
- `.vscode/python.code-snippets`
- `.vscode/dax.code-snippets`

---

### workspace_setup_launch_configs
Create debug/launch configurations.

**Parameters:**
- `platform` (required): Platform name
- `output_path` (required): Where to save

**Example:**
```json
{
  "tool": "workspace_setup_launch_configs",
  "arguments": {
    "platform": "databricks",
    "output_path": "/projects/ClientA"
  }
}
```

**Creates:**
- `.vscode/launch.json` with platform-specific configs

---

### workspace_organize_files
Reorganize project files by strategy.

**Parameters:**
- `workspace_path` (required): Workspace root
- `strategy` (required): by-feature | by-type | by-layer

**Example:**
```json
{
  "tool": "workspace_organize_files",
  "arguments": {
    "workspace_path": "/projects/ClientA",
    "strategy": "by-feature"
  }
}
```

**Strategies:**
- **by-feature**: Group by business feature (sales, inventory)
- **by-type**: Group by file type (models, views, controllers)
- **by-layer**: Group by architecture layer (presentation, business, data)

---

## Platform Templates

### Fabric/Power BI

**Extensions:**
- Python
- SQL Server (MSSQL)
- Power Query
- PowerShell

**Settings:**
```json
{
  "editor.formatOnSave": true,
  "files.associations": {
    "*.dax": "dax",
    "*.m": "powerquery"
  }
}
```

**Snippets:**
- DAX measures
- M queries
- SQL patterns

---

### Databricks

**Extensions:**
- Python
- Databricks
- Jupyter

**Settings:**
```json
{
  "python.defaultInterpreterPath": "/databricks/python3/bin/python3"
}
```

**Snippets:**
- PySpark DataFrames
- Delta Lake operations
- Notebook cells

---

### Snowflake

**Extensions:**
- Python
- SQL Server

**Snippets:**
- Snowflake SQL patterns
- Python connectors
- Stored procedures

---

## Use Cases

### 1. New Client Onboarding
**Create complete workspace in seconds:**
```json
{
  "tool": "workspace_scaffold",
  "arguments": {
    "client_name": "NewClient",
    "platform": "fabric",
    "output_path": "/projects"
  }
}
```

### 2. Standardize Team Setup
**Ensure everyone has same extensions:**
```json
{
  "tool": "workspace_recommend_extensions",
  "arguments": {
    "platform": "databricks"
  }
}
```

### 3. Add Code Snippets
**Boost productivity with templates:**
```json
{
  "tool": "workspace_create_snippets",
  "arguments": {
    "platform": "fabric",
    "output_path": "/projects/Client",
    "languages": ["sql", "dax"]
  }
}
```

### 4. Configure Debugging
**Set up debug configs:**
```json
{
  "tool": "workspace_setup_launch_configs",
  "arguments": {
    "platform": "azure",
    "output_path": "/projects/Client"
  }
}
```

### 5. Refactor Project Structure
**Reorganize existing project:**
```json
{
  "tool": "workspace_organize_files",
  "arguments": {
    "workspace_path": "/projects/Client",
    "strategy": "by-feature"
  }
}
```

---

## Configuration

```json
{
  "workspace_root": "/home/user/projects",
  "default_platform": "fabric"
}
```

---

## Running

```bash
cd servers/mcp-vscode-workspace
npm install
npm run build

export CONFIG_PATH=examples/config.json
npm run dev
```

---

## Integration with Other Servers

### With mcp-code-search
Create workspace, then use code-search to find templates.

### With mcp-docs-generator
Generate workspace docs automatically.

### With mcp-git
Initialize Git repo in scaffolded workspace.

---

## Customization

### Add Custom Platform

Edit `getPlatformConfig()` in `src/index.ts`:

```typescript
myplatform: {
  extensions: ['ext1', 'ext2'],
  settings: { ... },
  snippets: { ... },
  launchConfigs: [ ... ]
}
```

### Add Custom Snippets

Edit `getPlatformSnippets()`:

```typescript
mylanguage: {
  'My Snippet': {
    prefix: 'mysnip',
    body: ['line1', 'line2'],
    description: 'My custom snippet'
  }
}
```

---

## Limitations

**Current Implementation:**
- Basic file organization (no actual file moving)
- Limited snippet library
- No VS Code API integration

**Future Enhancements:**
- [ ] VS Code API integration
- [ ] More snippet templates
- [ ] Task runner configs
- [ ] Workspace settings sync
- [ ] Multi-root workspace support

---

**For full specs:** See `../../continuation.md`
