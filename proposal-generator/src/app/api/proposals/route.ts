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
import { DEFAULT_MOU_INPUTS, MOUInputs } from '@/types/mou';
import { DocumentType } from '@/types/database';

// GET - List all proposals (all wisq.com users can see all)
export async function GET() {
  const user = await getAuthUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('proposals')
    .select('id, name, owner_email, data, document_type, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch all microsites for these proposals (for quick-access links)
  const proposalIds = (data || []).map((p) => p.id);
  const { data: microsites } = await supabase
    .from('microsites')
    .select('proposal_id, slug, unpublished_at')
    .in('proposal_id', proposalIds);

  // Count microsites per proposal and track the latest active slug
  const micrositeCountMap = new Map<string, number>();
  const latestActiveSlugMap = new Map<string, string>();
  for (const m of microsites || []) {
    micrositeCountMap.set(m.proposal_id, (micrositeCountMap.get(m.proposal_id) || 0) + 1);
    if (!m.unpublished_at) {
      latestActiveSlugMap.set(m.proposal_id, m.slug);
    }
  }

  // Transform to list items with ownership info
  const proposals = (data || []).map((p) => {
    const docType = (p.document_type as DocumentType) || 'proposal';
    const pData = p.data as ProposalInputs | MOUInputs;
    const micrositeCount = micrositeCountMap.get(p.id) || 0;
    const latestMicrositeSlug = latestActiveSlugMap.get(p.id) || null;
    const hasGenerated = docType === 'mou'
      ? !!(pData as MOUInputs)?.generatedContent
      : !!(pData as ProposalInputs)?.generatedContent;
    return {
      id: p.id,
      name: p.name,
      companyName: pData?.company?.companyName || 'Unnamed',
      industry: 'industry' in (pData?.company || {})
        ? (pData?.company as ProposalInputs['company'] | MOUInputs['company'])?.industry || 'Unknown'
        : 'Unknown',
      aeName: (() => {
        const email = (pData?.company as ProposalInputs['company'])?.contactEmail || '';
        const name = email.split('|')[0]?.trim();
        return name || '';
      })(),
      updatedAt: p.updated_at,
      createdAt: p.created_at,
      ownerEmail: p.owner_email,
      isOwner: p.owner_email === user?.email,
      documentType: docType,
      hasGeneratedContent: hasGenerated,
      micrositeCount,
      latestMicrositeSlug,
    };
  });

  return NextResponse.json({ proposals });
}

// POST - Create new proposal or MOU
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let name = 'New Proposal';
  let documentType: DocumentType = 'proposal';
  try {
    const body = await request.json();
    if (body.name) name = body.name;
    if (body.document_type === 'mou') {
      documentType = 'mou';
      if (!body.name) name = 'New MOU';
    }
  } catch {
    // Use default name if no body
  }

  const defaultData: ProposalInputs | MOUInputs = documentType === 'mou'
    ? DEFAULT_MOU_INPUTS
    : {
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
      document_type: documentType,
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
      documentType: (data.document_type as DocumentType) || 'proposal',
    },
  });
}
