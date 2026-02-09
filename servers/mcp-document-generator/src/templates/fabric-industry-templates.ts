/**
 * Microsoft Fabric Industry Templates
 * Comprehensive templates for Retail, Finance, Healthcare, Manufacturing, and more
 */

import { FabricArchitectureDiagramGenerator, FabricComponent, FabricConnection, FabricZone } from '../diagrams/fabric-architecture-generator';
import { IconManager } from '../icons/icon-manager';

export class FabricIndustryTemplates {
  private generator: FabricArchitectureDiagramGenerator;

  constructor(iconManager: IconManager) {
    this.generator = new FabricArchitectureDiagramGenerator(iconManager);
  }

  // ============================================================================
  // RETAIL INDUSTRY TEMPLATES
  // ============================================================================

  /**
   * Retail Omnichannel Analytics Platform
   */
  async createRetailOmnichannel() {
    const components: FabricComponent[] = [
      // Data Sources
      { id: 'pos', type: 'gateway', name: 'POS Systems', description: 'In-store transactions' },
      { id: 'ecommerce', type: 'gateway', name: 'E-commerce', description: 'Online orders' },
      { id: 'mobile', type: 'gateway', name: 'Mobile App', description: 'Mobile transactions' },
      { id: 'loyalty', type: 'sql-database', name: 'Loyalty DB', description: 'Customer rewards' },
      { id: 'inventory', type: 'sql-database', name: 'Inventory System' },

      // Ingestion
      { id: 'ingest-pipeline', type: 'pipeline', name: 'Real-time Ingestion', metadata: { frequency: 'Streaming' } },
      { id: 'batch-pipeline', type: 'pipeline', name: 'Batch ETL', metadata: { frequency: 'Hourly' } },

      // Storage
      { id: 'raw-lakehouse', type: 'lakehouse', name: 'Raw Data Lake', description: 'Bronze layer', metadata: { size: '10TB' } },
      { id: 'curated-lakehouse', type: 'lakehouse', name: 'Curated Data', description: 'Silver/Gold', metadata: { size: '5TB' } },

      // Processing
      { id: 'customer-360', type: 'dataflow', name: 'Customer 360', description: 'Unified customer view' },
      { id: 'product-analytics', type: 'notebook', name: 'Product Analytics', description: 'Sales analysis' },

      // Analytics
      { id: 'retail-dw', type: 'warehouse', name: 'Retail DW', description: 'Star schema', metadata: { sku: 'F64' } },
      { id: 'semantic-model', type: 'semantic-model', name: 'Retail Semantic Model' },
      { id: 'exec-dashboard', type: 'dashboard', name: 'Executive Dashboard' },
      { id: 'sales-report', type: 'report', name: 'Daily Sales Report' },

      // Real-time
      { id: 'events', type: 'eventstream', name: 'Transaction Stream' },
      { id: 'kql-analytics', type: 'kql-database', name: 'Real-time Analytics' },
    ];

    const connections: FabricConnection[] = [
      { id: 'c1', from: 'pos', to: 'ingest-pipeline', type: 'event-stream', label: 'Real-time' },
      { id: 'c2', from: 'ecommerce', to: 'ingest-pipeline', type: 'event-stream' },
      { id: 'c3', from: 'mobile', to: 'ingest-pipeline', type: 'event-stream' },
      { id: 'c4', from: 'loyalty', to: 'batch-pipeline', type: 'data-flow' },
      { id: 'c5', from: 'inventory', to: 'batch-pipeline', type: 'data-flow' },
      
      { id: 'c6', from: 'ingest-pipeline', to: 'raw-lakehouse', type: 'data-flow' },
      { id: 'c7', from: 'batch-pipeline', to: 'raw-lakehouse', type: 'data-flow' },
      
      { id: 'c8', from: 'raw-lakehouse', to: 'customer-360', type: 'data-flow' },
      { id: 'c9', from: 'customer-360', to: 'curated-lakehouse', type: 'data-flow' },
      { id: 'c10', from: 'curated-lakehouse', to: 'product-analytics', type: 'data-flow' },
      { id: 'c11', from: 'product-analytics', to: 'retail-dw', type: 'data-flow' },
      
      { id: 'c12', from: 'ingest-pipeline', to: 'events', type: 'event-stream' },
      { id: 'c13', from: 'events', to: 'kql-analytics', type: 'event-stream' },
      
      { id: 'c14', from: 'retail-dw', to: 'semantic-model', type: 'reference' },
      { id: 'c15', from: 'semantic-model', to: 'exec-dashboard', type: 'reference' },
      { id: 'c16', from: 'semantic-model', to: 'sales-report', type: 'reference' },
    ];

    const zones: FabricZone[] = [
      { id: 'z1', name: 'Data Sources', components: ['pos', 'ecommerce', 'mobile', 'loyalty', 'inventory'], color: '#E74856' },
      { id: 'z2', name: 'Ingestion', components: ['ingest-pipeline', 'batch-pipeline'], color: '#FF8C00' },
      { id: 'z3', name: 'Storage', components: ['raw-lakehouse', 'curated-lakehouse'], color: '#00B7C3' },
      { id: 'z4', name: 'Processing', components: ['customer-360', 'product-analytics'], color: '#742774' },
      { id: 'z5', name: 'Analytics', components: ['retail-dw', 'semantic-model', 'exec-dashboard', 'sales-report'], color: '#F2C811' },
      { id: 'z6', name: 'Real-time', components: ['events', 'kql-analytics'], color: '#1C93D2' },
    ];

    return this.generator.generate(components, connections, zones, {
      title: 'Retail Omnichannel Analytics Platform',
      description: 'Real-time and batch analytics for unified retail operations',
      showLegend: true,
      layout: 'hierarchical',
    });
  }

  /**
   * Retail Inventory Optimization
   */
  async createRetailInventory() {
    const components: FabricComponent[] = [
      { id: 'wms', type: 'sql-database', name: 'WMS', description: 'Warehouse Management' },
      { id: 'oms', type: 'sql-database', name: 'OMS', description: 'Order Management' },
      { id: 'suppliers', type: 'gateway', name: 'Supplier EDI' },
      
      { id: 'pipeline', type: 'pipeline', name: 'Inventory ETL' },
      { id: 'lakehouse', type: 'lakehouse', name: 'Inventory Data Lake' },
      { id: 'ml-model', type: 'ml-model', name: 'Demand Forecasting', description: 'ML predictions' },
      { id: 'dw', type: 'warehouse', name: 'Inventory DW' },
      { id: 'dashboard', type: 'dashboard', name: 'Inventory Dashboard' },
    ];

    const connections: FabricConnection[] = [
      { id: 'c1', from: 'wms', to: 'pipeline', type: 'data-flow' },
      { id: 'c2', from: 'oms', to: 'pipeline', type: 'data-flow' },
      { id: 'c3', from: 'suppliers', to: 'pipeline', type: 'data-flow' },
      { id: 'c4', from: 'pipeline', to: 'lakehouse', type: 'data-flow' },
      { id: 'c5', from: 'lakehouse', to: 'ml-model', type: 'data-flow', label: 'Training' },
      { id: 'c6', from: 'lakehouse', to: 'dw', type: 'data-flow' },
      { id: 'c7', from: 'ml-model', to: 'dw', type: 'data-flow', label: 'Predictions' },
      { id: 'c8', from: 'dw', to: 'dashboard', type: 'reference' },
    ];

    return this.generator.generate(components, connections, undefined, {
      title: 'Retail Inventory Optimization Platform',
      showLegend: true,
      layout: 'hierarchical',
    });
  }

  // ============================================================================
  // FINANCIAL SERVICES TEMPLATES
  // ============================================================================

  /**
   * Banking Customer Analytics
   */
  async createBankingAnalytics() {
    const components: FabricComponent[] = [
      // Data Sources
      { id: 'core-banking', type: 'sql-database', name: 'Core Banking', description: 'Accounts & transactions' },
      { id: 'cards', type: 'sql-database', name: 'Card System', description: 'Credit/debit cards' },
      { id: 'mobile-banking', type: 'gateway', name: 'Mobile Banking', description: 'Digital channels' },
      { id: 'atm', type: 'gateway', name: 'ATM Network' },
      { id: 'crm', type: 'sql-database', name: 'CRM System' },

      // Processing
      { id: 'pipeline', type: 'pipeline', name: 'Banking ETL', metadata: { frequency: 'Hourly' } },
      { id: 'fraud-detection', type: 'notebook', name: 'Fraud Detection', description: 'Real-time scoring' },
      { id: 'customer-segmentation', type: 'ml-model', name: 'Customer Segmentation' },

      // Storage
      { id: 'lakehouse', type: 'lakehouse', name: 'Banking Data Lake', metadata: { size: '50TB' } },
      { id: 'dw', type: 'warehouse', name: 'Banking DW', metadata: { sku: 'F128' } },

      // Real-time
      { id: 'transaction-stream', type: 'eventstream', name: 'Transaction Stream' },
      { id: 'kql-fraud', type: 'kql-database', name: 'Fraud Analytics', description: 'Real-time monitoring' },

      // Analytics
      { id: 'semantic', type: 'semantic-model', name: 'Banking Semantic Model' },
      { id: 'risk-dashboard', type: 'dashboard', name: 'Risk Dashboard' },
      { id: 'regulatory-report', type: 'report', name: 'Regulatory Reports', description: 'Basel III, CCAR' },
    ];

    const connections: FabricConnection[] = [
      { id: 'c1', from: 'core-banking', to: 'pipeline', type: 'data-flow' },
      { id: 'c2', from: 'cards', to: 'pipeline', type: 'data-flow' },
      { id: 'c3', from: 'mobile-banking', to: 'transaction-stream', type: 'event-stream' },
      { id: 'c4', from: 'atm', to: 'transaction-stream', type: 'event-stream' },
      { id: 'c5', from: 'crm', to: 'pipeline', type: 'data-flow' },
      
      { id: 'c6', from: 'pipeline', to: 'lakehouse', type: 'data-flow' },
      { id: 'c7', from: 'transaction-stream', to: 'kql-fraud', type: 'event-stream' },
      
      { id: 'c8', from: 'lakehouse', to: 'fraud-detection', type: 'data-flow' },
      { id: 'c9', from: 'fraud-detection', to: 'customer-segmentation', type: 'data-flow' },
      { id: 'c10', from: 'customer-segmentation', to: 'dw', type: 'data-flow' },
      
      { id: 'c11', from: 'dw', to: 'semantic', type: 'reference' },
      { id: 'c12', from: 'semantic', to: 'risk-dashboard', type: 'reference' },
      { id: 'c13', from: 'semantic', to: 'regulatory-report', type: 'reference' },
    ];

    const zones: FabricZone[] = [
      { id: 'z1', name: 'Banking Systems', components: ['core-banking', 'cards', 'mobile-banking', 'atm', 'crm'], color: '#0078D4' },
      { id: 'z2', name: 'Data Lake', components: ['pipeline', 'lakehouse'], color: '#00B7C3' },
      { id: 'z3', name: 'AI/ML', components: ['fraud-detection', 'customer-segmentation'], color: '#742774' },
      { id: 'z4', name: 'Real-time', components: ['transaction-stream', 'kql-fraud'], color: '#E74856' },
      { id: 'z5', name: 'Analytics', components: ['dw', 'semantic', 'risk-dashboard', 'regulatory-report'], color: '#107C10' },
    ];

    return this.generator.generate(components, connections, zones, {
      title: 'Banking Customer Analytics & Risk Management',
      description: 'Enterprise-grade banking analytics with fraud detection',
      showLegend: true,
      layout: 'hierarchical',
    });
  }

  /**
   * Insurance Claims Analytics
   */
  async createInsuranceClaims() {
    const components: FabricComponent[] = [
      { id: 'policy-admin', type: 'sql-database', name: 'Policy Admin System' },
      { id: 'claims-system', type: 'sql-database', name: 'Claims System' },
      { id: 'third-party', type: 'gateway', name: 'Third Party Data', description: 'Medical, Auto repair' },
      
      { id: 'pipeline', type: 'pipeline', name: 'Claims ETL' },
      { id: 'lakehouse', type: 'lakehouse', name: 'Claims Data Lake' },
      { id: 'fraud-ml', type: 'ml-model', name: 'Claims Fraud Detection' },
      { id: 'dw', type: 'warehouse', name: 'Insurance DW' },
      { id: 'claims-dashboard', type: 'dashboard', name: 'Claims Dashboard' },
    ];

    const connections: FabricConnection[] = [
      { id: 'c1', from: 'policy-admin', to: 'pipeline', type: 'data-flow' },
      { id: 'c2', from: 'claims-system', to: 'pipeline', type: 'data-flow' },
      { id: 'c3', from: 'third-party', to: 'pipeline', type: 'data-flow' },
      { id: 'c4', from: 'pipeline', to: 'lakehouse', type: 'data-flow' },
      { id: 'c5', from: 'lakehouse', to: 'fraud-ml', type: 'data-flow' },
      { id: 'c6', from: 'fraud-ml', to: 'dw', type: 'data-flow' },
      { id: 'c7', from: 'dw', to: 'claims-dashboard', type: 'reference' },
    ];

    return this.generator.generate(components, connections, undefined, {
      title: 'Insurance Claims Analytics Platform',
      showLegend: true,
      layout: 'hierarchical',
    });
  }

  // ============================================================================
  // HEALTHCARE TEMPLATES
  // ============================================================================

  /**
   * Healthcare Comprehensive Platform (already created, but enhanced)
   */
  async createHealthcareComprehensive() {
    const components: FabricComponent[] = [
      // EHR Sources
      { id: 'epic', type: 'gateway', name: 'Epic EHR', description: 'FHIR API' },
      { id: 'cerner', type: 'gateway', name: 'Cerner', description: 'HL7 v2' },
      { id: 'lab-system', type: 'sql-database', name: 'Lab System', description: 'Results' },
      { id: 'imaging', type: 'sql-database', name: 'PACS/RIS', description: 'Medical imaging' },
      { id: 'pharmacy', type: 'sql-database', name: 'Pharmacy System' },

      // Integration
      { id: 'hl7-parser', type: 'pipeline', name: 'HL7 Parser', description: 'Message parsing' },
      { id: 'fhir-converter', type: 'pipeline', name: 'FHIR Converter' },

      // Storage (PHI-compliant)
      { id: 'phi-lakehouse', type: 'lakehouse', name: 'PHI Data Lake', description: 'HIPAA-compliant', metadata: { encrypted: 'AES-256' } },
      { id: 'clinical-dw', type: 'warehouse', name: 'Clinical DW', description: 'De-identified', metadata: { sku: 'F64' } },

      // Analytics
      { id: 'clinical-analytics', type: 'notebook', name: 'Clinical Analytics', description: 'Outcomes research' },
      { id: 'pop-health', type: 'ml-model', name: 'Population Health', description: 'Risk stratification' },
      { id: 'readmission-ml', type: 'ml-model', name: 'Readmission Prediction' },

      // Real-time
      { id: 'adt-stream', type: 'eventstream', name: 'ADT Messages', description: 'Admit/Discharge/Transfer' },
      { id: 'kql-clinical', type: 'kql-database', name: 'Real-time Clinical' },

      // Reporting
      { id: 'semantic', type: 'semantic-model', name: 'Clinical Semantic Model' },
      { id: 'quality-dashboard', type: 'dashboard', name: 'Quality Metrics', description: 'HEDIS, CMS Stars' },
      { id: 'pop-health-report', type: 'report', name: 'Population Health Report' },
      { id: 'financial-report', type: 'report', name: 'RCM Analytics', description: 'Revenue cycle' },
    ];

    const connections: FabricConnection[] = [
      { id: 'c1', from: 'epic', to: 'fhir-converter', type: 'api-call' },
      { id: 'c2', from: 'cerner', to: 'hl7-parser', type: 'data-flow' },
      { id: 'c3', from: 'lab-system', to: 'phi-lakehouse', type: 'data-flow' },
      { id: 'c4', from: 'imaging', to: 'phi-lakehouse', type: 'data-flow' },
      { id: 'c5', from: 'pharmacy', to: 'phi-lakehouse', type: 'data-flow' },
      
      { id: 'c6', from: 'hl7-parser', to: 'phi-lakehouse', type: 'data-flow' },
      { id: 'c7', from: 'fhir-converter', to: 'phi-lakehouse', type: 'data-flow' },
      
      { id: 'c8', from: 'epic', to: 'adt-stream', type: 'event-stream' },
      { id: 'c9', from: 'adt-stream', to: 'kql-clinical', type: 'event-stream' },
      
      { id: 'c10', from: 'phi-lakehouse', to: 'clinical-analytics', type: 'data-flow' },
      { id: 'c11', from: 'clinical-analytics', to: 'clinical-dw', type: 'data-flow', label: 'De-identify' },
      
      { id: 'c12', from: 'clinical-dw', to: 'pop-health', type: 'data-flow' },
      { id: 'c13', from: 'clinical-dw', to: 'readmission-ml', type: 'data-flow' },
      
      { id: 'c14', from: 'clinical-dw', to: 'semantic', type: 'reference' },
      { id: 'c15', from: 'semantic', to: 'quality-dashboard', type: 'reference' },
      { id: 'c16', from: 'semantic', to: 'pop-health-report', type: 'reference' },
      { id: 'c17', from: 'semantic', to: 'financial-report', type: 'reference' },
    ];

    const zones: FabricZone[] = [
      { id: 'z1', name: 'EHR Systems', components: ['epic', 'cerner', 'lab-system', 'imaging', 'pharmacy'], color: '#0078D4' },
      { id: 'z2', name: 'Integration', components: ['hl7-parser', 'fhir-converter'], color: '#FF8C00' },
      { id: 'z3', name: 'PHI Storage (Encrypted)', components: ['phi-lakehouse'], color: '#E74856' },
      { id: 'z4', name: 'Clinical Analytics', components: ['clinical-analytics', 'pop-health', 'readmission-ml', 'clinical-dw'], color: '#107C10' },
      { id: 'z5', name: 'Real-time', components: ['adt-stream', 'kql-clinical'], color: '#742774' },
      { id: 'z6', name: 'Reporting', components: ['semantic', 'quality-dashboard', 'pop-health-report', 'financial-report'], color: '#F2C811' },
    ];

    return this.generator.generate(components, connections, zones, {
      title: 'Healthcare Enterprise Analytics Platform',
      description: 'HIPAA-compliant clinical and population health analytics',
      showLegend: true,
      layout: 'hierarchical',
    });
  }

  // ============================================================================
  // MANUFACTURING TEMPLATES
  // ============================================================================

  /**
   * Smart Manufacturing / Industry 4.0
   */
  async createSmartManufacturing() {
    const components: FabricComponent[] = [
      // IoT/Sensors
      { id: 'iot-sensors', type: 'gateway', name: 'IoT Sensors', description: 'Production floor' },
      { id: 'scada', type: 'gateway', name: 'SCADA Systems' },
      { id: 'plc', type: 'gateway', name: 'PLCs', description: 'Programmable Logic Controllers' },
      
      // Enterprise Systems
      { id: 'erp', type: 'sql-database', name: 'ERP System', description: 'SAP/Oracle' },
      { id: 'mes', type: 'sql-database', name: 'MES', description: 'Manufacturing Execution' },
      { id: 'qms', type: 'sql-database', name: 'QMS', description: 'Quality Management' },

      // Real-time Ingestion
      { id: 'iot-stream', type: 'eventstream', name: 'IoT Event Stream', metadata: { frequency: '1000 events/sec' } },
      { id: 'kql-iot', type: 'kql-database', name: 'Real-time Monitoring' },

      // Processing
      { id: 'batch-pipeline', type: 'pipeline', name: 'Batch ETL' },
      { id: 'lakehouse', type: 'lakehouse', name: 'Manufacturing Data Lake', metadata: { size: '20TB' } },
      
      // ML/AI
      { id: 'predictive-maintenance', type: 'ml-model', name: 'Predictive Maintenance', description: 'Equipment failure prediction' },
      { id: 'quality-ai', type: 'ml-model', name: 'Quality AI', description: 'Defect detection' },
      { id: 'optimization', type: 'notebook', name: 'Process Optimization' },

      // Analytics
      { id: 'dw', type: 'warehouse', name: 'Manufacturing DW' },
      { id: 'oee-dashboard', type: 'dashboard', name: 'OEE Dashboard', description: 'Overall Equipment Effectiveness' },
      { id: 'quality-report', type: 'report', name: 'Quality Analytics' },
    ];

    const connections: FabricConnection[] = [
      { id: 'c1', from: 'iot-sensors', to: 'iot-stream', type: 'event-stream' },
      { id: 'c2', from: 'scada', to: 'iot-stream', type: 'event-stream' },
      { id: 'c3', from: 'plc', to: 'iot-stream', type: 'event-stream' },
      
      { id: 'c4', from: 'iot-stream', to: 'kql-iot', type: 'event-stream' },
      { id: 'c5', from: 'iot-stream', to: 'lakehouse', type: 'data-flow' },
      
      { id: 'c6', from: 'erp', to: 'batch-pipeline', type: 'data-flow' },
      { id: 'c7', from: 'mes', to: 'batch-pipeline', type: 'data-flow' },
      { id: 'c8', from: 'qms', to: 'batch-pipeline', type: 'data-flow' },
      { id: 'c9', from: 'batch-pipeline', to: 'lakehouse', type: 'data-flow' },
      
      { id: 'c10', from: 'lakehouse', to: 'predictive-maintenance', type: 'data-flow' },
      { id: 'c11', from: 'lakehouse', to: 'quality-ai', type: 'data-flow' },
      { id: 'c12', from: 'lakehouse', to: 'optimization', type: 'data-flow' },
      
      { id: 'c13', from: 'optimization', to: 'dw', type: 'data-flow' },
      { id: 'c14', from: 'predictive-maintenance', to: 'dw', type: 'data-flow' },
      { id: 'c15', from: 'quality-ai', to: 'dw', type: 'data-flow' },
      
      { id: 'c16', from: 'dw', to: 'oee-dashboard', type: 'reference' },
      { id: 'c17', from: 'dw', to: 'quality-report', type: 'reference' },
    ];

    const zones: FabricZone[] = [
      { id: 'z1', name: 'Production Floor', components: ['iot-sensors', 'scada', 'plc'], color: '#E25A00' },
      { id: 'z2', name: 'Enterprise Systems', components: ['erp', 'mes', 'qms'], color: '#0078D4' },
      { id: 'z3', name: 'Real-time', components: ['iot-stream', 'kql-iot'], color: '#E74856' },
      { id: 'z4', name: 'Data Lake', components: ['batch-pipeline', 'lakehouse'], color: '#00B7C3' },
      { id: 'z5', name: 'AI/ML', components: ['predictive-maintenance', 'quality-ai', 'optimization'], color: '#742774' },
      { id: 'z6', name: 'Analytics', components: ['dw', 'oee-dashboard', 'quality-report'], color: '#107C10' },
    ];

    return this.generator.generate(components, connections, zones, {
      title: 'Smart Manufacturing Platform (Industry 4.0)',
      description: 'IoT-enabled manufacturing with predictive maintenance',
      showLegend: true,
      layout: 'hierarchical',
    });
  }

  /**
   * Supply Chain Analytics
   */
  async createSupplyChain() {
    const components: FabricComponent[] = [
      { id: 'suppliers', type: 'gateway', name: 'Supplier Systems', description: 'EDI, API' },
      { id: 'logistics', type: 'gateway', name: 'Logistics Providers' },
      { id: 'wms', type: 'sql-database', name: 'WMS', description: 'Warehouse Management' },
      { id: 'tms', type: 'sql-database', name: 'TMS', description: 'Transportation Management' },
      
      { id: 'pipeline', type: 'pipeline', name: 'Supply Chain ETL' },
      { id: 'lakehouse', type: 'lakehouse', name: 'Supply Chain Lake' },
      { id: 'demand-forecast', type: 'ml-model', name: 'Demand Forecasting' },
      { id: 'dw', type: 'warehouse', name: 'Supply Chain DW' },
      { id: 'dashboard', type: 'dashboard', name: 'Supply Chain Dashboard' },
    ];

    const connections: FabricConnection[] = [
      { id: 'c1', from: 'suppliers', to: 'pipeline', type: 'data-flow' },
      { id: 'c2', from: 'logistics', to: 'pipeline', type: 'data-flow' },
      { id: 'c3', from: 'wms', to: 'pipeline', type: 'data-flow' },
      { id: 'c4', from: 'tms', to: 'pipeline', type: 'data-flow' },
      { id: 'c5', from: 'pipeline', to: 'lakehouse', type: 'data-flow' },
      { id: 'c6', from: 'lakehouse', to: 'demand-forecast', type: 'data-flow' },
      { id: 'c7', from: 'demand-forecast', to: 'dw', type: 'data-flow' },
      { id: 'c8', from: 'dw', to: 'dashboard', type: 'reference' },
    ];

    return this.generator.generate(components, connections, undefined, {
      title: 'Supply Chain Analytics Platform',
      showLegend: true,
      layout: 'hierarchical',
    });
  }

  // ============================================================================
  // TELECOMMUNICATIONS
  // ============================================================================

  /**
   * Telco Network Analytics
   */
  async createTelcoNetwork() {
    const components: FabricComponent[] = [
      { id: 'network-elements', type: 'gateway', name: 'Network Elements', description: 'Routers, switches' },
      { id: 'bss', type: 'sql-database', name: 'BSS', description: 'Business Support Systems' },
      { id: 'oss', type: 'sql-database', name: 'OSS', description: 'Operations Support Systems' },
      
      { id: 'stream', type: 'eventstream', name: 'Network Event Stream', metadata: { frequency: '10K events/sec' } },
      { id: 'kql-network', type: 'kql-database', name: 'Network Monitoring' },
      
      { id: 'pipeline', type: 'pipeline', name: 'Telco ETL' },
      { id: 'lakehouse', type: 'lakehouse', name: 'Network Data Lake' },
      { id: 'churn-ml', type: 'ml-model', name: 'Churn Prediction' },
      { id: 'dw', type: 'warehouse', name: 'Telco DW' },
      { id: 'dashboard', type: 'dashboard', name: 'Network Performance' },
    ];

    const connections: FabricConnection[] = [
      { id: 'c1', from: 'network-elements', to: 'stream', type: 'event-stream' },
      { id: 'c2', from: 'stream', to: 'kql-network', type: 'event-stream' },
      { id: 'c3', from: 'bss', to: 'pipeline', type: 'data-flow' },
      { id: 'c4', from: 'oss', to: 'pipeline', type: 'data-flow' },
      { id: 'c5', from: 'pipeline', to: 'lakehouse', type: 'data-flow' },
      { id: 'c6', from: 'lakehouse', to: 'churn-ml', type: 'data-flow' },
      { id: 'c7', from: 'churn-ml', to: 'dw', type: 'data-flow' },
      { id: 'c8', from: 'dw', to: 'dashboard', type: 'reference' },
    ];

    return this.generator.generate(components, connections, undefined, {
      title: 'Telecommunications Network Analytics',
      showLegend: true,
      layout: 'hierarchical',
    });
  }

  // ============================================================================
  // HELPER: Get All Templates
  // ============================================================================

  async getAllTemplates(): Promise<Record<string, () => Promise<any>>> {
    return {
      // Retail
      'retail-omnichannel': () => this.createRetailOmnichannel(),
      'retail-inventory': () => this.createRetailInventory(),
      
      // Finance
      'banking-analytics': () => this.createBankingAnalytics(),
      'insurance-claims': () => this.createInsuranceClaims(),
      
      // Healthcare
      'healthcare-comprehensive': () => this.createHealthcareComprehensive(),
      
      // Manufacturing
      'smart-manufacturing': () => this.createSmartManufacturing(),
      'supply-chain': () => this.createSupplyChain(),
      
      // Telecom
      'telco-network': () => this.createTelcoNetwork(),
    };
  }
}
