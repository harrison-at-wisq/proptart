import { NextRequest, NextResponse } from 'next/server';
import { Packer } from 'docx';
import { generateMOUDocx } from '@/lib/export-mou-docx-server';
import { MOUInputs } from '@/types/mou';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inputs: MOUInputs = body.inputs;

    if (!inputs) {
      return NextResponse.json(
        { error: 'Missing MOU inputs' },
        { status: 400 }
      );
    }

    const doc = await generateMOUDocx(inputs);
    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Wisq MOU - ${inputs.company.companyName || 'Draft'}.docx"`,
      },
    });
  } catch (error) {
    console.error('MOU DOCX export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate document' },
      { status: 500 }
    );
  }
}
