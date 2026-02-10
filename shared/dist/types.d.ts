/**
 * Shared TypeScript types for MCP-SUITE
 */
export interface Profile {
    platforms: {
        darwin?: PlatformConfig;
        win32?: PlatformConfig;
    };
    networking: {
        basePort: number;
        portRange: [number, number];
    };
    models: {
        darwin?: ModelConfig;
        win32?: ModelConfig;
    };
    security: {
        jwtSecret: string;
        tokenExpiry: string;
    };
}
export interface PlatformConfig {
    workspace: string;
    user: string;
}
export interface ModelConfig {
    fast: string;
    code_fast: string;
    primary: string;
    debugging: string;
    rag: string;
    security?: string;
    critical?: string;
}
export interface ServerAssignment {
    model: keyof ModelConfig;
    fallback?: keyof ModelConfig;
}
export interface ProfilesConfig {
    profiles: {
        [profileName: string]: Profile;
    };
    serverAssignments: {
        [serverName: string]: ServerAssignment;
    };
}
export interface OllamaRequest {
    model: string;
    prompt: string;
    stream?: boolean;
    options?: {
        temperature?: number;
        top_p?: number;
        top_k?: number;
        num_predict?: number;
    };
}
export interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
}
export interface ModelManagerConfig {
    ollamaBaseUrl: string;
    timeout: number;
    maxRetries: number;
}
export interface LoggerConfig {
    level: string;
    logToFile: boolean;
    logDir: string;
    serviceName: string;
}
export interface AuthConfig {
    enabled: boolean;
    jwtSecret: string;
    tokenExpiry: string;
}
export interface ServerConfig {
    profile: string;
    port: number;
    model: string;
    workspace: string;
    platform: NodeJS.Platform;
}
export interface CriticalModeConfig {
    enabled: boolean;
    strategy: 'local-upgrade' | 'cloud-fallback' | 'cloud-only';
    reason?: string;
    timestamp?: Date;
}
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    memory: {
        used: number;
        total: number;
    };
    model: {
        name: string;
        available: boolean;
        responseTime?: number;
    };
    lastRequest?: Date;
    requestCount: number;
}
export interface ErrorResponse {
    error: string;
    code: string;
    details?: any;
    timestamp: Date;
}
export interface SuccessResponse<T = any> {
    success: true;
    data: T;
    timestamp: Date;
}
export type APIResponse<T = any> = SuccessResponse<T> | ErrorResponse;
//# sourceMappingURL=types.d.ts.map