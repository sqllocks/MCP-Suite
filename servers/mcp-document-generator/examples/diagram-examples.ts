/**
 * Diagram Examples
 * Complete examples showing how to use ER and Fabric diagram generators
 */

import { createERDiagram, Entity, Relationship } from '../diagrams/er-diagram-generator.js';
import { FabricArchitectureDiagramGenerator } from '../diagrams/fabric-architecture-generator.js';
import { IconManager } from '../icons/icon-manager.js';
import * as fs from 'fs/promises';

// ============================================================================
// EXAMPLE 1: Healthcare Revenue Cycle Management Database (ER Diagram)
// ============================================================================

export async function createHealthcareRCMDiagram() {
  const entities: Entity[] = [
    {
      name: 'Patient',
      attributes: [
        { name: 'PatientID', type: 'INT', isPrimaryKey: true },
        { name: 'MRN', type: 'VARCHAR(20)', nullable: false },
        { name: 'FirstName', type: 'VARCHAR(50)' },
        { name: 'LastName', type: 'VARCHAR(50)' },
        { name: 'DOB', type: 'DATE' },
        { name: 'SSN', type: 'CHAR(11)' },
        { name: 'InsuranceID', type: 'INT', isForeignKey: true },
      ],
      primaryKey: 'PatientID',
    },
    {
      name: 'Insurance',
      attributes: [
        { name: 'InsuranceID', type: 'INT', isPrimaryKey: true },
        { name: 'PayerName', type: 'VARCHAR(100)' },
        { name: 'PolicyNumber', type: 'VARCHAR(50)' },
        { name: 'GroupNumber', type: 'VARCHAR(50)' },
        { name: 'EffectiveDate', type: 'DATE' },
        { name: 'ExpirationDate', type: 'DATE' },
      ],
      primaryKey: 'InsuranceID',
    },
    {
      name: 'Encounter',
      attributes: [
        { name: 'EncounterID', type: 'INT', isPrimaryKey: true },
        { name: 'PatientID', type: 'INT', isForeignKey: true },
        { name: 'ProviderID', type: 'INT', isForeignKey: true },
        { name: 'EncounterDate', type: 'DATETIME' },
        { name: 'EncounterType', type: 'VARCHAR(50)' },
        { name: 'FacilityID', type: 'INT', isForeignKey: true },
      ],
      primaryKey: 'EncounterID',
    },
    {
      name: 'Charge',
      attributes: [
        { name: 'ChargeID', type: 'INT', isPrimaryKey: true },
        { name: 'EncounterID', type: 'INT', isForeignKey: true },
        { name: 'CPTCode', type: 'VARCHAR(10)' },
        { name: 'ICDCode', type: 'VARCHAR(10)' },
        { name: 'ChargeAmount', type: 'DECIMAL(10,2)' },
        { name: 'Units', type: 'INT' },
        { name: 'ServiceDate', type: 'DATE' },
      ],
      primaryKey: 'ChargeID',
    },
    {
      name: 'Claim',
      attributes: [
        { name: 'ClaimID', type: 'INT', isPrimaryKey: true },
        { name: 'EncounterID', type: 'INT', isForeignKey: true },
        { name: 'ClaimNumber', type: 'VARCHAR(50)' },
        { name: 'SubmissionDate', type: 'DATE' },
        { name: 'Status', type: 'VARCHAR(20)' },
        { name: 'TotalAmount', type: 'DECIMAL(10,2)' },
      ],
      primaryKey: 'ClaimID',
    },
    {
      name: 'Payment',
      attributes: [
        { name: 'PaymentID', type: 'INT', isPrimaryKey: true },
        { name: 'ClaimID', type: 'INT', isForeignKey: true },
        { name: 'PaymentDate', type: 'DATE' },
        { name: 'PaymentAmount', type: 'DECIMAL(10,2)' },
        { name: 'PaymentMethod', type: 'VARCHAR(20)' },
        { name: 'EOBCode', type: 'VARCHAR(10)' },
      ],
      primaryKey: 'PaymentID',
    },
  ];

  const relationships: Relationship[] = [
    {
      name: 'has',
      from: { entity: 'Patient', cardinality: 'exactly-one' },
      to: { entity: 'Insurance', cardinality: 'zero-or-one' },
      type: 'one-to-one',
      identifying: false,
    },
    {
      name: 'visits',
      from: { entity: 'Patient', cardinality: 'exactly-one' },
      to: { entity: 'Encounter', cardinality: 'zero-or-many' },
      type: 'one-to-many',
      identifying: true,
    },
    {
      name: 'generates',
      from: { entity: 'Encounter', cardinality: 'exactly-one' },
      to: { entity: 'Charge', cardinality: 'one-or-many' },
      type: 'one-to-many',
      identifying: true,
    },
    {
      name: 'creates',
      from: { entity: 'Encounter', cardinality: 'exactly-one' },
      to: { entity: 'Claim', cardinality: 'zero-or-one' },
      type: 'one-to-one',
      identifying: true,
    },
    {
      name: 'receives',
      from: { entity: 'Claim', cardinality: 'exactly-one' },
      to: { entity: 'Payment', cardinality: 'zero-or-many' },
      type: 'one-to-many',
      identifying: true,
    },
  ];

  // Generate diagram in Crow's Foot notation (ERwin style)
  const svg = createERDiagram(entities, relationships, {
    notation: 'crows-foot',
    style: 'professional',
    showDataTypes: true,
    showConstraints: true,
    colorScheme: 'erwin',
    layout: 'hierarchical',
  });

  await fs.writeFile('./examples/healthcare-rcm-er-diagram.svg', svg);
  console.log('✅ Healthcare RCM ER Diagram created: healthcare-rcm-er-diagram.svg');

  return svg;
}

// ============================================================================
// EXAMPLE 2: E-Commerce Database (ER Diagram with IE Notation)
// ============================================================================

export async function createEcommerceDiagram() {
  const entities: Entity[] = [
    {
      name: 'Customer',
      attributes: [
        { name: 'CustomerID', type: 'INT', isPrimaryKey: true },
        { name: 'Email', type: 'VARCHAR(100)' },
        { name: 'Password', type: 'VARCHAR(255)' },
        { name: 'FirstName', type: 'VARCHAR(50)' },
        { name: 'LastName', type: 'VARCHAR(50)' },
        { name: 'CreatedDate', type: 'DATETIME' },
      ],
      primaryKey: 'CustomerID',
    },
    {
      name: 'Order',
      attributes: [
        { name: 'OrderID', type: 'INT', isPrimaryKey: true },
        { name: 'CustomerID', type: 'INT', isForeignKey: true },
        { name: 'OrderDate', type: 'DATETIME' },
        { name: 'Status', type: 'VARCHAR(20)' },
        { name: 'TotalAmount', type: 'DECIMAL(10,2)' },
      ],
      primaryKey: 'OrderID',
    },
    {
      name: 'Product',
      attributes: [
        { name: 'ProductID', type: 'INT', isPrimaryKey: true },
        { name: 'Name', type: 'VARCHAR(100)' },
        { name: 'Description', type: 'TEXT' },
        { name: 'Price', type: 'DECIMAL(10,2)' },
        { name: 'StockQuantity', type: 'INT' },
      ],
      primaryKey: 'ProductID',
    },
    {
      name: 'OrderItem',
      attributes: [
        { name: 'OrderItemID', type: 'INT', isPrimaryKey: true },
        { name: 'OrderID', type: 'INT', isForeignKey: true },
        { name: 'ProductID', type: 'INT', isForeignKey: true },
        { name: 'Quantity', type: 'INT' },
        { name: 'UnitPrice', type: 'DECIMAL(10,2)' },
      ],
      primaryKey: 'OrderItemID',
    },
  ];

  const relationships: Relationship[] = [
    {
      name: 'places',
      from: { entity: 'Customer', cardinality: 'exactly-one' },
      to: { entity: 'Order', cardinality: 'zero-or-many' },
      type: 'one-to-many',
      identifying: true,
    },
    {
      name: 'contains',
      from: { entity: 'Order', cardinality: 'exactly-one' },
      to: { entity: 'OrderItem', cardinality: 'one-or-many' },
      type: 'one-to-many',
      identifying: true,
    },
    {
      name: 'references',
      from: { entity: 'OrderItem', cardinality: 'one-or-many' },
      to: { entity: 'Product', cardinality: 'exactly-one' },
      type: 'many-to-one',
      identifying: false,
    },
  ];

  // Generate with IE notation
  const svg = createERDiagram(entities, relationships, {
    notation: 'ie',
    style: 'professional',
    colorScheme: 'modern',
  });

  await fs.writeFile('./examples/ecommerce-er-diagram-ie.svg', svg);
  console.log('✅ E-Commerce ER Diagram (IE notation) created');

  return svg;
}

// ============================================================================
// EXAMPLE 3: Microsoft Fabric Data Platform Architecture
// ============================================================================

export async function createFabricDataPlatformDiagram() {
  const iconManager = new IconManager();
  const generator = new FabricArchitectureDiagramGenerator(iconManager);

  // Download Fabric icons if not cached
  await iconManager.downloadLibraries(['fabric']);

  const components = [
    // Data Sources
    {
      id: 'gateway-1',
      type: 'gateway' as const,
      name: 'On-Prem Gateway',
      description: 'Connects to on-premise data',
    },
    {
      id: 'sql-db-1',
      type: 'sql-database' as const,
      name: 'Operational DB',
      description: 'Transactional workload',
      metadata: { sku: 'GP_Gen5_4' },
    },

    // Raw Data Layer
    {
      id: 'lakehouse-1',
      type: 'lakehouse' as const,
      name: 'Raw Data Lakehouse',
      description: 'Bronze layer',
      metadata: { size: '5TB' },
    },

    // Processing Layer
    {
      id: 'pipeline-1',
      type: 'pipeline' as const,
      name: 'Ingestion Pipeline',
      description: 'Daily batch load',
      metadata: { frequency: 'Daily' },
    },
    {
      id: 'notebook-1',
      type: 'notebook' as const,
      name: 'Data Transformation',
      description: 'Cleanse and transform',
    },
    {
      id: 'dataflow-1',
      type: 'dataflow' as const,
      name: 'Business Logic',
      description: 'Apply business rules',
    },

    // Curated Data Layer
    {
      id: 'lakehouse-2',
      type: 'lakehouse' as const,
      name: 'Curated Lakehouse',
      description: 'Silver/Gold layers',
      metadata: { size: '2TB' },
    },
    {
      id: 'warehouse-1',
      type: 'warehouse' as const,
      name: 'Analytics Warehouse',
      description: 'Star schema',
      metadata: { size: '1TB' },
    },

    // Real-Time Layer
    {
      id: 'eventstream-1',
      type: 'eventstream' as const,
      name: 'IoT Events',
      description: 'Real-time telemetry',
    },
    {
      id: 'kql-db-1',
      type: 'kql-database' as const,
      name: 'Real-Time Analytics',
      description: 'Time-series data',
    },

    // Analytics Layer
    {
      id: 'semantic-1',
      type: 'semantic-model' as const,
      name: 'Enterprise Semantic Model',
      description: 'Power BI Dataset',
    },
    {
      id: 'report-1',
      type: 'report' as const,
      name: 'Executive Dashboard',
      description: 'KPIs and metrics',
    },
    {
      id: 'dashboard-1',
      type: 'dashboard' as const,
      name: 'Real-Time Dashboard',
      description: 'Live monitoring',
    },

    // ML Layer
    {
      id: 'ml-model-1',
      type: 'ml-model' as const,
      name: 'Predictive Model',
      description: 'Forecast demand',
    },
  ];

  const connections = [
    // Ingestion flow
    { id: 'c1', from: 'gateway-1', to: 'lakehouse-1', type: 'data-flow' as const, label: 'Extract' },
    { id: 'c2', from: 'sql-db-1', to: 'pipeline-1', type: 'data-flow' as const },
    { id: 'c3', from: 'pipeline-1', to: 'lakehouse-1', type: 'data-flow' as const, label: 'Load' },

    // Transformation flow
    { id: 'c4', from: 'lakehouse-1', to: 'notebook-1', type: 'data-flow' as const },
    { id: 'c5', from: 'notebook-1', to: 'dataflow-1', type: 'data-flow' as const },
    { id: 'c6', from: 'dataflow-1', to: 'lakehouse-2', type: 'data-flow' as const },
    { id: 'c7', from: 'lakehouse-2', to: 'warehouse-1', type: 'data-flow' as const },

    // Real-time flow
    { id: 'c8', from: 'eventstream-1', to: 'kql-db-1', type: 'event-stream' as const },

    // Analytics flow
    { id: 'c9', from: 'warehouse-1', to: 'semantic-1', type: 'data-flow' as const },
    { id: 'c10', from: 'semantic-1', to: 'report-1', type: 'reference' as const },
    { id: 'c11', from: 'kql-db-1', to: 'dashboard-1', type: 'data-flow' as const },

    // ML flow
    { id: 'c12', from: 'lakehouse-2', to: 'ml-model-1', type: 'data-flow' as const, label: 'Training Data' },
  ];

  const zones = [
    {
      id: 'zone-1',
      name: 'Data Sources',
      components: ['gateway-1', 'sql-db-1'],
      color: '#E74856',
    },
    {
      id: 'zone-2',
      name: 'Raw Data Layer',
      components: ['lakehouse-1'],
      color: '#00B7C3',
    },
    {
      id: 'zone-3',
      name: 'Processing Layer',
      components: ['pipeline-1', 'notebook-1', 'dataflow-1'],
      color: '#FF8C00',
    },
    {
      id: 'zone-4',
      name: 'Curated Data',
      components: ['lakehouse-2', 'warehouse-1'],
      color: '#0078D4',
    },
    {
      id: 'zone-5',
      name: 'Real-Time',
      components: ['eventstream-1', 'kql-db-1'],
      color: '#742774',
    },
    {
      id: 'zone-6',
      name: 'Analytics & Reporting',
      components: ['semantic-1', 'report-1', 'dashboard-1', 'ml-model-1'],
      color: '#F2C811',
    },
  ];

  const result = await generator.generate(components, connections, zones, {
    title: 'Enterprise Data Platform - Microsoft Fabric',
    description: 'End-to-end data architecture with batch, real-time, and ML workloads',
    showLegend: true,
    showMetadata: true,
    layout: 'hierarchical',
    style: 'professional',
    showDataFlow: true,
  });

  await fs.writeFile('./examples/fabric-data-platform.svg', result.svg);
  console.log('✅ Fabric Data Platform diagram created');

  return result;
}

// ============================================================================
// EXAMPLE 4: Healthcare Data Integration (Fabric)
// ============================================================================

export async function createHealthcareFabricDiagram() {
  const iconManager = new IconManager();
  const generator = new FabricArchitectureDiagramGenerator(iconManager);

  await iconManager.downloadLibraries(['fabric']);

  const components = [
    // Sources
    { id: 'epic', type: 'gateway' as const, name: 'Epic EHR' },
    { id: 'cerner', type: 'gateway' as const, name: 'Cerner' },
    { id: 'lab-system', type: 'sql-database' as const, name: 'Lab System' },

    // Ingestion
    { id: 'hl7-pipeline', type: 'pipeline' as const, name: 'HL7 Parser' },
    { id: 'fhir-pipeline', type: 'pipeline' as const, name: 'FHIR Converter' },

    // Storage
    { id: 'phi-lakehouse', type: 'lakehouse' as const, name: 'PHI Lakehouse', metadata: { encrypted: 'Yes' } },
    { id: 'clinical-dw', type: 'warehouse' as const, name: 'Clinical DW' },

    // Analytics
    { id: 'clinical-notebook', type: 'notebook' as const, name: 'Clinical Analytics' },
    { id: 'population-health', type: 'report' as const, name: 'Population Health' },
    { id: 'quality-metrics', type: 'dashboard' as const, name: 'Quality Metrics' },
  ];

  const connections = [
    { id: 'c1', from: 'epic', to: 'hl7-pipeline', type: 'data-flow' as const },
    { id: 'c2', from: 'cerner', to: 'fhir-pipeline', type: 'data-flow' as const },
    { id: 'c3', from: 'lab-system', to: 'phi-lakehouse', type: 'data-flow' as const },
    { id: 'c4', from: 'hl7-pipeline', to: 'phi-lakehouse', type: 'data-flow' as const },
    { id: 'c5', from: 'fhir-pipeline', to: 'phi-lakehouse', type: 'data-flow' as const },
    { id: 'c6', from: 'phi-lakehouse', to: 'clinical-dw', type: 'data-flow' as const },
    { id: 'c7', from: 'clinical-dw', to: 'clinical-notebook', type: 'data-flow' as const },
    { id: 'c8', from: 'clinical-notebook', to: 'population-health', type: 'data-flow' as const },
    { id: 'c9', from: 'clinical-dw', to: 'quality-metrics', type: 'data-flow' as const },
  ];

  const result = await generator.generate(components, connections, undefined, {
    title: 'Healthcare Data Integration Platform',
    description: 'HIPAA-compliant clinical data analytics',
    showLegend: true,
    layout: 'hierarchical',
  });

  await fs.writeFile('./examples/healthcare-fabric-integration.svg', result.svg);
  console.log('✅ Healthcare Fabric Integration diagram created');

  return result;
}

// ============================================================================
// Run all examples
// ============================================================================

export async function generateAllExamples() {
  console.log('🎨 Generating diagram examples...\n');

  try {
    // Create examples directory
    await fs.mkdir('./examples', { recursive: true });

    // ER Diagrams
    console.log('1️⃣ Creating ER Diagrams...');
    await createHealthcareRCMDiagram();
    await createEcommerceDiagram();

    // Fabric Architecture Diagrams
    console.log('\n2️⃣ Creating Fabric Diagrams...');
    await createFabricDataPlatformDiagram();
    await createHealthcareFabricDiagram();

    console.log('\n✅ All examples generated successfully!');
    console.log('\nGenerated files:');
    console.log('  - healthcare-rcm-er-diagram.svg');
    console.log('  - ecommerce-er-diagram-ie.svg');
    console.log('  - fabric-data-platform.svg');
    console.log('  - healthcare-fabric-integration.svg');
  } catch (error) {
    console.error('❌ Error generating examples:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  generateAllExamples();
}
