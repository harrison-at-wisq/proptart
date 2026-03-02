'use client';

import { ProposalInputs } from '@/types/proposal';

const STORAGE_KEY = 'prop-tart-proposals';
const MIGRATION_COMPLETE_KEY = 'prop-tart-migration-complete';

export interface LegacyProposal {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: ProposalInputs;
}

export function hasLegacyProposals(): boolean {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem(MIGRATION_COMPLETE_KEY)) return false;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return false;

  try {
    const { proposals } = JSON.parse(stored);
    return Array.isArray(proposals) && proposals.length > 0;
  } catch {
    return false;
  }
}

export function getLegacyProposals(): LegacyProposal[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  try {
    const { proposals } = JSON.parse(stored);
    return proposals || [];
  } catch {
    return [];
  }
}

export function getLegacyProposalCount(): number {
  return getLegacyProposals().length;
}

export async function migrateProposals(): Promise<{ success: number; failed: number }> {
  const proposals = getLegacyProposals();
  let success = 0;
  let failed = 0;

  for (const proposal of proposals) {
    try {
      // Create new proposal with the same name
      const createRes = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: proposal.name }),
      });

      if (!createRes.ok) {
        failed++;
        continue;
      }

      const { proposal: newProposal } = await createRes.json();

      // Update with the original data
      const updateRes = await fetch(`/api/proposals/${newProposal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: proposal.data }),
      });

      if (updateRes.ok) {
        success++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  // Mark migration complete
  if (typeof window !== 'undefined') {
    localStorage.setItem(MIGRATION_COMPLETE_KEY, 'true');
  }

  return { success, failed };
}

export function clearLegacyProposals(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function resetMigrationFlag(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MIGRATION_COMPLETE_KEY);
}
