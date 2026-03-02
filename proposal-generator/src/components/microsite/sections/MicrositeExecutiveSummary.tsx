'use client';

import React from 'react';
import { ProposalInputs, PainPoint } from '@/types/proposal';
import { calculatePricing, formatCompactCurrency } from '@/lib/pricing-calculator';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
} from '@/lib/roi-calculator';
import { getOpportunityContent, getPainPointContent } from '@/lib/content-templates';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import { MicrositeQuote } from '../MicrositeQuote';

interface Props {
  inputs: ProposalInputs;
}

export function MicrositeExecutiveSummary({ inputs }: Props) {
  const sectionRef = useScrollAnimation<HTMLElement>();
  const metricsRef = useScrollAnimation<HTMLDivElement>(0.2);
  const painRef = useScrollAnimation<HTMLDivElement>(0.1);

  const pricing = calculatePricing(inputs.pricing);
  const hrOutput = calculateHROperationsROI(inputs.hrOperations);
  const tier2Cases = inputs.hrOperations.tier2Workflows.reduce((sum, w) => sum + w.volumePerYear, 0);
  const legalOutput = calculateLegalComplianceROI(inputs.legalCompliance, tier2Cases);
  const eeOutput = calculateEmployeeExperienceROI(inputs.employeeExperience);
  const summary = calculateROISummary(hrOutput, legalOutput, eeOutput, pricing.annualRecurringRevenue);

  const opportunityContent = getOpportunityContent(inputs.company.industry);

  const roiCounter = useAnimatedCounter(Math.round(summary.totalROI), 1400);
  const paybackCounter = useAnimatedCounter(summary.paybackPeriodMonths, 1200, 1);
  const valueCounter = useAnimatedCounter(Math.round(summary.grossAnnualValue / 1000), 1200);

  // Get content with override priority
  const insight = inputs.contentOverrides?.execSummaryInsight
    || inputs.generatedContent?.execSummaryInsight
    || opportunityContent.insight;
  const vision = inputs.contentOverrides?.execSummaryVision
    || inputs.generatedContent?.execSummaryVision
    || opportunityContent.vision;
  const bullets = inputs.contentOverrides?.execSummaryBullets
    || inputs.generatedContent?.execSummaryBullets
    || opportunityContent.bullets;

  // Build pain points
  const order = inputs.painPointOrder?.length ? inputs.painPointOrder : inputs.painPoints;
  const painPointContent = getPainPointContent(inputs.painPoints);
  const orderedItems: Array<{ key: string; headline: string; impact: string }> = [];
  for (const id of order) {
    const predefined = painPointContent.find(p => p.key === id);
    if (predefined) {
      orderedItems.push(predefined);
      continue;
    }
    const custom = inputs.customPainPoints?.find(cp => cp.id === id);
    if (custom) {
      orderedItems.push({ key: custom.id, headline: custom.headline, impact: custom.impact });
    }
  }

  return (
    <section id="executive-summary" className="py-20 sm:py-28 bg-white" ref={sectionRef}>
      <div className="max-w-5xl mx-auto px-6 ms-fade-up">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#03143B] mb-2">Executive Summary</h2>
        <div className="w-16 h-0.5 bg-[#03143B] mb-8" />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
          <div className="md:col-span-3">
            <p className="text-gray-700 text-lg leading-relaxed mb-4">{insight}</p>
            <p className="text-xl font-semibold text-[#03143B] italic border-l-4 border-[#03143B] pl-4 mb-6">
              {vision}
            </p>
            <ul className="space-y-3">
              {bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-600">
                  <span className="w-2 h-2 bg-[#03143B] rounded-full mt-2 flex-shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2 ms-fade-up" ref={metricsRef}>
            <div className="bg-gray-50 rounded-xl p-6 border border-[#e0e3eb] space-y-4">
              <h3 className="text-xs font-semibold text-[#03143B] uppercase tracking-wider">Key Metrics</h3>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600 text-sm">Annual Investment</span>
                <span className="text-xl font-bold text-[#03143B]">{formatCompactCurrency(pricing.annualRecurringRevenue)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600 text-sm">Projected Annual Value</span>
                <span className="text-xl font-bold text-[#03143B]" ref={valueCounter.ref as React.RefObject<HTMLSpanElement>}>
                  ${valueCounter.display}K
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600 text-sm">Return on Investment</span>
                <span className="text-xl font-bold text-[#03143B]" ref={roiCounter.ref as React.RefObject<HTMLSpanElement>}>
                  {roiCounter.display}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Payback Period</span>
                <span className="text-xl font-bold text-[#03143B]" ref={paybackCounter.ref as React.RefObject<HTMLSpanElement>}>
                  {paybackCounter.display} mo
                </span>
              </div>
            </div>
          </div>
        </div>

        <MicrositeQuote selectedQuotes={inputs.selectedQuotes} section="executive-summary" />

        {orderedItems.length > 0 && (
          <div ref={painRef} className="ms-fade-up">
            <h3 className="text-xl font-semibold text-[#03143B] mb-5">Current State Assessment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ms-stagger">
              {orderedItems.map((point) => (
                <div
                  key={point.key}
                  className="p-5 bg-white border-l-4 border-[#03143B] shadow-sm rounded-r-lg"
                >
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {inputs.contentOverrides?.painPointHeadlines?.[point.key] || point.headline}
                  </h4>
                  <p className="text-gray-600 text-sm">{point.impact}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
