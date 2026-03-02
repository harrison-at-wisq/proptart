import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { RFPQuestion, RFPCategory, UploadedDocument } from '@/types/proposal';

interface ExtractQuestionsRequest {
  documents: UploadedDocument[];
}

// Initialize OpenAI client
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable not set');
  }
  return new OpenAI({ apiKey });
}

// System prompt for question extraction
const EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting questions from RFP (Request for Proposal) and RFI (Request for Information) documents.

Your task is to identify ALL questions that require a vendor response. Questions may appear in various formats:
- Numbered questions (1., 2., etc.)
- Bulleted questions
- Questions ending with ?
- Implicit questions phrased as requests ("Please describe...", "Provide details on...")
- Questions in table cells or structured formats

For each question found, you must:
1. Extract the complete question text (do NOT include any existing answers)
2. Assign a category from this list:
   - security: Security controls, SOC 2, penetration testing, vulnerabilities
   - compliance: GDPR, CCPA, HIPAA, certifications, audits
   - ai: AI/ML capabilities, models, guardrails, accuracy
   - integration: APIs, connectors, Workday, Slack, Teams integrations
   - implementation: Deployment, onboarding, timeline, migration
   - pricing: Costs, licensing, subscription, billing
   - support: SLAs, training, documentation, customer success
   - company: Company background, founding, employees, customers
   - data_protection: Encryption, backup, retention, data handling
   - access_control: Authentication, SSO, MFA, permissions, RBAC
   - other: Anything that doesn't fit above categories

IMPORTANT:
- Extract ONLY the question portion, not any pre-filled answers
- Look for section headers that provide context for categorization
- Include ALL questions even if they seem redundant
- Preserve the original question numbering if present (include it in the question text)

Respond with a JSON array of objects with this structure:
{
  "questions": [
    {
      "text": "the complete question text",
      "category": "one of the categories listed above"
    }
  ]
}`;

// Fallback regex-based extraction for when AI is unavailable
function extractQuestionsFromTextFallback(content: string, sourceFile: string): RFPQuestion[] {
  const questions: RFPQuestion[] = [];
  const seenQuestions = new Set<string>();
  const lines = content.split(/\n+/);

  // Patterns to detect questions
  const questionPatterns = [
    /^(\d+)\s*\|\s*([^|]+\?)/,  // Numbered with pipe: "1 | Question?"
    /^(\d+)[\.\)]\s*(.+\?)/,    // Numbered: "1. Question?" or "1) Question?"
    /^[a-zA-Z][\.\)]\s*(.+\?)/,  // Lettered: "a. Question?"
    /^[-•*]\s*(.+\?)/,           // Bulleted
    /^(.+\?)\s*$/,               // Any line ending with ?
  ];

  const implicitPatterns = [
    /^(?:please\s+)?(?:describe|explain|provide|detail|outline|specify|list|identify)\s+(.+)/i,
    /^(?:what|how|who|where|when|why|which|can|do|does|is|are|will|would|should|could)\s+.+/i,
  ];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.length < 15) continue;

    let questionText: string | null = null;

    // Try question patterns
    for (const pattern of questionPatterns) {
      const match = trimmedLine.match(pattern);
      if (match) {
        questionText = match[2] || match[1] || trimmedLine;
        break;
      }
    }

    // Try implicit patterns
    if (!questionText) {
      for (const pattern of implicitPatterns) {
        if (pattern.test(trimmedLine)) {
          questionText = trimmedLine;
          break;
        }
      }
    }

    if (questionText) {
      questionText = questionText.trim();
      if (questionText.length < 15) continue;

      const normalizedQ = questionText.toLowerCase().replace(/[^\w\s]/g, '');
      if (seenQuestions.has(normalizedQ)) continue;
      seenQuestions.add(normalizedQ);

      questions.push({
        id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        originalText: questionText,
        category: categorizeQuestion(questionText),
        sourceFile,
        included: true,
      });
    }
  }

  return questions;
}

// Keyword-based categorization fallback
function categorizeQuestion(text: string): RFPCategory {
  const lowerText = text.toLowerCase();

  const categoryKeywords: Record<RFPCategory, RegExp[]> = {
    security: [/security/i, /soc\s*2/i, /penetration/i, /vulnerability/i, /breach/i, /threat/i, /cyber/i],
    compliance: [/compliance/i, /gdpr/i, /ccpa/i, /hipaa/i, /regulation/i, /audit/i, /certification/i],
    ai: [/\bai\b/i, /machine\s*learning/i, /\bllm\b/i, /agent/i, /predict/i, /artificial\s*intelligence/i],
    integration: [/integrat/i, /\bapi\b/i, /workday/i, /slack/i, /teams/i, /connect/i, /\bsso\b/i],
    implementation: [/implement/i, /deploy/i, /onboard/i, /timeline/i, /setup/i, /go-live/i],
    pricing: [/price/i, /cost/i, /pricing/i, /license/i, /subscription/i, /billing/i],
    support: [/support/i, /\bsla\b/i, /training/i, /documentation/i, /customer\s*success/i],
    company: [/company/i, /founded/i, /employee/i, /customer/i, /origin/i, /background/i],
    data_protection: [/encrypt/i, /backup/i, /retention/i, /data\s*protection/i, /\bpii\b/i],
    access_control: [/access/i, /authentication/i, /password/i, /\bmfa\b/i, /permission/i, /\brbac\b/i],
    other: [],
  };

  for (const [category, patterns] of Object.entries(categoryKeywords)) {
    if (category === 'other') continue;
    for (const pattern of patterns) {
      if (pattern.test(lowerText)) {
        return category as RFPCategory;
      }
    }
  }

  return 'other';
}

// AI-powered question extraction for a single chunk
async function extractQuestionsFromChunk(
  content: string,
  sourceFile: string,
  openai: OpenAI,
  chunkInfo: string = ''
): Promise<RFPQuestion[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-5.2',
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Extract all RFP/RFI questions from this document${chunkInfo}. Return ONLY the JSON response, no other text.\n\nDocument content:\n${content}`
      },
    ],
    max_tokens: 8000,
    temperature: 0.1, // Low temperature for consistent extraction
  });

  const responseText = response.choices[0]?.message?.content?.trim() || '';

  // Parse JSON response - handle potential markdown code blocks
  let jsonText = responseText;
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const parsed = JSON.parse(jsonText);
    const questions: RFPQuestion[] = [];

    if (Array.isArray(parsed.questions)) {
      for (const q of parsed.questions) {
        if (q.text && typeof q.text === 'string' && q.text.length >= 10) {
          questions.push({
            id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            originalText: q.text.trim(),
            category: (q.category as RFPCategory) || 'other',
            sourceFile,
            included: true,
          });
        }
      }
    }

    return questions;
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError, 'Response:', responseText.substring(0, 500));
    throw new Error('Failed to parse AI response');
  }
}

// AI-powered question extraction with chunking for large documents
async function extractQuestionsWithAI(
  content: string,
  sourceFile: string,
  openai: OpenAI
): Promise<RFPQuestion[]> {
  const CHUNK_SIZE = 28000; // Safe chunk size leaving room for system prompt

  // If content fits in one chunk, process directly
  if (content.length <= CHUNK_SIZE) {
    return extractQuestionsFromChunk(content, sourceFile, openai);
  }

  // Split content into chunks at line boundaries
  const lines = content.split('\n');
  const chunks: string[] = [];
  let currentChunk = '';

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > CHUNK_SIZE) {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = line;
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  // Process all chunks in parallel
  const chunkPromises = chunks.map((chunk, index) =>
    extractQuestionsFromChunk(
      chunk,
      sourceFile,
      openai,
      ` (part ${index + 1} of ${chunks.length})`
    )
  );

  const results = await Promise.all(chunkPromises);
  return results.flat();
}

export async function POST(request: Request) {
  try {
    const body: ExtractQuestionsRequest = await request.json();
    const { documents } = body;

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'No documents provided' },
        { status: 400 }
      );
    }

    let useAI = true;
    let openai: OpenAI | null = null;

    try {
      openai = getOpenAIClient();
    } catch {
      console.warn('OpenAI API not configured, falling back to regex extraction');
      useAI = false;
    }

    const allQuestions: RFPQuestion[] = [];

    for (const doc of documents) {
      if (!doc.content) continue;

      let questions: RFPQuestion[];

      if (useAI && openai) {
        try {
          questions = await extractQuestionsWithAI(doc.content, doc.name, openai);
        } catch (aiError) {
          console.error('AI extraction failed, falling back to regex:', aiError);
          questions = extractQuestionsFromTextFallback(doc.content, doc.name);
        }
      } else {
        questions = extractQuestionsFromTextFallback(doc.content, doc.name);
      }

      allQuestions.push(...questions);
    }

    // Deduplicate questions
    const seen = new Set<string>();
    const uniqueQuestions = allQuestions.filter(q => {
      const normalized = q.originalText.toLowerCase().replace(/[^\w\s]/g, '').substring(0, 100);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });

    // Sort by category for better organization
    const categoryOrder: RFPCategory[] = [
      'company', 'ai', 'integration', 'implementation',
      'security', 'compliance', 'data_protection', 'access_control',
      'support', 'pricing', 'other'
    ];

    uniqueQuestions.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);
      return aIndex - bIndex;
    });

    return NextResponse.json({
      questions: uniqueQuestions,
      totalExtracted: uniqueQuestions.length,
      byCategory: uniqueQuestions.reduce((acc, q) => {
        acc[q.category] = (acc[q.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      extractionMethod: useAI ? 'ai' : 'regex',
    });
  } catch (error) {
    console.error('Question extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract questions' },
      { status: 500 }
    );
  }
}
