import { Industry, ValueDriver, PainPoint, VALUE_DRIVER_LABELS, PAIN_POINT_LABELS } from '@/types/proposal';

// Industry-specific opportunity content
export const OPPORTUNITY_CONTENT: Record<Industry, { insight: string; vision: string; bullets: string[] }> = {
  'Technology': {
    insight: 'In a competitive talent market, HR teams at tech companies face a unique challenge: scaling people operations as fast as the business grows.',
    vision: 'What if your HR team could handle 3x the volume without adding headcount?',
    bullets: [
      'Instant answers for a distributed workforce',
      'Scale HR support globally without timezone constraints',
      'Free your team to focus on strategic initiatives',
    ],
  },
  'Financial Services': {
    insight: 'In financial services, HR compliance isn\'t optional—it\'s existential. Yet most HR teams spend 60% of their time on routine inquiries.',
    vision: 'What if you could reduce compliance risk by 90% while cutting response times from days to seconds?',
    bullets: [
      'Audit-ready documentation for every interaction',
      'Consistent policy application across all locations',
      'Real-time compliance monitoring and alerts',
    ],
  },
  'Healthcare': {
    insight: 'Healthcare organizations face strict compliance requirements while managing diverse workforces across multiple locations and shifts.',
    vision: 'What if every policy question was answered correctly, every time, with full audit trails?',
    bullets: [
      '24/7 support for round-the-clock staff',
      'HIPAA-aware policy guidance',
      'Reduce administrative burden on clinical managers',
    ],
  },
  'Manufacturing': {
    insight: 'Manufacturing HR teams support large, distributed workforces where consistent policy application is critical for safety and compliance.',
    vision: 'What if your floor supervisors could get instant, accurate HR guidance without waiting for callbacks?',
    bullets: [
      'Multi-language support for diverse workforces',
      'Instant access to safety and compliance policies',
      'Reduce time-to-resolution for employee issues',
    ],
  },
  'Retail': {
    insight: 'Retail HR teams face high turnover, seasonal surges, and the challenge of supporting employees across hundreds of locations.',
    vision: 'What if every store manager had an HR expert available 24/7, in every language your team speaks?',
    bullets: [
      'Instant onboarding support during peak seasons',
      'Consistent policy enforcement across all stores',
      'Reduce manager time spent on HR questions by 80%',
    ],
  },
  'Professional Services': {
    insight: 'Professional services firms compete on talent. Your HR team\'s responsiveness directly impacts employee experience and retention.',
    vision: 'What if your consultants and partners could resolve HR questions instantly, from anywhere in the world?',
    bullets: [
      'Support your mobile, client-facing workforce',
      'Maintain confidentiality with secure, private interactions',
      'Scale HR expertise without scaling headcount',
    ],
  },
  'Education': {
    insight: 'Educational institutions manage complex employment relationships—faculty, staff, administrators—each with different policies and needs.',
    vision: 'What if every employee could get accurate, personalized HR guidance without navigating bureaucratic complexity?',
    bullets: [
      'Navigate complex union and tenure policies',
      'Support diverse employment classifications',
      'Reduce administrative burden during enrollment periods',
    ],
  },
  'Government': {
    insight: 'Government HR teams must balance regulatory compliance, union agreements, and public accountability while serving large workforces.',
    vision: 'What if you could ensure consistent, defensible HR decisions across every department and location?',
    bullets: [
      'Full audit trails for public accountability',
      'Navigate complex civil service regulations',
      'Reduce grievances through consistent policy application',
    ],
  },
  'Hospitality': {
    insight: 'Hospitality HR teams support high-turnover, multilingual workforces operating around the clock across multiple properties.',
    vision: 'What if your GMs could resolve employee questions instantly, in any language, at any hour?',
    bullets: [
      '24/7 multilingual HR support',
      'Rapid onboarding for seasonal staff',
      'Reduce manager time spent on HR by 35+ hours monthly',
    ],
  },
  'Transportation & Logistics': {
    insight: 'Transportation and logistics companies operate around the clock with dispersed workforces who need HR support on their schedule.',
    vision: 'What if your drivers and warehouse teams could get instant HR answers without waiting for office hours?',
    bullets: [
      'Mobile-first HR support for field workers',
      'DOT compliance guidance at their fingertips',
      'Reduce safety incidents through better policy access',
    ],
  },
  'Energy & Utilities': {
    insight: 'Energy and utilities companies manage safety-critical workforces where policy compliance can be a matter of life and death.',
    vision: 'What if every safety and compliance question was answered correctly, instantly, with full documentation?',
    bullets: [
      'Safety policy access when and where it\'s needed',
      'Audit-ready documentation for regulators',
      'Support for complex shift and overtime policies',
    ],
  },
  'Media & Entertainment': {
    insight: 'Media and entertainment HR teams manage creative talent, union agreements, and project-based workforces with unique needs.',
    vision: 'What if your talent could focus on creating great content instead of navigating HR complexity?',
    bullets: [
      'Navigate complex union and guild requirements',
      'Support for project-based employment',
      'Instant access to benefits and payroll information',
    ],
  },
  'Other': {
    insight: 'Modern HR teams face a common challenge: scaling personalized support without scaling headcount proportionally.',
    vision: 'What if every employee could get instant, accurate, personalized HR guidance—anytime, anywhere?',
    bullets: [
      'Reduce response times from days to seconds',
      'Free your HR team for strategic work',
      'Improve employee satisfaction with instant answers',
    ],
  },
};

// Value driver descriptions for solution slide - the three pillars
export const VALUE_DRIVER_CONTENT: Record<ValueDriver, { headline: string; description: string; proof: string }> = {
  'cost': {
    headline: 'Reduce Your Cost of HR',
    description: 'Transform the economics of HR operations. Harper handles 80% of routine inquiries autonomously, letting your team focus on strategic initiatives. Stop adding HR headcount just to keep up with growth.',
    proof: '35+ hours saved per HR team member monthly',
  },
  'compliance': {
    headline: 'Compliant Responses You Can Defend',
    description: 'Every answer is audit-ready with full reasoning trails and policy citations. Harper provides consistent, defensible guidance that reduces compliance risk, headaches, and legal costs.',
    proof: '94% accuracy on SHRM-CP certification questions',
  },
  'care': {
    headline: 'Deliver Personal Care at Scale',
    description: 'Every employee gets personalized, accurate guidance in under 8 seconds—in 98 languages. Harper remembers context and delivers instant, white-glove support enterprise-wide.',
    proof: '<8 second average response time',
  },
};

// Pain point expansion for current state slide
export const PAIN_POINT_CONTENT: Record<PainPoint, { headline: string; impact: string }> = {
  'hr-overwhelmed': {
    headline: 'HR Team Stretched Thin',
    impact: 'Your HR team spends 60%+ of their time on repetitive inquiries, leaving little capacity for strategic work.',
  },
  'inconsistent-policy': {
    headline: 'Inconsistent Policy Application',
    impact: 'Different answers from different people create confusion, frustration, and potential compliance risk.',
  },
  'slow-response': {
    headline: 'Slow Response Times',
    impact: 'Employees wait days for answers to simple questions, impacting productivity and satisfaction.',
  },
  'compliance-risk': {
    headline: 'Compliance Exposure',
    impact: 'Without consistent documentation and policy application, every HR interaction carries potential legal risk.',
  },
  'employee-frustration': {
    headline: 'Employee Frustration',
    impact: 'Employees can\'t get quick answers to basic questions, damaging their perception of HR and the company.',
  },
  'scaling-challenges': {
    headline: 'Can\'t Scale HR Support',
    impact: 'Adding employees means adding HR headcount—an unsustainable equation as you grow.',
  },
  'documentation-gaps': {
    headline: 'Documentation Gaps',
    impact: 'Informal conversations and email threads leave no audit trail when you need one most.',
  },
  'manager-burden': {
    headline: 'Managers Burdened with HR',
    impact: 'Line managers spend hours each week fielding HR questions instead of leading their teams.',
  },
  'need-to-scale': {
    headline: 'Need to Scale Without Adding Headcount',
    impact: 'Business is growing but the budget for HR headcount isn\'t—you need to do more with your current team.',
  },
  'hr-busywork': {
    headline: 'HR Spending Too Much Time on Routine Tasks',
    impact: 'Your HR experts are stuck answering the same questions repeatedly instead of driving strategic initiatives.',
  },
  'strategic-blocked': {
    headline: 'HR Can\'t Focus on Strategic Initiatives',
    impact: 'Day-to-day firefighting leaves no capacity for culture building, talent development, or transformation projects.',
  },
};

// Why Now content
export const WHY_NOW_CONTENT = {
  costOfDelay: {
    headline: 'The Cost of Waiting',
    description: 'Every month without Wisq represents avoidable costs in HR time, compliance risk, and employee productivity.',
  },
  aiMomentum: {
    headline: 'AI is Transforming HR',
    description: 'Organizations that adopt AI for HR now are building competitive advantages in talent acquisition, retention, and operational efficiency.',
  },
  quickWins: {
    headline: 'Quick Wins Available',
    description: 'Most customers see measurable ROI within 90 days. Start with high-volume use cases and expand from there.',
  },
  competitivePressure: {
    headline: 'Your Competitors Are Moving',
    description: 'Leading organizations in your industry are already exploring or implementing AI-powered HR solutions.',
  },
};

// Harper stats
export const HARPER_STATS = {
  accuracy: '94%',
  accuracyContext: 'SHRM-CP accuracy (20-30 points above passing)',
  responseTime: '<8 seconds',
  responseContext: 'Average response time',
  deflection: '80%',
  deflectionContext: 'Routine requests handled autonomously',
  languages: '98',
  languagesContext: 'Languages supported',
  hoursSaved: '35+',
  hoursSavedContext: 'Hours saved per HR team member monthly',
};

// Security features
export const SECURITY_FEATURES = [
  { title: 'SOC 2 Type II', description: 'Certified compliance with enterprise security standards' },
  { title: 'Data Encryption', description: 'Data encrypted at rest and in transit' },
  { title: 'SSO & SCIM', description: 'SAML 2.0 SSO and SCIM provisioning support' },
  { title: 'Role-Based Access', description: 'Granular permissions for data and features' },
  { title: 'Audit Logging', description: 'Complete activity logs for compliance' },
];

// Implementation timeline
export const IMPLEMENTATION_TIMELINE = [
  { week: 'Weeks 1-3', title: 'Discovery & Setup', description: 'Requirements gathering, technical integration planning, SSO configuration, data connections' },
  { week: 'Weeks 4-6', title: 'Content Configuration', description: 'Policy upload, knowledge base setup, workflow design, initial testing' },
  { week: 'Weeks 7-9', title: 'Testing & Training', description: 'User acceptance testing, admin training, pilot group rollout, feedback incorporation' },
  { week: 'Weeks 10-12', title: 'Launch & Optimize', description: 'Full rollout, monitoring dashboards, continuous improvement, success review' },
];

// Integration options by category
export const INTEGRATION_OPTIONS = {
  hcm: [
    'Workday',
    'SAP SuccessFactors',
    'ADP Workforce Now',
    'UKG Pro',
    'BambooHR',
    'Paylocity',
    'Dayforce (Ceridian)',
    'Oracle HCM',
    'Other',
  ],
  identity: [
    'Okta',
    'Azure AD / Entra ID',
    'Google Workspace',
    'OneLogin',
    'Ping Identity',
    'JumpCloud',
    'SSO & SCIM',
    'Other',
  ],
  documents: [
    'SharePoint',
    'Google Drive',
    'Confluence',
    'Notion',
    'Box',
    'Dropbox',
    'Other',
  ],
  communication: [
    'Microsoft Teams',
    'Slack',
    'Google Chat',
    'Zoom Team Chat',
    'Other',
  ],
  ticketing: [
    'ServiceNow',
    'Jira Service Management',
    'Zendesk',
    'Freshservice',
    'Workday Help',
    'None / Not applicable',
    'Other',
  ],
} as const;

// Proposed next steps options
export const NEXT_STEPS_OPTIONS = [
  {
    id: 'technical-deepdive',
    title: 'Schedule a technical deep-dive',
    description: 'Review integration requirements with your IT team',
  },
  {
    id: 'security-review',
    title: 'Complete security review',
    description: 'SOC 2 documentation, security questionnaire, and compliance review',
  },
  {
    id: 'pilot-scope',
    title: 'Define pilot scope and success metrics',
    description: 'Identify initial use cases and measurement criteria',
  },
  {
    id: 'stakeholder-demo',
    title: 'Schedule stakeholder demo',
    description: 'Present Wisq capabilities to key decision makers',
  },
  {
    id: 'contract-review',
    title: 'Begin contract review',
    description: 'Legal and procurement review of terms and conditions',
  },
  {
    id: 'implementation-kickoff',
    title: 'Begin implementation',
    description: 'Target go-live within 12 weeks of kickoff',
  },
] as const;

// Helper function to get opportunity content for an industry
export function getOpportunityContent(industry: Industry) {
  return OPPORTUNITY_CONTENT[industry] || OPPORTUNITY_CONTENT['Other'];
}

// Helper function to get value driver content - returns all three, with primary first if specified
export function getValueDriverContent(primaryDriver?: ValueDriver) {
  const allDrivers: ValueDriver[] = ['cost', 'compliance', 'care'];

  // If a primary driver is specified, put it first
  const orderedDrivers = primaryDriver
    ? [primaryDriver, ...allDrivers.filter(d => d !== primaryDriver)]
    : allDrivers;

  return orderedDrivers.map((driver, index) => ({
    key: driver,
    label: VALUE_DRIVER_LABELS[driver],
    isPrimary: driver === primaryDriver,
    order: index + 1,
    ...VALUE_DRIVER_CONTENT[driver],
  }));
}

// Helper function to get pain point content
export function getPainPointContent(points: PainPoint[]) {
  return points.map((point) => ({
    key: point,
    label: PAIN_POINT_LABELS[point],
    ...PAIN_POINT_CONTENT[point],
  }));
}
