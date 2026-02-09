/**
 * Humanizer MCP Server
 * Transforms AI-generated text into natural, human-sounding content
 * 
 * Features:
 * - AI pattern detection and removal
 * - Number humanization (context-aware precision)
 * - Structural variation (paragraph lengths, fragments)
 * - Personality injection (role-based voice)
 * - Punctuation personality (em dashes, ellipses, etc.)
 * - Hedging/uncertainty injection
 * - Deliberate imperfection
 * - Industry/persona tuning
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import all humanization engines
import { AIPatternDetector } from './engines/ai-pattern-detector.js';
import { NumberHumanizer } from './engines/number-humanizer.js';
import { StructureVariator } from './engines/structure-variator.js';
import { PersonalityInjector } from './engines/personality-injector.js';
import { PunctuationPersonalizer } from './engines/punctuation-personalizer.js';
import { UncertaintyInjector } from './engines/uncertainty-injector.js';
import { ImperfectionInjector } from './engines/imperfection-injector.js';
import { TransitionNaturalizer } from './engines/transition-naturalizer.js';
import { RepetitionNormalizer } from './engines/repetition-normalizer.js';
import { ExampleGenerator } from './engines/example-generator.js';

// Security: Input validation
import Joi from 'joi';
import sanitizeHtml from 'sanitize-html';

export interface HumanizeOptions {
  // Document context
  documentType: 'executive' | 'technical' | 'financial' | 'narrative' | 'casual' | 'legal' | 'medical';
  industry: 'healthcare' | 'finance' | 'retail' | 'manufacturing' | 'technology' | 'consulting' | 'general';
  
  // Persona/voice
  persona: 'consultant' | 'engineer' | 'executive' | 'doctor' | 'lawyer' | 'analyst' | 'marketer';
  audience: 'c-suite' | 'technical' | 'general' | 'patient' | 'customer';
  
  // Style controls
  formalityLevel: 'very-formal' | 'formal' | 'professional' | 'casual' | 'very-casual';
  confidenceLevel: 0 | 0.25 | 0.5 | 0.75 | 1; // How certain to sound
  
  // Features to apply
  removeAIPatterns: boolean;
  humanizeNumbers: boolean;
  varyStructure: boolean;
  injectPersonality: boolean;
  addPunctuationFlair: boolean;
  addUncertainty: boolean;
  addImperfections: boolean;
  naturalizeTransitions: boolean;
  allowRepetition: boolean;
  messenExamples: boolean;
  
  // Preservation
  preserveTechnicalTerms: boolean;
  preserveNumbers: string[]; // Array of numbers to keep precise (e.g., ["99.97%", "$2,147,382"])
  preserveFormatting: boolean;
  
  // Advanced
  targetReadabilityGrade: number; // 6-16 (Flesch-Kincaid grade level)
  includeAnalysis: boolean; // Return before/after analysis
}

export interface HumanizeResult {
  humanizedText: string;
  analysis?: {
    aiPatternsRemoved: number;
    numbersHumanized: number;
    structuralChanges: number;
    confidenceScore: number; // 0-1 (how human does it sound)
    readabilityBefore: number;
    readabilityAfter: number;
    changesSummary: string[];
  };
  warnings?: string[];
}

export class HumanizerMCP {
  private server: Server;
  
  // Humanization engines
  private aiDetector: AIPatternDetector;
  private numberHumanizer: NumberHumanizer;
  private structureVariator: StructureVariator;
  private personalityInjector: PersonalityInjector;
  private punctuationPersonalizer: PunctuationPersonalizer;
  private uncertaintyInjector: UncertaintyInjector;
  private imperfectionInjector: ImperfectionInjector;
  private transitionNaturalizer: TransitionNaturalizer;
  private repetitionNormalizer: RepetitionNormalizer;
  private exampleGenerator: ExampleGenerator;

  // Security: Rate limiting and validation
  private readonly MAX_TEXT_LENGTH = 1_000_000; // 1MB
  private readonly MAX_REQUESTS_PER_MINUTE = 100;
  private rateLimitMap: Map<string, { count: number; resetAt: number }> = new Map();
  
  // Security: Input validation schemas
  private inputSchemas = {
    humanize_text: Joi.object({
      text: Joi.string().max(this.MAX_TEXT_LENGTH).required(),
      documentType: Joi.string().valid('executive', 'technical', 'financial', 'narrative', 'casual', 'legal', 'medical').optional(),
      industry: Joi.string().valid('healthcare', 'finance', 'retail', 'manufacturing', 'technology', 'consulting', 'general').optional(),
      persona: Joi.string().valid('consultant', 'engineer', 'executive', 'doctor', 'lawyer', 'analyst', 'marketer').optional(),
      style: Joi.string().valid('mckinsey', 'casual', 'technical', 'formal').optional(),
      includeAnalysis: Joi.boolean().optional(),
    }),
  };

  constructor() {
    this.server = new Server(
      {
        name: 'humanizer-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize engines
    this.aiDetector = new AIPatternDetector();
    this.numberHumanizer = new NumberHumanizer();
    this.structureVariator = new StructureVariator();
    this.personalityInjector = new PersonalityInjector();
    this.punctuationPersonalizer = new PunctuationPersonalizer();
    this.uncertaintyInjector = new UncertaintyInjector();
    this.imperfectionInjector = new ImperfectionInjector();
    this.transitionNaturalizer = new TransitionNaturalizer();
    this.repetitionNormalizer = new RepetitionNormalizer();
    this.exampleGenerator = new ExampleGenerator();

    this.setupHandlers();
  }

  /**
   * Security: Wrap operation with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timeout - request took too long')), timeoutMs)
    );
    return Promise.race([promise, timeout]);
  }

  /**
   * Security: Rate limiting check
   */
  private async checkRateLimit(clientId: string = 'default'): Promise<void> {
    const now = Date.now();
    const limit = this.rateLimitMap.get(clientId);

    if (!limit || now > limit.resetAt) {
      // Reset window
      this.rateLimitMap.set(clientId, {
        count: 1,
        resetAt: now + 60000, // 1 minute window
      });
      return;
    }

    if (limit.count >= this.MAX_REQUESTS_PER_MINUTE) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    limit.count++;
  }

  /**
   * Security: Validate and sanitize input
   */
  private async validateInput(toolName: string, args: any): Promise<any> {
    const schema = this.inputSchemas[toolName];
    if (!schema) {
      return args; // No schema defined, pass through
    }

    // Validate with Joi
    const { error, value } = schema.validate(args, {
      abortEarly: false,
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      throw new Error(`Input validation failed: ${error.details.map(d => d.message).join(', ')}`);
    }

    // Sanitize text content
    if (value.text) {
      // Remove any HTML/script tags
      value.text = sanitizeHtml(value.text, {
        allowedTags: [],
        allowedAttributes: {},
      });

      // Check for suspicious patterns
      const suspiciousPatterns = [
        /(\.\.|\/\.\.|\\\.\.)/g, // Path traversal
        /(javascript:|data:|vbscript:)/gi, // XSS
        /(<script|<iframe|<object)/gi, // HTML injection
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value.text)) {
          throw new Error('Suspicious input pattern detected');
        }
      }
    }

    return value;
  }

  /**
   * Security: Sanitize error for user
   */
  private sanitizeError(error: Error): string {
    // Never expose internal details, stack traces, or file paths
    const genericMessage = 'An error occurred while processing your request';
    
    // Log full error internally (would go to logging system)
    console.error('Internal error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // Return generic message to user
    if (error.message.includes('validation failed')) {
      return error.message; // Validation errors are safe to show
    }
    
    if (error.message.includes('Rate limit')) {
      return error.message; // Rate limit messages are safe
    }

    return genericMessage;
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'humanize_text',
          description: 'Transform AI-generated text into natural, human-sounding content. Removes AI tells, humanizes numbers, adds personality, and makes text indistinguishable from human writing.',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The AI-generated text to humanize',
              },
              documentType: {
                type: 'string',
                enum: ['executive', 'technical', 'financial', 'narrative', 'casual', 'legal', 'medical'],
                description: 'Type of document',
                default: 'narrative',
              },
              industry: {
                type: 'string',
                enum: ['healthcare', 'finance', 'retail', 'manufacturing', 'technology', 'consulting', 'general'],
                description: 'Industry context',
                default: 'general',
              },
              persona: {
                type: 'string',
                enum: ['consultant', 'engineer', 'executive', 'doctor', 'lawyer', 'analyst', 'marketer'],
                description: 'Voice/persona to inject',
                default: 'analyst',
              },
              style: {
                type: 'string',
                enum: ['mckinsey', 'casual', 'technical', 'formal'],
                description: 'Pre-configured style preset',
                default: 'professional',
              },
              includeAnalysis: {
                type: 'boolean',
                description: 'Include before/after analysis',
                default: false,
              },
            },
            required: ['text'],
          },
        },
        {
          name: 'detect_ai_patterns',
          description: 'Analyze text for AI writing patterns without modifying it. Returns a detailed report of AI tells found.',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'Text to analyze',
              },
            },
            required: ['text'],
          },
        },
        {
          name: 'humanize_numbers',
          description: 'Humanize numbers in text (convert fake precision to natural language) without other modifications.',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'Text with numbers to humanize',
              },
              documentType: {
                type: 'string',
                enum: ['executive', 'technical', 'financial', 'narrative'],
                default: 'narrative',
              },
            },
            required: ['text'],
          },
        },
        {
          name: 'apply_style_preset',
          description: 'Apply a pre-configured industry/style preset (McKinsey, Legal, Medical, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              preset: {
                type: 'string',
                enum: ['mckinsey', 'legal-compliance', 'medical-clinical', 'technical-engineering', 'executive-summary'],
                description: 'Pre-configured style preset',
              },
            },
            required: ['text', 'preset'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Security: Check rate limit
        await this.checkRateLimit();

        // Security: Validate and sanitize input
        const validatedArgs = await this.validateInput(name, args);

        switch (name) {
          case 'humanize_text':
            return await this.humanizeText(validatedArgs);
          
          case 'detect_ai_patterns':
            return await this.detectAIPatterns(validatedArgs);
          
          case 'humanize_numbers':
            return await this.humanizeNumbersOnly(validatedArgs);
          
          case 'apply_style_preset':
            return await this.applyStylePreset(validatedArgs);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        // Security: Sanitize error message
        const userMessage = this.sanitizeError(error);
        
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${userMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Main humanization method (with timeout protection)
   */
  private async humanizeText(args: any) {
    // Security: Add 30-second timeout
    return await this.withTimeout(this.humanizeTextInternal(args), 30000);
  }

  /**
   * Internal humanization implementation
   */
  private async humanizeTextInternal(args: any) {
    const text = args.text;
    const style = args.style || 'professional';
    
    // Get options from style preset or custom
    const options = this.getOptionsFromStyle(style, args);
    
    // Track analysis if requested
    const analysis = options.includeAnalysis ? {
      aiPatternsRemoved: 0,
      numbersHumanized: 0,
      structuralChanges: 0,
      confidenceScore: 0,
      readabilityBefore: this.calculateReadability(text),
      readabilityAfter: 0,
      changesSummary: [] as string[],
    } : undefined;

    let humanized = text;

    // Step 1: Remove AI patterns
    if (options.removeAIPatterns) {
      try {
        const result = this.aiDetector.removePatterns(humanized, options);
        humanized = result.text;
        if (analysis) {
          analysis.aiPatternsRemoved = result.patternsRemoved;
          analysis.changesSummary.push(`Removed ${result.patternsRemoved} AI patterns`);
        }
      } catch (error) {
        console.error('AI pattern removal failed:', error);
        // Continue with next step
      }
    }

    // Step 2: Humanize numbers
    if (options.humanizeNumbers) {
      try {
        const result = this.numberHumanizer.humanize(humanized, options);
        humanized = result.text;
        if (analysis) {
          analysis.numbersHumanized = result.numbersChanged;
          analysis.changesSummary.push(`Humanized ${result.numbersChanged} numbers`);
        }
      } catch (error) {
        console.error('Number humanization failed:', error);
        // Continue with next step
      }
    }

    // Step 3: Naturalize transitions
    if (options.naturalizeTransitions) {
      try {
        humanized = this.transitionNaturalizer.naturalize(humanized, options);
        if (analysis) {
          analysis.changesSummary.push('Naturalized transitions');
        }
      } catch (error) {
        console.error('Transition naturalization failed:', error);
      }
    }

    // Step 4: Vary structure
    if (options.varyStructure) {
      try {
        const result = this.structureVariator.vary(humanized, options);
        humanized = result.text;
        if (analysis) {
          analysis.structuralChanges = result.changesCount;
          analysis.changesSummary.push(`Made ${result.changesCount} structural changes`);
        }
      } catch (error) {
        console.error('Structure variation failed:', error);
      }
    }

    // Step 5: Inject personality
    if (options.injectPersonality) {
      try {
        humanized = this.personalityInjector.inject(humanized, options);
        if (analysis) {
          analysis.changesSummary.push(`Injected ${options.persona} personality`);
        }
      } catch (error) {
        console.error('Personality injection failed:', error);
      }
    }

    // Step 6: Add punctuation flair
    if (options.addPunctuationFlair) {
      try {
        humanized = this.punctuationPersonalizer.personalize(humanized, options);
        if (analysis) {
          analysis.changesSummary.push('Added punctuation personality');
        }
      } catch (error) {
        console.error('Punctuation personalization failed:', error);
      }
    }

    // Step 7: Add uncertainty/hedging
    if (options.addUncertainty) {
      try {
        humanized = this.uncertaintyInjector.inject(humanized, options);
        if (analysis) {
          analysis.changesSummary.push('Added realistic hedging');
        }
      } catch (error) {
        console.error('Uncertainty injection failed:', error);
      }
    }

    // Step 8: Allow repetition
    if (options.allowRepetition) {
      humanized = this.repetitionNormalizer.normalize(humanized);
      if (analysis) {
        analysis.changesSummary.push('Normalized word repetition');
      }
    }

    // Step 9: Mess up examples
    if (options.messenExamples) {
      humanized = this.exampleGenerator.makeMessy(humanized, options);
      if (analysis) {
        analysis.changesSummary.push('Made examples more realistic');
      }
    }

    // Step 10: Add deliberate imperfections (last step)
    if (options.addImperfections) {
      humanized = this.imperfectionInjector.inject(humanized, options);
      if (analysis) {
        analysis.changesSummary.push('Added human imperfections');
      }
    }

    // Calculate final metrics
    if (analysis) {
      analysis.readabilityAfter = this.calculateReadability(humanized);
      analysis.confidenceScore = this.calculateHumanScore(humanized);
    }

    const result: HumanizeResult = {
      humanizedText: humanized,
      analysis,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * Detect AI patterns without modifying
   */
  private async detectAIPatterns(args: any) {
    const text = args.text;
    const patterns = this.aiDetector.detect(text);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            aiScore: patterns.aiScore,
            patternsFound: patterns.patterns,
            recommendations: patterns.recommendations,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Humanize numbers only
   */
  private async humanizeNumbersOnly(args: any) {
    const text = args.text;
    const documentType = args.documentType || 'narrative';
    
    const options = this.getDefaultOptions();
    options.documentType = documentType;
    
    const result = this.numberHumanizer.humanize(text, options);

    return {
      content: [
        {
          type: 'text',
          text: result.text,
        },
      ],
    };
  }

  /**
   * Apply pre-configured style presets
   */
  private async applyStylePreset(args: any) {
    const text = args.text;
    const preset = args.preset;

    const options = this.getPresetOptions(preset);
    return this.humanizeText({ text, ...options });
  }

  /**
   * Get options from style name
   */
  private getOptionsFromStyle(style: string, customArgs: any): HumanizeOptions {
    const presets = {
      mckinsey: this.getMcKinseyPreset(),
      casual: this.getCasualPreset(),
      technical: this.getTechnicalPreset(),
      formal: this.getFormalPreset(),
    };

    const baseOptions = presets[style] || presets.casual;
    
    // Override with custom args
    return {
      ...baseOptions,
      ...customArgs,
    };
  }

  /**
   * Style presets
   */
  private getMcKinseyPreset(): HumanizeOptions {
    return {
      documentType: 'executive',
      industry: 'consulting',
      persona: 'consultant',
      audience: 'c-suite',
      formalityLevel: 'professional',
      confidenceLevel: 0.9,
      removeAIPatterns: true,
      humanizeNumbers: true,
      varyStructure: true,
      injectPersonality: true,
      addPunctuationFlair: true,
      addUncertainty: false, // McKinsey is confident
      addImperfections: false, // McKinsey is polished
      naturalizeTransitions: true,
      allowRepetition: true,
      messenExamples: true,
      preserveTechnicalTerms: true,
      preserveNumbers: [],
      preserveFormatting: true,
      targetReadabilityGrade: 12,
      includeAnalysis: false,
    };
  }

  private getCasualPreset(): HumanizeOptions {
    return {
      documentType: 'casual',
      industry: 'general',
      persona: 'analyst',
      audience: 'general',
      formalityLevel: 'casual',
      confidenceLevel: 0.7,
      removeAIPatterns: true,
      humanizeNumbers: true,
      varyStructure: true,
      injectPersonality: true,
      addPunctuationFlair: true,
      addUncertainty: true,
      addImperfections: true,
      naturalizeTransitions: true,
      allowRepetition: true,
      messenExamples: true,
      preserveTechnicalTerms: false,
      preserveNumbers: [],
      preserveFormatting: false,
      targetReadabilityGrade: 8,
      includeAnalysis: false,
    };
  }

  private getTechnicalPreset(): HumanizeOptions {
    return {
      documentType: 'technical',
      industry: 'technology',
      persona: 'engineer',
      audience: 'technical',
      formalityLevel: 'professional',
      confidenceLevel: 0.8,
      removeAIPatterns: true,
      humanizeNumbers: false, // Keep technical precision
      varyStructure: true,
      injectPersonality: true,
      addPunctuationFlair: false,
      addUncertainty: true,
      addImperfections: false,
      naturalizeTransitions: true,
      allowRepetition: true,
      messenExamples: true,
      preserveTechnicalTerms: true,
      preserveNumbers: [],
      preserveFormatting: true,
      targetReadabilityGrade: 14,
      includeAnalysis: false,
    };
  }

  private getFormalPreset(): HumanizeOptions {
    return {
      documentType: 'legal',
      industry: 'general',
      persona: 'lawyer',
      audience: 'general',
      formalityLevel: 'very-formal',
      confidenceLevel: 1,
      removeAIPatterns: true,
      humanizeNumbers: false, // Keep legal precision
      varyStructure: false, // Keep structure formal
      injectPersonality: false,
      addPunctuationFlair: false,
      addUncertainty: false,
      addImperfections: false,
      naturalizeTransitions: true,
      allowRepetition: true,
      messenExamples: false,
      preserveTechnicalTerms: true,
      preserveNumbers: [],
      preserveFormatting: true,
      targetReadabilityGrade: 16,
      includeAnalysis: false,
    };
  }

  private getPresetOptions(preset: string): Partial<HumanizeOptions> {
    const presets: Record<string, Partial<HumanizeOptions>> = {
      'mckinsey': this.getMcKinseyPreset(),
      'legal-compliance': this.getFormalPreset(),
      'medical-clinical': {
        ...this.getFormalPreset(),
        industry: 'healthcare',
        persona: 'doctor',
      },
      'technical-engineering': this.getTechnicalPreset(),
      'executive-summary': this.getMcKinseyPreset(),
    };

    return presets[preset] || {};
  }

  private getDefaultOptions(): HumanizeOptions {
    return this.getCasualPreset();
  }

  /**
   * Calculate readability score (Flesch-Kincaid grade level)
   */
  private calculateReadability(text: string): number {
    // Simplified Flesch-Kincaid calculation
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    const syllables = this.countSyllables(text);

    const gradeLevel = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
    return Math.max(0, Math.round(gradeLevel * 10) / 10);
  }

  /**
   * Count syllables in text
   */
  private countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let count = 0;

    words.forEach(word => {
      word = word.replace(/[^a-z]/g, '');
      if (word.length <= 3) {
        count += 1;
      } else {
        const matches = word.match(/[aeiouy]+/g);
        count += matches ? matches.length : 1;
      }
    });

    return count;
  }

  /**
   * Calculate how human the text sounds (0-1)
   */
  private calculateHumanScore(text: string): number {
    let score = 1.0;

    // Penalize AI patterns
    const aiPatterns = this.aiDetector.detect(text);
    score -= aiPatterns.aiScore * 0.5;

    // Penalize overly precise numbers
    const precisNumbers = (text.match(/\d+\.\d{2,}/g) || []).length;
    score -= precisNumbers * 0.05;

    // Reward contractions
    const contractions = (text.match(/n't|'s|'re|'ve|'ll|'d/g) || []).length;
    score += Math.min(contractions * 0.02, 0.1);

    // Reward varied sentence lengths
    const sentences = text.split(/[.!?]+/);
    const lengths = sentences.map(s => s.trim().split(/\s+/).length);
    const variance = this.calculateVariance(lengths);
    score += Math.min(variance / 100, 0.1);

    return Math.max(0, Math.min(1, score));
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squareDiffs = numbers.map(value => Math.pow(value - mean, 2));
    return squareDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Humanizer MCP server running on stdio');
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new HumanizerMCP();
  server.start().catch(console.error);
}
