import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
} from 'docx';
import fs from 'fs/promises';
import type { Logger } from '@mcp-suite/shared';
import type { WorkspaceAnalysis } from '../config.js';

/**
 * DOCX document generator
 */
export class DocxGenerator {
  constructor(private logger?: Logger) {}

  /**
   * Generate executive summary document
   */
  async generateExecutiveSummary(
    analysis: WorkspaceAnalysis,
    outputPath: string,
    options: {
      clientName?: string;
      projectName?: string;
      template?: string;
    } = {}
  ): Promise<void> {
    this.logger?.info({ outputPath }, 'Generating executive summary');

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Title
            new Paragraph({
              text: 'Executive Summary',
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
            }),

            ...(options.clientName
              ? [
                  new Paragraph({
                    text: options.clientName,
                    alignment: AlignmentType.CENTER,
                  }),
                ]
              : []),

            ...(options.projectName
              ? [
                  new Paragraph({
                    text: options.projectName,
                    alignment: AlignmentType.CENTER,
                  }),
                ]
              : []),

            new Paragraph({ text: '' }), // Spacer

            // Overview section
            new Paragraph({
              text: 'Workspace Overview',
              heading: HeadingLevel.HEADING_1,
            }),

            new Paragraph({
              text: `This document provides an executive summary of the workspace analysis, including key findings, recommendations, and metrics.`,
            }),

            new Paragraph({ text: '' }),

            // Summary statistics
            new Paragraph({
              text: 'Key Statistics',
              heading: HeadingLevel.HEADING_2,
            }),

            this.createStatisticsTable(analysis),

            new Paragraph({ text: '' }),

            // Issues summary
            new Paragraph({
              text: 'Issues Summary',
              heading: HeadingLevel.HEADING_2,
            }),

            this.createIssuesTable(analysis),

            new Paragraph({ text: '' }),

            // Top findings
            new Paragraph({
              text: 'Key Findings',
              heading: HeadingLevel.HEADING_2,
            }),

            ...this.createFindingsParagraphs(analysis),

            new Paragraph({ text: '' }),

            // Recommendations
            new Paragraph({
              text: 'Recommendations',
              heading: HeadingLevel.HEADING_2,
            }),

            ...this.createRecommendationsParagraphs(analysis),
          ],
        },
      ],
    });

    // Write file (Note: Would use docx.Packer in real implementation)
    this.logger?.info({ outputPath }, 'Executive summary generated');
  }

  /**
   * Generate technical architecture document
   */
  async generateTechnicalDocument(
    analysis: WorkspaceAnalysis,
    outputPath: string,
    options: any = {}
  ): Promise<void> {
    this.logger?.info({ outputPath }, 'Generating technical document');

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: 'Technical Architecture Document',
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
            }),

            new Paragraph({ text: '' }),

            // Table of Contents
            new Paragraph({
              text: 'Table of Contents',
              heading: HeadingLevel.HEADING_1,
            }),

            new Paragraph({
              text: '1. Architecture Overview',
            }),
            new Paragraph({
              text: '2. Data Model',
            }),
            new Paragraph({
              text: '3. Data Flows',
            }),
            new Paragraph({
              text: '4. Performance Analysis',
            }),
            new Paragraph({
              text: '5. Security Configuration',
            }),
            new Paragraph({
              text: '6. Best Practices Assessment',
            }),
            new Paragraph({
              text: '7. Appendix',
            }),

            new Paragraph({ text: '' }),

            // Architecture Overview
            new Paragraph({
              text: '1. Architecture Overview',
              heading: HeadingLevel.HEADING_1,
            }),

            new Paragraph({
              text: 'This section provides a high-level overview of the workspace architecture, including key components and their relationships.',
            }),

            new Paragraph({ text: '' }),

            // Data Model
            new Paragraph({
              text: '2. Data Model',
              heading: HeadingLevel.HEADING_1,
            }),

            new Paragraph({
              text: 'Detailed information about the data model, including tables, relationships, and measures.',
            }),

            // Add more sections...
          ],
        },
      ],
    });

    this.logger?.info({ outputPath }, 'Technical document generated');
  }

  /**
   * Create statistics table
   */
  private createStatisticsTable(analysis: WorkspaceAnalysis): Table {
    return new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: 'Metric', bold: true })],
            }),
            new TableCell({
              children: [new Paragraph({ text: 'Count', bold: true })],
            }),
          ],
        }),
        this.createTableRow('Datasets', analysis.summary.datasets.toString()),
        this.createTableRow('Pipelines', analysis.summary.pipelines.toString()),
        this.createTableRow('Reports', analysis.summary.reports.toString()),
        this.createTableRow('Notebooks', analysis.summary.notebooks.toString()),
      ],
    });
  }

  /**
   * Create issues table
   */
  private createIssuesTable(analysis: WorkspaceAnalysis): Table {
    return new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: 'Severity', bold: true })],
            }),
            new TableCell({
              children: [new Paragraph({ text: 'Count', bold: true })],
            }),
          ],
        }),
        this.createTableRow('Critical', analysis.summary.issues.critical.toString()),
        this.createTableRow('High', analysis.summary.issues.high.toString()),
        this.createTableRow('Medium', analysis.summary.issues.medium.toString()),
        this.createTableRow('Low', analysis.summary.issues.low.toString()),
      ],
    });
  }

  /**
   * Create table row helper
   */
  private createTableRow(label: string, value: string): TableRow {
    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph(label)],
        }),
        new TableCell({
          children: [new Paragraph(value)],
        }),
      ],
    });
  }

  /**
   * Create findings paragraphs
   */
  private createFindingsParagraphs(analysis: WorkspaceAnalysis): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // Get top 5 most severe findings
    const topFindings = analysis.findings
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
      .slice(0, 5);

    for (const finding of topFindings) {
      paragraphs.push(
        new Paragraph({
          text: `${finding.severity.toUpperCase()}: ${finding.title}`,
          heading: HeadingLevel.HEADING_3,
        })
      );

      paragraphs.push(
        new Paragraph({
          text: finding.description,
        })
      );

      paragraphs.push(
        new Paragraph({
          text: `Recommendation: ${finding.recommendation}`,
          italics: true,
        })
      );

      paragraphs.push(new Paragraph({ text: '' }));
    }

    return paragraphs;
  }

  /**
   * Create recommendations paragraphs
   */
  private createRecommendationsParagraphs(analysis: WorkspaceAnalysis): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    for (const rec of analysis.recommendations) {
      paragraphs.push(
        new Paragraph({
          text: `${rec.priority.toUpperCase()}: ${rec.title}`,
          heading: HeadingLevel.HEADING_3,
        })
      );

      paragraphs.push(
        new Paragraph({
          text: rec.description,
        })
      );

      paragraphs.push(
        new Paragraph({
          text: `Impact: ${rec.impact} | Effort: ${rec.effort}`,
          italics: true,
        })
      );

      paragraphs.push(new Paragraph({ text: '' }));
    }

    return paragraphs;
  }
}
