/**
 * Pattern Matcher
 * Identifies known error patterns and suggests appropriate fixes
 */

import { DetectedError } from '../core/remediation-orchestrator.js';

export interface FixPattern {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: string[];
  errorPatterns: RegExp[];
  fix: FixDefinition;
  confidence: number; // 0-1
  testRequired: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface FixDefinition {
  type: 'replace' | 'insert' | 'delete' | 'command' | 'multi';
  actions: FixAction[];
  rollbackable: boolean;
  estimatedTime: number; // seconds
}

export interface FixAction {
  type: 'file-replace' | 'file-insert' | 'file-delete' | 'command' | 'config-update';
  target?: string;
  find?: string | RegExp;
  replace?: string;
  content?: string;
  command?: string;
  configKey?: string;
  configValue?: any;
}

export class PatternMatcher {
  private patterns: FixPattern[] = [];

  constructor() {
    this.initializePatterns();
  }

  /**
   * Initialize known error patterns and their fixes
   */
  private initializePatterns(): void {
    this.patterns = [
      // Security: Missing encryption
      {
        id: 'sec-001',
        name: 'Add encryption to plaintext storage',
        description: 'Encrypts plaintext data storage',
        category: 'security',
        severity: ['critical', 'high'],
        errorPatterns: [
          /plaintext.*storage/i,
          /unencrypted.*cache/i,
          /sensitive data.*not encrypted/i
        ],
        fix: {
          type: 'replace',
          actions: [
            {
              type: 'file-replace',
              find: /fs\.writeFileSync\((.*?),\s*(.*?)\)/g,
              replace: 'await this.encryption.encryptFile($1, $2, { profile })'
            },
            {
              type: 'file-insert',
              content: `import { EncryptionManager } from '../security/encryption-manager.js';`
            }
          ],
          rollbackable: true,
          estimatedTime: 30
        },
        confidence: 0.9,
        testRequired: true,
        riskLevel: 'medium'
      },

      // Security: SQL Injection
      {
        id: 'sec-002',
        name: 'Fix SQL injection vulnerability',
        description: 'Adds parameterized queries',
        category: 'security',
        severity: ['critical', 'high'],
        errorPatterns: [
          /SQL injection/i,
          /unsafe.*query/i,
          /string concatenation.*SQL/i
        ],
        fix: {
          type: 'replace',
          actions: [
            {
              type: 'file-replace',
              find: /query\(`SELECT \* FROM .*? WHERE .*? = '\$\{(.*?)\}'`\)/g,
              replace: 'query(`SELECT * FROM table WHERE column = ?`, [$1])'
            }
          ],
          rollbackable: true,
          estimatedTime: 20
        },
        confidence: 0.95,
        testRequired: true,
        riskLevel: 'high'
      },

      // Security: Authentication missing
      {
        id: 'sec-003',
        name: 'Add authentication checks',
        description: 'Adds authentication verification',
        category: 'security',
        severity: ['critical', 'high'],
        errorPatterns: [
          /authentication.*missing/i,
          /unauthenticated.*access/i,
          /no.*auth.*check/i
        ],
        fix: {
          type: 'insert',
          actions: [
            {
              type: 'file-insert',
              content: `
// Verify authentication
const authResult = await this.auth.verifySession(sessionId);
if (!authResult.valid) {
  throw new Error('Authentication required');
}
`
            }
          ],
          rollbackable: true,
          estimatedTime: 15
        },
        confidence: 0.85,
        testRequired: true,
        riskLevel: 'high'
      },

      // Security: Rate limiting missing
      {
        id: 'sec-004',
        name: 'Add rate limiting',
        description: 'Implements rate limiting',
        category: 'security',
        severity: ['high', 'medium'],
        errorPatterns: [
          /rate limit.*exceeded/i,
          /no.*rate.*limit/i,
          /DOS.*vulnerability/i
        ],
        fix: {
          type: 'insert',
          actions: [
            {
              type: 'file-insert',
              content: `
// Check rate limits
const rateCheck = await this.rateLimiter.checkAllLimits(profile, session, tool);
if (!rateCheck.allowed) {
  throw new Error(\`Rate limit exceeded. Retry in \${rateCheck.retryAfter} seconds\`);
}
`
            },
            {
              type: 'file-insert',
              content: `import { RateLimiter } from '../security/rate-limiter.js';`
            }
          ],
          rollbackable: true,
          estimatedTime: 25
        },
        confidence: 0.9,
        testRequired: true,
        riskLevel: 'medium'
      },

      // Security: Insecure file permissions
      {
        id: 'sec-005',
        name: 'Fix insecure file permissions',
        description: 'Sets secure file permissions',
        category: 'security',
        severity: ['high', 'medium'],
        errorPatterns: [
          /insecure.*permissions/i,
          /world-readable/i,
          /file.*permissions.*777/i
        ],
        fix: {
          type: 'command',
          actions: [
            {
              type: 'command',
              command: 'chmod 600'
            }
          ],
          rollbackable: true,
          estimatedTime: 5
        },
        confidence: 1.0,
        testRequired: false,
        riskLevel: 'low'
      },

      // Security: Hardcoded secrets
      {
        id: 'sec-006',
        name: 'Remove hardcoded secrets',
        description: 'Moves secrets to environment variables',
        category: 'security',
        severity: ['critical'],
        errorPatterns: [
          /hardcoded.*password/i,
          /hardcoded.*api[_-]?key/i,
          /hardcoded.*secret/i,
          /hardcoded.*token/i
        ],
        fix: {
          type: 'replace',
          actions: [
            {
              type: 'file-replace',
              find: /(password|apiKey|api_key|secret|token)\s*=\s*["']([^"']+)["']/gi,
              replace: '$1 = process.env.$1.toUpperCase() || \'\''
            },
            {
              type: 'file-insert',
              content: `// Secret moved to environment variable. Set in .env file.`
            }
          ],
          rollbackable: true,
          estimatedTime: 15
        },
        confidence: 0.8,
        testRequired: true,
        riskLevel: 'medium'
      },

      // Runtime: Missing error handling
      {
        id: 'runtime-001',
        name: 'Add error handling',
        description: 'Adds try-catch blocks',
        category: 'runtime',
        severity: ['high', 'medium'],
        errorPatterns: [
          /uncaught.*exception/i,
          /unhandled.*rejection/i,
          /missing.*error.*handler/i
        ],
        fix: {
          type: 'insert',
          actions: [
            {
              type: 'file-replace',
              find: /async\s+(\w+)\s*\((.*?)\)\s*\{/g,
              replace: `async $1($2) {\n  try {`
            },
            {
              type: 'file-insert',
              content: `
  } catch (error) {
    this.logger.error('Operation failed:', error);
    throw error;
  }
`
            }
          ],
          rollbackable: true,
          estimatedTime: 20
        },
        confidence: 0.75,
        testRequired: true,
        riskLevel: 'medium'
      },

      // Syntax: Missing imports
      {
        id: 'syntax-001',
        name: 'Add missing imports',
        description: 'Imports required modules',
        category: 'syntax',
        severity: ['high', 'medium'],
        errorPatterns: [
          /cannot find name/i,
          /is not defined/i,
          /module.*not found/i
        ],
        fix: {
          type: 'insert',
          actions: [
            {
              type: 'file-insert',
              content: `// Auto-generated import\nimport { /* module */ } from '/* path */';\n`
            }
          ],
          rollbackable: true,
          estimatedTime: 10
        },
        confidence: 0.7,
        testRequired: true,
        riskLevel: 'low'
      },

      // Test: Failed assertions
      {
        id: 'test-001',
        name: 'Update test expectations',
        description: 'Updates expected values in tests',
        category: 'test',
        severity: ['medium', 'low'],
        errorPatterns: [
          /expected.*but got/i,
          /assertion.*failed/i,
          /test.*failed/i
        ],
        fix: {
          type: 'replace',
          actions: [
            {
              type: 'file-replace',
              find: /expect\((.*?)\)\.toBe\((.*?)\)/g,
              replace: 'expect($1).toBe(/* updated value */)'
            }
          ],
          rollbackable: true,
          estimatedTime: 15
        },
        confidence: 0.6,
        testRequired: true,
        riskLevel: 'low'
      },

      // Dependency: Missing packages
      {
        id: 'dep-001',
        name: 'Install missing dependencies',
        description: 'Installs required npm packages',
        category: 'dependency',
        severity: ['high', 'medium'],
        errorPatterns: [
          /Cannot find module/i,
          /Module not found/i,
          /ENOENT.*node_modules/i
        ],
        fix: {
          type: 'command',
          actions: [
            {
              type: 'command',
              command: 'npm install'
            }
          ],
          rollbackable: false,
          estimatedTime: 60
        },
        confidence: 0.85,
        testRequired: true,
        riskLevel: 'low'
      },

      // Audit logging: Missing logs
      {
        id: 'audit-001',
        name: 'Add audit logging',
        description: 'Adds secure audit logging',
        category: 'security',
        severity: ['medium'],
        errorPatterns: [
          /missing.*audit.*log/i,
          /no.*logging/i,
          /audit.*trail.*incomplete/i
        ],
        fix: {
          type: 'insert',
          actions: [
            {
              type: 'file-insert',
              content: `
// Audit log
await this.audit.log({
  event: 'operation_performed',
  profile,
  sessionId,
  timestamp: new Date(),
  details: { /* operation details */ }
});
`
            },
            {
              type: 'file-insert',
              content: `import { SecureAuditLogger } from '../security/secure-audit-logger.js';`
            }
          ],
          rollbackable: true,
          estimatedTime: 20
        },
        confidence: 0.8,
        testRequired: true,
        riskLevel: 'low'
      }
    ];
  }

  /**
   * Find matching fix patterns for an error
   */
  async findMatches(error: DetectedError): Promise<FixPattern[]> {
    const matches: Array<{ pattern: FixPattern; score: number }> = [];

    for (const pattern of this.patterns) {
      const score = this.calculateMatchScore(error, pattern);
      
      if (score > 0) {
        matches.push({ pattern, score });
      }
    }

    // Sort by score (highest first) and confidence
    matches.sort((a, b) => {
      const scoreA = a.score * a.pattern.confidence;
      const scoreB = b.score * b.pattern.confidence;
      return scoreB - scoreA;
    });

    return matches.map(m => m.pattern);
  }

  /**
   * Calculate match score between error and pattern
   */
  private calculateMatchScore(error: DetectedError, pattern: FixPattern): number {
    let score = 0;

    // Category match
    if (pattern.category === error.category) {
      score += 3;
    }

    // Severity match
    if (pattern.severity.includes(error.severity)) {
      score += 2;
    }

    // Pattern match in message
    for (const regex of pattern.errorPatterns) {
      if (regex.test(error.message)) {
        score += 5;
      }
    }

    // Pattern match in stack trace
    if (error.stackTrace) {
      for (const regex of pattern.errorPatterns) {
        if (regex.test(error.stackTrace)) {
          score += 2;
        }
      }
    }

    return score;
  }

  /**
   * Get all available patterns
   */
  getAllPatterns(): FixPattern[] {
    return [...this.patterns];
  }

  /**
   * Add a custom pattern
   */
  addPattern(pattern: FixPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Remove a pattern by ID
   */
  removePattern(patternId: string): boolean {
    const index = this.patterns.findIndex(p => p.id === patternId);
    if (index >= 0) {
      this.patterns.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get pattern statistics
   */
  getStats(): {
    totalPatterns: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    byRisk: Record<string, number>;
  } {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byRisk: Record<string, number> = {};

    for (const pattern of this.patterns) {
      byCategory[pattern.category] = (byCategory[pattern.category] || 0) + 1;
      byRisk[pattern.riskLevel] = (byRisk[pattern.riskLevel] || 0) + 1;
      
      for (const severity of pattern.severity) {
        bySeverity[severity] = (bySeverity[severity] || 0) + 1;
      }
    }

    return {
      totalPatterns: this.patterns.length,
      byCategory,
      bySeverity,
      byRisk
    };
  }
}
