'use client';

import React, { use, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ProposalInputs } from '@/types/proposal';
import ExportEditor from '@/components/export/ExportEditor';
import { ExportSection, buildDefaultSections } from '@/lib/export-sections';

export default function PdfEditorPage({
  params,
}: {
  params: Promise<{ id: string; pdfSlug: string }>;
}) {
  const resolvedParams = use(params);
  const proposalId = resolvedParams.id;
  // URL is /p/[id]/assets/pdf-<uuid>, so pdfSlug = "pdf-<uuid>" — strip the prefix
  const rawPdfId = resolvedParams.pdfSlug.replace(/^pdf-/, '');

  const router = useRouter();
  const [pdfData, setPdfData] = useState<ProposalInputs | null>(null);
  const [pdfName, setPdfName] = useState('');
  const [initialSections, setInitialSections] = useState<ExportSection[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionsRef = useRef<ExportSection[]>([]);

  useEffect(() => {
    fetch(`/api/pdf-exports/${rawPdfId}`, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load PDF export: ${res.status}`);
        return res.json();
      })
      .then(json => {
        const record = json.pdfExport;
        if (!record) {
          router.replace(`/p/${proposalId}/assets`);
          return;
        }
        const data = record.data as ProposalInputs;
        setPdfData(data);
        setPdfName(record.name || 'PDF Export');

        // Use saved sections if available, otherwise build defaults
        const savedSections = record.sections_config;
        if (savedSections && Array.isArray(savedSections) && savedSections.length > 0) {
          setInitialSections(savedSections as ExportSection[]);
        } else {
          setInitialSections(buildDefaultSections(data));
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [rawPdfId, proposalId, router]);

  // Auto-save sections when they change (debounced)
  const handleSectionsChange = useCallback((sections: ExportSection[]) => {
    sectionsRef.current = sections;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaving(true);
      fetch(`/api/pdf-exports/${rawPdfId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections_config: sectionsRef.current }),
      })
        .catch(err => console.error('Failed to save:', err))
        .finally(() => setSaving(false));
    }, 1000);
  }, [rawPdfId]);

  // Save inputs changes (e.g. color palette) — debounced
  const inputsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleInputsChange = useCallback((updatedInputs: ProposalInputs) => {
    setPdfData(updatedInputs);
    if (inputsSaveTimerRef.current) clearTimeout(inputsSaveTimerRef.current);
    inputsSaveTimerRef.current = setTimeout(() => {
      setSaving(true);
      fetch(`/api/pdf-exports/${rawPdfId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatedInputs }),
      })
        .catch(err => console.error('Failed to save inputs:', err))
        .finally(() => setSaving(false));
    }, 1000);
  }, [rawPdfId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-300 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#03143B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading PDF editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-300 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.push(`/p/${proposalId}/assets`)}
            className="px-4 py-2 bg-[#03143B] text-white rounded-lg hover:bg-[#03143B]/90"
          >
            Back to Assets
          </button>
        </div>
      </div>
    );
  }

  if (!pdfData || !initialSections) return null;

  return (
    <ExportEditor
      initialSections={initialSections}
      inputs={pdfData}
      proposalId={proposalId}
      onSectionsChange={handleSectionsChange}
      onInputsChange={handleInputsChange}
      toolbar={
        <PdfToolbar
          pdfName={pdfName}
          inputs={pdfData}
          saving={saving}
          onClose={() => router.push(`/p/${proposalId}/assets`)}
        />
      }
      onClose={() => router.push(`/p/${proposalId}/assets`)}
    />
  );
}

// Simplified toolbar for PDF editor (no microsite controls)
function PdfToolbar({
  pdfName,
  inputs,
  saving,
  onClose,
}: {
  pdfName: string;
  inputs: ProposalInputs;
  saving: boolean;
  onClose: () => void;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

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
      link.download = `${pdfName} - ${new Date().toLocaleDateString().replace(/\//g, '-')}.docx`;
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

  return (
    <>
      {/* Left: save indicator */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2 print:hidden">
        {saving && (
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur rounded-lg shadow-lg px-3 py-2 border border-gray-200">
            <svg className="animate-spin h-3 w-3 text-gray-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs text-gray-500">Saving...</span>
          </div>
        )}
      </div>

      {/* Right: export + close */}
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
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
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
        <button
          onClick={onClose}
          className="px-4 py-2 bg-white text-gray-700 rounded-lg shadow-lg hover:bg-gray-50 text-sm font-medium border border-gray-200"
        >
          Back to Assets
        </button>
      </div>

      {/* Error toast */}
      {exportError && (
        <div className="fixed top-16 right-4 z-50 print:hidden">
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
        </div>
      )}
    </>
  );
}
