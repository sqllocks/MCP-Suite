import { OllamaRequest } from './types';
import { Logger } from './logger';
export declare class OllamaClient {
    private client;
    private baseUrl;
    private logger;
    constructor(baseUrl: string, logger: Logger);
    generate(request: OllamaRequest): Promise<string>;
    checkHealth(): Promise<boolean>;
    listModels(): Promise<string[]>;
}
//# sourceMappingURL=ollama-client.d.ts.map