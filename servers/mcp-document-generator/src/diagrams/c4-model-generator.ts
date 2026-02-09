/**
 * C4 Model Diagram Generator
 * Creates Context, Container, Component, and Code level architecture diagrams
 */

export type C4Level = 'context' | 'container' | 'component' | 'code';
export type ElementType = 'person' | 'system' | 'container' | 'component' | 'class' | 'external-system';
export type RelationshipType = 'uses' | 'includes' | 'depends-on' | 'extends' | 'implements';

export interface C4Element {
  id: string;
  type: ElementType;
  name: string;
  description?: string;
  technology?: string;
  external?: boolean;
  position?: { x: number; y: number };
  tags?: string[];
}

export interface C4Relationship {
  from: string;
  to: string;
  description: string;
  technology?: string;
  type?: RelationshipType;
}

export interface C4Boundary {
  id: string;
  name: string;
  elements: string[];
  type?: 'system' | 'container' | 'enterprise';
}

export interface C4DiagramOptions {
  level: C4Level;
  title: string;
  showDescriptions: boolean;
  showTechnology: boolean;
  style: 'standard' | 'sketch' | 'minimal';
}

export class C4DiagramGenerator {
  private readonly DEFAULT_OPTIONS: C4DiagramOptions = {
    level: 'context',
    title: 'System Context Diagram',
    showDescriptions: true,
    showTechnology: true,
    style: 'standard',
  };

  private readonly COLORS = {
    person: '#08427B',
    system: '#1168BD',
    'external-system': '#999999',
    container: '#438DD5',
    component: '#85BBF0',
    class: '#A3C9E8',
  };

  generate(
    elements: C4Element[],
    relationships: C4Relationship[],
    boundaries?: C4Boundary[],
    options?: Partial<C4DiagramOptions>
  ): string {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    if (elements.some(e => !e.position)) {
      this.autoLayout(elements, relationships, boundaries, opts.level);
    }

    const width = this.calculateWidth(elements);
    const height = this.calculateHeight(elements);

    return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>${this.generateDefs()}</defs>
  <style>${this.generateStyles(opts)}</style>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#FFFFFF"/>

  <!-- Title -->
  <text x="${width / 2}" y="40" class="diagram-title" text-anchor="middle">
    ${opts.title}
  </text>
  <text x="${width / 2}" y="65" class="diagram-subtitle" text-anchor="middle">
    [${this.getLevelName(opts.level)}]
  </text>

  <!-- Boundaries -->
  ${boundaries ? boundaries.map(b => this.renderBoundary(b, elements, opts)).join('\n') : ''}

  <!-- Relationships -->
  <g id="relationships">
    ${relationships.map(r => this.renderRelationship(r, elements, opts)).join('\n')}
  </g>

  <!-- Elements -->
  <g id="elements">
    ${elements.map(e => this.renderElement(e, opts)).join('\n')}
  </g>

  <!-- Legend -->
  ${this.renderLegend(elements, width, height, opts)}
</svg>`;
  }

  private renderElement(element: C4Element, opts: C4DiagramOptions): string {
    const pos = element.position || { x: 0, y: 0 };
    const width = 200;
    const baseHeight = 100;
    const descHeight = opts.showDescriptions && element.description ? 40 : 0;
    const techHeight = opts.showTechnology && element.technology ? 25 : 0;
    const height = baseHeight + descHeight + techHeight;

    const color = element.external ? this.COLORS['external-system'] : this.COLORS[element.type];
    
    const shapes: Record<ElementType, () => string> = {
      person: () => `
        <!-- Person icon -->
        <ellipse cx="${width / 2}" cy="30" rx="20" ry="20" fill="${color}"/>
        <path d="M ${width / 2},50 L ${width / 2},85 M ${width / 2 - 20},65 L ${width / 2 + 20},65 
                 M ${width / 2},85 L ${width / 2 - 15},110 M ${width / 2},85 L ${width / 2 + 15},110"
              stroke="${color}" stroke-width="6" stroke-linecap="round"/>
        <rect y="120" width="${width}" height="${height - 120}" fill="${color}" rx="4"/>`,
      
      system: () => `
        <rect width="${width}" height="${height}" fill="${color}" rx="4"/>`,
      
      'external-system': () => `
        <rect width="${width}" height="${height}" fill="${color}" rx="4" stroke-dasharray="5,5"/>`,
      
      container: () => `
        <rect width="${width}" height="${height}" fill="${color}" rx="4"/>
        <line x1="0" y1="35" x2="${width}" y2="35" stroke="white" stroke-width="2"/>`,
      
      component: () => `
        <rect width="${width}" height="${height}" fill="${color}" rx="4"/>
        <rect x="10" y="10" width="30" height="25" fill="white" opacity="0.3" rx="2"/>`,
      
      class: () => `
        <rect width="${width}" height="${height}" fill="${color}" rx="2"/>
        <line x1="0" y1="30" x2="${width}" y2="30" stroke="white" stroke-width="1"/>
        <line x1="0" y1="${height / 2}" x2="${width}" y2="${height / 2}" stroke="white" stroke-width="1"/>`,
    };

    const shape = shapes[element.type] || shapes.system;

    return `
    <g class="c4-element" transform="translate(${pos.x}, ${pos.y})" filter="url(#element-shadow)">
      ${shape()}
      
      <!-- Name -->
      <text x="${width / 2}" y="${element.type === 'person' ? 140 : 55}" 
            class="element-name" text-anchor="middle" fill="white">
        ${element.name}
      </text>

      <!-- Type label -->
      <text x="${width / 2}" y="${element.type === 'person' ? 160 : 75}" 
            class="element-type" text-anchor="middle" fill="white" opacity="0.8">
        [${element.type.replace('-', ' ')}]
      </text>

      <!-- Description -->
      ${opts.showDescriptions && element.description ? `
      <foreignObject x="10" y="${element.type === 'person' ? 170 : 85}" 
                     width="${width - 20}" height="${descHeight - 5}">
        <div xmlns="http://www.w3.org/1999/xhtml" 
             style="font: 11px 'Segoe UI'; color: white; text-align: center; line-height: 1.4;">
          ${element.description}
        </div>
      </foreignObject>` : ''}

      <!-- Technology -->
      ${opts.showTechnology && element.technology ? `
      <rect y="${height - techHeight}" width="${width}" height="${techHeight}" 
            fill="black" opacity="0.2" rx="0 0 4 4"/>
      <text x="${width / 2}" y="${height - 8}" 
            class="element-tech" text-anchor="middle" fill="white" opacity="0.9">
        ${element.technology}
      </text>` : ''}

      <!-- External indicator -->
      ${element.external ? `
      <text x="${width - 10}" y="20" class="external-badge" text-anchor="end">External</text>
      ` : ''}
    </g>`;
  }

  private renderRelationship(
    rel: C4Relationship,
    elements: C4Element[],
    opts: C4DiagramOptions
  ): string {
    const from = elements.find(e => e.id === rel.from);
    const to = elements.find(e => e.id === rel.to);
    if (!from || !to) return '';

    const fromPos = this.getConnectionPoint(from, to);
    const toPos = this.getConnectionPoint(to, from);

    const midX = (fromPos.x + toPos.x) / 2;
    const midY = (fromPos.y + toPos.y) / 2;

    // Calculate label position offset for clarity
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const angle = Math.atan2(dy, dx);
    const offsetX = Math.sin(angle) * 30;
    const offsetY = -Math.cos(angle) * 30;

    return `
    <g class="c4-relationship">
      <!-- Relationship line -->
      <line x1="${fromPos.x}" y1="${fromPos.y}" 
            x2="${toPos.x}" y2="${toPos.y}"
            stroke="#707070" stroke-width="2" 
            marker-end="url(#arrow-gray)"/>

      <!-- Label background -->
      <rect x="${midX + offsetX - 70}" y="${midY + offsetY - 15}" 
            width="140" height="${opts.showTechnology && rel.technology ? 45 : 30}" 
            fill="white" stroke="#707070" rx="4"/>

      <!-- Description -->
      <text x="${midX + offsetX}" y="${midY + offsetY + 5}" 
            class="relationship-label" text-anchor="middle">
        ${rel.description}
      </text>

      <!-- Technology -->
      ${opts.showTechnology && rel.technology ? `
      <text x="${midX + offsetX}" y="${midY + offsetY + 22}" 
            class="relationship-tech" text-anchor="middle">
        [${rel.technology}]
      </text>` : ''}
    </g>`;
  }

  private renderBoundary(boundary: C4Boundary, elements: C4Element[], opts: C4DiagramOptions): string {
    const boundaryElements = elements.filter(e => boundary.elements.includes(e.id));
    if (boundaryElements.length === 0) return '';

    const padding = 40;
    const minX = Math.min(...boundaryElements.map(e => e.position!.x)) - padding;
    const minY = Math.min(...boundaryElements.map(e => e.position!.y)) - padding;
    const maxX = Math.max(...boundaryElements.map(e => e.position!.x + 200)) + padding;
    const maxY = Math.max(...boundaryElements.map(e => e.position!.y + 150)) + padding;

    const boundaryColors = {
      system: '#CCCCCC',
      container: '#1168BD',
      enterprise: '#999999',
    };
    const color = boundaryColors[boundary.type || 'system'];

    return `
    <g class="c4-boundary">
      <rect x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}"
            fill="none" stroke="${color}" stroke-width="2" 
            stroke-dasharray="10,5" rx="8"/>
      <rect x="${minX + 10}" y="${minY - 15}" width="auto" height="25"
            fill="white" stroke="${color}" stroke-width="1" rx="3"/>
      <text x="${minX + 20}" y="${minY}" class="boundary-label" fill="${color}">
        ${boundary.name} [${boundary.type || 'boundary'}]
      </text>
    </g>`;
  }

  private renderLegend(elements: C4Element[], width: number, height: number, opts: C4DiagramOptions): string {
    const usedTypes = [...new Set(elements.map(e => e.type))];
    const legendHeight = usedTypes.length * 35 + 50;

    return `
    <g class="legend" transform="translate(${width - 250}, ${height - legendHeight - 20})">
      <rect width="230" height="${legendHeight}" fill="white" stroke="#CCC" rx="4" filter="url(#element-shadow)"/>
      <text x="115" y="25" class="legend-title" text-anchor="middle">Legend</text>
      
      ${usedTypes.map((type, i) => {
        const color = this.COLORS[type] || this.COLORS.system;
        return `
        <rect x="15" y="${40 + i * 35}" width="30" height="25" fill="${color}" rx="2"/>
        <text x="55" y="${57 + i * 35}" class="legend-text">${type.replace('-', ' ')}</text>
        `;
      }).join('\n')}
    </g>`;
  }

  /**
   * Create System Context Diagram
   */
  createContextDiagram(data: {
    systemName: string;
    systemDescription: string;
    users: Array<{ name: string; description: string }>;
    externalSystems: Array<{ name: string; description: string }>;
    relationships: Array<{ from: string; to: string; description: string }>;
  }): string {
    const elements: C4Element[] = [
      {
        id: 'main-system',
        type: 'system',
        name: data.systemName,
        description: data.systemDescription,
      },
      ...data.users.map((user, i) => ({
        id: `user-${i}`,
        type: 'person' as ElementType,
        name: user.name,
        description: user.description,
      })),
      ...data.externalSystems.map((sys, i) => ({
        id: `ext-${i}`,
        type: 'external-system' as ElementType,
        name: sys.name,
        description: sys.description,
        external: true,
      })),
    ];

    const relationships: C4Relationship[] = data.relationships.map(r => ({
      from: r.from,
      to: r.to,
      description: r.description,
    }));

    return this.generate(elements, relationships, undefined, {
      level: 'context',
      title: `${data.systemName} - System Context`,
    });
  }

  /**
   * Create Container Diagram
   */
  createContainerDiagram(data: {
    systemName: string;
    containers: Array<{ name: string; description: string; technology: string }>;
    externalSystems?: Array<{ name: string; description: string }>;
    relationships: Array<{ from: string; to: string; description: string; technology?: string }>;
  }): string {
    const elements: C4Element[] = [
      ...data.containers.map((cont, i) => ({
        id: `container-${i}`,
        type: 'container' as ElementType,
        name: cont.name,
        description: cont.description,
        technology: cont.technology,
      })),
      ...(data.externalSystems || []).map((sys, i) => ({
        id: `ext-${i}`,
        type: 'external-system' as ElementType,
        name: sys.name,
        description: sys.description,
        external: true,
      })),
    ];

    const boundaries: C4Boundary[] = [{
      id: 'system-boundary',
      name: data.systemName,
      type: 'system',
      elements: data.containers.map((_, i) => `container-${i}`),
    }];

    return this.generate(elements, data.relationships, boundaries, {
      level: 'container',
      title: `${data.systemName} - Containers`,
    });
  }

  /**
   * Create Component Diagram
   */
  createComponentDiagram(data: {
    containerName: string;
    components: Array<{ name: string; description: string; technology: string }>;
    relationships: Array<{ from: string; to: string; description: string }>;
  }): string {
    const elements: C4Element[] = data.components.map((comp, i) => ({
      id: `component-${i}`,
      type: 'component',
      name: comp.name,
      description: comp.description,
      technology: comp.technology,
    }));

    const boundaries: C4Boundary[] = [{
      id: 'container-boundary',
      name: data.containerName,
      type: 'container',
      elements: data.components.map((_, i) => `component-${i}`),
    }];

    return this.generate(elements, data.relationships, boundaries, {
      level: 'component',
      title: `${data.containerName} - Components`,
    });
  }

  private getConnectionPoint(from: C4Element, to: C4Element): { x: number; y: number } {
    const fromPos = from.position!;
    const toPos = to.position!;
    
    const fromCenterX = fromPos.x + 100;
    const fromCenterY = fromPos.y + 75;
    const toCenterX = toPos.x + 100;
    const toCenterY = toPos.y + 75;

    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    if (Math.abs(dx) > Math.abs(dy)) {
      return { 
        x: dx > 0 ? fromPos.x + 200 : fromPos.x, 
        y: fromCenterY 
      };
    } else {
      return { 
        x: fromCenterX, 
        y: dy > 0 ? fromPos.y + 150 : fromPos.y 
      };
    }
  }

  private autoLayout(
    elements: C4Element[],
    relationships: C4Relationship[],
    boundaries: C4Boundary[] | undefined,
    level: C4Level
  ): void {
    if (level === 'context') {
      this.contextLayout(elements);
    } else {
      this.hierarchicalLayout(elements, relationships);
    }
  }

  private contextLayout(elements: C4Element[]): void {
    const centerSystem = elements.find(e => e.type === 'system');
    if (!centerSystem) return;

    centerSystem.position = { x: 500, y: 400 };

    const others = elements.filter(e => e !== centerSystem);
    const radius = 350;
    const angleStep = (2 * Math.PI) / others.length;

    others.forEach((element, i) => {
      const angle = i * angleStep;
      element.position = {
        x: 600 + radius * Math.cos(angle) - 100,
        y: 475 + radius * Math.sin(angle) - 75,
      };
    });
  }

  private hierarchicalLayout(elements: C4Element[], relationships: C4Relationship[]): void {
    const layers: C4Element[][] = [[], [], []];
    const visited = new Set<string>();

    // Simple 3-layer layout
    elements.forEach((el, i) => {
      layers[i % 3].push(el);
    });

    const horizontalSpacing = 280;
    const verticalSpacing = 250;

    layers.forEach((layer, layerIndex) => {
      layer.forEach((element, elementIndex) => {
        const totalWidth = (layer.length - 1) * horizontalSpacing;
        element.position = {
          x: 100 + elementIndex * horizontalSpacing - totalWidth / 2 + 500,
          y: 100 + layerIndex * verticalSpacing,
        };
      });
    });
  }

  private getLevelName(level: C4Level): string {
    return {
      context: 'System Context',
      container: 'Container',
      component: 'Component',
      code: 'Code',
    }[level];
  }

  private calculateWidth(elements: C4Element[]): number {
    return Math.max(...elements.map(e => (e.position?.x || 0) + 250)) + 100;
  }

  private calculateHeight(elements: C4Element[]): number {
    return Math.max(...elements.map(e => (e.position?.y || 0) + 200)) + 150;
  }

  private generateDefs(): string {
    return `
    <filter id="element-shadow">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="2" dy="2"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>

    <marker id="arrow-gray" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#707070"/>
    </marker>`;
  }

  private generateStyles(opts: C4DiagramOptions): string {
    return `
    .diagram-title { font: bold 24px 'Segoe UI'; fill: #333; }
    .diagram-subtitle { font: 14px 'Segoe UI'; fill: #666; }
    .element-name { font: bold 16px 'Segoe UI'; }
    .element-type { font: italic 12px 'Segoe UI'; }
    .element-tech { font: 11px 'Segoe UI'; }
    .external-badge { font: bold 11px 'Segoe UI'; }
    .relationship-label { font: 13px 'Segoe UI'; fill: #333; }
    .relationship-tech { font: italic 11px 'Segoe UI'; fill: #666; }
    .boundary-label { font: bold 14px 'Segoe UI'; }
    .legend-title { font: bold 14px 'Segoe UI'; }
    .legend-text { font: 12px 'Segoe UI'; fill: #333; }`;
  }
}
