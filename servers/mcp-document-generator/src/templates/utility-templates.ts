/**
 * Complete Utility Suite
 * Gantt Charts, Mindmaps, Azure Cost Analysis, Data Quality, Compliance, API Docs
 */

import { XlsxExporter, ExcelSheet } from '../exporters/multi-format-exporters';
import { DocxExporter, DocxSection } from '../exporters/docx-exporter';

// ============================================================================
// GANTT CHART GENERATOR
// ============================================================================

export interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies?: string[];
  assignee?: string;
  milestone?: boolean;
}

export class GanttChartGenerator {
  generate(tasks: GanttTask[], width: number = 1400, height: number = 600): string {
    const timelineStart = new Date(Math.min(...tasks.map(t => t.start.getTime())));
    const timelineEnd = new Date(Math.max(...tasks.map(t => t.end.getTime())));
    const totalDays = Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
    
    const chartWidth = width - 300;
    const rowHeight = 40;
    const chartHeight = tasks.length * rowHeight + 100;

    return `
<svg width="${width}" height="${chartHeight}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .task-name { font: 13px 'Segoe UI'; fill: #333; }
    .task-bar { opacity: 0.8; }
    .milestone { fill: #FFB900; }
    .timeline-label { font: 11px 'Segoe UI'; fill: #666; }
  </style>

  <!-- Background -->
  <rect width="${width}" height="${chartHeight}" fill="#FAFAFA"/>

  <!-- Title -->
  <text x="${width / 2}" y="30" font-size="20" font-weight="bold" text-anchor="middle">Project Timeline</text>

  <!-- Timeline Header -->
  <g id="timeline-header" transform="translate(300, 60)">
    ${this.renderTimelineHeader(timelineStart, timelineEnd, chartWidth, totalDays)}
  </g>

  <!-- Task List -->
  <g id="task-list" transform="translate(0, 100)">
    ${tasks.map((task, i) => `
      <g transform="translate(0, ${i * rowHeight})">
        <!-- Task name -->
        <rect width="280" height="${rowHeight - 2}" fill="white" stroke="#DDD"/>
        <text x="10" y="${rowHeight / 2 + 5}" class="task-name">${task.name}</text>
        
        <!-- Task bar -->
        <g transform="translate(300, 0)">
          ${this.renderTaskBar(task, timelineStart, totalDays, chartWidth, rowHeight)}
        </g>
      </g>
    `).join('\n')}
  </g>

  <!-- Today line -->
  ${this.renderTodayLine(timelineStart, totalDays, chartWidth, tasks.length * rowHeight)}
</svg>`;
  }

  private renderTimelineHeader(start: Date, end: Date, width: number, totalDays: number): string {
    const months: string[] = [];
    let current = new Date(start);
    
    while (current <= end) {
      months.push(current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
      current.setMonth(current.getMonth() + 1);
    }

    const monthWidth = width / months.length;

    return `
      <rect width="${width}" height="40" fill="#0078D4" opacity="0.1"/>
      ${months.map((month, i) => `
        <text x="${i * monthWidth + monthWidth / 2}" y="25" class="timeline-label" text-anchor="middle">
          ${month}
        </text>
        <line x1="${i * monthWidth}" y1="0" x2="${i * monthWidth}" y2="40" stroke="#CCC"/>
      `).join('\n')}
    `;
  }

  private renderTaskBar(task: GanttTask, timelineStart: Date, totalDays: number, chartWidth: number, rowHeight: number): string {
    if (task.milestone) {
      const days = Math.ceil((task.start.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
      const x = (days / totalDays) * chartWidth;
      return `<polygon points="${x},${rowHeight/2-8} ${x+8},${rowHeight/2} ${x},${rowHeight/2+8} ${x-8},${rowHeight/2}" 
                       class="milestone"/>`;
    }

    const startDays = Math.ceil((task.start.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24));
    
    const x = (startDays / totalDays) * chartWidth;
    const barWidth = (duration / totalDays) * chartWidth;
    const barHeight = rowHeight - 16;

    return `
      <!-- Background bar -->
      <rect x="${x}" y="8" width="${barWidth}" height="${barHeight}" 
            fill="#E0E0E0" rx="4" class="task-bar"/>
      
      <!-- Progress bar -->
      <rect x="${x}" y="8" width="${barWidth * (task.progress / 100)}" height="${barHeight}" 
            fill="#0078D4" rx="4" class="task-bar"/>
      
      <!-- Progress text -->
      <text x="${x + barWidth / 2}" y="${rowHeight / 2 + 4}" 
            font-size="11" fill="white" text-anchor="middle">
        ${task.progress}%
      </text>
    `;
  }

  private renderTodayLine(timelineStart: Date, totalDays: number, width: number, height: number): string {
    const today = new Date();
    const days = Math.ceil((today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
    const x = 300 + (days / totalDays) * width;

    return `
      <line x1="${x}" y1="100" x2="${x}" y2="${100 + height}" 
            stroke="#E74856" stroke-width="2" stroke-dasharray="5,5"/>
      <text x="${x + 5}" y="95" font-size="11" fill="#E74856">Today</text>
    `;
  }
}

// ============================================================================
// MINDMAP GENERATOR
// ============================================================================

export interface MindMapNode {
  id: string;
  text: string;
  children?: MindMapNode[];
  level?: number;
}

export class MindMapGenerator {
  generate(root: MindMapNode): string {
    const width = 1200;
    const height = 800;

    return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .node-text { font: 13px 'Segoe UI'; fill: white; }
    .node-rect { filter: url(#shadow); }
  </style>

  <defs>
    <filter id="shadow">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
      <feOffset dx="1" dy="1"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#F8F8F8"/>

  <!-- Mindmap -->
  ${this.renderNode(root, width / 2, height / 2, 0)}
</svg>`;
  }

  private renderNode(node: MindMapNode, x: number, y: number, level: number): string {
    const colors = ['#0078D4', '#00BCF2', '#00B7C3', '#107C10', '#FFB900', '#FF8C00'];
    const color = colors[level % colors.length];
    const width = level === 0 ? 200 : 150;
    const height = 50;

    let result = `
      <g transform="translate(${x - width / 2}, ${y - height / 2})">
        <rect width="${width}" height="${height}" fill="${color}" rx="8" class="node-rect"/>
        <text x="${width / 2}" y="${height / 2 + 5}" text-anchor="middle" class="node-text">
          ${node.text}
        </text>
      </g>
    `;

    if (node.children && node.children.length > 0) {
      const angleStep = (2 * Math.PI) / node.children.length;
      const radius = level === 0 ? 200 : 150;

      node.children.forEach((child, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const childX = x + radius * Math.cos(angle);
        const childY = y + radius * Math.sin(angle);

        result += `<line x1="${x}" y1="${y}" x2="${childX}" y2="${childY}" stroke="${color}" stroke-width="2"/>`;
        result += this.renderNode(child, childX, childY, level + 1);
      });
    }

    return result;
  }
}

// ============================================================================
// AZURE COST ANALYSIS TEMPLATES
// ============================================================================

export class AzureCostTemplates {
  private exporter: XlsxExporter;

  constructor() {
    this.exporter = new XlsxExporter();
  }

  /**
   * Create Fabric Capacity Cost Analysis
   */
  async createFabricCostAnalysis(outputPath: string): Promise<void> {
    const sheets: ExcelSheet[] = [
      {
        name: 'Capacity Costs',
        headers: ['SKU', 'Capacity Units', 'Monthly Cost', 'Annual Cost', 'Usage %', 'Recommendation'],
        data: [
          ['F2', '2', '$262', '$3,144', '45%', 'Right-sized'],
          ['F4', '4', '$524', '$6,288', '78%', 'Consider F8'],
          ['F8', '8', '$1,048', '$12,576', '92%', 'Near capacity'],
          ['F64', '64', '$8,384', '$100,608', '65%', 'Optimize workloads'],
          ['F128', '128', '$16,768', '$201,216', '42%', 'Consider F64'],
        ],
        formatting: {
          headerBold: true,
          headerColor: 'FF0078D4',
          alternateRows: true,
          autoFilter: true,
        },
      },
      {
        name: 'Workload Breakdown',
        headers: ['Workload', 'Type', 'CU Consumption', 'Est. Monthly Cost', 'Peak Hours', 'Optimization'],
        data: [
          ['Sales Analytics', 'Warehouse', '12.5', '$1,600', '8am-6pm', 'Schedule off-peak'],
          ['Customer 360', 'Lakehouse', '8.2', '$1,050', '24/7', 'Optimize queries'],
          ['Real-time Dashboard', 'KQL Database', '15.3', '$1,960', '9am-5pm', 'Consider caching'],
          ['ML Training', 'Notebook', '22.8', '$2,920', 'Nights', 'Well optimized'],
          ['Data Pipeline', 'Pipeline', '6.4', '$820', '2am-4am', 'Efficient'],
        ],
        formatting: {
          headerBold: true,
          headerColor: 'FF00BCF2',
          alternateRows: true,
        },
      },
      {
        name: 'Cost Projection',
        headers: ['Month', 'Actual', 'Forecast', 'Budget', 'Variance', 'Status'],
        data: [
          ['Jan 2024', '$8,200', '', '$10,000', '+$1,800', 'Under'],
          ['Feb 2024', '$8,450', '', '$10,000', '+$1,550', 'Under'],
          ['Mar 2024', '$9,100', '', '$10,000', '+$900', 'Under'],
          ['Apr 2024', '$9,800', '', '$10,000', '+$200', 'Under'],
          ['May 2024', '', '$10,200', '$10,000', '-$200', 'Over'],
          ['Jun 2024', '', '$10,500', '$10,000', '-$500', 'Over'],
        ],
        formatting: {
          headerBold: true,
          headerColor: 'FFFF8C00',
          alternateRows: true,
        },
      },
      {
        name: 'ROI Calculator',
        headers: ['Metric', 'Before Fabric', 'After Fabric', 'Improvement', 'Annual Savings'],
        data: [
          ['Data Processing Time', '12 hours', '2 hours', '83%', '$120,000'],
          ['Infrastructure Cost', '$150K/year', '$100K/year', '33%', '$50,000'],
          ['Analyst Productivity', '40 hrs/week', '50 hrs/week', '25%', '$80,000'],
          ['Report Delivery Time', '3 days', '4 hours', '92%', '$60,000'],
          ['Total Savings', '', '', '', '$310,000'],
        ],
        formatting: {
          headerBold: true,
          headerColor: 'FF107C10',
          alternateRows: true,
        },
      },
    ];

    await this.exporter.create(sheets, outputPath);
  }

  /**
   * Create Azure Services Cost Breakdown
   */
  async createAzureCostBreakdown(outputPath: string): Promise<void> {
    const sheets: ExcelSheet[] = [
      {
        name: 'Service Costs',
        headers: ['Service', 'Resource Group', 'Monthly Cost', 'Tags', 'Owner', 'Action'],
        data: [
          ['Fabric Capacity F64', 'prod-fabric-rg', '$8,384', 'prod,analytics', 'Data Team', 'Review'],
          ['Azure SQL Database', 'prod-sql-rg', '$1,200', 'prod,database', 'DBA Team', 'Optimize'],
          ['Storage Account', 'prod-storage-rg', '$450', 'prod,storage', 'DevOps', 'Archive old data'],
          ['Virtual Machines', 'prod-compute-rg', '$890', 'prod,compute', 'DevOps', 'Rightsize'],
          ['Azure Synapse', 'prod-synapse-rg', '$2,100', 'prod,analytics', 'Data Team', 'Migrate to Fabric'],
        ],
        formatting: {
          headerBold: true,
          headerColor: 'FF0078D4',
          alternateRows: true,
          autoFilter: true,
        },
      },
    ];

    await this.exporter.create(sheets, outputPath);
  }
}

// ============================================================================
// DATA QUALITY TEMPLATES
// ============================================================================

export class DataQualityTemplates {
  private exporter: XlsxExporter;

  constructor() {
    this.exporter = new XlsxExporter();
  }

  /**
   * Create Data Quality Dashboard
   */
  async createQualityDashboard(outputPath: string): Promise<void> {
    const sheets: ExcelSheet[] = [
      {
        name: 'Quality Metrics',
        headers: ['Table', 'Completeness', 'Accuracy', 'Consistency', 'Timeliness', 'Overall Score', 'Status'],
        data: [
          ['dim_customer', '98%', '95%', '97%', '99%', '97%', '✓ Pass'],
          ['fact_sales', '99%', '96%', '98%', '100%', '98%', '✓ Pass'],
          ['dim_product', '92%', '88%', '90%', '95%', '91%', '⚠ Warning'],
          ['fact_inventory', '85%', '82%', '87%', '92%', '87%', '✗ Fail'],
          ['dim_location', '96%', '94%', '95%', '98%', '96%', '✓ Pass'],
        ],
        formatting: {
          headerBold: true,
          headerColor: 'FF107C10',
          alternateRows: true,
          autoFilter: true,
        },
      },
      {
        name: 'Data Profiling',
        headers: ['Column', 'Data Type', 'Nulls', 'Distinct Values', 'Min', 'Max', 'Issues'],
        data: [
          ['customer_id', 'INT', '0%', '24,567', '1', '24567', 'None'],
          ['email', 'VARCHAR', '2%', '24,123', 'N/A', 'N/A', '444 invalid formats'],
          ['phone', 'VARCHAR', '5%', '22,890', 'N/A', 'N/A', '1,677 missing area codes'],
          ['zipcode', 'VARCHAR', '1%', '8,234', '00501', '99950', '120 invalid'],
          ['created_date', 'DATE', '0%', '1,234', '2020-01-01', '2024-03-15', 'None'],
        ],
        formatting: {
          headerBold: true,
          headerColor: 'FF00BCF2',
          alternateRows: true,
        },
      },
      {
        name: 'Data Lineage',
        headers: ['Source System', 'Source Table', 'Transform', 'Target Table', 'Last Load', 'Row Count'],
        data: [
          ['ERP System', 'sales_orders', 'Clean + Enrich', 'fact_sales', '2024-03-15 02:00', '1,245,678'],
          ['CRM System', 'customers', 'Deduplicate', 'dim_customer', '2024-03-15 01:30', '24,567'],
          ['Inventory DB', 'products', 'Standardize', 'dim_product', '2024-03-15 01:00', '15,234'],
          ['POS Systems', 'transactions', 'Aggregate', 'fact_sales', '2024-03-15 02:15', '856,432'],
        ],
        formatting: {
          headerBold: true,
          headerColor: 'FFFF8C00',
          alternateRows: true,
        },
      },
      {
        name: 'Quality Rules',
        headers: ['Rule ID', 'Rule Name', 'Table', 'Column', 'Condition', 'Pass Rate', 'Action'],
        data: [
          ['DQ001', 'Email Format', 'dim_customer', 'email', 'Valid email regex', '98%', 'Alert'],
          ['DQ002', 'Phone Format', 'dim_customer', 'phone', '10 digits', '95%', 'Cleanse'],
          ['DQ003', 'Future Dates', 'fact_sales', 'sale_date', '<= Today', '100%', 'None'],
          ['DQ004', 'Negative Amounts', 'fact_sales', 'amount', '> 0', '99.8%', 'Review'],
          ['DQ005', 'Duplicate Keys', 'dim_customer', 'customer_id', 'Unique', '100%', 'None'],
        ],
        formatting: {
          headerBold: true,
          headerColor: 'FFE74856',
          alternateRows: true,
        },
      },
    ];

    await this.exporter.create(sheets, outputPath);
  }
}

// ============================================================================
// COMPLIANCE / HIPAA TEMPLATES
// ============================================================================

export class ComplianceTemplates {
  private docExporter: DocxExporter;

  constructor() {
    this.docExporter = new DocxExporter();
  }

  /**
   * Create HIPAA Compliance Documentation
   */
  async createHIPAADoc(outputPath: string): Promise<void> {
    const sections: DocxSection[] = [
      { type: 'heading', level: 1, text: 'HIPAA Compliance Documentation' },
      { type: 'paragraph', text: 'Organization: Healthcare Analytics Corp' },
      { type: 'paragraph', text: `Date: ${new Date().toLocaleDateString()}` },
      { type: 'paragraph', text: '' },

      { type: 'heading', level: 2, text: '1. Administrative Safeguards' },
      { type: 'heading', level: 3, text: '1.1 Security Management Process' },
      { type: 'paragraph', text: 'Our organization has implemented comprehensive security policies including risk analysis, risk management, sanction policies, and information system activity review.' },
      
      { type: 'heading', level: 3, text: '1.2 Assigned Security Responsibility' },
      { type: 'paragraph', text: 'Chief Information Security Officer: John Doe (john.doe@company.com)' },

      { type: 'heading', level: 2, text: '2. Physical Safeguards' },
      { type: 'paragraph', text: 'All PHI stored in Microsoft Fabric is hosted in Azure data centers with:' },
      { type: 'paragraph', text: '• Physical access controls and monitoring' },
      { type: 'paragraph', text: '• 24/7 security surveillance' },
      { type: 'paragraph', text: '• Biometric authentication for entry' },
      { type: 'paragraph', text: '• Environmental controls (fire, flood protection)' },

      { type: 'heading', level: 2, text: '3. Technical Safeguards' },
      
      { type: 'heading', level: 3, text: '3.1 Access Control' },
      { type: 'table', data: [
        ['Control', 'Implementation', 'Status'],
        ['Unique User ID', 'Azure AD authentication', 'Implemented'],
        ['Emergency Access', 'Break-glass accounts', 'Implemented'],
        ['Automatic Logoff', '15 minute timeout', 'Implemented'],
        ['Encryption', 'AES-256 at rest, TLS 1.2+ in transit', 'Implemented'],
      ]},

      { type: 'heading', level: 3, text: '3.2 Audit Controls' },
      { type: 'paragraph', text: 'All PHI access is logged with:' },
      { type: 'paragraph', text: '• User identity and timestamp' },
      { type: 'paragraph', text: '• Data accessed and operations performed' },
      { type: 'paragraph', text: '• 7-year retention in Azure Monitor' },
      { type: 'paragraph', text: '• Regular audit log reviews' },

      { type: 'heading', level: 3, text: '3.3 Data Integrity' },
      { type: 'paragraph', text: 'Mechanisms to ensure PHI is not improperly altered or destroyed:' },
      { type: 'paragraph', text: '• Row-level security in Fabric Warehouse' },
      { type: 'paragraph', text: '• Immutable audit logs' },
      { type: 'paragraph', text: '• Regular data validation checks' },
      { type: 'paragraph', text: '• Automated backup and recovery procedures' },

      { type: 'heading', level: 2, text: '4. Microsoft Fabric Specific Controls' },
      { type: 'table', data: [
        ['Component', 'Security Measure', 'Compliance Status'],
        ['Lakehouse', 'Encrypted at rest, RBAC', '✓ Compliant'],
        ['Warehouse', 'Row-level security, column masking', '✓ Compliant'],
        ['Data Pipeline', 'Managed identity, key vault integration', '✓ Compliant'],
        ['Power BI', 'RLS, sensitivity labels', '✓ Compliant'],
        ['Workspace', 'Azure AD groups, access controls', '✓ Compliant'],
      ]},

      { type: 'heading', level: 2, text: '5. Business Associate Agreement (BAA)' },
      { type: 'paragraph', text: 'Microsoft has signed a Business Associate Agreement covering Microsoft Fabric and Azure services.' },
      { type: 'paragraph', text: 'BAA Document ID: BAA-2024-001' },
      { type: 'paragraph', text: 'Effective Date: January 1, 2024' },

      { type: 'heading', level: 2, text: '6. Breach Notification Procedures' },
      { type: 'paragraph', text: 'In the event of a PHI breach:' },
      { type: 'paragraph', text: '1. Detect and contain within 1 hour' },
      { type: 'paragraph', text: '2. Assess scope and impact within 24 hours' },
      { type: 'paragraph', text: '3. Notify affected individuals within 60 days' },
      { type: 'paragraph', text: '4. Report to HHS if >500 individuals affected' },

      { type: 'heading', level: 2, text: '7. Training and Awareness' },
      { type: 'paragraph', text: 'All workforce members complete:' },
      { type: 'paragraph', text: '• Initial HIPAA training within 30 days of hire' },
      { type: 'paragraph', text: '• Annual refresher training' },
      { type: 'paragraph', text: '• Role-specific security training' },

      { type: 'heading', level: 2, text: '8. Certification' },
      { type: 'paragraph', text: 'I certify that this documentation accurately represents our HIPAA compliance posture as of the date above.' },
      { type: 'paragraph', text: '' },
      { type: 'paragraph', text: '_________________________' },
      { type: 'paragraph', text: 'Chief Information Security Officer' },
      { type: 'paragraph', text: `Date: ${new Date().toLocaleDateString()}` },
    ];

    await this.docExporter.create({
      title: 'HIPAA Compliance Documentation',
      author: 'Healthcare Analytics Corp',
      subject: 'HIPAA Compliance',
      sections,
      style: 'professional',
      headerText: 'HIPAA Compliance Documentation - CONFIDENTIAL',
      footerText: 'Page [PAGE] of [TOTAL_PAGES] - Internal Use Only',
    }, outputPath);
  }

  /**
   * Create SOC 2 Compliance Report
   */
  async createSOC2Report(outputPath: string): Promise<void> {
    const sections: DocxSection[] = [
      { type: 'heading', level: 1, text: 'SOC 2 Type II Compliance Report' },
      { type: 'paragraph', text: 'Microsoft Fabric Data Platform' },
      { type: 'paragraph', text: `Report Period: January 1, 2024 - December 31, 2024` },
      { type: 'paragraph', text: '' },

      { type: 'heading', level: 2, text: 'Trust Service Criteria' },
      
      { type: 'heading', level: 3, text: 'CC1: Control Environment' },
      { type: 'paragraph', text: 'The organization has established and maintains a control environment that supports security principles.' },
      
      { type: 'heading', level: 3, text: 'CC2: Communication and Information' },
      { type: 'paragraph', text: 'Security policies and procedures are documented and communicated to all relevant personnel.' },
      
      { type: 'heading', level: 3, text: 'CC3: Risk Assessment' },
      { type: 'table', data: [
        ['Risk Area', 'Assessment', 'Mitigation', 'Status'],
        ['Data Breaches', 'High', 'Encryption, MFA, monitoring', 'Mitigated'],
        ['Unauthorized Access', 'Medium', 'RBAC, audit logs', 'Mitigated'],
        ['Data Loss', 'Medium', 'Backup, replication', 'Mitigated'],
        ['Service Disruption', 'Low', 'HA, DR plan', 'Mitigated'],
      ]},

      { type: 'heading', level: 2, text: 'Testing Results' },
      { type: 'paragraph', text: 'All control objectives were tested and found to be operating effectively throughout the audit period.' },
    ];

    await this.docExporter.create({
      title: 'SOC 2 Type II Compliance Report',
      subject: 'SOC 2 Compliance',
      sections,
      style: 'professional',
    }, outputPath);
  }
}

// ============================================================================
// API DOCUMENTATION GENERATOR
// ============================================================================

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  parameters?: Array<{ name: string; type: string; required: boolean; description: string }>;
  requestBody?: { type: string; example: string };
  responses: Array<{ code: number; description: string; example?: string }>;
}

export class APIDocGenerator {
  private docExporter: DocxExporter;

  constructor() {
    this.docExporter = new DocxExporter();
  }

  async generateAPIDocs(
    apiName: string,
    baseUrl: string,
    endpoints: APIEndpoint[],
    outputPath: string
  ): Promise<void> {
    const sections: DocxSection[] = [
      { type: 'heading', level: 1, text: `${apiName} API Documentation` },
      { type: 'paragraph', text: `Base URL: ${baseUrl}` },
      { type: 'paragraph', text: '' },

      { type: 'heading', level: 2, text: 'Authentication' },
      { type: 'paragraph', text: 'All API requests require authentication using Bearer token in the Authorization header:' },
      { type: 'paragraph', text: 'Authorization: Bearer YOUR_API_TOKEN' },
      { type: 'paragraph', text: '' },

      { type: 'heading', level: 2, text: 'Endpoints' },
    ];

    endpoints.forEach((endpoint, i) => {
      sections.push({ type: 'heading', level: 3, text: `${endpoint.method} ${endpoint.path}` });
      sections.push({ type: 'paragraph', text: endpoint.description });
      sections.push({ type: 'paragraph', text: '' });

      if (endpoint.parameters && endpoint.parameters.length > 0) {
        sections.push({ type: 'paragraph', text: 'Parameters:', bold: true });
        sections.push({
          type: 'table',
          data: [
            ['Name', 'Type', 'Required', 'Description'],
            ...endpoint.parameters.map(p => [p.name, p.type, p.required ? 'Yes' : 'No', p.description]),
          ],
        });
      }

      if (endpoint.requestBody) {
        sections.push({ type: 'paragraph', text: 'Request Body:', bold: true });
        sections.push({ type: 'paragraph', text: `Type: ${endpoint.requestBody.type}` });
        sections.push({ type: 'paragraph', text: 'Example:' });
        sections.push({ type: 'paragraph', text: endpoint.requestBody.example });
      }

      sections.push({ type: 'paragraph', text: 'Responses:', bold: true });
      sections.push({
        type: 'table',
        data: [
          ['Code', 'Description', 'Example'],
          ...endpoint.responses.map(r => [String(r.code), r.description, r.example || '']),
        ],
      });

      sections.push({ type: 'paragraph', text: '' });
    });

    await this.docExporter.create({
      title: `${apiName} API Documentation`,
      subject: 'API Documentation',
      sections,
      style: 'professional',
    }, outputPath);
  }
}
