/**
 * Microsoft Fabric Architecture Templates
 * Pre-built templates for common Fabric scenarios
 */

import { FabricComponent, FabricConnection, FabricZone } from '../diagrams/fabric-architecture-generator';

// ============================================================================
// 1. BASIC DATA LAKEHOUSE PATTERN
// ============================================================================

export const BasicLakehouseTemplate = {
  name: 'Basic Lakehouse Pattern',
  description: 'Simple medallion architecture with Bronze, Silver, Gold layers',
  components: [
    { id: 'source-db', type: 'sql-database' as const, name: 'Source Database' },
    { id: 'pipeline-1', type: 'pipeline' as const, name: 'Ingestion Pipeline' },
    { id: 'bronze-lh', type: 'lakehouse' as const, name: 'Bronze Lakehouse', metadata: { layer: 'Raw' } },
    { id: 'notebook-1', type: 'notebook' as const, name: 'Transform Notebook' },
    { id: 'silver-lh', type: 'lakehouse' as const, name: 'Silver Lakehouse', metadata: { layer: 'Cleansed' } },
    { id: 'dataflow-1', type: 'dataflow' as const, name: 'Business Rules' },
    { id: 'gold-lh', type: 'lakehouse' as const, name: 'Gold Lakehouse', metadata: { layer: 'Curated' } },
    { id: 'warehouse-1', type: 'warehouse' as const, name: 'Analytics Warehouse' },
    { id: 'report-1', type: 'report' as const, name: 'Executive Dashboard' },
  ] as FabricComponent[],
  connections: [
    { id: 'c1', from: 'source-db', to: 'pipeline-1', type: 'data-flow' as const },
    { id: 'c2', from: 'pipeline-1', to: 'bronze-lh', type: 'data-flow' as const },
    { id: 'c3', from: 'bronze-lh', to: 'notebook-1', type: 'data-flow' as const },
    { id: 'c4', from: 'notebook-1', to: 'silver-lh', type: 'data-flow' as const },
    { id: 'c5', from: 'silver-lh', to: 'dataflow-1', type: 'data-flow' as const },
    { id: 'c6', from: 'dataflow-1', to: 'gold-lh', type: 'data-flow' as const },
    { id: 'c7', from: 'gold-lh', to: 'warehouse-1', type: 'data-flow' as const },
    { id: 'c8', from: 'warehouse-1', to: 'report-1', type: 'reference' as const },
  ] as FabricConnection[],
};

// ============================================================================
// 2. REAL-TIME STREAMING ANALYTICS
// ============================================================================

export const RealTimeStreamingTemplate = {
  name: 'Real-Time Streaming Analytics',
  description: 'IoT and event streaming with real-time dashboards',
  components: [
    { id: 'iot-gateway', type: 'gateway' as const, name: 'IoT Gateway' },
    { id: 'eventstream-1', type: 'eventstream' as const, name: 'IoT Eventstream' },
    { id: 'kql-db-1', type: 'kql-database' as const, name: 'Real-Time DB', metadata: { retention: '30 days' } },
    { id: 'lakehouse-1', type: 'lakehouse' as const, name: 'Historical Data' },
    { id: 'warehouse-1', type: 'warehouse' as const, name: 'Analytics DW' },
    { id: 'dashboard-1', type: 'dashboard' as const, name: 'Real-Time Monitor' },
    { id: 'report-1', type: 'report' as const, name: 'Historical Analysis' },
  ] as FabricComponent[],
  connections: [
    { id: 'c1', from: 'iot-gateway', to: 'eventstream-1', type: 'event-stream' as const, label: 'Live Events' },
    { id: 'c2', from: 'eventstream-1', to: 'kql-db-1', type: 'event-stream' as const },
    { id: 'c3', from: 'eventstream-1', to: 'lakehouse-1', type: 'data-flow' as const, label: 'Archive' },
    { id: 'c4', from: 'kql-db-1', to: 'dashboard-1', type: 'data-flow' as const },
    { id: 'c5', from: 'lakehouse-1', to: 'warehouse-1', type: 'data-flow' as const },
    { id: 'c6', from: 'warehouse-1', to: 'report-1', type: 'reference' as const },
  ] as FabricConnection[],
};

// ============================================================================
// 3. DATA SCIENCE & ML PLATFORM
// ============================================================================

export const DataScienceMLTemplate = {
  name: 'Data Science & ML Platform',
  description: 'Complete ML lifecycle from training to deployment',
  components: [
    { id: 'lakehouse-1', type: 'lakehouse' as const, name: 'Feature Store' },
    { id: 'notebook-1', type: 'notebook' as const, name: 'Data Prep' },
    { id: 'experiment-1', type: 'experiment' as const, name: 'Model Training' },
    { id: 'ml-model-1', type: 'ml-model' as const, name: 'Production Model' },
    { id: 'pipeline-1', type: 'pipeline' as const, name: 'Scoring Pipeline' },
    { id: 'warehouse-1', type: 'warehouse' as const, name: 'Predictions DW' },
    { id: 'report-1', type: 'report' as const, name: 'ML Insights' },
  ] as FabricComponent[],
  connections: [
    { id: 'c1', from: 'lakehouse-1', to: 'notebook-1', type: 'data-flow' as const },
    { id: 'c2', from: 'notebook-1', to: 'experiment-1', type: 'data-flow' as const, label: 'Training Data' },
    { id: 'c3', from: 'experiment-1', to: 'ml-model-1', type: 'data-flow' as const, label: 'Best Model' },
    { id: 'c4', from: 'lakehouse-1', to: 'pipeline-1', type: 'data-flow' as const, label: 'Score Data' },
    { id: 'c5', from: 'ml-model-1', to: 'pipeline-1', type: 'api-call' as const, label: 'Predict' },
    { id: 'c6', from: 'pipeline-1', to: 'warehouse-1', type: 'data-flow' as const },
    { id: 'c7', from: 'warehouse-1', to: 'report-1', type: 'reference' as const },
  ] as FabricConnection[],
};

// ============================================================================
// 4. MULTI-SOURCE DATA INTEGRATION
// ============================================================================

export const MultiSourceIntegrationTemplate = {
  name: 'Multi-Source Data Integration',
  description: 'Integrate data from multiple heterogeneous sources',
  components: [
    { id: 'sql-db-1', type: 'sql-database' as const, name: 'SQL Server' },
    { id: 'gateway-1', type: 'gateway' as const, name: 'On-Prem Gateway' },
    { id: 'gateway-2', type: 'gateway' as const, name: 'Cloud Services' },
    { id: 'pipeline-1', type: 'pipeline' as const, name: 'SQL Ingestion' },
    { id: 'pipeline-2', type: 'pipeline' as const, name: 'Cloud Ingestion' },
    { id: 'lakehouse-1', type: 'lakehouse' as const, name: 'Raw Landing Zone' },
    { id: 'dataflow-1', type: 'dataflow' as const, name: 'Data Harmonization' },
    { id: 'lakehouse-2', type: 'lakehouse' as const, name: 'Unified Data' },
    { id: 'warehouse-1', type: 'warehouse' as const, name: 'Enterprise DW' },
  ] as FabricComponent[],
  connections: [
    { id: 'c1', from: 'sql-db-1', to: 'pipeline-1', type: 'data-flow' as const },
    { id: 'c2', from: 'gateway-1', to: 'pipeline-1', type: 'data-flow' as const },
    { id: 'c3', from: 'gateway-2', to: 'pipeline-2', type: 'data-flow' as const },
    { id: 'c4', from: 'pipeline-1', to: 'lakehouse-1', type: 'data-flow' as const },
    { id: 'c5', from: 'pipeline-2', to: 'lakehouse-1', type: 'data-flow' as const },
    { id: 'c6', from: 'lakehouse-1', to: 'dataflow-1', type: 'data-flow' as const },
    { id: 'c7', from: 'dataflow-1', to: 'lakehouse-2', type: 'data-flow' as const },
    { id: 'c8', from: 'lakehouse-2', to: 'warehouse-1', type: 'data-flow' as const },
  ] as FabricConnection[],
};

// ============================================================================
// 5. SELF-SERVICE ANALYTICS
// ============================================================================

export const SelfServiceAnalyticsTemplate = {
  name: 'Self-Service Analytics',
  description: 'Enable business users with curated data and tools',
  components: [
    { id: 'warehouse-1', type: 'warehouse' as const, name: 'Enterprise DW' },
    { id: 'lakehouse-1', type: 'lakehouse' as const, name: 'Data Products' },
    { id: 'semantic-1', type: 'semantic-model' as const, name: 'Shared Semantic Model' },
    { id: 'report-1', type: 'report' as const, name: 'Sales Analytics' },
    { id: 'report-2', type: 'report' as const, name: 'Marketing Analytics' },
    { id: 'report-3', type: 'report' as const, name: 'Operations Analytics' },
    { id: 'dashboard-1', type: 'dashboard' as const, name: 'Executive Dashboard' },
  ] as FabricComponent[],
  connections: [
    { id: 'c1', from: 'warehouse-1', to: 'semantic-1', type: 'data-flow' as const },
    { id: 'c2', from: 'lakehouse-1', to: 'semantic-1', type: 'data-flow' as const },
    { id: 'c3', from: 'semantic-1', to: 'report-1', type: 'reference' as const },
    { id: 'c4', from: 'semantic-1', to: 'report-2', type: 'reference' as const },
    { id: 'c5', from: 'semantic-1', to: 'report-3', type: 'reference' as const },
    { id: 'c6', from: 'report-1', to: 'dashboard-1', type: 'reference' as const },
    { id: 'c7', from: 'report-2', to: 'dashboard-1', type: 'reference' as const },
  ] as FabricConnection[],
};

// ============================================================================
// 6. DATA PRODUCT PLATFORM
// ============================================================================

export const DataProductPlatformTemplate = {
  name: 'Data Product Platform',
  description: 'Domain-driven data products with mesh architecture',
  components: [
    { id: 'lakehouse-sales', type: 'lakehouse' as const, name: 'Sales Data Product' },
    { id: 'lakehouse-marketing', type: 'lakehouse' as const, name: 'Marketing Data Product' },
    { id: 'lakehouse-finance', type: 'lakehouse' as const, name: 'Finance Data Product' },
    { id: 'warehouse-1', type: 'warehouse' as const, name: 'Cross-Domain Analytics' },
    { id: 'semantic-1', type: 'semantic-model' as const, name: 'Unified Semantic Layer' },
    { id: 'report-1', type: 'report' as const, name: 'Business Intelligence' },
  ] as FabricComponent[],
  connections: [
    { id: 'c1', from: 'lakehouse-sales', to: 'warehouse-1', type: 'data-flow' as const },
    { id: 'c2', from: 'lakehouse-marketing', to: 'warehouse-1', type: 'data-flow' as const },
    { id: 'c3', from: 'lakehouse-finance', to: 'warehouse-1', type: 'data-flow' as const },
    { id: 'c4', from: 'warehouse-1', to: 'semantic-1', type: 'data-flow' as const },
    { id: 'c5', from: 'semantic-1', to: 'report-1', type: 'reference' as const },
  ] as FabricConnection[],
  zones: [
    { id: 'sales', name: 'Sales Domain', components: ['lakehouse-sales'], securityLevel: 'internal' as const },
    { id: 'marketing', name: 'Marketing Domain', components: ['lakehouse-marketing'], securityLevel: 'internal' as const },
    { id: 'finance', name: 'Finance Domain', components: ['lakehouse-finance'], securityLevel: 'internal' as const },
    { id: 'analytics', name: 'Analytics Layer', components: ['warehouse-1', 'semantic-1', 'report-1'], securityLevel: 'internal' as const },
  ] as FabricZone[],
};

// ============================================================================
// 7. HYBRID CLOUD INTEGRATION
// ============================================================================

export const HybridCloudIntegrationTemplate = {
  name: 'Hybrid Cloud Integration',
  description: 'Connect on-premises and cloud data sources',
  components: [
    { id: 'gateway-1', type: 'gateway' as const, name: 'On-Premises Gateway' },
    { id: 'sql-db-1', type: 'sql-database' as const, name: 'On-Prem SQL Server' },
    { id: 'pipeline-1', type: 'pipeline' as const, name: 'Secure Ingestion' },
    { id: 'lakehouse-1', type: 'lakehouse' as const, name: 'Cloud Lakehouse' },
    { id: 'warehouse-1', type: 'warehouse' as const, name: 'Cloud Warehouse' },
    { id: 'report-1', type: 'report' as const, name: 'Unified Reporting' },
  ] as FabricComponent[],
  connections: [
    { id: 'c1', from: 'sql-db-1', to: 'gateway-1', type: 'data-flow' as const },
    { id: 'c2', from: 'gateway-1', to: 'pipeline-1', type: 'data-flow' as const, label: 'Secure Tunnel' },
    { id: 'c3', from: 'pipeline-1', to: 'lakehouse-1', type: 'data-flow' as const },
    { id: 'c4', from: 'lakehouse-1', to: 'warehouse-1', type: 'data-flow' as const },
    { id: 'c5', from: 'warehouse-1', to: 'report-1', type: 'reference' as const },
  ] as FabricConnection[],
};

// ============================================================================
// 8. EVENT-DRIVEN ARCHITECTURE
// ============================================================================

export const EventDrivenArchitectureTemplate = {
  name: 'Event-Driven Architecture',
  description: 'Real-time event processing and reaction',
  components: [
    { id: 'eventstream-1', type: 'eventstream' as const, name: 'Order Events' },
    { id: 'eventstream-2', type: 'eventstream' as const, name: 'Inventory Events' },
    { id: 'kql-db-1', type: 'kql-database' as const, name: 'Event Store' },
    { id: 'notebook-1', type: 'notebook' as const, name: 'Event Processor' },
    { id: 'pipeline-1', type: 'pipeline' as const, name: 'Triggered Actions' },
    { id: 'lakehouse-1', type: 'lakehouse' as const, name: 'Event Archive' },
    { id: 'dashboard-1', type: 'dashboard' as const, name: 'Real-Time Monitoring' },
  ] as FabricComponent[],
  connections: [
    { id: 'c1', from: 'eventstream-1', to: 'kql-db-1', type: 'event-stream' as const },
    { id: 'c2', from: 'eventstream-2', to: 'kql-db-1', type: 'event-stream' as const },
    { id: 'c3', from: 'kql-db-1', to: 'notebook-1', type: 'data-flow' as const },
    { id: 'c4', from: 'notebook-1', to: 'pipeline-1', type: 'trigger' as const },
    { id: 'c5', from: 'kql-db-1', to: 'lakehouse-1', type: 'data-flow' as const },
    { id: 'c6', from: 'kql-db-1', to: 'dashboard-1', type: 'data-flow' as const },
  ] as FabricConnection[],
};

// ============================================================================
// 9. OPERATIONAL ANALYTICS
// ============================================================================

export const OperationalAnalyticsTemplate = {
  name: 'Operational Analytics',
  description: 'Near real-time operational reporting',
  components: [
    { id: 'sql-db-1', type: 'sql-database' as const, name: 'Operational DB' },
    { id: 'pipeline-1', type: 'pipeline' as const, name: 'CDC Pipeline', metadata: { frequency: '5 min' } },
    { id: 'lakehouse-1', type: 'lakehouse' as const, name: 'Operational Data' },
    { id: 'warehouse-1', type: 'warehouse' as const, name: 'Analytics DW' },
    { id: 'semantic-1', type: 'semantic-model' as const, name: 'Operational Metrics' },
    { id: 'dashboard-1', type: 'dashboard' as const, name: 'Operations Dashboard' },
  ] as FabricComponent[],
  connections: [
    { id: 'c1', from: 'sql-db-1', to: 'pipeline-1', type: 'data-flow' as const, label: 'CDC' },
    { id: 'c2', from: 'pipeline-1', to: 'lakehouse-1', type: 'data-flow' as const },
    { id: 'c3', from: 'lakehouse-1', to: 'warehouse-1', type: 'data-flow' as const },
    { id: 'c4', from: 'warehouse-1', to: 'semantic-1', type: 'data-flow' as const },
    { id: 'c5', from: 'semantic-1', to: 'dashboard-1', type: 'reference' as const },
  ] as FabricConnection[],
};

// ============================================================================
// 10. DATA QUALITY & GOVERNANCE
// ============================================================================

export const DataQualityGovernanceTemplate = {
  name: 'Data Quality & Governance',
  description: 'Comprehensive data quality checks and governance',
  components: [
    { id: 'lakehouse-raw', type: 'lakehouse' as const, name: 'Raw Data' },
    { id: 'notebook-quality', type: 'notebook' as const, name: 'Quality Checks' },
    { id: 'lakehouse-quarantine', type: 'lakehouse' as const, name: 'Quarantine Zone' },
    { id: 'lakehouse-validated', type: 'lakehouse' as const, name: 'Validated Data' },
    { id: 'warehouse-1', type: 'warehouse' as const, name: 'Trusted DW' },
    { id: 'report-quality', type: 'report' as const, name: 'Data Quality Report' },
  ] as FabricComponent[],
  connections: [
    { id: 'c1', from: 'lakehouse-raw', to: 'notebook-quality', type: 'data-flow' as const },
    { id: 'c2', from: 'notebook-quality', to: 'lakehouse-quarantine', type: 'data-flow' as const, label: 'Failed' },
    { id: 'c3', from: 'notebook-quality', to: 'lakehouse-validated', type: 'data-flow' as const, label: 'Passed' },
    { id: 'c4', from: 'lakehouse-validated', to: 'warehouse-1', type: 'data-flow' as const },
    { id: 'c5', from: 'notebook-quality', to: 'report-quality', type: 'data-flow' as const, label: 'Metrics' },
  ] as FabricConnection[],
};

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

export const FabricTemplates = {
  'basic-lakehouse': BasicLakehouseTemplate,
  'real-time-streaming': RealTimeStreamingTemplate,
  'data-science-ml': DataScienceMLTemplate,
  'multi-source-integration': MultiSourceIntegrationTemplate,
  'self-service-analytics': SelfServiceAnalyticsTemplate,
  'data-product-platform': DataProductPlatformTemplate,
  'hybrid-cloud': HybridCloudIntegrationTemplate,
  'event-driven': EventDrivenArchitectureTemplate,
  'operational-analytics': OperationalAnalyticsTemplate,
  'data-quality-governance': DataQualityGovernanceTemplate,
};

export function getFabricTemplate(templateId: keyof typeof FabricTemplates) {
  return FabricTemplates[templateId];
}

export function listFabricTemplates(): Array<{ id: string; name: string; description: string }> {
  return Object.entries(FabricTemplates).map(([id, template]) => ({
    id,
    name: template.name,
    description: template.description,
  }));
}
