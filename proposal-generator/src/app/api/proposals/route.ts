import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase';

// Force dynamic rendering to avoid build-time data fetching
export const dynamic = 'force-dynamic';

import {
  DEFAULT_PRICING,
  DEFAULT_HR_OPERATIONS,
  DEFAULT_LEGAL_COMPLIANCE,
  DEFAULT_EMPLOYEE_EXPERIENCE,
  ProposalInputs,
} from '@/types/proposal';

// GET - List all proposals (all wisq.com users can see all)
export async function GET() {
  const user = await getAuthUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('proposals')
    .select('id, name, owner_email, data, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch all microsites and PDF exports for these proposals (for counts + quick links)
  const proposalIds = (data || []).map((p) => p.id);
  const [micrositesRes, pdfExportsRes] = await Promise.all([
    supabase
      .from('microsites')
      .select('proposal_id, slug, unpublished_at')
      .in('proposal_id', proposalIds),
    supabase
      .from('pdf_exports')
      .select('proposal_id')
      .in('proposal_id', proposalIds),
  ]);

  const micrositeCountMap = new Map<string, number>();
  const latestActiveSlugMap = new Map<string, string>();
  for (const m of micrositesRes.data || []) {
    micrositeCountMap.set(m.proposal_id, (micrositeCountMap.get(m.proposal_id) || 0) + 1);
    if (!m.unpublished_at) {
      latestActiveSlugMap.set(m.proposal_id, m.slug);
    }
  }
  const pdfCountMap = new Map<string, number>();
  for (const p of pdfExportsRes.data || []) {
    pdfCountMap.set(p.proposal_id, (pdfCountMap.get(p.proposal_id) || 0) + 1);
  }

  const proposals = (data || []).map((p) => {
    const pData = p.data as ProposalInputs;
    const micrositeCount = micrositeCountMap.get(p.id) || 0;
    const pdfCount = pdfCountMap.get(p.id) || 0;
    const latestMicrositeSlug = latestActiveSlugMap.get(p.id) || null;
    return {
      id: p.id,
      name: p.name,
      companyName: pData?.company?.companyName || 'Unnamed',
      industry: pData?.company?.industry || 'Unknown',
      aeName: (() => {
        const email = pData?.company?.contactEmail || '';
        const name = email.split('|')[0]?.trim();
        return name || '';
      })(),
      updatedAt: p.updated_at,
      createdAt: p.created_at,
      ownerEmail: p.owner_email,
      isOwner: p.owner_email === user?.email,
      hasGeneratedContent: !!pData?.generatedContent,
      micrositeCount,
      pdfCount,
      latestMicrositeSlug,
    };
  });

  return NextResponse.json({ proposals });
}

// POST - Create new proposal
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let name = 'New Proposal';
  try {
    const body = await request.json();
    if (body.name) name = body.name;
  } catch {
    // Use default name if no body
  }

  const defaultData: ProposalInputs = {
    company: {
      companyName: '',
      industry: 'Technology',
      headquarters: '',
      contactName: '',
      contactTitle: 'CHRO',
      contactEmail: '',
    },
    pricing: DEFAULT_PRICING,
    hrOperations: DEFAULT_HR_OPERATIONS,
    legalCompliance: DEFAULT_LEGAL_COMPLIANCE,
    employeeExperience: DEFAULT_EMPLOYEE_EXPERIENCE,
    painPoints: [],
    integrations: { hcm: '', identity: '', documents: '', communication: '', ticketing: '' },
    nextSteps: ['technical-deepdive', 'pilot-scope'],
  };

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      name,
      owner_email: user.email,
      data: defaultData,
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    proposal: {
      id: data.id,
      name: data.name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      data: data.data,
      ownerEmail: data.owner_email,
      isOwner: true,
    },
  });
}
