import type { Platform, SearchConfig } from '../types/index.js';
import { PLATFORM_PRESETS } from '../types/index.js';

/**
 * Enhance query with platform-specific terms and domain restrictions
 */
export function enhanceQuery(
  query: string,
  config: SearchConfig,
  contentType?: string
): string {
  let enhanced = query;

  // Get platform preset
  const preset = PLATFORM_PRESETS[config.platform];

  // Add platform-specific enhancements if not already present
  if (preset && preset.query_enhancements.length > 0) {
    const hasEnhancement = preset.query_enhancements.some((term) =>
      query.toLowerCase().includes(term.toLowerCase())
    );

    if (!hasEnhancement) {
      // Add OR logic for platform terms
      const platformTerms = preset.query_enhancements.join(' OR ');
      enhanced = `${query} (${platformTerms})`;
    }
  }

  // Add domain restrictions
  if (config.preferred_domains.length > 0) {
    const siteRestrictions = config.preferred_domains
      .map((domain) => `site:${domain}`)
      .join(' OR ');

    if (config.strict_domains) {
      // Strict mode: ONLY search these domains
      enhanced = `${enhanced} (${siteRestrictions})`;
    } else {
      // Loose mode: PREFER these domains (add as boost, not restriction)
      enhanced = `${enhanced}`;
    }
  }

  // Add content type filter if specified
  if (contentType && contentType !== 'all') {
    switch (contentType) {
      case 'documentation':
        enhanced = `${enhanced} (documentation OR docs OR guide OR tutorial)`;
        break;
      case 'blog':
        enhanced = `${enhanced} (blog OR article OR post)`;
        break;
      case 'forum':
        enhanced = `${enhanced} (forum OR discussion OR community OR question)`;
        break;
      case 'video':
        enhanced = `${enhanced} (video OR tutorial OR demo)`;
        break;
    }
  }

  return enhanced;
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * Calculate relevance score based on preferred domains
 */
export function calculateRelevanceScore(url: string, preferredDomains: string[]): number {
  const domain = extractDomain(url);
  
  // Exact match with preferred domain
  const exactMatch = preferredDomains.find((d) => domain === d || domain.endsWith(`.${d}`));
  if (exactMatch) {
    return 1.0;
  }

  // Partial match (subdomain)
  const partialMatch = preferredDomains.find((d) => domain.includes(d));
  if (partialMatch) {
    return 0.8;
  }

  // No match
  return 0.5;
}

/**
 * Sort search results by relevance score
 */
export function sortByRelevance<T extends { relevanceScore?: number }>(results: T[]): T[] {
  return results.sort((a, b) => {
    const scoreA = a.relevanceScore ?? 0;
    const scoreB = b.relevanceScore ?? 0;
    return scoreB - scoreA;
  });
}
