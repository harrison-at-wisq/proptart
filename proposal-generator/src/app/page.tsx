'use client';

import { useState, useCallback } from 'react';
import { ProposalForm } from '@/components/form/ProposalForm';
import { ProposalDocument } from '@/components/proposal/ProposalDocument';
import { ProposalDashboard } from '@/components/dashboard/ProposalDashboard';
import { MOUForm } from '@/components/form/MOUForm';
import { MOUDocument } from '@/components/mou/MOUDocument';
import { ProposalInputs, ProposalContentOverrides } from '@/types/proposal';
import { MOUInputs, MOUContentOverrides } from '@/types/mou';
import { DocumentType } from '@/types/database';

type View = 'dashboard' | 'editor' | 'document';

export default function Home() {
  const [view, setView] = useState<View>('dashboard');
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('proposal');
  const [proposalData, setProposalData] = useState<ProposalInputs | null>(null);
  const [mouData, setMouData] = useState<MOUInputs | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleOpenProposal = (id: string, docType?: DocumentType) => {
    setActiveProposalId(id);
    setDocumentType(docType || 'proposal');
    setView('editor');
  };

  const handleBackToDashboard = () => {
    setActiveProposalId(null);
    setProposalData(null);
    setMouData(null);
    setView('dashboard');
  };

  // Proposal submit
  const handleSubmit = async (inputs: ProposalInputs) => {
    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setProposalData(inputs);
    setIsGenerating(false);
    setView('document');
  };

  // MOU submit
  const handleMOUSubmit = (inputs: MOUInputs) => {
    setMouData(inputs);
    setView('document');
  };

  const handleCloseDocument = () => {
    setProposalData(null);
    setMouData(null);
    setView('editor');
  };

  // Handle content override changes from inline editing (proposals)
  const handleContentChange = useCallback((overrides: ProposalContentOverrides) => {
    setProposalData(prev => {
      if (!prev) return prev;
      const updated = { ...prev, contentOverrides: overrides };

      if (activeProposalId) {
        fetch(`/api/proposals/${activeProposalId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: updated }),
        }).catch(err => console.error('Failed to save content changes:', err));
      }

      return updated;
    });
  }, [activeProposalId]);

  // Handle MOU content override changes
  const handleMOUContentChange = useCallback((overrides: MOUContentOverrides) => {
    setMouData(prev => {
      if (!prev) return prev;
      const updated = { ...prev, contentOverrides: overrides };

      if (activeProposalId) {
        fetch(`/api/proposals/${activeProposalId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: updated }),
        }).catch(err => console.error('Failed to save MOU content changes:', err));
      }

      return updated;
    });
  }, [activeProposalId]);

  // Show dashboard
  if (view === 'dashboard') {
    return <ProposalDashboard onOpenProposal={handleOpenProposal} />;
  }

  // Render form and document together — form stays mounted (hidden) during
  // document view so all tab inputs and scroll position are preserved.
  return (
    <>
      {view === 'document' && (
        documentType === 'mou' && mouData ? (
          <MOUDocument
            inputs={mouData}
            proposalId={activeProposalId}
            onClose={handleCloseDocument}
            onContentChange={handleMOUContentChange}
          />
        ) : proposalData ? (
          <ProposalDocument
            inputs={proposalData}
            proposalId={activeProposalId}
            onClose={handleCloseDocument}
            onContentChange={handleContentChange}
          />
        ) : null
      )}

      <div style={{ display: view === 'document' ? 'none' : undefined }}>
        {documentType === 'mou' ? (
          <MOUForm
            proposalId={activeProposalId}
            onSubmit={handleMOUSubmit}
            onBack={handleBackToDashboard}
            isGenerating={isGenerating}
          />
        ) : (
          <ProposalForm
            proposalId={activeProposalId}
            onSubmit={handleSubmit}
            onBack={handleBackToDashboard}
            isGenerating={isGenerating}
          />
        )}
      </div>
    </>
  );
}
