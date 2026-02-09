import { z } from 'zod';

/**
 * Main server configuration
 */
export const ConfigSchema = z.object({
  // Default settings
  default_output_format: z.array(z.enum(['svg', 'png', 'pdf', 'html', 'mermaid'])).default(['svg']),
  default_style: z.enum(['erwin', 'modern', 'visio', 'minimalist']).default('modern'),
  output_path: z.string().default('./diagrams'),
  
  // Rendering settings
  dpi: z.number().default(300),
  scale: z.number().default(1.0),
  include_legend: z.boolean().default(true),
  include_metadata: z.boolean().default(true),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * ERD Configuration
 */
export interface ERDConfig {
  diagram_type: 'logical' | 'physical' | 'both';
  notation: 'crows-foot' | 'idef1x' | 'uml' | 'chen';
  style: 'erwin' | 'powerdesigner' | 'visio' | 'modern';
  detail_level: 'overview' | 'detailed' | 'comprehensive';
  grouping?: 'subject-area' | 'fact-dimension' | 'none';
  include: {
    data_types?: boolean;
    indexes?: boolean;
    constraints?: boolean;
    sample_data?: boolean;
    statistics?: boolean;
  };
}

/**
 * Table definition
 */
export interface TableDef {
  name: string;
  schema?: string;
  type: 'fact' | 'dimension' | 'bridge' | 'reference' | 'staging';
  columns: ColumnDef[];
  primaryKey?: string[];
  foreignKeys?: ForeignKeyDef[];
  indexes?: IndexDef[];
  description?: string;
  statistics?: {
    rowCount?: number;
    sizeKB?: number;
  };
}

export interface ColumnDef {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  description?: string;
  sampleValues?: string[];
}

export interface ForeignKeyDef {
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  name?: string;
}

export interface IndexDef {
  name: string;
  columns: string[];
  unique: boolean;
}

/**
 * Relationship definition
 */
export interface RelationshipDef {
  from: {
    table: string;
    columns: string[];
  };
  to: {
    table: string;
    columns: string[];
  };
  cardinality: '1:1' | '1:N' | 'N:1' | 'N:N';
  type: 'identifying' | 'non-identifying';
}

/**
 * Diagram styles
 */
export interface DiagramStyle {
  name: string;
  colors: {
    fact: string;
    dimension: string;
    bridge: string;
    reference: string;
    background: string;
    border: string;
    text: string;
  };
  fonts: {
    table: string;
    column: string;
    size: number;
  };
  layout: {
    tableWidth: number;
    tableHeight: number;
    spacing: number;
    padding: number;
  };
}

/**
 * Pre-defined diagram styles
 */
export const DIAGRAM_STYLES: Record<string, DiagramStyle> = {
  erwin: {
    name: 'Erwin Classic',
    colors: {
      fact: '#FFB3BA', // Light red
      dimension: '#BAE1FF', // Light blue
      bridge: '#FFFFBA', // Light yellow
      reference: '#BAFFC9', // Light green
      background: '#FFFFFF',
      border: '#000000',
      text: '#000000',
    },
    fonts: {
      table: 'Arial',
      column: 'Arial',
      size: 10,
    },
    layout: {
      tableWidth: 200,
      tableHeight: 150,
      spacing: 50,
      padding: 10,
    },
  },
  modern: {
    name: 'Modern',
    colors: {
      fact: '#E74C3C', // Modern red
      dimension: '#3498DB', // Modern blue
      bridge: '#F39C12', // Modern orange
      reference: '#2ECC71', // Modern green
      background: '#FFFFFF',
      border: '#2C3E50',
      text: '#2C3E50',
    },
    fonts: {
      table: 'Segoe UI',
      column: 'Segoe UI',
      size: 11,
    },
    layout: {
      tableWidth: 220,
      tableHeight: 160,
      spacing: 60,
      padding: 12,
    },
  },
  visio: {
    name: 'Visio Professional',
    colors: {
      fact: '#FFC7CE',
      dimension: '#C6EFCE',
      bridge: '#FFEB9C',
      reference: '#D9E1F2',
      background: '#FFFFFF',
      border: '#404040',
      text: '#404040',
    },
    fonts: {
      table: 'Calibri',
      column: 'Calibri',
      size: 10,
    },
    layout: {
      tableWidth: 210,
      tableHeight: 155,
      spacing: 55,
      padding: 11,
    },
  },
  minimalist: {
    name: 'Minimalist',
    colors: {
      fact: '#E8E8E8',
      dimension: '#D0D0D0',
      bridge: '#F0F0F0',
      reference: '#C8C8C8',
      background: '#FFFFFF',
      border: '#666666',
      text: '#333333',
    },
    fonts: {
      table: 'Helvetica',
      column: 'Helvetica',
      size: 10,
    },
    layout: {
      tableWidth: 200,
      tableHeight: 150,
      spacing: 50,
      padding: 10,
    },
  },
};

/**
 * Cloud architecture node types
 */
export interface CloudNode {
  id: string;
  name: string;
  type: 'resource' | 'resource-group' | 'subscription' | 'network' | 'security';
  service: string; // e.g., 'vm', 'storage', 'vnet', 'nsg'
  properties: Record<string, any>;
  connections: string[]; // IDs of connected nodes
}

/**
 * Data flow diagram node
 */
export interface DFDNode {
  id: string;
  name: string;
  type: 'process' | 'data-store' | 'external-entity' | 'data-flow';
  level: 0 | 1 | 2; // DFD level
  description?: string;
  inputs?: string[];
  outputs?: string[];
}

/**
 * Mermaid diagram output
 */
export interface MermaidDiagram {
  type: 'erd' | 'flowchart' | 'sequence' | 'class' | 'state' | 'gantt';
  content: string;
}
