'use client';

import React from 'react';
import { ProposalInputs } from '@/types/proposal';
import type { InvestmentSectionData, InvestmentTileKey } from '@/types/microsite';
import { calculatePricing, formatCompactCurrency } from '@/lib/pricing-calculator';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
} from '@/lib/roi-calculator';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { MicrositeQuote } from '../MicrositeQuote';
import { getEnabledPillarsFromProposal, PILLAR_LABELS, pillarGridColsClass, type PillarKey } from '@/lib/pillar-visibility';
import { useLayoutMode } from '@/components/ui/LayoutModeContext';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { ResolvedSpan } from '@/components/ui/ExportVariablesContext';
import { HiddenItemsBar, RemoveItemButton } from '../studio/LayoutChrome';
import { SubBlock } from '../studio/SubBlock';
import { useBlockOrder } from '../studio/useBlockOrder';

const INVESTMENT_BLOCKS = ['tiles', 'invReturn', 'breakdown'] as const;
type InvestmentBlockId = typeof INVESTMENT_BLOCKS[number];

interface Props {
  inputs: ProposalInputs;
  data?: Record<string, unknown>;
  onDataChange?: (next: Record<string, unknown>) => void;
}

const TILE_LABELS: Array<{ key: InvestmentTileKey; label: string; defaultValue: string }> = [
  { key: 'total-investment', label: 'Total Investment', defaultValue: '{{totalContractValue}}' },
  { key: 'payback', label: 'Payback', defaultValue: '{{paybackMonthsLabel}}' },
  { key: 'contract-value', label: 'Contract Value', defaultValue: '{{grossContractValue}}' },
  { key: 'net-value', label: 'Net Value', defaultValue: '{{netContractValue}}' },
];

// Static class map so Tailwind JIT can pick up the full class names at build.
const KPI_GRID_COLS: Record<number, string> = {
  0: 'sm:grid-cols-1',
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
};

function visibleTileCount(hidden: Set<InvestmentTileKey>): number {
  return TILE_LABELS.length - hidden.size;
}

// ---------- Inline pie chart for dark investment section ----------

interface PieSlice {
  label: string;
  // Stable key for overriding — the originally-computed label. `label` may
  // diverge after the user edits it, so overrides key off this.
  computedKey?: string;
  value: number;
  formattedValue: string;
}

const SLICE_COLORS = ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.30)'];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

interface ReturnPieChartProps {
  slices: PieSlice[];
  editable?: boolean;
  onLabelChange?: (sliceLabelKey: string, field: 'label' | 'value', next: string) => void;
}

function ReturnPieChart({ slices, editable = false, onLabelChange }: ReturnPieChartProps) {
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
  const FO_WIDTH = 140;
  const FO_HEIGHT = 44;
  const labels = segments.map((seg, i) => {
    const edgePt = polarToCartesian(cx, cy, leaderR1, seg.midAngle);
    const elbowPt = polarToCartesian(cx, cy, leaderR2, seg.midAngle);
    const isRight = elbowPt.x >= cx;
    const lineEndX = isRight ? 348 : 12;
    // foreignObject anchors at top-left, so position accordingly to keep the
    // label flush with the horizontal leader line.
    const foX = isRight ? lineEndX - FO_WIDTH : lineEndX;
    const foY = elbowPt.y - FO_HEIGHT / 2;
    return { edgePt, elbowPt, lineEndX, isRight, slice: seg.slice, index: i, foX, foY };
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
          <foreignObject x={lbl.foX} y={lbl.foY} width={FO_WIDTH} height={FO_HEIGHT}>
            <div
              style={{
                width: '100%',
                height: '100%',
                textAlign: lbl.isRight ? 'right' : 'left',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              {editable && onLabelChange ? (
                <>
                  <DirectEditableText
                    as="div"
                    value={lbl.slice.label}
                    onChange={(v) => onLabelChange(lbl.slice.computedKey ?? lbl.slice.label, 'label', v)}
                    className="text-[11px] font-normal leading-tight"
                    style={{ color: 'rgba(255,255,255,0.8)' }}
                  />
                  <DirectEditableText
                    as="div"
                    value={lbl.slice.formattedValue}
                    onChange={(v) => onLabelChange(lbl.slice.computedKey ?? lbl.slice.label, 'value', v)}
                    className="text-[14px] font-bold leading-tight"
                  />
                </>
              ) : (
                <>
                  <ResolvedSpan as="div" className="text-[11px] font-normal leading-tight" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {lbl.slice.label}
                  </ResolvedSpan>
                  <ResolvedSpan as="div" className="text-[14px] font-bold leading-tight">
                    {lbl.slice.formattedValue}
                  </ResolvedSpan>
                </>
              )}
            </div>
          </foreignObject>
        </g>
      ))}
    </svg>
  );
}

export function MicrositeInvestment({ inputs, data, onDataChange }: Props) {
  const { layoutMode } = useLayoutMode();
  const sectionData = (data ?? {}) as InvestmentSectionData;
  const hiddenTiles = new Set<InvestmentTileKey>(sectionData.hiddenTileKeys ?? []);
  const canEdit = layoutMode && !!onDataChange;

  function hideTile(key: InvestmentTileKey) {
    onDataChange?.({
      ...sectionData,
      hiddenTileKeys: Array.from(new Set([...(sectionData.hiddenTileKeys ?? []), key])),
    } as unknown as Record<string, unknown>);
  }
  function restoreTile(key: InvestmentTileKey) {
    onDataChange?.({
      ...sectionData,
      hiddenTileKeys: (sectionData.hiddenTileKeys ?? []).filter((k) => k !== key),
    } as unknown as Record<string, unknown>);
  }
  function updateTileLabel(key: InvestmentTileKey, value: string) {
    onDataChange?.({
      ...sectionData,
      tileLabelOverrides: { ...(sectionData.tileLabelOverrides ?? {}), [key]: value },
    } as unknown as Record<string, unknown>);
  }
  function updateTitle(value: string) {
    onDataChange?.({ ...sectionData, title: value } as unknown as Record<string, unknown>);
  }
  function tileLabel(key: InvestmentTileKey, fallback: string): string {
    return sectionData.tileLabelOverrides?.[key] ?? fallback;
  }
  function updateTileValue(key: InvestmentTileKey, v: string) {
    onDataChange?.({
      ...sectionData,
      tileValueOverrides: { ...(sectionData.tileValueOverrides ?? {}), [key]: v },
    } as unknown as Record<string, unknown>);
  }
  function moveTile(key: InvestmentTileKey, direction: -1 | 1) {
    const order = (sectionData.tileOrder ?? TILE_LABELS.map((t) => t.key)) as InvestmentTileKey[];
    const idx = order.indexOf(key);
    if (idx === -1) return;
    const target = idx + direction;
    if (target < 0 || target >= order.length) return;
    const next = order.slice();
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    onDataChange?.({ ...sectionData, tileOrder: next } as unknown as Record<string, unknown>);
  }

  function updateInvestmentColumnTitle(v: string) {
    onDataChange?.({ ...sectionData, investmentColumnTitle: v } as unknown as Record<string, unknown>);
  }
  function updateReturnColumnTitle(v: string) {
    onDataChange?.({ ...sectionData, returnColumnTitle: v } as unknown as Record<string, unknown>);
  }
  function updateBreakdownTitle(v: string) {
    onDataChange?.({ ...sectionData, breakdownTitle: v } as unknown as Record<string, unknown>);
  }
  function updateInvestmentRowLabel(rowLabelKey: string, v: string) {
    onDataChange?.({
      ...sectionData,
      investmentRowOverrides: {
        ...(sectionData.investmentRowOverrides ?? {}),
        [rowLabelKey]: { label: v },
      },
    } as unknown as Record<string, unknown>);
  }
  function updateBreakdownColumnTitle(colTitleKey: string, v: string) {
    onDataChange?.({
      ...sectionData,
      breakdownColumnOverrides: {
        ...(sectionData.breakdownColumnOverrides ?? {}),
        [colTitleKey]: { title: v },
      },
    } as unknown as Record<string, unknown>);
  }
  function updateBreakdownItem(compositeKey: string, field: 'label' | 'value' | 'explanation', v: string) {
    onDataChange?.({
      ...sectionData,
      breakdownItemOverrides: {
        ...(sectionData.breakdownItemOverrides ?? {}),
        [compositeKey]: { ...(sectionData.breakdownItemOverrides?.[compositeKey] ?? {}), [field]: v },
      },
    } as unknown as Record<string, unknown>);
  }

  const invBlocks = useBlockOrder<InvestmentBlockId>({
    defaults: INVESTMENT_BLOCKS,
    persisted: sectionData.blockOrder,
    setOrder: (next) => onDataChange?.({ ...sectionData, blockOrder: next } as unknown as Record<string, unknown>),
  });

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
  const wisqLicenseCost = pricing.annualRecurringRevenue;
  const summary = calculateROISummary(hrOutput, legalOutput, eeOutput, wisqLicenseCost, contractYears);

  const avgAnnualInvestment = pricing.totalContractValue / contractYears;
  const monthlyGross = summary.grossAnnualValue / 12;
  const paybackMonths = monthlyGross > 0 ? avgAnnualInvestment / monthlyGross : 0;
  const totalContractValue = summary.grossAnnualValue * contractYears;
  const netContractValue = totalContractValue - pricing.totalContractValue;


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

  // Mirrors the PDF editor's three-branch logic: simple-mode collapses a
  // pillar's detail rows into a single "Mutually agreed upon" entry; detailed
  // mode itemises the contributors; excluded pillars are filtered out entirely
  // by `getEnabledPillarsFromProposal` below.
  const SIMPLE_EXPLANATION = 'Mutually agreed upon';

  let hrItems: { label: string; value: string; explanation: string }[];
  if (hrInputs.mode === 'simple') {
    hrItems = [
      {
        label: 'HR Operations Savings',
        value: `${formatCompactCurrency(summary.hrOpsSavings)}/yr`,
        explanation: SIMPLE_EXPLANATION,
      },
    ];
  } else {
    hrItems = [
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
  }

  const legalYears = legalOutput.yearResults;
  const avgAvoidedLegal = legalYears.reduce((s, yr) => s + yr.avoidedLegalCosts, 0) / contractYears;
  const avgAdminSavings = legalYears.reduce((s, yr) => s + yr.adminCostSavings, 0) / contractYears;
  const avgAuditPrep = legalYears.reduce((s, yr) => s + yr.auditPrepSavings, 0) / contractYears;
  const avgRiskValue = legalYears.reduce((s, yr) => s + yr.riskValue, 0) / contractYears;
  const avgProactiveValue = legalYears.reduce((s, yr) => s + yr.proactiveValue, 0) / contractYears;
  const avgAvoidedIncidents = legalYears.reduce((s, yr) => s + yr.avoidedIncidents, 0) / contractYears;

  let legalItems: { label: string; value: string; explanation: string }[];
  if (inputs.legalCompliance.mode === 'simple') {
    legalItems = [
      {
        label: 'Compliance Value',
        value: `${formatCompactCurrency(summary.legalSavings)}/yr`,
        explanation: SIMPLE_EXPLANATION,
      },
    ];
  } else {
    legalItems = [];
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
  }

  const eeInputs = inputs.employeeExperience;
  const avgProductivity = eeOutput.yearResults.reduce((s, yr) => s + yr.totalMonetaryValue, 0) / contractYears;
  const avgHoursSaved = eeOutput.yearResults.reduce((s, yr) => s + yr.hoursSaved, 0) / contractYears;

  let eeItems: { label: string; value: string; explanation: string }[];
  if (eeInputs.mode === 'simple') {
    eeItems = [
      {
        label: 'Employee Productivity Gains',
        value: `${formatCompactCurrency(summary.productivitySavings)}/yr`,
        explanation: SIMPLE_EXPLANATION,
      },
    ];
  } else {
    eeItems = [
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

  // Pie chart slices — contract totals, with optional per-slice overrides.
  const pieSlices = enabledPillars.map((k) => {
    const defaultLabel = PILLAR_LABELS[k];
    const override = sectionData.pieLabelOverrides?.[defaultLabel];
    return {
      label: override?.label ?? defaultLabel,
      // Keyed by the computed label so renames don't break override lookup.
      computedKey: defaultLabel,
      value: pillarData[k].annual * contractYears,
      formattedValue: override?.value ?? formatCompactCurrency(pillarData[k].annual * contractYears),
    };
  });

  function updatePieLabel(computedKey: string, field: 'label' | 'value', v: string) {
    onDataChange?.({
      ...sectionData,
      pieLabelOverrides: {
        ...(sectionData.pieLabelOverrides ?? {}),
        [computedKey]: { ...(sectionData.pieLabelOverrides?.[computedKey] ?? {}), [field]: v },
      },
    } as unknown as Record<string, unknown>);
  }

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
        {onDataChange ? (
          <DirectEditableText
            as="h2"
            value={sectionData.title ?? 'Investment Case'}
            onChange={updateTitle}
            className="text-3xl sm:text-4xl font-bold mb-2"
          />
        ) : (
          <ResolvedSpan as="h2" className="text-3xl sm:text-4xl font-bold mb-2">
            {sectionData.title ?? 'Investment Case'}
          </ResolvedSpan>
        )}
        <div className="w-16 h-0.5 bg-white/30 mb-10" />

        {invBlocks.order.map((blockId) => {
          const blockProps = {
            blockId,
            isFirst: invBlocks.isFirst(blockId),
            isLast: invBlocks.isLast(blockId),
            canEdit,
            onMoveUp: () => invBlocks.moveUp(blockId),
            onMoveDown: () => invBlocks.moveDown(blockId),
          };
          if (blockId === 'tiles') return (
            <SubBlock key={blockId} {...blockProps}>
              <>

        {/* KPI tiles */}
        <div ref={metricsRef} className={`grid grid-cols-2 ${KPI_GRID_COLS[visibleTileCount(hiddenTiles)]} gap-4 mb-10 ms-fade-up`}>
          {((sectionData.tileOrder ?? TILE_LABELS.map((t) => t.key)) as InvestmentTileKey[])
            .filter((key) => TILE_LABELS.some((t) => t.key === key) && !hiddenTiles.has(key))
            .map((key, index, visibleOrder) => {
              const meta = TILE_LABELS.find((t) => t.key === key)!;
              const defaultLabel = key === 'contract-value'
                ? `${contractYears}-Year Value`
                : key === 'net-value'
                  ? `${contractYears}-Year Net`
                  : meta.label;
              const labelValue = tileLabel(key, defaultLabel);
              const valueValue = sectionData.tileValueOverrides?.[key] ?? meta.defaultValue;
              return (
                <div key={key} className="relative bg-white/10 p-5 rounded-xl text-center backdrop-blur-sm">
                  {canEdit && (
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <button
                        onClick={() => moveTile(key, -1)}
                        disabled={index === 0}
                        title="Move left"
                        className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-white/80 disabled:opacity-30 flex items-center justify-center"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <button
                        onClick={() => moveTile(key, 1)}
                        disabled={index === visibleOrder.length - 1}
                        title="Move right"
                        className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-white/80 disabled:opacity-30 flex items-center justify-center"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  )}
                  {canEdit && <RemoveItemButton onClick={() => hideTile(key)} />}
                  {onDataChange ? (
                    <DirectEditableText
                      as="div"
                      value={valueValue}
                      onChange={(v) => updateTileValue(key, v)}
                      className="text-3xl font-bold mb-1"
                    />
                  ) : (
                    <ResolvedSpan as="div" className="text-3xl font-bold mb-1">{valueValue}</ResolvedSpan>
                  )}
                  {onDataChange ? (
                    <DirectEditableText
                      as="div"
                      value={labelValue}
                      onChange={(v) => updateTileLabel(key, v)}
                      className="text-white/60 text-sm"
                    />
                  ) : (
                    <ResolvedSpan as="div" className="text-white/60 text-sm">{labelValue}</ResolvedSpan>
                  )}
                </div>
              );
            })}
        </div>
        {canEdit && hiddenTiles.size > 0 && (
          <HiddenItemsBar
            items={TILE_LABELS.filter((t) => hiddenTiles.has(t.key)).map((t) => ({ key: t.key, label: t.label }))}
            onRestore={(key) => restoreTile(key as InvestmentTileKey)}
            tone="dark"
          />
        )}
              </>
            </SubBlock>
          );
          if (blockId === 'invReturn') return (
            <SubBlock key={blockId} {...blockProps}>
              <>
        <div className="flex flex-col gap-10 mb-10">
          {/* Investment */}
          <div>
            {onDataChange ? (
              <DirectEditableText
                as="h3"
                value={sectionData.investmentColumnTitle ?? `Your Investment (${contractYears}-Year Contract)`}
                onChange={updateInvestmentColumnTitle}
                className="text-lg font-semibold text-white/70 mb-5"
              />
            ) : (
              <ResolvedSpan as="h3" className="text-lg font-semibold text-white/70 mb-5">
                {sectionData.investmentColumnTitle ?? `Your Investment (${contractYears}-Year Contract)`}
              </ResolvedSpan>
            )}
            <div className="space-y-3">
              {investmentRows.map((row) => {
                const override = sectionData.investmentRowOverrides?.[row.label];
                const label = override?.label ?? row.label;
                const value = override?.value ?? row.value;
                return (
                  <div key={row.label} className="flex justify-between pb-3 border-b border-white/15">
                    {onDataChange ? (
                      <DirectEditableText
                        as="span"
                        value={label}
                        onChange={(v) => updateInvestmentRowLabel(row.label, v)}
                        className="text-white/70"
                      />
                    ) : (
                      <ResolvedSpan as="span" className="text-white/70">{label}</ResolvedSpan>
                    )}
                    {onDataChange ? (
                      <DirectEditableText
                        as="span"
                        value={value}
                        onChange={(v) => onDataChange?.({
                          ...sectionData,
                          investmentRowOverrides: {
                            ...(sectionData.investmentRowOverrides ?? {}),
                            [row.label]: { ...(sectionData.investmentRowOverrides?.[row.label] ?? {}), value: v },
                          },
                        } as unknown as Record<string, unknown>)}
                        className="font-semibold"
                      />
                    ) : (
                      <ResolvedSpan as="span" className="font-semibold">{value}</ResolvedSpan>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col">
            {onDataChange ? (
              <DirectEditableText
                as="h3"
                value={sectionData.returnColumnTitle ?? `Your Return (${contractYears}-Year Contract)`}
                onChange={updateReturnColumnTitle}
                className="text-lg font-semibold text-white/70 mb-5"
              />
            ) : (
              <ResolvedSpan as="h3" className="text-lg font-semibold text-white/70 mb-5">
                {sectionData.returnColumnTitle ?? `Your Return (${contractYears}-Year Contract)`}
              </ResolvedSpan>
            )}
            <div className="w-full max-w-xl mx-auto">
              {pieSlices.length === 1 ? (
                <div className="bg-white/10 rounded-xl p-10 text-center backdrop-blur-sm">
                  {onDataChange ? (
                    <DirectEditableText
                      as="div"
                      value={pieSlices[0].label}
                      onChange={(v) => updatePieLabel(pieSlices[0].computedKey ?? pieSlices[0].label, 'label', v)}
                      className="text-white/60 text-sm font-semibold uppercase tracking-wide mb-2"
                    />
                  ) : (
                    <ResolvedSpan as="div" className="text-white/60 text-sm font-semibold uppercase tracking-wide mb-2">
                      {pieSlices[0].label}
                    </ResolvedSpan>
                  )}
                  {onDataChange ? (
                    <DirectEditableText
                      as="div"
                      value={pieSlices[0].formattedValue}
                      onChange={(v) => updatePieLabel(pieSlices[0].computedKey ?? pieSlices[0].label, 'value', v)}
                      className="text-5xl font-bold"
                    />
                  ) : (
                    <ResolvedSpan as="div" className="text-5xl font-bold">{pieSlices[0].formattedValue}</ResolvedSpan>
                  )}
                </div>
              ) : (
                <ReturnPieChart slices={pieSlices} editable={!!onDataChange} onLabelChange={updatePieLabel} />
              )}
            </div>
          </div>
        </div>

        <MicrositeQuote selectedQuotes={inputs.selectedQuotes} section="investment" dark />
              </>
            </SubBlock>
          );
          if (blockId === 'breakdown') return (
            <SubBlock key={blockId} {...blockProps}>
              <>
        <div ref={breakdownRef} className="ms-fade-up">
          {onDataChange ? (
            <DirectEditableText
              as="h3"
              value={sectionData.breakdownTitle ?? 'Return Breakdown'}
              onChange={updateBreakdownTitle}
              className="text-lg font-semibold text-white/70 mb-6"
            />
          ) : (
            <ResolvedSpan as="h3" className="text-lg font-semibold text-white/70 mb-6">
              {sectionData.breakdownTitle ?? 'Return Breakdown'}
            </ResolvedSpan>
          )}
          <div className={`grid ${pillarGridColsClass(breakdownColumns.length)} gap-4`}>
            {breakdownColumns.map((col) => {
              const colOverride = sectionData.breakdownColumnOverrides?.[col.title];
              const colTitle = colOverride?.title ?? col.title;
              const colTotal = colOverride?.total ?? col.total;
              return (
                <div key={col.title} className="bg-white/5 rounded-xl p-5 backdrop-blur-sm">
                  {onDataChange ? (
                    <DirectEditableText
                      as="h4"
                      value={colTitle}
                      onChange={(v) => updateBreakdownColumnTitle(col.title, v)}
                      className="text-sm font-semibold text-white/80 mb-1"
                    />
                  ) : (
                    <ResolvedSpan as="h4" className="text-sm font-semibold text-white/80 mb-1">{colTitle}</ResolvedSpan>
                  )}
                  {onDataChange ? (
                    <DirectEditableText
                      as="div"
                      value={colTotal}
                      onChange={(v) => onDataChange?.({
                        ...sectionData,
                        breakdownColumnOverrides: {
                          ...(sectionData.breakdownColumnOverrides ?? {}),
                          [col.title]: { ...(sectionData.breakdownColumnOverrides?.[col.title] ?? {}), total: v },
                        },
                      } as unknown as Record<string, unknown>)}
                      className="text-xl font-bold mb-4"
                    />
                  ) : (
                    <ResolvedSpan as="div" className="text-xl font-bold mb-4">{colTotal}</ResolvedSpan>
                  )}
                  <div className="space-y-3">
                    {col.items.map((item) => {
                      const compositeKey = `${col.title}|${item.label}`;
                      const itemOverride = sectionData.breakdownItemOverrides?.[compositeKey];
                      const itemLabel = itemOverride?.label ?? item.label;
                      const itemValue = itemOverride?.value ?? item.value;
                      const itemExplanation = itemOverride?.explanation ?? item.explanation;
                      return (
                        <div key={item.label}>
                          <div className="flex justify-between text-sm">
                            {onDataChange ? (
                              <DirectEditableText
                                as="span"
                                value={itemLabel}
                                onChange={(v) => updateBreakdownItem(compositeKey, 'label', v)}
                                className="text-white/70"
                              />
                            ) : (
                              <ResolvedSpan as="span" className="text-white/70">{itemLabel}</ResolvedSpan>
                            )}
                            {onDataChange ? (
                              <DirectEditableText
                                as="span"
                                value={itemValue}
                                onChange={(v) => updateBreakdownItem(compositeKey, 'value', v)}
                                className="font-semibold"
                              />
                            ) : (
                              <ResolvedSpan as="span" className="font-semibold">{itemValue}</ResolvedSpan>
                            )}
                          </div>
                          {onDataChange ? (
                            <DirectEditableText
                              as="div"
                              multiline
                              value={itemExplanation}
                              onChange={(v) => updateBreakdownItem(compositeKey, 'explanation', v)}
                              className="text-xs text-white/40 mt-0.5"
                            />
                          ) : (
                            <ResolvedSpan as="div" className="text-xs text-white/40 mt-0.5">{itemExplanation}</ResolvedSpan>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
              </>
            </SubBlock>
          );
          return null;
        })}

      </div>
    </section>
  );
}
