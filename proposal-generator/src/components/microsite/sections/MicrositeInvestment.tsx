'use client';

import React from 'react';
import { ProposalInputs } from '@/types/proposal';
import { calculatePricing, formatCompactCurrency, formatCurrency } from '@/lib/pricing-calculator';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
  calculate3YearProjection,
} from '@/lib/roi-calculator';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import { MicrositeQuote } from '../MicrositeQuote';

interface Props {
  inputs: ProposalInputs;
}

export function MicrositeInvestment({ inputs }: Props) {
  const sectionRef = useScrollAnimation<HTMLElement>();
  const metricsRef = useScrollAnimation<HTMLDivElement>(0.2);

  const pricing = calculatePricing(inputs.pricing);
  const hrOutput = calculateHROperationsROI(inputs.hrOperations);
  const tier2Cases = inputs.hrOperations.tier2Workflows.reduce((sum, w) => sum + w.volumePerYear, 0);
  const legalOutput = calculateLegalComplianceROI(inputs.legalCompliance, tier2Cases);
  const eeOutput = calculateEmployeeExperienceROI(inputs.employeeExperience);
  const summary = calculateROISummary(hrOutput, legalOutput, eeOutput, pricing.annualRecurringRevenue);
  const projection = calculate3YearProjection(summary.grossAnnualValue, pricing.annualRecurringRevenue);

  const roiCounter = useAnimatedCounter(Math.round(summary.netAnnualBenefit), 1400);
  const paybackCounter = useAnimatedCounter(summary.paybackPeriodMonths, 1200, 1);

  return (
    <section
      id="investment"
      className="py-20 sm:py-28 text-white"
      style={{ background: 'var(--theme-primary)' }}
      ref={sectionRef}
    >
      <div className="max-w-5xl mx-auto px-6 ms-fade-up">
        <h2 className="text-3xl sm:text-4xl font-bold mb-2">Investment Case</h2>
        <div className="w-16 h-0.5 bg-white/30 mb-10" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
          {/* Investment */}
          <div>
            <h3 className="text-lg font-semibold text-white/70 mb-5">
              Your Investment ({inputs.pricing.contractTermYears}-Year Contract)
            </h3>
            <div className="space-y-3">
              {pricing.yearlyBreakdown.map((year, index) => (
                <div key={year.year} className="flex justify-between pb-3 border-b border-white/15">
                  <span className="text-white/70">
                    Year {year.year} Software
                    {inputs.pricing.yearlyConfig[index]?.workflows.included ? ' (Platform + Workflows)' : ' (Platform)'}
                  </span>
                  <span className="font-semibold">{formatCompactCurrency(year.softwareNetPrice)}</span>
                </div>
              ))}
              {pricing.implementationNetPrice > 0 && (
                <div className="flex justify-between pb-3 border-b border-white/15">
                  <span className="text-white/70">One-Time Implementation</span>
                  <span className="font-semibold">{formatCompactCurrency(pricing.implementationNetPrice)}</span>
                </div>
              )}
              {pricing.servicesNetPrice > 0 && (
                <div className="flex justify-between pb-3 border-b border-white/15">
                  <span className="text-white/70">Professional Services</span>
                  <span className="font-semibold">{formatCompactCurrency(pricing.servicesNetPrice)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1">
                <span className="font-semibold">Total Contract Value</span>
                <span className="text-xl font-bold">{formatCompactCurrency(pricing.totalContractValue)}</span>
              </div>
            </div>
          </div>

          {/* Return */}
          <div>
            <h3 className="text-lg font-semibold text-white/70 mb-5">Your Return</h3>
            <div className="space-y-3">
              <div className="flex justify-between pb-3 border-b border-white/15">
                <span className="text-white/70">HR Operations Savings</span>
                <span className="font-semibold">{formatCompactCurrency(summary.hrOpsSavings)}</span>
              </div>
              <div className="flex justify-between pb-3 border-b border-white/15">
                <span className="text-white/70">Compliance Value</span>
                <span className="font-semibold">{formatCompactCurrency(summary.legalSavings)}</span>
              </div>
              <div className="flex justify-between pb-3 border-b border-white/15">
                <span className="text-white/70">Productivity Gains</span>
                <span className="font-semibold">{formatCompactCurrency(summary.productivitySavings)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-semibold">Net Annual Value</span>
                <span className="text-xl font-bold">{formatCompactCurrency(summary.netAnnualBenefit)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Big metrics */}
        <div ref={metricsRef} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10 ms-fade-up">
          <div className="bg-white/10 p-5 rounded-xl text-center backdrop-blur-sm">
            <div className="text-3xl font-bold mb-1" ref={roiCounter.ref as React.RefObject<HTMLDivElement>}>
              {formatCompactCurrency(roiCounter.value)}
            </div>
            <div className="text-white/60 text-sm">Annual ROI</div>
          </div>
          <div className="bg-white/10 p-5 rounded-xl text-center backdrop-blur-sm">
            <div className="text-3xl font-bold mb-1" ref={paybackCounter.ref as React.RefObject<HTMLDivElement>}>
              {paybackCounter.display} mo
            </div>
            <div className="text-white/60 text-sm">Payback</div>
          </div>
          <div className="bg-white/10 p-5 rounded-xl text-center backdrop-blur-sm">
            <div className="text-3xl font-bold mb-1">{formatCompactCurrency(projection.total)}</div>
            <div className="text-white/60 text-sm">3-Year Value</div>
          </div>
          <div className="bg-white/10 p-5 rounded-xl text-center backdrop-blur-sm">
            <div className="text-3xl font-bold mb-1">{formatCompactCurrency(projection.netTotal)}</div>
            <div className="text-white/60 text-sm">3-Year Net</div>
          </div>
        </div>

        <MicrositeQuote selectedQuotes={inputs.selectedQuotes} section="investment" dark />

        {/* 3-Year breakdown */}
        <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm">
          <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">3-Year Value Projection</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-white/50 text-xs mb-1">Year 1 (50% adoption)</div>
              <div className="text-xl font-bold">{formatCompactCurrency(projection.year1)}</div>
            </div>
            <div>
              <div className="text-white/50 text-xs mb-1">Year 2 (75% adoption)</div>
              <div className="text-xl font-bold">{formatCompactCurrency(projection.year2)}</div>
            </div>
            <div>
              <div className="text-white/50 text-xs mb-1">Year 3 (100% adoption)</div>
              <div className="text-xl font-bold">{formatCompactCurrency(projection.year3)}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
