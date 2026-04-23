'use client';

import { useEffect } from 'react';

const VISITOR_KEY = 'wisq_microsite_visitor_id';
const SCROLL_MILESTONES = [25, 50, 75, 100] as const;
const HEARTBEAT_MS = 15_000;

interface Props {
  slug: string;
}

export function MicrositeTracker({ slug }: Props) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Persistent ID across visits → unique visitor count.
    let visitorId: string;
    try {
      const existing = localStorage.getItem(VISITOR_KEY);
      if (existing) {
        visitorId = existing;
      } else {
        visitorId = crypto.randomUUID();
        localStorage.setItem(VISITOR_KEY, visitorId);
      }
    } catch {
      // Private mode / storage disabled — fall back to an in-memory id so the
      // session still tracks something.
      visitorId = crypto.randomUUID();
    }

    // Fresh id per page load → per-visit session count.
    const sessionId = crypto.randomUUID();
    const reached = new Set<number>();
    const endpoint = `/api/microsites/${slug}/track`;

    function send(
      events: Array<{ type: string; payload?: Record<string, unknown>; occurredAt: string }>,
      useBeacon = false
    ) {
      const body = JSON.stringify({ sessionId, visitorId, events });
      if (useBeacon && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
        return;
      }
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        credentials: 'same-origin',
      }).catch(() => {});
    }

    // Initial view
    send([
      {
        type: 'view',
        payload: { referrer: document.referrer || null },
        occurredAt: new Date().toISOString(),
      },
    ]);

    // Scroll depth milestones
    function onScroll() {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      if (total <= 0) return;
      const pct = Math.min(100, Math.round((window.scrollY / total) * 100));
      for (const m of SCROLL_MILESTONES) {
        if (pct >= m && !reached.has(m)) {
          reached.add(m);
          send([{ type: 'scroll_depth', payload: { depth: m }, occurredAt: new Date().toISOString() }]);
        }
      }
    }

    // Heartbeat — only when the tab is visible and focused, so an abandoned
    // tab doesn't inflate "active time."
    function isActive() {
      return document.visibilityState === 'visible' && document.hasFocus();
    }
    const heartbeatTimer = window.setInterval(() => {
      if (isActive()) {
        send([{ type: 'heartbeat', occurredAt: new Date().toISOString() }]);
      }
    }, HEARTBEAT_MS);

    function onUnload() {
      send([{ type: 'unload', occurredAt: new Date().toISOString() }], true);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', onUnload);
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onUnload);
      window.clearInterval(heartbeatTimer);
    };
  }, [slug]);

  return null;
}
