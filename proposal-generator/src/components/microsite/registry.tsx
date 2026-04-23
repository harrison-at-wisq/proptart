import React from 'react';
import type { MicrositeSection, MicrositeSectionType } from '@/types/microsite';
import type { ProposalInputs } from '@/types/proposal';

import { MicrositeCover } from './sections/MicrositeCover';
import { MicrositeVision } from './sections/MicrositeVision';
import { MicrositeExecutiveSummary } from './sections/MicrositeExecutiveSummary';
import { MicrositeHarper } from './sections/MicrositeHarper';
import { MicrositeValueDrivers } from './sections/MicrositeValueDrivers';
import { MicrositeInvestment } from './sections/MicrositeInvestment';
import { MicrositeSecurity } from './sections/MicrositeSecurity';
import { MicrositeWhyNow } from './sections/MicrositeWhyNow';
import { MicrositeFooter } from './sections/MicrositeFooter';

export interface MicrositeSectionRenderProps {
  inputs: ProposalInputs;
  section: MicrositeSection;
  onDataChange?: (data: Record<string, unknown>) => void;
}

type Renderer = (props: MicrositeSectionRenderProps) => React.ReactNode;

// Each section type maps to a thin renderer that adapts shared props onto
// whatever shape the underlying component expects. Keeping this in one
// place means SectionFrame / Editor never need to know section-specific
// prop names.
export const MICROSITE_SECTION_REGISTRY: Record<MicrositeSectionType, Renderer> = {
  cover: ({ inputs, section, onDataChange }) => (
    <MicrositeCover inputs={inputs} data={section.data} onDataChange={onDataChange} />
  ),
  vision: ({ inputs, section, onDataChange }) => (
    <MicrositeVision inputs={inputs} data={section.data} onDataChange={onDataChange} />
  ),
  'executive-summary': ({ inputs, section, onDataChange }) => (
    <MicrositeExecutiveSummary inputs={inputs} data={section.data} onDataChange={onDataChange} />
  ),
  harper: ({ inputs, section, onDataChange }) => (
    <MicrositeHarper inputs={inputs} data={section.data} onDataChange={onDataChange} />
  ),
  'value-drivers': ({ inputs, section, onDataChange }) => (
    <MicrositeValueDrivers inputs={inputs} data={section.data} onDataChange={onDataChange} />
  ),
  investment: ({ inputs, section, onDataChange }) => (
    <MicrositeInvestment inputs={inputs} data={section.data} onDataChange={onDataChange} />
  ),
  security: ({ inputs, section, onDataChange }) => (
    <MicrositeSecurity inputs={inputs} data={section.data} onDataChange={onDataChange} />
  ),
  'why-now': ({ inputs, section, onDataChange }) => (
    <MicrositeWhyNow inputs={inputs} data={section.data} onDataChange={onDataChange} />
  ),
  footer: ({ inputs }) => <MicrositeFooter customerLogoBase64={inputs.company.customerLogoBase64} />,
};

// Picker catalog — descriptive metadata the SectionPicker renders. More
// entries (text block, CTA row, stats grid, etc.) can be added here without
// changing the picker UI.
export interface MicrositeSectionCatalogEntry {
  type: MicrositeSectionType;
  name: string;
  description: string;
}

export const MICROSITE_SECTION_CATALOG: MicrositeSectionCatalogEntry[] = [
  { type: 'cover', name: 'Cover', description: 'Hero band with customer logo and headline' },
  { type: 'vision', name: 'Vision', description: 'Big-statement band that sets up the story' },
  { type: 'executive-summary', name: 'Executive Summary', description: 'High-level overview with key stats' },
  { type: 'harper', name: 'Harper', description: 'Pitch for the Harper agent experience' },
  { type: 'value-drivers', name: 'Value Drivers', description: 'Grid of value-driver cards' },
  { type: 'investment', name: 'Investment', description: 'Pricing, ROI, and investment case' },
  { type: 'security', name: 'Security', description: 'Security posture and compliance highlights' },
  { type: 'why-now', name: 'Why Now', description: 'Timing argument and momentum' },
  { type: 'footer', name: 'Footer', description: 'Logos and legal line' },
];
