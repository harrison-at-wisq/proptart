'use client';

import React, { useEffect, useState } from 'react';

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

interface Props {
  slug: string;
}

export function MicrositeAnalytics({ slug }: Props) {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/microsites/${slug}/analytics`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to load analytics');
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json as AnalyticsResponse);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load analytics');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 text-center text-gray-500 text-sm">
        Loading analytics…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 text-center text-red-600 text-sm">
        {error || 'No analytics available.'}
      </div>
    );
  }

  const noVisits = data.totalVisits === 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Top strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Unique visitors" value={String(data.uniqueVisitors)} />
        <StatTile label="Total visits" value={String(data.totalVisits)} />
        <StatTile label="Avg active time" value={formatDuration(data.avgActiveSeconds)} />
        <StatTile
          label="Avg max scroll"
          value={`${Math.round(data.avgMaxScroll)}%`}
          sublabel={noVisits ? undefined : `${Math.round(data.percentReachedBottom)}% reached the bottom`}
        />
      </div>

      {/* Views over time */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#03143B]">Views over time</h2>
          <p className="text-xs text-gray-400">Since first publish &middot; {formatDate(data.firstPublishedAt)}</p>
        </div>
        {noVisits ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            No visits yet. Share the link to start tracking.
          </p>
        ) : (
          <ViewsBarChart data={data.viewsByDay} />
        )}
      </section>

      {/* Sessions table */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-[#03143B]">Sessions</h2>
          <p className="text-xs text-gray-400">
            {noVisits ? 'No sessions yet' : `Showing ${data.sessions.length} most recent`}
          </p>
        </div>
        {noVisits ? (
          <p className="text-sm text-gray-500 py-8 text-center">No sessions yet.</p>
        ) : (
          <SessionsTable sessions={data.sessions} />
        )}
      </section>
    </div>
  );
}

// ---------- Stat tile ----------

function StatTile({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-[#03143B] mt-2">{value}</p>
      {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
    </div>
  );
}

// ---------- Views bar chart ----------

function ViewsBarChart({ data }: { data: Array<{ day: string; count: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  // With many days, we want a reasonable bar width. Cap labels to first/last/peak.
  const peakIndex = data.reduce((best, d, i) => (d.count > data[best].count ? i : best), 0);

  return (
    <div>
      <div className="flex items-end gap-[2px] h-32">
        {data.map((d, i) => {
          const h = (d.count / max) * 100;
          return (
            <div
              key={d.day}
              className="flex-1 min-w-[2px] bg-emerald-400 hover:bg-emerald-500 rounded-sm transition-colors"
              style={{ height: `${Math.max(2, h)}%`, opacity: d.count === 0 ? 0.15 : 1 }}
              title={`${formatDate(d.day)}: ${d.count} view${d.count === 1 ? '' : 's'}`}
            >
              {i === peakIndex && d.count > 0 && (
                <div className="text-[10px] text-gray-500 -mt-4 text-center">{d.count}</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-gray-400 mt-2">
        <span>{formatDate(data[0]?.day || '')}</span>
        <span>{formatDate(data[data.length - 1]?.day || '')}</span>
      </div>
    </div>
  );
}

// ---------- Sessions table ----------

function SessionsTable({ sessions }: { sessions: SessionSummary[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="divide-y divide-gray-100">
      <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1fr_auto] gap-4 px-5 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide bg-gray-50">
        <span>When</span>
        <span>Visitor</span>
        <span>Active time</span>
        <span>Max scroll</span>
        <span>Referrer</span>
        <span />
      </div>
      {sessions.map((s) => {
        const isOpen = expanded === s.sessionId;
        return (
          <div key={s.sessionId} className="text-sm">
            <button
              onClick={() => setExpanded(isOpen ? null : s.sessionId)}
              className="w-full grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1fr_auto] gap-4 px-5 py-3 text-left hover:bg-gray-50 items-center"
            >
              <span className="text-gray-700">{formatRelative(s.firstSeenAt)}</span>
              <span className="font-mono text-xs text-gray-500 truncate">{s.visitorId.slice(0, 8)}</span>
              <span className="text-gray-700">{formatDuration(s.activeSeconds)}</span>
              <ScrollBadge depth={s.maxScrollDepth} />
              <span className="text-gray-500 truncate">{formatReferrer(s.referrer)}</span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isOpen && (
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs text-gray-600">
                <div>
                  <p className="text-gray-400">Exact timestamp</p>
                  <p className="font-mono">{new Date(s.firstSeenAt).toISOString()}</p>
                </div>
                <div>
                  <p className="text-gray-400">Events recorded</p>
                  <p>{s.eventCount}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-400">User agent</p>
                  <p className="font-mono truncate">{s.userAgent || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-400">Session ID</p>
                  <p className="font-mono">{s.sessionId}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScrollBadge({ depth }: { depth: number }) {
  const color =
    depth >= 100
      ? 'text-emerald-700 bg-emerald-50'
      : depth >= 75
        ? 'text-sky-700 bg-sky-50'
        : depth >= 25
          ? 'text-amber-700 bg-amber-50'
          : 'text-gray-600 bg-gray-100';
  return (
    <span className={`inline-flex w-fit items-center text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {depth}%
    </span>
  );
}

// ---------- Formatters ----------

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return '—';
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m === 0) return `${rem}s`;
  return `${m}m ${rem.toString().padStart(2, '0')}s`;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatReferrer(ref: string | null): string {
  if (!ref) return 'Direct';
  try {
    const url = new URL(ref);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return ref;
  }
}

