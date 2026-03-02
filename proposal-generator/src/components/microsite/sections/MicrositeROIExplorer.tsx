'use client';

import React from 'react';
import { ProposalInputs } from '@/types/proposal';
import { formatCompactCurrency } from '@/lib/pricing-calculator';
import { useROIScenarios, Scenario } from '../hooks/useROIScenarios';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

interface Props {
  inputs: ProposalInputs;
}

const SCENARIO_LABELS: Record<Scenario, { label: string; desc: string }> = {
  conservative: { label: 'Conservative', desc: 'Lower adoption, cautious deflection rates' },
  recommended: { label: 'Recommended', desc: 'Based on your proposal inputs' },
  optimistic: { label: 'Optimistic', desc: 'Strong adoption, higher deflection rates' },
};

export function MicrositeROIExplorer({ inputs }: Props) {
  const sectionRef = useScrollAnimation<HTMLElement>();
  const { scenario, setScenario, summary, hrOutput, legalOutput, eeOutput, pricing } = useROIScenarios(inputs);

  const grossTotal = summary.hrOpsSavings + summary.legalSavings + summary.productivitySavings + pricing.annualRecurringRevenue;
  const maxBar = Math.max(
    summary.hrOpsSavings + pricing.annualRecurringRevenue,
    summary.legalSavings,
    summary.productivitySavings,
    1
  );

  return (
    <section id="roi-explorer" className="py-20 sm:py-28 bg-white" ref={sectionRef}>
      <div className="max-w-5xl mx-auto px-6 ms-fade-up">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#03143B] mb-2">ROI Explorer</h2>
        <p className="text-gray-500 mb-2">Toggle scenarios to see how outcomes change</p>
        <div className="w-16 h-0.5 bg-[#03143B] mb-10" />

        {/* Scenario toggles */}
        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          {(Object.keys(SCENARIO_LABELS) as Scenario[]).map((s) => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={`flex-1 p-4 rounded-xl text-left transition-all ${
                scenario === s
                  ? 'bg-[#03143B] text-white shadow-lg scale-[1.02]'
                  : 'bg-gray-50 text-gray-700 border border-gray-200 hover:border-[#03143B]/50'
              }`}
            >
              <div className="font-semibold text-sm">{SCENARIO_LABELS[s].label}</div>
              <div className={`text-xs mt-0.5 ${scenario === s ? 'text-white/70' : 'text-gray-500'}`}>
                {SCENARIO_LABELS[s].desc}
              </div>
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Savings breakdown bars */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-[#03143B] uppercase tracking-wider">Annual Savings Breakdown</h3>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">HR Operations</span>
                <span className="text-sm font-semibold text-[#03143B] ms-number-transition">
                  {formatCompactCurrency(summary.hrOpsSavings + pricing.annualRecurringRevenue)}
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#03143B] rounded-full ms-bar"
                  style={{ width: `${Math.max(2, ((summary.hrOpsSavings + pricing.annualRecurringRevenue) / maxBar) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Compliance Value</span>
                <span className="text-sm font-semibold text-[#03143B] ms-number-transition">
                  {formatCompactCurrency(summary.legalSavings)}
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#03143B] rounded-full ms-bar"
                  style={{ width: `${Math.max(2, (summary.legalSavings / maxBar) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Productivity Gains</span>
                <span className="text-sm font-semibold text-[#03143B] ms-number-transition">
                  {formatCompactCurrency(summary.productivitySavings)}
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#03143B]/60 rounded-full ms-bar"
                  style={{ width: `${Math.max(2, (summary.productivitySavings / maxBar) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Summary metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-5 rounded-xl text-center">
              <div className="text-3xl font-bold text-[#03143B] ms-number-transition">
                {Math.round(summary.totalROI)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Total ROI</div>
            </div>
            <div className="bg-gray-50 p-5 rounded-xl text-center">
              <div className="text-3xl font-bold text-[#03143B] ms-number-transition">
                {summary.paybackPeriodMonths.toFixed(1)} mo
              </div>
              <div className="text-xs text-gray-500 mt-1">Payback Period</div>
            </div>
            <div className="bg-gray-50 p-5 rounded-xl text-center">
              <div className="text-3xl font-bold text-[#03143B] ms-number-transition">
                {formatCompactCurrency(summary.grossAnnualValue)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Gross Annual Value</div>
            </div>
            <div className="bg-gray-50 p-5 rounded-xl text-center">
              <div className="text-3xl font-bold text-[#03143B] ms-number-transition">
                {formatCompactCurrency(summary.netAnnualBenefit)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Net Annual Benefit</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
