"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaClient = void 0;
const axios_1 = __importDefault(require("axios"));
class OllamaClient {
    constructor(baseUrl, logger) {
        this.baseUrl = baseUrl;
        this.logger = logger;
        this.client = axios_1.default.create({
            baseURL: baseUrl,
            timeout: 300000, // 5 minutes
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
    async generate(request) {
        try {
            this.logger.debug('Ollama generate request', {
                model: request.model,
                promptLength: request.prompt.length
            });
            const response = await this.client.post('/api/generate', {
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
        }
        catch (error) {
            this.logger.error('Ollama generate error', {
                model: request.model,
                error: error.message,
                stack: error.stack
            });
            throw new Error(`Ollama generation failed: ${error.message}`);
        }
    }
    async checkHealth() {
        try {
            const response = await this.client.get('/api/tags', { timeout: 5000 });
            return response.status === 200;
        }
        catch (error) {
            return false;
        }
    }
    async listModels() {
        try {
            const response = await this.client.get('/api/tags');
            if (response.data && response.data.models) {
                return response.data.models.map((m) => m.name);
            }
            return [];
        }
        catch (error) {
            this.logger.error('Failed to list models', {
                error: error.message
            });
            return [];
        }
    }
}
exports.OllamaClient = OllamaClient;
//# sourceMappingURL=ollama-client.js.map