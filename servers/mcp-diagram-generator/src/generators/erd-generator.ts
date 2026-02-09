import dagre from 'dagre';
import type { Logger } from '@mcp-suite/shared';
import type {
  ERDConfig,
  TableDef,
  RelationshipDef,
  DiagramStyle,
  DIAGRAM_STYLES,
} from '../config.js';

/**
 * ERD Generator with crow's foot notation
 */
export class ERDGenerator {
  constructor(private logger?: Logger) {}

  /**
   * Generate ERD from table definitions
   */
  async generateERD(
    tables: TableDef[],
    relationships: RelationshipDef[],
    config: ERDConfig
  ): Promise<string> {
    this.logger?.info(
      { tableCount: tables.length, relationshipCount: relationships.length },
      'Generating ERD'
    );

    // Get style
    const style = DIAGRAM_STYLES[config.style] || DIAGRAM_STYLES.modern;

    // Build layout using dagre
    const layout = this.buildLayout(tables, relationships, style);

    // Generate SVG
    const svg = this.generateSVG(tables, relationships, layout, config, style);

    return svg;
  }

  /**
   * Build layout using dagre
   */
  private buildLayout(
    tables: TableDef[],
    relationships: RelationshipDef[],
    style: DiagramStyle
  ): dagre.graphlib.Graph {
    const g = new dagre.graphlib.Graph();

    // Set graph options
    g.setGraph({
      rankdir: 'TB', // Top to bottom
      nodesep: style.layout.spacing,
      ranksep: style.layout.spacing * 2,
      marginx: 20,
      marginy: 20,
    });

    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes (tables)
    for (const table of tables) {
      const height = this.calculateTableHeight(table, style);
      
      g.setNode(table.name, {
        label: table.name,
        width: style.layout.tableWidth,
        height,
        table,
      });
    }

    // Add edges (relationships)
    for (const rel of relationships) {
      g.setEdge(rel.from.table, rel.to.table, {
        relationship: rel,
      });
    }

    // Compute layout
    dagre.layout(g);

    return g;
  }

  /**
   * Calculate table height based on columns
   */
  private calculateTableHeight(table: TableDef, style: DiagramStyle): number {
    const headerHeight = 30;
    const rowHeight = 20;
    const maxRows = 15; // Limit visible rows

    const visibleRows = Math.min(table.columns.length, maxRows);
    return headerHeight + (visibleRows * rowHeight) + style.layout.padding * 2;
  }

  /**
   * Generate SVG diagram
   */
  private generateSVG(
    tables: TableDef[],
    relationships: RelationshipDef[],
    layout: dagre.graphlib.Graph,
    config: ERDConfig,
    style: DiagramStyle
  ): string {
    const graph = layout.graph();
    const width = (graph.width || 800) + 40;
    const height = (graph.height || 600) + 40;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .table-header { font-family: ${style.fonts.table}; font-size: ${style.fonts.size + 2}px; font-weight: bold; }
      .column-text { font-family: ${style.fonts.column}; font-size: ${style.fonts.size}px; }
      .pk-icon { fill: #FFD700; }
      .fk-icon { fill: #C0C0C0; }
    </style>
  </defs>
  <rect width="${width}" height="${height}" fill="${style.colors.background}"/>
`;

    // Draw relationships first (so they appear behind tables)
    svg += this.drawRelationships(relationships, layout, style);

    // Draw tables
    for (const table of tables) {
      const node = layout.node(table.name);
      if (node) {
        svg += this.drawTable(table, node.x, node.y, config, style);
      }
    }

    // Add legend if requested
    if (config.include) {
      svg += this.drawLegend(width - 220, 20, style);
    }

    svg += '</svg>';

    return svg;
  }

  /**
   * Draw a single table
   */
  private drawTable(
    table: TableDef,
    x: number,
    y: number,
    config: ERDConfig,
    style: DiagramStyle
  ): string {
    const width = style.layout.tableWidth;
    const height = this.calculateTableHeight(table, style);

    // Determine fill color based on table type
    const fillColor = style.colors[table.type] || style.colors.dimension;

    // Table box
    let svg = `
  <g transform="translate(${x - width/2}, ${y - height/2})">
    <!-- Table border -->
    <rect width="${width}" height="${height}" fill="${fillColor}" stroke="${style.colors.border}" stroke-width="2" rx="5"/>
    
    <!-- Table header -->
    <rect width="${width}" height="30" fill="${style.colors.border}" opacity="0.1" rx="5"/>
    <text x="${width/2}" y="20" text-anchor="middle" class="table-header" fill="${style.colors.text}">
      ${this.escapeXml(table.name)}
    </text>
    
    <!-- Separator line -->
    <line x1="0" y1="30" x2="${width}" y2="30" stroke="${style.colors.border}" stroke-width="1"/>
`;

    // Draw columns
    let yPos = 45;
    const maxColumns = 15;
    const columnsToShow = table.columns.slice(0, maxColumns);

    for (const column of columnsToShow) {
      svg += this.drawColumn(column, yPos, width, config, style);
      yPos += 20;
    }

    // Show "..." if there are more columns
    if (table.columns.length > maxColumns) {
      svg += `
    <text x="10" y="${yPos}" class="column-text" fill="${style.colors.text}">
      ... ${table.columns.length - maxColumns} more columns
    </text>`;
    }

    svg += '  </g>\n';

    return svg;
  }

  /**
   * Draw a single column
   */
  private drawColumn(
    column: ColumnDef,
    y: number,
    tableWidth: number,
    config: ERDConfig,
    style: DiagramStyle
  ): string {
    let svg = '';

    // Key icon
    if (column.isPrimaryKey) {
      svg += `<circle cx="15" cy="${y - 5}" r="4" class="pk-icon"/>`;
    } else if (column.isForeignKey) {
      svg += `<circle cx="15" cy="${y - 5}" r="4" class="fk-icon"/>`;
    }

    // Column name
    const columnText = column.isPrimaryKey ? `${column.name} (PK)` : column.name;
    svg += `<text x="25" y="${y}" class="column-text" fill="${style.colors.text}">${this.escapeXml(columnText)}</text>`;

    // Data type (if requested)
    if (config.include.data_types) {
      const typeText = column.nullable ? `${column.dataType}?` : column.dataType;
      svg += `<text x="${tableWidth - 10}" y="${y}" text-anchor="end" class="column-text" fill="${style.colors.text}" opacity="0.7">${this.escapeXml(typeText)}</text>`;
    }

    svg += '\n';

    return svg;
  }

  /**
   * Draw relationships with crow's foot notation
   */
  private drawRelationships(
    relationships: RelationshipDef[],
    layout: dagre.graphlib.Graph,
    style: DiagramStyle
  ): string {
    let svg = '';

    for (const rel of relationships) {
      const fromNode = layout.node(rel.from.table);
      const toNode = layout.node(rel.to.table);

      if (!fromNode || !toNode) continue;

      // Calculate connection points
      const points = this.calculateConnectionPoints(fromNode, toNode, style);

      // Draw line
      svg += `
  <g>
    <line x1="${points.x1}" y1="${points.y1}" x2="${points.x2}" y2="${points.y2}" 
          stroke="${style.colors.border}" stroke-width="2" marker-end="url(#arrow)"/>
`;

      // Draw crow's foot notation
      svg += this.drawCrowsFoot(rel, points.x2, points.y2, points.angle);

      svg += '  </g>\n';
    }

    // Add arrow marker definition
    svg = `
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="${style.colors.border}" />
    </marker>
  </defs>
` + svg;

    return svg;
  }

  /**
   * Calculate connection points between two nodes
   */
  private calculateConnectionPoints(
    fromNode: any,
    toNode: any,
    style: DiagramStyle
  ): { x1: number; y1: number; x2: number; y2: number; angle: number } {
    // Simple straight line from center to center
    // In production, you'd calculate edge points more precisely
    const x1 = fromNode.x;
    const y1 = fromNode.y;
    const x2 = toNode.x;
    const y2 = toNode.y;

    const angle = Math.atan2(y2 - y1, x2 - x1);

    return { x1, y1, x2, y2, angle };
  }

  /**
   * Draw crow's foot notation for cardinality
   */
  private drawCrowsFoot(
    rel: RelationshipDef,
    x: number,
    y: number,
    angle: number
  ): string {
    // This would draw the actual crow's foot symbols
    // Simplified for now - just shows the cardinality as text
    return `
    <text x="${x + 10}" y="${y - 5}" font-size="10" fill="#666">${rel.cardinality}</text>`;
  }

  /**
   * Draw legend
   */
  private drawLegend(x: number, y: number, style: DiagramStyle): string {
    return `
  <g transform="translate(${x}, ${y})">
    <rect width="200" height="150" fill="white" stroke="${style.colors.border}" stroke-width="1" rx="5"/>
    <text x="10" y="20" font-weight="bold">Legend</text>
    
    <rect x="10" y="30" width="30" height="20" fill="${style.colors.fact}" stroke="${style.colors.border}"/>
    <text x="45" y="45" font-size="10">Fact Table</text>
    
    <rect x="10" y="55" width="30" height="20" fill="${style.colors.dimension}" stroke="${style.colors.border}"/>
    <text x="45" y="70" font-size="10">Dimension Table</text>
    
    <rect x="10" y="80" width="30" height="20" fill="${style.colors.bridge}" stroke="${style.colors.border}"/>
    <text x="45" y="95" font-size="10">Bridge Table</text>
    
    <circle cx="20" cy="115" r="4" class="pk-icon"/>
    <text x="30" y="120" font-size="10">Primary Key</text>
    
    <circle cx="20" cy="135" r="4" class="fk-icon"/>
    <text x="30" y="140" font-size="10">Foreign Key</text>
  </g>`;
  }

  /**
   * Generate Mermaid ERD syntax
   */
  generateMermaid(tables: TableDef[], relationships: RelationshipDef[]): string {
    let mermaid = 'erDiagram\n';

    // Add tables
    for (const table of tables) {
      mermaid += `  ${table.name} {\n`;
      for (const column of table.columns) {
        const type = column.dataType.toUpperCase();
        const key = column.isPrimaryKey ? ' PK' : column.isForeignKey ? ' FK' : '';
        mermaid += `    ${type} ${column.name}${key}\n`;
      }
      mermaid += '  }\n';
    }

    // Add relationships
    for (const rel of relationships) {
      const card = rel.cardinality.replace(':', '||');
      mermaid += `  ${rel.from.table} ${card}--o{ ${rel.to.table} : ""\n`;
    }

    return mermaid;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
