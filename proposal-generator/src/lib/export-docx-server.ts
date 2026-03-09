import {
  Document,
  Paragraph,
  TextRun,
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
  ImageRun,
} from 'docx';
import { ProposalInputs, PAIN_POINT_LABELS, PainPoint, RFPCategory, RFP_CATEGORY_LABELS, resolveOtherValue, FAQSection, DEFAULT_COLOR_PALETTE } from '@/types/proposal';
import { lightenHex } from '@/lib/theme';
import { calculatePricing, formatCurrency } from '@/lib/pricing-calculator';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
} from '@/lib/roi-calculator';
import { getValueDriverContent, getPainPointContent, PAIN_POINT_CONTENT, WHY_NOW_CONTENT, NEXT_STEPS_OPTIONS } from '@/lib/content-templates';
import { getSelectedQuoteForSection } from '@/lib/customer-quotes';
import type { QuoteSection } from '@/types/proposal';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';


// Convert SVG to PNG buffer
async function getLogoPngBuffer(): Promise<Buffer> {
  const svgPath = path.join(process.cwd(), 'public', 'wisq-logo.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  // Convert SVG to PNG at 100x100 pixels
  const pngBuffer = await sharp(svgBuffer)
    .resize(100, 100)
    .png()
    .toBuffer();

  return pngBuffer;
}

async function getCustomerLogoPngBuffer(base64DataUri: string): Promise<Buffer> {
  // Strip data URI prefix: "data:image/png;base64,"
  const base64Data = base64DataUri.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  return sharp(buffer)
    .resize(100, 100, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
}

export async function generateProposalDocxWithLogo(inputs: ProposalInputs): Promise<Document> {
  // Resolve brand colors from palette
  const palette = inputs.colorPalette || DEFAULT_COLOR_PALETTE;
  const BC = palette.primary.replace('#', '');
  const BCL = lightenHex(palette.primary, 0.9).replace('#', '');

  // Bind helpers to the resolved brand colors
  const sectionHeader = (text: string) => createSectionHeader(text, BC);
  const subheader = (text: string) => createSubheader(text, BC);
  const bulletPoint = (text: string) => createBulletPoint(text, BC);
  const metricsTable = (metrics: { label: string; value: string; subtext?: string }[]) => createMetricsTable(metrics, BC, BCL);
  const simpleTable = (rows: string[][]) => createSimpleTable(rows, BC);

  // Get logo as PNG buffer
  const logoBuffer = await getLogoPngBuffer();
  const customerLogoBuffer = inputs.company.customerLogoBase64
    ? await getCustomerLogoPngBuffer(inputs.company.customerLogoBase64)
    : null;

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

  // Large spacer at top for visual balance
  children.push(new Paragraph({ spacing: { after: 1200 } }));
  children.push(new Paragraph({ spacing: { after: 1200 } }));

  // Logo on cover page - larger and more prominent
  const coverLogoChildren: (ImageRun | TextRun)[] = [
    new ImageRun({
      data: logoBuffer,
      transformation: { width: 100, height: 100 },
      type: 'png',
    }),
  ];
  if (customerLogoBuffer) {
    coverLogoChildren.push(
      new TextRun({ text: '  \u00D7  ', size: 32, color: 'CCCCCC' }),
      new ImageRun({
        data: customerLogoBuffer,
        transformation: { width: 100, height: 100 },
        type: 'png',
      }),
    );
  }
  children.push(
    new Paragraph({
      children: coverLogoChildren,
      spacing: { after: 800 },
    })
  );

  // "Strategic Proposal" label
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'STRATEGIC PROPOSAL',
          bold: true,
          size: 28,
          color: BC,
          font: 'Arial',
        }),
      ],
      spacing: { after: 300 },
    })
  );

  // Main title - larger with more spacing
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Transforming HR at ${inputs.company.companyName}`,
          bold: true,
          size: 80,
          color: BC,
          font: 'Arial',
        }),
      ],
      spacing: { after: 500 },
    })
  );

  // Decorative line with more spacing
  children.push(
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 30, color: BC },
      },
      spacing: { after: 800 },
    })
  );

  // Cover quote if exists
  if (inputs.coverQuote) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `\u201C${inputs.coverQuote}\u201D`,
            italics: true,
            size: 36,
            color: '4B5563',
            font: 'Arial',
          }),
        ],
        spacing: { before: 400, after: 1000 },
        border: {
          left: { style: BorderStyle.SINGLE, size: 30, color: BC },
        },
        indent: { left: convertInchesToTwip(0.4) },
      })
    );
  }

  // Large spacer before contact info
  children.push(new Paragraph({ spacing: { after: 1000 } }));

  // Contact info - larger text with more spacing
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Prepared for: ${inputs.company.contactName}`,
          size: 32,
          color: '4B5563',
          font: 'Arial',
        }),
      ],
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${resolveOtherValue(inputs.company.contactTitle, inputs.company.customContactTitle)}, ${inputs.company.companyName}`,
          size: 28,
          color: '6B7280',
          font: 'Arial',
        }),
      ],
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          size: 28,
          color: '6B7280',
          font: 'Arial',
        }),
      ],
      spacing: { after: 600 },
    })
  );

  // Page break
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ===== EXECUTIVE SUMMARY =====

  children.push(sectionHeader('Executive Summary'));

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
        left: { style: BorderStyle.SINGLE, size: 16, color: BC },
      },
      indent: { left: convertInchesToTwip(0.2) },
    })
  );

  // Executive Summary quote
  children.push(...createQuoteBlock(inputs, 'executive-summary'));

  // Key Outcomes Table
  children.push(subheader('Key Outcomes'));

  children.push(
    metricsTable([
      { label: 'Year 1 ROI', value: `${formatCurrency(summary.netAnnualBenefit)}/yr` },
      { label: 'Gross Annual Value', value: formatCurrency(summary.grossAnnualValue) },
      { label: 'Payback Period', value: `${summary.paybackPeriodMonths.toFixed(1)} months` },
      { label: 'Net Annual Benefit', value: formatCurrency(summary.netAnnualBenefit) },
    ])
  );

  children.push(new Paragraph({ spacing: { after: 400 } }));

  // ===== CURRENT CHALLENGES =====

  children.push(sectionHeader('Current Challenges'));

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

  // Build ordered pain points
  const ppOrder = inputs.painPointOrder && inputs.painPointOrder.length > 0
    ? inputs.painPointOrder
    : inputs.painPoints;

  ppOrder.forEach((id) => {
    const predefinedLabel = (PAIN_POINT_LABELS as Record<string, string>)[id];
    if (predefinedLabel) {
      children.push(bulletPoint(predefinedLabel));
      return;
    }
    const custom = inputs.customPainPoints?.find(cp => cp.id === id);
    if (custom) {
      children.push(bulletPoint(`${custom.headline}: ${custom.impact}`));
    }
  });

  // Current state quote
  children.push(...createQuoteBlock(inputs, 'current-state'));

  // Page break before Meet Harper
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ===== MEET HARPER =====

  children.push(sectionHeader('Meet Harper — Your AI HR Generalist'));

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
    metricsTable([
      { label: 'SHRM-CP Accuracy', value: '94%', subtext: '20-30 points above passing' },
      { label: 'Response Time', value: '< 8 sec', subtext: 'Average response' },
      { label: 'Autonomous Handling', value: '80%', subtext: 'Routine requests' },
      { label: 'Time Saved', value: '35+ hrs', subtext: 'Per HR team member/month' },
    ])
  );

  // Meet Harper quote
  children.push(...createQuoteBlock(inputs, 'meet-harper'));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ===== VALUE DRIVERS =====

  children.push(sectionHeader('Value Drivers'));

  // Use generated content if available, otherwise use template content
  // All three value drivers are always shown, with primary emphasized
  const drivers = generatedContent?.valueDriverContent?.length
    ? generatedContent.valueDriverContent.map(d => ({
        headline: d.headline,
        description: d.description,
        proof: d.proof,
        key: d.key,
        isPrimary: d.key === inputs.primaryValueDriver,
      }))
    : valueDriverContent.map(d => ({
        headline: d.headline,
        description: d.description,
        proof: d.proof,
        key: d.key,
        isPrimary: d.isPrimary,
      }));

  drivers.forEach((driver, index) => {
    // Add "PRIMARY" indicator for the emphasized value driver
    const headerText = driver.isPrimary
      ? `${index + 1}. ${driver.headline} [PRIMARY FOCUS]`
      : `${index + 1}. ${driver.headline}`;

    children.push(subheader(headerText));

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
            new TextRun({ text: 'Proof Point: ', bold: true, size: 22, font: 'Arial', color: BC }),
            new TextRun({ text: driver.proof, size: 22, font: 'Arial', color: '4B5563' }),
          ],
          spacing: { after: 400 },
          shading: { type: ShadingType.SOLID, color: driver.isPrimary ? BCL : BCL },
          indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
        })
      );
    }
  });

  // Value drivers quote
  children.push(...createQuoteBlock(inputs, 'value-drivers'));

  // ===== INVESTMENT SUMMARY =====

  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionHeader('Investment Summary'));

  // Software Investment
  children.push(subheader('Annual Software Investment'));

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

  children.push(simpleTable(investmentRows));
  children.push(new Paragraph({ spacing: { after: 400 } }));

  // ROI Breakdown
  children.push(subheader('Return on Investment'));

  children.push(
    simpleTable([
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
          text: `Annual ROI: ${formatCurrency(summary.netAnnualBenefit)}/yr  •  Payback: ${summary.paybackPeriodMonths.toFixed(1)} months  •  Gross Annual Value: ${formatCurrency(summary.grossAnnualValue)}`,
          bold: true,
          size: 26,
          color: 'FFFFFF',
          font: 'Arial',
        }),
      ],
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: BC },
      spacing: { before: 200, after: 400 },
      indent: { left: 0, right: 0 },
    })
  );

  // Investment quote
  children.push(...createQuoteBlock(inputs, 'investment'));

  // ===== WHY NOW =====

  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionHeader('Why Now'));

  const whyNowItems = generatedContent?.whyNowContent?.length
    ? generatedContent.whyNowContent
    : Object.values(WHY_NOW_CONTENT).map(item => ({ headline: item.headline, description: item.description, key: '' }));

  whyNowItems.forEach((item, index) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${index + 1}. ${item.headline}`, bold: true, size: 26, color: BC, font: 'Arial' }),
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

  // Why Now quote
  children.push(...createQuoteBlock(inputs, 'why-now'));

  // ===== NEXT STEPS =====

  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionHeader('Recommended Next Steps'));

  // Build ordered next steps
  const nsOrder = inputs.nextStepOrder && inputs.nextStepOrder.length > 0
    ? inputs.nextStepOrder
    : inputs.nextSteps;

  const orderedSteps: Array<{ id: string; title: string; description: string }> = [];
  for (const id of nsOrder) {
    const predefined = NEXT_STEPS_OPTIONS.find(s => s.id === id);
    if (predefined) {
      orderedSteps.push({ id: predefined.id, title: predefined.title, description: predefined.description });
      continue;
    }
    const custom = inputs.customNextSteps?.find(cs => cs.id === id);
    if (custom) {
      orderedSteps.push(custom);
    }
  }

  orderedSteps.forEach((step, index) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Step ${index + 1}: `, bold: true, size: 24, color: BC, font: 'Arial' }),
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

  // Security quote
  children.push(...createQuoteBlock(inputs, 'security'));

  // ===== FAQ SECTIONS =====
  // Add FAQ content after the next steps if any exist
  if (inputs.faqSections && inputs.faqSections.length > 0) {
    const allFaqs = inputs.faqSections.filter(s => s.faqs.length > 0);
    if (allFaqs.length > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(sectionHeader('Anticipated Questions'));

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Common questions from IT, finance, and executive stakeholders — and how Wisq addresses them.',
              size: 24,
              color: '6B7280',
              font: 'Arial',
            }),
          ],
          spacing: { after: 400 },
        })
      );

      const pageLabels: Record<string, string> = {
        'executive-summary': 'Executive Summary',
        'value-drivers': 'Value Drivers',
        'investment': 'Investment Case',
        'security': 'Security & Integration',
        'why-now': 'Why Now',
      };

      allFaqs.forEach((section) => {
        children.push(subheader(pageLabels[section.pageId] || section.pageId));

        section.faqs.forEach((faq, index) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Q: ${faq.question}`, bold: true, size: 22, color: '1F2937', font: 'Arial' }),
              ],
              spacing: { before: 200, after: 100 },
            })
          );
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: faq.answer, size: 22, color: '374151', font: 'Arial' }),
              ],
              spacing: { after: 250 },
              indent: { left: convertInchesToTwip(0.3) },
              border: { left: { style: BorderStyle.SINGLE, size: 8, color: 'E5E7EB' } },
            })
          );
        });
      });
    }
  }

  // ===== RFP RESPONSE APPENDIX ===== (Hidden for now - feature in development)
  // Code commented out - uncomment to re-enable
  /*
  if (inputs.rfpAppendix?.enabled && inputs.rfpAppendix.answers.length > 0) {
    const { questions, answers } = inputs.rfpAppendix;
    const questionMap = new Map(questions.map(q => [q.id, q]));

    const answersByCategory = answers.reduce((acc, answer) => {
      const question = questionMap.get(answer.questionId);
      if (!question || !question.included) return acc;
      const category = question.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push({ question, answer });
      return acc;
    }, {} as Record<RFPCategory, Array<{ question: typeof questions[0]; answer: typeof answers[0] }>>);

    const categoryOrder: RFPCategory[] = [
      'security', 'compliance', 'data_protection', 'access_control',
      'ai', 'integration', 'implementation', 'support', 'pricing',
      'company', 'other'
    ];

    const sortedCategories = Object.keys(answersByCategory)
      .sort((a, b) => categoryOrder.indexOf(a as RFPCategory) - categoryOrder.indexOf(b as RFPCategory)) as RFPCategory[];

    if (sortedCategories.length > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(sectionHeader('Appendix: RFP Response'));

      const includedAnswers = answers.filter(a => questionMap.get(a.questionId)?.included);
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Detailed responses to ${includedAnswers.length} questions`,
              size: 24, color: '6B7280', font: 'Arial',
            }),
          ],
          spacing: { after: 400 },
        })
      );

      sortedCategories.forEach((category) => {
        const items = answersByCategory[category];
        if (!items || items.length === 0) return;
        children.push(subheader(RFP_CATEGORY_LABELS[category]));

        items.forEach(({ question, answer }, index) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Q${index + 1}: `, bold: true, size: 22, color: '6B7280', font: 'Arial' }),
                new TextRun({ text: question.originalText, bold: true, size: 22, color: '1F2937', font: 'Arial' }),
              ],
              spacing: { before: 200, after: 100 },
            })
          );
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: answer.answer || '[Answer required]', size: 22, color: '374151', font: 'Arial' }),
              ],
              spacing: { after: 250 },
              indent: { left: convertInchesToTwip(0.3) },
              border: { left: { style: BorderStyle.SINGLE, size: 8, color: 'E5E7EB' } },
            })
          );
        });
        children.push(new Paragraph({ spacing: { after: 200 } }));
      });
    }
  }
  */

  // ===== FOOTER / CONTACT PAGE =====

  // Page break to give the closing section its own page
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Large spacer at top
  children.push(new Paragraph({ spacing: { after: 1500 } }));
  children.push(new Paragraph({ spacing: { after: 1500 } }));

  // CTA headline - larger and more prominent
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Ready to transform HR at your organization?",
          bold: true,
          size: 48,
          color: BC,
          font: 'Arial',
        }),
      ],
      spacing: { after: 400 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Let's connect.",
          size: 36,
          color: '4B5563',
          font: 'Arial',
        }),
      ],
      spacing: { after: 800 },
    })
  );

  // Decorative line
  children.push(
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 20, color: BC },
      },
      spacing: { after: 800 },
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
            size: 36,
            color: BC,
            font: 'Arial',
          }),
        ],
        spacing: { after: 150 },
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: aeEmail,
            size: 28,
            color: BC,
            font: 'Arial',
          }),
        ],
        spacing: { after: 800 },
      })
    );
  } else if (aeContact) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: aeContact,
            bold: true,
            size: 36,
            color: BC,
            font: 'Arial',
          }),
        ],
        spacing: { after: 800 },
      })
    );
  }

  // Large spacer before logo
  children.push(new Paragraph({ spacing: { after: 1200 } }));

  // Logo - larger in footer
  children.push(
    new Paragraph({
      children: [
        new ImageRun({
          data: logoBuffer,
          transformation: { width: 70, height: 70 },
          type: 'png',
        }),
      ],
      spacing: { after: 300 },
    })
  );

  // Website
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'wisq.com',
          bold: true,
          size: 32,
          color: BC,
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
function createSectionHeader(text: string, brandColor = '03143B'): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 40,
        color: brandColor,
        font: 'Arial',
      }),
    ],
    spacing: { before: 400, after: 300 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 8, color: brandColor },
    },
  });
}

// Helper: Create subheader
function createSubheader(text: string, brandColor = '03143B'): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
        color: brandColor,
        font: 'Arial',
      }),
    ],
    spacing: { before: 300, after: 200 },
  });
}

// Helper: Create customer quote block
function createQuoteBlock(inputs: ProposalInputs, section: QuoteSection): Paragraph[] {
  if (!inputs.selectedQuotes || inputs.selectedQuotes.length === 0) return [];
  const quote = getSelectedQuoteForSection(inputs.selectedQuotes, section);
  if (!quote) return [];
  const accentColor = (inputs.colorPalette?.accent || DEFAULT_COLOR_PALETTE.accent).replace('#', '');
  return [
    new Paragraph({ spacing: { before: 200 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: `\u201C${quote.text}\u201D`,
          italics: true,
          size: 22,
          color: '4B5563',
          font: 'Arial',
        }),
      ],
      spacing: { before: 200, after: 100 },
      border: {
        left: { style: BorderStyle.SINGLE, size: 16, color: accentColor },
      },
      indent: { left: convertInchesToTwip(0.3) },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `\u2014 ${quote.attribution}`,
          size: 20,
          color: '9CA3AF',
          font: 'Arial',
        }),
      ],
      spacing: { after: 200 },
      indent: { left: convertInchesToTwip(0.3) },
    }),
  ];
}

// Helper: Create bullet point
function createBulletPoint(text: string, brandColor = '03143B'): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: '•  ', bold: true, size: 24, color: brandColor, font: 'Arial' }),
      new TextRun({ text, size: 24, font: 'Arial' }),
    ],
    spacing: { after: 150 },
    indent: { left: convertInchesToTwip(0.3) },
  });
}

// Helper: Create metrics table (2x2 or 1x4 layout)
function createMetricsTable(metrics: { label: string; value: string; subtext?: string }[], brandColor = '03143B', brandColorLight = 'E8EAF0'): Table {
  const cells = metrics.map(metric =>
    new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: metric.value, bold: true, size: 36, color: brandColor, font: 'Arial' }),
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
      shading: { type: ShadingType.SOLID, color: brandColorLight },
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
function createSimpleTable(rows: string[][], brandColor = '03143B'): Table {
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
              color: rowIndex === 0 ? brandColor : (rowIndex % 2 === 0 ? 'F9FAFB' : 'FFFFFF'),
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
    columnWidths: [convertInchesToTwip(4.55), convertInchesToTwip(2.45)],
  });
}
