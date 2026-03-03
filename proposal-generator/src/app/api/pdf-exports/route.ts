import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ProposalInputs } from '@/types/proposal';

export const dynamic = 'force-dynamic';

// GET - List PDF exports for a proposal
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const proposalId = searchParams.get('proposalId');

  if (!proposalId) {
    return NextResponse.json({ error: 'proposalId query param required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('pdf_exports')
    .select('id, name, created_at, updated_at, owner_email')
    .eq('proposal_id', proposalId)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pdfExports: data || [] });
}

// POST - Create a new PDF export
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { proposalId, name, data: clientData, sectionsConfig } = await request.json();
  if (!proposalId) {
    return NextResponse.json({ error: 'proposalId is required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // Fetch the proposal (for ownership check and data)
  const { data: proposal, error: fetchError } = await supabase
    .from('proposals')
    .select('id, name, owner_email, data')
    .eq('id', proposalId)
    .single();

  if (fetchError || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  if (proposal.owner_email !== user.email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const proposalData = (clientData || proposal.data) as ProposalInputs;
  const pdfName = name || `${proposalData.company?.companyName || 'Proposal'} PDF`;

  const { data: created, error: createError } = await supabase
    .from('pdf_exports')
    .insert({
      proposal_id: proposalId,
      name: pdfName,
      data: proposalData,
      sections_config: sectionsConfig || [],
      owner_email: user.email,
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json({ pdfExport: created });
}
