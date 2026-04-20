import type {
  HROperationsInputs,
  LegalComplianceInputs,
  EmployeeExperienceInputs,
  PillarMode,
  PillarSimpleOverride,
  ProposalInputs,
} from '@/types/proposal';

export type PillarKey = 'hrOps' | 'legal' | 'ex';

export const PILLAR_LABELS: Record<PillarKey, string> = {
  hrOps: 'HR Operations',
  legal: 'Legal & Compliance',
  ex: 'Employee Experience',
};

type PillarLikeInputs = {
  mode?: PillarMode;
  simple?: PillarSimpleOverride;
};

/** A pillar is enabled when in detailed mode, OR when in simple mode with a non-zero amount. */
export function isPillarEnabled(inputs: PillarLikeInputs | undefined | null): boolean {
  if (!inputs) return true;
  if (!inputs.mode || inputs.mode === 'detailed') return true;
  return (inputs.simple?.flatAmount ?? 0) > 0;
}

export function getEnabledPillars(inputs: {
  hrOperations?: HROperationsInputs;
  legalCompliance?: LegalComplianceInputs;
  employeeExperience?: EmployeeExperienceInputs;
}): PillarKey[] {
  const keys: PillarKey[] = [];
  if (isPillarEnabled(inputs.hrOperations)) keys.push('hrOps');
  if (isPillarEnabled(inputs.legalCompliance)) keys.push('legal');
  if (isPillarEnabled(inputs.employeeExperience)) keys.push('ex');
  // Safety net: the UI blocks zeroing out the last pillar, but if we ever end up with
  // none enabled, fall back to all three so the Investment Case never renders empty.
  return keys.length > 0 ? keys : ['hrOps', 'legal', 'ex'];
}

export function getEnabledPillarsFromProposal(inputs: ProposalInputs): PillarKey[] {
  return getEnabledPillars({
    hrOperations: inputs.hrOperations,
    legalCompliance: inputs.legalCompliance,
    employeeExperience: inputs.employeeExperience,
  });
}

/** Format a list of pillar keys as English prose: "A", "A and B", "A, B, and C". */
export function formatPillarList(keys: PillarKey[]): string {
  const names = keys.map((k) => PILLAR_LABELS[k]);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

/** Tailwind grid-cols class for the given pillar count, responsive at md: breakpoint. */
export function pillarGridColsClass(count: number): string {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-1 md:grid-cols-2';
  return 'grid-cols-1 md:grid-cols-3';
}
