import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { generateMicrositeSlug } from '@/lib/microsite-slug';
import { ProposalInputs } from '@/types/proposal';

export const dynamic = 'force-dynamic';

// GET - Look up microsite by proposal ID
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const proposalId = searchParams.get('proposalId');
  const includeArchived = searchParams.get('includeArchived') === 'true';

  if (!proposalId) {
    return NextResponse.json({ error: 'proposalId query param required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('microsites')
    .select('slug, published_at, unpublished_at')
    .eq('proposal_id', proposalId);

  if (!includeArchived) {
    query = query.is('unpublished_at', null);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return NextResponse.json({ slug: null });
  }

  return NextResponse.json({
    slug: data.slug,
    publishedAt: data.published_at,
    unpublishedAt: data.unpublished_at,
  });
}

// POST - Publish a proposal as a microsite
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { proposalId, data: clientData } = await request.json();
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

  // Check if a microsite already exists for this proposal
  const { data: existing } = await supabase
    .from('microsites')
    .select('id, slug')
    .eq('proposal_id', proposalId)
    .single();

  if (existing) {
    // Re-publish: update data in-place, clear unpublished_at
    const { data: updated, error: updateError } = await supabase
      .from('microsites')
      .update({
        data: proposalData,
        published_at: new Date().toISOString(),
        unpublished_at: null,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ microsite: updated });
  }

  // New publish: generate slug and create record
  const slug = generateMicrositeSlug(proposalData.company?.companyName || 'proposal');

  const { data: created, error: createError } = await supabase
    .from('microsites')
    .insert({
      proposal_id: proposalId,
      slug,
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
