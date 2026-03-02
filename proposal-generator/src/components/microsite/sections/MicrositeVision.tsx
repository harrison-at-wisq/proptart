'use client';

import React from 'react';
import { ProposalInputs } from '@/types/proposal';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

interface Props {
  inputs: ProposalInputs;
}

// Template fallback content (used when AI content hasn't been generated)
const DEFAULT_INTRO = 'If your HR team had 50% more capacity tomorrow, what would change? Most CHROs struggle to answer that question\u2014not because they lack vision, but because operational work has consumed the function so completely there hasn\u2019t been room to imagine what else is possible. The most interesting thing happening right now isn\u2019t that AI can take work off HR\u2019s plate. It\u2019s that entirely new HR capabilities are emerging\u2014ones that didn\u2019t exist five years ago.';

const DEFAULT_CALLOUT = 'Organizations working with Wisq have seen routine caseloads drop dramatically within months, and processing timelines shrink from days to hours. When that happens, it doesn\u2019t just free up time. It changes what the function is capable of doing.';

const DEFAULT_PILLARS = [
  {
    heading: 'AI knowledge management',
    body: 'Every AI agent is only as good as what it knows. When policy changes, the underlying knowledge system has to be updated fast\u2014or you risk scaling the wrong answer overnight. This is becoming a foundational HR capability.',
  },
  {
    heading: 'Agentic workflow design',
    body: 'When AI handles a process end-to-end, someone has to design that workflow and continuously improve it. This is operational work at a different altitude: designing systems that scale, not processing tickets that don\u2019t.',
  },
  {
    heading: 'Human-agent team leadership',
    body: 'When AI handles routine interactions, HR\u2019s relationship to the work fundamentally changes. You go from doing the work to managing an AI colleague who does it\u2014raising new questions about quality, trust, and team development.',
  },
];

const DEFAULT_CLOSING = 'Every HR function faces a choice: automate and cut, or automate and build. The organizations that choose transformation won\u2019t just modernize HR\u2014they\u2019ll redefine it. Not HR with more free time. HR with a fundamentally different, and more interesting, job.';

export function MicrositeVision({ inputs }: Props) {
  const sectionRef = useScrollAnimation<HTMLElement>();
  const quoteRef = useScrollAnimation<HTMLDivElement>(0.2);
  const cardsRef = useScrollAnimation<HTMLDivElement>(0.1);
  const closingRef = useScrollAnimation<HTMLDivElement>(0.2);

  const companyName = inputs.company.companyName || 'Your Company';
  const generated = inputs.generatedContent?.visionContent;

  const intro = generated?.intro || DEFAULT_INTRO;
  const callout = generated?.calloutQuote || DEFAULT_CALLOUT;
  const pillars = generated?.pillars?.length === 3 ? generated.pillars : DEFAULT_PILLARS;
  const closing = generated?.closing || `${DEFAULT_CLOSING} That\u2019s what we\u2019re here to build with ${companyName}.`;

  return (
    <section id="vision" className="py-20 sm:py-28 bg-[#f3f4f6]" ref={sectionRef}>
      <div className="max-w-5xl mx-auto px-6 ms-fade-up">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#03143B] mb-2">
          The future of HR at {companyName}
        </h2>
        <div className="w-16 h-0.5 bg-[#03143B] mb-8" />

        <div className="max-w-3xl mb-10">
          <p className="text-gray-700 text-lg leading-relaxed">{intro}</p>
        </div>

        <div ref={quoteRef} className="ms-fade-up mb-12">
          <div className="border-l-4 border-[#03143B] pl-5 py-1 max-w-3xl">
            <p className="text-xl font-semibold text-[#03143B] italic leading-relaxed">
              {callout}
            </p>
          </div>
        </div>

        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 ms-stagger">
          {pillars.map((pillar) => (
            <div
              key={pillar.heading}
              className="bg-white rounded-xl p-6 border border-[#e0e3eb] hover:shadow-md transition-shadow"
            >
              <h4 className="text-lg font-bold text-[#03143B] mb-3">{pillar.heading}</h4>
              <p className="text-gray-600 text-sm leading-relaxed">{pillar.body}</p>
            </div>
          ))}
        </div>

        <div ref={closingRef} className="max-w-3xl ms-fade-up">
          <p className="text-gray-700 text-lg font-medium leading-relaxed text-[#03143B]">
            {closing}
          </p>
        </div>
      </div>
    </section>
  );
}
