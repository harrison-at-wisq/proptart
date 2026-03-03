'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ProposalInputs, ProposalDocumentContent, WidgetItem, SectionVisibility, SectionLayout, BlockLayout, CustomBlockType, CustomBlock, resolveOtherValue, FAQSection, FAQ_PAGE_LABELS } from '@/types/proposal';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { WidgetGroup } from '@/components/ui/WidgetGroup';
import { SectionWrapper } from '@/components/ui/SectionWrapper';
import { HiddenSectionsPanel } from '@/components/ui/HiddenSectionsPanel';
import { LayoutModeProvider } from '@/components/ui/LayoutModeContext';
import { LayoutModeToggle } from '@/components/ui/LayoutModeToggle';
import { LayoutSection } from '@/components/ui/LayoutSection';
import type { BlockDef } from '@/components/ui/LayoutSection';
import { CustomBlockRenderer } from '@/components/ui/CustomBlockRenderer';
import { SectionNavBar } from '@/components/ui/SectionNavBar';
import { calculatePricing, formatCurrency, formatCompactCurrency } from '@/lib/pricing-calculator';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
  calculate3YearProjection,
} from '@/lib/roi-calculator';
import { materializeDocumentContent } from '@/lib/materialize-content';
import { getSelectedQuoteForSection } from '@/lib/customer-quotes';
import type { QuoteSection } from '@/types/proposal';

interface ProposalDocumentProps {
  inputs: ProposalInputs;
  proposalId?: string | null;
  onClose?: () => void;
  onDocumentContentChange?: (content: ProposalDocumentContent) => void;
}

export function ProposalDocument({ inputs, proposalId, onClose, onDocumentContentChange }: ProposalDocumentProps) {
  const documentRef = useRef<HTMLDivElement>(null);

  // Block registry — collects all block definitions for cross-section lookups
  const blockRegistryRef = useRef<Record<string, BlockDef>>({});

  // Document content state — single source of truth for all editable content
  const [docContent, setDocContent] = useState<ProposalDocumentContent>(
    () => inputs.documentContent || materializeDocumentContent(inputs)
  );

  // Track initial mount to avoid triggering onChange on mount
  const isInitialMount = useRef(true);

  // Notify parent when docContent changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onDocumentContentChange?.(docContent);
  }, [docContent, onDocumentContentChange]);

  // Helper to update a single field on docContent
  const updateContent = useCallback(<K extends keyof ProposalDocumentContent>(
    key: K,
    value: ProposalDocumentContent[K]
  ) => {
    setDocContent(prev => ({ ...prev, [key]: value }));
  }, []);

  // Helper to toggle section visibility
  const toggleVisibility = useCallback((key: keyof SectionVisibility) => {
    setDocContent(prev => ({
      ...prev,
      sectionVisibility: {
        ...prev.sectionVisibility,
        [key]: !prev.sectionVisibility[key],
      },
    }));
  }, []);

  const restoreSection = useCallback((key: keyof SectionVisibility) => {
    setDocContent(prev => ({
      ...prev,
      sectionVisibility: {
        ...prev.sectionVisibility,
        [key]: true,
      },
    }));
  }, []);

  const restoreAllSections = useCallback(() => {
    setDocContent(prev => ({
      ...prev,
      sectionVisibility: {
        cover: true,
        executiveSummary: true,
        meetHarper: true,
        investmentCase: true,
        securityIntegration: true,
        whyNow: true,
        nextSteps: true,
      },
    }));
  }, []);

  // Handle layout changes from LayoutSection
  const handleLayoutChange = useCallback((sectionKey: keyof SectionVisibility, layout: SectionLayout) => {
    setDocContent(prev => ({
      ...prev,
      sectionLayouts: {
        ...prev.sectionLayouts,
        [sectionKey]: layout,
      },
    }));
  }, []);

  // Handle cross-section block moves
  const handleCrossSectionDrop = useCallback((
    targetSection: keyof SectionVisibility,
    fromSection: string,
    blockIds: string[],
    targetIndex: number
  ) => {
    const registry = blockRegistryRef.current;
    setDocContent(prev => {
      const srcKey = fromSection as keyof SectionVisibility;

      // Helper: get or initialize a section's block layout from saved state or registry defaults
      const getBlocks = (key: keyof SectionVisibility): BlockLayout[] => {
        const existing = prev.sectionLayouts?.[key]?.blocks;
        if (existing?.length) return existing.map(b => ({ ...b }));
        // Build from registry — blocks not claimed by any other saved section layout
        return Object.entries(registry)
          .filter(([id]) => {
            const inOtherLayout = Object.entries(prev.sectionLayouts || {})
              .some(([k, v]) => k !== key && v?.blocks?.some(bl => bl.blockId === id));
            return !inOtherLayout;
          })
          .map(([id, def], i) => ({ blockId: id, colSpan: def.defaultColSpan, order: i }));
      };

      const sourceBlocks = getBlocks(srcKey);
      const targetBlocks = getBlocks(targetSection);

      // Extract moved blocks from source
      const movedBlocks = sourceBlocks.filter(b => blockIds.includes(b.blockId));
      if (movedBlocks.length === 0) return prev;

      const remainingSource = sourceBlocks.filter(b => !blockIds.includes(b.blockId));
      remainingSource.forEach((b, i) => { b.order = i; });

      // Insert moved blocks into target at the target index
      const insertAt = Math.min(targetIndex, targetBlocks.length);
      const newTargetBlocks = [...targetBlocks];
      movedBlocks.forEach((b, i) => {
        newTargetBlocks.splice(insertAt + i, 0, { ...b });
      });
      newTargetBlocks.forEach((b, i) => { b.order = i; });

      return {
        ...prev,
        sectionLayouts: {
          ...prev.sectionLayouts,
          [srcKey]: { blocks: remainingSource },
          [targetSection]: { blocks: newTargetBlocks },
        },
      };
    });
  }, []);

  // --- Custom block handlers ---

  const CUSTOM_BLOCK_LABELS: Record<CustomBlockType, string> = {
    'text': 'Text Block',
    'heading': 'Heading',
    'card-grid-2': '2-Column Cards',
    'card-grid-3': '3-Column Cards',
    'bullet-list': 'Bullet List',
    'numbered-list': 'Numbered Steps',
  };

  const createDefaultData = (type: CustomBlockType): CustomBlock['data'] => {
    switch (type) {
      case 'text': return { text: 'Click to edit...' };
      case 'heading': return { text: 'New Heading' };
      case 'card-grid-2': return { items: [
        { id: crypto.randomUUID(), headline: 'Headline 1', description: 'Description...' },
        { id: crypto.randomUUID(), headline: 'Headline 2', description: 'Description...' },
      ]};
      case 'card-grid-3': return { items: [
        { id: crypto.randomUUID(), title: 'Title 1', description: 'Description...' },
        { id: crypto.randomUUID(), title: 'Title 2', description: 'Description...' },
        { id: crypto.randomUUID(), title: 'Title 3', description: 'Description...' },
      ]};
      case 'bullet-list': return { items: [
        { id: crypto.randomUUID(), text: 'First item' },
        { id: crypto.randomUUID(), text: 'Second item' },
      ]};
      case 'numbered-list': return { items: [
        { id: crypto.randomUUID(), title: 'Step 1', description: 'Description...' },
        { id: crypto.randomUUID(), title: 'Step 2', description: 'Description...' },
      ]};
    }
  };

  const handleInsertBlock = useCallback((sectionKey: string, type: CustomBlockType, insertAtOrder: number) => {
    const newBlock: CustomBlock = {
      id: crypto.randomUUID(),
      type,
      sectionKey,
      label: CUSTOM_BLOCK_LABELS[type],
      colSpan: 12,
      data: createDefaultData(type),
    };

    setDocContent(prev => {
      const customBlocks = [...(prev.customBlocks || []), newBlock];

      // Update section layout: shift blocks at or after insertAtOrder, then add the new block
      const secKey = sectionKey as keyof SectionVisibility;
      const existingLayout = prev.sectionLayouts?.[secKey]?.blocks;
      let layoutBlocks: BlockLayout[];

      if (existingLayout?.length) {
        layoutBlocks = existingLayout.map(b => ({
          ...b,
          order: b.order >= insertAtOrder ? b.order + 1 : b.order,
        }));
      } else {
        // Initialize from the registered blocks (defaults)
        const registry = blockRegistryRef.current;
        layoutBlocks = Object.entries(registry)
          .filter(([id]) => {
            const inOtherLayout = Object.entries(prev.sectionLayouts || {})
              .some(([k, v]) => k !== sectionKey && v?.blocks?.some(bl => bl.blockId === id));
            return !inOtherLayout;
          })
          .map(([id, def], i) => ({
            blockId: id,
            colSpan: def.defaultColSpan,
            order: i >= insertAtOrder ? i + 1 : i,
          }));
      }

      layoutBlocks.push({ blockId: newBlock.id, colSpan: 12, order: insertAtOrder });

      return {
        ...prev,
        customBlocks,
        sectionLayouts: {
          ...prev.sectionLayouts,
          [secKey]: { blocks: layoutBlocks },
        },
      };
    });
  }, []);

  const handleUpdateCustomBlock = useCallback((blockId: string, data: CustomBlock['data']) => {
    setDocContent(prev => ({
      ...prev,
      customBlocks: (prev.customBlocks || []).map(b =>
        b.id === blockId ? { ...b, data } : b
      ),
    }));
  }, []);

  const handleRemoveCustomBlock = useCallback((blockId: string) => {
    setDocContent(prev => {
      const customBlocks = (prev.customBlocks || []).filter(b => b.id !== blockId);

      // Also remove from section layouts
      const sectionLayouts = { ...prev.sectionLayouts };
      for (const key of Object.keys(sectionLayouts) as (keyof SectionVisibility)[]) {
        const section = sectionLayouts[key];
        if (section?.blocks?.some(b => b.blockId === blockId)) {
          const filtered = section.blocks.filter(b => b.blockId !== blockId);
          filtered.forEach((b, i) => { b.order = i; });
          sectionLayouts[key] = { blocks: filtered };
        }
      }

      return { ...prev, customBlocks, sectionLayouts };
    });
  }, []);

  // Calculate all computed values (not editable — always derived from inputs)
  const pricing = calculatePricing(inputs.pricing);
  const hrOutput = calculateHROperationsROI(inputs.hrOperations);
  const tier2Cases = inputs.hrOperations.tier2Workflows.reduce((sum, w) => sum + w.volumePerYear, 0);
  const legalOutput = calculateLegalComplianceROI(inputs.legalCompliance, tier2Cases);
  const employeeOutput = calculateEmployeeExperienceROI(inputs.employeeExperience);
  const summary = calculateROISummary(hrOutput, legalOutput, employeeOutput, pricing.annualRecurringRevenue);
  const projection = calculate3YearProjection(summary.grossAnnualValue, pricing.annualRecurringRevenue);

  // FAQ helper
  const getFAQsForPage = (pageId: string): FAQSection | undefined => {
    return docContent.faqSections?.find(s => s.pageId === pageId);
  };

  const updateFAQ = (pageId: string, faqIndex: number, field: 'question' | 'answer', value: string) => {
    setDocContent(prev => {
      const sections = [...(prev.faqSections || [])];
      const sIdx = sections.findIndex(s => s.pageId === pageId);
      if (sIdx === -1) return prev;
      const newFaqs = [...sections[sIdx].faqs];
      newFaqs[faqIndex] = { ...newFaqs[faqIndex], [field]: value };
      sections[sIdx] = { ...sections[sIdx], faqs: newFaqs };
      return { ...prev, faqSections: sections };
    });
  };

  const renderFAQBlock = (pageId: string, dark = false) => {
    const section = getFAQsForPage(pageId);
    if (!section || section.faqs.length === 0) return null;
    return (
      <div className={`mt-8 pt-6 border-t ${dark ? 'border-white/20' : 'border-gray-200'}`}>
        <h4 className={`text-sm font-semibold mb-3 uppercase tracking-wide ${dark ? 'text-white/70' : 'text-[#03143B]'}`}>Anticipated Questions</h4>
        <div className="space-y-3">
          {section.faqs.map((faq, i) => (
            <div key={i} className={`pl-4 border-l-2 ${dark ? 'border-white/30' : 'border-gray-200'}`}>
              <DirectEditableText
                value={faq.question}
                onChange={(value) => updateFAQ(pageId, i, 'question', value)}
                as="p"
                className={`font-medium text-sm ${dark ? 'text-white' : 'text-gray-900'}`}
              />
              <DirectEditableText
                value={faq.answer}
                onChange={(value) => updateFAQ(pageId, i, 'answer', value)}
                as="p"
                className={`text-sm mt-1 ${dark ? 'text-white/70' : 'text-gray-600'}`}
                multiline
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Quote render block
  const renderQuoteBlock = (section: QuoteSection, dark = false) => {
    if (!docContent.selectedQuotes || docContent.selectedQuotes.length === 0) return null;
    const quote = getSelectedQuoteForSection(docContent.selectedQuotes, section);
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

  // Build customer integrations list (computed from inputs, not editable text)
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

  const handleCopyUrl = () => {
    if (publishedUrl) {
      navigator.clipboard.writeText(publishedUrl);
    }
  };

  const vis = docContent.sectionVisibility;

  // Reset block registry each render — registerBlocks populates it as sections render
  blockRegistryRef.current = {};
  const registerBlocks = (sectionKey: string, blocks: BlockDef[]) => {
    // Append custom blocks for this section
    const customs = (docContent.customBlocks || []).filter(cb => cb.sectionKey === sectionKey);
    const allBlocks = [
      ...blocks,
      ...customs.map(cb => ({
        blockId: cb.id,
        label: cb.label,
        defaultColSpan: cb.colSpan,
        render: () => (
          <CustomBlockRenderer
            block={cb}
            onUpdate={handleUpdateCustomBlock}
            onRemove={handleRemoveCustomBlock}
          />
        ),
      })),
    ];
    allBlocks.forEach(b => { blockRegistryRef.current[b.blockId] = b; });
    return allBlocks;
  };

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
      // Publish or republish
      if (micrositeArchived) {
        handleRepublishMicrosite();
      } else {
        handlePublishMicrosite();
      }
    } else {
      // Update
      handlePublishMicrosite();
    }
  };

  // Whether to show the dropdown (only when a microsite exists)
  const showMicrositeDropdown = !!micrositeSlug;

  return (
    <LayoutModeProvider>
      {/* Fixed Header Controls - hidden in print */}
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

      {/* Section Navigation Bar */}
      <SectionNavBar
        sectionVisibility={docContent.sectionVisibility}
        documentRef={documentRef}
      />

      {/* Document Container */}
      <div
        ref={documentRef}
        className="proposal-document bg-white min-h-screen"
      >
        {/* ==================== COVER PAGE ==================== */}
        <SectionWrapper sectionKey="cover" visible={vis.cover} onToggleVisibility={toggleVisibility}>
          <section className="page cover-page min-h-screen flex flex-col justify-between p-12 border-l-8 border-[#03143B]">
            <div>
              <div className="text-sm font-semibold text-[#03143B] tracking-widest uppercase mb-2">
                Strategic Proposal
              </div>
              <DirectEditableText
                value={docContent.coverTitle}
                onChange={(value) => updateContent('coverTitle', value)}
                as="h1"
                className="text-5xl font-bold text-[#03143B] leading-tight mb-6"
              />
              <div className="w-24 h-1 bg-[#03143B] mb-8"></div>
              {docContent.coverQuote && (
                <div className="text-xl text-gray-700 italic border-l-4 border-[#03143B] pl-4 mb-8 max-w-2xl">
                  <p>&ldquo;<DirectEditableText
                    value={docContent.coverQuote}
                    onChange={(value) => updateContent('coverQuote', value)}
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
        </SectionWrapper>

        {/* ==================== EXECUTIVE SUMMARY + CURRENT STATE ==================== */}
        <SectionWrapper sectionKey="executiveSummary" visible={vis.executiveSummary} onToggleVisibility={toggleVisibility}>
          <section className="page p-12">
            <LayoutSection
              sectionKey="executiveSummary"
              blocks={registerBlocks('executiveSummary', [
                {
                  blockId: 'execHeading',
                  label: 'Section Heading',
                  defaultColSpan: 12,
                  render: () => (
                    <div className="border-b-2 border-[#03143B] pb-3">
                      <h2 className="text-3xl font-bold text-[#03143B]">Executive Summary</h2>
                    </div>
                  ),
                },
                {
                  blockId: 'execInsight',
                  label: 'Executive Insight',
                  defaultColSpan: 7,
                  render: () => (
                    <DirectEditableText
                      value={docContent.execSummaryInsight}
                      onChange={(value) => updateContent('execSummaryInsight', value)}
                      as="p"
                      className="text-gray-700"
                      multiline
                    />
                  ),
                },
                {
                  blockId: 'execVision',
                  label: 'Vision Callout',
                  defaultColSpan: 7,
                  render: () => (
                    <div className="text-lg font-semibold text-[#03143B] italic border-l-4 border-[#03143B] pl-4">
                      <DirectEditableText
                        value={docContent.execSummaryVision}
                        onChange={(value) => updateContent('execSummaryVision', value)}
                        as="span"
                      />
                    </div>
                  ),
                },
                {
                  blockId: 'execQuote',
                  label: 'Quote',
                  defaultColSpan: 7,
                  render: () => renderQuoteBlock('executive-summary'),
                },
                {
                  blockId: 'execBullets',
                  label: 'Key Bullets',
                  defaultColSpan: 7,
                  render: () => (
                    <WidgetGroup
                      items={docContent.execSummaryBullets}
                      onChange={(items) => updateContent('execSummaryBullets', items)}
                      layout="list"
                      minItems={1}
                      addLabel="Add bullet"
                      createNewItem={() => ({ id: crypto.randomUUID(), text: 'New insight...' })}
                      renderItem={(item) => (
                        <li className="flex items-start gap-2 text-gray-600 text-sm">
                          <span className="w-1.5 h-1.5 bg-[#03143B] rounded-full mt-2 flex-shrink-0"></span>
                          <DirectEditableText
                            value={item.text as string}
                            onChange={(value) => {
                              const updated = docContent.execSummaryBullets.map(b =>
                                b.id === item.id ? { ...b, text: value } : b
                              );
                              updateContent('execSummaryBullets', updated);
                            }}
                            as="span"
                          />
                        </li>
                      )}
                    />
                  ),
                },
                {
                  blockId: 'keyMetrics',
                  label: 'Key Metrics',
                  defaultColSpan: 5,
                  render: () => (
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 h-full">
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
                  ),
                },
                {
                  blockId: 'currentStateHeading',
                  label: 'Sub-Heading',
                  defaultColSpan: 12,
                  render: () => (
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-xl font-semibold text-[#03143B]">Current State Assessment</h3>
                    </div>
                  ),
                },
                {
                  blockId: 'painPoints',
                  label: 'Pain Points',
                  defaultColSpan: 12,
                  render: () => (
                    <WidgetGroup
                      items={docContent.painPoints}
                      onChange={(items) => updateContent('painPoints', items)}
                      layout="grid-2"
                      minItems={1}
                      addLabel="Add pain point"
                      createNewItem={() => ({ id: crypto.randomUUID(), headline: 'New challenge...', impact: 'Describe the business impact...' })}
                      renderItem={(item) => (
                        <div className="p-4 bg-white border-l-4 border-[#03143B] shadow-sm">
                          <DirectEditableText
                            value={item.headline as string}
                            onChange={(value) => {
                              const updated = docContent.painPoints.map(p =>
                                p.id === item.id ? { ...p, headline: value } : p
                              );
                              updateContent('painPoints', updated);
                            }}
                            as="h4"
                            className="font-semibold text-gray-900 mb-1"
                          />
                          <DirectEditableText
                            value={item.impact as string}
                            onChange={(value) => {
                              const updated = docContent.painPoints.map(p =>
                                p.id === item.id ? { ...p, impact: value } : p
                              );
                              updateContent('painPoints', updated);
                            }}
                            as="p"
                            className="text-gray-600 text-sm"
                            multiline
                          />
                        </div>
                      )}
                    />
                  ),
                },
                {
                  blockId: 'currentStateQuote',
                  label: 'Quote',
                  defaultColSpan: 12,
                  render: () => renderQuoteBlock('current-state'),
                },
                {
                  blockId: 'execFaq',
                  label: 'FAQ',
                  defaultColSpan: 12,
                  render: () => renderFAQBlock('executive-summary'),
                },
              ])}
              layout={docContent.sectionLayouts?.executiveSummary}
              onLayoutChange={handleLayoutChange}
              blockRegistry={blockRegistryRef.current}
              onCrossSectionDrop={handleCrossSectionDrop}
              onInsertBlock={handleInsertBlock}
            />
          </section>
        </SectionWrapper>

        {/* ==================== THE SOLUTION: MEET HARPER ==================== */}
        <SectionWrapper sectionKey="meetHarper" visible={vis.meetHarper} onToggleVisibility={toggleVisibility}>
          <section className="page p-12">
            <LayoutSection
              sectionKey="meetHarper"
              blocks={registerBlocks('meetHarper', [
                {
                  blockId: 'harperHeading',
                  defaultColSpan: 12,
                  render: () => (
                    <div className="border-b-2 border-[#03143B] pb-3">
                      <h2 className="text-3xl font-bold text-[#03143B]">The Solution: Meet Harper</h2>
                      <p className="text-gray-500 mt-1">Your AI HR Generalist</p>
                    </div>
                  ),
                },
                {
                  blockId: 'harperIntro',
                  label: 'Introduction',
                  defaultColSpan: 12,
                  render: () => (
                    <DirectEditableText
                      value={docContent.harperIntro}
                      onChange={(value) => updateContent('harperIntro', value)}
                      as="p"
                      className="text-gray-700"
                      multiline
                    />
                  ),
                },
                {
                  blockId: 'harperStats',
                  label: 'Harper Stats',
                  defaultColSpan: 12,
                  render: () => (
                    <WidgetGroup
                      items={docContent.harperStats}
                      onChange={(items) => updateContent('harperStats', items)}
                      layout="grid-3"
                      minItems={1}
                      addLabel="Add stat"
                      createNewItem={() => ({ id: crypto.randomUUID(), stat: '0%', context: 'New metric...' })}
                      renderItem={(item) => (
                        <div className="text-center p-4 bg-white border-2 border-[#03143B] rounded-lg">
                          <DirectEditableText
                            value={item.stat as string}
                            onChange={(value) => {
                              const updated = docContent.harperStats.map(s =>
                                s.id === item.id ? { ...s, stat: value } : s
                              );
                              updateContent('harperStats', updated);
                            }}
                            as="div"
                            className="text-3xl font-bold text-[#03143B] mb-1"
                          />
                          <DirectEditableText
                            value={item.context as string}
                            onChange={(value) => {
                              const updated = docContent.harperStats.map(s =>
                                s.id === item.id ? { ...s, context: value } : s
                              );
                              updateContent('harperStats', updated);
                            }}
                            as="div"
                            className="text-xs text-gray-600"
                          />
                        </div>
                      )}
                    />
                  ),
                },
                {
                  blockId: 'meetHarperQuote',
                  label: 'Quote',
                  defaultColSpan: 12,
                  render: () => renderQuoteBlock('meet-harper'),
                },
                {
                  blockId: 'valueDriversHeading',
                  defaultColSpan: 12,
                  render: () => (
                    <h3 className="text-lg font-semibold text-[#03143B]">Value Drivers</h3>
                  ),
                },
                {
                  blockId: 'valueDrivers',
                  label: 'Value Drivers',
                  defaultColSpan: 12,
                  render: () => (
                    <WidgetGroup
                      items={docContent.valueDrivers}
                      onChange={(items) => updateContent('valueDrivers', items)}
                      layout="grid-3"
                      minItems={1}
                      maxItems={4}
                      addLabel="Add value driver"
                      createNewItem={() => ({
                        id: crypto.randomUUID(),
                        key: `custom-${Date.now()}`,
                        headline: 'New Value Driver',
                        description: 'Describe the value...',
                        proof: 'Supporting evidence...',
                        isPrimary: false,
                      })}
                      renderItem={(item, index) => {
                        const isPrimary = item.isPrimary as boolean;
                        return (
                          <div className={`p-4 rounded-lg ${isPrimary ? 'bg-[#03143B]/10 ring-2 ring-[#03143B]' : 'bg-gray-50'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className={`text-3xl font-bold ${isPrimary ? 'text-[#03143B]' : 'text-[#03143B]/20'}`}>{index + 1}</div>
                              {isPrimary && (
                                <span className="px-2 py-0.5 bg-[#03143B] text-white text-xs font-medium rounded">PRIMARY</span>
                              )}
                            </div>
                            <DirectEditableText
                              value={item.headline as string}
                              onChange={(value) => {
                                const updated = docContent.valueDrivers.map(d =>
                                  d.id === item.id ? { ...d, headline: value } : d
                                );
                                updateContent('valueDrivers', updated);
                              }}
                              as="h4"
                              className="font-bold text-gray-900 mb-2"
                            />
                            <DirectEditableText
                              value={item.description as string}
                              onChange={(value) => {
                                const updated = docContent.valueDrivers.map(d =>
                                  d.id === item.id ? { ...d, description: value } : d
                                );
                                updateContent('valueDrivers', updated);
                              }}
                              as="p"
                              className="text-gray-600 text-sm mb-2"
                              multiline
                            />
                            <DirectEditableText
                              value={(item.proof as string) || ''}
                              onChange={(value) => {
                                const updated = docContent.valueDrivers.map(d =>
                                  d.id === item.id ? { ...d, proof: value } : d
                                );
                                updateContent('valueDrivers', updated);
                              }}
                              as="p"
                              className="text-[#03143B] text-sm font-semibold"
                            />
                          </div>
                        );
                      }}
                    />
                  ),
                },
                {
                  blockId: 'valueDriversQuote',
                  label: 'Quote',
                  defaultColSpan: 12,
                  render: () => renderQuoteBlock('value-drivers'),
                },
                {
                  blockId: 'valueDriversFaq',
                  label: 'FAQ',
                  defaultColSpan: 12,
                  render: () => renderFAQBlock('value-drivers'),
                },
              ])}
              layout={docContent.sectionLayouts?.meetHarper}
              onLayoutChange={handleLayoutChange}
              blockRegistry={blockRegistryRef.current}
              onCrossSectionDrop={handleCrossSectionDrop}
              onInsertBlock={handleInsertBlock}
            />
          </section>
        </SectionWrapper>

        {/* ==================== INVESTMENT CASE ==================== */}
        <SectionWrapper sectionKey="investmentCase" visible={vis.investmentCase} onToggleVisibility={toggleVisibility}>
          <section className="page p-12 bg-[#03143B] text-white">
            <LayoutSection
              sectionKey="investmentCase"
              blocks={registerBlocks('investmentCase', [
                {
                  blockId: 'investHeading',
                  defaultColSpan: 12,
                  render: () => (
                    <div className="border-b-2 border-white/30 pb-3">
                      <h2 className="text-3xl font-bold">Investment Case</h2>
                    </div>
                  ),
                },
                {
                  blockId: 'investmentBreakdown',
                  label: 'Your Investment',
                  defaultColSpan: 6,
                  render: () => (
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
                  ),
                },
                {
                  blockId: 'returnBreakdown',
                  label: 'Your Return',
                  defaultColSpan: 6,
                  render: () => (
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
                  ),
                },
                {
                  blockId: 'kpiTiles',
                  label: 'KPI Tiles',
                  defaultColSpan: 12,
                  render: () => (
                    <div className="grid grid-cols-4 gap-4">
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
                  ),
                },
                {
                  blockId: 'investmentQuote',
                  label: 'Quote',
                  defaultColSpan: 12,
                  render: () => renderQuoteBlock('investment', true),
                },
                {
                  blockId: 'projectionPanel',
                  label: '3-Year Projection',
                  defaultColSpan: 12,
                  render: () => (
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
                  ),
                },
                {
                  blockId: 'investmentFaq',
                  label: 'FAQ',
                  defaultColSpan: 12,
                  render: () => renderFAQBlock('investment', true),
                },
              ])}
              layout={docContent.sectionLayouts?.investmentCase}
              onLayoutChange={handleLayoutChange}
              blockRegistry={blockRegistryRef.current}
              onCrossSectionDrop={handleCrossSectionDrop}
              onInsertBlock={handleInsertBlock}
            />
          </section>
        </SectionWrapper>

        {/* ==================== SECURITY & INTEGRATION ==================== */}
        <SectionWrapper sectionKey="securityIntegration" visible={vis.securityIntegration} onToggleVisibility={toggleVisibility}>
          <section className="page p-12">
            <LayoutSection
              sectionKey="securityIntegration"
              blocks={registerBlocks('securityIntegration', [
                {
                  blockId: 'securityHeading',
                  defaultColSpan: 12,
                  render: () => (
                    <div className="border-b-2 border-[#03143B] pb-3">
                      <h2 className="text-3xl font-bold text-[#03143B]">Security & Integration</h2>
                    </div>
                  ),
                },
                {
                  blockId: 'securityFeaturesHeading',
                  label: 'Security Heading',
                  defaultColSpan: 12,
                  render: () => (
                    <h3 className="text-lg font-semibold text-[#03143B]">Enterprise Security</h3>
                  ),
                },
                {
                  blockId: 'securityFeatures',
                  label: 'Security Features',
                  defaultColSpan: 12,
                  render: () => (
                    <WidgetGroup
                      items={docContent.securityFeatures}
                      onChange={(items) => updateContent('securityFeatures', items)}
                      layout="grid-3"
                      minItems={1}
                      addLabel="Add security feature"
                      createNewItem={() => ({ id: crypto.randomUUID(), title: 'New Feature', description: 'Describe the security capability...' })}
                      renderItem={(item) => (
                        <div className="p-3 bg-white border border-gray-200 rounded-lg">
                          <DirectEditableText
                            value={item.title as string}
                            onChange={(value) => {
                              const updated = docContent.securityFeatures.map(f =>
                                f.id === item.id ? { ...f, title: value } : f
                              );
                              updateContent('securityFeatures', updated);
                            }}
                            as="h4"
                            className="font-semibold text-[#03143B] mb-1 text-sm"
                          />
                          <DirectEditableText
                            value={item.description as string}
                            onChange={(value) => {
                              const updated = docContent.securityFeatures.map(f =>
                                f.id === item.id ? { ...f, description: value } : f
                              );
                              updateContent('securityFeatures', updated);
                            }}
                            as="p"
                            className="text-gray-600 text-xs"
                            multiline
                          />
                        </div>
                      )}
                    />
                  ),
                },
                {
                  blockId: 'integrationLandscape',
                  label: 'Integrations',
                  defaultColSpan: 12,
                  render: () => (
                    <>
                      <h3 className="text-lg font-semibold text-[#03143B] mb-4">Your Integration Landscape</h3>
                      {customerIntegrations.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
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
                        <p className="text-gray-500 text-sm italic">Integration requirements to be discussed</p>
                      )}
                    </>
                  ),
                },
                {
                  blockId: 'securityQuote',
                  label: 'Quote',
                  defaultColSpan: 12,
                  render: () => renderQuoteBlock('security'),
                },
                {
                  blockId: 'implementationTimelineHeading',
                  label: 'Timeline Heading',
                  defaultColSpan: 12,
                  render: () => (
                    <h3 className="text-lg font-semibold text-[#03143B]">Implementation Timeline (12 weeks)</h3>
                  ),
                },
                {
                  blockId: 'implementationTimeline',
                  label: 'Timeline',
                  defaultColSpan: 12,
                  render: () => (
                    <WidgetGroup
                      items={docContent.implementationTimeline}
                      onChange={(items) => updateContent('implementationTimeline', items)}
                      layout="grid-4"
                      minItems={1}
                      addLabel="Add phase"
                      createNewItem={() => ({ id: crypto.randomUUID(), week: 'Week X-Y', title: 'New Phase', description: 'Phase activities...' })}
                      renderItem={(item) => (
                        <div className="p-4 bg-gray-50 rounded-lg border-t-4 border-[#03143B]">
                          <DirectEditableText
                            value={item.week as string}
                            onChange={(value) => {
                              const updated = docContent.implementationTimeline.map(p =>
                                p.id === item.id ? { ...p, week: value } : p
                              );
                              updateContent('implementationTimeline', updated);
                            }}
                            as="div"
                            className="text-xs font-semibold text-[#03143B] mb-1"
                          />
                          <DirectEditableText
                            value={item.title as string}
                            onChange={(value) => {
                              const updated = docContent.implementationTimeline.map(p =>
                                p.id === item.id ? { ...p, title: value } : p
                              );
                              updateContent('implementationTimeline', updated);
                            }}
                            as="h4"
                            className="font-bold text-gray-900 text-sm mb-1"
                          />
                          <DirectEditableText
                            value={item.description as string}
                            onChange={(value) => {
                              const updated = docContent.implementationTimeline.map(p =>
                                p.id === item.id ? { ...p, description: value } : p
                              );
                              updateContent('implementationTimeline', updated);
                            }}
                            as="p"
                            className="text-gray-600 text-xs"
                            multiline
                          />
                        </div>
                      )}
                    />
                  ),
                },
                {
                  blockId: 'securityFaq',
                  label: 'FAQ',
                  defaultColSpan: 12,
                  render: () => renderFAQBlock('security'),
                },
              ])}
              layout={docContent.sectionLayouts?.securityIntegration}
              onLayoutChange={handleLayoutChange}
              blockRegistry={blockRegistryRef.current}
              onCrossSectionDrop={handleCrossSectionDrop}
              onInsertBlock={handleInsertBlock}
            />
          </section>
        </SectionWrapper>

        {/* ==================== WHY NOW + NEXT STEPS ==================== */}
        <SectionWrapper sectionKey="whyNow" visible={vis.whyNow} onToggleVisibility={toggleVisibility}>
          <section className="page p-12">
            <LayoutSection
              sectionKey="whyNow"
              blocks={registerBlocks('whyNow', [
                {
                  blockId: 'whyNowHeading',
                  defaultColSpan: 12,
                  render: () => (
                    <div className="border-b-2 border-[#03143B] pb-3">
                      <h2 className="text-3xl font-bold text-[#03143B]">Why Now?</h2>
                    </div>
                  ),
                },
                {
                  blockId: 'whyNowItems',
                  label: 'Why Now',
                  defaultColSpan: 12,
                  render: () => (
                    <WidgetGroup
                      items={docContent.whyNowItems}
                      onChange={(items) => updateContent('whyNowItems', items)}
                      layout="grid-2"
                      minItems={1}
                      addLabel="Add reason"
                      createNewItem={() => ({ id: crypto.randomUUID(), key: `custom-${Date.now()}`, headline: 'New Reason', description: 'Why this matters now...' })}
                      renderItem={(item, index) => (
                        <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-[#03143B]">
                          <DirectEditableText
                            value={item.headline as string}
                            onChange={(value) => {
                              const updated = docContent.whyNowItems.map(w =>
                                w.id === item.id ? { ...w, headline: value } : w
                              );
                              updateContent('whyNowItems', updated);
                            }}
                            as="h3"
                            className="font-semibold text-[#03143B] mb-1"
                          />
                          <DirectEditableText
                            value={item.description as string}
                            onChange={(value) => {
                              const updated = docContent.whyNowItems.map(w =>
                                w.id === item.id ? { ...w, description: value } : w
                              );
                              updateContent('whyNowItems', updated);
                            }}
                            as="p"
                            className="text-gray-600 text-sm"
                            multiline
                          />
                          {index === 0 && (
                            <p className="text-lg font-bold text-[#03143B] mt-2">
                              {formatCompactCurrency(summary.grossAnnualValue / 12)}/month in potential value
                            </p>
                          )}
                        </div>
                      )}
                    />
                  ),
                },
                {
                  blockId: 'whyNowQuote',
                  label: 'Quote',
                  defaultColSpan: 12,
                  render: () => renderQuoteBlock('why-now'),
                },
                {
                  blockId: 'whyNowFaq',
                  label: 'FAQ',
                  defaultColSpan: 12,
                  render: () => renderFAQBlock('why-now'),
                },
              ])}
              layout={docContent.sectionLayouts?.whyNow}
              onLayoutChange={handleLayoutChange}
              blockRegistry={blockRegistryRef.current}
              onCrossSectionDrop={handleCrossSectionDrop}
              onInsertBlock={handleInsertBlock}
            />
          </section>
        </SectionWrapper>

        {/* ==================== NEXT STEPS ==================== */}
        <SectionWrapper sectionKey="nextSteps" visible={vis.nextSteps} onToggleVisibility={toggleVisibility}>
          <section className="page p-12">
            <LayoutSection
              sectionKey="nextSteps"
              blocks={registerBlocks('nextSteps', [
                {
                  blockId: 'nextStepsHeading',
                  defaultColSpan: 12,
                  render: () => (
                    <div className="border-t-2 border-[#03143B] pt-4">
                      <h2 className="text-2xl font-bold text-[#03143B]">Next Steps</h2>
                    </div>
                  ),
                },
                {
                  blockId: 'nextStepsItems',
                  label: 'Next Steps',
                  defaultColSpan: 12,
                  render: () => (
                    <WidgetGroup
                      items={docContent.nextStepsItems}
                      onChange={(items) => updateContent('nextStepsItems', items)}
                      layout="list"
                      minItems={1}
                      addLabel="Add next step"
                      createNewItem={() => ({ id: crypto.randomUUID(), title: 'New Step', description: 'Describe the next step...' })}
                      renderItem={(item, index) => (
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 bg-[#03143B] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <DirectEditableText
                              value={item.title as string}
                              onChange={(value) => {
                                const updated = docContent.nextStepsItems.map(s =>
                                  s.id === item.id ? { ...s, title: value } : s
                                );
                                updateContent('nextStepsItems', updated);
                              }}
                              as="h3"
                              className="font-semibold text-gray-900"
                            />
                            <DirectEditableText
                              value={item.description as string}
                              onChange={(value) => {
                                const updated = docContent.nextStepsItems.map(s =>
                                  s.id === item.id ? { ...s, description: value } : s
                                );
                                updateContent('nextStepsItems', updated);
                              }}
                              as="p"
                              className="text-gray-600 text-sm"
                              multiline
                            />
                          </div>
                        </div>
                      )}
                    />
                  ),
                },
                {
                  blockId: 'contactCard',
                  label: 'Contact',
                  defaultColSpan: 12,
                  render: () => (
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                      <p className="text-gray-600 mb-1">Questions? Let&apos;s talk.</p>
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
                  ),
                },
                {
                  blockId: 'footer',
                  label: 'Footer',
                  defaultColSpan: 12,
                  render: () => (
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
                  ),
                },
              ])}
              layout={docContent.sectionLayouts?.nextSteps}
              onLayoutChange={handleLayoutChange}
              blockRegistry={blockRegistryRef.current}
              onCrossSectionDrop={handleCrossSectionDrop}
              onInsertBlock={handleInsertBlock}
            />
          </section>
        </SectionWrapper>

        {/* Hidden Sections Restore Panel */}
        <div className="px-12">
          <HiddenSectionsPanel
            visibility={docContent.sectionVisibility}
            onRestore={restoreSection}
            onRestoreAll={restoreAllSections}
          />
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

      {/* Layout Mode Toggle */}
      <LayoutModeToggle />
    </LayoutModeProvider>
  );
}
