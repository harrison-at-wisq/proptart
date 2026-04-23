'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { MicrositeData } from '@/types/microsite';
import { MicrositeAnalytics } from '@/components/microsite/studio/MicrositeAnalytics';
import { MicrositeEditor } from '@/components/microsite/studio/MicrositeEditor';
import { diffMicrositeData } from '@/lib/microsite-diff';

type StudioTab = 'edit' | 'analytics';

interface Props {
  proposalId: string;
  slug: string;
  name: string;
  initialDraft: MicrositeData;
  initialPublished: MicrositeData;
  initialPublishedAt: string;
}

export function MicrositeStudio({
  proposalId,
  slug,
  name,
  initialDraft,
  initialPublished,
  initialPublishedAt,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<MicrositeData>(initialDraft);
  const [published, setPublished] = useState<MicrositeData>(initialPublished);
  const [publishedAt, setPublishedAt] = useState<string>(initialPublishedAt);
  const [busy, setBusy] = useState<null | 'refresh' | 'publish'>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<StudioTab>('edit');

  const diff = useMemo(() => diffMicrositeData(draft, published), [draft, published]);

  const handleRefresh = async () => {
    setBusy('refresh');
    setError(null);
    try {
      const res = await fetch(`/api/microsites/${slug}/refresh-draft`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error || 'Refresh failed');
      const json = await res.json();
      setDraft(json.microsite.draft_data as MicrositeData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setBusy(null);
    }
  };

  const handlePublish = async () => {
    setBusy('publish');
    setError(null);
    try {
      const res = await fetch(`/api/microsites/${slug}/publish`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error || 'Publish failed');
      const json = await res.json();
      setPublished(json.microsite.published_data as MicrositeData);
      setPublishedAt(json.microsite.published_at as string);
      setConfirmOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setBusy(null);
    }
  };

  const publishedAtLabel = new Date(publishedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => router.push(`/p/${proposalId}`)}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              title="Back to workspace"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0 flex items-center gap-3">
              <h1 className="text-sm font-semibold text-[#03143B] truncate">{name}</h1>
              <span className="text-[11px] uppercase tracking-wide text-gray-400 flex-shrink-0">Studio</span>
              {diff.inSync ? (
                <span
                  title={`Last published ${publishedAtLabel}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex-shrink-0"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  In sync
                </span>
              ) : (
                <span
                  title={`Last published ${publishedAtLabel}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full flex-shrink-0"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Draft ahead &middot; {diff.changedSections.length} changed
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
              <a
                href={`/p/${proposalId}/microsite/${slug}/internal`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#03143B] transition-colors"
              >
                Internal Preview
              </a>
              <span className="text-gray-300">·</span>
              <a
                href={`/m/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#03143B] transition-colors"
              >
                Customer View
              </a>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <button
              onClick={handleRefresh}
              disabled={busy !== null}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === 'refresh' ? 'Pulling…' : 'Pull latest from proposal'}
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={busy !== null || diff.inSync}
              className="px-4 py-2 text-xs font-medium text-white bg-[#03143B] rounded-lg hover:bg-[#03143B]/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Publish
            </button>
          </div>
        </div>
        {error && (
          <div className="max-w-7xl mx-auto px-6 pb-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6 -mb-px">
            <TabButton active={tab === 'edit'} onClick={() => setTab('edit')}>
              Edit
            </TabButton>
            <TabButton active={tab === 'analytics'} onClick={() => setTab('analytics')}>
              Analytics
            </TabButton>
          </div>
        </div>
      </div>

      {/* Tab content */}
      {tab === 'edit' ? (
        <div className="bg-white">
          <MicrositeEditor
            slug={slug}
            initialDraft={draft}
            onDraftSaved={(next) => setDraft(next)}
          />
        </div>
      ) : (
        <MicrositeAnalytics slug={slug} />
      )}

      {/* Publish confirmation */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 pt-5 pb-3">
              <h2 className="text-base font-semibold text-[#03143B]">Publish changes?</h2>
              <p className="mt-1 text-sm text-gray-600">
                The customer-facing page at <span className="font-mono text-xs text-[#03143B]">/m/{slug}</span> will update immediately.
              </p>
            </div>
            <div className="px-6 pb-4">
              {diff.changedSections.length > 0 ? (
                <>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    {diff.changedSections.length} section{diff.changedSections.length === 1 ? '' : 's'} changed
                  </p>
                  <ul className="text-sm text-gray-700 space-y-1 max-h-48 overflow-y-auto">
                    {diff.changedSections.map((section) => (
                      <li key={section} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {section}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-gray-500">No differences detected.</p>
              )}
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={busy !== null}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={busy !== null}
                className="px-4 py-2 text-sm font-medium text-white bg-[#03143B] rounded-lg hover:bg-[#03143B]/90 disabled:opacity-50"
              >
                {busy === 'publish' ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'text-xs font-medium pb-3 pt-1 border-b-2 transition-colors ' +
        (active
          ? 'text-[#03143B] border-[#03143B]'
          : 'text-gray-500 border-transparent hover:text-[#03143B]')
      }
    >
      {children}
    </button>
  );
}
