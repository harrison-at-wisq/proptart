'use client';

import React from 'react';
import { ProposalInputs } from '@/types/proposal';
import { HARPER_STATS } from '@/lib/content-templates';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { MicrositeQuote } from '../MicrositeQuote';

interface Props {
  inputs: ProposalInputs;
}

const CAPABILITIES = [
  { title: 'Instant Answers', desc: 'Responds in under 8 seconds in 98 languages' },
  { title: 'Full Audit Trail', desc: 'Every response documented with policy citations' },
  { title: 'Enterprise Secure', desc: 'SOC 2 Type II, encryption at rest and in transit' },
  { title: 'Deep Integrations', desc: 'Connects to your existing HCM, identity, and comms tools' },
  { title: 'Learns & Improves', desc: 'Gets smarter with your policies and interactions' },
  { title: '24/7 Availability', desc: 'Always on, always accurate, always compliant' },
];

export function MicrositeHarper({ inputs }: Props) {
  const sectionRef = useScrollAnimation<HTMLElement>();
  const statsRef = useScrollAnimation<HTMLDivElement>(0.2);
  const capsRef = useScrollAnimation<HTMLDivElement>(0.1);

  const harperIntro = inputs.contentOverrides?.harperIntro
    || 'Harper handles the routine so your team can focus on what matters. She provides instant, accurate responses to employee questions while maintaining complete audit trails for compliance.';

  return (
    <section id="harper" className="py-20 sm:py-28 bg-[#f3f4f6]" ref={sectionRef}>
      <div className="max-w-5xl mx-auto px-6 ms-fade-up">
        <div className="flex flex-col md:flex-row gap-8 mb-10">
          <div className="flex-1">
            <h2 className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: 'var(--theme-primary)' }}>Meet Harper</h2>
            <p className="mb-2" style={{ color: 'rgba(var(--theme-primary-rgb), 0.5)' }}>Your AI HR Teammate</p>
            <div className="w-16 h-0.5 mb-8" style={{ backgroundColor: 'var(--theme-primary)' }} />
            <p className="text-gray-700 text-lg leading-relaxed">
              {harperIntro}
            </p>
          </div>
          <div className="w-full md:w-[30%] flex-shrink-0">
            <img src="/Harper-profile.png" alt="Harper" className="w-full h-auto rounded-xl object-cover" />
          </div>
        </div>

        {/* Stats row */}
        <div ref={statsRef} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12 ms-fade-up">
          {[
            { value: HARPER_STATS.accuracy, label: HARPER_STATS.accuracyContext },
            { value: '<8s', label: HARPER_STATS.responseContext },
            { value: HARPER_STATS.deflection, label: HARPER_STATS.deflectionContext },
            { value: HARPER_STATS.languages, label: 'Languages supported' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center p-5 bg-white rounded-xl border border-[#e0e3eb]"
            >
              <div className="text-3xl font-bold mb-1" style={{ color: 'var(--theme-primary)' }}>{stat.value}</div>
              <div className="text-xs" style={{ color: 'rgba(var(--theme-primary-rgb), 0.5)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Capabilities */}
        <div ref={capsRef} className="ms-fade-up">
          <h3 className="text-lg font-semibold mb-5" style={{ color: 'var(--theme-primary)' }}>What Harper Does</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ms-stagger">
            {CAPABILITIES.map((cap) => (
              <div key={cap.title} className="p-4 bg-white rounded-xl border border-[#e0e3eb]">
                <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--theme-primary)' }}>{cap.title}</h4>
                <p className="text-xs" style={{ color: 'rgba(var(--theme-primary-rgb), 0.5)' }}>{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <MicrositeQuote selectedQuotes={inputs.selectedQuotes} section="meet-harper" />
      </div>
    </section>
  );
}
