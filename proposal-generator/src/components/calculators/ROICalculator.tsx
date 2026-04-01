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

  // Calculate ROI outputs
  const hrOutput = useMemo(() => calculateHROperationsROI(hrInputs), [hrInputs]);

  const tier2PlusConfiguredCases = hrInputs.tier2Workflows.reduce(
    (sum, w) => sum + w.volumePerYear,
    0
  );

  const legalOutput = useMemo(
    () => calculateLegalComplianceROI(legalInputs, tier2PlusConfiguredCases),
    [legalInputs, tier2PlusConfiguredCases]
  );

  const employeeOutput = useMemo(
    () => calculateEmployeeExperienceROI(employeeInputs),
    [employeeInputs]
  );

  const summary = useMemo(
    () => calculateROISummary(hrOutput, legalOutput, employeeOutput, hrInputs.wisqLicenseCost, hrInputs.contractYears),
    [hrOutput, legalOutput, employeeOutput, hrInputs.wisqLicenseCost, hrInputs.contractYears]
  );

  const projection = useMemo(
    () => calculateMultiYearProjection(hrOutput, legalOutput.totalAvoidedCosts, employeeOutput.totalMonetaryValue, hrInputs.wisqLicenseCost),
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
        />
      )}

      {activeTab === 'legal-compliance' && (
        <LegalComplianceTab
          inputs={legalInputs}
          output={legalOutput}
          onChange={onLegalChange}
          tier2PlusConfiguredCases={tier2PlusConfiguredCases}
          estimatedFields={estimatedFields}
        />
      )}

      {activeTab === 'employee-experience' && (
        <EmployeeExperienceTab
          inputs={employeeInputs}
          output={employeeOutput}
          onChange={onEmployeeChange}
          estimatedFields={estimatedFields}
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
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <h4 className="font-semibold text-[#03143B] text-sm">{title}</h4>
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

function HROperationsTab({
  inputs,
  output,
  onChange,
  onAddWorkflow,
  onRemoveWorkflow,
  onUpdateWorkflow,
  estimatedFields,
}: {
  inputs: HROperationsInputs;
  output: ReturnType<typeof calculateHROperationsROI>;
  onChange: (inputs: Partial<HROperationsInputs>) => void;
  onAddWorkflow: () => void;
  onRemoveWorkflow: (id: string) => void;
  onUpdateWorkflow: (id: string, updates: Partial<Tier2Workflow>) => void;
  estimatedFields: Set<string>;
}) {
  const YEAR_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];

  // Track which sliders the user has manually dragged (local to session)
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());

  // Normalize for old data that may lack new fields
  const contractYears = inputs.contractYears || 3;
  const yearSettings = inputs.yearSettings?.length
    ? inputs.yearSettings
    : [
        { wisqEffectiveness: 30, workforceChange: 0 },
        { wisqEffectiveness: 60, workforceChange: 5 },
        { wisqEffectiveness: 75, workforceChange: 10 },
      ].slice(0, contractYears);

  const tier01DeflectionByYear = inputs.tier01DeflectionByYear?.length
    ? inputs.tier01DeflectionByYear
    : yearSettings.map(s => 80 * s.wisqEffectiveness / 100);

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
      // Tier 0-1 deflection
      if (!modifiedFields.has('tier01Deflection')) {
        const baseDef = 80; // base deflection ceiling
        batch.tier01DeflectionByYear = newSettings.map(s => Math.round(baseDef * s.wisqEffectiveness / 100));
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

  const handleContractYearsChange = (years: number) => {
    const defaultEffectiveness = [30, 60, 75, 85, 90];
    const defaultGrowth = [0, 5, 10, 12, 15];
    const newSettings: ContractYearSettings[] = [];
    for (let i = 0; i < years; i++) {
      newSettings.push(
        (inputs.yearSettings || [])[i] ?? {
          wisqEffectiveness: defaultEffectiveness[i] ?? 90,
          workforceChange: defaultGrowth[i] ?? 15,
        }
      );
    }
    // Resize all per-year arrays
    const baseDef01 = 80;

    const newTier01 = newSettings.map((s, i) =>
      tier01DeflectionByYear[i] ?? Math.round(baseDef01 * s.wisqEffectiveness / 100)
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
    setModifiedFields(new Set()); // reset on contract length change
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600">
        Model how Wisq reduces workload across contract years, then translate hours saved into cost savings.
      </p>

      {/* Section 1: Contract & Wisq Effectiveness */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-[#03143B] mb-4">Contract & Wisq Effectiveness</h4>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Contract Length (Years)</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => handleContractYearsChange(n)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  contractYears === n
                    ? 'bg-[#03143B] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Wisq Effectiveness by Year</p>
            <p className="text-xs text-gray-500 mb-3">
              How effective Wisq is at reaching max deflection/effort reduction rates each year
            </p>
            <div className="space-y-3">
              {yearSettings.map((setting, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span
                    className="text-sm font-medium w-14 shrink-0"
                    style={{ color: YEAR_COLORS[i % YEAR_COLORS.length] }}
                  >
                    Year {i + 1}
                  </span>
                  <div className="flex-1 relative">
                    <input
                      type="range"
                      value={setting.wisqEffectiveness}
                      onChange={(e) => updateYearSetting(i, { wisqEffectiveness: Number(e.target.value) })}
                      min={0}
                      max={100}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{
                        accentColor: YEAR_COLORS[i % YEAR_COLORS.length],
                        background: `linear-gradient(to right, ${YEAR_COLORS[i % YEAR_COLORS.length]} ${setting.wisqEffectiveness}%, #e5e7eb ${setting.wisqEffectiveness}%)`,
                      }}
                    />
                    {/* 80% soft cap marker */}
                    <div
                      className="absolute top-0 h-2 w-px bg-gray-400 pointer-events-none"
                      style={{ left: '80%' }}
                    />
                    <div
                      className="absolute text-[9px] text-gray-400 pointer-events-none -translate-x-1/2"
                      style={{ left: '80%', top: '10px' }}
                    >
                      80%
                    </div>
                  </div>
                  <span
                    className="text-sm font-semibold w-10 text-right"
                    style={{ color: YEAR_COLORS[i % YEAR_COLORS.length] }}
                  >
                    {setting.wisqEffectiveness}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Workforce Changes by Year</p>
            <p className="text-xs text-gray-500 mb-3">
              Expected growth or shrinkage relative to today (affects case volume)
            </p>
            <div className="space-y-3">
              {yearSettings.map((setting, i) => {
                const sliderPos = workforceValueToSlider(setting.workforceChange);
                const color = YEAR_COLORS[i % YEAR_COLORS.length];
                const fillPct = (sliderPos / (WORKFORCE_STEPS.length - 1)) * 100;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className="text-sm font-medium w-14 shrink-0"
                      style={{ color }}
                    >
                      Year {i + 1}
                    </span>
                    <input
                      type="range"
                      value={sliderPos}
                      onChange={(e) => {
                        const val = workforceSliderToValue(Number(e.target.value));
                        updateYearSetting(i, { workforceChange: val });
                      }}
                      min={0}
                      max={WORKFORCE_STEPS.length - 1}
                      step={1}
                      className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                      style={{
                        accentColor: color,
                        background: `linear-gradient(to right, ${color} ${fillPct}%, #e5e7eb ${fillPct}%)`,
                      }}
                    />
                    <span
                      className="text-sm font-semibold w-14 text-right"
                      style={{ color }}
                    >
                      {setting.workforceChange > 0 ? '+' : ''}{setting.workforceChange}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2 & 3: Case Inputs */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Tier 0-1 Simple Cases */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-[#03143B] mb-4">Tier 0-1: Simple Cases</h4>
          <div className="space-y-4">
            <InputField
              label="Tier 0-1 Cases per Year"
              value={inputs.tier01CasesPerYear || 0}
              onChange={(v) => onChange({ tier01CasesPerYear: v })}
              type="formatted-number"
            />
            <SourceCitation fieldKey="tier01CasesPerYear" estimatedFields={estimatedFields} />
            <div className="flex gap-3 flex-wrap -mt-2">
              {output.yearResults.map((yr, i) => (
                <span key={i} className="text-[10px] font-medium" style={{ color: YEAR_COLORS[i % YEAR_COLORS.length] }}>
                  Y{yr.year}: {Math.round(yr.tier01Cases).toLocaleString()} cases
                </span>
              ))}
            </div>
            <InputField
              label="Avg Handle Time (minutes)"
              value={inputs.tier01AvgHandleTime}
              onChange={(v) => onChange({ tier01AvgHandleTime: v })}
              type="number"
            />
            <SourceCitation fieldKey="tier01AvgHandleTime" estimatedFields={estimatedFields} />
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
        </div>

        {/* Tier 2+ Complex Workflows */}
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
            <div className="space-y-3">
              {inputs.tier2Workflows.map((workflow, index) => (
                <div key={workflow.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Workflow {index + 1}</span>
                    <button
                      onClick={() => onRemoveWorkflow(workflow.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Name</label>
                      <input
                        type="text"
                        value={workflow.name}
                        onChange={(e) => onUpdateWorkflow(workflow.id, { name: e.target.value })}
                        placeholder="Name"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
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
                  <div className="flex gap-3 flex-wrap -mt-0.5">
                    {output.yearResults.map((yr, i) => (
                      <span key={i} className="text-[10px] font-medium" style={{ color: YEAR_COLORS[i % YEAR_COLORS.length] }}>
                        Y{yr.year}: {Math.round(workflow.volumePerYear * yr.volumeMultiplier).toLocaleString()} cases
                      </span>
                    ))}
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
      </div>

      {/* Hours Saved by Year (right after case inputs) */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-[#03143B]/20 p-6">
        <h4 className="font-semibold text-[#03143B] mb-4">Hours Saved by Year (Current vs. Wisq)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 text-gray-600 font-medium">Year</th>
                <th className="text-right py-2 px-4 text-gray-600 font-medium">Current Hours</th>
                <th className="text-right py-2 px-4 text-gray-600 font-medium">With Wisq</th>
                <th className="text-right py-2 px-4 text-gray-600 font-medium">Hours Saved</th>
                <th className="text-right py-2 px-4 text-gray-600 font-medium">Cases Deflected</th>
                <th className="text-right py-2 pl-4 text-gray-600 font-medium">Workload Reduction</th>
              </tr>
            </thead>
            <tbody>
              {output.yearResults.map((yr) => (
                <tr key={yr.year} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-medium" style={{ color: YEAR_COLORS[(yr.year - 1) % YEAR_COLORS.length] }}>
                    Year {yr.year} <span className="text-gray-400 font-normal text-xs">({yr.volumeMultiplier.toFixed(2)}x)</span>
                  </td>
                  <td className="text-right py-2 px-4 text-gray-700">{Math.round(yr.currentTotalMinutes / 60).toLocaleString()}</td>
                  <td className="text-right py-2 px-4 text-gray-700">{Math.round(yr.futureTotalMinutes / 60).toLocaleString()}</td>
                  <td className="text-right py-2 px-4 font-semibold text-[#03143B]">{Math.round(yr.hoursSaved).toLocaleString()}</td>
                  <td className="text-right py-2 px-4 text-gray-700">{Math.round(yr.casesDeflected).toLocaleString()}</td>
                  <td className="text-right py-2 pl-4 font-semibold text-[#03143B]">{(yr.workloadReductionPercent * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#03143B]/20">
                <td className="py-2 pr-4 font-semibold text-[#03143B]">Total</td>
                <td className="text-right py-2 px-4" />
                <td className="text-right py-2 px-4" />
                <td className="text-right py-2 px-4 font-bold text-[#03143B]">{Math.round(output.totalHoursSavedOverContract).toLocaleString()}</td>
                <td className="text-right py-2 px-4" />
                <td className="text-right py-2 pl-4" />
              </tr>
            </tfoot>
          </table>
        </div>
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
                <th className="text-right py-2 px-4 text-gray-600 font-medium">Headcount Savings</th>
                {output.yearCostResults.some((yr) => yr.managerSavings > 0) && (
                  <th className="text-right py-2 px-4 text-gray-600 font-medium">Manager Savings</th>
                )}
                {output.yearCostResults.some((yr) => yr.triageSavings > 0) && (
                  <th className="text-right py-2 px-4 text-gray-600 font-medium">Triage Savings</th>
                )}
                <th className="text-right py-2 px-4 text-gray-600 font-medium">FTE Reduction</th>
                <th className="text-right py-2 pl-4 text-gray-600 font-medium">Total Savings</th>
              </tr>
            </thead>
            <tbody>
              {output.yearCostResults.map((yr) => (
                <tr key={yr.year} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-medium" style={{ color: YEAR_COLORS[(yr.year - 1) % YEAR_COLORS.length] }}>
                    Year {yr.year} <span className="text-gray-400 font-normal text-xs">({output.yearResults[yr.year - 1]?.volumeMultiplier.toFixed(2)}x)</span>
                  </td>
                  <td className="text-right py-2 px-4 text-gray-700">{formatCurrency(yr.headcountSavings)}</td>
                  {output.yearCostResults.some((y) => y.managerSavings > 0) && (
                    <td className="text-right py-2 px-4 text-gray-700">{formatCurrency(yr.managerSavings)}</td>
                  )}
                  {output.yearCostResults.some((y) => y.triageSavings > 0) && (
                    <td className="text-right py-2 px-4 text-gray-700">{formatCurrency(yr.triageSavings)}</td>
                  )}
                  <td className="text-right py-2 px-4 text-gray-700">{yr.fteReduction.toFixed(1)} FTE</td>
                  <td className="text-right py-2 pl-4 font-semibold text-[#03143B]">{formatCurrency(yr.totalSavings)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#03143B]/20">
                <td className="py-2 pr-4 font-semibold text-[#03143B]">Contract Total</td>
                <td className="text-right py-2 px-4 font-bold text-[#03143B]">{formatCurrency(output.headcountReductionSavings)}</td>
                {output.yearCostResults.some((y) => y.managerSavings > 0) && (
                  <td className="text-right py-2 px-4 font-bold text-[#03143B]">{formatCurrency(output.managerTimeSavings)}</td>
                )}
                {output.yearCostResults.some((y) => y.triageSavings > 0) && (
                  <td className="text-right py-2 px-4 font-bold text-[#03143B]">{formatCurrency(output.triageSavings)}</td>
                )}
                <td className="text-right py-2 px-4" />
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
  estimatedFields,
}: {
  inputs: LegalComplianceInputs;
  output: ReturnType<typeof calculateLegalComplianceROI>;
  onChange: (inputs: Partial<LegalComplianceInputs>) => void;
  tier2PlusConfiguredCases: number;
  estimatedFields: Set<string>;
}) {
  return (
    <div className="space-y-6">
      <p className="text-gray-600">
        Quantify the financial impact of accurate, compliant HR guidance. Every incorrect answer in
        high-stakes situations carries legal and compliance risk.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-[#03143B] mb-4">Case Volume & Risk Inputs</h4>
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
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-[#03143B] mb-4">Accuracy Comparison</h4>
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
          </div>
        </div>
      </div>

      {/* Admin Cost Component */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-[#03143B] mb-4">Administrative Cost Component</h4>
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
      </div>

      {/* Audit Preparation & Remediation */}
      <CollapsibleSection
        title="Audit Preparation & Remediation"
        defaultOpen={inputs.auditPrep?.enabled ?? false}
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
          </div>
        )}
      </CollapsibleSection>

      {/* Risk Pattern Detection */}
      <CollapsibleSection
        title="Risk Pattern Detection"
        defaultOpen={inputs.riskPatternDetection?.enabled ?? false}
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
          <div className="ml-6">
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
          </div>
        )}
      </CollapsibleSection>

      {/* Proactive Compliance Alerts */}
      <CollapsibleSection
        title="Proactive Compliance Alerts"
        defaultOpen={inputs.proactiveAlerts?.enabled ?? false}
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
          <div className="ml-6">
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
          </div>
        )}
      </CollapsibleSection>

      {/* Results */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-[#03143B]/20 p-6">
        <h4 className="font-semibold text-[#03143B] mb-4">Legal & Compliance Results</h4>
        <div className="grid md:grid-cols-4 gap-4">
          <ResultCard label="High-Stakes Cases/Year" value={output.highStakesCases.toLocaleString()} />
          <ResultCard label="Incidents Avoided" value={output.avoidedIncidents.toFixed(1)} />
          <ResultCard label="Avoided Legal Costs" value={formatCurrency(output.avoidedLegalCosts)} />
          <ResultCard
            label="Total Avoided Costs"
            value={formatCurrency(output.totalAvoidedCosts)}
            highlight
          />
        </div>

        {/* Compliance sub-breakdown */}
        {(output.auditPrepSavings > 0 || output.riskValue > 0 || output.proactiveValue > 0) && (
          <div className="mt-4 pt-4 border-t border-[#03143B]/10 space-y-2">
            <p className="text-sm font-medium text-gray-600">Value Stream Breakdown</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="bg-white/60 rounded p-3">
                <p className="text-gray-500">Legal Cost Avoidance</p>
                <p className="font-semibold text-[#03143B]">
                  {formatCurrency(output.avoidedLegalCosts)}
                </p>
              </div>
              <div className="bg-white/60 rounded p-3">
                <p className="text-gray-500">Admin Savings</p>
                <p className="font-semibold text-[#03143B]">
                  {formatCurrency(output.adminCostSavings)}
                </p>
              </div>
              {output.auditPrepSavings > 0 && (
                <div className="bg-white/60 rounded p-3">
                  <p className="text-gray-500">Audit Prep Savings</p>
                  <p className="font-semibold text-[#03143B]">
                    {formatCurrency(output.auditPrepSavings)}
                  </p>
                </div>
              )}
              {output.riskValue > 0 && (
                <div className="bg-white/60 rounded p-3">
                  <p className="text-gray-500">Risk Detection Value</p>
                  <p className="font-semibold text-[#03143B]">
                    {formatCurrency(output.riskValue)}
                  </p>
                </div>
              )}
              {output.proactiveValue > 0 && (
                <div className="bg-white/60 rounded p-3">
                  <p className="text-gray-500">Proactive Alerts Value</p>
                  <p className="font-semibold text-[#03143B]">
                    {formatCurrency(output.proactiveValue)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
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
}: {
  inputs: EmployeeExperienceInputs;
  output: ReturnType<typeof calculateEmployeeExperienceROI>;
  onChange: (inputs: Partial<EmployeeExperienceInputs>) => void;
  estimatedFields: Set<string>;
}) {
  return (
    <div className="space-y-6">
      <p className="text-gray-600">
        Every HR inquiry costs your organization in lost productivity. Wisq provides instant,
        personalized answers that save time for employees and managers.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-[#03143B] mb-4">Workforce & Inquiry Inputs</h4>
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
              label="Avg Employee Hourly Rate"
              value={inputs.avgEmployeeHourlyRate}
              onChange={(v) => onChange({ avgEmployeeHourlyRate: v })}
              type="currency"
            />
            <SourceCitation fieldKey="avgEmployeeHourlyRate" estimatedFields={estimatedFields} />
            <InputField
              label="Avg Manager Hourly Rate"
              value={inputs.avgManagerHourlyRate}
              onChange={(v) => onChange({ avgManagerHourlyRate: v })}
              type="currency"
            />
            <SourceCitation fieldKey="avgManagerHourlyRate" estimatedFields={estimatedFields} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-[#03143B] mb-4">Wisq Impact Parameters</h4>
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
            <SliderField
              label="Expected Satisfaction Improvement"
              value={inputs.employeeSatisfactionImprovement}
              onChange={(v) => onChange({ employeeSatisfactionImprovement: v })}
              min={0}
              max={100}
              unit="%"
            />
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Total Inquiries/Year</p>
              <p className="text-lg font-semibold">{output.totalInquiries.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-[#03143B]/20 p-6">
        <h4 className="font-semibold text-[#03143B] mb-4">Employee Experience Results</h4>
        <div className="grid md:grid-cols-4 gap-4">
          <ResultCard label="Hours Saved/Year" value={output.hoursSaved.toLocaleString()} />
          <ResultCard
            label="Employee Time Savings"
            value={formatCurrency(output.employeeTimeSavings)}
          />
          <ResultCard
            label="Manager Time Savings"
            value={formatCurrency(output.managerTimeSavings)}
          />
          <ResultCard
            label="Total Monetary Value"
            value={formatCurrency(output.totalMonetaryValue)}
            highlight
          />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Summary Tab
// ──────────────────────────────────────────────

function SummaryTab({
  summary,
  projection,
  hrOutput,
  legalOutput,
  employeeOutput,
  wisqLicenseCost,
  narrative,
}: {
  summary: ReturnType<typeof calculateROISummary>;
  projection: ReturnType<typeof calculateMultiYearProjection>;
  hrOutput: ReturnType<typeof calculateHROperationsROI>;
  legalOutput: ReturnType<typeof calculateLegalComplianceROI>;
  employeeOutput: ReturnType<typeof calculateEmployeeExperienceROI>;
  wisqLicenseCost: number;
  narrative: string;
}) {
  return (
    <div className="space-y-6">
      <p className="text-gray-600">
        Your complete ROI picture: combining operational efficiency, risk reduction, and
        productivity gains into a single, comprehensive business case.
      </p>

      {/* Business Case Narrative */}
      {narrative && (
        <div className="bg-[#03143B]/5 border border-[#03143B]/15 rounded-lg p-5">
          <h4 className="font-semibold text-[#03143B] mb-2">Business Case Insight</h4>
          <p className="text-gray-700 leading-relaxed">{narrative}</p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#03143B] to-[#020e29] rounded-lg p-6 text-white">
          <p className="text-sm opacity-80 mb-1">Gross Annual Value</p>
          <p className="text-2xl font-bold">{formatCompactCurrency(summary.grossAnnualValue)}</p>
        </div>
        <div className="bg-gradient-to-br from-[#03143B]/80 to-[#020e29]/80 rounded-lg p-6 text-white">
          <p className="text-sm opacity-80 mb-1">Return on Investment</p>
          <p className="text-2xl font-bold">{formatCompactCurrency(summary.netAnnualBenefit)}</p>
          <p className="text-xs opacity-60 mt-1">annually</p>
        </div>
        <div className="bg-gradient-to-br from-gray-600 to-gray-500 rounded-lg p-6 text-white">
          <p className="text-sm opacity-80 mb-1">Payback Period</p>
          <p className="text-2xl font-bold">{summary.paybackPeriodMonths.toFixed(1)} months</p>
        </div>
        <div className="bg-gradient-to-br from-[#03143B]/60 to-[#020e29]/60 rounded-lg p-6 text-white">
          <p className="text-sm opacity-80 mb-1">Net Annual Benefit</p>
          <p className="text-2xl font-bold">{formatCompactCurrency(summary.netAnnualBenefit)}</p>
        </div>
      </div>

      {/* Value Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-[#03143B] mb-4">Value Breakdown</h4>
        <div className="space-y-3">
          <BreakdownRow
            label="HR Operations Efficiency"
            description="Cost per case reduction through deflection and automation"
            value={summary.hrOpsSavings}
            total={summary.totalAnnualValue}
            color="bg-[#03143B]"
          />
          {/* Sub-items for HR Ops (avg annual across contract) */}
          {(hrOutput.managerTimeSavings > 0 || hrOutput.triageSavings > 0) && (
            <div className="ml-8 space-y-1">
              <div className="flex justify-between text-sm text-gray-500 px-4">
                <span>Headcount reduction (avg/yr)</span>
                <span>{formatCurrency(hrOutput.headcountReductionSavings / (hrOutput.yearCostResults.length || 1))}</span>
              </div>
              {hrOutput.managerTimeSavings > 0 && (
                <div className="flex justify-between text-sm text-gray-500 px-4">
                  <span>Manager time savings (avg/yr)</span>
                  <span>{formatCurrency(hrOutput.managerTimeSavings / (hrOutput.yearCostResults.length || 1))}</span>
                </div>
              )}
              {hrOutput.triageSavings > 0 && (
                <div className="flex justify-between text-sm text-gray-500 px-4">
                  <span>Triage role savings (avg/yr)</span>
                  <span>{formatCurrency(hrOutput.triageSavings / (hrOutput.yearCostResults.length || 1))}</span>
                </div>
              )}
            </div>
          )}
          <BreakdownRow
            label="Legal & Compliance Protection"
            description="Avoided legal costs through improved accuracy"
            value={summary.legalSavings}
            total={summary.totalAnnualValue}
            color="bg-[#6b7fff]"
          />
          {/* Sub-items for Legal */}
          {(legalOutput.auditPrepSavings > 0 ||
            legalOutput.riskValue > 0 ||
            legalOutput.proactiveValue > 0) && (
            <div className="ml-8 space-y-1">
              <div className="flex justify-between text-sm text-gray-500 px-4">
                <span>Legal cost avoidance</span>
                <span>{formatCurrency(legalOutput.avoidedLegalCosts)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 px-4">
                <span>Admin savings</span>
                <span>{formatCurrency(legalOutput.adminCostSavings)}</span>
              </div>
              {legalOutput.auditPrepSavings > 0 && (
                <div className="flex justify-between text-sm text-gray-500 px-4">
                  <span>Audit prep savings</span>
                  <span>{formatCurrency(legalOutput.auditPrepSavings)}</span>
                </div>
              )}
              {legalOutput.riskValue > 0 && (
                <div className="flex justify-between text-sm text-gray-500 px-4">
                  <span>Risk pattern detection</span>
                  <span>{formatCurrency(legalOutput.riskValue)}</span>
                </div>
              )}
              {legalOutput.proactiveValue > 0 && (
                <div className="flex justify-between text-sm text-gray-500 px-4">
                  <span>Proactive compliance alerts</span>
                  <span>{formatCurrency(legalOutput.proactiveValue)}</span>
                </div>
              )}
            </div>
          )}
          <BreakdownRow
            label="Employee Experience & Productivity"
            description="Time savings for employees and managers"
            value={summary.productivitySavings}
            total={summary.totalAnnualValue}
            color="bg-gray-500"
          />
        </div>
      </div>

      {/* Multi-Year Projection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-[#03143B] mb-4">Multi-Year Projection</h4>
        <p className="text-sm text-gray-600 mb-4">
          Combined value across HR operations, legal/compliance, and employee experience
        </p>
        <div className="grid md:grid-cols-{projection.years.length + 2} gap-4" style={{ gridTemplateColumns: `repeat(${projection.years.length + 2}, minmax(0, 1fr))` }}>
          {projection.years.map((yr) => (
            <ProjectionCard
              key={yr.year}
              label={`Year ${yr.year}`}
              value={yr.value}
              sublabel={`Net: ${formatCurrency(yr.net)}`}
            />
          ))}
          <ProjectionCard label="Total Gross" value={projection.total} sublabel="All years" />
          <ProjectionCard
            label="Net Total"
            value={projection.netTotal}
            sublabel="After license costs"
            highlight
          />
        </div>
      </div>
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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[$,]/g, '');
    if (!isNaN(Number(rawValue)) && rawValue !== '') {
      onChange(Number(rawValue));
    } else if (rawValue === '') {
      onChange(0);
    }
  };

  const displayValue =
    type === 'currency'
      ? value.toLocaleString()
      : type === 'formatted-number'
      ? value.toLocaleString()
      : value;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        {type === 'currency' && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
        )}
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
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
          {value}
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
