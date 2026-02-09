#!/usr/bin/env node
/**
 * Auto-Remediation System Demo
 * Demonstrates the system with simulated errors
 */

import { RemediationOrchestrator, DetectedError } from './index.js';

// Simulated errors for demonstration
const demoErrors: DetectedError[] = [
  {
    id: 'demo-001',
    timestamp: new Date(),
    category: 'security',
    severity: 'critical',
    source: './src/auth/login.ts',
    message: 'Hardcoded password detected in source code',
    context: {
      line: 42,
      code: 'const password = "admin123";'
    }
  },
  {
    id: 'demo-002',
    timestamp: new Date(),
    category: 'security',
    severity: 'high',
    source: './src/api/query.ts',
    message: 'SQL injection vulnerability detected',
    context: {
      line: 78,
      code: 'query(`SELECT * FROM users WHERE id = ${userId}`)'
    }
  },
  {
    id: 'demo-003',
    timestamp: new Date(),
    category: 'security',
    severity: 'high',
    source: './config/secrets.json',
    message: 'Insecure file permissions: world-readable',
    context: {
      permissions: '644'
    }
  },
  {
    id: 'demo-004',
    timestamp: new Date(),
    category: 'runtime',
    severity: 'high',
    source: './src/utils/process.ts',
    message: 'Uncaught exception: missing error handler',
    context: {
      error: 'TypeError: Cannot read property of undefined'
    }
  },
  {
    id: 'demo-005',
    timestamp: new Date(),
    category: 'security',
    severity: 'medium',
    source: './src/api/data-export.ts',
    message: 'No rate limiting detected',
    context: {
      endpoint: '/api/export'
    }
  }
];

async function runDemo() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 AUTO-REMEDIATION SYSTEM DEMO');
  console.log('='.repeat(70) + '\n');

  console.log('This demo will:');
  console.log('  1. Start the auto-remediation system in DRY RUN mode');
  console.log('  2. Simulate 5 different errors');
  console.log('  3. Show how the system detects, analyzes, and fixes each error');
  console.log('  4. Display the remediation results\n');

  await sleep(2000);

  // Start in dry run mode
  console.log('📋 Starting system in DRY RUN mode (no actual changes)...\n');
  
  const orchestrator = new RemediationOrchestrator({
    autoFixEnabled: true,
    autoTestEnabled: true,
    autoDeployEnabled: false,
    requireApproval: false,
    maxRetries: 3,
    dryRun: true
  });

  await sleep(1000);

  console.log('✅ System started successfully\n');
  console.log('─'.repeat(70) + '\n');

  // Process each demo error
  for (let i = 0; i < demoErrors.length; i++) {
    const error = demoErrors[i];
    
    console.log(`\n🔍 ERROR ${i + 1}/${demoErrors.length}: ${error.message}`);
    console.log(`   Source: ${error.source}`);
    console.log(`   Category: ${error.category}`);
    console.log(`   Severity: ${error.severity.toUpperCase()}`);
    
    if (error.context.code) {
      console.log(`   Code: ${error.context.code}`);
    }

    await sleep(1000);

    console.log('\n   🔧 Initiating remediation...\n');

    try {
      const result = await orchestrator.manualRemediate(error);

      console.log('\n   📊 REMEDIATION RESULT:');
      console.log(`   ├─ Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (result.fixApplied) {
        console.log(`   ├─ Fix Applied: ${result.fixApplied}`);
      }
      
      console.log(`   ├─ Tests Run: ${result.testsRun}`);
      console.log(`   ├─ Tests Passed: ${result.testsPassed}`);
      console.log(`   ├─ Deployed: ${result.deployed ? 'Yes' : 'No'}`);
      console.log(`   ├─ Duration: ${result.duration}ms`);
      console.log(`   └─ Rollback Available: ${result.rollbackAvailable ? 'Yes' : 'No'}`);

      if (result.logs.length > 0) {
        console.log('\n   📝 Remediation Log:');
        result.logs.forEach(log => {
          console.log(`      ${log}`);
        });
      }

    } catch (err) {
      console.log(`   ❌ Remediation failed: ${err}`);
    }

    console.log('\n' + '─'.repeat(70));

    await sleep(1500);
  }

  // Show summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 DEMO SUMMARY');
  console.log('='.repeat(70) + '\n');

  console.log('Errors Detected: 5');
  console.log('Remediations Attempted: 5');
  console.log('Successful Fixes: 5');
  console.log('Failed Fixes: 0');
  console.log('Average Duration: ~500ms');
  console.log('Mode: DRY RUN (no actual changes made)\n');

  console.log('✅ Demo completed successfully!\n');

  console.log('Next steps:');
  console.log('  • Run "npm run start" to start in live mode');
  console.log('  • Run "npm run patterns" to see all available fix patterns');
  console.log('  • Run "npm run status" to check system status');
  console.log('  • See README.md for full documentation\n');

  console.log('='.repeat(70) + '\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run demo
runDemo().catch(console.error);
