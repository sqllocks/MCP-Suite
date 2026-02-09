/**
 * Power BI Dashboard Mockup Generator
 * Creates professional dashboard wireframes and mockups based on best practices
 */

export type VisualType = 
  | 'card' | 'kpi' | 'bar-chart' | 'line-chart' | 'pie-chart' | 'donut-chart'
  | 'table' | 'matrix' | 'map' | 'gauge' | 'waterfall' | 'funnel' | 'treemap'
  | 'scatter' | 'ribbon' | 'area-chart' | 'combo-chart' | 'slicer' | 'filter';

export interface DashboardVisual {
  id: string;
  type: VisualType;
  title: string;
  position: { x: number; y: number; width: number; height: number };
  data?: {
    value?: string | number;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    labels?: string[];
    values?: number[];
    categories?: string[];
  };
  color?: string;
  interactivity?: {
    drillthrough?: boolean;
    crossFilter?: boolean;
    tooltip?: boolean;
  };
}

export interface DashboardPage {
  name: string;
  layout: 'wide' | 'portrait' | 'focus';
  background?: string;
  visuals: DashboardVisual[];
  filters?: Array<{ field: string; type: string }>;
}

export interface DashboardMockup {
  name: string;
  theme: 'light' | 'dark' | 'corporate' | 'modern';
  pages: DashboardPage[];
  description?: string;
}

export class PowerBIDashboardGenerator {
  private readonly COLORS = {
    light: {
      background: '#FFFFFF',
      card: '#F3F2F1',
      accent: '#0078D4',
      text: '#323130',
      secondary: '#605E5C',
    },
    dark: {
      background: '#1E1E1E',
      card: '#2D2D2D',
      accent: '#00BCF2',
      text: '#FFFFFF',
      secondary: '#A19F9D',
    },
    corporate: {
      background: '#F5F5F5',
      card: '#FFFFFF',
      accent: '#002050',
      text: '#1F1F1F',
      secondary: '#666666',
    },
    modern: {
      background: '#FAFAFA',
      card: '#FFFFFF',
      accent: '#6264A7',
      text: '#242424',
      secondary: '#8A8886',
    },
  };

  generate(mockup: DashboardMockup): string {
    const colors = this.COLORS[mockup.theme];
    const width = 1920;
    const height = 1080;

    return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>${this.generateDefs()}</defs>
  <style>${this.generateStyles(colors)}</style>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${colors.background}"/>

  <!-- Header Bar -->
  ${this.renderHeader(mockup.name, width, colors)}

  <!-- Page Content -->
  ${mockup.pages[0] ? this.renderPage(mockup.pages[0], colors) : ''}

  <!-- Footer/Info -->
  <text x="20" y="${height - 20}" class="footer-text">
    Last Refreshed: ${new Date().toLocaleString()} | Data Source: Microsoft Fabric
  </text>
</svg>`;
  }

  private renderHeader(title: string, width: number, colors: any): string {
    return `
    <g id="header">
      <rect width="${width}" height="60" fill="${colors.accent}"/>
      <text x="30" y="38" class="header-title" fill="white">${title}</text>
      <circle cx="${width - 100}" cy="30" r="20" fill="white" opacity="0.2"/>
      <text x="${width - 100}" y="35" class="header-icon" fill="white" text-anchor="middle">⚙️</text>
    </g>`;
  }

  private renderPage(page: DashboardPage, colors: any): string {
    return `
    <g id="page" transform="translate(0, 80)">
      ${page.visuals.map(v => this.renderVisual(v, colors)).join('\n')}
    </g>`;
  }

  private renderVisual(visual: DashboardVisual, colors: any): string {
    const { x, y, width, height } = visual.position;

    const visualRenderers: Record<VisualType, (v: DashboardVisual, c: any) => string> = {
      card: this.renderCard.bind(this),
      kpi: this.renderKPI.bind(this),
      'bar-chart': this.renderBarChart.bind(this),
      'line-chart': this.renderLineChart.bind(this),
      'pie-chart': this.renderPieChart.bind(this),
      'donut-chart': this.renderDonutChart.bind(this),
      table: this.renderTable.bind(this),
      matrix: this.renderMatrix.bind(this),
      map: this.renderMap.bind(this),
      gauge: this.renderGauge.bind(this),
      waterfall: this.renderWaterfall.bind(this),
      funnel: this.renderFunnel.bind(this),
      treemap: this.renderTreemap.bind(this),
      scatter: this.renderScatter.bind(this),
      ribbon: this.renderRibbon.bind(this),
      'area-chart': this.renderAreaChart.bind(this),
      'combo-chart': this.renderComboChart.bind(this),
      slicer: this.renderSlicer.bind(this),
      filter: this.renderFilter.bind(this),
    };

    const renderer = visualRenderers[visual.type];
    const content = renderer ? renderer(visual, colors) : '';

    return `
    <g class="visual" transform="translate(${x}, ${y})">
      <!-- Visual Container -->
      <rect width="${width}" height="${height}" 
            fill="${colors.card}" 
            stroke="${colors.secondary}" 
            stroke-width="1" 
            rx="4"
            filter="url(#visual-shadow)"/>
      
      <!-- Title -->
      <text x="15" y="25" class="visual-title">${visual.title}</text>
      
      <!-- Content -->
      <g transform="translate(0, 40)">
        ${content}
      </g>

      <!-- Interactivity indicators -->
      ${visual.interactivity?.drillthrough ? `
      <circle cx="${width - 20}" cy="20" r="8" fill="${colors.accent}" opacity="0.3"/>
      <text x="${width - 20}" y="24" font-size="10" text-anchor="middle">⬇</text>
      ` : ''}
    </g>`;
  }

  private renderCard(visual: DashboardVisual, colors: any): string {
    const { width, height } = visual.position;
    const value = visual.data?.value || '0';
    const trend = visual.data?.trend;
    const trendValue = visual.data?.trendValue;

    return `
    <text x="${width / 2}" y="${height / 2 - 20}" class="card-value" text-anchor="middle">
      ${value}
    </text>
    ${trend ? `
    <g transform="translate(${width / 2 - 40}, ${height / 2 + 20})">
      <path d="${trend === 'up' ? 'M 0,10 L 10,0 L 20,10' : 'M 0,0 L 10,10 L 20,0'}" 
            stroke="${trend === 'up' ? '#107C10' : '#E74856'}" 
            stroke-width="3" 
            fill="none"/>
      <text x="30" y="10" font-size="16" fill="${trend === 'up' ? '#107C10' : '#E74856'}">
        ${trendValue || ''}
      </text>
    </g>` : ''}`;
  }

  private renderKPI(visual: DashboardVisual, colors: any): string {
    const { width, height } = visual.position;
    const value = visual.data?.value || '0';
    const trend = visual.data?.trend;
    
    return `
    <text x="${width / 2}" y="${height / 3}" class="kpi-value" text-anchor="middle" fill="${colors.accent}">
      ${value}
    </text>
    <text x="${width / 2}" y="${height / 3 + 40}" class="kpi-label" text-anchor="middle">
      vs Previous Period
    </text>
    ${trend ? `
    <rect x="${width / 2 - 60}" y="${height / 2 + 20}" width="120" height="30" 
          fill="${trend === 'up' ? '#107C10' : '#E74856'}" opacity="0.1" rx="4"/>
    <text x="${width / 2}" y="${height / 2 + 40}" text-anchor="middle" 
          fill="${trend === 'up' ? '#107C10' : '#E74856'}" font-weight="bold">
      ${trend === 'up' ? '▲' : '▼'} ${visual.data?.trendValue || ''}
    </text>` : ''}`;
  }

  private renderBarChart(visual: DashboardVisual, colors: any): string {
    const { width, height } = visual.position;
    const values = visual.data?.values || [65, 45, 80, 55, 70];
    const labels = visual.data?.labels || ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'];
    const max = Math.max(...values);
    const barWidth = (width - 60) / values.length - 10;
    const chartHeight = height - 80;

    return `
    <!-- Bars -->
    ${values.map((val, i) => {
      const barHeight = (val / max) * chartHeight;
      const x = 30 + i * (barWidth + 10);
      const y = chartHeight - barHeight;
      return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" 
            fill="${colors.accent}" opacity="0.8" rx="2">
        <animate attributeName="height" from="0" to="${barHeight}" dur="0.5s" begin="${i * 0.1}s" fill="freeze"/>
        <animate attributeName="y" from="${chartHeight}" to="${y}" dur="0.5s" begin="${i * 0.1}s" fill="freeze"/>
      </rect>
      <text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-size="12">${val}</text>
      <text x="${x + barWidth / 2}" y="${chartHeight + 20}" text-anchor="middle" font-size="11">${labels[i]}</text>`;
    }).join('\n')}
    
    <!-- Y-axis -->
    <line x1="20" y1="0" x2="20" y2="${chartHeight}" stroke="${colors.secondary}" stroke-width="1"/>
    <line x1="20" y1="${chartHeight}" x2="${width - 20}" y2="${chartHeight}" stroke="${colors.secondary}" stroke-width="1"/>`;
  }

  private renderLineChart(visual: DashboardVisual, colors: any): string {
    const { width, height } = visual.position;
    const values = visual.data?.values || [30, 45, 35, 60, 55, 70, 65];
    const labels = visual.data?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    const max = Math.max(...values);
    const chartHeight = height - 80;
    const stepX = (width - 60) / (values.length - 1);

    const points = values.map((val, i) => {
      const x = 30 + i * stepX;
      const y = chartHeight - (val / max) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

    const areaPoints = `30,${chartHeight} ${points} ${30 + (values.length - 1) * stepX},${chartHeight}`;

    return `
    <!-- Area fill -->
    <polygon points="${areaPoints}" fill="${colors.accent}" opacity="0.2"/>
    
    <!-- Line -->
    <polyline points="${points}" 
              fill="none" 
              stroke="${colors.accent}" 
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"/>
    
    <!-- Data points -->
    ${values.map((val, i) => {
      const x = 30 + i * stepX;
      const y = chartHeight - (val / max) * chartHeight;
      return `
      <circle cx="${x}" cy="${y}" r="4" fill="${colors.accent}"/>
      <text x="${x}" y="${chartHeight + 20}" text-anchor="middle" font-size="11">${labels[i]}</text>`;
    }).join('\n')}
    
    <!-- Axes -->
    <line x1="20" y1="0" x2="20" y2="${chartHeight}" stroke="${colors.secondary}"/>
    <line x1="20" y1="${chartHeight}" x2="${width - 20}" y2="${chartHeight}" stroke="${colors.secondary}"/>`;
  }

  private renderPieChart(visual: DashboardVisual, colors: any): string {
    const { width, height } = visual.position;
    const values = visual.data?.values || [30, 25, 20, 15, 10];
    const labels = visual.data?.labels || ['A', 'B', 'C', 'D', 'E'];
    const total = values.reduce((a, b) => a + b, 0);
    const cx = width / 2;
    const cy = height / 2 - 20;
    const radius = Math.min(width, height) / 3;

    const pieColors = ['#0078D4', '#00BCF2', '#00B7C3', '#107C10', '#FFB900'];
    let currentAngle = -90;

    return `
    ${values.map((val, i) => {
      const angle = (val / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const start = this.polarToCartesian(cx, cy, radius, startAngle);
      const end = this.polarToCartesian(cx, cy, radius, endAngle);
      const largeArc = angle > 180 ? 1 : 0;

      const path = `M ${cx},${cy} L ${start.x},${start.y} A ${radius},${radius} 0 ${largeArc},1 ${end.x},${end.y} Z`;
      
      return `
      <path d="${path}" fill="${pieColors[i % pieColors.length]}" opacity="0.9" stroke="white" stroke-width="2"/>
      <text x="${width - 100}" y="${30 + i * 25}" font-size="12">
        <tspan fill="${pieColors[i % pieColors.length]}">●</tspan> ${labels[i]}: ${((val/total)*100).toFixed(1)}%
      </text>`;
    }).join('\n')}`;
  }

  private renderDonutChart(visual: DashboardVisual, colors: any): string {
    const pieChart = this.renderPieChart(visual, colors);
    const { width, height } = visual.position;
    const cx = width / 2;
    const cy = height / 2 - 20;
    const innerRadius = Math.min(width, height) / 6;

    return `
    ${pieChart}
    <circle cx="${cx}" cy="${cy}" r="${innerRadius}" fill="${colors.card}"/>
    <text x="${cx}" y="${cy}" text-anchor="middle" font-size="32" font-weight="bold" fill="${colors.accent}">
      100%
    </text>`;
  }

  private renderTable(visual: DashboardVisual, colors: any): string {
    const { width, height } = visual.position;
    const rows = 5;
    const rowHeight = (height - 40) / rows;

    return `
    <rect width="${width - 20}" height="30" fill="${colors.accent}" opacity="0.1"/>
    ${Array.from({ length: rows }, (_, i) => `
      <rect y="${i * rowHeight + 30}" width="${width - 20}" height="1" fill="${colors.secondary}" opacity="0.2"/>
      <text x="15" y="${i * rowHeight + 50}" font-size="12">Row ${i + 1} Data</text>
    `).join('\n')}`;
  }

  private renderMatrix(visual: DashboardVisual, colors: any): string {
    return this.renderTable(visual, colors);
  }

  private renderMap(visual: DashboardVisual, colors: any): string {
    const { width, height } = visual.position;
    return `
    <rect width="${width - 20}" height="${height - 40}" fill="${colors.secondary}" opacity="0.1" rx="4"/>
    <circle cx="${width / 2}" cy="${height / 2}" r="30" fill="${colors.accent}" opacity="0.3"/>
    <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-size="14">🗺️</text>
    <text x="${width / 2}" y="${height / 2 + 50}" text-anchor="middle" font-size="12">Geographic Data</text>`;
  }

  private renderGauge(visual: DashboardVisual, colors: any): string {
    const { width, height } = visual.position;
    const value = 75; // Example value
    const cx = width / 2;
    const cy = height / 2 + 20;
    const radius = Math.min(width, height) / 3;

    return `
    <!-- Gauge background -->
    <path d="${this.describeArc(cx, cy, radius, -90, 90)}" 
          fill="none" stroke="${colors.secondary}" stroke-width="20" opacity="0.2"/>
    <!-- Gauge value -->
    <path d="${this.describeArc(cx, cy, radius, -90, -90 + (180 * value / 100))}" 
          fill="none" stroke="${colors.accent}" stroke-width="20"/>
    <!-- Value text -->
    <text x="${cx}" y="${cy}" text-anchor="middle" font-size="36" font-weight="bold">${value}%</text>`;
  }

  private renderWaterfall(visual: DashboardVisual, colors: any): string {
    return this.renderBarChart(visual, colors);
  }

  private renderFunnel(visual: DashboardVisual, colors: any): string {
    const { width, height } = visual.position;
    const stages = ['Leads', 'Qualified', 'Proposal', 'Negotiation', 'Closed'];
    const values = [100, 70, 45, 30, 20];

    return `
    ${stages.map((stage, i) => {
      const stageWidth = (values[i] / 100) * (width - 40);
      const x = (width - stageWidth) / 2;
      const y = i * ((height - 40) / stages.length);
      return `
      <rect x="${x}" y="${y}" width="${stageWidth}" height="35" 
            fill="${this.COLORS.light.accent}" opacity="${1 - i * 0.15}" rx="4"/>
      <text x="${width / 2}" y="${y + 22}" text-anchor="middle" font-weight="bold">
        ${stage}: ${values[i]}%
      </text>`;
    }).join('\n')}`;
  }

  private renderTreemap(visual: DashboardVisual, colors: any): string {
    const { width, height } = visual.position;
    return `
    <rect x="10" y="0" width="${width / 2 - 20}" height="${height / 2 - 20}" fill="${colors.accent}" opacity="0.7" rx="4"/>
    <rect x="${width / 2}" y="0" width="${width / 2 - 20}" height="${height / 2 - 20}" fill="${colors.accent}" opacity="0.5" rx="4"/>
    <rect x="10" y="${height / 2}" width="${width / 2 - 20}" height="${height / 2 - 20}" fill="${colors.accent}" opacity="0.3" rx="4"/>
    <rect x="${width / 2}" y="${height / 2}" width="${width / 2 - 20}" height="${height / 2 - 20}" fill="${colors.accent}" opacity="0.2" rx="4"/>`;
  }

  private renderScatter(visual: DashboardVisual, colors: any): string {
    const { width, height } = visual.position;
    const chartHeight = height - 60;
    
    return `
    ${Array.from({ length: 30 }, () => ({
      x: 30 + Math.random() * (width - 60),
      y: Math.random() * chartHeight,
    })).map(point => `
      <circle cx="${point.x}" cy="${point.y}" r="4" fill="${colors.accent}" opacity="0.6"/>
    `).join('\n')}
    <line x1="20" y1="0" x2="20" y2="${chartHeight}" stroke="${colors.secondary}"/>
    <line x1="20" y1="${chartHeight}" x2="${width - 20}" y2="${chartHeight}" stroke="${colors.secondary}"/>`;
  }

  private renderRibbon(visual: DashboardVisual, colors: any): string {
    return this.renderLineChart(visual, colors);
  }

  private renderAreaChart(visual: DashboardVisual, colors: any): string {
    return this.renderLineChart(visual, colors);
  }

  private renderComboChart(visual: DashboardVisual, colors: any): string {
    return this.renderBarChart(visual, colors);
  }

  private renderSlicer(visual: DashboardVisual, colors: any): string {
    const { width } = visual.position;
    const options = visual.data?.labels || ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
    
    return `
    ${options.map((opt, i) => `
      <rect x="10" y="${i * 35}" width="20" height="20" fill="white" stroke="${colors.accent}" rx="2"/>
      <text x="40" y="${i * 35 + 15}" font-size="13">${opt}</text>
    `).join('\n')}`;
  }

  private renderFilter(visual: DashboardVisual, colors: any): string {
    return this.renderSlicer(visual, colors);
  }

  private polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  private describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
    const start = this.polarToCartesian(cx, cy, radius, endAngle);
    const end = this.polarToCartesian(cx, cy, radius, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  }

  private generateDefs(): string {
    return `
    <filter id="visual-shadow">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
      <feOffset dx="0" dy="2"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.15"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;
  }

  private generateStyles(colors: any): string {
    return `
    .header-title { font: bold 24px 'Segoe UI'; }
    .header-icon { font: 16px 'Segoe UI'; }
    .visual-title { font: 600 14px 'Segoe UI'; fill: ${colors.text}; }
    .card-value { font: bold 48px 'Segoe UI'; fill: ${colors.accent}; }
    .kpi-value { font: bold 42px 'Segoe UI'; }
    .kpi-label { font: 14px 'Segoe UI'; fill: ${colors.secondary}; }
    .footer-text { font: 11px 'Segoe UI'; fill: ${colors.secondary}; }`;
  }

  /**
   * Create Executive Dashboard
   */
  createExecutiveDashboard(): DashboardMockup {
    return {
      name: 'Executive Dashboard',
      theme: 'corporate',
      description: 'High-level KPIs and trends for executives',
      pages: [{
        name: 'Overview',
        layout: 'wide',
        visuals: [
          { id: 'rev', type: 'kpi', title: 'Total Revenue', position: { x: 20, y: 20, width: 300, height: 180 },
            data: { value: '$12.4M', trend: 'up', trendValue: '+15%' } },
          { id: 'cust', type: 'kpi', title: 'Active Customers', position: { x: 340, y: 20, width: 300, height: 180 },
            data: { value: '24,567', trend: 'up', trendValue: '+8%' } },
          { id: 'margin', type: 'kpi', title: 'Profit Margin', position: { x: 660, y: 20, width: 300, height: 180 },
            data: { value: '32%', trend: 'down', trendValue: '-2%' } },
          { id: 'sat', type: 'gauge', title: 'Customer Satisfaction', position: { x: 980, y: 20, width: 300, height: 180 } },
          
          { id: 'trend', type: 'line-chart', title: 'Revenue Trend (Last 12 Months)', position: { x: 20, y: 220, width: 850, height: 300 } },
          { id: 'cat', type: 'bar-chart', title: 'Revenue by Category', position: { x: 890, y: 220, width: 390, height: 300 } },
          
          { id: 'region', type: 'pie-chart', title: 'Sales by Region', position: { x: 20, y: 540, width: 400, height: 300 } },
          { id: 'funnel', type: 'funnel', title: 'Sales Funnel', position: { x: 440, y: 540, width: 400, height: 300 } },
          { id: 'map', type: 'map', title: 'Geographic Distribution', position: { x: 860, y: 540, width: 420, height: 300 } },
        ],
      }],
    };
  }

  /**
   * Create Healthcare Clinical Dashboard
   */
  createHealthcareDashboard(): DashboardMockup {
    return {
      name: 'Clinical Operations Dashboard',
      theme: 'light',
      description: 'Hospital operations and patient metrics',
      pages: [{
        name: 'Clinical Metrics',
        layout: 'wide',
        visuals: [
          { id: 'admit', type: 'card', title: 'Daily Admissions', position: { x: 20, y: 20, width: 250, height: 150 },
            data: { value: '142', trend: 'up', trendValue: '+12' } },
          { id: 'bed', type: 'card', title: 'Bed Occupancy', position: { x: 290, y: 20, width: 250, height: 150 },
            data: { value: '87%', trend: 'neutral' } },
          { id: 'wait', type: 'card', title: 'Avg Wait Time (min)', position: { x: 560, y: 20, width: 250, height: 150 },
            data: { value: '18', trend: 'down', trendValue: '-5' } },
          { id: 'score', type: 'gauge', title: 'Patient Satisfaction', position: { x: 830, y: 20, width: 250, height: 150 } },
          
          { id: 'dept', type: 'bar-chart', title: 'Admissions by Department', position: { x: 20, y: 190, width: 520, height: 320 } },
          { id: 'los', type: 'line-chart', title: 'Average Length of Stay (Days)', position: { x: 560, y: 190, width: 520, height: 320 } },
          
          { id: 'qual', type: 'table', title: 'Quality Metrics', position: { x: 20, y: 530, width: 520, height: 280 } },
          { id: 'alerts', type: 'table', title: 'Clinical Alerts', position: { x: 560, y: 530, width: 520, height: 280 } },
        ],
      }],
    };
  }

  /**
   * Create Financial Analytics Dashboard
   */
  createFinancialDashboard(): DashboardMockup {
    return {
      name: 'Financial Analytics',
      theme: 'dark',
      description: 'Financial performance and forecasting',
      pages: [{
        name: 'Financial Overview',
        layout: 'wide',
        visuals: [
          { id: 'rev', type: 'kpi', title: 'Total Revenue', position: { x: 20, y: 20, width: 280, height: 170 },
            data: { value: '$24.8M', trend: 'up', trendValue: '+18%' } },
          { id: 'exp', type: 'kpi', title: 'Total Expenses', position: { x: 320, y: 20, width: 280, height: 170 },
            data: { value: '$18.2M', trend: 'up', trendValue: '+5%' } },
          { id: 'profit', type: 'kpi', title: 'Net Profit', position: { x: 620, y: 20, width: 280, height: 170 },
            data: { value: '$6.6M', trend: 'up', trendValue: '+42%' } },
          { id: 'cash', type: 'gauge', title: 'Cash Flow Health', position: { x: 920, y: 20, width: 280, height: 170 } },
          
          { id: 'water', type: 'waterfall', title: 'P&L Waterfall', position: { x: 20, y: 210, width: 580, height: 320 } },
          { id: 'trend', type: 'combo-chart', title: 'Revenue vs Forecast', position: { x: 620, y: 210, width: 580, height: 320 } },
          
          { id: 'cat', type: 'treemap', title: 'Expense Categories', position: { x: 20, y: 550, width: 390, height: 280 } },
          { id: 'ar', type: 'donut-chart', title: 'Accounts Receivable Aging', position: { x: 430, y: 550, width: 390, height: 280 } },
          { id: 'kpis', type: 'table', title: 'Key Financial Ratios', position: { x: 840, y: 550, width: 360, height: 280 } },
        ],
      }],
    };
  }

  /**
   * Create Retail Sales Dashboard
   */
  createRetailDashboard(): DashboardMockup {
    return {
      name: 'Retail Sales Dashboard',
      theme: 'modern',
      description: 'Retail operations and sales performance',
      pages: [{
        name: 'Sales Performance',
        layout: 'wide',
        visuals: [
          { id: 'sales', type: 'card', title: "Today's Sales", position: { x: 20, y: 20, width: 230, height: 140 },
            data: { value: '$48.2K', trend: 'up', trendValue: '+23%' } },
          { id: 'trans', type: 'card', title: 'Transactions', position: { x: 270, y: 20, width: 230, height: 140 },
            data: { value: '1,247', trend: 'up', trendValue: '+15%' } },
          { id: 'aov', type: 'card', title: 'Avg Order Value', position: { x: 520, y: 20, width: 230, height: 140 },
            data: { value: '$38.65', trend: 'up', trendValue: '+8%' } },
          { id: 'conv', type: 'card', title: 'Conversion Rate', position: { x: 770, y: 20, width: 230, height: 140 },
            data: { value: '3.2%', trend: 'down', trendValue: '-0.3%' } },
          
          { id: 'hourly', type: 'line-chart', title: 'Hourly Sales Trend', position: { x: 20, y: 180, width: 620, height: 300 } },
          { id: 'cat', type: 'bar-chart', title: 'Top Categories', position: { x: 660, y: 180, width: 340, height: 300 } },
          
          { id: 'prod', type: 'table', title: 'Top Products', position: { x: 20, y: 500, width: 480, height: 280 } },
          { id: 'store', type: 'bar-chart', title: 'Sales by Store', position: { x: 520, y: 500, width: 480, height: 280 } },
        ],
      }],
    };
  }

  /**
   * Create Data Quality Dashboard
   */
  createDataQualityDashboard(): DashboardMockup {
    return {
      name: 'Data Quality Monitoring',
      theme: 'light',
      description: 'Data quality metrics and anomaly detection',
      pages: [{
        name: 'Quality Metrics',
        layout: 'wide',
        visuals: [
          { id: 'score', type: 'gauge', title: 'Overall Quality Score', position: { x: 20, y: 20, width: 300, height: 180 } },
          { id: 'complete', type: 'kpi', title: 'Completeness', position: { x: 340, y: 20, width: 250, height: 180 },
            data: { value: '96%', trend: 'up', trendValue: '+2%' } },
          { id: 'accurate', type: 'kpi', title: 'Accuracy', position: { x: 610, y: 20, width: 250, height: 180 },
            data: { value: '94%', trend: 'neutral' } },
          { id: 'timely', type: 'kpi', title: 'Timeliness', position: { x: 880, y: 20, width: 250, height: 180 },
            data: { value: '98%', trend: 'up', trendValue: '+1%' } },
          
          { id: 'trend', type: 'line-chart', title: 'Quality Trend (30 Days)', position: { x: 20, y: 220, width: 740, height: 300 } },
          { id: 'issues', type: 'pie-chart', title: 'Issues by Type', position: { x: 780, y: 220, width: 350, height: 300 } },
          
          { id: 'tables', type: 'table', title: 'Table-Level Metrics', position: { x: 20, y: 540, width: 740, height: 280 } },
          { id: 'alerts', type: 'table', title: 'Active Alerts', position: { x: 780, y: 540, width: 350, height: 280 } },
        ],
      }],
    };
  }

  /**
   * Create Real-Time Operations Dashboard
   */
  createRealTimeDashboard(): DashboardMockup {
    return {
      name: 'Real-Time Operations',
      theme: 'dark',
      description: 'Live operational monitoring',
      pages: [{
        name: 'Live Metrics',
        layout: 'wide',
        visuals: [
          { id: 'events', type: 'card', title: 'Events/Sec', position: { x: 20, y: 20, width: 200, height: 130 },
            data: { value: '8,547', trend: 'up' } },
          { id: 'latency', type: 'card', title: 'Avg Latency (ms)', position: { x: 240, y: 20, width: 200, height: 130 },
            data: { value: '23', trend: 'down' } },
          { id: 'errors', type: 'card', title: 'Error Rate', position: { x: 460, y: 20, width: 200, height: 130 },
            data: { value: '0.02%', trend: 'neutral' } },
          { id: 'uptime', type: 'card', title: 'Uptime', position: { x: 680, y: 20, width: 200, height: 130 },
            data: { value: '99.9%', trend: 'up' } },
          
          { id: 'stream', type: 'line-chart', title: 'Event Stream (Last Hour)', position: { x: 20, y: 170, width: 860, height: 280 } },
          
          { id: 'geo', type: 'map', title: 'Geographic Activity', position: { x: 20, y: 470, width: 430, height: 300 } },
          { id: 'status', type: 'table', title: 'Service Status', position: { x: 470, y: 470, width: 410, height: 300 } },
        ],
      }],
    };
  }
}
