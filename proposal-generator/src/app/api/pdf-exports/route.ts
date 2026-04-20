import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ProposalInputs } from '@/types/proposal';

export const dynamic = 'force-dynamic';

// GET - List PDF exports. Scope with ?proposalId=X for a single proposal,
// or omit proposalId for cross-proposal listings (workspace home).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const proposalId = searchParams.get('proposalId');

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('pdf_exports')
    .select('id, name, created_at, updated_at, owner_email, proposal_id')
    .order('updated_at', { ascending: false });

  if (proposalId) {
    query = query.eq('proposal_id', proposalId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let pdfExports = data || [];
  if (!proposalId && pdfExports.length > 0) {
    const parentIds = Array.from(new Set(pdfExports.map((p) => p.proposal_id)));
    const { data: parents } = await supabase
      .from('proposals')
      .select('id, name, data')
      .in('id', parentIds);
    const parentMap = new Map(
      (parents || []).map((p) => {
        const pData = p.data as ProposalInputs;
        return [
          p.id,
          {
            name: p.name,
            companyName: pData?.company?.companyName || 'Unnamed',
          },
        ];
      })
    );
    pdfExports = pdfExports.map((pdf) => ({
      ...pdf,
      proposalName: parentMap.get(pdf.proposal_id)?.name ?? null,
      proposalCompanyName: parentMap.get(pdf.proposal_id)?.companyName ?? null,
    }));
  }

  return NextResponse.json({ pdfExports });
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
