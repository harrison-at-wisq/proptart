'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ProposalInputs, ProposalContentOverrides, RFPAppendix as RFPAppendixType, resolveOtherValue, PAIN_POINT_LABELS, PainPoint, FAQSection, FAQ_PAGE_LABELS } from '@/types/proposal';
import { RFPAppendix } from './RFPAppendix';
import { EditableText, EditableBulletList } from '@/components/ui/EditableText';
import { calculatePricing, formatCurrency, formatCompactCurrency } from '@/lib/pricing-calculator';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
  calculate3YearProjection,
} from '@/lib/roi-calculator';
import {
  getOpportunityContent,
  getValueDriverContent,
  getPainPointContent,
  HARPER_STATS,
  SECURITY_FEATURES,
  IMPLEMENTATION_TIMELINE,
  WHY_NOW_CONTENT,
  NEXT_STEPS_OPTIONS,
} from '@/lib/content-templates';
import { getSelectedQuoteForSection } from '@/lib/customer-quotes';
import type { QuoteSection } from '@/types/proposal';

interface ProposalDocumentProps {
  inputs: ProposalInputs;
  proposalId?: string | null;
  onClose?: () => void;
  onContentChange?: (overrides: ProposalContentOverrides) => void;
}

export function ProposalDocument({ inputs, proposalId, onClose, onContentChange }: ProposalDocumentProps) {
  const documentRef = useRef<HTMLDivElement>(null);

  // State for content overrides (inline edits)
  const [contentOverrides, setContentOverrides] = useState<ProposalContentOverrides>(
    inputs.contentOverrides || {}
  );

  // Track if this is the initial mount to avoid triggering onChange on mount
  const isInitialMount = useRef(true);

  // Notify parent when contentOverrides changes (after render, not during)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onContentChange?.(contentOverrides);
  }, [contentOverrides, onContentChange]);

  // Helper to update overrides
  const updateOverride = useCallback(<K extends keyof ProposalContentOverrides>(
    key: K,
    value: ProposalContentOverrides[K]
  ) => {
    setContentOverrides(prev => ({ ...prev, [key]: value }));
  }, []);

  // Helper to get value with override priority: override > generated > template
  const getContent = <T,>(
    overrideValue: T | undefined,
    generatedValue: T | undefined,
    templateValue: T
  ): T => {
    if (overrideValue !== undefined && overrideValue !== '') return overrideValue;
    if (generatedValue !== undefined && generatedValue !== '') return generatedValue;
    return templateValue;
  };

  // Calculate all values
  const pricing = calculatePricing(inputs.pricing);
  const hrOutput = calculateHROperationsROI(inputs.hrOperations);
  const tier2Cases = inputs.hrOperations.tier2Workflows.reduce((sum, w) => sum + w.volumePerYear, 0);
  const legalOutput = calculateLegalComplianceROI(inputs.legalCompliance, tier2Cases);
  const employeeOutput = calculateEmployeeExperienceROI(inputs.employeeExperience);
  const summary = calculateROISummary(hrOutput, legalOutput, employeeOutput, pricing.annualRecurringRevenue);
  const projection = calculate3YearProjection(summary.grossAnnualValue, pricing.annualRecurringRevenue);

  // Get content
  const opportunityContent = getOpportunityContent(inputs.company.industry);
  const valueDriverContent = getValueDriverContent(inputs.primaryValueDriver);
  const painPointContent = getPainPointContent(inputs.painPoints);

  // Get selected next steps
  const selectedNextSteps = NEXT_STEPS_OPTIONS.filter(step =>
    inputs.nextSteps.includes(step.id as typeof inputs.nextSteps[number])
  );

  // FAQ helper: get FAQs for a specific page
  const getFAQsForPage = (pageId: string): FAQSection | undefined => {
    return inputs.faqSections?.find(s => s.pageId === pageId);
  };

  // FAQ render block
  const renderFAQBlock = (pageId: string, dark = false) => {
    const section = getFAQsForPage(pageId);
    if (!section || section.faqs.length === 0) return null;
    return (
      <div className={`mt-8 pt-6 border-t ${dark ? 'border-white/20' : 'border-gray-200'}`}>
        <h4 className={`text-sm font-semibold mb-3 uppercase tracking-wide ${dark ? 'text-white/70' : 'text-[#03143B]'}`}>Anticipated Questions</h4>
        <div className="space-y-3">
          {section.faqs.map((faq, i) => (
            <div key={i} className={`pl-4 border-l-2 ${dark ? 'border-white/30' : 'border-gray-200'}`}>
              <p className={`font-medium text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{faq.question}</p>
              <p className={`text-sm mt-1 ${dark ? 'text-white/70' : 'text-gray-600'}`}>{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Quote render block
  const renderQuoteBlock = (section: QuoteSection, dark = false) => {
    if (!inputs.selectedQuotes || inputs.selectedQuotes.length === 0) return null;
    const quote = getSelectedQuoteForSection(inputs.selectedQuotes, section);
    if (!quote) return null;
    return (
      <div className={`my-6 pl-5 border-l-4 ${dark ? 'border-white/50' : 'border-[#4d65ff]'}`}>
        <p className={`text-sm italic leading-relaxed ${dark ? 'text-white/90' : 'text-gray-700'}`}>
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className={`text-xs mt-2 ${dark ? 'text-white/60' : 'text-gray-500'}`}>
          &mdash; {quote.attribution}
        </p>
      </div>
    );
  };

  // Build customer integrations list (resolve "Other" to custom text)
  const customerIntegrations = [
    inputs.integrations.hcm && { name: resolveOtherValue(inputs.integrations.hcm, inputs.integrations.customHcm), category: 'HCM' },
    inputs.integrations.identity && { name: resolveOtherValue(inputs.integrations.identity, inputs.integrations.customIdentity), category: 'Identity' },
    inputs.integrations.documents && { name: resolveOtherValue(inputs.integrations.documents, inputs.integrations.customDocuments), category: 'Documents' },
    inputs.integrations.communication && { name: resolveOtherValue(inputs.integrations.communication, inputs.integrations.customCommunication), category: 'Communication' },
    inputs.integrations.ticketing && inputs.integrations.ticketing !== 'None / Not applicable' && { name: resolveOtherValue(inputs.integrations.ticketing, inputs.integrations.customTicketing), category: 'Ticketing' },
  ].filter(Boolean) as { name: string; category: string }[];

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

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
      // Call server-side API to generate document with logo
      const response = await fetch('/api/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate document');
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
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

  const handleCopyUrl = () => {
    if (publishedUrl) {
      navigator.clipboard.writeText(publishedUrl);
    }
  };

  return (
    <>
      {/* Fixed Header Controls - hidden in print */}
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
        {proposalId && !micrositeSlug && (
          <button
            onClick={handlePublishMicrosite}
            disabled={isPublishing}
            className="px-4 py-2 bg-[#4d65ff] text-white rounded-lg shadow-lg hover:bg-[#4d65ff]/90 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isPublishing ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Publishing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                Publish Microsite
              </>
            )}
          </button>
        )}
        {proposalId && micrositeSlug && !micrositeArchived && (
          <button
            onClick={handlePublishMicrosite}
            disabled={isPublishing}
            className="px-4 py-2 bg-[#4d65ff] text-white rounded-lg shadow-lg hover:bg-[#4d65ff]/90 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isPublishing ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Updating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                Update Microsite
              </>
            )}
          </button>
        )}
        {proposalId && micrositeSlug && micrositeArchived && (
          <button
            onClick={handleRepublishMicrosite}
            disabled={micrositeAction === 'republishing'}
            className="px-4 py-2 bg-[#4d65ff] text-white rounded-lg shadow-lg hover:bg-[#4d65ff]/90 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {micrositeAction === 'republishing' ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Republishing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                Republish Microsite
              </>
            )}
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white text-gray-700 rounded-lg shadow-lg hover:bg-gray-50 text-sm font-medium border border-gray-200"
          >
            Close
          </button>
        )}
      </div>

      {/* Export Error Toast */}
      {exportError && (
        <div className="fixed top-20 right-4 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg print:hidden max-w-sm">
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

      {/* Publish Error Toast */}
      {publishError && (
        <div className="fixed top-20 right-4 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg print:hidden max-w-sm">
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

      {/* Microsite Status Banner */}
      {micrositeSlug && !micrositeArchived && (
        <div className="fixed top-16 right-4 z-40 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 print:hidden max-w-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 truncate">Microsite live</span>
              <a
                href={`/m/${micrositeSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#4d65ff] hover:underline truncate"
              >
                /m/{micrositeSlug}
              </a>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={handleArchiveMicrosite}
                disabled={micrositeAction === 'archiving'}
                className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 disabled:opacity-50"
                title="Archive microsite (visitors will see a 'no longer available' message)"
              >
                {micrositeAction === 'archiving' ? 'Archiving...' : 'Archive'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100"
                title="Permanently delete microsite"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {micrositeSlug && micrositeArchived && (
        <div className="fixed top-16 right-4 z-40 bg-white border border-amber-200 rounded-lg shadow-lg px-4 py-3 print:hidden max-w-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
              <span className="text-sm font-medium text-amber-700">Microsite archived</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100"
                title="Permanently delete microsite"
              >
                Delete
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

      {/* Document Container */}
      <div
        ref={documentRef}
        className="proposal-document bg-white min-h-screen"
      >
        {/* Cover Page */}
        <section className="page cover-page min-h-screen flex flex-col justify-between p-12 border-l-8 border-[#03143B]">
          <div>
            <div className="text-sm font-semibold text-[#03143B] tracking-widest uppercase mb-2">
              Strategic Proposal
            </div>
            <EditableText
              value={contentOverrides.coverTitle || ''}
              defaultValue={`Transforming HR at ${inputs.company.companyName}`}
              onChange={(value) => updateOverride('coverTitle', value)}
              as="h1"
              className="text-5xl font-bold text-[#03143B] leading-tight mb-6"
            />
            <div className="w-24 h-1 bg-[#03143B] mb-8"></div>
            {(inputs.coverQuote || contentOverrides.coverQuote) && (
              <div className="text-xl text-gray-700 italic border-l-4 border-[#03143B] pl-4 mb-8 max-w-2xl">
                <p>&ldquo;<EditableText
                  value={contentOverrides.coverQuote || ''}
                  defaultValue={inputs.coverQuote || ''}
                  onChange={(value) => updateOverride('coverQuote', value)}
                  as="span"
                />&rdquo;</p>
              </div>
            )}
            <div className="text-lg text-gray-600 space-y-1">
              <p>Prepared for <span className="font-semibold text-gray-900">{inputs.company.contactName}</span>, {resolveOtherValue(inputs.company.contactTitle, inputs.company.customContactTitle)}</p>
            </div>
          </div>
          <div className="flex justify-between items-end">
            <div className="flex items-center gap-3">
              <img src="/wisq-logo.svg" alt="Wisq" className="h-12 w-12" />
              <p className="text-gray-500 text-sm">wisq.com</p>
            </div>
            <div className="text-right text-gray-500">
              <p>{today}</p>
            </div>
          </div>
        </section>

        {/* Executive Summary + Current State (combined for density) */}
        <section className="page p-12">
          <div className="border-b-2 border-[#03143B] pb-3 mb-6">
            <h2 className="text-3xl font-bold text-[#03143B]">Executive Summary</h2>
          </div>

          <div className="grid grid-cols-5 gap-6 mb-8">
            <div className="col-span-3">
              <EditableText
                value={contentOverrides.execSummaryInsight || ''}
                defaultValue={getContent(
                  contentOverrides.execSummaryInsight,
                  inputs.generatedContent?.execSummaryInsight,
                  opportunityContent.insight
                )}
                onChange={(value) => updateOverride('execSummaryInsight', value)}
                as="p"
                className="text-gray-700 mb-4"
                multiline
              />
              <div className="text-lg font-semibold text-[#03143B] italic border-l-4 border-[#03143B] pl-4 mb-4">
                <EditableText
                  value={contentOverrides.execSummaryVision || ''}
                  defaultValue={getContent(
                    contentOverrides.execSummaryVision,
                    inputs.generatedContent?.execSummaryVision,
                    opportunityContent.vision
                  )}
                  onChange={(value) => updateOverride('execSummaryVision', value)}
                  as="span"
                />
              </div>
              {renderQuoteBlock('executive-summary')}
              <ul className="space-y-2">
                {(contentOverrides.execSummaryBullets || inputs.generatedContent?.execSummaryBullets || opportunityContent.bullets).map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-600 text-sm">
                    <span className="w-1.5 h-1.5 bg-[#03143B] rounded-full mt-2 flex-shrink-0"></span>
                    <EditableText
                      value={contentOverrides.execSummaryBullets?.[i] || ''}
                      defaultValue={bullet}
                      onChange={(value) => {
                        const bullets = [...(contentOverrides.execSummaryBullets || opportunityContent.bullets)];
                        bullets[i] = value;
                        updateOverride('execSummaryBullets', bullets);
                      }}
                      as="span"
                    />
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-span-2 bg-gray-50 p-5 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-[#03143B] mb-3 uppercase tracking-wide">Key Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-gray-600 text-sm">Annual Investment</span>
                  <span className="text-xl font-bold text-[#03143B]">{formatCompactCurrency(pricing.annualRecurringRevenue)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-gray-600 text-sm">Projected Annual Value</span>
                  <span className="text-xl font-bold text-[#03143B]">{formatCompactCurrency(summary.grossAnnualValue)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-gray-600 text-sm">Return on Investment</span>
                  <span className="text-xl font-bold text-[#03143B]">{summary.totalROI.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Payback Period</span>
                  <span className="text-xl font-bold text-[#03143B]">{summary.paybackPeriodMonths.toFixed(1)} mo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Current State Assessment */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-xl font-semibold text-[#03143B] mb-4">Current State Assessment</h3>
            <div className="grid grid-cols-2 gap-4">
              {(() => {
                // Build ordered pain point list
                const orderedItems: Array<{ key: string; headline: string; impact: string }> = [];
                const order = inputs.painPointOrder && inputs.painPointOrder.length > 0
                  ? inputs.painPointOrder
                  : inputs.painPoints;

                for (const id of order) {
                  // Check predefined
                  const predefined = painPointContent.find(p => p.key === id);
                  if (predefined) {
                    orderedItems.push(predefined);
                    continue;
                  }
                  // Check custom
                  const custom = inputs.customPainPoints?.find(cp => cp.id === id);
                  if (custom) {
                    orderedItems.push({ key: custom.id, headline: custom.headline, impact: custom.impact });
                  }
                }

                return orderedItems.map((point) => (
                  <div
                    key={point.key}
                    className="p-4 bg-white border-l-4 border-[#03143B] shadow-sm"
                  >
                    <EditableText
                      value={contentOverrides.painPointHeadlines?.[point.key] || ''}
                      defaultValue={point.headline}
                      onChange={(value) => {
                        const headlines = { ...(contentOverrides.painPointHeadlines || {}) };
                        headlines[point.key] = value;
                        updateOverride('painPointHeadlines', headlines);
                      }}
                      as="h4"
                      className="font-semibold text-gray-900 mb-1"
                    />
                    <p className="text-gray-600 text-sm">{point.impact}</p>
                  </div>
                ));
              })()}
            </div>
            {renderQuoteBlock('current-state')}
          </div>
          {renderFAQBlock('executive-summary')}
        </section>

        {/* The Solution: Meet Harper */}
        <section className="page p-12">
          <div className="border-b-2 border-[#03143B] pb-3 mb-6">
            <h2 className="text-3xl font-bold text-[#03143B]">The Solution: Meet Harper</h2>
            <p className="text-gray-500 mt-1">Your AI HR Generalist</p>
          </div>

          <EditableText
            value={contentOverrides.harperIntro || ''}
            defaultValue="Harper handles the routine so your team can focus on what matters. She provides instant, accurate responses to employee questions while maintaining complete audit trails for compliance."
            onChange={(value) => updateOverride('harperIntro', value)}
            as="p"
            className="text-gray-700 mb-6"
            multiline
          />

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-white border-2 border-[#03143B] rounded-lg">
              <div className="text-3xl font-bold text-[#03143B] mb-1">{HARPER_STATS.accuracy}</div>
              <div className="text-xs text-gray-600">{HARPER_STATS.accuracyContext}</div>
            </div>
            <div className="text-center p-4 bg-white border-2 border-[#03143B] rounded-lg">
              <div className="text-3xl font-bold text-[#03143B] mb-1">&lt;8s</div>
              <div className="text-xs text-gray-600">{HARPER_STATS.responseContext}</div>
            </div>
            <div className="text-center p-4 bg-white border-2 border-[#03143B] rounded-lg">
              <div className="text-3xl font-bold text-[#03143B] mb-1">{HARPER_STATS.deflection}</div>
              <div className="text-xs text-gray-600">{HARPER_STATS.deflectionContext}</div>
            </div>
          </div>
          {renderQuoteBlock('meet-harper')}

          <h3 className="text-lg font-semibold text-[#03143B] mb-4">Value Drivers</h3>
          <div className="grid grid-cols-3 gap-4">
            {/* Use AI-generated content if available, otherwise fall back to template - all three drivers shown */}
            {(() => {
              const drivers: Array<{ key: string; headline: string; description: string; proof?: string; isPrimary: boolean }> =
                inputs.generatedContent?.valueDriverContent?.length
                  ? inputs.generatedContent.valueDriverContent.slice(0, 3).map((g, i) => ({
                      key: g.key || `gen-${i}`,
                      headline: g.headline,
                      description: g.description,
                      proof: g.proof,
                      isPrimary: g.key === inputs.primaryValueDriver,
                    }))
                  : valueDriverContent.map(d => ({
                      key: d.key,
                      headline: d.headline,
                      description: d.description,
                      proof: d.proof,
                      isPrimary: d.isPrimary,
                    }));
              return drivers.map((driver, i) => {
              const isPrimary = driver.isPrimary;
              return (
                <div
                  key={driver.key}
                  className={`p-4 rounded-lg ${isPrimary ? 'bg-[#03143B]/10 ring-2 ring-[#03143B]' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-3xl font-bold ${isPrimary ? 'text-[#03143B]' : 'text-[#03143B]/20'}`}>{i + 1}</div>
                    {isPrimary && (
                      <span className="px-2 py-0.5 bg-[#03143B] text-white text-xs font-medium rounded">PRIMARY</span>
                    )}
                  </div>
                  <EditableText
                    value={contentOverrides.valueDrivers?.[driver.key]?.headline || ''}
                    defaultValue={driver.headline}
                    onChange={(value) => {
                      const drivers = { ...(contentOverrides.valueDrivers || {}) };
                      drivers[driver.key] = { ...(drivers[driver.key] || {}), headline: value };
                      updateOverride('valueDrivers', drivers);
                    }}
                    as="h4"
                    className="font-bold text-gray-900 mb-2"
                  />
                  <EditableText
                    value={contentOverrides.valueDrivers?.[driver.key]?.description || ''}
                    defaultValue={driver.description}
                    onChange={(value) => {
                      const drivers = { ...(contentOverrides.valueDrivers || {}) };
                      drivers[driver.key] = { ...(drivers[driver.key] || {}), description: value };
                      updateOverride('valueDrivers', drivers);
                    }}
                    as="p"
                    className="text-gray-600 text-sm mb-2"
                    multiline
                  />
                  <EditableText
                    value={contentOverrides.valueDrivers?.[driver.key]?.proof || ''}
                    defaultValue={driver.proof || ''}
                    onChange={(value) => {
                      const drivers = { ...(contentOverrides.valueDrivers || {}) };
                      drivers[driver.key] = { ...(drivers[driver.key] || {}), proof: value };
                      updateOverride('valueDrivers', drivers);
                    }}
                    as="p"
                    className="text-[#03143B] text-sm font-semibold"
                  />
                </div>
              );
              });
            })()}
          </div>
          {renderQuoteBlock('value-drivers')}
          {renderFAQBlock('value-drivers')}
        </section>

        {/* Investment Case + 3-Year Projection (combined) */}
        <section className="page p-12 bg-[#03143B] text-white">
          <div className="border-b-2 border-white/30 pb-3 mb-6">
            <h2 className="text-3xl font-bold">Investment Case</h2>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white/80">
                Your Investment ({inputs.pricing.contractTermYears}-Year Contract)
              </h3>
              <div className="space-y-3">
                {pricing.yearlyBreakdown.map((year, index) => (
                  <div key={year.year} className="flex justify-between pb-2 border-b border-white/20">
                    <span className="text-white/80">
                      Year {year.year} Software
                      {inputs.pricing.yearlyConfig[index]?.workflows.included ? ' (Platform + Workflows)' : ' (Platform)'}
                    </span>
                    <span className="font-semibold">{formatCompactCurrency(year.softwareNetPrice)}</span>
                  </div>
                ))}
                {pricing.implementationNetPrice > 0 && (
                  <div className="flex justify-between pb-2 border-b border-white/20">
                    <span className="text-white/80">One-Time Implementation</span>
                    <span className="font-semibold">{formatCompactCurrency(pricing.implementationNetPrice)}</span>
                  </div>
                )}
                {pricing.servicesNetPrice > 0 && (
                  <div className="flex justify-between pb-2 border-b border-white/20">
                    <span className="text-white/80">Professional Services</span>
                    <span className="font-semibold">{formatCompactCurrency(pricing.servicesNetPrice)}</span>
                  </div>
                )}
                {pricing.integrationsNetPrice > 0 && (
                  <div className="flex justify-between pb-2 border-b border-white/20">
                    <span className="text-white/80">Additional Integrations</span>
                    <span className="font-semibold">{formatCompactCurrency(pricing.integrationsNetPrice)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1">
                  <span className="font-semibold">Total Contract Value</span>
                  <span className="text-xl font-bold">{formatCompactCurrency(pricing.totalContractValue)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-white/80">Your Return</h3>
              <div className="space-y-3">
                <div className="flex justify-between pb-2 border-b border-white/20">
                  <span className="text-white/80">HR Operations Savings</span>
                  <span className="font-semibold">{formatCompactCurrency(summary.hrOpsSavings)}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-white/20">
                  <span className="text-white/80">Compliance Value</span>
                  <span className="font-semibold">{formatCompactCurrency(summary.legalSavings)}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-white/20">
                  <span className="text-white/80">Productivity Gains</span>
                  <span className="font-semibold">{formatCompactCurrency(summary.productivitySavings)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-semibold">Net Annual Value</span>
                  <span className="text-xl font-bold">{formatCompactCurrency(summary.netAnnualBenefit)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-white/10 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold mb-1">{summary.totalROI.toFixed(0)}%</div>
              <div className="text-white/70 text-sm">ROI</div>
            </div>
            <div className="bg-white/10 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold mb-1">{summary.paybackPeriodMonths.toFixed(1)} mo</div>
              <div className="text-white/70 text-sm">Payback</div>
            </div>
            <div className="bg-white/10 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold mb-1">{formatCompactCurrency(projection.total)}</div>
              <div className="text-white/70 text-sm">3-Year Value</div>
            </div>
            <div className="bg-white/10 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold mb-1">{formatCompactCurrency(projection.netTotal)}</div>
              <div className="text-white/70 text-sm">3-Year Net</div>
            </div>
          </div>
          {renderQuoteBlock('investment', true)}

          {/* 3-Year breakdown */}
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wide">3-Year Value Projection</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-white/60 text-xs mb-1">Year 1 (50% adoption)</div>
                <div className="text-xl font-bold">{formatCompactCurrency(projection.year1)}</div>
              </div>
              <div>
                <div className="text-white/60 text-xs mb-1">Year 2 (75% adoption)</div>
                <div className="text-xl font-bold">{formatCompactCurrency(projection.year2)}</div>
              </div>
              <div>
                <div className="text-white/60 text-xs mb-1">Year 3 (100% adoption)</div>
                <div className="text-xl font-bold">{formatCompactCurrency(projection.year3)}</div>
              </div>
            </div>
          </div>
          {renderFAQBlock('investment', true)}
        </section>

        {/* Security + Integration & Implementation (combined) */}
        <section className="page p-12">
          <div className="border-b-2 border-[#03143B] pb-3 mb-6">
            <h2 className="text-3xl font-bold text-[#03143B]">Security & Integration</h2>
          </div>

          {/* Security */}
          <h3 className="text-lg font-semibold text-[#03143B] mb-4">Enterprise Security</h3>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {SECURITY_FEATURES.map((feature) => (
              <div key={feature.title} className="p-3 bg-white border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-[#03143B] mb-1 text-sm">{feature.title}</h4>
                <p className="text-gray-600 text-xs">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Integration */}
          <h3 className="text-lg font-semibold text-[#03143B] mb-4">Your Integration Landscape</h3>
          {customerIntegrations.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-6">
              {customerIntegrations.map((integration) => (
                <div
                  key={integration.name}
                  className="px-4 py-2 bg-[#03143B] text-white rounded-full text-sm"
                >
                  <span className="opacity-70 mr-2">{integration.category}</span>
                  <span className="font-medium">{integration.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm mb-6 italic">Integration requirements to be discussed</p>
          )}
          {renderQuoteBlock('security')}

          {/* Implementation Timeline */}
          <h3 className="text-lg font-semibold text-[#03143B] mb-4">Implementation Timeline (12 weeks)</h3>
          <div className="grid grid-cols-4 gap-3">
            {IMPLEMENTATION_TIMELINE.map((phase) => (
              <div key={phase.week} className="p-4 bg-gray-50 rounded-lg border-t-4 border-[#03143B]">
                <div className="text-xs font-semibold text-[#03143B] mb-1">{phase.week}</div>
                <h4 className="font-bold text-gray-900 text-sm mb-1">{phase.title}</h4>
                <p className="text-gray-600 text-xs">{phase.description}</p>
              </div>
            ))}
          </div>
          {renderFAQBlock('security')}
        </section>

        {/* Why Now + Next Steps (combined) */}
        <section className="page p-12">
          <div className="border-b-2 border-[#03143B] pb-3 mb-6">
            <h2 className="text-3xl font-bold text-[#03143B]">Why Now?</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-10">
            {/* Build Why Now items with priority: AI-generated > template */}
            {(() => {
              // Get content for each key, preferring AI-generated
              const whyNowKeys = ['costOfDelay', 'aiMomentum', 'quickWins', 'competitivePressure'] as const;
              const generatedMap = inputs.generatedContent?.whyNowContent?.reduce((acc, item) => {
                acc[item.key] = item;
                return acc;
              }, {} as Record<string, { headline: string; description: string }>) || {};

              return whyNowKeys.map((itemKey, index) => {
                const generated = generatedMap[itemKey];
                const template = WHY_NOW_CONTENT[itemKey];
                const defaultHeadline = generated?.headline || template.headline;
                const defaultDescription = generated?.description || template.description;

                return (
                  <div key={itemKey} className="p-4 bg-gray-50 rounded-lg border-l-4 border-[#03143B]">
                    <EditableText
                      value={contentOverrides.whyNowItems?.[itemKey]?.headline || ''}
                      defaultValue={defaultHeadline}
                      onChange={(value) => {
                        const items = { ...(contentOverrides.whyNowItems || {}) };
                        items[itemKey] = { ...(items[itemKey] || {}), headline: value };
                        updateOverride('whyNowItems', items);
                      }}
                      as="h3"
                      className="font-semibold text-[#03143B] mb-1"
                    />
                    <EditableText
                      value={contentOverrides.whyNowItems?.[itemKey]?.description || ''}
                      defaultValue={defaultDescription}
                      onChange={(value) => {
                        const items = { ...(contentOverrides.whyNowItems || {}) };
                        items[itemKey] = { ...(items[itemKey] || {}), description: value };
                        updateOverride('whyNowItems', items);
                      }}
                      as="p"
                      className="text-gray-600 text-sm"
                      multiline
                    />
                    {/* Show cost of delay metric for first item */}
                    {index === 0 && (
                      <p className="text-lg font-bold text-[#03143B] mt-2">
                        {formatCompactCurrency(summary.grossAnnualValue / 12)}/month in potential value
                      </p>
                    )}
                  </div>
                );
              });
            })()}
          </div>
          {renderQuoteBlock('why-now')}
          {renderFAQBlock('why-now')}

          {/* Next Steps */}
          <div className="border-t-2 border-[#03143B] pt-6">
            <h2 className="text-2xl font-bold text-[#03143B] mb-6">Next Steps</h2>

            <div className="space-y-4 mb-8">
              {(() => {
                // Build ordered next steps list
                const order = inputs.nextStepOrder && inputs.nextStepOrder.length > 0
                  ? inputs.nextStepOrder
                  : inputs.nextSteps;

                const orderedSteps: Array<{ id: string; title: string; description: string }> = [];
                for (const id of order) {
                  const predefined = NEXT_STEPS_OPTIONS.find(s => s.id === id);
                  if (predefined) {
                    orderedSteps.push({ id: predefined.id, title: predefined.title, description: predefined.description });
                    continue;
                  }
                  const custom = inputs.customNextSteps?.find(cs => cs.id === id);
                  if (custom) {
                    orderedSteps.push(custom);
                  }
                }

                return orderedSteps.map((step, index) => (
                  <div key={step.id} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-[#03143B] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <EditableText
                        value={contentOverrides.nextStepOverrides?.[step.id]?.title || ''}
                        defaultValue={step.title}
                        onChange={(value) => {
                          const overrides = { ...(contentOverrides.nextStepOverrides || {}) };
                          overrides[step.id] = { ...(overrides[step.id] || {}), title: value };
                          updateOverride('nextStepOverrides', overrides);
                        }}
                        as="h3"
                        className="font-semibold text-gray-900"
                      />
                      <EditableText
                        value={contentOverrides.nextStepOverrides?.[step.id]?.description || ''}
                        defaultValue={step.description}
                        onChange={(value) => {
                          const overrides = { ...(contentOverrides.nextStepOverrides || {}) };
                          overrides[step.id] = { ...(overrides[step.id] || {}), description: value };
                          updateOverride('nextStepOverrides', overrides);
                        }}
                        as="p"
                        className="text-gray-600 text-sm"
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mb-8">
              <p className="text-gray-600 mb-1">Questions? Let's talk.</p>
              {/* Display AE contact info - supports "Name | email" format */}
              {inputs.company.contactEmail.includes('|') ? (
                <>
                  <p className="text-xl font-semibold text-[#03143B]">
                    {inputs.company.contactEmail.split('|')[0].trim()}
                  </p>
                  <p className="text-lg text-[#03143B]">
                    {inputs.company.contactEmail.split('|')[1].trim()}
                  </p>
                </>
              ) : (
                <p className="text-xl font-semibold text-[#03143B]">{inputs.company.contactEmail}</p>
              )}
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <img src="/wisq-logo.svg" alt="Wisq" className="h-10 w-10" />
                <p className="text-gray-500 text-sm">wisq.com</p>
              </div>
              <div className="text-right text-gray-500 text-sm">
                <p>Confidential</p>
                <p>{today}</p>
              </div>
            </div>
          </div>
        </section>

        {/* RFP Appendix - Hidden for now, feature in development
        {inputs.rfpAppendix && inputs.rfpAppendix.enabled && inputs.rfpAppendix.answers.length > 0 && (
          <RFPAppendix
            appendix={inputs.rfpAppendix}
            onAnswerChange={(questionId, newAnswer) => {
              if (!inputs.rfpAppendix) return;
              const updatedAnswers = inputs.rfpAppendix.answers.map(a =>
                a.questionId === questionId
                  ? { ...a, answer: newAnswer, source: 'user_edited' as const }
                  : a
              );
            }}
          />
        )}
        */}
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

          .proposal-document {
            background: white !important;
          }

          .page {
            page-break-after: always;
            page-break-inside: avoid;
            min-height: 100vh;
            box-sizing: border-box;
          }

          .page:last-child {
            page-break-after: auto;
          }

          /* Ensure backgrounds print */
          .bg-\\[\\#03143B\\] {
            background-color: #03143B !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .bg-gray-50 {
            background-color: #f9fafb !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .bg-white\\/10, .bg-white\\/5 {
            background-color: rgba(255, 255, 255, 0.1) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .border-\\[\\#03143B\\] {
            border-color: #03143B !important;
          }

          .text-\\[\\#03143B\\] {
            color: #03143B !important;
          }
        }

        /* Screen styles for document viewing */
        @media screen {
          .proposal-document {
            max-width: 8.5in;
            margin: 0 auto;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
          }

          .page {
            min-height: 11in;
          }

          .cover-page {
            min-height: 11in;
          }
        }
      `}</style>
    </>
  );
}
