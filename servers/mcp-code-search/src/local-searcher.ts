import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import ignore from 'ignore';
import { validatePath, isAllowedExtension, validateFileSize } from '@mcp-suite/shared';
import type { Logger } from '@mcp-suite/shared';

export interface LocalSearchOptions {
  query: string;
  fileGlob?: string;
  contextLines?: number;
  maxResults?: number;
  caseSensitive?: boolean;
  useRegex?: boolean;
}

export interface LocalSearchResult {
  path: string; // Relative to repo root
  snippet: string;
  lineNumber: number;
  contextBefore: string[];
  contextAfter: string[];
  score?: number;
}

export class LocalSearcher {
  private ig: ReturnType<typeof ignore>;

  constructor(
    private repoRoot: string,
    private allowedExtensions: string[],
    private excludePatterns: string[],
    private maxFileSizeMB: number,
    private logger?: Logger
  ) {
    // Initialize ignore matcher
    this.ig = ignore().add(excludePatterns);
  }

  /**
   * Search local repository
   */
  async searchRepo(options: LocalSearchOptions): Promise<LocalSearchResult[]> {
    const {
      query,
      fileGlob = '**/*',
      contextLines = 3,
      maxResults = 10,
      caseSensitive = false,
      useRegex = false,
    } = options;

    this.logger?.debug({ query, fileGlob }, 'Searching local repository');

    // Find files matching glob
    const files = await this.findFiles(fileGlob);
    
    this.logger?.debug({ fileCount: files.length }, 'Found files to search');

    // Search each file
    const results: LocalSearchResult[] = [];
    
    for (const file of files) {
      try {
        const fileResults = await this.searchFile(
          file,
          query,
          contextLines,
          caseSensitive,
          useRegex
        );
        results.push(...fileResults);

        // Stop if we have enough results
        if (results.length >= maxResults) {
          break;
        }
      } catch (error) {
        this.logger?.warn({ error, file }, 'Failed to search file');
      }
    }

    // Sort by relevance (line number for now, could enhance)
    results.sort((a, b) => {
      if (a.score && b.score) {
        return b.score - a.score;
      }
      return a.lineNumber - b.lineNumber;
    });

    this.logger?.info(
      { count: results.length, query },
      'Local search completed'
    );

    return results.slice(0, maxResults);
  }

  /**
   * Search a single file
   */
  private async searchFile(
    filePath: string,
    query: string,
    contextLines: number,
    caseSensitive: boolean,
    useRegex: boolean
  ): Promise<LocalSearchResult[]> {
    // Validate path
    const fullPath = path.join(this.repoRoot, filePath);
    validatePath(fullPath, this.repoRoot);

    // Check file size
    await validateFileSize(fullPath, this.maxFileSizeMB);

    // Read file
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');

    // Build search pattern
    let pattern: RegExp;
    
    if (useRegex) {
      pattern = new RegExp(query, caseSensitive ? 'g' : 'gi');
    } else {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      pattern = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
    }

    // Find matches
    const results: LocalSearchResult[] = [];

    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        const lineNumber = index + 1;
        
        // Extract context
        const contextBefore = lines.slice(
          Math.max(0, index - contextLines),
          index
        );
        
        const contextAfter = lines.slice(
          index + 1,
          Math.min(lines.length, index + 1 + contextLines)
        );

        results.push({
          path: filePath,
          snippet: line.trim(),
          lineNumber,
          contextBefore,
          contextAfter,
          score: this.calculateScore(line, query),
        });
      }
    });

    return results;
  }

  /**
   * Find files matching glob pattern
   */
  private async findFiles(pattern: string): Promise<string[]> {
    const files = await glob(pattern, {
      cwd: this.repoRoot,
      nodir: true,
      dot: false,
    });

    // Filter by extension and exclude patterns
    const filtered = files.filter((file) => {
      // Check if excluded
      if (this.ig.ignores(file)) {
        return false;
      }

      // Check extension
      if (this.allowedExtensions.length > 0) {
        return isAllowedExtension(file, this.allowedExtensions);
      }

      return true;
    });

    return filtered;
  }

  /**
   * Read file contents
   */
  async readFile(filePath: string): Promise<string> {
    // Validate path
    const fullPath = path.join(this.repoRoot, filePath);
    validatePath(fullPath, this.repoRoot);

    // Check file size
    await validateFileSize(fullPath, this.maxFileSizeMB);

    // Check extension
    if (this.allowedExtensions.length > 0) {
      if (!isAllowedExtension(filePath, this.allowedExtensions)) {
        throw new Error(`File extension not allowed: ${filePath}`);
      }
    }

    // Read file
    return await fs.readFile(fullPath, 'utf-8');
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string): Promise<any> {
    const fullPath = path.join(this.repoRoot, filePath);
    validatePath(fullPath, this.repoRoot);

    const stats = await fs.stat(fullPath);
    const ext = path.extname(filePath);

    return {
      path: filePath,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      language: this.detectLanguage(ext),
    };
  }

  /**
   * Get directory structure
   */
  async getFileStructure(dirPath: string = '', depth: number = 3): Promise<any> {
    const fullPath = path.join(this.repoRoot, dirPath);
    validatePath(fullPath, this.repoRoot);

    const structure = await this.buildTree(fullPath, depth, 0);
    
    return {
      tree: this.formatTree(structure),
      files: this.countFiles(structure),
      directories: this.countDirs(structure),
    };
  }

  /**
   * Build directory tree
   */
  private async buildTree(
    dirPath: string,
    maxDepth: number,
    currentDepth: number
  ): Promise<any> {
    if (currentDepth >= maxDepth) {
      return null;
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const tree: any = {};

    for (const entry of entries) {
      const relativePath = path.relative(this.repoRoot, path.join(dirPath, entry.name));
      
      // Skip excluded
      if (this.ig.ignores(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        tree[entry.name] = await this.buildTree(
          path.join(dirPath, entry.name),
          maxDepth,
          currentDepth + 1
        );
      } else {
        tree[entry.name] = null;
      }
    }

    return tree;
  }

  /**
   * Format tree as ASCII
   */
  private formatTree(tree: any, prefix: string = ''): string {
    if (!tree) return '';

    const entries = Object.entries(tree);
    let result = '';

    entries.forEach(([name, subtree], index) => {
      const isLast = index === entries.length - 1;
      const marker = isLast ? '└── ' : '├── ';
      const extension = isLast ? '    ' : '│   ';

      result += prefix + marker + name + '\n';

      if (subtree) {
        result += this.formatTree(subtree, prefix + extension);
      }
    });

    return result;
  }

  /**
   * Count files in tree
   */
  private countFiles(tree: any): number {
    if (!tree) return 0;

    let count = 0;
    
    for (const value of Object.values(tree)) {
      if (value === null) {
        count++;
      } else {
        count += this.countFiles(value);
      }
    }

    return count;
  }

  /**
   * Count directories in tree
   */
  private countDirs(tree: any): number {
    if (!tree) return 0;

    let count = 0;
    
    for (const value of Object.values(tree)) {
      if (value !== null) {
        count += 1 + this.countDirs(value);
      }
    }

    return count;
  }

  /**
   * Calculate relevance score
   */
  private calculateScore(line: string, query: string): number {
    // Simple scoring based on:
    // 1. Query appears at start of line
    // 2. Exact case match
    // 3. Multiple occurrences
    
    let score = 0.5;

    const lowerLine = line.toLowerCase();
    const lowerQuery = query.toLowerCase();

    if (lowerLine.trim().startsWith(lowerQuery)) {
      score += 0.3;
    }

    if (line.includes(query)) {
      score += 0.2;
    }

    const occurrences = (lowerLine.match(new RegExp(lowerQuery, 'g')) || []).length;
    score += Math.min(occurrences * 0.1, 0.3);

    return score;
  }

  /**
   * Detect language from extension
   */
  private detectLanguage(ext: string): string {
    const languageMap: Record<string, string> = {
      '.py': 'python',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.sql': 'sql',
      '.dax': 'dax',
      '.m': 'm',
      '.scala': 'scala',
      '.r': 'r',
      '.sh': 'bash',
      '.ps1': 'powershell',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.json': 'json',
      '.md': 'markdown',
    };

    return languageMap[ext.toLowerCase()] || ext.substring(1);
  }
}
