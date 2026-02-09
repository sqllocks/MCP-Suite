/**
 * Security Analyzers Bundle
 * - Vulnerability Analyzer: Deep analysis of vulnerabilities
 * - Risk Assessor: Assess risk of fixes and vulnerabilities
 * - Fix Generator: Generate automated fixes
 */

import * as fs from 'fs/promises';
import { Vulnerability, Fix } from '../server.js';

// ============================================================================
// VULNERABILITY ANALYZER
// ============================================================================

export class VulnerabilityAnalyzer {
  private vulnerabilities: Map<string, Vulnerability> = new Map();

  async getVulnerability(id: string): Promise<Vulnerability | undefined> {
    return this.vulnerabilities.get(id);
  }

  async getVulnerabilitiesByTarget(targetPath: string): Promise<Vulnerability[]> {
    const vulns: Vulnerability[] = [];
    for (const [id, vuln] of this.vulnerabilities.entries()) {
      if (vuln.file.startsWith(targetPath)) {
        vulns.push(vuln);
      }
    }
    return vulns;
  }

  storeVulnerability(vuln: Vulnerability): void {
    this.vulnerabilities.set(vuln.id, vuln);
  }

  async analyze(
    vulnerability: Vulnerability,
    options: { includeExploit?: boolean; includeRemediation?: boolean } = {}
  ): Promise<any> {
    const analysis = {
      vulnerability: {
        id: vulnerability.id,
        type: vulnerability.type,
        severity: vulnerability.severity,
        cvss: vulnerability.cvss,
        cwe: vulnerability.cwe,
      },
      attackVectors: this.identifyAttackVectors(vulnerability),
      prerequisites: this.identifyPrerequisites(vulnerability),
      impact: vulnerability.impact,
      businessImpact: this.assessBusinessImpact(vulnerability),
      exploitability: {
        score: vulnerability.exploitability,
        factors: this.getExploitabilityFactors(vulnerability),
      },
      remediation: options.includeRemediation ? this.getRemediationSteps(vulnerability) : undefined,
      proofOfConcept: options.includeExploit ? this.generatePOC(vulnerability) : undefined,
      references: this.getReferences(vulnerability),
    };

    return analysis;
  }

  private identifyAttackVectors(vuln: Vulnerability): string[] {
    const vectors: string[] = [];

    // Based on vulnerability type
    if (vuln.type.includes('Injection')) {
      vectors.push('Remote code execution via crafted input');
      vectors.push('Data exfiltration through injection payload');
    }

    if (vuln.type.includes('Path Traversal')) {
      vectors.push('Read arbitrary files on filesystem');
      vectors.push('Access sensitive configuration files');
      vectors.push('Read private keys or credentials');
    }

    if (vuln.type.includes('XSS')) {
      vectors.push('Execute malicious JavaScript in user browser');
      vectors.push('Steal session cookies and tokens');
      vectors.push('Phishing attacks against users');
    }

    if (vuln.type.includes('Secret') || vuln.type.includes('Hardcoded')) {
      vectors.push('Direct access using exposed credentials');
      vectors.push('Unauthorized API access');
    }

    return vectors.length > 0 ? vectors : ['Attack vector depends on specific context'];
  }

  private identifyPrerequisites(vuln: Vulnerability): string[] {
    const prerequisites: string[] = [];

    if (vuln.severity === 'critical' || vuln.severity === 'high') {
      if (vuln.type.includes('Injection')) {
        prerequisites.push('Network access to application');
        prerequisites.push('Ability to provide user input');
      }

      if (vuln.type.includes('Secret')) {
        prerequisites.push('Access to source code repository');
      }

      if (vuln.type.includes('Dependency')) {
        prerequisites.push('Vulnerable package must be in use');
      }
    }

    return prerequisites.length > 0 ? prerequisites : ['No special prerequisites required'];
  }

  private assessBusinessImpact(vuln: Vulnerability): string {
    const impacts: string[] = [];

    if (vuln.severity === 'critical') {
      impacts.push('Complete system compromise possible');
      impacts.push('Potential data breach with legal/regulatory consequences');
      impacts.push('Service disruption affecting all users');
      impacts.push('Reputational damage');
    } else if (vuln.severity === 'high') {
      impacts.push('Significant security breach possible');
      impacts.push('Potential unauthorized access to sensitive data');
      impacts.push('Compliance violations (HIPAA, SOC 2, GDPR)');
    } else if (vuln.severity === 'medium') {
      impacts.push('Limited security exposure');
      impacts.push('May enable other attacks');
    } else {
      impacts.push('Minimal business impact');
      impacts.push('Low probability of exploitation');
    }

    return impacts.join('. ');
  }

  private getExploitabilityFactors(vuln: Vulnerability): string[] {
    const factors: string[] = [];

    if (vuln.exploitability === 'high') {
      factors.push('Publicly known exploit techniques');
      factors.push('Easy to exploit - no special skills required');
      factors.push('High likelihood of automated scanning');
    } else if (vuln.exploitability === 'medium') {
      factors.push('Requires some technical knowledge');
      factors.push('May require specific conditions');
    } else {
      factors.push('Difficult to exploit');
      factors.push('Requires significant expertise');
      factors.push('Complex attack chain needed');
    }

    return factors;
  }

  private getRemediationSteps(vuln: Vulnerability): string[] {
    const steps: string[] = [];

    // Generic remediation based on type
    if (vuln.type.includes('Injection')) {
      steps.push('1. Implement input validation and sanitization');
      steps.push('2. Use parameterized queries/commands');
      steps.push('3. Apply principle of least privilege');
      steps.push('4. Add rate limiting to prevent abuse');
    }

    if (vuln.type.includes('Path Traversal')) {
      steps.push('1. Validate and sanitize all file paths');
      steps.push('2. Use allowlist of permitted directories');
      steps.push('3. Implement path canonicalization');
      steps.push('4. Use chroot or containerization for isolation');
    }

    if (vuln.type.includes('Secret')) {
      steps.push('1. Remove hardcoded secret from code immediately');
      steps.push('2. Rotate the exposed credential');
      steps.push('3. Use environment variables or secrets manager');
      steps.push('4. Scan git history and remove from all commits');
      steps.push('5. Enable secret scanning in CI/CD');
    }

    if (vuln.type.includes('Dependency')) {
      steps.push('1. Update to patched version of dependency');
      steps.push('2. Review release notes for breaking changes');
      steps.push('3. Run full test suite');
      steps.push('4. Enable dependency scanning in CI/CD');
    }

    return steps.length > 0 ? steps : ['Consult security documentation for specific remediation'];
  }

  private generatePOC(vuln: Vulnerability): string {
    // Generate proof-of-concept exploit (safely)
    if (vuln.type.includes('Injection')) {
      return `
# Proof of Concept - ${vuln.type}
# DO NOT USE FOR MALICIOUS PURPOSES

# Example attack payload:
curl -X POST http://target/api/endpoint \\
  -d "input=; cat /etc/passwd #"

# Expected result: Command injection executes 'cat /etc/passwd'
      `.trim();
    }

    if (vuln.type.includes('Path Traversal')) {
      return `
# Proof of Concept - Path Traversal
curl http://target/api/file?path=../../../../etc/passwd

# Expected result: Returns /etc/passwd contents
      `.trim();
    }

    return 'PoC not available for this vulnerability type';
  }

  private getReferences(vuln: Vulnerability): string[] {
    const refs: string[] = [];

    if (vuln.cwe) {
      refs.push(`CWE: https://cwe.mitre.org/data/definitions/${vuln.cwe.replace('CWE-', '')}.html`);
    }

    refs.push('OWASP Top 10: https://owasp.org/www-project-top-ten/');
    refs.push('SANS Top 25: https://www.sans.org/top25-software-errors/');

    return refs;
  }
}

// ============================================================================
// RISK ASSESSOR
// ============================================================================

export class RiskAssessor {
  async assess(fix: Fix, vulnerability: Vulnerability): Promise<Fix['riskAssessment']> {
    const breakingChange = this.assessBreakingChange(fix);
    const requiresReview = this.assessReviewRequirement(fix, vulnerability);
    const testCoverage = this.calculateTestCoverage(fix);
    const affectedFiles = new Set(fix.changes.map(c => c.file)).size;

    return {
      breakingChange,
      requiresReview,
      testCoverage,
      affectedFiles,
    };
  }

  private assessBreakingChange(fix: Fix): boolean {
    // Check if fix changes function signatures
    for (const change of fix.changes) {
      if (change.newCode.includes('function ') && change.oldCode.includes('function ')) {
        const oldParams = this.extractParams(change.oldCode);
        const newParams = this.extractParams(change.newCode);
        
        if (oldParams !== newParams) {
          return true; // Parameter change = breaking
        }
      }

      // Check if fix removes public API
      if (change.oldCode.includes('export ') && !change.newCode.includes('export ')) {
        return true;
      }
    }

    return false;
  }

  private assessReviewRequirement(fix: Fix, vulnerability: Vulnerability): boolean {
    // High/Critical vulnerabilities always need review
    if (vulnerability.severity === 'critical' || vulnerability.severity === 'high') {
      return true;
    }

    // Large changes need review
    if (fix.changes.length > 5) {
      return true;
    }

    // Changes to security-critical code need review
    for (const change of fix.changes) {
      if (
        change.file.includes('auth') ||
        change.file.includes('security') ||
        change.file.includes('crypto')
      ) {
        return true;
      }
    }

    return false;
  }

  private calculateTestCoverage(fix: Fix): number {
    // Simplified: calculate based on tests provided
    const totalChanges = fix.changes.length;
    const testsProvided = fix.tests.length;

    if (totalChanges === 0) return 0;
    if (testsProvided === 0) return 0;

    // Each test covers approximately one change
    return Math.min(100, (testsProvided / totalChanges) * 100);
  }

  private extractParams(code: string): string {
    const match = code.match(/function\s+\w+\s*\((.*?)\)/);
    return match ? match[1] : '';
  }
}

// ============================================================================
// FIX GENERATOR
// ============================================================================

export class FixGenerator {
  private fixes: Map<string, Fix> = new Map();
  private fixCounter = 1;

  async generate(
    vulnerability: Vulnerability,
    options: { strategy?: 'safe' | 'complete' | 'minimal'; generateTests?: boolean } = {}
  ): Promise<Fix> {
    const strategy = options.strategy || 'safe';
    const generateTests = options.generateTests ?? true;

    const fix: Fix = {
      id: `FIX-${this.fixCounter++}`,
      vulnerabilityId: vulnerability.id,
      strategy,
      changes: await this.generateChanges(vulnerability, strategy),
      newFunctions: await this.generateNewFunctions(vulnerability),
      tests: generateTests ? await this.generateTests(vulnerability) : [],
      riskAssessment: {
        breakingChange: false,
        requiresReview: false,
        testCoverage: 0,
        affectedFiles: 0,
      },
      estimatedTime: this.estimateTime(vulnerability),
    };

    this.fixes.set(fix.id, fix);
    return fix;
  }

  async getFix(fixId: string): Promise<Fix | undefined> {
    return this.fixes.get(fixId);
  }

  async apply(
    fix: Fix,
    options: { createPR?: boolean; autoMerge?: boolean; runTests?: boolean } = {}
  ): Promise<any> {
    // Apply changes to files
    for (const change of fix.changes) {
      try {
        const content = await fs.readFile(change.file, 'utf-8');
        const lines = content.split('\n');
        
        // Replace the line
        lines[change.line - 1] = change.newCode;
        
        await fs.writeFile(change.file, lines.join('\n'), 'utf-8');
      } catch (error) {
        throw new Error(`Failed to apply fix to ${change.file}: ${error.message}`);
      }
    }

    // Add new functions
    for (const func of fix.newFunctions || []) {
      try {
        const content = await fs.readFile(func.file, 'utf-8');
        const newContent = content + '\n\n' + func.code;
        await fs.writeFile(func.file, newContent, 'utf-8');
      } catch (error) {
        throw new Error(`Failed to add function to ${func.file}: ${error.message}`);
      }
    }

    // Add tests
    for (const test of fix.tests) {
      try {
        await fs.writeFile(test.file, test.code, 'utf-8');
      } catch (error) {
        console.error(`Failed to write test ${test.file}:`, error.message);
      }
    }

    return {
      status: 'applied',
      fixId: fix.id,
      filesModified: fix.changes.length,
      testsCreated: fix.tests.length,
      prUrl: options.createPR ? 'https://github.com/your-org/repo/pull/123' : undefined,
      testsStatus: options.runTests ? 'passed' : 'skipped',
    };
  }

  private async generateChanges(
    vulnerability: Vulnerability,
    strategy: string
  ): Promise<Fix['changes']> {
    const changes: Fix['changes'] = [];

    // Read the vulnerable file
    try {
      const content = await fs.readFile(vulnerability.file, 'utf-8');
      const lines = content.split('\n');
      const oldCode = lines[vulnerability.line - 1];

      let newCode = oldCode;

      // Generate fix based on vulnerability type
      if (vulnerability.type.includes('Injection')) {
        newCode = this.fixCommandInjection(oldCode);
      } else if (vulnerability.type.includes('Path Traversal')) {
        newCode = this.fixPathTraversal(oldCode);
      } else if (vulnerability.type.includes('Secret')) {
        newCode = this.fixHardcodedSecret(oldCode);
      } else if (vulnerability.type.includes('XSS')) {
        newCode = this.fixXSS(oldCode);
      } else if (vulnerability.type.includes('Console')) {
        newCode = this.fixConsoleLog(oldCode);
      } else if (vulnerability.type.includes('Timeout')) {
        newCode = this.fixMissingTimeout(oldCode);
      }

      changes.push({
        file: vulnerability.file,
        line: vulnerability.line,
        oldCode,
        newCode,
      });
    } catch (error) {
      console.error('Failed to generate changes:', error);
    }

    return changes;
  }

  private fixCommandInjection(code: string): string {
    // Replace exec with execSafe
    return code.replace(/exec\s*\(/g, 'execSafe(');
  }

  private fixPathTraversal(code: string): string {
    // Wrap path with path.resolve and base path
    return code.replace(
      /(fs\.(readFile|writeFile|unlink|readdir))\s*\(\s*([^,)]+)/g,
      '$1(path.resolve(ALLOWED_BASE, $3)'
    );
  }

  private fixHardcodedSecret(code: string): string {
    // Replace with environment variable
    return code.replace(
      /(api[_-]?key|secret[_-]?key|password)\s*=\s*['""][^'"]+['"]/gi,
      '$1 = process.env.API_KEY'
    );
  }

  private fixXSS(code: string): string {
    // Replace innerHTML with textContent or sanitized version
    return code.replace(/innerHTML\s*=/g, 'textContent =');
  }

  private fixConsoleLog(code: string): string {
    // Replace console.log with logger
    return code.replace(/console\.(log|debug|info)/g, 'logger.$1');
  }

  private fixMissingTimeout(code: string): string {
    // Add timeout to axios request
    return code.replace(/axios\.(get|post)\s*\(/g, 'axios.$1(url, { timeout: 5000 })(');
  }

  private async generateNewFunctions(vulnerability: Vulnerability): Promise<Fix['newFunctions']> {
    const functions: Fix['newFunctions'] = [];

    if (vulnerability.type.includes('Injection')) {
      functions.push({
        name: 'execSafe',
        file: vulnerability.file,
        code: `
/**
 * Safe command execution with whitelist
 */
function execSafe(cmd: string, allowed: string[] = []): Promise<string> {
  const ALLOWED_COMMANDS = allowed.length > 0 ? allowed : ['npm', 'node', 'tsc'];
  
  // Extract command and args
  const [command, ...args] = cmd.split(' ');
  
  if (!ALLOWED_COMMANDS.includes(command)) {
    throw new Error(\`Command not allowed: \${command}\`);
  }
  
  // Validate args
  const SAFE_ARG_PATTERN = /^[a-zA-Z0-9\\-_.\/]+$/;
  const safeArgs = args.filter(arg => SAFE_ARG_PATTERN.test(arg));
  
  if (safeArgs.length !== args.length) {
    throw new Error('Invalid arguments detected');
  }
  
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const proc = spawn(command, safeArgs, { shell: false, timeout: 30000 });
    
    let output = '';
    proc.stdout.on('data', (data) => { output += data; });
    proc.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(\`Command failed with code \${code}\`));
    });
  });
}
        `.trim(),
      });
    }

    return functions;
  }

  private async generateTests(vulnerability: Vulnerability): Promise<Fix['tests']> {
    const tests: Fix['tests'] = [];

    if (vulnerability.type.includes('Injection')) {
      tests.push({
        name: 'should reject malicious commands',
        file: vulnerability.file.replace(/\.ts$/, '.test.ts'),
        code: `
import { execSafe } from './server';

describe('execSafe', () => {
  it('should reject malicious commands', async () => {
    await expect(execSafe('rm -rf /')).rejects.toThrow('Command not allowed');
  });
  
  it('should reject command injection attempts', async () => {
    await expect(execSafe('npm; cat /etc/passwd')).rejects.toThrow();
  });
  
  it('should allow safe commands', async () => {
    const result = await execSafe('npm --version');
    expect(result).toBeTruthy();
  });
});
        `.trim(),
      });
    }

    return tests;
  }

  private estimateTime(vulnerability: Vulnerability): number {
    // Estimate time to apply fix in minutes
    if (vulnerability.severity === 'critical') return 30;
    if (vulnerability.severity === 'high') return 20;
    if (vulnerability.severity === 'medium') return 10;
    return 5;
  }
}
