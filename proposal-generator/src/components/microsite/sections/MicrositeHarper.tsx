'use client';

import React from 'react';
import { ProposalInputs } from '@/types/proposal';
import type { HarperSectionData } from '@/types/microsite';
import { HARPER_STATS } from '@/lib/content-templates';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { MicrositeQuote } from '../MicrositeQuote';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { ResolvedSpan } from '@/components/ui/ExportVariablesContext';
import { SubBlock } from '../studio/SubBlock';
import { useBlockOrder } from '../studio/useBlockOrder';
import { AddItemCard, HiddenItemsBar, RemoveItemButton } from '../studio/LayoutChrome';
import { useLayoutMode } from '@/components/ui/LayoutModeContext';
import { cryptoRandomId } from '@/lib/microsite-sections';

interface Props {
  inputs: ProposalInputs;
  data?: Record<string, unknown>;
  onDataChange?: (next: Record<string, unknown>) => void;
}

const CAPABILITIES = [
  { title: 'Instant Answers', desc: 'Responds in under 8 seconds in 98 languages' },
  { title: 'Full Audit Trail', desc: 'Every response documented with policy citations' },
  { title: 'Enterprise Secure', desc: 'SOC 2 Type II, encryption at rest and in transit' },
  { title: 'Deep Integrations', desc: 'Connects to your existing HCM, identity, and comms tools' },
  { title: 'Learns & Improves', desc: 'Gets smarter with your policies and interactions' },
  { title: '24/7 Availability', desc: 'Always on, always accurate, always compliant' },
];

const STAT_DEFAULTS: Array<{ key: string; value: string; label: string }> = [
  { key: 'accuracy', value: HARPER_STATS.accuracy, label: HARPER_STATS.accuracyContext },
  { key: 'response', value: '<8s', label: HARPER_STATS.responseContext },
  { key: 'deflection', value: HARPER_STATS.deflection, label: HARPER_STATS.deflectionContext },
  { key: 'languages', value: HARPER_STATS.languages, label: 'Languages supported' },
];

const BLOCKS = ['header', 'stats', 'capabilities'] as const;
type BlockId = typeof BLOCKS[number];

export function MicrositeHarper({ inputs, data, onDataChange }: Props) {
  const sectionRef = useScrollAnimation<HTMLElement>();
  const sectionData = (data ?? {}) as HarperSectionData;
  const canEdit = !!onDataChange;
  const { layoutMode } = useLayoutMode();
  const hiddenCapabilityKeys = new Set(sectionData.hiddenCapabilityKeys ?? []);
  const addedCapabilities = sectionData.addedCapabilities ?? [];

  const title = sectionData.title ?? 'Meet Harper';
  const subtitle = sectionData.subtitle ?? 'Your AI HR Teammate';
  const intro = sectionData.intro
    ?? inputs.contentOverrides?.harperIntro
    ?? 'Harper handles the routine so your team can focus on what matters. She provides instant, accurate responses to employee questions while maintaining complete audit trails for compliance.';
  const capabilitiesTitle = sectionData.capabilitiesTitle ?? 'What Harper Does';

  function update<K extends keyof HarperSectionData>(key: K, value: HarperSectionData[K]) {
    onDataChange?.({ ...sectionData, [key]: value } as unknown as Record<string, unknown>);
  }

  function updateCapability(capKey: string, field: 'title' | 'description', value: string) {
    onDataChange?.({
      ...sectionData,
      capabilityOverrides: {
        ...(sectionData.capabilityOverrides ?? {}),
        [capKey]: { ...(sectionData.capabilityOverrides?.[capKey] ?? {}), [field]: value },
      },
    } as unknown as Record<string, unknown>);
  }

  function updateStat(statKey: string, field: 'value' | 'label', value: string) {
    onDataChange?.({
      ...sectionData,
      statOverrides: {
        ...(sectionData.statOverrides ?? {}),
        [statKey]: { ...(sectionData.statOverrides?.[statKey] ?? {}), [field]: value },
      },
    } as unknown as Record<string, unknown>);
  }

  function hideCapability(key: string) {
    onDataChange?.({
      ...sectionData,
      hiddenCapabilityKeys: [...(sectionData.hiddenCapabilityKeys ?? []), key],
    } as unknown as Record<string, unknown>);
  }
  function restoreCapability(key: string) {
    onDataChange?.({
      ...sectionData,
      hiddenCapabilityKeys: (sectionData.hiddenCapabilityKeys ?? []).filter((k) => k !== key),
    } as unknown as Record<string, unknown>);
  }
  function removeCustomCapability(key: string) {
    onDataChange?.({
      ...sectionData,
      addedCapabilities: addedCapabilities.filter((c) => c.key !== key),
    } as unknown as Record<string, unknown>);
  }
  function addCapability() {
    onDataChange?.({
      ...sectionData,
      addedCapabilities: [
        ...addedCapabilities,
        { key: `custom-${cryptoRandomId()}`, title: 'New capability', description: 'Describe this capability.' },
      ],
    } as unknown as Record<string, unknown>);
  }
  function updateCustomCapability(key: string, field: 'title' | 'description', value: string) {
    onDataChange?.({
      ...sectionData,
      addedCapabilities: addedCapabilities.map((c) => (c.key === key ? { ...c, [field]: value } : c)),
    } as unknown as Record<string, unknown>);
  }
  function moveCapability(key: string, direction: -1 | 1) {
    const visibleComputed = CAPABILITIES.filter((c) => !hiddenCapabilityKeys.has(c.title)).map((c) => c.title);
    const visibleCustom = addedCapabilities.map((c) => c.key);
    const defaultOrder = [...visibleComputed, ...visibleCustom];
    const persisted = sectionData.capabilityOrder ?? [];
    // Resolve current order: use persisted entries that are still visible; append anything new at the end.
    const persistedFiltered = persisted.filter((k) => defaultOrder.includes(k));
    const missing = defaultOrder.filter((k) => !persistedFiltered.includes(k));
    const current = [...persistedFiltered, ...missing];
    const idx = current.indexOf(key);
    if (idx === -1) return;
    const target = idx + direction;
    if (target < 0 || target >= current.length) return;
    const next = current.slice();
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    onDataChange?.({ ...sectionData, capabilityOrder: next } as unknown as Record<string, unknown>);
  }

  const { order, isFirst, isLast, moveUp, moveDown } = useBlockOrder<BlockId>({
    defaults: BLOCKS,
    persisted: sectionData.blockOrder,
    setOrder: (next) => update('blockOrder', next),
  });

  const renderBlock = (id: BlockId): React.ReactNode => {
    switch (id) {
      case 'header':
        return (
          <div className="flex flex-col md:flex-row gap-8 mb-10">
            <div className="flex-1">
              {canEdit ? (
                <>
                  <DirectEditableText as="h2" value={title} onChange={(v) => update('title', v)} className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: 'var(--theme-primary)' }} />
                  <DirectEditableText as="p" value={subtitle} onChange={(v) => update('subtitle', v)} className="mb-2" style={{ color: 'rgba(var(--theme-primary-rgb), 0.5)' }} />
                </>
              ) : (
                <>
                  <ResolvedSpan as="h2" className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: 'var(--theme-primary)' }}>{title}</ResolvedSpan>
                  <ResolvedSpan as="p" className="mb-2" style={{ color: 'rgba(var(--theme-primary-rgb), 0.5)' }}>{subtitle}</ResolvedSpan>
                </>
              )}
              <div className="w-16 h-0.5 mb-8" style={{ backgroundColor: 'var(--theme-primary)' }} />
              {canEdit ? (
                <DirectEditableText as="p" multiline value={intro} onChange={(v) => update('intro', v)} className="text-gray-700 text-lg leading-relaxed" />
              ) : (
                <ResolvedSpan as="p" className="text-gray-700 text-lg leading-relaxed">{intro}</ResolvedSpan>
              )}
            </div>
            <div className="w-full md:w-[30%] flex-shrink-0">
              <img src="/Harper-profile.png" alt="Harper" className="w-full h-auto rounded-xl object-cover" />
            </div>
          </div>
        );
      case 'stats':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12 ms-fade-up">
            {STAT_DEFAULTS.map((stat) => {
              const override = sectionData.statOverrides?.[stat.key];
              const value = override?.value ?? stat.value;
              const label = override?.label ?? stat.label;
              return (
                <div key={stat.key} className="text-center p-5 bg-white rounded-xl border border-[#e0e3eb]">
                  {canEdit ? (
                    <>
                      <DirectEditableText as="div" value={value} onChange={(v) => updateStat(stat.key, 'value', v)} className="text-3xl font-bold mb-1" style={{ color: 'var(--theme-primary)' }} />
                      <DirectEditableText as="div" multiline value={label} onChange={(v) => updateStat(stat.key, 'label', v)} className="text-xs" style={{ color: 'rgba(var(--theme-primary-rgb), 0.5)' }} />
                    </>
                  ) : (
                    <>
                      <ResolvedSpan as="div" className="text-3xl font-bold mb-1" style={{ color: 'var(--theme-primary)' }}>{value}</ResolvedSpan>
                      <ResolvedSpan as="div" className="text-xs" style={{ color: 'rgba(var(--theme-primary-rgb), 0.5)' }}>{label}</ResolvedSpan>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        );
      case 'capabilities':
        return (
          <div className="ms-fade-up">
            {canEdit ? (
              <DirectEditableText as="h3" value={capabilitiesTitle} onChange={(v) => update('capabilitiesTitle', v)} className="text-lg font-semibold mb-5" style={{ color: 'var(--theme-primary)' }} />
            ) : (
              <ResolvedSpan as="h3" className="text-lg font-semibold mb-5" style={{ color: 'var(--theme-primary)' }}>{capabilitiesTitle}</ResolvedSpan>
            )}
            {(() => {
              const visibleComputed = CAPABILITIES.filter((c) => !hiddenCapabilityKeys.has(c.title));
              const computedKeys = visibleComputed.map((c) => c.title);
              const customKeys = addedCapabilities.map((c) => c.key);
              const defaultOrder = [...computedKeys, ...customKeys];
              const persisted = sectionData.capabilityOrder ?? [];
              const persistedFiltered = persisted.filter((k) => defaultOrder.includes(k));
              const missing = defaultOrder.filter((k) => !persistedFiltered.includes(k));
              const order = [...persistedFiltered, ...missing];

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ms-stagger">
                  {order.map((key, idx) => {
                    const computed = CAPABILITIES.find((c) => c.title === key);
                    const custom = addedCapabilities.find((c) => c.key === key);
                    if (!computed && !custom) return null;
                    const isCustom = !!custom;
                    const capTitleDefault = computed?.title ?? custom!.title;
                    const capDescDefault = computed?.desc ?? custom!.description;
                    const override = sectionData.capabilityOverrides?.[capTitleDefault];
                    const capTitle = isCustom ? custom!.title : (override?.title ?? capTitleDefault);
                    const capDesc = isCustom ? custom!.description : (override?.description ?? capDescDefault);
                    return (
                      <div key={key} className="relative p-4 bg-white rounded-xl border border-[#e0e3eb] group/cap">
                        {canEdit && layoutMode && (
                          <div className="absolute top-2 left-2 flex items-center gap-1 opacity-0 group-hover/cap:opacity-100 transition-opacity">
                            <button onClick={() => moveCapability(key, -1)} disabled={idx === 0} title="Move left" className="w-6 h-6 rounded-md bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 flex items-center justify-center">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button onClick={() => moveCapability(key, 1)} disabled={idx === order.length - 1} title="Move right" className="w-6 h-6 rounded-md bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 flex items-center justify-center">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                            </button>
                          </div>
                        )}
                        {canEdit && layoutMode && (
                          <RemoveItemButton onClick={() => (isCustom ? removeCustomCapability(key) : hideCapability(capTitleDefault))} />
                        )}
                        {canEdit ? (
                          <>
                            <DirectEditableText
                              as="h4"
                              value={capTitle}
                              onChange={(v) => (isCustom ? updateCustomCapability(key, 'title', v) : updateCapability(capTitleDefault, 'title', v))}
                              className="font-semibold text-sm mb-1"
                              style={{ color: 'var(--theme-primary)' }}
                            />
                            <DirectEditableText
                              as="p"
                              multiline
                              value={capDesc}
                              onChange={(v) => (isCustom ? updateCustomCapability(key, 'description', v) : updateCapability(capTitleDefault, 'description', v))}
                              className="text-xs"
                              style={{ color: 'rgba(var(--theme-primary-rgb), 0.5)' }}
                            />
                          </>
                        ) : (
                          <>
                            <ResolvedSpan as="h4" className="font-semibold text-sm mb-1" style={{ color: 'var(--theme-primary)' }}>{capTitle}</ResolvedSpan>
                            <ResolvedSpan as="p" className="text-xs" style={{ color: 'rgba(var(--theme-primary-rgb), 0.5)' }}>{capDesc}</ResolvedSpan>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {canEdit && layoutMode && <AddItemCard label="Add capability" onClick={addCapability} />}
                </div>
              );
            })()}
            {canEdit && layoutMode && (
              <HiddenItemsBar
                items={CAPABILITIES.filter((c) => hiddenCapabilityKeys.has(c.title)).map((c) => ({ key: c.title, label: c.title }))}
                onRestore={restoreCapability}
              />
            )}
            <MicrositeQuote selectedQuotes={inputs.selectedQuotes} section="meet-harper" />
          </div>
        );
    }
  };

  return (
    <section id="harper" className="py-20 sm:py-28 bg-[#f3f4f6]" ref={sectionRef}>
      <div className="max-w-5xl mx-auto px-6 ms-fade-up">
        {order.map((id) => (
          <SubBlock key={id} blockId={id} isFirst={isFirst(id)} isLast={isLast(id)} canEdit={canEdit} onMoveUp={() => moveUp(id)} onMoveDown={() => moveDown(id)}>
            {renderBlock(id)}
          </SubBlock>
        ))}
      </div>
    </section>
  );
}
