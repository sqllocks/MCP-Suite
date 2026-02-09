import type {
  CodeSearchConfig,
  GetFileParams,
  GetFileStructureParams,
  FileContent,
  FileStructure,
} from '../types/index.js';
import {
  safeReadFile,
  getFileStats,
  getFileTree,
  countLines,
  logger,
  sanitizePath,
  detectLanguage,
} from '../utils/index.js';

/**
 * Get file tool
 */
export class GetFileTool {
  private config: CodeSearchConfig;

  constructor(config: CodeSearchConfig) {
    this.config = config;
  }

  /**
   * Get file contents
   */
  async getFile(params: GetFileParams): Promise<FileContent> {
    const { path } = params;

    logger.info({ path, repo_root: this.config.client_repo_root }, 'Reading file');

    try {
      // Read file safely
      const content = await safeReadFile(
        path,
        this.config.client_repo_root,
        this.config.max_file_size_mb,
        this.config.allowed_file_extensions
      );

      // Get file stats
      const stats = await getFileStats(path);
      if (!stats) {
        throw new Error('Failed to get file stats');
      }

      // Build result
      const result: FileContent = {
        path: sanitizePath(path, this.config.client_repo_root),
        content,
        metadata: {
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          language: detectLanguage(path),
          lines: countLines(content),
        },
      };

      logger.info(
        { path, size: stats.size, lines: result.metadata.lines },
        'File read successfully'
      );

      return result;
    } catch (error) {
      logger.error({ error, path }, 'Failed to read file');
      throw new Error(`Failed to read file: ${error}`);
    }
  }
}

/**
 * Get file structure tool
 */
export class GetFileStructureTool {
  private config: CodeSearchConfig;

  constructor(config: CodeSearchConfig) {
    this.config = config;
  }

  /**
   * Get directory tree structure
   */
  async getStructure(params: GetFileStructureParams): Promise<FileStructure> {
    const { path = '', depth = 3 } = params;

    const targetPath = path || this.config.client_repo_root;

    logger.info({ path: targetPath, depth }, 'Getting file structure');

    try {
      const result = await getFileTree(targetPath, {
        maxDepth: depth,
        excludePatterns: this.config.exclude_patterns,
      });

      logger.info(
        { files: result.files, directories: result.directories },
        'File structure retrieved'
      );

      return result;
    } catch (error) {
      logger.error({ error, path: targetPath }, 'Failed to get file structure');
      throw new Error(`Failed to get file structure: ${error}`);
    }
  }
}
