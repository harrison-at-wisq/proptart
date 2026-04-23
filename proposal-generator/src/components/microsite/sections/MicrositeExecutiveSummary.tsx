'use client';

import React from 'react';
import { ProposalInputs, PainPoint } from '@/types/proposal';
import type { ExecutiveSummarySectionData } from '@/types/microsite';
import { calculatePricing, formatCompactCurrency, formatCurrency } from '@/lib/pricing-calculator';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
} from '@/lib/roi-calculator';
import { getOpportunityContent, getPainPointContent } from '@/lib/content-templates';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { MicrositeQuote } from '../MicrositeQuote';
import { useLayoutMode } from '@/components/ui/LayoutModeContext';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { ResolvedSpan } from '@/components/ui/ExportVariablesContext';
import { cryptoRandomId } from '@/lib/microsite-sections';
import { AddItemCard, HiddenItemsBar, RemoveItemButton } from '../studio/LayoutChrome';
import { SubBlock } from '../studio/SubBlock';
import { useBlockOrder } from '../studio/useBlockOrder';

const EXEC_BLOCKS = ['narrativeMetrics', 'painPoints'] as const;
type ExecBlockId = typeof EXEC_BLOCKS[number];

interface Props {
  inputs: ProposalInputs;
  data?: Record<string, unknown>;
  onDataChange?: (next: Record<string, unknown>) => void;
}

export function MicrositeExecutiveSummary({ inputs, data, onDataChange }: Props) {
  const { layoutMode } = useLayoutMode();
  const sectionData = (data ?? {}) as ExecutiveSummarySectionData;
  const hiddenPain = new Set(sectionData.hiddenPainPointKeys ?? []);
  const sectionRef = useScrollAnimation<HTMLElement>();
  const metricsRef = useScrollAnimation<HTMLDivElement>(0.2);
  const painRef = useScrollAnimation<HTMLDivElement>(0.1);

  const pricing = calculatePricing(inputs.pricing);
  const contractYears = inputs.pricing.contractTermYears || 3;
  const hrInputs = inputs.hrOperations;
  const yearSettings = hrInputs.yearSettings?.length
    ? hrInputs.yearSettings
    : [
        { wisqEffectiveness: 30, workforceChange: 0 },
        { wisqEffectiveness: 60, workforceChange: 5 },
        { wisqEffectiveness: 75, workforceChange: 10 },
      ];
  const hrOutput = calculateHROperationsROI(hrInputs);
  const tier2PlusConfiguredCases = hrInputs.tier2Workflows.reduce((sum, w) => sum + w.volumePerYear, 0);
  const ncVol = hrInputs.nonConfiguredWorkflow?.enabled ? (hrInputs.nonConfiguredWorkflow.volumePerYear || 0) : 0;
  const tier2PlusTotalCases = hrInputs.tier2PlusTotalCases || (tier2PlusConfiguredCases + ncVol) || tier2PlusConfiguredCases;
  const activeConfiguredCasesByYear = hrOutput.yearResults.map(yr => yr.activeConfiguredCases);
  const legalOutput = calculateLegalComplianceROI(
    inputs.legalCompliance, tier2PlusConfiguredCases, yearSettings, contractYears, tier2PlusTotalCases, activeConfiguredCasesByYear
  );
  const eeOutput = calculateEmployeeExperienceROI(inputs.employeeExperience, yearSettings, contractYears);
  const wisqLicenseCost = pricing.annualRecurringRevenue;
  const summary = calculateROISummary(hrOutput, legalOutput, eeOutput, wisqLicenseCost, contractYears);

  const opportunityContent = getOpportunityContent(inputs.company.industry);

  const avgAnnualInvestment = pricing.totalContractValue / contractYears;
  const monthlyGross = summary.grossAnnualValue / 12;
  const paybackMonths = monthlyGross > 0 ? avgAnnualInvestment / monthlyGross : 0;


  // Narrative content precedence: section override → proposal contentOverrides
  // → AI-generated → template default.
  const insightFallback = inputs.contentOverrides?.execSummaryInsight
    || inputs.generatedContent?.execSummaryInsight
    || opportunityContent.insight;
  const visionFallback = inputs.contentOverrides?.execSummaryVision
    || inputs.generatedContent?.execSummaryVision
    || opportunityContent.vision;
  const bulletsFallback = inputs.contentOverrides?.execSummaryBullets
    || inputs.generatedContent?.execSummaryBullets
    || opportunityContent.bullets;
  const insight = (data as ExecutiveSummarySectionData | undefined)?.narrative?.insight ?? insightFallback;
  const vision = (data as ExecutiveSummarySectionData | undefined)?.narrative?.vision ?? visionFallback;
  const bullets = (data as ExecutiveSummarySectionData | undefined)?.narrative?.bullets ?? bulletsFallback;

  // Build pain points
  const order = inputs.painPointOrder?.length ? inputs.painPointOrder : inputs.painPoints;
  const painPointContent = getPainPointContent(inputs.painPoints);
  const computedItems: Array<{ key: string; headline: string; impact: string; isCustom?: boolean }> = [];
  for (const id of order) {
    const predefined = painPointContent.find(p => p.key === id);
    if (predefined) {
      computedItems.push(predefined);
      continue;
    }
    const custom = inputs.customPainPoints?.find(cp => cp.id === id);
    if (custom) {
      computedItems.push({ key: custom.id, headline: custom.headline, impact: custom.impact });
    }
  }
  const addedItems: Array<{ key: string; headline: string; impact: string; isCustom?: boolean }> =
    (sectionData.addedPainPoints ?? []).map((p) => ({ ...p, isCustom: true }));
  const visibleItems = [...computedItems.filter((p) => !hiddenPain.has(p.key)), ...addedItems];
  const hiddenComputed = computedItems.filter((p) => hiddenPain.has(p.key));

  const canEdit = layoutMode && !!onDataChange;

  function updateData(next: ExecutiveSummarySectionData) {
    onDataChange?.(next as unknown as Record<string, unknown>);
  }

  function handleRemove(key: string, isCustom?: boolean) {
    if (isCustom) {
      updateData({
        ...sectionData,
        addedPainPoints: (sectionData.addedPainPoints ?? []).filter((p) => p.key !== key),
      });
    } else {
      updateData({
        ...sectionData,
        hiddenPainPointKeys: [...(sectionData.hiddenPainPointKeys ?? []), key],
      });
    }
  }

  function handleAdd() {
    updateData({
      ...sectionData,
      addedPainPoints: [
        ...(sectionData.addedPainPoints ?? []),
        {
          key: `custom-${cryptoRandomId()}`,
          headline: 'New pain point',
          impact: 'Describe the impact on the business.',
        },
      ],
    });
  }

  function handleRestore(key: string) {
    updateData({
      ...sectionData,
      hiddenPainPointKeys: (sectionData.hiddenPainPointKeys ?? []).filter((k) => k !== key),
    });
  }

  function updatePainText(key: string, field: 'headline' | 'impact', value: string) {
    updateData({
      ...sectionData,
      painPointOverrides: {
        ...(sectionData.painPointOverrides ?? {}),
        [key]: { ...(sectionData.painPointOverrides?.[key] ?? {}), [field]: value },
      },
    });
  }

  function updateTitle(value: string) {
    updateData({ ...sectionData, title: value });
  }

  function updateNarrative(field: 'insight' | 'vision', value: string) {
    updateData({
      ...sectionData,
      narrative: { ...(sectionData.narrative ?? {}), [field]: value },
    });
  }

  function setBullets(next: string[]) {
    updateData({
      ...sectionData,
      narrative: { ...(sectionData.narrative ?? {}), bullets: next },
    });
  }

  function updateBullet(index: number, value: string) {
    const base = sectionData.narrative?.bullets ?? bulletsFallback;
    const nextBullets = base.slice();
    nextBullets[index] = value;
    setBullets(nextBullets);
  }

  function addBullet() {
    const base = sectionData.narrative?.bullets ?? bulletsFallback;
    setBullets([...base, 'New bullet point']);
  }

  function removeBullet(index: number) {
    const base = sectionData.narrative?.bullets ?? bulletsFallback;
    const next = base.slice();
    next.splice(index, 1);
    setBullets(next);
  }

  function moveBullet(index: number, direction: -1 | 1) {
    const base = sectionData.narrative?.bullets ?? bulletsFallback;
    const target = index + direction;
    if (target < 0 || target >= base.length) return;
    const next = base.slice();
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setBullets(next);
  }

  function updateMetricValue(key: 'avgAnnualInvestment' | 'projectedAnnualValue' | 'roi' | 'payback', value: string) {
    updateData({
      ...sectionData,
      metricValueOverrides: { ...(sectionData.metricValueOverrides ?? {}), [key]: value },
    });
  }

  function updateMetricLabel(key: 'avgAnnualInvestment' | 'projectedAnnualValue' | 'roi' | 'payback', value: string) {
    updateData({
      ...sectionData,
      metricLabelOverrides: { ...(sectionData.metricLabelOverrides ?? {}), [key]: value },
    });
  }

  function updateSubheading(key: 'keyMetricsTitle' | 'currentStateTitle', value: string) {
    updateData({ ...sectionData, [key]: value });
  }

  const execOrder = useBlockOrder<ExecBlockId>({
    defaults: EXEC_BLOCKS,
    persisted: sectionData.blockOrder,
    setOrder: (next) => updateData({ ...sectionData, blockOrder: next }),
  });

  return (
    <section id="executive-summary" className="py-20 sm:py-28 bg-white" ref={sectionRef}>
      <div className="max-w-5xl mx-auto px-6 ms-fade-up">
        {onDataChange ? (
          <DirectEditableText
            as="h2"
            value={sectionData.title ?? 'Executive Summary'}
            onChange={updateTitle}
            className="text-3xl sm:text-4xl font-bold mb-2"
            style={{ color: 'var(--theme-primary)' }}
          />
        ) : (
          <ResolvedSpan as="h2" className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--theme-primary)' }}>
            {sectionData.title ?? 'Executive Summary'}
          </ResolvedSpan>
        )}
        <div className="w-16 h-0.5 mb-8" style={{ backgroundColor: 'var(--theme-primary)' }} />

        {execOrder.order.map((blockId) => (
          <SubBlock
            key={blockId}
            blockId={blockId}
            isFirst={execOrder.isFirst(blockId)}
            isLast={execOrder.isLast(blockId)}
            canEdit={!!onDataChange}
            onMoveUp={() => execOrder.moveUp(blockId)}
            onMoveDown={() => execOrder.moveDown(blockId)}
          >
            {blockId === 'narrativeMetrics' ? (
              <>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
          <div className="md:col-span-3">
            {onDataChange ? (
              <DirectEditableText
                as="p"
                multiline
                value={insight}
                onChange={(v) => updateNarrative('insight', v)}
                className="text-gray-700 text-lg leading-relaxed mb-4"
              />
            ) : (
              <ResolvedSpan as="p" className="text-gray-700 text-lg leading-relaxed mb-4">{insight}</ResolvedSpan>
            )}
            {onDataChange ? (
              <DirectEditableText
                as="p"
                multiline
                value={vision}
                onChange={(v) => updateNarrative('vision', v)}
                className="text-xl font-semibold italic border-l-4 pl-4 mb-6"
                style={{ color: 'var(--theme-primary)', borderColor: 'var(--theme-primary)' }}
              />
            ) : (
              <ResolvedSpan as="p" className="text-xl font-semibold italic border-l-4 pl-4 mb-6" style={{ color: 'var(--theme-primary)', borderColor: 'var(--theme-primary)' }}>
                {vision}
              </ResolvedSpan>
            )}
            <ul className="space-y-3">
              {bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-600 group/bullet">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: 'var(--theme-primary)' }} />
                  <div className="flex-1 min-w-0">
                    {onDataChange ? (
                      <DirectEditableText
                        as="span"
                        multiline
                        value={bullet}
                        onChange={(v) => updateBullet(i, v)}
                      />
                    ) : (
                      <ResolvedSpan as="span">{bullet}</ResolvedSpan>
                    )}
                  </div>
                  {layoutMode && onDataChange && (
                    <div className="flex items-center gap-1 opacity-0 group-hover/bullet:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => moveBullet(i, -1)}
                        disabled={i === 0}
                        title="Move up"
                        className="w-6 h-6 rounded-md bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 flex items-center justify-center"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button
                        onClick={() => moveBullet(i, 1)}
                        disabled={i === bullets.length - 1}
                        title="Move down"
                        className="w-6 h-6 rounded-md bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 flex items-center justify-center"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      <button
                        onClick={() => removeBullet(i)}
                        title="Remove bullet"
                        className="w-6 h-6 rounded-md bg-white border border-gray-200 text-red-500 hover:bg-red-50 flex items-center justify-center"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {layoutMode && onDataChange && (
              <button
                onClick={addBullet}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-[#03143B]"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                Add bullet
              </button>
            )}
          </div>

          <div className="md:col-span-2 ms-fade-up" ref={metricsRef}>
            <div className="bg-gray-50 rounded-xl p-6 border border-[#e0e3eb] space-y-4">
              {onDataChange ? (
                <DirectEditableText
                  as="h3"
                  value={sectionData.keyMetricsTitle ?? 'Key Metrics'}
                  onChange={(v) => updateSubheading('keyMetricsTitle', v)}
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--theme-primary)' }}
                />
              ) : (
                <ResolvedSpan as="h3" className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-primary)' }}>
                  {sectionData.keyMetricsTitle ?? 'Key Metrics'}
                </ResolvedSpan>
              )}
              {([
                { key: 'avgAnnualInvestment' as const, label: 'Avg. Annual Investment', defaultValue: '{{avgAnnualInvestment}}' },
                { key: 'projectedAnnualValue' as const, label: 'Projected Annual Value', defaultValue: '{{projectedAnnualValueK}}' },
                { key: 'roi' as const, label: 'Return on Investment', defaultValue: '{{netAnnualBenefitPerYr}}' },
                { key: 'payback' as const, label: 'Payback Period', defaultValue: '{{paybackMonthsLabel}}' },
              ]).map((metric, idx, arr) => {
                const labelText = sectionData.metricLabelOverrides?.[metric.key] ?? metric.label;
                const valueText = sectionData.metricValueOverrides?.[metric.key] ?? metric.defaultValue;
                const isLast = idx === arr.length - 1;
                return (
                  <div key={metric.key} className={`flex justify-between items-center ${isLast ? '' : 'pb-3 border-b border-gray-200'}`}>
                    {onDataChange ? (
                      <DirectEditableText
                        as="span"
                        value={labelText}
                        onChange={(v) => updateMetricLabel(metric.key, v)}
                        className="text-gray-600 text-sm"
                      />
                    ) : (
                      <ResolvedSpan as="span" className="text-gray-600 text-sm">{labelText}</ResolvedSpan>
                    )}
                    {onDataChange ? (
                      <DirectEditableText
                        as="span"
                        value={valueText}
                        onChange={(v) => updateMetricValue(metric.key, v)}
                        className="text-xl font-bold"
                        style={{ color: 'var(--theme-primary)' }}
                      />
                    ) : (
                      <ResolvedSpan as="span" className="text-xl font-bold" style={{ color: 'var(--theme-primary)' }}>
                        {valueText}
                      </ResolvedSpan>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <MicrositeQuote selectedQuotes={inputs.selectedQuotes} section="executive-summary" />
              </>
            ) : (
              (visibleItems.length > 0 || canEdit) && (
          <div ref={painRef} className="ms-fade-up">
            {onDataChange ? (
              <DirectEditableText
                as="h3"
                value={sectionData.currentStateTitle ?? 'Current State Assessment'}
                onChange={(v) => updateSubheading('currentStateTitle', v)}
                className="text-xl font-semibold mb-5"
                style={{ color: 'var(--theme-primary)' }}
              />
            ) : (
              <ResolvedSpan as="h3" className="text-xl font-semibold mb-5" style={{ color: 'var(--theme-primary)' }}>
                {sectionData.currentStateTitle ?? 'Current State Assessment'}
              </ResolvedSpan>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ms-stagger">
              {visibleItems.map((point) => {
                const headline = sectionData.painPointOverrides?.[point.key]?.headline
                  ?? inputs.contentOverrides?.painPointHeadlines?.[point.key]
                  ?? point.headline;
                const impact = sectionData.painPointOverrides?.[point.key]?.impact ?? point.impact;
                return (
                  <div
                    key={point.key}
                    className="relative p-5 bg-white border-l-4 shadow-sm rounded-r-lg"
                    style={{ borderColor: 'var(--theme-primary)' }}
                  >
                    {canEdit && <RemoveItemButton onClick={() => handleRemove(point.key, point.isCustom)} />}
                    {onDataChange ? (
                      <>
                        <DirectEditableText
                          as="h4"
                          value={headline}
                          onChange={(v) => updatePainText(point.key, 'headline', v)}
                          className="font-semibold text-gray-900 mb-1"
                        />
                        <DirectEditableText
                          as="p"
                          multiline
                          value={impact}
                          onChange={(v) => updatePainText(point.key, 'impact', v)}
                          className="text-gray-600 text-sm"
                        />
                      </>
                    ) : (
                      <>
                        <ResolvedSpan as="h4" className="font-semibold text-gray-900 mb-1">{headline}</ResolvedSpan>
                        <ResolvedSpan as="p" className="text-gray-600 text-sm">{impact}</ResolvedSpan>
                      </>
                    )}
                  </div>
                );
              })}
              {canEdit && <AddItemCard label="Add pain point" onClick={handleAdd} />}
            </div>
            {canEdit && (
              <HiddenItemsBar
                items={hiddenComputed.map((p) => ({ key: p.key, label: p.headline }))}
                onRestore={handleRestore}
              />
            )}
          </div>
              )
            )}
          </SubBlock>
        ))}
      </div>
    </section>
  );
}
