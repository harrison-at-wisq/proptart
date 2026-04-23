'use client';

import React from 'react';
import { ProposalInputs } from '@/types/proposal';
import type { VisionSectionData } from '@/types/microsite';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { ResolvedSpan } from '@/components/ui/ExportVariablesContext';
import { SubBlock } from '../studio/SubBlock';
import { useBlockOrder } from '../studio/useBlockOrder';

interface Props {
  inputs: ProposalInputs;
  data?: Record<string, unknown>;
  onDataChange?: (next: Record<string, unknown>) => void;
}

const DEFAULT_INTRO = 'If your HR team had 50% more capacity tomorrow, what would change? Most CHROs struggle to answer that question—not because they lack vision, but because operational work has consumed the function so completely there hasn’t been room to imagine what else is possible. The most interesting thing happening right now isn’t that AI can take work off HR’s plate. It’s that entirely new HR capabilities are emerging—ones that didn’t exist five years ago.';

const DEFAULT_CALLOUT = 'Organizations working with Wisq have seen routine caseloads drop dramatically within months, and processing timelines shrink from days to hours. When that happens, it doesn’t just free up time. It changes what the function is capable of doing.';

const DEFAULT_PILLARS = [
  {
    heading: 'AI knowledge management',
    body: 'Every AI agent is only as good as what it knows. When policy changes, the underlying knowledge system has to be updated fast—or you risk scaling the wrong answer overnight. This is becoming a foundational HR capability.',
  },
  {
    heading: 'Agentic workflow design',
    body: 'When AI handles a process end-to-end, someone has to design that workflow and continuously improve it. This is operational work at a different altitude: designing systems that scale, not processing tickets that don’t.',
  },
  {
    heading: 'Human-agent team leadership',
    body: 'When AI handles routine interactions, HR’s relationship to the work fundamentally changes. You go from doing the work to managing an AI colleague who does it—raising new questions about quality, trust, and team development.',
  },
];

const DEFAULT_CLOSING = 'Every HR function faces a choice: automate and cut, or automate and build. The organizations that choose transformation won’t just modernize HR—they’ll redefine it. Not HR with more free time. HR with a fundamentally different, and more interesting, job.';

const BLOCKS = ['intro', 'callout', 'pillars', 'closing'] as const;
type BlockId = typeof BLOCKS[number];

export function MicrositeVision({ inputs, data, onDataChange }: Props) {
  const sectionRef = useScrollAnimation<HTMLElement>();
  const companyName = inputs.company.companyName || 'Your Company';
  const generated = inputs.generatedContent?.visionContent;
  const sectionData = (data ?? {}) as VisionSectionData;
  const canEdit = !!onDataChange;

  const title = sectionData.title ?? `The future of HR at ${companyName}`;
  const intro = sectionData.intro ?? generated?.intro ?? DEFAULT_INTRO;
  const callout = sectionData.callout ?? generated?.calloutQuote ?? DEFAULT_CALLOUT;
  const computedPillars = generated?.pillars?.length === 3 ? generated.pillars : DEFAULT_PILLARS;
  const closing = sectionData.closing ?? generated?.closing ?? `${DEFAULT_CLOSING} That’s what we’re here to build with ${companyName}.`;

  function update<K extends keyof VisionSectionData>(key: K, value: VisionSectionData[K]) {
    onDataChange?.({ ...sectionData, [key]: value } as unknown as Record<string, unknown>);
  }

  function updatePillar(index: number, field: 'heading' | 'body', value: string) {
    const existing = sectionData.pillars ?? [{}, {}, {}];
    const next = existing.slice();
    next[index] = { ...(next[index] ?? {}), [field]: value };
    update('pillars', next);
  }

  const pillarValue = (index: number, field: 'heading' | 'body'): string => {
    return sectionData.pillars?.[index]?.[field] ?? computedPillars[index]?.[field] ?? '';
  };

  const { order, isFirst, isLast, moveUp, moveDown } = useBlockOrder<BlockId>({
    defaults: BLOCKS,
    persisted: sectionData.blockOrder,
    setOrder: (next) => update('blockOrder', next),
  });

  const renderBlock = (id: BlockId): React.ReactNode => {
    switch (id) {
      case 'intro':
        return (
          <div className="max-w-3xl mb-10">
            {canEdit ? (
              <DirectEditableText as="p" multiline value={intro} onChange={(v) => update('intro', v)} className="text-gray-700 text-lg leading-relaxed" />
            ) : (
              <ResolvedSpan as="p" className="text-gray-700 text-lg leading-relaxed">{intro}</ResolvedSpan>
            )}
          </div>
        );
      case 'callout':
        return (
          <div className="ms-fade-up mb-12">
            <div className="border-l-4 pl-5 py-1 max-w-3xl" style={{ borderColor: 'var(--theme-primary)' }}>
              {canEdit ? (
                <DirectEditableText as="p" multiline value={callout} onChange={(v) => update('callout', v)} className="text-xl font-semibold italic leading-relaxed" style={{ color: 'var(--theme-primary)' }} />
              ) : (
                <ResolvedSpan as="p" className="text-xl font-semibold italic leading-relaxed" style={{ color: 'var(--theme-primary)' }}>{callout}</ResolvedSpan>
              )}
            </div>
          </div>
        );
      case 'pillars':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 ms-stagger">
            {computedPillars.map((pillar, i) => {
              const heading = pillarValue(i, 'heading') || pillar.heading;
              const body = pillarValue(i, 'body') || pillar.body;
              return (
                <div key={i} className="bg-white rounded-xl p-6 border border-[#e0e3eb] hover:shadow-md transition-shadow">
                  {canEdit ? (
                    <>
                      <DirectEditableText as="h4" value={heading} onChange={(v) => updatePillar(i, 'heading', v)} className="text-lg font-bold mb-3" style={{ color: 'var(--theme-primary)' }} />
                      <DirectEditableText as="p" multiline value={body} onChange={(v) => updatePillar(i, 'body', v)} className="text-gray-600 text-sm leading-relaxed" />
                    </>
                  ) : (
                    <>
                      <ResolvedSpan as="h4" className="text-lg font-bold mb-3" style={{ color: 'var(--theme-primary)' }}>{heading}</ResolvedSpan>
                      <ResolvedSpan as="p" className="text-gray-600 text-sm leading-relaxed">{body}</ResolvedSpan>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        );
      case 'closing':
        return (
          <div className="max-w-3xl ms-fade-up">
            {canEdit ? (
              <DirectEditableText as="p" multiline value={closing} onChange={(v) => update('closing', v)} className="text-gray-700 text-lg font-medium leading-relaxed" style={{ color: 'var(--theme-primary)' }} />
            ) : (
              <ResolvedSpan as="p" className="text-gray-700 text-lg font-medium leading-relaxed" style={{ color: 'var(--theme-primary)' }}>{closing}</ResolvedSpan>
            )}
          </div>
        );
    }
  };

  return (
    <section id="vision" className="py-20 sm:py-28 bg-[#f3f4f6]" ref={sectionRef}>
      <div className="max-w-5xl mx-auto px-6 ms-fade-up">
        {canEdit ? (
          <DirectEditableText as="h2" value={title} onChange={(v) => update('title', v)} className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--theme-primary)' }} />
        ) : (
          <ResolvedSpan as="h2" className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--theme-primary)' }}>{title}</ResolvedSpan>
        )}
        <div className="w-16 h-0.5 mb-8" style={{ backgroundColor: 'var(--theme-primary)' }} />

        {order.map((id) => (
          <SubBlock key={id} blockId={id} isFirst={isFirst(id)} isLast={isLast(id)} canEdit={canEdit} onMoveUp={() => moveUp(id)} onMoveDown={() => moveDown(id)}>
            {renderBlock(id)}
          </SubBlock>
        ))}
      </div>
    </section>
  );
}
