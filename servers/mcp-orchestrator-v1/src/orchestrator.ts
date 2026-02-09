import type { 
  Config, 
  Task, 
  TaskResult, 
  ExecutionPlan, 
  OrchestrationResult,
  ModelConfig 
} from './config.js';
import { TaskClassifier } from './task-classifier.js';
import { ModelExecutor } from './model-executor.js';
import type { Logger } from 'pino';

/**
 * Main orchestrator that coordinates multi-model task execution
 */
export class Orchestrator {
  private config: Config;
  private classifier: TaskClassifier;
  private executor: ModelExecutor;
  private logger: Logger;
  
  constructor(config: Config, logger: Logger) {
    this.config = config;
    this.logger = logger;
    
    // Initialize components
    this.classifier = new TaskClassifier(config.models);
    this.executor = new ModelExecutor(logger);
    
    // Initialize API clients
    const anthropicModel = config.models.find(m => m.provider === 'anthropic');
    if (anthropicModel?.apiKey) {
      this.executor.initializeAnthropic(anthropicModel.apiKey);
    }
  }
  
  /**
   * Execute a complete orchestration
   */
  async orchestrate(
    userRequest: string,
    options?: {
      maxCost?: number;
      maxDuration?: number;
      preferredStrategy?: 'sequential' | 'parallel' | 'hybrid';
    }
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    
    this.logger.info({ userRequest }, 'Starting orchestration');
    
    try {
      // Step 1: Plan execution
      const plan = await this.planExecution(userRequest, options);
      
      this.logger.info({
        taskCount: plan.tasks.length,
        estimatedCost: plan.estimatedCost,
        strategy: plan.strategy,
      }, 'Execution plan created');
      
      // Step 2: Execute tasks
      const results = await this.executeTasks(plan);
      
      // Step 3: Synthesize results
      const synthesis = await this.synthesizeResults(userRequest, results);
      
      const totalDuration = Date.now() - startTime;
      const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
      
      this.logger.info({
        totalCost,
        totalDuration,
        successCount: results.filter(r => r.success).length,
      }, 'Orchestration complete');
      
      return {
        success: results.every(r => r.success),
        results,
        totalCost,
        totalDuration,
        synthesis,
      };
      
    } catch (error) {
      this.logger.error({ error }, 'Orchestration failed');
      throw error;
    }
  }
  
  /**
   * Plan task execution
   */
  private async planExecution(
    userRequest: string,
    options?: any
  ): Promise<ExecutionPlan> {
    // Use orchestrator model to decompose request into tasks
    const orchestratorModel = this.config.models.find(
      m => m.name === this.config.defaultOrchestratorModel
    );
    
    if (!orchestratorModel) {
      throw new Error('Orchestrator model not found');
    }
    
    // Create planning task
    const planningPrompt = `
You are an AI orchestrator. Break down this request into subtasks:

Request: ${userRequest}

Available models:
${this.config.models.map(m => `- ${m.name}: ${m.capabilities.join(', ')}`).join('\n')}

Respond with JSON array of tasks:
[
  {
    "id": "task-1",
    "description": "Brief description",
    "prompt": "Detailed prompt for model",
    "complexity": "high|medium|low",
    "preferredModel": "opus|sonnet|haiku",
    "dependsOn": ["task-id"],
    "priority": 1-10
  }
]

Rules:
- Break complex tasks into simpler subtasks
- Use cheaper models (haiku, sonnet) when possible
- Only use expensive models (opus) for complex analysis
- Set dependencies correctly
- Higher priority = execute first
`;
    
    const planningTask: Task = {
      id: 'planning',
      description: 'Plan task execution',
      prompt: planningPrompt,
      priority: 10,
    };
    
    const result = await this.executor.executeTask(
      planningTask,
      orchestratorModel,
      this.config.maxRetries
    );
    
    if (!result.success) {
      throw new Error('Failed to create execution plan');
    }
    
    // Parse tasks from response
    const tasks = this.parseTasksFromResponse(result.output);
    
    // Analyze execution strategy
    const strategy = options?.preferredStrategy || 
                    this.classifier.analyzeExecutionStrategy(tasks);
    
    // Estimate cost
    const estimatedCost = tasks.reduce((sum, task) => {
      const model = this.classifier.selectModel(task);
      return sum + this.classifier.estimateCost(task, model);
    }, 0);
    
    return {
      tasks,
      estimatedCost,
      estimatedDuration: this.estimateDuration(tasks, strategy),
      strategy,
    };
  }
  
  /**
   * Execute tasks according to plan
   */
  private async executeTasks(plan: ExecutionPlan): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    const taskResults = new Map<string, TaskResult>();
    
    // Sort tasks by dependencies
    const sortedTasks = this.classifier.sortTasks(plan.tasks);
    
    if (plan.strategy === 'parallel' && this.config.parallelExecutionEnabled) {
      // Execute all tasks in parallel
      const promises = sortedTasks.map(task => 
        this.executeTaskWithRetry(task, taskResults)
      );
      results.push(...await Promise.all(promises));
      
    } else if (plan.strategy === 'hybrid' && this.config.parallelExecutionEnabled) {
      // Execute in waves (tasks without dependencies first)
      const waves = this.groupTasksIntoWaves(sortedTasks);
      
      for (const wave of waves) {
        const promises = wave.map(task => 
          this.executeTaskWithRetry(task, taskResults)
        );
        const waveResults = await Promise.all(promises);
        results.push(...waveResults);
        
        // Update task results map
        for (const result of waveResults) {
          taskResults.set(result.taskId, result);
        }
      }
      
    } else {
      // Sequential execution
      for (const task of sortedTasks) {
        const result = await this.executeTaskWithRetry(task, taskResults);
        results.push(result);
        taskResults.set(result.taskId, result);
      }
    }
    
    return results;
  }
  
  /**
   * Execute task with retry and escalation
   */
  private async executeTaskWithRetry(
    task: Task,
    previousResults: Map<string, TaskResult>
  ): Promise<TaskResult> {
    // Add context from dependent tasks
    if (task.dependsOn && task.dependsOn.length > 0) {
      const dependencyOutputs = task.dependsOn
        .map(depId => previousResults.get(depId))
        .filter(r => r && r.success)
        .map(r => r!.output);
      
      task.context = {
        ...task.context,
        dependencyOutputs,
      };
    }
    
    // Select model
    let model = this.classifier.selectModel(task);
    
    // Execute with retries and escalation
    let result = await this.executor.executeTask(
      task,
      model,
      this.config.maxRetries
    );
    
    // If failed and escalation enabled, try better model
    if (!result.success && this.config.enableModelEscalation) {
      const fallbackModel = this.classifier.getFallbackModel(model);
      
      if (fallbackModel) {
        this.logger.info({
          taskId: task.id,
          fromModel: model.name,
          toModel: fallbackModel.name,
        }, 'Escalating to more capable model');
        
        result = await this.executor.executeTask(
          task,
          fallbackModel,
          this.config.maxRetries
        );
      }
    }
    
    return result;
  }
  
  /**
   * Synthesize final result from all task results
   */
  private async synthesizeResults(
    originalRequest: string,
    results: TaskResult[]
  ): Promise<string> {
    // Use orchestrator model to synthesize
    const orchestratorModel = this.config.models.find(
      m => m.name === this.config.defaultOrchestratorModel
    );
    
    if (!orchestratorModel) {
      return 'Results synthesized successfully';
    }
    
    const synthesisPrompt = `
Original request: ${originalRequest}

Task results:
${results.map(r => `
Task: ${r.taskId}
Model: ${r.model}
Success: ${r.success}
${r.success ? `Output: ${r.output}` : `Error: ${r.error}`}
`).join('\n---\n')}

Synthesize these results into a cohesive response to the original request.
Be concise and focus on the final answer.
`;
    
    const synthesisTask: Task = {
      id: 'synthesis',
      description: 'Synthesize results',
      prompt: synthesisPrompt,
      priority: 1,
    };
    
    const result = await this.executor.executeTask(
      synthesisTask,
      orchestratorModel,
      1
    );
    
    return result.success ? result.output : 'Synthesis failed';
  }
  
  /**
   * Group tasks into parallel execution waves
   */
  private groupTasksIntoWaves(tasks: Task[]): Task[][] {
    const waves: Task[][] = [];
    const remaining = [...tasks];
    const completed = new Set<string>();
    
    while (remaining.length > 0) {
      const wave = remaining.filter(task => {
        if (!task.dependsOn || task.dependsOn.length === 0) {
          return true;
        }
        return task.dependsOn.every(dep => completed.has(dep));
      });
      
      if (wave.length === 0) {
        throw new Error('Cannot create waves - circular dependencies');
      }
      
      waves.push(wave);
      
      for (const task of wave) {
        completed.add(task.id);
        const index = remaining.indexOf(task);
        remaining.splice(index, 1);
      }
    }
    
    return waves;
  }
  
  /**
   * Parse tasks from model response
   */
  private parseTasksFromResponse(response: string): Task[] {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) ||
                       response.match(/(\[[\s\S]*?\])/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const tasks = JSON.parse(jsonMatch[1]);
      
      if (!Array.isArray(tasks)) {
        throw new Error('Response is not an array');
      }
      
      return tasks;
      
    } catch (error) {
      this.logger.error({ error, response }, 'Failed to parse tasks');
      throw new Error('Failed to parse task plan');
    }
  }
  
  /**
   * Estimate total duration
   */
  private estimateDuration(tasks: Task[], strategy: string): number {
    if (strategy === 'parallel') {
      // Assume all tasks run in parallel
      return 30000; // 30 seconds estimate
    } else if (strategy === 'sequential') {
      // Sum of all tasks
      return tasks.length * 30000; // 30 seconds per task
    } else {
      // Hybrid: somewhere in between
      return tasks.length * 15000; // 15 seconds per task
    }
  }
}
