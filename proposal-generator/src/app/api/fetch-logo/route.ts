import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

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

function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

async function findCompanyDomain(companyName: string): Promise<string | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY environment variable not set');
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query: `${companyName} official website`,
      search_depth: 'basic',
      include_answer: false,
      max_results: 5,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.statusText}`);
  }

  const data: TavilyResponse = await response.json();

  // Try to find the company's own domain from search results
  // Skip common non-company domains
  const skipDomains = new Set([
    'wikipedia.org', 'linkedin.com', 'facebook.com', 'twitter.com',
    'youtube.com', 'crunchbase.com', 'glassdoor.com', 'bloomberg.com',
    'reuters.com', 'forbes.com', 'indeed.com', 'yelp.com',
  ]);

  for (const result of data.results) {
    const domain = extractDomain(result.url);
    if (domain && !skipDomains.has(domain)) {
      // Check if it's not a subdomain of a skip domain
      const isSkipped = Array.from(skipDomains).some(sd => domain.endsWith(`.${sd}`));
      if (!isSkipped) {
        return domain;
      }
    }
  }

  // Fallback: use the first result's domain
  if (data.results.length > 0) {
    return extractDomain(data.results[0].url);
  }

  return null;
}

async function fetchLogoFromClearbit(domain: string): Promise<Buffer | null> {
  try {
    const response = await fetch(`https://logo.clearbit.com/${domain}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

async function fetchLogoFromGoogleFavicon(domain: string): Promise<Buffer | null> {
  try {
    const response = await fetch(
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { companyName } = await request.json();

    if (!companyName || typeof companyName !== 'string') {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Step 1: Find the company's domain
    const domain = await findCompanyDomain(companyName);
    if (!domain) {
      return NextResponse.json(
        { error: `Could not find a website for "${companyName}". Try entering the company domain manually.` },
        { status: 404 }
      );
    }

    // Step 2: Fetch logo (Clearbit first, Google Favicon fallback)
    let logoBuffer = await fetchLogoFromClearbit(domain);
    if (!logoBuffer) {
      logoBuffer = await fetchLogoFromGoogleFavicon(domain);
    }

    if (!logoBuffer) {
      return NextResponse.json(
        { error: `Found website (${domain}) but could not fetch a logo. The company may not have a logo available.` },
        { status: 404 }
      );
    }

    // Step 3: Normalize with sharp - resize to fit 200x200, output as PNG
    const processedBuffer = await sharp(logoBuffer)
      .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();

    // Step 4: Convert to base64 data URI
    const base64 = processedBuffer.toString('base64');
    const logoBase64 = `data:image/png;base64,${base64}`;

    return NextResponse.json({
      success: true,
      logoBase64,
      domain,
    });
  } catch (error) {
    console.error('Logo fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logo. Please try again.' },
      { status: 500 }
    );
  }
}
