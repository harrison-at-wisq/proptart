import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST - Promote draft_data to published_data. This is the action that makes
// changes visible at the customer-facing /m/[slug] URL.
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
    .select('id, owner_email, draft_data')
    .eq('slug', slug)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (existing.owner_email !== user.email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { data: updated, error: updateError } = await supabase
    .from('microsites')
    .update({
      published_data: existing.draft_data,
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
