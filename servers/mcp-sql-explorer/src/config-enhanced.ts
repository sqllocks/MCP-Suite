import { z } from 'zod';

/**
 * Authentication types supported
 */
export type AuthenticationType = 
  | 'sql-auth'           // SQL Server authentication (username/password)
  | 'entra-id'          // Entra ID (Azure AD) authentication
  | 'managed-identity'  // Azure Managed Identity
  | 'connection-string'; // Full connection string

/**
 * Enhanced connection configuration with Entra ID support
 */
export const EnhancedConnectionConfigSchema = z.object({
  name: z.string(),
  type: z.enum([
    'mssql', 
    'postgres', 
    'mysql', 
    'fabric-warehouse', 
    'fabric-sql-database', 
    'fabric-lakehouse', 
    'synapse-serverless', 
    'synapse-dedicated'
  ]),
  
  // Server details
  host: z.string(),
  port: z.number().optional(),
  database: z.string(),
  
  // Authentication configuration
  authentication: z.object({
    type: z.enum(['sql-auth', 'entra-id', 'managed-identity', 'connection-string']),
    
    // SQL Authentication
    username: z.string().optional(),
    password: z.string().optional(),
    
    // Entra ID Authentication
    tenantId: z.string().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    
    // Connection String
    connectionString: z.string().optional(),
  }).optional(),
  
  // Legacy fields for backward compatibility
  username: z.string().optional(),
  password: z.string().optional(),
  connectionString: z.string().optional(),
  
  // Additional options
  options: z.record(z.any()).optional(),
  read_only: z.boolean().default(true),
  timeout: z.number().default(30),
});

export type EnhancedConnectionConfig = z.infer<typeof EnhancedConnectionConfigSchema>;

/**
 * Main server configuration
 */
export const EnhancedConfigSchema = z.object({
  client_id: z.string(),
  connections: z.record(EnhancedConnectionConfigSchema),
  
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

export type EnhancedConfig = z.infer<typeof EnhancedConfigSchema>;
