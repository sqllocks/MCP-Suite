import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import type { Logger } from '@mcp-suite/shared';
import type { CatalogEntry, LineageNode } from '../config.js';

/**
 * Workspace structure
 */
export interface WorkspaceStructure {
  path: string;
  name: string;
  items: WorkspaceItem[];
  metadata: {
    itemCount: number;
    fileCount: number;
    totalSize: number;
  };
}

export interface WorkspaceItem {
  id: string;
  name: string;
  type: 'dataset' | 'report' | 'notebook' | 'pipeline' | 'dataflow' | 'lakehouse' | 'warehouse';
  path: string;
  size: number;
  modified: string;
  metadata: Record<string, any>;
}

/**
 * Workspace parser
 */
export class WorkspaceParser {
  constructor(private logger?: Logger) {}

  /**
   * Parse workspace from directory
   */
  async parseWorkspace(workspacePath: string): Promise<WorkspaceStructure> {
    this.logger?.info({ path: workspacePath }, 'Parsing workspace');

    const items: WorkspaceItem[] = [];
    let totalSize = 0;

    // Find all relevant files
    const patterns = [
      '**/*.pbix',
      '**/*.Dataset',
      '**/*.Report',
      '**/*.ipynb',
      '**/*.json',
      '**/*.yaml',
      '**/*.yml',
    ];

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: workspacePath,
        nodir: true,
        absolute: false,
      });

      for (const file of files) {
        const fullPath = path.join(workspacePath, file);
        const stats = await fs.stat(fullPath);
        
        const item: WorkspaceItem = {
          id: this.generateId(file),
          name: path.basename(file, path.extname(file)),
          type: this.detectType(file),
          path: file,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          metadata: await this.extractMetadata(fullPath),
        };

        items.push(item);
        totalSize += stats.size;
      }
    }

    this.logger?.info(
      { itemCount: items.length, totalSize },
      'Workspace parsing complete'
    );

    return {
      path: workspacePath,
      name: path.basename(workspacePath),
      items,
      metadata: {
        itemCount: items.length,
        fileCount: items.length,
        totalSize,
      },
    };
  }

  /**
   * Extract catalog entries from workspace
   */
  async extractCatalog(workspace: WorkspaceStructure): Promise<CatalogEntry[]> {
    const catalog: CatalogEntry[] = [];

    for (const item of workspace.items) {
      // Add item itself
      catalog.push({
        type: 'table', // Simplified - would be more sophisticated
        name: item.name,
        description: item.metadata.description,
        properties: {
          type: item.type,
          size: item.size,
          modified: item.modified,
        },
        metadata: item.metadata,
      });
    }

    return catalog;
  }

  /**
   * Build lineage graph from workspace
   */
  async buildLineage(workspace: WorkspaceStructure): Promise<LineageNode[]> {
    const nodes: LineageNode[] = [];

    for (const item of workspace.items) {
      const node: LineageNode = {
        id: item.id,
        name: item.name,
        type: this.mapToLineageType(item.type),
        properties: {
          path: item.path,
          size: item.size,
          modified: item.modified,
        },
        dependencies: item.metadata.dependencies || [],
      };

      nodes.push(node);
    }

    return nodes;
  }

  /**
   * Detect item type from file extension
   */
  private detectType(filePath: string): WorkspaceItem['type'] {
    const ext = path.extname(filePath).toLowerCase();
    
    const typeMap: Record<string, WorkspaceItem['type']> = {
      '.pbix': 'report',
      '.dataset': 'dataset',
      '.report': 'report',
      '.ipynb': 'notebook',
      '.json': 'pipeline', // Simplified
      '.yaml': 'pipeline',
      '.yml': 'pipeline',
    };

    return typeMap[ext] || 'dataset';
  }

  /**
   * Map workspace type to lineage type
   */
  private mapToLineageType(type: WorkspaceItem['type']): LineageNode['type'] {
    const typeMap: Record<WorkspaceItem['type'], LineageNode['type']> = {
      dataset: 'dataset',
      report: 'report',
      notebook: 'view',
      pipeline: 'pipeline',
      dataflow: 'pipeline',
      lakehouse: 'table',
      warehouse: 'table',
    };

    return typeMap[type] || 'table';
  }

  /**
   * Extract metadata from file
   */
  private async extractMetadata(filePath: string): Promise<Record<string, any>> {
    const ext = path.extname(filePath).toLowerCase();
    
    try {
      // For JSON/YAML files, parse and extract metadata
      if (ext === '.json' || ext === '.yaml' || ext === '.yml') {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        
        return {
          description: parsed.description,
          version: parsed.version,
          author: parsed.author,
          dependencies: parsed.dependencies || [],
        };
      }

      // For notebooks, extract basic info
      if (ext === '.ipynb') {
        const content = await fs.readFile(filePath, 'utf-8');
        const notebook = JSON.parse(content);
        
        return {
          description: notebook.metadata?.description,
          kernelspec: notebook.metadata?.kernelspec?.name,
          language: notebook.metadata?.language_info?.name,
          cellCount: notebook.cells?.length || 0,
        };
      }

      // For other files, return basic metadata
      return {
        extension: ext,
      };
    } catch (error) {
      this.logger?.debug({ error, filePath }, 'Failed to extract metadata');
      return {};
    }
  }

  /**
   * Generate unique ID for item
   */
  private generateId(filePath: string): string {
    return filePath.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  }

  /**
   * Get workspace statistics
   */
  async getStatistics(workspace: WorkspaceStructure): Promise<any> {
    const stats: any = {
      total_items: workspace.items.length,
      by_type: {},
      total_size_mb: workspace.metadata.totalSize / (1024 * 1024),
      avg_size_mb: workspace.metadata.totalSize / workspace.items.length / (1024 * 1024),
    };

    // Count by type
    for (const item of workspace.items) {
      stats.by_type[item.type] = (stats.by_type[item.type] || 0) + 1;
    }

    return stats;
  }
}
