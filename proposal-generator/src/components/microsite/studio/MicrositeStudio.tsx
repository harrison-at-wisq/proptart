'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { MicrositeData } from '@/types/microsite';
import { MicrositeAnalytics } from '@/components/microsite/studio/MicrositeAnalytics';
import { MicrositeEditor } from '@/components/microsite/studio/MicrositeEditor';
import { diffMicrositeData, diffInputFields } from '@/lib/microsite-diff';
import type { InputsDiff } from '@/lib/microsite-diff';

type StudioTab = 'edit' | 'analytics';

interface Props {
  proposalId: string;
  slug: string;
  name: string;
  initialDraft: MicrositeData;
  initialPublished: MicrositeData;
  initialPublishedAt: string;
  proposalData: MicrositeData | null;
}

export function MicrositeStudio({
  proposalId,
  slug,
  name,
  initialDraft,
  initialPublished,
  initialPublishedAt,
  proposalData,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<MicrositeData>(initialDraft);
  const [published, setPublished] = useState<MicrositeData>(initialPublished);
  const [publishedAt, setPublishedAt] = useState<string>(initialPublishedAt);
  const [busy, setBusy] = useState<null | 'refresh' | 'publish'>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<StudioTab>('edit');
  // Bumped only on a successful sync so the editor remounts with the freshly
  // pulled snapshot (it seeds its internal draft from initialDraft once).
  const [editorKey, setEditorKey] = useState(0);

  const diff = useMemo(() => diffMicrositeData(draft, published), [draft, published]);
  // Drift between this microsite's input snapshot and the live proposal.
  const inputsDiff = useMemo(() => diffInputFields(draft, proposalData), [draft, proposalData]);

  const handleRefresh = async () => {
    setBusy('refresh');
    setError(null);
    try {
      const res = await fetch(`/api/microsites/${slug}/refresh-draft`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error || 'Refresh failed');
      const json = await res.json();
      setDraft(json.microsite.draft_data as MicrositeData);
      setEditorKey((k) => k + 1);
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
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
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
            <h1 className="text-sm font-semibold text-[#03143B] truncate">{name}</h1>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex items-center rounded-lg bg-gray-100 p-0.5">
              <TabButton active={tab === 'edit'} onClick={() => setTab('edit')}>
                Edit
              </TabButton>
              <TabButton active={tab === 'analytics'} onClick={() => setTab('analytics')}>
                Analytics
              </TabButton>
            </div>
            <div className="h-6 w-px bg-gray-200" />
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
            <SyncInputsButton
              diff={inputsDiff}
              busy={busy === 'refresh'}
              disabled={busy !== null}
              onSync={handleRefresh}
            />
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={busy !== null || diff.inSync}
              title={
                diff.inSync
                  ? `In sync · last published ${publishedAtLabel}`
                  : `Draft ahead · ${diff.changedSections.length} section${diff.changedSections.length === 1 ? '' : 's'} unpublished`
              }
              className="px-4 py-2 text-xs font-medium text-white bg-[#03143B] rounded-lg transition-opacity hover:bg-[#03143B]/90 disabled:opacity-40 disabled:cursor-not-allowed"
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
      </div>

      {/* Tab content */}
      {tab === 'edit' ? (
        <div className="bg-white">
          <MicrositeEditor
            key={editorKey}
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

function SyncInputsButton({
  diff,
  busy,
  disabled,
  onSync,
}: {
  diff: InputsDiff;
  busy: boolean;
  disabled: boolean;
  onSync: () => void;
}) {
  const hasChanges = !diff.inSync;
  const VISIBLE = 8;
  const shown = diff.changes.slice(0, VISIBLE);
  const overflow = diff.changes.length - shown.length;

  return (
    <div className="relative group">
      <button
        onClick={onSync}
        disabled={disabled || !hasChanges}
        title={hasChanges ? undefined : 'Microsite is up to date with the proposal'}
        className={
          'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all ' +
          (hasChanges
            ? 'text-amber-800 bg-amber-50 border-amber-300 ring-1 ring-amber-300/60 shadow-sm hover:bg-amber-100'
            : 'text-gray-400 bg-white border-gray-200 opacity-60 cursor-default')
        }
      >
        <svg
          className={'w-3.5 h-3.5 ' + (busy ? 'animate-spin' : '')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {busy ? 'Syncing…' : 'Sync input changes'}
        {hasChanges && !busy && (
          <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold leading-none">
            {diff.changes.length}
          </span>
        )}
      </button>

      {/* Hover diff: snapshot value → incoming proposal value */}
      <div className="absolute right-0 top-full mt-2 w-96 z-50 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-150">
        <div className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {hasChanges ? (
            <>
              <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                <p className="text-xs font-semibold text-amber-900">
                  {diff.changes.length} input {diff.changes.length === 1 ? 'change' : 'changes'} in the proposal
                </p>
                <p className="text-[11px] text-amber-700/80 mt-0.5">
                  Click to pull these into the microsite. Publishing stays a separate step.
                </p>
              </div>
              <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                {shown.map((c, i) => (
                  <li key={`${c.section}-${c.path}-${i}`} className="px-4 py-2">
                    <p className="text-[11px] font-medium text-gray-500">
                      {c.section}
                      <span className="text-gray-300"> › </span>
                      <span className="font-mono text-gray-400">{c.path}</span>
                    </p>
                    <p className="text-xs mt-0.5 flex items-center gap-1.5">
                      <span className="text-gray-400 line-through">{c.before}</span>
                      <span className="text-gray-300">→</span>
                      <span className="font-semibold text-emerald-700">{c.after}</span>
                    </p>
                  </li>
                ))}
              </ul>
              {overflow > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500">
                  +{overflow} more {overflow === 1 ? 'change' : 'changes'}
                </div>
              )}
            </>
          ) : (
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-gray-600">Up to date</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                This microsite matches the current proposal inputs.
              </p>
            </div>
          )}
        </div>
      </div>
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
        'px-3 py-1.5 text-xs font-medium rounded-md transition-colors ' +
        (active
          ? 'bg-white text-[#03143B] shadow-sm'
          : 'text-gray-500 hover:text-[#03143B]')
      }
    >
      {children}
    </button>
  );
}
