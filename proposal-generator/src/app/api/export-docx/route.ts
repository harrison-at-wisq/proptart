import { NextRequest, NextResponse } from 'next/server';
import { Packer } from 'docx';
import { generateProposalDocxWithLogo } from '@/lib/export-docx-server';
import { ProposalInputs } from '@/types/proposal';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inputs: ProposalInputs = body.inputs;

    if (!inputs) {
      return NextResponse.json(
        { error: 'Missing proposal inputs' },
        { status: 400 }
      );
    }

    // Generate the document with logo (server-side)
    const doc = await generateProposalDocxWithLogo(inputs);

    // Convert to buffer
    const buffer = await Packer.toBuffer(doc);

    // Return as downloadable file (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Wisq Proposal - ${inputs.company.companyName}.docx"`,
      },
    });
  } catch (error) {
    console.error('DOCX export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate document' },
      { status: 500 }
    );
  }
}
