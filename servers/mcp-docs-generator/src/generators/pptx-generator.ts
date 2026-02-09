import PptxGenJS from 'pptxgenjs';
import type { Logger } from '@mcp-suite/shared';
import type { WorkspaceAnalysis, TemplateConfig } from '../config.js';

/**
 * PPTX presentation generator
 */
export class PptxGenerator {
  constructor(private logger?: Logger) {}

  /**
   * Generate recommendations presentation
   */
  async generateRecommendations(
    analysis: WorkspaceAnalysis,
    outputPath: string,
    options: {
      clientName?: string;
      projectName?: string;
      template?: TemplateConfig;
    } = {}
  ): Promise<void> {
    this.logger?.info({ outputPath }, 'Generating recommendations presentation');

    const pptx = new PptxGenJS();
    
    // Set presentation properties
    pptx.author = 'MCP Docs Generator';
    pptx.title = 'Workspace Analysis & Recommendations';
    pptx.subject = options.projectName || 'Workspace Analysis';

    // Get brand colors
    const primaryColor = options.template?.brand.colors.primary || '0078D4';
    const secondaryColor = options.template?.brand.colors.secondary || '003057';

    // Title slide
    this.addTitleSlide(pptx, analysis, options, primaryColor, secondaryColor);

    // Executive summary slide
    this.addExecutiveSummarySlide(pptx, analysis, primaryColor);

    // Key metrics slide
    this.addMetricsSlide(pptx, analysis, primaryColor);

    // Findings slides (one per high/critical finding)
    this.addFindingsSlides(pptx, analysis, primaryColor, secondaryColor);

    // Recommendations slides
    this.addRecommendationsSlides(pptx, analysis, primaryColor, secondaryColor);

    // Next steps slide
    this.addNextStepsSlide(pptx, analysis, primaryColor);

    // Save presentation
    await pptx.writeFile({ fileName: outputPath });

    this.logger?.info({ outputPath }, 'Recommendations presentation generated');
  }

  /**
   * Add title slide
   */
  private addTitleSlide(
    pptx: PptxGenJS,
    analysis: WorkspaceAnalysis,
    options: any,
    primaryColor: string,
    secondaryColor: string
  ): void {
    const slide = pptx.addSlide();

    // Background
    slide.background = { color: secondaryColor };

    // Title
    slide.addText('Workspace Analysis', {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 1,
      fontSize: 44,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
    });

    // Subtitle
    if (options.clientName) {
      slide.addText(options.clientName, {
        x: 0.5,
        y: 2.7,
        w: 9,
        h: 0.5,
        fontSize: 28,
        color: 'FFFFFF',
        align: 'center',
      });
    }

    if (options.projectName) {
      slide.addText(options.projectName, {
        x: 0.5,
        y: 3.3,
        w: 9,
        h: 0.5,
        fontSize: 20,
        color: 'CCCCCC',
        align: 'center',
      });
    }

    // Date
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    slide.addText(date, {
      x: 0.5,
      y: 5.0,
      w: 9,
      h: 0.3,
      fontSize: 14,
      color: 'AAAAAA',
      align: 'center',
    });
  }

  /**
   * Add executive summary slide
   */
  private addExecutiveSummarySlide(
    pptx: PptxGenJS,
    analysis: WorkspaceAnalysis,
    primaryColor: string
  ): void {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Executive Summary', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.5,
      fontSize: 32,
      bold: true,
      color: primaryColor,
    });

    // Summary points
    const points = [
      `Analyzed ${analysis.summary.datasets + analysis.summary.reports + analysis.summary.notebooks} workspace items`,
      `Identified ${analysis.findings.length} findings across performance, security, and best practices`,
      `${analysis.summary.issues.critical + analysis.summary.issues.high} high-priority issues require immediate attention`,
      `${analysis.recommendations.length} strategic recommendations provided`,
    ];

    slide.addText(points.map((p) => ({ text: p, options: { bullet: true } })), {
      x: 1.0,
      y: 1.5,
      w: 8,
      h: 3.5,
      fontSize: 18,
      lineSpacing: 32,
    });
  }

  /**
   * Add metrics slide
   */
  private addMetricsSlide(
    pptx: PptxGenJS,
    analysis: WorkspaceAnalysis,
    primaryColor: string
  ): void {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Key Metrics', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.5,
      fontSize: 32,
      bold: true,
      color: primaryColor,
    });

    // Metrics in boxes
    const metrics = [
      {
        label: 'Datasets',
        value: analysis.summary.datasets,
        x: 0.5,
        y: 1.5,
      },
      {
        label: 'Reports',
        value: analysis.summary.reports,
        x: 3.0,
        y: 1.5,
      },
      {
        label: 'Pipelines',
        value: analysis.summary.pipelines,
        x: 5.5,
        y: 1.5,
      },
      {
        label: 'Notebooks',
        value: analysis.summary.notebooks,
        x: 8.0,
        y: 1.5,
      },
    ];

    for (const metric of metrics) {
      // Box
      slide.addShape(pptx.ShapeType.rect, {
        x: metric.x,
        y: metric.y,
        w: 2.0,
        h: 1.5,
        fill: { color: 'F0F0F0' },
        line: { color: primaryColor, width: 2 },
      });

      // Value
      slide.addText(metric.value.toString(), {
        x: metric.x,
        y: metric.y + 0.2,
        w: 2.0,
        h: 0.6,
        fontSize: 36,
        bold: true,
        color: primaryColor,
        align: 'center',
      });

      // Label
      slide.addText(metric.label, {
        x: metric.x,
        y: metric.y + 0.9,
        w: 2.0,
        h: 0.4,
        fontSize: 16,
        color: '666666',
        align: 'center',
      });
    }

    // Issues summary
    slide.addText('Issues by Severity', {
      x: 0.5,
      y: 3.5,
      w: 9,
      h: 0.4,
      fontSize: 20,
      bold: true,
    });

    const issues = [
      { label: 'Critical', value: analysis.summary.issues.critical, color: 'E81123' },
      { label: 'High', value: analysis.summary.issues.high, color: 'FF8C00' },
      { label: 'Medium', value: analysis.summary.issues.medium, color: 'FFB900' },
      { label: 'Low', value: analysis.summary.issues.low, color: '107C10' },
    ];

    let xPos = 1.0;
    for (const issue of issues) {
      slide.addText(`${issue.label}: ${issue.value}`, {
        x: xPos,
        y: 4.1,
        w: 2.0,
        h: 0.4,
        fontSize: 16,
        color: issue.color,
        bold: true,
      });
      xPos += 2.0;
    }
  }

  /**
   * Add findings slides
   */
  private addFindingsSlides(
    pptx: PptxGenJS,
    analysis: WorkspaceAnalysis,
    primaryColor: string,
    secondaryColor: string
  ): void {
    // Get critical and high severity findings
    const importantFindings = analysis.findings
      .filter((f) => f.severity === 'critical' || f.severity === 'high')
      .slice(0, 5); // Max 5 slides

    for (const finding of importantFindings) {
      const slide = pptx.addSlide();

      // Severity banner
      const severityColor = finding.severity === 'critical' ? 'E81123' : 'FF8C00';
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 10,
        h: 0.4,
        fill: { color: severityColor },
      });

      slide.addText(finding.severity.toUpperCase(), {
        x: 0.5,
        y: 0.05,
        w: 2,
        h: 0.3,
        fontSize: 16,
        bold: true,
        color: 'FFFFFF',
      });

      // Title
      slide.addText(finding.title, {
        x: 0.5,
        y: 0.8,
        w: 9,
        h: 0.6,
        fontSize: 28,
        bold: true,
        color: primaryColor,
      });

      // Description
      slide.addText(finding.description, {
        x: 0.5,
        y: 1.6,
        w: 9,
        h: 1.0,
        fontSize: 16,
      });

      // Impact
      slide.addText('Impact', {
        x: 0.5,
        y: 2.8,
        w: 9,
        h: 0.3,
        fontSize: 18,
        bold: true,
        color: secondaryColor,
      });

      slide.addText(finding.impact, {
        x: 0.5,
        y: 3.2,
        w: 9,
        h: 0.8,
        fontSize: 14,
      });

      // Recommendation
      slide.addText('Recommendation', {
        x: 0.5,
        y: 4.2,
        w: 9,
        h: 0.3,
        fontSize: 18,
        bold: true,
        color: secondaryColor,
      });

      slide.addText(finding.recommendation, {
        x: 0.5,
        y: 4.6,
        w: 9,
        h: 0.8,
        fontSize: 14,
      });
    }
  }

  /**
   * Add recommendations slides
   */
  private addRecommendationsSlides(
    pptx: PptxGenJS,
    analysis: WorkspaceAnalysis,
    primaryColor: string,
    secondaryColor: string
  ): void {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Strategic Recommendations', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.5,
      fontSize: 32,
      bold: true,
      color: primaryColor,
    });

    // Recommendations list
    const recs = analysis.recommendations.slice(0, 5);
    let yPos = 1.5;

    for (const rec of recs) {
      // Priority badge
      const priorityColor = 
        rec.priority === 'high' ? 'E81123' : 
        rec.priority === 'medium' ? 'FFB900' : '107C10';

      slide.addShape(pptx.ShapeType.rect, {
        x: 0.5,
        y: yPos,
        w: 0.8,
        h: 0.3,
        fill: { color: priorityColor },
      });

      slide.addText(rec.priority.toUpperCase(), {
        x: 0.5,
        y: yPos + 0.05,
        w: 0.8,
        h: 0.2,
        fontSize: 10,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
      });

      // Title
      slide.addText(rec.title, {
        x: 1.5,
        y: yPos,
        w: 7.5,
        h: 0.3,
        fontSize: 16,
        bold: true,
      });

      // Description
      slide.addText(rec.description, {
        x: 1.5,
        y: yPos + 0.35,
        w: 7.5,
        h: 0.4,
        fontSize: 12,
      });

      yPos += 0.85;
    }
  }

  /**
   * Add next steps slide
   */
  private addNextStepsSlide(
    pptx: PptxGenJS,
    analysis: WorkspaceAnalysis,
    primaryColor: string
  ): void {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Next Steps', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.5,
      fontSize: 32,
      bold: true,
      color: primaryColor,
    });

    // Next steps
    const steps = [
      'Review and prioritize recommendations',
      'Address critical and high-severity findings',
      'Implement performance optimizations',
      'Strengthen security configurations',
      'Establish ongoing monitoring and maintenance',
    ];

    slide.addText(
      steps.map((step, i) => ({
        text: `${i + 1}. ${step}`,
        options: { bullet: false },
      })),
      {
        x: 1.0,
        y: 1.5,
        w: 8,
        h: 3.5,
        fontSize: 18,
        lineSpacing: 36,
      }
    );
  }
}
