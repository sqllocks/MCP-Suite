/**
 * BPMN Process Flow & Data Lineage Diagram Generators
 */

// ============================================================================
// BPMN PROCESS FLOW GENERATOR
// ============================================================================

export type BPMNElementType = 
  | 'start-event' | 'end-event' | 'task' | 'user-task' | 'service-task'
  | 'gateway-exclusive' | 'gateway-parallel' | 'gateway-inclusive'
  | 'subprocess' | 'data-object' | 'message' | 'timer';

export interface BPMNElement {
  id: string;
  type: BPMNElementType;
  name: string;
  lane?: string;
  position?: { x: number; y: number };
}

export interface BPMNFlow {
  from: string;
  to: string;
  label?: string;
  condition?: string;
}

export interface BPMNLane {
  id: string;
  name: string;
  elements: string[];
}

export class BPMNDiagramGenerator {
  generate(elements: BPMNElement[], flows: BPMNFlow[], lanes?: BPMNLane[]): string {
    if (elements.some(e => !e.position)) {
      this.autoLayout(elements, flows, lanes);
    }

    const width = this.calculateWidth(elements);
    const height = lanes ? lanes.length * 200 + 200 : 800;

    return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>${this.generateDefs()}</defs>
  <style>${this.generateStyles()}</style>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#FAFAFA"/>

  <!-- Lanes/Swimlanes -->
  ${lanes ? this.renderLanes(lanes, width) : ''}

  <!-- Flows -->
  <g id="flows">
    ${flows.map(f => this.renderFlow(f, elements)).join('\n')}
  </g>

  <!-- Elements -->
  <g id="elements">
    ${elements.map(e => this.renderElement(e)).join('\n')}
  </g>
</svg>`;
  }

  private renderElement(element: BPMNElement): string {
    const pos = element.position || { x: 0, y: 0 };
    const shapes: Record<BPMNElementType, string> = {
      'start-event': `<circle cx="${pos.x}" cy="${pos.y}" r="20" fill="#00C853" stroke="#00A142" stroke-width="3"/>`,
      
      'end-event': `<circle cx="${pos.x}" cy="${pos.y}" r="20" fill="#E74856" stroke="#C4384F" stroke-width="4"/>`,
      
      'task': `<rect x="${pos.x - 60}" y="${pos.y - 30}" width="120" height="60" fill="#1168BD" stroke="#0E5299" stroke-width="2" rx="8"/>`,
      
      'user-task': `<rect x="${pos.x - 60}" y="${pos.y - 30}" width="120" height="60" fill="#0078D4" stroke="#005A9E" stroke-width="2" rx="8"/>
                   <path d="M ${pos.x - 50},${pos.y - 20} m 0,5 a 5,5 0 1,0 0,-10 a 5,5 0 1,0 0,10 m -7,3 l 14,0 l 0,10 l -14,0 z" fill="white"/>`,
      
      'service-task': `<rect x="${pos.x - 60}" y="${pos.y - 30}" width="120" height="60" fill="#742774" stroke="#5B1F5B" stroke-width="2" rx="8"/>
                      <path d="M ${pos.x - 45},${pos.y} m 5,-10 l 0,20 m 5,-15 l 0,10" stroke="white" stroke-width="2"/>`,
      
      'gateway-exclusive': `<path d="M ${pos.x},${pos.y - 30} L ${pos.x + 30},${pos.y} L ${pos.x},${pos.y + 30} L ${pos.x - 30},${pos.y} Z" 
                                 fill="#FFB900" stroke="#CC9300" stroke-width="3"/>
                           <text x="${pos.x}" y="${pos.y + 10}" font-size="32" font-weight="bold" text-anchor="middle">×</text>`,
      
      'gateway-parallel': `<path d="M ${pos.x},${pos.y - 30} L ${pos.x + 30},${pos.y} L ${pos.x},${pos.y + 30} L ${pos.x - 30},${pos.y} Z" 
                                fill="#00BCF2" stroke="#0099CC" stroke-width="3"/>
                          <text x="${pos.x}" y="${pos.y + 10}" font-size="32" font-weight="bold" text-anchor="middle">+</text>`,
      
      'gateway-inclusive': `<path d="M ${pos.x},${pos.y - 30} L ${pos.x + 30},${pos.y} L ${pos.x},${pos.y + 30} L ${pos.x - 30},${pos.y} Z" 
                                 fill="#107C10" stroke="#0C5E0C" stroke-width="3"/>
                           <circle cx="${pos.x}" cy="${pos.y}" r="8" fill="none" stroke="white" stroke-width="2"/>`,
      
      'subprocess': `<rect x="${pos.x - 70}" y="${pos.y - 40}" width="140" height="80" fill="#6264A7" stroke="#4E4F8B" stroke-width="2" rx="8"/>
                    <rect x="${pos.x - 5}" y="${pos.y + 25}" width="10" height="2" fill="white"/>
                    <rect x="${pos.x - 1}" y="${pos.y + 21}" width="2" height="10" fill="white"/>`,
      
      'data-object': `<path d="M ${pos.x - 20},${pos.y - 25} L ${pos.x + 20},${pos.y - 25} L ${pos.x + 20},${pos.y + 25} L ${pos.x - 20},${pos.y + 25} Z 
                           M ${pos.x + 20},${pos.y - 25} L ${pos.x + 25},${pos.y - 20} L ${pos.x + 25},${pos.y + 30} L ${pos.x + 20},${pos.y + 25}"
                          fill="#F0F0F0" stroke="#999" stroke-width="2"/>`,
      
      'message': `<polygon points="${pos.x - 30},${pos.y - 15} ${pos.x + 30},${pos.y - 15} ${pos.x + 30},${pos.y + 15} ${pos.x - 30},${pos.y + 15}" 
                         fill="#00B7C3" stroke="#008C96" stroke-width="2"/>
                 <polyline points="${pos.x - 30},${pos.y - 15} ${pos.x},${pos.y + 5} ${pos.x + 30},${pos.y - 15}" 
                         fill="none" stroke="#008C96" stroke-width="2"/>`,
      
      'timer': `<circle cx="${pos.x}" cy="${pos.y}" r="15" fill="none" stroke="#FF8C00" stroke-width="2"/>
               <path d="M ${pos.x},${pos.y - 10} L ${pos.x},${pos.y} L ${pos.x + 7},${pos.y + 7}" stroke="#FF8C00" stroke-width="2" fill="none"/>`,
    };

    return `
    <g class="bpmn-element">
      ${shapes[element.type] || shapes.task}
      <text x="${pos.x}" y="${pos.y + 50}" class="element-label" text-anchor="middle">
        ${element.name}
      </text>
    </g>`;
  }

  private renderFlow(flow: BPMNFlow, elements: BPMNElement[]): string {
    const from = elements.find(e => e.id === flow.from)?.position;
    const to = elements.find(e => e.id === flow.to)?.position;
    if (!from || !to) return '';

    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    return `
    <g class="bpmn-flow">
      <path d="M ${from.x + 60},${from.y} L ${to.x - 60},${to.y}" 
            stroke="#666" stroke-width="2" fill="none" marker-end="url(#arrow-bpmn)"/>
      ${flow.label || flow.condition ? `
      <rect x="${midX - 40}" y="${midY - 12}" width="80" height="24" fill="white" stroke="#666" rx="3"/>
      <text x="${midX}" y="${midY + 5}" class="flow-label" text-anchor="middle">
        ${flow.label || flow.condition}
      </text>` : ''}
    </g>`;
  }

  private renderLanes(lanes: BPMNLane[], width: number): string {
    const laneHeight = 200;
    return lanes.map((lane, i) => `
      <g class="bpmn-lane">
        <rect y="${100 + i * laneHeight}" width="${width}" height="${laneHeight}" 
              fill="white" stroke="#CCC" stroke-width="2"/>
        <text x="20" y="${150 + i * laneHeight}" class="lane-label" transform="rotate(-90 20 ${150 + i * laneHeight})">
          ${lane.name}
        </text>
      </g>
    `).join('\n');
  }

  private autoLayout(elements: BPMNElement[], flows: BPMNFlow[], lanes?: BPMNLane[]): void {
    let currentX = 150;
    let currentY = 200;

    elements.forEach((element, i) => {
      element.position = { x: currentX, y: currentY };
      currentX += 180;
      if (currentX > 1500) {
        currentX = 150;
        currentY += 150;
      }
    });
  }

  private calculateWidth(elements: BPMNElement[]): number {
    return Math.max(...elements.map(e => (e.position?.x || 0) + 150), 1800);
  }

  private generateDefs(): string {
    return `
    <marker id="arrow-bpmn" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#666"/>
    </marker>`;
  }

  private generateStyles(): string {
    return `
    .element-label { font: 12px 'Segoe UI'; fill: #333; }
    .flow-label { font: 11px 'Segoe UI'; fill: #666; }
    .lane-label { font: bold 14px 'Segoe UI'; fill: #666; }`;
  }
}

// ============================================================================
// DATA LINEAGE / DATA FLOW GENERATOR
// ============================================================================

export interface DataNode {
  id: string;
  name: string;
  type: 'source' | 'transformation' | 'destination' | 'quality-check';
  technology?: string;
  schema?: string[];
  position?: { x: number; y: number };
}

export interface DataFlow {
  from: string;
  to: string;
  columns?: string[];
  transformation?: string;
  volume?: string;
}

export class DataLineageGenerator {
  private readonly COLORS = {
    source: '#00B7C3',
    transformation: '#FF8C00',
    destination: '#0078D4',
    'quality-check': '#107C10',
  };

  generate(nodes: DataNode[], flows: DataFlow[]): string {
    if (nodes.some(n => !n.position)) {
      this.autoLayout(nodes, flows);
    }

    const width = this.calculateWidth(nodes);
    const height = this.calculateHeight(nodes);

    return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>${this.generateDefs()}</defs>
  <style>${this.generateStyles()}</style>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#F8F8F8"/>

  <!-- Title -->
  <text x="${width / 2}" y="40" class="lineage-title" text-anchor="middle">Data Lineage</text>

  <!-- Flows -->
  <g id="flows">
    ${flows.map(f => this.renderFlow(f, nodes)).join('\n')}
  </g>

  <!-- Nodes -->
  <g id="nodes">
    ${nodes.map(n => this.renderNode(n)).join('\n')}
  </g>
</svg>`;
  }

  private renderNode(node: DataNode): string {
    const pos = node.position || { x: 0, y: 0 };
    const width = 200;
    const height = 120;
    const color = this.COLORS[node.type];

    return `
    <g class="data-node" transform="translate(${pos.x}, ${pos.y})">
      <!-- Node container -->
      <rect width="${width}" height="${height}" fill="${color}" stroke="${this.darken(color)}" 
            stroke-width="2" rx="6" filter="url(#node-shadow)"/>
      
      <!-- Header -->
      <rect width="${width}" height="35" fill="${this.darken(color)}" rx="6 6 0 0"/>
      <text x="${width / 2}" y="23" class="node-name" text-anchor="middle" fill="white">
        ${node.name}
      </text>

      <!-- Type badge -->
      <rect y="40" width="${width}" height="20" fill="black" opacity="0.1"/>
      <text x="${width / 2}" y="54" class="node-type" text-anchor="middle" fill="white">
        ${node.type.replace('-', ' ')}
      </text>

      <!-- Schema/Details -->
      ${node.schema && node.schema.length > 0 ? `
      <foreignObject x="10" y="65" width="${width - 20}" height="50">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font: 10px 'Segoe UI'; color: white;">
          ${node.schema.slice(0, 3).map(s => `• ${s}`).join('<br/>')}
          ${node.schema.length > 3 ? `<br/>+ ${node.schema.length - 3} more` : ''}
        </div>
      </foreignObject>` : ''}

      <!-- Technology -->
      ${node.technology ? `
      <text x="${width / 2}" y="${height - 8}" class="node-tech" text-anchor="middle" fill="white">
        [${node.technology}]
      </text>` : ''}
    </g>`;
  }

  private renderFlow(flow: DataFlow, nodes: DataNode[]): string {
    const from = nodes.find(n => n.id === flow.from)?.position;
    const to = nodes.find(n => n.id === flow.to)?.position;
    if (!from || !to) return '';

    const fromX = from.x + 200;
    const fromY = from.y + 60;
    const toX = to.x;
    const toY = to.y + 60;

    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;

    return `
    <g class="data-flow">
      <path d="M ${fromX},${fromY} C ${fromX + 50},${fromY} ${toX - 50},${toY} ${toX},${toY}" 
            stroke="#0078D4" stroke-width="3" fill="none" marker-end="url(#arrow-data)"/>
      
      <!-- Flow info -->
      ${flow.columns || flow.transformation || flow.volume ? `
      <rect x="${midX - 60}" y="${midY - 25}" width="120" height="50" 
            fill="white" stroke="#0078D4" rx="4"/>
      ${flow.columns ? `
      <text x="${midX}" y="${midY - 10}" class="flow-info" text-anchor="middle">
        ${flow.columns.length} columns
      </text>` : ''}
      ${flow.transformation ? `
      <text x="${midX}" y="${midY + 5}" class="flow-info" text-anchor="middle">
        ${flow.transformation}
      </text>` : ''}
      ${flow.volume ? `
      <text x="${midX}" y="${midY + 20}" class="flow-info" text-anchor="middle">
        ${flow.volume}
      </text>` : ''}
      ` : ''}
    </g>`;
  }

  private autoLayout(nodes: DataNode[], flows: DataFlow[]): void {
    const layers: DataNode[][] = [[], [], [], []];
    
    // Layer 0: Sources
    layers[0] = nodes.filter(n => n.type === 'source');
    
    // Layer 1: Quality checks
    layers[1] = nodes.filter(n => n.type === 'quality-check');
    
    // Layer 2: Transformations
    layers[2] = nodes.filter(n => n.type === 'transformation');
    
    // Layer 3: Destinations
    layers[3] = nodes.filter(n => n.type === 'destination');

    const horizontalSpacing = 300;
    const verticalSpacing = 180;

    layers.forEach((layer, layerIndex) => {
      layer.forEach((node, nodeIndex) => {
        node.position = {
          x: 100 + layerIndex * horizontalSpacing,
          y: 100 + nodeIndex * verticalSpacing,
        };
      });
    });
  }

  private calculateWidth(nodes: DataNode[]): number {
    return Math.max(...nodes.map(n => (n.position?.x || 0) + 250), 1400);
  }

  private calculateHeight(nodes: DataNode[]): number {
    return Math.max(...nodes.map(n => (n.position?.y || 0) + 150), 800);
  }

  private darken(color: string): string {
    const num = parseInt(color.replace('#', ''), 16);
    const R = Math.max(0, (num >> 16) - 30);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - 30);
    const B = Math.max(0, (num & 0x0000FF) - 30);
    return '#' + ((R << 16) | (G << 8) | B).toString(16).padStart(6, '0');
  }

  private generateDefs(): string {
    return `
    <filter id="node-shadow">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="2" dy="2"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.25"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>

    <marker id="arrow-data" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#0078D4"/>
    </marker>`;
  }

  private generateStyles(): string {
    return `
    .lineage-title { font: bold 24px 'Segoe UI'; fill: #333; }
    .node-name { font: bold 14px 'Segoe UI'; }
    .node-type { font: italic 11px 'Segoe UI'; }
    .node-tech { font: 10px 'Segoe UI'; opacity: 0.9; }
    .flow-info { font: 11px 'Segoe UI'; fill: #0078D4; }`;
  }
}
