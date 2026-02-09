import { z } from 'zod';

/**
 * Authentication methods
 */
export const AuthMethodSchema = z.enum([
  'azure-cli',
  'service-principal',
  'managed-identity',
]);

export type AuthMethod = z.infer<typeof AuthMethodSchema>;

/**
 * Service principal configuration
 */
export const ServicePrincipalSchema = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  tenantId: z.string(),
});

/**
 * Main server configuration
 */
export const ConfigSchema = z.object({
  client_id: z.string(),
  azure_subscription: z.string().optional(),
  fabric_tenant: z.string().optional(),
  synapse_workspace: z.string().optional(),
  auth_method: AuthMethodSchema.default('azure-cli'),
  service_principal: ServicePrincipalSchema.optional(),
  workspaces: z.array(z.string()).default([]),
  read_only: z.boolean().default(true),
  cache_ttl: z.number().default(300), // 5 minutes
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Workspace item
 */
export interface WorkspaceItem {
  id: string;
  name: string;
  type: string;
  description?: string;
  lastModified?: string;
}

/**
 * Semantic model (dataset) structure
 */
export interface SemanticModel {
  name: string;
  tables: Table[];
  relationships: Relationship[];
  roles?: Role[];
}

export interface Table {
  name: string;
  columns: Column[];
  measures: Measure[];
  partitions?: Partition[];
}

export interface Column {
  name: string;
  dataType: string;
  expression?: string;
  isHidden?: boolean;
}

export interface Measure {
  name: string;
  expression: string;
  formatString?: string;
  description?: string;
  hidden?: boolean;
  table?: string;
}

export interface Partition {
  name: string;
  source: any;
}

export interface Relationship {
  name: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  crossFilteringBehavior?: string;
  cardinality?: string;
}

export interface Role {
  name: string;
  modelPermission: string;
  tablePermissions?: any[];
}

/**
 * Pipeline structure
 */
export interface Pipeline {
  name: string;
  activities: Activity[];
  parameters?: Parameter[];
  variables?: Variable[];
}

export interface Activity {
  name: string;
  type: string;
  inputs?: any[];
  outputs?: any[];
  linkedServiceName?: string;
  typeProperties?: any;
}

export interface Parameter {
  name: string;
  type: string;
  defaultValue?: any;
}

export interface Variable {
  name: string;
  type: string;
  defaultValue?: any;
}

/**
 * Pipeline run
 */
export interface PipelineRun {
  runId: string;
  pipelineName: string;
  status: string;
  runStart: string;
  runEnd?: string;
  duration?: number;
  message?: string;
}

/**
 * Notebook structure
 */
export interface Notebook {
  name: string;
  language: string;
  cells: NotebookCell[];
  metadata?: any;
}

export interface NotebookCell {
  type: 'code' | 'markdown';
  language?: string;
  source: string;
  outputs?: any[];
}

/**
 * Lakehouse structure
 */
export interface Lakehouse {
  id: string;
  name: string;
  sqlEndpoint?: string;
  oneLakePath?: string;
}

export interface LakehouseTable {
  name: string;
  type: 'managed' | 'external';
  format: string;
  location?: string;
  partitioned?: boolean;
}

/**
 * Spark pool
 */
export interface SparkPool {
  name: string;
  nodeSize: string;
  nodeCount: number;
  sparkVersion: string;
  state: string;
  autoScale?: any;
  autoPause?: any;
}

/**
 * Refresh history
 */
export interface RefreshHistory {
  refreshId: string;
  startTime: string;
  endTime?: string;
  status: string;
  duration?: number;
  errorMessage?: string;
}
