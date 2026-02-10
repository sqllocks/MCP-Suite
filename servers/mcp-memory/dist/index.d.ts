declare class MemoryServer {
    private server;
    private logger;
    private modelManager;
    constructor();
    private setupHandlers;
    private handleToolExecution;
    start(): Promise<void>;
}
export default MemoryServer;
//# sourceMappingURL=index.d.ts.map