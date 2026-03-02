import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  VerticalAlign,
  ShadingType,
  PageBreak,
  TabStopType,
  TabStopPosition,
  Header,
  Footer,
  ImageRun,
} from 'docx';
import { ProposalInputs, VALUE_DRIVER_LABELS, PAIN_POINT_LABELS } from '@/types/proposal';
import { calculatePricing, formatCurrency } from '@/lib/pricing-calculator';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
} from '@/lib/roi-calculator';
import { getValueDriverContent, WHY_NOW_CONTENT, NEXT_STEPS_OPTIONS } from '@/lib/content-templates';

// Brand color
const BRAND_COLOR = '03143B';
const BRAND_COLOR_LIGHT = 'E8EAF0';
const GREEN_COLOR = '16A34A';

export function generateProposalDocx(inputs: ProposalInputs): Document {
  // Calculate values
  const pricing = calculatePricing(inputs.pricing);
  const hrOutput = calculateHROperationsROI(inputs.hrOperations);
  const tier2Cases = inputs.hrOperations.tier2Workflows.reduce((sum, w) => sum + w.volumePerYear, 0);
  const legalOutput = calculateLegalComplianceROI(inputs.legalCompliance, tier2Cases);
  const employeeOutput = calculateEmployeeExperienceROI(inputs.employeeExperience);
  const summary = calculateROISummary(hrOutput, legalOutput, employeeOutput, pricing.annualRecurringRevenue);

  // Get content
  const valueDriverContent = getValueDriverContent(inputs.primaryValueDriver);
  const generatedContent = inputs.generatedContent;

  const children: (Paragraph | Table)[] = [];

  // ===== COVER PAGE =====

  // Spacer at top
  children.push(new Paragraph({ spacing: { after: 1000 } }));
  children.push(new Paragraph({ spacing: { after: 1000 } }));

  // "Strategic Proposal" label
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'STRATEGIC PROPOSAL',
          bold: true,
          size: 24,
          color: BRAND_COLOR,
          font: 'Arial',
        }),
      ],
      spacing: { after: 200 },
    })
  );

  // Main title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Transforming HR at ${inputs.company.companyName}`,
          bold: true,
          size: 72,
          color: BRAND_COLOR,
          font: 'Arial',
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Decorative line
  children.push(
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 24, color: BRAND_COLOR },
      },
      spacing: { after: 400 },
    })
  );

  // Cover quote if exists
  if (inputs.coverQuote) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `"${inputs.coverQuote}"`,
            italics: true,
            size: 32,
            color: '4B5563',
            font: 'Arial',
          }),
        ],
        spacing: { before: 400, after: 600 },
        border: {
          left: { style: BorderStyle.SINGLE, size: 24, color: BRAND_COLOR },
        },
        indent: { left: convertInchesToTwip(0.3) },
      })
    );
  }

  // Contact info
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Prepared for: ${inputs.company.contactName}`,
          size: 28,
          color: '4B5563',
          font: 'Arial',
        }),
      ],
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${inputs.company.contactTitle}, ${inputs.company.companyName}`,
          size: 24,
          color: '6B7280',
          font: 'Arial',
        }),
      ],
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          size: 24,
          color: '6B7280',
          font: 'Arial',
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Page break
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ===== EXECUTIVE SUMMARY =====

  children.push(createSectionHeader('Executive Summary'));

  const execInsight = generatedContent?.execSummaryInsight ||
    `${inputs.company.companyName} has an opportunity to transform HR operations through intelligent automation, enabling your team to focus on strategic initiatives while delivering exceptional employee experiences.`;

  children.push(
    new Paragraph({
      children: [new TextRun({ text: execInsight, size: 24, font: 'Arial' })],
      spacing: { after: 300 },
    })
  );

  const execVision = generatedContent?.execSummaryVision ||
    `What if your HR team could focus on strategic initiatives while employees get instant, accurate answers to their questions?`;

  children.push(
    new Paragraph({
      children: [new TextRun({ text: execVision, italics: true, size: 24, color: '4B5563', font: 'Arial' })],
      spacing: { after: 400 },
      border: {
        left: { style: BorderStyle.SINGLE, size: 16, color: BRAND_COLOR },
      },
      indent: { left: convertInchesToTwip(0.2) },
    })
  );

  // Key Outcomes Table
  children.push(createSubheader('Key Outcomes'));

  children.push(
    createMetricsTable([
      { label: 'Year 1 ROI', value: `${summary.totalROI.toFixed(0)}%` },
      { label: 'Gross Annual Value', value: formatCurrency(summary.grossAnnualValue) },
      { label: 'Payback Period', value: `${summary.paybackPeriodMonths.toFixed(1)} months` },
      { label: 'Net Annual Benefit', value: formatCurrency(summary.netAnnualBenefit) },
    ])
  );

  children.push(new Paragraph({ spacing: { after: 400 } }));

  // ===== CURRENT CHALLENGES =====

  children.push(createSectionHeader('Current Challenges'));

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Based on our discussions, we understand these are key pain points for your organization:',
          size: 24,
          font: 'Arial',
        }),
      ],
      spacing: { after: 300 },
    })
  );

  inputs.painPoints.forEach((point) => {
    children.push(createBulletPoint(PAIN_POINT_LABELS[point]));
  });

  children.push(new Paragraph({ spacing: { after: 400 } }));

  // ===== MEET HARPER =====

  children.push(createSectionHeader('Meet Harper — Your AI HR Generalist'));

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Harper is Wisq's AI teammate who handles routine HR inquiries with expert-level accuracy, freeing your team for strategic work. She provides instant, accurate responses to employee questions while ensuring compliance and consistency.",
          size: 24,
          font: 'Arial',
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Harper Stats Table
  children.push(
    createMetricsTable([
      { label: 'SHRM-CP Accuracy', value: '94%', subtext: '20-30 points above passing' },
      { label: 'Response Time', value: '< 8 sec', subtext: 'Average response' },
      { label: 'Autonomous Handling', value: '80%', subtext: 'Routine requests' },
      { label: 'Time Saved', value: '35+ hrs', subtext: 'Per HR team member/month' },
    ])
  );

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ===== VALUE DRIVERS =====

  children.push(createSectionHeader('Value Drivers'));

  const drivers = generatedContent?.valueDriverContent?.length
    ? generatedContent.valueDriverContent
    : valueDriverContent.map(d => ({ headline: d.label, description: d.description, proof: d.proof, key: '' }));

  drivers.forEach((driver, index) => {
    children.push(createSubheader(`${index + 1}. ${driver.headline}`));

    children.push(
      new Paragraph({
        children: [new TextRun({ text: driver.description, size: 24, font: 'Arial' })],
        spacing: { after: 200 },
      })
    );

    if (driver.proof) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Proof Point: ', bold: true, size: 22, font: 'Arial', color: BRAND_COLOR }),
            new TextRun({ text: driver.proof, size: 22, font: 'Arial', color: '4B5563' }),
          ],
          spacing: { after: 400 },
          shading: { type: ShadingType.SOLID, color: BRAND_COLOR_LIGHT },
          indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
        })
      );
    }
  });

  // ===== INVESTMENT SUMMARY =====

  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(createSectionHeader('Investment Summary'));

  // Software Investment
  children.push(createSubheader('Annual Software Investment'));

  const investmentRows = [
    ['Item', 'Annual Cost'],
    ['Wisq Platform License', formatCurrency(pricing.annualRecurringRevenue)],
  ];

  if (pricing.implementationNetPrice > 0) {
    investmentRows.push(['One-Time Implementation', formatCurrency(pricing.implementationNetPrice)]);
  }
  if (pricing.servicesNetPrice > 0) {
    investmentRows.push(['Professional Services', formatCurrency(pricing.servicesNetPrice)]);
  }

  children.push(createSimpleTable(investmentRows));
  children.push(new Paragraph({ spacing: { after: 400 } }));

  // ROI Breakdown
  children.push(createSubheader('Return on Investment'));

  children.push(
    createSimpleTable([
      ['Value Category', 'Annual Savings'],
      ['HR Operations Efficiency (Net)', formatCurrency(summary.hrOpsSavings)],
      ['Legal & Compliance Risk Reduction', formatCurrency(summary.legalSavings)],
      ['Employee Productivity Gains', formatCurrency(summary.productivitySavings)],
      ['Net Annual Value', formatCurrency(summary.netAnnualBenefit)],
    ])
  );

  children.push(new Paragraph({ spacing: { after: 200 } }));

  // ROI highlight box
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Total ROI: ${summary.totalROI.toFixed(0)}%  •  Payback: ${summary.paybackPeriodMonths.toFixed(1)} months  •  Net Benefit: ${formatCurrency(summary.netAnnualBenefit)}`,
          bold: true,
          size: 26,
          color: 'FFFFFF',
          font: 'Arial',
        }),
      ],
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: BRAND_COLOR },
      spacing: { before: 200, after: 400 },
      indent: { left: 0, right: 0 },
    })
  );

  // ===== WHY NOW =====

  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(createSectionHeader('Why Now'));

  const whyNowItems = generatedContent?.whyNowContent?.length
    ? generatedContent.whyNowContent
    : Object.values(WHY_NOW_CONTENT).map(item => ({ headline: item.headline, description: item.description, key: '' }));

  whyNowItems.forEach((item, index) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${index + 1}. ${item.headline}`, bold: true, size: 26, color: BRAND_COLOR, font: 'Arial' }),
        ],
        spacing: { before: 300, after: 150 },
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun({ text: item.description, size: 24, font: 'Arial' })],
        spacing: { after: 200 },
      })
    );
  });

  // ===== NEXT STEPS =====

  children.push(new Paragraph({ spacing: { after: 200 } }));
  children.push(createSectionHeader('Recommended Next Steps'));

  const selectedSteps = NEXT_STEPS_OPTIONS.filter((step) =>
    inputs.nextSteps.includes(step.id as (typeof inputs.nextSteps)[number])
  );

  selectedSteps.forEach((step, index) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Step ${index + 1}: `, bold: true, size: 24, color: BRAND_COLOR, font: 'Arial' }),
          new TextRun({ text: step.title, bold: true, size: 24, font: 'Arial' }),
        ],
        spacing: { before: 250, after: 100 },
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun({ text: step.description, size: 22, color: '4B5563', font: 'Arial' })],
        spacing: { after: 200 },
        indent: { left: convertInchesToTwip(0.3) },
      })
    );
  });

  // ===== FOOTER =====

  children.push(new Paragraph({ spacing: { after: 600 } }));

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Ready to transform HR at your organization? Let's connect.",
          size: 24,
          font: 'Arial',
        }),
      ],
      spacing: { after: 200 },
    })
  );

  // Add AE contact info - supports "Name | email" format
  const aeContact = inputs.company.contactEmail;
  if (aeContact.includes('|')) {
    const [aeName, aeEmail] = aeContact.split('|').map(s => s.trim());
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: aeName,
            bold: true,
            size: 28,
            color: BRAND_COLOR,
            font: 'Arial',
          }),
        ],
        spacing: { after: 50 },
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: aeEmail,
            size: 24,
            color: BRAND_COLOR,
            font: 'Arial',
          }),
        ],
        spacing: { after: 200 },
      })
    );
  } else if (aeContact) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: aeContact,
            bold: true,
            size: 28,
            color: BRAND_COLOR,
            font: 'Arial',
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'wisq.com',
          bold: true,
          size: 28,
          color: BRAND_COLOR,
          font: 'Arial',
        }),
      ],
    })
  );

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 24,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75),
            },
          },
        },
        children,
      },
    ],
  });
}

// Helper: Create section header
function createSectionHeader(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 40,
        color: BRAND_COLOR,
        font: 'Arial',
      }),
    ],
    spacing: { before: 400, after: 300 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 8, color: BRAND_COLOR },
    },
  });
}

// Helper: Create subheader
function createSubheader(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
        color: BRAND_COLOR,
        font: 'Arial',
      }),
    ],
    spacing: { before: 300, after: 200 },
  });
}

// Helper: Create bullet point
function createBulletPoint(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: '•  ', bold: true, size: 24, color: BRAND_COLOR, font: 'Arial' }),
      new TextRun({ text, size: 24, font: 'Arial' }),
    ],
    spacing: { after: 150 },
    indent: { left: convertInchesToTwip(0.3) },
  });
}

// Helper: Create metrics table (2x2 or 1x4 layout)
function createMetricsTable(metrics: { label: string; value: string; subtext?: string }[]): Table {
  const cells = metrics.map(metric =>
    new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: metric.value, bold: true, size: 36, color: BRAND_COLOR, font: 'Arial' }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: metric.label, size: 20, color: '4B5563', font: 'Arial' }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: metric.subtext ? 50 : 0 },
        }),
        ...(metric.subtext ? [
          new Paragraph({
            children: [
              new TextRun({ text: metric.subtext, size: 18, color: '9CA3AF', font: 'Arial' }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ] : []),
      ],
      verticalAlign: VerticalAlign.CENTER,
      shading: { type: ShadingType.SOLID, color: BRAND_COLOR_LIGHT },
      margins: {
        top: convertInchesToTwip(0.25),
        bottom: convertInchesToTwip(0.25),
        left: convertInchesToTwip(0.2),
        right: convertInchesToTwip(0.2),
      },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'FFFFFF' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'FFFFFF' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'FFFFFF' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'FFFFFF' },
      },
    })
  );

  // Create 2x2 layout if 4 items, otherwise single row
  if (metrics.length === 4) {
    return new Table({
      rows: [
        new TableRow({ children: [cells[0], cells[1]] }),
        new TableRow({ children: [cells[2], cells[3]] }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [convertInchesToTwip(3.5), convertInchesToTwip(3.5)],
    });
  }

  // Equal column widths for single row
  const colWidth = convertInchesToTwip(7) / metrics.length;
  return new Table({
    rows: [new TableRow({ children: cells })],
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: metrics.map(() => colWidth),
  });
}

// Helper: Create simple data table
function createSimpleTable(rows: string[][]): Table {
  return new Table({
    rows: rows.map((row, rowIndex) =>
      new TableRow({
        children: row.map((cell, cellIndex) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cell,
                    bold: rowIndex === 0 || cellIndex === 0,
                    size: 22,
                    color: rowIndex === 0 ? 'FFFFFF' : '1F2937',
                    font: 'Arial',
                  }),
                ],
                alignment: cellIndex === 1 ? AlignmentType.RIGHT : AlignmentType.LEFT,
              }),
            ],
            shading: {
              type: ShadingType.SOLID,
              color: rowIndex === 0 ? BRAND_COLOR : (rowIndex % 2 === 0 ? 'F9FAFB' : 'FFFFFF'),
            },
            margins: {
              top: convertInchesToTwip(0.12),
              bottom: convertInchesToTwip(0.12),
              left: convertInchesToTwip(0.2),
              right: convertInchesToTwip(0.2),
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            },
          })
        ),
      })
    ),
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [convertInchesToTwip(4.55), convertInchesToTwip(2.45)], // 65% / 35% of 7 inches
  });
}
