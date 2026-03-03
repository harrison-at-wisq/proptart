import type { ProposalElementType } from '@/types/proposal';

import { SectionHeading } from '../elements/SectionHeading';
import { SubHeading } from '../elements/SubHeading';
import { BodyText } from '../elements/BodyText';
import { VisionCallout } from '../elements/VisionCallout';
import { EyebrowLabel } from '../elements/EyebrowLabel';
import { MetricTable } from '../elements/MetricTable';
import { KPITiles } from '../elements/KPITiles';
import { StatCards } from '../elements/StatCards';
import { ProjectionPanel } from '../elements/ProjectionPanel';
import { AccentCardGrid } from '../elements/AccentCardGrid';
import { FeatureCardGrid } from '../elements/FeatureCardGrid';
import { TimelineCardGrid } from '../elements/TimelineCardGrid';
import { ValueDriverCards } from '../elements/ValueDriverCards';
import { BulletList } from '../elements/BulletList';
import { NumberedSteps } from '../elements/NumberedSteps';
import { CustomerQuote } from '../elements/CustomerQuote';
import { DividerLine } from '../elements/DividerLine';
import { FAQSection } from '../elements/FAQSection';
import { IntegrationPills } from '../elements/IntegrationPills';
import { ContactCard } from '../elements/ContactCard';
import { PageFooter } from '../elements/PageFooter';
import { CoverTitleBlock } from '../elements/CoverTitleBlock';
import { Spacer } from '../elements/Spacer';

/** Maps element type identifiers to their React components */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ELEMENT_REGISTRY: Record<ProposalElementType, React.ComponentType<any>> = {
  'section-heading': SectionHeading,
  'sub-heading': SubHeading,
  'body-text': BodyText,
  'vision-callout': VisionCallout,
  'eyebrow-label': EyebrowLabel,
  'metric-table': MetricTable,
  'kpi-tiles': KPITiles,
  'stat-cards': StatCards,
  'projection-panel': ProjectionPanel,
  'accent-card-grid': AccentCardGrid,
  'feature-card-grid': FeatureCardGrid,
  'timeline-card-grid': TimelineCardGrid,
  'value-driver-cards': ValueDriverCards,
  'bullet-list': BulletList,
  'numbered-steps': NumberedSteps,
  'customer-quote': CustomerQuote,
  'divider-line': DividerLine,
  'faq-section': FAQSection,
  'integration-pills': IntegrationPills,
  'contact-card': ContactCard,
  'page-footer': PageFooter,
  'cover-title-block': CoverTitleBlock,
  'spacer': Spacer,
};

/** Element metadata for the block inserter / element picker UI */
export interface ElementMeta {
  type: ProposalElementType;
  name: string;
  description: string;
  category: 'text' | 'data' | 'cards' | 'lists' | 'layout';
  defaultColSpan: number;
}

export const ELEMENT_CATALOG: ElementMeta[] = [
  // Text & Headings
  { type: 'section-heading', name: 'Section Heading', description: 'Large bold heading with bottom border', category: 'text', defaultColSpan: 12 },
  { type: 'sub-heading', name: 'Sub-Heading', description: 'Medium heading with optional top border', category: 'text', defaultColSpan: 12 },
  { type: 'body-text', name: 'Body Text', description: 'Editable paragraph text', category: 'text', defaultColSpan: 12 },
  { type: 'vision-callout', name: 'Vision Callout', description: 'Italic callout with left accent border', category: 'text', defaultColSpan: 7 },
  { type: 'eyebrow-label', name: 'Eyebrow Label', description: 'Small uppercase category label', category: 'text', defaultColSpan: 12 },

  // Data Display
  { type: 'metric-table', name: 'Metric Table', description: 'Label/value rows in a panel', category: 'data', defaultColSpan: 5 },
  { type: 'kpi-tiles', name: 'KPI Tiles', description: 'Row of highlighted stat tiles', category: 'data', defaultColSpan: 12 },
  { type: 'stat-cards', name: 'Stat Cards', description: 'Bordered cards with large numbers', category: 'data', defaultColSpan: 12 },
  { type: 'projection-panel', name: 'Projection Panel', description: 'Year-over-year projection display', category: 'data', defaultColSpan: 12 },

  // Cards & Grids
  { type: 'accent-card-grid', name: 'Accent Card Grid', description: '2-column cards with left accent border', category: 'cards', defaultColSpan: 12 },
  { type: 'feature-card-grid', name: 'Feature Card Grid', description: '3-column bordered feature cards', category: 'cards', defaultColSpan: 12 },
  { type: 'timeline-card-grid', name: 'Timeline Cards', description: '4-column phase cards with top accent', category: 'cards', defaultColSpan: 12 },
  { type: 'value-driver-cards', name: 'Value Driver Cards', description: 'Numbered cards with primary highlight', category: 'cards', defaultColSpan: 12 },

  // Lists
  { type: 'bullet-list', name: 'Bullet List', description: 'Bulleted list with dot markers', category: 'lists', defaultColSpan: 7 },
  { type: 'numbered-steps', name: 'Numbered Steps', description: 'Steps with circle number badges', category: 'lists', defaultColSpan: 12 },

  // Text (continued)
  { type: 'customer-quote', name: 'Customer Quote', description: 'Italic quote with attribution', category: 'text', defaultColSpan: 12 },
  { type: 'faq-section', name: 'FAQ Section', description: 'Question and answer pairs', category: 'text', defaultColSpan: 12 },
  { type: 'cover-title-block', name: 'Cover Title', description: 'Full cover page title area', category: 'text', defaultColSpan: 12 },

  // Cards (continued)
  { type: 'contact-card', name: 'Contact Card', description: 'Contact information panel', category: 'cards', defaultColSpan: 12 },
  { type: 'integration-pills', name: 'Integration Pills', description: 'Rounded badge pills', category: 'cards', defaultColSpan: 12 },

  // Layout
  { type: 'page-footer', name: 'Page Footer', description: 'Logo, date, and confidentiality', category: 'layout', defaultColSpan: 12 },
  { type: 'spacer', name: 'Spacer', description: 'Adjustable vertical space', category: 'layout', defaultColSpan: 12 },
  { type: 'divider-line', name: 'Divider Line', description: 'Navy accent bar', category: 'layout', defaultColSpan: 12 },
];
