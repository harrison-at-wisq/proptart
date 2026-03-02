import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  ProposalInputs,
  GeneratedProposalContent,
  VALUE_DRIVER_LABELS,
  VALUE_DRIVERS,
  PAIN_POINT_LABELS,
} from '@/types/proposal';

// Initialize OpenAI client
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable not set');
  }
  return new OpenAI({ apiKey });
}

// Brand voice system prompt
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

interface GenerateContentRequest {
  inputs: ProposalInputs;
  customInstructions?: string;
  documentContext?: string;
  accountResearch?: {
    companyDescription?: string;
    recentNews?: { title: string; snippet: string }[];
    industryInsights?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateContentRequest = await request.json();
    const { inputs, customInstructions, documentContext, accountResearch } = body;

    if (!inputs) {
      return NextResponse.json(
        { error: 'Missing proposal inputs' },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();
    const { company, primaryValueDriver, painPoints } = inputs;

    // Build comprehensive context
    let additionalContext = '';

    if (documentContext) {
      additionalContext += `\n\nRFI/RFP DOCUMENT CONTEXT (use this to tailor the proposal to their specific requirements):\n${documentContext.slice(0, 6000)}`;
    }

    if (accountResearch) {
      if (accountResearch.companyDescription) {
        additionalContext += `\n\nCOMPANY BACKGROUND:\n${accountResearch.companyDescription}`;
      }
      if (accountResearch.recentNews && accountResearch.recentNews.length > 0) {
        additionalContext += `\n\nRECENT NEWS:\n${accountResearch.recentNews.map(n => `- ${n.title}: ${n.snippet}`).join('\n')}`;
      }
      if (accountResearch.industryInsights) {
        additionalContext += `\n\nINDUSTRY INSIGHTS:\n${accountResearch.industryInsights}`;
      }
    }

    if (customInstructions) {
      additionalContext += `\n\nSPECIAL INSTRUCTIONS FROM USER:\n${customInstructions}`;
    }

    const systemPrompt = BRAND_VOICE_PROMPT + additionalContext;

    // Generate Executive Summary content
    const primaryDriverText = primaryValueDriver
      ? `\n\nTheir primary focus: ${VALUE_DRIVER_LABELS[primaryValueDriver]}`
      : '';

    const execSummaryPrompt = `Generate personalized executive summary content for a Wisq proposal to ${company.companyName}, a ${company.industry} company.

Contact: ${company.contactName}, ${company.contactTitle}
Email: ${company.contactEmail}

Their pain points:
${painPoints.map((p) => `- ${PAIN_POINT_LABELS[p]}`).join('\n')}

Wisq's three value pillars (always included):
${VALUE_DRIVERS.map((v) => `- ${VALUE_DRIVER_LABELS[v]}`).join('\n')}${primaryDriverText}

Generate a JSON response with:
{
  "insight": "1-2 sentence industry-specific insight about their HR challenges (personalized to this company)",
  "vision": "A compelling 'What if' question that paints the future with Wisq (1 sentence)",
  "bullets": ["bullet 1 (5-8 words)", "bullet 2 (5-8 words)", "bullet 3 (5-8 words)"]
}

Make it specific to ${company.companyName}, not generic. Reference their industry and pain points.${primaryDriverText ? ' Emphasize the primary focus area.' : ''}`;

    // Generate Value Driver content
    const valueDriverPrompt = `Generate personalized value driver content for a Wisq proposal to ${company.companyName}.

Wisq's three value pillars (always include all three):
1. Cost - "Reduce Your Cost of HR" - Transform the economics of HR operations
2. Compliance - "Compliant Responses You Can Defend" - Reduce compliance risk and legal costs
3. Care - "Deliver Personal Care at Scale" - Instant, accurate, white-glove employee support
${primaryValueDriver ? `\nPrimary focus: ${VALUE_DRIVER_LABELS[primaryValueDriver]} - give this one extra emphasis` : ''}

Their pain points for context:
${painPoints.map((p) => `- ${PAIN_POINT_LABELS[p]}`).join('\n')}

Generate a JSON array with all 3 value drivers${primaryValueDriver ? `, with ${VALUE_DRIVER_LABELS[primaryValueDriver]} listed first` : ''}. Each should have:
[
  {
    "key": "cost|compliance|care",
    "headline": "Compelling headline (4-6 words)",
    "description": "2-3 sentences explaining the value, personalized to ${company.companyName}",
    "proof": "A specific proof point or stat"
  }
]

Make each one relevant to a ${company.industry} company.`;

    // Generate Why Now content
    const whyNowPrompt = `Generate personalized "Why Now" urgency content for a Wisq proposal to ${company.companyName}, a ${company.industry} company.

Generate a JSON array with 4 reasons to act now:
[
  {
    "key": "costOfDelay",
    "headline": "Short headline (3-5 words)",
    "description": "1-2 sentences about the cost of waiting, personalized to their situation"
  },
  {
    "key": "aiMomentum",
    "headline": "Short headline about AI adoption (3-5 words)",
    "description": "1-2 sentences about AI transformation in HR"
  },
  {
    "key": "quickWins",
    "headline": "Short headline about fast results (3-5 words)",
    "description": "1-2 sentences about quick time-to-value"
  },
  {
    "key": "competitivePressure",
    "headline": "Short headline about competition (3-5 words)",
    "description": "1-2 sentences about what competitors are doing in ${company.industry}"
  }
]`;

    // Generate Vision content
    const visionPrompt = `Generate a forward-looking "Future Vision" section for a Wisq proposal to ${company.companyName}, a ${company.industry} company with ${company.contactName} (${company.contactTitle}) as the primary contact.

Their pain points:
${painPoints.map((p) => `- ${PAIN_POINT_LABELS[p]}`).join('\n')}

TONE & APPROACH:
This section should cast a compelling vision for the future of HR at this company. The tone should be:
- Forward-thinking and inspiring, written for senior HR executives
- Acknowledge the reality that HR teams are buried in operational work — triage, inboxes, repetitive cases
- Frame AI not as a cost-cutting play but as an unlock for entirely new HR capabilities
- Reference (casually, not as hard metrics) that organizations working with Wisq have seen dramatic reductions in routine caseloads and processing times
- Paint a picture of the NEW work that emerges when operational burden drops: AI knowledge management, agentic workflow design, human-agent team leadership, HR becoming the function that teaches the rest of the company how to work with AI
- End with a transformation framing: not HR with more free time, but HR with a fundamentally different and more interesting job

Personalize to ${company.companyName}'s industry (${company.industry}) and their specific pain points. Reference the kinds of operational challenges they likely face.

Generate a JSON response:
{
  "intro": "2-3 sentences that open with a provocative question or observation about the HR capacity problem, personalized to ${company.industry}. Should hook a CHRO.",
  "calloutQuote": "2-3 sentences referencing real outcomes casually (e.g. dramatic drops in routine cases, processing times going from days to hours). Frame as what changes when HR demand drops significantly — it's not just more time, it changes what the function can do.",
  "pillars": [
    {
      "heading": "Short heading for emerging capability 1 (3-6 words)",
      "body": "2-3 sentences about this new type of HR work, personalized to ${company.industry}"
    },
    {
      "heading": "Short heading for emerging capability 2 (3-6 words)",
      "body": "2-3 sentences about this new type of HR work"
    },
    {
      "heading": "Short heading for emerging capability 3 (3-6 words)",
      "body": "2-3 sentences about this new type of HR work"
    }
  ],
  "closing": "2-3 sentences with transformation framing. End with something specific to ${company.companyName} — what this partnership is really about building together."
}`;

    // Run all generations in parallel using OpenAI
    const [execSummaryResult, valueDriverResult, whyNowResult, visionResult] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-5.2',
        max_completion_tokens: 1000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: execSummaryPrompt },
        ],
      }),
      openai.chat.completions.create({
        model: 'gpt-5.2',
        max_completion_tokens: 1500,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: valueDriverPrompt },
        ],
      }),
      openai.chat.completions.create({
        model: 'gpt-5.2',
        max_completion_tokens: 1500,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: whyNowPrompt },
        ],
      }),
      openai.chat.completions.create({
        model: 'gpt-5.2',
        max_completion_tokens: 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: visionPrompt },
        ],
      }),
    ]);

    // Parse responses
    const parseJSON = (text: string) => {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      return JSON.parse(text);
    };

    const execSummaryText = execSummaryResult.choices[0]?.message?.content || '';
    const valueDriverText = valueDriverResult.choices[0]?.message?.content || '';
    const whyNowText = whyNowResult.choices[0]?.message?.content || '';
    const visionText = visionResult.choices[0]?.message?.content || '';

    let execSummary, valueDriverContent, whyNowContent, visionContent;

    try {
      execSummary = parseJSON(execSummaryText);
    } catch (e) {
      console.error('Failed to parse exec summary:', execSummaryText);
      execSummary = { insight: '', vision: '', bullets: [] };
    }

    try {
      valueDriverContent = parseJSON(valueDriverText);
    } catch (e) {
      console.error('Failed to parse value drivers:', valueDriverText);
      valueDriverContent = [];
    }

    try {
      whyNowContent = parseJSON(whyNowText);
    } catch (e) {
      console.error('Failed to parse why now:', whyNowText);
      whyNowContent = [];
    }

    try {
      visionContent = parseJSON(visionText);
    } catch (e) {
      console.error('Failed to parse vision:', visionText);
      visionContent = undefined;
    }

    const generatedContent: GeneratedProposalContent = {
      execSummaryInsight: execSummary.insight,
      execSummaryVision: execSummary.vision,
      execSummaryBullets: execSummary.bullets,
      valueDriverContent: valueDriverContent,
      whyNowContent: whyNowContent,
      visionContent: visionContent,
      accountResearch: accountResearch,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      content: generatedContent,
    });
  } catch (error) {
    console.error('Content generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content. Please try again.' },
      { status: 500 }
    );
  }
}
