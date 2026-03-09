'use client';

import React from 'react';
import { ProposalInputs } from '@/types/proposal';
import { getValueDriverContent } from '@/lib/content-templates';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { MicrositeQuote } from '../MicrositeQuote';

interface Props {
  inputs: ProposalInputs;
}

export function MicrositeValueDrivers({ inputs }: Props) {
  const sectionRef = useScrollAnimation<HTMLElement>();
  const cardsRef = useScrollAnimation<HTMLDivElement>(0.1);

  // Build driver list: AI-generated > template
  const drivers = inputs.generatedContent?.valueDriverContent?.length
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

  return (
    <section id="value-drivers" className="py-20 sm:py-28 bg-white" ref={sectionRef}>
      <div className="max-w-5xl mx-auto px-6 ms-fade-up">
        <h2 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--theme-primary)' }}>Value Drivers</h2>
        <div className="w-16 h-0.5 mb-10" style={{ backgroundColor: 'var(--theme-primary)' }} />

        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 ms-stagger">
          {drivers.map((driver, i) => {
            const overrides = inputs.contentOverrides?.valueDrivers?.[driver.key];
            return (
              <div
                key={driver.key}
                className={`p-6 rounded-xl transition-shadow hover:shadow-lg ${
                  driver.isPrimary
                    ? 'ring-2'
                    : 'bg-gray-50 border border-gray-200'
                }`}
                style={driver.isPrimary ? { backgroundColor: 'rgba(var(--theme-primary-rgb), 0.05)', '--tw-ring-color': 'var(--theme-primary)' } as React.CSSProperties : undefined}
              >
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
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--theme-primary)' }}>
                  {overrides?.headline || driver.headline}
                </h3>
                <p className="text-gray-600 text-sm mb-3 leading-relaxed">
                  {overrides?.description || driver.description}
                </p>
                {(overrides?.proof || driver.proof) && (
                  <p className="text-sm font-semibold" style={{ color: 'var(--theme-primary)' }}>
                    {overrides?.proof || driver.proof}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <MicrositeQuote selectedQuotes={inputs.selectedQuotes} section="value-drivers" />
      </div>
    </section>
  );
}
