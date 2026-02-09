/**
 * Network Topology Diagram Generator (Cisco-style)
 * Professional network diagrams with Cisco official icons
 */

export type NetworkDeviceType = 
  | 'router' | 'switch' | 'firewall' | 'load-balancer' 
  | 'server' | 'workstation' | 'cloud' | 'internet'
  | 'vpn' | 'wireless-ap' | 'storage' | 'database';

export type NetworkConnectionType = 
  | 'ethernet' | 'fiber' | 'wireless' | 'vpn-tunnel' | 'wan';

export interface NetworkDevice {
  id: string;
  type: NetworkDeviceType;
  name: string;
  ipAddress?: string;
  zone?: string;
  metadata?: {
    model?: string;
    ports?: number;
    bandwidth?: string;
    [key: string]: any;
  };
  position?: { x: number; y: number };
}

export interface NetworkConnection {
  id: string;
  from: string;
  to: string;
  type: NetworkConnectionType;
  bandwidth?: string;
  protocol?: string;
  vlan?: string;
  bidirectional?: boolean;
}

export interface SecurityZone {
  id: string;
  name: string;
  devices: string[];
  securityLevel: 'dmz' | 'internal' | 'external' | 'management';
  color?: string;
}

export interface NetworkDiagramOptions {
  title?: string;
  style: 'cisco' | 'juniper' | 'generic';
  showIPs: boolean;
  showBandwidth: boolean;
  showZones: boolean;
  iconSize: number;
  layout: 'hierarchical' | 'zones' | 'star' | 'mesh';
}

export class NetworkDiagramGenerator {
  private readonly DEFAULT_OPTIONS: NetworkDiagramOptions = {
    style: 'cisco',
    showIPs: true,
    showBandwidth: true,
    showZones: true,
    iconSize: 60,
    layout: 'hierarchical',
  };

  private readonly CISCO_COLORS = {
    router: '#1BA1E2',
    switch: '#00A651',
    firewall: '#E74856',
    'load-balancer': '#7B68EE',
    server: '#0078D4',
    workstation: '#767676',
    cloud: '#00BCF2',
    internet: '#FF8C00',
    vpn: '#742774',
    'wireless-ap': '#FFB900',
    storage: '#00B7C3',
    database: '#464FEB',
  };

  private readonly ZONE_COLORS = {
    dmz: '#FFB900',
    internal: '#107C10',
    external: '#E74856',
    management: '#0078D4',
  };

  generate(
    devices: NetworkDevice[],
    connections: NetworkConnection[],
    zones?: SecurityZone[],
    options?: Partial<NetworkDiagramOptions>
  ): string {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    if (devices.some(d => !d.position)) {
      this.autoLayout(devices, connections, zones, opts.layout);
    }

    const width = this.calculateWidth(devices, opts);
    const height = this.calculateHeight(devices, opts);

    return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${this.generateDefs()}
  </defs>

  <style>${this.generateStyles(opts)}</style>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#F5F5F5"/>

  <!-- Title -->
  ${opts.title ? `
  <text x="${width / 2}" y="30" class="diagram-title" text-anchor="middle">
    ${opts.title}
  </text>` : ''}

  <!-- Security Zones -->
  ${opts.showZones && zones ? zones.map(z => this.renderZone(z, devices, opts)).join('\n') : ''}

  <!-- Connections -->
  <g id="connections">
    ${connections.map(c => this.renderConnection(c, devices, opts)).join('\n')}
  </g>

  <!-- Devices -->
  <g id="devices">
    ${devices.map(d => this.renderDevice(d, opts)).join('\n')}
  </g>
</svg>`;
  }

  private renderDevice(device: NetworkDevice, opts: NetworkDiagramOptions): string {
    const pos = device.position || { x: 0, y: 0 };
    const size = opts.iconSize;
    const color = this.CISCO_COLORS[device.type];
    const icon = this.getDeviceIcon(device.type, size, color);

    return `
    <g class="network-device" transform="translate(${pos.x}, ${pos.y})">
      <!-- Device icon -->
      ${icon}

      <!-- Device name -->
      <text x="${size / 2}" y="${size + 20}" class="device-name" text-anchor="middle">
        ${device.name}
      </text>

      <!-- IP Address -->
      ${opts.showIPs && device.ipAddress ? `
      <text x="${size / 2}" y="${size + 35}" class="device-ip" text-anchor="middle">
        ${device.ipAddress}
      </text>` : ''}

      <!-- Metadata -->
      ${device.metadata?.model ? `
      <text x="${size / 2}" y="${size + 50}" class="device-metadata" text-anchor="middle">
        ${device.metadata.model}
      </text>` : ''}
    </g>`;
  }

  private renderConnection(
    conn: NetworkConnection,
    devices: NetworkDevice[],
    opts: NetworkDiagramOptions
  ): string {
    const from = devices.find(d => d.id === conn.from);
    const to = devices.find(d => d.id === conn.to);
    if (!from || !to) return '';

    const fromPos = this.getConnectionPoint(from, to, opts);
    const toPos = this.getConnectionPoint(to, from, opts);
    const style = this.getConnectionStyle(conn.type);
    
    const midX = (fromPos.x + toPos.x) / 2;
    const midY = (fromPos.y + toPos.y) / 2;

    return `
    <g class="network-connection">
      <line 
        x1="${fromPos.x}" y1="${fromPos.y}" 
        x2="${toPos.x}" y2="${toPos.y}"
        stroke="${style.color}" 
        stroke-width="${style.width}"
        stroke-dasharray="${style.dashArray}"
        marker-end="url(#arrow-${conn.type})"
      />

      ${opts.showBandwidth && conn.bandwidth ? `
      <rect x="${midX - 30}" y="${midY - 10}" width="60" height="20" 
            fill="white" stroke="${style.color}" rx="3"/>
      <text x="${midX}" y="${midY + 5}" class="connection-label" text-anchor="middle">
        ${conn.bandwidth}
      </text>` : ''}
    </g>`;
  }

  private renderZone(zone: SecurityZone, devices: NetworkDevice[], opts: NetworkDiagramOptions): string {
    const zoneDevices = devices.filter(d => zone.devices.includes(d.id));
    if (zoneDevices.length === 0) return '';

    const padding = 40;
    const minX = Math.min(...zoneDevices.map(d => d.position!.x)) - padding;
    const minY = Math.min(...zoneDevices.map(d => d.position!.y)) - padding;
    const maxX = Math.max(...zoneDevices.map(d => d.position!.x + opts.iconSize)) + padding;
    const maxY = Math.max(...zoneDevices.map(d => d.position!.y + opts.iconSize + 60)) + padding;

    const color = zone.color || this.ZONE_COLORS[zone.securityLevel];

    return `
    <g class="security-zone">
      <rect x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}"
            fill="${color}" opacity="0.1" stroke="${color}" stroke-width="2" 
            stroke-dasharray="5,5" rx="10"/>
      <text x="${minX + 10}" y="${minY - 10}" class="zone-label" fill="${color}" font-weight="bold">
        ${zone.name} (${zone.securityLevel.toUpperCase()})
      </text>
    </g>`;
  }

  private getDeviceIcon(type: NetworkDeviceType, size: number, color: string): string {
    const icons: Record<NetworkDeviceType, string> = {
      router: `<rect width="${size}" height="${size}" fill="${color}" opacity="0.2" rx="8"/>
              <path d="M ${size * 0.3},${size * 0.4} L ${size * 0.7},${size * 0.4} L ${size * 0.7},${size * 0.6} L ${size * 0.3},${size * 0.6} Z" 
                    fill="${color}" stroke="#333" stroke-width="2"/>`,
      
      switch: `<rect width="${size}" height="${size}" fill="${color}" opacity="0.2" rx="8"/>
              <rect x="${size * 0.2}" y="${size * 0.35}" width="${size * 0.6}" height="${size * 0.3}" 
                    fill="${color}" stroke="#333" stroke-width="2"/>`,
      
      firewall: `<rect width="${size}" height="${size}" fill="${color}" opacity="0.2" rx="8"/>
                <path d="M ${size * 0.5},${size * 0.2} L ${size * 0.3},${size * 0.5} L ${size * 0.7},${size * 0.5} Z" 
                      fill="${color}" stroke="#333" stroke-width="2"/>`,
      
      'load-balancer': `<rect width="${size}" height="${size}" fill="${color}" opacity="0.2" rx="8"/>
                       <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.25}" 
                               fill="${color}" stroke="#333" stroke-width="2"/>`,
      
      server: `<rect width="${size}" height="${size}" fill="${color}" opacity="0.2" rx="8"/>
              <rect x="${size * 0.25}" y="${size * 0.3}" width="${size * 0.5}" height="${size * 0.4}" 
                    fill="${color}" stroke="#333" stroke-width="2"/>`,
      
      workstation: `<rect width="${size}" height="${size}" fill="${color}" opacity="0.2" rx="8"/>
                   <rect x="${size * 0.2}" y="${size * 0.3}" width="${size * 0.6}" height="${size * 0.35}" 
                         fill="${color}" stroke="#333" stroke-width="2"/>`,
      
      cloud: `<ellipse cx="${size * 0.5}" cy="${size * 0.5}" rx="${size * 0.4}" ry="${size * 0.25}" 
                      fill="${color}" opacity="0.3" stroke="#333" stroke-width="2"/>`,
      
      internet: `<circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.35}" 
                        fill="${color}" opacity="0.3" stroke="#333" stroke-width="2"/>`,
      
      vpn: `<rect width="${size}" height="${size}" fill="${color}" opacity="0.2" rx="8"/>
           <path d="M ${size * 0.3},${size * 0.4} Q ${size * 0.5},${size * 0.2} ${size * 0.7},${size * 0.4}" 
                 fill="none" stroke="${color}" stroke-width="3"/>`,
      
      'wireless-ap': `<rect width="${size}" height="${size}" fill="${color}" opacity="0.2" rx="8"/>
                     <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.1}" fill="${color}"/>`,
      
      storage: `<rect width="${size}" height="${size}" fill="${color}" opacity="0.2" rx="8"/>
               <rect x="${size * 0.2}" y="${size * 0.35}" width="${size * 0.6}" height="${size * 0.3}" 
                     fill="${color}" stroke="#333" stroke-width="2"/>`,
      
      database: `<ellipse cx="${size * 0.5}" cy="${size * 0.4}" rx="${size * 0.3}" ry="${size * 0.15}" 
                         fill="${color}" stroke="#333" stroke-width="2"/>
                <rect x="${size * 0.2}" y="${size * 0.4}" width="${size * 0.6}" height="${size * 0.3}" 
                      fill="${color}"/>`,
    };

    return icons[type] || icons.router;
  }

  private getConnectionStyle(type: NetworkConnectionType) {
    const styles = {
      ethernet: { color: '#0078D4', width: 3, dashArray: 'none' },
      fiber: { color: '#FF8C00', width: 4, dashArray: 'none' },
      wireless: { color: '#FFB900', width: 2, dashArray: '5,5' },
      'vpn-tunnel': { color: '#742774', width: 3, dashArray: '8,4' },
      wan: { color: '#E74856', width: 3, dashArray: 'none' },
    };
    return styles[type] || styles.ethernet;
  }

  private getConnectionPoint(from: NetworkDevice, to: NetworkDevice, opts: NetworkDiagramOptions) {
    const size = opts.iconSize;
    const fromPos = from.position!;
    const toPos = to.position!;
    
    const fromCenterX = fromPos.x + size / 2;
    const fromCenterY = fromPos.y + size / 2;
    const toCenterX = toPos.x + size / 2;
    const toCenterY = toPos.y + size / 2;

    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    if (Math.abs(dx) > Math.abs(dy)) {
      return { x: dx > 0 ? fromPos.x + size : fromPos.x, y: fromCenterY };
    } else {
      return { x: fromCenterX, y: dy > 0 ? fromPos.y + size : fromPos.y };
    }
  }

  private autoLayout(
    devices: NetworkDevice[],
    connections: NetworkConnection[],
    zones: SecurityZone[] | undefined,
    layout: string
  ): void {
    if (layout === 'hierarchical') {
      this.hierarchicalNetworkLayout(devices, connections);
    } else if (layout === 'zones' && zones) {
      this.zoneNetworkLayout(devices, zones);
    } else {
      this.gridLayout(devices);
    }
  }

  private hierarchicalNetworkLayout(devices: NetworkDevice[], connections: NetworkConnection[]): void {
    const layers: NetworkDevice[][] = [[], [], [], []];
    
    // Layer 0: Internet/External
    layers[0] = devices.filter(d => d.type === 'internet' || d.type === 'cloud');
    
    // Layer 1: Edge (Firewalls, Routers)
    layers[1] = devices.filter(d => d.type === 'firewall' || d.type === 'router');
    
    // Layer 2: Distribution (Switches, Load Balancers)
    layers[2] = devices.filter(d => d.type === 'switch' || d.type === 'load-balancer');
    
    // Layer 3: Access (Servers, Workstations, Storage)
    layers[3] = devices.filter(d => 
      !layers[0].includes(d) && !layers[1].includes(d) && !layers[2].includes(d)
    );

    const horizontalSpacing = 150;
    const verticalSpacing = 180;

    layers.forEach((layer, layerIndex) => {
      layer.forEach((device, deviceIndex) => {
        const totalWidth = (layer.length - 1) * horizontalSpacing;
        const startX = 100 + (layerIndex * 50);
        
        device.position = {
          x: startX + deviceIndex * horizontalSpacing - totalWidth / 2 + 400,
          y: 80 + layerIndex * verticalSpacing,
        };
      });
    });
  }

  private zoneNetworkLayout(devices: NetworkDevice[], zones: SecurityZone[]): void {
    const zoneSpacing = 300;
    let currentX = 100;

    zones.forEach(zone => {
      const zoneDevices = devices.filter(d => zone.devices.includes(d.id));
      zoneDevices.forEach((device, index) => {
        device.position = {
          x: currentX,
          y: 100 + index * 120,
        };
      });
      currentX += zoneSpacing;
    });

    const unzoned = devices.filter(d => 
      !zones.some(z => z.devices.includes(d.id))
    );
    unzoned.forEach((device, index) => {
      device.position = { x: currentX, y: 100 + index * 120 };
    });
  }

  private gridLayout(devices: NetworkDevice[]): void {
    const cols = Math.ceil(Math.sqrt(devices.length));
    devices.forEach((device, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      device.position = { x: 100 + col * 180, y: 100 + row * 180 };
    });
  }

  private generateDefs(): string {
    return `
    <filter id="device-shadow">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
      <feOffset dx="1" dy="1"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>

    <marker id="arrow-ethernet" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#0078D4"/>
    </marker>
    <marker id="arrow-fiber" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#FF8C00"/>
    </marker>
    <marker id="arrow-wireless" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#FFB900"/>
    </marker>`;
  }

  private generateStyles(opts: NetworkDiagramOptions): string {
    return `
    .diagram-title { font: bold 24px 'Segoe UI'; fill: #333; }
    .device-name { font: 600 13px 'Segoe UI'; fill: #333; }
    .device-ip { font: 11px 'Segoe UI'; fill: #666; }
    .device-metadata { font: 10px 'Segoe UI'; fill: #999; }
    .connection-label { font: 11px 'Segoe UI'; fill: #333; }
    .zone-label { font: 14px 'Segoe UI'; }`;
  }

  private calculateWidth(devices: NetworkDevice[], opts: NetworkDiagramOptions): number {
    return Math.max(...devices.map(d => (d.position?.x || 0) + opts.iconSize)) + 100;
  }

  private calculateHeight(devices: NetworkDevice[], opts: NetworkDiagramOptions): number {
    return Math.max(...devices.map(d => (d.position?.y || 0) + opts.iconSize + 70)) + 50;
  }
}
