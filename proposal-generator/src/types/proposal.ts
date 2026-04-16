// Color Palette
export interface ColorPalette {
  primary: string;    // Default #03143B (navy)
  accent: string;     // Default #4d65ff (periwinkle)
  background: string; // Default #FFFFFF (white)
}

export const DEFAULT_COLOR_PALETTE: ColorPalette = {
  primary: '#03143B',
  accent: '#4d65ff',
  background: '#FFFFFF',
};

// Pricing Types
export interface PricingTier {
  minEmployees: number;
  maxEmployees: number;
  platformPPEY: number;
  workflowsPPEY: number;
}

export const PRICING_TIERS: PricingTier[] = [
  { minEmployees: 0, maxEmployees: 1000, platformPPEY: 88, workflowsPPEY: 22 },
  { minEmployees: 1001, maxEmployees: 3000, platformPPEY: 52.80, workflowsPPEY: 13.20 },
  { minEmployees: 3001, maxEmployees: 10000, platformPPEY: 35.20, workflowsPPEY: 8.80 },
  { minEmployees: 10001, maxEmployees: 25000, platformPPEY: 30.80, workflowsPPEY: 7.70 },
  { minEmployees: 25001, maxEmployees: Infinity, platformPPEY: 26.40, workflowsPPEY: 6.60 },
];

// Line item configuration for independent discounting/waiving
export interface LineItemConfig {
  included: boolean;
  discount: number; // 0-100%
  customAmount?: number; // Override calculated amount
}

// Agent Engineering configuration (yearly recurring professional services)
export interface AgentEngineeringConfig {
  included: boolean;
  hourlyRate: number; // Default $250/hr
  yearlyHours: number[]; // Hours per contract year
  yearlyDiscounts: number[]; // Discount % per contract year
}

// Per-year software configuration
export interface YearlySoftwareConfig {
  platform: LineItemConfig;
  workflows: LineItemConfig;
}

export interface PricingInputs {
  employeeCount: number;
  contractTermYears: 1 | 2 | 3 | 4 | 5;

  // Software (recurring) - per year configuration
  // Array length matches contractTermYears
  yearlyConfig: YearlySoftwareConfig[];

  // Services (one-time)
  implementation: LineItemConfig & {
    percentOfSoftware: number; // Default 10%
  };

  // Professional Services
  servicesHours: LineItemConfig & {
    hours: number;
    hourlyRate: number; // Default $250/hr
  };

  // Additional Integrations
  integrations: LineItemConfig & {
    count: number; // Number of additional integrations beyond standard
    costPerIntegration: number; // Default $5,000
  };

  // Agent Engineering (yearly recurring)
  agentEngineering?: AgentEngineeringConfig;

  // Annual escalation for multi-year contracts
  annualEscalationPercent?: number; // Applied to Year 2+ software pricing (compounding)
}

// Per-year pricing breakdown
export interface YearlyPricingBreakdown {
  year: number;
  platformListPrice: number;
  platformNetPrice: number;
  workflowsListPrice: number;
  workflowsNetPrice: number;
  softwareListPrice: number;
  softwareNetPrice: number;
  effectivePPEY: number;
  agentEngineeringHours: number;
  agentEngineeringListPrice: number;
  agentEngineeringNetPrice: number;
}

export interface PricingOutput {
  // Per-year software breakdown
  yearlyBreakdown: YearlyPricingBreakdown[];

  // Year 1 software (for backward compatibility and summary displays)
  platformListPrice: number;
  platformNetPrice: number;
  workflowsListPrice: number;
  workflowsNetPrice: number;
  softwareListPrice: number;
  softwareNetPrice: number;

  // Implementation (one-time)
  implementationListPrice: number;
  implementationNetPrice: number;

  // Professional Services (one-time)
  servicesListPrice: number;
  servicesNetPrice: number;

  // Agent Engineering (yearly recurring totals)
  totalAgentEngineeringListPrice: number;
  totalAgentEngineeringNetPrice: number;

  // Integrations (one-time)
  integrationsListPrice: number;
  integrationsNetPrice: number;

  // Totals
  totalOneTimeListPrice: number;
  totalOneTimeNetPrice: number;
  totalRecurringListPrice: number; // Total software across all years
  totalRecurringNetPrice: number;

  // Summary
  annualRecurringRevenue: number; // Year 1 software ARR
  totalContractValue: number; // All years software + one-time
  totalFirstYearInvestment: number; // Year 1 ARR + one-time
  effectivePPEY: number; // Year 1 software only, per employee per year
}

// ROI Calculator Types
export interface Tier2Workflow {
  id: string;
  name: string;
  volumePerYear: number;
  timePerWorkflowHours: number;
  deflectionByYear: number[];     // per-year deflection rates (0-100%), one per contract year
  effortReductionByYear: number[]; // per-year effort reduction rates (0-100%)
  activeYears?: boolean[];         // per-year on/off — true = active (defaults to all true)
}

export interface ManagerHRTime {
  enabled: boolean;
  managersDoingHR: number;
  hoursPerWeekPerManager: number;
  managerHourlyCost: number;
}

export interface TriageRole {
  enabled: boolean;
  triageFTEs: number;
  triageSalary: number;
}

// REMOVED: SalaryRegion (no longer needed)

// Per-year contract settings
export interface ContractYearSettings {
  wisqEffectiveness: number;  // 0-100%, how effective Wisq is in this year
  workforceChange: number;    // % change relative to today (e.g. 0, +5, +10)
}

export interface HROperationsInputs {
  // Contract & multi-year
  contractYears: number;
  yearSettings: ContractYearSettings[];

  // Simple Transactions
  tier01CasesPerYear: number;
  tier01AvgHandleTime: number;
  tier01DeflectionByYear: number[];  // per-year deflection rates, one per contract year

  // Complex Cases
  tier2PlusTotalCases: number;           // total complex cases (>= sum of configured workflows)
  tier2PlusAvgTimePerCase?: number;      // hours per case for unconfigured complex cases (defaults to weighted avg)
  nonConfiguredWorkflow?: {
    enabled: boolean;
    volumePerYear: number;
    hoursPerCase: number;
  };
  tier2Workflows: Tier2Workflow[];
  tier2PlusDefaultDeflection: number;    // hidden base rate for seeding new workflows
  tier2PlusDefaultEffortReduction: number; // hidden base rate for seeding new workflows

  // Cost Parameters
  tier01HandlerSalary: number;
  tier2PlusHandlerSalary: number;
  wisqLicenseCost: number;

  // Federated / Distributed
  managerHRTime?: ManagerHRTime;
  triageRole?: TriageRole;
}

// Phase 1 output: per-year workload comparison (hours, no cost)
export interface HROperationsYearResult {
  year: number;
  volumeMultiplier: number;
  tier01Cases: number;
  tier2Cases: number;
  currentTotalMinutes: number;
  futureTotalMinutes: number;
  hoursSaved: number;
  tier01HoursSaved: number;
  tier2HoursSaved: number;
  casesDeflected: number;
  workloadReductionPercent: number;
  activeConfiguredCases: number;
}

// Phase 2 output: per-year cost translation
export interface HROperationsYearCostResult {
  year: number;
  headcountSavings: number;
  tier01Savings: number;
  tier2Savings: number;
  managerSavings: number;
  triageSavings: number;
  totalSavings: number;
  netSavings: number;
  fteReduction: number;
}

export interface HROperationsOutput {
  // Phase 1: hours saved per year
  yearResults: HROperationsYearResult[];
  totalHoursSavedOverContract: number;

  // Phase 2: cost per year
  yearCostResults: HROperationsYearCostResult[];
  totalNetSavings: number;
  contractROI: number;

  // Convenience totals (sum across years for backward compat)
  headcountReductionSavings: number;
  managerTimeSavings: number;
  triageSavings: number;
  netSavings: number;
}

export interface AuditPrep {
  enabled: boolean;
  auditsPerYear: number;
  prepHoursPerAudit: number;
  prepHourlyRate: number;
  wisqReductionPercent: number;
}

export interface RiskPatternDetection {
  enabled: boolean;
  estimatedAnnualValue: number;
}

export interface ProactiveAlerts {
  enabled: boolean;
  estimatedAnnualValue: number;
}

export interface LegalComplianceInputs {
  highStakesPercent: number;
  useManualCaseVolume: boolean;
  manualHighStakesCases: number;
  avgLegalCostPerIncident: number;
  currentAccuracyRate: number;
  wisqAccuracyRate: number;
  adminHoursPerCase: number;
  adminHourlyRate: number;
  auditPrep?: AuditPrep;
  riskPatternDetection?: RiskPatternDetection;
  proactiveAlerts?: ProactiveAlerts;
}

export interface LegalComplianceYearResult {
  year: number;
  highStakesCases: number;
  avoidedIncidents: number;
  avoidedLegalCosts: number;
  adminCostSavings: number;
  auditPrepSavings: number;
  riskValue: number;
  proactiveValue: number;
  totalAvoidedCosts: number;
}

export interface LegalComplianceOutput {
  yearResults: LegalComplianceYearResult[];
  // Contract totals (backward compat)
  highStakesCases: number;
  avoidedIncidents: number;
  avoidedLegalCosts: number;
  adminCostSavings: number;
  auditPrepSavings: number;
  riskValue: number;
  proactiveValue: number;
  totalAvoidedCosts: number;
}

export interface EmployeeExperienceInputs {
  totalEmployeePopulation: number;
  inquiriesPerEmployeePerYear: number;
  avgTimePerInquiry: number;
  timeReductionPercent: number;
  avgHourlyRate: number;
  adoptionRate: number;
  employeeSatisfactionImprovement: number;
}

export interface EmployeeExperienceYearResult {
  year: number;
  totalInquiries: number;
  hoursSaved: number;
  totalMonetaryValue: number;
}

export interface EmployeeExperienceOutput {
  yearResults: EmployeeExperienceYearResult[];
  // Contract totals (backward compat)
  totalInquiries: number;
  hoursSaved: number;
  totalMonetaryValue: number;
}

export interface ROISummaryYearResult {
  year: number;
  hrOpsSavings: number;
  legalSavings: number;
  productivitySavings: number;
  grossValue: number;
  netValue: number;
}

export interface ROISummary {
  yearResults: ROISummaryYearResult[];
  grossAnnualValue: number;
  totalAnnualValue: number;
  totalROI: number;
  paybackPeriodMonths: number;
  netAnnualBenefit: number;
  hrOpsSavings: number;
  legalSavings: number;
  productivitySavings: number;
}

// Value Drivers - Static three pillars
export type ValueDriver = 'cost' | 'compliance' | 'care';

export const VALUE_DRIVERS: ValueDriver[] = ['cost', 'compliance', 'care'];

export const VALUE_DRIVER_LABELS: Record<ValueDriver, string> = {
  'cost': 'Cost',
  'compliance': 'Compliance',
  'care': 'Care',
};

export const VALUE_DRIVER_HEADLINES: Record<ValueDriver, string> = {
  'cost': 'Reduce Your Cost of HR',
  'compliance': 'Compliant Responses You Can Defend',
  'care': 'Deliver Personal Care at Scale',
};

export const VALUE_DRIVER_DESCRIPTIONS: Record<ValueDriver, string> = {
  'cost': 'Transform the Economics of HR Operations & Service',
  'compliance': 'Reduce Compliance Risk, Headache, and Legal Costs',
  'care': 'Instant, Accurate, Enterprise-Wide, White-Glove Employee Support',
};

// Pain Points
export type PainPoint =
  | 'hr-overwhelmed'
  | 'inconsistent-policy'
  | 'slow-response'
  | 'compliance-risk'
  | 'employee-frustration'
  | 'scaling-challenges'
  | 'documentation-gaps'
  | 'manager-burden'
  | 'need-to-scale'
  | 'hr-busywork'
  | 'strategic-blocked';

export const PAIN_POINT_LABELS: Record<PainPoint, string> = {
  'hr-overwhelmed': 'HR team overwhelmed with inquiries',
  'inconsistent-policy': 'Inconsistent policy application',
  'slow-response': 'Slow response times',
  'compliance-risk': 'Compliance and legal risk',
  'employee-frustration': 'Employee frustration with HR',
  'scaling-challenges': 'Difficulty scaling HR operations',
  'documentation-gaps': 'Gaps in documentation and audit trails',
  'manager-burden': 'Managers burdened with HR questions',
  'need-to-scale': 'Need to scale without adding headcount',
  'hr-busywork': 'HR spending too much time on routine tasks',
  'strategic-blocked': 'HR can\'t focus on strategic initiatives',
};

// Industries
export const INDUSTRIES = [
  'Technology',
  'Financial Services',
  'Healthcare',
  'Manufacturing',
  'Retail',
  'Professional Services',
  'Education',
  'Government',
  'Hospitality',
  'Transportation & Logistics',
  'Energy & Utilities',
  'Media & Entertainment',
  'Other',
] as const;

export type Industry = typeof INDUSTRIES[number];

// Contact Titles
export const CONTACT_TITLES = [
  'CHRO',
  'Chief People Officer',
  'VP of Human Resources',
  'VP of People Operations',
  'Head of HR',
  'CFO',
  'CIO',
  'COO',
  'SVP of HR',
  'Director of HR',
  'Other',
] as const;

export type ContactTitle = typeof CONTACT_TITLES[number];

// Customer's Current Tech Stack
export interface CustomerIntegrations {
  hcm: string;
  identity: string;
  documents: string;
  communication: string | string[]; // supports multi-select (e.g. Slack + Teams)
  ticketing: string;
  // Custom text when "Other" is selected
  customHcm?: string;
  customIdentity?: string;
  customDocuments?: string;
  customCommunication?: string;
  customTicketing?: string;
}

/** Normalize communication field to an array (handles legacy single-string values) */
export function normalizeCommunication(value: string | string[]): string[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

// Next Step IDs
export type NextStepId =
  | 'technical-deepdive'
  | 'security-review'
  | 'pilot-scope'
  | 'stakeholder-demo'
  | 'contract-review'
  | 'implementation-kickoff';

// Complete Proposal Input
export type WorkforceType = 'frontline-heavy' | 'knowledge-worker' | 'mixed';
export type OrgModel = 'centralized' | 'federated';

export const WORKFORCE_TYPES: WorkforceType[] = ['frontline-heavy', 'knowledge-worker', 'mixed'];
export const WORKFORCE_TYPE_DISPLAY: Record<WorkforceType, string> = {
  'frontline-heavy': 'Frontline-Heavy',
  'knowledge-worker': 'Knowledge Worker',
  mixed: 'Mixed',
};

export const ORG_MODELS: OrgModel[] = ['centralized', 'federated'];
export const ORG_MODEL_DISPLAY: Record<OrgModel, string> = {
  centralized: 'Centralized HR Team',
  federated: 'Federated / Distributed',
};

export interface CompanyInfo {
  companyName: string;
  industry: Industry;
  customIndustry?: string; // Custom text when "Other" is selected
  headquarters: string;
  contactName: string;
  contactTitle: ContactTitle;
  customContactTitle?: string; // Custom text when "Other" is selected
  contactEmail: string;
  crmRecordId?: string;
  customerLogoBase64?: string; // data:image/png;base64,... URI of customer logo
  customerLogoDomain?: string; // Domain used to fetch the logo
  workforceType?: WorkforceType;
  orgModel?: OrgModel;
}

// Map Deal Info industry display names to benchmark slugs
const INDUSTRY_TO_BENCHMARK: Record<string, string> = {
  'Technology': 'technology',
  'Financial Services': 'financial-services',
  'Healthcare': 'healthcare',
  'Manufacturing': 'manufacturing',
  'Retail': 'retail',
  'Professional Services': 'professional-services',
  'Hospitality': 'hospitality',
  'Education': 'other',
  'Government': 'other',
  'Transportation & Logistics': 'other',
  'Energy & Utilities': 'other',
  'Media & Entertainment': 'other',
  'Other': 'other',
};

export function mapIndustryToBenchmark(industry: Industry): string {
  return INDUSTRY_TO_BENCHMARK[industry] || 'other';
}

// Custom pain points added by the user
export interface CustomPainPoint {
  id: string;
  headline: string;
  impact: string;
}

// Custom next steps added by the user
export interface CustomNextStep {
  id: string;
  title: string;
  description: string;
}

// Customer Quote types
export type QuoteSection = 'executive-summary' | 'current-state' | 'meet-harper' |
                    'value-drivers' | 'investment' | 'security' | 'why-now';

// FAQ types
export interface FAQ {
  question: string;
  answer: string;
}

export type FAQPageId = 'executive-summary' | 'value-drivers' | 'investment' | 'security' | 'why-now';

export const FAQ_PAGE_LABELS: Record<FAQPageId, string> = {
  'executive-summary': 'Executive Summary',
  'value-drivers': 'Value Drivers',
  'investment': 'Investment Case',
  'security': 'Security & Integration',
  'why-now': 'Why Now',
};

export interface FAQSection {
  pageId: FAQPageId;
  faqs: FAQ[];
}

export interface ProposalInputs {
  company: CompanyInfo;
  pricing: PricingInputs;
  hrOperations: HROperationsInputs;
  legalCompliance: LegalComplianceInputs;
  employeeExperience: EmployeeExperienceInputs;
  primaryValueDriver?: ValueDriver; // Optional - which of the 3 value drivers to emphasize
  painPoints: PainPoint[];
  integrations: CustomerIntegrations;
  nextSteps: NextStepId[];
  coverQuote?: string;
  customNotes?: string;
  // Custom items
  customPainPoints?: CustomPainPoint[];
  customNextSteps?: CustomNextStep[];
  painPointOrder?: string[];  // ordered array of PainPoint ids + custom ids
  nextStepOrder?: string[];   // ordered array of NextStepId + custom ids
  // FAQ sections
  faqSections?: FAQSection[];
  // Customer Quotes
  selectedQuotes?: string[];  // Array of quote IDs
  // ROI quick estimate completed
  roiEstimateGenerated?: boolean;
  // AI Personalization
  aiPersonalization?: AIPersonalizationInputs;
  // Color palette
  colorPalette?: ColorPalette;
  // Content overrides from inline editing (deprecated - use documentContent)
  contentOverrides?: ProposalContentOverrides;
  // AI-generated content
  generatedContent?: GeneratedProposalContent;
  // RFP Response Appendix
  rfpAppendix?: RFPAppendix;
  // Materialized editable document content (replaces contentOverrides for rendering)
  documentContent?: ProposalDocumentContent;
}

// ============================================================
// Widget-based editable document types
// ============================================================

/** A single item within a repeatable widget group */
export interface WidgetItem {
  id: string;
  [key: string]: unknown;
}

/** Section visibility flags for soft hide/restore */
export interface SectionVisibility {
  cover: boolean;
  executiveSummary: boolean;
  meetHarper: boolean;
  investmentCase: boolean;
  securityIntegration: boolean;
  whyNow: boolean;
  nextSteps: boolean;
}

/** Fully materialized, directly-editable document content */
export interface ProposalDocumentContent {
  // Cover Page
  coverEyebrow: string;
  coverTitle: string;
  coverQuote: string;
  coverContactName: string;
  coverContactTitle: string;

  // Executive Summary
  execSummaryInsight: string;
  execSummaryVision: string;
  execSummaryBullets: WidgetItem[]; // { id, text }

  // Current State - Pain Points
  painPoints: WidgetItem[]; // { id, headline, impact }

  // Meet Harper
  harperIntro: string;
  harperStats: WidgetItem[]; // { id, stat, context }

  // Value Drivers
  valueDrivers: WidgetItem[]; // { id, key, headline, description, proof, isPrimary }

  // Security Features
  securityFeatures: WidgetItem[]; // { id, title, description }

  // Implementation Timeline
  implementationTimeline: WidgetItem[]; // { id, week, title, description }

  // Why Now
  whyNowItems: WidgetItem[]; // { id, key, headline, description }

  // Next Steps
  nextStepsItems: WidgetItem[]; // { id, title, description }

  // Table of Contents
  tocHeading: string;
  tocItems: WidgetItem[];

  // FAQ Sections
  faqSections: FAQSection[];

  // Selected Quotes
  selectedQuotes: string[];

  // Section visibility
  sectionVisibility: SectionVisibility;

  // Page layout configuration per section
  sectionLayouts?: Partial<Record<keyof SectionVisibility, SectionLayout>>;

  // Custom blocks added by the user
  customBlocks?: CustomBlock[];

  // Custom sections added by the user at runtime
  customSections?: CustomSectionConfig[];

  // Metadata
  materializedAt: string;
}

/** Types of custom blocks the user can insert */
export type CustomBlockType = 'text' | 'heading' | 'card-grid-2' | 'card-grid-3' | 'bullet-list' | 'numbered-list';

/** A user-created block inserted between existing blocks */
export interface CustomBlock {
  id: string;
  type: CustomBlockType;
  sectionKey: string;
  label: string;
  colSpan: number;
  data: {
    text?: string;
    items?: WidgetItem[];
  };
}

/** Layout configuration for a single block within a section */
export interface BlockLayout {
  blockId: string;
  colSpan: number; // 1-12 (12-column grid)
  order: number;
}

/** Layout configuration for an entire section */
export interface SectionLayout {
  blocks: BlockLayout[];
}

/** A single element within a custom (user-created) section */
export interface CustomSectionElement {
  id: string;
  elementType: ProposalElementType;
  label: string;
  colSpan: number;
  data: Record<string, unknown>;
}

/** Configuration for a user-created custom section */
export interface CustomSectionConfig {
  id: string;
  name: string;
  layoutPreset: SectionLayoutPreset;
  darkTheme?: boolean;
  elements: CustomSectionElement[];
  layout?: SectionLayout;
}

// ============================================================
// Template-based proposal builder types
// ============================================================

/** Element type identifiers for the proposal builder */
export type ProposalElementType =
  | 'section-heading' | 'sub-heading' | 'body-text' | 'vision-callout' | 'eyebrow-label'
  | 'metric-table' | 'kpi-tiles' | 'stat-cards' | 'projection-panel'
  | 'accent-card-grid' | 'feature-card-grid' | 'timeline-card-grid' | 'value-driver-cards'
  | 'bullet-list' | 'numbered-steps'
  | 'customer-quote' | 'divider-line' | 'faq-section'
  | 'integration-pills' | 'contact-card' | 'page-footer' | 'cover-title-block'
  | 'spacer' | 'placeholder-panel' | 'harper-profile'
  | 'roi-pie-chart' | 'roi-breakdown-columns'
  | 'cover-image' | 'table-of-contents' | 'cover-prepared-for';

/** Section layout preset identifiers */
export type SectionLayoutPreset =
  | 'single-column'
  | 'content-sidebar'
  | 'equal-split'
  | 'hero-grid'
  | 'two-col-bottom-banner';

/** A single element placement within a section */
export interface ElementPlacement {
  elementType: ProposalElementType;
  blockId: string;
  label: string;
  defaultColSpan: number;
  props?: Record<string, unknown>;
}

/** A section definition within a template */
export interface SectionTemplateConfig {
  sectionKey: keyof SectionVisibility;
  layoutPreset: SectionLayoutPreset;
  darkTheme?: boolean;
  className?: string;
  elements: ElementPlacement[];
}

/** Full proposal template */
export interface ProposalTemplate {
  name: string;
  sections: SectionTemplateConfig[];
}

// Content overrides from inline editing
export interface ProposalContentOverrides {
  coverEyebrow?: string;
  coverTitle?: string;
  coverQuote?: string;
  coverContactName?: string;
  coverContactTitle?: string;
  execSummaryInsight?: string;
  execSummaryVision?: string;
  execSummaryBullets?: string[];
  painPointHeadlines?: Record<string, string>;
  harperIntro?: string;
  valueDrivers?: Record<string, { headline?: string; description?: string; proof?: string }>;
  whyNowItems?: Record<string, { headline?: string; description?: string }>;
  nextStepOverrides?: Record<string, { title?: string; description?: string }>;
}

// AI personalization inputs
export interface AIPersonalizationInputs {
  customInstructions: string;
  uploadedDocuments: UploadedDocument[];
  enableAccountResearch: boolean;
}

export interface UploadedDocument {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'txt';
  content: string;
  uploadedAt: string;
}

// AI-generated content
export interface GeneratedProposalContent {
  execSummaryInsight?: string;
  execSummaryVision?: string;
  execSummaryBullets?: string[];
  valueDriverContent?: { key: string; headline: string; description: string; proof: string }[];
  whyNowContent?: { key: string; headline: string; description: string }[];
  visionContent?: {
    intro: string;
    calloutQuote: string;
    pillars: { heading: string; body: string }[];
    closing: string;
  };
  accountResearch?: AccountResearchResult;
  faqSections?: FAQSection[];
  generatedAt: string;
}

export interface AccountResearchResult {
  companyDescription?: string;
  recentNews?: { title: string; snippet: string }[];
  industryInsights?: string;
}

// Google Slides Template
export const TEMPLATE_ID = '1KVwg9GsRXfxdyIwugA88_OWrbDb3xYjzwq5i0FapwXM';

export interface SlideMapping {
  proposalSlide: string;
  templatePage: number;
  contentType: 'static' | 'dynamic' | 'ai-generated';
}

export const SLIDE_MAPPINGS: SlideMapping[] = [
  { proposalSlide: 'Title', templatePage: 1, contentType: 'dynamic' },
  { proposalSlide: 'The Opportunity', templatePage: 6, contentType: 'ai-generated' },
  { proposalSlide: 'Current State', templatePage: 14, contentType: 'dynamic' },
  { proposalSlide: 'Meet Harper', templatePage: 39, contentType: 'static' },
  { proposalSlide: 'Your Solution', templatePage: 24, contentType: 'ai-generated' },
  { proposalSlide: 'Investment Case', templatePage: 30, contentType: 'dynamic' },
  { proposalSlide: '3-Year Projection', templatePage: 31, contentType: 'dynamic' },
  { proposalSlide: 'Enterprise Security', templatePage: 26, contentType: 'static' },
  { proposalSlide: 'Integration Fit', templatePage: 59, contentType: 'dynamic' },
  { proposalSlide: 'Implementation Path', templatePage: 45, contentType: 'dynamic' },
  { proposalSlide: 'Why Now', templatePage: 15, contentType: 'ai-generated' },
  { proposalSlide: 'Next Steps', templatePage: 61, contentType: 'dynamic' },
];

// Default Values
export const DEFAULT_HR_OPERATIONS: HROperationsInputs = {
  contractYears: 3,
  yearSettings: [
    { wisqEffectiveness: 30, workforceChange: 0 },
    { wisqEffectiveness: 60, workforceChange: 5 },
    { wisqEffectiveness: 75, workforceChange: 10 },
  ],
  tier01CasesPerYear: 9600,   // ~80% of 12000
  tier01AvgHandleTime: 9,
  tier01DeflectionByYear: [30, 60, 75],  // matches wisqEffectiveness directly
  tier2PlusTotalCases: 0,
  nonConfiguredWorkflow: { enabled: false, volumePerYear: 0, hoursPerCase: 0.75 },
  tier2Workflows: [],
  tier2PlusDefaultDeflection: 40,
  tier2PlusDefaultEffortReduction: 80,
  tier01HandlerSalary: 84000,      // Fully burdened: base $60k × 1.4
  tier2PlusHandlerSalary: 140000,  // Fully burdened: base $100k × 1.4
  wisqLicenseCost: 0,
};

export const DEFAULT_LEGAL_COMPLIANCE: LegalComplianceInputs = {
  highStakesPercent: 2,
  useManualCaseVolume: false,
  manualHighStakesCases: 50,
  avgLegalCostPerIncident: 75000,
  currentAccuracyRate: 90,
  wisqAccuracyRate: 99,
  adminHoursPerCase: 8,
  adminHourlyRate: 75,
};

export const DEFAULT_EMPLOYEE_EXPERIENCE: EmployeeExperienceInputs = {
  totalEmployeePopulation: 2000,
  inquiriesPerEmployeePerYear: 3,
  avgTimePerInquiry: 15,
  timeReductionPercent: 75,
  avgHourlyRate: 55,
  adoptionRate: 70,
  employeeSatisfactionImprovement: 25,
};

// Helper to create default yearly config
export const createDefaultYearlyConfig = (): YearlySoftwareConfig => ({
  platform: { included: true, discount: 0 },
  workflows: { included: true, discount: 0 },
});

export const DEFAULT_PRICING: PricingInputs = {
  employeeCount: 2000,
  contractTermYears: 1,

  yearlyConfig: [createDefaultYearlyConfig()],

  implementation: {
    included: true,
    discount: 0,
    percentOfSoftware: 10,
  },
  servicesHours: {
    included: false,
    discount: 0,
    hours: 0,
    hourlyRate: 250,
  },
  integrations: {
    included: false,
    discount: 0,
    count: 0,
    costPerIntegration: 5000,
  },
  agentEngineering: {
    included: false,
    hourlyRate: 250,
    yearlyHours: [0],
    yearlyDiscounts: [0],
  },
  annualEscalationPercent: 0,
};

// Multi-proposal management types
export interface SavedProposal {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: ProposalInputs;
}

export interface ProposalListItem {
  id: string;
  name: string;
  companyName: string;
  industry: string;
  updatedAt: string;
}

export interface ProposalStore {
  proposals: SavedProposal[];
  activeProposalId: string | null;
}

// RFP Response Appendix Types

export type RFPCategory =
  | 'security'
  | 'compliance'
  | 'ai'
  | 'integration'
  | 'implementation'
  | 'pricing'
  | 'support'
  | 'company'
  | 'data_protection'
  | 'access_control'
  | 'other';

export const RFP_CATEGORY_LABELS: Record<RFPCategory, string> = {
  security: 'Security',
  compliance: 'Compliance',
  ai: 'AI & Machine Learning',
  integration: 'Integrations',
  implementation: 'Implementation',
  pricing: 'Pricing',
  support: 'Support',
  company: 'Company Information',
  data_protection: 'Data Protection',
  access_control: 'Access Control',
  other: 'Other',
};

// Question extracted from RFP document
export interface RFPQuestion {
  id: string;
  originalText: string;
  category: RFPCategory;
  sourceFile: string;
  included: boolean; // User can exclude questions
}

// Generated answer for a question
export type RFPAnswerSource = 'knowledge_base' | 'ai_generated' | 'user_edited' | 'needs_manual';

export interface RFPAnswer {
  questionId: string;
  answer: string;
  source: RFPAnswerSource;
  confidence: number; // 0-1
  kbMatchId?: string; // Reference to KB entry if matched
  needsReview: boolean;
}

// Complete RFP response appendix
export interface RFPAppendix {
  enabled: boolean;
  questions: RFPQuestion[];
  answers: RFPAnswer[];
  generatedAt?: string;
}

// Helper: resolve "Other" selections to custom text
export function resolveOtherValue(value: string, customText?: string): string {
  if (value === 'Other' && customText) return customText;
  return value;
}

// Microsite (published proposal web page)
export interface MicrositeRecord {
  id: string;
  proposal_id: string;
  slug: string;
  name: string;
  data: ProposalInputs;
  published_at: string;
  unpublished_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
  owner_email: string;
  updated_at: string;
}

// Knowledge base entry format
export interface KBEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  access: 'internal' | 'private';
}
