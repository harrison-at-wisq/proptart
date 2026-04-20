import {
  HROperationsInputs,
  HROperationsOutput,
  HROperationsYearResult,
  HROperationsYearCostResult,
  ContractYearSettings,
  LegalComplianceInputs,
  LegalComplianceOutput,
  LegalComplianceYearResult,
  EmployeeExperienceInputs,
  EmployeeExperienceOutput,
  EmployeeExperienceYearResult,
  ROISummary,
  ROISummaryYearResult,
} from '@/types/proposal';

const HOURS_PER_FTE_PER_YEAR = 2080;

/** Build a per-year breakdown of a simple-mode flat dollar amount. */
function simpleYearValues(
  flatAmount: number,
  scaleWithWorkforce: boolean,
  yearSettings: ContractYearSettings[],
  years: number
): number[] {
  return Array.from({ length: years }, (_, i) => {
    const s = yearSettings[i] ?? yearSettings[yearSettings.length - 1] ?? { workforceChange: 0, wisqEffectiveness: 75 };
    const mult = scaleWithWorkforce ? 1 + s.workforceChange / 100 : 1;
    return flatAmount * mult;
  });
}

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

  // Simple mode: short-circuit with a flat annual amount (optionally workforce-scaled).
  // Detail sub-fields all return 0 — renderers use the pillar total only.
  if (inputs.mode === 'simple') {
    const flat = inputs.simple?.flatAmount ?? 0;
    const scale = inputs.simple?.scaleWithWorkforce ?? true;
    const perYear = simpleYearValues(flat, scale, yearSettings, contractYears);
    const yearResultsSimple: HROperationsYearResult[] = perYear.map((_, i) => ({
      year: i + 1,
      volumeMultiplier: scale ? 1 + (yearSettings[i]?.workforceChange ?? 0) / 100 : 1,
      tier01Cases: 0,
      tier2Cases: 0,
      currentTotalMinutes: 0,
      futureTotalMinutes: 0,
      hoursSaved: 0,
      tier01HoursSaved: 0,
      tier2HoursSaved: 0,
      casesDeflected: 0,
      workloadReductionPercent: 0,
      activeConfiguredCases: 0,
    }));
    const yearCostResultsSimple: HROperationsYearCostResult[] = perYear.map((v, i) => ({
      year: i + 1,
      headcountSavings: v,
      tier01Savings: 0,
      tier2Savings: 0,
      managerSavings: 0,
      triageSavings: 0,
      totalSavings: v,
      netSavings: v - (inputs.wisqLicenseCost || 0),
      fteReduction: 0,
    }));
    const totalNet = yearCostResultsSimple.reduce((s, yr) => s + yr.netSavings, 0);
    const totalLicense = contractYears * (inputs.wisqLicenseCost || 0);
    return {
      yearResults: yearResultsSimple,
      totalHoursSavedOverContract: 0,
      yearCostResults: yearCostResultsSimple,
      totalNetSavings: totalNet,
      contractROI: totalLicense > 0 ? (totalNet / totalLicense) * 100 : 0,
      headcountReductionSavings: perYear.reduce((s, v) => s + v, 0),
      managerTimeSavings: 0,
      triageSavings: 0,
      netSavings: totalNet,
    };
  }
  const tier01CasesPerYear = inputs.tier01CasesPerYear || (inputs as any).totalCasesPerYear * ((inputs as any).tier01Percent || 80) / 100 || 9600;
  // Per-year deflection: use byYear array, fall back to effectiveness directly
  const tier01DeflectionByYear = inputs.tier01DeflectionByYear?.length
    ? inputs.tier01DeflectionByYear
    : yearSettings.map(s => s.wisqEffectiveness);

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

    // Determine which workflows are active this year (default: all active)
    const isWfActive = (wf: typeof inputs.tier2Workflows[0]) =>
      wf.activeYears ? (wf.activeYears[y] !== false) : true;

    // Configured volume that Wisq is actually handling this year
    const activeConfiguredVolume = inputs.tier2Workflows
      .filter(isWfActive)
      .reduce((sum, wf) => sum + wf.volumePerYear * volumeMultiplier, 0);

    // All configured volume (active + inactive) — for current-state hours
    const allConfiguredVolume = inputs.tier2Workflows.reduce(
      (sum, wf) => sum + wf.volumePerYear * volumeMultiplier, 0
    );

    // Unconfigured complex cases (exist but Wisq doesn't handle them)
    const totalT2Volume = (inputs.tier2PlusTotalCases || 0) * volumeMultiplier;
    const unconfiguredT2Cases = Math.max(0, totalT2Volume - allConfiguredVolume);
    const configuredWfSum = inputs.tier2Workflows.reduce((s, wf) => s + wf.volumePerYear, 0);
    const weightedAvgHours = configuredWfSum > 0
      ? inputs.tier2Workflows.reduce((s, wf) => s + wf.timePerWorkflowHours * wf.volumePerYear, 0) / configuredWfSum
      : 0.75;
    const unconfiguredHoursPerCase = inputs.tier2PlusAvgTimePerCase ?? weightedAvgHours;
    const unconfiguredT2Min = unconfiguredT2Cases * unconfiguredHoursPerCase * 60;

    // Inactive workflow cases — count as full time (Wisq not touching them)
    const inactiveWfMin = inputs.tier2Workflows
      .filter(wf => !isWfActive(wf))
      .reduce((sum, wf) => sum + wf.volumePerYear * volumeMultiplier * wf.timePerWorkflowHours * 60, 0);

    // Current state (no Wisq) — all cases at full time
    const currentTier01Min = tier01Cases * inputs.tier01AvgHandleTime;
    const currentTier2Min = inputs.tier2Workflows.reduce(
      (sum, wf) => sum + wf.volumePerYear * volumeMultiplier * wf.timePerWorkflowHours * 60, 0
    ) + unconfiguredT2Min;
    const currentTotalMinutes = currentTier01Min + currentTier2Min;

    // Future state — use per-year rates directly from the stored arrays
    const tier01Deflection = (tier01DeflectionByYear[y] ?? 0) / 100;
    const futureTier01Min = tier01Cases * (1 - tier01Deflection) * inputs.tier01AvgHandleTime;

    // Inactive workflows + unconfigured = full time (Wisq doesn't touch)
    let futureTier2Min = unconfiguredT2Min + inactiveWfMin;
    let casesDeflected = tier01Cases * tier01Deflection;
    for (const wf of inputs.tier2Workflows) {
      if (!isWfActive(wf)) continue; // skip inactive — already counted at full time
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
    const tier01HoursSaved = (currentTier01Min - futureTier01Min) / 60;
    const tier2HoursSaved = (currentTier2Min - futureTier2Min) / 60;
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
      tier01HoursSaved,
      tier2HoursSaved,
      casesDeflected,
      workloadReductionPercent,
      activeConfiguredCases: activeConfiguredVolume,
    });

    // --- Phase 2: Cost translation ---
    const tier01Savings = tier01HoursSaved * tier01HourlyRate;
    const tier2Savings = tier2HoursSaved * tier2HourlyRate;
    const headcountSavings = tier01Savings + tier2Savings;
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
      tier01Savings,
      tier2Savings,
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
 * Calculate Legal Compliance ROI — multi-year, coverage-based model
 *
 * High-stakes cases come from complex case volume (scaled by headcount growth).
 * Wisq accuracy is a fixed rate — what changes per year is how many cases
 * Wisq actually handles (configured workflow coverage of total complex cases).
 * Cases Wisq touches get Wisq accuracy; untouched cases stay at baseline.
 */
export function calculateLegalComplianceROI(
  inputs: LegalComplianceInputs,
  tier2PlusConfiguredCases: number,
  yearSettings?: ContractYearSettings[],
  contractYears?: number,
  tier2PlusTotalCases?: number,
  activeConfiguredCasesByYear?: number[],
): LegalComplianceOutput {
  const years = contractYears || yearSettings?.length || 1;
  const settings = yearSettings?.length ? yearSettings : [{ wisqEffectiveness: 75, workforceChange: 0 }];

  // Simple mode: flat annual amount, optionally workforce-scaled.
  if (inputs.mode === 'simple') {
    const flat = inputs.simple?.flatAmount ?? 0;
    const scale = inputs.simple?.scaleWithWorkforce ?? true;
    const perYear = simpleYearValues(flat, scale, settings, years);
    const yearResults: LegalComplianceYearResult[] = perYear.map((v, i) => ({
      year: i + 1,
      highStakesCases: 0,
      avoidedIncidents: 0,
      avoidedLegalCosts: v,
      adminCostSavings: 0,
      auditPrepSavings: 0,
      riskValue: 0,
      proactiveValue: 0,
      totalAvoidedCosts: v,
    }));
    return {
      yearResults,
      highStakesCases: 0,
      avoidedIncidents: 0,
      avoidedLegalCosts: perYear.reduce((s, v) => s + v, 0),
      adminCostSavings: 0,
      auditPrepSavings: 0,
      riskValue: 0,
      proactiveValue: 0,
      totalAvoidedCosts: perYear.reduce((s, v) => s + v, 0),
    };
  }

  // Base total T2 volume (unscaled)
  const totalT2 = tier2PlusTotalCases || tier2PlusConfiguredCases || 1;

  // Base high-stakes cases (before workforce scaling)
  const baseHighStakesCases = inputs.useManualCaseVolume
    ? inputs.manualHighStakesCases
    : totalT2 * (inputs.highStakesPercent / 100);

  const yearResults: LegalComplianceYearResult[] = [];

  for (let y = 0; y < years; y++) {
    const s = settings[y] ?? settings[settings.length - 1];
    const volMult = 1 + s.workforceChange / 100;

    // Per-year Wisq coverage: use active configured cases for this year if available
    const activeConfigured = activeConfiguredCasesByYear?.[y] ?? (tier2PlusConfiguredCases * volMult);
    const totalT2Scaled = totalT2 * volMult;
    const wisqCoverageYear = totalT2Scaled > 0 ? Math.min(1, activeConfigured / totalT2Scaled) : 0;

    // Total high-stakes cases this year (scaled by headcount)
    const highStakesCases = baseHighStakesCases * volMult;

    // Split: cases Wisq handles vs. cases it doesn't
    const wisqHandled = highStakesCases * wisqCoverageYear;
    const notHandled = highStakesCases - wisqHandled;

    // Wisq accuracy is fixed — incidents avoided only on cases Wisq touches
    const baselineErrorRate = 1 - inputs.currentAccuracyRate / 100;
    const wisqErrorRate = 1 - inputs.wisqAccuracyRate / 100;
    const baselineIncidents = highStakesCases * baselineErrorRate;
    const wisqIncidents = wisqHandled * wisqErrorRate + notHandled * baselineErrorRate;
    const avoidedIncidents = baselineIncidents - wisqIncidents;
    const avoidedLegalCosts = avoidedIncidents * inputs.avgLegalCostPerIncident;

    // Admin savings: only on cases Wisq handles (full admin hours saved per case)
    const adminHoursSaved = wisqHandled * inputs.adminHoursPerCase;
    const adminCostSavings = adminHoursSaved * inputs.adminHourlyRate;

    // Audit prep — flat annual value, not scaled by coverage
    let auditPrepSavings = 0;
    const audit = inputs.auditPrep;
    if (audit?.enabled) {
      const totalAuditPrepHours = audit.auditsPerYear * audit.prepHoursPerAudit;
      auditPrepSavings = totalAuditPrepHours * audit.prepHourlyRate * (audit.wisqReductionPercent / 100);
    }

    // Risk + proactive — flat annual values, not scaled by coverage
    const riskValue = inputs.riskPatternDetection?.enabled
      ? (inputs.riskPatternDetection.estimatedAnnualValue ?? 0) : 0;
    const proactiveValue = inputs.proactiveAlerts?.enabled
      ? (inputs.proactiveAlerts.estimatedAnnualValue ?? 0) : 0;

    const totalAvoidedCosts = avoidedLegalCosts + adminCostSavings + auditPrepSavings + riskValue + proactiveValue;

    yearResults.push({
      year: y + 1,
      highStakesCases,
      avoidedIncidents,
      avoidedLegalCosts,
      adminCostSavings,
      auditPrepSavings,
      riskValue,
      proactiveValue,
      totalAvoidedCosts,
    });
  }

  // Contract totals
  return {
    yearResults,
    highStakesCases: yearResults.reduce((s, yr) => s + yr.highStakesCases, 0) / years,
    avoidedIncidents: yearResults.reduce((s, yr) => s + yr.avoidedIncidents, 0),
    avoidedLegalCosts: yearResults.reduce((s, yr) => s + yr.avoidedLegalCosts, 0),
    adminCostSavings: yearResults.reduce((s, yr) => s + yr.adminCostSavings, 0),
    auditPrepSavings: yearResults.reduce((s, yr) => s + yr.auditPrepSavings, 0),
    riskValue: yearResults.reduce((s, yr) => s + yr.riskValue, 0),
    proactiveValue: yearResults.reduce((s, yr) => s + yr.proactiveValue, 0),
    totalAvoidedCosts: yearResults.reduce((s, yr) => s + yr.totalAvoidedCosts, 0),
  };
}

/**
 * Calculate Employee Experience ROI — multi-year model
 * Scales adoption and time reduction with Wisq effectiveness, workforce with growth
 */
export function calculateEmployeeExperienceROI(
  inputs: EmployeeExperienceInputs,
  yearSettings?: ContractYearSettings[],
  contractYears?: number
): EmployeeExperienceOutput {
  const years = contractYears || yearSettings?.length || 1;
  const settings = yearSettings?.length ? yearSettings : [{ wisqEffectiveness: 75, workforceChange: 0 }];

  // Simple mode: flat annual amount, optionally workforce-scaled.
  if (inputs.mode === 'simple') {
    const flat = inputs.simple?.flatAmount ?? 0;
    const scale = inputs.simple?.scaleWithWorkforce ?? true;
    const perYear = simpleYearValues(flat, scale, settings, years);
    const yearResults: EmployeeExperienceYearResult[] = perYear.map((v, i) => ({
      year: i + 1,
      totalInquiries: 0,
      hoursSaved: 0,
      totalMonetaryValue: v,
    }));
    return {
      yearResults,
      totalInquiries: 0,
      hoursSaved: 0,
      totalMonetaryValue: perYear.reduce((s, v) => s + v, 0),
    };
  }

  // Fallback for old data that had avgEmployeeHourlyRate / avgManagerHourlyRate
  const hourlyRate = inputs.avgHourlyRate ?? (inputs as any).avgEmployeeHourlyRate ?? 55;

  const yearResults: EmployeeExperienceYearResult[] = [];

  for (let y = 0; y < years; y++) {
    const s = settings[y] ?? settings[settings.length - 1];
    const volMult = 1 + s.workforceChange / 100;

    const scaledPopulation = inputs.totalEmployeePopulation * volMult;
    const totalInquiries = scaledPopulation * inputs.inquiriesPerEmployeePerYear;
    const baselineMinutes = totalInquiries * inputs.avgTimePerInquiry;

    // Adoption and time reduction are direct user inputs — no effectiveness scaling
    const minutesSaved = baselineMinutes * (inputs.timeReductionPercent / 100) * (inputs.adoptionRate / 100);
    const hoursSaved = minutesSaved / 60;
    const totalMonetaryValue = hoursSaved * hourlyRate;

    yearResults.push({ year: y + 1, totalInquiries, hoursSaved, totalMonetaryValue });
  }

  // Contract totals
  return {
    yearResults,
    totalInquiries: yearResults.reduce((s, yr) => s + yr.totalInquiries, 0) / years,
    hoursSaved: yearResults.reduce((s, yr) => s + yr.hoursSaved, 0),
    totalMonetaryValue: yearResults.reduce((s, yr) => s + yr.totalMonetaryValue, 0),
  };
}

/**
 * Calculate complete ROI summary — true per-year totals from all three pillars
 */
export function calculateROISummary(
  hrOpsOutput: HROperationsOutput,
  legalOutput: LegalComplianceOutput,
  employeeExpOutput: EmployeeExperienceOutput,
  wisqLicenseCost: number,
  contractYears: number = 3
): ROISummary {
  // Build per-year breakdown by zipping all three
  const yearResults: ROISummaryYearResult[] = [];
  for (let y = 0; y < contractYears; y++) {
    const hrYr = hrOpsOutput.yearCostResults[y];
    const legalYr = legalOutput.yearResults?.[y];
    const exYr = employeeExpOutput.yearResults?.[y];

    const hrSavings = hrYr?.totalSavings ?? 0;
    const legalSavings = legalYr?.totalAvoidedCosts ?? 0;
    const prodSavings = exYr?.totalMonetaryValue ?? 0;
    const gross = hrSavings + legalSavings + prodSavings;

    yearResults.push({
      year: y + 1,
      hrOpsSavings: hrSavings,
      legalSavings,
      productivitySavings: prodSavings,
      grossValue: gross,
      netValue: gross - wisqLicenseCost,
    });
  }

  // Averages for annualized summary display
  const totalGross = yearResults.reduce((s, yr) => s + yr.grossValue, 0);
  const totalNet = yearResults.reduce((s, yr) => s + yr.netValue, 0);
  const grossAnnualValue = totalGross / contractYears;
  const totalAnnualValue = totalNet / contractYears;
  const netAnnualBenefit = totalAnnualValue;
  const totalROI = wisqLicenseCost > 0 ? (netAnnualBenefit / wisqLicenseCost) * 100 : 0;

  const monthlyGrossValue = grossAnnualValue / 12;
  const paybackPeriodMonths = monthlyGrossValue > 0 ? wisqLicenseCost / monthlyGrossValue + 3 : 3;

  const avgHR = yearResults.reduce((s, yr) => s + yr.hrOpsSavings, 0) / contractYears;
  const avgLegal = yearResults.reduce((s, yr) => s + yr.legalSavings, 0) / contractYears;
  const avgProd = yearResults.reduce((s, yr) => s + yr.productivitySavings, 0) / contractYears;

  return {
    yearResults,
    grossAnnualValue,
    totalAnnualValue,
    totalROI,
    paybackPeriodMonths,
    netAnnualBenefit,
    hrOpsSavings: avgHR,
    legalSavings: avgLegal,
    productivitySavings: avgProd,
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
 * Calculate multi-year projection using per-year data from all three pillars
 */
export function calculateMultiYearProjection(
  hrOpsOutput: HROperationsOutput,
  legalOutput: LegalComplianceOutput,
  employeeOutput: EmployeeExperienceOutput,
  wisqLicenseCost: number
): { years: { year: number; value: number; net: number }[]; total: number; netTotal: number } {
  const years = hrOpsOutput.yearCostResults.map((yr, i) => {
    const legalYr = legalOutput.yearResults?.[i]?.totalAvoidedCosts ?? (legalOutput.totalAvoidedCosts / (hrOpsOutput.yearCostResults.length || 1));
    const exYr = employeeOutput.yearResults?.[i]?.totalMonetaryValue ?? (employeeOutput.totalMonetaryValue / (hrOpsOutput.yearCostResults.length || 1));
    const grossValue = yr.totalSavings + legalYr + exYr;
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
