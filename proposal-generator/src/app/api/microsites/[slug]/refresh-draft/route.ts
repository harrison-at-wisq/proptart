import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST - Pull the latest proposal inputs into the microsite's draft_data.
// Published_data is untouched; customers keep seeing the last published snapshot
// until an explicit Publish.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getAuthUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  const supabase = createServerSupabaseClient();

  const { data: existing, error: fetchError } = await supabase
    .from('microsites')
    .select('id, owner_email, proposal_id, draft_data')
    .eq('slug', slug)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (existing.owner_email !== user.email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  if (!existing.proposal_id) {
    return NextResponse.json({ error: 'Microsite is not linked to a proposal' }, { status: 400 });
  }

  const { data: proposal, error: proposalError } = await supabase
    .from('proposals')
    .select('data')
    .eq('id', existing.proposal_id)
    .single();

  if (proposalError || !proposal) {
    return NextResponse.json({ error: 'Source proposal not found' }, { status: 404 });
  }

  // Preserve layout edits: proposal.data has no _layout, so carry forward the
  // existing draft's layout (reorders, added sections, per-section overrides).
  // This way "Pull latest from proposal" refreshes content without wiping
  // structural work.
  const existingDraft = (existing.draft_data as Record<string, unknown>) || {};
  const nextDraft = {
    ...(proposal.data as Record<string, unknown>),
    ...(existingDraft._layout ? { _layout: existingDraft._layout } : {}),
  };

  const { data: updated, error: updateError } = await supabase
    .from('microsites')
    .update({ draft_data: nextDraft })
    .eq('id', existing.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ microsite: updated });
}
