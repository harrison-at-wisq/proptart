import type { ProposalInputs, ProposalElementType, QuoteSection } from '@/types/proposal';
import { resolveOtherValue } from '@/types/proposal';
import { getDefaultElementData } from '@/components/proposal/templates/element-defaults';
import { calculatePricing, formatCompactCurrency, formatCurrency } from '@/lib/pricing-calculator';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
  calculateMultiYearProjection,
} from '@/lib/roi-calculator';
import { materializeDocumentContent } from '@/lib/materialize-content';
import { getSelectedQuoteForSection } from '@/lib/customer-quotes';

// ---------- Shared types ----------

export interface ExportElement {
  id: string;
  elementType: ProposalElementType;
  colSpan: number;
  groupId: string;
  data: Record<string, unknown>;
}

export interface ExportSection {
  id: string;
  name: string;
  darkTheme: boolean;
  elements: ExportElement[];
}

// ---------- Helper ----------

export function el(
  elementType: ProposalElementType,
  colSpan: number,
  dataOverrides?: Record<string, unknown>,
  groupId?: string
): ExportElement {
  return {
    id: crypto.randomUUID(),
    elementType,
    colSpan,
    groupId: groupId ?? crypto.randomUUID(),
    data: { ...getDefaultElementData(elementType), ...dataOverrides },
  };
}

// ---------- Default section builder ----------

/** Build the default 5-section proposal matching the assets template, populated with real data */
export function buildDefaultSections(inputs: ProposalInputs): ExportSection[] {
  // Materialize document content (narrative text, bullets, etc.)
  const docContent = inputs.documentContent || materializeDocumentContent(inputs);

  // Calculate pricing & ROI — use full multi-year signatures matching the calculator
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
  const wisqLicenseCost = hrInputs.wisqLicenseCost || pricing.annualRecurringRevenue;
  const summary = calculateROISummary(hrOutput, legalOutput, employeeOutput, wisqLicenseCost, contractYears);
  const projection = calculateMultiYearProjection(hrOutput, legalOutput, employeeOutput, wisqLicenseCost);

  // Average annual investment across the contract (total contract value / years)
  const avgAnnualInvestment = pricing.totalContractValue / contractYears;

  // Payback: what fraction of the year are they in the negative?
  // monthlyGross = average monthly gross value; payback = months until investment is recouped
  const monthlyGross = summary.grossAnnualValue / 12;
  const paybackMonths = monthlyGross > 0 ? avgAnnualInvestment / monthlyGross : 0;

  // Build integrations list
  const customerIntegrations = [
    inputs.integrations.hcm && { name: resolveOtherValue(inputs.integrations.hcm, inputs.integrations.customHcm), category: 'HCM' },
    inputs.integrations.identity && { name: resolveOtherValue(inputs.integrations.identity, inputs.integrations.customIdentity), category: 'Identity' },
    inputs.integrations.documents && { name: resolveOtherValue(inputs.integrations.documents, inputs.integrations.customDocuments), category: 'Documents' },
    ...(Array.isArray(inputs.integrations.communication)
      ? inputs.integrations.communication.filter(Boolean).map(v => ({ name: resolveOtherValue(v, inputs.integrations.customCommunication), category: 'Communication' }))
      : inputs.integrations.communication ? [{ name: resolveOtherValue(inputs.integrations.communication, inputs.integrations.customCommunication), category: 'Communication' }] : []),
    inputs.integrations.ticketing && inputs.integrations.ticketing !== 'None / Not applicable' && { name: resolveOtherValue(inputs.integrations.ticketing, inputs.integrations.customTicketing), category: 'Ticketing' },
  ].filter(Boolean) as { name: string; category: string }[];

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Helper: get quote for a section (if user selected one)
  const getQuote = (section: QuoteSection) => {
    if (!docContent.selectedQuotes?.length) return null;
    return getSelectedQuoteForSection(docContent.selectedQuotes, section);
  };

  // Helper: get FAQs for a page
  const getFAQs = (pageId: string) => {
    const sec = docContent.faqSections?.find((s: { pageId: string }) => s.pageId === pageId);
    if (!sec || !sec.faqs?.length) return null;
    return sec.faqs;
  };

  // Build investment breakdown rows (implementation listed first, above Year 1)
  const investmentRows: { label: string; value: string; subText?: string }[] = [];
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
  // Total Contract Value now shown in the KPI tiles above, not as a row

  // ---------- ROI Breakdown line items with auto-generated explanations ----------
  const fmtNum = (n: number) => Math.round(n).toLocaleString('en-US');
  const fmtRate = (n: number) => `$${n.toFixed(2)}`;
  const HOURS_PER_FTE = 2080;

  // HR Operations line items (yearly averages)
  const avgTier01Savings = hrOutput.yearCostResults.reduce((s, yr) => s + yr.tier01Savings, 0) / contractYears;
  const avgTier2Savings = hrOutput.yearCostResults.reduce((s, yr) => s + yr.tier2Savings, 0) / contractYears;
  const avgManagerSavings = hrOutput.yearCostResults.reduce((s, yr) => s + yr.managerSavings, 0) / contractYears;
  const avgTriageSavings = hrOutput.yearCostResults.reduce((s, yr) => s + yr.triageSavings, 0) / contractYears;
  const avgTier01Deflection = hrInputs.tier01DeflectionByYear?.length
    ? hrInputs.tier01DeflectionByYear.reduce((s, d) => s + d, 0) / hrInputs.tier01DeflectionByYear.length
    : 50;

  const hrItems: { label: string; value: string; explanation: string }[] = [
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

  // Legal & Compliance line items (yearly averages)
  const legalYears = legalOutput.yearResults;
  const avgAvoidedLegal = legalYears.reduce((s, yr) => s + yr.avoidedLegalCosts, 0) / contractYears;
  const avgAdminSavings = legalYears.reduce((s, yr) => s + yr.adminCostSavings, 0) / contractYears;
  const avgAuditPrep = legalYears.reduce((s, yr) => s + yr.auditPrepSavings, 0) / contractYears;
  const avgRiskValue = legalYears.reduce((s, yr) => s + yr.riskValue, 0) / contractYears;
  const avgProactiveValue = legalYears.reduce((s, yr) => s + yr.proactiveValue, 0) / contractYears;
  const avgAvoidedIncidents = legalYears.reduce((s, yr) => s + yr.avoidedIncidents, 0) / contractYears;

  const legalItems: { label: string; value: string; explanation: string }[] = [];
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

  // Employee Experience line items (yearly averages)
  const eeInputs = inputs.employeeExperience;
  const avgProductivity = employeeOutput.yearResults.reduce((s, yr) => s + yr.totalMonetaryValue, 0) / contractYears;
  const avgHoursSaved = employeeOutput.yearResults.reduce((s, yr) => s + yr.hoursSaved, 0) / contractYears;

  const eeItems: { label: string; value: string; explanation: string }[] = [
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

  const sections: ExportSection[] = [];

  // ==================== 1. COVER (dark) ====================
  const coverTopGroup = crypto.randomUUID();
  const coverBottomGroup = crypto.randomUUID();
  sections.push({
    id: crypto.randomUUID(),
    name: 'Cover Page',
    darkTheme: true,
    elements: [
      el('eyebrow-label', 12, { text: docContent.coverEyebrow || 'STRATEGIC PROPOSAL' }, coverTopGroup),
      el('section-heading', 12, { text: docContent.coverTitle, showBorder: false }, coverTopGroup),
      el('divider-line', 12, {}, coverTopGroup),
      el('vision-callout', 12, { text: docContent.coverQuote || '' }, coverTopGroup),
      el('cover-prepared-for', 12, {
        contactName: inputs.company.contactName,
        contactTitle: resolveOtherValue(inputs.company.contactTitle, inputs.company.customContactTitle),
      }, coverTopGroup),
      el('cover-image', 12, {}, coverBottomGroup),
      el('table-of-contents', 12, {
        heading: docContent.tocHeading || "What's Inside",
        items: docContent.tocItems,
      }, coverBottomGroup),
      el('page-footer', 12, { date: today, showConfidential: false }),
    ],
  });

  // ==================== 2. EXECUTIVE SUMMARY (+ Why Now) ====================
  const execLeftCol = crypto.randomUUID();
  const execElements: ExportElement[] = [
    el('section-heading', 12, { text: 'Executive Summary' }),
    el('body-text', 7, { text: docContent.execSummaryInsight }, execLeftCol),
    el('metric-table', 5, {
      title: 'Key Metrics',
      rows: [
        { label: 'Avg. Annual Investment', value: formatCompactCurrency(avgAnnualInvestment) },
        { label: 'Projected Annual Value', value: formatCompactCurrency(summary.grossAnnualValue) },
        { label: 'Return on Investment', value: `${formatCompactCurrency(summary.netAnnualBenefit)}/yr` },
        { label: 'Payback Period', value: `${paybackMonths.toFixed(1)} mo` },
      ],
    }),
    el('vision-callout', 7, { text: docContent.execSummaryVision }, execLeftCol),
  ];
  const execQuote = getQuote('executive-summary');
  if (execQuote) {
    execElements.push(el('customer-quote', 7, { text: execQuote.text, attribution: execQuote.attribution }, execLeftCol));
  }
  execElements.push(el('bullet-list', 7, { items: docContent.execSummaryBullets }, execLeftCol));
  execElements.push(el('sub-heading', 12, { text: 'Current State Assessment', borderPosition: 'top' }));
  execElements.push(el('accent-card-grid', 12, {
    items: docContent.painPoints.map((pp: Record<string, unknown>) => ({
      ...pp,
      description: pp.description || pp.impact,
    })),
  }));
  const currentStateQuote = getQuote('current-state');
  if (currentStateQuote) {
    execElements.push(el('customer-quote', 12, { text: currentStateQuote.text, attribution: currentStateQuote.attribution }));
  }
  const execFaqs = getFAQs('executive-summary');
  if (execFaqs) {
    execElements.push(el('faq-section', 12, { faqs: execFaqs }));
  }
  // Why Now — merged into Executive Summary
  execElements.push(el('sub-heading', 12, { text: 'Why Now?', borderPosition: 'top' }));
  execElements.push(el('accent-card-grid', 12, { items: docContent.whyNowItems }));
  const whyNowQuote = getQuote('why-now');
  if (whyNowQuote) {
    execElements.push(el('customer-quote', 12, { text: whyNowQuote.text, attribution: whyNowQuote.attribution }));
  }
  const whyNowFaqs = getFAQs('why-now');
  if (whyNowFaqs) {
    execElements.push(el('faq-section', 12, { faqs: whyNowFaqs }));
  }
  sections.push({ id: crypto.randomUUID(), name: 'Executive Summary', darkTheme: false, elements: execElements });

  // ==================== 3. THE SOLUTION: MEET HARPER ====================
  const harperLeftCol = crypto.randomUUID();
  const harperRightCol = crypto.randomUUID();
  // Simplify value driver titles to Cost / Consistency / Care
  const driverTitleMap: Record<number, string> = { 0: 'Cost', 1: 'Consistency', 2: 'Care' };
  const simplifiedDrivers = (docContent.valueDrivers || []).map((d: Record<string, unknown>, i: number) => ({
    ...d,
    headline: driverTitleMap[i] || d.headline,
  }));
  const harperIntroText = docContent.harperIntro || 'Harper handles the routine so your team can focus on what matters. She provides instant, accurate responses to employee questions while maintaining complete audit trails for compliance. By automating repetitive HR workflows and delivering consistent, policy-aligned guidance at scale, Harper frees your team to focus on strategic initiatives that drive real business impact — while maintaining complete audit trails for compliance.';
  const harperElements: ExportElement[] = [
    // Two-column opener: title + subtitle + line on left (8 col / 70%), profile on right (4 col / 30%)
    el('section-heading', 8, { text: 'The Solution: Meet Harper', showBorder: false }, harperLeftCol),
    el('harper-profile', 4, {}, harperRightCol),
    el('body-text', 8, { text: 'Your AI HR Generalist' }, harperLeftCol),
    el('divider-line', 8, {}, harperLeftCol),
    el('body-text', 8, { text: harperIntroText }, harperLeftCol),
  ];
  const harperQuote = getQuote('meet-harper');
  if (harperQuote) {
    harperElements.push(el('customer-quote', 12, { text: harperQuote.text, attribution: harperQuote.attribution }));
  }
  // Value Drivers
  harperElements.push(el('sub-heading', 12, { text: 'Value Drivers', borderPosition: 'none' }));
  harperElements.push(el('value-driver-cards', 12, { items: simplifiedDrivers }));
  const valueDriversQuote = getQuote('value-drivers');
  if (valueDriversQuote) {
    harperElements.push(el('customer-quote', 12, { text: valueDriversQuote.text, attribution: valueDriversQuote.attribution }));
  }
  const valueDriversFaqs = getFAQs('value-drivers');
  if (valueDriversFaqs) {
    harperElements.push(el('faq-section', 12, { faqs: valueDriversFaqs }));
  }
  // Integration pills (moved from Security page)
  harperElements.push(el('integration-pills', 12, { integrations: customerIntegrations }));
  // Implementation Timeline (moved from Security page)
  harperElements.push(el('sub-heading', 12, { text: 'Implementation Timeline (12 weeks)', borderPosition: 'none' }));
  harperElements.push(el('timeline-card-grid', 12, { items: docContent.implementationTimeline }));
  sections.push({ id: crypto.randomUUID(), name: 'The Solution: Meet Harper', darkTheme: false, elements: harperElements });

  // ==================== 4. INVESTMENT CASE (dark) ====================
  const investLeftCol = crypto.randomUUID();
  const investRightCol = crypto.randomUUID();
  const investElements: ExportElement[] = [
    el('section-heading', 12, { text: 'Investment Case' }),
    // KPI summary tiles
    el('kpi-tiles', 12, {
      tiles: [
        { value: formatCompactCurrency(pricing.totalContractValue), label: 'Total Investment' },
        { value: `${paybackMonths.toFixed(1)} mo`, label: 'Payback' },
        { value: formatCompactCurrency(projection.total), label: `${contractYears}-Year Value` },
        { value: formatCompactCurrency(projection.netTotal), label: `${contractYears}-Year Net` },
      ],
    }),
    // Side-by-side: Investment (left) + Return pie chart (right)
    el('metric-table', 6, {
      title: `Your Investment (${inputs.pricing.contractTermYears}-Year Contract)`,
      rows: investmentRows,
      showTotalRow: false,
    }, investLeftCol),
    el('roi-pie-chart', 6, {
      title: `Your Return (${contractYears}-Year Contract)`,
      slices: [
        { label: 'HR Operations', value: summary.hrOpsSavings * contractYears, formattedValue: formatCompactCurrency(summary.hrOpsSavings * contractYears) },
        { label: 'Legal & Compliance', value: summary.legalSavings * contractYears, formattedValue: formatCompactCurrency(summary.legalSavings * contractYears) },
        { label: 'Employee Experience', value: summary.productivitySavings * contractYears, formattedValue: formatCompactCurrency(summary.productivitySavings * contractYears) },
      ],
    }, investRightCol),
    // Breakdown heading
    el('sub-heading', 12, { text: 'Return Breakdown', borderPosition: 'none' }),
    // Three-column breakdown
    el('roi-breakdown-columns', 12, {
      columns: [
        { title: 'HR Operations', total: `${formatCompactCurrency(summary.hrOpsSavings)}/yr`, items: hrItems },
        { title: 'Legal & Compliance', total: `${formatCompactCurrency(summary.legalSavings)}/yr`, items: legalItems },
        { title: 'Employee Experience', total: `${formatCompactCurrency(summary.productivitySavings)}/yr`, items: eeItems },
      ],
    }),
  ];
  const investQuote = getQuote('investment');
  if (investQuote) {
    investElements.push(el('customer-quote', 12, { text: investQuote.text, attribution: investQuote.attribution }));
  }
  const investFaqs = getFAQs('investment');
  if (investFaqs) {
    investElements.push(el('faq-section', 12, { faqs: investFaqs }));
  }
  sections.push({ id: crypto.randomUUID(), name: 'Investment Case', darkTheme: true, elements: investElements });

  // ==================== 5. SECURITY & NEXT STEPS ====================
  const finalElements: ExportElement[] = [
    el('section-heading', 12, { text: 'Security & Integration' }),
    el('sub-heading', 12, { text: 'Enterprise Security', borderPosition: 'none' }),
    el('feature-card-grid', 12, { items: docContent.securityFeatures }),
  ];
  const securityQuote = getQuote('security');
  if (securityQuote) {
    finalElements.push(el('customer-quote', 12, { text: securityQuote.text, attribution: securityQuote.attribution }));
  }
  const securityFaqs = getFAQs('security');
  if (securityFaqs) {
    finalElements.push(el('faq-section', 12, { faqs: securityFaqs }));
  }
  // Next Steps — section heading for bigger presence
  finalElements.push(el('section-heading', 12, { text: 'Next Steps' }));
  finalElements.push(el('numbered-steps', 12, { items: docContent.nextStepsItems }));
  finalElements.push(el('contact-card', 12, { email: inputs.company.contactEmail }));
  finalElements.push(el('page-footer', 12, { date: today, showConfidential: true }));
  sections.push({ id: crypto.randomUUID(), name: 'Security & Next Steps', darkTheme: false, elements: finalElements });

  return sections;
}
