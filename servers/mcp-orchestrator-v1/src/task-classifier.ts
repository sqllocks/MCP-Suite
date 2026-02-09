import type { Task, TaskComplexity, ModelConfig, ModelCapability } from './config.js';
import { COMPLEXITY_INDICATORS } from './config.js';

/**
 * Classifies tasks and routes them to appropriate models
 */
export class TaskClassifier {
  private models: ModelConfig[];
  
  constructor(models: ModelConfig[]) {
    this.models = models.filter(m => m.enabled);
  }
  
  /**
   * Classify task complexity based on description and prompt
   */
  classifyComplexity(task: Task): TaskComplexity {
    // If complexity is already specified, use it
    if (task.complexity) {
      return task.complexity;
    }
    
    const text = `${task.description} ${task.prompt}`.toLowerCase();
    
    // Count indicator matches
    const highScore = this.countMatches(text, COMPLEXITY_INDICATORS.high);
    const mediumScore = this.countMatches(text, COMPLEXITY_INDICATORS.medium);
    const lowScore = this.countMatches(text, COMPLEXITY_INDICATORS.low);
    
    // Determine complexity
    if (highScore > mediumScore && highScore > lowScore) {
      return 'high';
    }
    if (mediumScore > lowScore) {
      return 'medium';
    }
    return 'low';
  }
  
  /**
   * Select optimal model for task
   */
  selectModel(task: Task): ModelConfig {
    // If preferred model specified, use it if available
    if (task.preferredModel) {
      const preferred = this.models.find(m => m.name === task.preferredModel);
      if (preferred) {
        return preferred;
      }
    }
    
    // Classify complexity
    const complexity = this.classifyComplexity(task);
    
    // Select based on complexity
    switch (complexity) {
      case 'high':
        return this.selectByCapability(['strategy', 'complex-analysis', 'synthesis']);
      case 'medium':
        return this.selectByCapability(['coding', 'documentation', 'analysis']);
      case 'low':
        return this.selectByCapability(['formatting', 'simple-queries', 'data-extraction']);
    }
  }
  
  /**
   * Estimate cost for task execution
   */
  estimateCost(task: Task, model: ModelConfig): number {
    // Rough estimation based on prompt length
    const promptLength = task.prompt.length;
    const estimatedInputTokens = promptLength / 4; // ~4 chars per token
    const estimatedOutputTokens = estimatedInputTokens * 0.5; // Assume 50% output
    
    const inputCost = (estimatedInputTokens / 1_000_000) * model.costPer1MInputTokens;
    const outputCost = (estimatedOutputTokens / 1_000_000) * model.costPer1MOutputTokens;
    
    return inputCost + outputCost;
  }
  
  /**
   * Get fallback model (escalate to more capable)
   */
  getFallbackModel(currentModel: ModelConfig): ModelConfig | null {
    // Escalation path: haiku -> sonnet -> opus
    if (currentModel.name === 'haiku') {
      return this.models.find(m => m.name === 'sonnet') || null;
    }
    if (currentModel.name === 'sonnet') {
      return this.models.find(m => m.name === 'opus') || null;
    }
    return null; // Already at top tier
  }
  
  /**
   * Analyze dependencies and determine execution strategy
   */
  analyzeExecutionStrategy(tasks: Task[]): 'sequential' | 'parallel' | 'hybrid' {
    // If no tasks, sequential
    if (tasks.length === 0) return 'sequential';
    
    // Check for dependencies
    const hasDependencies = tasks.some(t => t.dependsOn && t.dependsOn.length > 0);
    
    // If no dependencies, can run parallel
    if (!hasDependencies && tasks.length > 1) {
      return 'parallel';
    }
    
    // If some have dependencies and some don't, hybrid
    const withoutDeps = tasks.filter(t => !t.dependsOn || t.dependsOn.length === 0);
    if (withoutDeps.length > 0 && withoutDeps.length < tasks.length) {
      return 'hybrid';
    }
    
    return 'sequential';
  }
  
  /**
   * Sort tasks by priority and dependencies
   */
  sortTasks(tasks: Task[]): Task[] {
    // Build dependency graph
    const sorted: Task[] = [];
    const remaining = [...tasks];
    const completed = new Set<string>();
    
    while (remaining.length > 0) {
      // Find tasks that can be executed (all dependencies met)
      const ready = remaining.filter(task => {
        if (!task.dependsOn || task.dependsOn.length === 0) {
          return true;
        }
        return task.dependsOn.every(dep => completed.has(dep));
      });
      
      if (ready.length === 0) {
        // Circular dependency or missing dependency
        throw new Error('Circular or missing dependencies detected');
      }
      
      // Sort ready tasks by priority (higher first)
      ready.sort((a, b) => b.priority - a.priority);
      
      // Add to sorted list and mark as completed
      for (const task of ready) {
        sorted.push(task);
        completed.add(task.id);
        const index = remaining.indexOf(task);
        remaining.splice(index, 1);
      }
    }
    
    return sorted;
  }
  
  // Private helpers
  
  private countMatches(text: string, indicators: string[]): number {
    return indicators.filter(indicator => text.includes(indicator)).length;
  }
  
  private selectByCapability(capabilities: ModelCapability[]): ModelConfig {
    // Find model with any of the required capabilities, prefer cheaper
    const candidates = this.models.filter(model =>
      capabilities.some(cap => model.capabilities.includes(cap))
    );
    
    if (candidates.length === 0) {
      // Fall back to most capable model
      return this.models[0]; // Assuming first is most capable
    }
    
    // Sort by cost (cheapest first) and return first match
    candidates.sort((a, b) => a.costPer1MInputTokens - b.costPer1MInputTokens);
    
    return candidates[0];
  }
}
