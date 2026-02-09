/**
 * Industry-Specific Templates
 * Pre-built data models and architectures for Retail, Finance, and Healthcare
 */

import { Entity, Relationship } from '../diagrams/er-diagram-generator';
import { FabricComponent, FabricConnection, FabricZone } from '../diagrams/fabric-architecture-generator';

// ============================================================================
// RETAIL INDUSTRY
// ============================================================================

export const RetailERModel = {
  name: 'Retail Database Model',
  description: 'Complete e-commerce and retail data model',
  entities: [
    {
      name: 'Customer',
      attributes: [
        { name: 'CustomerID', type: 'INT', isPrimaryKey: true },
        { name: 'Email', type: 'VARCHAR(100)' },
        { name: 'FirstName', type: 'VARCHAR(50)' },
        { name: 'LastName', type: 'VARCHAR(50)' },
        { name: 'Phone', type: 'VARCHAR(20)' },
        { name: 'LoyaltyTier', type: 'VARCHAR(20)' },
        { name: 'LoyaltyPoints', type: 'INT' },
        { name: 'CreatedDate', type: 'DATETIME' },
      ],
      primaryKey: 'CustomerID',
    },
    {
      name: 'Product',
      attributes: [
        { name: 'ProductID', type: 'INT', isPrimaryKey: true },
        { name: 'SKU', type: 'VARCHAR(50)' },
        { name: 'Name', type: 'VARCHAR(200)' },
        { name: 'Description', type: 'TEXT' },
        { name: 'CategoryID', type: 'INT', isForeignKey: true },
        { name: 'Price', type: 'DECIMAL(10,2)' },
        { name: 'CostPrice', type: 'DECIMAL(10,2)' },
        { name: 'StockQuantity', type: 'INT' },
      ],
      primaryKey: 'ProductID',
    },
    {
      name: 'Order',
      attributes: [
        { name: 'OrderID', type: 'INT', isPrimaryKey: true },
        { name: 'CustomerID', type: 'INT', isForeignKey: true },
        { name: 'OrderDate', type: 'DATETIME' },
        { name: 'Status', type: 'VARCHAR(20)' },
        { name: 'SubTotal', type: 'DECIMAL(10,2)' },
        { name: 'Tax', type: 'DECIMAL(10,2)' },
        { name: 'ShippingCost', type: 'DECIMAL(10,2)' },
        { name: 'TotalAmount', type: 'DECIMAL(10,2)' },
        { name: 'StoreID', type: 'INT', isForeignKey: true },
      ],
      primaryKey: 'OrderID',
    },
    {
      name: 'OrderItem',
      attributes: [
        { name: 'OrderItemID', type: 'INT', isPrimaryKey: true },
        { name: 'OrderID', type: 'INT', isForeignKey: true },
        { name: 'ProductID', type: 'INT', isForeignKey: true },
        { name: 'Quantity', type: 'INT' },
        { name: 'UnitPrice', type: 'DECIMAL(10,2)' },
        { name: 'Discount', type: 'DECIMAL(10,2)' },
        { name: 'LineTotal', type: 'DECIMAL(10,2)' },
      ],
      primaryKey: 'OrderItemID',
    },
    {
      name: 'Store',
      attributes: [
        { name: 'StoreID', type: 'INT', isPrimaryKey: true },
        { name: 'StoreName', type: 'VARCHAR(100)' },
        { name: 'StoreType', type: 'VARCHAR(50)' },
        { name: 'Address', type: 'VARCHAR(200)' },
        { name: 'City', type: 'VARCHAR(100)' },
        { name: 'State', type: 'VARCHAR(50)' },
        { name: 'PostalCode', type: 'VARCHAR(20)' },
      ],
      primaryKey: 'StoreID',
    },
    {
      name: 'Inventory',
      attributes: [
        { name: 'InventoryID', type: 'INT', isPrimaryKey: true },
        { name: 'ProductID', type: 'INT', isForeignKey: true },
        { name: 'StoreID', type: 'INT', isForeignKey: true },
        { name: 'QuantityOnHand', type: 'INT' },
        { name: 'ReorderLevel', type: 'INT' },
        { name: 'LastRestockDate', type: 'DATE' },
      ],
      primaryKey: 'InventoryID',
    },
  ] as Entity[],
  relationships: [
    { from: { entity: 'Customer', cardinality: 'exactly-one' }, to: { entity: 'Order', cardinality: 'zero-or-many' }, type: 'one-to-many', identifying: true },
    { from: { entity: 'Order', cardinality: 'exactly-one' }, to: { entity: 'OrderItem', cardinality: 'one-or-many' }, type: 'one-to-many', identifying: true },
    { from: { entity: 'Product', cardinality: 'exactly-one' }, to: { entity: 'OrderItem', cardinality: 'zero-or-many' }, type: 'one-to-many', identifying: false },
    { from: { entity: 'Store', cardinality: 'exactly-one' }, to: { entity: 'Order', cardinality: 'zero-or-many' }, type: 'one-to-many', identifying: false },
    { from: { entity: 'Product', cardinality: 'exactly-one' }, to: { entity: 'Inventory', cardinality: 'zero-or-many' }, type: 'one-to-many', identifying: true },
    { from: { entity: 'Store', cardinality: 'exactly-one' }, to: { entity: 'Inventory', cardinality: 'zero-or-many' }, type: 'one-to-many', identifying: true },
  ] as Relationship[],
};

export const RetailFabricArchitecture = {
  name: 'Retail Data Platform',
  description: 'Omnichannel retail analytics with customer 360',
  components: [
    { id: 'pos-db', type: 'sql-database' as const, name: 'POS Database' },
    { id: 'ecom-db', type: 'sql-database' as const, name: 'E-Commerce DB' },
    { id: 'pipeline-pos', type: 'pipeline' as const, name: 'POS Ingestion' },
    { id: 'pipeline-ecom', type: 'pipeline' as const, name: 'E-Com Ingestion' },
    { id: 'lakehouse-raw', type: 'lakehouse' as const, name: 'Raw Transaction Data' },
    { id: 'notebook-transform', type: 'notebook' as const, name: 'Customer 360 ETL' },
    { id: 'lakehouse-customer', type: 'lakehouse' as const, name: 'Customer 360' },
    { id: 'ml-model-churn', type: 'ml-model' as const, name: 'Churn Prediction' },
    { id: 'ml-model-recommend', type: 'ml-model' as const, name: 'Product Recommendations' },
    { id: 'warehouse-analytics', type: 'warehouse' as const, name: 'Retail Analytics DW' },
    { id: 'semantic-retail', type: 'semantic-model' as const, name: 'Retail Metrics' },
    { id: 'report-sales', type: 'report' as const, name: 'Sales Dashboard' },
    { id: 'report-inventory', type: 'report' as const, name: 'Inventory Management' },
    { id: 'dashboard-exec', type: 'dashboard' as const, name: 'Executive KPIs' },
  ] as FabricComponent[],
  connections: [
    { id: 'c1', from: 'pos-db', to: 'pipeline-pos', type: 'data-flow' as const },
    { id: 'c2', from: 'ecom-db', to: 'pipeline-ecom', type: 'data-flow' as const },
    { id: 'c3', from: 'pipeline-pos', to: 'lakehouse-raw', type: 'data-flow' as const },
    { id: 'c4', from: 'pipeline-ecom', to: 'lakehouse-raw', type: 'data-flow' as const },
    { id: 'c5', from: 'lakehouse-raw', to: 'notebook-transform', type: 'data-flow' as const },
    { id: 'c6', from: 'notebook-transform', to: 'lakehouse-customer', type: 'data-flow' as const },
    { id: 'c7', from: 'lakehouse-customer', to: 'ml-model-churn', type: 'data-flow' as const },
    { id: 'c8', from: 'lakehouse-customer', to: 'ml-model-recommend', type: 'data-flow' as const },
    { id: 'c9', from: 'lakehouse-customer', to: 'warehouse-analytics', type: 'data-flow' as const },
    { id: 'c10', from: 'warehouse-analytics', to: 'semantic-retail', type: 'data-flow' as const },
    { id: 'c11', from: 'semantic-retail', to: 'report-sales', type: 'reference' as const },
    { id: 'c12', from: 'semantic-retail', to: 'report-inventory', type: 'reference' as const },
    { id: 'c13', from: 'semantic-retail', to: 'dashboard-exec', type: 'reference' as const },
  ] as FabricConnection[],
  zones: [
    { id: 'source', name: 'Data Sources', components: ['pos-db', 'ecom-db'], securityLevel: 'internal' as const },
    { id: 'ingestion', name: 'Ingestion Layer', components: ['pipeline-pos', 'pipeline-ecom'], securityLevel: 'internal' as const },
    { id: 'storage', name: 'Data Lake', components: ['lakehouse-raw', 'lakehouse-customer'], securityLevel: 'internal' as const },
    { id: 'ml', name: 'Machine Learning', components: ['notebook-transform', 'ml-model-churn', 'ml-model-recommend'], securityLevel: 'internal' as const },
    { id: 'analytics', name: 'Analytics', components: ['warehouse-analytics', 'semantic-retail'], securityLevel: 'internal' as const },
    { id: 'reporting', name: 'Reporting', components: ['report-sales', 'report-inventory', 'dashboard-exec'], securityLevel: 'internal' as const },
  ] as FabricZone[],
};

// ============================================================================
// FINANCE INDUSTRY
// ============================================================================

export const FinanceERModel = {
  name: 'Financial Services Database Model',
  description: 'Banking and investment data model',
  entities: [
    {
      name: 'Customer',
      attributes: [
        { name: 'CustomerID', type: 'INT', isPrimaryKey: true },
        { name: 'SSN', type: 'CHAR(11)' },
        { name: 'FirstName', type: 'VARCHAR(50)' },
        { name: 'LastName', type: 'VARCHAR(50)' },
        { name: 'DateOfBirth', type: 'DATE' },
        { name: 'Email', type: 'VARCHAR(100)' },
        { name: 'Phone', type: 'VARCHAR(20)' },
        { name: 'RiskProfile', type: 'VARCHAR(20)' },
        { name: 'KYCStatus', type: 'VARCHAR(20)' },
      ],
      primaryKey: 'CustomerID',
    },
    {
      name: 'Account',
      attributes: [
        { name: 'AccountID', type: 'INT', isPrimaryKey: true },
        { name: 'CustomerID', type: 'INT', isForeignKey: true },
        { name: 'AccountNumber', type: 'VARCHAR(20)' },
        { name: 'AccountType', type: 'VARCHAR(50)' },
        { name: 'Balance', type: 'DECIMAL(18,2)' },
        { name: 'Currency', type: 'CHAR(3)' },
        { name: 'OpenDate', type: 'DATE' },
        { name: 'Status', type: 'VARCHAR(20)' },
        { name: 'InterestRate', type: 'DECIMAL(5,4)', nullable: true },
      ],
      primaryKey: 'AccountID',
    },
    {
      name: 'Transaction',
      attributes: [
        { name: 'TransactionID', type: 'BIGINT', isPrimaryKey: true },
        { name: 'AccountID', type: 'INT', isForeignKey: true },
        { name: 'TransactionDate', type: 'DATETIME' },
        { name: 'TransactionType', type: 'VARCHAR(50)' },
        { name: 'Amount', type: 'DECIMAL(18,2)' },
        { name: 'Description', type: 'VARCHAR(200)' },
        { name: 'MerchantID', type: 'INT', isForeignKey: true, nullable: true },
        { name: 'FraudScore', type: 'DECIMAL(5,2)', nullable: true },
      ],
      primaryKey: 'TransactionID',
    },
    {
      name: 'Loan',
      attributes: [
        { name: 'LoanID', type: 'INT', isPrimaryKey: true },
        { name: 'CustomerID', type: 'INT', isForeignKey: true },
        { name: 'LoanType', type: 'VARCHAR(50)' },
        { name: 'PrincipalAmount', type: 'DECIMAL(18,2)' },
        { name: 'InterestRate', type: 'DECIMAL(5,4)' },
        { name: 'Term', type: 'INT' },
        { name: 'StartDate', type: 'DATE' },
        { name: 'EndDate', type: 'DATE' },
        { name: 'Status', type: 'VARCHAR(20)' },
      ],
      primaryKey: 'LoanID',
    },
    {
      name: 'Payment',
      attributes: [
        { name: 'PaymentID', type: 'INT', isPrimaryKey: true },
        { name: 'LoanID', type: 'INT', isForeignKey: true },
        { name: 'PaymentDate', type: 'DATE' },
        { name: 'Amount', type: 'DECIMAL(10,2)' },
        { name: 'PrincipalPaid', type: 'DECIMAL(10,2)' },
        { name: 'InterestPaid', type: 'DECIMAL(10,2)' },
        { name: 'Status', type: 'VARCHAR(20)' },
      ],
      primaryKey: 'PaymentID',
    },
  ] as Entity[],
  relationships: [
    { from: { entity: 'Customer', cardinality: 'exactly-one' }, to: { entity: 'Account', cardinality: 'one-or-many' }, type: 'one-to-many', identifying: true },
    { from: { entity: 'Account', cardinality: 'exactly-one' }, to: { entity: 'Transaction', cardinality: 'zero-or-many' }, type: 'one-to-many', identifying: true },
    { from: { entity: 'Customer', cardinality: 'exactly-one' }, to: { entity: 'Loan', cardinality: 'zero-or-many' }, type: 'one-to-many', identifying: true },
    { from: { entity: 'Loan', cardinality: 'exactly-one' }, to: { entity: 'Payment', cardinality: 'zero-or-many' }, type: 'one-to-many', identifying: true },
  ] as Relationship[],
};

export const FinanceFabricArchitecture = {
  name: 'Financial Services Data Platform',
  description: 'Real-time fraud detection and regulatory reporting',
  components: [
    { id: 'core-banking', type: 'sql-database' as const, name: 'Core Banking System' },
    { id: 'eventstream-txn', type: 'eventstream' as const, name: 'Transaction Stream' },
    { id: 'kql-fraud', type: 'kql-database' as const, name: 'Fraud Detection' },
    { id: 'ml-fraud', type: 'ml-model' as const, name: 'Fraud Model' },
    { id: 'pipeline-batch', type: 'pipeline' as const, name: 'Batch Ingestion' },
    { id: 'lakehouse-raw', type: 'lakehouse' as const, name: 'Raw Financial Data' },
    { id: 'notebook-compliance', type: 'notebook' as const, name: 'Compliance Processing' },
    { id: 'lakehouse-curated', type: 'lakehouse' as const, name: 'Curated Data' },
    { id: 'warehouse-finance', type: 'warehouse' as const, name: 'Financial DW' },
    { id: 'semantic-risk', type: 'semantic-model' as const, name: 'Risk Analytics' },
    { id: 'report-regulatory', type: 'report' as const, name: 'Regulatory Reports' },
    { id: 'dashboard-fraud', type: 'dashboard' as const, name: 'Fraud Monitoring' },
  ] as FabricComponent[],
  connections: [
    { id: 'c1', from: 'core-banking', to: 'eventstream-txn', type: 'event-stream' as const, label: 'Real-time' },
    { id: 'c2', from: 'eventstream-txn', to: 'kql-fraud', type: 'event-stream' as const },
    { id: 'c3', from: 'kql-fraud', to: 'ml-fraud', type: 'api-call' as const, label: 'Score' },
    { id: 'c4', from: 'ml-fraud', to: 'dashboard-fraud', type: 'data-flow' as const },
    { id: 'c5', from: 'core-banking', to: 'pipeline-batch', type: 'data-flow' as const, label: 'Nightly' },
    { id: 'c6', from: 'pipeline-batch', to: 'lakehouse-raw', type: 'data-flow' as const },
    { id: 'c7', from: 'lakehouse-raw', to: 'notebook-compliance', type: 'data-flow' as const },
    { id: 'c8', from: 'notebook-compliance', to: 'lakehouse-curated', type: 'data-flow' as const },
    { id: 'c9', from: 'lakehouse-curated', to: 'warehouse-finance', type: 'data-flow' as const },
    { id: 'c10', from: 'warehouse-finance', to: 'semantic-risk', type: 'data-flow' as const },
    { id: 'c11', from: 'semantic-risk', to: 'report-regulatory', type: 'reference' as const },
  ] as FabricConnection[],
  zones: [
    { id: 'realtime', name: 'Real-Time Fraud Detection', components: ['eventstream-txn', 'kql-fraud', 'ml-fraud', 'dashboard-fraud'], securityLevel: 'internal' as const },
    { id: 'batch', name: 'Batch Processing', components: ['pipeline-batch', 'lakehouse-raw', 'notebook-compliance'], securityLevel: 'internal' as const },
    { id: 'reporting', name: 'Regulatory Reporting', components: ['lakehouse-curated', 'warehouse-finance', 'semantic-risk', 'report-regulatory'], securityLevel: 'internal' as const },
  ] as FabricZone[],
};

// ============================================================================
// HEALTHCARE INDUSTRY
// ============================================================================

export const HealthcareERModel = {
  name: 'Healthcare EHR Database Model',
  description: 'Electronic Health Records and clinical data',
  entities: [
    {
      name: 'Patient',
      attributes: [
        { name: 'PatientID', type: 'INT', isPrimaryKey: true },
        { name: 'MRN', type: 'VARCHAR(20)' },
        { name: 'FirstName', type: 'VARCHAR(50)' },
        { name: 'LastName', type: 'VARCHAR(50)' },
        { name: 'DOB', type: 'DATE' },
        { name: 'Gender', type: 'CHAR(1)' },
        { name: 'SSN', type: 'CHAR(11)' },
        { name: 'Email', type: 'VARCHAR(100)', nullable: true },
        { name: 'Phone', type: 'VARCHAR(20)', nullable: true },
      ],
      primaryKey: 'PatientID',
    },
    {
      name: 'Encounter',
      attributes: [
        { name: 'EncounterID', type: 'INT', isPrimaryKey: true },
        { name: 'PatientID', type: 'INT', isForeignKey: true },
        { name: 'ProviderID', type: 'INT', isForeignKey: true },
        { name: 'FacilityID', type: 'INT', isForeignKey: true },
        { name: 'EncounterDate', type: 'DATETIME' },
        { name: 'EncounterType', type: 'VARCHAR(50)' },
        { name: 'ChiefComplaint', type: 'TEXT' },
        { name: 'DischargeDate', type: 'DATETIME', nullable: true },
      ],
      primaryKey: 'EncounterID',
    },
    {
      name: 'Diagnosis',
      attributes: [
        { name: 'DiagnosisID', type: 'INT', isPrimaryKey: true },
        { name: 'EncounterID', type: 'INT', isForeignKey: true },
        { name: 'ICDCode', type: 'VARCHAR(10)' },
        { name: 'Description', type: 'VARCHAR(200)' },
        { name: 'IsPrimary', type: 'BIT' },
      ],
      primaryKey: 'DiagnosisID',
    },
    {
      name: 'Procedure',
      attributes: [
        { name: 'ProcedureID', type: 'INT', isPrimaryKey: true },
        { name: 'EncounterID', type: 'INT', isForeignKey: true },
        { name: 'CPTCode', type: 'VARCHAR(10)' },
        { name: 'Description', type: 'VARCHAR(200)' },
        { name: 'ProcedureDate', type: 'DATETIME' },
        { name: 'ProviderID', type: 'INT', isForeignKey: true },
      ],
      primaryKey: 'ProcedureID',
    },
    {
      name: 'Medication',
      attributes: [
        { name: 'MedicationID', type: 'INT', isPrimaryKey: true },
        { name: 'PatientID', type: 'INT', isForeignKey: true },
        { name: 'DrugName', type: 'VARCHAR(100)' },
        { name: 'NDCCode', type: 'VARCHAR(11)' },
        { name: 'Dosage', type: 'VARCHAR(50)' },
        { name: 'Frequency', type: 'VARCHAR(50)' },
        { name: 'StartDate', type: 'DATE' },
        { name: 'EndDate', type: 'DATE', nullable: true },
      ],
      primaryKey: 'MedicationID',
    },
  ] as Entity[],
  relationships: [
    { from: { entity: 'Patient', cardinality: 'exactly-one' }, to: { entity: 'Encounter', cardinality: 'zero-or-many' }, type: 'one-to-many', identifying: true },
    { from: { entity: 'Encounter', cardinality: 'exactly-one' }, to: { entity: 'Diagnosis', cardinality: 'one-or-many' }, type: 'one-to-many', identifying: true },
    { from: { entity: 'Encounter', cardinality: 'exactly-one' }, to: { entity: 'Procedure', cardinality: 'zero-or-many' }, type: 'one-to-many', identifying: true },
    { from: { entity: 'Patient', cardinality: 'exactly-one' }, to: { entity: 'Medication', cardinality: 'zero-or-many' }, type: 'one-to-many', identifying: true },
  ] as Relationship[],
};

export const HealthcareFabricArchitecture = {
  name: 'Healthcare Data Platform (HIPAA Compliant)',
  description: 'Clinical analytics with population health management',
  components: [
    { id: 'ehr-epic', type: 'gateway' as const, name: 'Epic EHR' },
    { id: 'ehr-cerner', type: 'gateway' as const, name: 'Cerner EHR' },
    { id: 'pipeline-hl7', type: 'pipeline' as const, name: 'HL7 Parser' },
    { id: 'pipeline-fhir', type: 'pipeline' as const, name: 'FHIR Converter' },
    { id: 'lakehouse-phi', type: 'lakehouse' as const, name: 'PHI Lakehouse', metadata: { encrypted: 'AES-256' } },
    { id: 'notebook-deidentify', type: 'notebook' as const, name: 'De-identification' },
    { id: 'lakehouse-deid', type: 'lakehouse' as const, name: 'De-identified Data' },
    { id: 'ml-readmission', type: 'ml-model' as const, name: 'Readmission Risk' },
    { id: 'warehouse-clinical', type: 'warehouse' as const, name: 'Clinical DW' },
    { id: 'semantic-quality', type: 'semantic-model' as const, name: 'Quality Metrics' },
    { id: 'report-population', type: 'report' as const, name: 'Population Health' },
    { id: 'dashboard-quality', type: 'dashboard' as const, name: 'Quality Dashboard' },
  ] as FabricComponent[],
  connections: [
    { id: 'c1', from: 'ehr-epic', to: 'pipeline-hl7', type: 'data-flow' as const },
    { id: 'c2', from: 'ehr-cerner', to: 'pipeline-fhir', type: 'data-flow' as const },
    { id: 'c3', from: 'pipeline-hl7', to: 'lakehouse-phi', type: 'data-flow' as const },
    { id: 'c4', from: 'pipeline-fhir', to: 'lakehouse-phi', type: 'data-flow' as const },
    { id: 'c5', from: 'lakehouse-phi', to: 'notebook-deidentify', type: 'data-flow' as const },
    { id: 'c6', from: 'notebook-deidentify', to: 'lakehouse-deid', type: 'data-flow' as const },
    { id: 'c7', from: 'lakehouse-deid', to: 'ml-readmission', type: 'data-flow' as const },
    { id: 'c8', from: 'lakehouse-deid', to: 'warehouse-clinical', type: 'data-flow' as const },
    { id: 'c9', from: 'warehouse-clinical', to: 'semantic-quality', type: 'data-flow' as const },
    { id: 'c10', from: 'semantic-quality', to: 'report-population', type: 'reference' as const },
    { id: 'c11', from: 'semantic-quality', to: 'dashboard-quality', type: 'reference' as const },
  ] as FabricConnection[],
  zones: [
    { id: 'phi', name: 'PHI Zone (Encrypted)', components: ['lakehouse-phi'], securityLevel: 'internal' as const, color: '#E74856' },
    { id: 'deid', name: 'De-identified Zone', components: ['lakehouse-deid', 'ml-readmission'], securityLevel: 'internal' as const, color: '#FFB900' },
    { id: 'analytics', name: 'Analytics Zone', components: ['warehouse-clinical', 'semantic-quality'], securityLevel: 'internal' as const, color: '#0078D4' },
  ] as FabricZone[],
};

// ============================================================================
// INDUSTRY TEMPLATE REGISTRY
// ============================================================================

export const IndustryTemplates = {
  retail: {
    erModel: RetailERModel,
    fabricArchitecture: RetailFabricArchitecture,
  },
  finance: {
    erModel: FinanceERModel,
    fabricArchitecture: FinanceFabricArchitecture,
  },
  healthcare: {
    erModel: HealthcareERModel,
    fabricArchitecture: HealthcareFabricArchitecture,
  },
};

export function getIndustryTemplate(industry: 'retail' | 'finance' | 'healthcare') {
  return IndustryTemplates[industry];
}

export function listIndustryTemplates() {
  return [
    { id: 'retail', name: 'Retail & E-Commerce', description: 'Customer 360, inventory, and sales analytics' },
    { id: 'finance', name: 'Financial Services', description: 'Fraud detection, compliance, and risk management' },
    { id: 'healthcare', name: 'Healthcare & Life Sciences', description: 'Clinical analytics and population health (HIPAA compliant)' },
  ];
}
