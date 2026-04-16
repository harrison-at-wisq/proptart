import React from 'react';
import type { BlockDef } from '@/components/ui/LayoutSection';
import type {
  ProposalInputs,
  ProposalDocumentContent,
  SectionTemplateConfig,
  QuoteSection,
} from '@/types/proposal';
import type { FAQSection as FAQSectionType } from '@/types/proposal';
import { formatCompactCurrency, formatCurrency } from '@/lib/pricing-calculator';
import { getSelectedQuoteForSection } from '@/lib/customer-quotes';

// Element components
import { SectionHeading } from './elements/SectionHeading';
import { SubHeading } from './elements/SubHeading';
import { BodyText } from './elements/BodyText';
import { VisionCallout } from './elements/VisionCallout';
import { MetricTable } from './elements/MetricTable';
import { KPITiles } from './elements/KPITiles';
import { StatCards } from './elements/StatCards';
import { ProjectionPanel } from './elements/ProjectionPanel';
import { AccentCardGrid } from './elements/AccentCardGrid';
import { FeatureCardGrid } from './elements/FeatureCardGrid';
import { TimelineCardGrid } from './elements/TimelineCardGrid';
import { ValueDriverCards } from './elements/ValueDriverCards';
import { BulletList } from './elements/BulletList';
import { NumberedSteps } from './elements/NumberedSteps';
import { CustomerQuote } from './elements/CustomerQuote';
import { FAQSection } from './elements/FAQSection';
import { IntegrationPills } from './elements/IntegrationPills';
import { ContactCard } from './elements/ContactCard';
import { PageFooter } from './elements/PageFooter';
import { CoverTitleBlock } from './elements/CoverTitleBlock';
import { CoverImage } from './elements/CoverImage';
import { TableOfContents } from './elements/TableOfContents';

/** All data sources needed to render proposal blocks */
export interface ProposalRenderContext {
  docContent: ProposalDocumentContent;
  updateContent: <K extends keyof ProposalDocumentContent>(key: K, value: ProposalDocumentContent[K]) => void;
  pricing: {
    annualRecurringRevenue: number;
    totalContractValue: number;
    implementationNetPrice: number;
    servicesNetPrice: number;
    integrationsNetPrice: number;
    yearlyBreakdown: { year: number; softwareNetPrice: number }[];
  };
  summary: {
    grossAnnualValue: number;
    totalROI: number;
    paybackPeriodMonths: number;
    netAnnualBenefit: number;
    hrOpsSavings: number;
    legalSavings: number;
    productivitySavings: number;
  };
  projection: {
    years: { year: number; value: number; net: number }[];
    total: number;
    netTotal: number;
  };
  contractYears: number;
  paybackMonths: number;
  inputs: ProposalInputs;
  customerIntegrations: { name: string; category: string }[];
  today: string;
  getFAQsForPage: (pageId: string) => FAQSectionType | undefined;
  updateFAQ: (pageId: string, faqIndex: number, field: 'question' | 'answer', value: string) => void;
}

// Helper: get quote for a section
function getQuote(ctx: ProposalRenderContext, section: QuoteSection) {
  if (!ctx.docContent.selectedQuotes || ctx.docContent.selectedQuotes.length === 0) return null;
  const quote = getSelectedQuoteForSection(ctx.docContent.selectedQuotes, section);
  if (!quote) return null;
  return { text: quote.text, attribution: quote.attribution };
}

// Helper: get FAQs for a page
function getFAQs(ctx: ProposalRenderContext, pageId: string) {
  const section = ctx.getFAQsForPage(pageId);
  if (!section || section.faqs.length === 0) return null;
  return section.faqs;
}

/**
 * Builds an array of BlockDef objects for a given section template,
 * binding each element placement to the appropriate component + data.
 */
export function buildBlockDefs(
  sectionConfig: SectionTemplateConfig,
  ctx: ProposalRenderContext
): BlockDef[] {
  const { docContent, updateContent, pricing, summary, projection, inputs, customerIntegrations, today } = ctx;
  const dark = sectionConfig.darkTheme ?? false;

  return sectionConfig.elements.map((el) => {
    const { blockId, label, defaultColSpan, props } = el;

    const render = (): React.ReactNode => {
      switch (blockId) {
        // ==================== COVER ====================
        case 'coverTitle':
          return (
            <CoverTitleBlock
              eyebrow={docContent.coverEyebrow}
              onEyebrowChange={(value) => updateContent('coverEyebrow', value)}
              title={docContent.coverTitle}
              onTitleChange={(value) => updateContent('coverTitle', value)}
              quote={docContent.coverQuote}
              onQuoteChange={(value) => updateContent('coverQuote', value)}
              contactName={docContent.coverContactName}
              onContactNameChange={(value) => updateContent('coverContactName', value)}
              contactTitle={docContent.coverContactTitle}
              onContactTitleChange={(value) => updateContent('coverContactTitle', value)}
            />
          );

        case 'coverImage':
          return <CoverImage />;

        case 'coverToc':
          return (
            <TableOfContents
              heading={docContent.tocHeading}
              onHeadingChange={(value) => updateContent('tocHeading', value)}
              items={docContent.tocItems}
              onChange={(items) => updateContent('tocItems', items)}
            />
          );

        case 'coverFooter':
          return (
            <PageFooter
              date={today}
              showConfidential={false}
              customerLogoSrc={inputs.company.customerLogoBase64}
            />
          );

        // ==================== EXECUTIVE SUMMARY ====================
        case 'execHeading':
          return <SectionHeading text={props?.text as string} darkTheme={dark} />;

        case 'execInsight':
          return (
            <BodyText
              text={docContent.execSummaryInsight}
              onChange={(value) => updateContent('execSummaryInsight', value)}
              darkTheme={dark}
            />
          );

        case 'execVision':
          return (
            <VisionCallout
              text={docContent.execSummaryVision}
              onChange={(value) => updateContent('execSummaryVision', value)}
              darkTheme={dark}
            />
          );

        case 'execQuote': {
          const q = getQuote(ctx, (props?.quoteSection as QuoteSection) || 'executive-summary');
          if (!q) return null;
          return <CustomerQuote text={q.text} attribution={q.attribution} darkTheme={dark} />;
        }

        case 'execBullets':
          return (
            <BulletList
              items={docContent.execSummaryBullets}
              onChange={(items) => updateContent('execSummaryBullets', items)}
              darkTheme={dark}
            />
          );

        case 'keyMetrics': {
          const avgInvestment = pricing.totalContractValue / (ctx.contractYears || 1);
          return (
            <MetricTable
              title={props?.title as string || 'Key Metrics'}
              rows={[
                { label: 'Avg. Annual Investment', value: formatCompactCurrency(avgInvestment) },
                { label: 'Projected Annual Value', value: formatCompactCurrency(summary.grossAnnualValue) },
                { label: 'Return on Investment', value: `${formatCompactCurrency(summary.netAnnualBenefit)}/yr` },
                { label: 'Payback Period', value: `${ctx.paybackMonths.toFixed(1)} mo` },
              ]}
              darkTheme={dark}
            />
          );
        }

        case 'currentStateHeading':
          return (
            <SubHeading
              text={props?.text as string || 'Current State Assessment'}
              borderPosition={props?.borderPosition as 'top' | 'none' || 'top'}
              darkTheme={dark}
            />
          );

        case 'painPoints':
          return (
            <AccentCardGrid
              items={docContent.painPoints}
              onChange={(items) => updateContent('painPoints', items)}
              darkTheme={dark}
            />
          );

        case 'currentStateQuote': {
          const q = getQuote(ctx, (props?.quoteSection as QuoteSection) || 'current-state');
          if (!q) return null;
          return <CustomerQuote text={q.text} attribution={q.attribution} darkTheme={dark} />;
        }

        case 'execFaq': {
          const faqs = getFAQs(ctx, (props?.faqPageId as string) || 'executive-summary');
          if (!faqs) return null;
          return (
            <FAQSection
              faqs={faqs}
              onUpdate={(i, field, value) => ctx.updateFAQ((props?.faqPageId as string) || 'executive-summary', i, field, value)}
              darkTheme={dark}
            />
          );
        }

        // ==================== MEET HARPER ====================
        case 'harperHeading':
          return (
            <SectionHeading
              text={props?.text as string}
              subtitle={props?.subtitle as string}
              darkTheme={dark}
            />
          );

        case 'harperIntro':
          return (
            <BodyText
              text={docContent.harperIntro}
              onChange={(value) => updateContent('harperIntro', value)}
              darkTheme={dark}
            />
          );

        case 'harperStats':
          return (
            <StatCards
              items={docContent.harperStats}
              onChange={(items) => updateContent('harperStats', items)}
              darkTheme={dark}
            />
          );

        case 'meetHarperQuote': {
          const q = getQuote(ctx, (props?.quoteSection as QuoteSection) || 'meet-harper');
          if (!q) return null;
          return <CustomerQuote text={q.text} attribution={q.attribution} darkTheme={dark} />;
        }

        case 'valueDriversHeading':
          return (
            <SubHeading
              text={props?.text as string || 'Value Drivers'}
              borderPosition={(props?.borderPosition as 'top' | 'none') || 'none'}
              darkTheme={dark}
            />
          );

        case 'valueDrivers':
          return (
            <ValueDriverCards
              items={docContent.valueDrivers}
              onChange={(items) => updateContent('valueDrivers', items)}
              darkTheme={dark}
            />
          );

        case 'valueDriversQuote': {
          const q = getQuote(ctx, (props?.quoteSection as QuoteSection) || 'value-drivers');
          if (!q) return null;
          return <CustomerQuote text={q.text} attribution={q.attribution} darkTheme={dark} />;
        }

        case 'valueDriversFaq': {
          const faqs = getFAQs(ctx, (props?.faqPageId as string) || 'value-drivers');
          if (!faqs) return null;
          return (
            <FAQSection
              faqs={faqs}
              onUpdate={(i, field, value) => ctx.updateFAQ((props?.faqPageId as string) || 'value-drivers', i, field, value)}
              darkTheme={dark}
            />
          );
        }

        // ==================== INVESTMENT CASE ====================
        case 'investHeading':
          return <SectionHeading text={props?.text as string} darkTheme={dark} />;

        case 'investmentBreakdown': {
          const rows: { label: string; value: string }[] = [];
          pricing.yearlyBreakdown.forEach((year, index) => {
            const yearConfig = inputs.pricing.yearlyConfig[index];
            const suffix = yearConfig?.workflows.included ? ' (Platform + Workflows)' : ' (Platform)';
            rows.push({
              label: `Year ${year.year} Software${suffix}`,
              value: formatCompactCurrency(year.softwareNetPrice),
            });
          });
          if (pricing.implementationNetPrice > 0) {
            rows.push({ label: 'One-Time Implementation', value: formatCompactCurrency(pricing.implementationNetPrice) });
          }
          if (pricing.servicesNetPrice > 0) {
            rows.push({ label: 'Professional Services', value: formatCompactCurrency(pricing.servicesNetPrice) });
          }
          if (pricing.integrationsNetPrice > 0) {
            rows.push({ label: 'Additional Integrations', value: formatCompactCurrency(pricing.integrationsNetPrice) });
          }
          rows.push({ label: 'Total Contract Value', value: formatCompactCurrency(pricing.totalContractValue) });
          return (
            <MetricTable
              title={`Your Investment (${inputs.pricing.contractTermYears}-Year Contract)`}
              rows={rows}
              darkTheme={dark}
            />
          );
        }

        case 'returnBreakdown':
          return (
            <MetricTable
              title="Your Return"
              rows={[
                { label: 'HR Operations Savings', value: formatCompactCurrency(summary.hrOpsSavings) },
                { label: 'Compliance Value', value: formatCompactCurrency(summary.legalSavings) },
                { label: 'Productivity Gains', value: formatCompactCurrency(summary.productivitySavings) },
                { label: 'Net Annual Value', value: formatCompactCurrency(summary.netAnnualBenefit) },
              ]}
              darkTheme={dark}
            />
          );

        case 'kpiTiles':
          return (
            <KPITiles
              tiles={[
                { value: `${formatCompactCurrency(summary.netAnnualBenefit)}/yr`, label: 'ROI' },
                { value: `${ctx.paybackMonths.toFixed(1)} mo`, label: 'Payback' },
                { value: formatCompactCurrency(projection.total), label: `${ctx.contractYears}-Year Value` },
                { value: formatCompactCurrency(projection.netTotal), label: `${ctx.contractYears}-Year Net` },
              ]}
              darkTheme={dark}
            />
          );

        case 'investmentQuote': {
          const q = getQuote(ctx, (props?.quoteSection as QuoteSection) || 'investment');
          if (!q) return null;
          return <CustomerQuote text={q.text} attribution={q.attribution} darkTheme={dark} />;
        }

        case 'projectionPanel':
          return (
            <ProjectionPanel
              title={`${ctx.contractYears}-Year Value Projection`}
              columns={projection.years.map(yr => ({
                label: `Year ${yr.year}`,
                value: formatCompactCurrency(yr.value),
              }))}
              darkTheme={dark}
            />
          );

        case 'investmentFaq': {
          const faqs = getFAQs(ctx, (props?.faqPageId as string) || 'investment');
          if (!faqs) return null;
          return (
            <FAQSection
              faqs={faqs}
              onUpdate={(i, field, value) => ctx.updateFAQ((props?.faqPageId as string) || 'investment', i, field, value)}
              darkTheme={dark}
            />
          );
        }

        // ==================== SECURITY & INTEGRATION ====================
        case 'securityHeading':
          return <SectionHeading text={props?.text as string} darkTheme={dark} />;

        case 'securityFeaturesHeading':
          return (
            <SubHeading
              text={props?.text as string || 'Enterprise Security'}
              borderPosition={(props?.borderPosition as 'top' | 'none') || 'none'}
              darkTheme={dark}
            />
          );

        case 'securityFeatures':
          return (
            <FeatureCardGrid
              items={docContent.securityFeatures}
              onChange={(items) => updateContent('securityFeatures', items)}
              darkTheme={dark}
            />
          );

        case 'integrationLandscape':
          return (
            <IntegrationPills
              integrations={customerIntegrations}
              darkTheme={dark}
            />
          );

        case 'securityQuote': {
          const q = getQuote(ctx, (props?.quoteSection as QuoteSection) || 'security');
          if (!q) return null;
          return <CustomerQuote text={q.text} attribution={q.attribution} darkTheme={dark} />;
        }

        case 'implementationTimelineHeading':
          return (
            <SubHeading
              text={props?.text as string || 'Implementation Timeline (12 weeks)'}
              borderPosition={(props?.borderPosition as 'top' | 'none') || 'none'}
              darkTheme={dark}
            />
          );

        case 'implementationTimeline':
          return (
            <TimelineCardGrid
              items={docContent.implementationTimeline}
              onChange={(items) => updateContent('implementationTimeline', items)}
              darkTheme={dark}
            />
          );

        case 'securityFaq': {
          const faqs = getFAQs(ctx, (props?.faqPageId as string) || 'security');
          if (!faqs) return null;
          return (
            <FAQSection
              faqs={faqs}
              onUpdate={(i, field, value) => ctx.updateFAQ((props?.faqPageId as string) || 'security', i, field, value)}
              darkTheme={dark}
            />
          );
        }

        // ==================== WHY NOW ====================
        case 'whyNowHeading':
          return <SectionHeading text={props?.text as string} darkTheme={dark} />;

        case 'whyNowItems':
          return (
            <AccentCardGrid
              items={docContent.whyNowItems}
              onChange={(items) => updateContent('whyNowItems', items)}
              darkTheme={dark}
            />
          );

        case 'whyNowQuote': {
          const q = getQuote(ctx, (props?.quoteSection as QuoteSection) || 'why-now');
          if (!q) return null;
          return <CustomerQuote text={q.text} attribution={q.attribution} darkTheme={dark} />;
        }

        case 'whyNowFaq': {
          const faqs = getFAQs(ctx, (props?.faqPageId as string) || 'why-now');
          if (!faqs) return null;
          return (
            <FAQSection
              faqs={faqs}
              onUpdate={(i, field, value) => ctx.updateFAQ((props?.faqPageId as string) || 'why-now', i, field, value)}
              darkTheme={dark}
            />
          );
        }

        // ==================== NEXT STEPS ====================
        case 'nextStepsHeading':
          return (
            <SubHeading
              text={props?.text as string || 'Next Steps'}
              borderPosition={(props?.borderPosition as 'top' | 'none') || 'top'}
              darkTheme={dark}
            />
          );

        case 'nextStepsItems':
          return (
            <NumberedSteps
              items={docContent.nextStepsItems}
              onChange={(items) => updateContent('nextStepsItems', items)}
              darkTheme={dark}
            />
          );

        case 'contactCard':
          return (
            <ContactCard
              email={inputs.company.contactEmail}
              darkTheme={dark}
            />
          );

        case 'footer':
          return (
            <PageFooter
              date={today}
              showConfidential={true}
              darkTheme={dark}
              customerLogoSrc={inputs.company.customerLogoBase64}
            />
          );

        // ==================== FALLBACK ====================
        default:
          return <div className="text-gray-400 text-sm italic">Unknown block: {blockId}</div>;
      }
    };

    return {
      blockId,
      label,
      defaultColSpan,
      render,
    };
  });
}
