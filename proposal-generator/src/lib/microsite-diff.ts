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

// ── Input drift: microsite snapshot vs the live proposal ────────────────────
// The microsite renders from its own snapshot of the proposal inputs (stored in
// draft_data). When the underlying proposal changes, the snapshot goes stale
// until "Sync input changes" pulls the latest. This diff powers that button:
// it reports field-level changes between the snapshot and the current proposal,
// ignoring `_layout` (studio structure lives there and is never overwritten).

const LAYOUT_KEY = '_layout';
const MAX_FIELD_CHANGES = 60;

export interface FieldChange {
  section: string; // human label, e.g. "HR Operations"
  path: string; // dotted path within the section, e.g. "tier01CasesPerYear"
  before: string; // snapshot (current microsite) value
  after: string; // proposal (incoming) value
}

export interface InputsDiff {
  inSync: boolean;
  changedSections: string[];
  changes: FieldChange[];
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function formatLeaf(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return v.toLocaleString('en-US');
  if (typeof v === 'boolean') return v ? 'on' : 'off';
  if (typeof v === 'string') return v.length > 48 ? `${v.slice(0, 48)}…` : v || '""';
  const s = JSON.stringify(v);
  return s.length > 48 ? `${s.slice(0, 48)}…` : s;
}

type LeafChange = { path: string; before: string; after: string };

function collectLeafChanges(
  before: unknown,
  after: unknown,
  prefix: string,
  out: LeafChange[]
): void {
  if (out.length >= MAX_FIELD_CHANGES) return;
  if (JSON.stringify(before) === JSON.stringify(after)) return;

  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const k of keys) {
      collectLeafChanges(before[k], after[k], prefix ? `${prefix}.${k}` : k, out);
      if (out.length >= MAX_FIELD_CHANGES) return;
    }
    return;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const len = Math.max(before.length, after.length);
    for (let i = 0; i < len; i++) {
      collectLeafChanges(before[i], after[i], `${prefix}[${i + 1}]`, out);
      if (out.length >= MAX_FIELD_CHANGES) return;
    }
    return;
  }

  // Leaf (or a type mismatch we don't recurse into) — record before → after.
  out.push({ path: prefix || '(value)', before: formatLeaf(before), after: formatLeaf(after) });
}

export function diffInputFields(
  snapshot: ProposalInputs | null | undefined,
  current: ProposalInputs | null | undefined
): InputsDiff {
  if (!snapshot || !current) {
    return { inSync: true, changedSections: [], changes: [] };
  }

  const snap = snapshot as unknown as Record<string, unknown>;
  const cur = current as unknown as Record<string, unknown>;
  const keys = new Set<string>(
    [...Object.keys(snap), ...Object.keys(cur)].filter((k) => k !== LAYOUT_KEY)
  );

  const changedSections: string[] = [];
  const changes: FieldChange[] = [];

  for (const key of keys) {
    if (JSON.stringify(snap[key]) === JSON.stringify(cur[key])) continue;
    const label = SECTION_LABELS[key] ?? key;
    changedSections.push(label);
    const leaves: LeafChange[] = [];
    collectLeafChanges(snap[key], cur[key], '', leaves);
    for (const leaf of leaves) {
      changes.push({ section: label, path: leaf.path, before: leaf.before, after: leaf.after });
    }
  }

  return { inSync: changedSections.length === 0, changedSections, changes };
}
