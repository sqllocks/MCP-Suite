/**
 * Remaining Humanization Engines (Bundle)
 * All engines needed to complete the humanization pipeline
 */

import { HumanizeOptions } from '../server.js';

// ============================================================================
// STRUCTURE VARIATOR - Vary paragraph lengths, add fragments, etc.
// ============================================================================

export class StructureVariator {
  vary(text: string, options: HumanizeOptions): { text: string; changesCount: number } {
    let modified = text;
    let changes = 0;

    // Split into paragraphs
    const paragraphs = modified.split('\n\n');

    // Vary paragraph lengths
    const varied = paragraphs.map((para, i) => {
      // Randomly make some paragraphs one sentence for emphasis
      if (i > 0 && Math.random() < 0.15 && options.formalityLevel !== 'very-formal') {
        const sentences = para.split(/\. /);
        if (sentences.length > 2) {
          changes++;
          return sentences[0] + '.\n\n' + sentences.slice(1).join('. ');
        }
      }
      return para;
    });

    modified = varied.join('\n\n');

    // Add occasional fragments (casual only)
    if (options.formalityLevel === 'casual' || options.formalityLevel === 'very-casual') {
      modified = modified.replace(/\. (Like this|Exactly|Interesting|Important)\./g, '. $1.');
      changes++;
    }

    // Allow starting sentences with And/But (except very formal)
    if (options.formalityLevel !== 'very-formal' && options.formalityLevel !== 'formal') {
      modified = modified.replace(/\. Additionally,/g, '. And');
      modified = modified.replace(/\. However,/g, '. But');
      changes += 2;
    }

    return { text: modified, changesCount: changes };
  }
}

// ============================================================================
// PERSONALITY INJECTOR - Add role-based voice
// ============================================================================

export class PersonalityInjector {
  inject(text: string, options: HumanizeOptions): string {
    let modified = text;

    switch (options.persona) {
      case 'consultant':
        modified = this.injectConsultantVoice(modified);
        break;
      case 'engineer':
        modified = this.injectEngineerVoice(modified);
        break;
      case 'executive':
        modified = this.injectExecutiveVoice(modified);
        break;
      case 'doctor':
        modified = this.injectDoctorVoice(modified);
        break;
      default:
        break;
    }

    return modified;
  }

  private injectConsultantVoice(text: string): string {
    // McKinsey-style: confident, data-driven, framework-oriented
    text = text.replace(/I think/gi, 'Our analysis shows');
    text = text.replace(/maybe/gi, 'likely');
    text = text.replace(/could be/gi, 'is');
    return text;
  }

  private injectEngineerVoice(text: string): string {
    // Technical, skeptical, precise
    text = text.replace(/perfect solution/gi, 'decent approach');
    text = text.replace(/always works/gi, 'usually works');
    text = text.replace(/guaranteed/gi, 'should work');
    return text;
  }

  private injectExecutiveVoice(text: string): string {
    // Direct, bottom-line focused
    text = text.replace(/In conclusion,/gi, 'Bottom line:');
    text = text.replace(/To summarize,/gi, 'Key point:');
    return text;
  }

  private injectDoctorVoice(text: string): string {
    // Clinical but empathetic
    text = text.replace(/patients/gi, 'our patients');
    text = text.replace(/treatment/gi, 'care');
    return text;
  }
}

// ============================================================================
// PUNCTUATION PERSONALIZER - Add em dashes, ellipses, etc.
// ============================================================================

export class PunctuationPersonalizer {
  personalize(text: string, options: HumanizeOptions): string {
    let modified = text;

    if (options.formalityLevel === 'casual' || options.formalityLevel === 'very-casual') {
      // Add em dashes for asides (10% of sentences)
      const sentences = modified.split(/\. /);
      const withDashes = sentences.map(s => {
        if (Math.random() < 0.1 && s.includes(',')) {
          return s.replace(/,([^,]+),/, '—$1—');
        }
        return s;
      });
      modified = withDashes.join('. ');

      // Add occasional ellipses for trailing thoughts
      modified = modified.replace(/\. (And|But|So) /g, (match) => {
        return Math.random() < 0.05 ? '... ' + match.substring(2) : match;
      });

      // Add parentheticals
      modified = modified.replace(/\. (This|That|These|Those) /g, (match) => {
        return Math.random() < 0.08 ? '. (' + match.substring(2, 3).toLowerCase() + match.substring(3) : match;
      });
    }

    return modified;
  }
}

// ============================================================================
// UNCERTAINTY INJECTOR - Add realistic hedging
// ============================================================================

export class UncertaintyInjector {
  inject(text: string, options: HumanizeOptions): string {
    let modified = text;

    // Skip if high confidence or formal
    if (options.confidenceLevel > 0.8 || options.formalityLevel === 'very-formal') {
      return text;
    }

    // Replace certainties with hedges
    const hedges = [
      { from: /will definitely/gi, to: 'will probably' },
      { from: /always/gi, to: 'usually' },
      { from: /never/gi, to: 'rarely' },
      { from: /guaranteed/gi, to: 'likely' },
      { from: /certain/gi, to: 'confident' },
    ];

    hedges.forEach(hedge => {
      if (Math.random() < 0.5) { // Only sometimes
        modified = modified.replace(hedge.from, hedge.to);
      }
    });

    // Add qualifiers
    if (options.formalityLevel === 'casual') {
      modified = modified.replace(/\. This is/g, '. This is probably');
      modified = modified.replace(/\. The best/g, '. Likely the best');
    }

    return modified;
  }
}

// ============================================================================
// IMPERFECTION INJECTOR - Add deliberate human "errors"
// ============================================================================

export class ImperfectionInjector {
  inject(text: string, options: HumanizeOptions): string {
    let modified = text;

    // Very rare typos (1 per 10K words) - casual only
    if (options.formalityLevel === 'casual' && Math.random() < 0.001) {
      // Common typos: "teh" → "the", "recieve" → "receive"
      const typos = [
        { correct: 'the', typo: 'teh' },
        { correct: 'receive', typo: 'recieve' },
      ];
      const typo = typos[Math.floor(Math.random() * typos.length)];
      modified = modified.replace(new RegExp(`\\b${typo.correct}\\b`, 'i'), typo.typo);
    }

    // Allow "their" as singular (very casual)
    if (options.formalityLevel === 'very-casual') {
      modified = modified.replace(/his or her/gi, 'their');
    }

    // Split infinitives (casual)
    if (options.formalityLevel === 'casual') {
      modified = modified.replace(/to quickly/gi, 'to quickly'); // Already split, keep it
    }

    return modified;
  }
}

// ============================================================================
// TRANSITION NATURALIZER - Replace AI transitions
// ============================================================================

export class TransitionNaturalizer {
  naturalize(text: string, options: HumanizeOptions): string {
    let modified = text;

    const replacements: Record<string, string[]> = {
      'Furthermore,': ['Also,', 'Plus,', 'And,', 'On top of that,'],
      'Moreover,': ['Also,', 'Plus,', 'And another thing,'],
      'Additionally,': ['Also,', 'And,', 'Plus,'],
      'In conclusion,': ['Bottom line:', 'The key takeaway:', 'In short,', 'To sum up:'],
      'Subsequently,': ['Then,', 'After that,', 'Next,'],
      'Consequently,': ['So,', 'As a result,', 'Therefore,'],
      'It is important to note that': ['Note that', 'Keep in mind', 'Remember'],
      'It should be noted that': ['Note that', 'Worth noting:'],
    };

    for (const [aiPhrase, humanOptions] of Object.entries(replacements)) {
      const regex = new RegExp(aiPhrase, 'gi');
      modified = modified.replace(regex, () => {
        return this.randomChoice(humanOptions);
      });
    }

    return modified;
  }

  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}

// ============================================================================
// REPETITION NORMALIZER - Allow word repetition (humans do this)
// ============================================================================

export class RepetitionNormalizer {
  normalize(text: string): string {
    // AI over-uses synonyms. Humans repeat words.
    // This is a simplified implementation - in reality you'd track synonym chains
    
    let modified = text;

    // Common synonym chains to revert
    const chains = [
      { synonyms: ['use', 'utilize', 'employ'], prefer: 'use' },
      { synonyms: ['show', 'demonstrate', 'illustrate'], prefer: 'show' },
      { synonyms: ['help', 'facilitate', 'assist'], prefer: 'help' },
      { synonyms: ['improve', 'enhance', 'augment'], prefer: 'improve' },
    ];

    chains.forEach(chain => {
      chain.synonyms.forEach(synonym => {
        if (synonym !== chain.prefer) {
          // Replace some (not all) instances
          const regex = new RegExp(`\\b${synonym}\\b`, 'gi');
          const matches = modified.match(regex);
          if (matches && matches.length > 1) {
            // Replace half of them with the preferred word
            let count = 0;
            modified = modified.replace(regex, (match) => {
              count++;
              return count % 2 === 0 ? chain.prefer : match;
            });
          }
        }
      });
    });

    return modified;
  }
}

// ============================================================================
// EXAMPLE GENERATOR - Make examples messy/realistic
// ============================================================================

export class ExampleGenerator {
  makeMessy(text: string, options: HumanizeOptions): string {
    let modified = text;

    // Replace generic "a company" with specific examples
    modified = modified.replace(/for example, a company/gi, 
      'for example, when we worked with Acme Corp last quarter');
    modified = modified.replace(/companies like/gi,
      'companies like Netflix, Spotify, or');

    // Add realistic caveats to examples (casual only)
    if (options.formalityLevel === 'casual') {
      modified = modified.replace(/This worked well/gi, 'This worked well (mostly)');
      modified = modified.replace(/was successful/gi, 'was successful, though we had some hiccups');
    }

    // Add "your mileage may vary" type qualifiers
    if (options.formalityLevel === 'casual' && Math.random() < 0.1) {
      modified = modified.replace(/\. This approach/g, '. This approach (your mileage may vary)');
    }

    return modified;
  }
}
