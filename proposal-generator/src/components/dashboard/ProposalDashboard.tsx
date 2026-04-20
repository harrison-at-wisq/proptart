'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-hooks';
import { useProposals } from '@/lib/proposal-hooks';
import { hasLegacyProposals, getLegacyProposalCount, migrateProposals } from '@/lib/migration';

type TabKey = 'proposals' | 'microsites' | 'pdfs';
type OwnerFilter = 'all' | 'mine';
type SortKey = 'last-modified' | 'first-created';

interface MicrositeItem {
  id: string;
  slug: string;
  name: string;
  proposal_id: string;
  proposalName?: string | null;
  proposalCompanyName?: string | null;
  published_at: string;
  unpublished_at: string | null;
  view_count: number;
  updated_at: string;
  owner_email: string;
}

interface PdfItem {
  id: string;
  name: string;
  proposal_id: string;
  proposalName?: string | null;
  proposalCompanyName?: string | null;
  created_at: string;
  updated_at: string;
  owner_email: string;
}

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ProposalDashboard() {
  const router = useRouter();
  const { email, signOut } = useAuth();
  const { proposals, loading: proposalsLoading, error, createProposal, deleteProposal, duplicateProposal, refresh } = useProposals();

  const [tab, setTab] = useState<TabKey>('proposals');
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('last-modified');

  const [microsites, setMicrosites] = useState<MicrositeItem[]>([]);
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [pickerOpen, setPickerOpen] = useState<null | 'microsite' | 'pdf'>(null);

  // Legacy migration banner state (kept from original)
  const [showMigration, setShowMigration] = useState(false);
  const [migrationCount, setMigrationCount] = useState(0);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ success: number; failed: number } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && hasLegacyProposals()) {
      setMigrationCount(getLegacyProposalCount());
      setShowMigration(true);
    }
  }, []);

  const fetchAssets = useCallback(async () => {
    setAssetsLoading(true);
    try {
      const [mRes, pRes] = await Promise.all([
        fetch('/api/microsites?includeArchived=true', { cache: 'no-store' }),
        fetch('/api/pdf-exports', { cache: 'no-store' }),
      ]);
      const mJson = await mRes.json();
      const pJson = await pRes.json();
      setMicrosites(mJson.microsites || []);
      setPdfs(pJson.pdfExports || []);
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setAssetsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'microsites' || tab === 'pdfs') {
      fetchAssets();
    }
  }, [tab, fetchAssets]);

  // ─── Filter + sort helpers ─────────────────────────────────────────────────

  const filteredProposals = useMemo(() => {
    return proposals
      .filter((p) => ownerFilter === 'all' || p.isOwner)
      .sort((a, b) => {
        if (sortBy === 'last-modified') {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [proposals, ownerFilter, sortBy]);

  const filteredMicrosites = useMemo(() => {
    return microsites
      .filter((m) => ownerFilter === 'all' || m.owner_email === email)
      .sort((a, b) => {
        if (sortBy === 'last-modified') {
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
        return new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
      });
  }, [microsites, ownerFilter, sortBy, email]);

  const filteredPdfs = useMemo(() => {
    return pdfs
      .filter((p) => ownerFilter === 'all' || p.owner_email === email)
      .sort((a, b) => {
        if (sortBy === 'last-modified') {
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  }, [pdfs, ownerFilter, sortBy, email]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleCreateProposal = async () => {
    try {
      setActionLoading(true);
      const newProposal = await createProposal();
      router.push(`/p/${newProposal.id}/inputs`);
    } catch (err) {
      console.error('Failed to create proposal:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAsset = async (kind: 'microsite' | 'pdf', proposalId: string) => {
    setActionLoading(true);
    try {
      // Fetch proposal data first to seed the asset
      const res = await fetch(`/api/proposals/${proposalId}`);
      const json = await res.json();
      const data = json?.proposal?.data;
      if (!data) throw new Error('Proposal data missing');

      if (kind === 'microsite') {
        const mRes = await fetch('/api/microsites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposalId, data }),
        });
        if (!mRes.ok) throw new Error('Failed to create microsite');
        await fetchAssets();
        setTab('microsites');
      } else {
        const pRes = await fetch('/api/pdf-exports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposalId, data }),
        });
        if (!pRes.ok) throw new Error('Failed to create PDF');
        const pJson = await pRes.json();
        const pdfId = pJson.pdfExport?.id;
        if (pdfId) window.open(`/p/${proposalId}/pdf/${pdfId}`, '_blank', 'noopener,noreferrer');
        await fetchAssets();
        setTab('pdfs');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
      setPickerOpen(null);
    }
  };

  // Contextual "+ New" for microsite/pdf tabs: skip picker if user can only create under one proposal
  const handleCreateAssetFromTab = (kind: 'microsite' | 'pdf') => {
    const myProposals = proposals.filter((p) => p.isOwner);
    if (myProposals.length === 1 && ownerFilter === 'mine') {
      handleCreateAsset(kind, myProposals[0].id);
    } else {
      setPickerOpen(kind);
    }
  };

  const handleDeleteProposal = async (id: string) => {
    try {
      setActionLoading(true);
      await deleteProposal(id);
      setDeleteTargetId(null);
      // Assets tabs need a refresh since children were cascade-deleted
      await fetchAssets();
    } catch (err) {
      console.error('Failed to delete proposal:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenameProposal = async (id: string, newCompanyName: string) => {
    try {
      setActionLoading(true);
      // Fetch the full proposal data, mutate company name, save
      const res = await fetch(`/api/proposals/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load proposal');
      const { proposal } = await res.json();
      const currentData = proposal?.data || {};
      const updatedData = {
        ...currentData,
        company: { ...(currentData.company || {}), companyName: newCompanyName },
      };
      const putRes = await fetch(`/api/proposals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatedData }),
      });
      if (!putRes.ok) throw new Error('Failed to rename proposal');
      await refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicateProposal = async (id: string) => {
    try {
      setActionLoading(true);
      await duplicateProposal(id);
    } catch (err) {
      console.error('Failed to duplicate proposal:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const result = await migrateProposals();
      setMigrationResult(result);
      await refresh();
    } catch (err) {
      console.error('Migration failed:', err);
    } finally {
      setMigrating(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const primaryAction = () => {
    if (tab === 'proposals') {
      return (
        <button
          onClick={handleCreateProposal}
          disabled={actionLoading}
          className="px-4 py-2 bg-[#03143B] text-white rounded-lg hover:bg-[#03143B]/90 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <PlusIcon />
          New Proposal
        </button>
      );
    }
    const kind = tab === 'microsites' ? 'microsite' : 'pdf';
    const label = tab === 'microsites' ? 'New Microsite' : 'New PDF';
    return (
      <button
        onClick={() => handleCreateAssetFromTab(kind)}
        disabled={actionLoading || proposalsLoading || proposals.filter((p) => p.isOwner).length === 0}
        className="px-4 py-2 bg-[#03143B] text-white rounded-lg hover:bg-[#03143B]/90 transition-colors flex items-center gap-2 disabled:opacity-50"
        title={proposals.filter((p) => p.isOwner).length === 0 ? 'Create a proposal first' : undefined}
      >
        <PlusIcon />
        {label}
      </button>
    );
  };

  const isLoading = proposalsLoading || (tab !== 'proposals' && assetsLoading);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#03143B] rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="8" width="18" height="12" rx="2" />
                  <rect x="7" y="3" width="10" height="7" rx="1" fill="#F59E0B" />
                  <rect x="6" y="10" width="5" height="1" rx="0.5" fill="#1e293b" />
                  <rect x="13" y="10" width="5" height="1" rx="0.5" fill="#1e293b" />
                  <rect x="19" y="12" width="2" height="4" rx="0.5" fill="#94a3b8" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Prop Tart</h1>
                <p className="text-sm text-gray-500">Your Workspace</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {email && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{email}</span>
                  <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-700">
                    Sign out
                  </button>
                </div>
              )}
              {primaryAction()}
            </div>
          </div>
        </div>
      </header>

      {/* Migration Banner */}
      {showMigration && !migrationResult && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-800 font-medium">
                  Found {migrationCount} proposal{migrationCount > 1 ? 's' : ''} in local storage
                </p>
                <p className="text-blue-600 text-sm">Would you like to migrate them to the cloud?</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleMigrate}
                  disabled={migrating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {migrating ? 'Migrating...' : 'Migrate Now'}
                </button>
                <button
                  onClick={() => setShowMigration(false)}
                  className="px-4 py-2 text-blue-600 hover:text-blue-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {migrationResult && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-green-800">
                Migration complete: {migrationResult.success} succeeded
                {migrationResult.failed > 0 && `, ${migrationResult.failed} failed`}
              </p>
              <button
                onClick={() => {
                  setMigrationResult(null);
                  setShowMigration(false);
                }}
                className="text-green-600 hover:text-green-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs + Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(
              [
                { id: 'proposals' as const, label: 'Proposals', count: filteredProposals.length },
                { id: 'microsites' as const, label: 'Microsites', count: filteredMicrosites.length },
                { id: 'pdfs' as const, label: 'PDFs', count: filteredPdfs.length },
              ]
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTab(opt.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === opt.id
                    ? 'bg-white text-[#03143B] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {opt.label}
                <span className="ml-1.5 text-xs text-gray-400">{opt.count}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(
              [
                { id: 'all' as const, label: 'All' },
                { id: 'mine' as const, label: 'Mine' },
              ]
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setOwnerFilter(opt.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  ownerFilter === opt.id
                    ? 'bg-white text-[#03143B] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="px-3 py-1.5 bg-gray-100 border-0 rounded-lg text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#03143B]"
          >
            <option value="last-modified">Last Modified</option>
            <option value="first-created">First Created</option>
          </select>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-[#03143B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-red-500 mb-4">Error: {error}</div>
            <button
              onClick={() => refresh()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Try Again
            </button>
          </div>
        ) : tab === 'proposals' ? (
          filteredProposals.length === 0 ? (
            <EmptyState
              title="No proposals yet"
              body="Create your first proposal to get started."
              actionLabel="New Proposal"
              onAction={handleCreateProposal}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProposals.map((p) => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  onOpen={() => router.push(`/p/${p.id}`)}
                  onDuplicate={() => handleDuplicateProposal(p.id)}
                  onRequestDelete={() => setDeleteTargetId(p.id)}
                  onRename={(newName) => handleRenameProposal(p.id, newName)}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )
        ) : tab === 'microsites' ? (
          filteredMicrosites.length === 0 ? (
            <EmptyState
              title="No microsites yet"
              body={
                proposals.filter((p) => p.isOwner).length === 0
                  ? 'Create a proposal first, then publish it as a microsite.'
                  : 'Create your first microsite.'
              }
              actionLabel="New Microsite"
              onAction={() => handleCreateAssetFromTab('microsite')}
              disabled={proposals.filter((p) => p.isOwner).length === 0}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMicrosites.map((m) => (
                <MicrositeCard key={m.id} microsite={m} isOwner={m.owner_email === email} />
              ))}
            </div>
          )
        ) : (
          filteredPdfs.length === 0 ? (
            <EmptyState
              title="No PDFs yet"
              body={
                proposals.filter((p) => p.isOwner).length === 0
                  ? 'Create a proposal first, then generate a PDF.'
                  : 'Create your first PDF.'
              }
              actionLabel="New PDF"
              onAction={() => handleCreateAssetFromTab('pdf')}
              disabled={proposals.filter((p) => p.isOwner).length === 0}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPdfs.map((pdf) => (
                <PdfCard
                  key={pdf.id}
                  pdf={pdf}
                  isOwner={pdf.owner_email === email}
                />
              ))}
            </div>
          )
        )}
      </main>

      {pickerOpen && (
        <ProposalPicker
          kind={pickerOpen}
          proposals={proposals.filter((p) => p.isOwner)}
          onSelect={(proposalId) => handleCreateAsset(pickerOpen, proposalId)}
          onClose={() => setPickerOpen(null)}
        />
      )}

      {deleteTargetId && (() => {
        const target = proposals.find((p) => p.id === deleteTargetId);
        if (!target) return null;
        return (
          <DeleteProposalModal
            companyName={target.companyName || 'Unnamed Company'}
            micrositeCount={target.micrositeCount}
            pdfCount={target.pdfCount}
            loading={actionLoading}
            onClose={() => setDeleteTargetId(null)}
            onConfirm={() => handleDeleteProposal(deleteTargetId)}
          />
        );
      })()}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  disabled,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500 mb-6">{body}</p>
      <button
        onClick={onAction}
        disabled={disabled}
        className="px-6 py-3 bg-[#03143B] text-white rounded-lg hover:bg-[#03143B]/90 transition-colors disabled:opacity-50"
      >
        {actionLabel}
      </button>
    </div>
  );
}

interface ProposalCardProps {
  proposal: {
    id: string;
    companyName: string;
    aeName: string;
    updatedAt: string;
    ownerEmail: string;
    isOwner: boolean;
    hasGeneratedContent: boolean;
    micrositeCount: number;
    pdfCount: number;
  };
  actionLoading: boolean;
  onOpen: () => void;
  onDuplicate: () => void;
  onRequestDelete: () => void;
  onRename: (newName: string) => void;
}

function ProposalCard({
  proposal,
  actionLoading,
  onOpen,
  onDuplicate,
  onRequestDelete,
  onRename,
}: ProposalCardProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(proposal.companyName);

  const startEdit = () => {
    if (!proposal.isOwner) return;
    setDraftName(proposal.companyName);
    setEditing(true);
  };

  const commit = () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== proposal.companyName) {
      onRename(trimmed);
    }
    setEditing(false);
  };

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm p-5 transition-shadow hover:shadow-md ${
        proposal.isOwner ? 'border-gray-200' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Proposal</span>
        {!proposal.isOwner && (
          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
            View Only · {proposal.ownerEmail}
          </span>
        )}
      </div>

      {editing ? (
        <input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setDraftName(proposal.companyName);
              setEditing(false);
            }
          }}
          className="text-lg font-semibold text-gray-900 w-full mb-1 px-2 py-0.5 border border-blue-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <h3
          onClick={startEdit}
          className={`text-lg font-semibold text-gray-900 truncate mb-1 ${
            proposal.isOwner ? 'cursor-text hover:text-[#03143B]' : ''
          }`}
          title={proposal.isOwner ? 'Click to rename' : undefined}
        >
          {proposal.companyName || 'Unnamed Company'}
        </h3>
      )}

      {proposal.aeName && <div className="text-sm text-gray-500">{proposal.aeName}</div>}
      <div className="text-xs text-gray-400 mb-3">Last modified: {formatDate(proposal.updatedAt)}</div>

      {(proposal.micrositeCount > 0 || proposal.pdfCount > 0) && (
        <div className="flex items-center gap-2 mb-3 text-xs">
          {proposal.micrositeCount > 0 && (
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
              {proposal.micrositeCount} {proposal.micrositeCount === 1 ? 'microsite' : 'microsites'}
            </span>
          )}
          {proposal.pdfCount > 0 && (
            <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded">
              {proposal.pdfCount} {proposal.pdfCount === 1 ? 'PDF' : 'PDFs'}
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onOpen}
          className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
            proposal.isOwner
              ? 'bg-[#03143B] text-white hover:bg-[#03143B]/90'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {proposal.isOwner ? 'Open' : 'View'}
        </button>
        {proposal.isOwner && (
          <>
            <button
              onClick={onDuplicate}
              disabled={actionLoading}
              className="px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Duplicate"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={onRequestDelete}
              disabled={actionLoading}
              className="px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-50"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DeleteProposalModal({
  companyName,
  micrositeCount,
  pdfCount,
  loading,
  onClose,
  onConfirm,
}: {
  companyName: string;
  micrositeCount: number;
  pdfCount: number;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const hasAssets = micrositeCount > 0 || pdfCount > 0;
  const [typed, setTyped] = useState('');
  const canConfirm = !hasAssets || typed.trim() === 'Confirm';

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const assetSummary = [
    micrositeCount > 0 ? `${micrositeCount} ${micrositeCount === 1 ? 'microsite' : 'microsites'}` : null,
    pdfCount > 0 ? `${pdfCount} ${pdfCount === 1 ? 'PDF' : 'PDFs'}` : null,
  ]
    .filter(Boolean)
    .join(' and ');

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900">Delete proposal?</h3>
              <p className="text-sm text-gray-500 mt-1 truncate">{companyName}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-700">
            This will permanently delete all inputs, pricing, ROI configuration, and generated content for this proposal.
          </p>
          {hasAssets && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-medium text-red-800 mb-1">
                This proposal has published assets
              </p>
              <p className="text-sm text-red-700">
                Deleting will also remove {assetSummary}. Any live microsite links will stop working.
              </p>
              <label className="block mt-3 text-xs font-medium text-red-800">
                Type <span className="font-mono">Confirm</span> to proceed
              </label>
              <input
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Confirm"
                className="mt-1 w-full px-3 py-2 border border-red-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm || loading}
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Deleting...' : 'Delete proposal'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MicrositeCard({
  microsite,
  isOwner,
}: {
  microsite: MicrositeItem;
  isOwner: boolean;
}) {
  const isArchived = !!microsite.unpublished_at;
  return (
    <a
      href={`/m/${microsite.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 block"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-900 truncate">{microsite.name}</div>
            <div className="text-xs text-gray-500 truncate">
              {microsite.proposalCompanyName || microsite.proposalName || 'Proposal'}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {isArchived ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Archived
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
              )}
              {!isOwner && (
                <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                  {microsite.owner_email}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <div className="flex items-center justify-between">
          <span>Views</span>
          <span>{microsite.view_count}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Updated</span>
          <span>{formatDate(microsite.updated_at)}</span>
        </div>
      </div>
    </a>
  );
}

function PdfCard({
  pdf,
  isOwner,
}: {
  pdf: PdfItem;
  isOwner: boolean;
}) {
  return (
    <a
      href={`/p/${pdf.proposal_id}/pdf/${pdf.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 text-left w-full block"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900 truncate">{pdf.name}</div>
          <div className="text-xs text-gray-500 truncate">
            {pdf.proposalCompanyName || pdf.proposalName || 'Proposal'}
          </div>
          {!isOwner && (
            <span className="inline-block mt-1 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
              {pdf.owner_email}
            </span>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <div className="flex items-center justify-between">
          <span>Created</span>
          <span>{formatDate(pdf.created_at)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Updated</span>
          <span>{formatDate(pdf.updated_at || pdf.created_at)}</span>
        </div>
      </div>
    </a>
  );
}

function ProposalPicker({
  kind,
  proposals,
  onSelect,
  onClose,
}: {
  kind: 'microsite' | 'pdf';
  proposals: { id: string; companyName: string; updatedAt: string }[];
  onSelect: (proposalId: string) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Create {kind === 'microsite' ? 'Microsite' : 'PDF'}
          </h3>
          <p className="text-sm text-gray-500">Choose which proposal to create it for.</p>
        </div>
        <div className="overflow-y-auto p-2">
          {proposals.length === 0 ? (
            <div className="p-6 text-sm text-gray-500 text-center">
              You don&apos;t own any proposals yet. Create one first.
            </div>
          ) : (
            proposals.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="w-full text-left px-3 py-3 rounded-lg hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {p.companyName || 'Unnamed Company'}
                  </div>
                  <div className="text-xs text-gray-500">Modified {formatDate(p.updatedAt)}</div>
                </div>
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
