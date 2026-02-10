import { ModelManagerConfig } from './types';
import { Logger } from './logger';
export declare class ModelManager {
    private axiosInstance;
    private config;
    private logger;
    private currentModel;
    constructor(config: ModelManagerConfig, logger: Logger, defaultModel: string);
    generate(prompt: string, options?: any): Promise<string>;
    checkHealth(): Promise<boolean>;
    listModels(): Promise<string[]>;
    isModelAvailable(modelName: string): Promise<boolean>;
    getCurrentModel(): string;
    setModel(modelName: string): void;
    warmup(): Promise<void>;
    testConnection(): Promise<{
        available: boolean;
        responseTime?: number;
    }>;
}
export declare function createModelManager(ollamaUrl: string, logger: Logger, defaultModel: string): ModelManager;
export default createModelManager;
//# sourceMappingURL=model-manager.d.ts.map