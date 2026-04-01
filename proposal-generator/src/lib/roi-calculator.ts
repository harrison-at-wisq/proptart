import {
  HROperationsInputs,
  HROperationsOutput,
  HROperationsYearResult,
  HROperationsYearCostResult,
  LegalComplianceInputs,
  LegalComplianceOutput,
  EmployeeExperienceInputs,
  EmployeeExperienceOutput,
  ROISummary,
} from '@/types/proposal';

const HOURS_PER_FTE_PER_YEAR = 2080;
const ADMIN_TIME_SAVINGS_PERCENT = 60;

/**
 * Calculate HR Operations ROI — multi-year, two-phase model
 */
export function calculateHROperationsROI(inputs: HROperationsInputs): HROperationsOutput {
  const yearResults: HROperationsYearResult[] = [];
  const yearCostResults: HROperationsYearCostResult[] = [];

  // Safe defaults for old data missing new fields
  const contractYears = inputs.contractYears || 3;
  const yearSettings = inputs.yearSettings?.length
    ? inputs.yearSettings
    : [
        { wisqEffectiveness: 30, workforceChange: 0 },
        { wisqEffectiveness: 60, workforceChange: 5 },
        { wisqEffectiveness: 75, workforceChange: 10 },
      ];
  const tier01CasesPerYear = inputs.tier01CasesPerYear || (inputs as any).totalCasesPerYear * ((inputs as any).tier01Percent || 80) / 100 || 9600;
  // Per-year deflection: use byYear array, fall back to old maxDeflection × effectiveness, or old deflectionRate
  const tier01DeflectionByYear = inputs.tier01DeflectionByYear?.length
    ? inputs.tier01DeflectionByYear
    : yearSettings.map(s => ((inputs as any).tier01MaxDeflection ?? (inputs as any).tier01DeflectionRate ?? 80) * s.wisqEffectiveness / 100);

  const tier01HourlyRate = inputs.tier01HandlerSalary / HOURS_PER_FTE_PER_YEAR;
  const tier2HourlyRate = inputs.tier2PlusHandlerSalary / HOURS_PER_FTE_PER_YEAR;

  for (let y = 0; y < contractYears; y++) {
    const settings = yearSettings[y] ?? { wisqEffectiveness: 30, workforceChange: 0 };
    const volumeMultiplier = 1 + settings.workforceChange / 100;

    // --- Phase 1: Workload model (pure hours) ---

    // Scaled volumes
    const tier01Cases = tier01CasesPerYear * volumeMultiplier;
    const tier2Cases = inputs.tier2Workflows.reduce(
      (sum, wf) => sum + wf.volumePerYear * volumeMultiplier, 0
    );

    // Current state (no Wisq)
    const currentTier01Min = tier01Cases * inputs.tier01AvgHandleTime;
    const currentTier2Min = inputs.tier2Workflows.reduce(
      (sum, wf) => sum + wf.volumePerYear * volumeMultiplier * wf.timePerWorkflowHours * 60, 0
    );
    const currentTotalMinutes = currentTier01Min + currentTier2Min;

    // Future state — use per-year rates directly from the stored arrays
    const tier01Deflection = (tier01DeflectionByYear[y] ?? 0) / 100;
    const futureTier01Min = tier01Cases * (1 - tier01Deflection) * inputs.tier01AvgHandleTime;

    let futureTier2Min = 0;
    let casesDeflected = tier01Cases * tier01Deflection;
    for (const wf of inputs.tier2Workflows) {
      const wfCases = wf.volumePerYear * volumeMultiplier;
      // Per-year arrays on workflow, with fallback for old data
      const wfDeflectionArr = wf.deflectionByYear?.length ? wf.deflectionByYear : null;
      const wfEffortArr = wf.effortReductionByYear?.length ? wf.effortReductionByYear : null;
      const wfDeflection = (wfDeflectionArr ? (wfDeflectionArr[y] ?? 0) : (50 + settings.wisqEffectiveness / 2)) / 100;
      const wfEffortRed = (wfEffortArr ? (wfEffortArr[y] ?? 0) : (75 + settings.wisqEffectiveness / 4)) / 100;
      const wfNotDeflected = wfCases * (1 - wfDeflection);
      futureTier2Min += wfNotDeflected * wf.timePerWorkflowHours * 60 * (1 - wfEffortRed);
      casesDeflected += wfCases * wfDeflection;
    }

    const futureTotalMinutes = futureTier01Min + futureTier2Min;
    const hoursSaved = (currentTotalMinutes - futureTotalMinutes) / 60;
    const workloadReductionPercent = currentTotalMinutes > 0
      ? (currentTotalMinutes - futureTotalMinutes) / currentTotalMinutes : 0;

    yearResults.push({
      year: y + 1,
      volumeMultiplier,
      tier01Cases,
      tier2Cases,
      currentTotalMinutes,
      futureTotalMinutes,
      hoursSaved,
      casesDeflected,
      workloadReductionPercent,
    });

    // --- Phase 2: Cost translation ---

    const tier01HoursSaved = (currentTier01Min - futureTier01Min) / 60;
    const tier2HoursSaved = (currentTier2Min - futureTier2Min) / 60;
    const headcountSavings = tier01HoursSaved * tier01HourlyRate + tier2HoursSaved * tier2HourlyRate;
    const fteReduction = hoursSaved / HOURS_PER_FTE_PER_YEAR;

    // Manager savings (if enabled) — manager count scales with workforce
    let managerSavings = 0;
    const mgr = inputs.managerHRTime;
    if (mgr?.enabled) {
      const scaledManagers = mgr.managersDoingHR * volumeMultiplier;
      const annualManagerHRHours = scaledManagers * mgr.hoursPerWeekPerManager * 52;
      managerSavings = annualManagerHRHours * tier01Deflection * 0.6 * mgr.managerHourlyCost;
    }

    // Triage savings (if enabled) — triage FTEs scale with workforce
    let triageSavingsYear = 0;
    const triage = inputs.triageRole;
    if (triage?.enabled) {
      const scaledTriageFTEs = triage.triageFTEs * volumeMultiplier;
      triageSavingsYear = scaledTriageFTEs * triage.triageSalary * workloadReductionPercent * 0.8;
    }

    const totalSavings = headcountSavings + managerSavings + triageSavingsYear;
    const netSavings = totalSavings - inputs.wisqLicenseCost;

    yearCostResults.push({
      year: y + 1,
      headcountSavings,
      managerSavings,
      triageSavings: triageSavingsYear,
      totalSavings,
      netSavings,
      fteReduction,
    });
  }

  // Contract-level totals
  const totalHoursSavedOverContract = yearResults.reduce((s, yr) => s + yr.hoursSaved, 0);
  const totalNetSavings = yearCostResults.reduce((s, yr) => s + yr.netSavings, 0);
  const totalLicenseCost = contractYears * inputs.wisqLicenseCost;
  const contractROI = totalLicenseCost > 0 ? (totalNetSavings / totalLicenseCost) * 100 : 0;

  // Convenience totals (backward compat for summary)
  const headcountReductionSavings = yearCostResults.reduce((s, yr) => s + yr.headcountSavings, 0);
  const managerTimeSavings = yearCostResults.reduce((s, yr) => s + yr.managerSavings, 0);
  const triageSavings = yearCostResults.reduce((s, yr) => s + yr.triageSavings, 0);

  return {
    yearResults,
    totalHoursSavedOverContract,
    yearCostResults,
    totalNetSavings,
    contractROI,
    headcountReductionSavings,
    managerTimeSavings,
    triageSavings,
    netSavings: totalNetSavings,
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
 * Uses average annual HR ops savings for annualized summary display
 */
export function calculateROISummary(
  hrOpsOutput: HROperationsOutput,
  legalOutput: LegalComplianceOutput,
  employeeExpOutput: EmployeeExperienceOutput,
  wisqLicenseCost: number,
  contractYears: number = 3
): ROISummary {
  // Average annual HR ops values across contract
  const avgAnnualHRGross = (hrOpsOutput.headcountReductionSavings + hrOpsOutput.managerTimeSavings + hrOpsOutput.triageSavings) / contractYears;
  const avgAnnualHRNet = hrOpsOutput.netSavings / contractYears;
  const legalSavings = legalOutput.totalAvoidedCosts;
  const productivitySavings = employeeExpOutput.totalMonetaryValue;

  const grossAnnualValue = avgAnnualHRGross + legalSavings + productivitySavings;
  const totalAnnualValue = avgAnnualHRNet + legalSavings + productivitySavings;
  const netAnnualBenefit = totalAnnualValue;
  const totalROI = wisqLicenseCost > 0 ? (netAnnualBenefit / wisqLicenseCost) * 100 : 0;

  const monthlyGrossValue = grossAnnualValue / 12;
  const paybackPeriodMonths = monthlyGrossValue > 0 ? wisqLicenseCost / monthlyGrossValue + 3 : 3;

  return {
    grossAnnualValue,
    totalAnnualValue,
    totalROI,
    paybackPeriodMonths,
    netAnnualBenefit,
    hrOpsSavings: avgAnnualHRNet,
    legalSavings,
    productivitySavings,
  };
}

/**
 * Calculate 3-year projection (legacy format for export/microsite/proposal consumers)
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

/**
 * Calculate multi-year projection using HR ops per-year data + annual legal/emp values
 */
export function calculateMultiYearProjection(
  hrOpsOutput: HROperationsOutput,
  legalAnnual: number,
  employeeAnnual: number,
  wisqLicenseCost: number
): { years: { year: number; value: number; net: number }[]; total: number; netTotal: number } {
  const years = hrOpsOutput.yearCostResults.map((yr) => {
    const grossValue = yr.totalSavings + legalAnnual + employeeAnnual;
    return {
      year: yr.year,
      value: grossValue,
      net: grossValue - wisqLicenseCost,
    };
  });
  const total = years.reduce((s, y) => s + y.value, 0);
  const netTotal = years.reduce((s, y) => s + y.net, 0);
  return { years, total, netTotal };
}
