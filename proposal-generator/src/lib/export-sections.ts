import type { ProposalInputs, ProposalElementType, QuoteSection } from '@/types/proposal';
import { resolveOtherValue } from '@/types/proposal';
import { getDefaultElementData } from '@/components/proposal/templates/element-defaults';
import { calculatePricing } from '@/lib/pricing-calculator';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
} from '@/lib/roi-calculator';
import { materializeDocumentContent } from '@/lib/materialize-content';
import { getSelectedQuoteForSection } from '@/lib/customer-quotes';
import { getEnabledPillarsFromProposal, PILLAR_LABELS, type PillarKey } from '@/lib/pillar-visibility';

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
  const wisqLicenseCost = pricing.annualRecurringRevenue;
  // summary drives pillar visibility (non-zero savings → pillar shown). Resolved
  // numbers themselves come from buildExportVariables at render time.
  const summary = calculateROISummary(hrOutput, legalOutput, employeeOutput, wisqLicenseCost, contractYears);

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

  // Build investment breakdown rows (implementation listed first, above Year 1).
  // Token names for the dynamic per-year values are emitted inline and must
  // match buildExportVariables() — see yearN_softwareNetPrice below.
  const investmentRows: { label: string; value: string; subText?: string }[] = [];
  if (pricing.implementationNetPrice > 0) {
    investmentRows.push({ label: 'One-Time Implementation', value: '{{implementationNetPrice}}' });
  }
  pricing.yearlyBreakdown.forEach((year, index) => {
    const yearConfig = inputs.pricing.yearlyConfig[index];
    const suffix = yearConfig?.workflows.included ? ' (Platform + Workflows)' : ' (Platform)';
    investmentRows.push({ label: `Year ${year.year} Software${suffix}`, value: `{{year${year.year}SoftwareNetPrice}}` });
  });
  if (pricing.servicesNetPrice > 0) {
    investmentRows.push({ label: 'Professional Services', value: '{{servicesNetPrice}}' });
  }
  if (pricing.integrationsNetPrice > 0) {
    investmentRows.push({ label: 'Additional Integrations', value: '{{integrationsNetPrice}}' });
  }
  // Total Contract Value now shown in the KPI tiles above, not as a row

  // ---------- ROI Breakdown line items with auto-generated explanations ----------
  // Every numeric value below is emitted as a `{{variableName}}` token instead
  // of a resolved string. ExportEditor resolves them at render time via
  // ExportVariablesProvider + buildExportVariables, so text-edit mode shows
  // users which values are dynamic. Token names must match keys in
  // lib/export-variables.ts.

  // In simple mode the user has mutually agreed on a flat annual amount with
  // the customer — we can't (and shouldn't) break it down into calculated line
  // items. Show a single "Mutually agreed upon" row instead.
  const SIMPLE_EXPLANATION = 'Mutually agreed upon';

  // HR Operations line items
  let hrItems: { label: string; value: string; explanation: string }[];
  if (hrInputs.mode === 'simple') {
    hrItems = [
      {
        label: 'HR Operations Savings',
        value: '{{hrOpsSavingsPerYr}}',
        explanation: SIMPLE_EXPLANATION,
      },
    ];
  } else {
    const avgManagerSavings = hrOutput.yearCostResults.reduce((s, yr) => s + yr.managerSavings, 0) / contractYears;
    const avgTriageSavings = hrOutput.yearCostResults.reduce((s, yr) => s + yr.triageSavings, 0) / contractYears;
    hrItems = [
      {
        label: 'Simple Workflow Savings',
        value: '{{avgTier01Savings}}',
        explanation: '{{tier01CasesPerYear}} simple transactions/yr, ~{{tier01DeflectionPct}} deflected at {{tier01HandlerRate}}/hr',
      },
      {
        label: 'Complex Case Efficiency',
        value: '{{avgTier2Savings}}',
        explanation: '{{tier2WorkflowCount}} configured workflows reducing complex case processing time',
      },
    ];
    if (hrInputs.managerHRTime?.enabled && avgManagerSavings > 0) {
      hrItems.push({
        label: 'Manager Time Savings',
        value: '{{avgManagerSavings}}',
        explanation: '{{managersDoingHR}} managers × {{managerHoursPerWeek}} hrs/wk × {{managerHourlyCost}}/hr',
      });
    }
    if (hrInputs.triageRole?.enabled && avgTriageSavings > 0) {
      hrItems.push({
        label: 'Triage Role Savings',
        value: '{{avgTriageSavings}}',
        explanation: '{{triageFTEs}} triage FTEs × {{triageSalary}} salary × workload reduction',
      });
    }
  }

  // Legal & Compliance line items
  let legalItems: { label: string; value: string; explanation: string }[];
  if (inputs.legalCompliance.mode === 'simple') {
    legalItems = [
      {
        label: 'Compliance Value',
        value: '{{legalSavingsPerYr}}',
        explanation: SIMPLE_EXPLANATION,
      },
    ];
  } else {
    const legalYears = legalOutput.yearResults;
    const avgAvoidedLegal = legalYears.reduce((s, yr) => s + yr.avoidedLegalCosts, 0) / contractYears;
    const avgAdminSavings = legalYears.reduce((s, yr) => s + yr.adminCostSavings, 0) / contractYears;
    const avgAuditPrep = legalYears.reduce((s, yr) => s + yr.auditPrepSavings, 0) / contractYears;
    const avgRiskValue = legalYears.reduce((s, yr) => s + yr.riskValue, 0) / contractYears;
    const avgProactiveValue = legalYears.reduce((s, yr) => s + yr.proactiveValue, 0) / contractYears;
    legalItems = [];
    if (avgAvoidedLegal > 0) {
      legalItems.push({
        label: 'Legal Cost Avoidance',
        value: '{{avgAvoidedLegal}}',
        explanation: '~{{avgAvoidedIncidents}} incidents avoided/yr × {{avgLegalCostPerIncident}}/incident',
      });
    }
    if (avgAdminSavings > 0) {
      legalItems.push({
        label: 'Compliance Admin Savings',
        value: '{{avgAdminSavings}}',
        explanation: '{{adminHoursPerCase}} hrs saved/case × {{adminHourlyRate}}/hr',
      });
    }
    if (avgAuditPrep > 0 && inputs.legalCompliance.auditPrep?.enabled) {
      legalItems.push({
        label: 'Audit Prep Savings',
        value: '{{avgAuditPrep}}',
        explanation: '{{auditsPerYear}} audits/yr × {{auditPrepHoursPerAudit}} hrs × {{auditWisqReductionPercent}} time saved',
      });
    }
    if (avgRiskValue > 0) {
      legalItems.push({
        label: 'Risk Detection Value',
        value: '{{avgRiskValue}}',
        explanation: 'Proactive risk pattern identification across case data',
      });
    }
    if (avgProactiveValue > 0) {
      legalItems.push({
        label: 'Proactive Alerts Value',
        value: '{{avgProactiveValue}}',
        explanation: 'Early warning system for emerging compliance risks',
      });
    }
  }

  // Employee Experience line items
  let eeItems: { label: string; value: string; explanation: string }[];
  if (inputs.employeeExperience.mode === 'simple') {
    eeItems = [
      {
        label: 'Employee Productivity Gains',
        value: '{{productivitySavingsPerYr}}',
        explanation: SIMPLE_EXPLANATION,
      },
    ];
  } else {
    const avgHoursSaved = employeeOutput.yearResults.reduce((s, yr) => s + yr.hoursSaved, 0) / contractYears;
    eeItems = [
      {
        label: 'Employee Productivity Gains',
        value: '{{avgProductivity}}',
        explanation: '{{totalEmployeePopulation}} employees × {{inquiriesPerEmployeePerYear}} inquiries/yr × {{timeReductionPercent}} faster at {{eeHourlyRate}}/hr',
      },
    ];
    if (avgHoursSaved > 0) {
      eeItems.push({
        label: 'Hours Returned to Workforce',
        value: '{{avgHoursSaved}}',
        explanation: 'Equivalent to {{avgFtesReturned}} FTEs of productive time returned',
      });
    }
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
      hideSubText: true,
      rows: [
        { label: 'Avg. Annual Investment', value: '{{avgAnnualInvestment}}' },
        { label: 'Projected Annual Value', value: '{{grossAnnualValue}}' },
        { label: 'Return on Investment', value: '{{netAnnualBenefitPerYr}}' },
        { label: 'Payback Period', value: '{{paybackMonthsLabel}}' },
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
        { value: '{{totalContractValue}}', label: 'Total Investment' },
        { value: '{{paybackMonthsLabel}}', label: 'Payback' },
        { value: '{{projectionTotal}}', label: '{{contractYearsOrdinal}} Value' },
        { value: '{{projectionNetTotal}}', label: '{{contractYearsOrdinal}} Net' },
      ],
    }),
    // Side-by-side: Investment (left) + Return pie chart (right)
    el('metric-table', 6, {
      title: 'Your Investment ({{contractYearsOrdinal}} Contract)',
      rows: investmentRows,
      showTotalRow: false,
    }, investLeftCol),
  ];

  // Filter pie slices + breakdown columns to only enabled pillars
  const enabledPillars = getEnabledPillarsFromProposal(inputs);
  const pillarData: Record<PillarKey, { annual: number; items: typeof hrItems }> = {
    hrOps: { annual: summary.hrOpsSavings, items: hrItems },
    legal: { annual: summary.legalSavings, items: legalItems },
    ex: { annual: summary.productivitySavings, items: eeItems },
  };
  // Map each pillar key to its total-value token name. The pie & breakdown
  // consume tokens so the editor's text-edit mode shows which values are dynamic.
  const pillarTotalTokens: Record<PillarKey, string> = {
    hrOps: '{{hrOpsTotal}}',
    legal: '{{legalTotal}}',
    ex: '{{productivityTotal}}',
  };
  const pillarAnnualTokens: Record<PillarKey, string> = {
    hrOps: '{{hrOpsSavingsPerYr}}',
    legal: '{{legalSavingsPerYr}}',
    ex: '{{productivitySavingsPerYr}}',
  };

  const pieSlices = enabledPillars.map(k => ({
    label: PILLAR_LABELS[k],
    // `value` drives geometry and must be numeric — keep as a real number
    value: pillarData[k].annual * contractYears,
    formattedValue: pillarTotalTokens[k],
  }));
  const breakdownColumns = enabledPillars.map(k => ({
    title: PILLAR_LABELS[k],
    total: pillarAnnualTokens[k],
    items: pillarData[k].items,
  }));

  investElements.push(
    el('roi-pie-chart', 6, {
      title: 'Your Return ({{contractYearsOrdinal}} Contract)',
      slices: pieSlices,
    }, investRightCol),
    el('sub-heading', 12, { text: 'Return Breakdown', borderPosition: 'none' }),
    el('roi-breakdown-columns', 12, { columns: breakdownColumns }),
  );
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
