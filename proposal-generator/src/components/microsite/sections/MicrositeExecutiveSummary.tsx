'use client';

import React from 'react';
import { ProposalInputs, PainPoint } from '@/types/proposal';
import { calculatePricing, formatCompactCurrency, formatCurrency } from '@/lib/pricing-calculator';
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
  const contractYears = inputs.pricing.contractTermYears || 3;
  const hrInputs = inputs.hrOperations;
  const yearSettings = hrInputs.yearSettings?.length
    ? hrInputs.yearSettings
    : [
        { wisqEffectiveness: 30, workforceChange: 0 },
        { wisqEffectiveness: 60, workforceChange: 5 },
        { wisqEffectiveness: 75, workforceChange: 10 },
      ];
  const hrOutput = calculateHROperationsROI(hrInputs);
  const tier2PlusConfiguredCases = hrInputs.tier2Workflows.reduce((sum, w) => sum + w.volumePerYear, 0);
  const ncVol = hrInputs.nonConfiguredWorkflow?.enabled ? (hrInputs.nonConfiguredWorkflow.volumePerYear || 0) : 0;
  const tier2PlusTotalCases = hrInputs.tier2PlusTotalCases || (tier2PlusConfiguredCases + ncVol) || tier2PlusConfiguredCases;
  const activeConfiguredCasesByYear = hrOutput.yearResults.map(yr => yr.activeConfiguredCases);
  const legalOutput = calculateLegalComplianceROI(
    inputs.legalCompliance, tier2PlusConfiguredCases, yearSettings, contractYears, tier2PlusTotalCases, activeConfiguredCasesByYear
  );
  const eeOutput = calculateEmployeeExperienceROI(inputs.employeeExperience, yearSettings, contractYears);
  const wisqLicenseCost = hrInputs.wisqLicenseCost || pricing.annualRecurringRevenue;
  const summary = calculateROISummary(hrOutput, legalOutput, eeOutput, wisqLicenseCost, contractYears);

  const opportunityContent = getOpportunityContent(inputs.company.industry);

  const avgAnnualInvestment = pricing.totalContractValue / contractYears;
  const monthlyGross = summary.grossAnnualValue / 12;
  const paybackMonths = monthlyGross > 0 ? avgAnnualInvestment / monthlyGross : 0;

  const roiCounter = useAnimatedCounter(Math.round(summary.netAnnualBenefit), 1400);
  const paybackCounter = useAnimatedCounter(paybackMonths, 1200, 1);
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
        <h2 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--theme-primary)' }}>Executive Summary</h2>
        <div className="w-16 h-0.5 mb-8" style={{ backgroundColor: 'var(--theme-primary)' }} />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
          <div className="md:col-span-3">
            <p className="text-gray-700 text-lg leading-relaxed mb-4">{insight}</p>
            <p className="text-xl font-semibold italic border-l-4 pl-4 mb-6" style={{ color: 'var(--theme-primary)', borderColor: 'var(--theme-primary)' }}>
              {vision}
            </p>
            <ul className="space-y-3">
              {bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-600">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: 'var(--theme-primary)' }} />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2 ms-fade-up" ref={metricsRef}>
            <div className="bg-gray-50 rounded-xl p-6 border border-[#e0e3eb] space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-primary)' }}>Key Metrics</h3>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600 text-sm">Avg. Annual Investment</span>
                <span className="text-xl font-bold" style={{ color: 'var(--theme-primary)' }}>{formatCompactCurrency(avgAnnualInvestment)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600 text-sm">Projected Annual Value</span>
                <span className="text-xl font-bold" style={{ color: 'var(--theme-primary)' }} ref={valueCounter.ref as React.RefObject<HTMLSpanElement>}>
                  ${valueCounter.display}K
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600 text-sm">Return on Investment</span>
                <span className="text-xl font-bold" style={{ color: 'var(--theme-primary)' }} ref={roiCounter.ref as React.RefObject<HTMLSpanElement>}>
                  {formatCompactCurrency(roiCounter.value)}/yr
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Payback Period</span>
                <span className="text-xl font-bold" style={{ color: 'var(--theme-primary)' }} ref={paybackCounter.ref as React.RefObject<HTMLSpanElement>}>
                  {paybackCounter.display} mo
                </span>
              </div>
            </div>
          </div>
        </div>

        <MicrositeQuote selectedQuotes={inputs.selectedQuotes} section="executive-summary" />

        {orderedItems.length > 0 && (
          <div ref={painRef} className="ms-fade-up">
            <h3 className="text-xl font-semibold mb-5" style={{ color: 'var(--theme-primary)' }}>Current State Assessment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ms-stagger">
              {orderedItems.map((point) => (
                <div
                  key={point.key}
                  className="p-5 bg-white border-l-4 shadow-sm rounded-r-lg"
                  style={{ borderColor: 'var(--theme-primary)' }}
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
