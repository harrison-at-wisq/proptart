import type { ProposalInputs } from '@/types/proposal';

// Human-readable labels for the top-level ProposalInputs sections we surface
// in the Publish confirmation dialog. Keys not listed here still register as
// "other fields" so we never claim "no changes" when something differs.
const SECTION_LABELS: Record<string, string> = {
  pricing: 'Pricing',
  hrOperations: 'HR Operations',
  legalCompliance: 'Legal Compliance',
  employeeExperience: 'Employee Experience',
  integrations: 'Integrations',
  company: 'Company details',
  colorPalette: 'Color palette',
  generatedContent: 'Generated content',
  contentOverrides: 'Content overrides',
  documentContent: 'Document content',
  _layout: 'Page layout',
};

export interface MicrositeDiff {
  inSync: boolean;
  changedSections: string[];
}

export function diffMicrositeData(
  draft: ProposalInputs | null | undefined,
  published: ProposalInputs | null | undefined
): MicrositeDiff {
  if (!draft || !published) {
    return { inSync: false, changedSections: ['(no baseline)'] };
  }

  const draftRecord = draft as unknown as Record<string, unknown>;
  const publishedRecord = published as unknown as Record<string, unknown>;
  const keys = new Set<string>([...Object.keys(draftRecord), ...Object.keys(publishedRecord)]);

  const changedSections: string[] = [];
  for (const key of keys) {
    if (JSON.stringify(draftRecord[key]) !== JSON.stringify(publishedRecord[key])) {
      const label = SECTION_LABELS[key] ?? key;
      changedSections.push(label);
    }
  }

  return { inSync: changedSections.length === 0, changedSections };
}
