import * as path from 'path';
import * as fs from 'fs';

/**
 * Validate and resolve path within allowed root
 * Prevents path traversal attacks
 */
export function validatePath(requestedPath: string, allowedRoot: string): string {
  // Normalize paths
  const normalizedRoot = path.resolve(allowedRoot);
  const normalizedPath = path.resolve(normalizedRoot, requestedPath);

  // Check if resolved path is within allowed root
  if (!normalizedPath.startsWith(normalizedRoot + path.sep) && normalizedPath !== normalizedRoot) {
    throw new Error(`Path "${requestedPath}" is outside allowed root`);
  }

  // Check for path traversal attempts
  if (requestedPath.includes('..')) {
    throw new Error(`Path contains illegal ".." sequence: ${requestedPath}`);
  }

  return normalizedPath;
}

/**
 * Check if path exists and is accessible
 */
export function checkPathExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file stats safely
 */
export async function getFileStats(filePath: string): Promise<fs.Stats | null> {
  try {
    return await fs.promises.stat(filePath);
  } catch {
    return null;
  }
}

/**
 * Check if file size is within limits
 */
export function checkFileSize(stats: fs.Stats, maxSizeMb: number): boolean {
  const sizeMb = stats.size / (1024 * 1024);
  return sizeMb <= maxSizeMb;
}

/**
 * Check if file extension is allowed
 */
export function isAllowedExtension(filePath: string, allowedExtensions: string[]): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return allowedExtensions.includes(ext) || allowedExtensions.length === 0;
}

/**
 * Check if path should be excluded based on patterns
 */
export function shouldExclude(filePath: string, excludePatterns: string[]): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  return excludePatterns.some(pattern => {
    // Simple pattern matching (can be enhanced with glob patterns)
    return normalizedPath.includes(pattern);
  });
}

/**
 * Sanitize file path for safe display
 */
export function sanitizePath(filePath: string, root: string): string {
  // Return relative path from root
  return path.relative(root, filePath);
}

/**
 * Read file with safety checks
 */
export async function safeReadFile(
  filePath: string,
  allowedRoot: string,
  maxSizeMb: number,
  allowedExtensions: string[]
): Promise<string> {
  // Validate path
  const validPath = validatePath(filePath, allowedRoot);

  // Check if file exists
  if (!checkPathExists(validPath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Get file stats
  const stats = await getFileStats(validPath);
  if (!stats || !stats.isFile()) {
    throw new Error(`Not a file: ${filePath}`);
  }

  // Check file size
  if (!checkFileSize(stats, maxSizeMb)) {
    throw new Error(`File too large (max ${maxSizeMb}MB): ${filePath}`);
  }

  // Check extension
  if (!isAllowedExtension(validPath, allowedExtensions)) {
    throw new Error(`File extension not allowed: ${filePath}`);
  }

  // Read file
  const content = await fs.promises.readFile(validPath, 'utf-8');
  return content;
}

/**
 * List directory with safety checks
 */
export async function safeListDirectory(
  dirPath: string,
  allowedRoot: string,
  excludePatterns: string[]
): Promise<string[]> {
  // Validate path
  const validPath = validatePath(dirPath, allowedRoot);

  // Check if directory exists
  if (!checkPathExists(validPath)) {
    throw new Error(`Directory not found: ${dirPath}`);
  }

  // Get directory stats
  const stats = await getFileStats(validPath);
  if (!stats || !stats.isDirectory()) {
    throw new Error(`Not a directory: ${dirPath}`);
  }

  // Read directory
  const entries = await fs.promises.readdir(validPath, { withFileTypes: true });

  // Filter and return
  return entries
    .filter(entry => !shouldExclude(entry.name, excludePatterns))
    .map(entry => path.join(dirPath, entry.name));
}
