import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// PATCH - Overwrite draft_data (studio edits). Published_data is untouched;
// the customer URL keeps serving the last publish until an explicit Publish.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getAuthUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  const body = await request.json().catch(() => ({}));
  if (!body?.draft_data || typeof body.draft_data !== 'object') {
    return NextResponse.json({ error: 'draft_data is required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data: existing, error: fetchError } = await supabase
    .from('microsites')
    .select('id, owner_email')
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
    .update({ draft_data: body.draft_data })
    .eq('id', existing.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ microsite: updated });
}
