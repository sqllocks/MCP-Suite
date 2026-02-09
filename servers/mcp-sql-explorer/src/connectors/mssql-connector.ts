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

/**
 * SQL Server connector
 */
export class MSSQLConnector implements DatabaseConnector {
  private pool?: sql.ConnectionPool;
  private config: ConnectionConfig;

  constructor(config: ConnectionConfig, private logger?: Logger) {
    this.config = config;
  }

  async connect(): Promise<void> {
    this.logger?.info({ 
      connection: this.config.name,
      authType: this.config.authenticationType || 'sql-auth'
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

    const authType = this.config.authenticationType || 'sql-auth';

    switch (authType) {
      case 'sql-auth':
        return this.buildSqlAuthConfig(baseConfig);
      
      case 'entra-id':
        return this.buildEntraIdConfig(baseConfig);
      
      case 'managed-identity':
        return this.buildManagedIdentityConfig(baseConfig);
      
      default:
        throw new Error(`Unsupported authentication type: ${authType}`);
    }
  }

  /**
   * SQL Server authentication (username/password)
   */
  private buildSqlAuthConfig(baseConfig: sql.config): sql.config {
    if (!this.config.username || !this.config.password) {
      throw new Error('Username and password required for SQL authentication');
    }

    this.logger?.debug('Using SQL Server authentication');

    return {
      ...baseConfig,
      user: this.config.username,
      password: this.config.password,
    };
  }

  /**
   * Entra ID (Azure AD) authentication with service principal
   */
  private buildEntraIdConfig(baseConfig: sql.config): sql.config {
    const { tenantId, clientId, clientSecret } = this.config;

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
    this.logger?.debug('Using Azure Managed Identity authentication');

    // System-assigned managed identity
    if (!this.config.clientId) {
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
          clientId: this.config.clientId,
        },
      },
    };
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

    this.logger?.debug({ table: tableName, schema }, 'Getting table schema');

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

    // Get foreign keys
    const fkQuery = `
      SELECT 
        fk.name,
        COL_NAME(fc.parent_object_id, fc.parent_column_id) as columnName,
        OBJECT_NAME(fk.referenced_object_id) as referencedTable,
        COL_NAME(fc.referenced_object_id, fc.referenced_column_id) as referencedColumn
      FROM sys.foreign_keys fk
      INNER JOIN sys.foreign_key_columns fc ON fk.object_id = fc.constraint_object_id
      WHERE OBJECT_NAME(fk.parent_object_id) = @tableName
        AND SCHEMA_NAME(OBJECTPROPERTY(fk.parent_object_id, 'SchemaId')) = @schema
    `;

    const fkResult = await this.pool.request()
      .input('tableName', sql.VarChar, tableName)
      .input('schema', sql.VarChar, schema)
      .query(fkQuery);

    const foreignKeys = fkResult.recordset.map((row: any) => ({
      name: row.name,
      columns: [row.columnName],
      referencedTable: row.referencedTable,
      referencedColumns: [row.referencedColumn],
    }));

    // Mark foreign key columns
    const fkColumns = foreignKeys.flatMap(fk => fk.columns);
    columns.forEach(col => {
      col.isForeignKey = fkColumns.includes(col.name);
    });

    // Get indexes
    const indexQuery = `
      SELECT 
        i.name,
        COL_NAME(ic.object_id, ic.column_id) as columnName,
        i.is_unique
      FROM sys.indexes i
      INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      WHERE OBJECT_NAME(i.object_id) = @tableName
        AND SCHEMA_NAME(OBJECTPROPERTY(i.object_id, 'SchemaId')) = @schema
        AND i.is_primary_key = 0
      ORDER BY i.name, ic.key_ordinal
    `;

    const indexResult = await this.pool.request()
      .input('tableName', sql.VarChar, tableName)
      .input('schema', sql.VarChar, schema)
      .query(indexQuery);

    // Group indexes
    const indexMap = new Map<string, { name: string; columns: string[]; unique: boolean }>();
    indexResult.recordset.forEach((row: any) => {
      if (!indexMap.has(row.name)) {
        indexMap.set(row.name, {
          name: row.name,
          columns: [],
          unique: row.is_unique,
        });
      }
      indexMap.get(row.name)!.columns.push(row.columnName);
    });

    const indexes = Array.from(indexMap.values());

    return {
      tableName,
      schema,
      columns,
      primaryKey,
      foreignKeys,
      indexes,
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

    // Get execution plan
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
