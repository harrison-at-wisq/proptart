'use client';

import React, { useMemo } from 'react';
import { ProposalInputs } from '@/types/proposal';
import type { MicrositeSection } from '@/types/microsite';
import { getThemeVars } from '@/lib/theme';
import { MicrositeNav } from './MicrositeNav';
import { MICROSITE_SECTION_REGISTRY } from './registry';
import { readMicrositeSections } from '@/lib/microsite-sections';
import { buildExportVariables } from '@/lib/export-variables';
import { ExportVariablesProvider } from '@/components/ui/ExportVariablesContext';
import './MicrositeDocument.css';

interface Props {
  inputs: ProposalInputs;
  sections?: MicrositeSection[];
  // When provided, each rendered section is wrapped so the studio can layer
  // on drag/reorder/delete affordances. /m/[slug] and /internal pass nothing
  // and get the plain render.
  renderSection?: (section: MicrositeSection, children: React.ReactNode) => React.ReactNode;
  // Studio uses this to persist per-section data edits (e.g. element-level
  // add/remove inside Value Drivers).
  onSectionDataChange?: (sectionId: string, data: Record<string, unknown>) => void;
}

export function MicrositeDocument({ inputs, sections, renderSection, onSectionDataChange }: Props) {
  const resolved = sections ?? readMicrositeSections(inputs);
  // Share the PDF editor's variable map so `{{paybackMonths}}`-style tokens
  // in any editable text field resolve the same way in /m/[slug], the studio,
  // and internal preview.
  const variables = useMemo(() => buildExportVariables(inputs), [inputs]);

  return (
    <ExportVariablesProvider value={variables}>
    <div
      className="min-h-screen bg-white font-[family-name:var(--font-geist-sans)]"
      style={getThemeVars(inputs.colorPalette)}
    >
      <MicrositeNav customerLogoBase64={inputs.company.customerLogoBase64} />
      {resolved.map((section) => {
        const renderer = MICROSITE_SECTION_REGISTRY[section.sectionType];
        if (!renderer) return null;
        const body = renderer({
          inputs,
          section,
          onDataChange: onSectionDataChange
            ? (data) => onSectionDataChange(section.id, data)
            : undefined,
        });
        if (renderSection) {
          return <React.Fragment key={section.id}>{renderSection(section, body)}</React.Fragment>;
        }
        return <React.Fragment key={section.id}>{body}</React.Fragment>;
      })}
    </div>
    </ExportVariablesProvider>
  );
}
