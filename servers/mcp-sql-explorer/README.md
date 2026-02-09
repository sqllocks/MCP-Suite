# MCP SQL Explorer Server

Direct database connectivity for querying schemas and data with read-only safety.

## Features

- **Multi-Database Support**: SQL Server, PostgreSQL, MySQL, Fabric Warehouse
- **Read-Only Mode**: Safety enforced at multiple levels
- **Schema Inspection**: Tables, columns, indexes, foreign keys
- **Query Execution**: With result limits and timeouts
- **Explain Plans**: Query optimization analysis
- **Column Search**: Find columns across all tables
- **Connection Pooling**: Efficient connection reuse

## Tools

### sql_query
Execute read-only SQL queries.

**Parameters:**
- `connection_name` (required): Connection to use
- `query` (required): SQL query
- `limit` (optional): Max rows (default: 100)

**Example:**
```json
{
  "connection_name": "prod-sql",
  "query": "SELECT TOP 10 * FROM Sales",
  "limit": 10
}
```

### sql_get_schema
Get detailed table schema.

**Parameters:**
- `connection_name` (required): Connection to use
- `table` (required): Table name
- `schema` (optional): Schema name (default: dbo for SQL Server, public for PostgreSQL)

**Returns:**
- Columns with data types, nullability, keys
- Primary keys
- Foreign keys
- Indexes

### sql_list_tables
List all tables in database.

**Parameters:**
- `connection_name` (required): Connection to use
- `schema` (optional): Schema name

### sql_search_columns
Search for columns across all tables.

**Parameters:**
- `connection_name` (required): Connection to use
- `pattern` (required): Column name pattern
- `schema` (optional): Schema name

**Example:**
```json
{
  "connection_name": "prod-sql",
  "pattern": "customer"
}
```

### sql_get_stats
Get table statistics.

**Parameters:**
- `connection_name` (required): Connection to use
- `table` (required): Table name
- `schema` (optional): Schema name

**Returns:**
- Row count
- Size in KB
- Last updated

### sql_explain_plan
Get query execution plan.

**Parameters:**
- `connection_name` (required): Connection to use
- `query` (required): SQL query to analyze

**Returns:**
- Execution plan
- Estimated cost
- Recommendations

## Configuration

```json
{
  "client_id": "client-a",
  "connections": {
    "prod-sql": {
      "name": "Production SQL Server",
      "type": "mssql",
      "host": "sqlserver.database.windows.net",
      "port": 1433,
      "database": "Analytics",
      "username": "readonly_user",
      "password": "YOUR_PASSWORD",
      "read_only": true,
      "timeout": 30
    }
  },
  "max_result_rows": 1000,
  "query_timeout": 30,
  "allow_write_operations": false
}
```

## Supported Databases

### SQL Server / Azure SQL
- Connection type: `mssql`
- Default port: 1433
- Supports: Tables, views, stored procedures
- Features: Full schema inspection, explain plans

### PostgreSQL
- Connection type: `postgres`
- Default port: 5432
- Supports: Tables, views, functions
- Features: Schema inspection, explain plans

### MySQL (Coming Soon)
- Connection type: `mysql`
- Default port: 3306

### Microsoft Fabric (Complete Support)

#### Fabric Warehouse
- Connection type: `fabric-warehouse`
- Uses SQL Server protocol
- Requires Azure AD authentication
- Full SQL endpoint support

#### Fabric SQL Database
- Connection type: `fabric-sql-database`
- Native Fabric SQL Database support
- Azure AD authentication
- Optimized for analytical workloads

#### Fabric Lakehouse
- Connection type: `fabric-lakehouse`
- Query Delta tables via SQL endpoint
- Azure AD authentication
- Direct access to lakehouse tables

**Authentication:** All Fabric connections use Azure Active Directory authentication with the following options:
- `azure-active-directory-default` (recommended)
- `azure-active-directory-msi-app-service`
- `azure-active-directory-service-principal-secret`

## Security

### Read-Only Enforcement
1. **Connection Level**: read_only flag
2. **Query Validation**: Blocks dangerous keywords (DROP, TRUNCATE, DELETE, etc.)
3. **Result Limits**: Maximum 1000 rows per query
4. **Timeouts**: 30 second default timeout

### Dangerous Keywords
Blocked by default (configurable):
- DROP
- TRUNCATE
- DELETE
- UPDATE
- INSERT
- ALTER
- CREATE

### Best Practices
- Use read-only database users
- Configure firewall rules
- Rotate credentials regularly
- Monitor query patterns
- Set appropriate timeouts

## Connection Pooling

Connections are pooled and reused:
- Automatic connect on first use
- Kept alive for duration of session
- Graceful shutdown on exit

## Error Handling

- Connection failures: Retry with backoff
- Query timeouts: Configurable per connection
- Invalid SQL: Detailed error messages
- Permission errors: Clear feedback

## Example Usage

```bash
# Configure connection
export CONFIG_PATH=/path/to/config.json

# Run server
npm run dev
```

## Running

```bash
cd servers/mcp-sql-explorer
npm install
npm run build
npm run dev
```

## Use Cases

- Schema exploration
- Data validation
- Query optimization
- Column discovery
- Database documentation
- Migration planning
- Performance analysis

## Microsoft Fabric Connection Guide

### Fabric Endpoint URLs

All Fabric database types use the same connection pattern:
```
<workspace-name>.datawarehouse.fabric.microsoft.com
```

### Connection Examples

#### Fabric Warehouse
```json
{
  "name": "Production Warehouse",
  "type": "fabric-warehouse",
  "host": "sales-workspace.datawarehouse.fabric.microsoft.com",
  "database": "SalesWarehouse",
  "options": {
    "authentication": {
      "type": "azure-active-directory-default"
    },
    "encrypt": true
  }
}
```

#### Fabric SQL Database
```json
{
  "name": "Analytics Database",
  "type": "fabric-sql-database",
  "host": "analytics-workspace.datawarehouse.fabric.microsoft.com",
  "database": "AnalyticsDB",
  "options": {
    "authentication": {
      "type": "azure-active-directory-default"
    },
    "encrypt": true
  }
}
```

#### Fabric Lakehouse
```json
{
  "name": "Data Lakehouse",
  "type": "fabric-lakehouse",
  "host": "data-workspace.datawarehouse.fabric.microsoft.com",
  "database": "MainLakehouse",
  "options": {
    "authentication": {
      "type": "azure-active-directory-default"
    },
    "encrypt": true
  }
}
```

### Fabric Authentication

**Default (Recommended):**
Uses your current Azure CLI or Azure PowerShell credentials.

```bash
# Login with Azure CLI
az login

# Or use Azure PowerShell
Connect-AzAccount
```

**Service Principal:**
For automated scenarios:

```json
{
  "options": {
    "authentication": {
      "type": "azure-active-directory-service-principal-secret",
      "options": {
        "clientId": "your-client-id",
        "clientSecret": "your-secret",
        "tenantId": "your-tenant-id"
      }
    }
  }
}
```

### Querying Fabric

All three Fabric types support standard SQL queries:

**Fabric Warehouse:**
```sql
-- Query warehouse tables
SELECT TOP 100 * FROM dbo.FactSales

-- Use warehouse-specific features
SELECT * FROM OPENROWSET(
    BULK 'https://storage.blob.core.windows.net/data/*.parquet',
    FORMAT = 'PARQUET'
) AS files
```

**Fabric SQL Database:**
```sql
-- Query database tables
SELECT * FROM SalesData WHERE Year = 2024

-- Use views and stored procedures
EXEC sp_GetMonthlySales @Year = 2024
```

**Fabric Lakehouse:**
```sql
-- Query Delta tables directly
SELECT * FROM sales_delta

-- Query files in lakehouse
SELECT * FROM files_delta
```

### Fabric-Specific Features

#### Lakehouse Tables
Lakehouse connections can query both:
- **Delta tables** (managed tables in the lakehouse)
- **Files** (unmanaged data in OneLake)

#### SQL Database vs Warehouse

| Feature | SQL Database | Warehouse |
|---------|--------------|-----------|
| Primary Use | Operational analytics | Data warehousing |
| Storage | Managed storage | Delta Lake |
| Performance | Optimized for queries | Optimized for scale |
| Best For | App databases | Enterprise DW |

### Complete Example

See `examples/config-fabric-complete.json` for a configuration with all three Fabric types.

### Troubleshooting Fabric Connections

**Problem:** Authentication fails
```
Solution: Ensure you're logged in with Azure CLI:
az login
az account show
```

**Problem:** Cannot find workspace
```
Solution: Verify workspace name in Fabric portal:
https://app.fabric.microsoft.com
Navigate to your workspace and check the URL
```

**Problem:** Permission denied
```
Solution: Ensure your account has at least Viewer role on the workspace
```

**Problem:** Timeout errors
```
Solution: Increase timeout in connection config:
"timeout": 60
```

## Fabric-Specific Features

### Fabric Lakehouse Tools

#### fabric_lakehouse_list_files
List files in Fabric Lakehouse storage.

**Parameters:**
- `connection_name` (required): Lakehouse connection name
- `path` (optional): Path to list files from (default: '/')

**Example:**
```json
{
  "connection_name": "fabric-lakehouse",
  "path": "/Tables/Sales/"
}
```

**Returns:**
```json
{
  "files": [
    {
      "filepath": "/Tables/Sales/part-00000.parquet",
      "modificationTime": "2024-02-07T10:30:00Z",
      "size": 1048576
    }
  ],
  "count": 1
}
```

#### fabric_lakehouse_delta_properties
Get Delta table properties for Lakehouse tables.

**Parameters:**
- `connection_name` (required): Lakehouse connection name
- `table` (required): Table name
- `schema` (optional): Schema name (default: 'dbo')

**Example:**
```json
{
  "connection_name": "fabric-lakehouse",
  "table": "Sales",
  "schema": "dbo"
}
```

**Returns:**
```json
{
  "properties": [
    {"col_name": "Type", "data_type": "delta"},
    {"col_name": "Location", "data_type": "abfss://..."},
    {"col_name": "Provider", "data_type": "delta"}
  ],
  "isDelta": true
}
```

### Fabric Connection Examples

#### Fabric Warehouse
```json
{
  "name": "Production Warehouse",
  "type": "fabric-warehouse",
  "host": "myworkspace.datawarehouse.fabric.microsoft.com",
  "database": "SalesWarehouse",
  "options": {
    "encrypt": true,
    "authentication": {
      "type": "azure-active-directory-default"
    }
  }
}
```

#### Fabric SQL Database
```json
{
  "name": "Analytics SQL DB",
  "type": "fabric-sql-database",
  "host": "myworkspace.pbidedicated.windows.net",
  "database": "AnalyticsDB",
  "options": {
    "encrypt": true,
    "authentication": {
      "type": "azure-active-directory-default"
    }
  }
}
```

#### Fabric Lakehouse
```json
{
  "name": "Data Lakehouse",
  "type": "fabric-lakehouse",
  "host": "myworkspace.datawarehouse.fabric.microsoft.com",
  "database": "MyLakehouse",
  "options": {
    "encrypt": true,
    "authentication": {
      "type": "azure-active-directory-default"
    }
  }
}
```

### Authentication

Fabric connections use Azure AD authentication:
- **azure-active-directory-default**: Uses DefaultAzureCredential (recommended)
  - Tries multiple auth methods in order:
    1. Environment variables
    2. Managed Identity
    3. Visual Studio Code
    4. Azure CLI
    5. Azure PowerShell

**Setup:**
```bash
# Option 1: Azure CLI (easiest for development)
az login
az account set --subscription "your-subscription-id"

# Option 2: Service Principal
export AZURE_CLIENT_ID="your-client-id"
export AZURE_CLIENT_SECRET="your-client-secret"
export AZURE_TENANT_ID="your-tenant-id"
```

### Fabric-Specific Considerations

**Lakehouse Limitations:**
- No traditional primary keys or foreign keys
- Indexes managed automatically by Delta Lake
- Schema enforcement via Delta table properties
- Statistics gathered automatically

**SQL Database Features:**
- Supports primary keys and indexes
- Traditional SQL Server constraints
- Optimized for analytical workloads
- No stored procedures or triggers

**Warehouse Features:**
- Full T-SQL support
- Cross-database queries
- Shared metadata with other Fabric items
- Automatic query optimization

## Azure Synapse Analytics Support

mcp-sql-explorer provides full support for Azure Synapse Analytics SQL pools.

### Synapse Serverless SQL Pool

**Connection Type:** `synapse-serverless`  
**Endpoint:** `<workspace>-ondemand.sql.azuresynapse.net`  
**Database:** `master` (default) or specific database

**Capabilities:**
- Query data lakes directly via OPENROWSET
- Query external tables over Parquet, CSV, JSON
- Query Cosmos DB analytical store
- Cross-database queries
- Schema inference from files

**Example Configuration:**
```json
{
  "synapse-serverless": {
    "type": "synapse-serverless",
    "host": "contoso-ondemand.sql.azuresynapse.net",
    "database": "master",
    "options": {
      "authentication": {
        "type": "azure-active-directory-default"
      },
      "encrypt": true
    }
  }
}
```

**Example Queries:**

```sql
-- Query Parquet files in data lake
SELECT * FROM OPENROWSET(
    BULK 'https://storage.dfs.core.windows.net/data/*.parquet',
    FORMAT = 'PARQUET'
) AS files
WHERE Year = 2024

-- Query CSV with schema inference
SELECT * FROM OPENROWSET(
    BULK 'https://storage.dfs.core.windows.net/data/*.csv',
    FORMAT = 'CSV',
    PARSER_VERSION = '2.0',
    HEADER_ROW = TRUE,
    FIRSTROW = 2
) AS data

-- Query JSON files
SELECT * FROM OPENROWSET(
    BULK 'https://storage.dfs.core.windows.net/data/*.json',
    FORMAT = 'JSON'
) AS json_data

-- Query external table
SELECT * FROM ExternalSalesData 
WHERE OrderDate >= '2024-01-01'

-- Cross-database query
SELECT * FROM OtherDatabase.dbo.TableName
```

**Use Cases:**
- Ad-hoc queries over data lakes
- Data exploration without loading
- Query historical archives
- Cost-effective analytics (pay-per-query)

---

### Synapse Dedicated SQL Pool

**Connection Type:** `synapse-dedicated`  
**Endpoint:** `<workspace>.sql.azuresynapse.net`  
**Database:** SQL pool name (e.g., `SQLPool1`)

**Capabilities:**
- Traditional data warehouse queries
- Partitioned fact tables
- Columnstore indexes
- Result-set caching
- Materialized views
- Statistics-based optimization

**Example Configuration:**
```json
{
  "synapse-dedicated": {
    "type": "synapse-dedicated",
    "host": "contoso.sql.azuresynapse.net",
    "database": "SQLPool1",
    "options": {
      "authentication": {
        "type": "azure-active-directory-default"
      },
      "encrypt": true
    }
  }
}
```

**Example Queries:**

```sql
-- Standard warehouse query
SELECT 
    p.ProductName,
    SUM(f.SalesAmount) as TotalSales,
    COUNT(DISTINCT f.CustomerKey) as Customers
FROM FactSales f
JOIN DimProduct p ON f.ProductKey = p.ProductKey
WHERE f.DateKey >= 20240101
GROUP BY p.ProductName
ORDER BY TotalSales DESC

-- Query with partition elimination
SELECT * FROM FactSales
WHERE DateKey = 20240115  -- Uses partition pruning

-- Materialized view query
SELECT * FROM mvw_SalesSummary
WHERE Year = 2024

-- Use result-set caching
SELECT /* RESULT_SET_CACHING = ON */
    Category,
    SUM(Sales) as Total
FROM SalesSummary
GROUP BY Category
```

**Performance Features:**
- **Distribution**: Hash, round-robin, replicated
- **Partitioning**: Date-based for large facts
- **Columnstore**: Compressed columnar storage
- **Statistics**: Auto-create and update
- **Caching**: Result-set and tempdb caching

**Use Cases:**
- Enterprise data warehousing
- Business intelligence
- Historical data analysis
- High-performance analytics

---

### Synapse Connection Guide

#### 1. Find Your Workspace Endpoint

**Serverless SQL:**
```
<workspace-name>-ondemand.sql.azuresynapse.net
```

**Dedicated SQL:**
```
<workspace-name>.sql.azuresynapse.net
```

You can find these in the Azure Portal:
1. Open your Synapse workspace
2. Go to Overview
3. Copy the SQL endpoint URLs

#### 2. Authentication

**Default (Azure CLI):**
```bash
az login
az account set --subscription <subscription-id>
```

**Service Principal:**
```json
{
  "options": {
    "authentication": {
      "type": "azure-active-directory-service-principal-secret",
      "options": {
        "clientId": "your-client-id",
        "clientSecret": "your-secret",
        "tenantId": "your-tenant-id"
      }
    }
  }
}
```

**Managed Identity:**
```json
{
  "options": {
    "authentication": {
      "type": "azure-active-directory-msi-app-service"
    }
  }
}
```

#### 3. Required Permissions

**Serverless SQL:**
- `Storage Blob Data Reader` on data lake
- `Synapse SQL User` role

**Dedicated SQL:**
- `db_datareader` role on database
- `Synapse SQL User` role

#### 4. Testing Connection

```json
{
  "tool": "sql_query",
  "arguments": {
    "connection_name": "synapse-serverless",
    "query": "SELECT @@VERSION as Version"
  }
}
```

---

### Synapse vs Fabric Comparison

| Feature | Synapse Serverless | Synapse Dedicated | Fabric Warehouse | Fabric Lakehouse |
|---------|-------------------|-------------------|------------------|------------------|
| Storage | Data Lake Gen2 | Dedicated compute | OneLake (Delta) | OneLake (Delta) |
| Pricing | Pay per TB scanned | Reserved capacity | Fabric capacity | Fabric capacity |
| Performance | On-demand | High (dedicated) | High (Delta) | Medium (SQL EP) |
| Best For | Ad-hoc queries | Enterprise DW | Modern DW | Data exploration |
| OPENROWSET | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| External Tables | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes (Delta) |
| Time Travel | ❌ No | ❌ No | ✅ Yes | ✅ Yes |

---

### Troubleshooting Synapse

**Problem:** "Login failed for user"
```bash
Solution: Re-authenticate with Azure CLI
az logout
az login
az account show
```

**Problem:** "Cannot bulk load"
```
Solution: Check storage permissions
1. Verify Storage Blob Data Reader role
2. Check firewall rules on storage
3. Verify SAS token if using
```

**Problem:** "External table not found"
```sql
Solution: Create external table first
CREATE EXTERNAL TABLE ExternalSales
WITH (
    LOCATION = '/sales/*.parquet',
    DATA_SOURCE = DataLakeSource,
    FILE_FORMAT = ParquetFormat
)
```

**Problem:** "Query timeout"
```json
Solution: Increase timeout
{
  "timeout": 60,
  "options": {
    "requestTimeout": 120000
  }
}
```

---

### Advanced Synapse Features

#### OPENROWSET with Schema

```sql
-- Explicit schema for better performance
SELECT *
FROM OPENROWSET(
    BULK 'https://storage.dfs.core.windows.net/data/*.parquet',
    FORMAT = 'PARQUET'
)
WITH (
    OrderID INT,
    CustomerID INT,
    OrderDate DATE,
    Amount DECIMAL(18,2)
) AS orders
```

#### Query Cosmos DB

```sql
-- Query Cosmos DB analytical store
SELECT *
FROM OPENROWSET(
    PROVIDER = 'CosmosDB',
    CONNECTION = 'Account=cosmos-account;Database=orders',
    OBJECT = 'OrdersContainer'
)
WITH (
    id VARCHAR(100),
    customerId INT,
    orderDate DATETIME2
) AS orders
```

#### Create External Data Source

```sql
-- Create reusable data source
CREATE EXTERNAL DATA SOURCE DataLakeSource
WITH (
    LOCATION = 'https://storage.dfs.core.windows.net/data',
    CREDENTIAL = [StorageCredential]
);

-- Use in queries
SELECT * FROM OPENROWSET(
    BULK '/sales/*.parquet',
    DATA_SOURCE = 'DataLakeSource',
    FORMAT = 'PARQUET'
) AS sales
```

---

For complete Synapse examples, see:
- `examples/config-synapse.json` - Configuration examples
- `examples/queries-synapse.sql` - Sample queries
