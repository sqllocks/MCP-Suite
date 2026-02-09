import { z } from 'zod';

/**
 * Connection configuration schema with Entra ID support
 */
export const ConnectionConfigSchema = z.object({
  name: z.string(),
  type: z.enum(['mssql', 'postgres', 'mysql', 'fabric-warehouse', 'fabric-sql-database', 'fabric-lakehouse', 'synapse-serverless', 'synapse-dedicated']),
  host: z.string(),
  port: z.number().optional(),
  database: z.string(),
  
  // Authentication type
  authenticationType: z.enum(['sql-auth', 'entra-id', 'managed-identity']).optional(),
  
  // SQL Authentication
  username: z.string().optional(),
  password: z.string().optional(),
  
  // Entra ID (Azure AD) Authentication
  tenantId: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  
  // Legacy/fallback
  connectionString: z.string().optional(),
  options: z.record(z.any()).optional(),
  read_only: z.boolean().default(true),
  timeout: z.number().default(30),
});

export type ConnectionConfig = z.infer<typeof ConnectionConfigSchema>;

/**
 * Main server configuration
 */
export const ConfigSchema = z.object({
  client_id: z.string(),
  connections: z.record(ConnectionConfigSchema),
  
  // Query settings
  max_result_rows: z.number().default(1000),
  query_timeout: z.number().default(30),
  enable_explain_plan: z.boolean().default(true),
  
  // Safety settings
  allow_write_operations: z.boolean().default(false),
  dangerous_keywords: z.array(z.string()).default([
    'DROP', 'TRUNCATE', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE'
  ]),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Query result
 */
export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
}

/**
 * Schema information
 */
export interface TableSchema {
  tableName: string;
  schema?: string;
  columns: ColumnInfo[];
  primaryKey?: string[];
  foreignKeys?: ForeignKey[];
  indexes?: IndexInfo[];
  statistics?: TableStatistics;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: string;
  maxLength?: number;
  precision?: number;
  scale?: number;
  isIdentity?: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
}

export interface ForeignKey {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  type?: string;
}

export interface TableStatistics {
  rowCount: number;
  sizeKB: number;
  lastUpdated?: string;
}

/**
 * Explain plan result
 */
export interface ExplainPlan {
  plan: string;
  estimatedCost?: number;
  estimatedRows?: number;
  recommendations?: string[];
}

/**
 * Pre-configured connection examples
 */
export const CONNECTION_EXAMPLES: Record<string, Partial<ConnectionConfig>> = {
  'mssql-local': {
    name: 'SQL Server (Local)',
    type: 'mssql',
    host: 'localhost',
    port: 1433,
    database: 'master',
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  },
  'mssql-azure': {
    name: 'Azure SQL Database',
    type: 'mssql',
    host: 'your-server.database.windows.net',
    port: 1433,
    database: 'your-database',
    options: {
      encrypt: true,
    },
  },
  'postgres-local': {
    name: 'PostgreSQL (Local)',
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'postgres',
  },
  'mysql-local': {
    name: 'MySQL (Local)',
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    database: 'mysql',
  },
  'fabric-warehouse': {
    name: 'Fabric Warehouse',
    type: 'fabric-warehouse',
    host: 'your-workspace.datawarehouse.fabric.microsoft.com',
    database: 'your-warehouse',
    options: {
      authentication: {
        type: 'azure-active-directory-default',
      },
    },
  },
  'fabric-sql-database': {
    name: 'Fabric SQL Database',
    type: 'fabric-sql-database',
    host: 'your-workspace.datawarehouse.fabric.microsoft.com',
    database: 'your-sql-database',
    options: {
      authentication: {
        type: 'azure-active-directory-default',
      },
      encrypt: true,
    },
  },
  'fabric-lakehouse': {
    name: 'Fabric Lakehouse',
    type: 'fabric-lakehouse',
    host: 'your-workspace.datawarehouse.fabric.microsoft.com',
    database: 'your-lakehouse',
    options: {
      authentication: {
        type: 'azure-active-directory-default',
      },
      encrypt: true,
    },
  },
  'synapse-serverless': {
    name: 'Synapse Serverless SQL Pool',
    type: 'synapse-serverless',
    host: 'your-workspace-ondemand.sql.azuresynapse.net',
    database: 'master',
    options: {
      authentication: {
        type: 'azure-active-directory-default',
      },
      encrypt: true,
    },
  },
  'synapse-dedicated': {
    name: 'Synapse Dedicated SQL Pool',
    type: 'synapse-dedicated',
    host: 'your-workspace.sql.azuresynapse.net',
    database: 'SQLPool1',
    options: {
      authentication: {
        type: 'azure-active-directory-default',
      },
      encrypt: true,
    },
  },
};
