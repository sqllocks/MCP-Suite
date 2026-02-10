import axios, { AxiosInstance } from 'axios';
import { OllamaRequest, OllamaResponse } from './types';
import { Logger } from './logger';

export class OllamaClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private logger: Logger;

  constructor(baseUrl: string, logger: Logger) {
    this.baseUrl = baseUrl;
    this.logger = logger;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 300000, // 5 minutes
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async generate(request: OllamaRequest): Promise<string> {
    try {
      this.logger.debug('Ollama generate request', {
        model: request.model,
        promptLength: request.prompt.length
      });

      const response = await this.client.post<OllamaResponse>('/api/generate', {
        model: request.model,
        prompt: request.prompt,
        stream: false,
        options: request.options || {}
      });

      if (!response.data || !response.data.response) {
        throw new Error('Invalid response from Ollama');
      }

      this.logger.debug('Ollama generate response received', {
        model: request.model,
        responseLength: response.data.response.length
      });

      return response.data.response;
    } catch (error: any) {
      this.logger.error('Ollama generate error', {
        model: request.model,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Ollama generation failed: ${error.message}`);
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/tags', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/api/tags');
      if (response.data && response.data.models) {
        return response.data.models.map((m: any) => m.name);
      }
      return [];
    } catch (error: any) {
      this.logger.error('Failed to list models', {
        error: error.message
      });
      return [];
    }
  }
}
