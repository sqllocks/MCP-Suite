declare class VSCodeWorkspaceServer {
    private server;
    private logger;
    private modelManager;
    constructor();
    private setupHandlers;
    private handleToolExecution;
    start(): Promise<void>;
}
export default VSCodeWorkspaceServer;
//# sourceMappingURL=index.d.ts.map