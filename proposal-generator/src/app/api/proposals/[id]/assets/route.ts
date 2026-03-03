import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Fetch all assets (microsites + PDF exports) for a proposal
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const [micrositesRes, pdfExportsRes] = await Promise.all([
    supabase
      .from('microsites')
      .select('id, slug, name, published_at, unpublished_at, view_count, last_viewed_at, updated_at, owner_email')
      .eq('proposal_id', id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('pdf_exports')
      .select('id, name, created_at, updated_at, owner_email')
      .eq('proposal_id', id)
      .order('updated_at', { ascending: false }),
  ]);

  return NextResponse.json({
    microsites: micrositesRes.data || [],
    pdfExports: pdfExportsRes.data || [],
  });
}
