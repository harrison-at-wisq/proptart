'use client';

import React from 'react';
import { ProposalInputs } from '@/types/proposal';
import { calculatePricing, formatCompactCurrency } from '@/lib/pricing-calculator';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
} from '@/lib/roi-calculator';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import { MicrositeQuote } from '../MicrositeQuote';
import { getEnabledPillarsFromProposal, PILLAR_LABELS, pillarGridColsClass, type PillarKey } from '@/lib/pillar-visibility';

interface Props {
  inputs: ProposalInputs;
}

// ---------- Inline pie chart for dark investment section ----------

interface PieSlice {
  label: string;
  value: number;
  formattedValue: string;
}

const SLICE_COLORS = ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.30)'];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function ReturnPieChart({ slices }: { slices: PieSlice[] }) {
  const [visible, setVisible] = React.useState(false);
  const svgRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const sum = slices.reduce((s, sl) => s + Math.max(0, sl.value), 0);
  const cx = 180, cy = 120, r = 82;
  let currentAngle = 0;

  const segments: { d: string; color: string; midAngle: number; slice: PieSlice }[] = [];
  slices.forEach((slice, i) => {
    const fraction = sum > 0 ? Math.max(0, slice.value) / sum : 1 / slices.length;
    const sweep = fraction * 360;
    const clampedSweep = Math.min(sweep, 359.99);
    const start = polarToCartesian(cx, cy, r, currentAngle + clampedSweep);
    const end = polarToCartesian(cx, cy, r, currentAngle);
    const largeArc = clampedSweep > 180 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${end.x} ${end.y} A ${r} ${r} 0 ${largeArc} 1 ${start.x} ${start.y} Z`;
    segments.push({ d, color: SLICE_COLORS[i % SLICE_COLORS.length], midAngle: currentAngle + sweep / 2, slice });
    currentAngle += sweep;
  });

  const leaderR1 = r + 10, leaderR2 = r + 24;
  const labels = segments.map((seg, i) => {
    const edgePt = polarToCartesian(cx, cy, leaderR1, seg.midAngle);
    const elbowPt = polarToCartesian(cx, cy, leaderR2, seg.midAngle);
    const isRight = elbowPt.x >= cx;
    const lineEndX = isRight ? 348 : 12;
    return { edgePt, elbowPt, lineEndX, isRight, slice: seg.slice, index: i };
  });

  return (
    <svg ref={svgRef} viewBox="0 0 360 240" className="w-full">
      {segments.map((seg, i) => (
        <path
          key={i}
          d={seg.d}
          fill={seg.color}
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            transform: visible ? 'scale(1)' : 'scale(0)',
            opacity: visible ? 1 : 0,
            transition: `transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.15}s, opacity 0.4s ease ${i * 0.15}s`,
          }}
        />
      ))}
      {labels.map((lbl) => (
        <g
          key={lbl.index}
          style={{
            opacity: visible ? 1 : 0,
            transition: `opacity 0.5s ease ${0.5 + lbl.index * 0.12}s`,
          }}
        >
          <line x1={lbl.edgePt.x} y1={lbl.edgePt.y} x2={lbl.elbowPt.x} y2={lbl.elbowPt.y} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
          <line x1={lbl.elbowPt.x} y1={lbl.elbowPt.y} x2={lbl.lineEndX} y2={lbl.elbowPt.y} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
          <text x={lbl.lineEndX + (lbl.isRight ? -4 : 4)} y={lbl.elbowPt.y - 3} textAnchor={lbl.isRight ? 'end' : 'start'} dominantBaseline="alphabetic" fontSize={12} fill="rgba(255,255,255,0.8)">
            {lbl.slice.label}
          </text>
          <text x={lbl.lineEndX + (lbl.isRight ? -4 : 4)} y={lbl.elbowPt.y + 14} textAnchor={lbl.isRight ? 'end' : 'start'} dominantBaseline="alphabetic" fontSize={14} fontWeight={700} fill="#fff">
            {lbl.slice.formattedValue}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function MicrositeInvestment({ inputs }: Props) {
  const sectionRef = useScrollAnimation<HTMLElement>();
  const metricsRef = useScrollAnimation<HTMLDivElement>(0.2);
  const breakdownRef = useScrollAnimation<HTMLDivElement>(0.1);

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

  const avgAnnualInvestment = pricing.totalContractValue / contractYears;
  const monthlyGross = summary.grossAnnualValue / 12;
  const paybackMonths = monthlyGross > 0 ? avgAnnualInvestment / monthlyGross : 0;
  const totalContractValue = summary.grossAnnualValue * contractYears;
  const netContractValue = totalContractValue - pricing.totalContractValue;

  const paybackCounter = useAnimatedCounter(paybackMonths, 1200, 1);

  // ---------- ROI Breakdown line items (same logic as PDF) ----------
  const fmtNum = (n: number) => Math.round(n).toLocaleString('en-US');
  const fmtRate = (n: number) => `$${n.toFixed(2)}`;
  const HOURS_PER_FTE = 2080;

  const avgTier01Savings = hrOutput.yearCostResults.reduce((s, yr) => s + yr.tier01Savings, 0) / contractYears;
  const avgTier2Savings = hrOutput.yearCostResults.reduce((s, yr) => s + yr.tier2Savings, 0) / contractYears;
  const avgManagerSavings = hrOutput.yearCostResults.reduce((s, yr) => s + yr.managerSavings, 0) / contractYears;
  const avgTriageSavings = hrOutput.yearCostResults.reduce((s, yr) => s + yr.triageSavings, 0) / contractYears;
  const avgTier01Deflection = hrInputs.tier01DeflectionByYear?.length
    ? hrInputs.tier01DeflectionByYear.reduce((s, d) => s + d, 0) / hrInputs.tier01DeflectionByYear.length
    : 50;

  const hrItems: { label: string; value: string; explanation: string }[] = [
    {
      label: 'Simple Workflow Savings',
      value: formatCompactCurrency(avgTier01Savings),
      explanation: `${fmtNum(hrInputs.tier01CasesPerYear)} simple transactions/yr, ~${Math.round(avgTier01Deflection)}% deflected at ${fmtRate(hrInputs.tier01HandlerSalary / HOURS_PER_FTE)}/hr`,
    },
    {
      label: 'Complex Case Efficiency',
      value: formatCompactCurrency(avgTier2Savings),
      explanation: `${hrInputs.tier2Workflows.length} configured workflows reducing complex case processing time`,
    },
  ];
  if (hrInputs.managerHRTime?.enabled && avgManagerSavings > 0) {
    const mgr = hrInputs.managerHRTime;
    hrItems.push({
      label: 'Manager Time Savings',
      value: formatCompactCurrency(avgManagerSavings),
      explanation: `${fmtNum(mgr.managersDoingHR)} managers × ${mgr.hoursPerWeekPerManager} hrs/wk × ${fmtRate(mgr.managerHourlyCost)}/hr`,
    });
  }
  if (hrInputs.triageRole?.enabled && avgTriageSavings > 0) {
    const tri = hrInputs.triageRole;
    hrItems.push({
      label: 'Triage Role Savings',
      value: formatCompactCurrency(avgTriageSavings),
      explanation: `${tri.triageFTEs} triage FTEs × ${formatCompactCurrency(tri.triageSalary)} salary × workload reduction`,
    });
  }

  const legalYears = legalOutput.yearResults;
  const avgAvoidedLegal = legalYears.reduce((s, yr) => s + yr.avoidedLegalCosts, 0) / contractYears;
  const avgAdminSavings = legalYears.reduce((s, yr) => s + yr.adminCostSavings, 0) / contractYears;
  const avgAuditPrep = legalYears.reduce((s, yr) => s + yr.auditPrepSavings, 0) / contractYears;
  const avgRiskValue = legalYears.reduce((s, yr) => s + yr.riskValue, 0) / contractYears;
  const avgProactiveValue = legalYears.reduce((s, yr) => s + yr.proactiveValue, 0) / contractYears;
  const avgAvoidedIncidents = legalYears.reduce((s, yr) => s + yr.avoidedIncidents, 0) / contractYears;

  const legalItems: { label: string; value: string; explanation: string }[] = [];
  if (avgAvoidedLegal > 0) {
    legalItems.push({
      label: 'Legal Cost Avoidance',
      value: formatCompactCurrency(avgAvoidedLegal),
      explanation: `~${avgAvoidedIncidents.toFixed(1)} incidents avoided/yr × ${formatCompactCurrency(inputs.legalCompliance.avgLegalCostPerIncident)}/incident`,
    });
  }
  if (avgAdminSavings > 0) {
    legalItems.push({
      label: 'Compliance Admin Savings',
      value: formatCompactCurrency(avgAdminSavings),
      explanation: `${inputs.legalCompliance.adminHoursPerCase} hrs saved/case × ${fmtRate(inputs.legalCompliance.adminHourlyRate)}/hr`,
    });
  }
  if (avgAuditPrep > 0 && inputs.legalCompliance.auditPrep?.enabled) {
    const audit = inputs.legalCompliance.auditPrep;
    legalItems.push({
      label: 'Audit Prep Savings',
      value: formatCompactCurrency(avgAuditPrep),
      explanation: `${audit.auditsPerYear} audits/yr × ${audit.prepHoursPerAudit} hrs × ${audit.wisqReductionPercent}% time saved`,
    });
  }
  if (avgRiskValue > 0) {
    legalItems.push({
      label: 'Risk Detection Value',
      value: formatCompactCurrency(avgRiskValue),
      explanation: 'Proactive risk pattern identification across case data',
    });
  }
  if (avgProactiveValue > 0) {
    legalItems.push({
      label: 'Proactive Alerts Value',
      value: formatCompactCurrency(avgProactiveValue),
      explanation: 'Early warning system for emerging compliance risks',
    });
  }

  const eeInputs = inputs.employeeExperience;
  const avgProductivity = eeOutput.yearResults.reduce((s, yr) => s + yr.totalMonetaryValue, 0) / contractYears;
  const avgHoursSaved = eeOutput.yearResults.reduce((s, yr) => s + yr.hoursSaved, 0) / contractYears;

  const eeItems: { label: string; value: string; explanation: string }[] = [
    {
      label: 'Employee Productivity Gains',
      value: formatCompactCurrency(avgProductivity),
      explanation: `${fmtNum(eeInputs.totalEmployeePopulation)} employees × ${eeInputs.inquiriesPerEmployeePerYear} inquiries/yr × ${eeInputs.timeReductionPercent}% faster at ${fmtRate(eeInputs.avgHourlyRate ?? 55)}/hr`,
    },
  ];
  if (avgHoursSaved > 0) {
    eeItems.push({
      label: 'Hours Returned to Workforce',
      value: `${fmtNum(avgHoursSaved)} hrs/yr`,
      explanation: `Equivalent to ${(avgHoursSaved / HOURS_PER_FTE).toFixed(1)} FTEs of productive time returned`,
    });
  }

  const enabledPillars = getEnabledPillarsFromProposal(inputs);
  const pillarData: Record<PillarKey, { annual: number; items: typeof hrItems }> = {
    hrOps: { annual: summary.hrOpsSavings, items: hrItems },
    legal: { annual: summary.legalSavings, items: legalItems },
    ex: { annual: summary.productivitySavings, items: eeItems },
  };
  const breakdownColumns = enabledPillars.map((k) => ({
    title: PILLAR_LABELS[k],
    total: `${formatCompactCurrency(pillarData[k].annual)}/yr`,
    items: pillarData[k].items,
  }));

  // Pie chart slices — contract totals
  const pieSlices = enabledPillars.map((k) => ({
    label: PILLAR_LABELS[k],
    value: pillarData[k].annual * contractYears,
    formattedValue: formatCompactCurrency(pillarData[k].annual * contractYears),
  }));

  // Build investment rows — implementation first, then years
  const investmentRows: { label: string; value: string }[] = [];
  if (pricing.implementationNetPrice > 0) {
    investmentRows.push({ label: 'One-Time Implementation', value: formatCompactCurrency(pricing.implementationNetPrice) });
  }
  pricing.yearlyBreakdown.forEach((year, index) => {
    const yearConfig = inputs.pricing.yearlyConfig[index];
    const suffix = yearConfig?.workflows.included ? ' (Platform + Workflows)' : ' (Platform)';
    investmentRows.push({ label: `Year ${year.year} Software${suffix}`, value: formatCompactCurrency(year.softwareNetPrice) });
  });
  if (pricing.servicesNetPrice > 0) {
    investmentRows.push({ label: 'Professional Services', value: formatCompactCurrency(pricing.servicesNetPrice) });
  }
  if (pricing.integrationsNetPrice > 0) {
    investmentRows.push({ label: 'Additional Integrations', value: formatCompactCurrency(pricing.integrationsNetPrice) });
  }

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

        {/* KPI tiles */}
        <div ref={metricsRef} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10 ms-fade-up">
          <div className="bg-white/10 p-5 rounded-xl text-center backdrop-blur-sm">
            <div className="text-3xl font-bold mb-1">{formatCompactCurrency(pricing.totalContractValue)}</div>
            <div className="text-white/60 text-sm">Total Investment</div>
          </div>
          <div className="bg-white/10 p-5 rounded-xl text-center backdrop-blur-sm">
            <div className="text-3xl font-bold mb-1" ref={paybackCounter.ref as React.RefObject<HTMLDivElement>}>
              {paybackCounter.display} mo
            </div>
            <div className="text-white/60 text-sm">Payback</div>
          </div>
          <div className="bg-white/10 p-5 rounded-xl text-center backdrop-blur-sm">
            <div className="text-3xl font-bold mb-1">{formatCompactCurrency(totalContractValue)}</div>
            <div className="text-white/60 text-sm">{contractYears}-Year Value</div>
          </div>
          <div className="bg-white/10 p-5 rounded-xl text-center backdrop-blur-sm">
            <div className="text-3xl font-bold mb-1">{formatCompactCurrency(netContractValue)}</div>
            <div className="text-white/60 text-sm">{contractYears}-Year Net</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
          {/* Investment */}
          <div>
            <h3 className="text-lg font-semibold text-white/70 mb-5">
              Your Investment ({contractYears}-Year Contract)
            </h3>
            <div className="space-y-3">
              {investmentRows.map((row) => (
                <div key={row.label} className="flex justify-between pb-3 border-b border-white/15">
                  <span className="text-white/70">{row.label}</span>
                  <span className="font-semibold">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Return — pie chart, or single-stat card if only one pillar is enabled */}
          <div>
            <h3 className="text-lg font-semibold text-white/70 mb-5">
              Your Return ({contractYears}-Year Contract)
            </h3>
            {pieSlices.length === 1 ? (
              <div className="bg-white/10 rounded-xl p-8 text-center backdrop-blur-sm">
                <div className="text-white/60 text-sm font-semibold uppercase tracking-wide mb-2">
                  {pieSlices[0].label}
                </div>
                <div className="text-4xl font-bold">{pieSlices[0].formattedValue}</div>
              </div>
            ) : (
              <ReturnPieChart slices={pieSlices} />
            )}
          </div>
        </div>

        <MicrositeQuote selectedQuotes={inputs.selectedQuotes} section="investment" dark />

        {/* Return Breakdown */}
        <div ref={breakdownRef} className="ms-fade-up">
          <h3 className="text-lg font-semibold text-white/70 mb-6">Return Breakdown</h3>
          <div className={`grid ${pillarGridColsClass(breakdownColumns.length)} gap-4`}>
            {breakdownColumns.map((col) => (
              <div key={col.title} className="bg-white/5 rounded-xl p-5 backdrop-blur-sm">
                <h4 className="text-sm font-semibold text-white/80 mb-1">{col.title}</h4>
                <div className="text-xl font-bold mb-4">{col.total}</div>
                <div className="space-y-3">
                  {col.items.map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/70">{item.label}</span>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                      <div className="text-xs text-white/40 mt-0.5">{item.explanation}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
