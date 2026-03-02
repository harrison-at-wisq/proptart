'use client';

import React, { useState, useMemo } from 'react';
import {
  HROperationsInputs,
  LegalComplianceInputs,
  EmployeeExperienceInputs,
  Tier2Workflow,
  SalaryRegion,
} from '@/types/proposal';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
  calculate3YearProjection,
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
} from '@/lib/benchmarks';
import { formatCurrency } from '@/lib/pricing-calculator';

interface ROICalculatorProps {
  hrInputs: HROperationsInputs;
  legalInputs: LegalComplianceInputs;
  employeeInputs: EmployeeExperienceInputs;
  onHRChange: (inputs: Partial<HROperationsInputs>) => void;
  onLegalChange: (inputs: Partial<LegalComplianceInputs>) => void;
  onEmployeeChange: (inputs: Partial<EmployeeExperienceInputs>) => void;
}

type TabType = 'hr-operations' | 'legal-compliance' | 'employee-experience' | 'summary';
type Mode = 'quick' | 'detailed';

export function ROICalculator({
  hrInputs,
  legalInputs,
  employeeInputs,
  onHRChange,
  onLegalChange,
  onEmployeeChange,
}: ROICalculatorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('hr-operations');
  const [mode, setMode] = useState<Mode>('quick');
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    employeeCount: 5000,
    industry: 'technology',
    workforceType: 'mixed',
    orgModel: 'centralized',
  });
  const [estimatedFields, setEstimatedFields] = useState<Set<string>>(new Set());

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
    () => calculateROISummary(hrOutput, legalOutput, employeeOutput, hrInputs.wisqLicenseCost),
    [hrOutput, legalOutput, employeeOutput, hrInputs.wisqLicenseCost]
  );

  const projection = useMemo(
    () => calculate3YearProjection(summary.grossAnnualValue, hrInputs.wisqLicenseCost),
    [summary.grossAnnualValue, hrInputs.wisqLicenseCost]
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
  };

  const handleSkipToDetailed = () => {
    setEstimatedFields(new Set());
    setMode('detailed');
  };

  // Workflow management
  const addWorkflow = () => {
    const newWorkflow: Tier2Workflow = {
      id: `workflow-${Date.now()}`,
      name: `Workflow ${hrInputs.tier2Workflows.length + 1}`,
      volumePerYear: 250,
      timePerWorkflowHours: 0.75,
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

  // Quick ROI mode
  if (mode === 'quick') {
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">
                Based on estimates for a {INDUSTRY_LABELS[companyProfile.industry]} company with{' '}
                {companyProfile.employeeCount.toLocaleString()} employees
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Refine inputs below for a more accurate picture.
              </p>
            </div>
            <button
              onClick={() => {
                setMode('quick');
                setEstimatedFields(new Set());
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Change Profile
            </button>
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
        />
      )}

      {activeTab === 'legal-compliance' && (
        <LegalComplianceTab
          inputs={legalInputs}
          output={legalOutput}
          onChange={onLegalChange}
          tier2PlusConfiguredCases={tier2PlusConfiguredCases}
        />
      )}

      {activeTab === 'employee-experience' && (
        <EmployeeExperienceTab
          inputs={employeeInputs}
          output={employeeOutput}
          onChange={onEmployeeChange}
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

function HROperationsTab({
  inputs,
  output,
  onChange,
  onAddWorkflow,
  onRemoveWorkflow,
  onUpdateWorkflow,
}: {
  inputs: HROperationsInputs;
  output: ReturnType<typeof calculateHROperationsROI>;
  onChange: (inputs: Partial<HROperationsInputs>) => void;
  onAddWorkflow: () => void;
  onRemoveWorkflow: (id: string) => void;
  onUpdateWorkflow: (id: string, updates: Partial<Tier2Workflow>) => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-gray-600">
        Calculate how Wisq reduces your cost per case through AI-powered deflection and effort
        reduction across both simple (Tier 0-1) and complex (Tier 2+) cases.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tier 0-1 Simple Cases */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-[#03143B] mb-4">Tier 0-1: Simple Cases</h4>
          <div className="space-y-4">
            <InputField
              label="Current HR Ops Headcount"
              value={inputs.currentHeadcount}
              onChange={(v) => onChange({ currentHeadcount: v })}
              type="number"
            />
            <InputField
              label="Total Case Volume per Year"
              value={inputs.totalCasesPerYear}
              onChange={(v) => onChange({ totalCasesPerYear: v })}
              type="formatted-number"
            />
            <SliderField
              label="% Tier 0-1 Cases"
              value={inputs.tier01Percent}
              onChange={(v) => onChange({ tier01Percent: v })}
              min={0}
              max={100}
              unit="%"
            />
            <InputField
              label="Avg Handle Time (minutes)"
              value={inputs.tier01AvgHandleTime}
              onChange={(v) => onChange({ tier01AvgHandleTime: v })}
              type="number"
            />
            <SliderField
              label="Tier 0-1 Deflection Rate"
              value={inputs.tier01DeflectionRate}
              onChange={(v) => onChange({ tier01DeflectionRate: v })}
              min={0}
              max={100}
              unit="%"
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
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
            <SliderField
              label="Tier 2+ Deflection Rate"
              value={inputs.tier2PlusDeflectionRate}
              onChange={(v) => onChange({ tier2PlusDeflectionRate: v })}
              min={0}
              max={100}
              unit="%"
            />
            <SliderField
              label="Effort Reduction on Remaining"
              value={inputs.tier2PlusEffortReduction}
              onChange={(v) => onChange({ tier2PlusEffortReduction: v })}
              min={0}
              max={100}
              unit="%"
            />
          </div>
        </div>
      </div>

      {/* Case Handling Overhead */}
      <CollapsibleSection
        title="Case Handling Overhead"
        defaultOpen={(inputs.caseOverheadMultiplier ?? 1.5) !== 1.0}
      >
        <p className="text-sm text-gray-500">
          Each case involves more than just handle time &mdash; documentation, triage, follow-up,
          and knowledge lookups add overhead. The overhead multiplier accounts for this additional
          time per case.
        </p>
        <SliderField
          label="Case Overhead Multiplier"
          value={inputs.caseOverheadMultiplier ?? 1.5}
          onChange={(v) => onChange({ caseOverheadMultiplier: v })}
          min={1.0}
          max={2.5}
          step={0.1}
          unit="x"
        />
        <p className="text-xs text-gray-400">
          1.0x = handle time only | 1.5x = typical (recommended) | 2.0x = high-touch
        </p>
      </CollapsibleSection>

      {/* Cost Parameters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-[#03143B] mb-4">Cost Parameters</h4>
        <div className="grid md:grid-cols-3 gap-4">
          <InputField
            label="Tier 0/1 Handler Salary"
            value={inputs.tier01HandlerSalary}
            onChange={(v) => onChange({ tier01HandlerSalary: v })}
            type="currency"
          />
          <InputField
            label="Tier 2+ Handler Salary"
            value={inputs.tier2PlusHandlerSalary}
            onChange={(v) => onChange({ tier2PlusHandlerSalary: v })}
            type="currency"
          />
          <InputField
            label="Wisq Annual License Cost"
            value={inputs.wisqLicenseCost}
            onChange={(v) => onChange({ wisqLicenseCost: v })}
            type="currency"
          />
        </div>
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
                label="Manager hourly cost"
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
                label="Triage salary"
                value={inputs.triageRole.triageSalary}
                onChange={(v) =>
                  onChange({ triageRole: { ...inputs.triageRole!, triageSalary: v } })
                }
                type="currency"
              />
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Seepage & Unlogged Queries */}
      <CollapsibleSection
        title="Seepage & Unlogged Queries"
        defaultOpen={(inputs.seepageMultiplier ?? 1.0) > 1.0}
      >
        <p className="text-sm text-gray-500">
          Many HR queries happen informally (Slack, hallway, email) and never get logged. The
          seepage multiplier captures this hidden workload.
        </p>
        <SliderField
          label="Seepage Multiplier"
          value={inputs.seepageMultiplier ?? 1.0}
          onChange={(v) => onChange({ seepageMultiplier: v })}
          min={1.0}
          max={2.0}
          step={0.1}
          unit="x"
        />
        <p className="text-xs text-gray-400">
          1.0x = all queries logged | 1.2x = 20% unlogged (typical centralized) | 1.4x = 40%
          unlogged (typical federated)
        </p>
      </CollapsibleSection>

      {/* Regional Salary Adjustments */}
      <CollapsibleSection
        title="Regional Salary Adjustments"
        defaultOpen={(inputs.salaryRegions?.length ?? 0) > 0}
      >
        <p className="text-sm text-gray-500 mb-3">
          If HR operations span multiple regions, add adjustments to blend salary costs.
        </p>
        {(inputs.salaryRegions ?? []).map((region) => (
          <div key={region.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <input
              type="text"
              value={region.name}
              onChange={(e) =>
                onChange({
                  salaryRegions: (inputs.salaryRegions ?? []).map((r) =>
                    r.id === region.id ? { ...r, name: e.target.value } : r
                  ),
                })
              }
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
              placeholder="Region name"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={region.headcountPercent}
                onChange={(e) =>
                  onChange({
                    salaryRegions: (inputs.salaryRegions ?? []).map((r) =>
                      r.id === region.id ? { ...r, headcountPercent: Number(e.target.value) } : r
                    ),
                  })
                }
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={region.salaryMultiplier}
                onChange={(e) =>
                  onChange({
                    salaryRegions: (inputs.salaryRegions ?? []).map((r) =>
                      r.id === region.id ? { ...r, salaryMultiplier: Number(e.target.value) } : r
                    ),
                  })
                }
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                step={0.1}
              />
              <span className="text-xs text-gray-500">x</span>
            </div>
            <button
              onClick={() =>
                onChange({
                  salaryRegions: (inputs.salaryRegions ?? []).filter((r) => r.id !== region.id),
                })
              }
              className="text-gray-400 hover:text-red-500 text-sm"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={() => {
            const newRegion: SalaryRegion = {
              id: `region-${Date.now()}`,
              name: '',
              headcountPercent: 50,
              salaryMultiplier: 1.0,
            };
            onChange({ salaryRegions: [...(inputs.salaryRegions ?? []), newRegion] });
          }}
          className="text-sm text-[#6b7fff] hover:text-[#03143B]"
        >
          + Add Region
        </button>
      </CollapsibleSection>

      {/* Results */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-[#03143B]/20 p-6">
        <h4 className="font-semibold text-[#03143B] mb-4">HR Operations Results</h4>
        <div className="grid md:grid-cols-4 gap-4">
          <ResultCard
            label="Headcount Reduction"
            value={`${output.headcountReduction.toFixed(1)} FTE`}
          />
          <ResultCard
            label="Workload Reduction"
            value={`${(output.workloadReductionPercent * 100).toFixed(1)}%`}
          />
          <ResultCard label="Cases Deflected" value={output.totalDeflected.toLocaleString()} />
          <ResultCard
            label="Net Annual Savings"
            value={formatCurrency(output.netSavings)}
            highlight
          />
        </div>

        {/* Sub-breakdowns for new value streams */}
        {(output.managerTimeSavings > 0 || output.triageSavings > 0) && (
          <div className="mt-4 pt-4 border-t border-[#03143B]/10 space-y-2">
            <p className="text-sm font-medium text-gray-600">Savings Breakdown</p>
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div className="bg-white/60 rounded p-3">
                <p className="text-gray-500">HR Ops (Headcount)</p>
                <p className="font-semibold text-[#03143B]">
                  {formatCurrency(output.headcountReductionSavings)}
                </p>
              </div>
              {output.managerTimeSavings > 0 && (
                <div className="bg-white/60 rounded p-3">
                  <p className="text-gray-500">Manager Time Savings</p>
                  <p className="font-semibold text-[#03143B]">
                    {formatCurrency(output.managerTimeSavings)}
                  </p>
                </div>
              )}
              {output.triageSavings > 0 && (
                <div className="bg-white/60 rounded p-3">
                  <p className="text-gray-500">Triage Role Savings</p>
                  <p className="font-semibold text-[#03143B]">
                    {formatCurrency(output.triageSavings)}
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
// Legal Compliance Tab
// ──────────────────────────────────────────────

function LegalComplianceTab({
  inputs,
  output,
  onChange,
  tier2PlusConfiguredCases,
}: {
  inputs: LegalComplianceInputs;
  output: ReturnType<typeof calculateLegalComplianceROI>;
  onChange: (inputs: Partial<LegalComplianceInputs>) => void;
  tier2PlusConfiguredCases: number;
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
}: {
  inputs: EmployeeExperienceInputs;
  output: ReturnType<typeof calculateEmployeeExperienceROI>;
  onChange: (inputs: Partial<EmployeeExperienceInputs>) => void;
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
            <InputField
              label="Avg Time per Inquiry (minutes)"
              value={inputs.avgTimePerInquiry}
              onChange={(v) => onChange({ avgTimePerInquiry: v })}
              type="number"
            />
            <InputField
              label="Avg Employee Hourly Rate"
              value={inputs.avgEmployeeHourlyRate}
              onChange={(v) => onChange({ avgEmployeeHourlyRate: v })}
              type="currency"
            />
            <InputField
              label="Avg Manager Hourly Rate"
              value={inputs.avgManagerHourlyRate}
              onChange={(v) => onChange({ avgManagerHourlyRate: v })}
              type="currency"
            />
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
  projection: ReturnType<typeof calculate3YearProjection>;
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
          <p className="text-2xl font-bold">{formatCurrency(summary.grossAnnualValue)}</p>
        </div>
        <div className="bg-gradient-to-br from-[#03143B]/80 to-[#020e29]/80 rounded-lg p-6 text-white">
          <p className="text-sm opacity-80 mb-1">Return on Investment</p>
          <p className="text-2xl font-bold">{summary.totalROI.toFixed(0)}%</p>
        </div>
        <div className="bg-gradient-to-br from-gray-600 to-gray-500 rounded-lg p-6 text-white">
          <p className="text-sm opacity-80 mb-1">Payback Period</p>
          <p className="text-2xl font-bold">{summary.paybackPeriodMonths.toFixed(1)} months</p>
        </div>
        <div className="bg-gradient-to-br from-[#03143B]/60 to-[#020e29]/60 rounded-lg p-6 text-white">
          <p className="text-sm opacity-80 mb-1">Net Annual Benefit</p>
          <p className="text-2xl font-bold">{formatCurrency(summary.netAnnualBenefit)}</p>
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
          {/* Sub-items for HR Ops */}
          {(hrOutput.managerTimeSavings > 0 || hrOutput.triageSavings > 0) && (
            <div className="ml-8 space-y-1">
              <div className="flex justify-between text-sm text-gray-500 px-4">
                <span>Headcount reduction</span>
                <span>{formatCurrency(hrOutput.headcountReductionSavings)}</span>
              </div>
              {hrOutput.managerTimeSavings > 0 && (
                <div className="flex justify-between text-sm text-gray-500 px-4">
                  <span>Manager time savings</span>
                  <span>{formatCurrency(hrOutput.managerTimeSavings)}</span>
                </div>
              )}
              {hrOutput.triageSavings > 0 && (
                <div className="flex justify-between text-sm text-gray-500 px-4">
                  <span>Triage role savings</span>
                  <span>{formatCurrency(hrOutput.triageSavings)}</span>
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

      {/* 3-Year Projection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-[#03143B] mb-4">3-Year Projection</h4>
        <p className="text-sm text-gray-600 mb-4">
          Value ramps up as more workflows get built: Year 1 (50%), Year 2 (75%), Year 3 (100%)
        </p>
        <div className="grid md:grid-cols-5 gap-4">
          <ProjectionCard label="Year 1" value={projection.year1} sublabel="50% of workflows" />
          <ProjectionCard label="Year 2" value={projection.year2} sublabel="75% of workflows" />
          <ProjectionCard label="Year 3" value={projection.year3} sublabel="100% of workflows" />
          <ProjectionCard label="3-Year Total" value={projection.total} sublabel="Gross value" />
          <ProjectionCard
            label="Net 3-Year Value"
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

  const managerDriven = hrOutput.managerTimeSavings > hrOutput.headcountReductionSavings;

  if (legalPercent > hrPercent && legalPercent > prodPercent) {
    return `Your primary value driver is risk reduction and compliance protection, accounting for ${legalPercent.toFixed(0)}% of total value. For ${INDUSTRY_LABELS[profile.industry]} organizations, reducing legal exposure and improving accuracy on high-stakes cases delivers the strongest ROI. Wisq's audit-ready documentation and proactive compliance alerts create a defensible system of record.`;
  }

  if (managerDriven) {
    return `The biggest impact for your organization comes from giving managers back productive time. With a ${ORG_MODEL_LABELS[profile.orgModel].toLowerCase()} HR model, managers are currently spending significant hours on HR tasks that Wisq can deflect or streamline. Combined with operational efficiency and compliance value, this creates a compelling ${summary.totalROI.toFixed(0)}% return on investment.`;
  }

  if (hrPercent > 50) {
    return `HR operational efficiency is your strongest value lever at ${hrPercent.toFixed(0)}% of total value. Wisq's AI-powered deflection reduces your effective cost per case by automating Tier 0-1 responses and streamlining Tier 2+ workflows. This translates to ${hrOutput.headcountReduction.toFixed(1)} FTE in workload reduction.`;
  }

  return `Wisq delivers balanced value across operations (${hrPercent.toFixed(0)}%), compliance (${legalPercent.toFixed(0)}%), and employee experience (${prodPercent.toFixed(0)}%). This diversified ROI means the business case holds up even if any single value stream performs below projections. Net annual benefit of ${formatCurrency(summary.netAnnualBenefit)} yields a ${summary.totalROI.toFixed(0)}% return.`;
}

// ──────────────────────────────────────────────
// Reusable Components
// ──────────────────────────────────────────────

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
