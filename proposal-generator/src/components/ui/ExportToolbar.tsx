'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { ProposalInputs } from '@/types/proposal';

interface ExportToolbarProps {
  proposalId: string | null;
  inputs: ProposalInputs;
  onClose?: () => void;
}

export function ExportToolbar({ proposalId, inputs, onClose }: ExportToolbarProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Microsite management state
  const [micrositeSlug, setMicrositeSlug] = useState<string | null>(null);
  const [micrositeArchived, setMicrositeArchived] = useState(false);
  const [micrositeAction, setMicrositeAction] = useState<'archiving' | 'deleting' | 'republishing' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch microsite status on mount
  useEffect(() => {
    if (!proposalId) return;
    fetch(`/api/microsites?proposalId=${proposalId}&includeArchived=true`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.slug) {
          setMicrositeSlug(data.slug);
          setMicrositeArchived(!!data.unpublishedAt);
        }
      })
      .catch(() => {});
  }, [proposalId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportToDocx = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      const response = await fetch('/api/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate document');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Wisq Proposal - ${inputs.company.companyName} - ${new Date().toLocaleDateString().replace(/\//g, '-')}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error instanceof Error ? error.message : 'Failed to export');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePublishMicrosite = async () => {
    if (!proposalId) {
      setPublishError('Save the proposal first before publishing');
      return;
    }
    setIsPublishing(true);
    setPublishError(null);
    setPublishedUrl(null);

    try {
      const response = await fetch('/api/microsites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId, data: inputs }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to publish');
      }

      const { microsite } = await response.json();
      const url = `${window.location.origin}/m/${microsite.slug}`;
      setPublishedUrl(url);
      setMicrositeSlug(microsite.slug);
      setMicrositeArchived(false);
    } catch (error) {
      console.error('Publish error:', error);
      setPublishError(error instanceof Error ? error.message : 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleArchiveMicrosite = async () => {
    if (!micrositeSlug) return;
    setMicrositeAction('archiving');
    try {
      const res = await fetch(`/api/microsites/${micrositeSlug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unpublish: true }),
      });
      if (!res.ok) throw new Error('Failed to archive');
      setMicrositeArchived(true);
    } catch (error) {
      console.error('Archive error:', error);
      setPublishError(error instanceof Error ? error.message : 'Failed to archive microsite');
    } finally {
      setMicrositeAction(null);
    }
  };

  const handleDeleteMicrosite = async () => {
    if (!micrositeSlug) return;
    setMicrositeAction('deleting');
    try {
      const res = await fetch(`/api/microsites/${micrositeSlug}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setMicrositeSlug(null);
      setMicrositeArchived(false);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Delete error:', error);
      setPublishError(error instanceof Error ? error.message : 'Failed to delete microsite');
    } finally {
      setMicrositeAction(null);
    }
  };

  const handleRepublishMicrosite = async () => {
    if (!micrositeSlug || !proposalId) return;
    setMicrositeAction('republishing');
    try {
      const res = await fetch('/api/microsites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId, data: inputs }),
      });
      if (!res.ok) throw new Error('Failed to republish');
      const { microsite } = await res.json();
      setMicrositeSlug(microsite.slug);
      setMicrositeArchived(false);
      const url = `${window.location.origin}/m/${microsite.slug}`;
      setPublishedUrl(url);
    } catch (error) {
      console.error('Republish error:', error);
      setPublishError(error instanceof Error ? error.message : 'Failed to republish microsite');
    } finally {
      setMicrositeAction(null);
    }
  };

  const handleCopyUrl = useCallback(() => {
    if (publishedUrl) {
      navigator.clipboard.writeText(publishedUrl);
    }
  }, [publishedUrl]);

  // Determine microsite button label and action
  const micrositeButtonLabel = !micrositeSlug
    ? 'Publish Microsite'
    : micrositeArchived
    ? 'Republish Microsite'
    : 'Update Microsite';

  const micrositeButtonLoading =
    isPublishing || micrositeAction === 'republishing';

  const micrositeButtonLoadingLabel = !micrositeSlug
    ? 'Publishing...'
    : micrositeArchived
    ? 'Republishing...'
    : 'Updating...';

  const handleMicrositeAction = () => {
    if (!micrositeSlug || micrositeArchived) {
      if (micrositeArchived) {
        handleRepublishMicrosite();
      } else {
        handlePublishMicrosite();
      }
    } else {
      handlePublishMicrosite();
    }
  };

  const showMicrositeDropdown = !!micrositeSlug;

  return (
    <>
      {/* Left side: Microsite controls */}
      {proposalId && (
        <div className="fixed top-4 left-4 z-50 flex items-center gap-2 print:hidden">
          <div className="relative flex items-center">
            {/* Dropdown trigger — only shown when microsite exists */}
            {showMicrositeDropdown && (
              <div className="group relative">
                <button
                  className="h-[38px] px-2 bg-[#4d65ff] text-white rounded-l-lg shadow-lg hover:bg-[#3d55ef] border-r border-white/20 flex items-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {/* Dropdown menu */}
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                  {!micrositeArchived && (
                    <button
                      onClick={handleArchiveMicrosite}
                      disabled={micrositeAction === 'archiving'}
                      className="w-full px-4 py-2 text-left text-sm text-amber-700 hover:bg-amber-50 flex items-center gap-2 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      {micrositeAction === 'archiving' ? 'Archiving...' : 'Archive'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            )}
            {/* Main microsite button */}
            <button
              onClick={handleMicrositeAction}
              disabled={micrositeButtonLoading}
              className={`h-[38px] px-4 bg-[#4d65ff] text-white shadow-lg hover:bg-[#4d65ff]/90 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                showMicrositeDropdown ? 'rounded-r-lg' : 'rounded-lg'
              }`}
            >
              {micrositeButtonLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {micrositeButtonLoadingLabel}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                  {micrositeButtonLabel}
                </>
              )}
            </button>
          </div>
          {/* Status indicator */}
          {micrositeSlug && (
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur rounded-lg shadow-lg px-3 py-2 border border-gray-200">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${micrositeArchived ? 'bg-amber-500' : 'bg-green-500'}`} />
              <a
                href={`/m/${micrositeSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#4d65ff] hover:underline"
              >
                /m/{micrositeSlug}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Right side: Export / Close */}
      <div className="fixed top-4 right-4 z-50 flex gap-2 print:hidden">
        <button
          onClick={handleExportToDocx}
          disabled={isExporting}
          className="px-4 py-2 bg-white text-[#03143B] rounded-lg shadow-lg hover:bg-gray-50 text-sm font-medium border border-[#03143B] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isExporting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              Export Word
            </>
          )}
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-[#03143B] text-white rounded-lg shadow-lg hover:bg-[#03143B]/90 text-sm font-medium"
        >
          Export PDF
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white text-gray-700 rounded-lg shadow-lg hover:bg-gray-50 text-sm font-medium border border-gray-200"
          >
            Close
          </button>
        )}
      </div>

      {/* Error Toasts */}
      {(exportError || publishError) && (
        <div className="fixed top-16 right-4 z-50 space-y-2 print:hidden">
          {exportError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-sm">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium text-sm">Export Failed</p>
                  <p className="text-xs mt-1">{exportError}</p>
                </div>
                <button onClick={() => setExportError(null)} className="ml-auto text-red-500 hover:text-red-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          {publishError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-sm">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium text-sm">Publish Failed</p>
                  <p className="text-xs mt-1">{publishError}</p>
                </div>
                <button onClick={() => setPublishError(null)} className="ml-auto text-red-500 hover:text-red-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Published URL Dialog */}
      {publishedUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-[#03143B]">Microsite Published</h3>
                <p className="text-sm text-gray-500">Share this link with your prospect</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={publishedUrl}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-mono"
              />
              <button
                onClick={handleCopyUrl}
                className="px-4 py-2 bg-[#4d65ff] text-white rounded-lg text-sm font-medium hover:bg-[#4d65ff]/90 flex-shrink-0"
              >
                Copy
              </button>
            </div>
            <div className="flex gap-2">
              <a
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 text-center bg-[#03143B] text-white rounded-lg text-sm font-medium hover:bg-[#03143B]/90"
              >
                Open Microsite
              </a>
              <button
                onClick={() => setPublishedUrl(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Microsite Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:hidden">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Microsite</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently delete the microsite. Anyone with the link will no longer be able to access it. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMicrosite}
                disabled={micrositeAction === 'deleting'}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {micrositeAction === 'deleting' ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
