/**
 * Word Document (DOCX) Exporter
 * Creates professional Word documents with diagrams
 */

import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, ImageRun } from 'docx';
import * as fs from 'fs/promises';

export interface DocxSection {
  type: 'heading' | 'paragraph' | 'table' | 'image' | 'pageBreak' | 'toc';
  level?: HeadingLevel;
  text?: string;
  content?: string;
  bold?: boolean;
  italic?: boolean;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  data?: any[][];
  imagePath?: string;
  width?: number;
  height?: number;
}

export interface DocxTemplate {
  title: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  sections: DocxSection[];
  style?: 'professional' | 'modern' | 'minimal';
  headerText?: string;
  footerText?: string;
}

export class DocxExporter {
  /**
   * Create Word document from template
   */
  async create(template: DocxTemplate, outputPath: string): Promise<void> {
    const doc = new Document({
      creator: template.author || 'Document Generator',
      title: template.title,
      subject: template.subject,
      keywords: template.keywords?.join(', '),
      sections: [{
        properties: {},
        headers: template.headerText ? {
          default: this.createHeader(template.headerText),
        } : undefined,
        footers: template.footerText ? {
          default: this.createFooter(template.footerText),
        } : undefined,
        children: await this.createSections(template.sections, template.style),
      }],
    });

    const buffer = await this.generateBuffer(doc);
    await fs.writeFile(outputPath, buffer);
  }

  /**
   * Create Architecture Decision Record (ADR)
   */
  async createADR(data: {
    number: string;
    title: string;
    status: string;
    date: string;
    context: string;
    decision: string;
    consequences: string;
    alternatives?: string[];
  }, outputPath: string): Promise<void> {
    const sections: DocxSection[] = [
      { type: 'heading', level: HeadingLevel.HEADING_1, text: `ADR ${data.number}: ${data.title}` },
      { type: 'paragraph', text: `Status: ${data.status}`, bold: true },
      { type: 'paragraph', text: `Date: ${data.date}` },
      { type: 'paragraph', text: '' },
      
      { type: 'heading', level: HeadingLevel.HEADING_2, text: 'Context' },
      { type: 'paragraph', text: data.context },
      { type: 'paragraph', text: '' },
      
      { type: 'heading', level: HeadingLevel.HEADING_2, text: 'Decision' },
      { type: 'paragraph', text: data.decision },
      { type: 'paragraph', text: '' },
      
      { type: 'heading', level: HeadingLevel.HEADING_2, text: 'Consequences' },
      { type: 'paragraph', text: data.consequences },
    ];

    if (data.alternatives && data.alternatives.length > 0) {
      sections.push({ type: 'paragraph', text: '' });
      sections.push({ type: 'heading', level: HeadingLevel.HEADING_2, text: 'Alternatives Considered' });
      data.alternatives.forEach((alt, i) => {
        sections.push({ type: 'paragraph', text: `${i + 1}. ${alt}` });
      });
    }

    await this.create({
      title: `ADR ${data.number}: ${data.title}`,
      subject: 'Architecture Decision Record',
      sections,
      style: 'professional',
    }, outputPath);
  }

  /**
   * Create Technical Design Document
   */
  async createDesignDoc(data: {
    title: string;
    author: string;
    version: string;
    overview: string;
    architecture?: string;
    components?: Array<{ name: string; description: string }>;
    dataFlow?: string;
    security?: string;
    deployment?: string;
    diagrams?: Array<{ title: string; path: string }>;
  }, outputPath: string): Promise<void> {
    const sections: DocxSection[] = [
      { type: 'toc' },
      { type: 'pageBreak' },
      
      { type: 'heading', level: HeadingLevel.HEADING_1, text: data.title },
      { type: 'paragraph', text: `Author: ${data.author}` },
      { type: 'paragraph', text: `Version: ${data.version}` },
      { type: 'paragraph', text: '' },
      
      { type: 'heading', level: HeadingLevel.HEADING_2, text: 'Overview' },
      { type: 'paragraph', text: data.overview },
    ];

    if (data.architecture) {
      sections.push({ type: 'pageBreak' });
      sections.push({ type: 'heading', level: HeadingLevel.HEADING_2, text: 'Architecture' });
      sections.push({ type: 'paragraph', text: data.architecture });
    }

    if (data.components && data.components.length > 0) {
      sections.push({ type: 'pageBreak' });
      sections.push({ type: 'heading', level: HeadingLevel.HEADING_2, text: 'Components' });
      data.components.forEach(comp => {
        sections.push({ type: 'heading', level: HeadingLevel.HEADING_3, text: comp.name });
        sections.push({ type: 'paragraph', text: comp.description });
      });
    }

    if (data.diagrams && data.diagrams.length > 0) {
      sections.push({ type: 'pageBreak' });
      sections.push({ type: 'heading', level: HeadingLevel.HEADING_2, text: 'Diagrams' });
      for (const diagram of data.diagrams) {
        sections.push({ type: 'heading', level: HeadingLevel.HEADING_3, text: diagram.title });
        sections.push({ 
          type: 'image', 
          imagePath: diagram.path,
          width: 600,
          height: 400,
        });
      }
    }

    await this.create({
      title: data.title,
      author: data.author,
      subject: 'Technical Design Document',
      sections,
      style: 'professional',
      headerText: `${data.title} - ${data.version}`,
      footerText: 'Page [PAGE] of [TOTAL_PAGES]',
    }, outputPath);
  }

  /**
   * Create Requirements Document
   */
  async createRequirements(data: {
    title: string;
    introduction: string;
    functional: Array<{ id: string; description: string; priority: string }>;
    nonFunctional: Array<{ id: string; description: string; priority: string }>;
  }, outputPath: string): Promise<void> {
    const sections: DocxSection[] = [
      { type: 'heading', level: HeadingLevel.HEADING_1, text: data.title },
      { type: 'paragraph', text: '' },
      
      { type: 'heading', level: HeadingLevel.HEADING_2, text: 'Introduction' },
      { type: 'paragraph', text: data.introduction },
      { type: 'paragraph', text: '' },
      
      { type: 'heading', level: HeadingLevel.HEADING_2, text: 'Functional Requirements' },
      {
        type: 'table',
        data: [
          ['ID', 'Description', 'Priority'],
          ...data.functional.map(req => [req.id, req.description, req.priority]),
        ],
      },
      { type: 'paragraph', text: '' },
      
      { type: 'heading', level: HeadingLevel.HEADING_2, text: 'Non-Functional Requirements' },
      {
        type: 'table',
        data: [
          ['ID', 'Description', 'Priority'],
          ...data.nonFunctional.map(req => [req.id, req.description, req.priority]),
        ],
      },
    ];

    await this.create({
      title: data.title,
      subject: 'Requirements Document',
      sections,
      style: 'professional',
    }, outputPath);
  }

  /**
   * Create sections from template
   */
  private async createSections(sections: DocxSection[], style?: string): Promise<any[]> {
    const docSections: any[] = [];

    for (const section of sections) {
      switch (section.type) {
        case 'heading':
          docSections.push(new Paragraph({
            text: section.text || '',
            heading: section.level || HeadingLevel.HEADING_1,
            alignment: this.getAlignment(section.alignment),
          }));
          break;

        case 'paragraph':
          docSections.push(new Paragraph({
            children: [new TextRun({
              text: section.text || '',
              bold: section.bold,
              italics: section.italic,
            })],
            alignment: this.getAlignment(section.alignment),
          }));
          break;

        case 'table':
          if (section.data) {
            docSections.push(this.createTable(section.data));
          }
          break;

        case 'image':
          if (section.imagePath) {
            const imageBuffer = await fs.readFile(section.imagePath);
            docSections.push(new Paragraph({
              children: [new ImageRun({
                data: imageBuffer,
                transformation: {
                  width: section.width || 600,
                  height: section.height || 400,
                },
              })],
              alignment: AlignmentType.CENTER,
            }));
          }
          break;

        case 'pageBreak':
          docSections.push(new Paragraph({ pageBreakBefore: true }));
          break;

        case 'toc':
          docSections.push(new Paragraph({
            text: 'Table of Contents',
            heading: HeadingLevel.HEADING_1,
          }));
          // TOC would be added here
          break;
      }
    }

    return docSections;
  }

  /**
   * Create table
   */
  private createTable(data: any[][]): Table {
    return new Table({
      rows: data.map((row, rowIndex) => new TableRow({
        children: row.map(cell => new TableCell({
          children: [new Paragraph({
            text: String(cell),
            bold: rowIndex === 0, // Header row
          })],
          shading: rowIndex === 0 ? {
            fill: 'CCCCCC',
          } : undefined,
        })),
      })),
    });
  }

  /**
   * Create header
   */
  private createHeader(text: string): any {
    return {
      children: [new Paragraph({
        text,
        alignment: AlignmentType.RIGHT,
      })],
    };
  }

  /**
   * Create footer
   */
  private createFooter(text: string): any {
    return {
      children: [new Paragraph({
        text,
        alignment: AlignmentType.CENTER,
      })],
    };
  }

  /**
   * Get alignment type
   */
  private getAlignment(alignment?: string): AlignmentType {
    const alignments = {
      left: AlignmentType.LEFT,
      center: AlignmentType.CENTER,
      right: AlignmentType.RIGHT,
      justify: AlignmentType.JUSTIFIED,
    };
    return alignments[alignment || 'left'] || AlignmentType.LEFT;
  }

  /**
   * Generate buffer from document
   */
  private async generateBuffer(doc: Document): Promise<Buffer> {
    const Packer = (await import('docx')).Packer;
    return await Packer.toBuffer(doc);
  }
}

/**
 * Quick export functions
 */
export async function createADR(data: any, outputPath: string): Promise<void> {
  const exporter = new DocxExporter();
  await exporter.createADR(data, outputPath);
}

export async function createDesignDoc(data: any, outputPath: string): Promise<void> {
  const exporter = new DocxExporter();
  await exporter.createDesignDoc(data, outputPath);
}

export async function createRequirementsDoc(data: any, outputPath: string): Promise<void> {
  const exporter = new DocxExporter();
  await exporter.createRequirements(data, outputPath);
}
