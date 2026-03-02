import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  FAQSection,
  FAQPageId,
  FAQ_PAGE_LABELS,
  VALUE_DRIVER_LABELS,
  PAIN_POINT_LABELS,
} from '@/types/proposal';

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable not set');
  }
  return new OpenAI({ apiKey });
}

const BRAND_VOICE_PROMPT = `You create executive-level HR technology proposals for Wisq.

VOICE: Confident not arrogant, human-centered not cold, expert not jargon-heavy
USE: "AI teammate", "transform", "enable", "purpose-built"
AVOID: "chatbot", "leverage", "synergy", "revolutionary", "cutting-edge", "game-changer"
FORMATTING: Never use em dashes (—). Use commas, periods, or colons instead.
HARPER: Wisq's AI is named Harper. She is an "AI HR Generalist". Always refer to Harper as she/her.

PROOF POINTS:
- 94% SHRM-CP accuracy (20-30 points above passing threshold)
- <8 second response time
- 80% routine requests handled autonomously
- 35+ hours saved per HR team member monthly

Keep content concise and executive-appropriate. Focus on business impact, not technical features.`;

interface GenerateFAQsRequest {
  proposalInputs: {
    company: {
      companyName: string;
      industry: string;
      contactName: string;
      contactTitle: string;
      contactEmail: string;
      employeeCount?: string;
    };
    pricing?: {
      tier?: string;
      employeeCount?: number;
    };
    painPoints: string[];
    integrations?: Record<string, string>;
    primaryValueDriver?: string;
  };
  dealContext?: string;
  gongNotes?: string;
}

const PAGE_IDS: FAQPageId[] = ['executive-summary', 'value-drivers', 'investment', 'security', 'why-now'];

export async function POST(request: NextRequest) {
  try {
    const body: GenerateFAQsRequest = await request.json();
    const { proposalInputs, dealContext, gongNotes } = body;

    if (!proposalInputs?.company) {
      return NextResponse.json(
        { error: 'Missing proposal inputs' },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();
    const { company, painPoints, primaryValueDriver, pricing, integrations } = proposalInputs;

    let contextBlock = '';

    if (dealContext) {
      contextBlock += `\n\nHUBSPOT DEAL CONTEXT (use this to anticipate deal-specific questions):\n${dealContext.slice(0, 4000)}`;
    }

    if (gongNotes) {
      contextBlock += `\n\nGONG CALL NOTES (use these to anticipate questions the prospect has already raised or hinted at):\n${gongNotes.slice(0, 4000)}`;
    }

    const systemPrompt = BRAND_VOICE_PROMPT + contextBlock;

    const painPointsList = painPoints
      .map((p) => {
        const label = PAIN_POINT_LABELS[p as keyof typeof PAIN_POINT_LABELS];
        return label ? `- ${label}` : `- ${p}`;
      })
      .join('\n');

    const integrationsList = integrations
      ? Object.entries(integrations)
          .filter(([, v]) => v)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join('\n')
      : 'None specified';

    const prompt = `Generate anticipated FAQ questions and answers for a Wisq proposal to ${company.companyName}, a ${company.industry} company${company.employeeCount ? ` with ${company.employeeCount} employees` : ''}.

Contact: ${company.contactName}, ${company.contactTitle}
${primaryValueDriver ? `Primary value driver: ${VALUE_DRIVER_LABELS[primaryValueDriver as keyof typeof VALUE_DRIVER_LABELS] || primaryValueDriver}` : ''}

Their pain points:
${painPointsList}

Their integrations:
${integrationsList}

${pricing?.tier ? `Pricing tier: ${pricing.tier}` : ''}

Generate 2-3 FAQs for EACH of these proposal sections. These should be questions the prospect is likely to ask, with concise, compelling answers that address concerns and reinforce Wisq's value.

The sections and what each covers:
1. "executive-summary" (${FAQ_PAGE_LABELS['executive-summary']}): Overall Wisq value proposition, why this partnership makes sense
2. "value-drivers" (${FAQ_PAGE_LABELS['value-drivers']}): Cost reduction, compliance, employee care — the three pillars
3. "investment" (${FAQ_PAGE_LABELS['investment']}): Pricing, ROI, total cost of ownership, payback period
4. "security" (${FAQ_PAGE_LABELS['security']}): Data security, SOC 2, integrations, implementation timeline
5. "why-now" (${FAQ_PAGE_LABELS['why-now']}): Urgency, competitive landscape, cost of delay

Tailor questions to what a ${company.contactTitle} at a ${company.industry} company would actually ask. If deal context or call notes are provided, use them to make questions more specific to this prospect's real concerns.

Return a JSON array:
[
  {
    "pageId": "executive-summary",
    "faqs": [
      { "question": "How does Wisq differ from...", "answer": "..." },
      { "question": "...", "answer": "..." }
    ]
  },
  {
    "pageId": "value-drivers",
    "faqs": [...]
  },
  {
    "pageId": "investment",
    "faqs": [...]
  },
  {
    "pageId": "security",
    "faqs": [...]
  },
  {
    "pageId": "why-now",
    "faqs": [...]
  }
]

Questions should be 1 sentence. Answers should be 2-3 sentences max. Be specific to ${company.companyName}, not generic.`;

    const result = await openai.chat.completions.create({
      model: 'gpt-5.2',
      max_completion_tokens: 3000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    });

    const responseText = result.choices[0]?.message?.content || '';

    // Parse JSON from response
    let faqSections: FAQSection[];
    try {
      const jsonMatch =
        responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
        responseText.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch?.[1] || jsonMatch?.[0] || responseText;
      const parsed = JSON.parse(jsonStr);

      // Validate and filter to known page IDs
      faqSections = parsed
        .filter((s: { pageId: string }) => PAGE_IDS.includes(s.pageId as FAQPageId))
        .map((s: { pageId: FAQPageId; faqs: { question: string; answer: string }[] }) => ({
          pageId: s.pageId,
          faqs: (s.faqs || []).map((f: { question: string; answer: string }) => ({
            question: f.question || '',
            answer: f.answer || '',
          })),
        }));
    } catch (e) {
      console.error('Failed to parse FAQ response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse generated FAQs. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ faqSections });
  } catch (error) {
    console.error('FAQ generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate FAQs. Please try again.' },
      { status: 500 }
    );
  }
}
