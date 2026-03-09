'use client';

import React from 'react';
import { ProposalInputs } from '@/types/proposal';
import { WHY_NOW_CONTENT, NEXT_STEPS_OPTIONS } from '@/lib/content-templates';
import { calculatePricing, formatCompactCurrency } from '@/lib/pricing-calculator';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
} from '@/lib/roi-calculator';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { MicrositeQuote } from '../MicrositeQuote';

interface Props {
  inputs: ProposalInputs;
}

export function MicrositeWhyNow({ inputs }: Props) {
  const sectionRef = useScrollAnimation<HTMLElement>();
  const stepsRef = useScrollAnimation<HTMLDivElement>(0.1);

  const pricing = calculatePricing(inputs.pricing);
  const hrOutput = calculateHROperationsROI(inputs.hrOperations);
  const tier2Cases = inputs.hrOperations.tier2Workflows.reduce((sum, w) => sum + w.volumePerYear, 0);
  const legalOutput = calculateLegalComplianceROI(inputs.legalCompliance, tier2Cases);
  const eeOutput = calculateEmployeeExperienceROI(inputs.employeeExperience);
  const summary = calculateROISummary(hrOutput, legalOutput, eeOutput, pricing.annualRecurringRevenue);

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
        <h2 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--theme-primary)' }}>Why Now?</h2>
        <div className="w-16 h-0.5 mb-10" style={{ backgroundColor: 'var(--theme-primary)' }} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
          {whyNowKeys.map((itemKey, index) => {
            const generated = generatedMap[itemKey];
            const template = WHY_NOW_CONTENT[itemKey];
            const overrides = inputs.contentOverrides?.whyNowItems?.[itemKey];
            const headline = overrides?.headline || generated?.headline || template.headline;
            const description = overrides?.description || generated?.description || template.description;

            return (
              <div key={itemKey} className="p-5 bg-gray-50 rounded-xl border-l-4" style={{ borderColor: 'var(--theme-primary)' }}>
                <h3 className="font-semibold mb-1" style={{ color: 'var(--theme-primary)' }}>{headline}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
                {index === 0 && (
                  <p className="text-lg font-bold mt-3" style={{ color: 'var(--theme-primary)' }}>
                    {formatCompactCurrency(summary.grossAnnualValue / 12)}/month in potential value
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <MicrositeQuote selectedQuotes={inputs.selectedQuotes} section="why-now" />

        {/* Next Steps */}
        {orderedSteps.length > 0 && (
          <div ref={stepsRef} className="ms-fade-up">
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--theme-primary)' }}>Next Steps</h2>
            <div className="space-y-4 mb-8 ms-stagger">
              {orderedSteps.map((step, index) => {
                const overrides = inputs.contentOverrides?.nextStepOverrides?.[step.id];
                return (
                  <div key={step.id} className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm" style={{ backgroundColor: 'var(--theme-primary)' }}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{overrides?.title || step.title}</h3>
                      <p className="text-gray-600 text-sm">{overrides?.description || step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Contact */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <p className="text-gray-600 mb-1">Questions? Let&apos;s talk.</p>
              {inputs.company.contactEmail.includes('|') ? (
                <>
                  <p className="text-xl font-semibold" style={{ color: 'var(--theme-primary)' }}>
                    {inputs.company.contactEmail.split('|')[0].trim()}
                  </p>
                  <p className="text-lg" style={{ color: 'var(--theme-primary)' }}>
                    {inputs.company.contactEmail.split('|')[1].trim()}
                  </p>
                </>
              ) : (
                <p className="text-xl font-semibold" style={{ color: 'var(--theme-primary)' }}>{inputs.company.contactEmail}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
