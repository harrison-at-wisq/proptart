import {
  HROperationsInputs,
  HROperationsOutput,
  LegalComplianceInputs,
  LegalComplianceOutput,
  EmployeeExperienceInputs,
  EmployeeExperienceOutput,
  ROISummary,
} from '@/types/proposal';

const MINUTES_PER_FTE_PER_YEAR = 124800; // 2,080 hours/year = 40 hrs/week × 52 weeks
const ADMIN_TIME_SAVINGS_PERCENT = 60;

/**
 * Calculate weighted salary multiplier from regional salary adjustments
 */
function calculateWeightedSalaryMultiplier(inputs: HROperationsInputs): number {
  const regions = inputs.salaryRegions;
  if (!regions || regions.length === 0) return 1.0;
  const totalPercent = regions.reduce((sum, r) => sum + r.headcountPercent, 0);
  if (totalPercent === 0) return 1.0;
  return regions.reduce((sum, r) => sum + (r.headcountPercent * r.salaryMultiplier), 0) / totalPercent;
}

/**
 * Calculate HR Operations ROI
 */
export function calculateHROperationsROI(inputs: HROperationsInputs): HROperationsOutput {
  const seepageMultiplier = inputs.seepageMultiplier ?? 1.0;
  const overheadMultiplier = inputs.caseOverheadMultiplier ?? 1.5;
  const weightedSalaryMultiplier = calculateWeightedSalaryMultiplier(inputs);

  // Calculate case volumes (with seepage)
  const tier01Cases = inputs.totalCasesPerYear * (inputs.tier01Percent / 100) * seepageMultiplier;

  // Aggregate Tier 2+ workflows
  const tier2PlusConfiguredCases = inputs.tier2Workflows.reduce(
    (sum, workflow) => sum + workflow.volumePerYear,
    0
  ) * seepageMultiplier;
  const tier2PlusTotalCases = inputs.totalCasesPerYear * ((100 - inputs.tier01Percent) / 100) * seepageMultiplier;
  const tier2PlusUnconfiguredCases = Math.max(0, tier2PlusTotalCases - tier2PlusConfiguredCases);

  // Calculate weighted average handle time for Tier 2+ workflows (convert hours to minutes)
  const rawConfiguredCases = inputs.tier2Workflows.reduce((sum, wf) => sum + wf.volumePerYear, 0);
  const rawTier2PlusAvgHandleTime =
    inputs.tier2Workflows.length > 0
      ? inputs.tier2Workflows.reduce(
          (sum, workflow) => sum + workflow.volumePerYear * workflow.timePerWorkflowHours * 60,
          0
        ) / (rawConfiguredCases || 1)
      : 45;

  // Apply overhead multiplier to handle times (accounts for wrap-up, documentation, triage, follow-up)
  const effectiveTier01HandleTime = inputs.tier01AvgHandleTime * overheadMultiplier;
  const effectiveTier2HandleTime = rawTier2PlusAvgHandleTime * overheadMultiplier;

  // Current state workload calculations
  const tier01CurrentMinutes = tier01Cases * effectiveTier01HandleTime;
  const tier2PlusConfiguredCurrentMinutes = tier2PlusConfiguredCases * effectiveTier2HandleTime;
  const tier2PlusUnconfiguredCurrentMinutes = tier2PlusUnconfiguredCases * effectiveTier2HandleTime;
  const currentTotalMinutes =
    tier01CurrentMinutes + tier2PlusConfiguredCurrentMinutes + tier2PlusUnconfiguredCurrentMinutes;

  // Future state (with Wisq) workload calculations
  const tier01FutureMinutes =
    tier01Cases * (1 - inputs.tier01DeflectionRate / 100) * effectiveTier01HandleTime;

  // Per-workflow future state calculation (uses per-workflow rates with global fallback)
  let tier2PlusConfiguredFutureMinutes = 0;
  let tier2PlusNotDeflectedCases = 0;
  for (const wf of inputs.tier2Workflows) {
    const wfCases = wf.volumePerYear * seepageMultiplier;
    const wfHandleTime = wf.timePerWorkflowHours * 60 * overheadMultiplier;
    const wfDeflection = (wf.deflectionRate ?? inputs.tier2PlusDeflectionRate) / 100;
    const wfEffortRed = (wf.effortReduction ?? inputs.tier2PlusEffortReduction) / 100;
    const wfNotDeflected = wfCases * (1 - wfDeflection);
    tier2PlusNotDeflectedCases += wfNotDeflected;
    tier2PlusConfiguredFutureMinutes += wfNotDeflected * wfHandleTime * (1 - wfEffortRed);
  }

  const tier2PlusUnconfiguredFutureMinutes = tier2PlusUnconfiguredCases * effectiveTier2HandleTime;
  const futureTotalMinutes =
    tier01FutureMinutes + tier2PlusConfiguredFutureMinutes + tier2PlusUnconfiguredFutureMinutes;

  // Headcount calculations
  const workloadReductionPercent =
    currentTotalMinutes > 0 ? (currentTotalMinutes - futureTotalMinutes) / currentTotalMinutes : 0;
  const minutesSaved = currentTotalMinutes - futureTotalMinutes;
  const headcountReduction = minutesSaved / MINUTES_PER_FTE_PER_YEAR;

  // Time-based cost savings
  const HOURS_PER_FTE_PER_YEAR = 2080;
  const tier01TimeSavedHours = (tier01CurrentMinutes - tier01FutureMinutes) / 60;
  const tier2PlusTimeSavedHours =
    (tier2PlusConfiguredCurrentMinutes + tier2PlusUnconfiguredCurrentMinutes -
     tier2PlusConfiguredFutureMinutes - tier2PlusUnconfiguredFutureMinutes) / 60;

  const tier01HourlyRate = (inputs.tier01HandlerSalary * weightedSalaryMultiplier) / HOURS_PER_FTE_PER_YEAR;
  const tier2PlusHourlyRate = (inputs.tier2PlusHandlerSalary * weightedSalaryMultiplier) / HOURS_PER_FTE_PER_YEAR;

  const tier01CostSavings = tier01TimeSavedHours * tier01HourlyRate;
  const tier2PlusCostSavings = tier2PlusTimeSavedHours * tier2PlusHourlyRate;
  const headcountReductionSavings = tier01CostSavings + tier2PlusCostSavings;

  // Manager/GM time savings
  let managerTimeSavings = 0;
  const mgr = inputs.managerHRTime;
  if (mgr?.enabled) {
    const annualManagerHRHours = mgr.managersDoingHR * mgr.hoursPerWeekPerManager * 52;
    const wisqManagerTimeSaved = annualManagerHRHours * (inputs.tier01DeflectionRate / 100) * 0.6;
    managerTimeSavings = wisqManagerTimeSaved * mgr.managerHourlyCost;
  }

  // Triage role savings
  let triageSavings = 0;
  const triage = inputs.triageRole;
  if (triage?.enabled) {
    const triageWorkloadReduction = workloadReductionPercent * 0.8;
    triageSavings = triage.triageFTEs * triage.triageSalary * triageWorkloadReduction;
  }

  const totalOperationalSavings = headcountReductionSavings + managerTimeSavings + triageSavings;
  const netSavings = totalOperationalSavings - inputs.wisqLicenseCost;
  const roi = inputs.wisqLicenseCost > 0 ? (netSavings / inputs.wisqLicenseCost) * 100 : 0;

  // Deflection metrics
  const tier01Deflected = tier01Cases * (inputs.tier01DeflectionRate / 100);

  // Per-workflow deflection metrics
  let tier2PlusDeflected = 0;
  let tier2PlusDeflectedTimeSavingsHours = 0;
  let tier2PlusEffortReductionHours = 0;
  for (const wf of inputs.tier2Workflows) {
    const wfCases = wf.volumePerYear * seepageMultiplier;
    const wfHandleTime = wf.timePerWorkflowHours * 60 * overheadMultiplier;
    const wfDeflection = (wf.deflectionRate ?? inputs.tier2PlusDeflectionRate) / 100;
    const wfEffortRed = (wf.effortReduction ?? inputs.tier2PlusEffortReduction) / 100;
    const wfDeflectedCases = wfCases * wfDeflection;
    const wfNotDeflected = wfCases * (1 - wfDeflection);
    tier2PlusDeflected += wfDeflectedCases;
    tier2PlusDeflectedTimeSavingsHours += (wfHandleTime * wfDeflectedCases) / 60;
    tier2PlusEffortReductionHours += (wfNotDeflected * wfHandleTime * wfEffortRed) / 60;
  }

  const totalDeflected = tier01Deflected + tier2PlusDeflected;
  const tier01TimeSavingsHours = (effectiveTier01HandleTime * tier01Deflected) / 60;
  const tier2PlusTotalTimeSavingsHours =
    tier2PlusDeflectedTimeSavingsHours + tier2PlusEffortReductionHours;

  return {
    headcountReduction,
    workloadReductionPercent,
    totalDeflected,
    tier01TimeSavingsHours,
    tier2PlusTotalTimeSavingsHours,
    netSavings,
    roi,
    managerTimeSavings,
    triageSavings,
    headcountReductionSavings,
  };
}

/**
 * Calculate Legal Compliance ROI
 */
export function calculateLegalComplianceROI(
  inputs: LegalComplianceInputs,
  tier2PlusConfiguredCases: number
): LegalComplianceOutput {
  const highStakesCases = inputs.useManualCaseVolume
    ? inputs.manualHighStakesCases
    : tier2PlusConfiguredCases * (inputs.highStakesPercent / 100);

  const incorrectAnswersBaseline = highStakesCases * (1 - inputs.currentAccuracyRate / 100);
  const incorrectAnswersWisq = highStakesCases * (1 - inputs.wisqAccuracyRate / 100);
  const avoidedIncidents = incorrectAnswersBaseline - incorrectAnswersWisq;
  const avoidedLegalCosts = avoidedIncidents * inputs.avgLegalCostPerIncident;

  const totalAdminHoursBaseline = highStakesCases * inputs.adminHoursPerCase;
  const totalAdminHoursWisq = totalAdminHoursBaseline * (1 - ADMIN_TIME_SAVINGS_PERCENT / 100);
  const adminHoursSaved = totalAdminHoursBaseline - totalAdminHoursWisq;
  const adminCostSavings = adminHoursSaved * inputs.adminHourlyRate;

  // Audit preparation savings
  let auditPrepSavings = 0;
  const audit = inputs.auditPrep;
  if (audit?.enabled) {
    const totalAuditPrepHours = audit.auditsPerYear * audit.prepHoursPerAudit;
    auditPrepSavings = totalAuditPrepHours * audit.prepHourlyRate * (audit.wisqReductionPercent / 100);
  }

  // Risk pattern detection value
  const riskValue = inputs.riskPatternDetection?.enabled
    ? (inputs.riskPatternDetection.estimatedAnnualValue ?? 0) : 0;

  // Proactive compliance alerts value
  const proactiveValue = inputs.proactiveAlerts?.enabled
    ? (inputs.proactiveAlerts.estimatedAnnualValue ?? 0) : 0;

  const totalAvoidedCosts = avoidedLegalCosts + adminCostSavings + auditPrepSavings + riskValue + proactiveValue;

  return {
    highStakesCases,
    avoidedIncidents,
    avoidedLegalCosts,
    adminCostSavings,
    auditPrepSavings,
    riskValue,
    proactiveValue,
    totalAvoidedCosts,
  };
}

/**
 * Calculate Employee Experience ROI
 */
export function calculateEmployeeExperienceROI(
  inputs: EmployeeExperienceInputs
): EmployeeExperienceOutput {
  const totalInquiries = inputs.totalEmployeePopulation * inputs.inquiriesPerEmployeePerYear;
  const baselineMinutesSpent = totalInquiries * inputs.avgTimePerInquiry;

  const minutesSaved =
    baselineMinutesSpent * (inputs.timeReductionPercent / 100) * (inputs.adoptionRate / 100);
  const hoursSaved = minutesSaved / 60;

  const employeeHoursSaved = hoursSaved * 0.7;
  const managerHoursSaved = hoursSaved * 0.3;

  const employeeTimeSavings = employeeHoursSaved * inputs.avgEmployeeHourlyRate;
  const managerTimeSavings = managerHoursSaved * inputs.avgManagerHourlyRate;
  const totalMonetaryValue = employeeTimeSavings + managerTimeSavings;

  return {
    totalInquiries,
    hoursSaved,
    employeeTimeSavings,
    managerTimeSavings,
    totalMonetaryValue,
  };
}

/**
 * Calculate complete ROI summary
 */
export function calculateROISummary(
  hrOpsOutput: HROperationsOutput,
  legalOutput: LegalComplianceOutput,
  employeeExpOutput: EmployeeExperienceOutput,
  wisqLicenseCost: number
): ROISummary {
  const grossHROpsSavings = hrOpsOutput.headcountReductionSavings + hrOpsOutput.managerTimeSavings + hrOpsOutput.triageSavings;
  const hrOpsSavings = hrOpsOutput.netSavings; // Net of Wisq license — matches HR Operations tab
  const legalSavings = legalOutput.totalAvoidedCosts;
  const productivitySavings = employeeExpOutput.totalMonetaryValue;

  const grossAnnualValue = grossHROpsSavings + legalSavings + productivitySavings;
  const totalAnnualValue = hrOpsSavings + legalSavings + productivitySavings;
  const netAnnualBenefit = totalAnnualValue; // Already net of license via hrOpsSavings
  const totalROI = wisqLicenseCost > 0 ? (netAnnualBenefit / wisqLicenseCost) * 100 : 0;

  const monthlyGrossValue = grossAnnualValue / 12;
  const paybackPeriodMonths = monthlyGrossValue > 0 ? wisqLicenseCost / monthlyGrossValue + 3 : 3;

  return {
    grossAnnualValue,
    totalAnnualValue,
    totalROI,
    paybackPeriodMonths,
    netAnnualBenefit,
    hrOpsSavings,
    legalSavings,
    productivitySavings,
  };
}

/**
 * Calculate 3-year projection
 */
export function calculate3YearProjection(
  annualValue: number,
  wisqLicenseCost: number
): { year1: number; year2: number; year3: number; total: number; netTotal: number } {
  const year1 = annualValue * 0.5;
  const year2 = annualValue * 0.75;
  const year3 = annualValue * 1.0;
  const total = year1 + year2 + year3;
  const netTotal = total - wisqLicenseCost * 3;

  return { year1, year2, year3, total, netTotal };
}
