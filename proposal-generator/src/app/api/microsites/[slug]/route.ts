import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Public fetch (no auth required), increments view count
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('microsites')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Check if unpublished
  if (data.unpublished_at) {
    return NextResponse.json({ error: 'This microsite is no longer available' }, { status: 410 });
  }

  // Increment view count (fire-and-forget)
  supabase
    .from('microsites')
    .update({
      view_count: (data.view_count || 0) + 1,
      last_viewed_at: new Date().toISOString(),
    })
    .eq('id', data.id)
    .then(() => {});

  return NextResponse.json({
    microsite: {
      slug: data.slug,
      data: data.data,
      published_at: data.published_at,
      company_name: (data.data as Record<string, unknown>)?.company
        ? ((data.data as Record<string, Record<string, string>>).company.companyName || 'Company')
        : 'Company',
    },
  });
}

// PUT - Update/unpublish (auth required)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getAuthUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  const body = await request.json();
  const supabase = createServerSupabaseClient();

  // Verify ownership
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

  const updates: Record<string, unknown> = {};
  if (body.unpublish) {
    updates.unpublished_at = new Date().toISOString();
  }
  if (body.data) {
    updates.data = body.data;
  }

  const { data: updated, error: updateError } = await supabase
    .from('microsites')
    .update(updates)
    .eq('id', existing.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ microsite: updated });
}

// DELETE - Remove (auth required)
export async function DELETE(
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
    .select('id, owner_email')
    .eq('slug', slug)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (existing.owner_email !== user.email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { error } = await supabase
    .from('microsites')
    .delete()
    .eq('id', existing.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
