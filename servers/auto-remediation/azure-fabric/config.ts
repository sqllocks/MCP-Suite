/**
 * Azure/Fabric Integration Configuration
 * Complete configuration for all Azure services
 */

export interface AzureFabricConfig {
  // Azure SQL Configuration
  azureSQL: {
    enabled: boolean;
    connectionString?: string;
    server?: string;
    database?: string;
    useConnectionString?: boolean;
    useManagedIdentity?: boolean;
    pollInterval: number; // minutes
  };

  // Synapse Configuration
  synapse: {
    enabled: boolean;
    workspaceName?: string;
    workspaceUrl?: string;
    dedicatedPoolName?: string;
    sparkPoolName?: string;
    pollInterval: number; // minutes
  };

  // Microsoft Fabric Configuration
  fabric: {
    enabled: boolean;
    workspaceId?: string;
    workspaceName?: string;
    lakehouseName?: string;
    warehouseName?: string;
    pollInterval: number; // minutes
    logPaths: string[];
  };

  // Azure Data Factory Configuration
  adf: {
    enabled: boolean;
    factoryName?: string;
    resourceGroup?: string;
    subscriptionId?: string;
    pollInterval: number; // minutes
  };

  // Azure DevOps Configuration
  devops: {
    enabled: boolean;
    organization?: string;
    project?: string;
    personalAccessToken?: string;
    pipelineId?: number;
    repositoryUrl?: string;
    branchName?: string;
    autoCreatePR: boolean;
  };

  // Azure Monitor / Log Analytics
  monitoring: {
    enabled: boolean;
    workspaceId?: string;
    workspaceKey?: string;
    logAnalyticsWorkspace?: string;
  };

  // Auto-Remediation Settings
  remediation: {
    autoFixEnabled: boolean;
    autoTestEnabled: boolean;
    autoDeployEnabled: boolean;
    requireApproval: boolean;
    maxRetries: number;
    dryRun: boolean;
  };

  // Notification Settings
  notifications: {
    enabled: boolean;
    teamsWebhook?: string;
    slackWebhook?: string;
    emailRecipients?: string[];
    notifyOnSuccess: boolean;
    notifyOnFailure: boolean;
  };

  // Healthcare/PHI Settings (if applicable)
  healthcare: {
    hipaaMode: boolean;
    phiLoggingEnabled: boolean;
    auditAllAccess: boolean;
    encryptionRequired: boolean;
  };
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: AzureFabricConfig = {
  azureSQL: {
    enabled: true,
    useManagedIdentity: false,
    pollInterval: 5
  },

  synapse: {
    enabled: true,
    pollInterval: 10
  },

  fabric: {
    enabled: true,
    pollInterval: 5,
    logPaths: [
      './logs/fabric-warehouse.log',
      './logs/fabric-lakehouse.log',
      './logs/fabric-notebook.log'
    ]
  },

  adf: {
    enabled: true,
    pollInterval: 15
  },

  devops: {
    enabled: false,
    autoCreatePR: true,
    branchName: 'main'
  },

  monitoring: {
    enabled: false
  },

  remediation: {
    autoFixEnabled: true,
    autoTestEnabled: true,
    autoDeployEnabled: false, // Safe default
    requireApproval: true,
    maxRetries: 3,
    dryRun: false
  },

  notifications: {
    enabled: false,
    notifyOnSuccess: false,
    notifyOnFailure: true
  },

  healthcare: {
    hipaaMode: false,
    phiLoggingEnabled: false,
    auditAllAccess: false,
    encryptionRequired: false
  }
};

/**
 * Load configuration from file
 */
export async function loadConfig(configPath: string = './azure-config.json'): Promise<AzureFabricConfig> {
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    
    // Merge with defaults
    return {
      ...DEFAULT_CONFIG,
      ...config,
      azureSQL: { ...DEFAULT_CONFIG.azureSQL, ...config.azureSQL },
      synapse: { ...DEFAULT_CONFIG.synapse, ...config.synapse },
      fabric: { ...DEFAULT_CONFIG.fabric, ...config.fabric },
      adf: { ...DEFAULT_CONFIG.adf, ...config.adf },
      devops: { ...DEFAULT_CONFIG.devops, ...config.devops },
      monitoring: { ...DEFAULT_CONFIG.monitoring, ...config.monitoring },
      remediation: { ...DEFAULT_CONFIG.remediation, ...config.remediation },
      notifications: { ...DEFAULT_CONFIG.notifications, ...config.notifications },
      healthcare: { ...DEFAULT_CONFIG.healthcare, ...config.healthcare }
    };
  } catch (error) {
    console.warn('Could not load config, using defaults:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Save configuration to file
 */
export async function saveConfig(config: AzureFabricConfig, configPath: string = './azure-config.json'): Promise<void> {
  const fs = await import('fs/promises');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`✅ Configuration saved to ${configPath}`);
}

/**
 * Validate configuration
 */
export function validateConfig(config: AzureFabricConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate Azure SQL
  if (config.azureSQL.enabled) {
    if (!config.azureSQL.connectionString && !config.azureSQL.server) {
      errors.push('Azure SQL: Either connectionString or server must be provided');
    }
  }

  // Validate Synapse
  if (config.synapse.enabled && !config.synapse.workspaceName) {
    errors.push('Synapse: workspaceName is required');
  }

  // Validate Fabric
  if (config.fabric.enabled && !config.fabric.workspaceName) {
    errors.push('Fabric: workspaceName is required');
  }

  // Validate ADF
  if (config.adf.enabled) {
    if (!config.adf.factoryName || !config.adf.resourceGroup) {
      errors.push('ADF: factoryName and resourceGroup are required');
    }
  }

  // Validate DevOps
  if (config.devops.enabled) {
    if (!config.devops.organization || !config.devops.project || !config.devops.personalAccessToken) {
      errors.push('DevOps: organization, project, and personalAccessToken are required');
    }
  }

  // Validate notifications
  if (config.notifications.enabled) {
    if (!config.notifications.teamsWebhook && !config.notifications.slackWebhook && !config.notifications.emailRecipients) {
      errors.push('Notifications: At least one notification method must be configured');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate sample configuration file
 */
export function generateSampleConfig(): string {
  return JSON.stringify({
    azureSQL: {
      enabled: true,
      server: 'your-server.database.windows.net',
      database: 'your-database',
      useManagedIdentity: true,
      pollInterval: 5
    },
    synapse: {
      enabled: true,
      workspaceName: 'your-synapse-workspace',
      dedicatedPoolName: 'your-pool',
      pollInterval: 10
    },
    fabric: {
      enabled: true,
      workspaceName: 'your-fabric-workspace',
      warehouseName: 'your-warehouse',
      lakehouseName: 'your-lakehouse',
      pollInterval: 5,
      logPaths: [
        './logs/fabric-warehouse.log',
        './logs/fabric-lakehouse.log'
      ]
    },
    adf: {
      enabled: true,
      factoryName: 'your-data-factory',
      resourceGroup: 'your-resource-group',
      subscriptionId: 'your-subscription-id',
      pollInterval: 15
    },
    devops: {
      enabled: true,
      organization: 'your-org',
      project: 'your-project',
      personalAccessToken: 'your-pat-token',
      autoCreatePR: true,
      branchName: 'main'
    },
    monitoring: {
      enabled: false,
      logAnalyticsWorkspace: 'your-workspace-id'
    },
    remediation: {
      autoFixEnabled: true,
      autoTestEnabled: true,
      autoDeployEnabled: false,
      requireApproval: true,
      maxRetries: 3,
      dryRun: false
    },
    notifications: {
      enabled: true,
      teamsWebhook: 'https://your-teams-webhook-url',
      notifyOnSuccess: false,
      notifyOnFailure: true
    },
    healthcare: {
      hipaaMode: true,
      phiLoggingEnabled: false,
      auditAllAccess: true,
      encryptionRequired: true
    }
  }, null, 2);
}
