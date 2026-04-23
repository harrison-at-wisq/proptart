'use client';

import React from 'react';
import { ProposalInputs } from '@/types/proposal';
import type { CoverSectionData } from '@/types/microsite';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { ResolvedSpan } from '@/components/ui/ExportVariablesContext';

interface Props {
  inputs: ProposalInputs;
  data?: Record<string, unknown>;
  onDataChange?: (next: Record<string, unknown>) => void;
}

export function MicrositeCover({ inputs, data, onDataChange }: Props) {
  const companyName = inputs.company.companyName || 'Your Company';

  const sectionData = (data ?? {}) as CoverSectionData;
  const eyebrow = sectionData.eyebrow ?? 'Strategic Proposal';
  const defaultTitle = `Transforming HR at ${companyName}`;
  const title = sectionData.title ?? inputs.contentOverrides?.coverTitle ?? defaultTitle;
  const quote = sectionData.coverQuote ?? inputs.contentOverrides?.coverQuote ?? inputs.coverQuote ?? '';
  const preparedFor = sectionData.preparedFor ?? 'Prepared for {{contactName}}, {{contactTitle}}';

  function update<K extends keyof CoverSectionData>(key: K, value: CoverSectionData[K]) {
    onDataChange?.({ ...sectionData, [key]: value } as unknown as Record<string, unknown>);
  }

  return (
    <section
      id="cover"
      className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden bg-white"
    >
      {/* Gradient wash — rises from the bottom */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(var(--theme-primary-rgb), 0.25) 0%, transparent 85%)',
        }}
      />

      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.55]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, #c8c5c0 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        {/* Logos */}
        <div className="flex justify-center items-center gap-4 mb-10">
          <img src="/wisq-logo.svg" alt="Wisq" className="h-14 w-14" />
          {inputs.company.customerLogoBase64 && (
            <>
              <span className="text-2xl font-light" style={{ color: 'rgba(var(--theme-primary-rgb), 0.2)' }}>&times;</span>
              <img src={inputs.company.customerLogoBase64} alt={inputs.company.companyName} className="h-14 w-auto max-w-[120px] object-contain" />
            </>
          )}
        </div>

        {onDataChange ? (
          <DirectEditableText
            as="div"
            value={eyebrow}
            onChange={(v) => update('eyebrow', v)}
            className="text-sm font-semibold tracking-[0.2em] uppercase mb-5"
            style={{ color: 'rgba(var(--theme-primary-rgb), 0.4)' }}
          />
        ) : (
          <ResolvedSpan as="div" className="text-sm font-semibold tracking-[0.2em] uppercase mb-5" style={{ color: 'rgba(var(--theme-primary-rgb), 0.4)' }}>
            {eyebrow}
          </ResolvedSpan>
        )}

        {onDataChange ? (
          <DirectEditableText
            as="h1"
            multiline
            value={title}
            onChange={(v) => update('title', v)}
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6"
            style={{ color: 'var(--theme-primary)' }}
          />
        ) : (
          <ResolvedSpan as="h1" className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6" style={{ color: 'var(--theme-primary)' }}>
            {title}
          </ResolvedSpan>
        )}

        <div className="w-16 h-0.5 mx-auto mb-8" style={{ backgroundColor: 'var(--theme-primary)' }} />

        {(quote || onDataChange) && (
          onDataChange ? (
            <DirectEditableText
              as="p"
              multiline
              value={quote}
              onChange={(v) => update('coverQuote', v)}
              placeholder="Optional quote (use {{tokens}} if helpful)"
              className="text-lg sm:text-xl italic max-w-xl mx-auto mb-8 leading-relaxed"
              style={{ color: 'rgba(var(--theme-primary-rgb), 0.5)' }}
            />
          ) : quote ? (
            <p className="text-lg sm:text-xl italic max-w-xl mx-auto mb-8 leading-relaxed" style={{ color: 'rgba(var(--theme-primary-rgb), 0.5)' }}>
              <ResolvedSpan as="span">{`“${quote}”`}</ResolvedSpan>
            </p>
          ) : null
        )}

        {onDataChange ? (
          <DirectEditableText
            as="div"
            value={preparedFor}
            onChange={(v) => update('preparedFor', v)}
            className="text-base"
            style={{ color: 'rgba(var(--theme-primary-rgb), 0.4)' }}
          />
        ) : (
          <ResolvedSpan as="div" className="text-base" style={{ color: 'rgba(var(--theme-primary-rgb), 0.4)' }}>
            {preparedFor}
          </ResolvedSpan>
        )}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-5 h-5" style={{ color: 'rgba(var(--theme-primary-rgb), 0.25)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}
