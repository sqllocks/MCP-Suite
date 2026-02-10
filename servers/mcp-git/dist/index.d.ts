declare class GitServer {
    private server;
    private logger;
    private modelManager;
    constructor();
    private setupHandlers;
    private handleToolExecution;
    start(): Promise<void>;
}
export default GitServer;
//# sourceMappingURL=index.d.ts.map