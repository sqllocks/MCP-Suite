import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Profile, ProfilesConfig, ServerConfig, ModelConfig } from './types';

// Load environment variables
dotenv.config();

export class ConfigLoader {
  private static instance: ConfigLoader;
  private profilesConfig!: ProfilesConfig;
  private currentProfile: string;

  private constructor() {
    this.currentProfile = process.env.MCP_PROFILE || 'Personal';
    this.loadProfiles();
  }

  public static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  private loadProfiles(): void {
    const profilesPath = path.join(process.cwd(), 'profiles.json');
    
    if (!fs.existsSync(profilesPath)) {
      throw new Error(`profiles.json not found at ${profilesPath}`);
    }

    const profilesData = fs.readFileSync(profilesPath, 'utf-8');
    this.profilesConfig = JSON.parse(profilesData);
    
    // Replace environment variable placeholders
    this.replaceEnvVars(this.profilesConfig);
  }

  private replaceEnvVars(obj: any): void {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        const match = obj[key].match(/\$\{(\w+)\}/);
        if (match) {
          const envVar = match[1];
          obj[key] = process.env[envVar] || obj[key];
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.replaceEnvVars(obj[key]);
      }
    }
  }

  public getProfile(profileName?: string): Profile {
    const name = profileName || this.currentProfile;
    const profile = this.profilesConfig.profiles[name];
    
    if (!profile) {
      throw new Error(`Profile "${name}" not found in profiles.json`);
    }
    
    return profile;
  }

  public getCurrentProfileName(): string {
    return this.currentProfile;
  }

  public getServerConfig(serverName: string, port: number): ServerConfig {
    const profile = this.getProfile();
    const platform = process.platform as NodeJS.Platform;
    const platformConfig = profile.platforms[platform as keyof typeof profile.platforms];
    
    if (!platformConfig) {
      throw new Error(`Platform ${platform} not configured for profile ${this.currentProfile}`);
    }

    const modelConfig = profile.models[platform as keyof typeof profile.models];
    if (!modelConfig) {
      throw new Error(`Models not configured for platform ${platform} in profile ${this.currentProfile}`);
    }

    // Get model assignment for this server
    const assignment = this.profilesConfig.serverAssignments[serverName];
    if (!assignment) {
      throw new Error(`No model assignment found for server ${serverName}`);
    }

    // Determine which model to use
    let modelKey = assignment.model;
    let model = modelConfig[modelKey];

    // If model doesn't exist (e.g., 'security' on Mac), use fallback
    if (!model && assignment.fallback) {
      modelKey = assignment.fallback;
      model = modelConfig[modelKey];
    }

    // If still no model, use primary
    if (!model) {
      model = modelConfig.primary;
    }

    return {
      profile: this.currentProfile,
      port,
      model,
      workspace: platformConfig.workspace,
      platform
    };
  }

  public getModelForServer(serverName: string): string {
    const platform = process.platform as NodeJS.Platform;
    const profile = this.getProfile();
    const modelConfig = profile.models[platform as keyof typeof profile.models];
    
    if (!modelConfig) {
      throw new Error(`Models not configured for platform ${platform}`);
    }

    const assignment = this.profilesConfig.serverAssignments[serverName];
    if (!assignment) {
      return modelConfig.primary; // Default to primary
    }

    let model = modelConfig[assignment.model];
    
    // Use fallback if primary model doesn't exist
    if (!model && assignment.fallback) {
      model = modelConfig[assignment.fallback];
    }
    
    // Final fallback to primary
    return model || modelConfig.primary;
  }

  public getOllamaUrl(): string {
    return process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }

  public getJWTSecret(): string {
    const profile = this.getProfile();
    return profile.security.jwtSecret;
  }

  public getBasePort(): number {
    const profile = this.getProfile();
    return profile.networking.basePort;
  }

  public getWorkspace(): string {
    const profile = this.getProfile();
    const platform = process.platform as NodeJS.Platform;
    const platformConfig = profile.platforms[platform as keyof typeof profile.platforms];
    
    if (!platformConfig) {
      throw new Error(`Platform ${platform} not configured`);
    }
    
    return platformConfig.workspace;
  }

  public isCriticalMode(): boolean {
    return process.env.CRITICAL_MODE === 'true';
  }

  public getCriticalModeStrategy(): 'local-upgrade' | 'cloud-fallback' | 'cloud-only' {
    const strategy = process.env.CRITICAL_MODE_STRATEGY || 'local-upgrade';
    return strategy as any;
  }

  public getAllProfiles(): string[] {
    return Object.keys(this.profilesConfig.profiles);
  }

  public getPortForServer(serverName: string, serverIndex: number): number {
    const basePort = this.getBasePort();
    return basePort + serverIndex + 1; // +1 because orchestrator is at basePort
  }
}

export default ConfigLoader.getInstance();
