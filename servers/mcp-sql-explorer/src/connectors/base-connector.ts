import type {
  ConnectionConfig,
  QueryResult,
  TableSchema,
  ExplainPlan,
} from '../config.js';

/**
 * Base database connector interface
 */
export interface DatabaseConnector {
  /**
   * Connect to the database
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the database
   */
  disconnect(): Promise<void>;

  /**
   * Check if connected
   */
  isConnected(): boolean;

  /**
   * Execute a query
   */
  query(sql: string, params?: any[]): Promise<QueryResult>;

  /**
   * Get table schema
   */
  getTableSchema(tableName: string, schema?: string): Promise<TableSchema>;

  /**
   * List all tables
   */
  listTables(schema?: string): Promise<string[]>;

  /**
   * Search columns across tables
   */
  searchColumns(pattern: string, schema?: string): Promise<Array<{
    table: string;
    column: string;
    dataType: string;
  }>>;

  /**
   * Get table statistics
   */
  getTableStats(tableName: string, schema?: string): Promise<TableSchema['statistics']>;

  /**
   * Get explain plan for query
   */
  explainQuery(sql: string): Promise<ExplainPlan>;

  /**
   * Test connection
   */
  testConnection(): Promise<boolean>;
}

/**
 * Connection pool manager
 */
export class ConnectionPool {
  private connections: Map<string, DatabaseConnector> = new Map();

  /**
   * Get or create connection
   */
  async getConnection(name: string, config: ConnectionConfig, connector: DatabaseConnector): Promise<DatabaseConnector> {
    if (this.connections.has(name) && connector.isConnected()) {
      return this.connections.get(name)!;
    }

    await connector.connect();
    this.connections.set(name, connector);
    return connector;
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    for (const [name, connector] of this.connections) {
      try {
        await connector.disconnect();
      } catch (error) {
        console.error(`Failed to disconnect ${name}:`, error);
      }
    }
    this.connections.clear();
  }

  /**
   * Close specific connection
   */
  async close(name: string): Promise<void> {
    const connector = this.connections.get(name);
    if (connector) {
      await connector.disconnect();
      this.connections.delete(name);
    }
  }
}
