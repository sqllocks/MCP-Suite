import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import type { Logger } from '@mcp-suite/shared';

export interface PageMetadata {
  title: string;
  author?: string;
  publishDate?: string;
  wordCount: number;
}

export interface FetchedPage {
  url: string;
  content: string;
  metadata: PageMetadata;
}

export class PageFetcher {
  private turndown: TurndownService;

  constructor(private logger?: Logger) {
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });

    // Configure turndown rules
    this.turndown.remove(['script', 'style', 'nav', 'footer', 'iframe']);
  }

  async fetchPage(url: string): Promise<FetchedPage> {
    this.logger?.debug({ url }, 'Fetching page');

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MCP-Fabric-Search/1.0',
        },
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract metadata
      const title = $('title').text() || $('h1').first().text() || 'Untitled';
      const author =
        $('meta[name="author"]').attr('content') ||
        $('meta[property="article:author"]').attr('content');
      const publishDate =
        $('meta[property="article:published_time"]').attr('content') ||
        $('meta[name="date"]').attr('content') ||
        $('time[datetime]').attr('datetime');

      // Remove unwanted elements
      $('script, style, nav, footer, iframe, .ad, .advertisement').remove();

      // Get main content (try common content selectors)
      let mainContent = $('main, article, .content, .post-content, #content').html();
      
      if (!mainContent) {
        // Fallback to body
        mainContent = $('body').html();
      }

      if (!mainContent) {
        throw new Error('No content found on page');
      }

      // Convert to markdown
      const markdown = this.turndown.turndown(mainContent);

      // Clean up extra whitespace
      const cleanedMarkdown = markdown
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join('\n\n');

      const wordCount = cleanedMarkdown.split(/\s+/).length;

      this.logger?.info(
        { url, wordCount, title },
        'Page fetched successfully'
      );

      return {
        url,
        content: cleanedMarkdown,
        metadata: {
          title: title.trim(),
          author: author?.trim(),
          publishDate: publishDate?.trim(),
          wordCount,
        },
      };
    } catch (error) {
      this.logger?.error({ error, url }, 'Failed to fetch page');
      throw new Error(`Failed to fetch page: ${error}`);
    }
  }

  /**
   * Fetch multiple pages in parallel
   */
  async fetchPages(urls: string[], maxConcurrent: number = 3): Promise<FetchedPage[]> {
    const results: FetchedPage[] = [];
    const errors: Array<{ url: string; error: Error }> = [];

    // Process in batches
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      const promises = batch.map(async (url) => {
        try {
          return await this.fetchPage(url);
        } catch (error) {
          errors.push({ url, error: error as Error });
          return null;
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults.filter((r): r is FetchedPage => r !== null));
    }

    if (errors.length > 0) {
      this.logger?.warn(
        { errorCount: errors.length },
        'Some pages failed to fetch'
      );
    }

    return results;
  }
}
