import { z } from 'zod';

/**
 * Document template configuration
 */
export const TemplateConfigSchema = z.object({
  name: z.string(),
  brand: z.object({
    name: z.string(),
    colors: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string().optional(),
    }),
    logo: z.string().optional(),
  }),
  document_structure: z.object({
    executive_summary: z.object({
      style: z.enum(['pyramid-principle', 'standard', 'executive']),
      max_pages: z.number().default(10),
      sections: z.array(z.string()),
    }),
    technical_document: z.object({
      include_toc: z.boolean().default(true),
      include_glossary: z.boolean().default(true),
      max_depth: z.number().default(3),
    }),
  }).optional(),
});

export type TemplateConfig = z.infer<typeof TemplateConfigSchema>;

/**
 * Main server configuration
 */
export const ConfigSchema = z.object({
  // Template settings
  default_template: z.enum(['mckinsey', 'bcg', 'bain', 'deloitte', 'standard']).default('standard'),
  templates_path: z.string().optional(),
  
  // Output settings
  default_output_formats: z.array(z.enum(['docx', 'pdf', 'html', 'md'])).default(['docx']),
  output_path: z.string().default('./output'),
  
  // Analysis settings
  enable_performance_analysis: z.boolean().default(true),
  enable_security_analysis: z.boolean().default(true),
  enable_best_practices: z.boolean().default(true),
  severity_threshold: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  
  // Catalog settings
  include_sample_data: z.boolean().default(false),
  include_data_profiling: z.boolean().default(true),
  max_sample_rows: z.number().default(10),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Workspace analysis result
 */
export interface WorkspaceAnalysis {
  summary: {
    datasets: number;
    pipelines: number;
    reports: number;
    notebooks: number;
    dataflows: number;
    issues: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  findings: Finding[];
  recommendations: Recommendation[];
  metrics: Metrics;
}

export interface Finding {
  id: string;
  category: 'performance' | 'security' | 'naming' | 'complexity' | 'best-practices';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location: string;
  recommendation: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  category: string;
}

export interface Metrics {
  complexity: {
    avg_dax_complexity: number;
    max_dax_complexity: number;
    total_measures: number;
    total_columns: number;
  };
  performance: {
    large_tables: number;
    missing_indexes: number;
    slow_measures: number;
  };
  security: {
    rls_enabled: boolean;
    sensitivity_labels: number;
    shared_workspaces: number;
  };
}

/**
 * Document generation options
 */
export interface GenerationOptions {
  workspace_path: string;
  output_path: string;
  template?: string;
  sections?: string[];
  formats?: string[];
  client_name?: string;
  project_name?: string;
  include_erds?: boolean;
  include_diagrams?: boolean;
}

/**
 * Catalog entry
 */
export interface CatalogEntry {
  type: 'table' | 'measure' | 'column' | 'relationship';
  name: string;
  description?: string;
  properties: Record<string, any>;
  metadata: Record<string, any>;
}

/**
 * Lineage node
 */
export interface LineageNode {
  id: string;
  name: string;
  type: 'table' | 'view' | 'report' | 'dataset' | 'pipeline';
  properties: Record<string, any>;
  dependencies: string[];
}

/**
 * Pre-built consulting templates
 */
export const CONSULTING_TEMPLATES: Record<string, Partial<TemplateConfig>> = {
  mckinsey: {
    name: 'McKinsey & Company',
    brand: {
      name: 'McKinsey & Company',
      colors: {
        primary: '#00A4E4',
        secondary: '#003057',
      },
    },
  },
  bcg: {
    name: 'Boston Consulting Group',
    brand: {
      name: 'Boston Consulting Group',
      colors: {
        primary: '#009639',
        secondary: '#000000',
      },
    },
  },
  bain: {
    name: 'Bain & Company',
    brand: {
      name: 'Bain & Company',
      colors: {
        primary: '#E31937',
        secondary: '#000000',
      },
    },
  },
  deloitte: {
    name: 'Deloitte',
    brand: {
      name: 'Deloitte',
      colors: {
        primary: '#86BC25',
        secondary: '#000000',
      },
    },
  },
  standard: {
    name: 'Standard',
    brand: {
      name: 'Professional Services',
      colors: {
        primary: '#0078D4',
        secondary: '#003057',
      },
    },
  },
};
