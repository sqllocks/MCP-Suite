/**
 * AI Pattern Detector
 * Detects and removes common AI writing patterns
 */

import { HumanizeOptions } from '../server.js';

export interface AIPattern {
  pattern: RegExp | string;
  type: 'phrase' | 'structure' | 'transition' | 'hedge';
  severity: 'high' | 'medium' | 'low';
  replacement?: string | string[];
}

export interface DetectionResult {
  aiScore: number; // 0-1 (1 = definitely AI)
  patterns: Array<{
    pattern: string;
    count: number;
    severity: string;
  }>;
  recommendations: string[];
}

export interface RemovalResult {
  text: string;
  patternsRemoved: number;
}

export class AIPatternDetector {
  private patterns: AIPattern[] = [
    // HIGH SEVERITY - Obvious AI tells
    { pattern: /It is important to note that/gi, type: 'phrase', severity: 'high', replacement: ['Note that', 'Keep in mind:', 'Remember:'] },
    { pattern: /It should be noted that/gi, type: 'phrase', severity: 'high', replacement: ['Note that', 'Worth noting:'] },
    { pattern: /It is worth noting that/gi, type: 'phrase', severity: 'high', replacement: ['Notably,', 'Worth noting:'] },
    
    // AI loves these transitions
    { pattern: /\bFurthermore,/gi, type: 'transition', severity: 'high', replacement: ['Also,', 'Plus,', 'And,'] },
    { pattern: /\bMoreover,/gi, type: 'transition', severity: 'high', replacement: ['Also,', 'Plus,', 'On top of that,'] },
    { pattern: /\bAdditionally,/gi, type: 'transition', severity: 'high', replacement: ['Also,', 'And,', 'Plus,'] },
    { pattern: /\bSubsequently,/gi, type: 'transition', severity: 'high', replacement: ['Then,', 'After that,', 'Next,'] },
    { pattern: /\bConsequently,/gi, type: 'transition', severity: 'high', replacement: ['So,', 'As a result,', 'Therefore,'] },
    { pattern: /In conclusion,/gi, type: 'transition', severity: 'high', replacement: ['Bottom line:', 'The key takeaway:', 'In short,'] },
    
    // Overused "powerful" words
    { pattern: /\bleverage\b/gi, type: 'phrase', severity: 'high', replacement: 'use' },
    { pattern: /\butilize\b/gi, type: 'phrase', severity: 'high', replacement: 'use' },
    { pattern: /\bfacilitate\b/gi, type: 'phrase', severity: 'high', replacement: 'help' },
    { pattern: /\brobust\b/gi, type: 'phrase', severity: 'medium', replacement: ['strong', 'solid', 'reliable'] },
    { pattern: /\bcomprehensive\b/gi, type: 'phrase', severity: 'medium', replacement: ['complete', 'full', 'thorough'] },
    
    // MEDIUM SEVERITY - Common but not always AI
    { pattern: /\boptimal\b/gi, type: 'phrase', severity: 'medium', replacement: ['best', 'ideal'] },
    { pattern: /\benhance\b/gi, type: 'phrase', severity: 'medium', replacement: ['improve', 'boost', 'increase'] },
    { pattern: /\bensure\b/gi, type: 'phrase', severity: 'medium', replacement: ['make sure', 'guarantee'] },
    { pattern: /\bImplement\b/gi, type: 'phrase', severity: 'medium', replacement: ['Set up', 'Build', 'Create'] },
    
    // Hedge words (AI rarely hedges naturally)
    { pattern: /\bgoing forward\b/gi, type: 'hedge', severity: 'high', replacement: ['', 'in the future', 'moving forward'] },
    { pattern: /\bat this point in time\b/gi, type: 'hedge', severity: 'high', replacement: ['now', 'currently', 'right now'] },
    { pattern: /\bin order to\b/gi, type: 'hedge', severity: 'medium', replacement: 'to' },
    
    // Overly formal
    { pattern: /\bcommence\b/gi, type: 'phrase', severity: 'medium', replacement: ['start', 'begin'] },
    { pattern: /\bterminate\b/gi, type: 'phrase', severity: 'medium', replacement: ['end', 'stop'] },
    { pattern: /\bpurchase\b/gi, type: 'phrase', severity: 'low', replacement: 'buy' },
    
    // AI loves these qualifiers
    { pattern: /\bvarious\b/gi, type: 'phrase', severity: 'low', replacement: ['several', 'many', 'different'] },
    { pattern: /\bnumerous\b/gi, type: 'phrase', severity: 'medium', replacement: ['many', 'lots of', 'plenty of'] },
    { pattern: /\ba plethora of\b/gi, type: 'phrase', severity: 'high', replacement: ['lots of', 'many', 'plenty of'] },
    
    // Passive voice indicators (AI loves passive)
    { pattern: /\bwas implemented by\b/gi, type: 'structure', severity: 'medium', replacement: 'implemented' },
    { pattern: /\bwill be completed by\b/gi, type: 'structure', severity: 'medium', replacement: 'will complete' },
    { pattern: /\bhas been shown to\b/gi, type: 'structure', severity: 'medium', replacement: 'shows' },
    
    // Redundant phrases
    { pattern: /\bbasic fundamentals\b/gi, type: 'phrase', severity: 'medium', replacement: 'fundamentals' },
    { pattern: /\bfuture plans\b/gi, type: 'phrase', severity: 'medium', replacement: 'plans' },
    { pattern: /\bend result\b/gi, type: 'phrase', severity: 'medium', replacement: 'result' },
    { pattern: /\bpast experience\b/gi, type: 'phrase', severity: 'medium', replacement: 'experience' },
  ];

  /**
   * Detect AI patterns without modifying text
   */
  detect(text: string): DetectionResult {
    const found: Map<string, number> = new Map();
    let totalScore = 0;

    this.patterns.forEach(pattern => {
      const regex = typeof pattern.pattern === 'string' 
        ? new RegExp(pattern.pattern, 'gi')
        : pattern.pattern;
      
      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        const key = typeof pattern.pattern === 'string' ? pattern.pattern : pattern.pattern.source;
        found.set(key, matches.length);
        
        // Weight by severity
        const weight = pattern.severity === 'high' ? 0.15 : pattern.severity === 'medium' ? 0.08 : 0.03;
        totalScore += matches.length * weight;
      }
    });

    // Additional structural checks
    totalScore += this.checkStructuralPatterns(text);

    // Cap at 1.0
    const aiScore = Math.min(1.0, totalScore);

    const patternList = Array.from(found.entries()).map(([pattern, count]) => ({
      pattern,
      count,
      severity: this.getSeverity(pattern),
    }));

    const recommendations = this.generateRecommendations(aiScore, patternList);

    return {
      aiScore,
      patterns: patternList,
      recommendations,
    };
  }

  /**
   * Remove AI patterns and replace with human alternatives
   */
  removePatterns(text: string, options: HumanizeOptions): RemovalResult {
    let modified = text;
    let removed = 0;

    this.patterns.forEach(pattern => {
      const regex = typeof pattern.pattern === 'string'
        ? new RegExp(pattern.pattern, 'gi')
        : pattern.pattern;

      const matches = modified.match(regex);
      if (matches && matches.length > 0) {
        removed += matches.length;

        if (pattern.replacement) {
          if (Array.isArray(pattern.replacement)) {
            // Random replacement from options
            modified = modified.replace(regex, () => {
              return this.randomChoice(pattern.replacement as string[]);
            });
          } else {
            modified = modified.replace(regex, pattern.replacement);
          }
        }
      }
    });

    return {
      text: modified,
      patternsRemoved: removed,
    };
  }

  /**
   * Check for structural AI patterns
   */
  private checkStructuralPatterns(text: string): number {
    let score = 0;

    // Check for overly consistent paragraph lengths
    const paragraphs = text.split('\n\n');
    if (paragraphs.length > 3) {
      const lengths = paragraphs.map(p => p.split(/\s+/).length);
      const variance = this.calculateVariance(lengths);
      
      // Low variance = too consistent = AI
      if (variance < 10) {
        score += 0.1;
      }
    }

    // Check for perfect list structures (always 3 or 5 items)
    const listMatches = text.match(/^\s*[-•*]\s/gm);
    if (listMatches) {
      const listCount = listMatches.length;
      if (listCount === 3 || listCount === 5 || listCount === 7) {
        score += 0.05;
      }
    }

    // Check for no sentence fragments
    const sentences = text.split(/[.!?]+/);
    let hasFragment = false;
    sentences.forEach(s => {
      const words = s.trim().split(/\s+/).length;
      if (words < 4 && words > 0) {
        hasFragment = true;
      }
    });
    if (!hasFragment && sentences.length > 5) {
      score += 0.1; // No fragments = probably AI
    }

    // Check for zero contractions
    const contractions = text.match(/n't|'s|'re|'ve|'ll|'d/g);
    if (!contractions || contractions.length === 0) {
      score += 0.15; // No contractions = likely AI
    }

    // Check for perfect precision numbers
    const preciseNumbers = text.match(/\d+\.\d{2,}/g);
    if (preciseNumbers && preciseNumbers.length > 3) {
      score += preciseNumbers.length * 0.02;
    }

    return score;
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squareDiffs = numbers.map(value => Math.pow(value - mean, 2));
    return squareDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private getSeverity(pattern: string): string {
    const found = this.patterns.find(p => {
      const key = typeof p.pattern === 'string' ? p.pattern : p.pattern.source;
      return key === pattern;
    });
    return found?.severity || 'medium';
  }

  private generateRecommendations(aiScore: number, patterns: any[]): string[] {
    const recs: string[] = [];

    if (aiScore > 0.7) {
      recs.push('High AI score detected. Text likely needs significant humanization.');
    } else if (aiScore > 0.4) {
      recs.push('Moderate AI patterns found. Consider humanizing for better authenticity.');
    } else {
      recs.push('Low AI score. Text appears relatively natural.');
    }

    // Specific recommendations
    const highSeverity = patterns.filter(p => p.severity === 'high');
    if (highSeverity.length > 0) {
      recs.push(`Remove ${highSeverity.length} obvious AI phrases (Furthermore, Moreover, etc.)`);
    }

    const transitions = patterns.filter(p => p.pattern.includes('Furthermore') || p.pattern.includes('Moreover'));
    if (transitions.length > 0) {
      recs.push('Replace formal transitions with casual connectors (Also, Plus, And)');
    }

    if (patterns.some(p => p.pattern.includes('leverage') || p.pattern.includes('utilize'))) {
      recs.push('Replace corporate buzzwords with simple language (use instead of leverage)');
    }

    return recs;
  }

  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}
