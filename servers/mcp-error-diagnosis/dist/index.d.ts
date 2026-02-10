declare class McpErrorDiagnosisServer {
    private server;
    private logger;
    private modelManager;
    constructor();
    private setupHandlers;
    private handleDiagnoseError;
    start(): Promise<void>;
}
export default McpErrorDiagnosisServer;
//# sourceMappingURL=index.d.ts.map