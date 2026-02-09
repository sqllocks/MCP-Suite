import pg from 'pg';
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
 * PostgreSQL connector
 */
export class PostgresConnector implements DatabaseConnector {
  private pool?: pg.Pool;
  private config: ConnectionConfig;

  constructor(config: ConnectionConfig, private logger?: Logger) {
    this.config = config;
  }

  async connect(): Promise<void> {
    this.logger?.info({ connection: this.config.name }, 'Connecting to PostgreSQL');

    this.pool = new pg.Pool({
      host: this.config.host,
      port: this.config.port || 5432,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      connectionTimeoutMillis: this.config.timeout * 1000,
      ...this.config.options,
    });

    // Test connection
    const client = await this.pool.connect();
    client.release();

    this.logger?.info('Connected to PostgreSQL');
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = undefined;
      this.logger?.info('Disconnected from PostgreSQL');
    }
  }

  isConnected(): boolean {
    return this.pool !== undefined;
  }

  async query(queryText: string, params?: any[]): Promise<QueryResult> {
    if (!this.pool) throw new Error('Not connected');

    const startTime = Date.now();
    this.logger?.debug({ query: queryText.substring(0, 100) }, 'Executing query');

    const result = await this.pool.query(queryText, params);
    const executionTime = Date.now() - startTime;

    const columns = result.fields.map(f => f.name);
    const rows = result.rows.map(row => columns.map(col => row[col]));

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

  async getTableSchema(tableName: string, schema: string = 'public'): Promise<TableSchema> {
    if (!this.pool) throw new Error('Not connected');

    this.logger?.debug({ table: tableName, schema }, 'Getting table schema');

    // Get columns
    const columnsQuery = `
      SELECT 
        column_name as name,
        data_type as "dataType",
        is_nullable as nullable,
        column_default as "defaultValue",
        character_maximum_length as "maxLength",
        numeric_precision as precision,
        numeric_scale as scale
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = $2
      ORDER BY ordinal_position
    `;

    const columnsResult = await this.pool.query(columnsQuery, [tableName, schema]);

    const columns: ColumnInfo[] = columnsResult.rows.map((row: any) => ({
      name: row.name,
      dataType: row.dataType,
      nullable: row.nullable === 'YES',
      defaultValue: row.defaultValue,
      maxLength: row.maxLength,
      precision: row.precision,
      scale: row.scale,
      isIdentity: row.defaultValue?.includes('nextval'),
      isPrimaryKey: false,
      isForeignKey: false,
    }));

    // Get primary key
    const pkQuery = `
      SELECT a.attname as column_name
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary
    `;

    const pkResult = await this.pool.query(pkQuery, [`${schema}.${tableName}`]);
    const primaryKey = pkResult.rows.map((row: any) => row.column_name);

    // Mark primary key columns
    columns.forEach(col => {
      col.isPrimaryKey = primaryKey.includes(col.name);
    });

    return {
      tableName,
      schema,
      columns,
      primaryKey,
      foreignKeys: [], // Simplified
      indexes: [], // Simplified
    };
  }

  async listTables(schema: string = 'public'): Promise<string[]> {
    if (!this.pool) throw new Error('Not connected');

    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1 AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const result = await this.pool.query(query, [schema]);
    return result.rows.map((row: any) => row.table_name);
  }

  async searchColumns(pattern: string, schema?: string): Promise<Array<{
    table: string;
    column: string;
    dataType: string;
  }>> {
    if (!this.pool) throw new Error('Not connected');

    let query = `
      SELECT 
        table_name as table,
        column_name as column,
        data_type as "dataType"
      FROM information_schema.columns
      WHERE column_name LIKE $1
    `;

    const params: any[] = [`%${pattern}%`];

    if (schema) {
      query += ` AND table_schema = $2`;
      params.push(schema);
    }

    query += ` ORDER BY table_name, ordinal_position`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getTableStats(tableName: string, schema: string = 'public'): Promise<TableSchema['statistics']> {
    if (!this.pool) throw new Error('Not connected');

    const query = `
      SELECT 
        n_live_tup as "rowCount",
        pg_total_relation_size($1::regclass) / 1024 as "sizeKB"
      FROM pg_stat_user_tables
      WHERE relname = $2 AND schemaname = $3
    `;

    const result = await this.pool.query(query, [`${schema}.${tableName}`, tableName, schema]);

    if (result.rows.length === 0) {
      return { rowCount: 0, sizeKB: 0 };
    }

    return {
      rowCount: result.rows[0].rowCount || 0,
      sizeKB: result.rows[0].sizeKB || 0,
    };
  }

  async explainQuery(queryText: string): Promise<ExplainPlan> {
    if (!this.pool) throw new Error('Not connected');

    const result = await this.pool.query(`EXPLAIN (FORMAT JSON) ${queryText}`);
    const plan = JSON.stringify(result.rows[0], null, 2);

    return {
      plan,
      recommendations: [
        'Review sequential scans',
        'Check index usage',
        'Consider query optimization',
      ],
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.pool) {
        await this.connect();
      }
      const result = await this.pool!.query('SELECT 1 as test');
      return result.rows.length > 0;
    } catch (error) {
      this.logger?.error({ error }, 'Connection test failed');
      return false;
    }
  }
}
