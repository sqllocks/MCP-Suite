import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

/**
 * Clean HTML and convert to readable markdown
 */
export async function htmlToMarkdown(html: string, url: string): Promise<string> {
  try {
    // Load HTML with cheerio
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $(
      'script, style, nav, header, footer, aside, iframe, .advertisement, .ad, #comments, .social-share'
    ).remove();

    // Try to find main content
    const mainContent =
      $('article').html() ||
      $('main').html() ||
      $('.content').html() ||
      $('#content').html() ||
      $('body').html() ||
      html;

    // Convert to markdown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });

    // Add custom rules for better conversion
    turndownService.addRule('removeComments', {
      filter: (node) => node.nodeType === 8, // Comment nodes
      replacement: () => '',
    });

    const markdown = turndownService.turndown(mainContent || '');

    // Clean up excessive whitespace
    const cleaned = markdown
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .replace(/^\s+|\s+$/g, '') // Trim
      .replace(/[ \t]+$/gm, ''); // Remove trailing spaces

    return cleaned;
  } catch (error) {
    throw new Error(`Failed to convert HTML to markdown: ${error}`);
  }
}

/**
 * Extract metadata from HTML
 */
export function extractMetadata(html: string): {
  title?: string;
  author?: string;
  publishDate?: string;
  description?: string;
} {
  const $ = cheerio.load(html);

  // Extract title
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').text() ||
    $('h1').first().text();

  // Extract author
  const author =
    $('meta[name="author"]').attr('content') ||
    $('meta[property="article:author"]').attr('content') ||
    $('.author').text() ||
    $('[rel="author"]').text();

  // Extract publish date
  const publishDate =
    $('meta[property="article:published_time"]').attr('content') ||
    $('meta[name="publish-date"]').attr('content') ||
    $('time[datetime]').attr('datetime') ||
    $('time').text();

  // Extract description
  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content');

  return {
    title: title?.trim(),
    author: author?.trim(),
    publishDate: publishDate?.trim(),
    description: description?.trim(),
  };
}

/**
 * Calculate word count from text
 */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * Extract clean text for preview/snippet
 */
export function extractCleanText(html: string, maxLength: number = 500): string {
  const $ = cheerio.load(html);
  
  // Remove unwanted elements
  $('script, style, nav, header, footer').remove();
  
  // Get text content
  const text = $('body').text() || '';
  
  // Clean and truncate
  const cleaned = text
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, maxLength);
    
  return cleaned + (text.length > maxLength ? '...' : '');
}
