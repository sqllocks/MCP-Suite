import { Octokit } from '@octokit/rest';
import type { CodeSearchConfig, GitHubCodeSearchParams, GitHubCodeResult } from '../types/index.js';
import { logger } from '../utils/index.js';

/**
 * GitHub code search tool
 */
export class GitHubCodeSearchTool {
  private config: CodeSearchConfig;
  private octokit: Octokit | null = null;

  constructor(config: CodeSearchConfig) {
    this.config = config;

    // Initialize Octokit if token is provided
    if (config.github_token) {
      this.octokit = new Octokit({
        auth: config.github_token,
      });
    }
  }

  /**
   * Search GitHub code
   */
  async search(params: GitHubCodeSearchParams): Promise<GitHubCodeResult[]> {
    if (!this.octokit) {
      throw new Error('GitHub token not configured');
    }

    const { query, repo, language, path } = params;

    logger.info({ query, repo, language }, 'Searching GitHub code');

    try {
      // Build search query
      let searchQuery = query;

      // Add repository filter
      if (repo) {
        searchQuery += ` repo:${repo}`;
      } else if (this.config.default_github_repos.length > 0) {
        // Search across default repos
        const repoFilter = this.config.default_github_repos
          .map(r => `repo:${r}`)
          .join(' OR ');
        searchQuery += ` (${repoFilter})`;
      }

      // Add language filter
      if (language) {
        searchQuery += ` language:${language}`;
      }

      // Add path filter
      if (path) {
        searchQuery += ` path:${path}`;
      }

      // Execute search
      const response = await this.octokit.rest.search.code({
        q: searchQuery,
        per_page: this.config.max_code_results,
      });

      // Parse results
      const results: GitHubCodeResult[] = response.data.items.map(item => ({
        repo: item.repository.full_name,
        path: item.path,
        url: item.html_url,
        snippet: this.extractSnippet(item.text_matches),
        language: language || this.detectLanguage(item.path),
      }));

      logger.info({ query, resultsCount: results.length }, 'GitHub search completed');

      return results;
    } catch (error) {
      logger.error({ error, query }, 'GitHub search failed');
      
      if (error.status === 403) {
        throw new Error('GitHub API rate limit exceeded');
      }
      
      throw new Error(`GitHub search failed: ${error}`);
    }
  }

  /**
   * Extract snippet from text matches
   */
  private extractSnippet(textMatches?: any[]): string {
    if (!textMatches || textMatches.length === 0) {
      return '';
    }

    // Get first match fragment
    const match = textMatches[0];
    if (match && match.fragment) {
      return match.fragment;
    }

    return '';
  }

  /**
   * Detect language from file path
   */
  private detectLanguage(filePath: string): string | undefined {
    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();

    const languageMap: Record<string, string> = {
      '.sql': 'sql',
      '.py': 'python',
      '.dax': 'dax',
      '.m': 'm',
      '.pq': 'm',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.json': 'json',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.scala': 'scala',
      '.java': 'java',
    };

    return languageMap[ext];
  }

  /**
   * Check if GitHub token is configured
   */
  isConfigured(): boolean {
    return this.octokit !== null;
  }
}
