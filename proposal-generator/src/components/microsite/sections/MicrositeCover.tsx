'use client';

import React from 'react';
import { ProposalInputs, resolveOtherValue } from '@/types/proposal';

interface Props {
  inputs: ProposalInputs;
}

export function MicrositeCover({ inputs }: Props) {
  const companyName = inputs.company.companyName || 'Your Company';
  const contactName = inputs.company.contactName;
  const contactTitle = resolveOtherValue(inputs.company.contactTitle, inputs.company.customContactTitle);

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
            'linear-gradient(to top, rgba(0,31,138,0.25) 0%, transparent 85%)',
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
              <span className="text-[#03143B]/20 text-2xl font-light">&times;</span>
              <img src={inputs.company.customerLogoBase64} alt={inputs.company.companyName} className="h-14 w-auto max-w-[120px] object-contain" />
            </>
          )}
        </div>

        <div className="text-sm font-semibold tracking-[0.2em] uppercase mb-5 text-[#03143B]/40">
          Strategic Proposal
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#03143B] leading-tight mb-6">
          {inputs.contentOverrides?.coverTitle || (
            <>
              Transforming HR at<br />
              <span>{companyName}</span>
            </>
          )}
        </h1>

        <div className="w-16 h-0.5 bg-[#03143B] mx-auto mb-8" />

        {inputs.coverQuote && (
          <p className="text-lg sm:text-xl text-[#03143B]/50 italic max-w-xl mx-auto mb-8 leading-relaxed">
            &ldquo;{inputs.contentOverrides?.coverQuote || inputs.coverQuote}&rdquo;
          </p>
        )}

        <div className="text-[#03143B]/40 text-base">
          Prepared for{' '}
          <span className="text-[#03143B] font-medium">{contactName}</span>
          {contactTitle && <>, {contactTitle}</>}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-5 h-5 text-[#03143B]/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}
