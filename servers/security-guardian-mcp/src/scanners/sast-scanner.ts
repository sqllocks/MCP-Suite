/**
 * SAST Scanner (Static Application Security Testing)
 * Detects security vulnerabilities in source code
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Vulnerability } from '../server.js';

interface SASTRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cwe: string;
  pattern: RegExp;
  fileTypes: string[];
  exploitability: 'high' | 'medium' | 'low';
}

export class SASTScanner {
  private rules: SASTRule[] = [
    // CRITICAL: Command Injection
    {
      id: 'SAST-001',
      name: 'Command Injection',
      description: 'Unsanitized user input passed to shell execution',
      severity: 'critical',
      cwe: 'CWE-78',
      pattern: /exec\s*\(\s*[^)]*(?:req\.|args\.|params\.|input|userInput)/gi,
      fileTypes: ['.ts', '.js', '.tsx', '.jsx'],
      exploitability: 'high',
    },
    {
      id: 'SAST-002',
      name: 'Shell Command Injection',
      description: 'Direct shell command execution with user input',
      severity: 'critical',
      cwe: 'CWE-78',
      pattern: /spawn\s*\(\s*[^)]*(?:shell:\s*true)/gi,
      fileTypes: ['.ts', '.js', '.tsx', '.jsx'],
      exploitability: 'high',
    },
    
    // CRITICAL: Path Traversal
    {
      id: 'SAST-003',
      name: 'Path Traversal',
      description: 'File path not validated, allows directory traversal',
      severity: 'critical',
      cwe: 'CWE-22',
      pattern: /fs\.(readFile|writeFile|unlink|readdir)\s*\(\s*(?!path\.resolve|path\.join\(ALLOWED)/gi,
      fileTypes: ['.ts', '.js', '.tsx', '.jsx'],
      exploitability: 'high',
    },
    
    // CRITICAL: SQL Injection
    {
      id: 'SAST-004',
      name: 'SQL Injection',
      description: 'SQL query concatenated with user input',
      severity: 'critical',
      cwe: 'CWE-89',
      pattern: /\.query\s*\(\s*[`'"]\s*SELECT.*\$\{|\.query\s*\(\s*.*\+\s*req\./gi,
      fileTypes: ['.ts', '.js', '.tsx', '.jsx'],
      exploitability: 'high',
    },
    
    // CRITICAL: Unsafe Deserialization
    {
      id: 'SAST-005',
      name: 'Unsafe Deserialization',
      description: 'eval() or Function() with user input',
      severity: 'critical',
      cwe: 'CWE-502',
      pattern: /eval\s*\(|new\s+Function\s*\(/gi,
      fileTypes: ['.ts', '.js', '.tsx', '.jsx'],
      exploitability: 'high',
    },
    
    // CRITICAL: Hardcoded Secrets
    {
      id: 'SAST-006',
      name: 'Hardcoded API Key',
      description: 'API key or secret hardcoded in source',
      severity: 'critical',
      cwe: 'CWE-798',
      pattern: /(api[_-]?key|apikey|secret[_-]?key|password)\s*=\s*['"]/gi,
      fileTypes: ['.ts', '.js', '.tsx', '.jsx', '.py', '.java'],
      exploitability: 'high',
    },
    
    // HIGH: XSS
    {
      id: 'SAST-007',
      name: 'Cross-Site Scripting (XSS)',
      description: 'User input rendered without sanitization',
      severity: 'high',
      cwe: 'CWE-79',
      pattern: /innerHTML\s*=|dangerouslySetInnerHTML/gi,
      fileTypes: ['.tsx', '.jsx', '.html'],
      exploitability: 'high',
    },
    
    // HIGH: ReDoS
    {
      id: 'SAST-008',
      name: 'Regular Expression Denial of Service (ReDoS)',
      description: 'Regex pattern vulnerable to catastrophic backtracking',
      severity: 'high',
      cwe: 'CWE-1333',
      pattern: /new\s+RegExp\s*\([^)]*\(.*\+.*\)\+/gi,
      fileTypes: ['.ts', '.js', '.tsx', '.jsx'],
      exploitability: 'medium',
    },
    
    // HIGH: Insecure Random
    {
      id: 'SAST-009',
      name: 'Insecure Random Number Generator',
      description: 'Math.random() used for security-sensitive operations',
      severity: 'high',
      cwe: 'CWE-330',
      pattern: /Math\.random\(\).*(?:token|secret|key|password|salt)/gi,
      fileTypes: ['.ts', '.js', '.tsx', '.jsx'],
      exploitability: 'medium',
    },
    
    // HIGH: Missing Authentication
    {
      id: 'SAST-010',
      name: 'Missing Authentication',
      description: 'API endpoint without authentication check',
      severity: 'high',
      cwe: 'CWE-306',
      pattern: /app\.(get|post|put|delete)\s*\([^)]*(?!auth|authenticate|isAuthenticated)/gi,
      fileTypes: ['.ts', '.js', '.tsx', '.jsx'],
      exploitability: 'high',
    },
    
    // MEDIUM: Missing Input Validation
    {
      id: 'SAST-011',
      name: 'Missing Input Validation',
      description: 'User input processed without validation',
      severity: 'medium',
      cwe: 'CWE-20',
      pattern: /req\.(body|query|params)\.[a-zA-Z]+\s*(?!\.validate|\.check)/gi,
      fileTypes: ['.ts', '.js', '.tsx', '.jsx'],
      exploitability: 'medium',
    },
    
    // MEDIUM: Weak Crypto
    {
      id: 'SAST-012',
      name: 'Weak Cryptographic Algorithm',
      description: 'Use of weak crypto (MD5, SHA1, DES)',
      severity: 'medium',
      cwe: 'CWE-327',
      pattern: /createHash\s*\(\s*['"](?:md5|sha1)['"]\)|crypto\.createCipher\s*\(/gi,
      fileTypes: ['.ts', '.js', '.tsx', '.jsx'],
      exploitability: 'low',
    },
    
    // MEDIUM: Information Disclosure
    {
      id: 'SAST-013',
      name: 'Information Disclosure',
      description: 'Stack trace or error details exposed to user',
      severity: 'medium',
      cwe: 'CWE-209',
      pattern: /res\.send\s*\(\s*error\.stack\)|console\.error\s*\(\s*error\.stack/gi,
      fileTypes: ['.ts', '.js', '.tsx', '.jsx'],
      exploitability: 'low',
    },
    
    // MEDIUM: HTTP Without Timeout
    {
      id: 'SAST-014',
      name: 'HTTP Request Without Timeout',
      description: 'HTTP request without timeout can cause resource exhaustion',
      severity: 'medium',
      cwe: 'CWE-400',
      pattern: /axios\.(?:get|post)\s*\([^)]*(?!timeout:)/gi,
      fileTypes: ['.ts', '.js', '.tsx', '.jsx'],
      exploitability: 'medium',
    },
    
    // LOW: Console Logging
    {
      id: 'SAST-015',
      name: 'Console Logging in Production',
      description: 'Console.log may leak sensitive information',
      severity: 'low',
      cwe: 'CWE-532',
      pattern: /console\.(log|debug|info)\s*\(/gi,
      fileTypes: ['.ts', '.js', '.tsx', '.jsx'],
      exploitability: 'low',
    },
  ];

  async scan(targetPath: string, options: { excludePaths?: string[] } = {}): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];
    const excludePaths = options.excludePaths || ['node_modules', 'dist', '.git'];

    // Get all files to scan
    const files = await this.getFiles(targetPath, excludePaths);

    // Scan each file
    for (const file of files) {
      const fileVulns = await this.scanFile(file);
      vulnerabilities.push(...fileVulns);
    }

    return vulnerabilities;
  }

  private async scanFile(filePath: string): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];
    const ext = path.extname(filePath);
    
    // Read file content
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      return vulnerabilities; // Skip unreadable files
    }

    const lines = content.split('\n');

    // Check each rule
    for (const rule of this.rules) {
      // Skip if file type doesn't match
      if (rule.fileTypes.length > 0 && !rule.fileTypes.includes(ext)) {
        continue;
      }

      // Find matches
      const matches = content.matchAll(rule.pattern);
      for (const match of matches) {
        // Find line number
        const lineNumber = this.getLineNumber(content, match.index!);
        const column = this.getColumnNumber(content, match.index!);

        vulnerabilities.push({
          id: `${rule.id}-${path.basename(filePath)}-${lineNumber}`,
          type: rule.name,
          severity: rule.severity,
          file: filePath,
          line: lineNumber,
          column,
          description: `${rule.description}\nMatched: ${match[0].substring(0, 100)}`,
          cwe: rule.cwe,
          cvss: this.calculateCVSS(rule.severity),
          exploitability: rule.exploitability,
          impact: this.getImpact(rule.severity),
          fixAvailable: true,
          autoFixable: this.isAutoFixable(rule.id),
          detectedAt: new Date(),
        });
      }
    }

    return vulnerabilities;
  }

  private async getFiles(dir: string, excludePaths: string[]): Promise<string[]> {
    const files: string[] = [];

    async function walk(currentPath: string) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        // Check if excluded
        if (excludePaths.some(exclude => fullPath.includes(exclude))) {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          // Only scan code files
          const ext = path.extname(entry.name);
          if (['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.rb'].includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }

    await walk(dir);
    return files;
  }

  private getLineNumber(content: string, index: number): number {
    const beforeMatch = content.substring(0, index);
    return beforeMatch.split('\n').length;
  }

  private getColumnNumber(content: string, index: number): number {
    const beforeMatch = content.substring(0, index);
    const lastNewline = beforeMatch.lastIndexOf('\n');
    return index - lastNewline;
  }

  private calculateCVSS(severity: string): number {
    const scores = {
      critical: 9.5,
      high: 7.5,
      medium: 5.0,
      low: 2.5,
    };
    return scores[severity] || 0;
  }

  private getImpact(severity: string): Vulnerability['impact'] {
    if (severity === 'critical') {
      return {
        confidentiality: 'high',
        integrity: 'high',
        availability: 'high',
      };
    } else if (severity === 'high') {
      return {
        confidentiality: 'high',
        integrity: 'medium',
        availability: 'medium',
      };
    } else if (severity === 'medium') {
      return {
        confidentiality: 'medium',
        integrity: 'low',
        availability: 'low',
      };
    } else {
      return {
        confidentiality: 'low',
        integrity: 'none',
        availability: 'none',
      };
    }
  }

  private isAutoFixable(ruleId: string): boolean {
    // Some vulnerabilities can be auto-fixed
    const autoFixableRules = [
      'SAST-015', // Console logging
      'SAST-012', // Weak crypto (upgrade)
      'SAST-014', // Add timeout
    ];
    return autoFixableRules.includes(ruleId);
  }
}
