// Industry benchmarks and segment presets for Quick ROI mode
// Maps (employee count + industry + workforce type + org model) to all detailed inputs

import type { HROperationsInputs, Tier2Workflow, LegalComplianceInputs, EmployeeExperienceInputs } from '@/types/proposal';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type WorkforceType = 'frontline-heavy' | 'knowledge-worker' | 'mixed';
export type OrgModel = 'centralized' | 'federated';
export type HeadcountBand = '1000-2500' | '2500-5000' | '5000-10000' | '10000-25000' | '25000+';
export type Industry = 'healthcare' | 'retail' | 'hospitality' | 'manufacturing'
  | 'financial-services' | 'technology' | 'professional-services' | 'other';

export interface CompanyProfile {
  employeeCount: number;
  industry: Industry;
  workforceType: WorkforceType;
  orgModel: OrgModel;
}

export interface EstimatedInputs {
  hrOps: HROperationsInputs;
  legal: LegalComplianceInputs;
  empExp: EmployeeExperienceInputs;
  estimatedFields: Set<string>; // tracks which fields are benchmark-derived
}

// ──────────────────────────────────────────────
// Headcount Band Benchmarks
// ──────────────────────────────────────────────

interface HeadcountBenchmark {
  hrEmployeeRatio: number; // employees per HR person
  casesPerEmployeePerYear: number;
  typicalHRHeadcountMin: number;
  typicalHRHeadcountMax: number;
}

const HEADCOUNT_BENCHMARKS: Record<HeadcountBand, HeadcountBenchmark> = {
  '1000-2500': { hrEmployeeRatio: 80, casesPerEmployeePerYear: 2.5, typicalHRHeadcountMin: 12, typicalHRHeadcountMax: 31 },
  '2500-5000': { hrEmployeeRatio: 120, casesPerEmployeePerYear: 2.2, typicalHRHeadcountMin: 21, typicalHRHeadcountMax: 42 },
  '5000-10000': { hrEmployeeRatio: 150, casesPerEmployeePerYear: 2.0, typicalHRHeadcountMin: 33, typicalHRHeadcountMax: 67 },
  '10000-25000': { hrEmployeeRatio: 200, casesPerEmployeePerYear: 1.8, typicalHRHeadcountMin: 50, typicalHRHeadcountMax: 125 },
  '25000+': { hrEmployeeRatio: 250, casesPerEmployeePerYear: 1.5, typicalHRHeadcountMin: 100, typicalHRHeadcountMax: 250 },
};

// ──────────────────────────────────────────────
// Industry Benchmarks
// ──────────────────────────────────────────────

interface IndustryBenchmark {
  tier01Percent: number;
  complianceRisk: 'low' | 'medium' | 'high';
  avgLegalCostPerIncident: number;
  frontlinePercent: number;
  seasonalFactor: number;
  avgEmployeeSalary: number;
  tier01HandlerSalary: number;
  tier2PlusHandlerSalary: number;
  auditsPerYear: number;
  riskDetectionValue: number;
  proactiveAlertsValue: number;
}

const INDUSTRY_BENCHMARKS: Record<Industry, IndustryBenchmark> = {
  healthcare: {
    tier01Percent: 60, complianceRisk: 'high', avgLegalCostPerIncident: 100000,
    frontlinePercent: 70, seasonalFactor: 1.1, avgEmployeeSalary: 55000,
    tier01HandlerSalary: 55000, tier2PlusHandlerSalary: 90000,
    auditsPerYear: 3, riskDetectionValue: 50000, proactiveAlertsValue: 40000,
  },
  retail: {
    tier01Percent: 70, complianceRisk: 'medium', avgLegalCostPerIncident: 60000,
    frontlinePercent: 85, seasonalFactor: 1.4, avgEmployeeSalary: 38000,
    tier01HandlerSalary: 50000, tier2PlusHandlerSalary: 85000,
    auditsPerYear: 2, riskDetectionValue: 30000, proactiveAlertsValue: 25000,
  },
  hospitality: {
    tier01Percent: 72, complianceRisk: 'medium', avgLegalCostPerIncident: 50000,
    frontlinePercent: 90, seasonalFactor: 1.5, avgEmployeeSalary: 35000,
    tier01HandlerSalary: 48000, tier2PlusHandlerSalary: 80000,
    auditsPerYear: 2, riskDetectionValue: 25000, proactiveAlertsValue: 20000,
  },
  manufacturing: {
    tier01Percent: 65, complianceRisk: 'high', avgLegalCostPerIncident: 80000,
    frontlinePercent: 75, seasonalFactor: 1.1, avgEmployeeSalary: 50000,
    tier01HandlerSalary: 55000, tier2PlusHandlerSalary: 90000,
    auditsPerYear: 2, riskDetectionValue: 40000, proactiveAlertsValue: 35000,
  },
  'financial-services': {
    tier01Percent: 55, complianceRisk: 'high', avgLegalCostPerIncident: 120000,
    frontlinePercent: 20, seasonalFactor: 1.0, avgEmployeeSalary: 85000,
    tier01HandlerSalary: 65000, tier2PlusHandlerSalary: 110000,
    auditsPerYear: 4, riskDetectionValue: 75000, proactiveAlertsValue: 60000,
  },
  technology: {
    tier01Percent: 58, complianceRisk: 'low', avgLegalCostPerIncident: 90000,
    frontlinePercent: 10, seasonalFactor: 1.0, avgEmployeeSalary: 100000,
    tier01HandlerSalary: 70000, tier2PlusHandlerSalary: 115000,
    auditsPerYear: 1, riskDetectionValue: 25000, proactiveAlertsValue: 20000,
  },
  'professional-services': {
    tier01Percent: 60, complianceRisk: 'medium', avgLegalCostPerIncident: 75000,
    frontlinePercent: 15, seasonalFactor: 1.0, avgEmployeeSalary: 80000,
    tier01HandlerSalary: 60000, tier2PlusHandlerSalary: 100000,
    auditsPerYear: 2, riskDetectionValue: 35000, proactiveAlertsValue: 30000,
  },
  other: {
    tier01Percent: 62, complianceRisk: 'medium', avgLegalCostPerIncident: 75000,
    frontlinePercent: 40, seasonalFactor: 1.0, avgEmployeeSalary: 60000,
    tier01HandlerSalary: 60000, tier2PlusHandlerSalary: 100000,
    auditsPerYear: 2, riskDetectionValue: 30000, proactiveAlertsValue: 25000,
  },
};

// ──────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────

function getHeadcountBand(employeeCount: number): HeadcountBand {
  if (employeeCount < 2500) return '1000-2500';
  if (employeeCount < 5000) return '2500-5000';
  if (employeeCount < 10000) return '5000-10000';
  if (employeeCount < 25000) return '10000-25000';
  return '25000+';
}

function estimateHRHeadcount(employeeCount: number, band: HeadcountBenchmark): number {
  const calculated = Math.round(employeeCount / band.hrEmployeeRatio);
  return Math.max(band.typicalHRHeadcountMin, Math.min(calculated, band.typicalHRHeadcountMax));
}

function estimateWisqLicenseCost(employeeCount: number): number {
  // Rough PEPM-based estimate: $3-5 PEPM depending on size
  const pepm = employeeCount < 5000 ? 5 : employeeCount < 15000 ? 4 : 3;
  return employeeCount * pepm * 12;
}

// Industry-specific Tier 2+ workflow configurations
// Each workflow has a volume split (% of Tier 2+ cases) and hours per case
interface WorkflowTemplate {
  id: string;
  name: string;
  timePerWorkflowHours: number;
  volumeSplit: number; // fraction of tier2PlusTotalCases
}

const INDUSTRY_WORKFLOWS: Record<Industry, WorkflowTemplate[]> = {
  healthcare: [
    { id: 'wf-violations', name: 'Policy & Conduct Violations', timePerWorkflowHours: 4.0, volumeSplit: 0.30 },
    { id: 'wf-leave', name: 'Leave Management', timePerWorkflowHours: 6.0, volumeSplit: 0.30 },
    { id: 'wf-accommodations', name: 'Accommodations', timePerWorkflowHours: 5.0, volumeSplit: 0.15 },
    { id: 'wf-credentialing', name: 'Credentialing & Licensing', timePerWorkflowHours: 3.0, volumeSplit: 0.25 },
  ],
  retail: [
    { id: 'wf-violations', name: 'Policy & Conduct Violations', timePerWorkflowHours: 3.0, volumeSplit: 0.40 },
    { id: 'wf-leave', name: 'Leave Management', timePerWorkflowHours: 5.0, volumeSplit: 0.25 },
    { id: 'wf-accommodations', name: 'Accommodations', timePerWorkflowHours: 4.0, volumeSplit: 0.10 },
    { id: 'wf-seasonal', name: 'Seasonal Workforce Changes', timePerWorkflowHours: 2.0, volumeSplit: 0.25 },
  ],
  hospitality: [
    { id: 'wf-violations', name: 'Policy & Conduct Violations', timePerWorkflowHours: 3.0, volumeSplit: 0.40 },
    { id: 'wf-leave', name: 'Leave Management', timePerWorkflowHours: 5.0, volumeSplit: 0.20 },
    { id: 'wf-accommodations', name: 'Accommodations', timePerWorkflowHours: 4.0, volumeSplit: 0.10 },
    { id: 'wf-seasonal', name: 'Seasonal Workforce Changes', timePerWorkflowHours: 2.0, volumeSplit: 0.30 },
  ],
  manufacturing: [
    { id: 'wf-violations', name: 'Policy & Conduct Violations', timePerWorkflowHours: 4.0, volumeSplit: 0.25 },
    { id: 'wf-leave', name: 'Leave Management', timePerWorkflowHours: 6.0, volumeSplit: 0.25 },
    { id: 'wf-accommodations', name: 'Accommodations', timePerWorkflowHours: 5.0, volumeSplit: 0.15 },
    { id: 'wf-safety', name: 'Workplace Safety & Injury', timePerWorkflowHours: 5.0, volumeSplit: 0.35 },
  ],
  'financial-services': [
    { id: 'wf-violations', name: 'Policy & Conduct Violations', timePerWorkflowHours: 5.0, volumeSplit: 0.15 },
    { id: 'wf-leave', name: 'Leave Management', timePerWorkflowHours: 5.0, volumeSplit: 0.30 },
    { id: 'wf-accommodations', name: 'Accommodations', timePerWorkflowHours: 4.0, volumeSplit: 0.15 },
    { id: 'wf-regulatory', name: 'Regulatory & Ethics Cases', timePerWorkflowHours: 7.0, volumeSplit: 0.40 },
  ],
  technology: [
    { id: 'wf-violations', name: 'Policy & Conduct Violations', timePerWorkflowHours: 4.0, volumeSplit: 0.20 },
    { id: 'wf-leave', name: 'Leave Management', timePerWorkflowHours: 5.0, volumeSplit: 0.35 },
    { id: 'wf-accommodations', name: 'Accommodations', timePerWorkflowHours: 4.0, volumeSplit: 0.20 },
    { id: 'wf-equity', name: 'Equity & Compensation Reviews', timePerWorkflowHours: 3.0, volumeSplit: 0.25 },
  ],
  'professional-services': [
    { id: 'wf-violations', name: 'Policy & Conduct Violations', timePerWorkflowHours: 5.0, volumeSplit: 0.20 },
    { id: 'wf-leave', name: 'Leave Management', timePerWorkflowHours: 5.0, volumeSplit: 0.30 },
    { id: 'wf-accommodations', name: 'Accommodations', timePerWorkflowHours: 4.0, volumeSplit: 0.15 },
    { id: 'wf-client', name: 'Client & Assignment Disputes', timePerWorkflowHours: 3.0, volumeSplit: 0.35 },
  ],
  other: [
    { id: 'wf-violations', name: 'Policy & Conduct Violations', timePerWorkflowHours: 4.0, volumeSplit: 0.35 },
    { id: 'wf-leave', name: 'Leave Management', timePerWorkflowHours: 6.0, volumeSplit: 0.35 },
    { id: 'wf-accommodations', name: 'Accommodations', timePerWorkflowHours: 4.0, volumeSplit: 0.30 },
  ],
};

function estimateWorkflowVolumes(
  tier2PlusTotalCases: number,
  industry: Industry
): Tier2Workflow[] {
  const templates = INDUSTRY_WORKFLOWS[industry];
  return templates.map(t => ({
    id: t.id,
    name: t.name,
    volumePerYear: Math.round(tier2PlusTotalCases * t.volumeSplit),
    timePerWorkflowHours: t.timePerWorkflowHours,
  }));
}

// ──────────────────────────────────────────────
// Main Generator
// ──────────────────────────────────────────────

export function generateEstimates(profile: CompanyProfile): EstimatedInputs {
  const { employeeCount, industry, workforceType, orgModel } = profile;
  const band = getHeadcountBand(employeeCount);
  const hcBenchmark = HEADCOUNT_BENCHMARKS[band];
  const indBenchmark = INDUSTRY_BENCHMARKS[industry];

  const estimatedFields = new Set<string>();
  const markEstimated = (...fields: string[]) => fields.forEach(f => estimatedFields.add(f));

  // HR team size
  const hrHeadcount = estimateHRHeadcount(employeeCount, hcBenchmark);
  markEstimated('currentHeadcount');

  // Case volume (adjust for seasonal factor and workforce type)
  let casesPerEmployee = hcBenchmark.casesPerEmployeePerYear * indBenchmark.seasonalFactor;
  if (workforceType === 'frontline-heavy') casesPerEmployee *= 1.15;
  if (workforceType === 'knowledge-worker') casesPerEmployee *= 0.85;
  const totalCasesPerYear = Math.round(employeeCount * casesPerEmployee);
  markEstimated('totalCasesPerYear');

  // Tier split — adjusted by workforce type
  let tier01Percent = indBenchmark.tier01Percent;
  if (workforceType === 'frontline-heavy') tier01Percent = Math.min(85, tier01Percent + 8);
  if (workforceType === 'knowledge-worker') tier01Percent = Math.max(45, tier01Percent - 5);
  markEstimated('tier01Percent');

  // Tier 2+ volume and workflows
  const tier2PlusTotalCases = Math.round(totalCasesPerYear * ((100 - tier01Percent) / 100));
  const tier2Workflows = estimateWorkflowVolumes(tier2PlusTotalCases, industry);
  markEstimated('tier2Workflows');

  // Salaries — adjusted by workforce type
  let tier01Salary = indBenchmark.tier01HandlerSalary;
  let tier2PlusSalary = indBenchmark.tier2PlusHandlerSalary;
  if (workforceType === 'frontline-heavy') {
    tier01Salary = Math.round(tier01Salary * 0.85);
    tier2PlusSalary = Math.round(tier2PlusSalary * 0.9);
  }
  if (workforceType === 'knowledge-worker') {
    tier01Salary = Math.round(tier01Salary * 1.1);
    tier2PlusSalary = Math.round(tier2PlusSalary * 1.15);
  }
  markEstimated('tier01HandlerSalary', 'tier2PlusHandlerSalary');

  // Seepage multiplier — based on org model
  const seepageMultiplier = orgModel === 'federated' ? 1.4 : 1.2;
  markEstimated('seepageMultiplier');

  // Case overhead multiplier — based on workforce type
  const caseOverheadMultiplier = workforceType === 'frontline-heavy' ? 1.4
    : workforceType === 'knowledge-worker' ? 1.6 : 1.5;
  markEstimated('caseOverheadMultiplier');

  // Manager/GM time for federated orgs
  const isFederated = orgModel === 'federated';
  const managersDoingHR = isFederated ? Math.round(employeeCount / 50) : 0;
  markEstimated('managerHRTime');

  // Triage role for larger federated orgs
  const triageFTEs = isFederated && employeeCount >= 5000 ? Math.ceil(employeeCount / 5000) : 0;
  markEstimated('triageRole');

  // License cost
  const wisqLicenseCost = estimateWisqLicenseCost(employeeCount);
  markEstimated('wisqLicenseCost');

  // ── Legal Compliance Estimates ──
  const highStakesPercent = indBenchmark.complianceRisk === 'high' ? 3.0
    : indBenchmark.complianceRisk === 'medium' ? 2.5 : 2.0;
  markEstimated('highStakesPercent', 'avgLegalCostPerIncident');

  // Audit prep
  const auditEnabled = indBenchmark.complianceRisk !== 'low';
  markEstimated('auditPrep', 'riskPatternDetection', 'proactiveAlerts');

  // ── Employee Experience Estimates ──
  let inquiriesPerEmployee = 3;
  if (workforceType === 'frontline-heavy') inquiriesPerEmployee = 3.5;
  if (workforceType === 'knowledge-worker') inquiriesPerEmployee = 2.5;

  let avgEmployeeHourlyRate = Math.round(indBenchmark.avgEmployeeSalary / 2080);
  if (workforceType === 'frontline-heavy') avgEmployeeHourlyRate = Math.round(avgEmployeeHourlyRate * 0.75);
  if (workforceType === 'knowledge-worker') avgEmployeeHourlyRate = Math.round(avgEmployeeHourlyRate * 1.25);
  markEstimated(
    'totalEmployeePopulation', 'inquiriesPerEmployeePerYear',
    'avgEmployeeHourlyRate', 'avgManagerHourlyRate'
  );

  return {
    hrOps: {
      currentHeadcount: hrHeadcount,
      totalCasesPerYear,
      tier01Percent,
      tier01AvgHandleTime: 9,
      tier2Workflows,
      tier01DeflectionRate: 80,
      tier2PlusDeflectionRate: 40,
      tier2PlusEffortReduction: 80,
      tier01HandlerSalary: tier01Salary,
      tier2PlusHandlerSalary: tier2PlusSalary,
      wisqLicenseCost,
      managerHRTime: {
        enabled: isFederated,
        managersDoingHR,
        hoursPerWeekPerManager: 4,
        managerHourlyCost: 45,
      },
      triageRole: {
        enabled: triageFTEs > 0,
        triageFTEs,
        triageSalary: 55000,
      },
      seepageMultiplier,
      caseOverheadMultiplier,
      salaryRegions: [],
    },
    legal: {
      highStakesPercent,
      useManualCaseVolume: false,
      manualHighStakesCases: 100,
      avgLegalCostPerIncident: indBenchmark.avgLegalCostPerIncident,
      currentAccuracyRate: 90,
      wisqAccuracyRate: 99,
      adminHoursPerCase: 10,
      adminHourlyRate: 75,
      auditPrep: {
        enabled: auditEnabled,
        auditsPerYear: indBenchmark.auditsPerYear,
        prepHoursPerAudit: 40,
        prepHourlyRate: 85,
        wisqReductionPercent: 50,
      },
      riskPatternDetection: {
        enabled: indBenchmark.complianceRisk !== 'low',
        estimatedAnnualValue: indBenchmark.riskDetectionValue,
      },
      proactiveAlerts: {
        enabled: indBenchmark.complianceRisk !== 'low',
        estimatedAnnualValue: indBenchmark.proactiveAlertsValue,
      },
    },
    empExp: {
      totalEmployeePopulation: employeeCount,
      inquiriesPerEmployeePerYear: inquiriesPerEmployee,
      avgTimePerInquiry: 20,
      timeReductionPercent: 90,
      avgEmployeeHourlyRate,
      avgManagerHourlyRate: Math.round(avgEmployeeHourlyRate * 1.8),
      adoptionRate: 80,
      employeeSatisfactionImprovement: 25,
    },
    estimatedFields,
  };
}

// ──────────────────────────────────────────────
// Display Helpers
// ──────────────────────────────────────────────

export const INDUSTRY_LABELS: Record<Industry, string> = {
  healthcare: 'Healthcare',
  retail: 'Retail',
  hospitality: 'Hospitality',
  manufacturing: 'Manufacturing',
  'financial-services': 'Financial Services',
  technology: 'Technology',
  'professional-services': 'Professional Services',
  other: 'Other',
};

export const WORKFORCE_TYPE_LABELS: Record<WorkforceType, string> = {
  'frontline-heavy': 'Frontline-Heavy',
  'knowledge-worker': 'Knowledge Worker',
  mixed: 'Mixed',
};

export const ORG_MODEL_LABELS: Record<OrgModel, string> = {
  centralized: 'Centralized HR Team',
  federated: 'Federated / Distributed',
};
