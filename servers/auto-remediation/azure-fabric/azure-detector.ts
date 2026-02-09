/**
 * Azure Error Detector
 * Specialized error detection for Azure services
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import { DetectedError } from '../core/remediation-orchestrator.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AzureMonitoringConfig {
  // Azure SQL
  azureSqlConnectionString?: string;
  monitorAzureSQL: boolean;
  
  // Synapse
  synapseWorkspace?: string;
  monitorSynapse: boolean;
  
  // Fabric
  fabricWorkspace?: string;
  monitorFabric: boolean;
  
  // ADF
  adfFactory?: string;
  adfResourceGroup?: string;
  monitorADF: boolean;
  
  // Azure Monitor Logs
  logAnalyticsWorkspace?: string;
  monitorAzureLogs: boolean;
  
  // Polling intervals (minutes)
  sqlPollInterval: number;
  synapsePollInterval: number;
  fabricPollInterval: number;
  adfPollInterval: number;
}

export class AzureErrorDetector extends EventEmitter {
  private config: AzureMonitoringConfig;
  private isMonitoring: boolean = false;
  private intervals: NodeJS.Timeout[] = [];
  private errorCache: Set<string> = new Set();

  constructor(config?: Partial<AzureMonitoringConfig>) {
    super();
    this.config = {
      monitorAzureSQL: true,
      monitorSynapse: true,
      monitorFabric: true,
      monitorADF: true,
      monitorAzureLogs: false,
      sqlPollInterval: 5,
      synapsePollInterval: 10,
      fabricPollInterval: 5,
      adfPollInterval: 15,
      ...config
    };
  }

  /**
   * Start monitoring Azure services
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      throw new Error('Already monitoring');
    }

    this.isMonitoring = true;
    console.log('🔍 Azure Error Detection started\n');

    // Monitor Azure SQL
    if (this.config.monitorAzureSQL) {
      this.startAzureSQLMonitoring();
    }

    // Monitor Synapse
    if (this.config.monitorSynapse) {
      this.startSynapseMonitoring();
    }

    // Monitor Fabric
    if (this.config.monitorFabric) {
      this.startFabricMonitoring();
    }

    // Monitor ADF
    if (this.config.monitorADF) {
      this.startADFMonitoring();
    }

    // Monitor Azure Logs
    if (this.config.monitorAzureLogs && this.config.logAnalyticsWorkspace) {
      this.startAzureLogsMonitoring();
    }
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring(): Promise<void> {
    this.isMonitoring = false;
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    console.log('🛑 Azure Error Detection stopped');
  }

  /**
   * Monitor Azure SQL for errors
   */
  private startAzureSQLMonitoring(): void {
    console.log('📊 Monitoring Azure SQL...');

    const checkSQL = async () => {
      try {
        // Query sys.dm_exec_requests for failed queries
        const errors = await this.getAzureSQLErrors();
        
        for (const error of errors) {
          if (!this.isDuplicate(error)) {
            this.emit('error-detected', error);
          }
        }
      } catch (error) {
        console.error('Failed to check Azure SQL:', error);
      }
    };

    const interval = setInterval(checkSQL, this.config.sqlPollInterval * 60 * 1000);
    this.intervals.push(interval);

    // Initial check
    checkSQL();
  }

  /**
   * Get Azure SQL errors
   */
  private async getAzureSQLErrors(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];

    try {
      // This would connect to Azure SQL and query for errors
      // Simulated for now
      const query = `
        SELECT TOP 50
          session_id,
          start_time,
          status,
          command,
          sql_text = SUBSTRING(st.text, (er.statement_start_offset/2)+1,
            ((CASE er.statement_end_offset
              WHEN -1 THEN DATALENGTH(st.text)
              ELSE er.statement_end_offset
            END - er.statement_start_offset)/2) + 1),
          error_number = er.last_wait_type
        FROM sys.dm_exec_requests er
        CROSS APPLY sys.dm_exec_sql_text(er.sql_handle) st
        WHERE er.status = 'failed'
        ORDER BY start_time DESC
      `;

      // Would execute query here
      // For now, check local SQL error logs
      const logPath = './logs/azure-sql-errors.log';
      try {
        const content = await fs.readFile(logPath, 'utf-8');
        const lines = content.split('\n').slice(-50);
        
        for (const line of lines) {
          if (line.includes('ERROR') || line.includes('FAILED')) {
            const error = this.parseAzureSQLError(line);
            if (error) errors.push(error);
          }
        }
      } catch {
        // Log file doesn't exist
      }

    } catch (error) {
      console.error('Azure SQL error query failed:', error);
    }

    return errors;
  }

  /**
   * Parse Azure SQL error
   */
  private parseAzureSQLError(line: string): DetectedError | null {
    return {
      id: this.generateErrorId(line),
      timestamp: new Date(),
      category: 'runtime',
      severity: this.determineSeverity(line),
      source: 'azure-sql',
      message: line.trim(),
      context: { service: 'Azure SQL', line }
    };
  }

  /**
   * Monitor Synapse workspace
   */
  private startSynapseMonitoring(): void {
    console.log('🔷 Monitoring Synapse...');

    const checkSynapse = async () => {
      try {
        const errors = await this.getSynapseErrors();
        
        for (const error of errors) {
          if (!this.isDuplicate(error)) {
            this.emit('error-detected', error);
          }
        }
      } catch (error) {
        console.error('Failed to check Synapse:', error);
      }
    };

    const interval = setInterval(checkSynapse, this.config.synapsePollInterval * 60 * 1000);
    this.intervals.push(interval);

    // Initial check
    checkSynapse();
  }

  /**
   * Get Synapse errors
   */
  private async getSynapseErrors(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];

    try {
      // Check Synapse pipeline runs
      if (this.config.synapseWorkspace) {
        // Would use Azure SDK here
        // az synapse pipeline run list --workspace-name {workspace}
        const command = `az synapse pipeline run list --workspace-name ${this.config.synapseWorkspace} --output json 2>&1 || true`;
        
        try {
          const { stdout } = await execAsync(command);
          const runs = JSON.parse(stdout);
          
          for (const run of runs || []) {
            if (run.status === 'Failed') {
              errors.push({
                id: this.generateErrorId(run.runId),
                timestamp: new Date(run.runEnd),
                category: 'runtime',
                severity: 'high',
                source: `synapse-pipeline-${run.pipelineName}`,
                message: `Synapse pipeline failed: ${run.message || 'Unknown error'}`,
                context: {
                  service: 'Synapse',
                  pipelineName: run.pipelineName,
                  runId: run.runId,
                  error: run.message
                }
              });
            }
          }
        } catch {
          // Azure CLI might not be configured
        }
      }

      // Check local Synapse logs
      const logPath = './logs/synapse-errors.log';
      try {
        const content = await fs.readFile(logPath, 'utf-8');
        const lines = content.split('\n').slice(-50);
        
        for (const line of lines) {
          if (line.includes('ERROR') || line.includes('FAILED')) {
            errors.push({
              id: this.generateErrorId(line),
              timestamp: new Date(),
              category: 'runtime',
              severity: 'high',
              source: 'synapse',
              message: line.trim(),
              context: { service: 'Synapse', line }
            });
          }
        }
      } catch {
        // Log file doesn't exist
      }

    } catch (error) {
      console.error('Synapse error check failed:', error);
    }

    return errors;
  }

  /**
   * Monitor Microsoft Fabric
   */
  private startFabricMonitoring(): void {
    console.log('🏗️  Monitoring Microsoft Fabric...');

    const checkFabric = async () => {
      try {
        const errors = await this.getFabricErrors();
        
        for (const error of errors) {
          if (!this.isDuplicate(error)) {
            this.emit('error-detected', error);
          }
        }
      } catch (error) {
        console.error('Failed to check Fabric:', error);
      }
    };

    const interval = setInterval(checkFabric, this.config.fabricPollInterval * 60 * 1000);
    this.intervals.push(interval);

    // Initial check
    checkFabric();
  }

  /**
   * Get Fabric errors
   */
  private async getFabricErrors(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];

    try {
      // Check Fabric-specific log files
      const logPaths = [
        './logs/fabric-warehouse.log',
        './logs/fabric-lakehouse.log',
        './logs/fabric-notebook.log',
        './logs/fabric-dataflow.log'
      ];

      for (const logPath of logPaths) {
        try {
          const content = await fs.readFile(logPath, 'utf-8');
          const lines = content.split('\n').slice(-50);
          
          for (const line of lines) {
            if (this.isFabricError(line)) {
              const error = this.parseFabricError(line, logPath);
              if (error) errors.push(error);
            }
          }
        } catch {
          // Log file doesn't exist
        }
      }

    } catch (error) {
      console.error('Fabric error check failed:', error);
    }

    return errors;
  }

  /**
   * Check if line is a Fabric error
   */
  private isFabricError(line: string): boolean {
    const fabricErrorPatterns = [
      /Fabric.*error/i,
      /syntax error/i,
      /table.*not found/i,
      /column.*not found/i,
      /invalid object name/i,
      /conversion failed/i,
      /timeout/i,
      /quota.*exceeded/i
    ];

    return fabricErrorPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Parse Fabric error
   */
  private parseFabricError(line: string, source: string): DetectedError | null {
    return {
      id: this.generateErrorId(line),
      timestamp: new Date(),
      category: this.categorizeFabricError(line),
      severity: this.determineSeverity(line),
      source,
      message: line.trim(),
      context: {
        service: 'Microsoft Fabric',
        logFile: source,
        line
      }
    };
  }

  /**
   * Categorize Fabric error
   */
  private categorizeFabricError(line: string): DetectedError['category'] {
    if (/syntax/i.test(line)) return 'syntax';
    if (/authentication|authorization/i.test(line)) return 'security';
    if (/not found|does not exist/i.test(line)) return 'runtime';
    return 'runtime';
  }

  /**
   * Monitor Azure Data Factory
   */
  private startADFMonitoring(): void {
    console.log('🏭 Monitoring Azure Data Factory...');

    const checkADF = async () => {
      try {
        const errors = await this.getADFErrors();
        
        for (const error of errors) {
          if (!this.isDuplicate(error)) {
            this.emit('error-detected', error);
          }
        }
      } catch (error) {
        console.error('Failed to check ADF:', error);
      }
    };

    const interval = setInterval(checkADF, this.config.adfPollInterval * 60 * 1000);
    this.intervals.push(interval);

    // Initial check
    checkADF();
  }

  /**
   * Get ADF errors
   */
  private async getADFErrors(): Promise<DetectedError[]> {
    const errors: DetectedError[] = [];

    try {
      // Check ADF pipeline runs
      if (this.config.adfFactory && this.config.adfResourceGroup) {
        const command = `az datafactory pipeline-run query-by-factory \
          --factory-name ${this.config.adfFactory} \
          --resource-group ${this.config.adfResourceGroup} \
          --last-updated-after "$(date -u -d '1 hour ago' '+%Y-%m-%dT%H:%M:%SZ')" \
          --last-updated-before "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
          --output json 2>&1 || true`;
        
        try {
          const { stdout } = await execAsync(command);
          const runs = JSON.parse(stdout);
          
          for (const run of runs.value || []) {
            if (run.status === 'Failed') {
              errors.push({
                id: this.generateErrorId(run.runId),
                timestamp: new Date(run.runEnd),
                category: 'runtime',
                severity: 'high',
                source: `adf-pipeline-${run.pipelineName}`,
                message: `ADF pipeline failed: ${run.message || 'Unknown error'}`,
                context: {
                  service: 'Azure Data Factory',
                  pipelineName: run.pipelineName,
                  runId: run.runId,
                  error: run.message
                }
              });
            }
          }
        } catch {
          // Azure CLI might not be configured
        }
      }

      // Check local ADF logs
      const logPath = './logs/adf-errors.log';
      try {
        const content = await fs.readFile(logPath, 'utf-8');
        const lines = content.split('\n').slice(-50);
        
        for (const line of lines) {
          if (line.includes('ERROR') || line.includes('FAILED')) {
            errors.push({
              id: this.generateErrorId(line),
              timestamp: new Date(),
              category: 'runtime',
              severity: 'high',
              source: 'azure-data-factory',
              message: line.trim(),
              context: { service: 'Azure Data Factory', line }
            });
          }
        }
      } catch {
        // Log file doesn't exist
      }

    } catch (error) {
      console.error('ADF error check failed:', error);
    }

    return errors;
  }

  /**
   * Monitor Azure Monitor Logs (Log Analytics)
   */
  private startAzureLogsMonitoring(): void {
    console.log('📋 Monitoring Azure Monitor Logs...');

    const checkLogs = async () => {
      try {
        // Would use Azure SDK to query Log Analytics
        // const query = `
        //   AzureDiagnostics
        //   | where TimeGenerated > ago(1h)
        //   | where Level == "Error"
        //   | order by TimeGenerated desc
        // `;
      } catch (error) {
        console.error('Failed to check Azure Logs:', error);
      }
    };

    const interval = setInterval(checkLogs, 10 * 60 * 1000);
    this.intervals.push(interval);
  }

  /**
   * Determine severity from message
   */
  private determineSeverity(message: string): DetectedError['severity'] {
    if (/critical|fatal|authentication|PHI/i.test(message)) {
      return 'critical';
    }
    if (/error|failed|exception/i.test(message)) {
      return 'high';
    }
    if (/warning|warn/i.test(message)) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }

  /**
   * Check if error is a duplicate
   */
  private isDuplicate(error: DetectedError): boolean {
    if (this.errorCache.has(error.id)) {
      return true;
    }

    this.errorCache.add(error.id);

    // Clean cache if it gets too large
    if (this.errorCache.size > 1000) {
      const entries = Array.from(this.errorCache);
      this.errorCache = new Set(entries.slice(-500));
    }

    return false;
  }
}
