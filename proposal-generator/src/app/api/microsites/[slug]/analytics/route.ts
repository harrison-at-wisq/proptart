import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const HEARTBEAT_SECONDS = 15;
const MAX_SESSIONS_RETURNED = 50;

interface EventRow {
  session_id: string;
  visitor_id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  user_agent: string | null;
  referrer: string | null;
  occurred_at: string;
}

interface SessionSummary {
  sessionId: string;
  visitorId: string;
  firstSeenAt: string;
  activeSeconds: number;
  maxScrollDepth: number;
  referrer: string | null;
  userAgent: string | null;
  eventCount: number;
}

interface AnalyticsResponse {
  firstPublishedAt: string;
  totalVisits: number;
  uniqueVisitors: number;
  avgActiveSeconds: number;
  avgMaxScroll: number;
  percentReachedBottom: number;
  viewsByDay: Array<{ day: string; count: number }>;
  sessions: SessionSummary[];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getAuthUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  const supabase = createServerSupabaseClient();

  const { data: microsite, error: fetchError } = await supabase
    .from('microsites')
    .select('id, owner_email, published_at')
    .eq('slug', slug)
    .single();

  if (fetchError || !microsite) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (microsite.owner_email !== user.email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { data: rawEvents, error: eventsError } = await supabase
    .from('microsite_events')
    .select('session_id, visitor_id, event_type, payload, user_agent, referrer, occurred_at')
    .eq('microsite_id', microsite.id)
    .order('occurred_at', { ascending: true });

  if (eventsError) {
    return NextResponse.json({ error: eventsError.message }, { status: 500 });
  }

  const events = (rawEvents ?? []) as EventRow[];

  // Aggregate per session
  const sessionMap = new Map<string, SessionSummary>();
  for (const e of events) {
    let session = sessionMap.get(e.session_id);
    if (!session) {
      session = {
        sessionId: e.session_id,
        visitorId: e.visitor_id,
        firstSeenAt: e.occurred_at,
        activeSeconds: 0,
        maxScrollDepth: 0,
        referrer: null,
        userAgent: null,
        eventCount: 0,
      };
      sessionMap.set(e.session_id, session);
    }

    session.eventCount += 1;
    if (e.occurred_at < session.firstSeenAt) session.firstSeenAt = e.occurred_at;

    if (e.event_type === 'heartbeat') {
      session.activeSeconds += HEARTBEAT_SECONDS;
    } else if (e.event_type === 'scroll_depth') {
      const depth = Number(e.payload?.depth ?? 0);
      if (depth > session.maxScrollDepth) session.maxScrollDepth = depth;
    } else if (e.event_type === 'view') {
      if (!session.referrer) session.referrer = e.referrer;
      if (!session.userAgent) session.userAgent = e.user_agent;
    }
  }

  const sessions = Array.from(sessionMap.values());

  // Visits = sessions that actually have a view event. Ignore orphan sessions
  // that somehow only carry heartbeats or scrolls.
  const viewSessionIds = new Set(
    events.filter((e) => e.event_type === 'view').map((e) => e.session_id)
  );
  const visitSessions = sessions.filter((s) => viewSessionIds.has(s.sessionId));

  const totalVisits = visitSessions.length;
  const uniqueVisitors = new Set(visitSessions.map((s) => s.visitorId)).size;

  const avgActiveSeconds =
    totalVisits > 0
      ? visitSessions.reduce((sum, s) => sum + s.activeSeconds, 0) / totalVisits
      : 0;

  const avgMaxScroll =
    totalVisits > 0
      ? visitSessions.reduce((sum, s) => sum + s.maxScrollDepth, 0) / totalVisits
      : 0;

  const reachedBottomCount = visitSessions.filter((s) => s.maxScrollDepth >= 100).length;
  const percentReachedBottom =
    totalVisits > 0 ? (reachedBottomCount / totalVisits) * 100 : 0;

  // Views by day since first publish
  const dayCounts = new Map<string, number>();
  for (const e of events) {
    if (e.event_type !== 'view') continue;
    const day = e.occurred_at.slice(0, 10); // YYYY-MM-DD
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }

  const firstPublishedAt = microsite.published_at as string;
  const startDay = firstPublishedAt.slice(0, 10);
  const endDay = new Date().toISOString().slice(0, 10);
  const viewsByDay = fillDaySeries(startDay, endDay, dayCounts);

  const sessionsSorted = visitSessions
    .sort((a, b) => (a.firstSeenAt < b.firstSeenAt ? 1 : -1))
    .slice(0, MAX_SESSIONS_RETURNED);

  const response: AnalyticsResponse = {
    firstPublishedAt,
    totalVisits,
    uniqueVisitors,
    avgActiveSeconds,
    avgMaxScroll,
    percentReachedBottom,
    viewsByDay,
    sessions: sessionsSorted,
  };

  return NextResponse.json(response);
}

function fillDaySeries(
  startDay: string,
  endDay: string,
  counts: Map<string, number>
): Array<{ day: string; count: number }> {
  const result: Array<{ day: string; count: number }> = [];
  const cursor = new Date(`${startDay}T00:00:00Z`);
  const end = new Date(`${endDay}T00:00:00Z`);
  while (cursor <= end) {
    const day = cursor.toISOString().slice(0, 10);
    result.push({ day, count: counts.get(day) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}
