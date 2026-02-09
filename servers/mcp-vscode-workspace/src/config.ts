import { z } from 'zod';

/**
 * Configuration schema
 */
export const ConfigSchema = z.object({
  workspace_root: z.string().optional(),
  default_platform: z.string().default('fabric'),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Platform-specific configurations
 */
export interface PlatformConfig {
  extensions: string[];
  settings: Record<string, any>;
  snippets: Record<string, any>;
  tasks: any[];
  launchConfigs: any[];
}

/**
 * Extension recommendation
 */
export interface ExtensionRecommendation {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

/**
 * Workspace structure
 */
export interface WorkspaceStructure {
  folders: string[];
  files: Record<string, string>;
  settings: Record<string, any>;
}
