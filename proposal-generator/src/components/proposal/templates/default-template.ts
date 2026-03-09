import type { ProposalTemplate } from '@/types/proposal';

/**
 * Default proposal template.
 * Recreates the current proposal structure using the component-based builder system.
 * Each section maps to a page with a layout preset and a list of element placements.
 */
export const DEFAULT_TEMPLATE: ProposalTemplate = {
  name: 'default',
  sections: [
    // ==================== COVER PAGE ====================
    {
      sectionKey: 'cover',
      layoutPreset: 'single-column',
      className: 'cover-page min-h-screen flex flex-col justify-between p-12 border-l-8',
      elements: [
        {
          elementType: 'cover-title-block',
          blockId: 'coverTitle',
          label: 'Cover',
          defaultColSpan: 12,
        },
        {
          elementType: 'page-footer',
          blockId: 'coverFooter',
          label: 'Footer',
          defaultColSpan: 12,
        },
      ],
    },

    // ==================== EXECUTIVE SUMMARY ====================
    {
      sectionKey: 'executiveSummary',
      layoutPreset: 'content-sidebar',
      elements: [
        {
          elementType: 'section-heading',
          blockId: 'execHeading',
          label: 'Section Heading',
          defaultColSpan: 12,
          props: { text: 'Executive Summary' },
        },
        {
          elementType: 'body-text',
          blockId: 'execInsight',
          label: 'Executive Insight',
          defaultColSpan: 7,
        },
        {
          elementType: 'vision-callout',
          blockId: 'execVision',
          label: 'Vision Callout',
          defaultColSpan: 7,
        },
        {
          elementType: 'customer-quote',
          blockId: 'execQuote',
          label: 'Quote',
          defaultColSpan: 7,
          props: { quoteSection: 'executive-summary' },
        },
        {
          elementType: 'bullet-list',
          blockId: 'execBullets',
          label: 'Key Bullets',
          defaultColSpan: 7,
        },
        {
          elementType: 'metric-table',
          blockId: 'keyMetrics',
          label: 'Key Metrics',
          defaultColSpan: 5,
          props: { title: 'Key Metrics' },
        },
        {
          elementType: 'sub-heading',
          blockId: 'currentStateHeading',
          label: 'Sub-Heading',
          defaultColSpan: 12,
          props: { text: 'Current State Assessment' },
        },
        {
          elementType: 'accent-card-grid',
          blockId: 'painPoints',
          label: 'Pain Points',
          defaultColSpan: 12,
        },
        {
          elementType: 'customer-quote',
          blockId: 'currentStateQuote',
          label: 'Quote',
          defaultColSpan: 12,
          props: { quoteSection: 'current-state' },
        },
        {
          elementType: 'faq-section',
          blockId: 'execFaq',
          label: 'FAQ',
          defaultColSpan: 12,
          props: { faqPageId: 'executive-summary' },
        },
      ],
    },

    // ==================== THE SOLUTION: MEET HARPER ====================
    {
      sectionKey: 'meetHarper',
      layoutPreset: 'single-column',
      elements: [
        {
          elementType: 'section-heading',
          blockId: 'harperHeading',
          label: 'Section Heading',
          defaultColSpan: 12,
          props: { text: 'The Solution: Meet Harper', subtitle: 'Your AI HR Generalist' },
        },
        {
          elementType: 'body-text',
          blockId: 'harperIntro',
          label: 'Introduction',
          defaultColSpan: 12,
        },
        {
          elementType: 'stat-cards',
          blockId: 'harperStats',
          label: 'Harper Stats',
          defaultColSpan: 12,
        },
        {
          elementType: 'customer-quote',
          blockId: 'meetHarperQuote',
          label: 'Quote',
          defaultColSpan: 12,
          props: { quoteSection: 'meet-harper' },
        },
        {
          elementType: 'sub-heading',
          blockId: 'valueDriversHeading',
          label: 'Sub-Heading',
          defaultColSpan: 12,
          props: { text: 'Value Drivers', borderPosition: 'none' },
        },
        {
          elementType: 'value-driver-cards',
          blockId: 'valueDrivers',
          label: 'Value Drivers',
          defaultColSpan: 12,
        },
        {
          elementType: 'customer-quote',
          blockId: 'valueDriversQuote',
          label: 'Quote',
          defaultColSpan: 12,
          props: { quoteSection: 'value-drivers' },
        },
        {
          elementType: 'faq-section',
          blockId: 'valueDriversFaq',
          label: 'FAQ',
          defaultColSpan: 12,
          props: { faqPageId: 'value-drivers' },
        },
      ],
    },

    // ==================== INVESTMENT CASE ====================
    {
      sectionKey: 'investmentCase',
      layoutPreset: 'equal-split',
      darkTheme: true,
      elements: [
        {
          elementType: 'section-heading',
          blockId: 'investHeading',
          label: 'Section Heading',
          defaultColSpan: 12,
          props: { text: 'Investment Case' },
        },
        {
          elementType: 'metric-table',
          blockId: 'investmentBreakdown',
          label: 'Your Investment',
          defaultColSpan: 6,
        },
        {
          elementType: 'metric-table',
          blockId: 'returnBreakdown',
          label: 'Your Return',
          defaultColSpan: 6,
        },
        {
          elementType: 'kpi-tiles',
          blockId: 'kpiTiles',
          label: 'KPI Tiles',
          defaultColSpan: 12,
        },
        {
          elementType: 'customer-quote',
          blockId: 'investmentQuote',
          label: 'Quote',
          defaultColSpan: 12,
          props: { quoteSection: 'investment' },
        },
        {
          elementType: 'projection-panel',
          blockId: 'projectionPanel',
          label: '3-Year Projection',
          defaultColSpan: 12,
        },
        {
          elementType: 'faq-section',
          blockId: 'investmentFaq',
          label: 'FAQ',
          defaultColSpan: 12,
          props: { faqPageId: 'investment' },
        },
      ],
    },

    // ==================== SECURITY & INTEGRATION ====================
    {
      sectionKey: 'securityIntegration',
      layoutPreset: 'single-column',
      elements: [
        {
          elementType: 'section-heading',
          blockId: 'securityHeading',
          label: 'Section Heading',
          defaultColSpan: 12,
          props: { text: 'Security & Integration' },
        },
        {
          elementType: 'sub-heading',
          blockId: 'securityFeaturesHeading',
          label: 'Security Heading',
          defaultColSpan: 12,
          props: { text: 'Enterprise Security', borderPosition: 'none' },
        },
        {
          elementType: 'feature-card-grid',
          blockId: 'securityFeatures',
          label: 'Security Features',
          defaultColSpan: 12,
        },
        {
          elementType: 'integration-pills',
          blockId: 'integrationLandscape',
          label: 'Integrations',
          defaultColSpan: 12,
        },
        {
          elementType: 'customer-quote',
          blockId: 'securityQuote',
          label: 'Quote',
          defaultColSpan: 12,
          props: { quoteSection: 'security' },
        },
        {
          elementType: 'sub-heading',
          blockId: 'implementationTimelineHeading',
          label: 'Timeline Heading',
          defaultColSpan: 12,
          props: { text: 'Implementation Timeline (12 weeks)', borderPosition: 'none' },
        },
        {
          elementType: 'timeline-card-grid',
          blockId: 'implementationTimeline',
          label: 'Timeline',
          defaultColSpan: 12,
        },
        {
          elementType: 'faq-section',
          blockId: 'securityFaq',
          label: 'FAQ',
          defaultColSpan: 12,
          props: { faqPageId: 'security' },
        },
      ],
    },

    // ==================== WHY NOW ====================
    {
      sectionKey: 'whyNow',
      layoutPreset: 'single-column',
      elements: [
        {
          elementType: 'section-heading',
          blockId: 'whyNowHeading',
          label: 'Section Heading',
          defaultColSpan: 12,
          props: { text: 'Why Now?' },
        },
        {
          elementType: 'accent-card-grid',
          blockId: 'whyNowItems',
          label: 'Why Now Items',
          defaultColSpan: 12,
        },
        {
          elementType: 'customer-quote',
          blockId: 'whyNowQuote',
          label: 'Quote',
          defaultColSpan: 12,
          props: { quoteSection: 'why-now' },
        },
        {
          elementType: 'faq-section',
          blockId: 'whyNowFaq',
          label: 'FAQ',
          defaultColSpan: 12,
          props: { faqPageId: 'why-now' },
        },
      ],
    },

    // ==================== NEXT STEPS ====================
    {
      sectionKey: 'nextSteps',
      layoutPreset: 'single-column',
      elements: [
        {
          elementType: 'sub-heading',
          blockId: 'nextStepsHeading',
          label: 'Heading',
          defaultColSpan: 12,
          props: { text: 'Next Steps', borderPosition: 'top' },
        },
        {
          elementType: 'numbered-steps',
          blockId: 'nextStepsItems',
          label: 'Next Steps',
          defaultColSpan: 12,
        },
        {
          elementType: 'contact-card',
          blockId: 'contactCard',
          label: 'Contact',
          defaultColSpan: 12,
        },
        {
          elementType: 'page-footer',
          blockId: 'footer',
          label: 'Footer',
          defaultColSpan: 12,
        },
      ],
    },
  ],
};
