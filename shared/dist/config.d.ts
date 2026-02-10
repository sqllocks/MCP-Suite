import { Profile, ServerConfig } from './types';
export declare class ConfigLoader {
    private static instance;
    private profilesConfig;
    private currentProfile;
    private constructor();
    static getInstance(): ConfigLoader;
    private loadProfiles;
    private replaceEnvVars;
    getProfile(profileName?: string): Profile;
    getCurrentProfileName(): string;
    getServerConfig(serverName: string, port: number): ServerConfig;
    getModelForServer(serverName: string): string;
    getOllamaUrl(): string;
    getJWTSecret(): string;
    getBasePort(): number;
    getWorkspace(): string;
    isCriticalMode(): boolean;
    getCriticalModeStrategy(): 'local-upgrade' | 'cloud-fallback' | 'cloud-only';
    getAllProfiles(): string[];
    getPortForServer(serverName: string, serverIndex: number): number;
}
declare const _default: ConfigLoader;
export default _default;
//# sourceMappingURL=config.d.ts.map