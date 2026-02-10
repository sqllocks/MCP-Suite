declare class SQLExplorerServer {
    private server;
    private logger;
    private modelManager;
    constructor();
    private setupHandlers;
    private handleGenerateSQL;
    private handleQuerySQL;
    private handleExplainSQL;
    private buildQueryPrompt;
    start(): Promise<void>;
}
export default SQLExplorerServer;
//# sourceMappingURL=index.d.ts.map