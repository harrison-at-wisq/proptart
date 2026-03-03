import {
  ProposalInputs,
  ProposalDocumentContent,
  WidgetItem,
  SectionVisibility,
  FAQSection,
} from '@/types/proposal';
import {
  getOpportunityContent,
  getValueDriverContent,
  getPainPointContent,
  HARPER_STATS,
  SECURITY_FEATURES,
  IMPLEMENTATION_TIMELINE,
  WHY_NOW_CONTENT,
  NEXT_STEPS_OPTIONS,
} from '@/lib/content-templates';

function uuid(): string {
  return crypto.randomUUID();
}

/** Resolve content with priority: override > generated > template */
function resolve<T>(override: T | undefined, generated: T | undefined, template: T): T {
  if (override !== undefined && override !== '') return override;
  if (generated !== undefined && generated !== '') return generated;
  return template;
}

/**
 * Materializes all template + generated + override content into a single,
 * flat, directly-mutable ProposalDocumentContent structure.
 *
 * This is called once when an existing proposal is first opened in the
 * new editable document view. From that point on, all edits modify
 * documentContent directly.
 */
export function materializeDocumentContent(inputs: ProposalInputs): ProposalDocumentContent {
  const overrides = inputs.contentOverrides || {};
  const generated = inputs.generatedContent;
  const opportunityContent = getOpportunityContent(inputs.company.industry);

  // -- Cover Page --
  const coverTitle = resolve(
    overrides.coverTitle,
    undefined,
    `Transforming HR at ${inputs.company.companyName || 'Your Company'}`
  );
  const coverQuote = resolve(overrides.coverQuote, undefined, inputs.coverQuote || '');

  // -- Executive Summary --
  const execSummaryInsight = resolve(
    overrides.execSummaryInsight,
    generated?.execSummaryInsight,
    opportunityContent.insight
  );
  const execSummaryVision = resolve(
    overrides.execSummaryVision,
    generated?.execSummaryVision,
    opportunityContent.vision
  );

  const bulletSource = overrides.execSummaryBullets
    || generated?.execSummaryBullets
    || opportunityContent.bullets;
  const execSummaryBullets: WidgetItem[] = bulletSource.map((text) => ({
    id: uuid(),
    text,
  }));

  // -- Pain Points --
  const painPointOrder = inputs.painPointOrder?.length
    ? inputs.painPointOrder
    : (inputs.painPoints as string[]);
  const painPointContentMap = getPainPointContent(inputs.painPoints);

  const painPoints: WidgetItem[] = painPointOrder
    .map((ppId) => {
      const predefined = painPointContentMap.find((p) => p.key === ppId);
      if (predefined) {
        return {
          id: uuid(),
          headline: overrides.painPointHeadlines?.[predefined.key] || predefined.headline,
          impact: predefined.impact,
        };
      }
      const custom = inputs.customPainPoints?.find((cp) => cp.id === ppId);
      if (custom) {
        return {
          id: uuid(),
          headline: overrides.painPointHeadlines?.[custom.id] || custom.headline,
          impact: custom.impact,
        };
      }
      return null;
    })
    .filter(Boolean) as WidgetItem[];

  // -- Harper Stats --
  const harperStats: WidgetItem[] = [
    { id: uuid(), stat: HARPER_STATS.accuracy, context: HARPER_STATS.accuracyContext },
    { id: uuid(), stat: '<8s', context: HARPER_STATS.responseContext },
    { id: uuid(), stat: HARPER_STATS.deflection, context: HARPER_STATS.deflectionContext },
  ];

  // -- Harper Intro --
  const harperIntro = resolve(
    overrides.harperIntro,
    undefined,
    'Harper handles the routine so your team can focus on what matters. She provides instant, accurate responses to employee questions while maintaining complete audit trails for compliance.'
  );

  // -- Value Drivers --
  const templateDrivers = getValueDriverContent(inputs.primaryValueDriver);
  const genDrivers = generated?.valueDriverContent;
  const driverSource = genDrivers?.length ? genDrivers : templateDrivers;
  const valueDrivers: WidgetItem[] = driverSource.map((d) => ({
    id: uuid(),
    key: d.key,
    headline: overrides.valueDrivers?.[d.key]?.headline || d.headline,
    description: overrides.valueDrivers?.[d.key]?.description || d.description,
    proof: overrides.valueDrivers?.[d.key]?.proof || d.proof,
    isPrimary: d.key === inputs.primaryValueDriver,
  }));

  // -- Security Features --
  const securityFeatures: WidgetItem[] = SECURITY_FEATURES.map((f) => ({
    id: uuid(),
    title: f.title,
    description: f.description,
  }));

  // -- Implementation Timeline --
  const implementationTimeline: WidgetItem[] = IMPLEMENTATION_TIMELINE.map((p) => ({
    id: uuid(),
    week: p.week,
    title: p.title,
    description: p.description,
  }));

  // -- Why Now --
  const whyNowKeys = ['costOfDelay', 'aiMomentum', 'quickWins', 'competitivePressure'] as const;
  const genWhyNowMap: Record<string, { headline: string; description: string }> = {};
  if (generated?.whyNowContent) {
    for (const item of generated.whyNowContent) {
      genWhyNowMap[item.key] = item;
    }
  }
  const whyNowItems: WidgetItem[] = whyNowKeys.map((key) => ({
    id: uuid(),
    key,
    headline:
      overrides.whyNowItems?.[key]?.headline
      || genWhyNowMap[key]?.headline
      || WHY_NOW_CONTENT[key].headline,
    description:
      overrides.whyNowItems?.[key]?.description
      || genWhyNowMap[key]?.description
      || WHY_NOW_CONTENT[key].description,
  }));

  // -- Next Steps --
  const nextStepOrder = inputs.nextStepOrder?.length
    ? inputs.nextStepOrder
    : (inputs.nextSteps as string[]);
  const nextStepsItems: WidgetItem[] = nextStepOrder
    .map((nsId) => {
      const predefined = NEXT_STEPS_OPTIONS.find((s) => s.id === nsId);
      if (predefined) {
        return {
          id: uuid(),
          title: overrides.nextStepOverrides?.[predefined.id]?.title || predefined.title,
          description: overrides.nextStepOverrides?.[predefined.id]?.description || predefined.description,
        };
      }
      const custom = inputs.customNextSteps?.find((cs) => cs.id === nsId);
      if (custom) {
        return {
          id: uuid(),
          title: overrides.nextStepOverrides?.[custom.id]?.title || custom.title,
          description: overrides.nextStepOverrides?.[custom.id]?.description || custom.description,
        };
      }
      return null;
    })
    .filter(Boolean) as WidgetItem[];

  // -- FAQ Sections --
  const faqSections: FAQSection[] = inputs.faqSections || generated?.faqSections || [];

  // -- Selected Quotes --
  const selectedQuotes: string[] = inputs.selectedQuotes || [];

  // -- Section Visibility (all visible by default) --
  const sectionVisibility: SectionVisibility = {
    cover: true,
    executiveSummary: true,
    meetHarper: true,
    investmentCase: true,
    securityIntegration: true,
    whyNow: true,
    nextSteps: true,
  };

  return {
    coverTitle,
    coverQuote,
    execSummaryInsight,
    execSummaryVision,
    execSummaryBullets,
    painPoints,
    harperIntro,
    harperStats,
    valueDrivers,
    securityFeatures,
    implementationTimeline,
    whyNowItems,
    nextStepsItems,
    faqSections,
    selectedQuotes,
    sectionVisibility,
    materializedAt: new Date().toISOString(),
  };
}
