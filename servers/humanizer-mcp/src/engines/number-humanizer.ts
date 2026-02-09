/**
 * Number Humanizer
 * Converts fake precision numbers into natural human language
 */

import { HumanizeOptions } from '../server.js';

export interface DetectedNumber {
  original: string;
  value: number;
  type: 'percentage' | 'currency' | 'duration' | 'count' | 'timestamp' | 'decimal';
  decimals: number;
  context: string;
  currency?: string;
  unit?: string;
}

export interface HumanizeResult {
  text: string;
  numbersChanged: number;
}

export class NumberHumanizer {
  
  /**
   * Main humanization method
   */
  humanize(text: string, options: HumanizeOptions): HumanizeResult {
    const numbers = this.detectNumbers(text);
    let modified = text;
    let changed = 0;

    numbers.forEach(num => {
      // Skip if in preserve list
      if (options.preserveNumbers?.includes(num.original)) {
        return;
      }

      const shouldRound = this.shouldRound(num, options);
      if (shouldRound) {
        const humanized = this.humanizeNumber(num, options);
        modified = modified.replace(num.original, humanized);
        changed++;
      }
    });

    return {
      text: modified,
      numbersChanged: changed,
    };
  }

  /**
   * Detect all numbers in text
   */
  private detectNumbers(text: string): DetectedNumber[] {
    const detected: DetectedNumber[] = [];

    // Percentages: 87.43%
    const percentages = text.matchAll(/(\d+\.\d+)%/g);
    for (const match of percentages) {
      detected.push({
        original: match[0],
        value: parseFloat(match[1]),
        type: 'percentage',
        decimals: (match[1].split('.')[1] || '').length,
        context: this.getContext(text, match.index!),
      });
    }

    // Currency: $2,147,382.47
    const currency = text.matchAll(/\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/g);
    for (const match of currency) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      detected.push({
        original: match[0],
        value,
        type: 'currency',
        decimals: (match[1].split('.')[1] || '').length,
        context: this.getContext(text, match.index!),
        currency: '$',
      });
    }

    // Time durations: 142.7 minutes, 18.3 seconds
    const durations = text.matchAll(/(\d+\.\d+)\s*(seconds?|minutes?|hours?|days?)/gi);
    for (const match of durations) {
      detected.push({
        original: match[0],
        value: parseFloat(match[1]),
        type: 'duration',
        decimals: (match[1].split('.')[1] || '').length,
        context: this.getContext(text, match.index!),
        unit: match[2].toLowerCase(),
      });
    }

    // Timestamps: 2024-03-15 14:23:47
    const timestamps = text.matchAll(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/g);
    for (const match of timestamps) {
      detected.push({
        original: match[0],
        value: new Date(match[1]).getTime(),
        type: 'timestamp',
        decimals: 0,
        context: this.getContext(text, match.index!),
      });
    }

    // Large numbers with decimals: 2,847,392.18
    const largeDecimals = text.matchAll(/(\d{1,3}(?:,\d{3})+\.\d+)/g);
    for (const match of largeDecimals) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      detected.push({
        original: match[0],
        value,
        type: 'count',
        decimals: (match[1].split('.')[1] || '').length,
        context: this.getContext(text, match.index!),
      });
    }

    // General decimals with 2+ decimal places: 87.43
    const decimals = text.matchAll(/\b(\d+\.\d{2,})\b/g);
    for (const match of decimals) {
      // Skip if already captured
      if (detected.some(d => d.original.includes(match[0]))) {
        continue;
      }
      
      detected.push({
        original: match[0],
        value: parseFloat(match[1]),
        type: 'decimal',
        decimals: (match[1].split('.')[1] || '').length,
        context: this.getContext(text, match.index!),
      });
    }

    return detected;
  }

  /**
   * Get surrounding context (50 chars before/after)
   */
  private getContext(text: string, index: number): string {
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + 50);
    return text.substring(start, end);
  }

  /**
   * Determine if number should be rounded
   */
  private shouldRound(num: DetectedNumber, options: HumanizeOptions): boolean {
    // Financial documents: keep precision
    if (options.documentType === 'financial') {
      return false;
    }

    // Legal documents: keep precision
    if (options.documentType === 'legal') {
      return false;
    }

    // Technical documents with low formality: round a bit
    if (options.documentType === 'technical') {
      return num.decimals > 1; // Only round excessive precision
    }

    // Executive summaries: round aggressively
    if (options.documentType === 'executive') {
      return num.decimals > 0;
    }

    // Narratives: round everything
    if (options.documentType === 'narrative' || options.documentType === 'casual') {
      return num.decimals > 0;
    }

    // Default: round if more than 1 decimal
    return num.decimals > 1;
  }

  /**
   * Humanize a specific number
   */
  private humanizeNumber(num: DetectedNumber, options: HumanizeOptions): string {
    switch (num.type) {
      case 'percentage':
        return this.humanizePercentage(num.value, options);
      case 'currency':
        return this.humanizeCurrency(num.value, num.currency || '$', options);
      case 'duration':
        return this.humanizeDuration(num.value, num.unit || '', options);
      case 'timestamp':
        return this.humanizeTimestamp(num.value, options);
      case 'count':
        return this.humanizeCount(num.value, options);
      case 'decimal':
        return this.humanizeDecimal(num.value, options);
      default:
        return num.original;
    }
  }

  /**
   * Humanize percentages
   */
  private humanizePercentage(value: number, options: HumanizeOptions): string {
    // Financial/Legal: light rounding
    if (options.documentType === 'financial' || options.documentType === 'legal') {
      return `${value.toFixed(1)}%`;
    }

    // Casual: aggressive rounding with language
    if (options.formalityLevel === 'casual' || options.formalityLevel === 'very-casual') {
      if (value >= 95) return 'nearly all';
      if (value >= 90) return 'over 90%';
      if (value >= 85) return 'close to 90%';
      if (value >= 75) return 'about ' + Math.round(value / 5) * 5 + '%';
      if (value >= 50) return 'around ' + Math.round(value / 5) * 5 + '%';
      if (value >= 25) return 'roughly ' + Math.round(value / 5) * 5 + '%';
      if (value >= 10) return 'around ' + Math.round(value / 5) * 5 + '%';
      return 'under ' + Math.ceil(value / 5) * 5 + '%';
    }

    // Professional: moderate rounding
    if (value >= 90) return 'nearly 90%';
    if (value >= 75) return 'about ' + Math.round(value / 5) * 5 + '%';
    return 'roughly ' + Math.round(value / 5) * 5 + '%';
  }

  /**
   * Humanize currency
   */
  private humanizeCurrency(value: number, currency: string, options: HumanizeOptions): string {
    // Financial: keep precision
    if (options.documentType === 'financial') {
      return `${currency}${value.toLocaleString()}`;
    }

    // Millions
    if (value >= 1_000_000) {
      const millions = value / 1_000_000;
      if (options.formalityLevel === 'casual') {
        if (millions >= 10) {
          return `around ${currency}${Math.round(millions)}M`;
        }
        return `roughly ${currency}${millions.toFixed(1)}M`;
      }
      return `approximately ${currency}${millions.toFixed(1)}M`;
    }

    // Thousands
    if (value >= 10_000) {
      const thousands = value / 1_000;
      if (options.formalityLevel === 'casual') {
        return `about ${currency}${Math.round(thousands)}K`;
      }
      return `approximately ${currency}${Math.round(thousands)}K`;
    }

    // Smaller amounts: round to nearest 100 or 10
    if (value >= 1_000) {
      const rounded = Math.round(value / 100) * 100;
      if (options.formalityLevel === 'casual') {
        return `around ${currency}${rounded.toLocaleString()}`;
      }
      return `approximately ${currency}${rounded.toLocaleString()}`;
    }

    const rounded = Math.round(value / 10) * 10;
    return `about ${currency}${rounded}`;
  }

  /**
   * Humanize time durations
   */
  private humanizeDuration(value: number, unit: string, options: HumanizeOptions): string {
    // Convert everything to seconds for easier handling
    let seconds = value;
    if (unit.startsWith('minute')) seconds = value * 60;
    if (unit.startsWith('hour')) seconds = value * 3600;
    if (unit.startsWith('day')) seconds = value * 86400;

    // Less than a minute
    if (seconds < 60) {
      if (options.formalityLevel === 'casual') {
        return 'under a minute';
      }
      return 'less than one minute';
    }

    // Minutes
    if (seconds < 3600) {
      const mins = seconds / 60;
      if (mins < 2) {
        return 'about a minute';
      }
      if (mins < 5) {
        return `about ${Math.round(mins)} minutes`;
      }
      // Round to nearest 5
      const rounded = Math.round(mins / 5) * 5;
      if (options.formalityLevel === 'casual') {
        return `roughly ${rounded} minutes`;
      }
      return `approximately ${rounded} minutes`;
    }

    // Hours
    const hours = seconds / 3600;
    if (hours < 2) {
      return 'about an hour';
    }
    if (hours < 3) {
      if (options.formalityLevel === 'casual') {
        return 'about 2 hours';
      }
      return 'approximately 2 hours';
    }
    
    // Round to nearest 0.5
    const rounded = Math.round(hours * 2) / 2;
    if (options.formalityLevel === 'casual') {
      return `roughly ${rounded} hours`;
    }
    return `approximately ${rounded} hours`;
  }

  /**
   * Humanize timestamps
   */
  private humanizeTimestamp(timestamp: number, options: HumanizeOptions): string {
    const date = new Date(timestamp);
    
    if (options.formalityLevel === 'casual' || options.formalityLevel === 'very-casual') {
      // Casual: "mid-March" or "around 2:30 PM"
      const month = date.toLocaleString('en-US', { month: 'short' });
      const day = date.getDate();
      
      if (day < 10) return `early ${month}`;
      if (day < 20) return `mid-${month}`;
      return `late ${month}`;
    }

    // Professional: "March 15th" or "March 15, 2024"
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: options.documentType === 'financial' ? 'numeric' : undefined,
    });
  }

  /**
   * Humanize counts
   */
  private humanizeCount(value: number, options: HumanizeOptions): string {
    // Financial/Technical: keep some precision
    if (options.documentType === 'financial' || options.documentType === 'technical') {
      if (value >= 1_000_000) {
        const millions = (value / 1_000_000).toFixed(1);
        return `${millions} million`;
      }
      return value.toLocaleString();
    }

    // Casual: very approximate
    if (value < 10) return value.toString();
    if (value < 20) return 'a dozen or so';
    if (value < 50) return 'dozens';
    if (value < 100) return 'many dozens';
    if (value < 1000) return 'hundreds';
    if (value < 10000) return 'thousands';
    if (value < 100000) return 'tens of thousands';
    
    // Large numbers: round to significant figures
    if (value >= 1_000_000) {
      const millions = (value / 1_000_000).toFixed(1);
      if (options.formalityLevel === 'casual') {
        return `about ${millions} million`;
      }
      return `approximately ${millions} million`;
    }

    if (value >= 100_000) {
      const thousands = Math.round(value / 1000);
      return `around ${thousands}K`;
    }

    return 'many thousands';
  }

  /**
   * Humanize general decimals
   */
  private humanizeDecimal(value: number, options: HumanizeOptions): string {
    // Round to 1 decimal or whole number
    if (options.documentType === 'technical') {
      return value.toFixed(1);
    }

    if (options.formalityLevel === 'casual') {
      return Math.round(value).toString();
    }

    return value.toFixed(1);
  }
}
