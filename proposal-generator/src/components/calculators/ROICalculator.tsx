'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  HROperationsInputs,
  LegalComplianceInputs,
  EmployeeExperienceInputs,
  Tier2Workflow,
  ContractYearSettings,
} from '@/types/proposal';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
  calculateMultiYearProjection,
} from '@/lib/roi-calculator';
import {
  generateEstimates,
  CompanyProfile,
  Industry as BenchmarkIndustry,
  WorkforceType,
  OrgModel,
  INDUSTRY_LABELS,
  WORKFORCE_TYPE_LABELS,
  ORG_MODEL_LABELS,
  BENCHMARK_SOURCES,
  FIELD_SOURCES,
} from '@/lib/benchmarks';
import { formatCurrency, formatCompactCurrency } from '@/lib/pricing-calculator';

/** Round a number to at most 2 decimal places (avoids floating-point display noise). */
const r2 = (n: number) => Math.round(n * 100) / 100;

import {
  DEFAULT_HR_OPERATIONS,
  DEFAULT_LEGAL_COMPLIANCE,
  DEFAULT_EMPLOYEE_EXPERIENCE,
} from '@/types/proposal';

interface ROICalculatorProps {
  hrInputs: HROperationsInputs;
  legalInputs: LegalComplianceInputs;
  employeeInputs: EmployeeExperienceInputs;
  onHRChange: (inputs: Partial<HROperationsInputs>) => void;
  onLegalChange: (inputs: Partial<LegalComplianceInputs>) => void;
  onEmployeeChange: (inputs: Partial<EmployeeExperienceInputs>) => void;
  estimateGenerated: boolean;
  onEstimateGeneratedChange: (value: boolean) => void;
  initialCompanyProfile?: Partial<CompanyProfile>;
  contractTermYears?: number;
}

type TabType = 'hr-operations' | 'legal-compliance' | 'employee-experience' | 'summary';
type Mode = 'quick' | 'detailed';

// Tier 2+ deflection: floor of 50%, scales up with effectiveness → 50 + (eff / 2)
function scaledDeflection(effectiveness: number): number {
  return Math.round(50 + effectiveness / 2);
}

// Tier 2+ effort reduction on remaining work: floor of 75%, scales up → 75 + (eff / 4)
function scaledEffortReduction(effectiveness: number): number {
  return Math.round(75 + effectiveness / 4);
}

export function ROICalculator({
  hrInputs,
  legalInputs,
  employeeInputs,
  onHRChange,
  onLegalChange,
  onEmployeeChange,
  estimateGenerated,
  onEstimateGeneratedChange,
  initialCompanyProfile,
  contractTermYears: externalContractYears,
}: ROICalculatorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('hr-operations');
  const [mode, setMode] = useState<Mode>(estimateGenerated ? 'detailed' : 'quick');
  const [showStartOverDialog, setShowStartOverDialog] = useState(false);
  const [startOverInput, setStartOverInput] = useState('');
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    employeeCount: initialCompanyProfile?.employeeCount || 5000,
    industry: initialCompanyProfile?.industry || 'technology',
    workforceType: initialCompanyProfile?.workforceType || 'mixed',
    orgModel: initialCompanyProfile?.orgModel || 'centralized',
  });
  const [estimatedFields, setEstimatedFields] = useState<Set<string>>(new Set());

  // Keep Quick ROI profile in sync with Deal Info / Pricing values (before estimate is generated)
  useEffect(() => {
    if (!estimateGenerated && initialCompanyProfile) {
      setCompanyProfile((prev) => ({
        ...prev,
        ...initialCompanyProfile,
      }));
    }
  }, [
    estimateGenerated,
    initialCompanyProfile?.employeeCount,
    initialCompanyProfile?.industry,
    initialCompanyProfile?.workforceType,
    initialCompanyProfile?.orgModel,
  ]);

  // Contract years: inherit from pricing page, fall back to HR inputs
  const contractYears = externalContractYears || hrInputs.contractYears || 3;
  const defaultYearSettingsTop = [
    { wisqEffectiveness: 30, workforceChange: 0 },
    { wisqEffectiveness: 60, workforceChange: 5 },
    { wisqEffectiveness: 75, workforceChange: 10 },
    { wisqEffectiveness: 85, workforceChange: 12 },
    { wisqEffectiveness: 90, workforceChange: 15 },
  ];
  const yearSettings = Array.from({ length: contractYears }, (_, i) =>
    (hrInputs.yearSettings || [])[i] ?? defaultYearSettingsTop[i] ?? { wisqEffectiveness: 90, workforceChange: 15 }
  );

  // Sync contractYears into hrInputs if changed externally — also ensure yearSettings has enough entries
  useEffect(() => {
    if (externalContractYears && externalContractYears !== hrInputs.contractYears) {
      const MAX_YEARS = 5;
      const defaultEffectiveness = [30, 60, 75, 85, 90];
      const defaultGrowth = [0, 5, 10, 12, 15];
      const existing = hrInputs.yearSettings || [];
      const newSettings: typeof existing = [];
      for (let i = 0; i < MAX_YEARS; i++) {
        newSettings.push(
          existing[i] ?? {
            wisqEffectiveness: defaultEffectiveness[i] ?? 90,
            workforceChange: defaultGrowth[i] ?? 15,
          }
        );
      }
      onHRChange({ contractYears: externalContractYears, yearSettings: newSettings });
    }
  }, [externalContractYears]);

  // Calculate ROI outputs
  const hrOutput = useMemo(() => calculateHROperationsROI(hrInputs), [hrInputs]);

  const tier2PlusConfiguredCases = hrInputs.tier2Workflows.reduce(
    (sum, w) => sum + w.volumePerYear,
    0
  );

  const tier2PlusTotalCases = hrInputs.tier2PlusTotalCases || Math.round(tier2PlusConfiguredCases * 1.5);

  const legalOutput = useMemo(
    () => calculateLegalComplianceROI(legalInputs, tier2PlusConfiguredCases, yearSettings, contractYears, tier2PlusTotalCases),
    [legalInputs, tier2PlusConfiguredCases, yearSettings, contractYears, tier2PlusTotalCases]
  );

  const employeeOutput = useMemo(
    () => calculateEmployeeExperienceROI(employeeInputs, yearSettings, contractYears),
    [employeeInputs, yearSettings, contractYears]
  );

  const summary = useMemo(
    () => calculateROISummary(hrOutput, legalOutput, employeeOutput, hrInputs.wisqLicenseCost, contractYears),
    [hrOutput, legalOutput, employeeOutput, hrInputs.wisqLicenseCost, contractYears]
  );

  const projection = useMemo(
    () => calculateMultiYearProjection(hrOutput, legalOutput, employeeOutput, hrInputs.wisqLicenseCost),
    [hrOutput, legalOutput, employeeOutput, hrInputs.wisqLicenseCost]
  );

  const tabs = [
    { id: 'hr-operations' as const, label: 'HR Operations' },
    { id: 'legal-compliance' as const, label: 'Legal & Compliance' },
    { id: 'employee-experience' as const, label: 'Employee Experience' },
    { id: 'summary' as const, label: 'Summary' },
  ];

  // Quick ROI: generate estimates from profile
  const handleProfileSubmit = () => {
    const estimates = generateEstimates(companyProfile);
    onHRChange(estimates.hrOps);
    onLegalChange(estimates.legal);
    onEmployeeChange(estimates.empExp);
    setEstimatedFields(estimates.estimatedFields);

    // Auto-enable compliance for small accounts
    if (companyProfile.employeeCount < 2500) {
      onLegalChange({
        auditPrep: estimates.legal.auditPrep
          ? { ...estimates.legal.auditPrep, enabled: true }
          : undefined,
        riskPatternDetection: estimates.legal.riskPatternDetection
          ? { ...estimates.legal.riskPatternDetection, enabled: true }
          : undefined,
        proactiveAlerts: estimates.legal.proactiveAlerts
          ? { ...estimates.legal.proactiveAlerts, enabled: true }
          : undefined,
      });
    }

    setMode('detailed');
    onEstimateGeneratedChange(true);
  };

  const handleSkipToDetailed = () => {
    setEstimatedFields(new Set());
    setMode('detailed');
    onEstimateGeneratedChange(true);
  };

  const handleStartOver = () => {
    onHRChange(DEFAULT_HR_OPERATIONS);
    onLegalChange(DEFAULT_LEGAL_COMPLIANCE);
    onEmployeeChange(DEFAULT_EMPLOYEE_EXPERIENCE);
    setCompanyProfile({
      employeeCount: initialCompanyProfile?.employeeCount || 5000,
      industry: initialCompanyProfile?.industry || 'technology',
      workforceType: initialCompanyProfile?.workforceType || 'mixed',
      orgModel: initialCompanyProfile?.orgModel || 'centralized',
    });
    setEstimatedFields(new Set());
    onEstimateGeneratedChange(false);
    setMode('quick');
    setActiveTab('hr-operations');
    setShowStartOverDialog(false);
    setStartOverInput('');
  };

  // Workflow management
  const addWorkflow = () => {
    // Seed per-year rates from base defaults × current effectiveness
    const ys = hrInputs.yearSettings?.length ? hrInputs.yearSettings : [
      { wisqEffectiveness: 30, workforceChange: 0 },
      { wisqEffectiveness: 60, workforceChange: 5 },
      { wisqEffectiveness: 75, workforceChange: 10 },
    ];
    const newWorkflow: Tier2Workflow = {
      id: `workflow-${Date.now()}`,
      name: `Workflow ${hrInputs.tier2Workflows.length + 1}`,
      volumePerYear: 250,
      timePerWorkflowHours: 0.75,
      deflectionByYear: ys.map(s => scaledDeflection(s.wisqEffectiveness)),
      effortReductionByYear: ys.map(s => scaledEffortReduction(s.wisqEffectiveness)),
    };
    onHRChange({ tier2Workflows: [...hrInputs.tier2Workflows, newWorkflow] });
  };

  const removeWorkflow = (id: string) => {
    onHRChange({ tier2Workflows: hrInputs.tier2Workflows.filter((w) => w.id !== id) });
  };

  const updateWorkflow = (id: string, updates: Partial<Tier2Workflow>) => {
    onHRChange({
      tier2Workflows: hrInputs.tier2Workflows.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    });
  };

  // Quick ROI mode - only show if estimate hasn't been generated yet
  if (mode === 'quick' && !estimateGenerated) {
    return (
      <CompanyProfileStep
        profile={companyProfile}
        onChange={setCompanyProfile}
        onSubmit={handleProfileSubmit}
        onSkip={handleSkipToDetailed}
      />
    );
  }

  // Business case narrative
  const narrative = generateBusinessCaseNarrative(summary, hrOutput, companyProfile);

  return (
    <div className="space-y-6">
      {/* Profile Banner */}
      {estimatedFields.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div>
            <p className="text-sm font-medium text-blue-900">
              Based on estimates for a {INDUSTRY_LABELS[companyProfile.industry]} company with{' '}
              {companyProfile.employeeCount.toLocaleString()} employees
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Refine inputs below for a more accurate picture.
            </p>
          </div>
        </div>
      )}

      {/* Start Over Dialog */}
      {showStartOverDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Over?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will discard all ROI inputs and return to the Quick ROI Assessment. All progress will be lost.
            </p>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-bold">Start Over</span> to confirm:
            </p>
            <input
              type="text"
              value={startOverInput}
              onChange={(e) => setStartOverInput(e.target.value)}
              placeholder="Start Over"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowStartOverDialog(false);
                  setStartOverInput('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleStartOver}
                disabled={startOverInput !== 'Start Over'}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                  startOverInput === 'Start Over'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-red-300 cursor-not-allowed'
                }`}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Small Account Banner */}
      {companyProfile.employeeCount < 2500 && estimatedFields.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            For organizations your size, the strongest ROI typically comes from{' '}
            <span className="font-semibold">compliance risk reduction</span> and{' '}
            <span className="font-semibold">manager time savings</span> rather than headcount
            reduction. The compliance and risk sections have been pre-enabled.
          </p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-[#03143B] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'hr-operations' && (
        <HROperationsTab
          inputs={hrInputs}
          output={hrOutput}
          onChange={onHRChange}
          onAddWorkflow={addWorkflow}
          onRemoveWorkflow={removeWorkflow}
          onUpdateWorkflow={updateWorkflow}
          estimatedFields={estimatedFields}
          employeeCount={companyProfile.employeeCount}
        />
      )}

      {activeTab === 'legal-compliance' && (
        <LegalComplianceTab
          inputs={legalInputs}
          output={legalOutput}
          onChange={onLegalChange}
          tier2PlusConfiguredCases={tier2PlusConfiguredCases}
          tier2PlusTotalCases={tier2PlusTotalCases}
          yearSettings={yearSettings}
          contractYears={contractYears}
          estimatedFields={estimatedFields}
        />
      )}

      {activeTab === 'employee-experience' && (
        <EmployeeExperienceTab
          inputs={employeeInputs}
          output={employeeOutput}
          onChange={onEmployeeChange}
          estimatedFields={estimatedFields}
          contractYears={contractYears}
          yearSettings={yearSettings}
        />
      )}

      {activeTab === 'summary' && (
        <SummaryTab
          summary={summary}
          projection={projection}
          hrOutput={hrOutput}
          legalOutput={legalOutput}
          employeeOutput={employeeOutput}
          wisqLicenseCost={hrInputs.wisqLicenseCost}
          narrative={narrative}
          contractYears={contractYears}
        />
      )}

      {/* Start Over */}
      <div className="border-t border-gray-200 pt-4 mt-6">
        <button
          onClick={() => setShowStartOverDialog(true)}
          className="text-sm text-red-600 hover:text-red-800 underline"
        >
          Start over from scratch
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Company Profile Step (Quick ROI)
// ──────────────────────────────────────────────

function CompanyProfileStep({
  profile,
  onChange,
  onSubmit,
  onSkip,
}: {
  profile: CompanyProfile;
  onChange: (profile: CompanyProfile) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  const industries: BenchmarkIndustry[] = [
    'healthcare',
    'retail',
    'hospitality',
    'manufacturing',
    'financial-services',
    'technology',
    'professional-services',
    'other',
  ];

  const workforceTypes: WorkforceType[] = ['frontline-heavy', 'knowledge-worker', 'mixed'];
  const orgModels: OrgModel[] = ['centralized', 'federated'];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-[#03143B] mb-2">Quick ROI Estimate</h3>
        <p className="text-gray-600">
          Answer 4 questions to see what ROI typically looks like for your organization.
        </p>
        <button
          onClick={onSkip}
          className="text-sm text-[#6b7fff] hover:text-[#03143B] mt-2 underline"
        >
          Skip to detailed inputs
        </button>
      </div>

      {/* Employee Count */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-[#03143B] mb-3">
          How many employees does this company have?
        </label>
        <input
          type="number"
          value={profile.employeeCount}
          onChange={(e) => onChange({ ...profile, employeeCount: Number(e.target.value) || 0 })}
          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03143B] focus:border-transparent"
          placeholder="e.g. 5000"
        />
      </div>

      {/* Industry */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-[#03143B] mb-3">Industry</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {industries.map((ind) => (
            <button
              key={ind}
              onClick={() => onChange({ ...profile, industry: ind })}
              className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                profile.industry === ind
                  ? 'border-[#03143B] bg-[#03143B] text-white'
                  : 'border-gray-200 text-gray-700 hover:border-gray-400'
              }`}
            >
              {INDUSTRY_LABELS[ind]}
            </button>
          ))}
        </div>
      </div>

      {/* Workforce Type */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-[#03143B] mb-3">Workforce Type</label>
        <div className="grid grid-cols-3 gap-3">
          {workforceTypes.map((wt) => (
            <button
              key={wt}
              onClick={() => onChange({ ...profile, workforceType: wt })}
              className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                profile.workforceType === wt
                  ? 'border-[#03143B] bg-[#03143B] text-white'
                  : 'border-gray-200 text-gray-700 hover:border-gray-400'
              }`}
            >
              {WORKFORCE_TYPE_LABELS[wt]}
            </button>
          ))}
        </div>
      </div>

      {/* Org Model */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-[#03143B] mb-3">
          HR Organization Model
        </label>
        <div className="grid grid-cols-2 gap-3">
          {orgModels.map((om) => (
            <button
              key={om}
              onClick={() => onChange({ ...profile, orgModel: om })}
              className={`p-4 rounded-lg border text-sm font-medium transition-all ${
                profile.orgModel === om
                  ? 'border-[#03143B] bg-[#03143B] text-white'
                  : 'border-gray-200 text-gray-700 hover:border-gray-400'
              }`}
            >
              {ORG_MODEL_LABELS[om]}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={onSubmit}
        className="w-full py-4 bg-[#03143B] text-white rounded-lg font-semibold text-lg hover:bg-[#020e29] transition-colors"
      >
        Generate ROI Estimate
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────
// Collapsible Section
// ──────────────────────────────────────────────

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-[#03143B] text-sm">{title}</h4>
          {badge && (
            <span className="text-sm font-bold text-white bg-[#2563eb] px-3 py-1 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">{children}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────
// HR Operations Tab
// ──────────────────────────────────────────────

// Non-linear workforce change steps: fine increments near 0, wider as we go out
const WORKFORCE_STEPS = [
  -50, -40, -30, -25, -20, -15,
  -10, -9, -8, -7, -6, -5, -4, -3, -2, -1,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 125, 150, 175, 200,
];

function workforceValueToSlider(value: number): number {
  // Find the closest step
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < WORKFORCE_STEPS.length; i++) {
    const dist = Math.abs(WORKFORCE_STEPS[i] - value);
    if (dist < bestDist) { bestDist = dist; bestIdx = i; }
  }
  return bestIdx;
}

function workforceSliderToValue(pos: number): number {
  return WORKFORCE_STEPS[Math.max(0, Math.min(WORKFORCE_STEPS.length - 1, Math.round(pos)))];
}

// Pastel palette for workflow segments (deflected uses darker version)
const WORKFLOW_COLORS = [
  { pastel: '#a5b4fc', dark: '#4f46e5' }, // indigo
  { pastel: '#86efac', dark: '#16a34a' }, // green
  { pastel: '#fcd34d', dark: '#d97706' }, // amber
  { pastel: '#f9a8d4', dark: '#db2777' }, // pink
  { pastel: '#67e8f9', dark: '#0891b2' }, // cyan
  { pastel: '#c4b5fd', dark: '#7c3aed' }, // violet
  { pastel: '#fca5a5', dark: '#dc2626' }, // red
  { pastel: '#fdba74', dark: '#ea580c' }, // orange
];

const TIER01_COLORS = { pastel: '#bfdbfe', dark: '#1e40af' }; // blue
const OTHER_TIER2_COLOR = { pastel: '#e5e7eb', dark: '#6b7280' }; // gray

interface RingSegment {
  label: string;
  value: number;
  color: string;
  detail: string; // formatted value shown in tooltip
  tier: 'tier01' | 'tier2';
}

/** Inner ring segment with radial split: deflected (outer) + remaining (inner, gray) */
interface InnerSlice {
  name: string;
  totalValue: number; // total determines angular share
  deflectedValue: number;
  remainingValue: number;
  deflectedColor: string;
  remainingColor: string;
  deflectedDetail: string;
  remainingDetail: string;
}

// Builds an arc/wedge path. When innerR is 0, draws a pie wedge to center.
function arcPath(cx: number, cy: number, outerR: number, innerR: number, startAngle: number, endAngle: number): string {
  const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
  const x1o = cx + outerR * Math.cos(startAngle);
  const y1o = cy + outerR * Math.sin(startAngle);
  const x2o = cx + outerR * Math.cos(endAngle);
  const y2o = cy + outerR * Math.sin(endAngle);

  if (innerR < 0.5) {
    // Pie wedge to center
    return [
      `M ${cx} ${cy}`,
      `L ${x1o} ${y1o}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2o} ${y2o}`,
      'Z',
    ].join(' ');
  }

  return [
    `M ${x1o} ${y1o}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2o} ${y2o}`,
    `L ${cx + innerR * Math.cos(endAngle)} ${cy + innerR * Math.sin(endAngle)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${cx + innerR * Math.cos(startAngle)} ${cy + innerR * Math.sin(startAngle)}`,
    'Z',
  ].join(' ');
}

function TwoRingChart({
  outerSegments,
  innerSlices,
  size = 200,
}: {
  outerSegments: RingSegment[];
  innerSlices: InnerSlice[];
  size?: number;
}) {
  const [hover, setHover] = useState<{ label: string; detail: string; tier: 'tier01' | 'tier2'; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 4; // full radius

  // Compute area-proportional boundary between outer and inner rings.
  const outerTotal = outerSegments.reduce((s, seg) => s + seg.value, 0);
  const innerTotal = innerSlices.reduce((s, sl) => s + sl.totalValue, 0);
  const grandTotal = outerTotal + innerTotal;

  // midR is the boundary: inner disc goes from 0 to midR, outer ring from midR to R
  const innerFrac = grandTotal > 0 ? innerTotal / grandTotal : 0;
  const midR = R * Math.sqrt(innerFrac);

  const handleMouseMove = (e: React.MouseEvent, label: string, detail: string, tier: 'tier01' | 'tier2') => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setHover({ label, detail, tier, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  // Render outer ring (Tier 0/1) — simple sequential segments
  const renderOuterRing = () => {
    const total = outerSegments.reduce((s, seg) => s + seg.value, 0);
    if (total === 0) return null;
    let cum = -Math.PI / 2;
    return outerSegments.filter(s => s.value > 0).map((seg) => {
      const angle = (seg.value / total) * Math.PI * 2;
      const start = cum;
      cum += angle;
      return (
        <path
          key={seg.label}
          d={arcPath(cx, cy, R, midR, start, cum)}
          fill={seg.color}
          stroke="white"
          strokeWidth="1"
          onMouseMove={(e) => handleMouseMove(e, seg.label, seg.detail, seg.tier)}
          onMouseLeave={() => setHover(null)}
          className="cursor-pointer transition-opacity hover:opacity-80"
        />
      );
    });
  };

  // Render inner disc (Tier 2+) — each slice is split radially:
  //   outer part (deflected, colored) + inner part (remaining, gray)
  const renderInnerDisc = () => {
    if (innerTotal === 0) return null;
    let cum = -Math.PI / 2;
    const paths: React.ReactNode[] = [];
    for (const slice of innerSlices) {
      if (slice.totalValue <= 0) continue;
      const angle = (slice.totalValue / innerTotal) * Math.PI * 2;
      const startAngle = cum;
      const endAngle = cum + angle;
      cum = endAngle;

      // Radial split: remaining (gray) in inner area, deflected (colored) in outer area
      // Area-proportional: splitR² - 0² = remainingFrac * midR²
      const remainingFrac = slice.totalValue > 0 ? slice.remainingValue / slice.totalValue : 0;
      const splitR = midR * Math.sqrt(remainingFrac);

      // Remaining (gray, inner) — from 0 to splitR
      if (slice.remainingValue > 0) {
        paths.push(
          <path
            key={`${slice.name}-remaining`}
            d={arcPath(cx, cy, splitR, 0, startAngle, endAngle)}
            fill={slice.remainingColor}
            stroke="white"
            strokeWidth="1"
            onMouseMove={(e) => handleMouseMove(e, `${slice.name} — Remaining`, slice.remainingDetail, 'tier2')}
            onMouseLeave={() => setHover(null)}
            className="cursor-pointer transition-opacity hover:opacity-80"
          />
        );
      }

      // Deflected (colored, outer) — from splitR to midR
      if (slice.deflectedValue > 0) {
        paths.push(
          <path
            key={`${slice.name}-deflected`}
            d={arcPath(cx, cy, midR, splitR, startAngle, endAngle)}
            fill={slice.deflectedColor}
            stroke="white"
            strokeWidth="1"
            onMouseMove={(e) => handleMouseMove(e, `${slice.name} — Deflected`, slice.deflectedDetail, 'tier2')}
            onMouseLeave={() => setHover(null)}
            className="cursor-pointer transition-opacity hover:opacity-80"
          />
        );
      }
    }
    return paths;
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer ring: Tier 0/1 (from midR to R) */}
        {outerTotal > 0 && renderOuterRing()}
        {/* Inner disc: Tier 2+ (from 0 to midR) — radially split per workflow */}
        {innerTotal > 0 && renderInnerDisc()}
      </svg>
      {/* Tooltip */}
      {hover && (
        <div
          className="absolute z-20 pointer-events-none bg-[#03143B] text-white text-xs rounded-md px-2.5 py-1.5 shadow-lg whitespace-nowrap"
          style={{ left: hover.x + 12, top: hover.y - 8, transform: 'translateY(-100%)' }}
        >
          <div className="text-gray-400 text-[10px] mb-0.5">
            {hover.tier === 'tier01' ? '◉ Simple Cases (Tier 0/1)' : '◈ Complex Workflows (Tier 2+)'}
          </div>
          <div className="font-semibold">{hover.label}</div>
          <div className="text-gray-300">{hover.detail}</div>
        </div>
      )}
    </div>
  );
}

type ChartMode = 'cases' | 'time';

function CaseloadDashboard({
  inputs,
  output,
  onChange,
  estimatedFields,
  yearColors,
}: {
  inputs: HROperationsInputs;
  output: ReturnType<typeof calculateHROperationsROI>;
  onChange: (inputs: Partial<HROperationsInputs>) => void;
  estimatedFields: Set<string>;
  yearColors: string[];
}) {
  const [selectedYear, setSelectedYear] = useState(0);
  const [chartMode, setChartMode] = useState<ChartMode>('cases');

  const contractYears = inputs.contractYears || 3;
  const defaultYS = [
    { wisqEffectiveness: 30, workforceChange: 0 },
    { wisqEffectiveness: 60, workforceChange: 5 },
    { wisqEffectiveness: 75, workforceChange: 10 },
    { wisqEffectiveness: 85, workforceChange: 12 },
    { wisqEffectiveness: 90, workforceChange: 15 },
  ];
  const yearSettings = Array.from({ length: contractYears }, (_, i) =>
    (inputs.yearSettings || [])[i] ?? defaultYS[i] ?? { wisqEffectiveness: 90, workforceChange: 15 }
  );

  // Configured workflow sum
  const configuredWorkflowSum = inputs.tier2Workflows.reduce((s, wf) => s + wf.volumePerYear, 0);

  // Auto-default tier2PlusTotalCases if not set or 0
  const tier2PlusTotalCases = inputs.tier2PlusTotalCases || Math.round(configuredWorkflowSum * 1.5);
  const totalCases = (inputs.tier01CasesPerYear || 0) + tier2PlusTotalCases;

  // Reconciliation warning
  const warningThreshold = Math.round(configuredWorkflowSum * 1.25);
  const showWarning = tier2PlusTotalCases > 0 && configuredWorkflowSum > 0 && tier2PlusTotalCases < warningThreshold;

  // Data for selected year
  const yr = output.yearResults[selectedYear];
  const volMult = yr?.volumeMultiplier ?? 1;

  // --- Tier 0/1 breakdown ---
  const tier01Total = (inputs.tier01CasesPerYear || 0) * volMult;
  const tier01DeflectionByYear = inputs.tier01DeflectionByYear?.length
    ? inputs.tier01DeflectionByYear
    : yearSettings.map(s => s.wisqEffectiveness);
  const tier01DeflRate = (tier01DeflectionByYear[selectedYear] ?? 0) / 100;
  const tier01DeflectedCases = Math.round(tier01Total * tier01DeflRate);
  const tier01RemainingCases = Math.round(tier01Total - tier01DeflectedCases);

  // Time for Tier 0/1 (minutes)
  const tier01DeflectedMin = tier01DeflectedCases * inputs.tier01AvgHandleTime;
  const tier01RemainingMin = tier01RemainingCases * inputs.tier01AvgHandleTime;

  // --- Tier 2+ per-workflow breakdown ---
  interface WfBreakdown { name: string; deflectedCases: number; remainingCases: number; deflectedMin: number; remainingMin: number; colorIdx: number; }
  const wfBreakdowns: WfBreakdown[] = [];
  let configuredCasesScaled = 0;
  inputs.tier2Workflows.forEach((wf, i) => {
    const wfCases = wf.volumePerYear * volMult;
    configuredCasesScaled += wfCases;
    const deflArr = wf.deflectionByYear?.length ? wf.deflectionByYear : null;
    const deflRate = (deflArr ? (deflArr[selectedYear] ?? 0) : 50) / 100;
    const effArr = wf.effortReductionByYear?.length ? wf.effortReductionByYear : null;
    const effRate = (effArr ? (effArr[selectedYear] ?? 0) : 75) / 100;
    const deflected = Math.round(wfCases * deflRate);
    const remaining = Math.round(wfCases - deflected);
    // Time: deflected cases take 0 time; remaining cases are reduced by effort reduction
    const remainingMin = remaining * wf.timePerWorkflowHours * 60 * (1 - effRate);
    const deflectedMin = deflected * wf.timePerWorkflowHours * 60; // time that would have been spent
    wfBreakdowns.push({ name: wf.name, deflectedCases: deflected, remainingCases: remaining, deflectedMin, remainingMin, colorIdx: i });
  });

  // Other unconfigured Tier 2+ cases
  const otherTier2Cases = Math.max(0, Math.round(tier2PlusTotalCases * volMult - configuredCasesScaled));
  // Use stored avg time per case, or fall back to weighted average of configured workflows
  const weightedAvgHours = configuredWorkflowSum > 0
    ? inputs.tier2Workflows.reduce((s, wf) => s + wf.timePerWorkflowHours * wf.volumePerYear, 0) / configuredWorkflowSum
    : 0.75;
  const avgWfHours = inputs.tier2PlusAvgTimePerCase ?? weightedAvgHours;
  const otherTier2Min = otherTier2Cases * avgWfHours * 60;

  // Total time across everything (for percentage mode)
  const totalTimeMin = tier01DeflectedMin + tier01RemainingMin
    + wfBreakdowns.reduce((s, wf) => s + wf.deflectedMin + wf.remainingMin, 0)
    + otherTier2Min;

  const fmtCases = (n: number) => `${n.toLocaleString()} cases`;
  const fmtTime = (min: number) => {
    const hrs = min / 60;
    if (totalTimeMin === 0) return '0%';
    return `${(min / totalTimeMin * 100).toFixed(1)}% (${Math.round(hrs).toLocaleString()} hrs)`;
  };

  // Build ring segments based on mode
  const isCases = chartMode === 'cases';

  // Gray shades for non-Wisq remaining work
  const REMAINING_GRAY_LIGHT = '#d1d5db'; // T0/1 remaining
  const REMAINING_GRAY_DARK = '#9ca3af';  // T2+ remaining

  const outerSegments: RingSegment[] = [
    {
      label: 'Deflected by Wisq',
      value: isCases ? tier01DeflectedCases : tier01DeflectedMin,
      color: TIER01_COLORS.dark,
      detail: isCases ? fmtCases(tier01DeflectedCases) : fmtTime(tier01DeflectedMin),
      tier: 'tier01',
    },
    {
      label: 'Remaining (human-handled)',
      value: isCases ? tier01RemainingCases : tier01RemainingMin,
      color: REMAINING_GRAY_LIGHT,
      detail: isCases ? fmtCases(tier01RemainingCases) : fmtTime(tier01RemainingMin),
      tier: 'tier01',
    },
  ];

  const innerSlices: InnerSlice[] = [];
  wfBreakdowns.forEach((wf) => {
    const colors = WORKFLOW_COLORS[wf.colorIdx % WORKFLOW_COLORS.length];
    const deflVal = isCases ? wf.deflectedCases : wf.deflectedMin;
    const remVal = isCases ? wf.remainingCases : wf.remainingMin;
    innerSlices.push({
      name: wf.name,
      totalValue: deflVal + remVal,
      deflectedValue: deflVal,
      remainingValue: remVal,
      deflectedColor: colors.dark,
      remainingColor: REMAINING_GRAY_DARK,
      deflectedDetail: isCases ? fmtCases(wf.deflectedCases) : fmtTime(wf.deflectedMin),
      remainingDetail: isCases ? fmtCases(wf.remainingCases) : fmtTime(wf.remainingMin),
    });
  });
  if (otherTier2Cases > 0) {
    // Unconfigured: all remaining (gray), no deflection
    innerSlices.push({
      name: 'Other (unconfigured)',
      totalValue: isCases ? otherTier2Cases : otherTier2Min,
      deflectedValue: 0,
      remainingValue: isCases ? otherTier2Cases : otherTier2Min,
      deflectedColor: REMAINING_GRAY_DARK,
      remainingColor: REMAINING_GRAY_DARK,
      deflectedDetail: '',
      remainingDetail: isCases ? fmtCases(otherTier2Cases) : fmtTime(otherTier2Min),
    });
  }

  // Tier-level totals for summary bubbles
  const tier01TotalCases = Math.round(tier01Total);
  const tier2TotalCases = Math.round(tier2PlusTotalCases * volMult);
  const totalCasesScaled = tier01TotalCases + tier2TotalCases;

  // Current baseline hours (no Wisq — all cases at full handle time)
  const tier01CurrentMin = tier01Total * inputs.tier01AvgHandleTime;
  const tier2CurrentMin = inputs.tier2Workflows.reduce(
    (s, wf) => s + wf.volumePerYear * volMult * wf.timePerWorkflowHours * 60, 0
  ) + otherTier2Min;
  const totalHrs = Math.round((tier01CurrentMin + tier2CurrentMin) / 60);
  const tier01Hrs = Math.round(tier01CurrentMin / 60);
  const tier2Hrs = Math.round(tier2CurrentMin / 60);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-[#03143B]/20 p-6">
      {/* Top bar: title + year pills + mode toggle */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-[#03143B]">Caseload & Hours Saved Dashboard</h4>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {Array.from({ length: contractYears }).map((_, i) => (
              <button
                key={i}
                onClick={() => setSelectedYear(i)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                  selectedYear === i ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={selectedYear === i ? { backgroundColor: yearColors[i % yearColors.length] } : {}}
              >
                Y{i + 1}
              </button>
            ))}
          </div>
          <div className="flex bg-gray-100 rounded-md p-0.5">
            <button
              onClick={() => setChartMode('cases')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                chartMode === 'cases' ? 'bg-white text-[#03143B] shadow-sm' : 'text-gray-500'
              }`}
            >
              Cases
            </button>
            <button
              onClick={() => setChartMode('time')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                chartMode === 'time' ? 'bg-white text-[#03143B] shadow-sm' : 'text-gray-500'
              }`}
            >
              % Time
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* LEFT: Chart (40%) */}
        <div className="w-[40%] shrink-0 space-y-3">
          {/* Two-ring chart */}
          <div className="flex justify-center">
            <TwoRingChart
              outerSegments={outerSegments}
              innerSlices={innerSlices}
            />
          </div>

          {/* Tier breakdown below chart */}
          {(() => {
            const yr = output.yearResults[selectedYear];
            const outerVal = outerSegments.reduce((s, seg) => s + seg.value, 0);
            const innerVal = innerSlices.reduce((s, sl) => s + sl.totalValue, 0);
            const gTotal = outerVal + innerVal;
            const t01Pct = gTotal > 0 ? (outerVal / gTotal * 100).toFixed(1) : '0';
            const t2Pct = gTotal > 0 ? (innerVal / gTotal * 100).toFixed(1) : '0';

            // Tier-specific reduction %
            const t01CurrentMin = tier01DeflectedMin + tier01RemainingMin;
            const t01FutureMin = tier01RemainingMin; // remaining is what's left after Wisq
            const t01RedPct = t01CurrentMin > 0 ? ((t01CurrentMin - t01FutureMin) / t01CurrentMin * 100).toFixed(0) : '0';

            const t2CurrentMin = wfBreakdowns.reduce((s, wf) => s + wf.deflectedMin + wf.remainingMin, 0) + otherTier2Min;
            const t2FutureMin = wfBreakdowns.reduce((s, wf) => s + wf.remainingMin, 0) + otherTier2Min;
            const t2RedPct = t2CurrentMin > 0 ? ((t2CurrentMin - t2FutureMin) / t2CurrentMin * 100).toFixed(0) : '0';

            const totalRedPct = yr ? (yr.workloadReductionPercent * 100).toFixed(1) : '0';

            return (
              <div className="space-y-2">
                {/* Header row: T0/1 | T2+ */}
                <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 items-center">
                  <div />
                  <div className="text-[10px] text-gray-400 font-medium text-center">◉ Simple T0/1</div>
                  <div className="text-[10px] text-gray-400 font-medium text-center">◈ Complex T2+</div>
                </div>

                {/* Current Breakdown row */}
                <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-0 items-center">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium pr-1 [writing-mode:vertical-lr] rotate-180 row-span-1 self-center"
                  >Current</div>
                  <div className="bg-white rounded px-3 py-1.5 text-center border border-gray-100">
                    <div className="text-sm font-bold text-[#03143B]">{t01Pct}%</div>
                    <div className="text-[10px] text-gray-500">
                      {isCases ? `${tier01TotalCases.toLocaleString()} cases` : `${tier01Hrs.toLocaleString()} hrs`}
                    </div>
                  </div>
                  <div className="bg-white rounded px-3 py-1.5 text-center border border-gray-100">
                    <div className="text-sm font-bold text-[#03143B]">{t2Pct}%</div>
                    <div className="text-[10px] text-gray-500">
                      {isCases ? `${tier2TotalCases.toLocaleString()} cases` : `${tier2Hrs.toLocaleString()} hrs`}
                    </div>
                  </div>
                </div>

                {/* Wisq Reduction row */}
                <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-0 items-center">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium pr-1 [writing-mode:vertical-lr] rotate-180 row-span-1 self-center"
                  >Wisq</div>
                  <div className="bg-white rounded px-3 py-1.5 text-center border border-gray-100">
                    <div className="text-sm font-bold text-emerald-600">−{t01RedPct}%</div>
                    <div className="text-[10px] text-gray-500">{Math.round(yr?.tier01HoursSaved ?? 0).toLocaleString()} hrs saved</div>
                  </div>
                  <div className="bg-white rounded px-3 py-1.5 text-center border border-gray-100">
                    <div className="text-sm font-bold text-emerald-600">−{t2RedPct}%</div>
                    <div className="text-[10px] text-gray-500">{Math.round(yr?.tier2HoursSaved ?? 0).toLocaleString()} hrs saved</div>
                  </div>
                </div>

                {/* Total reduction */}
                <div className="bg-[#03143B] rounded-lg px-3 py-2.5 text-center">
                  <div className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Overall Reduction</div>
                  <div className="text-xl font-bold text-white">−{totalRedPct}%</div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* RIGHT: Summary bubbles + Hours Saved table (60%) */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Summary bubbles */}
          <div className="grid grid-cols-3 gap-3">
            {isCases ? (
              <>
                <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Total Cases</p>
                  <p className="text-xl font-bold text-[#03143B]">{totalCasesScaled.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">◉ Tier 0/1</p>
                  <p className="text-xl font-bold text-[#03143B]">{tier01TotalCases.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">◈ Tier 2+</p>
                  <p className="text-xl font-bold text-[#03143B]">{tier2TotalCases.toLocaleString()}</p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Total Hours</p>
                  <p className="text-xl font-bold text-[#03143B]">{totalHrs.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">◉ Tier 0/1</p>
                  <p className="text-xl font-bold text-[#03143B]">{tier01Hrs.toLocaleString()} hrs</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">◈ Tier 2+</p>
                  <p className="text-xl font-bold text-[#03143B]">{tier2Hrs.toLocaleString()} hrs</p>
                </div>
              </>
            )}
          </div>

          {/* Hours Saved table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 text-gray-600 font-medium">Year</th>
                  <th className="text-right py-2 px-3 text-gray-600 font-medium">Current Hrs</th>
                  <th className="text-right py-2 px-3 text-gray-600 font-medium">With Wisq</th>
                  <th className="text-right py-2 px-3 text-gray-600 font-medium">◉ T0/1 Saved</th>
                  <th className="text-right py-2 px-3 text-gray-600 font-medium">◈ T2+ Saved</th>
                  <th className="text-right py-2 pl-3 text-gray-600 font-medium">Reduction</th>
                </tr>
              </thead>
              <tbody>
                {output.yearResults.map((yr) => {
                  const isSelected = selectedYear === yr.year - 1;
                  return (
                    <tr
                      key={yr.year}
                      className={`cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-[#2563eb] bg-blue-50' : 'border-b border-gray-100 hover:bg-gray-50'}`}
                      onClick={() => setSelectedYear(yr.year - 1)}
                      style={isSelected ? { borderLeft: `3px solid ${yearColors[(yr.year - 1) % yearColors.length]}` } : {}}
                    >
                      <td className={`py-2 pr-4 font-medium ${isSelected ? 'pl-2' : ''}`} style={{ color: yearColors[(yr.year - 1) % yearColors.length] }}>
                        Year {yr.year} {isSelected && '◀'} <span className="text-gray-400 font-normal text-xs">({yr.volumeMultiplier.toFixed(2)}x)</span>
                      </td>
                      <td className={`text-right py-2 px-3 ${isSelected ? 'text-[#03143B] font-medium' : 'text-gray-700'}`}>{Math.round(yr.currentTotalMinutes / 60).toLocaleString()}</td>
                      <td className={`text-right py-2 px-3 ${isSelected ? 'text-[#03143B] font-medium' : 'text-gray-700'}`}>{Math.round(yr.futureTotalMinutes / 60).toLocaleString()}</td>
                      <td className="text-right py-2 px-3 font-semibold text-[#03143B]">{Math.round(yr.tier01HoursSaved).toLocaleString()}</td>
                      <td className="text-right py-2 px-3 font-semibold text-[#03143B]">{Math.round(yr.tier2HoursSaved).toLocaleString()}</td>
                      <td className="text-right py-2 pl-3 font-semibold text-[#03143B]">{(yr.workloadReductionPercent * 100).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#03143B]/20">
                  <td className="py-2 pr-4 font-semibold text-[#03143B]">Total</td>
                  <td className="text-right py-2 px-3" />
                  <td className="text-right py-2 px-3" />
                  <td className="text-right py-2 px-3 font-bold text-[#03143B]">{Math.round(output.yearResults.reduce((s, yr) => s + yr.tier01HoursSaved, 0)).toLocaleString()}</td>
                  <td className="text-right py-2 px-3 font-bold text-[#03143B]">{Math.round(output.yearResults.reduce((s, yr) => s + yr.tier2HoursSaved, 0)).toLocaleString()}</td>
                  <td className="text-right py-2 pl-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditableWorkflowName({ name, onChange }: { name: string; onChange: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => { if (e.key === 'Enter') setEditing(false); }}
        className="text-sm font-medium text-gray-700 bg-white px-2 py-0.5 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#03143B]"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="text-sm font-medium text-gray-700 cursor-pointer hover:text-[#03143B] hover:underline"
      title="Click to rename"
    >
      {name}
    </span>
  );
}

function HROperationsTab({
  inputs,
  output,
  onChange,
  onAddWorkflow,
  onRemoveWorkflow,
  onUpdateWorkflow,
  estimatedFields,
  employeeCount,
}: {
  inputs: HROperationsInputs;
  output: ReturnType<typeof calculateHROperationsROI>;
  onChange: (inputs: Partial<HROperationsInputs>) => void;
  onAddWorkflow: () => void;
  onRemoveWorkflow: (id: string) => void;
  onUpdateWorkflow: (id: string, updates: Partial<Tier2Workflow>) => void;
  estimatedFields: Set<string>;
  employeeCount: number;
}) {
  const YEAR_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];

  // Track which sliders the user has manually dragged (local to session)
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());

  // Normalize for old data that may lack new fields — always ensure enough entries for contractYears
  const contractYears = inputs.contractYears || 3;
  const defaultYearSettings = [
    { wisqEffectiveness: 30, workforceChange: 0 },
    { wisqEffectiveness: 60, workforceChange: 5 },
    { wisqEffectiveness: 75, workforceChange: 10 },
    { wisqEffectiveness: 85, workforceChange: 12 },
    { wisqEffectiveness: 90, workforceChange: 15 },
  ];
  const yearSettings = Array.from({ length: contractYears }, (_, i) =>
    (inputs.yearSettings || [])[i] ?? defaultYearSettings[i] ?? { wisqEffectiveness: 90, workforceChange: 15 }
  );

  const tier01DeflectionByYear = inputs.tier01DeflectionByYear?.length
    ? inputs.tier01DeflectionByYear
    : yearSettings.map(s => s.wisqEffectiveness);

  // When effectiveness changes at top, propagate to all unmodified sliders
  const updateYearSetting = (yearIndex: number, updates: Partial<ContractYearSettings>) => {
    const newSettings = [...yearSettings];
    // Monotonic clamping for effectiveness: year N cannot exceed year N+1
    if ('wisqEffectiveness' in updates) {
      const raw = updates.wisqEffectiveness!;
      const lo = yearIndex > 0 ? newSettings[yearIndex - 1].wisqEffectiveness : 0;
      const hi = yearIndex < newSettings.length - 1 ? newSettings[yearIndex + 1].wisqEffectiveness : 100;
      updates = { ...updates, wisqEffectiveness: Math.max(lo, Math.min(hi, raw)) };
    }
    newSettings[yearIndex] = { ...newSettings[yearIndex], ...updates };

    const batch: Partial<HROperationsInputs> = { yearSettings: newSettings };

    if ('wisqEffectiveness' in updates) {
      // Recompute unmodified sliders based on new effectiveness
      // Tier 0-1 deflection = effectiveness directly
      if (!modifiedFields.has('tier01Deflection')) {
        batch.tier01DeflectionByYear = newSettings.map(s => s.wisqEffectiveness);
      }

      // Workflow deflection & effort reduction
      const updatedWorkflows = inputs.tier2Workflows.map(wf => {
        const updated = { ...wf };
        if (!modifiedFields.has(`wf-defl-${wf.id}`)) {
          updated.deflectionByYear = newSettings.map(s => scaledDeflection(s.wisqEffectiveness));
        }
        if (!modifiedFields.has(`wf-effort-${wf.id}`)) {
          updated.effortReductionByYear = newSettings.map(s => scaledEffortReduction(s.wisqEffectiveness));
        }
        return updated;
      });
      batch.tier2Workflows = updatedWorkflows;
    }

    onChange(batch);
  };

  // Always maintain 5 years of settings — contract length only controls display, never deletes data
  const handleContractYearsChange = (years: number) => {
    const MAX_YEARS = 5;
    const defaultEffectiveness = [30, 60, 75, 85, 90];
    const defaultGrowth = [0, 5, 10, 12, 15];
    const newSettings: ContractYearSettings[] = [];
    for (let i = 0; i < MAX_YEARS; i++) {
      newSettings.push(
        (inputs.yearSettings || [])[i] ?? {
          wisqEffectiveness: defaultEffectiveness[i] ?? 90,
          workforceChange: defaultGrowth[i] ?? 15,
        }
      );
    }
    // Always keep all 5 years of per-year arrays
    const newTier01 = newSettings.map((s, i) =>
      tier01DeflectionByYear[i] ?? s.wisqEffectiveness
    );
    const newWorkflows = inputs.tier2Workflows.map(wf => ({
      ...wf,
      deflectionByYear: newSettings.map((s, i) =>
        wf.deflectionByYear?.[i] ?? scaledDeflection(s.wisqEffectiveness)
      ),
      effortReductionByYear: newSettings.map((s, i) =>
        wf.effortReductionByYear?.[i] ?? scaledEffortReduction(s.wisqEffectiveness)
      ),
    }));

    onChange({
      contractYears: years,
      yearSettings: newSettings,
      tier01DeflectionByYear: newTier01,
      tier2Workflows: newWorkflows,
    });
    setModifiedFields(new Set());
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600">
        Model how Wisq reduces workload across contract years, then translate hours saved into cost savings.
      </p>

      {/* Section 1: Contract & Wisq Effectiveness */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-[#03143B] mb-4">Contract & Wisq Effectiveness</h4>

        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{contractYears}-Year Contract</span>
          <span className="text-xs text-gray-400">(set on Pricing page)</span>
          <div className="flex items-center gap-2 ml-4">
            {yearSettings.map((_, i) => (
              <div key={i} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: YEAR_COLORS[i % YEAR_COLORS.length] }}
                />
                <span className="text-xs font-medium" style={{ color: YEAR_COLORS[i % YEAR_COLORS.length] }}>
                  Y{i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Wisq Effectiveness by Year</p>
            <p className="text-xs text-gray-500 mb-3">
              How effective Wisq is at reaching max deflection/effort reduction rates each year. Drag each year&apos;s handle along the single track.
            </p>
            {/* Single-track multi-thumb slider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative h-5">
                {/* Track background */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 rounded-lg bg-gray-200" />
                {/* 80% soft cap marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-2 w-px bg-gray-400 pointer-events-none z-10"
                  style={{ left: '80%' }}
                />
                <div
                  className="absolute text-[9px] text-gray-400 pointer-events-none -translate-x-1/2 z-10"
                  style={{ left: '80%', top: '16px' }}
                >
                  80%
                </div>
                {/* Colored fill from 0 to max effectiveness */}
                {(() => {
                  const sorted = yearSettings
                    .map((s, i) => ({ eff: s.wisqEffectiveness, color: YEAR_COLORS[i % YEAR_COLORS.length] }))
                    .sort((a, b) => a.eff - b.eff);
                  let prev = 0;
                  return sorted.map((seg, idx) => {
                    const el = (
                      <div
                        key={idx}
                        className="absolute top-1/2 -translate-y-1/2 h-2"
                        style={{
                          left: `${prev}%`,
                          width: `${seg.eff - prev}%`,
                          backgroundColor: seg.color,
                          borderRadius: prev === 0 ? '4px 0 0 4px' : idx === sorted.length - 1 ? '0 4px 4px 0' : '0',
                          opacity: 0.35,
                        }}
                      />
                    );
                    prev = seg.eff;
                    return el;
                  });
                })()}
                {/* Range inputs stacked on the same track */}
                {yearSettings.map((setting, i) => (
                  <input
                    key={i}
                    type="range"
                    value={setting.wisqEffectiveness}
                    onChange={(e) => updateYearSetting(i, { wisqEffectiveness: Number(e.target.value) })}
                    min={0}
                    max={100}
                    className="year-thumb"
                    style={{ '--thumb-color': YEAR_COLORS[i % YEAR_COLORS.length] } as React.CSSProperties}
                  />
                ))}
              </div>
              {/* Value labels */}
              <div className="flex flex-col gap-0 shrink-0">
                {yearSettings.map((setting, i) => (
                  <span
                    key={i}
                    className="text-xs font-semibold leading-tight"
                    style={{ color: YEAR_COLORS[i % YEAR_COLORS.length] }}
                  >
                    Y{i + 1}: {setting.wisqEffectiveness}%
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Workforce Changes by Year</p>
            <p className="text-xs text-gray-500 mb-3">
              Expected growth or shrinkage relative to today (affects case volume)
            </p>
            {/* Single-track multi-thumb slider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative h-5">
                {/* Track background */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 rounded-lg bg-gray-200" />
                {/* 0% center marker */}
                {(() => {
                  const zeroPct = (workforceValueToSlider(0) / (WORKFORCE_STEPS.length - 1)) * 100;
                  return (
                    <>
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-2 w-px bg-gray-400 pointer-events-none z-10"
                        style={{ left: `${zeroPct}%` }}
                      />
                      <div
                        className="absolute text-[9px] text-gray-400 pointer-events-none -translate-x-1/2 z-10"
                        style={{ left: `${zeroPct}%`, top: '16px' }}
                      >
                        0%
                      </div>
                    </>
                  );
                })()}
                {/* Range inputs stacked on the same track */}
                {yearSettings.map((setting, i) => (
                  <input
                    key={i}
                    type="range"
                    value={workforceValueToSlider(setting.workforceChange)}
                    onChange={(e) => {
                      const val = workforceSliderToValue(Number(e.target.value));
                      updateYearSetting(i, { workforceChange: val });
                    }}
                    min={0}
                    max={WORKFORCE_STEPS.length - 1}
                    step={1}
                    className="year-thumb"
                    style={{ '--thumb-color': YEAR_COLORS[i % YEAR_COLORS.length] } as React.CSSProperties}
                  />
                ))}
              </div>
              {/* Value labels — show % and projected population */}
              <div className="flex flex-col gap-0 shrink-0">
                {yearSettings.map((setting, i) => {
                  const pop = Math.round(employeeCount * (1 + setting.workforceChange / 100));
                  return (
                    <span
                      key={i}
                      className="text-xs font-semibold leading-tight"
                      style={{ color: YEAR_COLORS[i % YEAR_COLORS.length] }}
                    >
                      Y{i + 1}: {setting.workforceChange > 0 ? '+' : ''}{setting.workforceChange}% ({pop.toLocaleString()})
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Caseload Dashboard: Donut chart (30%) + Hours Saved (70%) */}
      <CaseloadDashboard
        inputs={inputs}
        output={output}
        onChange={onChange}
        estimatedFields={estimatedFields}
        yearColors={YEAR_COLORS}
      />

      {/* Tier 0-1: Parameters (full width) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-[#03143B] mb-4">Tier 0-1: Simple Cases</h4>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <InputField
              label="Tier 0/1 Cases per Year"
              value={inputs.tier01CasesPerYear || 0}
              onChange={(v) => onChange({ tier01CasesPerYear: v })}
              type="formatted-number"
            />
            <SourceCitation fieldKey="tier01CasesPerYear" estimatedFields={estimatedFields} />
          </div>
          <div>
            <InputField
              label="Avg Handle Time (minutes)"
              value={inputs.tier01AvgHandleTime}
              onChange={(v) => onChange({ tier01AvgHandleTime: v })}
              type="number"
            />
            <SourceCitation fieldKey="tier01AvgHandleTime" estimatedFields={estimatedFields} />
          </div>
        </div>
        <MultiYearSlider
          label="Deflection Rate by Year"
          values={tier01DeflectionByYear}
          onChange={(yearIdx, val) => {
            setModifiedFields(prev => new Set(prev).add('tier01Deflection'));
            const newArr = [...tier01DeflectionByYear];
            newArr[yearIdx] = val;
            onChange({ tier01DeflectionByYear: newArr });
          }}
          yearColors={YEAR_COLORS}
        />
      </div>

      {/* Tier 2+: Complex Workflows (full width) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold text-[#03143B]">Tier 2+: Complex Workflows</h4>
          <button
            onClick={onAddWorkflow}
            className="px-3 py-1 text-sm bg-[#03143B] text-white rounded-md hover:bg-[#020e29] transition-colors"
          >
            + Add Workflow
          </button>
        </div>

        {/* Top row: Total cases + Avg time per case */}
        {(() => {
          const wfSum = inputs.tier2Workflows.reduce((s, wf) => s + wf.volumePerYear, 0);
          const t2Total = inputs.tier2PlusTotalCases || Math.round(wfSum * 1.5);
          const isExactMatch = wfSum > 0 && t2Total === wfSum;
          const ratio = wfSum > 0 ? t2Total / wfSum : 0;
          const weightedAvg = wfSum > 0
            ? inputs.tier2Workflows.reduce((s, wf) => s + wf.timePerWorkflowHours * wf.volumePerYear, 0) / wfSum
            : 0.75;
          const currentAvg = inputs.tier2PlusAvgTimePerCase ?? weightedAvg;
          return (
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <InputField
                    label="Total Tier 2+ Cases per Year"
                    value={t2Total}
                    onChange={(v) => onChange({ tier2PlusTotalCases: v })}
                    type="formatted-number"
                  />
                  {wfSum > 0 && (() => {
                    if (isExactMatch) {
                      return (
                        <p className="text-[10px] text-emerald-600 mt-1">
                          ✓ Total equals configured cases — estimating based on current Wisq workflows.
                        </p>
                      );
                    }
                    if (ratio >= 1.5) {
                      return (
                        <p className="text-[10px] text-emerald-600 mt-1">
                          ✓ Total ({t2Total.toLocaleString()}) is {Math.round(ratio * 100)}% of configured ({wfSum.toLocaleString()}) — good coverage estimate.
                        </p>
                      );
                    }
                    if (ratio >= 1.25) {
                      return (
                        <p className="text-[10px] text-amber-500 mt-1">
                          ⚠ Total ({t2Total.toLocaleString()}) is only {Math.round(ratio * 100)}% of configured ({wfSum.toLocaleString()}). You likely have more unconfigured T2+ cases.
                        </p>
                      );
                    }
                    return (
                      <p className="text-[10px] text-red-600 mt-1">
                        ⚠ Total ({t2Total.toLocaleString()}) is only {Math.round(ratio * 100)}% of configured ({wfSum.toLocaleString()}). This should be higher — total must include all T2+ cases, not just configured ones.
                      </p>
                    );
                  })()}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Avg Time per Case (hours)</label>
                  <input
                    type="number"
                    value={currentAvg}
                    onChange={(e) => onChange({ tier2PlusAvgTimePerCase: Number(e.target.value) || 0 })}
                    step={0.25}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03143B]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Weighted avg: {weightedAvg.toFixed(2)} hrs ({Math.round(weightedAvg * 60)} min)
                    {inputs.tier2PlusAvgTimePerCase != null && Math.abs(inputs.tier2PlusAvgTimePerCase - weightedAvg) > 0.01 && (
                      <button
                        onClick={() => onChange({ tier2PlusAvgTimePerCase: undefined })}
                        className="ml-2 text-[#4d65ff] hover:underline"
                      >
                        Reset to weighted avg
                      </button>
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Workflow panels */}
        {inputs.tier2Workflows.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500 mb-3">No Tier 2+ workflows configured</p>
            <button
              onClick={onAddWorkflow}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Add Your First Workflow
            </button>
          </div>
        ) : (
          <div className={`grid gap-3 ${inputs.tier2Workflows.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {inputs.tier2Workflows.map((workflow) => (
              <div key={workflow.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <EditableWorkflowName
                    name={workflow.name}
                    onChange={(name) => onUpdateWorkflow(workflow.id, { name })}
                  />
                  <button
                    onClick={() => onRemoveWorkflow(workflow.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Volume/Year</label>
                    <input
                      type="number"
                      value={workflow.volumePerYear}
                      onChange={(e) =>
                        onUpdateWorkflow(workflow.id, { volumePerYear: Number(e.target.value) })
                      }
                      placeholder="Volume/yr"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Hours/Case</label>
                    <input
                      type="number"
                      value={workflow.timePerWorkflowHours}
                      onChange={(e) =>
                        onUpdateWorkflow(workflow.id, {
                          timePerWorkflowHours: Number(e.target.value),
                        })
                      }
                      placeholder="Hours"
                      step={0.25}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <MultiYearSlider
                    label="Deflection Rate"
                    values={workflow.deflectionByYear?.length ? workflow.deflectionByYear : yearSettings.map(s => 40 * s.wisqEffectiveness / 100)}
                    onChange={(yearIdx, val) => {
                      setModifiedFields(prev => new Set(prev).add(`wf-defl-${workflow.id}`));
                      const newArr = [...(workflow.deflectionByYear || yearSettings.map(s => 40 * s.wisqEffectiveness / 100))];
                      newArr[yearIdx] = val;
                      onUpdateWorkflow(workflow.id, { deflectionByYear: newArr });
                    }}
                    yearColors={YEAR_COLORS}
                  />
                  <MultiYearSlider
                    label="Effort Reduction"
                    values={workflow.effortReductionByYear?.length ? workflow.effortReductionByYear : yearSettings.map(s => 80 * s.wisqEffectiveness / 100)}
                    onChange={(yearIdx, val) => {
                      setModifiedFields(prev => new Set(prev).add(`wf-effort-${workflow.id}`));
                      const newArr = [...(workflow.effortReductionByYear || yearSettings.map(s => 80 * s.wisqEffectiveness / 100))];
                      newArr[yearIdx] = val;
                      onUpdateWorkflow(workflow.id, { effortReductionByYear: newArr });
                    }}
                    yearColors={YEAR_COLORS}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cost Parameters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-[#03143B] mb-4">Cost Parameters</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <InputField
            label="Tier 0/1 HR Ops Fully Burdened Cost"
            value={inputs.tier01HandlerSalary}
            onChange={(v) => onChange({ tier01HandlerSalary: v })}
            type="currency"
          />
          <div>
            <InputField
              label="Tier 2+ HR Ops Fully Burdened Cost"
              value={inputs.tier2PlusHandlerSalary}
              onChange={(v) => onChange({ tier2PlusHandlerSalary: v })}
              type="currency"
            />
          </div>
        </div>
        <SourceCitation fieldKey="tier01HandlerSalary" estimatedFields={estimatedFields} />
      </div>

      {/* Federated / Distributed Model */}
      <CollapsibleSection
        title="Federated / Distributed Model"
        defaultOpen={inputs.managerHRTime?.enabled || inputs.triageRole?.enabled || false}
      >
        {/* Manager HR Time */}
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inputs.managerHRTime?.enabled ?? false}
              onChange={(e) =>
                onChange({
                  managerHRTime: {
                    enabled: e.target.checked,
                    managersDoingHR: inputs.managerHRTime?.managersDoingHR ?? 50,
                    hoursPerWeekPerManager: inputs.managerHRTime?.hoursPerWeekPerManager ?? 4,
                    managerHourlyCost: inputs.managerHRTime?.managerHourlyCost ?? 45,
                  },
                })
              }
              className="w-4 h-4 text-[#03143B] rounded focus:ring-[#03143B]"
            />
            <span className="text-sm font-medium text-gray-700">
              Managers / GMs spending time on HR tasks
            </span>
          </label>

          {inputs.managerHRTime?.enabled && (
            <div className="ml-6 grid grid-cols-3 gap-3">
              <InputField
                label="Managers doing HR"
                value={inputs.managerHRTime.managersDoingHR}
                onChange={(v) =>
                  onChange({
                    managerHRTime: { ...inputs.managerHRTime!, managersDoingHR: v },
                  })
                }
                type="number"
              />
              <InputField
                label="Hours/week per manager"
                value={inputs.managerHRTime.hoursPerWeekPerManager}
                onChange={(v) =>
                  onChange({
                    managerHRTime: { ...inputs.managerHRTime!, hoursPerWeekPerManager: v },
                  })
                }
                type="number"
              />
              <InputField
                label="Manager Fully Burdened Hourly Rate"
                value={inputs.managerHRTime.managerHourlyCost}
                onChange={(v) =>
                  onChange({
                    managerHRTime: { ...inputs.managerHRTime!, managerHourlyCost: v },
                  })
                }
                type="currency"
              />
            </div>
          )}
          {inputs.managerHRTime?.enabled && (
            <div className="ml-6 space-y-1">
              <div className="flex gap-3 flex-wrap">
                {output.yearResults.map((yr, i) => (
                  <span key={i} className="text-[10px] font-medium" style={{ color: YEAR_COLORS[i % YEAR_COLORS.length] }}>
                    Y{yr.year}: {Math.round(inputs.managerHRTime!.managersDoingHR * yr.volumeMultiplier).toLocaleString()} managers
                  </span>
                ))}
              </div>
              <SourceCitation fieldKey="managerHRTime" estimatedFields={estimatedFields} />
            </div>
          )}
        </div>

        {/* Triage Role */}
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inputs.triageRole?.enabled ?? false}
              onChange={(e) =>
                onChange({
                  triageRole: {
                    enabled: e.target.checked,
                    triageFTEs: inputs.triageRole?.triageFTEs ?? 1,
                    triageSalary: inputs.triageRole?.triageSalary ?? 55000,
                  },
                })
              }
              className="w-4 h-4 text-[#03143B] rounded focus:ring-[#03143B]"
            />
            <span className="text-sm font-medium text-gray-700">Dedicated triage role(s)</span>
          </label>

          {inputs.triageRole?.enabled && (
            <div className="ml-6 grid grid-cols-2 gap-3">
              <InputField
                label="Triage FTEs"
                value={inputs.triageRole.triageFTEs}
                onChange={(v) =>
                  onChange({ triageRole: { ...inputs.triageRole!, triageFTEs: v } })
                }
                type="number"
              />
              <InputField
                label="Triage Fully Burdened Cost"
                value={inputs.triageRole.triageSalary}
                onChange={(v) =>
                  onChange({ triageRole: { ...inputs.triageRole!, triageSalary: v } })
                }
                type="currency"
              />
            </div>
          )}
          {inputs.triageRole?.enabled && (
            <div className="ml-6 space-y-1">
              <div className="flex gap-3 flex-wrap">
                {output.yearResults.map((yr, i) => (
                  <span key={i} className="text-[10px] font-medium" style={{ color: YEAR_COLORS[i % YEAR_COLORS.length] }}>
                    Y{yr.year}: {(inputs.triageRole!.triageFTEs * yr.volumeMultiplier).toFixed(1)} FTEs
                  </span>
                ))}
              </div>
              <SourceCitation fieldKey="triageRole" estimatedFields={estimatedFields} />
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Cost Savings by Year */}
      <div className="bg-gradient-to-br from-gray-50 to-green-50 rounded-lg border border-[#03143B]/20 p-6">
        <h4 className="font-semibold text-[#03143B] mb-4">Cost Savings by Year</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 text-gray-600 font-medium">Year</th>
                <th className="text-right py-2 px-4 text-gray-600 font-medium">◉ T0/1 Savings</th>
                <th className="text-right py-2 px-4 text-gray-600 font-medium">◈ T2+ Savings</th>
                {output.yearCostResults.some((yr) => yr.managerSavings > 0) && (
                  <th className="text-right py-2 px-4 text-gray-600 font-medium">Manager Savings</th>
                )}
                {output.yearCostResults.some((yr) => yr.triageSavings > 0) && (
                  <th className="text-right py-2 px-4 text-gray-600 font-medium">Triage Savings</th>
                )}
                <th className="text-right py-2 pl-4 text-gray-600 font-medium">Total Savings</th>
              </tr>
            </thead>
            <tbody>
              {output.yearCostResults.map((yr) => (
                <tr key={yr.year} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-medium" style={{ color: YEAR_COLORS[(yr.year - 1) % YEAR_COLORS.length] }}>
                    Year {yr.year} <span className="text-gray-400 font-normal text-xs">({output.yearResults[yr.year - 1]?.volumeMultiplier.toFixed(2)}x)</span>
                  </td>
                  <td className="text-right py-2 px-4 text-gray-700">{formatCurrency(yr.tier01Savings)}</td>
                  <td className="text-right py-2 px-4 text-gray-700">{formatCurrency(yr.tier2Savings)}</td>
                  {output.yearCostResults.some((y) => y.managerSavings > 0) && (
                    <td className="text-right py-2 px-4 text-gray-700">{formatCurrency(yr.managerSavings)}</td>
                  )}
                  {output.yearCostResults.some((y) => y.triageSavings > 0) && (
                    <td className="text-right py-2 px-4 text-gray-700">{formatCurrency(yr.triageSavings)}</td>
                  )}
                  <td className="text-right py-2 pl-4 font-semibold text-[#03143B]">{formatCurrency(yr.totalSavings)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#03143B]/20">
                <td className="py-2 pr-4 font-semibold text-[#03143B]">Contract Total</td>
                <td className="text-right py-2 px-4 font-bold text-[#03143B]">{formatCurrency(output.yearCostResults.reduce((s, yr) => s + yr.tier01Savings, 0))}</td>
                <td className="text-right py-2 px-4 font-bold text-[#03143B]">{formatCurrency(output.yearCostResults.reduce((s, yr) => s + yr.tier2Savings, 0))}</td>
                {output.yearCostResults.some((y) => y.managerSavings > 0) && (
                  <td className="text-right py-2 px-4 font-bold text-[#03143B]">{formatCurrency(output.managerTimeSavings)}</td>
                )}
                {output.yearCostResults.some((y) => y.triageSavings > 0) && (
                  <td className="text-right py-2 px-4 font-bold text-[#03143B]">{formatCurrency(output.triageSavings)}</td>
                )}
                <td className="text-right py-2 pl-4 font-bold text-[#03143B]">
                  {formatCurrency(output.headcountReductionSavings + output.managerTimeSavings + output.triageSavings)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Legal Compliance Tab
// ──────────────────────────────────────────────

function LegalComplianceTab({
  inputs,
  output,
  onChange,
  tier2PlusConfiguredCases,
  tier2PlusTotalCases,
  yearSettings,
  contractYears,
  estimatedFields,
}: {
  inputs: LegalComplianceInputs;
  output: ReturnType<typeof calculateLegalComplianceROI>;
  onChange: (inputs: Partial<LegalComplianceInputs>) => void;
  tier2PlusConfiguredCases: number;
  tier2PlusTotalCases: number;
  yearSettings: ContractYearSettings[];
  contractYears: number;
  estimatedFields: Set<string>;
}) {
  const [selectedYear, setSelectedYear] = useState(0);
  const yearColors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];

  const wisqCoverage = tier2PlusTotalCases > 0 ? Math.min(1, tier2PlusConfiguredCases / tier2PlusTotalCases) : 0;
  const s = yearSettings[selectedYear] ?? yearSettings[yearSettings.length - 1] ?? { workforceChange: 0 };
  const volMult = 1 + s.workforceChange / 100;
  const baseHighStakes = inputs.useManualCaseVolume
    ? inputs.manualHighStakesCases
    : tier2PlusTotalCases * (inputs.highStakesPercent / 100);
  const scaledHighStakes = baseHighStakes * volMult;
  const yr = output.yearResults?.[selectedYear] ?? output.yearResults?.[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          Quantify the financial impact of accurate, compliant HR guidance. Every incorrect answer in
          high-stakes situations carries legal and compliance risk.
        </p>
        {contractYears > 1 && (
          <div className="flex items-center gap-1 ml-4 shrink-0">
            {Array.from({ length: contractYears }).map((_, i) => (
              <button
                key={i}
                onClick={() => setSelectedYear(i)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  selectedYear === i ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={selectedYear === i ? { backgroundColor: yearColors[i % yearColors.length] } : {}}
              >
                Y{i + 1}
                {(yearSettings[i]?.workforceChange ?? 0) !== 0 && (
                  <span className="ml-0.5 opacity-70">
                    ({yearSettings[i].workforceChange > 0 ? '+' : ''}{yearSettings[i].workforceChange}%)
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <h4 className="font-semibold text-[#03143B]">Case Volume & Risk Inputs</h4>
            <span className="text-sm font-bold text-white bg-[#2563eb] px-3 py-1 rounded-full">
              {Math.round(scaledHighStakes * wisqCoverage).toLocaleString()} Wisq cases
            </span>
          </div>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Configured Tier 2+ Cases</p>
              <p className="text-lg font-semibold">{tier2PlusConfiguredCases.toLocaleString()}</p>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={inputs.useManualCaseVolume}
                onChange={(e) => onChange({ useManualCaseVolume: e.target.checked })}
                className="w-4 h-4 text-[#03143B] rounded focus:ring-[#03143B]"
              />
              <span className="text-sm text-gray-700">Override with manual case volume</span>
            </label>

            {inputs.useManualCaseVolume ? (
              <InputField
                label="Manual High-Stakes Cases"
                value={inputs.manualHighStakesCases}
                onChange={(v) => onChange({ manualHighStakesCases: v })}
                type="formatted-number"
              />
            ) : (
              <SliderField
                label="High-Stakes Cases (%)"
                value={inputs.highStakesPercent}
                onChange={(v) => onChange({ highStakesPercent: v })}
                min={0.5}
                max={5}
                step={0.1}
                unit="%"
              />
            )}

            <InputField
              label="Avg Legal Cost per Incident"
              value={inputs.avgLegalCostPerIncident}
              onChange={(v) => onChange({ avgLegalCostPerIncident: v })}
              type="currency"
            />
            <SourceCitation fieldKey="avgLegalCostPerIncident" estimatedFields={estimatedFields} />
            <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-gray-500 font-mono space-y-0.5">
              {tier2PlusConfiguredCases === tier2PlusTotalCases ? (
                inputs.useManualCaseVolume
                  ? <p>{Math.round(scaledHighStakes).toLocaleString()} high-stakes cases (manual) → Wisq handles all {Math.round(scaledHighStakes * wisqCoverage).toLocaleString()}</p>
                  : <p>{tier2PlusConfiguredCases.toLocaleString()} cases × {r2(inputs.highStakesPercent)}% = {Math.round(scaledHighStakes).toLocaleString()} high-stakes → Wisq handles all {Math.round(scaledHighStakes * wisqCoverage).toLocaleString()}</p>
              ) : (
                <>
                  <p>{tier2PlusConfiguredCases.toLocaleString()} configured / {tier2PlusTotalCases.toLocaleString()} total T2+ = {(wisqCoverage * 100).toFixed(0)}% coverage</p>
                  {inputs.useManualCaseVolume
                    ? <p>{Math.round(scaledHighStakes).toLocaleString()} high-stakes (manual) × {(wisqCoverage * 100).toFixed(0)}% = {Math.round(scaledHighStakes * wisqCoverage).toLocaleString()} Wisq handles</p>
                    : <p>{tier2PlusTotalCases.toLocaleString()} × {r2(inputs.highStakesPercent)}% = {Math.round(baseHighStakes).toLocaleString()} high-stakes{volMult !== 1 ? ` × ${r2(volMult)}x growth` : ''} × {(wisqCoverage * 100).toFixed(0)}% = {Math.round(scaledHighStakes * wisqCoverage).toLocaleString()} Wisq handles</p>
                  }
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <h4 className="font-semibold text-[#03143B]">Accuracy Comparison</h4>
            <span className="text-sm font-bold text-white bg-[#2563eb] px-3 py-1 rounded-full">
              {formatCurrency(yr?.avoidedLegalCosts ?? 0)}/yr
            </span>
          </div>
          <div className="space-y-4">
            <SliderField
              label="Current HR Accuracy Rate"
              value={inputs.currentAccuracyRate}
              onChange={(v) => onChange({ currentAccuracyRate: v })}
              min={70}
              max={95}
              unit="%"
            />
            <SliderField
              label="Wisq Accuracy Rate"
              value={inputs.wisqAccuracyRate}
              onChange={(v) => onChange({ wisqAccuracyRate: v })}
              min={80}
              max={99}
              unit="%"
            />
            <div className="p-3 bg-[#03143B]/5 rounded">
              <p className="text-sm text-gray-600">Accuracy Improvement</p>
              <p className="text-lg font-semibold text-[#03143B]">
                +{(inputs.wisqAccuracyRate - inputs.currentAccuracyRate).toFixed(1)}%
              </p>
            </div>
            {yr && (() => {
              const wisqHandledYr = Math.round(yr.highStakesCases * wisqCoverage);
              const baseErr = (100 - inputs.currentAccuracyRate).toFixed(1);
              const wisqErr = (100 - inputs.wisqAccuracyRate).toFixed(1);
              return (
                <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-gray-500 font-mono space-y-0.5">
                  <p>{wisqHandledYr.toLocaleString()} cases × ({baseErr}% baseline − {wisqErr}% Wisq) error rate = {yr.avoidedIncidents.toFixed(1)} incidents avoided</p>
                  <p>{yr.avoidedIncidents.toFixed(1)} incidents × {formatCurrency(inputs.avgLegalCostPerIncident)}/incident = {formatCurrency(yr.avoidedLegalCosts)}/yr</p>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Admin Cost Component */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <h4 className="font-semibold text-[#03143B]">Administrative Cost Component</h4>
          <span className="text-sm font-bold text-white bg-[#2563eb] px-3 py-1 rounded-full">
            {formatCurrency(yr?.adminCostSavings ?? 0)}/yr
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Wisq reduces administrative overhead with audit-tight documentation and case tracking.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <InputField
            label="Admin Hours per High-Stakes Case"
            value={inputs.adminHoursPerCase}
            onChange={(v) => onChange({ adminHoursPerCase: v })}
            type="number"
          />
          <SourceCitation fieldKey="adminHoursPerCase" estimatedFields={estimatedFields} />
          <InputField
            label="Admin Hourly Rate"
            value={inputs.adminHourlyRate}
            onChange={(v) => onChange({ adminHourlyRate: v })}
            type="currency"
          />
        </div>
        {yr && (() => {
          const wisqHandledYr = Math.round(yr.highStakesCases * wisqCoverage);
          return (
            <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-gray-500 font-mono">
              {wisqHandledYr.toLocaleString()} Wisq cases × {r2(inputs.adminHoursPerCase)} hrs × {formatCurrency(inputs.adminHourlyRate)}/hr = {formatCurrency(yr.adminCostSavings)}/yr
            </div>
          );
        })()}
      </div>

      {/* Audit Preparation & Remediation */}
      <CollapsibleSection
        title="Audit Preparation & Remediation"
        defaultOpen={inputs.auditPrep?.enabled ?? false}
        badge={inputs.auditPrep?.enabled ? `${formatCurrency(yr?.auditPrepSavings ?? 0)}/yr` : undefined}
      >
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={inputs.auditPrep?.enabled ?? false}
            onChange={(e) =>
              onChange({
                auditPrep: {
                  enabled: e.target.checked,
                  auditsPerYear: inputs.auditPrep?.auditsPerYear ?? 2,
                  prepHoursPerAudit: inputs.auditPrep?.prepHoursPerAudit ?? 40,
                  prepHourlyRate: inputs.auditPrep?.prepHourlyRate ?? 85,
                  wisqReductionPercent: inputs.auditPrep?.wisqReductionPercent ?? 50,
                },
              })
            }
            className="w-4 h-4 text-[#03143B] rounded focus:ring-[#03143B]"
          />
          <span className="text-sm font-medium text-gray-700">
            Include audit preparation savings
          </span>
        </label>

        {inputs.auditPrep?.enabled && (
          <div className="ml-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Audits per year"
                value={inputs.auditPrep.auditsPerYear}
                onChange={(v) =>
                  onChange({ auditPrep: { ...inputs.auditPrep!, auditsPerYear: v } })
                }
                type="number"
              />
              <InputField
                label="Prep hours per audit"
                value={inputs.auditPrep.prepHoursPerAudit}
                onChange={(v) =>
                  onChange({ auditPrep: { ...inputs.auditPrep!, prepHoursPerAudit: v } })
                }
                type="number"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Prep hourly rate"
                value={inputs.auditPrep.prepHourlyRate}
                onChange={(v) =>
                  onChange({ auditPrep: { ...inputs.auditPrep!, prepHourlyRate: v } })
                }
                type="currency"
              />
              <SliderField
                label="Wisq reduction"
                value={inputs.auditPrep.wisqReductionPercent}
                onChange={(v) =>
                  onChange({ auditPrep: { ...inputs.auditPrep!, wisqReductionPercent: v } })
                }
                min={0}
                max={100}
                unit="%"
              />
            </div>
            <SourceCitation fieldKey="auditPrep" estimatedFields={estimatedFields} />
            <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-500 font-mono">
              {r2(inputs.auditPrep.auditsPerYear)} audits × {r2(inputs.auditPrep.prepHoursPerAudit)} hrs × {formatCurrency(inputs.auditPrep.prepHourlyRate)}/hr × {r2(inputs.auditPrep.wisqReductionPercent)}% reduction = {formatCurrency(yr?.auditPrepSavings ?? 0)}/yr
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Risk Pattern Detection */}
      <CollapsibleSection
        title="Risk Pattern Detection"
        defaultOpen={inputs.riskPatternDetection?.enabled ?? false}
        badge={inputs.riskPatternDetection?.enabled ? `${formatCurrency(yr?.riskValue ?? 0)}/yr` : undefined}
      >
        <p className="text-sm text-gray-500 mb-3">
          Wisq surfaces patterns like leave abuse, exhausted benefits, and PTO anomalies &mdash;
          reducing exposure before a lawsuit occurs.
        </p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={inputs.riskPatternDetection?.enabled ?? false}
            onChange={(e) =>
              onChange({
                riskPatternDetection: {
                  enabled: e.target.checked,
                  estimatedAnnualValue:
                    inputs.riskPatternDetection?.estimatedAnnualValue ?? 30000,
                },
              })
            }
            className="w-4 h-4 text-[#03143B] rounded focus:ring-[#03143B]"
          />
          <span className="text-sm font-medium text-gray-700">
            Include risk pattern detection value
          </span>
        </label>
        {inputs.riskPatternDetection?.enabled && (
          <div className="ml-6 space-y-2">
            <InputField
              label="Estimated annual value"
              value={inputs.riskPatternDetection.estimatedAnnualValue}
              onChange={(v) =>
                onChange({
                  riskPatternDetection: { ...inputs.riskPatternDetection!, estimatedAnnualValue: v },
                })
              }
              type="currency"
            />
            <div className="p-2 bg-blue-50 rounded text-xs text-gray-500 font-mono">
              {formatCurrency(yr?.riskValue ?? 0)}/yr
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Proactive Compliance Alerts */}
      <CollapsibleSection
        title="Proactive Compliance Alerts"
        defaultOpen={inputs.proactiveAlerts?.enabled ?? false}
        badge={inputs.proactiveAlerts?.enabled ? `${formatCurrency(yr?.proactiveValue ?? 0)}/yr` : undefined}
      >
        <p className="text-sm text-gray-500 mb-3">
          Automated risk flags, 30/60/90-day check-ins, and eligibility checks applied across
          workflows.
        </p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={inputs.proactiveAlerts?.enabled ?? false}
            onChange={(e) =>
              onChange({
                proactiveAlerts: {
                  enabled: e.target.checked,
                  estimatedAnnualValue:
                    inputs.proactiveAlerts?.estimatedAnnualValue ?? 25000,
                },
              })
            }
            className="w-4 h-4 text-[#03143B] rounded focus:ring-[#03143B]"
          />
          <span className="text-sm font-medium text-gray-700">
            Include proactive compliance alerts value
          </span>
        </label>
        {inputs.proactiveAlerts?.enabled && (
          <div className="ml-6 space-y-2">
            <InputField
              label="Estimated annual value"
              value={inputs.proactiveAlerts.estimatedAnnualValue}
              onChange={(v) =>
                onChange({
                  proactiveAlerts: { ...inputs.proactiveAlerts!, estimatedAnnualValue: v },
                })
              }
              type="currency"
            />
            <div className="p-2 bg-blue-50 rounded text-xs text-gray-500 font-mono">
              {formatCurrency(yr?.proactiveValue ?? 0)}/yr
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Annual Averages */}
      {(() => {
        const yrs = output.yearResults?.length || 1;
        const avgAvoided = output.avoidedLegalCosts / yrs;
        const avgAdmin = output.adminCostSavings / yrs;
        const avgAudit = output.auditPrepSavings / yrs;
        const avgRisk = output.riskValue / yrs;
        const avgProactive = output.proactiveValue / yrs;
        const avgTotal = output.totalAvoidedCosts / yrs;
        return (
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-[#03143B]/20 p-6">
            <h4 className="font-semibold text-[#03143B] mb-4">Annual Savings (avg)</h4>
            <div className="grid md:grid-cols-4 gap-4">
              <ResultCard label="Legal Cost Avoidance" value={formatCurrency(avgAvoided)} />
              <ResultCard label="Admin Savings" value={formatCurrency(avgAdmin)} />
              <ResultCard label="Incidents Avoided/Year" value={(output.avoidedIncidents / yrs).toFixed(1)} />
              <ResultCard
                label="Total Annual Savings"
                value={formatCurrency(avgTotal)}
                highlight
              />
            </div>

            {(avgAudit > 0 || avgRisk > 0 || avgProactive > 0) && (
              <div className="mt-4 pt-4 border-t border-[#03143B]/10 grid md:grid-cols-3 gap-3 text-sm">
                {avgAudit > 0 && (
                  <div className="bg-white/60 rounded p-3">
                    <p className="text-gray-500">Audit Prep Savings</p>
                    <p className="font-semibold text-[#03143B]">{formatCurrency(avgAudit)}</p>
                  </div>
                )}
                {avgRisk > 0 && (
                  <div className="bg-white/60 rounded p-3">
                    <p className="text-gray-500">Risk Detection Value</p>
                    <p className="font-semibold text-[#03143B]">{formatCurrency(avgRisk)}</p>
                  </div>
                )}
                {avgProactive > 0 && (
                  <div className="bg-white/60 rounded p-3">
                    <p className="text-gray-500">Proactive Alerts Value</p>
                    <p className="font-semibold text-[#03143B]">{formatCurrency(avgProactive)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Savings by Year */}
      {output.yearResults && output.yearResults.length > 1 && (
        <div className="bg-gradient-to-br from-gray-50 to-green-50 rounded-lg border border-[#03143B]/20 p-6">
          <h4 className="font-semibold text-[#03143B] mb-4">Savings by Year</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 text-gray-600 font-medium">Year</th>
                  <th className="text-right py-2 px-4 text-gray-600 font-medium">Legal Avoidance</th>
                  <th className="text-right py-2 px-4 text-gray-600 font-medium">Admin Savings</th>
                  {output.yearResults.some(yr => yr.auditPrepSavings > 0 || yr.riskValue > 0 || yr.proactiveValue > 0) && (
                    <th className="text-right py-2 px-4 text-gray-600 font-medium">Other Savings</th>
                  )}
                  <th className="text-right py-2 pl-4 text-gray-600 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {output.yearResults.map((yr) => {
                  const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];
                  return (
                    <tr key={yr.year} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium" style={{ color: colors[(yr.year - 1) % colors.length] }}>
                        Year {yr.year}
                      </td>
                      <td className="text-right py-2 px-4 text-gray-700">{formatCurrency(yr.avoidedLegalCosts)}</td>
                      <td className="text-right py-2 px-4 text-gray-700">{formatCurrency(yr.adminCostSavings)}</td>
                      {output.yearResults.some(y => y.auditPrepSavings > 0 || y.riskValue > 0 || y.proactiveValue > 0) && (
                        <td className="text-right py-2 px-4 text-gray-700">{formatCurrency(yr.auditPrepSavings + yr.riskValue + yr.proactiveValue)}</td>
                      )}
                      <td className="text-right py-2 pl-4 font-semibold text-[#03143B]">{formatCurrency(yr.totalAvoidedCosts)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#03143B]/20">
                  <td className="py-2 pr-4 font-semibold text-[#03143B]">Contract Total</td>
                  <td className="text-right py-2 px-4 font-bold text-[#03143B]">{formatCurrency(output.avoidedLegalCosts)}</td>
                  <td className="text-right py-2 px-4 font-bold text-[#03143B]">{formatCurrency(output.adminCostSavings)}</td>
                  {output.yearResults.some(y => y.auditPrepSavings > 0 || y.riskValue > 0 || y.proactiveValue > 0) && (
                    <td className="text-right py-2 px-4 font-bold text-[#03143B]">{formatCurrency(output.auditPrepSavings + output.riskValue + output.proactiveValue)}</td>
                  )}
                  <td className="text-right py-2 pl-4 font-bold text-[#03143B]">{formatCurrency(output.totalAvoidedCosts)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Employee Experience Tab (unchanged)
// ──────────────────────────────────────────────

function EmployeeExperienceTab({
  inputs,
  output,
  onChange,
  estimatedFields,
  contractYears,
  yearSettings,
}: {
  inputs: EmployeeExperienceInputs;
  output: ReturnType<typeof calculateEmployeeExperienceROI>;
  onChange: (inputs: Partial<EmployeeExperienceInputs>) => void;
  estimatedFields: Set<string>;
  contractYears: number;
  yearSettings: ContractYearSettings[];
}) {
  const [selectedYear, setSelectedYear] = useState(0);
  const yearColors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];
  const yr = output.yearResults?.[selectedYear] ?? output.yearResults?.[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          Every HR inquiry costs your organization in lost productivity. Wisq provides instant,
          personalized answers that save time for employees and managers.
        </p>
        {contractYears > 1 && (
          <div className="flex items-center gap-1 ml-4 shrink-0">
            {Array.from({ length: contractYears }).map((_, i) => (
              <button
                key={i}
                onClick={() => setSelectedYear(i)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  selectedYear === i ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={selectedYear === i ? { backgroundColor: yearColors[i % yearColors.length] } : {}}
              >
                Y{i + 1}
                {(yearSettings[i]?.workforceChange ?? 0) !== 0 && (
                  <span className="ml-0.5 opacity-70">
                    ({yearSettings[i].workforceChange > 0 ? '+' : ''}{yearSettings[i].workforceChange}%)
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <h4 className="font-semibold text-[#03143B]">Workforce & Inquiry Inputs</h4>
          </div>
          <div className="space-y-4">
            <InputField
              label="Total Employee Population"
              value={inputs.totalEmployeePopulation}
              onChange={(v) => onChange({ totalEmployeePopulation: v })}
              type="formatted-number"
            />
            <InputField
              label="Avg HR Inquiries per Employee/Year"
              value={inputs.inquiriesPerEmployeePerYear}
              onChange={(v) => onChange({ inquiriesPerEmployeePerYear: v })}
              type="number"
            />
            <SourceCitation fieldKey="inquiriesPerEmployeePerYear" estimatedFields={estimatedFields} />
            <InputField
              label="Avg Time per Inquiry (minutes)"
              value={inputs.avgTimePerInquiry}
              onChange={(v) => onChange({ avgTimePerInquiry: v })}
              type="number"
            />
            <SourceCitation fieldKey="avgTimePerInquiry" estimatedFields={estimatedFields} />
            <InputField
              label="Avg Hourly Rate (all employees)"
              value={inputs.avgHourlyRate ?? (inputs as any).avgEmployeeHourlyRate ?? 55}
              onChange={(v) => onChange({ avgHourlyRate: v })}
              type="currency"
            />
            <SourceCitation fieldKey="avgHourlyRate" estimatedFields={estimatedFields} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <h4 className="font-semibold text-[#03143B]">Wisq Impact Parameters</h4>
            <span className="text-sm font-bold text-white bg-[#2563eb] px-3 py-1 rounded-full">
              {formatCurrency(yr?.totalMonetaryValue ?? 0)}/yr
            </span>
          </div>
          <div className="space-y-4">
            <SliderField
              label="Time Reduction per Inquiry"
              value={inputs.timeReductionPercent}
              onChange={(v) => onChange({ timeReductionPercent: v })}
              min={0}
              max={100}
              unit="%"
            />
            <SliderField
              label="Adoption Rate"
              value={inputs.adoptionRate}
              onChange={(v) => onChange({ adoptionRate: v })}
              min={0}
              max={100}
              unit="%"
            />
          </div>
        </div>
      </div>

      {/* Full calculation breakdown */}
      {yr && (() => {
        const hourlyRate = inputs.avgHourlyRate ?? (inputs as any).avgEmployeeHourlyRate ?? 55;
        const totalInquiries = Math.round(yr.totalInquiries);
        const baselineMin = totalInquiries * inputs.avgTimePerInquiry;
        const baselineHrs = Math.round(baselineMin / 60);
        const s = yearSettings[selectedYear] ?? yearSettings[yearSettings.length - 1];
        const volMult = 1 + (s?.workforceChange ?? 0) / 100;
        return (
          <div className="p-3 bg-blue-50 rounded-lg text-xs text-gray-600 font-mono space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1 font-sans">Year {selectedYear + 1} Calculation</div>
            <p><span className="text-gray-400">1.</span> {inputs.totalEmployeePopulation.toLocaleString()} employees{volMult !== 1 ? ` × ${r2(volMult)}x growth` : ''} × {r2(inputs.inquiriesPerEmployeePerYear)} inquiries/yr = <strong>{totalInquiries.toLocaleString()}</strong> total inquiries</p>
            <p><span className="text-gray-400">2.</span> {totalInquiries.toLocaleString()} inquiries × {r2(inputs.avgTimePerInquiry)} min each = <strong>{baselineHrs.toLocaleString()} hrs</strong> baseline time spent</p>
            <p><span className="text-gray-400">3.</span> Wisq reduces {r2(inputs.timeReductionPercent)}% of inquiry time × {r2(inputs.adoptionRate)}% adoption = <strong>{r2(inputs.timeReductionPercent * inputs.adoptionRate / 100)}%</strong> effective savings</p>
            <p><span className="text-gray-400">4.</span> {baselineHrs.toLocaleString()} hrs × {r2(inputs.timeReductionPercent * inputs.adoptionRate / 100)}% = <strong>{Math.round(yr.hoursSaved).toLocaleString()} hrs</strong> saved</p>
            <p><span className="text-gray-400">5.</span> {Math.round(yr.hoursSaved).toLocaleString()} hrs × {formatCurrency(hourlyRate)}/hr = <strong className="text-[#03143B]">{formatCurrency(yr.totalMonetaryValue)}/yr</strong></p>
          </div>
        );
      })()}

      {/* Annual Averages */}
      {(() => {
        const yrs = output.yearResults?.length || 1;
        const avgHours = output.hoursSaved / yrs;
        const avgValue = output.totalMonetaryValue / yrs;
        const avgPerEmployee = inputs.totalEmployeePopulation > 0 ? avgValue / inputs.totalEmployeePopulation : 0;
        return (
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-[#03143B]/20 p-6">
            <h4 className="font-semibold text-[#03143B] mb-4">Annual Savings (avg)</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <ResultCard label="Hours Saved/Year" value={Math.round(avgHours).toLocaleString()} />
              <ResultCard
                label="Total Productivity Value"
                value={formatCurrency(avgValue)}
                highlight
              />
              <ResultCard
                label="Per Employee/Year"
                value={formatCurrency(avgPerEmployee)}
              />
            </div>
          </div>
        );
      })()}

      {/* Savings by Year */}
      {output.yearResults && output.yearResults.length > 1 && (
        <div className="bg-gradient-to-br from-gray-50 to-green-50 rounded-lg border border-[#03143B]/20 p-6">
          <h4 className="font-semibold text-[#03143B] mb-4">Savings by Year</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 text-gray-600 font-medium">Year</th>
                  <th className="text-right py-2 px-4 text-gray-600 font-medium">Inquiries</th>
                  <th className="text-right py-2 px-4 text-gray-600 font-medium">Hours Saved</th>
                  <th className="text-right py-2 pl-4 text-gray-600 font-medium">Productivity Value</th>
                </tr>
              </thead>
              <tbody>
                {output.yearResults.map((yr) => {
                  const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];
                  return (
                    <tr key={yr.year} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium" style={{ color: colors[(yr.year - 1) % colors.length] }}>
                        Year {yr.year}
                      </td>
                      <td className="text-right py-2 px-4 text-gray-700">{Math.round(yr.totalInquiries).toLocaleString()}</td>
                      <td className="text-right py-2 px-4 text-gray-700">{Math.round(yr.hoursSaved).toLocaleString()}</td>
                      <td className="text-right py-2 pl-4 font-semibold text-[#03143B]">{formatCurrency(yr.totalMonetaryValue)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#03143B]/20">
                  <td className="py-2 pr-4 font-semibold text-[#03143B]">Contract Total</td>
                  <td className="text-right py-2 px-4" />
                  <td className="text-right py-2 px-4 font-bold text-[#03143B]">{Math.round(output.hoursSaved).toLocaleString()}</td>
                  <td className="text-right py-2 pl-4 font-bold text-[#03143B]">{formatCurrency(output.totalMonetaryValue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Summary Tab
// ──────────────────────────────────────────────

function HoverYearPopup({
  label,
  yearValues,
  children,
}: {
  label: string;
  yearValues: { year: number; value: number }[];
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const yearColors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];
  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && yearValues.length > 1 && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#03143B] text-white rounded-lg shadow-xl p-3 min-w-[180px]">
          <p className="text-[10px] uppercase tracking-wider text-white/50 font-medium mb-1.5">{label}</p>
          {yearValues.map((yv) => (
            <div key={yv.year} className="flex justify-between items-center py-0.5">
              <span className="text-xs font-medium" style={{ color: yearColors[(yv.year - 1) % yearColors.length] }}>Y{yv.year}</span>
              <span className="text-xs font-semibold">{formatCurrency(yv.value)}</span>
            </div>
          ))}
          <div className="border-t border-white/20 mt-1.5 pt-1.5 flex justify-between">
            <span className="text-[10px] text-white/60">Avg/yr</span>
            <span className="text-xs font-bold">{formatCurrency(yearValues.reduce((s, v) => s + v.value, 0) / yearValues.length)}</span>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-[#03143B]" />
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryTab({
  summary,
  projection,
  hrOutput,
  legalOutput,
  employeeOutput,
  wisqLicenseCost,
  narrative,
  contractYears,
}: {
  summary: ReturnType<typeof calculateROISummary>;
  projection: ReturnType<typeof calculateMultiYearProjection>;
  hrOutput: ReturnType<typeof calculateHROperationsROI>;
  legalOutput: ReturnType<typeof calculateLegalComplianceROI>;
  employeeOutput: ReturnType<typeof calculateEmployeeExperienceROI>;
  wisqLicenseCost: number;
  narrative: string;
  contractYears: number;
}) {
  const yearColors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];
  const yrs = summary.yearResults;
  const total = summary.hrOpsSavings + summary.legalSavings + summary.productivitySavings;
  const hrPct = total > 0 ? (summary.hrOpsSavings / total) * 100 : 0;
  const legalPct = total > 0 ? (summary.legalSavings / total) * 100 : 0;
  const prodPct = total > 0 ? (summary.productivitySavings / total) * 100 : 0;

  // Per-year data for HR sub-items
  const hrYearCosts = hrOutput.yearCostResults;
  const legalYearResults = legalOutput.yearResults ?? [];
  const exYearResults = employeeOutput.yearResults ?? [];
  const nYrs = contractYears || 1;

  // Cumulative chart dimensions
  const chartW = 600;
  const chartH = 220;
  const pad = { top: 10, right: 10, bottom: 30, left: 55 };
  const innerW = chartW - pad.left - pad.right;
  const innerH = chartH - pad.top - pad.bottom;

  // Build cumulative data points at each year boundary (x=0 through x=contractYears)
  // Value grows linearly within each year; at x=0 everything is 0
  const cumPoints: { x: number; hr: number; legal: number; prod: number }[] = [{ x: 0, hr: 0, legal: 0, prod: 0 }];
  let cumHR = 0, cumLegal = 0, cumProd = 0;
  for (const yr of yrs) {
    cumHR += yr.hrOpsSavings;
    cumLegal += yr.legalSavings;
    cumProd += yr.productivitySavings;
    cumPoints.push({ x: yr.year, hr: cumHR, legal: cumLegal, prod: cumProd });
  }

  // License cost step function: paid upfront at start of each year
  // Points: (0, cost), (1-, cost), (1, 2*cost), (2-, 2*cost), ...
  const costSteps: { x: number; cost: number }[] = [];
  for (let i = 0; i < contractYears; i++) {
    const paid = (i + 1) * wisqLicenseCost;
    costSteps.push({ x: i, cost: paid });       // jump up at start of year
    costSteps.push({ x: i + 1, cost: paid });   // flat until next year
  }

  const maxCumVal = Math.max(
    ...cumPoints.map(d => d.hr + d.legal + d.prod),
    ...costSteps.map(d => d.cost),
    1
  );

  const xScale = (x: number) => pad.left + (x / contractYears) * innerW;
  const yScale = (val: number) => pad.top + innerH - (val / maxCumVal) * innerH;

  // Build area paths from cumPoints (linear interpolation = incremental value recognition)
  const buildAreaPath = (
    topFn: (d: typeof cumPoints[0]) => number,
    bottomFn: (d: typeof cumPoints[0]) => number
  ) => {
    if (cumPoints.length < 2) return '';
    const topPts = cumPoints.map(d => `${xScale(d.x)},${yScale(topFn(d))}`);
    const bottomPts = [...cumPoints].reverse().map(d => `${xScale(d.x)},${yScale(bottomFn(d))}`);
    return `M${topPts.join('L')}L${bottomPts.join('L')}Z`;
  };

  const hrArea = buildAreaPath(d => d.hr, () => 0);
  const legalArea = buildAreaPath(d => d.hr + d.legal, d => d.hr);
  const prodArea = buildAreaPath(d => d.hr + d.legal + d.prod, d => d.hr + d.legal);
  const costLine = costSteps.map(d => `${xScale(d.x)},${yScale(d.cost)}`).join(' ');

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <HoverYearPopup label="Gross Value" yearValues={yrs.map(yr => ({ year: yr.year, value: yr.grossValue }))}>
          <div className="bg-gradient-to-br from-[#03143B] to-[#020e29] rounded-lg p-5 text-white cursor-default">
            <p className="text-xs opacity-60 mb-1">Gross Annual Value</p>
            <p className="text-2xl font-bold">{formatCompactCurrency(summary.grossAnnualValue)}</p>
            <p className="text-[10px] opacity-40 mt-1">avg/yr</p>
          </div>
        </HoverYearPopup>
        <HoverYearPopup label="ROI %" yearValues={yrs.map(yr => ({ year: yr.year, value: wisqLicenseCost > 0 ? (yr.netValue / wisqLicenseCost) * 100 : 0 }))}>
          <div className="bg-gradient-to-br from-[#03143B]/80 to-[#020e29]/80 rounded-lg p-5 text-white cursor-default">
            <p className="text-xs opacity-60 mb-1">ROI</p>
            <p className="text-2xl font-bold">{summary.totalROI.toFixed(0)}%</p>
            <p className="text-[10px] opacity-40 mt-1">avg annual return</p>
          </div>
        </HoverYearPopup>
        <div className="bg-gradient-to-br from-gray-600 to-gray-500 rounded-lg p-5 text-white">
          <p className="text-xs opacity-60 mb-1">Payback Period</p>
          <p className="text-2xl font-bold">{summary.paybackPeriodMonths.toFixed(1)} mo</p>
        </div>
        <HoverYearPopup label="Net Benefit" yearValues={yrs.map(yr => ({ year: yr.year, value: yr.netValue }))}>
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg p-5 text-white cursor-default">
            <p className="text-xs opacity-60 mb-1">Net Annual Benefit</p>
            <p className="text-2xl font-bold">{formatCompactCurrency(summary.netAnnualBenefit)}</p>
            <p className="text-[10px] opacity-40 mt-1">after ${formatCompactCurrency(wisqLicenseCost)} license</p>
          </div>
        </HoverYearPopup>
      </div>

      {/* Value Source Bar + Pillar Cards */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-[#03143B] mb-4">Where the Value Comes From</h4>

        {/* Stacked bar */}
        <div className="relative h-8 rounded-full overflow-hidden bg-gray-100 mb-4">
          <div className="absolute inset-y-0 left-0 bg-[#03143B] transition-all" style={{ width: `${hrPct}%` }} />
          <div className="absolute inset-y-0 bg-[#6b7fff] transition-all" style={{ left: `${hrPct}%`, width: `${legalPct}%` }} />
          <div className="absolute inset-y-0 bg-[#059669] transition-all" style={{ left: `${hrPct + legalPct}%`, width: `${prodPct}%` }} />
          {/* Labels on bar */}
          {hrPct > 12 && (
            <span className="absolute inset-y-0 flex items-center text-white text-xs font-bold px-3" style={{ left: 0, width: `${hrPct}%` }}>
              {hrPct.toFixed(0)}%
            </span>
          )}
          {legalPct > 12 && (
            <span className="absolute inset-y-0 flex items-center text-white text-xs font-bold px-2" style={{ left: `${hrPct}%`, width: `${legalPct}%` }}>
              {legalPct.toFixed(0)}%
            </span>
          )}
          {prodPct > 12 && (
            <span className="absolute inset-y-0 flex items-center justify-end text-white text-xs font-bold px-3" style={{ left: `${hrPct + legalPct}%`, width: `${prodPct}%` }}>
              {prodPct.toFixed(0)}%
            </span>
          )}
        </div>

        {/* Three pillar cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <HoverYearPopup label="HR Operations" yearValues={yrs.map(yr => ({ year: yr.year, value: yr.hrOpsSavings }))}>
            <div className="rounded-lg border-2 border-[#03143B]/20 p-4 cursor-default hover:border-[#03143B]/40 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-[#03143B]" />
                <span className="text-sm font-semibold text-[#03143B]">HR Operations</span>
              </div>
              <p className="text-xl font-bold text-[#03143B]">{formatCurrency(summary.hrOpsSavings)}<span className="text-xs font-normal text-gray-400">/yr</span></p>
              <div className="mt-2 space-y-0.5 text-[11px] text-gray-500">
                <div className="flex justify-between">
                  <span>Headcount reduction</span>
                  <span>{formatCurrency(hrOutput.headcountReductionSavings / nYrs)}</span>
                </div>
                {hrOutput.managerTimeSavings > 0 && (
                  <div className="flex justify-between">
                    <span>Manager time savings</span>
                    <span>{formatCurrency(hrOutput.managerTimeSavings / nYrs)}</span>
                  </div>
                )}
                {hrOutput.triageSavings > 0 && (
                  <div className="flex justify-between">
                    <span>Triage role savings</span>
                    <span>{formatCurrency(hrOutput.triageSavings / nYrs)}</span>
                  </div>
                )}
              </div>
            </div>
          </HoverYearPopup>

          <HoverYearPopup label="Legal & Compliance" yearValues={yrs.map(yr => ({ year: yr.year, value: yr.legalSavings }))}>
            <div className="rounded-lg border-2 border-[#6b7fff]/20 p-4 cursor-default hover:border-[#6b7fff]/40 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-[#6b7fff]" />
                <span className="text-sm font-semibold text-[#03143B]">Legal & Compliance</span>
              </div>
              <p className="text-xl font-bold text-[#03143B]">{formatCurrency(summary.legalSavings)}<span className="text-xs font-normal text-gray-400">/yr</span></p>
              <div className="mt-2 space-y-0.5 text-[11px] text-gray-500">
                <div className="flex justify-between">
                  <span>Legal cost avoidance</span>
                  <span>{formatCurrency(legalOutput.avoidedLegalCosts / nYrs)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Admin savings</span>
                  <span>{formatCurrency(legalOutput.adminCostSavings / nYrs)}</span>
                </div>
                {legalOutput.auditPrepSavings > 0 && (
                  <div className="flex justify-between">
                    <span>Audit prep</span>
                    <span>{formatCurrency(legalOutput.auditPrepSavings / nYrs)}</span>
                  </div>
                )}
                {legalOutput.riskValue > 0 && (
                  <div className="flex justify-between">
                    <span>Risk detection</span>
                    <span>{formatCurrency(legalOutput.riskValue / nYrs)}</span>
                  </div>
                )}
                {legalOutput.proactiveValue > 0 && (
                  <div className="flex justify-between">
                    <span>Proactive alerts</span>
                    <span>{formatCurrency(legalOutput.proactiveValue / nYrs)}</span>
                  </div>
                )}
              </div>
            </div>
          </HoverYearPopup>

          <HoverYearPopup label="Employee Experience" yearValues={yrs.map(yr => ({ year: yr.year, value: yr.productivitySavings }))}>
            <div className="rounded-lg border-2 border-[#059669]/20 p-4 cursor-default hover:border-[#059669]/40 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-[#059669]" />
                <span className="text-sm font-semibold text-[#03143B]">Employee Experience</span>
              </div>
              <p className="text-xl font-bold text-[#03143B]">{formatCurrency(summary.productivitySavings)}<span className="text-xs font-normal text-gray-400">/yr</span></p>
              <div className="mt-2 space-y-0.5 text-[11px] text-gray-500">
                <div className="flex justify-between">
                  <span>Hours saved/yr</span>
                  <span>{Math.round(employeeOutput.hoursSaved / nYrs).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Productivity value</span>
                  <span>{formatCurrency(employeeOutput.totalMonetaryValue / nYrs)}</span>
                </div>
              </div>
            </div>
          </HoverYearPopup>
        </div>
      </div>

      {/* Cumulative Value Chart */}
      {yrs.length > 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-[#03143B] mb-1">Cumulative Value Over Contract</h4>
          <p className="text-xs text-gray-400 mb-4">Stacked by pillar, dashed line = cumulative license cost</p>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(frac => {
              const y = pad.top + innerH - frac * innerH;
              return (
                <g key={frac}>
                  <line x1={pad.left} x2={chartW - pad.right} y1={y} y2={y} stroke="#e5e7eb" strokeWidth={0.5} />
                  <text x={pad.left - 5} y={y + 3} textAnchor="end" fontSize={9} fill="#9ca3af">
                    {formatCompactCurrency(frac * maxCumVal)}
                  </text>
                </g>
              );
            })}

            {/* Stacked areas */}
            <path d={hrArea} fill="#03143B" opacity={0.8} />
            <path d={legalArea} fill="#6b7fff" opacity={0.8} />
            <path d={prodArea} fill="#059669" opacity={0.8} />

            {/* License cost dashed line */}
            <polyline points={costLine} fill="none" stroke="#dc2626" strokeWidth={2} strokeDasharray="6,3" />

            {/* X-axis year boundary labels + cumulative value dots */}
            {cumPoints.map(d => {
              const x = xScale(d.x);
              const total = d.hr + d.legal + d.prod;
              const totalY = yScale(total);
              return (
                <g key={d.x}>
                  <text x={x} y={chartH - 5} textAnchor="middle" fontSize={10} fill="#6b7280" fontWeight="600">
                    {d.x === 0 ? 'Start' : `Y${d.x}`}
                  </text>
                  {d.x > 0 && (
                    <>
                      <circle cx={x} cy={totalY} r={3} fill="#03143B" />
                      <text x={x} y={totalY - 8} textAnchor="middle" fontSize={9} fill="#03143B" fontWeight="700">
                        {formatCompactCurrency(total)}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {/* Legend */}
            <rect x={pad.left + 5} y={pad.top + 2} width={8} height={8} rx={2} fill="#03143B" />
            <text x={pad.left + 16} y={pad.top + 10} fontSize={8} fill="#6b7280">HR Ops</text>
            <rect x={pad.left + 55} y={pad.top + 2} width={8} height={8} rx={2} fill="#6b7fff" />
            <text x={pad.left + 66} y={pad.top + 10} fontSize={8} fill="#6b7280">Legal</text>
            <rect x={pad.left + 95} y={pad.top + 2} width={8} height={8} rx={2} fill="#059669" />
            <text x={pad.left + 106} y={pad.top + 10} fontSize={8} fill="#6b7280">EX</text>
            <line x1={pad.left + 140} x2={pad.left + 155} y1={pad.top + 6} y2={pad.top + 6} stroke="#dc2626" strokeWidth={1.5} strokeDasharray="4,2" />
            <text x={pad.left + 158} y={pad.top + 10} fontSize={8} fill="#6b7280">License Cost</text>
          </svg>
        </div>
      )}

      {/* Detailed Breakdown with Hover Popups */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-[#03143B] mb-4">Detailed Breakdown</h4>
        <div className="space-y-2">
          {/* HR Ops items */}
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium px-3 pt-2">HR Operations</div>
          <HoverBreakdownRow
            label="Tier 0/1 Workload Savings"
            avgValue={hrYearCosts.reduce((s, yr) => s + yr.tier01Savings, 0) / nYrs}
            yearValues={hrYearCosts.map(yr => ({ year: yr.year, value: yr.tier01Savings }))}
          />
          <HoverBreakdownRow
            label="Tier 2+ Workload Savings"
            avgValue={hrYearCosts.reduce((s, yr) => s + yr.tier2Savings, 0) / nYrs}
            yearValues={hrYearCosts.map(yr => ({ year: yr.year, value: yr.tier2Savings }))}
          />
          {hrOutput.managerTimeSavings > 0 && (
            <HoverBreakdownRow
              label="Manager Time Savings"
              avgValue={hrOutput.managerTimeSavings / nYrs}
              yearValues={hrYearCosts.map(yr => ({ year: yr.year, value: yr.managerSavings }))}
            />
          )}
          {hrOutput.triageSavings > 0 && (
            <HoverBreakdownRow
              label="Triage Role Savings"
              avgValue={hrOutput.triageSavings / nYrs}
              yearValues={hrYearCosts.map(yr => ({ year: yr.year, value: yr.triageSavings }))}
            />
          )}

          {/* Legal items */}
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium px-3 pt-3">Legal & Compliance</div>
          <HoverBreakdownRow
            label="Legal Cost Avoidance"
            avgValue={legalOutput.avoidedLegalCosts / nYrs}
            yearValues={legalYearResults.map(yr => ({ year: yr.year, value: yr.avoidedLegalCosts }))}
          />
          <HoverBreakdownRow
            label="Administrative Savings"
            avgValue={legalOutput.adminCostSavings / nYrs}
            yearValues={legalYearResults.map(yr => ({ year: yr.year, value: yr.adminCostSavings }))}
          />
          {legalOutput.auditPrepSavings > 0 && (
            <HoverBreakdownRow
              label="Audit Prep Savings"
              avgValue={legalOutput.auditPrepSavings / nYrs}
              yearValues={legalYearResults.map(yr => ({ year: yr.year, value: yr.auditPrepSavings }))}
            />
          )}
          {legalOutput.riskValue > 0 && (
            <HoverBreakdownRow
              label="Risk Pattern Detection"
              avgValue={legalOutput.riskValue / nYrs}
              yearValues={legalYearResults.map(yr => ({ year: yr.year, value: yr.riskValue }))}
            />
          )}
          {legalOutput.proactiveValue > 0 && (
            <HoverBreakdownRow
              label="Proactive Compliance Alerts"
              avgValue={legalOutput.proactiveValue / nYrs}
              yearValues={legalYearResults.map(yr => ({ year: yr.year, value: yr.proactiveValue }))}
            />
          )}

          {/* EX items */}
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium px-3 pt-3">Employee Experience</div>
          <HoverBreakdownRow
            label="Productivity Savings"
            avgValue={employeeOutput.totalMonetaryValue / nYrs}
            yearValues={exYearResults.map(yr => ({ year: yr.year, value: yr.totalMonetaryValue }))}
          />

          {/* Total row */}
          <div className="border-t-2 border-[#03143B]/20 mt-3 pt-3 flex justify-between items-center px-3 py-2">
            <span className="font-semibold text-[#03143B]">Total Annual Value (avg)</span>
            <span className="text-lg font-bold text-[#03143B]">{formatCurrency(summary.grossAnnualValue)}</span>
          </div>
          <div className="flex justify-between items-center px-3 py-1 text-sm text-gray-500">
            <span>Less: Wisq license cost</span>
            <span>−{formatCurrency(wisqLicenseCost)}</span>
          </div>
          <div className="flex justify-between items-center px-3 py-2 bg-emerald-50 rounded-lg">
            <span className="font-semibold text-emerald-700">Net Annual Benefit</span>
            <span className="text-lg font-bold text-emerald-700">{formatCurrency(summary.netAnnualBenefit)}</span>
          </div>
        </div>
      </div>

      {/* Multi-Year Projection cards */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-[#03143B] mb-4">Contract Projection</h4>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${projection.years.length + 2}, minmax(0, 1fr))` }}>
          {projection.years.map((yr) => (
            <div key={yr.year} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1" style={{ color: yearColors[(yr.year - 1) % yearColors.length] }}>Year {yr.year}</p>
              <p className="text-sm font-bold text-[#03143B]">{formatCurrency(yr.value)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Net: {formatCurrency(yr.net)}</p>
            </div>
          ))}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Total</p>
            <p className="text-sm font-bold text-[#03143B]">{formatCurrency(projection.total)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{contractYears} years</p>
          </div>
          <div className="bg-gradient-to-br from-[#03143B] to-[#020e29] rounded-lg p-3 text-center text-white">
            <p className="text-xs opacity-60 mb-1">Net Total</p>
            <p className="text-sm font-bold">{formatCurrency(projection.netTotal)}</p>
            <p className="text-[10px] opacity-40 mt-0.5">After license</p>
          </div>
        </div>
      </div>

      {/* Business Case Narrative */}
      {narrative && (
        <div className="bg-[#03143B]/5 border border-[#03143B]/15 rounded-lg p-5">
          <h4 className="font-semibold text-[#03143B] mb-2">Business Case Insight</h4>
          <p className="text-gray-700 leading-relaxed text-sm">{narrative}</p>
        </div>
      )}
    </div>
  );
}

function HoverBreakdownRow({
  label,
  avgValue,
  yearValues,
}: {
  label: string;
  avgValue: number;
  yearValues: { year: number; value: number }[];
}) {
  const [show, setShow] = useState(false);
  const yearColors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];
  return (
    <div
      className="relative flex justify-between items-center px-3 py-1.5 rounded hover:bg-gray-50 cursor-default transition-colors"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="text-sm text-gray-700">{label}</span>
      <span className="text-sm font-semibold text-[#03143B]">{formatCurrency(avgValue)}<span className="text-xs font-normal text-gray-400">/yr</span></span>
      {show && yearValues.length > 1 && (
        <div className="absolute z-50 right-0 bottom-full mb-1 bg-[#03143B] text-white rounded-lg shadow-xl p-3 min-w-[160px]">
          <p className="text-[10px] uppercase tracking-wider text-white/50 font-medium mb-1">{label}</p>
          {yearValues.map((yv) => (
            <div key={yv.year} className="flex justify-between items-center py-0.5">
              <span className="text-xs font-medium" style={{ color: yearColors[(yv.year - 1) % yearColors.length] }}>Y{yv.year}</span>
              <span className="text-xs font-semibold">{formatCurrency(yv.value)}</span>
            </div>
          ))}
          <div className="absolute top-full right-4 -mt-px">
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-[#03143B]" />
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Business Case Narrative Generator
// ──────────────────────────────────────────────

function generateBusinessCaseNarrative(
  summary: ReturnType<typeof calculateROISummary>,
  hrOutput: ReturnType<typeof calculateHROperationsROI>,
  profile: CompanyProfile
): string {
  const { hrOpsSavings, legalSavings, productivitySavings, totalAnnualValue } = summary;

  if (totalAnnualValue <= 0) return '';

  const hrPercent = (hrOpsSavings / totalAnnualValue) * 100;
  const legalPercent = (legalSavings / totalAnnualValue) * 100;
  const prodPercent = (productivitySavings / totalAnnualValue) * 100;

  const avgAnnualManagerSavings = hrOutput.managerTimeSavings / (hrOutput.yearResults.length || 1);
  const avgAnnualHeadcountSavings = hrOutput.headcountReductionSavings / (hrOutput.yearResults.length || 1);
  const managerDriven = avgAnnualManagerSavings > avgAnnualHeadcountSavings;

  if (legalPercent > hrPercent && legalPercent > prodPercent) {
    return `Your primary value driver is risk reduction and compliance protection, accounting for ${legalPercent.toFixed(0)}% of total value. For ${INDUSTRY_LABELS[profile.industry]} organizations, reducing legal exposure and improving accuracy on high-stakes cases delivers the strongest ROI. Wisq's audit-ready documentation and proactive compliance alerts create a defensible system of record.`;
  }

  if (managerDriven) {
    return `The biggest impact for your organization comes from giving managers back productive time. With a ${ORG_MODEL_LABELS[profile.orgModel].toLowerCase()} HR model, managers are currently spending significant hours on HR tasks that Wisq can deflect or streamline. Combined with operational efficiency and compliance value, this creates a compelling ${formatCompactCurrency(summary.netAnnualBenefit)} in annual return on investment.`;
  }

  if (hrPercent > 50) {
    const lastYearFTE = hrOutput.yearCostResults[hrOutput.yearCostResults.length - 1]?.fteReduction ?? 0;
    return `HR operational efficiency is your strongest value lever at ${hrPercent.toFixed(0)}% of total value. Wisq's AI-powered deflection reduces your effective cost per case by automating Tier 0-1 responses and streamlining Tier 2+ workflows. This translates to ${lastYearFTE.toFixed(1)} FTE in workload reduction by the final contract year.`;
  }

  return `Wisq delivers balanced value across operations (${hrPercent.toFixed(0)}%), compliance (${legalPercent.toFixed(0)}%), and employee experience (${prodPercent.toFixed(0)}%). This diversified ROI means the business case holds up even if any single value stream performs below projections. Net annual benefit of ${formatCompactCurrency(summary.netAnnualBenefit)} annually.`;
}

// ──────────────────────────────────────────────
// Reusable Components
// ──────────────────────────────────────────────

/**
 * Small citation shown below benchmark-estimated fields.
 * Only renders if the field is in the estimatedFields set.
 */
function SourceCitation({ fieldKey, estimatedFields }: { fieldKey: string; estimatedFields: Set<string> }) {
  if (!estimatedFields.has(fieldKey)) return null;
  const fieldSource = FIELD_SOURCES[fieldKey];
  if (!fieldSource) return null;

  const sources = fieldSource.sourceIds
    .map(id => BENCHMARK_SOURCES[id])
    .filter(Boolean);

  return (
    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
      {fieldSource.note}
      {' — '}
      {sources.map((src, i) => (
        <span key={src.id}>
          {i > 0 && ', '}
          {src.url ? (
            <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
              {src.name} ({src.year})
            </a>
          ) : (
            <span>{src.name} ({src.year})</span>
          )}
        </span>
      ))}
    </p>
  );
}

function InputField({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  type: 'number' | 'currency' | 'formatted-number';
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const rounded = Math.round(value * 100) / 100;
  const formattedValue =
    type === 'currency' || type === 'formatted-number'
      ? rounded.toLocaleString()
      : String(rounded);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setEditing(true);
    // Show raw number (no commas) when editing
    setDraft(value === 0 ? '' : String(value));
    // Select all on focus for easy replacement
    setTimeout(() => e.target.select(), 0);
  };

  const handleBlur = () => {
    setEditing(false);
    const raw = draft.replace(/[$,]/g, '');
    const num = Number(raw);
    onChange(!isNaN(num) && raw !== '' ? num : 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        {type === 'currency' && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
        )}
        <input
          type="text"
          value={editing ? draft : formattedValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03143B] focus:border-transparent ${
            type === 'currency' ? 'pl-7' : ''
          }`}
        />
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-medium text-[#03143B]">
          {Math.round(value * 100) / 100}
          {unit}
        </span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#03143B]"
      />
    </div>
  );
}

/**
 * Multi-year slider: one draggable colored thumb per year on a shared track.
 * values[i] is the rate for year i. Each thumb drags independently.
 */
function MultiYearSlider({
  label,
  values,
  onChange,
  min = 0,
  max = 100,
  yearColors,
}: {
  label: string;
  values: number[];
  onChange: (yearIndex: number, value: number) => void;
  min?: number;
  max?: number;
  yearColors: string[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<number | null>(null);

  const maxVal = Math.max(...values, min);
  const fillPct = ((maxVal - min) / (max - min)) * 100;

  const valueFromClientX = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return min;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(min + pct * (max - min));
  };

  const clampMonotonic = (i: number, raw: number): number => {
    const lo = i > 0 ? values[i - 1] : min;
    const hi = i < values.length - 1 ? values[i + 1] : max;
    return Math.max(lo, Math.min(hi, raw));
  };

  const handlePointerDown = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = i;
    const raw = valueFromClientX(e.clientX);
    onChange(i, clampMonotonic(i, raw));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingRef.current === null) return;
    const i = draggingRef.current;
    const raw = valueFromClientX(e.clientX);
    onChange(i, clampMonotonic(i, raw));
  };

  const handlePointerUp = () => {
    draggingRef.current = null;
  };

  // Click on track to move nearest dot
  const handleTrackClick = (e: React.MouseEvent) => {
    if (draggingRef.current !== null) return;
    const raw = valueFromClientX(e.clientX);
    // Find nearest dot
    let nearestIdx = 0;
    let nearestDist = Infinity;
    values.forEach((v, i) => {
      const dist = Math.abs(v - raw);
      if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
    });
    onChange(nearestIdx, clampMonotonic(nearestIdx, raw));
  };

  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-xs font-medium text-gray-700">{label}</label>
      </div>
      <div
        ref={trackRef}
        className="relative h-6 cursor-pointer select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleTrackClick}
      >
        {/* Track background */}
        <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-1.5 bg-gray-200 rounded-full" />
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 bg-gray-300 rounded-full"
          style={{ width: `${fillPct}%` }}
        />
        {/* Draggable colored dots */}
        {values.map((val, i) => {
          const pct = ((val - min) / (max - min)) * 100;
          const color = yearColors[i % yearColors.length];
          return (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing"
              style={{ left: `${pct}%`, zIndex: 10 + i }}
              onPointerDown={handlePointerDown(i)}
              title={`Year ${i + 1}: ${Math.round(val)}%`}
            >
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
              />
            </div>
          );
        })}
      </div>
      {/* Year labels below */}
      <div className="flex gap-3 mt-0.5 flex-wrap">
        {values.map((val, i) => (
          <span key={i} className="text-[10px] font-medium" style={{ color: yearColors[i % yearColors.length] }}>
            Y{i + 1}: {Math.round(val)}%
          </span>
        ))}
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-lg ${
        highlight ? 'bg-[#03143B] text-white' : 'bg-white border border-gray-200'
      }`}
    >
      <p className={`text-sm mb-1 ${highlight ? 'text-white/80' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-lg font-semibold ${highlight ? '' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function BreakdownRow({
  label,
  description,
  value,
  total,
  color,
}: {
  label: string;
  description: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <div>
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-[#03143B]">{formatCurrency(value)}</p>
        <p className="text-sm text-gray-500">{percentage.toFixed(1)}% of total</p>
      </div>
    </div>
  );
}

function ProjectionCard({
  label,
  value,
  sublabel,
  highlight,
}: {
  label: string;
  value: number;
  sublabel: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-lg text-center ${
        highlight
          ? 'bg-gradient-to-br from-[#03143B] to-[#020e29] text-white'
          : 'bg-gray-50 border border-gray-200'
      }`}
    >
      <p className={`text-sm mb-1 ${highlight ? 'text-white/80' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-lg font-bold ${highlight ? '' : 'text-[#03143B]'}`}>
        {formatCurrency(value)}
      </p>
      <p className={`text-xs mt-1 ${highlight ? 'text-white/60' : 'text-gray-400'}`}>{sublabel}</p>
    </div>
  );
}
