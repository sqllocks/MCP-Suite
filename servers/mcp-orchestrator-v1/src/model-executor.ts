import Anthropic from '@anthropic-ai/sdk';
import type { Task, TaskResult, ModelConfig } from './config.js';
import type { Logger } from 'pino';

/**
 * Executes tasks using various AI models
 */
export class ModelExecutor {
  private anthropicClient: Anthropic | null = null;
  private logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
  }
  
  /**
   * Initialize Anthropic client
   */
  initializeAnthropic(apiKey: string) {
    this.anthropicClient = new Anthropic({ apiKey });
  }
  
  /**
   * Execute a task with specified model
   */
  async executeTask(
    task: Task,
    model: ModelConfig,
    maxRetries: number = 3
  ): Promise<TaskResult> {
    const startTime = Date.now();
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.info({
          taskId: task.id,
          model: model.name,
          attempt,
        }, 'Executing task');
        
        const result = await this.callModel(task, model);
        
        const durationMs = Date.now() - startTime;
        
        return {
          taskId: task.id,
          model: model.name,
          success: true,
          output: result.output,
          tokensUsed: result.tokensUsed,
          cost: this.calculateCost(result.tokensUsed, model),
          durationMs,
        };
        
      } catch (error) {
        this.logger.error({
          taskId: task.id,
          model: model.name,
          attempt,
          error,
        }, 'Task execution failed');
        
        if (attempt === maxRetries) {
          const durationMs = Date.now() - startTime;
          return {
            taskId: task.id,
            model: model.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            tokensUsed: { input: 0, output: 0 },
            cost: 0,
            durationMs,
          };
        }
        
        // Wait before retry (exponential backoff)
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }
    
    // Should never reach here
    throw new Error('Max retries exceeded');
  }
  
  /**
   * Call appropriate model provider
   */
  private async callModel(task: Task, model: ModelConfig): Promise<{
    output: any;
    tokensUsed: { input: number; output: number };
  }> {
    switch (model.provider) {
      case 'anthropic':
        return await this.callAnthropic(task, model);
      
      case 'openai':
        return await this.callOpenAI(task, model);
      
      case 'ollama':
        return await this.callOllama(task, model);
      
      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }
  }
  
  /**
   * Call Anthropic API
   */
  private async callAnthropic(task: Task, model: ModelConfig): Promise<{
    output: any;
    tokensUsed: { input: number; output: number };
  }> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }
    
    // Build messages
    const messages: Anthropic.MessageParam[] = [];
    
    // Add context if provided
    if (task.context) {
      messages.push({
        role: 'user',
        content: `Context: ${JSON.stringify(task.context, null, 2)}`,
      });
      messages.push({
        role: 'assistant',
        content: 'I understand the context. How can I help?',
      });
    }
    
    // Add main prompt
    messages.push({
      role: 'user',
      content: task.prompt,
    });
    
    // Call API
    const response = await this.anthropicClient.messages.create({
      model: model.model,
      max_tokens: 4096,
      messages,
    });
    
    // Extract text from response
    const output = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as Anthropic.TextBlock).text)
      .join('\n');
    
    return {
      output,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    };
  }
  
  /**
   * Call OpenAI API (placeholder)
   */
  private async callOpenAI(task: Task, model: ModelConfig): Promise<{
    output: any;
    tokensUsed: { input: number; output: number };
  }> {
    // TODO: Implement OpenAI integration
    throw new Error('OpenAI integration not yet implemented');
  }
  
  /**
   * Call Ollama API (placeholder)
   */
  private async callOllama(task: Task, model: ModelConfig): Promise<{
    output: any;
    tokensUsed: { input: number; output: number };
  }> {
    // TODO: Implement Ollama integration
    throw new Error('Ollama integration not yet implemented');
  }
  
  /**
   * Calculate cost based on token usage
   */
  private calculateCost(
    tokensUsed: { input: number; output: number },
    model: ModelConfig
  ): number {
    const inputCost = (tokensUsed.input / 1_000_000) * model.costPer1MInputTokens;
    const outputCost = (tokensUsed.output / 1_000_000) * model.costPer1MOutputTokens;
    return inputCost + outputCost;
  }
  
  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
