// Industry benchmarks and segment presets for Quick ROI mode
// Maps (employee count + industry + workforce type + org model) to all detailed inputs
// Sources cited inline — see BENCHMARK_SOURCES for full references

import type { HROperationsInputs, Tier2Workflow, LegalComplianceInputs, EmployeeExperienceInputs } from '@/types/proposal';

// ──────────────────────────────────────────────
// Sources
// ──────────────────────────────────────────────

export interface BenchmarkSource {
  id: string;
  name: string;
  year: number;
  url?: string;
}

export const BENCHMARK_SOURCES: Record<string, BenchmarkSource> = {
  shrm: {
    id: 'shrm',
    name: 'SHRM Human Capital Benchmarking Report',
    year: 2023,
    url: 'https://www.shrm.org/topics-tools/tools/benchmarking',
  },
  bls_oes: {
    id: 'bls_oes',
    name: 'Bureau of Labor Statistics, Occupational Employment & Wage Statistics',
    year: 2023,
    url: 'https://www.bls.gov/oes/',
  },
  bls_ecec: {
    id: 'bls_ecec',
    name: 'Bureau of Labor Statistics, Employer Costs for Employee Compensation',
    year: 2023,
    url: 'https://www.bls.gov/news.release/ecec.toc.htm',
  },
  gartner: {
    id: 'gartner',
    name: 'Gartner HR Service Delivery Survey',
    year: 2023,
    url: 'https://www.gartner.com/en/human-resources',
  },
  hackett: {
    id: 'hackett',
    name: 'The Hackett Group HR Benchmark Study',
    year: 2023,
    url: 'https://www.thehackettgroup.com/research/human-resources/',
  },
  deloitte: {
    id: 'deloitte',
    name: 'Deloitte Human Capital Trends & HR Shared Services Survey',
    year: 2023,
    url: 'https://www2.deloitte.com/us/en/insights/focus/human-capital-trends.html',
  },
  hiscox: {
    id: 'hiscox',
    name: 'Hiscox Guide to Employee Lawsuits',
    year: 2022,
    url: 'https://www.hiscox.com/documents/2022-Hiscox-Guide-to-Employee-Lawsuits.pdf',
  },
  apqc: {
    id: 'apqc',
    name: 'APQC Open Standards Benchmarking',
    year: 2023,
    url: 'https://www.apqc.org/benchmarking',
  },
  mercer: {
    id: 'mercer',
    name: 'Mercer Total Remuneration Survey',
    year: 2023,
  },
  pwc: {
    id: 'pwc',
    name: 'PwC State of Compliance Survey',
    year: 2023,
    url: 'https://www.pwc.com/us/en/services/consulting/risk-regulatory/library/state-of-compliance-study.html',
  },
  mckinsey: {
    id: 'mckinsey',
    name: 'McKinsey Organization Practice',
    year: 2023,
  },
};

// Field-level source mapping: which source(s) back each estimated field
export const FIELD_SOURCES: Record<string, { sourceIds: string[]; note: string }> = {
  tier01CasesPerYear: {
    sourceIds: ['gartner', 'apqc'],
    note: 'Based on HR service delivery ticket volume benchmarks by company size and industry',
  },
  tier01AvgHandleTime: {
    sourceIds: ['gartner', 'apqc'],
    note: 'Blended simple transaction handle time from HR shared services benchmarks',
  },
  tier2Workflows: {
    sourceIds: ['gartner', 'deloitte'],
    note: 'Complex case mix and hours per case from HR service delivery research',
  },
  tier01HandlerSalary: {
    sourceIds: ['bls_oes', 'bls_ecec', 'shrm'],
    note: 'HR Specialist base salary × 1.4 burden rate (taxes ~10%, benefits ~20%, recruiting ~4%, overhead ~6%)',
  },
  tier2PlusHandlerSalary: {
    sourceIds: ['bls_oes', 'bls_ecec', 'shrm'],
    note: 'HRBP / Specialist base salary × 1.4 burden rate (taxes, benefits, recruiting, overhead)',
  },
  managerHRTime: {
    sourceIds: ['mckinsey', 'deloitte', 'gartner'],
    note: 'Managers in federated HR models spend 8–12 hrs/week on HR tasks',
  },
  triageRole: {
    sourceIds: ['mercer', 'bls_oes', 'bls_ecec'],
    note: 'HR Case Manager / Intake Specialist base salary × 1.4 fully burdened cost',
  },
  managerHourlyCost: {
    sourceIds: ['bls_oes', 'bls_ecec'],
    note: 'General & Operations Manager (SOC 11-1021) fully loaded hourly rate',
  },
  highStakesPercent: {
    sourceIds: ['gartner', 'shrm'],
    note: 'Percentage of complex cases classified as high-stakes by compliance risk level',
  },
  avgLegalCostPerIncident: {
    sourceIds: ['hiscox', 'shrm'],
    note: 'Pre-litigation resolution cost per HR compliance incident',
  },
  adminHoursPerCase: {
    sourceIds: ['shrm', 'gartner'],
    note: 'Blended admin hours for high-stakes cases (investigation, documentation, review)',
  },
  auditPrep: {
    sourceIds: ['deloitte', 'pwc'],
    note: 'Compliance audit preparation hours scaled by company size',
  },
  inquiriesPerEmployeePerYear: {
    sourceIds: ['gartner', 'apqc'],
    note: 'Total HR inquiries per employee including informal questions and portal visits',
  },
  avgTimePerInquiry: {
    sourceIds: ['gartner', 'apqc'],
    note: 'Blended average across self-service, phone/chat, email, and walk-up channels',
  },
  avgHourlyRate: {
    sourceIds: ['bls_ecec'],
    note: 'Average hourly rate across all employees by industry',
  },
};

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type WorkforceType = 'frontline-heavy' | 'knowledge-worker' | 'mixed';
export type OrgModel = 'centralized' | 'federated';
export type HeadcountBand = '500-2500' | '2500-10000' | '10000+';
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
// Sources: SHRM (2023), Hackett Group (2023), Gartner (2023)
// ──────────────────────────────────────────────

interface HeadcountBenchmark {
  hrEmployeeRatio: number;        // employees per HR person
  casesPerEmployeePerYear: number; // formal HR cases/tickets per employee
  inquiriesPerEmployeePerYear: number; // all HR inquiries (including informal)
  avgHandleTimeMinutes: number;   // Simple transaction blended handle time
  adminHoursPerHighStakesCase: number;
  auditPrepHoursPerAudit: number;
}

const HEADCOUNT_BENCHMARKS: Record<HeadcountBand, HeadcountBenchmark> = {
  '500-2500': {
    hrEmployeeRatio: 64,             // SHRM 2023: ~1:58–70 for small-mid orgs
    casesPerEmployeePerYear: 1.0,    // Gartner 2023: 0.8–1.2 for this band
    inquiriesPerEmployeePerYear: 4.5, // Gartner/APQC: 3–6 range
    avgHandleTimeMinutes: 12,        // Gartner: simple transaction blended 10–15 min
    adminHoursPerHighStakesCase: 15, // SHRM: lower complexity at smaller scale
    auditPrepHoursPerAudit: 60,      // Deloitte/APQC: 40–80 hrs
  },
  '2500-10000': {
    hrEmployeeRatio: 82,             // SHRM 2023: ~1:75–90
    casesPerEmployeePerYear: 1.3,    // Gartner 2023: 1.0–1.5
    inquiriesPerEmployeePerYear: 6,  // Gartner/APQC: 4–8
    avgHandleTimeMinutes: 10,        // Gartner: more efficient shared services
    adminHoursPerHighStakesCase: 20, // SHRM: mid-range
    auditPrepHoursPerAudit: 120,     // Deloitte: 80–200 hrs
  },
  '10000+': {
    hrEmployeeRatio: 105,            // SHRM 2023: ~1:95–120, Hackett world-class at 1:100+
    casesPerEmployeePerYear: 1.5,    // Gartner 2023: 1.2–1.8
    inquiriesPerEmployeePerYear: 8,  // Gartner: 6–10
    avgHandleTimeMinutes: 9,         // Gartner: mature shared services, more self-service
    adminHoursPerHighStakesCase: 30, // SHRM/Gartner: more documentation at scale
    auditPrepHoursPerAudit: 200,     // PwC/Deloitte: 150–500+ hrs
  },
};

// ──────────────────────────────────────────────
// Industry Benchmarks
// Sources cited per field
// ──────────────────────────────────────────────

interface IndustryBenchmark {
  // Case volume & complexity
  tier01Percent: number;              // % of cases that are simple transactions
  casesPerEmployeeMultiplier: number; // multiplier on base cases/employee
  seasonalFactor: number;

  // Fully burdened cost = salary × 1.4 (payroll taxes ~10%, benefits ~20%, recruiting ~4%, overhead ~6%)
  // Sources: BLS ECEC (2023), SHRM Benefits Survey (2023)
  tier01FullyBurdenedCost: number;
  tier2PlusFullyBurdenedCost: number;
  avgEmployeeSalary: number;
  managerHourlyCost: number;         // fully loaded

  // Legal/Compliance (Hiscox 2022, SHRM 2023)
  complianceRisk: 'low' | 'medium' | 'high';
  avgLegalCostPerIncident: number;
  auditsPerYear: number;
  riskDetectionValue: number;
  proactiveAlertsValue: number;

  // Manager time in federated models (McKinsey/Deloitte 2023)
  managerHRHoursPerWeek: number;

  // Triage role — fully burdened (Mercer 2023, × 1.4)
  triageFullyBurdenedCost: number;
}

const INDUSTRY_BENCHMARKS: Record<Industry, IndustryBenchmark> = {
  // Healthcare — Sources: BLS SOC 13-1071 & 11-3121 (2023), Hiscox (2022), Gartner (2023)
  healthcare: {
    tier01Percent: 65,
    casesPerEmployeeMultiplier: 1.4,   // Gartner: 1.3–1.8, high due to credentialing/compliance
    seasonalFactor: 1.1,
    tier01FullyBurdenedCost: 67000,    // Base $48k × 1.4 (BLS: $40k–$55k midpoint)
    tier2PlusFullyBurdenedCost: 119000, // Base $85k × 1.4 (BLS/Mercer: $70k–$100k)
    avgEmployeeSalary: 62000,          // BLS ECEC: $55k–$70k
    managerHourlyCost: 65,             // BLS SOC 11-1021: $60–$75/hr fully loaded
    complianceRisk: 'high',
    avgLegalCostPerIncident: 50000,    // Hiscox: $20k–$75k range, midpoint
    auditsPerYear: 4,                  // Joint Commission/CMS cycles
    riskDetectionValue: 50000,
    proactiveAlertsValue: 40000,
    managerHRHoursPerWeek: 10,         // Deloitte: 8–12 hrs
    triageFullyBurdenedCost: 81000,    // Base $58k × 1.4 (Mercer: $50k–$72k)
  },

  // Retail — Sources: BLS (2023), Hiscox (2022), Gartner (2023)
  retail: {
    tier01Percent: 75,
    casesPerEmployeeMultiplier: 1.6,   // Gartner: 1.5–2.2, high turnover drives volume
    seasonalFactor: 1.4,
    tier01FullyBurdenedCost: 59000,    // Base $42k × 1.4
    tier2PlusFullyBurdenedCost: 109000, // Base $78k × 1.4
    avgEmployeeSalary: 35000,          // BLS ECEC: $30k–$40k
    managerHourlyCost: 48,             // BLS: $42–$55/hr fully loaded
    complianceRisk: 'medium',
    avgLegalCostPerIncident: 30000,    // Hiscox: $15k–$45k
    auditsPerYear: 2,
    riskDetectionValue: 30000,
    proactiveAlertsValue: 25000,
    managerHRHoursPerWeek: 8,
    triageFullyBurdenedCost: 73000,    // Base $52k × 1.4
  },

  // Hospitality — Sources: BLS (2023), Hiscox (2022), Gartner (2023)
  hospitality: {
    tier01Percent: 76,
    casesPerEmployeeMultiplier: 1.7,   // Gartner: similar to retail, higher turnover
    seasonalFactor: 1.5,
    tier01FullyBurdenedCost: 56000,    // Base $40k × 1.4
    tier2PlusFullyBurdenedCost: 105000, // Base $75k × 1.4
    avgEmployeeSalary: 32000,          // BLS ECEC: $28k–$38k
    managerHourlyCost: 45,             // BLS: $40–$52/hr fully loaded
    complianceRisk: 'medium',
    avgLegalCostPerIncident: 28000,    // Hiscox: $15k–$45k
    auditsPerYear: 2,
    riskDetectionValue: 25000,
    proactiveAlertsValue: 20000,
    managerHRHoursPerWeek: 9,
    triageFullyBurdenedCost: 70000,    // Base $50k × 1.4
  },

  // Manufacturing — Sources: BLS (2023), Hiscox (2022), Gartner (2023)
  manufacturing: {
    tier01Percent: 70,
    casesPerEmployeeMultiplier: 1.2,   // Gartner: 1.0–1.5
    seasonalFactor: 1.1,
    tier01FullyBurdenedCost: 66000,    // Base $47k × 1.4
    tier2PlusFullyBurdenedCost: 119000, // Base $85k × 1.4
    avgEmployeeSalary: 57000,          // BLS ECEC: $50k–$65k
    managerHourlyCost: 60,             // BLS: $55–$68/hr
    complianceRisk: 'high',
    avgLegalCostPerIncident: 35000,    // Hiscox: $15k–$50k
    auditsPerYear: 3,                  // OSHA/EPA cycles
    riskDetectionValue: 40000,
    proactiveAlertsValue: 35000,
    managerHRHoursPerWeek: 8,
    triageFullyBurdenedCost: 77000,    // Base $55k × 1.4
  },

  // Financial Services — Sources: BLS (2023), Hiscox/Littler (2022-23), Gartner (2023)
  'financial-services': {
    tier01Percent: 70,
    casesPerEmployeeMultiplier: 1.1,   // Gartner: 1.0–1.4
    seasonalFactor: 1.0,
    tier01FullyBurdenedCost: 76000,    // Base $54k × 1.4
    tier2PlusFullyBurdenedCost: 140000, // Base $100k × 1.4
    avgEmployeeSalary: 88000,          // BLS ECEC: $75k–$100k
    managerHourlyCost: 80,             // BLS: $70–$90/hr
    complianceRisk: 'high',
    avgLegalCostPerIncident: 65000,    // Hiscox/Littler: $30k–$100k
    auditsPerYear: 5,                  // OCC/FINRA/SEC heavy cycles
    riskDetectionValue: 75000,
    proactiveAlertsValue: 60000,
    managerHRHoursPerWeek: 8,
    triageFullyBurdenedCost: 87000,    // Base $62k × 1.4
  },

  // Technology — Sources: BLS (2023), Radford/Aon (2023), Gartner (2023)
  technology: {
    tier01Percent: 75,
    casesPerEmployeeMultiplier: 0.9,   // Gartner: 0.8–1.2, tech-savvy workforce self-serves
    seasonalFactor: 1.0,
    tier01FullyBurdenedCost: 84000,    // Base $60k × 1.4
    tier2PlusFullyBurdenedCost: 161000, // Base $115k × 1.4
    avgEmployeeSalary: 108000,         // BLS ECEC: $90k–$125k
    managerHourlyCost: 88,             // BLS/Radford: $76–$100/hr
    complianceRisk: 'low',
    avgLegalCostPerIncident: 55000,    // Hiscox/Littler: $25k–$80k
    auditsPerYear: 2,                  // SOC 2/ISO + state privacy
    riskDetectionValue: 25000,
    proactiveAlertsValue: 20000,
    managerHRHoursPerWeek: 6,
    triageFullyBurdenedCost: 91000,    // Base $65k × 1.4
  },

  // Professional Services — Sources: BLS (2023), Mercer (2023), Gartner (2023)
  'professional-services': {
    tier01Percent: 65,
    casesPerEmployeeMultiplier: 1.0,   // Gartner: 0.8–1.2
    seasonalFactor: 1.0,
    tier01FullyBurdenedCost: 73000,    // Base $52k × 1.4
    tier2PlusFullyBurdenedCost: 137000, // Base $98k × 1.4
    avgEmployeeSalary: 82000,          // BLS ECEC: $70k–$95k
    managerHourlyCost: 75,             // BLS: $66–$85/hr
    complianceRisk: 'medium',
    avgLegalCostPerIncident: 40000,    // Hiscox: $20k–$60k
    auditsPerYear: 2,
    riskDetectionValue: 35000,
    proactiveAlertsValue: 30000,
    managerHRHoursPerWeek: 7,
    triageFullyBurdenedCost: 84000,    // Base $60k × 1.4
  },

  // Other / General — Blended averages across industries
  other: {
    tier01Percent: 70,
    casesPerEmployeeMultiplier: 1.1,
    seasonalFactor: 1.0,
    tier01FullyBurdenedCost: 70000,    // Base $50k × 1.4
    tier2PlusFullyBurdenedCost: 126000, // Base $90k × 1.4
    avgEmployeeSalary: 60000,
    managerHourlyCost: 60,
    complianceRisk: 'medium',
    avgLegalCostPerIncident: 40000,
    auditsPerYear: 2,
    riskDetectionValue: 30000,
    proactiveAlertsValue: 25000,
    managerHRHoursPerWeek: 8,
    triageFullyBurdenedCost: 77000,    // Base $55k × 1.4
  },
};

// ──────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────

function getHeadcountBand(employeeCount: number): HeadcountBand {
  if (employeeCount < 2500) return '500-2500';
  if (employeeCount < 10000) return '2500-10000';
  return '10000+';
}

function estimateWisqLicenseCost(employeeCount: number): number {
  // Rough PEPM-based estimate: $3-5 PEPM depending on size
  const pepm = employeeCount < 5000 ? 5 : employeeCount < 15000 ? 4 : 3;
  return employeeCount * pepm * 12;
}

// ──────────────────────────────────────────────
// Industry-specific complex case workflow templates
// Sources: Gartner HR Service Delivery (2023), Deloitte (2023)
// ──────────────────────────────────────────────

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
    deflectionByYear: [65, 80, 88],       // 50 + (eff / 2) at [30%, 60%, 75%]
    effortReductionByYear: [83, 90, 94],  // 75 + (eff / 4) at [30%, 60%, 75%]
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

  // ── Case Volume ──
  // Base: cases/employee from headcount band × industry multiplier × seasonal factor
  let casesPerEmployee = hcBenchmark.casesPerEmployeePerYear
    * indBenchmark.casesPerEmployeeMultiplier
    * indBenchmark.seasonalFactor;
  if (workforceType === 'frontline-heavy') casesPerEmployee *= 1.15;
  if (workforceType === 'knowledge-worker') casesPerEmployee *= 0.85;
  const totalCasesPerYear = Math.round(employeeCount * casesPerEmployee);

  // Split: simple transactions vs complex cases based on industry complexity
  const tier01Pct = indBenchmark.tier01Percent / 100;
  const tier01CasesPerYear = Math.round(totalCasesPerYear * tier01Pct);
  const tier2PlusTotalCases = Math.round(totalCasesPerYear * (1 - tier01Pct));
  markEstimated('tier01CasesPerYear');

  // ── Handle Time ──
  // Size-based baseline, no industry adjustment (handle time is more process-driven)
  const tier01AvgHandleTime = hcBenchmark.avgHandleTimeMinutes;
  markEstimated('tier01AvgHandleTime');

  // ── Complex Case Workflows ──
  const tier2Workflows = estimateWorkflowVolumes(tier2PlusTotalCases, industry);
  markEstimated('tier2Workflows');

  // ── Fully Burdened Costs ── base × 1.4 (taxes, benefits, recruiting, overhead)
  // BLS ECEC (2023), SHRM Benefits Survey (2023)
  let tier01Cost = indBenchmark.tier01FullyBurdenedCost;
  let tier2PlusCost = indBenchmark.tier2PlusFullyBurdenedCost;
  if (workforceType === 'frontline-heavy') {
    tier01Cost = Math.round(tier01Cost * 0.9);
    tier2PlusCost = Math.round(tier2PlusCost * 0.95);
  }
  if (workforceType === 'knowledge-worker') {
    tier01Cost = Math.round(tier01Cost * 1.1);
    tier2PlusCost = Math.round(tier2PlusCost * 1.1);
  }
  markEstimated('tier01HandlerSalary', 'tier2PlusHandlerSalary');

  // ── Manager/GM Time (federated models) ──
  // McKinsey/Deloitte: managers in federated HR spend 8-12 hrs/week on HR
  const isFederated = orgModel === 'federated';
  const managersDoingHR = isFederated ? Math.round(employeeCount / 50) : 0;
  const managerHoursPerWeek = indBenchmark.managerHRHoursPerWeek;
  const managerHourlyCost = indBenchmark.managerHourlyCost;
  markEstimated('managerHRTime', 'managerHourlyCost');

  // ── Triage Role ──
  // Mercer: dedicated triage for larger federated orgs
  const triageFTEs = isFederated && employeeCount >= 2500 ? Math.ceil(employeeCount / 5000) : 0;
  const triageSalary = indBenchmark.triageFullyBurdenedCost;
  markEstimated('triageRole');

  // ── License Cost ──
  const wisqLicenseCost = estimateWisqLicenseCost(employeeCount);
  markEstimated('wisqLicenseCost');

  // ── Legal Compliance ──
  const highStakesPercent = indBenchmark.complianceRisk === 'high' ? 3.0
    : indBenchmark.complianceRisk === 'medium' ? 2.5 : 2.0;
  const adminHoursPerCase = hcBenchmark.adminHoursPerHighStakesCase;
  markEstimated('highStakesPercent', 'avgLegalCostPerIncident', 'adminHoursPerCase');

  // Audit prep — size-driven
  const auditEnabled = indBenchmark.complianceRisk !== 'low';
  const auditPrepHours = hcBenchmark.auditPrepHoursPerAudit;
  // Audit prep hourly rate: slightly above manager cost (senior compliance staff)
  const auditPrepHourlyRate = Math.round(managerHourlyCost * 1.15);
  markEstimated('auditPrep', 'riskPatternDetection', 'proactiveAlerts');

  // ── Employee Experience ──
  let inquiriesPerEmployee = hcBenchmark.inquiriesPerEmployeePerYear;
  if (workforceType === 'frontline-heavy') inquiriesPerEmployee *= 1.2;
  if (workforceType === 'knowledge-worker') inquiriesPerEmployee *= 0.8;

  // Avg time per inquiry: Gartner/APQC blended 10-15 min
  const avgTimePerInquiry = employeeCount < 2500 ? 15 : employeeCount < 10000 ? 12 : 10;

  let avgHourlyRate = Math.round(indBenchmark.avgEmployeeSalary / 2080);
  if (workforceType === 'frontline-heavy') avgHourlyRate = Math.round(avgHourlyRate * 0.8);
  if (workforceType === 'knowledge-worker') avgHourlyRate = Math.round(avgHourlyRate * 1.2);

  markEstimated(
    'totalEmployeePopulation', 'inquiriesPerEmployeePerYear',
    'avgTimePerInquiry', 'avgHourlyRate'
  );

  return {
    hrOps: {
      contractYears: 3,
      yearSettings: [
        { wisqEffectiveness: 30, workforceChange: 0 },
        { wisqEffectiveness: 60, workforceChange: 5 },
        { wisqEffectiveness: 75, workforceChange: 10 },
      ],
      tier01CasesPerYear,
      tier01AvgHandleTime,
      tier01DeflectionByYear: [30, 60, 75],  // matches wisqEffectiveness directly
      tier2PlusTotalCases: Math.round(tier2PlusTotalCases * 1.5), // 50% buffer for unconfigured workflows
      tier2Workflows,
      tier2PlusDefaultDeflection: 40,
      tier2PlusDefaultEffortReduction: 80,
      tier01HandlerSalary: tier01Cost,
      tier2PlusHandlerSalary: tier2PlusCost,
      wisqLicenseCost,
      managerHRTime: {
        enabled: isFederated,
        managersDoingHR,
        hoursPerWeekPerManager: managerHoursPerWeek,
        managerHourlyCost,
      },
      triageRole: {
        enabled: triageFTEs > 0,
        triageFTEs,
        triageSalary,
      },
    },
    legal: {
      highStakesPercent,
      useManualCaseVolume: false,
      manualHighStakesCases: 100,
      avgLegalCostPerIncident: indBenchmark.avgLegalCostPerIncident,
      currentAccuracyRate: 82,           // Gartner 2023: Tier 1 agents 80–85% accuracy
      wisqAccuracyRate: 99,
      adminHoursPerCase,
      adminHourlyRate: auditPrepHourlyRate,
      auditPrep: {
        enabled: auditEnabled,
        auditsPerYear: indBenchmark.auditsPerYear,
        prepHoursPerAudit: auditPrepHours,
        prepHourlyRate: auditPrepHourlyRate,
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
      avgTimePerInquiry,
      timeReductionPercent: 90,
      avgHourlyRate,
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
