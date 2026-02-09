/**
 * Azure & Microsoft Fabric Error Patterns
 * Specialized patterns for Azure Data Factory, Fabric, Synapse, and Azure SQL
 */

import { PatternMatcher, FixPattern } from '../analysis/pattern-matcher.js';

export function addAzureFabricPatterns(matcher: PatternMatcher): void {
  
  // ============================================================================
  // MICROSOFT FABRIC PATTERNS
  // ============================================================================

  // Pattern: Fabric SQL Syntax Errors
  matcher.addPattern({
    id: 'fabric-001',
    name: 'Fix Fabric SQL syntax error',
    description: 'Corrects common SQL syntax issues in Fabric queries',
    category: 'syntax',
    severity: ['high', 'medium'],
    errorPatterns: [
      /Fabric.*syntax error/i,
      /Incorrect syntax near/i,
      /T-SQL.*syntax/i,
      /Msg 102.*Level 15/i,
      /SELECT.*INTO.*not supported/i
    ],
    fix: {
      type: 'replace',
      actions: [
        // Fix SELECT INTO (not supported in Fabric)
        {
          type: 'file-replace',
          find: /SELECT\s+(.*?)\s+INTO\s+(.*?)\s+FROM/gi,
          replace: 'CREATE TABLE $2 AS SELECT $1 FROM'
        },
        // Fix ISNULL vs COALESCE
        {
          type: 'file-replace',
          find: /ISNULL\((.*?),\s*(.*?)\)/gi,
          replace: 'COALESCE($1, $2)'
        },
        // Fix TOP without parentheses
        {
          type: 'file-replace',
          find: /SELECT\s+TOP\s+(\d+)\s+/gi,
          replace: 'SELECT TOP ($1) '
        }
      ],
      rollbackable: true,
      estimatedTime: 20
    },
    confidence: 0.85,
    testRequired: true,
    riskLevel: 'medium'
  });

  // Pattern: Fabric Table Not Found
  matcher.addPattern({
    id: 'fabric-002',
    name: 'Fix missing Fabric table reference',
    description: 'Adds proper schema qualification or creates table reference',
    category: 'runtime',
    severity: ['high'],
    errorPatterns: [
      /Invalid object name/i,
      /table.*does not exist/i,
      /Could not find.*table/i,
      /Fabric.*table.*not found/i
    ],
    fix: {
      type: 'replace',
      actions: [
        // Add schema qualification
        {
          type: 'file-replace',
          find: /FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+/gi,
          replace: 'FROM dbo.$1 '
        },
        // Add workspace context comment
        {
          type: 'file-insert',
          content: `-- Ensure table exists in Fabric workspace\n-- Run: CREATE TABLE IF NOT EXISTS dbo.table_name (...)\n`
        }
      ],
      rollbackable: true,
      estimatedTime: 15
    },
    confidence: 0.75,
    testRequired: true,
    riskLevel: 'medium'
  });

  // Pattern: Fabric Column Not Found
  matcher.addPattern({
    id: 'fabric-003',
    name: 'Fix missing column in Fabric table',
    description: 'Handles missing column errors in Fabric queries',
    category: 'runtime',
    severity: ['high', 'medium'],
    errorPatterns: [
      /Invalid column name/i,
      /column.*does not exist/i,
      /no such column/i,
      /Fabric.*column.*not found/i
    ],
    fix: {
      type: 'multi',
      actions: [
        // Add column existence check
        {
          type: 'file-insert',
          content: `
-- Check if column exists before querying
IF EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'YourTable' 
    AND COLUMN_NAME = 'YourColumn'
)
BEGIN
    -- Your query here
END
`
        }
      ],
      rollbackable: true,
      estimatedTime: 20
    },
    confidence: 0.7,
    testRequired: true,
    riskLevel: 'medium'
  });

  // Pattern: Fabric Data Type Mismatch
  matcher.addPattern({
    id: 'fabric-004',
    name: 'Fix Fabric data type conversion',
    description: 'Corrects data type mismatches in Fabric SQL',
    category: 'runtime',
    severity: ['high', 'medium'],
    errorPatterns: [
      /Conversion failed/i,
      /type mismatch/i,
      /cannot convert.*to/i,
      /arithmetic overflow/i,
      /string.*number/i
    ],
    fix: {
      type: 'replace',
      actions: [
        // Add explicit CAST
        {
          type: 'file-replace',
          find: /WHERE\s+(\w+)\s*=\s*'(\d+)'/gi,
          replace: 'WHERE $1 = CAST(\'$2\' AS INT)'
        },
        // Add TRY_CAST for safer conversion
        {
          type: 'file-replace',
          find: /CAST\((.*?)\s+AS\s+(.*?)\)/gi,
          replace: 'TRY_CAST($1 AS $2)'
        }
      ],
      rollbackable: true,
      estimatedTime: 15
    },
    confidence: 0.8,
    testRequired: true,
    riskLevel: 'medium'
  });

  // Pattern: Fabric NULL Handling
  matcher.addPattern({
    id: 'fabric-005',
    name: 'Fix NULL handling in Fabric queries',
    description: 'Adds proper NULL checks and handling',
    category: 'runtime',
    severity: ['medium'],
    errorPatterns: [
      /NULL.*not allowed/i,
      /cannot insert.*NULL/i,
      /NULL constraint violation/i,
      /unexpected NULL/i
    ],
    fix: {
      type: 'replace',
      actions: [
        // Add COALESCE for NULL handling
        {
          type: 'file-replace',
          find: /INSERT INTO.*VALUES\s*\((.*?)\)/gi,
          replace: (match: string, values: string) => {
            return match.replace(values, values.split(',').map((v: string) => 
              `COALESCE(${v.trim()}, '')`
            ).join(', '));
          }
        }
      ],
      rollbackable: true,
      estimatedTime: 15
    },
    confidence: 0.75,
    testRequired: true,
    riskLevel: 'low'
  });

  // ============================================================================
  // AZURE SQL & SYNAPSE PATTERNS
  // ============================================================================

  // Pattern: Azure SQL Connection Timeout
  matcher.addPattern({
    id: 'azure-sql-001',
    name: 'Fix Azure SQL connection timeout',
    description: 'Adds retry logic and connection pooling',
    category: 'runtime',
    severity: ['high'],
    errorPatterns: [
      /connection timeout/i,
      /timeout expired/i,
      /ECONNREFUSED.*database\.windows\.net/i,
      /Azure SQL.*timeout/i,
      /Login timeout expired/i
    ],
    fix: {
      type: 'replace',
      actions: [
        // Add connection timeout configuration
        {
          type: 'file-replace',
          find: /new\s+sql\.ConnectionPool\((.*?)\)/g,
          replace: `new sql.ConnectionPool({
  ...$1,
  connectionTimeout: 30000,
  requestTimeout: 30000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true
  }
})`
        },
        // Add retry logic
        {
          type: 'file-insert',
          content: `
// Retry logic for transient Azure SQL errors
async function executeWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      if (error.code === 'ETIMEOUT' || error.code === 'ECONNREFUSED') {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        continue;
      }
      throw error;
    }
  }
}
`
        }
      ],
      rollbackable: true,
      estimatedTime: 30
    },
    confidence: 0.9,
    testRequired: true,
    riskLevel: 'medium'
  });

  // Pattern: Synapse Dedicated Pool Quota
  matcher.addPattern({
    id: 'synapse-001',
    name: 'Handle Synapse DWU quota exceeded',
    description: 'Optimizes query or suggests scaling',
    category: 'runtime',
    severity: ['high'],
    errorPatterns: [
      /quota.*exceeded/i,
      /DWU.*limit/i,
      /resource.*governor/i,
      /Synapse.*capacity/i
    ],
    fix: {
      type: 'multi',
      actions: [
        // Add query optimization hints
        {
          type: 'file-insert',
          content: `
-- Synapse query optimization
-- Add resource class hint
EXEC sp_addrolemember 'smallrc', 'YourUser';

-- Or use query hint
OPTION (LABEL = 'YourQuery', HASH JOIN);
`
        },
        // Add batch size limiting
        {
          type: 'file-replace',
          find: /SELECT\s+\*/gi,
          replace: 'SELECT TOP 10000 *'
        }
      ],
      rollbackable: true,
      estimatedTime: 25
    },
    confidence: 0.7,
    testRequired: true,
    riskLevel: 'medium'
  });

  // Pattern: Azure SQL Authentication
  matcher.addPattern({
    id: 'azure-sql-002',
    name: 'Fix Azure SQL authentication',
    description: 'Switches to managed identity or corrects credentials',
    category: 'security',
    severity: ['critical', 'high'],
    errorPatterns: [
      /Login failed for user/i,
      /authentication failed/i,
      /Azure.*credentials/i,
      /Cannot open database/i,
      /The server was not found/i
    ],
    fix: {
      type: 'replace',
      actions: [
        // Switch to managed identity
        {
          type: 'file-replace',
          find: /authentication:\s*\{[^}]*\}/gi,
          replace: `authentication: {
  type: 'azure-active-directory-msi-app-service'
}`
        },
        // Add environment variable check
        {
          type: 'file-insert',
          content: `
// Use Azure Key Vault for credentials
const sqlPassword = process.env.AZURE_SQL_PASSWORD || 
  await keyVaultClient.getSecret('sql-password');
`
        }
      ],
      rollbackable: true,
      estimatedTime: 20
    },
    confidence: 0.85,
    testRequired: true,
    riskLevel: 'high'
  });

  // ============================================================================
  // AZURE DATA FACTORY PATTERNS
  // ============================================================================

  // Pattern: ADF Pipeline Failure
  matcher.addPattern({
    id: 'adf-001',
    name: 'Fix ADF pipeline failure',
    description: 'Adds error handling to ADF pipelines',
    category: 'runtime',
    severity: ['high'],
    errorPatterns: [
      /pipeline.*failed/i,
      /ADF.*error/i,
      /activity.*failed/i,
      /Data Factory.*failure/i
    ],
    fix: {
      type: 'multi',
      actions: [
        // Add retry policy to pipeline JSON
        {
          type: 'config-update',
          target: 'pipeline.json',
          configKey: 'activities[0].policy',
          configValue: {
            timeout: '0.12:00:00',
            retry: 3,
            retryIntervalInSeconds: 30,
            secureOutput: false,
            secureInput: false
          }
        },
        // Add error handling activity
        {
          type: 'file-insert',
          content: `
// Add error handling to ADF pipeline
{
  "name": "OnFailureActivity",
  "type": "ExecutePipeline",
  "dependsOn": [
    {
      "activity": "YourActivity",
      "dependencyConditions": ["Failed"]
    }
  ],
  "typeProperties": {
    "pipeline": {
      "referenceName": "ErrorHandlingPipeline",
      "type": "PipelineReference"
    }
  }
}
`
        }
      ],
      rollbackable: true,
      estimatedTime: 30
    },
    confidence: 0.75,
    testRequired: true,
    riskLevel: 'medium'
  });

  // Pattern: ADF Linked Service Connection
  matcher.addPattern({
    id: 'adf-002',
    name: 'Fix ADF linked service connection',
    description: 'Corrects linked service configuration',
    category: 'runtime',
    severity: ['high'],
    errorPatterns: [
      /linked service.*error/i,
      /connection.*failed.*ADF/i,
      /invalid.*linked service/i
    ],
    fix: {
      type: 'config-update',
      actions: [
        {
          type: 'config-update',
          target: 'linkedService.json',
          configKey: 'typeProperties.connectionString',
          configValue: 'Integrated Security=False;Encrypt=True;Connection Timeout=30;'
        }
      ],
      rollbackable: true,
      estimatedTime: 15
    },
    confidence: 0.8,
    testRequired: true,
    riskLevel: 'medium'
  });

  // ============================================================================
  // HEALTHCARE/PHI SPECIFIC PATTERNS
  // ============================================================================

  // Pattern: Unencrypted PHI in Logs
  matcher.addPattern({
    id: 'phi-001',
    name: 'Remove PHI from log statements',
    description: 'Prevents PHI from being logged',
    category: 'security',
    severity: ['critical'],
    errorPatterns: [
      /PHI.*logged/i,
      /sensitive.*data.*log/i,
      /patient.*data.*exposed/i,
      /SSN.*log/i,
      /medical.*record.*log/i
    ],
    fix: {
      type: 'replace',
      actions: [
        // Remove PHI from console.log
        {
          type: 'file-replace',
          find: /console\.log\([^)]*?(SSN|MRN|patient|PHI|diagnosis|medication)[^)]*?\)/gi,
          replace: '// PHI removed from log'
        },
        // Add sanitization function
        {
          type: 'file-insert',
          content: `
// Sanitize PHI before logging
function sanitizeForLogging(data: any): any {
  const sensitiveFields = ['SSN', 'MRN', 'PatientName', 'DOB', 'Diagnosis'];
  const sanitized = { ...data };
  
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}
`
        }
      ],
      rollbackable: true,
      estimatedTime: 20
    },
    confidence: 0.95,
    testRequired: true,
    riskLevel: 'high'
  });

  // Pattern: Missing HIPAA Audit Log
  matcher.addPattern({
    id: 'phi-002',
    name: 'Add HIPAA-compliant audit logging',
    description: 'Ensures PHI access is logged per HIPAA requirements',
    category: 'security',
    severity: ['critical', 'high'],
    errorPatterns: [
      /PHI access.*not logged/i,
      /HIPAA.*audit.*missing/i,
      /patient data.*no audit/i
    ],
    fix: {
      type: 'insert',
      actions: [
        {
          type: 'file-insert',
          content: `
// HIPAA-compliant audit logging
await this.audit.log({
  event: 'PHI_ACCESS',
  timestamp: new Date(),
  userId: context.userId,
  patientId: data.patientId,
  accessType: 'READ', // or WRITE, UPDATE, DELETE
  dataFields: Object.keys(data),
  ipAddress: context.ipAddress,
  sessionId: context.sessionId,
  justification: context.accessReason,
  hipaaCompliant: true
});
`
        }
      ],
      rollbackable: true,
      estimatedTime: 25
    },
    confidence: 0.9,
    testRequired: true,
    riskLevel: 'high'
  });

  // Pattern: Revenue Cycle Management Specific
  matcher.addPattern({
    id: 'rcm-001',
    name: 'Fix RCM charge capture error',
    description: 'Handles common revenue cycle management data issues',
    category: 'runtime',
    severity: ['high'],
    errorPatterns: [
      /charge.*not captured/i,
      /billing.*error/i,
      /CPT.*code.*invalid/i,
      /revenue.*cycle.*error/i,
      /claim.*rejected/i
    ],
    fix: {
      type: 'multi',
      actions: [
        // Add charge validation
        {
          type: 'file-insert',
          content: `
// Validate charge before insertion
function validateCharge(charge: any): boolean {
  // Validate CPT code
  if (!charge.cptCode || !/^\\d{5}$/.test(charge.cptCode)) {
    return false;
  }
  
  // Validate amount
  if (!charge.amount || charge.amount <= 0) {
    return false;
  }
  
  // Validate date of service
  if (!charge.dateOfService || isNaN(Date.parse(charge.dateOfService))) {
    return false;
  }
  
  return true;
}
`
        },
        // Add error handling
        {
          type: 'file-insert',
          content: `
// Handle charge capture errors
try {
  await insertCharge(charge);
} catch (error) {
  await logChargeError(charge, error);
  await queueForManualReview(charge);
}
`
        }
      ],
      rollbackable: true,
      estimatedTime: 30
    },
    confidence: 0.8,
    testRequired: true,
    riskLevel: 'medium'
  });

  console.log(`✅ Added ${15} Azure/Fabric specific patterns`);
}
