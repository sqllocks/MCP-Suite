import ExcelJS from 'exceljs';
import type { Logger } from '@mcp-suite/shared';
import type { CatalogEntry } from '../config.js';
import type { WorkspaceStructure } from '../parsers/workspace-parser.js';

/**
 * Excel catalog generator
 */
export class ExcelGenerator {
  constructor(private logger?: Logger) {}

  /**
   * Generate data catalog spreadsheet
   */
  async generateCatalog(
    workspace: WorkspaceStructure,
    catalog: CatalogEntry[],
    outputPath: string,
    options: {
      includeSamples?: boolean;
      includeProfiling?: boolean;
    } = {}
  ): Promise<void> {
    this.logger?.info({ outputPath }, 'Generating data catalog');

    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'MCP Docs Generator';
    workbook.created = new Date();

    // Summary sheet
    await this.addSummarySheet(workbook, workspace);

    // Items sheet
    await this.addItemsSheet(workbook, workspace);

    // Catalog sheet
    await this.addCatalogSheet(workbook, catalog);

    // Relationships sheet (if applicable)
    await this.addRelationshipsSheet(workbook, workspace);

    // Write file
    await workbook.xlsx.writeFile(outputPath);

    this.logger?.info({ outputPath }, 'Data catalog generated');
  }

  /**
   * Add summary sheet
   */
  private async addSummarySheet(
    workbook: ExcelJS.Workbook,
    workspace: WorkspaceStructure
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Summary');

    // Header
    sheet.getCell('A1').value = 'Workspace Summary';
    sheet.getCell('A1').font = { size: 16, bold: true };
    sheet.mergeCells('A1:B1');

    // Metadata
    const metadata = [
      ['Workspace Name', workspace.name],
      ['Path', workspace.path],
      ['Total Items', workspace.metadata.itemCount],
      ['Total Size (MB)', (workspace.metadata.totalSize / (1024 * 1024)).toFixed(2)],
      ['Generated', new Date().toISOString()],
    ];

    let row = 3;
    for (const [label, value] of metadata) {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`A${row}`).font = { bold: true };
      sheet.getCell(`B${row}`).value = value;
      row++;
    }

    // Item counts by type
    sheet.getCell(`A${row + 1}`).value = 'Items by Type';
    sheet.getCell(`A${row + 1}`).font = { size: 14, bold: true };
    row += 2;

    const typeCounts = new Map<string, number>();
    for (const item of workspace.items) {
      typeCounts.set(item.type, (typeCounts.get(item.type) || 0) + 1);
    }

    for (const [type, count] of typeCounts) {
      sheet.getCell(`A${row}`).value = type.charAt(0).toUpperCase() + type.slice(1);
      sheet.getCell(`B${row}`).value = count;
      row++;
    }

    // Column widths
    sheet.getColumn('A').width = 25;
    sheet.getColumn('B').width = 40;
  }

  /**
   * Add items sheet
   */
  private async addItemsSheet(
    workbook: ExcelJS.Workbook,
    workspace: WorkspaceStructure
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Items');

    // Headers
    const headers = ['Name', 'Type', 'Path', 'Size (KB)', 'Modified', 'Description'];
    sheet.addRow(headers);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0078D4' },
    };
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Data rows
    for (const item of workspace.items) {
      sheet.addRow([
        item.name,
        item.type,
        item.path,
        (item.size / 1024).toFixed(2),
        new Date(item.modified).toLocaleDateString(),
        item.metadata.description || '',
      ]);
    }

    // Format as table
    sheet.addTable({
      name: 'ItemsTable',
      ref: 'A1',
      headerRow: true,
      totalsRow: false,
      style: {
        theme: 'TableStyleMedium2',
        showRowStripes: true,
      },
      columns: headers.map((h) => ({ name: h })),
      rows: workspace.items.map((item) => [
        item.name,
        item.type,
        item.path,
        (item.size / 1024).toFixed(2),
        new Date(item.modified).toLocaleDateString(),
        item.metadata.description || '',
      ]),
    });

    // Auto-fit columns
    sheet.columns.forEach((column) => {
      column.width = 20;
    });
    sheet.getColumn(3).width = 40; // Path column wider
  }

  /**
   * Add catalog sheet
   */
  private async addCatalogSheet(
    workbook: ExcelJS.Workbook,
    catalog: CatalogEntry[]
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Catalog');

    // Headers
    const headers = ['Name', 'Type', 'Description', 'Properties'];
    sheet.addRow(headers);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF107C10' },
    };
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Data rows
    for (const entry of catalog) {
      const propertiesStr = Object.entries(entry.properties)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');

      sheet.addRow([
        entry.name,
        entry.type,
        entry.description || '',
        propertiesStr,
      ]);
    }

    // Auto-fit columns
    sheet.getColumn(1).width = 30;
    sheet.getColumn(2).width = 15;
    sheet.getColumn(3).width = 50;
    sheet.getColumn(4).width = 40;
  }

  /**
   * Add relationships sheet
   */
  private async addRelationshipsSheet(
    workbook: ExcelJS.Workbook,
    workspace: WorkspaceStructure
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Relationships');

    // Headers
    const headers = ['From', 'To', 'Type', 'Description'];
    sheet.addRow(headers);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF8C00' },
    };
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Extract relationships from workspace
    // (This would be more sophisticated with actual relationship data)
    for (const item of workspace.items) {
      if (item.metadata.dependencies && Array.isArray(item.metadata.dependencies)) {
        for (const dep of item.metadata.dependencies) {
          sheet.addRow([
            item.name,
            dep,
            'depends_on',
            `${item.name} depends on ${dep}`,
          ]);
        }
      }
    }

    // Auto-fit columns
    sheet.columns.forEach((column) => {
      column.width = 25;
    });
  }

  /**
   * Generate comparison report
   */
  async generateComparison(
    baseline: WorkspaceStructure,
    current: WorkspaceStructure,
    outputPath: string
  ): Promise<void> {
    this.logger?.info({ outputPath }, 'Generating comparison report');

    const workbook = new ExcelJS.Workbook();

    // Summary sheet
    const sheet = workbook.addWorksheet('Comparison');

    // Headers
    sheet.getCell('A1').value = 'Workspace Comparison';
    sheet.getCell('A1').font = { size: 16, bold: true };
    sheet.mergeCells('A1:D1');

    // Metadata
    sheet.getCell('A3').value = 'Metric';
    sheet.getCell('B3').value = 'Baseline';
    sheet.getCell('C3').value = 'Current';
    sheet.getCell('D3').value = 'Change';

    const headerRow = sheet.getRow(3);
    headerRow.font = { bold: true };

    // Comparison data
    const comparisons = [
      [
        'Total Items',
        baseline.metadata.itemCount,
        current.metadata.itemCount,
        current.metadata.itemCount - baseline.metadata.itemCount,
      ],
      [
        'Total Size (MB)',
        (baseline.metadata.totalSize / (1024 * 1024)).toFixed(2),
        (current.metadata.totalSize / (1024 * 1024)).toFixed(2),
        ((current.metadata.totalSize - baseline.metadata.totalSize) / (1024 * 1024)).toFixed(2),
      ],
    ];

    let row = 4;
    for (const comp of comparisons) {
      sheet.addRow(comp);
      
      // Color code changes
      const changeCell = sheet.getCell(`D${row}`);
      const change = parseFloat(comp[3] as string);
      if (change > 0) {
        changeCell.font = { color: { argb: 'FF107C10' } }; // Green
      } else if (change < 0) {
        changeCell.font = { color: { argb: 'FFE81123' } }; // Red
      }
      
      row++;
    }

    // Column widths
    sheet.getColumn('A').width = 25;
    sheet.getColumn('B').width = 20;
    sheet.getColumn('C').width = 20;
    sheet.getColumn('D').width = 20;

    await workbook.xlsx.writeFile(outputPath);

    this.logger?.info({ outputPath }, 'Comparison report generated');
  }
}
