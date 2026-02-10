declare class KnowledgeBaseServer {
    private server;
    private logger;
    private modelManager;
    constructor();
    private setupHandlers;
    private handleToolExecution;
    start(): Promise<void>;
}
export default KnowledgeBaseServer;
//# sourceMappingURL=index.d.ts.map