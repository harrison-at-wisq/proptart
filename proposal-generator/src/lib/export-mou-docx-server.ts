import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  convertInchesToTwip,
  BorderStyle,
  ImageRun,
  PageBreak,
} from 'docx';
import { MOUInputs, MOU_VALUE_DRIVER_LABELS } from '@/types/mou';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const BRAND_COLOR = '03143B';
const ACCENT_COLOR = '4d65ff';

async function getLogoPngBuffer(): Promise<Buffer> {
  const svgPath = path.join(process.cwd(), 'public', 'wisq-logo.svg');
  const svgBuffer = fs.readFileSync(svgPath);
  const pngBuffer = await sharp(svgBuffer)
    .resize(100, 100)
    .png()
    .toBuffer();
  return pngBuffer;
}

export async function generateMOUDocx(inputs: MOUInputs): Promise<Document> {
  const logoBuffer = await getLogoPngBuffer();
  const generated = inputs.generatedContent;
  const overrides = inputs.contentOverrides || {};

  const company = inputs.company;
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const children: Paragraph[] = [];

  // Helper: resolve override > generated
  const resolve = (override: string | undefined, fallback: string) =>
    override || fallback || '';

  // ===== COVER PAGE =====

  children.push(new Paragraph({ spacing: { after: 800 } }));

  // Logo
  children.push(
    new Paragraph({
      children: [
        new ImageRun({
          data: logoBuffer,
          transformation: { width: 80, height: 80 },
          type: 'png',
        }),
      ],
      spacing: { after: 600 },
    })
  );

  // Document type label
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'MEMORANDUM OF UNDERSTANDING',
          font: 'Arial',
          size: 20,
          color: ACCENT_COLOR,
          bold: true,
        }),
      ],
      spacing: { after: 200 },
    })
  );

  // Company name
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: company.companyName || 'Draft',
          font: 'Arial',
          size: 52,
          color: BRAND_COLOR,
          bold: true,
        }),
      ],
      spacing: { after: 100 },
    })
  );

  // Accent line
  children.push(
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT_COLOR },
      },
      spacing: { after: 300 },
    })
  );

  // Subtitle
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'A summary of our discussion and proposed path forward',
          font: 'Arial',
          size: 24,
          color: '666666',
          italics: true,
        }),
      ],
      spacing: { after: 800 },
    })
  );

  // Contact info
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: company.contactName || '', font: 'Arial', size: 22, bold: true, color: BRAND_COLOR }),
      ],
    })
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: company.contactTitle || '', font: 'Arial', size: 20, color: '666666' }),
      ],
    })
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: company.companyName || '', font: 'Arial', size: 20, color: '666666' }),
      ],
      spacing: { after: 200 },
    })
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: today, font: 'Arial', size: 20, color: '999999' }),
      ],
      spacing: { after: 200 },
    })
  );
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ===== WHAT WE HEARD =====

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'UNDERSTANDING YOUR BUSINESS',
          font: 'Arial',
          size: 14,
          color: ACCENT_COLOR,
          bold: true,
        }),
      ],
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'What We Heard',
          font: 'Arial',
          size: 32,
          color: BRAND_COLOR,
          bold: true,
        }),
      ],
      spacing: { after: 300 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' },
      },
    })
  );

  // Situation summary
  if (generated) {
    const summary = resolve(overrides.situationSummary, generated.situationSummary);
    const paragraphs = summary.split('\n\n').filter(Boolean);
    for (const para of paragraphs) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: para.trim(), font: 'Arial', size: 22, color: '374151' }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    // Challenges
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Key Challenges Identified',
            font: 'Arial',
            size: 26,
            color: BRAND_COLOR,
            bold: true,
          }),
        ],
        spacing: { before: 300, after: 200 },
      })
    );

    generated.challenges.forEach((challenge, i) => {
      const headline = resolve(overrides.challenges?.[i]?.headline, challenge.headline);
      const detail = resolve(overrides.challenges?.[i]?.detail, challenge.detail);

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. `, font: 'Arial', size: 22, bold: true, color: BRAND_COLOR }),
            new TextRun({ text: headline, font: 'Arial', size: 22, bold: true, color: '111827' }),
          ],
          spacing: { before: 150, after: 50 },
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: detail, font: 'Arial', size: 20, color: '4B5563' }),
          ],
          spacing: { after: 100 },
          indent: { left: convertInchesToTwip(0.3) },
        })
      );
    });

    // Page break
    children.push(new Paragraph({ children: [new PageBreak()] }));

    // ===== HOW WISQ CAN HELP =====

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'VALUE ALIGNMENT',
            font: 'Arial',
            size: 14,
            color: ACCENT_COLOR,
            bold: true,
          }),
        ],
        spacing: { after: 100 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'How Wisq Can Help',
            font: 'Arial',
            size: 32,
            color: BRAND_COLOR,
            bold: true,
          }),
        ],
        spacing: { after: 300 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' },
        },
      })
    );

    generated.valueAlignment.forEach((item, i) => {
      const driverLabel = MOU_VALUE_DRIVER_LABELS[item.driver] || item.driver;
      const headline = resolve(overrides.valueAlignment?.[i]?.headline, item.headline);
      const description = resolve(overrides.valueAlignment?.[i]?.description, item.description);

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: driverLabel.toUpperCase(),
              font: 'Arial',
              size: 16,
              color: ACCENT_COLOR,
              bold: true,
            }),
          ],
          spacing: { before: 300, after: 50 },
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: headline, font: 'Arial', size: 24, bold: true, color: BRAND_COLOR }),
          ],
          spacing: { after: 100 },
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: description, font: 'Arial', size: 20, color: '4B5563' }),
          ],
          spacing: { after: 200 },
          indent: { left: convertInchesToTwip(0.2) },
        })
      );
    });

    // Page break
    children.push(new Paragraph({ children: [new PageBreak()] }));

    // ===== PROPOSED NEXT STEPS =====

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'MOVING FORWARD TOGETHER',
            font: 'Arial',
            size: 14,
            color: ACCENT_COLOR,
            bold: true,
          }),
        ],
        spacing: { after: 100 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Proposed Next Steps',
            font: 'Arial',
            size: 32,
            color: BRAND_COLOR,
            bold: true,
          }),
        ],
        spacing: { after: 300 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' },
        },
      })
    );

    generated.proposedNextSteps.forEach((step, i) => {
      const title = resolve(overrides.proposedNextSteps?.[i]?.title, step.title);
      const description = resolve(overrides.proposedNextSteps?.[i]?.description, step.description);

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Step ${i + 1}: `, font: 'Arial', size: 22, bold: true, color: ACCENT_COLOR }),
            new TextRun({ text: title, font: 'Arial', size: 22, bold: true, color: '111827' }),
          ],
          spacing: { before: 200, after: 50 },
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: description, font: 'Arial', size: 20, color: '4B5563' }),
          ],
          spacing: { after: 150 },
          indent: { left: convertInchesToTwip(0.3) },
        })
      );
    });

    // ===== CLOSING =====

    children.push(
      new Paragraph({
        border: {
          left: { style: BorderStyle.SINGLE, size: 8, color: ACCENT_COLOR },
        },
        children: [
          new TextRun({
            text: resolve(overrides.closingStatement, generated.closingStatement),
            font: 'Arial',
            size: 22,
            italics: true,
            color: '374151',
          }),
        ],
        spacing: { before: 400, after: 400 },
        indent: { left: convertInchesToTwip(0.3) },
      })
    );
  }

  // Footer
  children.push(
    new Paragraph({
      border: {
        top: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' },
      },
      spacing: { before: 300, after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new ImageRun({
          data: logoBuffer,
          transformation: { width: 40, height: 40 },
          type: 'png',
        }),
      ],
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'wisq.ai', font: 'Arial', size: 18, color: '9CA3AF' }),
      ],
      alignment: AlignmentType.LEFT,
    })
  );

  return new Document({
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
