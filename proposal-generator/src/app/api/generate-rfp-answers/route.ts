import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { RFPQuestion, RFPAnswer, AccountResearchResult } from '@/types/proposal';
import { findKBMatch, getKBContext } from '@/lib/kb-matcher';

// Initialize OpenAI client
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable not set');
  }
  return new OpenAI({ apiKey });
}

// System prompt for RFP answer generation
const RFP_SYSTEM_PROMPT = `You are helping create answers for an RFP (Request for Proposal) response for Wisq.

ABOUT WISQ:
Wisq is an Agentic AI platform for HR and the maker of Harper, the world's first AI HR Generalist.
- Harper can handle 80% of routine HR requests autonomously
- 94% SHRM-CP accuracy (20-30 points above passing threshold)
- <8 second response time
- Integrates with major HCM systems (Workday, etc.)
- SOC 2 Type I certified, Type II scheduled
- Uses enterprise-grade AI (OpenAI, Anthropic) with zero data retention
- Data encrypted at rest (AES-256) and in transit (TLS 1.2+)
- Hosted on AWS with enterprise security controls

VOICE GUIDELINES:
- Be professional, accurate, and direct
- Provide specific details when available
- If information is uncertain or not in the knowledge base, indicate that clearly
- Do not make up specific numbers, dates, or claims not supported by the knowledge base
- Keep responses concise but complete (2-4 sentences for simple questions, up to 2 paragraphs for complex ones)
- Never use em dashes (—). Use commas, periods, or colons instead.

IMPORTANT: Only answer based on the provided knowledge base context. If the context doesn't contain relevant information, say "This information is not available in our standard documentation. Please contact Wisq directly for details."`;

interface GenerateAnswersRequest {
  questions: RFPQuestion[];
  companyContext: {
    name: string;
    industry: string;
  };
  accountResearch?: AccountResearchResult;
}

interface GenerateAnswersResponse {
  answers: RFPAnswer[];
  stats: {
    total: number;
    kbMatched: number;
    aiGenerated: number;
    needsManual: number;
  };
}

// Confidence threshold for using KB answer directly
const KB_CONFIDENCE_THRESHOLD = 0.7;
// Confidence threshold for flagging AI generation for review
const AI_REVIEW_THRESHOLD = 0.5;

export async function POST(request: Request) {
  try {
    const body: GenerateAnswersRequest = await request.json();
    const { questions, companyContext, accountResearch } = body;

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions provided' },
        { status: 400 }
      );
    }

    // Only process included questions
    const includedQuestions = questions.filter(q => q.included);

    const openai = getOpenAIClient();
    const answers: RFPAnswer[] = [];

    // Process questions in batches of 5 for efficiency
    const batchSize = 5;
    for (let i = 0; i < includedQuestions.length; i += batchSize) {
      const batch = includedQuestions.slice(i, i + batchSize);

      const batchPromises = batch.map(async (question): Promise<RFPAnswer> => {
        // Try KB match first
        const kbMatch = findKBMatch(question.originalText);

        if (kbMatch.matched && kbMatch.confidence >= KB_CONFIDENCE_THRESHOLD && kbMatch.kbEntry) {
          // High confidence KB match - use directly
          return {
            questionId: question.id,
            answer: kbMatch.kbEntry.answer,
            source: 'knowledge_base',
            confidence: kbMatch.confidence,
            kbMatchId: kbMatch.kbEntry.id,
            needsReview: kbMatch.confidence < 0.9, // Flag for review if not very high confidence
          };
        }

        // Get KB context for AI generation
        const kbContext = getKBContext(question.originalText, 3);

        if (kbContext.length === 0) {
          // No relevant KB entries - flag as needs manual
          return {
            questionId: question.id,
            answer: '',
            source: 'needs_manual',
            confidence: 0,
            needsReview: true,
          };
        }

        // Generate with AI using KB context
        try {
          const contextStr = kbContext
            .map(entry => `Q: ${entry.question}\nA: ${entry.answer}`)
            .join('\n\n');

          let prompt = `Answer this RFP question for ${companyContext.name} (${companyContext.industry} industry):

QUESTION: ${question.originalText}

RELEVANT KNOWLEDGE BASE ENTRIES:
${contextStr}

Based on the knowledge base entries above, provide a professional answer to the question. If the knowledge base doesn't contain enough information to answer confidently, indicate that clearly.`;

          if (accountResearch?.companyDescription) {
            prompt += `\n\nABOUT THE PROSPECT:\n${accountResearch.companyDescription}`;
          }

          const response = await openai.chat.completions.create({
            model: 'gpt-5.2',
            messages: [
              { role: 'system', content: RFP_SYSTEM_PROMPT },
              { role: 'user', content: prompt },
            ],
            max_tokens: 500,
            temperature: 0.3, // Lower temperature for more consistent/factual responses
          });

          const generatedAnswer = response.choices[0]?.message?.content?.trim() || '';

          // Check if AI indicated it couldn't answer
          const cannotAnswer = generatedAnswer.toLowerCase().includes('not available') ||
            generatedAnswer.toLowerCase().includes('please contact wisq') ||
            generatedAnswer.toLowerCase().includes('cannot be confirmed') ||
            generatedAnswer.length < 20;

          if (cannotAnswer) {
            return {
              questionId: question.id,
              answer: generatedAnswer || '',
              source: 'needs_manual',
              confidence: 0.2,
              needsReview: true,
            };
          }

          return {
            questionId: question.id,
            answer: generatedAnswer,
            source: 'ai_generated',
            confidence: kbMatch.confidence > 0 ? kbMatch.confidence : AI_REVIEW_THRESHOLD,
            kbMatchId: kbContext[0]?.id, // Reference the most relevant KB entry
            needsReview: true, // AI-generated always needs review
          };
        } catch (error) {
          console.error('AI generation failed for question:', question.id, error);
          return {
            questionId: question.id,
            answer: '',
            source: 'needs_manual',
            confidence: 0,
            needsReview: true,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      answers.push(...batchResults);
    }

    // Calculate stats
    const stats = {
      total: answers.length,
      kbMatched: answers.filter(a => a.source === 'knowledge_base').length,
      aiGenerated: answers.filter(a => a.source === 'ai_generated').length,
      needsManual: answers.filter(a => a.source === 'needs_manual').length,
    };

    const response: GenerateAnswersResponse = {
      answers,
      stats,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Generate RFP answers error:', error);
    return NextResponse.json(
      { error: 'Failed to generate answers' },
      { status: 500 }
    );
  }
}
