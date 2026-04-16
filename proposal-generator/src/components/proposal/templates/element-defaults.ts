import type { ProposalElementType } from '@/types/proposal';

import {
  SECTION_HEADING_PLACEHOLDER,
  SUB_HEADING_PLACEHOLDER,
  BODY_TEXT_PLACEHOLDER,
  VISION_CALLOUT_PLACEHOLDER,
  EYEBROW_LABEL_PLACEHOLDER,
  METRIC_TABLE_PLACEHOLDER,
  KPI_TILES_PLACEHOLDER,
  STAT_CARDS_PLACEHOLDER,
  PROJECTION_PANEL_PLACEHOLDER,
  ACCENT_CARD_GRID_PLACEHOLDER,
  FEATURE_CARD_GRID_PLACEHOLDER,
  TIMELINE_CARD_GRID_PLACEHOLDER,
  VALUE_DRIVER_CARDS_PLACEHOLDER,
  BULLET_LIST_PLACEHOLDER,
  NUMBERED_STEPS_PLACEHOLDER,
  CUSTOMER_QUOTE_PLACEHOLDER,
  FAQ_SECTION_PLACEHOLDER,
  INTEGRATION_PILLS_PLACEHOLDER,
  CONTACT_CARD_PLACEHOLDER,
  PAGE_FOOTER_PLACEHOLDER,
  COVER_TITLE_BLOCK_PLACEHOLDER,
  SPACER_PLACEHOLDER,
  PLACEHOLDER_PANEL_PLACEHOLDER,
  HARPER_PROFILE_PLACEHOLDER,
  ROI_PIE_CHART_PLACEHOLDER,
  ROI_BREAKDOWN_COLUMNS_PLACEHOLDER,
  COVER_IMAGE_PLACEHOLDER,
  TABLE_OF_CONTENTS_PLACEHOLDER,
  COVER_PREPARED_FOR_PLACEHOLDER,
} from '../elements';

/** Returns default data props for a given element type (using PLACEHOLDER constants) */
export function getDefaultElementData(elementType: ProposalElementType): Record<string, unknown> {
  switch (elementType) {
    case 'section-heading':
      return { text: SECTION_HEADING_PLACEHOLDER.text };
    case 'sub-heading':
      return { text: SUB_HEADING_PLACEHOLDER.text };
    case 'body-text':
      return { text: BODY_TEXT_PLACEHOLDER.text };
    case 'vision-callout':
      return { text: VISION_CALLOUT_PLACEHOLDER.text };
    case 'eyebrow-label':
      return { text: EYEBROW_LABEL_PLACEHOLDER.text };
    case 'metric-table':
      return { title: METRIC_TABLE_PLACEHOLDER.title, rows: METRIC_TABLE_PLACEHOLDER.rows };
    case 'kpi-tiles':
      return { tiles: KPI_TILES_PLACEHOLDER.tiles };
    case 'stat-cards':
      return { items: STAT_CARDS_PLACEHOLDER.items };
    case 'projection-panel':
      return { ...PROJECTION_PANEL_PLACEHOLDER };
    case 'accent-card-grid':
      return { items: ACCENT_CARD_GRID_PLACEHOLDER.items };
    case 'feature-card-grid':
      return { items: FEATURE_CARD_GRID_PLACEHOLDER.items };
    case 'timeline-card-grid':
      return { items: TIMELINE_CARD_GRID_PLACEHOLDER.items };
    case 'value-driver-cards':
      return { items: VALUE_DRIVER_CARDS_PLACEHOLDER.items };
    case 'bullet-list':
      return { items: BULLET_LIST_PLACEHOLDER.items };
    case 'numbered-steps':
      return { items: NUMBERED_STEPS_PLACEHOLDER.items };
    case 'customer-quote':
      return { text: CUSTOMER_QUOTE_PLACEHOLDER.text, attribution: CUSTOMER_QUOTE_PLACEHOLDER.attribution };
    case 'divider-line':
      return {};
    case 'faq-section':
      return { faqs: FAQ_SECTION_PLACEHOLDER.faqs };
    case 'integration-pills':
      return { integrations: INTEGRATION_PILLS_PLACEHOLDER.integrations };
    case 'contact-card':
      return { ...CONTACT_CARD_PLACEHOLDER };
    case 'page-footer':
      return { ...PAGE_FOOTER_PLACEHOLDER };
    case 'cover-title-block':
      return { title: COVER_TITLE_BLOCK_PLACEHOLDER.title };
    case 'cover-prepared-for':
      return { ...COVER_PREPARED_FOR_PLACEHOLDER };
    case 'spacer':
      return { height: SPACER_PLACEHOLDER.height };
    case 'placeholder-panel':
      return { label: PLACEHOLDER_PANEL_PLACEHOLDER.label, height: PLACEHOLDER_PANEL_PLACEHOLDER.height };
    case 'harper-profile':
      return {};
    case 'roi-pie-chart':
      return { slices: ROI_PIE_CHART_PLACEHOLDER.slices, title: ROI_PIE_CHART_PLACEHOLDER.title };
    case 'roi-breakdown-columns':
      return { columns: ROI_BREAKDOWN_COLUMNS_PLACEHOLDER.columns };
    case 'cover-image':
      return { src: COVER_IMAGE_PLACEHOLDER.src };
    case 'table-of-contents':
      return { heading: TABLE_OF_CONTENTS_PLACEHOLDER.heading, items: TABLE_OF_CONTENTS_PLACEHOLDER.items };
    default:
      return {};
  }
}

/**
 * Returns the primary editable data key and its value type for a given element type.
 * - `'text'` → single string onChange
 * - `'items'` → WidgetItem[] onChange
 * - `null` → no simple onChange binding (static or multi-field)
 */
export function getEditableDataKey(elementType: ProposalElementType): 'text' | 'items' | null {
  switch (elementType) {
    case 'body-text':
    case 'vision-callout':
    case 'section-heading':
    case 'sub-heading':
    case 'eyebrow-label':
      return 'text';
    case 'accent-card-grid':
    case 'feature-card-grid':
    case 'timeline-card-grid':
    case 'value-driver-cards':
    case 'bullet-list':
    case 'numbered-steps':
    case 'stat-cards':
    case 'table-of-contents':
      return 'items';
    default:
      return null;
  }
}
