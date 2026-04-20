'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ProposalInputs, ColorPalette } from '@/types/proposal';
import { DEFAULT_COLOR_PALETTE } from '@/types/proposal';

interface MicrositeAsset {
  id: string;
  slug: string;
  name: string;
  published_at: string;
  unpublished_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
  updated_at: string;
  owner_email: string;
}

interface PdfExportAsset {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  owner_email: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelativeDate(dateStr: string) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

export default function AssetsWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [microsites, setMicrosites] = useState<MicrositeAsset[]>([]);
  const [pdfExports, setPdfExports] = useState<PdfExportAsset[]>([]);
  const [proposalName, setProposalName] = useState('');
  const [proposalData, setProposalData] = useState<ProposalInputs | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchAssets = useCallback(() => {
    return fetch(`/api/proposals/${id}/assets`, { cache: 'no-store' })
      .then(res => res.json())
      .then(json => {
        setMicrosites(json.microsites || []);
        setPdfExports(json.pdfExports || []);
      });
  }, [id]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/proposals/${id}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(json => {
          const data = json?.proposal?.data as ProposalInputs | undefined;
          const companyName = data?.company?.companyName?.trim();
          setProposalName(companyName || json?.proposal?.name || 'Untitled Proposal');
          if (data) setProposalData(data);
        }),
      fetchAssets(),
    ])
      .catch(err => console.error('Failed to load workspace:', err))
      .finally(() => setLoading(false));
  }, [id, fetchAssets]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleCreateMicrosite = async () => {
    if (!proposalData) return;
    setCreating('microsite');
    setDropdownOpen(false);
    try {
      const res = await fetch('/api/microsites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: id, data: proposalData }),
      });
      if (!res.ok) throw new Error('Failed to create microsite');
      await fetchAssets();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(null);
    }
  };

  const handleCreatePdf = async () => {
    if (!proposalData) return;
    setCreating('pdf');
    setDropdownOpen(false);
    try {
      const res = await fetch('/api/pdf-exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: id, data: proposalData }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to create PDF export');
      }
      const json = await res.json();
      const pdfId = json.pdfExport?.id;
      if (!pdfId) throw new Error('No PDF export ID returned');
      window.open(`/p/${id}/pdf/${pdfId}`, '_blank', 'noopener,noreferrer');
      await fetchAssets();
    } catch (err) {
      console.error(err);
      setCreating(null);
    }
  };

  const handleDeleteMicrosite = async (slug: string) => {
    if (!confirm('Delete this microsite? This cannot be undone.')) return;
    await fetch(`/api/microsites/${slug}`, { method: 'DELETE' });
    await fetchAssets();
  };

  const handleArchiveMicrosite = async (slug: string) => {
    await fetch(`/api/microsites/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unpublish: true }),
    });
    await fetchAssets();
  };

  const handleRepublishMicrosite = async (slug: string) => {
    await fetch(`/api/microsites/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ republish: true }),
    });
    await fetchAssets();
  };

  const handleDuplicateMicrosite = async (site: MicrositeAsset) => {
    setCreating('microsite');
    try {
      // Fetch full data from the microsite
      const res = await fetch(`/api/microsites/${site.slug}`);
      const json = await res.json();
      const data = json.microsite?.data;
      if (!data) throw new Error('No data');
      await fetch('/api/microsites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: id, data, name: `${site.name} (Copy)` }),
      });
      await fetchAssets();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(null);
    }
  };

  const handleDeletePdf = async (pdfId: string) => {
    if (!confirm('Delete this PDF export? This cannot be undone.')) return;
    await fetch(`/api/pdf-exports/${pdfId}`, { method: 'DELETE' });
    await fetchAssets();
  };

  const handleDuplicatePdf = async (pdf: PdfExportAsset) => {
    setCreating('pdf');
    try {
      // Fetch full data from the PDF export
      const res = await fetch(`/api/pdf-exports/${pdf.id}`);
      const json = await res.json();
      const record = json.pdfExport;
      if (!record) throw new Error('No data');
      const createRes = await fetch('/api/pdf-exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: id,
          data: record.data,
          sections_config: record.sections_config,
          name: `${pdf.name} (Copy)`,
        }),
      });
      if (!createRes.ok) throw new Error('Failed');
      await fetchAssets();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(null);
    }
  };

  const handleRenameMicrosite = async (slug: string, newName: string) => {
    await fetch(`/api/microsites/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    await fetchAssets();
  };

  const handleRenamePdf = async (pdfId: string, newName: string) => {
    await fetch(`/api/pdf-exports/${pdfId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    await fetchAssets();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#03143B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading workspace...</p>
        </div>
      </div>
    );
  }

  const totalAssets = microsites.length + pdfExports.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Back to workspace"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-[#03143B]">{proposalName}</h1>
                <p className="text-sm text-gray-500">
                  {totalAssets} asset{totalAssets !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/p/${id}/inputs`)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-[#03143B] border border-[#03143B] rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Inputs
              </button>

            {/* New Asset dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={!proposalData || creating !== null}
                className="flex items-center gap-2 px-4 py-2 bg-[#03143B] text-white rounded-lg hover:bg-[#03143B]/90 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Asset
                  </>
                )}
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={handleCreateMicrosite}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3"
                  >
                    <svg className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-gray-900">New Microsite</div>
                      <div className="text-xs text-gray-500">Publish a live web page</div>
                    </div>
                  </button>
                  <button
                    onClick={handleCreatePdf}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3"
                  >
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-gray-900">New PDF Export</div>
                      <div className="text-xs text-gray-500">Create a customizable PDF</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {totalAssets === 0 ? (
          /* Empty state */
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">No assets yet</h2>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Create your first microsite or PDF export to share your proposal.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleCreateMicrosite}
                disabled={!proposalData || creating !== null}
                className="flex items-center gap-2 px-4 py-2 bg-[#03143B] text-white rounded-lg hover:bg-[#03143B]/90 text-sm font-medium disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                New Microsite
              </button>
              <button
                onClick={handleCreatePdf}
                disabled={!proposalData || creating !== null}
                className="flex items-center gap-2 px-4 py-2 bg-white text-[#03143B] border border-[#03143B] rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                New PDF Export
              </button>
            </div>
            {!proposalData && (
              <p className="text-xs text-amber-600 mt-4">
                Generate your proposal content first before creating assets.
              </p>
            )}
          </div>
        ) : (
          /* Card grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {microsites.map(site => {
              // Version number based on creation order (oldest = #1)
              const sortedByCreated = [...microsites].sort((a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime());
              const versionNum = sortedByCreated.findIndex(s => s.id === site.id) + 1;
              return (
                <MicrositeCard
                  key={site.id}
                  site={site}
                  versionNumber={versionNum}
                  colorPalette={proposalData?.colorPalette}
                  onArchive={() => handleArchiveMicrosite(site.slug)}
                  onRepublish={() => handleRepublishMicrosite(site.slug)}
                  onDuplicate={() => handleDuplicateMicrosite(site)}
                  onDelete={() => handleDeleteMicrosite(site.slug)}
                  onRename={(name) => handleRenameMicrosite(site.slug, name)}
                />
              );
            })}
            {pdfExports.map(pdf => {
              const sortedByCreated = [...pdfExports].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              const versionNum = sortedByCreated.findIndex(p => p.id === pdf.id) + 1;
              return (
                <PdfExportCard
                  key={pdf.id}
                  pdf={pdf}
                  versionNumber={versionNum}
                  proposalId={id}
                  colorPalette={proposalData?.colorPalette}
                  onDuplicate={() => handleDuplicatePdf(pdf)}
                  onDelete={() => handleDeletePdf(pdf.id)}
                  onRename={(name) => handleRenamePdf(pdf.id, name)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Microsite Card ─────────────────────────────────────────────────────────

function MicrositeCard({
  site,
  versionNumber,
  colorPalette,
  onArchive,
  onRepublish,
  onDuplicate,
  onDelete,
  onRename,
}: {
  site: MicrositeAsset;
  versionNumber: number;
  colorPalette?: ColorPalette;
  onArchive: () => void;
  onRepublish: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(site.name);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isArchived = !!site.unpublished_at;
  const micrositeUrl = `${origin}/m/${site.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(micrositeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveRename = () => {
    if (editName.trim() && editName !== site.name) {
      onRename(editName.trim());
    }
    setEditing(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        {/* Header: icon + name + status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              {editing ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleSaveRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(); if (e.key === 'Escape') setEditing(false); }}
                  className="text-sm font-medium text-gray-900 border border-blue-300 rounded px-2 py-0.5 w-full outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <button
                  onClick={() => { setEditing(true); setEditName(site.name); }}
                  className="text-sm font-medium text-gray-900 truncate block text-left hover:text-blue-600"
                  title="Click to rename"
                >
                  {site.name}
                </button>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400 font-medium">#{versionNumber}</span>
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
              </div>
            </div>
          </div>

          {/* Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                {isArchived ? (
                  <button onClick={() => { onRepublish(); setMenuOpen(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-gray-700">
                    Republish
                  </button>
                ) : (
                  <button onClick={() => { onArchive(); setMenuOpen(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-gray-700">
                    Archive
                  </button>
                )}
                <button onClick={() => { onDuplicate(); setMenuOpen(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-gray-700">
                  Duplicate
                </button>
                <button onClick={() => { setEditing(true); setEditName(site.name); setMenuOpen(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-gray-700">
                  Rename
                </button>
                <hr className="my-1" />
                <button onClick={() => { onDelete(); setMenuOpen(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-red-600">
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dates & stats */}
        <div className="text-xs text-gray-500 space-y-1 mb-4">
          <div className="flex items-center justify-between">
            <span>Created</span>
            <span>{formatDate(site.published_at)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Modified</span>
            <span>{formatRelativeDate(site.updated_at)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Views
            </span>
            <span>{site.view_count}</span>
          </div>
        </div>

        {/* Color Palette */}
        {colorPalette && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-gray-400">Colors</span>
            <div className="flex gap-0.5 flex-1">
              <div className="h-3 flex-1 rounded-sm" style={{ backgroundColor: colorPalette.primary }} />
              <div className="h-3 flex-1 rounded-sm" style={{ backgroundColor: colorPalette.accent }} />
              <div className="h-3 flex-1 rounded-sm border border-gray-100" style={{ backgroundColor: colorPalette.background }} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </>
            )}
          </button>
          {!isArchived && (
            <a
              href={`/m/${site.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#03143B] rounded-lg hover:bg-[#03143B]/90 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PDF Export Card ────────────────────────────────────────────────────────

function PdfExportCard({
  pdf,
  versionNumber,
  proposalId,
  colorPalette,
  onDuplicate,
  onDelete,
  onRename,
}: {
  pdf: PdfExportAsset;
  versionNumber: number;
  proposalId: string;
  colorPalette?: ColorPalette;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(pdf.name);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSaveRename = () => {
    if (editName.trim() && editName !== pdf.name) {
      onRename(editName.trim());
    }
    setEditing(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        {/* Header: icon + name */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              {editing ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleSaveRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(); if (e.key === 'Escape') setEditing(false); }}
                  className="text-sm font-medium text-gray-900 border border-blue-300 rounded px-2 py-0.5 w-full outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <button
                  onClick={() => { setEditing(true); setEditName(pdf.name); }}
                  className="text-sm font-medium text-gray-900 truncate block text-left hover:text-blue-600"
                  title="Click to rename"
                >
                  {pdf.name}
                </button>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400 font-medium">#{versionNumber}</span>
                <span className="text-xs text-gray-500">PDF Export</span>
              </div>
            </div>
          </div>

          {/* Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button onClick={() => { onDuplicate(); setMenuOpen(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-gray-700">
                  Duplicate
                </button>
                <button onClick={() => { setEditing(true); setEditName(pdf.name); setMenuOpen(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-gray-700">
                  Rename
                </button>
                <hr className="my-1" />
                <button onClick={() => { onDelete(); setMenuOpen(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-red-600">
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="text-xs text-gray-500 space-y-1 mb-4">
          <div className="flex items-center justify-between">
            <span>Created</span>
            <span>{formatDate(pdf.created_at)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Modified</span>
            <span>{formatRelativeDate(pdf.updated_at || pdf.created_at)}</span>
          </div>
        </div>

        {/* Color Palette */}
        {colorPalette && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-gray-400">Colors</span>
            <div className="flex gap-0.5 flex-1">
              <div className="h-3 flex-1 rounded-sm" style={{ backgroundColor: colorPalette.primary }} />
              <div className="h-3 flex-1 rounded-sm" style={{ backgroundColor: colorPalette.accent }} />
              <div className="h-3 flex-1 rounded-sm border border-gray-100" style={{ backgroundColor: colorPalette.background }} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <a
            href={`/p/${proposalId}/pdf/${pdf.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#03143B] rounded-lg hover:bg-[#03143B]/90 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </a>
        </div>
      </div>
    </div>
  );
}
