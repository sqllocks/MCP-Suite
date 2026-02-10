"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelManager = void 0;
exports.createModelManager = createModelManager;
const axios_1 = __importDefault(require("axios"));
class ModelManager {
    constructor(config, logger, defaultModel) {
        this.config = config;
        this.logger = logger;
        this.currentModel = defaultModel;
        this.axiosInstance = axios_1.default.create({
            baseURL: config.ollamaBaseUrl,
            timeout: config.timeout
        });
    }
    async generate(prompt, options) {
        const request = {
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
            const response = await this.axiosInstance.post('/api/generate', request);
            const duration = Date.now() - startTime;
            this.logger.info(`Model response received`, {
                model: this.currentModel,
                duration: `${duration}ms`,
                responseLength: response.data.response.length
            });
            return response.data.response;
        }
        catch (error) {
            this.logger.error(`Ollama request failed`, error);
            throw new Error(`Model generation failed: ${error.message}`);
        }
    }
    async checkHealth() {
        try {
            const response = await this.axiosInstance.get('/api/tags');
            return response.status === 200;
        }
        catch (error) {
            this.logger.error(`Ollama health check failed`, error);
            return false;
        }
    }
    async listModels() {
        try {
            const response = await this.axiosInstance.get('/api/tags');
            return response.data.models?.map((m) => m.name) || [];
        }
        catch (error) {
            this.logger.error(`Failed to list models`, error);
            return [];
        }
    }
    async isModelAvailable(modelName) {
        const models = await this.listModels();
        return models.includes(modelName);
    }
    getCurrentModel() {
        return this.currentModel;
    }
    setModel(modelName) {
        this.logger.info(`Switching model`, {
            from: this.currentModel,
            to: modelName
        });
        this.currentModel = modelName;
    }
    async warmup() {
        try {
            this.logger.info(`Warming up model`, { model: this.currentModel });
            await this.generate('test', { num_predict: 1 });
            this.logger.info(`Model warmed up successfully`);
        }
        catch (error) {
            this.logger.warn(`Model warmup failed`, error);
        }
    }
    async testConnection() {
        const startTime = Date.now();
        try {
            const available = await this.isModelAvailable(this.currentModel);
            const responseTime = Date.now() - startTime;
            return { available, responseTime };
        }
        catch (error) {
            return { available: false };
        }
    }
}
exports.ModelManager = ModelManager;
function createModelManager(ollamaUrl, logger, defaultModel) {
    const config = {
        ollamaBaseUrl: ollamaUrl,
        timeout: parseInt(process.env.MODEL_TIMEOUT_MS || '30000', 10),
        maxRetries: 3
    };
    return new ModelManager(config, logger, defaultModel);
}
exports.default = createModelManager;
//# sourceMappingURL=model-manager.js.map