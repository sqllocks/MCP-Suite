import axios, { AxiosInstance } from 'axios';
import { OllamaRequest, OllamaResponse, ModelManagerConfig } from './types';
import { Logger } from './logger';

export class ModelManager {
  private axiosInstance: AxiosInstance;
  private config: ModelManagerConfig;
  private logger: Logger;
  private currentModel: string;

  constructor(config: ModelManagerConfig, logger: Logger, defaultModel: string) {
    this.config = config;
    this.logger = logger;
    this.currentModel = defaultModel;

    this.axiosInstance = axios.create({
      baseURL: config.ollamaBaseUrl,
      timeout: config.timeout
    });
  }

  public async generate(prompt: string, options?: any): Promise<string> {
    const request: OllamaRequest = {
      model: this.currentModel,
      prompt,
      stream: false,
      options: {
        temperature: options?.temperature || 0.7,
        top_p: options?.top_p || 0.9,
        ...options
      }
    };

    const startTime = Date.now();
    
    try {
      this.logger.debug(`Sending request to Ollama`, {
        model: this.currentModel,
        promptLength: prompt.length
      });

      const response = await this.axiosInstance.post<OllamaResponse>(
        '/api/generate',
        request
      );

      const duration = Date.now() - startTime;
      
      this.logger.info(`Model response received`, {
        model: this.currentModel,
        duration: `${duration}ms`,
        responseLength: response.data.response.length
      });

      return response.data.response;
    } catch (error: any) {
      this.logger.error(`Ollama request failed`, error);
      throw new Error(`Model generation failed: ${error.message}`);
    }
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/api/tags');
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Ollama health check failed`, error);
      return false;
    }
  }

  public async listModels(): Promise<string[]> {
    try {
      const response = await this.axiosInstance.get('/api/tags');
      return response.data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      this.logger.error(`Failed to list models`, error);
      return [];
    }
  }

  public async isModelAvailable(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.includes(modelName);
  }

  public getCurrentModel(): string {
    return this.currentModel;
  }

  public setModel(modelName: string): void {
    this.logger.info(`Switching model`, {
      from: this.currentModel,
      to: modelName
    });
    this.currentModel = modelName;
  }

  public async warmup(): Promise<void> {
    try {
      this.logger.info(`Warming up model`, { model: this.currentModel });
      await this.generate('test', { num_predict: 1 });
      this.logger.info(`Model warmed up successfully`);
    } catch (error) {
      this.logger.warn(`Model warmup failed`, error);
    }
  }

  public async testConnection(): Promise<{ available: boolean; responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      const available = await this.isModelAvailable(this.currentModel);
      const responseTime = Date.now() - startTime;
      
      return { available, responseTime };
    } catch (error) {
      return { available: false };
    }
  }
}

export function createModelManager(
  ollamaUrl: string,
  logger: Logger,
  defaultModel: string
): ModelManager {
  const config: ModelManagerConfig = {
    ollamaBaseUrl: ollamaUrl,
    timeout: parseInt(process.env.MODEL_TIMEOUT_MS || '30000', 10),
    maxRetries: 3
  };

  return new ModelManager(config, logger, defaultModel);
}

export default createModelManager;
