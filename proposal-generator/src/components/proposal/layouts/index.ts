import type { SectionLayoutPreset } from '@/types/proposal';

/** Describes a layout preset with its column configuration */
export interface LayoutPresetInfo {
  id: SectionLayoutPreset;
  name: string;
  description: string;
  /** Default colSpan hints for each "slot" position */
  slots: number[];
}

export const LAYOUT_PRESETS: Record<SectionLayoutPreset, LayoutPresetInfo> = {
  'single-column': {
    id: 'single-column',
    name: 'Single Column',
    description: 'Full-width content stacked vertically',
    slots: [12],
  },
  'content-sidebar': {
    id: 'content-sidebar',
    name: 'Content + Sidebar',
    description: 'Main content left (7 cols), sidebar right (5 cols)',
    slots: [7, 5],
  },
  'equal-split': {
    id: 'equal-split',
    name: 'Equal Split',
    description: 'Two equal columns side by side',
    slots: [6, 6],
  },
  'hero-grid': {
    id: 'hero-grid',
    name: 'Hero + Grid',
    description: 'Full-width hero top, multi-column grid below',
    slots: [12, 4, 4, 4],
  },
  'two-col-bottom-banner': {
    id: 'two-col-bottom-banner',
    name: 'Two Columns + Bottom Banner',
    description: 'Two columns top, full-width section at bottom',
    slots: [6, 6, 12],
  },
};
