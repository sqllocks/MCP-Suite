declare class MCPOrchestrator {
    private server;
    private logger;
    private modelManager;
    private startTime;
    private requestCount;
    private registeredServers;
    constructor();
    private setupHandlers;
    private handleGetStatus;
    private handleRegisterServer;
    private handleListServers;
    private handleGetServerInfo;
    start(): Promise<void>;
}
export default MCPOrchestrator;
//# sourceMappingURL=index.d.ts.map