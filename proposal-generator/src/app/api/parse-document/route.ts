import { NextRequest, NextResponse } from 'next/server';

// Parse PDF using pdf-parse
async function parsePDF(buffer: Buffer): Promise<string> {
  // Use dynamic require for CommonJS module compatibility
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  return data.text;
}

// Parse Word documents using mammoth
async function parseWord(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// Parse Excel files using xlsx
async function parseExcel(buffer: Buffer): Promise<string> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  const textParts: string[] = [];

  // Process each sheet
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    // Skip hidden sheets
    if (workbook.Workbook?.Sheets) {
      const sheetInfo = workbook.Workbook.Sheets.find(s => s.name === sheetName);
      if (sheetInfo?.Hidden) continue;
    }

    // Use sheet_to_json with defval to capture all cells including empty ones
    // Also use raw:false to get formatted values
    // header: 1 returns array of arrays
    const data = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: false,
    }) as (string | number | boolean | null)[][];

    if (data.length > 0) {
      textParts.push(`=== Sheet: ${sheetName} ===`);

      // Convert each row to text
      for (const row of data) {
        if (Array.isArray(row) && row.length > 0) {
          const rowText = row
            .map(cell => (cell !== null && cell !== undefined ? String(cell) : ''))
            .filter(cell => cell.trim() !== '')
            .join(' | ');
          if (rowText.trim()) {
            textParts.push(rowText);
          }
        }
      }
      textParts.push(''); // Add blank line between sheets
    }
  }

  // If no content extracted, try a more aggressive approach
  if (textParts.length === 0) {
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      // Use sheet_to_csv as fallback - captures everything
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim()) {
        textParts.push(`=== Sheet: ${sheetName} ===`);
        textParts.push(csv);
        textParts.push('');
      }
    }
  }

  return textParts.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = '';
    let fileType: 'pdf' | 'docx' | 'xlsx' | 'txt' = 'txt';

    // Determine file type and parse accordingly
    const fileName = file.name.toLowerCase();
    const mimeType = file.type;

    if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') {
      fileType = 'pdf';
      text = await parsePDF(buffer);
    } else if (
      fileName.endsWith('.docx') ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      fileType = 'docx';
      text = await parseWord(buffer);
    } else if (
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls') ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel'
    ) {
      fileType = 'xlsx';
      text = await parseExcel(buffer);
    } else if (
      fileName.endsWith('.doc') ||
      mimeType === 'application/msword'
    ) {
      return NextResponse.json(
        { error: 'Legacy .doc format not supported. Please convert to .docx or PDF.' },
        { status: 400 }
      );
    } else if (
      fileName.endsWith('.txt') ||
      mimeType === 'text/plain' ||
      mimeType.startsWith('text/')
    ) {
      fileType = 'txt';
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        { error: 'Unsupported file format. Please upload PDF, Word (.docx), Excel (.xlsx/.xls), or text files.' },
        { status: 400 }
      );
    }

    // Clean up text
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const wordCount = text.split(/\s+/).filter(Boolean).length;

    return NextResponse.json({
      success: true,
      text,
      wordCount,
      fileType,
      fileName: file.name,
    });
  } catch (error) {
    console.error('Document parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse document. Please try a different file.' },
      { status: 500 }
    );
  }
}
