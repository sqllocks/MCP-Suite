import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import type { SearchMatch } from '../types/index.js';
import { validatePath, shouldExclude, isAllowedExtension, safeReadFile } from './path-security.js';

/**
 * Search for pattern in files
 */
export async function searchFiles(
  query: string,
  rootPath: string,
  options: {
    fileGlob?: string;
    contextLines?: number;
    maxResults?: number;
    allowedExtensions: string[];
    excludePatterns: string[];
    maxFileSizeMb: number;
  }
): Promise<SearchMatch[]> {
  const {
    fileGlob = '**/*',
    contextLines = 3,
    maxResults = 10,
    allowedExtensions,
    excludePatterns,
    maxFileSizeMb,
  } = options;

  const matches: SearchMatch[] = [];

  // Convert query to regex
  const regex = createSearchRegex(query);

  // Find files matching glob pattern
  const files = await glob(fileGlob, {
    cwd: rootPath,
    absolute: true,
    nodir: true,
    ignore: excludePatterns.map(p => `**/${p}/**`),
  });

  // Search through files
  for (const file of files) {
    // Stop if we have enough results
    if (matches.length >= maxResults) {
      break;
    }

    try {
      // Validate file
      if (!isAllowedExtension(file, allowedExtensions)) {
        continue;
      }

      if (shouldExclude(file, excludePatterns)) {
        continue;
      }

      // Read file safely
      const content = await safeReadFile(file, rootPath, maxFileSizeMb, allowedExtensions);

      // Search in file
      const fileMatches = searchInFile(file, content, regex, contextLines);
      matches.push(...fileMatches);

      // Check if we have enough results
      if (matches.length >= maxResults) {
        break;
      }
    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }

  return matches.slice(0, maxResults);
}

/**
 * Search within a single file
 */
function searchInFile(
  filePath: string,
  content: string,
  regex: RegExp,
  contextLines: number
): SearchMatch[] {
  const matches: SearchMatch[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      matches.push({
        file: filePath,
        line: i + 1,
        content: lines[i],
        contextBefore: getContextLines(lines, i - contextLines, i),
        contextAfter: getContextLines(lines, i + 1, i + 1 + contextLines),
      });
    }
  }

  return matches;
}

/**
 * Get context lines around a match
 */
function getContextLines(lines: string[], start: number, end: number): string[] {
  const safeStart = Math.max(0, start);
  const safeEnd = Math.min(lines.length, end);
  return lines.slice(safeStart, safeEnd);
}

/**
 * Create regex from search query
 */
function createSearchRegex(query: string): RegExp {
  // Escape special regex characters
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'gi');
}

/**
 * Get file structure as tree
 */
export async function getFileTree(
  rootPath: string,
  options: {
    maxDepth?: number;
    excludePatterns: string[];
  }
): Promise<{ tree: string; files: number; directories: number }> {
  const { maxDepth = 3, excludePatterns } = options;

  let fileCount = 0;
  let dirCount = 0;

  const buildTree = async (
    dirPath: string,
    depth: number,
    prefix: string = ''
  ): Promise<string[]> {
    if (depth > maxDepth) {
      return [];
    }

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const lines: string[] = [];

    // Filter and sort entries
    const filtered = entries.filter(entry => !shouldExclude(entry.name, excludePatterns));
    const sorted = filtered.sort((a, b) => {
      // Directories first
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      const isLast = i === sorted.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = prefix + (isLast ? '    ' : '│   ');

      if (entry.isDirectory()) {
        dirCount++;
        lines.push(`${prefix}${connector}${entry.name}/`);
        
        const childPath = path.join(dirPath, entry.name);
        const childLines = await buildTree(childPath, depth + 1, childPrefix);
        lines.push(...childLines);
      } else {
        fileCount++;
        lines.push(`${prefix}${connector}${entry.name}`);
      }
    }

    return lines;
  };

  const treeLines = await buildTree(rootPath, 0);
  const tree = [path.basename(rootPath) + '/', ...treeLines].join('\n');

  return {
    tree,
    files: fileCount,
    directories: dirCount,
  };
}

/**
 * Count lines in file
 */
export function countLines(content: string): number {
  return content.split('\n').length;
}
