/**
 * Microsoft Fabric Architecture Diagram Generator
 * Creates professional architecture diagrams with official Fabric icons
 */

import { Icon, IconManager } from '../icons/icon-manager.js';

export type FabricComponentType =
  | 'lakehouse'
  | 'warehouse'
  | 'sql-database'
  | 'kql-database'
  | 'pipeline'
  | 'dataflow'
  | 'eventstream'
  | 'notebook'
  | 'spark-job'
  | 'environment'
  | 'report'
  | 'dashboard'
  | 'semantic-model'
  | 'ml-model'
  | 'experiment'
  | 'workspace'
  | 'capacity'
  | 'gateway';

export type ConnectionType = 'data-flow' | 'api-call' | 'event-stream' | 'reference' | 'trigger';

export interface FabricComponent {
  id: string;
  type: FabricComponentType;
  name: string;
  description?: string;
  position?: { x: number; y: number };
  metadata?: {
    size?: string;
    region?: string;
    sku?: string;
    [key: string]: any;
  };
}

export interface FabricConnection {
  id: string;
  from: string; // Component ID
  to: string; // Component ID
  type: ConnectionType;
  label?: string;
  bidirectional?: boolean;
  metadata?: {
    frequency?: string;
    volume?: string;
    protocol?: string;
    [key: string]: any;
  };
}

export interface FabricZone {
  id: string;
  name: string;
  components: string[]; // Component IDs
  color?: string;
  description?: string;
}

export interface FabricDiagramOptions {
  title?: string;
  description?: string;
  showLegend: boolean;
  showMetadata: boolean;
  layout: 'hierarchical' | 'layered' | 'organic' | 'zones';
  style: 'professional' | 'minimal' | 'detailed';
  colorScheme: 'fabric' | 'azure' | 'grayscale';
  iconSize: number;
  spacing: number;
  showDataFlow: boolean;
}

export class FabricArchitectureDiagramGenerator {
  private iconManager: IconManager;

  private readonly DEFAULT_OPTIONS: FabricDiagramOptions = {
    showLegend: true,
    showMetadata: true,
    layout: 'hierarchical',
    style: 'professional',
    colorScheme: 'fabric',
    iconSize: 80,
    spacing: 150,
    showDataFlow: true,
  };

  private readonly FABRIC_COLORS = {
    lakehouse: '#00B7C3',
    warehouse: '#0078D4',
    'sql-database': '#0078D4',
    'kql-database': '#00BCF2',
    pipeline: '#FF8C00',
    dataflow: '#742774',
    eventstream: '#1C93D2',
    notebook: '#7B68EE',
    'spark-job': '#E25A00',
    environment: '#7B68EE',
    report: '#F2C811',
    dashboard: '#FFB900',
    'semantic-model': '#00BCF2',
    'ml-model': '#0078D4',
    experiment: '#742774',
    workspace: '#464FEB',
    capacity: '#0078D4',
    gateway: '#00BCF2',
  };

  constructor(iconManager: IconManager) {
    this.iconManager = iconManager;
  }

  /**
   * Generate Fabric architecture diagram
   */
  async generate(
    components: FabricComponent[],
    connections: FabricConnection[],
    zones?: FabricZone[],
    options?: Partial<FabricDiagramOptions>
  ): Promise<{ svg: string; usedIcons: string[] }> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    // Auto-layout if positions not provided
    if (components.some((c) => !c.position)) {
      this.autoLayout(components, connections, zones, opts.layout);
    }

    const width = this.calculateWidth(components, opts);
    const height = this.calculateHeight(components, opts);

    // Track used icons for legend
    const usedIcons = [...new Set(components.map((c) => c.type))];

    const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${this.generateDefs()}
  </defs>

  <style>
    ${this.generateStyles(opts)}
  </style>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#FAFAFA"/>

  <!-- Title -->
  ${
    opts.title
      ? `
  <text x="${width / 2}" y="30" class="diagram-title" text-anchor="middle">
    ${opts.title}
  </text>
  ${
    opts.description
      ? `
  <text x="${width / 2}" y="55" class="diagram-description" text-anchor="middle">
    ${opts.description}
  </text>`
      : ''
  }
  `
      : ''
  }

  <!-- Zones (if provided) -->
  ${zones ? zones.map((zone) => this.renderZone(zone, components, opts)).join('\n') : ''}

  <!-- Connections -->
  <g id="connections">
    ${connections.map((conn) => this.renderConnection(conn, components, opts)).join('\n')}
  </g>

  <!-- Components -->
  <g id="components">
    ${await Promise.all(components.map((comp) => this.renderComponent(comp, opts)))}
  </g>

  <!-- Legend -->
  ${opts.showLegend ? await this.renderLegend(usedIcons, width, height, opts) : ''}
</svg>`;

    return { svg, usedIcons };
  }

  /**
   * Render a Fabric component with icon
   */
  private async renderComponent(
    component: FabricComponent,
    opts: FabricDiagramOptions
  ): Promise<string> {
    const pos = component.position || { x: 0, y: 0 };
    const iconSize = opts.iconSize;
    const boxWidth = iconSize + 40;
    const boxHeight = iconSize + 60;

    const color = this.FABRIC_COLORS[component.type];

    // Get icon from icon manager
    const icon = await this.iconManager.getIcon('fabric', component.type);
    const iconSvg = icon?.svg || this.getPlaceholderIcon(component.type, iconSize);

    return `
    <g class="fabric-component" transform="translate(${pos.x}, ${pos.y})">
      <!-- Component container -->
      <rect 
        width="${boxWidth}" 
        height="${boxHeight}" 
        fill="white" 
        stroke="${color}" 
        stroke-width="2" 
        rx="8"
        filter="url(#component-shadow)"
      />

      <!-- Icon -->
      <g transform="translate(20, 20)">
        ${iconSvg}
      </g>

      <!-- Component name -->
      <text 
        x="${boxWidth / 2}" 
        y="${iconSize + 35}" 
        class="component-name"
        text-anchor="middle"
        fill="${color}"
      >
        ${component.name}
      </text>

      <!-- Metadata (if enabled) -->
      ${
        opts.showMetadata && component.metadata
          ? `
      <text 
        x="${boxWidth / 2}" 
        y="${iconSize + 52}" 
        class="component-metadata"
        text-anchor="middle"
      >
        ${this.formatMetadata(component.metadata)}
      </text>
      `
          : ''
      }
    </g>`;
  }

  /**
   * Render connection between components
   */
  private renderConnection(
    connection: FabricConnection,
    components: FabricComponent[],
    opts: FabricDiagramOptions
  ): string {
    const fromComp = components.find((c) => c.id === connection.from);
    const toComp = components.find((c) => c.id === connection.to);

    if (!fromComp || !toComp) return '';

    const from = this.getConnectionPoint(fromComp, toComp, opts);
    const to = this.getConnectionPoint(toComp, fromComp, opts);

    const connectionStyles = this.getConnectionStyle(connection.type);
    const path = this.calculateConnectionPath(from, to, connection.bidirectional);

    return `
    <g class="fabric-connection">
      <!-- Connection line -->
      <path 
        d="${path}" 
        stroke="${connectionStyles.color}" 
        stroke-width="${connectionStyles.width}" 
        stroke-dasharray="${connectionStyles.dashArray}"
        fill="none"
        marker-end="${connection.bidirectional ? '' : `url(#arrow-${connection.type})`}"
        ${connection.bidirectional ? `marker-start="url(#arrow-${connection.type})"` : ''}
      />

      <!-- Connection label -->
      ${
        connection.label
          ? `
      <g class="connection-label">
        <rect 
          x="${(from.x + to.x) / 2 - 40}" 
          y="${(from.y + to.y) / 2 - 12}" 
          width="80" 
          height="24" 
          fill="white" 
          stroke="${connectionStyles.color}" 
          stroke-width="1"
          rx="3"
        />
        <text 
          x="${(from.x + to.x) / 2}" 
          y="${(from.y + to.y) / 2 + 5}" 
          class="connection-label-text"
          text-anchor="middle"
        >
          ${connection.label}
        </text>
      </g>
      `
          : ''
      }

      <!-- Data flow animation -->
      ${
        opts.showDataFlow && connection.type === 'data-flow'
          ? `
      <circle r="4" fill="${connectionStyles.color}">
        <animateMotion dur="3s" repeatCount="indefinite">
          <mpath href="#${path}"/>
        </animateMotion>
      </circle>
      `
          : ''
      }
    </g>`;
  }

  /**
   * Render zone (grouping of components)
   */
  private renderZone(
    zone: FabricZone,
    components: FabricComponent[],
    opts: FabricDiagramOptions
  ): string {
    const zoneComponents = components.filter((c) => zone.components.includes(c.id));

    if (zoneComponents.length === 0) return '';

    // Calculate zone bounds
    const padding = 30;
    const minX = Math.min(...zoneComponents.map((c) => c.position!.x)) - padding;
    const minY = Math.min(...zoneComponents.map((c) => c.position!.y)) - padding;
    const maxX =
      Math.max(...zoneComponents.map((c) => c.position!.x + opts.iconSize + 40)) + padding;
    const maxY =
      Math.max(...zoneComponents.map((c) => c.position!.y + opts.iconSize + 60)) + padding;

    const width = maxX - minX;
    const height = maxY - minY;
    const color = zone.color || '#E0E0E0';

    return `
    <g class="fabric-zone">
      <!-- Zone background -->
      <rect 
        x="${minX}" 
        y="${minY}" 
        width="${width}" 
        height="${height}" 
        fill="${color}" 
        opacity="0.1"
        stroke="${color}" 
        stroke-width="2" 
        stroke-dasharray="5,5"
        rx="10"
      />

      <!-- Zone label -->
      <text 
        x="${minX + 10}" 
        y="${minY - 10}" 
        class="zone-label"
        fill="${color}"
        font-weight="bold"
      >
        ${zone.name}
      </text>

      <!-- Zone description -->
      ${
        zone.description
          ? `
      <text 
        x="${minX + 10}" 
        y="${minY + height - 10}" 
        class="zone-description"
        fill="${color}"
      >
        ${zone.description}
      </text>
      `
          : ''
      }
    </g>`;
  }

  /**
   * Render legend
   */
  private async renderLegend(
    usedIcons: string[],
    width: number,
    height: number,
    opts: FabricDiagramOptions
  ): Promise<string> {
    const legendX = width - 280;
    const legendY = 80;
    const iconSize = 32;
    const rowHeight = 45;
    const legendHeight = usedIcons.length * rowHeight + 40;

    return `
    <g class="legend">
      <!-- Legend background -->
      <rect 
        x="${legendX}" 
        y="${legendY}" 
        width="260" 
        height="${legendHeight}" 
        fill="white" 
        stroke="#CCC" 
        stroke-width="1"
        rx="5"
        filter="url(#component-shadow)"
      />

      <!-- Legend title -->
      <text 
        x="${legendX + 10}" 
        y="${legendY + 25}" 
        class="legend-title"
        font-weight="bold"
      >
        Components
      </text>

      <!-- Legend items -->
      ${usedIcons
        .map(
          (iconType, i) => `
      <g transform="translate(${legendX + 10}, ${legendY + 40 + i * rowHeight})">
        ${this.getPlaceholderIcon(iconType, iconSize)}
        <text x="${iconSize + 10}" y="${iconSize / 2 + 5}" class="legend-item-text">
          ${this.getComponentDisplayName(iconType)}
        </text>
      </g>
      `
        )
        .join('\n')}
    </g>`;
  }

  /**
   * Get connection style based on type
   */
  private getConnectionStyle(type: ConnectionType): {
    color: string;
    width: number;
    dashArray: string;
  } {
    const styles = {
      'data-flow': { color: '#0078D4', width: 3, dashArray: 'none' },
      'api-call': { color: '#107C10', width: 2, dashArray: '5,5' },
      'event-stream': { color: '#FF8C00', width: 3, dashArray: 'none' },
      reference: { color: '#666666', width: 1.5, dashArray: '3,3' },
      trigger: { color: '#E74856', width: 2, dashArray: '8,4' },
    };

    return styles[type] || styles['data-flow'];
  }

  /**
   * Calculate connection path
   */
  private calculateConnectionPath(
    from: { x: number; y: number },
    to: { x: number; y: number },
    bidirectional?: boolean
  ): string {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Use curved path for better aesthetics
    if (distance < 150) {
      return `M ${from.x},${from.y} L ${to.x},${to.y}`;
    }

    const controlOffset = Math.min(distance * 0.25, 80);
    const angle = Math.atan2(dy, dx);
    const perpAngle = angle + Math.PI / 2;

    const cp1x = from.x + Math.cos(angle) * controlOffset;
    const cp1y = from.y + Math.sin(angle) * controlOffset;
    const cp2x = to.x - Math.cos(angle) * controlOffset;
    const cp2y = to.y - Math.sin(angle) * controlOffset;

    return `M ${from.x},${from.y} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${to.x},${to.y}`;
  }

  /**
   * Get connection point on component edge
   */
  private getConnectionPoint(
    component: FabricComponent,
    targetComponent: FabricComponent,
    opts: FabricDiagramOptions
  ): { x: number; y: number } {
    const pos = component.position || { x: 0, y: 0 };
    const targetPos = targetComponent.position || { x: 0, y: 0 };
    const boxWidth = opts.iconSize + 40;
    const boxHeight = opts.iconSize + 60;

    const centerX = pos.x + boxWidth / 2;
    const centerY = pos.y + boxHeight / 2;
    const targetCenterX = targetPos.x + boxWidth / 2;
    const targetCenterY = targetPos.y + boxHeight / 2;

    const dx = targetCenterX - centerX;
    const dy = targetCenterY - centerY;

    // Determine which edge to connect
    if (Math.abs(dx) > Math.abs(dy)) {
      // Left or right edge
      return {
        x: dx > 0 ? pos.x + boxWidth : pos.x,
        y: centerY,
      };
    } else {
      // Top or bottom edge
      return {
        x: centerX,
        y: dy > 0 ? pos.y + boxHeight : pos.y,
      };
    }
  }

  /**
   * Auto-layout components
   */
  private autoLayout(
    components: FabricComponent[],
    connections: FabricConnection[],
    zones?: FabricZone[],
    layout: string
  ): void {
    switch (layout) {
      case 'hierarchical':
        this.hierarchicalLayout(components, connections);
        break;
      case 'layered':
        this.layeredLayout(components, connections);
        break;
      case 'zones':
        this.zonesLayout(components, zones || []);
        break;
      case 'organic':
        this.organicLayout(components, connections);
        break;
    }
  }

  /**
   * Hierarchical layout (data sources → processing → outputs)
   */
  private hierarchicalLayout(
    components: FabricComponent[],
    connections: FabricConnection[]
  ): void {
    const layers: FabricComponent[][] = [];
    const visited = new Set<string>();

    // Categorize components by layer
    const sources = components.filter(
      (c) =>
        ['lakehouse', 'sql-database', 'kql-database', 'gateway'].includes(c.type) &&
        !connections.some((conn) => conn.to === c.id)
    );

    const processing = components.filter((c) =>
      ['pipeline', 'dataflow', 'notebook', 'spark-job'].includes(c.type)
    );

    const outputs = components.filter((c) =>
      ['warehouse', 'report', 'dashboard', 'semantic-model'].includes(c.type)
    );

    const others = components.filter(
      (c) => ![...sources, ...processing, ...outputs].includes(c)
    );

    layers.push(sources);
    layers.push(processing);
    layers.push(outputs);
    if (others.length > 0) layers.push(others);

    // Position components
    const horizontalSpacing = 180;
    const verticalSpacing = 200;

    layers.forEach((layer, layerIndex) => {
      layer.forEach((component, componentIndex) => {
        const totalWidth = (layer.length - 1) * horizontalSpacing;
        const startX = 100;

        component.position = {
          x: startX + componentIndex * horizontalSpacing,
          y: 100 + layerIndex * verticalSpacing,
        };
      });
    });
  }

  /**
   * Layered layout (by component type)
   */
  private layeredLayout(
    components: FabricComponent[],
    connections: FabricConnection[]
  ): void {
    // Similar to hierarchical but with fixed layers
    this.hierarchicalLayout(components, connections);
  }

  /**
   * Zones layout (group by zones)
   */
  private zonesLayout(components: FabricComponent[], zones: FabricZone[]): void {
    const horizontalSpacing = 180;
    const verticalSpacing = 150;
    const zoneSpacing = 300;

    let currentX = 100;

    zones.forEach((zone) => {
      const zoneComponents = components.filter((c) => zone.components.includes(c.id));

      zoneComponents.forEach((component, index) => {
        component.position = {
          x: currentX,
          y: 100 + index * verticalSpacing,
        };
      });

      currentX += zoneSpacing;
    });

    // Handle components not in zones
    const unzoned = components.filter(
      (c) => !zones.some((z) => z.components.includes(c.id))
    );
    unzoned.forEach((component, index) => {
      component.position = {
        x: currentX,
        y: 100 + index * verticalSpacing,
      };
    });
  }

  /**
   * Organic layout (force-directed)
   */
  private organicLayout(
    components: FabricComponent[],
    connections: FabricConnection[]
  ): void {
    const centerX = 500;
    const centerY = 400;
    const radius = 250;

    components.forEach((component, index) => {
      const angle = (index / components.length) * 2 * Math.PI;
      component.position = {
        x: centerX + radius * Math.cos(angle) - 60,
        y: centerY + radius * Math.sin(angle) - 60,
      };
    });
  }

  /**
   * Generate SVG defs
   */
  private generateDefs(): string {
    return `
    <!-- Drop shadow for components -->
    <filter id="component-shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="2" dy="2" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.2"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Arrow markers for connections -->
    <marker id="arrow-data-flow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#0078D4"/>
    </marker>

    <marker id="arrow-api-call" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#107C10"/>
    </marker>

    <marker id="arrow-event-stream" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#FF8C00"/>
    </marker>

    <marker id="arrow-reference" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#666666"/>
    </marker>

    <marker id="arrow-trigger" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#E74856"/>
    </marker>`;
  }

  /**
   * Generate CSS styles
   */
  private generateStyles(opts: FabricDiagramOptions): string {
    return `
    .diagram-title {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 24px;
      font-weight: bold;
      fill: #333;
    }
    .diagram-description {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      fill: #666;
    }
    .component-name {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      font-weight: 600;
    }
    .component-metadata {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 10px;
      fill: #999;
    }
    .connection-label-text {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
      fill: #333;
    }
    .zone-label {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 16px;
    }
    .zone-description {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
    }
    .legend-title {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
    }
    .legend-item-text {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      fill: #333;
    }`;
  }

  /**
   * Get placeholder icon (simple SVG)
   */
  private getPlaceholderIcon(type: string, size: number): string {
    const color = this.FABRIC_COLORS[type] || '#666666';
    return `<rect width="${size}" height="${size}" fill="${color}" opacity="0.3" rx="8"/>`;
  }

  /**
   * Get display name for component type
   */
  private getComponentDisplayName(type: string): string {
    const names = {
      lakehouse: 'Lakehouse',
      warehouse: 'Warehouse',
      'sql-database': 'SQL Database',
      'kql-database': 'KQL Database',
      pipeline: 'Data Pipeline',
      dataflow: 'Dataflow Gen2',
      eventstream: 'Eventstream',
      notebook: 'Notebook',
      'spark-job': 'Spark Job',
      environment: 'Environment',
      report: 'Power BI Report',
      dashboard: 'Dashboard',
      'semantic-model': 'Semantic Model',
      'ml-model': 'ML Model',
      experiment: 'Experiment',
      workspace: 'Workspace',
      capacity: 'Capacity',
      gateway: 'Gateway',
    };

    return names[type] || type;
  }

  /**
   * Format metadata for display
   */
  private formatMetadata(metadata: any): string {
    const parts: string[] = [];

    if (metadata.size) parts.push(metadata.size);
    if (metadata.region) parts.push(metadata.region);
    if (metadata.sku) parts.push(metadata.sku);

    return parts.join(' • ');
  }

  /**
   * Calculate diagram width
   */
  private calculateWidth(components: FabricComponent[], opts: FabricDiagramOptions): number {
    const maxX = Math.max(...components.map((c) => (c.position?.x || 0) + opts.iconSize + 40));
    return maxX + 350; // Extra space for legend
  }

  /**
   * Calculate diagram height
   */
  private calculateHeight(components: FabricComponent[], opts: FabricDiagramOptions): number {
    const maxY = Math.max(...components.map((c) => (c.position?.y || 0) + opts.iconSize + 60));
    return Math.max(maxY + 100, 600); // Minimum height
  }
}
