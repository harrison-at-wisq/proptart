import type { ProposalInputs, ProposalElementType, QuoteSection } from '@/types/proposal';
import { resolveOtherValue } from '@/types/proposal';
import { getDefaultElementData } from '@/components/proposal/templates/element-defaults';
import { calculatePricing, formatCompactCurrency } from '@/lib/pricing-calculator';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
  calculate3YearProjection,
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

/** Build the default 7-section proposal matching the assets template, populated with real data */
export function buildDefaultSections(inputs: ProposalInputs): ExportSection[] {
  // Materialize document content (narrative text, bullets, etc.)
  const docContent = inputs.documentContent || materializeDocumentContent(inputs);

  // Calculate pricing & ROI
  const pricing = calculatePricing(inputs.pricing);
  const hrOutput = calculateHROperationsROI(inputs.hrOperations);
  const tier2Cases = inputs.hrOperations.tier2Workflows.reduce((sum, w) => sum + w.volumePerYear, 0);
  const legalOutput = calculateLegalComplianceROI(inputs.legalCompliance, tier2Cases);
  const employeeOutput = calculateEmployeeExperienceROI(inputs.employeeExperience);
  const summary = calculateROISummary(hrOutput, legalOutput, employeeOutput, pricing.annualRecurringRevenue);
  const projection = calculate3YearProjection(summary.grossAnnualValue, pricing.annualRecurringRevenue);

  // Build integrations list
  const customerIntegrations = [
    inputs.integrations.hcm && { name: resolveOtherValue(inputs.integrations.hcm, inputs.integrations.customHcm), category: 'HCM' },
    inputs.integrations.identity && { name: resolveOtherValue(inputs.integrations.identity, inputs.integrations.customIdentity), category: 'Identity' },
    inputs.integrations.documents && { name: resolveOtherValue(inputs.integrations.documents, inputs.integrations.customDocuments), category: 'Documents' },
    inputs.integrations.communication && { name: resolveOtherValue(inputs.integrations.communication, inputs.integrations.customCommunication), category: 'Communication' },
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

  // Build investment breakdown rows
  const investmentRows: { label: string; value: string }[] = [];
  pricing.yearlyBreakdown.forEach((year, index) => {
    const yearConfig = inputs.pricing.yearlyConfig[index];
    const suffix = yearConfig?.workflows.included ? ' (Platform + Workflows)' : ' (Platform)';
    investmentRows.push({ label: `Year ${year.year} Software${suffix}`, value: formatCompactCurrency(year.softwareNetPrice) });
  });
  if (pricing.implementationNetPrice > 0) {
    investmentRows.push({ label: 'One-Time Implementation', value: formatCompactCurrency(pricing.implementationNetPrice) });
  }
  if (pricing.servicesNetPrice > 0) {
    investmentRows.push({ label: 'Professional Services', value: formatCompactCurrency(pricing.servicesNetPrice) });
  }
  if (pricing.integrationsNetPrice > 0) {
    investmentRows.push({ label: 'Additional Integrations', value: formatCompactCurrency(pricing.integrationsNetPrice) });
  }
  investmentRows.push({ label: 'Total Contract Value', value: formatCompactCurrency(pricing.totalContractValue) });

  const sections: ExportSection[] = [];

  // ==================== 1. COVER (dark) ====================
  sections.push({
    id: crypto.randomUUID(),
    name: 'Cover Page',
    darkTheme: true,
    elements: [
      el('cover-title-block', 12, {
        title: docContent.coverTitle,
        quote: docContent.coverQuote || '',
        contactName: inputs.company.contactName,
        contactTitle: resolveOtherValue(inputs.company.contactTitle, inputs.company.customContactTitle),
      }),
      el('page-footer', 12, { date: today, showConfidential: false }),
    ],
  });

  // ==================== 2. EXECUTIVE SUMMARY ====================
  const execLeftCol = crypto.randomUUID();
  const execElements: ExportElement[] = [
    el('section-heading', 12, { text: 'Executive Summary' }),
    el('body-text', 7, { text: docContent.execSummaryInsight }, execLeftCol),
    el('metric-table', 5, {
      title: 'Key Metrics',
      rows: [
        { label: 'Annual Investment', value: formatCompactCurrency(pricing.annualRecurringRevenue) },
        { label: 'Projected Annual Value', value: formatCompactCurrency(summary.grossAnnualValue) },
        { label: 'Return on Investment', value: `${summary.totalROI.toFixed(0)}%` },
        { label: 'Payback Period', value: `${summary.paybackPeriodMonths.toFixed(1)} mo` },
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
  sections.push({ id: crypto.randomUUID(), name: 'Executive Summary', darkTheme: false, elements: execElements });

  // ==================== 3. THE SOLUTION: MEET HARPER ====================
  const harperElements: ExportElement[] = [
    el('section-heading', 12, { text: 'The Solution: Meet Harper', subtitle: 'Your AI HR Generalist' }),
    el('body-text', 12, { text: docContent.harperIntro }),
    el('stat-cards', 12, { items: docContent.harperStats }),
  ];
  const harperQuote = getQuote('meet-harper');
  if (harperQuote) {
    harperElements.push(el('customer-quote', 12, { text: harperQuote.text, attribution: harperQuote.attribution }));
  }
  harperElements.push(el('sub-heading', 12, { text: 'Value Drivers', borderPosition: 'none' }));
  harperElements.push(el('value-driver-cards', 12, { items: docContent.valueDrivers }));
  const valueDriversQuote = getQuote('value-drivers');
  if (valueDriversQuote) {
    harperElements.push(el('customer-quote', 12, { text: valueDriversQuote.text, attribution: valueDriversQuote.attribution }));
  }
  const valueDriversFaqs = getFAQs('value-drivers');
  if (valueDriversFaqs) {
    harperElements.push(el('faq-section', 12, { faqs: valueDriversFaqs }));
  }
  sections.push({ id: crypto.randomUUID(), name: 'The Solution: Meet Harper', darkTheme: false, elements: harperElements });

  // ==================== 4. INVESTMENT CASE (dark) ====================
  const investLeftCol = crypto.randomUUID();
  const investRightCol = crypto.randomUUID();
  const investElements: ExportElement[] = [
    el('section-heading', 12, { text: 'Investment Case' }),
    el('metric-table', 6, {
      title: `Your Investment (${inputs.pricing.contractTermYears}-Year Contract)`,
      rows: investmentRows,
    }, investLeftCol),
    el('metric-table', 6, {
      title: 'Your Return',
      rows: [
        { label: 'HR Operations Savings', value: formatCompactCurrency(summary.hrOpsSavings) },
        { label: 'Compliance Value', value: formatCompactCurrency(summary.legalSavings) },
        { label: 'Productivity Gains', value: formatCompactCurrency(summary.productivitySavings) },
        { label: 'Net Annual Value', value: formatCompactCurrency(summary.netAnnualBenefit) },
      ],
    }, investRightCol),
    el('kpi-tiles', 12, {
      tiles: [
        { value: `${summary.totalROI.toFixed(0)}%`, label: 'ROI' },
        { value: `${summary.paybackPeriodMonths.toFixed(1)} mo`, label: 'Payback' },
        { value: formatCompactCurrency(projection.total), label: '3-Year Value' },
        { value: formatCompactCurrency(projection.netTotal), label: '3-Year Net' },
      ],
    }),
  ];
  const investQuote = getQuote('investment');
  if (investQuote) {
    investElements.push(el('customer-quote', 12, { text: investQuote.text, attribution: investQuote.attribution }));
  }
  investElements.push(el('projection-panel', 12, {
    columns: [
      { label: 'Year 1 (50% adoption)', value: formatCompactCurrency(projection.year1) },
      { label: 'Year 2 (75% adoption)', value: formatCompactCurrency(projection.year2) },
      { label: 'Year 3 (100% adoption)', value: formatCompactCurrency(projection.year3) },
    ],
  }));
  const investFaqs = getFAQs('investment');
  if (investFaqs) {
    investElements.push(el('faq-section', 12, { faqs: investFaqs }));
  }
  sections.push({ id: crypto.randomUUID(), name: 'Investment Case', darkTheme: true, elements: investElements });

  // ==================== 5. SECURITY & INTEGRATION ====================
  const securityElements: ExportElement[] = [
    el('section-heading', 12, { text: 'Security & Integration' }),
    el('sub-heading', 12, { text: 'Enterprise Security', borderPosition: 'none' }),
    el('feature-card-grid', 12, { items: docContent.securityFeatures }),
    el('integration-pills', 12, { integrations: customerIntegrations }),
  ];
  const securityQuote = getQuote('security');
  if (securityQuote) {
    securityElements.push(el('customer-quote', 12, { text: securityQuote.text, attribution: securityQuote.attribution }));
  }
  securityElements.push(el('sub-heading', 12, { text: 'Implementation Timeline (12 weeks)', borderPosition: 'none' }));
  securityElements.push(el('timeline-card-grid', 12, { items: docContent.implementationTimeline }));
  const securityFaqs = getFAQs('security');
  if (securityFaqs) {
    securityElements.push(el('faq-section', 12, { faqs: securityFaqs }));
  }
  sections.push({ id: crypto.randomUUID(), name: 'Security & Integration', darkTheme: false, elements: securityElements });

  // ==================== 6. WHY NOW ====================
  const whyNowElements: ExportElement[] = [
    el('section-heading', 12, { text: 'Why Now?' }),
    el('accent-card-grid', 12, { items: docContent.whyNowItems }),
  ];
  const whyNowQuote = getQuote('why-now');
  if (whyNowQuote) {
    whyNowElements.push(el('customer-quote', 12, { text: whyNowQuote.text, attribution: whyNowQuote.attribution }));
  }
  const whyNowFaqs = getFAQs('why-now');
  if (whyNowFaqs) {
    whyNowElements.push(el('faq-section', 12, { faqs: whyNowFaqs }));
  }
  sections.push({ id: crypto.randomUUID(), name: 'Why Now', darkTheme: false, elements: whyNowElements });

  // ==================== 7. NEXT STEPS ====================
  sections.push({
    id: crypto.randomUUID(),
    name: 'Next Steps',
    darkTheme: false,
    elements: [
      el('sub-heading', 12, { text: 'Next Steps', borderPosition: 'top' }),
      el('numbered-steps', 12, { items: docContent.nextStepsItems }),
      el('contact-card', 12, { email: inputs.company.contactEmail }),
      el('page-footer', 12, { date: today, showConfidential: true }),
    ],
  });

  return sections;
}
