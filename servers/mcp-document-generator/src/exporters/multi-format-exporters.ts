/**
 * Excel, PowerPoint, and PDF Exporters
 * Professional document generation for all major formats
 */

import ExcelJS from 'exceljs';
import pptxgen from 'pptxgenjs';
import * as fs from 'fs/promises';
import { createCanvas, loadImage } from 'canvas';
import PDFDocument from 'pdfkit';

// ============================================================================
// EXCEL (XLSX) EXPORTER
// ============================================================================

export interface ExcelSheet {
  name: string;
  data: any[][];
  headers?: string[];
  formatting?: {
    headerBold?: boolean;
    headerColor?: string;
    alternateRows?: boolean;
    autoFilter?: boolean;
  };
}

export class XlsxExporter {
  async create(sheets: ExcelSheet[], outputPath: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Document Generator';
    workbook.created = new Date();

    for (const sheet of sheets) {
      const worksheet = workbook.addWorksheet(sheet.name);

      // Add headers if provided
      if (sheet.headers) {
        const headerRow = worksheet.addRow(sheet.headers);
        if (sheet.formatting?.headerBold) {
          headerRow.font = { bold: true };
        }
        if (sheet.formatting?.headerColor) {
          headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: sheet.formatting.headerColor },
          };
        }
      }

      // Add data
      sheet.data.forEach((row, index) => {
        const dataRow = worksheet.addRow(row);
        
        // Alternate row colors
        if (sheet.formatting?.alternateRows && index % 2 === 1) {
          dataRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F0F0' },
          };
        }
      });

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell?.({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? String(cell.value).length : 10;
          maxLength = Math.max(maxLength, columnLength);
        });
        column.width = Math.min(maxLength + 2, 50);
      });

      // Add auto-filter
      if (sheet.formatting?.autoFilter && sheet.headers) {
        worksheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: sheet.headers.length },
        };
      }
    }

    await workbook.xlsx.writeFile(outputPath);
  }

  /**
   * Create Data Dictionary
   */
  async createDataDictionary(tables: Array<{
    tableName: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      primaryKey: boolean;
      foreignKey?: string;
      description?: string;
    }>;
  }>, outputPath: string): Promise<void> {
    const sheets: ExcelSheet[] = tables.map(table => ({
      name: table.tableName,
      headers: ['Column', 'Type', 'Nullable', 'PK', 'FK', 'Description'],
      data: table.columns.map(col => [
        col.name,
        col.type,
        col.nullable ? 'Yes' : 'No',
        col.primaryKey ? 'Yes' : 'No',
        col.foreignKey || '',
        col.description || '',
      ]),
      formatting: {
        headerBold: true,
        headerColor: 'FF0078D4',
        alternateRows: true,
        autoFilter: true,
      },
    }));

    await this.create(sheets, outputPath);
  }

  /**
   * Create Test Case Matrix
   */
  async createTestMatrix(testCases: Array<{
    id: string;
    title: string;
    priority: string;
    status: string;
    assignee: string;
    result?: string;
  }>, outputPath: string): Promise<void> {
    const sheet: ExcelSheet = {
      name: 'Test Cases',
      headers: ['ID', 'Title', 'Priority', 'Status', 'Assignee', 'Result'],
      data: testCases.map(tc => [
        tc.id,
        tc.title,
        tc.priority,
        tc.status,
        tc.assignee,
        tc.result || '',
      ]),
      formatting: {
        headerBold: true,
        headerColor: 'FF107C10',
        alternateRows: true,
        autoFilter: true,
      },
    };

    await this.create([sheet], outputPath);
  }

  /**
   * Create Project Tracker
   */
  async createProjectTracker(tasks: Array<{
    task: string;
    owner: string;
    status: string;
    priority: string;
    dueDate: string;
    percentComplete: number;
  }>, outputPath: string): Promise<void> {
    const sheet: ExcelSheet = {
      name: 'Project Tasks',
      headers: ['Task', 'Owner', 'Status', 'Priority', 'Due Date', '% Complete'],
      data: tasks.map(t => [
        t.task,
        t.owner,
        t.status,
        t.priority,
        t.dueDate,
        t.percentComplete,
      ]),
      formatting: {
        headerBold: true,
        headerColor: 'FFFF8C00',
        alternateRows: true,
        autoFilter: true,
      },
    };

    await this.create([sheet], outputPath);
  }
}

// ============================================================================
// POWERPOINT (PPTX) EXPORTER
// ============================================================================

export interface PptxSlide {
  type: 'title' | 'content' | 'image' | 'diagram' | 'two-column';
  title?: string;
  content?: string[];
  bullets?: string[];
  imagePath?: string;
  leftContent?: string[];
  rightContent?: string[];
  notes?: string;
}

export class PptxExporter {
  async create(
    title: string,
    slides: PptxSlide[],
    outputPath: string,
    template?: 'professional' | 'modern' | 'minimal'
  ): Promise<void> {
    const pptx = new pptxgen();

    // Set presentation properties
    pptx.author = 'Document Generator';
    pptx.title = title;
    pptx.subject = 'Generated Presentation';

    // Apply template styling
    const colors = this.getTemplateColors(template || 'professional');
    
    // Title slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: colors.background };
    titleSlide.addText(title, {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 1.5,
      fontSize: 44,
      bold: true,
      color: colors.title,
      align: 'center',
    });

    // Content slides
    for (const slideData of slides) {
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };

      switch (slideData.type) {
        case 'title':
          this.createTitleSlide(slide, slideData, colors);
          break;
        case 'content':
          this.createContentSlide(slide, slideData, colors);
          break;
        case 'image':
          await this.createImageSlide(slide, slideData, colors);
          break;
        case 'two-column':
          this.createTwoColumnSlide(slide, slideData, colors);
          break;
      }

      if (slideData.notes) {
        slide.addNotes(slideData.notes);
      }
    }

    await pptx.writeFile({ fileName: outputPath });
  }

  private createTitleSlide(slide: any, data: PptxSlide, colors: any): void {
    if (data.title) {
      slide.addText(data.title, {
        x: 0.5,
        y: 1,
        w: 9,
        h: 1,
        fontSize: 36,
        bold: true,
        color: colors.heading,
      });
    }
    if (data.content && data.content.length > 0) {
      slide.addText(data.content.join('\n'), {
        x: 0.5,
        y: 2.5,
        w: 9,
        h: 3,
        fontSize: 18,
        color: colors.text,
      });
    }
  }

  private createContentSlide(slide: any, data: PptxSlide, colors: any): void {
    // Title
    if (data.title) {
      slide.addText(data.title, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.8,
        fontSize: 32,
        bold: true,
        color: colors.heading,
      });
    }

    // Bullets
    if (data.bullets && data.bullets.length > 0) {
      slide.addText(data.bullets.map(b => ({ text: b, options: { bullet: true } })), {
        x: 0.5,
        y: 1.5,
        w: 9,
        h: 4,
        fontSize: 18,
        color: colors.text,
      });
    }
  }

  private async createImageSlide(slide: any, data: PptxSlide, colors: any): Promise<void> {
    // Title
    if (data.title) {
      slide.addText(data.title, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.8,
        fontSize: 32,
        bold: true,
        color: colors.heading,
      });
    }

    // Image
    if (data.imagePath) {
      slide.addImage({
        path: data.imagePath,
        x: 1,
        y: 1.5,
        w: 8,
        h: 4.5,
      });
    }
  }

  private createTwoColumnSlide(slide: any, data: PptxSlide, colors: any): void {
    // Title
    if (data.title) {
      slide.addText(data.title, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.8,
        fontSize: 32,
        bold: true,
        color: colors.heading,
      });
    }

    // Left column
    if (data.leftContent) {
      slide.addText(data.leftContent.join('\n'), {
        x: 0.5,
        y: 1.5,
        w: 4.25,
        h: 4.5,
        fontSize: 16,
        color: colors.text,
      });
    }

    // Right column
    if (data.rightContent) {
      slide.addText(data.rightContent.join('\n'), {
        x: 5.25,
        y: 1.5,
        w: 4.25,
        h: 4.5,
        fontSize: 16,
        color: colors.text,
      });
    }
  }

  /**
   * Create Architecture Overview deck
   */
  async createArchitectureDeck(data: {
    title: string;
    overview: string;
    components: string[];
    dataFlow: string;
    diagramPath?: string;
  }, outputPath: string): Promise<void> {
    const slides: PptxSlide[] = [
      {
        type: 'content',
        title: 'Overview',
        bullets: [data.overview],
      },
      {
        type: 'content',
        title: 'Components',
        bullets: data.components,
      },
      {
        type: 'content',
        title: 'Data Flow',
        bullets: [data.dataFlow],
      },
    ];

    if (data.diagramPath) {
      slides.push({
        type: 'image',
        title: 'Architecture Diagram',
        imagePath: data.diagramPath,
      });
    }

    await this.create(data.title, slides, outputPath, 'professional');
  }

  private getTemplateColors(template: string) {
    const templates = {
      professional: {
        background: '0078D4',
        title: 'FFFFFF',
        heading: '0078D4',
        text: '333333',
      },
      modern: {
        background: '464FEB',
        title: 'FFFFFF',
        heading: '464FEB',
        text: '333333',
      },
      minimal: {
        background: 'F5F5F5',
        title: '333333',
        heading: '666666',
        text: '333333',
      },
    };
    return templates[template] || templates.professional;
  }
}

// ============================================================================
// PDF EXPORTER
// ============================================================================

export interface PdfSection {
  type: 'heading' | 'paragraph' | 'list' | 'image' | 'table' | 'pageBreak';
  text?: string;
  level?: number;
  items?: string[];
  imagePath?: string;
  data?: any[][];
}

export class PdfExporter {
  async create(
    title: string,
    sections: PdfSection[],
    outputPath: string
  ): Promise<void> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(outputPath);
    
    doc.pipe(stream as any);

    // Title
    doc.fontSize(24).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(2);

    // Sections
    for (const section of sections) {
      switch (section.type) {
        case 'heading':
          const fontSize = section.level === 1 ? 20 : section.level === 2 ? 16 : 14;
          doc.fontSize(fontSize).font('Helvetica-Bold').text(section.text || '', { align: 'left' });
          doc.moveDown(0.5);
          break;

        case 'paragraph':
          doc.fontSize(12).font('Helvetica').text(section.text || '', { align: 'left' });
          doc.moveDown();
          break;

        case 'list':
          if (section.items) {
            section.items.forEach(item => {
              doc.fontSize(12).font('Helvetica').text(`• ${item}`, { indent: 20 });
            });
            doc.moveDown();
          }
          break;

        case 'table':
          if (section.data) {
            // Simple table rendering
            section.data.forEach((row, i) => {
              const rowText = row.join('  |  ');
              doc.fontSize(i === 0 ? 12 : 11)
                 .font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
                 .text(rowText);
            });
            doc.moveDown();
          }
          break;

        case 'image':
          if (section.imagePath) {
            try {
              doc.image(section.imagePath, { fit: [500, 400], align: 'center' });
              doc.moveDown();
            } catch (e) {
              console.error('Failed to add image:', e);
            }
          }
          break;

        case 'pageBreak':
          doc.addPage();
          break;
      }
    }

    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }
}

// ============================================================================
// EXPORT HELPERS
// ============================================================================

export async function exportToWord(data: any, outputPath: string): Promise<void> {
  // Implementation depends on data structure
}

export async function exportToExcel(data: any, outputPath: string): Promise<void> {
  const exporter = new XlsxExporter();
  await exporter.create(data.sheets || [], outputPath);
}

export async function exportToPowerPoint(data: any, outputPath: string): Promise<void> {
  const exporter = new PptxExporter();
  await exporter.create(data.title, data.slides || [], outputPath, data.template);
}

export async function exportToPdf(data: any, outputPath: string): Promise<void> {
  const exporter = new PdfExporter();
  await exporter.create(data.title, data.sections || [], outputPath);
}
