import type { ProposalInputs } from '@/types/proposal';
import { resolveOtherValue } from '@/types/proposal';
import { calculatePricing, formatCompactCurrency } from './pricing-calculator';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
  calculateMultiYearProjection,
} from './roi-calculator';

export type ExportVariables = Record<string, string>;

const TOKEN_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/**
 * Replace `{{variableName}}` tokens in `text` with the formatted value from
 * `vars`. Unknown tokens are left intact so edit mode can still display them.
 */
export function resolveTokens(text: string, vars: ExportVariables | undefined | null): string {
  if (!text || !vars) return text;
  return text.replace(TOKEN_REGEX, (match, name: string) => {
    const value = vars[name];
    return value !== undefined ? value : match;
  });
}

/** True when the string contains at least one `{{token}}`. */
export function hasTokens(text: string): boolean {
  TOKEN_REGEX.lastIndex = 0;
  const result = TOKEN_REGEX.test(text);
  TOKEN_REGEX.lastIndex = 0;
  return result;
}

const HOURS_PER_FTE = 2080;
const fmtNum = (n: number) => Math.round(n).toLocaleString('en-US');
const fmtRate = (n: number) => `$${n.toFixed(2)}`;

/**
 * Compute every numeric variable that flows from the proposal inputs into the
 * PDF/microsite templates. Token strings like `{{grossAnnualValue}}` in element
 * data are resolved against this dictionary before display.
 */
export function buildExportVariables(inputs: ProposalInputs): ExportVariables {
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
  const employeeOutput = calculateEmployeeExperienceROI(inputs.employeeExperience, yearSettings, contractYears);
  const wisqLicenseCost = pricing.annualRecurringRevenue;
  const summary = calculateROISummary(hrOutput, legalOutput, employeeOutput, wisqLicenseCost, contractYears);
  const projection = calculateMultiYearProjection(hrOutput, legalOutput, employeeOutput, wisqLicenseCost);

  const avgAnnualInvestment = pricing.totalContractValue / contractYears;
  const monthlyGross = summary.grossAnnualValue / 12;
  const paybackMonths = monthlyGross > 0 ? avgAnnualInvestment / monthlyGross : 0;

  // Averages per pillar (yearly)
  const avgTier01Savings = hrOutput.yearCostResults.reduce((s, yr) => s + yr.tier01Savings, 0) / contractYears;
  const avgTier2Savings = hrOutput.yearCostResults.reduce((s, yr) => s + yr.tier2Savings, 0) / contractYears;
  const avgManagerSavings = hrOutput.yearCostResults.reduce((s, yr) => s + yr.managerSavings, 0) / contractYears;
  const avgTriageSavings = hrOutput.yearCostResults.reduce((s, yr) => s + yr.triageSavings, 0) / contractYears;
  const avgTier01Deflection = hrInputs.tier01DeflectionByYear?.length
    ? hrInputs.tier01DeflectionByYear.reduce((s, d) => s + d, 0) / hrInputs.tier01DeflectionByYear.length
    : 50;

  const avgAvoidedLegal = legalOutput.yearResults.reduce((s, yr) => s + yr.avoidedLegalCosts, 0) / contractYears;
  const avgAdminSavings = legalOutput.yearResults.reduce((s, yr) => s + yr.adminCostSavings, 0) / contractYears;
  const avgAuditPrep = legalOutput.yearResults.reduce((s, yr) => s + yr.auditPrepSavings, 0) / contractYears;
  const avgRiskValue = legalOutput.yearResults.reduce((s, yr) => s + yr.riskValue, 0) / contractYears;
  const avgProactiveValue = legalOutput.yearResults.reduce((s, yr) => s + yr.proactiveValue, 0) / contractYears;
  const avgAvoidedIncidents = legalOutput.yearResults.reduce((s, yr) => s + yr.avoidedIncidents, 0) / contractYears;

  const eeInputs = inputs.employeeExperience;
  const avgProductivity = employeeOutput.yearResults.reduce((s, yr) => s + yr.totalMonetaryValue, 0) / contractYears;
  const avgHoursSaved = employeeOutput.yearResults.reduce((s, yr) => s + yr.hoursSaved, 0) / contractYears;
  const avgFtesReturned = avgHoursSaved / HOURS_PER_FTE;

  const mgr = hrInputs.managerHRTime;
  const tri = hrInputs.triageRole;
  const audit = inputs.legalCompliance.auditPrep;

  // Per-year software breakdown (used in the Investment table)
  const yearVars: ExportVariables = {};
  pricing.yearlyBreakdown.forEach((year) => {
    yearVars[`year${year.year}SoftwareNetPrice`] = formatCompactCurrency(year.softwareNetPrice);
    yearVars[`year${year.year}PlatformNetPrice`] = formatCompactCurrency(year.platformNetPrice);
    yearVars[`year${year.year}WorkflowsNetPrice`] = formatCompactCurrency(year.workflowsNetPrice);
    yearVars[`year${year.year}AgentEngineeringNetPrice`] = formatCompactCurrency(year.agentEngineeringNetPrice);
  });

  const grossContractValue = summary.grossAnnualValue * contractYears;
  const netContractValue = grossContractValue - pricing.totalContractValue;
  const company = inputs.company;
  const contactEmailRaw = company.contactEmail ?? '';
  const [nameFromEmail, emailFromEmail] = contactEmailRaw.includes('|')
    ? contactEmailRaw.split('|').map((s) => s.trim())
    : [company.contactName ?? '', contactEmailRaw];

  return {
    ...yearVars,
    // Customer
    companyName: company.companyName ?? '',
    contactName: company.contactName ?? nameFromEmail ?? '',
    contactTitle: resolveOtherValue(company.contactTitle ?? '', company.customContactTitle) ?? '',
    contactEmail: emailFromEmail ?? contactEmailRaw,

    // Pricing + contract
    contractYears: String(contractYears),
    contractYearsOrdinal: `${contractYears}-Year`,
    employeeCount: fmtNum(inputs.pricing.employeeCount ?? 0),
    annualRecurringRevenue: formatCompactCurrency(pricing.annualRecurringRevenue),
    totalFirstYearInvestment: formatCompactCurrency(pricing.totalFirstYearInvestment),
    totalContractValue: formatCompactCurrency(pricing.totalContractValue),
    avgAnnualInvestment: formatCompactCurrency(avgAnnualInvestment),
    implementationNetPrice: formatCompactCurrency(pricing.implementationNetPrice),
    servicesNetPrice: formatCompactCurrency(pricing.servicesNetPrice),
    integrationsNetPrice: formatCompactCurrency(pricing.integrationsNetPrice),

    // ROI summary
    grossAnnualValue: formatCompactCurrency(summary.grossAnnualValue),
    grossContractValue: formatCompactCurrency(grossContractValue),
    netContractValue: formatCompactCurrency(netContractValue),
    projectedAnnualValue: formatCompactCurrency(summary.grossAnnualValue),
    projectedAnnualValueK: `$${Math.round(summary.grossAnnualValue / 1000)}K`,
    netAnnualBenefit: formatCompactCurrency(summary.netAnnualBenefit),
    netAnnualBenefitPerYr: `${formatCompactCurrency(summary.netAnnualBenefit)}/yr`,
    totalROIPct: `${summary.totalROI.toFixed(0)}%`,
    paybackMonths: paybackMonths.toFixed(1),
    paybackMonthsLabel: `${paybackMonths.toFixed(1)} mo`,
    projectionTotal: formatCompactCurrency(projection.total),
    projectionNetTotal: formatCompactCurrency(projection.netTotal),

    // Per-pillar annual + total savings
    hrOpsSavings: formatCompactCurrency(summary.hrOpsSavings),
    hrOpsSavingsPerYr: `${formatCompactCurrency(summary.hrOpsSavings)}/yr`,
    hrOpsTotal: formatCompactCurrency(summary.hrOpsSavings * contractYears),
    legalSavings: formatCompactCurrency(summary.legalSavings),
    legalSavingsPerYr: `${formatCompactCurrency(summary.legalSavings)}/yr`,
    legalTotal: formatCompactCurrency(summary.legalSavings * contractYears),
    productivitySavings: formatCompactCurrency(summary.productivitySavings),
    productivitySavingsPerYr: `${formatCompactCurrency(summary.productivitySavings)}/yr`,
    productivityTotal: formatCompactCurrency(summary.productivitySavings * contractYears),

    // HR operations breakdown values
    avgTier01Savings: formatCompactCurrency(avgTier01Savings),
    avgTier2Savings: formatCompactCurrency(avgTier2Savings),
    avgManagerSavings: formatCompactCurrency(avgManagerSavings),
    avgTriageSavings: formatCompactCurrency(avgTriageSavings),

    // HR explanation inputs
    tier01CasesPerYear: fmtNum(hrInputs.tier01CasesPerYear),
    tier01DeflectionPct: `${Math.round(avgTier01Deflection)}%`,
    tier01HandlerRate: fmtRate(hrInputs.tier01HandlerSalary / HOURS_PER_FTE),
    tier2WorkflowCount: String(hrInputs.tier2Workflows.length),
    managersDoingHR: fmtNum(mgr?.managersDoingHR ?? 0),
    managerHoursPerWeek: String(mgr?.hoursPerWeekPerManager ?? 0),
    managerHourlyCost: fmtRate(mgr?.managerHourlyCost ?? 0),
    triageFTEs: String(tri?.triageFTEs ?? 0),
    triageSalary: formatCompactCurrency(tri?.triageSalary ?? 0),

    // Legal breakdown values
    avgAvoidedLegal: formatCompactCurrency(avgAvoidedLegal),
    avgAdminSavings: formatCompactCurrency(avgAdminSavings),
    avgAuditPrep: formatCompactCurrency(avgAuditPrep),
    avgRiskValue: formatCompactCurrency(avgRiskValue),
    avgProactiveValue: formatCompactCurrency(avgProactiveValue),

    // Legal explanation inputs
    avgAvoidedIncidents: avgAvoidedIncidents.toFixed(1),
    avgLegalCostPerIncident: formatCompactCurrency(inputs.legalCompliance.avgLegalCostPerIncident),
    adminHoursPerCase: String(inputs.legalCompliance.adminHoursPerCase ?? 0),
    adminHourlyRate: fmtRate(inputs.legalCompliance.adminHourlyRate ?? 0),
    auditsPerYear: String(audit?.auditsPerYear ?? 0),
    auditPrepHoursPerAudit: String(audit?.prepHoursPerAudit ?? 0),
    auditWisqReductionPercent: `${audit?.wisqReductionPercent ?? 0}%`,

    // EE breakdown values
    avgProductivity: formatCompactCurrency(avgProductivity),
    avgHoursSaved: `${fmtNum(avgHoursSaved)} hrs/yr`,
    avgFtesReturned: avgFtesReturned.toFixed(1),

    // EE explanation inputs
    totalEmployeePopulation: fmtNum(eeInputs.totalEmployeePopulation ?? 0),
    inquiriesPerEmployeePerYear: String(eeInputs.inquiriesPerEmployeePerYear ?? 0),
    timeReductionPercent: `${eeInputs.timeReductionPercent ?? 0}%`,
    eeHourlyRate: fmtRate(eeInputs.avgHourlyRate ?? 55),
  };
}
