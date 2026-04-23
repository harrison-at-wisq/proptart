import type { MicrositeData, MicrositeSection, MicrositeSectionType } from '@/types/microsite';
import type { ProposalInputs } from '@/types/proposal';

// Default section order matches the original hardcoded MicrositeDocument
// composition so existing microsites keep rendering identically.
export const DEFAULT_SECTION_TYPES: MicrositeSectionType[] = [
  'cover',
  'vision',
  'executive-summary',
  'harper',
  'value-drivers',
  'investment',
  'security',
  'why-now',
  'footer',
];

export function buildDefaultMicrositeSections(): MicrositeSection[] {
  return DEFAULT_SECTION_TYPES.map((sectionType) => ({
    id: cryptoRandomId(),
    sectionType,
  }));
}

// Read sections off MicrositeData, falling back to defaults for older rows
// that predate the layout schema. Pure — never mutates the input.
export function readMicrositeSections(data: ProposalInputs | MicrositeData | null | undefined): MicrositeSection[] {
  if (!data) return buildDefaultMicrositeSections();
  const layout = (data as MicrositeData)._layout;
  if (layout?.sections?.length) return layout.sections;
  return buildDefaultMicrositeSections();
}

// Write sections back into a MicrositeData payload immutably.
export function writeMicrositeSections(
  data: MicrositeData,
  sections: MicrositeSection[]
): MicrositeData {
  return {
    ...data,
    _layout: { ...(data._layout ?? {}), sections },
  };
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (unlikely in Next 15+).
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export { cryptoRandomId };
