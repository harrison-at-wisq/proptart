import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface IncomingEvent {
  type: 'view' | 'scroll_depth' | 'heartbeat' | 'unload';
  payload?: Record<string, unknown>;
  occurredAt: string;
}

// POST - public, no auth. Accepts batched visitor telemetry events.
// Internal wisq.com users (if they happen to be logged in) are silently dropped
// so the analytics reflect only real prospects.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let body: { sessionId?: string; visitorId?: string; events?: IncomingEvent[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { sessionId, visitorId, events } = body;
  if (!sessionId || !visitorId || !Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Quiet filter: internal users' browsers may carry auth cookies while
  // viewing the public /m/[slug] page. Acknowledge the request but write
  // nothing so dashboards aren't polluted by QA traffic.
  const user = await getAuthUser();
  if (user?.email && user.email.endsWith('@wisq.com')) {
    return NextResponse.json({ filtered: true });
  }

  const supabase = createServerSupabaseClient();
  const { data: microsite, error: fetchError } = await supabase
    .from('microsites')
    .select('id')
    .eq('slug', slug)
    .single();

  if (fetchError || !microsite) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const userAgent = request.headers.get('user-agent') || null;

  const rows = events
    .filter((e) => typeof e?.type === 'string' && typeof e?.occurredAt === 'string')
    .map((e) => ({
      microsite_id: microsite.id,
      session_id: sessionId,
      visitor_id: visitorId,
      event_type: e.type,
      payload: (e.payload as Record<string, unknown>) ?? null,
      user_agent: userAgent,
      referrer: (e.payload?.referrer as string | undefined) ?? null,
      occurred_at: e.occurredAt,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  const { error: insertError } = await supabase.from('microsite_events').insert(rows);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: rows.length });
}
