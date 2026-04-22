import type { ProposalElementType } from '@/types/proposal';
import { getEditableDataKey } from '@/components/proposal/templates/element-defaults';

/**
 * Shared on-change wiring for the proposal element editors.
 *
 * Both the main export editor (/p/[id]/export) and the per-asset editor
 * (/p/[id]/pdf/[slug]) must produce the SAME set of callbacks, or inline editing
 * will silently stop working for some elements on one page and not the other.
 * Centralise here so they can never drift apart again.
 *
 * The helper takes the element's stored data plus an `onUpdateData` setter and
 * returns a record of callbacks to spread onto the element component.
 */

interface ElementLike {
  elementType: ProposalElementType;
  data: Record<string, unknown>;
}

export function wireElementProps(
  element: ElementLike,
  onUpdateData: (data: Record<string, unknown>) => void,
): Record<string, unknown> {
  const data = element.data;
  const props: Record<string, unknown> = {};

  // Generic text/items wiring — these element types store their editable content under a single key
  const editableKey = getEditableDataKey(element.elementType);
  if (editableKey === 'text') {
    props.onChange = (value: string) => onUpdateData({ ...data, text: value });
  } else if (editableKey === 'items') {
    props.onChange = (items: unknown[]) => onUpdateData({ ...data, items });
  }

  // Array helpers
  const getArr = <T>(key: string): T[] => ([...((data[key] as T[]) || [])]);
  const setArr = <T>(key: string, arr: T[]) => onUpdateData({ ...data, [key]: arr });

  const updateItemField = <T extends Record<string, unknown>>(
    key: string,
    index: number,
    field: string,
    value: unknown,
  ) => {
    const arr = getArr<T>(key);
    arr[index] = { ...arr[index], [field]: value };
    setArr(key, arr);
  };

  const addItem = <T>(key: string, template: T) => {
    const arr = getArr<T>(key);
    arr.push(template);
    setArr(key, arr);
  };

  const removeItem = <T>(key: string, index: number) => {
    const arr = getArr<T>(key).filter((_, i) => i !== index);
    setArr(key, arr);
  };

  switch (element.elementType) {
    case 'cover-title-block':
      props.onEyebrowChange = (v: string) => onUpdateData({ ...data, eyebrow: v });
      props.onTitleChange = (v: string) => onUpdateData({ ...data, title: v });
      props.onQuoteChange = (v: string) => onUpdateData({ ...data, quote: v });
      props.onContactNameChange = (v: string) => onUpdateData({ ...data, contactName: v });
      props.onContactTitleChange = (v: string) => onUpdateData({ ...data, contactTitle: v });
      break;

    case 'cover-prepared-for':
      props.onContactNameChange = (v: string) => onUpdateData({ ...data, contactName: v });
      props.onContactTitleChange = (v: string) => onUpdateData({ ...data, contactTitle: v });
      break;

    case 'customer-quote':
      props.onTextChange = (v: string) => onUpdateData({ ...data, text: v });
      props.onAttributionChange = (v: string) => onUpdateData({ ...data, attribution: v });
      break;

    case 'contact-card':
      props.onPromptChange = (v: string) => onUpdateData({ ...data, prompt: v });
      props.onNameChange = (v: string) => onUpdateData({ ...data, name: v });
      props.onEmailChange = (v: string) => onUpdateData({ ...data, email: v });
      break;

    case 'metric-table':
      props.onTitleChange = (v: string) => onUpdateData({ ...data, title: v });
      props.onRowChange = (index: number, field: string, value: string) => {
        updateItemField('rows', index, field, value);
      };
      props.onAddRow = () => {
        addItem('rows', { label: 'New row', value: '$0' });
      };
      props.onRemoveRow = (index: number) => {
        removeItem('rows', index);
      };
      break;

    case 'kpi-tiles':
      props.onTileChange = (index: number, field: string, value: string) => {
        updateItemField('tiles', index, field, value);
      };
      props.onAddTile = () => {
        addItem('tiles', { value: '$0', label: 'New metric' });
      };
      props.onRemoveTile = (index: number) => {
        removeItem('tiles', index);
      };
      break;

    case 'projection-panel':
      props.onTitleChange = (v: string) => onUpdateData({ ...data, title: v });
      props.onColumnChange = (index: number, field: string, value: string) => {
        updateItemField('columns', index, field, value);
      };
      props.onAddColumn = () => {
        addItem('columns', { label: 'Year N', value: '$0' });
      };
      props.onRemoveColumn = (index: number) => {
        removeItem('columns', index);
      };
      break;

    case 'integration-pills':
      props.onTitleChange = (v: string) => onUpdateData({ ...data, title: v });
      props.onIntegrationChange = (index: number, field: string, value: string) => {
        updateItemField('integrations', index, field, value);
      };
      props.onAddIntegration = () => {
        addItem('integrations', { category: 'Category', name: 'Tool' });
      };
      props.onRemoveIntegration = (index: number) => {
        removeItem('integrations', index);
      };
      break;

    case 'roi-pie-chart':
      props.onTitleChange = (v: string) => onUpdateData({ ...data, title: v });
      props.onSliceChange = (index: number, field: string, value: string) => {
        updateItemField('slices', index, field, value);
      };
      props.onAddSlice = () => {
        addItem('slices', { label: 'New category', value: 1, formattedValue: '$0' });
      };
      props.onRemoveSlice = (index: number) => {
        removeItem('slices', index);
      };
      break;

    case 'roi-breakdown-columns':
      props.onColumnChange = (colIndex: number, field: string, value: string) => {
        updateItemField('columns', colIndex, field, value);
      };
      props.onItemChange = (colIndex: number, itemIndex: number, field: string, value: string) => {
        const columns = getArr<{ items: Array<Record<string, string>> } & Record<string, unknown>>('columns');
        const items = [...(columns[colIndex]?.items || [])];
        items[itemIndex] = { ...items[itemIndex], [field]: value };
        columns[colIndex] = { ...columns[colIndex], items };
        setArr('columns', columns);
      };
      props.onAddColumn = () => {
        addItem('columns', {
          title: 'New Category',
          total: '$0/yr',
          items: [{ label: 'New line item', value: '$0', explanation: 'Describe this value source' }],
        });
      };
      props.onRemoveColumn = (index: number) => {
        removeItem('columns', index);
      };
      props.onAddItem = (colIndex: number) => {
        const columns = getArr<{ items: Array<Record<string, string>> } & Record<string, unknown>>('columns');
        const items = [...(columns[colIndex]?.items || [])];
        items.push({ label: 'New line item', value: '$0', explanation: 'Describe this value source' });
        columns[colIndex] = { ...columns[colIndex], items };
        setArr('columns', columns);
      };
      props.onRemoveItem = (colIndex: number, itemIndex: number) => {
        const columns = getArr<{ items: Array<Record<string, string>> } & Record<string, unknown>>('columns');
        const items = (columns[colIndex]?.items || []).filter((_, i) => i !== itemIndex);
        columns[colIndex] = { ...columns[colIndex], items };
        setArr('columns', columns);
      };
      break;

    case 'faq-section':
      props.onUpdate = (index: number, field: string, value: string) => {
        updateItemField('faqs', index, field, value);
      };
      props.onAdd = () => {
        addItem('faqs', { question: 'New question?', answer: 'Answer here...' });
      };
      props.onRemove = (index: number) => {
        removeItem('faqs', index);
      };
      break;

    case 'cover-image':
      props.onSrcChange = (v: string) => onUpdateData({ ...data, src: v });
      props.onMaxHeightChange = (v: number) => onUpdateData({ ...data, maxHeight: v });
      break;

    case 'table-of-contents':
      props.onHeadingChange = (v: string) => onUpdateData({ ...data, heading: v });
      break;

    case 'spacer':
      props.onHeightChange = (h: number) => onUpdateData({ ...data, height: h });
      break;

    case 'page-footer':
      props.onSiteUrlChange = (v: string) => onUpdateData({ ...data, siteUrl: v });
      props.onDateChange = (v: string) => onUpdateData({ ...data, date: v });
      props.onConfidentialTextChange = (v: string) => onUpdateData({ ...data, confidentialText: v });
      break;

    case 'placeholder-panel':
      props.onLabelChange = (v: string) => onUpdateData({ ...data, label: v });
      break;

    // No-op editable (or no text content):
    // section-heading, sub-heading, body-text, vision-callout, eyebrow-label → handled by editableKey='text'
    // accent-card-grid, feature-card-grid, timeline-card-grid, value-driver-cards,
    //   bullet-list, numbered-steps, stat-cards, table-of-contents items → handled by editableKey='items'
    // divider-line, harper-profile → no editable text
  }

  return props;
}
