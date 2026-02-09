import sql from 'mssql';
import type { DatabaseConnector } from './base-connector.js';
import type {
  ConnectionConfig,
  QueryResult,
  TableSchema,
  ColumnInfo,
  ExplainPlan,
} from '../config.js';
import type { Logger } from '@mcp-suite/shared';
import type { EnhancedConnectionConfig } from '../config-enhanced.js';

/**
 * Enhanced SQL Server connector with Entra ID support
 */
export class EnhancedMSSQLConnector implements DatabaseConnector {
  private pool?: sql.ConnectionPool;
  private config: EnhancedConnectionConfig;

  constructor(config: EnhancedConnectionConfig, private logger?: Logger) {
    this.config = config;
  }

  async connect(): Promise<void> {
    this.logger?.info({ 
      connection: this.config.name,
      authType: this.config.authentication?.type || 'legacy'
    }, 'Connecting to SQL Server');

    const sqlConfig = this.buildSqlConfig();
    this.pool = await sql.connect(sqlConfig);
    
    this.logger?.info('Connected to SQL Server successfully');
  }

  /**
   * Build SQL configuration based on authentication type
   */
  private buildSqlConfig(): sql.config {
    const baseConfig: sql.config = {
      server: this.config.host,
      port: this.config.port,
      database: this.config.database,
      options: {
        encrypt: true,
        trustServerCertificate: false,
        ...this.config.options,
      },
      connectionTimeout: this.config.timeout * 1000,
      requestTimeout: this.config.timeout * 1000,
    };

    // Determine authentication method
    const authType = this.config.authentication?.type;

    if (!authType) {
      // Legacy: Use username/password if provided
      if (this.config.username && this.config.password) {
        return {
          ...baseConfig,
          user: this.config.username,
          password: this.config.password,
        };
      }
      // Legacy: Use connection string if provided
      if (this.config.connectionString) {
        return this.config.connectionString as any;
      }
      throw new Error('No authentication method specified');
    }

    switch (authType) {
      case 'sql-auth':
        return this.buildSqlAuthConfig(baseConfig);
      
      case 'entra-id':
        return this.buildEntraIdConfig(baseConfig);
      
      case 'managed-identity':
        return this.buildManagedIdentityConfig(baseConfig);
      
      case 'connection-string':
        return this.buildConnectionStringConfig();
      
      default:
        throw new Error(`Unsupported authentication type: ${authType}`);
    }
  }

  /**
   * SQL Server authentication (username/password)
   */
  private buildSqlAuthConfig(baseConfig: sql.config): sql.config {
    const { username, password } = this.config.authentication!;

    if (!username || !password) {
      throw new Error('Username and password required for SQL authentication');
    }

    this.logger?.debug('Using SQL Server authentication');

    return {
      ...baseConfig,
      user: username,
      password: password,
    };
  }

  /**
   * Entra ID (Azure AD) authentication with service principal
   */
  private buildEntraIdConfig(baseConfig: sql.config): sql.config {
    const { tenantId, clientId, clientSecret } = this.config.authentication!;

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error(
        'Entra ID authentication requires: tenantId, clientId, and clientSecret'
      );
    }

    this.logger?.debug('Using Entra ID (Azure AD) authentication');

    return {
      ...baseConfig,
      authentication: {
        type: 'azure-active-directory-service-principal-secret',
        options: {
          clientId: clientId,
          clientSecret: clientSecret,
          tenantId: tenantId,
        },
      },
    };
  }

  /**
   * Azure Managed Identity authentication
   */
  private buildManagedIdentityConfig(baseConfig: sql.config): sql.config {
    const { clientId } = this.config.authentication!;

    this.logger?.debug('Using Azure Managed Identity authentication');

    // System-assigned managed identity
    if (!clientId) {
      return {
        ...baseConfig,
        authentication: {
          type: 'azure-active-directory-msi-vm',
        },
      };
    }

    // User-assigned managed identity
    return {
      ...baseConfig,
      authentication: {
        type: 'azure-active-directory-msi-vm',
        options: {
          clientId: clientId,
        },
      },
    };
  }

  /**
   * Full connection string
   */
  private buildConnectionStringConfig(): any {
    const { connectionString } = this.config.authentication!;

    if (!connectionString) {
      throw new Error('Connection string required');
    }

    this.logger?.debug('Using connection string');
    return connectionString;
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = undefined;
      this.logger?.info('Disconnected from SQL Server');
    }
  }

  isConnected(): boolean {
    return this.pool?.connected ?? false;
  }

  async query(queryText: string, params?: any[]): Promise<QueryResult> {
    if (!this.pool) throw new Error('Not connected');

    const startTime = Date.now();
    this.logger?.debug({ query: queryText.substring(0, 100) }, 'Executing query');

    const request = this.pool.request();
    
    // Add parameters if provided
    if (params) {
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });
    }

    const result = await request.query(queryText);
    const executionTime = Date.now() - startTime;

    // Convert to standard format
    const columns = result.recordset?.columns 
      ? Object.keys(result.recordset.columns) 
      : [];
    
    const rows = result.recordset?.map(row => 
      columns.map(col => row[col])
    ) || [];

    this.logger?.debug(
      { rowCount: rows.length, executionTime },
      'Query executed'
    );

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTime,
    };
  }

  async getTableSchema(tableName: string, schema: string = 'dbo'): Promise<TableSchema> {
    if (!this.pool) throw new Error('Not connected');

    // Get columns
    const columnsQuery = `
      SELECT 
        c.COLUMN_NAME as name,
        c.DATA_TYPE as dataType,
        c.IS_NULLABLE as nullable,
        c.COLUMN_DEFAULT as defaultValue,
        c.CHARACTER_MAXIMUM_LENGTH as maxLength,
        c.NUMERIC_PRECISION as precision,
        c.NUMERIC_SCALE as scale,
        COLUMNPROPERTY(OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') as isIdentity
      FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_NAME = @tableName AND c.TABLE_SCHEMA = @schema
      ORDER BY c.ORDINAL_POSITION
    `;

    const columnsResult = await this.pool.request()
      .input('tableName', sql.VarChar, tableName)
      .input('schema', sql.VarChar, schema)
      .query(columnsQuery);

    const columns: ColumnInfo[] = columnsResult.recordset.map((row: any) => ({
      name: row.name,
      dataType: row.dataType,
      nullable: row.nullable === 'YES',
      defaultValue: row.defaultValue,
      maxLength: row.maxLength,
      precision: row.precision,
      scale: row.scale,
      isIdentity: row.isIdentity === 1,
      isPrimaryKey: false,
      isForeignKey: false,
    }));

    // Get primary key
    const pkQuery = `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + CONSTRAINT_NAME), 'IsPrimaryKey') = 1
        AND TABLE_NAME = @tableName AND TABLE_SCHEMA = @schema
    `;

    const pkResult = await this.pool.request()
      .input('tableName', sql.VarChar, tableName)
      .input('schema', sql.VarChar, schema)
      .query(pkQuery);

    const primaryKey = pkResult.recordset.map((row: any) => row.COLUMN_NAME);

    // Mark primary key columns
    columns.forEach(col => {
      col.isPrimaryKey = primaryKey.includes(col.name);
    });

    return {
      tableName,
      schema,
      columns,
      primaryKey,
      foreignKeys: [],
      indexes: [],
    };
  }

  async listTables(schema: string = 'dbo'): Promise<string[]> {
    if (!this.pool) throw new Error('Not connected');

    const query = `
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = @schema AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `;

    const result = await this.pool.request()
      .input('schema', sql.VarChar, schema)
      .query(query);

    return result.recordset.map((row: any) => row.TABLE_NAME);
  }

  async searchColumns(pattern: string, schema?: string): Promise<Array<{
    table: string;
    column: string;
    dataType: string;
  }>> {
    if (!this.pool) throw new Error('Not connected');

    let query = `
      SELECT 
        TABLE_NAME as [table],
        COLUMN_NAME as [column],
        DATA_TYPE as dataType
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE COLUMN_NAME LIKE @pattern
    `;

    if (schema) {
      query += ` AND TABLE_SCHEMA = @schema`;
    }

    query += ` ORDER BY TABLE_NAME, ORDINAL_POSITION`;

    const request = this.pool.request()
      .input('pattern', sql.VarChar, `%${pattern}%`);

    if (schema) {
      request.input('schema', sql.VarChar, schema);
    }

    const result = await request.query(query);

    return result.recordset.map((row: any) => ({
      table: row.table,
      column: row.column,
      dataType: row.dataType,
    }));
  }

  async getTableStats(tableName: string, schema: string = 'dbo'): Promise<TableSchema['statistics']> {
    if (!this.pool) throw new Error('Not connected');

    const query = `
      SELECT 
        SUM(p.rows) as rowCount,
        SUM(a.total_pages) * 8 as sizeKB,
        MAX(s.modify_date) as lastUpdated
      FROM sys.tables t
      INNER JOIN sys.indexes i ON t.object_id = i.object_id
      INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
      INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
      LEFT JOIN sys.stats s ON t.object_id = s.object_id
      WHERE t.name = @tableName AND SCHEMA_NAME(t.schema_id) = @schema
      GROUP BY t.name
    `;

    const result = await this.pool.request()
      .input('tableName', sql.VarChar, tableName)
      .input('schema', sql.VarChar, schema)
      .query(query);

    if (result.recordset.length === 0) {
      return { rowCount: 0, sizeKB: 0 };
    }

    const row = result.recordset[0];
    return {
      rowCount: row.rowCount || 0,
      sizeKB: row.sizeKB || 0,
      lastUpdated: row.lastUpdated?.toISOString(),
    };
  }

  async explainQuery(queryText: string): Promise<ExplainPlan> {
    if (!this.pool) throw new Error('Not connected');

    await this.pool.request().query('SET SHOWPLAN_TEXT ON');
    
    try {
      const result = await this.pool.request().query(queryText);
      const plan = result.recordset.map((row: any) => 
        row['Microsoft SQL Server 2005 XML Showplan']
      ).join('\n');

      return {
        plan,
        recommendations: [
          'Review index usage',
          'Check for table scans',
          'Consider query optimization',
        ],
      };
    } finally {
      await this.pool.request().query('SET SHOWPLAN_TEXT OFF');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.pool) {
        await this.connect();
      }
      const result = await this.pool!.request().query('SELECT 1 as test');
      return result.recordset.length > 0;
    } catch (error) {
      this.logger?.error({ error }, 'Connection test failed');
      return false;
    }
  }
}
