import { Octokit } from '@octokit/rest';
import type { Logger } from '@mcp-suite/shared';

export interface GitHubSearchOptions {
  query: string;
  repo?: string;
  language?: string;
  path?: string;
  maxResults?: number;
}

export interface GitHubSearchResult {
  repo: string;
  path: string;
  url: string;
  snippet: string;
  language: string;
  score?: number;
}

export class GitHubSearcher {
  private octokit: Octokit;

  constructor(
    private token: string | undefined,
    private logger?: Logger
  ) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  /**
   * Search GitHub code
   */
  async searchCode(options: GitHubSearchOptions): Promise<GitHubSearchResult[]> {
    const { query, repo, language, path, maxResults = 10 } = options;

    // Build search query
    let searchQuery = query;
    
    if (repo) {
      searchQuery += ` repo:${repo}`;
    }
    
    if (language) {
      searchQuery += ` language:${language}`;
    }
    
    if (path) {
      searchQuery += ` path:${path}`;
    }

    this.logger?.debug({ searchQuery }, 'Searching GitHub');

    try {
      const response = await this.octokit.rest.search.code({
        q: searchQuery,
        per_page: Math.min(maxResults, 100),
      });

      const results: GitHubSearchResult[] = response.data.items.map((item) => {
        return {
          repo: item.repository.full_name,
          path: item.path,
          url: item.html_url,
          snippet: this.extractSnippet(item.text_matches),
          language: this.detectLanguage(item.path),
          score: item.score,
        };
      });

      this.logger?.info(
        { count: results.length, query: searchQuery },
        'GitHub search completed'
      );

      return results;
    } catch (error: any) {
      this.logger?.error({ error, query: searchQuery }, 'GitHub search failed');
      
      if (error.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please wait or add a GitHub token.');
      }
      
      throw new Error(`GitHub search failed: ${error.message}`);
    }
  }

  /**
   * Get file contents from GitHub
   */
  async getFileContents(repo: string, path: string): Promise<string> {
    const [owner, repoName] = repo.split('/');

    this.logger?.debug({ repo, path }, 'Fetching file from GitHub');

    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo: repoName,
        path,
      });

      if ('content' in response.data && response.data.content) {
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        return content;
      }

      throw new Error('File content not available');
    } catch (error: any) {
      this.logger?.error({ error, repo, path }, 'Failed to fetch file');
      throw new Error(`Failed to fetch file: ${error.message}`);
    }
  }

  /**
   * List repository contents
   */
  async listRepoContents(repo: string, path: string = ''): Promise<any[]> {
    const [owner, repoName] = repo.split('/');

    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo: repoName,
        path,
      });

      if (Array.isArray(response.data)) {
        return response.data;
      }

      return [response.data];
    } catch (error: any) {
      this.logger?.error({ error, repo, path }, 'Failed to list contents');
      throw new Error(`Failed to list contents: ${error.message}`);
    }
  }

  /**
   * Extract snippet from text matches
   */
  private extractSnippet(textMatches?: any[]): string {
    if (!textMatches || textMatches.length === 0) {
      return '';
    }

    // Get first match with fragment
    const match = textMatches.find((m) => m.fragment);
    
    if (match && match.fragment) {
      return match.fragment.trim();
    }

    return '';
  }

  /**
   * Detect language from file extension
   */
  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    
    const languageMap: Record<string, string> = {
      py: 'python',
      js: 'javascript',
      ts: 'typescript',
      sql: 'sql',
      dax: 'dax',
      m: 'm',
      scala: 'scala',
      r: 'r',
      sh: 'bash',
      ps1: 'powershell',
      yaml: 'yaml',
      yml: 'yaml',
      json: 'json',
      md: 'markdown',
    };

    return languageMap[ext] || ext;
  }

  /**
   * Check if token is available and valid
   */
  async checkAuthentication(): Promise<boolean> {
    if (!this.token) {
      return false;
    }

    try {
      await this.octokit.rest.users.getAuthenticated();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get rate limit status
   */
  async getRateLimit(): Promise<any> {
    try {
      const response = await this.octokit.rest.rateLimit.get();
      return response.data.resources.code_search;
    } catch (error) {
      this.logger?.error({ error }, 'Failed to get rate limit');
      return null;
    }
  }
}
