"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigLoader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config();
class ConfigLoader {
    constructor() {
        this.currentProfile = process.env.MCP_PROFILE || 'Personal';
        this.loadProfiles();
    }
    static getInstance() {
        if (!ConfigLoader.instance) {
            ConfigLoader.instance = new ConfigLoader();
        }
        return ConfigLoader.instance;
    }
    loadProfiles() {
        const profilesPath = path.join(process.cwd(), 'profiles.json');
        if (!fs.existsSync(profilesPath)) {
            throw new Error(`profiles.json not found at ${profilesPath}`);
        }
        const profilesData = fs.readFileSync(profilesPath, 'utf-8');
        this.profilesConfig = JSON.parse(profilesData);
        // Replace environment variable placeholders
        this.replaceEnvVars(this.profilesConfig);
    }
    replaceEnvVars(obj) {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                const match = obj[key].match(/\$\{(\w+)\}/);
                if (match) {
                    const envVar = match[1];
                    obj[key] = process.env[envVar] || obj[key];
                }
            }
            else if (typeof obj[key] === 'object' && obj[key] !== null) {
                this.replaceEnvVars(obj[key]);
            }
        }
    }
    getProfile(profileName) {
        const name = profileName || this.currentProfile;
        const profile = this.profilesConfig.profiles[name];
        if (!profile) {
            throw new Error(`Profile "${name}" not found in profiles.json`);
        }
        return profile;
    }
    getCurrentProfileName() {
        return this.currentProfile;
    }
    getServerConfig(serverName, port) {
        const profile = this.getProfile();
        const platform = process.platform;
        const platformConfig = profile.platforms[platform];
        if (!platformConfig) {
            throw new Error(`Platform ${platform} not configured for profile ${this.currentProfile}`);
        }
        const modelConfig = profile.models[platform];
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
    getModelForServer(serverName) {
        const platform = process.platform;
        const profile = this.getProfile();
        const modelConfig = profile.models[platform];
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
    getOllamaUrl() {
        return process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    }
    getJWTSecret() {
        const profile = this.getProfile();
        return profile.security.jwtSecret;
    }
    getBasePort() {
        const profile = this.getProfile();
        return profile.networking.basePort;
    }
    getWorkspace() {
        const profile = this.getProfile();
        const platform = process.platform;
        const platformConfig = profile.platforms[platform];
        if (!platformConfig) {
            throw new Error(`Platform ${platform} not configured`);
        }
        return platformConfig.workspace;
    }
    isCriticalMode() {
        return process.env.CRITICAL_MODE === 'true';
    }
    getCriticalModeStrategy() {
        const strategy = process.env.CRITICAL_MODE_STRATEGY || 'local-upgrade';
        return strategy;
    }
    getAllProfiles() {
        return Object.keys(this.profilesConfig.profiles);
    }
    getPortForServer(serverName, serverIndex) {
        const basePort = this.getBasePort();
        return basePort + serverIndex + 1; // +1 because orchestrator is at basePort
    }
}
exports.ConfigLoader = ConfigLoader;
exports.default = ConfigLoader.getInstance();
//# sourceMappingURL=config.js.map