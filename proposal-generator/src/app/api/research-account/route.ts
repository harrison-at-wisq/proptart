import { NextRequest, NextResponse } from 'next/server';

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilySearchResult[];
  answer?: string;
}

async function searchTavily(query: string): Promise<TavilyResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY environment variable not set');
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      include_answer: true,
      max_results: 5,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.statusText}`);
  }

  return response.json();
}

interface ResearchRequest {
  companyName: string;
  industry?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ResearchRequest = await request.json();
    const { companyName, industry } = body;

    if (!companyName) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Run multiple searches in parallel for comprehensive research
    const searchQueries = [
      `${companyName} company overview about`,
      `${companyName} recent news 2024 2025`,
      industry ? `${companyName} ${industry} HR challenges workforce` : `${companyName} HR workforce employees`,
    ];

    const searchPromises = searchQueries.map(query =>
      searchTavily(query).catch(err => {
        console.error(`Search failed for "${query}":`, err);
        return null;
      })
    );

    const results = await Promise.all(searchPromises);
    const [companyResult, newsResult, hrResult] = results;

    // Compile research findings
    const research: {
      companyDescription?: string;
      recentNews?: { title: string; snippet: string }[];
      industryInsights?: string;
    } = {};

    // Extract company description from first search
    if (companyResult?.answer) {
      research.companyDescription = companyResult.answer;
    } else if (companyResult?.results?.[0]) {
      research.companyDescription = companyResult.results[0].content.slice(0, 500);
    }

    // Extract recent news
    if (newsResult?.results && newsResult.results.length > 0) {
      research.recentNews = newsResult.results.slice(0, 3).map(r => ({
        title: r.title,
        snippet: r.content.slice(0, 200),
      }));
    }

    // Extract HR/industry insights
    if (hrResult?.answer) {
      research.industryInsights = hrResult.answer;
    } else if (hrResult?.results?.[0]) {
      research.industryInsights = hrResult.results[0].content.slice(0, 400);
    }

    return NextResponse.json({
      success: true,
      research,
      companyName,
    });
  } catch (error) {
    console.error('Account research error:', error);
    return NextResponse.json(
      { error: 'Failed to research account. Please try again.' },
      { status: 500 }
    );
  }
}
