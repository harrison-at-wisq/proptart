'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MOUInputs, MOUContentOverrides, MOU_VALUE_DRIVER_LABELS } from '@/types/mou';
import { EditableText } from '@/components/ui/EditableText';

interface MOUDocumentProps {
  inputs: MOUInputs;
  proposalId?: string | null;
  onClose?: () => void;
  onContentChange?: (overrides: MOUContentOverrides) => void;
}

export function MOUDocument({ inputs, proposalId, onClose, onContentChange }: MOUDocumentProps) {
  const [contentOverrides, setContentOverrides] = useState<MOUContentOverrides>(
    inputs.contentOverrides || {}
  );
  const [exporting, setExporting] = useState(false);
  const isInitialMount = useRef(true);

  // Notify parent when contentOverrides changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onContentChange?.(contentOverrides);
  }, [contentOverrides, onContentChange]);

  const generated = inputs.generatedContent;
  if (!generated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No generated content yet.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#03143B] text-white rounded-lg hover:bg-[#03143B]/90"
          >
            Back to Editor
          </button>
        </div>
      </div>
    );
  }

  const company = inputs.company;
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Override updaters
  const updateSituationSummary = useCallback((value: string) => {
    setContentOverrides(prev => ({ ...prev, situationSummary: value }));
  }, []);

  const updateChallenge = useCallback((i: number, field: 'headline' | 'detail', value: string) => {
    setContentOverrides(prev => ({
      ...prev,
      challenges: {
        ...prev.challenges,
        [i]: { ...prev.challenges?.[i], [field]: value },
      },
    }));
  }, []);

  const updateValueAlignment = useCallback((i: number, field: 'headline' | 'description', value: string) => {
    setContentOverrides(prev => ({
      ...prev,
      valueAlignment: {
        ...prev.valueAlignment,
        [i]: { ...prev.valueAlignment?.[i], [field]: value },
      },
    }));
  }, []);

  const updateNextStep = useCallback((i: number, field: 'title' | 'description', value: string) => {
    setContentOverrides(prev => ({
      ...prev,
      proposedNextSteps: {
        ...prev.proposedNextSteps,
        [i]: { ...prev.proposedNextSteps?.[i], [field]: value },
      },
    }));
  }, []);

  const updateClosingStatement = useCallback((value: string) => {
    setContentOverrides(prev => ({ ...prev, closingStatement: value }));
  }, []);

  const handleExportPdf = () => window.print();

  const handleExportDocx = async () => {
    setExporting(true);
    try {
      const exportInputs = { ...inputs, contentOverrides };
      const res = await fetch('/api/export-mou-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: exportInputs }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Wisq MOU - ${company.companyName || 'Draft'}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('DOCX export error:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed Control Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Editor
            </button>
            <div className="h-5 w-px bg-gray-300" />
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">MOU</span>
            <span className="text-sm text-gray-600">
              {company.companyName || 'Draft MOU'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportDocx}
              disabled={exporting}
              className="px-3 py-2 text-sm border border-[#03143B] text-[#03143B] rounded-lg hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50"
            >
              {exporting ? (
                <>
                  <div className="w-3 h-3 border-2 border-[#03143B] border-t-transparent rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export DOCX
                </>
              )}
            </button>
            <button
              onClick={handleExportPdf}
              className="px-3 py-2 text-sm bg-[#03143B] text-white rounded-lg hover:bg-[#03143B]/90 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Document Body */}
      <div className="pt-20 pb-16 print:pt-0 print:pb-0">
        <div className="max-w-4xl mx-auto">

          {/* ===== COVER PAGE ===== */}
          <div className="bg-white rounded-lg shadow-sm mb-8 overflow-hidden print:shadow-none print:rounded-none print:mb-0 print:break-after-page">
            <div className="relative">
              {/* Top accent bar */}
              <div className="h-2 bg-[#4d65ff]" />

              <div className="px-12 py-16">
                {/* Logo */}
                <img
                  src="/wisq-logo.svg"
                  alt="Wisq"
                  className="h-10 mb-12"
                />

                {/* Document Type Label */}
                <p className="text-sm font-semibold tracking-widest text-[#4d65ff] uppercase mb-3">
                  Memorandum of Understanding
                </p>

                {/* Company Name */}
                <h1 className="text-4xl font-bold text-[#03143B] mb-2">
                  {company.companyName || 'Draft'}
                </h1>

                {/* Accent line */}
                <div className="w-16 h-1 bg-[#4d65ff] mb-8" />

                {/* Subtitle */}
                <p className="text-lg text-gray-600 mb-12">
                  A summary of our discussion and proposed path forward
                </p>

                {/* Contact & Date */}
                <div className="border-t border-gray-200 pt-6 mt-8 flex justify-between text-sm text-gray-500">
                  <div>
                    <p className="font-medium text-gray-900">{company.contactName}</p>
                    <p>{company.contactTitle}</p>
                    <p>{company.companyName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{today}</p>
                    <p>Prepared by Wisq</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== WHAT WE HEARD ===== */}
          <div className="bg-white rounded-lg shadow-sm mb-8 overflow-hidden print:shadow-none print:rounded-none print:mb-0 print:break-after-page">
            <div className="px-12 py-10">
              <p className="text-sm font-semibold tracking-widest text-[#4d65ff] uppercase mb-2">
                Understanding Your Business
              </p>
              <h2 className="text-2xl font-bold text-[#03143B] mb-6">What We Heard</h2>

              {/* Situation Summary */}
              <div className="mb-8">
                <EditableText
                  value={contentOverrides.situationSummary || ''}
                  defaultValue={generated.situationSummary}
                  onChange={updateSituationSummary}
                  as="div"
                  className="text-gray-700 leading-relaxed whitespace-pre-wrap"
                  multiline
                />
              </div>

              {/* Challenges */}
              <h3 className="text-lg font-semibold text-[#03143B] mb-4">Key Challenges Identified</h3>
              <div className="space-y-4">
                {generated.challenges.map((challenge, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="w-8 h-8 bg-[#03143B] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-sm font-bold">{i + 1}</span>
                    </div>
                    <div className="flex-1">
                      <EditableText
                        value={contentOverrides.challenges?.[i]?.headline || ''}
                        defaultValue={challenge.headline}
                        onChange={(v) => updateChallenge(i, 'headline', v)}
                        as="h4"
                        className="font-semibold text-gray-900 mb-1"
                      />
                      <EditableText
                        value={contentOverrides.challenges?.[i]?.detail || ''}
                        defaultValue={challenge.detail}
                        onChange={(v) => updateChallenge(i, 'detail', v)}
                        as="p"
                        className="text-gray-600 text-sm"
                        multiline
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== HOW WISQ CAN HELP ===== */}
          <div className="bg-white rounded-lg shadow-sm mb-8 overflow-hidden print:shadow-none print:rounded-none print:mb-0 print:break-after-page">
            <div className="px-12 py-10">
              <p className="text-sm font-semibold tracking-widest text-[#4d65ff] uppercase mb-2">
                Value Alignment
              </p>
              <h2 className="text-2xl font-bold text-[#03143B] mb-6">How Wisq Can Help</h2>

              <div className="space-y-4">
                {generated.valueAlignment.map((item, i) => (
                  <div
                    key={i}
                    className="bg-[#f3f4f6] border border-gray-200 rounded-lg p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-[#03143B] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-sm font-bold">{i + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold tracking-wider uppercase text-[#4d65ff] mb-1">
                          {MOU_VALUE_DRIVER_LABELS[item.driver] || item.driver}
                        </p>
                        <EditableText
                          value={contentOverrides.valueAlignment?.[i]?.headline || ''}
                          defaultValue={item.headline}
                          onChange={(v) => updateValueAlignment(i, 'headline', v)}
                          as="h3"
                          className="text-lg font-semibold text-[#03143B] mb-2"
                        />
                        <EditableText
                          value={contentOverrides.valueAlignment?.[i]?.description || ''}
                          defaultValue={item.description}
                          onChange={(v) => updateValueAlignment(i, 'description', v)}
                          as="p"
                          className="text-gray-600 text-sm"
                          multiline
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== PROPOSED NEXT STEPS ===== */}
          <div className="bg-white rounded-lg shadow-sm mb-8 overflow-hidden print:shadow-none print:rounded-none print:mb-0 print:break-after-page">
            <div className="px-12 py-10">
              <p className="text-sm font-semibold tracking-widest text-[#4d65ff] uppercase mb-2">
                Moving Forward Together
              </p>
              <h2 className="text-2xl font-bold text-[#03143B] mb-6">Proposed Next Steps</h2>

              <div className="space-y-4">
                {generated.proposedNextSteps.map((step, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="w-8 h-8 bg-[#03143B] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-sm font-bold">{i + 1}</span>
                    </div>
                    <div className="flex-1">
                      <EditableText
                        value={contentOverrides.proposedNextSteps?.[i]?.title || ''}
                        defaultValue={step.title}
                        onChange={(v) => updateNextStep(i, 'title', v)}
                        as="h3"
                        className="font-semibold text-gray-900 mb-1"
                      />
                      <EditableText
                        value={contentOverrides.proposedNextSteps?.[i]?.description || ''}
                        defaultValue={step.description}
                        onChange={(v) => updateNextStep(i, 'description', v)}
                        as="p"
                        className="text-gray-600 text-sm"
                        multiline
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== CLOSING ===== */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden print:shadow-none print:rounded-none">
            <div className="px-12 py-10">
              <div className="border-l-4 border-[#4d65ff] pl-6 mb-8">
                <EditableText
                  value={contentOverrides.closingStatement || ''}
                  defaultValue={generated.closingStatement}
                  onChange={updateClosingStatement}
                  as="p"
                  className="text-lg text-gray-700 italic leading-relaxed"
                  multiline
                />
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 pt-6 flex items-center justify-between">
                <img
                  src="/wisq-logo.svg"
                  alt="Wisq"
                  className="h-8 opacity-50"
                />
                <p className="text-sm text-gray-400">
                  wisq.ai
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          .bg-\\[\\#03143B\\] {
            background-color: #03143B !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .bg-\\[\\#4d65ff\\] {
            background-color: #4d65ff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .bg-\\[\\#f3f4f6\\] {
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
