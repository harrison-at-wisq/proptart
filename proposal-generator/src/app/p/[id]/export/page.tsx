'use client';

import React, { use, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ProposalInputs, ProposalElementType, QuoteSection } from '@/types/proposal';
import { resolveOtherValue } from '@/types/proposal';
import { ExportToolbar } from '@/components/ui/ExportToolbar';
import { ELEMENT_REGISTRY, ELEMENT_CATALOG } from '@/components/proposal/templates/registry';
import { LayoutModeContext } from '@/components/ui/LayoutModeContext';
import { getDefaultElementData, getEditableDataKey } from '@/components/proposal/templates/element-defaults';
import { calculatePricing, formatCompactCurrency, formatCurrency } from '@/lib/pricing-calculator';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
  calculate3YearProjection,
} from '@/lib/roi-calculator';
import { materializeDocumentContent } from '@/lib/materialize-content';
import { getSelectedQuoteForSection } from '@/lib/customer-quotes';
import { getThemeVars } from '@/lib/theme';

// ---------- Local types ----------

interface ExportElement {
  id: string;
  elementType: ProposalElementType;
  colSpan: number;
  groupId: string;
  data: Record<string, unknown>;
}

interface ExportSection {
  id: string;
  name: string;
  darkTheme: boolean;
  elements: ExportElement[];
}

// ---------- Pre-built section templates ----------

interface SectionTemplate {
  id: string;
  name: string;
  description: string;
  darkTheme: boolean;
  preview: React.ReactNode;
  buildElements: () => ExportElement[];
}

function el(elementType: ProposalElementType, colSpan: number, dataOverrides?: Record<string, unknown>, groupId?: string): ExportElement {
  return {
    id: crypto.randomUUID(),
    elementType,
    colSpan,
    groupId: groupId ?? crypto.randomUUID(),
    data: { ...getDefaultElementData(elementType), ...dataOverrides },
  };
}

/** Build the default 7-section proposal matching the assets template, populated with real data */
function buildDefaultSections(inputs: ProposalInputs): ExportSection[] {
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
      el('page-footer', 12, { date: today, showConfidential: false, customerLogoSrc: inputs.company.customerLogoBase64 }),
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
        { label: 'Return on Investment', value: `${formatCompactCurrency(summary.netAnnualBenefit)}/yr` },
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
        { value: `${formatCompactCurrency(summary.netAnnualBenefit)}/yr`, label: 'ROI' },
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
      el('page-footer', 12, { date: today, showConfidential: true, customerLogoSrc: inputs.company.customerLogoBase64 }),
    ],
  });

  return sections;
}

const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    id: 'cover',
    name: 'Cover Page',
    description: 'Title block with dark background',
    darkTheme: true,
    preview: (
      <div className="w-full h-full flex flex-col justify-end p-2 bg-[#03143B] rounded-sm">
        <div className="bg-white/20 h-1 w-8 mb-1 rounded-full" />
        <div className="bg-white/40 h-1.5 w-16 mb-0.5 rounded-full" />
        <div className="bg-white/20 h-1 w-12 rounded-full" />
      </div>
    ),
    buildElements: () => [
      el('cover-title-block', 12),
    ],
  },
  {
    id: 'executive-summary',
    name: 'Executive Summary',
    description: 'Heading, body with sidebar metrics, and KPI tiles',
    darkTheme: false,
    preview: (
      <div className="w-full h-full flex flex-col gap-1 p-1.5">
        <div className="bg-current opacity-30 h-1.5 w-12 rounded-full" />
        <div className="flex gap-1 flex-1">
          <div className="flex-[7] bg-current opacity-15 rounded-sm" />
          <div className="flex-[5] bg-current opacity-20 rounded-sm" />
        </div>
        <div className="flex gap-1 h-3">
          <div className="flex-1 bg-current opacity-10 rounded-sm" />
          <div className="flex-1 bg-current opacity-10 rounded-sm" />
          <div className="flex-1 bg-current opacity-10 rounded-sm" />
          <div className="flex-1 bg-current opacity-10 rounded-sm" />
        </div>
      </div>
    ),
    buildElements: () => {
      const leftCol = crypto.randomUUID();
      return [
        el('section-heading', 12, { text: 'Executive Summary' }),
        el('body-text', 7, { text: 'This proposal outlines a comprehensive approach to transforming your HR operations through intelligent automation. By leveraging AI-powered workflows and self-service capabilities, we project significant improvements in response time, accuracy, and employee satisfaction across all HR touchpoints.' }, leftCol),
        el('metric-table', 5),
        el('vision-callout', 7, { text: 'A strategic investment today that pays dividends across operational efficiency, compliance, and employee experience for years to come.' }, leftCol),
        el('kpi-tiles', 12),
      ];
    },
  },
  {
    id: 'features',
    name: 'Feature Showcase',
    description: 'Heading, description, and feature cards',
    darkTheme: false,
    preview: (
      <div className="w-full h-full flex flex-col gap-1 p-1.5">
        <div className="bg-current opacity-30 h-1.5 w-10 rounded-full" />
        <div className="bg-current opacity-10 h-2 rounded-sm" />
        <div className="flex gap-1 flex-1">
          <div className="flex-1 bg-current opacity-15 rounded-sm" />
          <div className="flex-1 bg-current opacity-15 rounded-sm" />
          <div className="flex-1 bg-current opacity-15 rounded-sm" />
        </div>
      </div>
    ),
    buildElements: () => {
      const g = crypto.randomUUID();
      return [
        el('section-heading', 12, { text: 'Platform Capabilities' }, g),
        el('body-text', 12, { text: 'Our platform delivers a comprehensive suite of capabilities designed to modernize every aspect of your HR operations, from employee self-service to complex compliance workflows.' }, g),
        el('feature-card-grid', 12, undefined, g),
      ];
    },
  },
  {
    id: 'value-proposition',
    name: 'Value Proposition',
    description: 'Side-by-side body text and bullet points with value drivers',
    darkTheme: false,
    preview: (
      <div className="w-full h-full flex flex-col gap-1 p-1.5">
        <div className="bg-current opacity-30 h-1.5 w-14 rounded-full" />
        <div className="flex gap-1 flex-1">
          <div className="flex-1 bg-current opacity-10 rounded-sm" />
          <div className="flex-1 flex flex-col gap-0.5 justify-center">
            <div className="bg-current opacity-15 h-1 rounded-full" />
            <div className="bg-current opacity-15 h-1 rounded-full" />
            <div className="bg-current opacity-15 h-1 rounded-full" />
          </div>
        </div>
        <div className="flex gap-1 h-4">
          <div className="flex-1 bg-current opacity-15 rounded-sm" />
          <div className="flex-1 bg-current opacity-15 rounded-sm" />
          <div className="flex-1 bg-current opacity-15 rounded-sm" />
        </div>
      </div>
    ),
    buildElements: () => [
      el('section-heading', 12, { text: 'Why This Matters' }),
      el('body-text', 6, { text: 'Organizations that invest in intelligent HR automation see transformative results within the first year. Our approach focuses on three core pillars that drive measurable business outcomes and position your team for sustainable growth.' }),
      el('bullet-list', 6),
      el('value-driver-cards', 12),
    ],
  },
  {
    id: 'timeline',
    name: 'Implementation Timeline',
    description: 'Phase cards and numbered steps',
    darkTheme: false,
    preview: (
      <div className="w-full h-full flex flex-col gap-1 p-1.5">
        <div className="bg-current opacity-30 h-1.5 w-12 rounded-full" />
        <div className="bg-current opacity-10 h-2 rounded-sm" />
        <div className="flex gap-1 h-4">
          <div className="flex-1 bg-current opacity-15 rounded-sm border-t-2 border-current" style={{ borderColor: 'rgba(0,0,0,0.2)' }} />
          <div className="flex-1 bg-current opacity-15 rounded-sm border-t-2 border-current" style={{ borderColor: 'rgba(0,0,0,0.2)' }} />
          <div className="flex-1 bg-current opacity-15 rounded-sm border-t-2 border-current" style={{ borderColor: 'rgba(0,0,0,0.2)' }} />
          <div className="flex-1 bg-current opacity-15 rounded-sm border-t-2 border-current" style={{ borderColor: 'rgba(0,0,0,0.2)' }} />
        </div>
      </div>
    ),
    buildElements: () => {
      const g = crypto.randomUUID();
      return [
        el('section-heading', 12, { text: 'Implementation Roadmap' }, g),
        el('body-text', 12, { text: 'Our proven implementation methodology ensures a smooth rollout with minimal disruption to your current operations. Each phase builds on the previous one, allowing your team to gradually adopt new capabilities.' }, g),
        el('timeline-card-grid', 12, undefined, g),
      ];
    },
  },
  {
    id: 'data-metrics',
    name: 'Data & Metrics',
    description: 'Stat cards with body text and metric sidebar',
    darkTheme: false,
    preview: (
      <div className="w-full h-full flex flex-col gap-1 p-1.5">
        <div className="bg-current opacity-30 h-1.5 w-10 rounded-full" />
        <div className="flex gap-1 h-3">
          <div className="flex-1 bg-current opacity-10 rounded-sm" />
          <div className="flex-1 bg-current opacity-10 rounded-sm" />
          <div className="flex-1 bg-current opacity-10 rounded-sm" />
        </div>
        <div className="flex gap-1 flex-1">
          <div className="flex-[7] bg-current opacity-10 rounded-sm" />
          <div className="flex-[5] bg-current opacity-20 rounded-sm" />
        </div>
      </div>
    ),
    buildElements: () => {
      const topRow = crypto.randomUUID();
      return [
        el('section-heading', 12, { text: 'Investment Case' }, topRow),
        el('stat-cards', 12, undefined, topRow),
        el('body-text', 7, { text: 'The projected return on investment demonstrates clear financial justification for this initiative. Beyond direct cost savings, the strategic value of improved compliance, faster response times, and enhanced employee experience creates compounding benefits over the contract term.' }),
        el('metric-table', 5),
      ];
    },
  },
  {
    id: 'security-dark',
    name: 'Security & Compliance',
    description: 'Dark page with accent cards and features',
    darkTheme: true,
    preview: (
      <div className="w-full h-full flex flex-col gap-1 p-1.5 bg-[#03143B] rounded-sm">
        <div className="bg-white/40 h-1.5 w-12 rounded-full" />
        <div className="bg-white/15 h-2 rounded-sm" />
        <div className="flex gap-1 flex-1">
          <div className="flex-1 bg-white/10 rounded-sm" />
          <div className="flex-1 bg-white/10 rounded-sm" />
          <div className="flex-1 bg-white/10 rounded-sm" />
        </div>
      </div>
    ),
    buildElements: () => {
      const g = crypto.randomUUID();
      return [
        el('section-heading', 12, { text: 'Enterprise Security' }, g),
        el('body-text', 12, { text: 'Security is foundational to everything we build. Our platform meets the most stringent enterprise requirements with SOC 2 Type II compliance, end-to-end encryption, and granular access controls.' }, g),
        el('feature-card-grid', 12, undefined, g),
      ];
    },
  },
  {
    id: 'next-steps',
    name: 'Next Steps',
    description: 'Numbered action items with contact card',
    darkTheme: false,
    preview: (
      <div className="w-full h-full flex flex-col gap-1 p-1.5">
        <div className="bg-current opacity-30 h-1.5 w-10 rounded-full" />
        <div className="flex-1 flex flex-col gap-0.5 justify-center px-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-current opacity-20 flex-shrink-0" />
            <div className="bg-current opacity-15 h-1 flex-1 rounded-full" />
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-current opacity-20 flex-shrink-0" />
            <div className="bg-current opacity-15 h-1 flex-1 rounded-full" />
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-current opacity-20 flex-shrink-0" />
            <div className="bg-current opacity-15 h-1 flex-1 rounded-full" />
          </div>
        </div>
        <div className="bg-current opacity-10 h-3 rounded-sm" />
      </div>
    ),
    buildElements: () => {
      const g = crypto.randomUUID();
      return [
        el('section-heading', 12, { text: 'Next Steps' }, g),
        el('numbered-steps', 12, undefined, g),
        el('contact-card', 12, undefined, g),
      ];
    },
  },
  {
    id: 'faq',
    name: 'FAQ',
    description: 'Common questions and answers',
    darkTheme: false,
    preview: (
      <div className="w-full h-full flex flex-col gap-1 p-1.5">
        <div className="bg-current opacity-30 h-1.5 w-10 rounded-full" />
        <div className="flex-1 flex flex-col gap-1 justify-center">
          <div className="bg-current opacity-10 h-2 rounded-sm" />
          <div className="bg-current opacity-10 h-2 rounded-sm" />
          <div className="bg-current opacity-10 h-2 rounded-sm" />
        </div>
      </div>
    ),
    buildElements: () => {
      const g = crypto.randomUUID();
      return [
        el('section-heading', 12, { text: 'Frequently Asked Questions' }, g),
        el('faq-section', 12, undefined, g),
      ];
    },
  },
];

// ---------- Component ----------

export default function ProposalExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [proposalData, setProposalData] = useState<ProposalInputs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [layoutMode, setLayoutMode] = useState(false);
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);
  const [showElementPicker, setShowElementPicker] = useState<{ sectionId: string; colSpan: number; groupId: string } | null>(null);
  const [sections, setSections] = useState<ExportSection[]>([]);
  const [dragData, setDragData] = useState<{ elementId: string; fromSectionId: string; fromGroupId: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ sectionId: string; groupId: string; insertBeforeId: string | null } | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Track which section is most visible in the viewport
  useEffect(() => {
    if (sections.length === 0) return;
    const ratioMap = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const sectionId = entry.target.id.replace('section-', '');
          ratioMap.set(sectionId, entry.intersectionRatio);
        }
        let bestId: string | null = null;
        let bestRatio = 0;
        for (const [sid, ratio] of ratioMap) {
          if (ratio > bestRatio) { bestRatio = ratio; bestId = sid; }
        }
        if (bestId) setActiveSectionId(bestId);
      },
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );

    const timer = setTimeout(() => {
      for (const s of sections) {
        const el = document.getElementById(`section-${s.id}`);
        if (el) observerRef.current?.observe(el);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
    };
  }, [sections]);

  useEffect(() => {
    fetch(`/api/proposals/${id}`, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load proposal: ${res.status}`);
        return res.json();
      })
      .then(json => {
        const data = json?.proposal?.data as ProposalInputs | undefined;
        if (!data) {
          router.replace(`/p/${id}`);
          return;
        }
        setProposalData(data);
        setSections(buildDefaultSections(data));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, router]);

  const handleAddSection = useCallback((templateId: string) => {
    const template = SECTION_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    setSections(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: template.name,
        darkTheme: template.darkTheme,
        elements: template.buildElements(),
      },
    ]);
  }, []);

  const handleRemoveSection = useCallback((sectionId: string) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
  }, []);

  const handleToggleDarkTheme = useCallback((sectionId: string) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, darkTheme: !s.darkTheme } : s
    ));
  }, []);

  const handleUpdateElementData = useCallback((sectionId: string, elementId: string, data: Record<string, unknown>) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId
        ? { ...s, elements: s.elements.map(el => el.id === elementId ? { ...el, data } : el) }
        : s
    ));
  }, []);

  const handleAddElement = useCallback((sectionId: string, elementType: ProposalElementType, colSpan: number, groupId: string) => {
    const newEl: ExportElement = {
      id: crypto.randomUUID(),
      elementType,
      colSpan,
      groupId,
      data: getDefaultElementData(elementType),
    };
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      const elements = [...s.elements];
      // Insert after the last element in this group
      let insertIdx = -1;
      for (let i = elements.length - 1; i >= 0; i--) {
        if (elements[i].groupId === groupId) { insertIdx = i; break; }
      }
      elements.splice(insertIdx + 1, 0, newEl);
      return { ...s, elements };
    }));
  }, []);

  const handleRemoveElement = useCallback((sectionId: string, elementId: string) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId
        ? { ...s, elements: s.elements.filter(e => e.id !== elementId) }
        : s
    ));
  }, []);

  const handleDropElement = useCallback((
    elementId: string,
    fromSectionId: string,
    toSectionId: string,
    toGroupId: string,
    toColSpan: number,
    insertBeforeId: string | null,
  ) => {
    setSections(prev => {
      // Find and extract the element from its source
      const fromSection = prev.find(s => s.id === fromSectionId);
      if (!fromSection) return prev;
      const element = fromSection.elements.find(e => e.id === elementId);
      if (!element) return prev;

      const movedElement: ExportElement = { ...element, groupId: toGroupId, colSpan: toColSpan };

      return prev.map(s => {
        if (s.id === fromSectionId && s.id === toSectionId) {
          // Same section: remove then insert
          const elements = s.elements.filter(e => e.id !== elementId);
          if (insertBeforeId) {
            const idx = elements.findIndex(e => e.id === insertBeforeId);
            if (idx >= 0) {
              elements.splice(idx, 0, movedElement);
            } else {
              // insertBeforeId not found — append after last in group
              let lastIdx = -1;
              for (let i = elements.length - 1; i >= 0; i--) {
                if (elements[i].groupId === toGroupId) { lastIdx = i; break; }
              }
              elements.splice(lastIdx + 1, 0, movedElement);
            }
          } else {
            // Append after last element in target group
            let lastIdx = -1;
            for (let i = elements.length - 1; i >= 0; i--) {
              if (elements[i].groupId === toGroupId) { lastIdx = i; break; }
            }
            elements.splice(lastIdx + 1, 0, movedElement);
          }
          return { ...s, elements };
        }
        if (s.id === fromSectionId) {
          return { ...s, elements: s.elements.filter(e => e.id !== elementId) };
        }
        if (s.id === toSectionId) {
          const elements = [...s.elements];
          if (insertBeforeId) {
            const idx = elements.findIndex(e => e.id === insertBeforeId);
            if (idx >= 0) {
              elements.splice(idx, 0, movedElement);
            } else {
              let lastIdx = -1;
              for (let i = elements.length - 1; i >= 0; i--) {
                if (elements[i].groupId === toGroupId) { lastIdx = i; break; }
              }
              elements.splice(lastIdx + 1, 0, movedElement);
            }
          } else {
            let lastIdx = -1;
            for (let i = elements.length - 1; i >= 0; i--) {
              if (elements[i].groupId === toGroupId) { lastIdx = i; break; }
            }
            elements.splice(lastIdx + 1, 0, movedElement);
          }
          return { ...s, elements };
        }
        return s;
      });
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-300 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#03143B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-300 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.push(`/p/${id}`)}
            className="px-4 py-2 bg-[#03143B] text-white rounded-lg hover:bg-[#03143B]/90"
          >
            Back to Editor
          </button>
        </div>
      </div>
    );
  }

  if (!proposalData) return null;

  return (
    <LayoutModeContext.Provider value={{ layoutMode, setLayoutMode }}>
      <ExportToolbar
        proposalId={id}
        inputs={proposalData}
        onClose={() => router.push(`/p/${id}`)}
      />

      <div className="export-document" style={getThemeVars(proposalData.colorPalette)}>
        {sections.length === 0 && !layoutMode && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-sm font-medium">No sections yet</p>
              <p className="text-xs mt-1">Toggle layout mode (bottom-right) to start building</p>
            </div>
          </div>
        )}

        {sections.map((section) => (
          <SectionPage
            key={section.id}
            section={section}
            layoutMode={layoutMode}
            dragData={dragData}
            dropTarget={dropTarget}
            onRemoveSection={() => handleRemoveSection(section.id)}
            onToggleDarkTheme={() => handleToggleDarkTheme(section.id)}
            onUpdateElementData={(elId, data) => handleUpdateElementData(section.id, elId, data)}
            onAddElement={(colSpan, groupId) => setShowElementPicker({ sectionId: section.id, colSpan, groupId })}
            onRemoveElement={(elId) => handleRemoveElement(section.id, elId)}
            onSetDragData={setDragData}
            onClearDrag={() => { setDragData(null); setDropTarget(null); }}
            onSetDropTarget={setDropTarget}
            onDrop={(toSectionId, toGroupId, toColSpan, insertBeforeId) => {
              if (dragData) {
                handleDropElement(dragData.elementId, dragData.fromSectionId, toSectionId, toGroupId, toColSpan, insertBeforeId);
                setDragData(null);
                setDropTarget(null);
              }
            }}
          />
        ))}

        {layoutMode && (
          <section className="export-page">
            <div
              onClick={() => setShowTemplateChooser(true)}
              className="flex items-center justify-center h-full min-h-[9in] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors text-gray-400 hover:text-gray-500"
            >
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <p className="text-sm font-medium">Add {sections.length === 0 ? 'a' : 'another'} section</p>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Side navigation */}
      {sections.length > 1 && (
        <nav className="section-nav print-hidden">
          {sections.map((s) => {
            const isActive = s.id === activeSectionId;
            return (
              <button
                key={s.id}
                onClick={() => {
                  document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`section-nav-dot ${isActive ? 'active' : ''}`}
                title={s.name}
              >
                <span className="section-nav-label">{s.name}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Add Section button — layout mode only */}
      {layoutMode && (
        <button
          onClick={() => setShowTemplateChooser(true)}
          className="fixed bottom-6 right-20 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#03143B] text-white rounded-full shadow-lg hover:bg-[#03143B]/90 transition-all duration-200 print:hidden"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium">Add Section</span>
        </button>
      )}

      {/* Template Chooser Modal */}
      {showTemplateChooser && (
        <TemplateChooser
          onSelect={(templateId) => {
            handleAddSection(templateId);
            setShowTemplateChooser(false);
          }}
          onCancel={() => setShowTemplateChooser(false)}
        />
      )}

      {/* Element Picker Modal */}
      {showElementPicker && (
        <ElementPicker
          onSelect={(elementType) => {
            handleAddElement(showElementPicker.sectionId, elementType, showElementPicker.colSpan, showElementPicker.groupId);
            setShowElementPicker(null);
          }}
          onClose={() => setShowElementPicker(null)}
        />
      )}

      {/* Layout Mode Toggle */}
      <button
        onClick={() => setLayoutMode(!layoutMode)}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 print:hidden ${
          layoutMode
            ? 'bg-blue-500 text-white hover:bg-blue-600 ring-4 ring-blue-200'
            : 'bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200'
        }`}
        title={layoutMode ? 'Exit layout mode' : 'Enter layout mode'}
      >
        {layoutMode ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
        )}
      </button>

      <style jsx global>{`
        @media screen {
          body {
            background-color: #d1d5db;
            margin: 0;
          }

          .export-document {
            max-width: 8.5in;
            margin: 0 auto;
            padding: 2rem 0;
          }

          .export-page {
            width: 8.5in;
            min-height: 11in;
            background: white;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
            margin-bottom: 2rem;
            padding: 0.5in;
            box-sizing: border-box;
            position: relative;
          }

          .export-page.dark-theme {
            background: var(--theme-primary);
            color: white;
          }

          .export-page:last-child {
            margin-bottom: 0;
          }

          /* ── Layout Mode: Tier 1 — Page content area boundary ── */
          .layout-content-area {
            border: 1px dashed rgba(59, 130, 246, 0.30);
            border-radius: 4px;
            padding: 6px;
            position: relative;
            min-height: 80px;
          }
          .layout-content-area.layout-dark {
            border-color: rgba(96, 165, 250, 0.30);
          }

          /* ── Layout Mode: Tier 2 — Column containers ── */
          .layout-column {
            border: 1px dashed rgba(34, 197, 94, 0.25);
            border-radius: 3px;
            padding: 4px;
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .layout-column.layout-dark {
            border-color: rgba(74, 222, 128, 0.25);
          }

          /* ── Layout Mode: Tier 3 — Widget outlines ── */
          .layout-widget {
            border: 1px dashed rgba(168, 85, 247, 0.25);
            border-radius: 3px;
            padding: 4px;
            position: relative;
            flex: 1;
          }
          .layout-widget.layout-dark {
            border-color: rgba(192, 132, 252, 0.30);
          }

          /* ── Layout Mode: Tier labels ── */
          .layout-tier-label {
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            line-height: 1;
          }

          .layout-tier1-label {
            position: absolute;
            top: -7px;
            left: 8px;
            background: white;
            padding: 0 4px;
            color: rgba(59, 130, 246, 0.5);
            z-index: 1;
          }
          .layout-tier1-label.layout-dark {
            background: var(--theme-primary);
            color: rgba(96, 165, 250, 0.5);
          }

          .layout-tier2-label {
            position: absolute;
            top: -6px;
            left: 6px;
            background: white;
            padding: 0 3px;
            color: rgba(34, 197, 94, 0.5);
            z-index: 1;
          }
          .layout-tier2-label.layout-dark {
            background: var(--theme-primary);
            color: rgba(74, 222, 128, 0.5);
          }

          .layout-tier3-label {
            color: rgba(168, 85, 247, 0.5);
            margin-bottom: 2px;
          }
          .layout-tier3-label.layout-dark {
            color: rgba(192, 132, 252, 0.5);
          }

          /* ── Layout Mode: Widget header & toolbar ── */
          .layout-widget-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 6px;
          }

          .layout-widget-toolbar {
            display: flex;
            align-items: center;
            gap: 2px;
          }

          .layout-toolbar-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 4px;
            border: none;
            background: transparent;
            color: rgba(107, 114, 128, 0.6);
            cursor: pointer;
            transition: all 0.15s;
          }
          .layout-toolbar-btn:hover {
            background: rgba(0, 0, 0, 0.06);
            color: rgba(107, 114, 128, 1);
          }
          .layout-toolbar-btn.layout-dark {
            color: rgba(209, 213, 219, 0.5);
          }
          .layout-toolbar-btn.layout-dark:hover {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(209, 213, 219, 1);
          }

          .layout-toolbar-btn-danger:hover {
            background: rgba(239, 68, 68, 0.1);
            color: rgba(239, 68, 68, 0.8);
          }
          .layout-toolbar-btn-danger.layout-dark:hover {
            background: rgba(239, 68, 68, 0.15);
            color: rgba(252, 165, 165, 0.9);
          }

          /* ── Layout Mode: Add Widget button ── */
          .layout-add-widget {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            width: 100%;
            margin-top: 6px;
            padding: 8px;
            border: 2px dashed rgba(168, 85, 247, 0.25);
            border-radius: 6px;
            background: transparent;
            color: rgba(168, 85, 247, 0.5);
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
          }
          .layout-add-widget:hover {
            border-color: rgba(168, 85, 247, 0.45);
            color: rgba(168, 85, 247, 0.8);
            background: rgba(168, 85, 247, 0.03);
          }
          .layout-add-widget.layout-dark {
            border-color: rgba(192, 132, 252, 0.25);
            color: rgba(192, 132, 252, 0.5);
          }
          .layout-add-widget.layout-dark:hover {
            border-color: rgba(192, 132, 252, 0.45);
            color: rgba(192, 132, 252, 0.8);
            background: rgba(192, 132, 252, 0.05);
          }

          /* ── Layout Mode: Add circle button (bottom of content area) ── */
          .layout-add-circle {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 1.5px dashed rgba(168, 85, 247, 0.35);
            background: transparent;
            color: rgba(168, 85, 247, 0.4);
            cursor: pointer;
            transition: all 0.15s;
          }
          .layout-add-circle:hover {
            border-color: rgba(168, 85, 247, 0.7);
            color: rgba(168, 85, 247, 0.8);
            background: rgba(168, 85, 247, 0.06);
          }
          .layout-add-circle.layout-dark {
            border-color: rgba(192, 132, 252, 0.35);
            color: rgba(192, 132, 252, 0.4);
          }
          .layout-add-circle.layout-dark:hover {
            border-color: rgba(192, 132, 252, 0.7);
            color: rgba(192, 132, 252, 0.8);
            background: rgba(192, 132, 252, 0.08);
          }

          /* ── Layout Mode: Drag-and-drop states ── */
          .layout-widget[draggable="true"] {
            cursor: grab;
          }
          .layout-widget[draggable="true"]:active {
            cursor: grabbing;
          }
          .layout-widget-dragging {
            opacity: 0.35;
          }
          .layout-column-drag-over {
            background: rgba(168, 85, 247, 0.04);
            border-color: rgba(168, 85, 247, 0.35) !important;
          }
          .layout-column-drag-over.layout-dark {
            background: rgba(192, 132, 252, 0.06);
            border-color: rgba(192, 132, 252, 0.4) !important;
          }
          .drop-indicator {
            height: 2px;
            background: rgba(168, 85, 247, 0.6);
            border-radius: 1px;
            flex-shrink: 0;
          }
          .layout-column-drop-zone {
            border-radius: 6px;
            background: rgba(168, 85, 247, 0.04);
          }

          /* ── Layout Mode: Footer zone (yellow) ── */
          .layout-footer-zone {
            border: 1px dashed rgba(234, 179, 8, 0.35);
            border-radius: 4px;
            padding: 6px;
            position: relative;
            margin-top: 12px;
          }
          .layout-footer-zone.layout-dark {
            border-color: rgba(250, 204, 21, 0.30);
          }

          .layout-footer-label {
            position: absolute;
            top: -7px;
            left: 8px;
            background: white;
            padding: 0 4px;
            color: rgba(234, 179, 8, 0.6);
            z-index: 1;
          }
          .layout-footer-label.layout-dark {
            background: var(--theme-primary);
            color: rgba(250, 204, 21, 0.6);
          }

          /* ── Side Navigation ── */
          .section-nav {
            position: fixed;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 40;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
          }
          .section-nav-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.15);
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
            padding: 0;
          }
          .section-nav-dot:hover {
            background: rgba(0, 0, 0, 0.35);
            transform: scale(1.4);
          }
          .section-nav-dot.active {
            background: #03143B;
            transform: scale(1.5);
          }
          .section-nav-label {
            position: absolute;
            left: 18px;
            top: 50%;
            transform: translateY(-50%);
            white-space: nowrap;
            font-size: 11px;
            font-weight: 500;
            color: #374151;
            background: white;
            padding: 3px 8px;
            border-radius: 4px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.12);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.15s;
          }
          .section-nav-dot:hover .section-nav-label {
            opacity: 1;
          }
        }

        @media print {
          @page {
            size: letter;
            margin: 0;
          }

          body {
            background: white;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-hidden {
            display: none !important;
          }

          .export-document {
            padding: 0;
          }

          .export-page {
            width: 100%;
            min-height: 100vh;
            box-shadow: none;
            margin-bottom: 0;
            page-break-after: always;
            padding: 0.5in;
            box-sizing: border-box;
          }

          .export-page.dark-theme {
            background: var(--theme-primary) !important;
            color: white !important;
          }

          .export-page:last-child {
            page-break-after: auto;
          }

          /* Hide layout mode visuals in print */
          .layout-content-area,
          .layout-column,
          .layout-widget,
          .layout-footer-zone {
            border: none !important;
            padding: 0 !important;
            background: none !important;
          }
          .layout-tier-label,
          .layout-footer-label,
          .layout-widget-toolbar,
          .layout-add-widget,
          .layout-add-circle,
          .drop-indicator {
            display: none !important;
          }
          .layout-widget[draggable] {
            cursor: default !important;
          }
        }
      `}</style>
    </LayoutModeContext.Provider>
  );
}

// ---------- Layout Helpers ----------

function getElementDisplayName(elementType: ProposalElementType): string {
  const meta = ELEMENT_CATALOG.find(m => m.type === elementType);
  return meta?.name ?? elementType;
}

interface ColumnGroup {
  groupId: string;
  colSpan: number;
  elements: ExportElement[];
}

/** Group elements by groupId into column groups, preserving first-seen order */
function computeColumns(elements: ExportElement[]): ColumnGroup[] {
  const groupMap = new Map<string, ColumnGroup>();
  const order: string[] = [];
  for (const el of elements) {
    if (!groupMap.has(el.groupId)) {
      groupMap.set(el.groupId, { groupId: el.groupId, colSpan: el.colSpan, elements: [] });
      order.push(el.groupId);
    }
    groupMap.get(el.groupId)!.elements.push(el);
  }
  return order.map(id => groupMap.get(id)!);
}

// ---------- Section Page ----------

function SectionPage({
  section,
  layoutMode,
  dragData,
  dropTarget,
  onRemoveSection,
  onUpdateElementData,
  onAddElement,
  onRemoveElement,
  onSetDragData,
  onClearDrag,
  onSetDropTarget,
  onDrop,
  onToggleDarkTheme,
}: {
  section: ExportSection;
  layoutMode: boolean;
  dragData: { elementId: string; fromSectionId: string; fromGroupId: string } | null;
  dropTarget: { sectionId: string; groupId: string; insertBeforeId: string | null } | null;
  onRemoveSection: () => void;
  onUpdateElementData: (elementId: string, data: Record<string, unknown>) => void;
  onAddElement: (colSpan: number, groupId: string) => void;
  onRemoveElement: (elementId: string) => void;
  onSetDragData: (data: { elementId: string; fromSectionId: string; fromGroupId: string }) => void;
  onClearDrag: () => void;
  onSetDropTarget: (target: { sectionId: string; groupId: string; insertBeforeId: string | null } | null) => void;
  onDrop: (toSectionId: string, toGroupId: string, toColSpan: number, insertBeforeId: string | null) => void;
  onToggleDarkTheme: () => void;
}) {
  const dark = section.darkTheme;

  // Split elements into body (non-footer) and footer
  const bodyElements = section.elements.filter(e => e.elementType !== 'page-footer');
  const footerElements = section.elements.filter(e => e.elementType === 'page-footer');

  const handleColumnDragOver = (e: React.DragEvent, groupId: string) => {
    if (!dragData) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Default: drop at end of column
    onSetDropTarget({ sectionId: section.id, groupId, insertBeforeId: null });
  };

  const handleColumnDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the column entirely (not entering a child)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dropTarget?.sectionId === section.id) {
      onSetDropTarget(null);
    }
  };

  const handleColumnDrop = (e: React.DragEvent, groupId: string, colSpan: number) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/export-widget');
    if (!raw) return;
    // Use current dropTarget for precise insertion, or fall back to end of column
    const insertBeforeId = (dropTarget?.sectionId === section.id && dropTarget?.groupId === groupId)
      ? dropTarget.insertBeforeId
      : null;
    onDrop(section.id, groupId, colSpan, insertBeforeId);
  };

  const handleElementDragOver = (e: React.DragEvent, groupId: string, elementId: string) => {
    if (!dragData) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    // Determine if cursor is in top or bottom half of the element
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      // Insert before this element
      onSetDropTarget({ sectionId: section.id, groupId, insertBeforeId: elementId });
    } else {
      // Insert after — find the next element in this group, or null for end
      const columns = computeColumns(section.elements);
      const col = columns.find(c => c.groupId === groupId);
      if (col) {
        const idx = col.elements.findIndex(el => el.id === elementId);
        const nextEl = col.elements[idx + 1];
        onSetDropTarget({ sectionId: section.id, groupId, insertBeforeId: nextEl?.id ?? null });
      }
    }
  };

  const handleElementDrop = (e: React.DragEvent, groupId: string, colSpan: number) => {
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer.getData('application/export-widget');
    if (!raw) return;
    const insertBeforeId = (dropTarget?.sectionId === section.id && dropTarget?.groupId === groupId)
      ? dropTarget.insertBeforeId
      : null;
    onDrop(section.id, groupId, colSpan, insertBeforeId);
  };

  /** Render a grid of columns (used for both body and footer) */
  const renderColumnsLayout = (elements: ExportElement[]) => (
    <div className="grid grid-cols-12 gap-x-6 gap-y-3">
      {computeColumns(elements).map(col => {
        const isColumnDropTarget = dropTarget?.sectionId === section.id && dropTarget?.groupId === col.groupId;
        return (
          <div
            key={col.groupId}
            className={`layout-column ${dark ? 'layout-dark' : ''} ${isColumnDropTarget && dragData ? 'layout-column-drag-over' : ''}`}
            style={{ gridColumn: `span ${col.colSpan}` }}
            onDragOver={(e) => handleColumnDragOver(e, col.groupId)}
            onDragLeave={handleColumnDragLeave}
            onDrop={(e) => handleColumnDrop(e, col.groupId, col.colSpan)}
          >
            <div className={`layout-tier-label layout-tier2-label ${dark ? 'layout-dark' : ''}`}>
              {col.colSpan} col
            </div>
            {col.elements.map((element) => {
              const isBeingDragged = dragData?.elementId === element.id;
              const showDropBefore = isColumnDropTarget && dropTarget?.insertBeforeId === element.id;
              return (
                <ExportElementBlock
                  key={element.id}
                  element={element}
                  sectionId={section.id}
                  darkTheme={dark}
                  layoutMode
                  isDragging={isBeingDragged}
                  isDropBefore={showDropBefore}
                  onUpdateData={(data) => onUpdateElementData(element.id, data)}
                  onRemove={() => onRemoveElement(element.id)}
                  onDragStart={() => onSetDragData({ elementId: element.id, fromSectionId: section.id, fromGroupId: element.groupId })}
                  onDragEnd={onClearDrag}
                  onDragOverElement={(e) => handleElementDragOver(e, col.groupId, element.id)}
                  onDropOnElement={(e) => handleElementDrop(e, col.groupId, col.colSpan)}
                />
              );
            })}
            {/* Drop indicator at end of column */}
            {isColumnDropTarget && dropTarget?.insertBeforeId === null && dragData && (
              <div className="drop-indicator" />
            )}
            {/* Purple (+) circle at the bottom of this green column */}
            <div className="flex justify-center mt-2">
              <button
                onClick={() => onAddElement(col.colSpan, col.groupId)}
                className={`layout-add-circle ${dark ? 'layout-dark' : ''}`}
                title="Add widget"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <section id={`section-${section.id}`} className={`export-page ${dark ? 'dark-theme' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Section controls — layout mode only */}
      {layoutMode && (
        <div className={`flex items-center justify-between mb-4 pb-2 border-b print-hidden ${dark ? 'border-white/20' : 'border-gray-200'}`}>
          <span className={`text-sm font-semibold ${dark ? 'text-white/70' : 'text-gray-500'}`}>
            {section.name}
          </span>
          <div className="flex items-center gap-1">
            {/* Dark mode toggle */}
            <button
              onClick={onToggleDarkTheme}
              className={`p-1.5 rounded transition-colors ${dark ? 'text-amber-300 hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {dark ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            {/* Remove section */}
            <button
              onClick={onRemoveSection}
              className={`p-1.5 rounded text-red-400 hover:text-red-600 transition-colors ${dark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              title="Remove section"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Body content area — flex-1 so footer sticks to bottom */}
      <div style={{ flex: 1 }}>
        {layoutMode ? (
          <div className={`layout-content-area ${dark ? 'layout-dark' : ''}`}>
            <div className={`layout-tier-label layout-tier1-label ${dark ? 'layout-dark' : ''}`}>Content Area</div>

            {bodyElements.length === 0 ? (
              /* Empty section — show a full-width add prompt OR drop zone */
              <div
                onDragOver={dragData ? (e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  onSetDropTarget({ sectionId: section.id, groupId: '__new__', insertBeforeId: null });
                } : undefined}
                onDragLeave={() => onSetDropTarget(null)}
                onDrop={dragData ? (e) => {
                  e.preventDefault();
                  const raw = e.dataTransfer.getData('application/export-widget');
                  if (!raw) return;
                  const newGroupId = crypto.randomUUID();
                  onDrop(section.id, newGroupId, 12, null);
                } : undefined}
                className={dragData && dropTarget?.sectionId === section.id ? 'layout-column-drop-zone' : ''}
              >
                <button
                  onClick={() => onAddElement(12, crypto.randomUUID())}
                  className={`layout-add-widget ${dark ? 'layout-dark' : ''}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{dragData ? 'Drop here' : 'Add First Widget'}</span>
                </button>
              </div>
            ) : (
              renderColumnsLayout(bodyElements)
            )}
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-x-6 gap-y-4">
            {computeColumns(bodyElements).map(col => (
              <div key={col.groupId} style={{ gridColumn: `span ${col.colSpan}` }} className="flex flex-col gap-y-4">
                {col.elements.map((element) => (
                  <ExportElementBlock
                    key={element.id}
                    element={element}
                    darkTheme={dark}
                    onUpdateData={(data) => onUpdateElementData(element.id, data)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer zone — pinned to bottom */}
      {footerElements.length > 0 && (
        layoutMode ? (
          <div className={`layout-footer-zone ${dark ? 'layout-dark' : ''}`}>
            <div className={`layout-tier-label layout-footer-label ${dark ? 'layout-dark' : ''}`}>Footer</div>
            {renderColumnsLayout(footerElements)}
          </div>
        ) : (
          <div className="mt-auto pt-4">
            <div className="grid grid-cols-12 gap-x-6 gap-y-4">
              {computeColumns(footerElements).map(col => (
                <div key={col.groupId} style={{ gridColumn: `span ${col.colSpan}` }} className="flex flex-col gap-y-4">
                  {col.elements.map((element) => (
                    <ExportElementBlock
                      key={element.id}
                      element={element}
                      darkTheme={dark}
                      onUpdateData={(data) => onUpdateElementData(element.id, data)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </section>
  );
}

// ---------- Element Block ----------

function ExportElementBlock({
  element,
  sectionId,
  darkTheme,
  layoutMode,
  isDragging,
  isDropBefore,
  onUpdateData,
  onRemove,
  onDragStart,
  onDragEnd,
  onDragOverElement,
  onDropOnElement,
}: {
  element: ExportElement;
  sectionId?: string;
  darkTheme: boolean;
  layoutMode?: boolean;
  isDragging?: boolean;
  isDropBefore?: boolean;
  onUpdateData: (data: Record<string, unknown>) => void;
  onRemove?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOverElement?: (e: React.DragEvent) => void;
  onDropOnElement?: (e: React.DragEvent) => void;
}) {
  const Component = ELEMENT_REGISTRY[element.elementType];
  if (!Component) return null;

  const editableKey = getEditableDataKey(element.elementType);

  const props: Record<string, unknown> = {
    ...element.data,
    darkTheme,
  };

  if (editableKey === 'text') {
    props.onChange = (value: string) => {
      onUpdateData({ ...element.data, text: value });
    };
  } else if (editableKey === 'items') {
    props.onChange = (items: unknown[]) => {
      onUpdateData({ ...element.data, items });
    };
  }

  // Multi-field element wiring
  if (element.elementType === 'cover-title-block') {
    props.onTitleChange = (value: string) => {
      onUpdateData({ ...element.data, title: value });
    };
    props.onQuoteChange = (value: string) => {
      onUpdateData({ ...element.data, quote: value });
    };
  } else if (element.elementType === 'customer-quote') {
    props.onTextChange = (value: string) => {
      onUpdateData({ ...element.data, text: value });
    };
    props.onAttributionChange = (value: string) => {
      onUpdateData({ ...element.data, attribution: value });
    };
  } else if (element.elementType === 'contact-card') {
    props.onPromptChange = (value: string) => {
      onUpdateData({ ...element.data, prompt: value });
    };
    props.onNameChange = (value: string) => {
      onUpdateData({ ...element.data, name: value });
    };
    props.onEmailChange = (value: string) => {
      onUpdateData({ ...element.data, email: value });
    };
  } else if (element.elementType === 'faq-section') {
    props.onUpdate = (index: number, field: string, value: string) => {
      const faqs = [...((element.data.faqs as Array<Record<string, string>>) || [])];
      faqs[index] = { ...faqs[index], [field]: value };
      onUpdateData({ ...element.data, faqs });
    };
    props.onAdd = () => {
      const faqs = [...((element.data.faqs as Array<Record<string, string>>) || [])];
      faqs.push({ question: 'New question?', answer: 'Answer here...' });
      onUpdateData({ ...element.data, faqs });
    };
    props.onRemove = (index: number) => {
      const faqs = ((element.data.faqs as Array<Record<string, string>>) || []).filter((_, i) => i !== index);
      onUpdateData({ ...element.data, faqs });
    };
  } else if (element.elementType === 'spacer') {
    props.onHeightChange = (h: number) => {
      onUpdateData({ ...element.data, height: h });
    };
  }

  return (
    <div
      className={layoutMode ? `layout-widget ${darkTheme ? 'layout-dark' : ''} ${isDragging ? 'layout-widget-dragging' : ''}` : 'flex-1'}
      draggable={layoutMode}
      onDragStart={layoutMode ? (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/export-widget', JSON.stringify({
          elementId: element.id,
          sectionId,
          groupId: element.groupId,
        }));
        onDragStart?.();
      } : undefined}
      onDragEnd={layoutMode ? () => onDragEnd?.() : undefined}
      onDragOver={layoutMode ? (e) => onDragOverElement?.(e) : undefined}
      onDrop={layoutMode ? (e) => onDropOnElement?.(e) : undefined}
    >
      {isDropBefore && <div className="drop-indicator" />}
      {layoutMode && (
        <div className="layout-widget-header">
          <div className={`layout-tier-label layout-tier3-label ${darkTheme ? 'layout-dark' : ''}`}>
            {getElementDisplayName(element.elementType)}
          </div>
          <div className="layout-widget-toolbar">
            <button
              onClick={onRemove}
              className={`layout-toolbar-btn layout-toolbar-btn-danger ${darkTheme ? 'layout-dark' : ''}`}
              title="Remove widget"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <Component {...props} />
    </div>
  );
}

// ---------- Element Picker ----------

const ELEMENT_CATEGORIES = [
  { key: 'text', label: 'Text' },
  { key: 'data', label: 'Data' },
  { key: 'cards', label: 'Cards' },
  { key: 'lists', label: 'Lists' },
  { key: 'layout', label: 'Layout' },
];

/** Mini visual preview for each element type */
function ElementPreview({ type, dark }: { type: ProposalElementType; dark?: boolean }) {
  const bg = dark ? 'bg-white/30' : 'bg-current opacity-20';
  const bgStrong = dark ? 'bg-white/50' : 'bg-current opacity-35';
  const bgLight = dark ? 'bg-white/15' : 'bg-current opacity-10';

  switch (type) {
    case 'section-heading':
      return (
        <div className="flex flex-col gap-1 p-1.5 h-full justify-center">
          <div className={`${bgStrong} h-2 w-16 rounded-full`} />
          <div className={`${bg} h-0.5 w-full rounded-full`} />
        </div>
      );
    case 'sub-heading':
      return (
        <div className="flex flex-col gap-1 p-1.5 h-full justify-center">
          <div className={`${bg} h-0.5 w-full rounded-full`} />
          <div className={`${bgStrong} h-1.5 w-12 rounded-full`} />
        </div>
      );
    case 'body-text':
      return (
        <div className="flex flex-col gap-0.5 p-1.5 h-full justify-center">
          <div className={`${bg} h-1 w-full rounded-full`} />
          <div className={`${bg} h-1 w-full rounded-full`} />
          <div className={`${bg} h-1 w-3/4 rounded-full`} />
        </div>
      );
    case 'vision-callout':
      return (
        <div className="flex h-full items-center p-1.5">
          <div className={`${bgStrong} w-0.5 h-full rounded-full mr-1.5 flex-shrink-0`} />
          <div className="flex flex-col gap-0.5 flex-1">
            <div className={`${bg} h-1 w-full rounded-full`} />
            <div className={`${bg} h-1 w-4/5 rounded-full`} />
          </div>
        </div>
      );
    case 'eyebrow-label':
      return (
        <div className="flex flex-col p-1.5 h-full justify-center">
          <div className={`${bgStrong} h-1 w-10 rounded-full`} />
        </div>
      );
    case 'metric-table':
      return (
        <div className="flex flex-col gap-0.5 p-1.5 h-full justify-center">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between">
              <div className={`${bg} h-1 w-8 rounded-full`} />
              <div className={`${bgStrong} h-1 w-5 rounded-full`} />
            </div>
          ))}
        </div>
      );
    case 'kpi-tiles':
      return (
        <div className="flex gap-1 p-1.5 h-full items-center">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`flex-1 ${bgLight} rounded-sm p-1 flex flex-col items-center gap-0.5`}>
              <div className={`${bgStrong} h-1.5 w-3 rounded-full`} />
              <div className={`${bg} h-0.5 w-5 rounded-full`} />
            </div>
          ))}
        </div>
      );
    case 'stat-cards':
      return (
        <div className="flex gap-1 p-1.5 h-full items-center">
          {[1, 2, 3].map(i => (
            <div key={i} className={`flex-1 ${bgLight} rounded-sm p-1 flex flex-col items-center gap-0.5 border border-current/10`}>
              <div className={`${bgStrong} h-2 w-4 rounded-full`} />
              <div className={`${bg} h-0.5 w-5 rounded-full`} />
            </div>
          ))}
        </div>
      );
    case 'projection-panel':
      return (
        <div className="flex gap-1 p-1.5 h-full items-end">
          {[40, 60, 80].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className={`${bgLight} rounded-sm w-full`} style={{ height: `${h}%` }} />
              <div className={`${bg} h-0.5 w-4 rounded-full`} />
            </div>
          ))}
        </div>
      );
    case 'accent-card-grid':
      return (
        <div className="grid grid-cols-2 gap-1 p-1.5 h-full items-center">
          {[1, 2].map(i => (
            <div key={i} className={`${bgLight} rounded-sm p-1 h-full flex flex-col gap-0.5`}>
              <div className={`${bgStrong} w-0.5 h-2 rounded-full`} />
              <div className={`${bg} h-1 w-full rounded-full`} />
            </div>
          ))}
        </div>
      );
    case 'feature-card-grid':
      return (
        <div className="grid grid-cols-3 gap-0.5 p-1.5 h-full items-center">
          {[1, 2, 3].map(i => (
            <div key={i} className={`${bgLight} rounded-sm p-1 h-full flex flex-col gap-0.5`}>
              <div className={`${bgStrong} h-1 w-4 rounded-full`} />
              <div className={`${bg} h-0.5 w-full rounded-full`} />
            </div>
          ))}
        </div>
      );
    case 'timeline-card-grid':
      return (
        <div className="flex gap-0.5 p-1.5 h-full items-center">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className={`${bgStrong} h-0.5 w-full rounded-full`} />
              <div className={`${bgLight} rounded-sm w-full flex-1`} />
            </div>
          ))}
        </div>
      );
    case 'value-driver-cards':
      return (
        <div className="flex gap-0.5 p-1.5 h-full items-center">
          {[1, 2, 3].map(i => (
            <div key={i} className={`flex-1 ${bgLight} rounded-sm p-1 h-full flex flex-col gap-0.5`}>
              <div className={`${bgStrong} w-3 h-3 rounded-full flex items-center justify-center text-[5px] font-bold`}>{i}</div>
              <div className={`${bg} h-0.5 w-full rounded-full`} />
            </div>
          ))}
        </div>
      );
    case 'bullet-list':
      return (
        <div className="flex flex-col gap-1 p-1.5 h-full justify-center">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-1">
              <div className={`${bgStrong} w-1 h-1 rounded-full flex-shrink-0`} />
              <div className={`${bg} h-1 flex-1 rounded-full`} />
            </div>
          ))}
        </div>
      );
    case 'numbered-steps':
      return (
        <div className="flex flex-col gap-1 p-1.5 h-full justify-center">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-1">
              <div className={`${bgStrong} w-2.5 h-2.5 rounded-full flex items-center justify-center text-[5px] font-bold flex-shrink-0`}>{i}</div>
              <div className="flex flex-col gap-0.5 flex-1">
                <div className={`${bg} h-1 w-full rounded-full`} />
              </div>
            </div>
          ))}
        </div>
      );
    case 'customer-quote':
      return (
        <div className="flex h-full items-center p-1.5">
          <div className={`${bgStrong} w-0.5 h-3/4 rounded-full mr-1.5 flex-shrink-0`} />
          <div className="flex flex-col gap-0.5 flex-1">
            <div className={`${bg} h-1 w-full rounded-full italic`} />
            <div className={`${bg} h-1 w-3/4 rounded-full italic`} />
            <div className={`${bgLight} h-0.5 w-8 rounded-full mt-0.5`} />
          </div>
        </div>
      );
    case 'divider-line':
      return (
        <div className="flex h-full items-center p-1.5">
          <div className={`${bgStrong} h-0.5 w-8 rounded-full`} />
        </div>
      );
    case 'faq-section':
      return (
        <div className="flex flex-col gap-1 p-1.5 h-full justify-center">
          {[1, 2].map(i => (
            <div key={i} className={`${bgLight} rounded-sm p-1 flex flex-col gap-0.5`}>
              <div className={`${bgStrong} h-1 w-10 rounded-full`} />
              <div className={`${bg} h-0.5 w-full rounded-full`} />
            </div>
          ))}
        </div>
      );
    case 'contact-card':
      return (
        <div className={`${bgLight} rounded-sm p-1.5 m-1 h-[calc(100%-8px)] flex flex-col gap-0.5 justify-center`}>
          <div className={`${bg} h-0.5 w-10 rounded-full`} />
          <div className={`${bgStrong} h-1.5 w-14 rounded-full`} />
          <div className={`${bg} h-1 w-12 rounded-full`} />
        </div>
      );
    case 'cover-title-block':
      return (
        <div className="flex flex-col justify-end p-1.5 h-full bg-[#03143B]/10 rounded-sm">
          <div className="bg-current opacity-15 h-0.5 w-6 mb-0.5 rounded-full" />
          <div className="bg-current opacity-30 h-2 w-16 mb-0.5 rounded-full" />
          <div className="bg-current opacity-15 h-0.5 w-10 rounded-full" />
        </div>
      );
    case 'spacer':
      return (
        <div className="flex h-full items-center justify-center p-1.5">
          <div className="flex flex-col items-center gap-0.5">
            <div className={`${bg} h-0.5 w-6 rounded-full`} />
            <svg className="w-2 h-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 5v14m-4-3l4 3 4-3m-8-8l4-3 4 3" />
            </svg>
            <div className={`${bg} h-0.5 w-6 rounded-full`} />
          </div>
        </div>
      );
    case 'integration-pills':
      return (
        <div className="flex flex-wrap gap-0.5 p-1.5 h-full items-center content-center">
          {[8, 10, 7, 9, 6].map((w, i) => (
            <div key={i} className={`${bgLight} rounded-full h-2`} style={{ width: `${w * 3}px` }} />
          ))}
        </div>
      );
    case 'page-footer':
      return (
        <div className="flex items-center justify-between p-1.5 h-full">
          <div className={`${bgLight} w-4 h-4 rounded-sm`} />
          <div className={`${bg} h-0.5 w-10 rounded-full`} />
        </div>
      );
    default:
      return (
        <div className="flex h-full items-center justify-center p-1.5">
          <div className={`${bgLight} w-full h-full rounded-sm`} />
        </div>
      );
  }
}

function ElementPicker({
  onSelect,
  onClose,
}: {
  onSelect: (elementType: ProposalElementType) => void;
  onClose: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState('text');

  const filteredItems = ELEMENT_CATALOG.filter(e => e.category === activeCategory);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm print:hidden" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full mx-4 max-h-[75vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-sm font-bold text-gray-900">Add Widget</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 px-5 pb-3 overflow-x-auto">
          {ELEMENT_CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.key
                  ? 'bg-[#03143B] text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Elements grid */}
        <div className="px-5 pb-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-2">
            {filteredItems.map(item => (
              <button
                key={item.type}
                onClick={() => onSelect(item.type)}
                className="group text-left rounded-lg border border-gray-150 hover:border-[#03143B]/40 hover:shadow-sm transition-all"
              >
                <div className="h-12 w-full rounded-t-lg bg-gray-50 group-hover:bg-blue-50/50 text-[#03143B] transition-colors overflow-hidden">
                  <ElementPreview type={item.type} />
                </div>
                <div className="px-2.5 py-2">
                  <div className="font-medium text-[11px] text-gray-800 leading-tight">{item.name}</div>
                  <div className="text-[9px] text-gray-400 leading-tight mt-0.5">{item.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Template Chooser ----------

function TemplateChooser({
  onSelect,
  onCancel,
}: {
  onSelect: (templateId: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm print:hidden">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Add Section</h3>
          <button onClick={onCancel} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {SECTION_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              className="group text-left rounded-lg border-2 border-gray-200 hover:border-[#03143B] p-3 transition-all hover:shadow-md"
            >
              <div className="aspect-[8.5/11] w-full mb-2 rounded overflow-hidden border border-gray-100 text-[#03143B]">
                {template.preview}
              </div>
              <div className="font-semibold text-sm text-gray-900 group-hover:text-[#03143B]">
                {template.name}
              </div>
              <div className="text-[11px] text-gray-500 leading-tight mt-0.5">
                {template.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
