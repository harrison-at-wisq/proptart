import { QuoteSection } from '@/types/proposal';

export interface CustomerQuote {
  id: string;
  text: string;
  attribution: string;
  section: QuoteSection;
  theme: string;
}

export const CUSTOMER_QUOTES: CustomerQuote[] = [
  // ===== EXECUTIVE SUMMARY =====
  {
    id: 'q-exec-01',
    text: 'I\'ve had the opportunity to see Wisq develop from an AI concept into a strategic investment that drives operational excellence. By automating routine HR functions, we\'ve shifted our organization toward higher-value priorities while enhancing the employee experience. We\'re seeing this impact firsthand. This allows us to deploy our human capital where it creates the most business impact.',
    attribution: 'Chief Human Resources Officer, Financial Services Technology',
    section: 'executive-summary',
    theme: 'Strategic Vision',
  },

  // ===== MEET HARPER =====
  {
    id: 'q-harper-01',
    text: 'What impressed me most about Wisq wasn\'t just the technology \u2014 it was the partnership. They took the time to understand the complexity of our business, from FAA-regulated pilot policies to the distinct needs of each job role across our operation. Harper doesn\'t just answer questions; she handles every request with the level of professionalism and care we expect from our HR team.',
    attribution: 'Manager, Team Member Experience, Airline Industry',
    section: 'meet-harper',
    theme: 'Partnership & Quality',
  },
  {
    id: 'q-harper-02',
    text: 'We have employees in Seattle, Las Vegas, the Philippines, and remote, each with different policies and needs. Harper understands that context. An employee in Cebu gets Philippines-specific support; someone in Seattle gets exactly the support they need. We love that we can rely on Harper for that.',
    attribution: 'Director, Project Management Office, Global Operations',
    section: 'meet-harper',
    theme: 'Context Awareness',
  },

  // ===== VALUE DRIVERS =====
  {
    id: 'q-value-01',
    text: 'Within months of rolling out Wisq, we saw a 40% reduction in cases going to our Employee Relations team. Our managers tell us it saves them time and helps them be more effective leaders. When you\'re supporting 7,500 employees \u2014 most of them in the field without desk access \u2014 those numbers matter.',
    attribution: 'Vice President of Human Resources, Beverage Distribution',
    section: 'value-drivers',
    theme: 'Measurable Impact',
  },
];

export const QUOTE_SECTION_LABELS: Record<QuoteSection, string> = {
  'executive-summary': 'Executive Summary',
  'current-state': 'Current Challenges',
  'meet-harper': 'Meet Harper',
  'value-drivers': 'Value Drivers',
  'investment': 'Investment Case',
  'security': 'Security & Integration',
  'why-now': 'Why Now & Next Steps',
};

export const QUOTE_SECTIONS_ORDER: QuoteSection[] = [
  'executive-summary',
  'current-state',
  'meet-harper',
  'value-drivers',
  'investment',
  'security',
  'why-now',
];

export function getQuotesBySection(section: QuoteSection): CustomerQuote[] {
  return CUSTOMER_QUOTES.filter(q => q.section === section);
}

export function getQuoteById(id: string): CustomerQuote | undefined {
  return CUSTOMER_QUOTES.find(q => q.id === id);
}

export function getSelectedQuoteForSection(
  selectedQuoteIds: string[],
  section: QuoteSection
): CustomerQuote | undefined {
  for (const id of selectedQuoteIds) {
    const quote = getQuoteById(id);
    if (quote && quote.section === section) return quote;
  }
  return undefined;
}
