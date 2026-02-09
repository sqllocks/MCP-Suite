/**
 * Data Flow Diagram Generator
 * Professional data lineage and pipeline visualizations
 */

export type DataFlowNodeType = 'source' | 'transform' | 'destination' | 'process' | 'store';

export interface DataFlowNode {
  id: string;
  name: string;
  type: DataFlowNodeType;
  metadata?: {
    recordCount?: string;
    frequency?: string;
    latency?: string;
    [key: string]: any;
  };
  position?: { x: number; y: number };
}

export interface DataFlowEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  dataType?: string;
  volume?: string;
}

export class DataFlowDiagramGenerator {
  generate(
    nodes: DataFlowNode[],
    edges: DataFlowEdge[],
    options?: {
      title?: string;
      style?: 'lineage' | 'pipeline' | 'flow';
      showMetadata?: boolean;
    }
  ): string {
    const opts = { style: 'lineage', showMetadata: true, ...options };
    
    if (nodes.some(n => !n.position)) {
      this.autoLayout(nodes, edges);
    }

    const width = 1200;
    const height = 800;

    return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>${this.generateDefs()}</defs>
  <style>${this.generateStyles()}</style>

  <rect width="${width}" height="${height}" fill="#FAFAFA"/>

  ${opts.title ? `
  <text x="${width / 2}" y="30" class="title" text-anchor="middle">${opts.title}</text>` : ''}

  <g id="edges">
    ${edges.map(e => this.renderEdge(e, nodes, opts)).join('\n')}
  </g>

  <g id="nodes">
    ${nodes.map(n => this.renderNode(n, opts)).join('\n')}
  </g>
</svg>`;
  }

  private renderNode(node: DataFlowNode, opts: any): string {
    const pos = node.position!;
    const colors = {
      source: '#00BCF2',
      transform: '#FF8C00',
      destination: '#107C10',
      process: '#7B68EE',
      store: '#0078D4',
    };
    const color = colors[node.type];

    return `
    <g transform="translate(${pos.x}, ${pos.y})">
      <rect width="150" height="80" rx="8" fill="${color}" opacity="0.2" 
            stroke="${color}" stroke-width="2" filter="url(#shadow)"/>
      <text x="75" y="35" class="node-name" text-anchor="middle">${node.name}</text>
      <text x="75" y="52" class="node-type" text-anchor="middle">${node.type}</text>
      ${opts.showMetadata && node.metadata?.recordCount ? `
      <text x="75" y="68" class="node-meta" text-anchor="middle">${node.metadata.recordCount}</text>` : ''}
    </g>`;
  }

  private renderEdge(edge: DataFlowEdge, nodes: DataFlowNode[], opts: any): string {
    const from = nodes.find(n => n.id === edge.from);
    const to = nodes.find(n => n.id === edge.to);
    if (!from || !to) return '';

    const fromX = from.position!.x + 150;
    const fromY = from.position!.y + 40;
    const toX = to.position!.x;
    const toY = to.position!.y + 40;

    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;

    return `
    <g>
      <path d="M ${fromX},${fromY} L ${toX},${toY}" 
            stroke="#0078D4" stroke-width="2" fill="none"
            marker-end="url(#arrow)"/>
      ${edge.label ? `
      <rect x="${midX - 40}" y="${midY - 12}" width="80" height="24" 
            fill="white" stroke="#0078D4" rx="3"/>
      <text x="${midX}" y="${midY + 5}" class="edge-label" text-anchor="middle">${edge.label}</text>` : ''}
    </g>`;
  }

  private autoLayout(nodes: DataFlowNode[], edges: DataFlowEdge[]): void {
    const layers = new Map<string, number>();
    const visited = new Set<string>();
    
    // Find sources
    const sources = nodes.filter(n => !edges.some(e => e.to === n.id));
    sources.forEach(n => layers.set(n.id, 0));
    
    // BFS to assign layers
    let queue = sources.map(n => n.id);
    while (queue.length > 0) {
      const current = queue.shift()!;
      visited.add(current);
      const currentLayer = layers.get(current)!;
      
      edges
        .filter(e => e.from === current)
        .forEach(e => {
          if (!layers.has(e.to)) {
            layers.set(e.to, currentLayer + 1);
            queue.push(e.to);
          }
        });
    }

    // Position nodes
    const layerNodes = new Map<number, string[]>();
    layers.forEach((layer, nodeId) => {
      if (!layerNodes.has(layer)) layerNodes.set(layer, []);
      layerNodes.get(layer)!.push(nodeId);
    });

    layerNodes.forEach((nodeIds, layer) => {
      nodeIds.forEach((nodeId, index) => {
        const node = nodes.find(n => n.id === nodeId)!;
        node.position = {
          x: 100 + layer * 250,
          y: 100 + index * 150,
        };
      });
    });
  }

  private generateDefs(): string {
    return `
    <filter id="shadow">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
      <feOffset dx="1" dy="1"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#0078D4"/>
    </marker>`;
  }

  private generateStyles(): string {
    return `
    .title { font: bold 24px 'Segoe UI'; fill: #333; }
    .node-name { font: 600 14px 'Segoe UI'; fill: #333; }
    .node-type { font: 11px 'Segoe UI'; fill: #666; }
    .node-meta { font: 10px 'Segoe UI'; fill: #999; }
    .edge-label { font: 12px 'Segoe UI'; fill: #333; }`;
  }
}

// ============================================================================
// BPMN DIAGRAM GENERATOR
// ============================================================================

export type BPMNElementType = 
  | 'start-event' | 'end-event' | 'task' | 'gateway' 
  | 'subprocess' | 'intermediate-event';

export interface BPMNElement {
  id: string;
  type: BPMNElementType;
  label: string;
  lane?: string;
  position?: { x: number; y: number };
}

export interface BPMNFlow {
  id: string;
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
  generate(
    elements: BPMNElement[],
    flows: BPMNFlow[],
    lanes?: BPMNLane[],
    options?: { title?: string; style?: 'camunda' | 'generic' }
  ): string {
    const opts = { style: 'camunda', ...options };

    if (elements.some(e => !e.position)) {
      this.autoLayout(elements, flows, lanes);
    }

    const width = 1400;
    const height = lanes ? lanes.length * 200 + 100 : 600;

    return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>${this.generateDefs()}</defs>
  <style>${this.generateStyles()}</style>

  <rect width="${width}" height="${height}" fill="white"/>

  ${opts.title ? `
  <text x="${width / 2}" y="30" class="title" text-anchor="middle">${opts.title}</text>` : ''}

  ${lanes ? lanes.map(lane => this.renderLane(lane, elements, width)).join('\n') : ''}

  <g id="flows">
    ${flows.map(f => this.renderFlow(f, elements)).join('\n')}
  </g>

  <g id="elements">
    ${elements.map(e => this.renderElement(e)).join('\n')}
  </g>
</svg>`;
  }

  private renderElement(element: BPMNElement): string {
    const pos = element.position!;
    const shapes: Record<BPMNElementType, string> = {
      'start-event': `
        <circle cx="${pos.x}" cy="${pos.y}" r="20" fill="#00B7C3" stroke="#333" stroke-width="2"/>`,
      
      'end-event': `
        <circle cx="${pos.x}" cy="${pos.y}" r="20" fill="#E74856" stroke="#333" stroke-width="3"/>`,
      
      'task': `
        <rect x="${pos.x - 60}" y="${pos.y - 30}" width="120" height="60" 
              rx="8" fill="#F9E79F" stroke="#333" stroke-width="2"/>
        <text x="${pos.x}" y="${pos.y + 5}" class="element-label" text-anchor="middle">${element.label}</text>`,
      
      'gateway': `
        <path d="M ${pos.x},${pos.y - 30} L ${pos.x + 30},${pos.y} L ${pos.x},${pos.y + 30} L ${pos.x - 30},${pos.y} Z"
              fill="#FFE599" stroke="#333" stroke-width="2"/>
        <text x="${pos.x}" y="${pos.y + 50}" class="element-label" text-anchor="middle">${element.label}</text>`,
      
      'subprocess': `
        <rect x="${pos.x - 70}" y="${pos.y - 35}" width="140" height="70" 
              rx="8" fill="#D5E8FF" stroke="#333" stroke-width="2"/>
        <rect x="${pos.x - 65}" y="${pos.y - 30}" width="130" height="60" 
              rx="5" fill="none" stroke="#333" stroke-width="1"/>
        <text x="${pos.x}" y="${pos.y + 5}" class="element-label" text-anchor="middle">${element.label}</text>`,
      
      'intermediate-event': `
        <circle cx="${pos.x}" cy="${pos.y}" r="20" fill="white" stroke="#333" stroke-width="2"/>
        <circle cx="${pos.x}" cy="${pos.y}" r="17" fill="white" stroke="#333" stroke-width="2"/>
        <text x="${pos.x}" y="${pos.y + 40}" class="element-label" text-anchor="middle">${element.label}</text>`,
    };

    return shapes[element.type] || '';
  }

  private renderFlow(flow: BPMNFlow, elements: BPMNElement[]): string {
    const from = elements.find(e => e.id === flow.from);
    const to = elements.find(e => e.id === flow.to);
    if (!from || !to) return '';

    const fromPos = from.position!;
    const toPos = to.position!;

    // Calculate connection points
    const fromX = fromPos.x + (toPos.x > fromPos.x ? 60 : -60);
    const fromY = fromPos.y;
    const toX = toPos.x + (toPos.x > fromPos.x ? -60 : 60);
    const toY = toPos.y;

    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;

    return `
    <g>
      <path d="M ${fromX},${fromY} L ${toX},${toY}" 
            stroke="#333" stroke-width="2" fill="none"
            marker-end="url(#bpmn-arrow)"/>
      ${flow.label || flow.condition ? `
      <rect x="${midX - 35}" y="${midY - 12}" width="70" height="24" 
            fill="white" stroke="#666" rx="3"/>
      <text x="${midX}" y="${midY + 5}" class="flow-label" text-anchor="middle">
        ${flow.condition || flow.label}
      </text>` : ''}
    </g>`;
  }

  private renderLane(lane: BPMNLane, elements: BPMNElement[], width: number): string {
    const laneElements = elements.filter(e => lane.elements.includes(e.id));
    if (laneElements.length === 0) return '';

    const minY = Math.min(...laneElements.map(e => e.position!.y)) - 50;
    const maxY = Math.max(...laneElements.map(e => e.position!.y)) + 50;
    const height = maxY - minY;

    return `
    <g>
      <rect x="0" y="${minY}" width="${width}" height="${height}" 
            fill="#F5F5F5" stroke="#999" stroke-width="2"/>
      <text x="20" y="${minY + height / 2}" class="lane-label" 
            transform="rotate(-90, 20, ${minY + height / 2})">
        ${lane.name}
      </text>
    </g>`;
  }

  private autoLayout(elements: BPMNElement[], flows: BPMNFlow[], lanes?: BPMNLane[]): void {
    if (lanes) {
      // Layout by lanes
      lanes.forEach((lane, laneIndex) => {
        const laneElements = elements.filter(e => lane.elements.includes(e.id));
        laneElements.forEach((elem, elemIndex) => {
          elem.position = {
            x: 150 + elemIndex * 200,
            y: 150 + laneIndex * 200,
          };
        });
      });
    } else {
      // Simple horizontal flow
      elements.forEach((elem, index) => {
        elem.position = {
          x: 100 + index * 180,
          y: 300,
        };
      });
    }
  }

  private generateDefs(): string {
    return `
    <marker id="bpmn-arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#333"/>
    </marker>`;
  }

  private generateStyles(): string {
    return `
    .title { font: bold 24px 'Segoe UI'; fill: #333; }
    .element-label { font: 12px 'Segoe UI'; fill: #333; }
    .flow-label { font: 11px 'Segoe UI'; fill: #666; }
    .lane-label { font: bold 14px 'Segoe UI'; fill: #666; }`;
  }
}
