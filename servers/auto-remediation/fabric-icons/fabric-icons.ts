/**
 * Microsoft Fabric Icon Library
 * High-fidelity SVG recreations matching official Microsoft style
 */

export interface IconOptions {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export class FabricIcons {
  private static readonly DEFAULT_SIZE = 64;
  private static readonly DEFAULT_STROKE = 2;

  /**
   * Lakehouse Icon - Data Engineering
   * Color: #00B7C3 (Teal)
   */
  static lakehouse(options: IconOptions = {}): string {
    const size = options.size || this.DEFAULT_SIZE;
    const color = options.color || '#00B7C3';
    
    return `
<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lakehouse-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${this.darken(color, 20)};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Lake/Water Base -->
  <ellipse cx="32" cy="52" rx="28" ry="8" fill="${this.lighten(color, 40)}" opacity="0.3"/>
  
  <!-- House Structure -->
  <path d="M 12 36 L 32 20 L 52 36 L 52 52 L 12 52 Z" 
        fill="url(#lakehouse-gradient)" 
        stroke="${this.darken(color, 30)}" 
        stroke-width="2"/>
  
  <!-- Roof -->
  <path d="M 8 36 L 32 16 L 56 36 L 52 36 L 32 20 L 12 36 Z" 
        fill="${this.darken(color, 10)}" 
        stroke="${this.darken(color, 30)}" 
        stroke-width="2"/>
  
  <!-- Door -->
  <rect x="26" y="40" width="12" height="12" 
        fill="${this.darken(color, 40)}" 
        rx="1"/>
  
  <!-- Windows -->
  <rect x="16" y="32" width="8" height="8" 
        fill="${this.lighten(color, 60)}" 
        stroke="${this.darken(color, 30)}" 
        stroke-width="1"/>
  <rect x="40" y="32" width="8" height="8" 
        fill="${this.lighten(color, 60)}" 
        stroke="${this.darken(color, 30)}" 
        stroke-width="1"/>
  
  <!-- Data Layer Lines -->
  <line x1="14" y1="50" x2="50" y2="50" 
        stroke="${this.lighten(color, 20)}" 
        stroke-width="1" 
        stroke-dasharray="2,2"/>
</svg>`;
  }

  /**
   * Warehouse Icon - Data Engineering
   * Color: #0078D4 (Azure Blue)
   */
  static warehouse(options: IconOptions = {}): string {
    const size = options.size || this.DEFAULT_SIZE;
    const color = options.color || '#0078D4';
    
    return `
<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="warehouse-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${this.darken(color, 20)};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Main Building -->
  <rect x="8" y="24" width="48" height="32" 
        fill="url(#warehouse-gradient)" 
        stroke="${this.darken(color, 30)}" 
        stroke-width="2" 
        rx="2"/>
  
  <!-- Roof -->
  <path d="M 4 24 L 32 8 L 60 24 L 56 24 L 32 12 L 8 24 Z" 
        fill="${this.darken(color, 10)}" 
        stroke="${this.darken(color, 30)}" 
        stroke-width="2"/>
  
  <!-- Storage Shelves -->
  <line x1="12" y1="32" x2="52" y2="32" stroke="${this.lighten(color, 40)}" stroke-width="1.5"/>
  <line x1="12" y1="40" x2="52" y2="40" stroke="${this.lighten(color, 40)}" stroke-width="1.5"/>
  <line x1="12" y1="48" x2="52" y2="48" stroke="${this.lighten(color, 40)}" stroke-width="1.5"/>
  
  <!-- Vertical Dividers -->
  <line x1="24" y1="28" x2="24" y2="52" stroke="${this.lighten(color, 40)}" stroke-width="1"/>
  <line x1="40" y1="28" x2="40" y2="52" stroke="${this.lighten(color, 40)}" stroke-width="1"/>
  
  <!-- Database Cylinders -->
  <ellipse cx="18" cy="36" rx="4" ry="2" fill="${this.lighten(color, 60)}"/>
  <rect x="14" y="36" width="8" height="8" fill="${this.lighten(color, 60)}"/>
  <ellipse cx="18" cy="44" rx="4" ry="2" fill="${this.lighten(color, 50)}"/>
</svg>`;
  }

  /**
   * Data Pipeline Icon - Integration
   * Color: #FF8C00 (Orange)
   */
  static pipeline(options: IconOptions = {}): string {
    const size = options.size || this.DEFAULT_SIZE;
    const color = options.color || '#FF8C00';
    
    return `
<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <!-- Source -->
  <circle cx="12" cy="32" r="6" 
          fill="${color}" 
          stroke="${this.darken(color, 30)}" 
          stroke-width="2"/>
  
  <!-- Pipeline Segments -->
  <rect x="18" y="28" width="12" height="8" 
        fill="${this.lighten(color, 20)}" 
        stroke="${this.darken(color, 30)}" 
        stroke-width="2" 
        rx="2"/>
  
  <!-- Flow Arrow -->
  <path d="M 30 32 L 34 32" 
        stroke="${this.darken(color, 30)}" 
        stroke-width="2" 
        marker-end="url(#arrow)"/>
  
  <!-- Transform Box -->
  <rect x="34" y="24" width="16" height="16" 
        fill="${color}" 
        stroke="${this.darken(color, 30)}" 
        stroke-width="2" 
        rx="2"/>
  <text x="42" y="34" font-size="10" fill="white" text-anchor="middle">T</text>
  
  <!-- Flow Arrow -->
  <path d="M 50 32 L 54 32" 
        stroke="${this.darken(color, 30)}" 
        stroke-width="2" 
        marker-end="url(#arrow)"/>
  
  <!-- Destination -->
  <rect x="54" y="26" width="6" height="12" 
        fill="${this.darken(color, 10)}" 
        stroke="${this.darken(color, 30)}" 
        stroke-width="2" 
        rx="1"/>
  
  <!-- Arrow Marker -->
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="${this.darken(color, 30)}" />
    </marker>
  </defs>
  
  <!-- Flow Indicators -->
  <circle cx="24" cy="32" r="1.5" fill="${this.lighten(color, 60)}">
    <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite"/>
  </circle>
  <circle cx="42" cy="32" r="1.5" fill="white">
    <animate attributeName="opacity" values="0;1;0" dur="1.5s" begin="0.5s" repeatCount="indefinite"/>
  </circle>
</svg>`;
  }

  /**
   * Notebook Icon - Data Engineering/Science
   * Color: #7B68EE (Violet)
   */
  static notebook(options: IconOptions = {}): string {
    const size = options.size || this.DEFAULT_SIZE;
    const color = options.color || '#7B68EE';
    
    return `
<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <!-- Notebook Cover -->
  <rect x="12" y="8" width="40" height="48" 
        fill="${color}" 
        stroke="${this.darken(color, 30)}" 
        stroke-width="2" 
        rx="2"/>
  
  <!-- Binding Rings -->
  <circle cx="16" cy="16" r="2" fill="${this.lighten(color, 60)}" stroke="${this.darken(color, 30)}" stroke-width="1"/>
  <circle cx="16" cy="32" r="2" fill="${this.lighten(color, 60)}" stroke="${this.darken(color, 30)}" stroke-width="1"/>
  <circle cx="16" cy="48" r="2" fill="${this.lighten(color, 60)}" stroke="${this.darken(color, 30)}" stroke-width="1"/>
  
  <!-- Code Lines -->
  <line x1="24" y1="20" x2="44" y2="20" stroke="white" stroke-width="2" opacity="0.8"/>
  <line x1="24" y1="28" x2="40" y2="28" stroke="white" stroke-width="2" opacity="0.8"/>
  <line x1="24" y1="36" x2="44" y2="36" stroke="white" stroke-width="2" opacity="0.8"/>
  <line x1="24" y1="44" x2="38" y2="44" stroke="white" stroke-width="2" opacity="0.8"/>
  
  <!-- Code Brackets -->
  <text x="22" y="26" font-size="12" fill="white" opacity="0.9">{</text>
  <text x="46" y="42" font-size="12" fill="white" opacity="0.9">}</text>
</svg>`;
  }

  /**
   * Report Icon - Power BI
   * Color: #F2C811 (Gold)
   */
  static report(options: IconOptions = {}): string {
    const size = options.size || this.DEFAULT_SIZE;
    const color = options.color || '#F2C811';
    
    return `
<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <!-- Report Page -->
  <rect x="12" y="8" width="40" height="48" 
        fill="white" 
        stroke="${this.darken(color, 30)}" 
        stroke-width="2" 
        rx="2"/>
  
  <!-- Title Bar -->
  <rect x="12" y="8" width="40" height="8" 
        fill="${color}" 
        stroke="${this.darken(color, 30)}" 
        stroke-width="2" 
        rx="2"/>
  
  <!-- Chart - Bar Graph -->
  <rect x="18" y="28" width="6" height="16" fill="${this.darken(color, 20)}"/>
  <rect x="26" y="32" width="6" height="12" fill="${this.darken(color, 20)}"/>
  <rect x="34" y="24" width="6" height="20" fill="${color}"/>
  <rect x="42" y="30" width="6" height="14" fill="${this.darken(color, 20)}"/>
  
  <!-- Axis Lines -->
  <line x1="16" y1="46" x2="50" y2="46" stroke="${this.darken(color, 50)}" stroke-width="1"/>
  <line x1="16" y1="22" x2="16" y2="46" stroke="${this.darken(color, 50)}" stroke-width="1"/>
</svg>`;
  }

  /**
   * Eventstream Icon - Real-Time Intelligence
   * Color: #1C93D2 (Blue)
   */
  static eventstream(options: IconOptions = {}): string {
    const size = options.size || this.DEFAULT_SIZE;
    const color = options.color || '#1C93D2';
    
    return `
<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <!-- Stream Flow -->
  <path d="M 8 32 Q 20 20, 32 32 T 56 32" 
        stroke="${color}" 
        stroke-width="3" 
        fill="none"/>
  <path d="M 8 38 Q 20 26, 32 38 T 56 38" 
        stroke="${this.lighten(color, 20)}" 
        stroke-width="3" 
        fill="none" 
        opacity="0.6"/>
  
  <!-- Event Pulses -->
  <circle cx="16" cy="32" r="3" fill="${color}">
    <animate attributeName="r" values="3;5;3" dur="1s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite"/>
  </circle>
  <circle cx="32" cy="32" r="3" fill="${color}">
    <animate attributeName="r" values="3;5;3" dur="1s" begin="0.3s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="1;0.5;1" dur="1s" begin="0.3s" repeatCount="indefinite"/>
  </circle>
  <circle cx="48" cy="32" r="3" fill="${color}">
    <animate attributeName="r" values="3;5;3" dur="1s" begin="0.6s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="1;0.5;1" dur="1s" begin="0.6s" repeatCount="indefinite"/>
  </circle>
  
  <!-- Direction Arrow -->
  <path d="M 52 32 L 58 32 L 55 29 M 58 32 L 55 35" 
        stroke="${color}" 
        stroke-width="2" 
        fill="none"/>
</svg>`;
  }

  /**
   * Utility: Lighten color
   */
  private static lighten(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  }

  /**
   * Utility: Darken color
   */
  private static darken(color: string, percent: number): string {
    return this.lighten(color, -percent);
  }

  /**
   * Get all available icons
   */
  static getAvailableIcons(): string[] {
    return [
      'lakehouse',
      'warehouse',
      'pipeline',
      'notebook',
      'report',
      'eventstream',
      'dataflow',
      'kql-database',
      'ml-model',
      'workspace'
    ];
  }

  /**
   * Get icon by name
   */
  static getIcon(name: string, options: IconOptions = {}): string {
    const iconMap: { [key: string]: (options: IconOptions) => string } = {
      'lakehouse': this.lakehouse,
      'warehouse': this.warehouse,
      'pipeline': this.pipeline,
      'notebook': this.notebook,
      'report': this.report,
      'eventstream': this.eventstream
    };

    const iconFunction = iconMap[name];
    if (!iconFunction) {
      throw new Error(`Icon '${name}' not found`);
    }

    return iconFunction.call(this, options);
  }
}

/**
 * Export individual icon functions
 */
export const lakehouse = (options?: IconOptions) => FabricIcons.lakehouse(options);
export const warehouse = (options?: IconOptions) => FabricIcons.warehouse(options);
export const pipeline = (options?: IconOptions) => FabricIcons.pipeline(options);
export const notebook = (options?: IconOptions) => FabricIcons.notebook(options);
export const report = (options?: IconOptions) => FabricIcons.report(options);
export const eventstream = (options?: IconOptions) => FabricIcons.eventstream(options);
