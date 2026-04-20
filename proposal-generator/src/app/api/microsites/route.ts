import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { generateMicrositeSlug } from '@/lib/microsite-slug';
import { ProposalInputs } from '@/types/proposal';

export const dynamic = 'force-dynamic';

// GET - List microsites. Scope with ?proposalId=X for a single proposal,
// or omit proposalId for cross-proposal listings (workspace home).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const proposalId = searchParams.get('proposalId');
  const includeArchived = searchParams.get('includeArchived') === 'true';

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('microsites')
    .select('id, slug, name, published_at, unpublished_at, view_count, last_viewed_at, updated_at, owner_email, proposal_id')
    .order('updated_at', { ascending: false });

  if (proposalId) {
    query = query.eq('proposal_id', proposalId);
  }

  if (!includeArchived) {
    query = query.is('unpublished_at', null);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If cross-proposal, attach parent proposal company + id for display
  let microsites = data || [];
  if (!proposalId && microsites.length > 0) {
    const parentIds = Array.from(new Set(microsites.map((m) => m.proposal_id)));
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
    microsites = microsites.map((m) => ({
      ...m,
      proposalName: parentMap.get(m.proposal_id)?.name ?? null,
      proposalCompanyName: parentMap.get(m.proposal_id)?.companyName ?? null,
    }));
  }

  return NextResponse.json({ microsites });
}

// POST - Publish a new microsite for a proposal
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { proposalId, data: clientData, name } = await request.json();
  if (!proposalId) {
    return NextResponse.json({ error: 'proposalId is required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // Fetch the proposal (for ownership check)
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

  // Prefer data sent from the client (current in-memory state) over what's in DB,
  // in case the auto-save hasn't flushed yet
  const proposalData = (clientData || proposal.data) as ProposalInputs;

  // Generate slug and create record (always new — supports multiple per deal)
  const micrositeName = name || `${proposalData.company?.companyName || 'Company'} Microsite`;
  const slug = generateMicrositeSlug(proposalData.company?.companyName || 'proposal');

  const { data: created, error: createError } = await supabase
    .from('microsites')
    .insert({
      proposal_id: proposalId,
      slug,
      name: micrositeName,
      data: proposalData,
      published_at: new Date().toISOString(),
      owner_email: user.email,
      view_count: 0,
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json({ microsite: created });
}
