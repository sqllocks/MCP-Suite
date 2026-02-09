import { z } from 'zod';

/**
 * Model providers
 */
export type ModelProvider = 'anthropic' | 'openai' | 'ollama';

/**
 * Task complexity levels
 */
export type TaskComplexity = 'high' | 'medium' | 'low';

/**
 * Model capabilities
 */
export type ModelCapability = 
  | 'strategy'
  | 'complex-analysis'
  | 'synthesis'
  | 'coding'
  | 'documentation'
  | 'analysis'
  | 'formatting'
  | 'simple-queries'
  | 'data-extraction'
  | 'code-completion'
  | 'repetitive-tasks';

/**
 * Model configuration
 */
export interface ModelConfig {
  name: string;
  provider: ModelProvider;
  model: string;
  apiKey?: string;
  apiBase?: string;
  costPer1MInputTokens: number;
  costPer1MOutputTokens: number;
  capabilities: ModelCapability[];
  maxContext: number;
  enabled: boolean;
}

/**
 * Task definition
 */
export interface Task {
  id: string;
  description: string;
  prompt: string;
  complexity?: TaskComplexity;
  preferredModel?: string;
  requiredMCPs?: string[];
  dependsOn?: string[];
  priority: number;
  context?: Record<string, any>;
}

/**
 * Task result
 */
export interface TaskResult {
  taskId: string;
  model: string;
  success: boolean;
  output?: any;
  error?: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  cost: number;
  durationMs: number;
}

/**
 * Execution plan
 */
export interface ExecutionPlan {
  tasks: Task[];
  estimatedCost: number;
  estimatedDuration: number;
  strategy: 'sequential' | 'parallel' | 'hybrid';
}

/**
 * Orchestration result
 */
export interface OrchestrationResult {
  success: boolean;
  results: TaskResult[];
  totalCost: number;
  totalDuration: number;
  synthesis?: string;
}

/**
 * Configuration schema
 */
export const ConfigSchema = z.object({
  // Models
  models: z.array(z.object({
    name: z.string(),
    provider: z.enum(['anthropic', 'openai', 'ollama']),
    model: z.string(),
    apiKey: z.string().optional(),
    apiBase: z.string().optional(),
    costPer1MInputTokens: z.number(),
    costPer1MOutputTokens: z.number(),
    capabilities: z.array(z.string()),
    maxContext: z.number(),
    enabled: z.boolean().default(true),
  })),
  
  // Default preferences
  defaultOrchestratorModel: z.string().default('opus'),
  
  // Thresholds
  costThreshold: z.number().optional(),
  speedThreshold: z.number().optional(),
  
  // Strategy
  parallelExecutionEnabled: z.boolean().default(true),
  maxParallelTasks: z.number().default(5),
  
  // Quality control
  enableQualityReview: z.boolean().default(true),
  qualityReviewModel: z.string().default('opus'),
  qualityThreshold: z.number().default(8),
  
  // Retry
  maxRetries: z.number().default(3),
  enableModelEscalation: z.boolean().default(true),
  
  // Monitoring
  trackCosts: z.boolean().default(true),
  trackPerformance: z.boolean().default(true),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Default model configurations
 */
export const DEFAULT_MODELS: ModelConfig[] = [
  {
    name: 'opus',
    provider: 'anthropic',
    model: 'claude-opus-4-5-20251101',
    costPer1MInputTokens: 15,
    costPer1MOutputTokens: 75,
    capabilities: ['strategy', 'complex-analysis', 'synthesis', 'coding', 'documentation'],
    maxContext: 200000,
    enabled: true,
  },
  {
    name: 'sonnet',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    costPer1MInputTokens: 3,
    costPer1MOutputTokens: 15,
    capabilities: ['coding', 'documentation', 'analysis', 'data-extraction'],
    maxContext: 200000,
    enabled: true,
  },
  {
    name: 'haiku',
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    costPer1MInputTokens: 0.25,
    costPer1MOutputTokens: 1.25,
    capabilities: ['formatting', 'simple-queries', 'data-extraction', 'repetitive-tasks'],
    maxContext: 200000,
    enabled: true,
  },
];

/**
 * Task complexity indicators
 */
export const COMPLEXITY_INDICATORS = {
  high: [
    'analyze', 'recommend', 'strategy', 'decide', 'architect',
    'explain complex', 'synthesize', 'evaluate', 'assess',
    'client-facing', 'executive summary', 'strategic planning',
    'complex reasoning', 'multi-step analysis'
  ],
  medium: [
    'generate code', 'write documentation', 'create diagram',
    'transform data', 'compare', 'summarize', 'review',
    'technical writing', 'implement', 'design', 'optimize'
  ],
  low: [
    'format', 'extract', 'list', 'count', 'convert',
    'simple query', 'validate', 'basic formatting',
    'fetch data', 'search', 'filter', 'sort'
  ],
};
