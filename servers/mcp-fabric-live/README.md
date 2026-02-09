# MCP Fabric Live Server

Query live Fabric and Synapse metadata for workspaces, semantic models, pipelines, notebooks, and Spark pools.

## Features

- **16 Tools** for comprehensive metadata access
- **Fabric Support**: Workspaces, semantic models, pipelines, notebooks, lakehouses
- **Synapse Support**: Pipelines, notebooks, Spark pools
- **Azure AD Authentication**: Multiple auth methods supported
- **Read-Only**: Safe metadata inspection only
- **Caching**: Reduces API calls with configurable TTL

## Tools

### Fabric Workspace Tools (2)

#### fabric_list_workspaces
List all accessible Fabric workspaces.

**Returns:** Workspace list with ID, name, type, state

#### fabric_get_workspace_items
Get all items in a workspace.

**Parameters:**
- `workspace` (required): Workspace name or ID
- `item_type` (optional): Filter by type

**Supported types:** SemanticModel, Report, Dashboard, Pipeline, Notebook, Lakehouse, Warehouse

---

### Semantic Model Tools (3)

#### fabric_get_semantic_model
Get semantic model structure.

**Parameters:**
- `workspace` (required): Workspace name or ID
- `model` (required): Model name or ID

**Returns:** Tables, columns, measures, relationships, roles

#### fabric_get_model_refresh_history
Get model refresh history.

**Parameters:**
- `workspace` (required): Workspace name or ID
- `model` (required): Model name or ID
- `top` (optional): Number of results (default: 10)

**Returns:** Refresh ID, start/end time, status, duration, errors

#### fabric_get_model_measures
Extract all DAX measures from model.

**Parameters:**
- `workspace` (required): Workspace name or ID
- `model` (required): Model name or ID
- `table` (optional): Filter by table

**Returns:** All measures with DAX expressions

---

### Pipeline Tools (3)

#### fabric_list_pipelines
List all pipelines in workspace.

**Parameters:**
- `workspace` (required): Workspace name or ID

#### fabric_get_pipeline
Get pipeline configuration.

**Parameters:**
- `workspace` (required): Workspace name or ID
- `pipeline` (required): Pipeline name or ID

**Returns:** Activities, parameters, variables

#### fabric_get_pipeline_runs
Get pipeline run history.

**Parameters:**
- `workspace` (required): Workspace name or ID
- `pipeline` (required): Pipeline name or ID
- `top` (optional): Number of results (default: 10)

**Returns:** Run history with status and duration

---

### Notebook Tools (2)

#### fabric_list_notebooks
List all notebooks in workspace.

**Parameters:**
- `workspace` (required): Workspace name or ID

#### fabric_get_notebook
Get notebook contents.

**Parameters:**
- `workspace` (required): Workspace name or ID
- `notebook` (required): Notebook name or ID

**Returns:** Cells with code and markdown

---

### Lakehouse Tools (2)

#### fabric_list_lakehouses
List all lakehouses in workspace.

**Parameters:**
- `workspace` (required): Workspace name or ID

#### fabric_get_lakehouse_tables
List tables in lakehouse.

**Parameters:**
- `workspace` (required): Workspace name or ID
- `lakehouse` (required): Lakehouse name or ID

**Returns:** Tables with format, location, partitioning

---

### Synapse Tools (4)

#### synapse_list_pipelines
List Synapse pipelines.

**Parameters:**
- `workspace` (required): Synapse workspace name

#### synapse_get_pipeline
Get Synapse pipeline definition.

**Parameters:**
- `workspace` (required): Synapse workspace name
- `pipeline` (required): Pipeline name

#### synapse_list_spark_pools
List Spark pools.

**Parameters:**
- `workspace` (required): Synapse workspace name

**Returns:** Node size, count, version, state, auto-scale/pause config

#### synapse_get_notebook
Get Synapse notebook.

**Parameters:**
- `workspace` (required): Synapse workspace name
- `notebook` (required): Notebook name

---

## Configuration

```json
{
  "client_id": "client-a",
  "azure_subscription": "sub-xxxxx",
  "fabric_tenant": "contoso.onmicrosoft.com",
  "synapse_workspace": "contoso-synapse",
  "auth_method": "azure-cli",
  "workspaces": ["Sales Analytics", "Finance Reports"],
  "read_only": true,
  "cache_ttl": 300
}
```

### Authentication Methods

**Azure CLI (Recommended for Development):**
```json
{
  "auth_method": "azure-cli"
}
```

Setup:
```bash
az login
az account set --subscription <subscription-id>
```

**Service Principal (Production):**
```json
{
  "auth_method": "service-principal",
  "service_principal": {
    "clientId": "your-client-id",
    "clientSecret": "your-secret",
    "tenantId": "your-tenant-id"
  }
}
```

**Managed Identity (Azure VMs/App Service):**
```json
{
  "auth_method": "managed-identity"
}
```

---

## Example Usage

### List Workspaces

```json
{
  "tool": "fabric_list_workspaces"
}
```

### Get Model Schema

```json
{
  "tool": "fabric_get_semantic_model",
  "arguments": {
    "workspace": "Sales Analytics",
    "model": "Sales Model"
  }
}
```

### Get Refresh History

```json
{
  "tool": "fabric_get_model_refresh_history",
  "arguments": {
    "workspace": "Sales Analytics",
    "model": "Sales Model",
    "top": 5
  }
}
```

### Extract DAX Measures

```json
{
  "tool": "fabric_get_model_measures",
  "arguments": {
    "workspace": "Sales Analytics",
    "model": "Sales Model",
    "table": "Sales"
  }
}
```

### Get Pipeline Runs

```json
{
  "tool": "fabric_get_pipeline_runs",
  "arguments": {
    "workspace": "Sales Analytics",
    "pipeline": "Daily Refresh",
    "top": 10
  }
}
```

---

## Use Cases

### 1. Documentation Generation
```typescript
// List all models
const items = await fabric_get_workspace_items({
  workspace: "Sales",
  item_type: "SemanticModel"
});

// For each model, get structure
for (const item of items) {
  const schema = await fabric_get_semantic_model({
    workspace: "Sales",
    model: item.name
  });
  
  // Generate documentation with mcp-docs-generator
  // Generate ERD with mcp-diagram-generator
}
```

### 2. Pipeline Monitoring
```typescript
// Check recent runs
const runs = await fabric_get_pipeline_runs({
  workspace: "Sales",
  pipeline: "Daily Refresh",
  top: 5
});

// Alert on failures
const failures = runs.filter(r => r.status === "Failed");
if (failures.length > 0) {
  // Send alert
}
```

### 3. DAX Analysis
```typescript
// Extract all measures
const measures = await fabric_get_model_measures({
  workspace: "Sales",
  model: "Sales Analytics"
});

// Analyze complexity
const complex = measures.filter(m => 
  m.expression.length > 500 ||
  m.expression.includes("CALCULATE")
);
```

### 4. Cross-Workspace Inventory
```typescript
// List all workspaces
const workspaces = await fabric_list_workspaces();

// For each, count items
for (const ws of workspaces) {
  const items = await fabric_get_workspace_items({ 
    workspace: ws.name 
  });
  
  console.log(`${ws.name}: ${items.length} items`);
}
```

---

## Required Permissions

### Fabric
- **Viewer** role on workspaces
- **Power BI Service** API access

### Synapse
- **Reader** role on workspace
- **Synapse User** role

---

## Security

- ✅ **Read-Only**: No modification operations
- ✅ **Metadata Only**: No data access
- ✅ **Azure AD Auth**: Secure authentication
- ✅ **Audit Logging**: All operations logged
- ✅ **Least Privilege**: Minimum required permissions

---

## API Endpoints

### Fabric
- Fabric REST API: `https://api.fabric.microsoft.com/v1`
- Power BI REST API: `https://api.powerbi.com/v1.0/myorg`

### Synapse
- Management: `https://management.azure.com`
- Dev endpoint: `https://{workspace}.dev.azuresynapse.net`

---

## Troubleshooting

**Problem:** "Authentication failed"
```bash
Solution: Re-authenticate
az logout
az login
az account show
```

**Problem:** "Workspace not found"
```
Solution: Check workspace name and permissions
- Verify workspace exists
- Ensure you have Viewer role
- Check workspace is in correct tenant
```

**Problem:** "API rate limit"
```
Solution: Increase cache TTL
{
  "cache_ttl": 600  // 10 minutes
}
```

---

## Running

```bash
cd servers/mcp-fabric-live
npm install
npm run build

# Set configuration
export CONFIG_PATH=/path/to/config.json

npm run dev
```

---

## Integration with Other Servers

### With mcp-docs-generator
Use `fabric_get_semantic_model` to get model structure, then generate documentation with mcp-docs-generator.

### With mcp-diagram-generator
Use `fabric_get_semantic_model` to get model structure, then generate ERDs with mcp-diagram-generator.

### With mcp-sql-explorer
Use `fabric_list_lakehouses` to find lakehouses, then query tables with mcp-sql-explorer.

---

## Limitations

**Current Implementation:**
- Workspace and refresh history: ✅ Fully implemented
- Semantic models: ⚠️ Requires XMLA endpoint for full schema
- Pipelines, notebooks, lakehouses: ⚠️ Requires additional Fabric APIs

**Production Requirements:**
- XMLA endpoint integration for full model schema
- Fabric Pipelines API integration
- Fabric Notebooks API integration
- Fabric Lakehouses API integration

---

## Future Enhancements

- [ ] Full XMLA endpoint integration
- [ ] Fabric Pipelines API
- [ ] Fabric Notebooks API  
- [ ] Fabric Lakehouses API
- [ ] Synapse Artifacts API
- [ ] Caching improvements
- [ ] Batch operations
- [ ] WebSocket support for real-time updates

---

**For configuration examples:** See `examples/`  
**For full specs:** See `../../continuation.md`
