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
 * Azure SQL platform connector
 * 
 * Supports:
 * - Fabric SQL Database
 * - Fabric Lakehouse (SQL analytics endpoint)
 * - Fabric Warehouse
 * - Synapse Serverless SQL Pool
 * - Synapse Dedicated SQL Pool
 * 
 * All use SQL Server protocol with Azure AD authentication
 */
export class FabricConnector implements DatabaseConnector {
  private pool?: sql.ConnectionPool;
  private config: ConnectionConfig;

  constructor(config: ConnectionConfig, private logger?: Logger) {
    this.config = config;
  }

  async connect(): Promise<void> {
    this.logger?.info(
      { connection: this.config.name, type: this.config.type },
      'Connecting to Fabric'
    );

    // Fabric uses SQL Server protocol with Azure AD authentication
    const sqlConfig: sql.config = {
      server: this.config.host,
      database: this.config.database,
      port: this.config.port || 1433,
      options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
        ...this.config.options,
      },
      connectionTimeout: this.config.timeout * 1000,
      requestTimeout: this.config.timeout * 1000,
      // Azure AD authentication
      authentication: {
        type: 'azure-active-directory-default',
        options: this.config.options?.authentication || {},
      },
    };

    this.pool = await sql.connect(sqlConfig);
    
    this.logger?.info(
      { type: this.config.type },
      'Connected to Fabric'
    );
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = undefined;
      this.logger?.info('Disconnected from Fabric');
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
    
    if (params) {
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });
    }

    const result = await request.query(queryText);
    const executionTime = Date.now() - startTime;

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

    // Fabric uses standard SQL Server information schema
    const columnsQuery = `
      SELECT 
        c.COLUMN_NAME as name,
        c.DATA_TYPE as dataType,
        c.IS_NULLABLE as nullable,
        c.COLUMN_DEFAULT as defaultValue,
        c.CHARACTER_MAXIMUM_LENGTH as maxLength,
        c.NUMERIC_PRECISION as precision,
        c.NUMERIC_SCALE as scale
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
      isIdentity: false,
      isPrimaryKey: false,
      isForeignKey: false,
    }));

    // Get primary key for Fabric SQL Database
    // Note: Lakehouses don't support traditional primary keys
    let primaryKey: string[] = [];
    
    if (this.config.type === 'fabric-sql-database') {
      const pkQuery = `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + CONSTRAINT_NAME), 'IsPrimaryKey') = 1
          AND TABLE_NAME = @tableName AND TABLE_SCHEMA = @schema
      `;

      try {
        const pkResult = await this.pool.request()
          .input('tableName', sql.VarChar, tableName)
          .input('schema', sql.VarChar, schema)
          .query(pkQuery);

        primaryKey = pkResult.recordset.map((row: any) => row.COLUMN_NAME);

        columns.forEach(col => {
          col.isPrimaryKey = primaryKey.includes(col.name);
        });
      } catch (error) {
        // Lakehouses may not support this query
        this.logger?.debug('Could not retrieve primary key information');
      }
    }

    return {
      tableName,
      schema,
      columns,
      primaryKey,
      foreignKeys: [], // Fabric Lakehouses don't support foreign keys
      indexes: [], // Simplified - Fabric manages indexes differently
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

    // Fabric Lakehouse: Use different approach for statistics
    if (this.config.type === 'fabric-lakehouse') {
      return this.getLakehouseTableStats(tableName, schema);
    }

    // Fabric SQL Database: Use standard SQL Server approach
    const query = `
      SELECT 
        SUM(p.rows) as rowCount,
        SUM(a.total_pages) * 8 as sizeKB
      FROM sys.tables t
      INNER JOIN sys.indexes i ON t.object_id = i.object_id
      INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
      INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
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
    };
  }

  private async getLakehouseTableStats(
    tableName: string,
    schema: string
  ): Promise<TableSchema['statistics']> {
    // For Lakehouses, use COUNT and approximate size
    try {
      const countQuery = `SELECT COUNT(*) as rowCount FROM [${schema}].[${tableName}]`;
      const result = await this.pool!.request().query(countQuery);
      
      return {
        rowCount: result.recordset[0]?.rowCount || 0,
        sizeKB: 0, // Size not easily available for Lakehouse tables
      };
    } catch (error) {
      this.logger?.warn({ error, table: tableName }, 'Failed to get Lakehouse table stats');
      return { rowCount: 0, sizeKB: 0 };
    }
  }

  async explainQuery(queryText: string): Promise<ExplainPlan> {
    if (!this.pool) throw new Error('Not connected');

    // Fabric supports execution plans
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
          'Lakehouse tip: Use Delta Lake optimization features',
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

  /**
   * Fabric-specific: Get Lakehouse files
   */
  async getLakehouseFiles(path: string = '/'): Promise<any[]> {
    if (this.config.type !== 'fabric-lakehouse') {
      throw new Error('This operation is only supported for Fabric Lakehouses');
    }

    // Query the Files view in Lakehouse
    const query = `
      SELECT 
        filepath,
        modificationTime,
        length as size
      FROM FILES('${path}')
      ORDER BY filepath
    `;

    try {
      const result = await this.pool!.request().query(query);
      return result.recordset;
    } catch (error) {
      this.logger?.warn({ error, path }, 'Failed to list Lakehouse files');
      return [];
    }
  }

  /**
   * Fabric-specific: Get Delta table properties
   */
  async getDeltaTableProperties(tableName: string, schema: string = 'dbo'): Promise<any> {
    if (this.config.type !== 'fabric-lakehouse') {
      return {};
    }

    try {
      const query = `DESCRIBE EXTENDED [${schema}].[${tableName}]`;
      const result = await this.pool!.request().query(query);
      
      return {
        properties: result.recordset,
        isDelta: true,
      };
    } catch (error) {
      this.logger?.warn({ error, table: tableName }, 'Failed to get Delta table properties');
      return {};
    }
  }
}
