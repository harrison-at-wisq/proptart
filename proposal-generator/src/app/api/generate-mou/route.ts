import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { MOUInputs, MOUGeneratedContent } from '@/types/mou';

// Initialize OpenAI client
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable not set');
  }
  return new OpenAI({ apiKey });
}

const BRAND_VOICE_PROMPT = `You create executive-level Memorandums of Understanding (MOUs) for Wisq.

VOICE: Confident not arrogant, human-centered not cold, expert not jargon-heavy
USE: "AI teammate", "transform", "enable", "purpose-built"
AVOID: "chatbot", "leverage", "synergy", "revolutionary", "cutting-edge", "game-changer"
FORMATTING: Never use em dashes (—). Use commas, periods, or colons instead.
HARPER: Wisq's AI is named Harper. She is an "AI HR Generalist". Always refer to Harper as she/her.

WISQ'S THREE VALUE PILLARS (the 3 C's):
1. Cost: Reduce Your Cost of HR. Transform the economics of HR operations & service.
2. Compliance: Compliant Responses You Can Defend. Reduce compliance risk, headache, and legal costs.
3. Care: Deliver Personal Care at Scale. Instant, accurate, enterprise-wide, white-glove employee support.

PROOF POINTS:
- 94% SHRM-CP accuracy (20-30 points above passing threshold)
- <8 second response time
- 80% routine requests handled autonomously
- 35+ hours saved per HR team member monthly

Keep content concise and executive-appropriate. Focus on business impact, not technical features.`;

interface GenerateMOURequest {
  inputs: MOUInputs;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateMOURequest = await request.json();
    const { inputs } = body;

    if (!inputs?.callTranscripts) {
      return NextResponse.json(
        { error: 'Missing call transcripts' },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();
    const { company, callTranscripts, salesNotes } = inputs;

    const userPrompt = `Analyze the following call transcript and generate a Memorandum of Understanding for ${company.companyName || 'this prospect'}.

COMPANY CONTEXT:
- Company: ${company.companyName || 'Unknown'}
- Contact: ${company.contactName || 'Unknown'} (${company.contactTitle || 'Unknown'})
- Industry: ${company.industry || 'Unknown'}

CALL TRANSCRIPT / NOTES:
${callTranscripts.slice(0, 12000)}

${salesNotes ? `ADDITIONAL SALES NOTES:\n${salesNotes.slice(0, 3000)}` : ''}

Based on what was discussed, generate a JSON response with this exact structure:
{
  "situationSummary": "2-3 paragraphs summarizing what we understand about their business, current HR challenges, and what prompted them to explore solutions like Wisq. Be specific — reference details from the transcript. Write as if speaking directly to them: 'Based on our conversation...'",
  "challenges": [
    {
      "headline": "Short challenge headline (4-8 words)",
      "detail": "1-2 sentences explaining this specific challenge as discussed in the call"
    }
  ],
  "valueAlignment": [
    {
      "driver": "cost|compliance|care",
      "headline": "How Wisq addresses this (4-8 words)",
      "description": "2-3 sentences connecting Wisq's capability to their specific situation. Reference what they said in the call."
    }
  ],
  "proposedNextSteps": [
    {
      "title": "Step title (3-6 words)",
      "description": "1-2 sentences about this step"
    }
  ],
  "closingStatement": "2-3 sentences: forward-looking, confident, referencing the partnership potential. Personalize to their company."
}

REQUIREMENTS:
- challenges: Extract 3-5 real challenges from the transcript. Don't invent — synthesize what was actually discussed.
- valueAlignment: Map to exactly 3 items, one for each of Wisq's value pillars (cost, compliance, care). Connect each to what was discussed. Lead with whichever pillar was most relevant to the conversation.
- proposedNextSteps: Suggest 3-4 concrete next steps appropriate for this stage of the conversation.
- Be specific and reference actual details from the conversation. No generic filler.`;

    const result = await openai.chat.completions.create({
      model: 'gpt-5.2',
      max_tokens: 3000,
      messages: [
        { role: 'system', content: BRAND_VOICE_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const responseText = result.choices[0]?.message?.content || '';

    // Parse JSON from response
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*\}/);
    let parsed;
    try {
      const jsonStr = jsonMatch?.[1] || jsonMatch?.[0] || responseText;
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse MOU response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      );
    }

    const generatedContent: MOUGeneratedContent = {
      situationSummary: parsed.situationSummary || '',
      challenges: parsed.challenges || [],
      valueAlignment: parsed.valueAlignment || [],
      proposedNextSteps: parsed.proposedNextSteps || [],
      closingStatement: parsed.closingStatement || '',
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      content: generatedContent,
    });
  } catch (error) {
    console.error('MOU generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate MOU content. Please try again.' },
      { status: 500 }
    );
  }
}
