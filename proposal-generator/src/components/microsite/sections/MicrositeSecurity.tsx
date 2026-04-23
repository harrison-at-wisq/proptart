'use client';

import React from 'react';
import { ProposalInputs, resolveOtherValue } from '@/types/proposal';
import type { SecuritySectionData } from '@/types/microsite';
import { SECURITY_FEATURES, IMPLEMENTATION_TIMELINE } from '@/lib/content-templates';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { MicrositeQuote } from '../MicrositeQuote';
import { useLayoutMode } from '@/components/ui/LayoutModeContext';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { ResolvedSpan } from '@/components/ui/ExportVariablesContext';
import { cryptoRandomId } from '@/lib/microsite-sections';
import { AddItemCard, HiddenItemsBar, RemoveItemButton } from '../studio/LayoutChrome';
import { SubBlock } from '../studio/SubBlock';
import { useBlockOrder } from '../studio/useBlockOrder';

const SECURITY_BLOCKS = ['features', 'integrations', 'timeline'] as const;
type SecurityBlockId = typeof SECURITY_BLOCKS[number];

interface Props {
  inputs: ProposalInputs;
  data?: Record<string, unknown>;
  onDataChange?: (next: Record<string, unknown>) => void;
}

export function MicrositeSecurity({ inputs, data, onDataChange }: Props) {
  const { layoutMode } = useLayoutMode();
  const sectionData = (data ?? {}) as SecuritySectionData;
  const hiddenFeatures = new Set(sectionData.hiddenFeatureTitles ?? []);
  const addedFeatures = sectionData.addedFeatures ?? [];
  const canEdit = layoutMode && !!onDataChange;

  function updateData(next: SecuritySectionData) {
    onDataChange?.(next as unknown as Record<string, unknown>);
  }

  function handleRemoveComputed(title: string) {
    updateData({
      ...sectionData,
      hiddenFeatureTitles: [...(sectionData.hiddenFeatureTitles ?? []), title],
    });
  }
  function handleRemoveCustom(key: string) {
    updateData({
      ...sectionData,
      addedFeatures: addedFeatures.filter((f) => f.key !== key),
    });
  }
  function handleAdd() {
    updateData({
      ...sectionData,
      addedFeatures: [
        ...addedFeatures,
        {
          key: `custom-${cryptoRandomId()}`,
          title: 'New feature',
          description: 'Describe what this security capability delivers.',
        },
      ],
    });
  }
  function handleRestore(title: string) {
    updateData({
      ...sectionData,
      hiddenFeatureTitles: (sectionData.hiddenFeatureTitles ?? []).filter((t) => t !== title),
    });
  }

  function updateFeatureText(key: string, field: 'title' | 'description', value: string) {
    updateData({
      ...sectionData,
      featureOverrides: {
        ...(sectionData.featureOverrides ?? {}),
        [key]: { ...(sectionData.featureOverrides?.[key] ?? {}), [field]: value },
      },
    });
  }

  function updateCustomFeatureText(key: string, field: 'title' | 'description', value: string) {
    updateData({
      ...sectionData,
      addedFeatures: addedFeatures.map((f) => (f.key === key ? { ...f, [field]: value } : f)),
    });
  }

  function updateTitle(value: string) {
    updateData({ ...sectionData, title: value });
  }
  function updateSubhead(key: 'enterpriseSecurityTitle' | 'integrationLandscapeTitle' | 'implementationTimelineTitle' | 'integrationEmptyText', v: string) {
    updateData({ ...sectionData, [key]: v });
  }
  function updatePhase(week: string, field: 'week' | 'title' | 'description', v: string) {
    updateData({
      ...sectionData,
      phaseOverrides: {
        ...(sectionData.phaseOverrides ?? {}),
        [week]: { ...(sectionData.phaseOverrides?.[week] ?? {}), [field]: v },
      },
    });
  }

  const secBlocks = useBlockOrder<SecurityBlockId>({
    defaults: SECURITY_BLOCKS,
    persisted: sectionData.blockOrder,
    setOrder: (next) => updateData({ ...sectionData, blockOrder: next }),
  });

  const sectionRef = useScrollAnimation<HTMLElement>();
  const secRef = useScrollAnimation<HTMLDivElement>(0.1);
  const intRef = useScrollAnimation<HTMLDivElement>(0.1);
  const timeRef = useScrollAnimation<HTMLDivElement>(0.1);

  const customerIntegrations = [
    inputs.integrations.hcm && { name: resolveOtherValue(inputs.integrations.hcm, inputs.integrations.customHcm), category: 'HCM' },
    inputs.integrations.identity && { name: resolveOtherValue(inputs.integrations.identity, inputs.integrations.customIdentity), category: 'Identity' },
    inputs.integrations.documents && { name: resolveOtherValue(inputs.integrations.documents, inputs.integrations.customDocuments), category: 'Documents' },
    ...(Array.isArray(inputs.integrations.communication)
      ? inputs.integrations.communication.filter(Boolean).map(v => ({ name: resolveOtherValue(v, inputs.integrations.customCommunication), category: 'Communication' }))
      : inputs.integrations.communication ? [{ name: resolveOtherValue(inputs.integrations.communication, inputs.integrations.customCommunication), category: 'Communication' }] : []),
    inputs.integrations.ticketing && inputs.integrations.ticketing !== 'None / Not applicable' && { name: resolveOtherValue(inputs.integrations.ticketing, inputs.integrations.customTicketing), category: 'Ticketing' },
  ].filter(Boolean) as { name: string; category: string }[];

  return (
    <section id="security" className="py-20 sm:py-28 bg-[#f3f4f6]" ref={sectionRef}>
      <div className="max-w-5xl mx-auto px-6 ms-fade-up">
        {onDataChange ? (
          <DirectEditableText
            as="h2"
            value={sectionData.title ?? 'Security & Integration'}
            onChange={updateTitle}
            className="text-3xl sm:text-4xl font-bold mb-2"
            style={{ color: 'var(--theme-primary)' }}
          />
        ) : (
          <ResolvedSpan as="h2" className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--theme-primary)' }}>
            {sectionData.title ?? 'Security & Integration'}
          </ResolvedSpan>
        )}
        <div className="w-16 h-0.5 mb-10" style={{ backgroundColor: 'var(--theme-primary)' }} />

        {secBlocks.order.map((blockId) => {
          const blockProps = {
            blockId,
            isFirst: secBlocks.isFirst(blockId),
            isLast: secBlocks.isLast(blockId),
            canEdit,
            onMoveUp: () => secBlocks.moveUp(blockId),
            onMoveDown: () => secBlocks.moveDown(blockId),
          };
          if (blockId === 'features') return (
            <SubBlock key={blockId} {...blockProps}>
              <>
        {/* Security features */}
        <div ref={secRef} className="mb-12 ms-fade-up">
          {onDataChange ? (
            <DirectEditableText as="h3" value={sectionData.enterpriseSecurityTitle ?? 'Enterprise Security'} onChange={(v) => updateSubhead('enterpriseSecurityTitle', v)} className="text-lg font-semibold mb-5" style={{ color: 'var(--theme-primary)' }} />
          ) : (
            <ResolvedSpan as="h3" className="text-lg font-semibold mb-5" style={{ color: 'var(--theme-primary)' }}>{sectionData.enterpriseSecurityTitle ?? 'Enterprise Security'}</ResolvedSpan>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ms-stagger">
            {SECURITY_FEATURES.filter((f) => !hiddenFeatures.has(f.title)).map((feature) => {
              const title = sectionData.featureOverrides?.[feature.title]?.title ?? feature.title;
              const description = sectionData.featureOverrides?.[feature.title]?.description ?? feature.description;
              return (
                <div
                  key={feature.title}
                  className="relative p-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                >
                  {canEdit && <RemoveItemButton onClick={() => handleRemoveComputed(feature.title)} />}
                  {onDataChange ? (
                    <>
                      <DirectEditableText
                        as="h4"
                        value={title}
                        onChange={(v) => updateFeatureText(feature.title, 'title', v)}
                        className="font-semibold mb-1 text-sm"
                        style={{ color: 'var(--theme-primary)' }}
                      />
                      <DirectEditableText
                        as="p"
                        multiline
                        value={description}
                        onChange={(v) => updateFeatureText(feature.title, 'description', v)}
                        className="text-gray-600 text-xs"
                      />
                    </>
                  ) : (
                    <>
                      <ResolvedSpan as="h4" className="font-semibold mb-1 text-sm" style={{ color: 'var(--theme-primary)' }}>{title}</ResolvedSpan>
                      <ResolvedSpan as="p" className="text-gray-600 text-xs">{description}</ResolvedSpan>
                    </>
                  )}
                </div>
              );
            })}
            {addedFeatures.map((feature) => (
              <div
                key={feature.key}
                className="relative p-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
              >
                {canEdit && <RemoveItemButton onClick={() => handleRemoveCustom(feature.key)} />}
                {onDataChange ? (
                  <>
                    <DirectEditableText
                      as="h4"
                      value={feature.title}
                      onChange={(v) => updateCustomFeatureText(feature.key, 'title', v)}
                      className="font-semibold mb-1 text-sm"
                      style={{ color: 'var(--theme-primary)' }}
                    />
                    <DirectEditableText
                      as="p"
                      multiline
                      value={feature.description}
                      onChange={(v) => updateCustomFeatureText(feature.key, 'description', v)}
                      className="text-gray-600 text-xs"
                    />
                  </>
                ) : (
                  <>
                    <ResolvedSpan as="h4" className="font-semibold mb-1 text-sm" style={{ color: 'var(--theme-primary)' }}>{feature.title}</ResolvedSpan>
                    <ResolvedSpan as="p" className="text-gray-600 text-xs">{feature.description}</ResolvedSpan>
                  </>
                )}
              </div>
            ))}
            {canEdit && <AddItemCard label="Add feature" onClick={handleAdd} />}
          </div>
          {canEdit && (
            <HiddenItemsBar
              items={SECURITY_FEATURES.filter((f) => hiddenFeatures.has(f.title)).map((f) => ({ key: f.title, label: f.title }))}
              onRestore={handleRestore}
            />
          )}
        </div>
              </>
            </SubBlock>
          );
          if (blockId === 'integrations') return (
            <SubBlock key={blockId} {...blockProps}>
              <>
        <div ref={intRef} className="mb-12 ms-fade-up">
          {onDataChange ? (
            <DirectEditableText as="h3" value={sectionData.integrationLandscapeTitle ?? 'Your Integration Landscape'} onChange={(v) => updateSubhead('integrationLandscapeTitle', v)} className="text-lg font-semibold mb-5" style={{ color: 'var(--theme-primary)' }} />
          ) : (
            <ResolvedSpan as="h3" className="text-lg font-semibold mb-5" style={{ color: 'var(--theme-primary)' }}>{sectionData.integrationLandscapeTitle ?? 'Your Integration Landscape'}</ResolvedSpan>
          )}
          {customerIntegrations.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {customerIntegrations.map((integration) => (
                <div
                  key={integration.name}
                  className="px-4 py-2 text-white rounded-full text-sm"
                  style={{ backgroundColor: 'var(--theme-primary)' }}
                >
                  <span className="opacity-60 mr-2">{integration.category}</span>
                  <span className="font-medium">{integration.name}</span>
                </div>
              ))}
            </div>
          ) : onDataChange ? (
            <DirectEditableText as="p" value={sectionData.integrationEmptyText ?? 'Integration requirements to be discussed'} onChange={(v) => updateSubhead('integrationEmptyText', v)} className="text-gray-500 text-sm italic" />
          ) : (
            <ResolvedSpan as="p" className="text-gray-500 text-sm italic">{sectionData.integrationEmptyText ?? 'Integration requirements to be discussed'}</ResolvedSpan>
          )}
        </div>

        <MicrositeQuote selectedQuotes={inputs.selectedQuotes} section="security" />
              </>
            </SubBlock>
          );
          if (blockId === 'timeline') return (
            <SubBlock key={blockId} {...blockProps}>
              <>
        <div ref={timeRef} className="ms-fade-up">
          {onDataChange ? (
            <DirectEditableText as="h3" value={sectionData.implementationTimelineTitle ?? 'Implementation Timeline (12 weeks)'} onChange={(v) => updateSubhead('implementationTimelineTitle', v)} className="text-lg font-semibold mb-5" style={{ color: 'var(--theme-primary)' }} />
          ) : (
            <ResolvedSpan as="h3" className="text-lg font-semibold mb-5" style={{ color: 'var(--theme-primary)' }}>{sectionData.implementationTimelineTitle ?? 'Implementation Timeline (12 weeks)'}</ResolvedSpan>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ms-stagger">
            {IMPLEMENTATION_TIMELINE.map((phase) => {
              const override = sectionData.phaseOverrides?.[phase.week];
              const week = override?.week ?? phase.week;
              const phaseTitle = override?.title ?? phase.title;
              const phaseDesc = override?.description ?? phase.description;
              return (
                <div
                  key={phase.week}
                  className="p-5 bg-white rounded-lg border-t-4"
                  style={{ borderColor: 'var(--theme-primary)' }}
                >
                  {onDataChange ? (
                    <>
                      <DirectEditableText as="div" value={week} onChange={(v) => updatePhase(phase.week, 'week', v)} className="text-xs font-semibold mb-1" style={{ color: 'var(--theme-primary)' }} />
                      <DirectEditableText as="h4" value={phaseTitle} onChange={(v) => updatePhase(phase.week, 'title', v)} className="font-bold text-sm mb-1" style={{ color: 'var(--theme-primary)' }} />
                      <DirectEditableText as="p" multiline value={phaseDesc} onChange={(v) => updatePhase(phase.week, 'description', v)} className="text-gray-600 text-xs" />
                    </>
                  ) : (
                    <>
                      <ResolvedSpan as="div" className="text-xs font-semibold mb-1" style={{ color: 'var(--theme-primary)' }}>{week}</ResolvedSpan>
                      <ResolvedSpan as="h4" className="font-bold text-sm mb-1" style={{ color: 'var(--theme-primary)' }}>{phaseTitle}</ResolvedSpan>
                      <ResolvedSpan as="p" className="text-gray-600 text-xs">{phaseDesc}</ResolvedSpan>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
              </>
            </SubBlock>
          );
          return null;
        })}
      </div>
    </section>
  );
}
