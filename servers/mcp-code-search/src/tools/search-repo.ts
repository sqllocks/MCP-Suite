import type { CodeSearchConfig, SearchRepoParams, LocalCodeResult } from '../types/index.js';
import { searchFiles, logger, sanitizePath } from '../utils/index.js';

/**
 * Local repository search tool
 */
export class SearchRepoTool {
  private config: CodeSearchConfig;

  constructor(config: CodeSearchConfig) {
    this.config = config;
  }

  /**
   * Search local repository
   */
  async search(params: SearchRepoParams): Promise<LocalCodeResult[]> {
    const {
      query,
      file_glob,
      context_lines = this.config.context_lines,
      max_results = this.config.max_code_results,
    } = params;

    logger.info(
      { query, file_glob, repo_root: this.config.client_repo_root },
      'Searching local repository'
    );

    try {
      // Search files
      const matches = await searchFiles(query, this.config.client_repo_root, {
        fileGlob: file_glob,
        contextLines: context_lines,
        maxResults: max_results,
        allowedExtensions: this.config.allowed_file_extensions,
        excludePatterns: this.config.exclude_patterns,
        maxFileSizeMb: this.config.max_file_size_mb,
      });

      // Convert to results
      const results: LocalCodeResult[] = matches.map(match => ({
        path: sanitizePath(match.file, this.config.client_repo_root),
        snippet: match.content,
        lineNumber: match.line,
        contextBefore: match.contextBefore,
        contextAfter: match.contextAfter,
      }));

      logger.info(
        { query, resultsCount: results.length },
        'Local repository search completed'
      );

      return results;
    } catch (error) {
      logger.error({ error, query }, 'Repository search failed');
      throw new Error(`Repository search failed: ${error}`);
    }
  }
}
