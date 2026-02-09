import dagre from 'dagre';
import type { Logger } from '@mcp-suite/shared';
import type { CloudNode, DiagramStyle, DIAGRAM_STYLES } from '../config.js';

/**
 * Cloud Architecture Diagram Generator
 */
export class CloudArchitectureGenerator {
  constructor(private logger?: Logger) {}

  /**
   * Generate cloud architecture diagram
   */
  async generateArchitecture(
    nodes: CloudNode[],
    style: string = 'modern'
  ): Promise<string> {
    this.logger?.info({ nodeCount: nodes.length }, 'Generating cloud architecture diagram');

    const diagramStyle = DIAGRAM_STYLES[style] || DIAGRAM_STYLES.modern;

    // Build layout
    const layout = this.buildLayout(nodes, diagramStyle);

    // Generate SVG
    const svg = this.generateSVG(nodes, layout, diagramStyle);

    return svg;
  }

  /**
   * Build layout using dagre
   */
  private buildLayout(nodes: CloudNode[], style: DiagramStyle): dagre.graphlib.Graph {
    const g = new dagre.graphlib.Graph();

    g.setGraph({
      rankdir: 'TB',
      nodesep: 80,
      ranksep: 100,
      marginx: 40,
      marginy: 40,
    });

    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes
    for (const node of nodes) {
      const size = this.getNodeSize(node.type);
      g.setNode(node.id, {
        label: node.name,
        width: size.width,
        height: size.height,
        node,
      });
    }

    // Add edges (connections)
    for (const node of nodes) {
      for (const connectedId of node.connections) {
        g.setEdge(node.id, connectedId);
      }
    }

    // Compute layout
    dagre.layout(g);

    return g;
  }

  /**
   * Get node size based on type
   */
  private getNodeSize(type: string): { width: number; height: number } {
    const sizes: Record<string, { width: number; height: number }> = {
      'resource-group': { width: 400, height: 300 },
      subscription: { width: 600, height: 400 },
      resource: { width: 120, height: 80 },
      network: { width: 150, height: 100 },
      security: { width: 100, height: 70 },
    };

    return sizes[type] || { width: 120, height: 80 };
  }

  /**
   * Generate SVG
   */
  private generateSVG(
    nodes: CloudNode[],
    layout: dagre.graphlib.Graph,
    style: DiagramStyle
  ): string {
    const graph = layout.graph();
    const width = (graph.width || 1000) + 80;
    const height = (graph.height || 800) + 80;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .resource-text { font-family: ${style.fonts.table}; font-size: ${style.fonts.size}px; font-weight: bold; }
      .property-text { font-family: ${style.fonts.column}; font-size: ${style.fonts.size - 1}px; }
    </style>
  </defs>
  <rect width="${width}" height="${height}" fill="${style.colors.background}"/>
`;

    // Draw connections
    svg += this.drawConnections(layout, style);

    // Draw nodes
    for (const node of nodes) {
      const layoutNode = layout.node(node.id);
      if (layoutNode) {
        svg += this.drawNode(node, layoutNode.x, layoutNode.y, style);
      }
    }

    // Add legend
    svg += this.drawLegend(width - 200, 20, style);

    svg += '</svg>';

    return svg;
  }

  /**
   * Draw a single node
   */
  private drawNode(
    node: CloudNode,
    x: number,
    y: number,
    style: DiagramStyle
  ): string {
    const size = this.getNodeSize(node.type);
    const color = this.getNodeColor(node.type, style);

    let svg = `
  <g transform="translate(${x - size.width/2}, ${y - size.height/2})">
    <rect width="${size.width}" height="${size.height}" fill="${color}" stroke="${style.colors.border}" stroke-width="2" rx="8"/>
    
    <!-- Type badge -->
    <rect x="5" y="5" width="60" height="20" fill="${style.colors.border}" opacity="0.2" rx="4"/>
    <text x="35" y="18" text-anchor="middle" font-size="10" fill="${style.colors.text}">${node.type}</text>
    
    <!-- Name -->
    <text x="${size.width/2}" y="${size.height/2 - 10}" text-anchor="middle" class="resource-text" fill="${style.colors.text}">
      ${this.escapeXml(node.name)}
    </text>
    
    <!-- Service -->
    <text x="${size.width/2}" y="${size.height/2 + 10}" text-anchor="middle" class="property-text" fill="${style.colors.text}" opacity="0.7">
      ${node.service}
    </text>
  </g>
`;

    return svg;
  }

  /**
   * Draw connections between nodes
   */
  private drawConnections(layout: dagre.graphlib.Graph, style: DiagramStyle): string {
    let svg = '<g id="connections">\n';

    layout.edges().forEach((edge) => {
      const edgeData = layout.edge(edge);
      const points = edgeData.points || [];

      if (points.length >= 2) {
        const path = points.map((p, i) => 
          i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
        ).join(' ');

        svg += `  <path d="${path}" stroke="${style.colors.border}" stroke-width="2" fill="none" marker-end="url(#arrowhead)"/>\n`;
      }
    });

    svg += '</g>\n';

    // Add arrowhead marker
    svg = `
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="${style.colors.border}" />
    </marker>
  </defs>
` + svg;

    return svg;
  }

  /**
   * Get node color based on type
   */
  private getNodeColor(type: string, style: DiagramStyle): string {
    const colors: Record<string, string> = {
      'resource-group': '#E8F4FD',
      subscription: '#FFF4E6',
      resource: style.colors.dimension,
      network: '#E8F5E9',
      security: '#FFF9C4',
    };

    return colors[type] || style.colors.dimension;
  }

  /**
   * Draw legend
   */
  private drawLegend(x: number, y: number, style: DiagramStyle): string {
    return `
  <g transform="translate(${x}, ${y})">
    <rect width="180" height="180" fill="white" stroke="${style.colors.border}" stroke-width="1" rx="5"/>
    <text x="10" y="20" font-weight="bold">Legend</text>
    
    <rect x="10" y="30" width="30" height="20" fill="#E8F4FD" stroke="${style.colors.border}"/>
    <text x="45" y="45" font-size="10">Resource Group</text>
    
    <rect x="10" y="55" width="30" height="20" fill="#FFF4E6" stroke="${style.colors.border}"/>
    <text x="45" y="70" font-size="10">Subscription</text>
    
    <rect x="10" y="80" width="30" height="20" fill="${style.colors.dimension}" stroke="${style.colors.border}"/>
    <text x="45" y="95" font-size="10">Resource</text>
    
    <rect x="10" y="105" width="30" height="20" fill="#E8F5E9" stroke="${style.colors.border}"/>
    <text x="45" y="120" font-size="10">Network</text>
    
    <rect x="10" y="130" width="30" height="20" fill="#FFF9C4" stroke="${style.colors.border}"/>
    <text x="45" y="145" font-size="10">Security</text>
  </g>`;
  }

  /**
   * Generate Mermaid flowchart
   */
  generateMermaid(nodes: CloudNode[]): string {
    let mermaid = 'flowchart TD\n';

    for (const node of nodes) {
      const shape = this.getMermaidShape(node.type);
      mermaid += `  ${node.id}${shape.open}"${node.name}<br/>${node.service}"${shape.close}\n`;

      for (const connId of node.connections) {
        mermaid += `  ${node.id} --> ${connId}\n`;
      }
    }

    return mermaid;
  }

  /**
   * Get Mermaid shape for node type
   */
  private getMermaidShape(type: string): { open: string; close: string } {
    const shapes: Record<string, { open: string; close: string }> = {
      'resource-group': { open: '[', close: ']' },
      subscription: { open: '[[', close: ']]' },
      resource: { open: '(', close: ')' },
      network: { open: '([', close: '])' },
      security: { open: '{', close: '}' },
    };

    return shapes[type] || { open: '[', close: ']' };
  }

  /**
   * Escape XML
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
