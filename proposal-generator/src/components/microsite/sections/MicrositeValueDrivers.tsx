'use client';

import React from 'react';
import { ProposalInputs } from '@/types/proposal';
import type { ValueDriversSectionData } from '@/types/microsite';
import { getValueDriverContent } from '@/lib/content-templates';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { MicrositeQuote } from '../MicrositeQuote';
import { useLayoutMode } from '@/components/ui/LayoutModeContext';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { ResolvedSpan } from '@/components/ui/ExportVariablesContext';
import { cryptoRandomId } from '@/lib/microsite-sections';
import { SubBlock } from '../studio/SubBlock';
import { useBlockOrder } from '../studio/useBlockOrder';

const VD_BLOCKS = ['grid', 'quote'] as const;
type VDBlockId = typeof VD_BLOCKS[number];

interface Driver {
  key: string;
  headline: string;
  description: string;
  proof?: string;
  isPrimary?: boolean;
  // True for user-authored drivers added in the studio. Distinguishes them
  // from computed drivers so add/remove semantics can differ (hide vs. drop).
  isCustom?: boolean;
}

interface Props {
  inputs: ProposalInputs;
  data?: Record<string, unknown>;
  onDataChange?: (next: Record<string, unknown>) => void;
}

export function MicrositeValueDrivers({ inputs, data, onDataChange }: Props) {
  const sectionRef = useScrollAnimation<HTMLElement>();
  const cardsRef = useScrollAnimation<HTMLDivElement>(0.1);
  const { layoutMode } = useLayoutMode();

  const sectionData = (data ?? {}) as ValueDriversSectionData;
  const hidden = new Set(sectionData.hiddenDriverKeys ?? []);

  // Computed drivers: AI-generated if available, else templates.
  const computed: Driver[] = inputs.generatedContent?.valueDriverContent?.length
    ? inputs.generatedContent.valueDriverContent.slice(0, 3).map((g) => ({
        key: g.key,
        headline: g.headline,
        description: g.description,
        proof: g.proof,
        isPrimary: g.key === inputs.primaryValueDriver,
      }))
    : getValueDriverContent(inputs.primaryValueDriver).map((d) => ({
        key: d.key,
        headline: d.headline,
        description: d.description,
        proof: d.proof,
        isPrimary: d.isPrimary,
      }));

  const added: Driver[] = (sectionData.addedDrivers ?? []).map((d) => ({ ...d, isCustom: true }));

  const visible = [...computed.filter((d) => !hidden.has(d.key)), ...added];

  function updateData(next: ValueDriversSectionData) {
    onDataChange?.(next as unknown as Record<string, unknown>);
  }

  function handleRemove(driver: Driver) {
    if (driver.isCustom) {
      updateData({
        ...sectionData,
        addedDrivers: (sectionData.addedDrivers ?? []).filter((d) => d.key !== driver.key),
      });
    } else {
      updateData({
        ...sectionData,
        hiddenDriverKeys: [...(sectionData.hiddenDriverKeys ?? []), driver.key],
      });
    }
  }

  function handleRestoreComputed(key: string) {
    updateData({
      ...sectionData,
      hiddenDriverKeys: (sectionData.hiddenDriverKeys ?? []).filter((k) => k !== key),
    });
  }

  function updateDriverText(key: string, field: 'headline' | 'description' | 'proof', value: string) {
    updateData({
      ...sectionData,
      driverOverrides: {
        ...(sectionData.driverOverrides ?? {}),
        [key]: { ...(sectionData.driverOverrides?.[key] ?? {}), [field]: value },
      },
    });
  }

  function updateTitle(value: string) {
    updateData({ ...sectionData, title: value });
  }

  function handleAdd() {
    updateData({
      ...sectionData,
      addedDrivers: [
        ...(sectionData.addedDrivers ?? []),
        {
          key: `custom-${cryptoRandomId()}`,
          headline: 'New value driver',
          description: 'Describe the outcome this drives for the customer.',
          proof: 'Add a proof point or stat here.',
        },
      ],
    });
  }

  const hiddenComputed = computed.filter((d) => hidden.has(d.key));

  const vdBlocks = useBlockOrder<VDBlockId>({
    defaults: VD_BLOCKS,
    persisted: sectionData.blockOrder,
    setOrder: (next) => updateData({ ...sectionData, blockOrder: next }),
  });

  return (
    <section id="value-drivers" className="py-20 sm:py-28 bg-white" ref={sectionRef}>
      <div className="max-w-5xl mx-auto px-6 ms-fade-up">
        {onDataChange ? (
          <DirectEditableText
            as="h2"
            value={sectionData.title ?? 'Value Drivers'}
            onChange={updateTitle}
            className="text-3xl sm:text-4xl font-bold mb-2"
            style={{ color: 'var(--theme-primary)' }}
          />
        ) : (
          <ResolvedSpan as="h2" className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--theme-primary)' }}>
            {sectionData.title ?? 'Value Drivers'}
          </ResolvedSpan>
        )}
        <div className="w-16 h-0.5 mb-10" style={{ backgroundColor: 'var(--theme-primary)' }} />

        {vdBlocks.order.map((blockId) => {
          const blockProps = {
            blockId,
            isFirst: vdBlocks.isFirst(blockId),
            isLast: vdBlocks.isLast(blockId),
            canEdit: !!onDataChange,
            onMoveUp: () => vdBlocks.moveUp(blockId),
            onMoveDown: () => vdBlocks.moveDown(blockId),
          };
          if (blockId === 'grid') return (
            <SubBlock key={blockId} {...blockProps}>
              <>

        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 ms-stagger">
          {visible.map((driver, i) => {
            const proposalOverrides = inputs.contentOverrides?.valueDrivers?.[driver.key];
            const sectionOverrides = sectionData.driverOverrides?.[driver.key];
            const headline = sectionOverrides?.headline ?? proposalOverrides?.headline ?? driver.headline;
            const description = sectionOverrides?.description ?? proposalOverrides?.description ?? driver.description;
            const proof = sectionOverrides?.proof ?? proposalOverrides?.proof ?? driver.proof;
            return (
              <div
                key={driver.key}
                className={`relative p-6 rounded-xl transition-shadow hover:shadow-lg ${
                  driver.isPrimary ? 'ring-2' : 'bg-gray-50 border border-gray-200'
                }`}
                style={
                  driver.isPrimary
                    ? ({ backgroundColor: 'rgba(var(--theme-primary-rgb), 0.05)', '--tw-ring-color': 'var(--theme-primary)' } as React.CSSProperties)
                    : undefined
                }
              >
                {layoutMode && onDataChange && (
                  <button
                    onClick={() => handleRemove(driver)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 hover:bg-red-50 text-gray-500 hover:text-red-600 border border-gray-200 shadow flex items-center justify-center transition-colors z-10"
                    title="Remove driver"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <div className="flex items-center justify-between mb-3">
                  <div className={`text-4xl font-bold ${driver.isPrimary ? '' : 'text-gray-200'}`} style={driver.isPrimary ? { color: 'var(--theme-primary)' } : undefined}>
                    {i + 1}
                  </div>
                  {driver.isPrimary && (
                    <span className="px-2 py-0.5 text-white text-xs font-semibold rounded" style={{ backgroundColor: 'var(--theme-primary)' }}>
                      PRIMARY
                    </span>
                  )}
                </div>
                {onDataChange ? (
                  <>
                    <DirectEditableText
                      as="h3"
                      value={headline}
                      onChange={(v) => updateDriverText(driver.key, 'headline', v)}
                      className="text-lg font-bold mb-2"
                      style={{ color: 'var(--theme-primary)' }}
                    />
                    <DirectEditableText
                      as="p"
                      multiline
                      value={description}
                      onChange={(v) => updateDriverText(driver.key, 'description', v)}
                      className="text-gray-600 text-sm mb-3 leading-relaxed"
                    />
                    <DirectEditableText
                      as="p"
                      value={proof ?? ''}
                      onChange={(v) => updateDriverText(driver.key, 'proof', v)}
                      placeholder="Add a proof point (or {{paybackMonths}})"
                      className="text-sm font-semibold"
                      style={{ color: 'var(--theme-primary)' }}
                    />
                  </>
                ) : (
                  <>
                    <ResolvedSpan as="h3" className="text-lg font-bold mb-2" style={{ color: 'var(--theme-primary)' }}>
                      {headline}
                    </ResolvedSpan>
                    <ResolvedSpan as="p" className="text-gray-600 text-sm mb-3 leading-relaxed">
                      {description}
                    </ResolvedSpan>
                    {proof && (
                      <ResolvedSpan as="p" className="text-sm font-semibold" style={{ color: 'var(--theme-primary)' }}>
                        {proof}
                      </ResolvedSpan>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {layoutMode && onDataChange && (
            <button
              onClick={handleAdd}
              className="p-6 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors flex flex-col items-center justify-center min-h-[12rem]"
              title="Add driver"
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs font-medium">Add driver</span>
            </button>
          )}
        </div>

        {layoutMode && onDataChange && hiddenComputed.length > 0 && (
          <div className="mt-6 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2 flex-wrap">
            <span className="font-medium">Hidden:</span>
            {hiddenComputed.map((d) => (
              <button
                key={d.key}
                onClick={() => handleRestoreComputed(d.key)}
                className="px-2 py-0.5 rounded-full bg-white border border-amber-200 hover:bg-amber-100 transition-colors"
                title="Restore"
              >
                {d.headline} &bull; restore
              </button>
            ))}
          </div>
        )}
              </>
            </SubBlock>
          );
          if (blockId === 'quote') return (
            <SubBlock key={blockId} {...blockProps}>
              <MicrositeQuote selectedQuotes={inputs.selectedQuotes} section="value-drivers" />
            </SubBlock>
          );
          return null;
        })}
      </div>
    </section>
  );
}
