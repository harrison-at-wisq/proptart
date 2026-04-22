'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ProposalInputs, ProposalDocumentContent, SectionVisibility, SectionLayout, BlockLayout, CustomBlockType, CustomBlock, resolveOtherValue, FAQSection, CustomSectionConfig, ProposalElementType, SectionLayoutPreset } from '@/types/proposal';
import { SectionWrapper } from '@/components/ui/SectionWrapper';
import { HiddenSectionsPanel } from '@/components/ui/HiddenSectionsPanel';
import { LayoutModeProvider } from '@/components/ui/LayoutModeContext';
import { LayoutModeToggle } from '@/components/ui/LayoutModeToggle';
import { LayoutSection } from '@/components/ui/LayoutSection';
import type { BlockDef } from '@/components/ui/LayoutSection';
import { CustomBlockRenderer } from '@/components/ui/CustomBlockRenderer';
import { SectionNavBar } from '@/components/ui/SectionNavBar';
import { PageFrame } from '@/components/ui/PageFrame';
import { AddSectionButton } from '@/components/ui/AddSectionButton';
import { CustomSectionRenderer } from './CustomSectionRenderer';
import { getThemeVars } from '@/lib/theme';
import { getDefaultElementData } from './templates/element-defaults';
import { ELEMENT_CATALOG } from './templates/registry';
import { DEFAULT_TEMPLATE } from './templates/default-template';
import { buildBlockDefs } from './buildBlockDefs';
import type { ProposalRenderContext } from './buildBlockDefs';
import { calculatePricing } from '@/lib/pricing-calculator';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
  calculateMultiYearProjection,
} from '@/lib/roi-calculator';
import { materializeDocumentContent } from '@/lib/materialize-content';

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
  const toggleVisibility = useCallback((key: string) => {
    const visKey = key as keyof SectionVisibility;
    setDocContent(prev => ({
      ...prev,
      sectionVisibility: {
        ...prev.sectionVisibility,
        [visKey]: !prev.sectionVisibility[visKey],
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
  const handleLayoutChange = useCallback((sectionKey: string, layout: SectionLayout) => {
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
    targetSection: string,
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
      const targetBlocks = getBlocks(targetSection as keyof SectionVisibility);

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

  // ==================== Custom Section Handlers ====================

  const handleAddCustomSection = useCallback((name: string, preset: SectionLayoutPreset, darkTheme: boolean) => {
    const newSection: CustomSectionConfig = {
      id: crypto.randomUUID(),
      name,
      layoutPreset: preset,
      darkTheme,
      elements: [],
    };
    setDocContent(prev => ({
      ...prev,
      customSections: [...(prev.customSections || []), newSection],
    }));
  }, []);

  const handleUpdateCustomSectionElement = useCallback((sectionId: string, elementId: string, data: Record<string, unknown>) => {
    setDocContent(prev => ({
      ...prev,
      customSections: (prev.customSections || []).map(s =>
        s.id === sectionId
          ? { ...s, elements: s.elements.map(el => el.id === elementId ? { ...el, data } : el) }
          : s
      ),
    }));
  }, []);

  const handleRemoveCustomSectionElement = useCallback((sectionId: string, elementId: string) => {
    setDocContent(prev => ({
      ...prev,
      customSections: (prev.customSections || []).map(s =>
        s.id === sectionId
          ? { ...s, elements: s.elements.filter(el => el.id !== elementId) }
          : s
      ),
    }));
  }, []);

  const handleAddCustomSectionElement = useCallback((sectionId: string, elementType: ProposalElementType, colSpan: number, insertAt: number) => {
    const catalogEntry = ELEMENT_CATALOG.find(e => e.type === elementType);
    const newElement = {
      id: crypto.randomUUID(),
      elementType,
      label: catalogEntry?.name || elementType,
      colSpan,
      data: getDefaultElementData(elementType),
    };
    setDocContent(prev => ({
      ...prev,
      customSections: (prev.customSections || []).map(s => {
        if (s.id !== sectionId) return s;
        const elements = [...s.elements];
        elements.splice(insertAt, 0, newElement);
        return { ...s, elements };
      }),
    }));
  }, []);

  const handleCustomSectionLayoutChange = useCallback((sectionId: string, layout: SectionLayout) => {
    setDocContent(prev => ({
      ...prev,
      customSections: (prev.customSections || []).map(s =>
        s.id === sectionId ? { ...s, layout } : s
      ),
    }));
  }, []);

  const handleRemoveCustomSection = useCallback((sectionId: string) => {
    setDocContent(prev => ({
      ...prev,
      customSections: (prev.customSections || []).filter(s => s.id !== sectionId),
    }));
  }, []);

  const handleRenameCustomSection = useCallback((sectionId: string, name: string) => {
    setDocContent(prev => ({
      ...prev,
      customSections: (prev.customSections || []).map(s =>
        s.id === sectionId ? { ...s, name } : s
      ),
    }));
  }, []);

  // Calculate all computed values (not editable — always derived from inputs)
  const pricing = calculatePricing(inputs.pricing);
  const contractYears = inputs.pricing.contractTermYears || 3;
  const hrInputsLocal = inputs.hrOperations;
  const yearSettingsLocal = hrInputsLocal.yearSettings?.length
    ? hrInputsLocal.yearSettings
    : [
        { wisqEffectiveness: 30, workforceChange: 0 },
        { wisqEffectiveness: 60, workforceChange: 5 },
        { wisqEffectiveness: 75, workforceChange: 10 },
      ];
  const hrOutput = calculateHROperationsROI(hrInputsLocal);
  const tier2PlusConfiguredCasesLocal = hrInputsLocal.tier2Workflows.reduce((sum, w) => sum + w.volumePerYear, 0);
  const ncVolLocal = hrInputsLocal.nonConfiguredWorkflow?.enabled ? (hrInputsLocal.nonConfiguredWorkflow.volumePerYear || 0) : 0;
  const tier2PlusTotalCasesLocal = hrInputsLocal.tier2PlusTotalCases || (tier2PlusConfiguredCasesLocal + ncVolLocal) || tier2PlusConfiguredCasesLocal;
  const activeConfiguredCasesByYearLocal = hrOutput.yearResults.map(yr => yr.activeConfiguredCases);
  const legalOutput = calculateLegalComplianceROI(
    inputs.legalCompliance, tier2PlusConfiguredCasesLocal, yearSettingsLocal, contractYears, tier2PlusTotalCasesLocal, activeConfiguredCasesByYearLocal
  );
  const employeeOutput = calculateEmployeeExperienceROI(inputs.employeeExperience, yearSettingsLocal, contractYears);
  const wisqLicenseCostLocal = pricing.annualRecurringRevenue;
  const summary = calculateROISummary(hrOutput, legalOutput, employeeOutput, wisqLicenseCostLocal, contractYears);
  const projection = calculateMultiYearProjection(hrOutput, legalOutput, employeeOutput, wisqLicenseCostLocal);

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

  // Build customer integrations list (computed from inputs, not editable text)
  const customerIntegrations = [
    inputs.integrations.hcm && { name: resolveOtherValue(inputs.integrations.hcm, inputs.integrations.customHcm), category: 'HCM' },
    inputs.integrations.identity && { name: resolveOtherValue(inputs.integrations.identity, inputs.integrations.customIdentity), category: 'Identity' },
    inputs.integrations.documents && { name: resolveOtherValue(inputs.integrations.documents, inputs.integrations.customDocuments), category: 'Documents' },
    ...(Array.isArray(inputs.integrations.communication)
      ? inputs.integrations.communication.filter(Boolean).map(v => ({ name: resolveOtherValue(v, inputs.integrations.customCommunication), category: 'Communication' }))
      : inputs.integrations.communication ? [{ name: resolveOtherValue(inputs.integrations.communication, inputs.integrations.customCommunication), category: 'Communication' }] : []),
    inputs.integrations.ticketing && inputs.integrations.ticketing !== 'None / Not applicable' && { name: resolveOtherValue(inputs.integrations.ticketing, inputs.integrations.customTicketing), category: 'Ticketing' },
  ].filter(Boolean) as { name: string; category: string }[];

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

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

  // Payback: what fraction of the year are they in the negative?
  const avgAnnualInvestment = pricing.totalContractValue / contractYears;
  const monthlyGross = summary.grossAnnualValue / 12;
  const paybackMonths = monthlyGross > 0 ? avgAnnualInvestment / monthlyGross : 0;

  // Build render context for template-driven sections
  const renderCtx: ProposalRenderContext = {
    docContent,
    updateContent,
    pricing,
    summary,
    projection,
    contractYears,
    paybackMonths,
    inputs,
    customerIntegrations,
    today,
    getFAQsForPage,
    updateFAQ,
  };

  return (
    <LayoutModeProvider>
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
      {exportError && (
        <div className="fixed top-16 right-4 z-50 space-y-2 print:hidden">
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

      {/* Section Navigation Bar */}
      <SectionNavBar
        sectionVisibility={docContent.sectionVisibility}
        documentRef={documentRef}
      />

      {/* Document Container */}
      <div
        ref={documentRef}
        className="proposal-document min-h-screen"
        style={getThemeVars(inputs.colorPalette)}
      >
        {/* ==================== TEMPLATE-DRIVEN SECTIONS ==================== */}
        {DEFAULT_TEMPLATE.sections.map((sectionConfig) => {
          const sectionKey = sectionConfig.sectionKey;
          const blocks = buildBlockDefs(sectionConfig, renderCtx);

          return (
            <SectionWrapper key={sectionKey} sectionKey={sectionKey} visible={vis[sectionKey]} onToggleVisibility={toggleVisibility}>
              <PageFrame darkTheme={sectionConfig.darkTheme} className={sectionConfig.className}>
                {sectionKey === 'cover' ? (
                  <>{blocks.map(b => <div key={b.blockId}>{b.render()}</div>)}</>
                ) : (
                  <LayoutSection
                    sectionKey={sectionKey}
                    blocks={registerBlocks(sectionKey, blocks)}
                    layout={docContent.sectionLayouts?.[sectionKey]}
                    onLayoutChange={handleLayoutChange}
                    blockRegistry={blockRegistryRef.current}
                    onCrossSectionDrop={handleCrossSectionDrop}
                    onInsertBlock={handleInsertBlock}
                  />
                )}
              </PageFrame>
            </SectionWrapper>
          );
        })}

        {/* ==================== CUSTOM SECTIONS ==================== */}
        {(docContent.customSections || []).map((cs) => (
          <div key={cs.id} data-section-key={cs.id}>
            <PageFrame darkTheme={cs.darkTheme}>
              <CustomSectionRenderer
                section={cs}
                onUpdateElement={handleUpdateCustomSectionElement}
                onRemoveElement={handleRemoveCustomSectionElement}
                onAddElement={handleAddCustomSectionElement}
                onLayoutChange={handleCustomSectionLayoutChange}
                onRemoveSection={handleRemoveCustomSection}
                onRenameSection={handleRenameCustomSection}
              />
            </PageFrame>
          </div>
        ))}

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
            padding: 0 !important;
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

          .page-frame {
            margin-bottom: 0 !important;
            box-shadow: none !important;
            border: none !important;
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
            background-color: #e5e7eb;
            padding: 2rem 0;
          }

          .page {
            min-height: 11in;
          }

          .page-frame {
            min-height: 11in;
            background-color: white;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-bottom: 2rem;
          }

          .page-frame:last-child {
            margin-bottom: 0;
          }

          .cover-page {
            min-height: 11in;
          }
        }
      `}</style>

      {/* Layout Mode Toggle + Add Section Button */}
      <AddSectionButton onAddSection={handleAddCustomSection} />
      <LayoutModeToggle />
    </LayoutModeProvider>
  );
}
