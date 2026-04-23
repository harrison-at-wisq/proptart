import type { ProposalInputs } from './proposal';

// Layout schema for a microsite. Persisted inside draft_data/published_data
// under the reserved `_layout` key, so ProposalInputs itself stays clean.
export type MicrositeSectionType =
  | 'cover'
  | 'vision'
  | 'executive-summary'
  | 'harper'
  | 'value-drivers'
  | 'investment'
  | 'security'
  | 'why-now'
  | 'footer';

export interface MicrositeSection {
  id: string;
  sectionType: MicrositeSectionType;
  // Per-section overrides. Shape varies by sectionType; see section-data.ts
  // for the known shapes. Always serialisable to JSON.
  data?: Record<string, unknown>;
  // Section-level theme override. When 'dark', the wrapper applies a dark
  // surface + light-text palette regardless of the section's own defaults.
  theme?: 'light' | 'dark';
}

export interface MicrositeLayout {
  sections: MicrositeSection[];
}

// draft_data / published_data carry ProposalInputs + a reserved layout key.
export type MicrositeData = ProposalInputs & {
  _layout?: MicrositeLayout;
};

// Per-section data shapes. Start narrow; expand section-by-section.

// Phase B text overrides: each section can carry a `title` override for its
// heading plus a per-item override map that overrides headline/description/etc.
// for known computed keys or custom-added items.

export interface ValueDriversSectionData {
  hiddenDriverKeys?: string[];
  addedDrivers?: Array<{
    key: string;
    headline: string;
    description: string;
    proof?: string;
    isPrimary?: boolean;
  }>;
  title?: string;
  driverOverrides?: Record<string, { headline?: string; description?: string; proof?: string }>;
  // Phase B.3: ordered list of sub-block ids that make up this section's body.
  blockOrder?: string[];
}

export interface ExecutiveSummarySectionData {
  hiddenPainPointKeys?: string[];
  addedPainPoints?: Array<{
    key: string;
    headline: string;
    impact: string;
  }>;
  title?: string;
  painPointOverrides?: Record<string, { headline?: string; impact?: string }>;
  // Phase B.2: narrative + metric tile labels + section sub-headings.
  narrative?: {
    insight?: string;
    vision?: string;
    bullets?: string[];
  };
  keyMetricsTitle?: string;
  metricLabelOverrides?: {
    avgAnnualInvestment?: string;
    projectedAnnualValue?: string;
    roi?: string;
    payback?: string;
  };
  currentStateTitle?: string;
  blockOrder?: string[];
  // Freeform token-string overrides for each metric tile value.
  // Defaults embed tokens: "{{avgAnnualInvestment}}", "{{netAnnualBenefitPerYr}}", etc.
  metricValueOverrides?: {
    avgAnnualInvestment?: string;
    projectedAnnualValue?: string;
    roi?: string;
    payback?: string;
  };
}

export interface SecuritySectionData {
  hiddenFeatureTitles?: string[];
  addedFeatures?: Array<{
    key: string;
    title: string;
    description: string;
  }>;
  title?: string;
  featureOverrides?: Record<string, { title?: string; description?: string }>;
  // Phase B.3
  enterpriseSecurityTitle?: string;
  integrationLandscapeTitle?: string;
  implementationTimelineTitle?: string;
  integrationEmptyText?: string;
  phaseOverrides?: Record<string, { week?: string; title?: string; description?: string }>;
  blockOrder?: string[];
}

// Investment's 4 KPI tiles are each tied to a specific computed value, so
// hide-only. Adding blank tiles doesn't make sense without a data source.
export type InvestmentTileKey = 'total-investment' | 'payback' | 'contract-value' | 'net-value';

export interface InvestmentSectionData {
  hiddenTileKeys?: InvestmentTileKey[];
  title?: string;
  tileLabelOverrides?: Partial<Record<InvestmentTileKey, string>>;
  // Token-string overrides for each tile's big number. Defaults use tokens
  // like "{{totalContractValue}}" so clicking reveals the token.
  tileValueOverrides?: Partial<Record<InvestmentTileKey, string>>;
  tileOrder?: InvestmentTileKey[];
  investmentColumnTitle?: string;
  returnColumnTitle?: string;
  breakdownTitle?: string;
  investmentRowOverrides?: Record<string, { label?: string; value?: string }>;
  breakdownColumnOverrides?: Record<string, { title?: string; total?: string }>;
  breakdownItemOverrides?: Record<string, { label?: string; value?: string; explanation?: string }>;
  // Pie chart legend overrides keyed by the slice's computed label.
  pieLabelOverrides?: Record<string, { label?: string; value?: string }>;
  blockOrder?: string[];
}

export interface WhyNowSectionData {
  hiddenReasonKeys?: string[];
  addedReasons?: Array<{
    key: string;
    headline: string;
    description: string;
  }>;
  title?: string;
  reasonOverrides?: Record<string, { headline?: string; description?: string }>;
  nextStepsTitle?: string;
  nextStepOverrides?: Record<string, { title?: string; description?: string }>;
  questionsPrompt?: string;
  blockOrder?: string[];
  // Contact card line overrides (so the studio can edit name/email lines).
  contactName?: string;
  contactEmail?: string;
}

// Phase B.2: monolithic sections that didn't have data overrides before.

export interface CoverSectionData {
  eyebrow?: string;
  title?: string;
  coverQuote?: string;
  // "Prepared for {name}, {title}" — freeform so tokens are allowed.
  preparedFor?: string;
}

export interface VisionSectionData {
  title?: string;
  intro?: string;
  callout?: string;
  pillars?: Array<{ heading?: string; body?: string }>;
  closing?: string;
  // Phase B.3
  blockOrder?: string[];
}

export interface HarperSectionData {
  title?: string;
  subtitle?: string;
  intro?: string;
  capabilitiesTitle?: string;
  capabilityOverrides?: Record<string, { title?: string; description?: string }>;
  // Hidden computed capability keys (by default title).
  hiddenCapabilityKeys?: string[];
  // Ordering for computed + added capabilities. IDs are the capability's key.
  capabilityOrder?: string[];
  // User-added capabilities.
  addedCapabilities?: Array<{ key: string; title: string; description: string }>;
  statOverrides?: Record<string, { value?: string; label?: string }>;
  blockOrder?: string[];
}

