'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProposalDocument } from '@/components/proposal/ProposalDocument';
import { ProposalInputs, ProposalContentOverrides } from '@/types/proposal';

export default function ProposalAssetsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [proposalData, setProposalData] = useState<ProposalInputs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/proposals/${id}`, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load proposal: ${res.status}`);
        return res.json();
      })
      .then(json => {
        const data = json?.proposal?.data as ProposalInputs | undefined;
        if (!data?.generatedContent) {
          // No generated content — redirect to editor
          router.replace(`/p/${id}`);
          return;
        }
        setProposalData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, router]);

  const handleContentChange = useCallback((overrides: ProposalContentOverrides) => {
    setProposalData(prev => {
      if (!prev) return prev;
      const updated = { ...prev, contentOverrides: overrides };
      // Save overrides to API
      fetch(`/api/proposals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updated }),
      }).catch(err => console.error('Failed to save content changes:', err));
      return updated;
    });
  }, [id]);

  const handleClose = () => {
    router.push(`/p/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#03143B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading proposal assets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.push(`/p/${id}`)}
            className="px-4 py-2 bg-[#03143B] text-white rounded-lg hover:bg-[#03143B]/90"
          >
            Back to Editor
          </button>
        </div>
      </div>
    );
  }

  if (!proposalData) return null;

  return (
    <ProposalDocument
      inputs={proposalData}
      proposalId={id}
      onClose={handleClose}
      onContentChange={handleContentChange}
    />
  );
}
