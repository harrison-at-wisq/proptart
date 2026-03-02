'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProposalInputs, SavedProposal } from '@/types/proposal';
import { MOUInputs } from '@/types/mou';
import { ProposalListItemWithOwnership, DocumentType } from '@/types/database';

export interface ProposalWithOwnership extends SavedProposal {
  ownerEmail: string;
  isOwner: boolean;
  documentType: DocumentType;
}

export function useProposals() {
  const [proposals, setProposals] = useState<ProposalListItemWithOwnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/proposals');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch proposals');
      }
      const { proposals } = await res.json();
      setProposals(proposals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const createProposal = async (name?: string, documentType?: DocumentType): Promise<ProposalWithOwnership> => {
    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, document_type: documentType }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to create proposal');
    }
    const { proposal } = await res.json();
    await fetchProposals();
    return proposal;
  };

  const deleteProposal = async (id: string): Promise<void> => {
    const res = await fetch(`/api/proposals/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete proposal');
    }
    await fetchProposals();
  };

  const duplicateProposal = async (id: string): Promise<ProposalWithOwnership> => {
    // Fetch original
    const res = await fetch(`/api/proposals/${id}`);
    if (!res.ok) throw new Error('Failed to fetch proposal');
    const { proposal: original } = await res.json();

    // Create new with same name + (Copy), preserving document type
    const createRes = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${original.name} (Copy)`,
        document_type: original.documentType || 'proposal',
      }),
    });
    if (!createRes.ok) throw new Error('Failed to create duplicate');
    const { proposal: newProposal } = await createRes.json();

    // Update with original data
    const updateRes = await fetch(`/api/proposals/${newProposal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: original.data }),
    });
    if (!updateRes.ok) throw new Error('Failed to copy proposal data');

    await fetchProposals();
    const { proposal } = await updateRes.json();
    return proposal;
  };

  return {
    proposals,
    loading,
    error,
    createProposal,
    deleteProposal,
    duplicateProposal,
    refresh: fetchProposals,
  };
}

export function useProposal(id: string | null) {
  const [proposal, setProposal] = useState<ProposalWithOwnership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      setProposal(null);
      setLoading(false);
      return;
    }

    async function fetchProposal() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/proposals/${id}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch proposal');
        }
        const { proposal } = await res.json();
        setProposal({
          id: proposal.id,
          name: proposal.name,
          createdAt: proposal.createdAt,
          updatedAt: proposal.updatedAt,
          data: proposal.data as ProposalInputs,
          ownerEmail: proposal.ownerEmail,
          isOwner: proposal.isOwner,
          documentType: proposal.documentType || 'proposal',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchProposal();
  }, [id]);

  const updateProposal = useCallback(
    async (updates: { name?: string; data?: ProposalInputs | MOUInputs }) => {
      if (!id || !proposal?.isOwner) return;

      try {
        setIsSaving(true);
        const res = await fetch(`/api/proposals/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update proposal');
        }
        const { proposal: updated } = await res.json();
        setProposal((prev) =>
          prev
            ? {
                ...prev,
                name: updated.name,
                data: updated.data as ProposalInputs,
                updatedAt: updated.updatedAt,
              }
            : null
        );
      } finally {
        setIsSaving(false);
      }
    },
    [id, proposal?.isOwner]
  );

  return { proposal, loading, error, isSaving, updateProposal };
}
