'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ProposalDocument } from '@/components/proposal/ProposalDocument';
import { ProposalInputs, ProposalDocumentContent } from '@/types/proposal';
import { materializeDocumentContent } from '@/lib/materialize-content';

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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/proposals/${id}`, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load proposal: ${res.status}`);
        return res.json();
      })
      .then(json => {
        const data = json?.proposal?.data as ProposalInputs | undefined;
        if (!data) {
          // No proposal data at all — redirect to editor
          router.replace(`/p/${id}`);
          return;
        }

        // Lazy materialization: if documentContent doesn't exist yet, create it
        if (!data.documentContent) {
          const materialized = materializeDocumentContent(data);
          data.documentContent = materialized;
          // Save materialized content back to DB
          fetch(`/api/proposals/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data }),
          }).catch(err => console.error('Failed to save materialized content:', err));
        }

        setProposalData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, router]);

  const handleDocumentContentChange = useCallback((content: ProposalDocumentContent) => {
    setProposalData(prev => {
      if (!prev) return prev;
      return { ...prev, documentContent: content };
    });

    // Debounced save (500ms)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setProposalData(current => {
        if (!current) return current;
        fetch(`/api/proposals/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: current }),
        }).catch(err => console.error('Failed to save content changes:', err));
        return current;
      });
    }, 500);
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
      onDocumentContentChange={handleDocumentContentChange}
    />
  );
}
