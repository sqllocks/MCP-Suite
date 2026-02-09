/**
 * ERwin-style Entity Relationship Diagram Generator
 * Generates professional ER diagrams with Crow's Foot, IE, and IDEF1X notation
 */

export type ERNotation = 'crows-foot' | 'ie' | 'idef1x';
export type RelationshipType = 'one-to-one' | 'one-to-many' | 'many-to-many';
export type Cardinality = 'zero-or-one' | 'exactly-one' | 'zero-or-many' | 'one-or-many';

export interface Entity {
  name: string;
  attributes: Attribute[];
  primaryKey?: string | string[];
  foreignKeys?: ForeignKey[];
  position?: { x: number; y: number };
  color?: string;
}

export interface Attribute {
  name: string;
  type: string;
  nullable?: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  defaultValue?: string;
}

export interface ForeignKey {
  attribute: string;
  references: {
    entity: string;
    attribute: string;
  };
}

export interface Relationship {
  name?: string;
  from: {
    entity: string;
    cardinality: Cardinality;
  };
  to: {
    entity: string;
    cardinality: Cardinality;
  };
  type: RelationshipType;
  identifying?: boolean;
}

export interface ERDiagramOptions {
  notation: ERNotation;
  style: 'professional' | 'minimal' | 'detailed';
  showDataTypes: boolean;
  showConstraints: boolean;
  colorScheme: 'erwin' | 'modern' | 'grayscale';
  layout: 'hierarchical' | 'organic' | 'grid';
  fontSize: number;
}

export class ERwinDiagramGenerator {
  private readonly DEFAULT_OPTIONS: ERDiagramOptions = {
    notation: 'crows-foot',
    style: 'professional',
    showDataTypes: true,
    showConstraints: true,
    colorScheme: 'erwin',
    layout: 'hierarchical',
    fontSize: 12,
  };

  /**
   * Generate ER diagram
   */
  generate(
    entities: Entity[],
    relationships: Relationship[],
    options?: Partial<ERDiagramOptions>
  ): string {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    // Auto-layout if positions not provided
    if (entities.some((e) => !e.position)) {
      this.autoLayout(entities, relationships, opts.layout);
    }

    const width = this.calculateWidth(entities);
    const height = this.calculateHeight(entities);

    return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${this.generateDefs(opts)}
  </defs>
  
  <style>
    ${this.generateStyles(opts)}
  </style>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#FAFAFA"/>

  <!-- Relationships -->
  <g id="relationships">
    ${relationships.map((rel) => this.renderRelationship(rel, entities, opts)).join('\n')}
  </g>

  <!-- Entities -->
  <g id="entities">
    ${entities.map((entity) => this.renderEntity(entity, opts)).join('\n')}
  </g>

  <!-- Labels -->
  <g id="labels">
    ${relationships.map((rel) => this.renderRelationshipLabel(rel, entities, opts)).join('\n')}
  </g>
</svg>`;
  }

  /**
   * Render entity box (ERwin style)
   */
  private renderEntity(entity: Entity, opts: ERDiagramOptions): string {
    const pos = entity.position || { x: 0, y: 0 };
    const width = 250;
    const headerHeight = 35;
    const rowHeight = 25;
    const totalHeight = headerHeight + entity.attributes.length * rowHeight;

    const colors = this.getColorScheme(opts.colorScheme);
    const entityColor = entity.color || colors.entity;

    return `
    <g class="entity" transform="translate(${pos.x}, ${pos.y})">
      <!-- Entity box -->
      <rect 
        width="${width}" 
        height="${totalHeight}" 
        fill="white" 
        stroke="${entityColor}" 
        stroke-width="2" 
        rx="3"
        filter="url(#shadow)"
      />
      
      <!-- Header -->
      <rect 
        width="${width}" 
        height="${headerHeight}" 
        fill="${entityColor}" 
        rx="3"
      />
      <text 
        x="${width / 2}" 
        y="${headerHeight / 2 + 5}" 
        class="entity-name"
        text-anchor="middle"
        fill="white"
        font-weight="bold"
        font-size="${opts.fontSize + 2}"
      >
        ${entity.name}
      </text>

      <!-- Separator line -->
      <line 
        x1="0" 
        y1="${headerHeight}" 
        x2="${width}" 
        y2="${headerHeight}" 
        stroke="${entityColor}" 
        stroke-width="2"
      />

      <!-- Attributes -->
      ${entity.attributes
        .map(
          (attr, i) => `
        <g class="attribute" transform="translate(0, ${headerHeight + i * rowHeight})">
          <!-- Attribute row -->
          <rect 
            width="${width}" 
            height="${rowHeight}" 
            fill="${i % 2 === 0 ? 'white' : '#F8F8F8'}" 
          />
          
          <!-- Primary Key indicator -->
          ${
            attr.isPrimaryKey
              ? `
          <circle cx="15" cy="${rowHeight / 2}" r="4" fill="${colors.primaryKey}" />
          <text x="15" y="${rowHeight / 2 + 4}" 
                font-size="8" font-weight="bold" 
                text-anchor="middle" fill="white">PK</text>
          `
              : ''
          }
          
          <!-- Foreign Key indicator -->
          ${
            attr.isForeignKey
              ? `
          <rect x="10" y="${rowHeight / 2 - 5}" width="10" height="10" 
                fill="${colors.foreignKey}" rx="1" />
          <text x="15" y="${rowHeight / 2 + 4}" 
                font-size="8" font-weight="bold" 
                text-anchor="middle" fill="white">FK</text>
          `
              : ''
          }

          <!-- Attribute name -->
          <text 
            x="${attr.isPrimaryKey || attr.isForeignKey ? 30 : 15}" 
            y="${rowHeight / 2 + 5}" 
            font-size="${opts.fontSize}"
            font-weight="${attr.isPrimaryKey ? 'bold' : 'normal'}"
          >
            ${attr.name}
          </text>

          <!-- Data type -->
          ${
            opts.showDataTypes
              ? `
          <text 
            x="${width - 15}" 
            y="${rowHeight / 2 + 5}" 
            font-size="${opts.fontSize - 1}"
            text-anchor="end"
            fill="#666"
          >
            ${attr.type}${attr.nullable ? ' (NULL)' : ''}
          </text>
          `
              : ''
          }
        </g>
        `
        )
        .join('\n')}
    </g>`;
  }

  /**
   * Render relationship line
   */
  private renderRelationship(
    rel: Relationship,
    entities: Entity[],
    opts: ERDiagramOptions
  ): string {
    const fromEntity = entities.find((e) => e.name === rel.from.entity);
    const toEntity = entities.find((e) => e.name === rel.to.entity);

    if (!fromEntity || !toEntity) return '';

    const from = this.getConnectionPoint(fromEntity, toEntity);
    const to = this.getConnectionPoint(toEntity, fromEntity);

    const colors = this.getColorScheme(opts.colorScheme);
    const lineColor = rel.identifying ? colors.identifying : colors.nonIdentifying;
    const strokeWidth = rel.identifying ? 2.5 : 2;
    const strokeDash = rel.identifying ? 'none' : '5,5';

    // Calculate path with proper routing
    const path = this.calculatePath(from, to);

    return `
    <g class="relationship">
      <!-- Relationship line -->
      <path 
        d="${path}" 
        stroke="${lineColor}" 
        stroke-width="${strokeWidth}" 
        stroke-dasharray="${strokeDash}"
        fill="none"
        marker-end="url(#${this.getMarkerEnd(rel.to.cardinality, opts.notation)})"
        marker-start="url(#${this.getMarkerStart(rel.from.cardinality, opts.notation)})"
      />
    </g>`;
  }

  /**
   * Render relationship label
   */
  private renderRelationshipLabel(
    rel: Relationship,
    entities: Entity[],
    opts: ERDiagramOptions
  ): string {
    if (!rel.name) return '';

    const fromEntity = entities.find((e) => e.name === rel.from.entity);
    const toEntity = entities.find((e) => e.name === rel.to.entity);

    if (!fromEntity || !toEntity) return '';

    const from = this.getConnectionPoint(fromEntity, toEntity);
    const to = this.getConnectionPoint(toEntity, fromEntity);

    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    return `
    <g class="relationship-label">
      <rect 
        x="${midX - 40}" 
        y="${midY - 12}" 
        width="80" 
        height="24" 
        fill="white" 
        stroke="#666" 
        stroke-width="1"
        rx="3"
      />
      <text 
        x="${midX}" 
        y="${midY + 5}" 
        text-anchor="middle"
        font-size="${opts.fontSize - 1}"
        fill="#333"
      >
        ${rel.name}
      </text>
    </g>`;
  }

  /**
   * Calculate path between two points with proper routing
   */
  private calculatePath(
    from: { x: number; y: number },
    to: { x: number; y: number }
  ): string {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // For short distances, use straight line
    if (distance < 100) {
      return `M ${from.x},${from.y} L ${to.x},${to.y}`;
    }

    // For longer distances, use curved path (Bezier)
    const controlOffset = Math.min(distance * 0.3, 50);
    const cp1x = from.x + (dx > 0 ? controlOffset : -controlOffset);
    const cp1y = from.y;
    const cp2x = to.x - (dx > 0 ? controlOffset : -controlOffset);
    const cp2y = to.y;

    return `M ${from.x},${from.y} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${to.x},${to.y}`;
  }

  /**
   * Get connection point on entity edge
   */
  private getConnectionPoint(
    entity: Entity,
    targetEntity: Entity
  ): { x: number; y: number } {
    const pos = entity.position || { x: 0, y: 0 };
    const targetPos = targetEntity.position || { x: 0, y: 0 };
    const width = 250;
    const height = 35 + entity.attributes.length * 25;

    const centerX = pos.x + width / 2;
    const centerY = pos.y + height / 2;
    const targetCenterX = targetPos.x + 125;
    const targetCenterY = targetPos.y + (35 + targetEntity.attributes.length * 25) / 2;

    const dx = targetCenterX - centerX;
    const dy = targetCenterY - centerY;

    // Determine which edge to use
    if (Math.abs(dx) > Math.abs(dy)) {
      // Left or right edge
      if (dx > 0) {
        // Right edge
        return { x: pos.x + width, y: centerY };
      } else {
        // Left edge
        return { x: pos.x, y: centerY };
      }
    } else {
      // Top or bottom edge
      if (dy > 0) {
        // Bottom edge
        return { x: centerX, y: pos.y + height };
      } else {
        // Top edge
        return { x: centerX, y: pos.y };
      }
    }
  }

  /**
   * Get marker for relationship end (based on notation)
   */
  private getMarkerEnd(cardinality: Cardinality, notation: ERNotation): string {
    switch (notation) {
      case 'crows-foot':
        return this.getCrowsFootMarkerEnd(cardinality);
      case 'ie':
        return this.getIEMarkerEnd(cardinality);
      case 'idef1x':
        return this.getIDEF1XMarkerEnd(cardinality);
    }
  }

  /**
   * Get marker for relationship start (based on notation)
   */
  private getMarkerStart(cardinality: Cardinality, notation: ERNotation): string {
    switch (notation) {
      case 'crows-foot':
        return this.getCrowsFootMarkerStart(cardinality);
      case 'ie':
        return this.getIEMarkerStart(cardinality);
      case 'idef1x':
        return this.getIDEF1XMarkerStart(cardinality);
    }
  }

  /**
   * Crow's Foot notation markers
   */
  private getCrowsFootMarkerEnd(cardinality: Cardinality): string {
    switch (cardinality) {
      case 'exactly-one':
        return 'cf-one';
      case 'zero-or-one':
        return 'cf-zero-or-one';
      case 'one-or-many':
        return 'cf-many';
      case 'zero-or-many':
        return 'cf-zero-or-many';
    }
  }

  private getCrowsFootMarkerStart(cardinality: Cardinality): string {
    return this.getCrowsFootMarkerEnd(cardinality);
  }

  /**
   * IE notation markers
   */
  private getIEMarkerEnd(cardinality: Cardinality): string {
    switch (cardinality) {
      case 'exactly-one':
        return 'ie-one';
      case 'zero-or-one':
        return 'ie-zero-or-one';
      case 'one-or-many':
        return 'ie-many';
      case 'zero-or-many':
        return 'ie-zero-or-many';
    }
  }

  private getIEMarkerStart(cardinality: Cardinality): string {
    return this.getIEMarkerEnd(cardinality);
  }

  /**
   * IDEF1X notation markers
   */
  private getIDEF1XMarkerEnd(cardinality: Cardinality): string {
    switch (cardinality) {
      case 'exactly-one':
        return 'idef1x-one';
      case 'zero-or-one':
        return 'idef1x-zero-or-one';
      case 'one-or-many':
        return 'idef1x-many';
      case 'zero-or-many':
        return 'idef1x-zero-or-many';
    }
  }

  private getIDEF1XMarkerStart(cardinality: Cardinality): string {
    return this.getIDEF1XMarkerEnd(cardinality);
  }

  /**
   * Generate SVG defs (markers, filters, etc.)
   */
  private generateDefs(opts: ERDiagramOptions): string {
    return `
    <!-- Drop shadow -->
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
      <feOffset dx="2" dy="2" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    ${this.generateCrowsFootMarkers()}
    ${this.generateIEMarkers()}
    ${this.generateIDEF1XMarkers()}`;
  }

  /**
   * Generate Crow's Foot notation markers
   */
  private generateCrowsFootMarkers(): string {
    return `
    <!-- Crow's Foot: One -->
    <marker id="cf-one" markerWidth="20" markerHeight="20" refX="10" refY="10" orient="auto">
      <line x1="10" y1="0" x2="10" y2="20" stroke="#333" stroke-width="2"/>
    </marker>

    <!-- Crow's Foot: Zero or One -->
    <marker id="cf-zero-or-one" markerWidth="20" markerHeight="20" refX="10" refY="10" orient="auto">
      <circle cx="10" cy="10" r="5" fill="none" stroke="#333" stroke-width="2"/>
      <line x1="10" y1="0" x2="10" y2="20" stroke="#333" stroke-width="2"/>
    </marker>

    <!-- Crow's Foot: Many -->
    <marker id="cf-many" markerWidth="20" markerHeight="20" refX="10" refY="10" orient="auto">
      <path d="M 10,10 L 0,0 M 10,10 L 0,20 M 10,10 L 20,10" stroke="#333" stroke-width="2" fill="none"/>
    </marker>

    <!-- Crow's Foot: Zero or Many -->
    <marker id="cf-zero-or-many" markerWidth="30" markerHeight="20" refX="15" refY="10" orient="auto">
      <circle cx="10" cy="10" r="5" fill="none" stroke="#333" stroke-width="2"/>
      <path d="M 20,10 L 10,0 M 20,10 L 10,20 M 20,10 L 30,10" stroke="#333" stroke-width="2" fill="none"/>
    </marker>`;
  }

  /**
   * Generate IE notation markers
   */
  private generateIEMarkers(): string {
    return `
    <!-- IE: One -->
    <marker id="ie-one" markerWidth="10" markerHeight="20" refX="5" refY="10" orient="auto">
      <line x1="5" y1="0" x2="5" y2="20" stroke="#333" stroke-width="2"/>
    </marker>

    <!-- IE: Zero or One -->
    <marker id="ie-zero-or-one" markerWidth="20" markerHeight="20" refX="10" refY="10" orient="auto">
      <circle cx="5" cy="10" r="4" fill="none" stroke="#333" stroke-width="2"/>
      <line x1="15" y1="0" x2="15" y2="20" stroke="#333" stroke-width="2"/>
    </marker>

    <!-- IE: Many -->
    <marker id="ie-many" markerWidth="20" markerHeight="20" refX="10" refY="10" orient="auto">
      <text x="10" y="15" font-size="16" font-weight="bold" text-anchor="middle">N</text>
    </marker>

    <!-- IE: Zero or Many -->
    <marker id="ie-zero-or-many" markerWidth="30" markerHeight="20" refX="15" refY="10" orient="auto">
      <circle cx="5" cy="10" r="4" fill="none" stroke="#333" stroke-width="2"/>
      <text x="20" y="15" font-size="16" font-weight="bold" text-anchor="middle">N</text>
    </marker>`;
  }

  /**
   * Generate IDEF1X notation markers
   */
  private generateIDEF1XMarkers(): string {
    return `
    <!-- IDEF1X: One -->
    <marker id="idef1x-one" markerWidth="10" markerHeight="20" refX="5" refY="10" orient="auto">
      <line x1="5" y1="0" x2="5" y2="20" stroke="#333" stroke-width="2"/>
    </marker>

    <!-- IDEF1X: Zero or One -->
    <marker id="idef1x-zero-or-one" markerWidth="20" markerHeight="20" refX="10" refY="10" orient="auto">
      <circle cx="5" cy="10" r="4" fill="white" stroke="#333" stroke-width="2"/>
      <line x1="15" y1="0" x2="15" y2="20" stroke="#333" stroke-width="2"/>
    </marker>

    <!-- IDEF1X: Many -->
    <marker id="idef1x-many" markerWidth="20" markerHeight="20" refX="10" refY="10" orient="auto">
      <circle cx="10" cy="10" r="5" fill="#333"/>
    </marker>

    <!-- IDEF1X: Zero or Many -->
    <marker id="idef1x-zero-or-many" markerWidth="30" markerHeight="20" refX="15" refY="10" orient="auto">
      <circle cx="5" cy="10" r="4" fill="white" stroke="#333" stroke-width="2"/>
      <circle cx="20" cy="10" r="5" fill="#333"/>
    </marker>`;
  }

  /**
   * Generate CSS styles
   */
  private generateStyles(opts: ERDiagramOptions): string {
    return `
    .entity-name {
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    .attribute {
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    text {
      font-family: 'Segoe UI', Arial, sans-serif;
    }`;
  }

  /**
   * Get color scheme
   */
  private getColorScheme(scheme: string) {
    const schemes = {
      erwin: {
        entity: '#4A90E2',
        primaryKey: '#E74C3C',
        foreignKey: '#F39C12',
        identifying: '#2C3E50',
        nonIdentifying: '#95A5A6',
      },
      modern: {
        entity: '#0078D4',
        primaryKey: '#D83B01',
        foreignKey: '#FFB900',
        identifying: '#107C10',
        nonIdentifying: '#767676',
      },
      grayscale: {
        entity: '#666666',
        primaryKey: '#333333',
        foreignKey: '#999999',
        identifying: '#000000',
        nonIdentifying: '#CCCCCC',
      },
    };

    return schemes[scheme] || schemes.erwin;
  }

  /**
   * Auto-layout entities
   */
  private autoLayout(
    entities: Entity[],
    relationships: Relationship[],
    layout: 'hierarchical' | 'organic' | 'grid'
  ): void {
    switch (layout) {
      case 'hierarchical':
        this.hierarchicalLayout(entities, relationships);
        break;
      case 'grid':
        this.gridLayout(entities);
        break;
      case 'organic':
        this.organicLayout(entities, relationships);
        break;
    }
  }

  /**
   * Hierarchical layout
   */
  private hierarchicalLayout(entities: Entity[], relationships: Relationship[]): void {
    const levels: Entity[][] = [];
    const visited = new Set<string>();

    // Find root entities (no incoming relationships)
    const roots = entities.filter((e) => {
      return !relationships.some((r) => r.to.entity === e.name);
    });

    if (roots.length === 0) {
      // No clear roots, use first entity
      roots.push(entities[0]);
    }

    // BFS to assign levels
    let currentLevel = roots;
    while (currentLevel.length > 0) {
      levels.push(currentLevel);
      currentLevel.forEach((e) => visited.add(e.name));

      const nextLevel: Entity[] = [];
      currentLevel.forEach((entity) => {
        const children = relationships
          .filter((r) => r.from.entity === entity.name)
          .map((r) => entities.find((e) => e.name === r.to.entity))
          .filter((e): e is Entity => e !== undefined && !visited.has(e.name));

        nextLevel.push(...children);
      });

      currentLevel = nextLevel;
    }

    // Position entities
    const horizontalSpacing = 350;
    const verticalSpacing = 200;

    levels.forEach((level, levelIndex) => {
      level.forEach((entity, entityIndex) => {
        const totalWidth = (level.length - 1) * horizontalSpacing;
        const startX = 50 - totalWidth / 2;

        entity.position = {
          x: startX + entityIndex * horizontalSpacing + levelIndex * 100,
          y: 50 + levelIndex * verticalSpacing,
        };
      });
    });
  }

  /**
   * Grid layout
   */
  private gridLayout(entities: Entity[]): void {
    const cols = Math.ceil(Math.sqrt(entities.length));
    const horizontalSpacing = 350;
    const verticalSpacing = 200;

    entities.forEach((entity, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      entity.position = {
        x: 50 + col * horizontalSpacing,
        y: 50 + row * verticalSpacing,
      };
    });
  }

  /**
   * Organic layout (force-directed)
   */
  private organicLayout(entities: Entity[], relationships: Relationship[]): void {
    // Simple force-directed layout
    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    entities.forEach((entity, index) => {
      const angle = (index / entities.length) * 2 * Math.PI;
      entity.position = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
  }

  /**
   * Calculate diagram width
   */
  private calculateWidth(entities: Entity[]): number {
    const maxX = Math.max(...entities.map((e) => (e.position?.x || 0) + 250));
    return maxX + 50;
  }

  /**
   * Calculate diagram height
   */
  private calculateHeight(entities: Entity[]): number {
    const maxY = Math.max(
      ...entities.map((e) => (e.position?.y || 0) + 35 + e.attributes.length * 25)
    );
    return maxY + 50;
  }
}

/**
 * Export helper function
 */
export function createERDiagram(
  entities: Entity[],
  relationships: Relationship[],
  options?: Partial<ERDiagramOptions>
): string {
  const generator = new ERwinDiagramGenerator();
  return generator.generate(entities, relationships, options);
}
