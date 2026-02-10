declare class MLInferenceServer {
    private server;
    private logger;
    private modelManager;
    constructor();
    private setupHandlers;
    private handleToolExecution;
    start(): Promise<void>;
}
export default MLInferenceServer;
//# sourceMappingURL=index.d.ts.map