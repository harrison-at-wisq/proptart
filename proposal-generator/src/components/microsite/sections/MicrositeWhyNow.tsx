'use client';

import React from 'react';
import { ProposalInputs } from '@/types/proposal';
import type { WhyNowSectionData } from '@/types/microsite';
import { WHY_NOW_CONTENT, NEXT_STEPS_OPTIONS } from '@/lib/content-templates';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { MicrositeQuote } from '../MicrositeQuote';
import { useLayoutMode } from '@/components/ui/LayoutModeContext';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { ResolvedSpan } from '@/components/ui/ExportVariablesContext';
import { cryptoRandomId } from '@/lib/microsite-sections';
import { AddItemCard, HiddenItemsBar, RemoveItemButton } from '../studio/LayoutChrome';
import { SubBlock } from '../studio/SubBlock';
import { useBlockOrder } from '../studio/useBlockOrder';

const WHYNOW_BLOCKS = ['reasons', 'nextSteps'] as const;
type WhyNowBlockId = typeof WHYNOW_BLOCKS[number];

interface Props {
  inputs: ProposalInputs;
  data?: Record<string, unknown>;
  onDataChange?: (next: Record<string, unknown>) => void;
}

export function MicrositeWhyNow({ inputs, data, onDataChange }: Props) {
  const { layoutMode } = useLayoutMode();
  const sectionData = (data ?? {}) as WhyNowSectionData;
  const hiddenReasons = new Set(sectionData.hiddenReasonKeys ?? []);
  const addedReasons = sectionData.addedReasons ?? [];
  const canEdit = layoutMode && !!onDataChange;

  function updateData(next: WhyNowSectionData) {
    onDataChange?.(next as unknown as Record<string, unknown>);
  }
  function hideReason(key: string) {
    updateData({ ...sectionData, hiddenReasonKeys: [...(sectionData.hiddenReasonKeys ?? []), key] });
  }
  function removeAdded(key: string) {
    updateData({ ...sectionData, addedReasons: addedReasons.filter((r) => r.key !== key) });
  }
  function restoreReason(key: string) {
    updateData({
      ...sectionData,
      hiddenReasonKeys: (sectionData.hiddenReasonKeys ?? []).filter((k) => k !== key),
    });
  }
  function updateReasonText(key: string, field: 'headline' | 'description', value: string) {
    updateData({
      ...sectionData,
      reasonOverrides: {
        ...(sectionData.reasonOverrides ?? {}),
        [key]: { ...(sectionData.reasonOverrides?.[key] ?? {}), [field]: value },
      },
    });
  }

  function updateAddedReasonText(key: string, field: 'headline' | 'description', value: string) {
    updateData({
      ...sectionData,
      addedReasons: addedReasons.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    });
  }

  function updateTitle(value: string) {
    updateData({ ...sectionData, title: value });
  }

  function updateNextStepsTitle(value: string) {
    updateData({ ...sectionData, nextStepsTitle: value });
  }

  function updateNextStep(id: string, field: 'title' | 'description', value: string) {
    updateData({
      ...sectionData,
      nextStepOverrides: {
        ...(sectionData.nextStepOverrides ?? {}),
        [id]: { ...(sectionData.nextStepOverrides?.[id] ?? {}), [field]: value },
      },
    });
  }

  function updateQuestionsPrompt(v: string) {
    updateData({ ...sectionData, questionsPrompt: v });
  }

  const whyNowBlocks = useBlockOrder<WhyNowBlockId>({
    defaults: WHYNOW_BLOCKS,
    persisted: sectionData.blockOrder,
    setOrder: (next) => updateData({ ...sectionData, blockOrder: next }),
  });

  function addReason() {
    updateData({
      ...sectionData,
      addedReasons: [
        ...addedReasons,
        {
          key: `custom-${cryptoRandomId()}`,
          headline: 'New reason',
          description: 'Describe why now is the moment.',
        },
      ],
    });
  }

  const sectionRef = useScrollAnimation<HTMLElement>();
  const stepsRef = useScrollAnimation<HTMLDivElement>(0.1);

  const whyNowKeys = ['costOfDelay', 'aiMomentum', 'quickWins', 'competitivePressure'] as const;
  const generatedMap = inputs.generatedContent?.whyNowContent?.reduce((acc, item) => {
    acc[item.key] = item;
    return acc;
  }, {} as Record<string, { headline: string; description: string }>) || {};

  // Build next steps
  const order = inputs.nextStepOrder?.length ? inputs.nextStepOrder : inputs.nextSteps;
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

  return (
    <section id="why-now" className="py-20 sm:py-28 bg-white" ref={sectionRef}>
      <div className="max-w-5xl mx-auto px-6 ms-fade-up">
        {onDataChange ? (
          <DirectEditableText
            as="h2"
            value={sectionData.title ?? 'Why Now?'}
            onChange={updateTitle}
            className="text-3xl sm:text-4xl font-bold mb-2"
            style={{ color: 'var(--theme-primary)' }}
          />
        ) : (
          <ResolvedSpan as="h2" className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--theme-primary)' }}>
            {sectionData.title ?? 'Why Now?'}
          </ResolvedSpan>
        )}
        <div className="w-16 h-0.5 mb-10" style={{ backgroundColor: 'var(--theme-primary)' }} />

        {whyNowBlocks.order.map((blockId) => {
          const blockProps = {
            blockId,
            isFirst: whyNowBlocks.isFirst(blockId),
            isLast: whyNowBlocks.isLast(blockId),
            canEdit: !!onDataChange,
            onMoveUp: () => whyNowBlocks.moveUp(blockId),
            onMoveDown: () => whyNowBlocks.moveDown(blockId),
          };
          if (blockId === 'reasons') return (
            <SubBlock key={blockId} {...blockProps}>
              <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {whyNowKeys.filter((k) => !hiddenReasons.has(k)).map((itemKey) => {
            const generated = generatedMap[itemKey];
            const template = WHY_NOW_CONTENT[itemKey];
            const proposalOverrides = inputs.contentOverrides?.whyNowItems?.[itemKey];
            const sectionOverrides = sectionData.reasonOverrides?.[itemKey];
            const headline = sectionOverrides?.headline ?? proposalOverrides?.headline ?? generated?.headline ?? template.headline;
            const description = sectionOverrides?.description ?? proposalOverrides?.description ?? generated?.description ?? template.description;

            return (
              <div key={itemKey} className="relative p-5 bg-gray-50 rounded-xl border-l-4" style={{ borderColor: 'var(--theme-primary)' }}>
                {canEdit && <RemoveItemButton onClick={() => hideReason(itemKey)} />}
                {onDataChange ? (
                  <>
                    <DirectEditableText
                      as="h3"
                      value={headline}
                      onChange={(v) => updateReasonText(itemKey, 'headline', v)}
                      className="font-semibold mb-1"
                      style={{ color: 'var(--theme-primary)' }}
                    />
                    <DirectEditableText
                      as="p"
                      multiline
                      value={description}
                      onChange={(v) => updateReasonText(itemKey, 'description', v)}
                      className="text-gray-600 text-sm leading-relaxed"
                    />
                  </>
                ) : (
                  <>
                    <ResolvedSpan as="h3" className="font-semibold mb-1" style={{ color: 'var(--theme-primary)' }}>{headline}</ResolvedSpan>
                    <ResolvedSpan as="p" className="text-gray-600 text-sm leading-relaxed">{description}</ResolvedSpan>
                  </>
                )}
              </div>
            );
          })}
          {addedReasons.map((reason) => (
            <div key={reason.key} className="relative p-5 bg-gray-50 rounded-xl border-l-4" style={{ borderColor: 'var(--theme-primary)' }}>
              {canEdit && <RemoveItemButton onClick={() => removeAdded(reason.key)} />}
              {onDataChange ? (
                <>
                  <DirectEditableText
                    as="h3"
                    value={reason.headline}
                    onChange={(v) => updateAddedReasonText(reason.key, 'headline', v)}
                    className="font-semibold mb-1"
                    style={{ color: 'var(--theme-primary)' }}
                  />
                  <DirectEditableText
                    as="p"
                    multiline
                    value={reason.description}
                    onChange={(v) => updateAddedReasonText(reason.key, 'description', v)}
                    className="text-gray-600 text-sm leading-relaxed"
                  />
                </>
              ) : (
                <>
                  <ResolvedSpan as="h3" className="font-semibold mb-1" style={{ color: 'var(--theme-primary)' }}>{reason.headline}</ResolvedSpan>
                  <ResolvedSpan as="p" className="text-gray-600 text-sm leading-relaxed">{reason.description}</ResolvedSpan>
                </>
              )}
            </div>
          ))}
          {canEdit && <AddItemCard label="Add reason" onClick={addReason} />}
        </div>
        {canEdit && (
          <HiddenItemsBar
            items={whyNowKeys.filter((k) => hiddenReasons.has(k)).map((k) => ({ key: k, label: WHY_NOW_CONTENT[k].headline }))}
            onRestore={restoreReason}
          />
        )}
        <div className="mb-14" />

        <MicrositeQuote selectedQuotes={inputs.selectedQuotes} section="why-now" />
              </>
            </SubBlock>
          );
          if (blockId === 'nextSteps') return (
            <SubBlock key={blockId} {...blockProps}>
              <>
        {orderedSteps.length > 0 && (
          <div ref={stepsRef} className="ms-fade-up">
            {onDataChange ? (
              <DirectEditableText
                as="h2"
                value={sectionData.nextStepsTitle ?? 'Next Steps'}
                onChange={updateNextStepsTitle}
                className="text-2xl font-bold mb-6"
                style={{ color: 'var(--theme-primary)' }}
              />
            ) : (
              <ResolvedSpan as="h2" className="text-2xl font-bold mb-6" style={{ color: 'var(--theme-primary)' }}>
                {sectionData.nextStepsTitle ?? 'Next Steps'}
              </ResolvedSpan>
            )}
            <div className="space-y-4 mb-8 ms-stagger">
              {orderedSteps.map((step, index) => {
                const proposalOverrides = inputs.contentOverrides?.nextStepOverrides?.[step.id];
                const sectionOverrides = sectionData.nextStepOverrides?.[step.id];
                const title = sectionOverrides?.title ?? proposalOverrides?.title ?? step.title;
                const description = sectionOverrides?.description ?? proposalOverrides?.description ?? step.description;
                return (
                  <div key={step.id} className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm" style={{ backgroundColor: 'var(--theme-primary)' }}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      {onDataChange ? (
                        <>
                          <DirectEditableText
                            as="h3"
                            value={title}
                            onChange={(v) => updateNextStep(step.id, 'title', v)}
                            className="font-semibold text-gray-900"
                          />
                          <DirectEditableText
                            as="p"
                            multiline
                            value={description}
                            onChange={(v) => updateNextStep(step.id, 'description', v)}
                            className="text-gray-600 text-sm"
                          />
                        </>
                      ) : (
                        <>
                          <ResolvedSpan as="h3" className="font-semibold text-gray-900">{title}</ResolvedSpan>
                          <ResolvedSpan as="p" className="text-gray-600 text-sm">{description}</ResolvedSpan>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Contact */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              {onDataChange ? (
                <DirectEditableText
                  as="p"
                  value={sectionData.questionsPrompt ?? "Questions? Let’s talk."}
                  onChange={updateQuestionsPrompt}
                  className="text-gray-600 mb-1"
                />
              ) : (
                <ResolvedSpan as="p" className="text-gray-600 mb-1">
                  {sectionData.questionsPrompt ?? "Questions? Let’s talk."}
                </ResolvedSpan>
              )}
              {(() => {
                const rawEmail = inputs.company.contactEmail ?? '';
                const [defaultName, defaultEmail] = rawEmail.includes('|')
                  ? rawEmail.split('|').map((s) => s.trim())
                  : [inputs.company.contactName ?? '', rawEmail];
                const contactNameValue = sectionData.contactName ?? defaultName ?? '{{contactName}}';
                const contactEmailValue = sectionData.contactEmail ?? defaultEmail ?? '{{contactEmail}}';
                return (
                  <>
                    {onDataChange ? (
                      <DirectEditableText
                        as="p"
                        value={contactNameValue}
                        onChange={(v) => updateData({ ...sectionData, contactName: v })}
                        className="text-xl font-semibold"
                        style={{ color: 'var(--theme-primary)' }}
                      />
                    ) : (
                      <ResolvedSpan as="p" className="text-xl font-semibold" style={{ color: 'var(--theme-primary)' }}>
                        {contactNameValue}
                      </ResolvedSpan>
                    )}
                    {onDataChange ? (
                      <DirectEditableText
                        as="p"
                        value={contactEmailValue}
                        onChange={(v) => updateData({ ...sectionData, contactEmail: v })}
                        className="text-lg"
                        style={{ color: 'var(--theme-primary)' }}
                      />
                    ) : (
                      <ResolvedSpan as="p" className="text-lg" style={{ color: 'var(--theme-primary)' }}>
                        {contactEmailValue}
                      </ResolvedSpan>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
              </>
            </SubBlock>
          );
          return null;
        })}
      </div>
    </section>
  );
}
