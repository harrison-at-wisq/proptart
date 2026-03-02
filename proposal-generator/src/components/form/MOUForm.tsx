'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MOUInputs, MOUGeneratedContent, DEFAULT_MOU_INPUTS } from '@/types/mou';
import { useProposal } from '@/lib/proposal-hooks';

interface MOUFormProps {
  proposalId: string;
}

export function MOUForm({ proposalId }: MOUFormProps) {
  const router = useRouter();
  const { proposal, loading, updateProposal } = useProposal(proposalId);
  const [inputs, setInputs] = useState<MOUInputs>(DEFAULT_MOU_INPUTS);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const inputsRef = React.useRef(inputs);
  inputsRef.current = inputs;

  // Load data from proposal
  useEffect(() => {
    if (proposal?.data) {
      const data = proposal.data as unknown as MOUInputs;
      if (data.company && 'callTranscripts' in data) {
        setInputs(data);
      }
    }
  }, [proposal]);

  // Auto-save on input changes (debounced)
  const scheduleAutoSave = (newInputs: MOUInputs) => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    const timer = setTimeout(() => {
      if (proposal?.isOwner) {
        updateProposal({ data: newInputs });
      }
    }, 1500);
    setAutoSaveTimer(timer);
  };

  // Save on browser close/refresh and tab switch
  useEffect(() => {
    const flushSave = () => {
      if (proposal?.isOwner) {
        fetch(`/api/proposals/${proposalId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: inputsRef.current }),
          keepalive: true,
        }).catch(() => {});
      }
    };
    const handleBeforeUnload = () => flushSave();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [proposalId, proposal?.isOwner]);

  // Explicit save for navigation
  const saveNow = async () => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    if (proposal?.isOwner) {
      await updateProposal({ data: inputsRef.current });
    }
  };

  const updateField = <K extends keyof MOUInputs>(key: K, value: MOUInputs[K]) => {
    const newInputs = { ...inputs, [key]: value };
    setInputs(newInputs);
    scheduleAutoSave(newInputs);
  };

  const updateCompany = (field: string, value: string) => {
    const newCompany = { ...inputs.company, [field]: value };
    const newInputs = { ...inputs, company: newCompany };
    setInputs(newInputs);
    scheduleAutoSave(newInputs);
  };

  const handleGenerate = async () => {
    if (!inputs.callTranscripts.trim()) {
      setError('Please paste a call transcript or meeting notes before generating.');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-mou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const { content } = await res.json() as { content: MOUGeneratedContent };
      const updatedInputs: MOUInputs = { ...inputs, generatedContent: content };
      setInputs(updatedInputs);

      // Save and advance to preview
      if (proposal?.isOwner) {
        await updateProposal({ data: updatedInputs });
      }

      router.push(`/mou/${proposalId}/assets`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate MOU content');
    } finally {
      setGenerating(false);
    }
  };

  // If there's already generated content, allow going straight to preview
  const handleViewPreview = () => {
    router.push(`/mou/${proposalId}/assets`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#03143B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading MOU...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={async () => { await saveNow(); router.push('/'); }}
              className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </button>
            <div className="h-5 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">MOU</span>
              <h1 className="text-lg font-semibold text-gray-900">
                {proposal?.name || 'New MOU'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {inputs.generatedContent && (
              <button
                onClick={handleViewPreview}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                View Preview
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Company & Contact */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Company & Contact</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={inputs.company.companyName}
                onChange={(e) => updateCompany('companyName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4d65ff] focus:border-transparent"
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <input
                type="text"
                value={inputs.company.industry}
                onChange={(e) => updateCompany('industry', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4d65ff] focus:border-transparent"
                placeholder="Technology"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={inputs.company.contactName}
                onChange={(e) => updateCompany('contactName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4d65ff] focus:border-transparent"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Title</label>
              <input
                type="text"
                value={inputs.company.contactTitle}
                onChange={(e) => updateCompany('contactTitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4d65ff] focus:border-transparent"
                placeholder="VP of People Operations"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={inputs.company.contactEmail}
                onChange={(e) => updateCompany('contactEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4d65ff] focus:border-transparent"
                placeholder="jane@acmecorp.com"
              />
            </div>
          </div>
        </section>

        {/* Transcript & Notes */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Call Transcript / Meeting Notes</h2>
          <p className="text-sm text-gray-500 mb-4">
            Paste your Gong transcript, Granola notes, or any meeting summary. The AI will synthesize the key themes, challenges, and opportunities discussed.
          </p>
          <textarea
            value={inputs.callTranscripts}
            onChange={(e) => updateField('callTranscripts', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4d65ff] focus:border-transparent font-mono text-sm"
            rows={12}
            placeholder="Paste your call transcript or meeting notes here..."
          />
          {inputs.callTranscripts && (
            <p className="text-xs text-gray-400 mt-1">
              {inputs.callTranscripts.length.toLocaleString()} characters
            </p>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sales Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Add any additional context, observations, or instructions for the AI.
            </p>
            <textarea
              value={inputs.salesNotes || ''}
              onChange={(e) => updateField('salesNotes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4d65ff] focus:border-transparent text-sm"
              rows={4}
              placeholder="e.g., They seemed most interested in compliance. Their current system is Workday. Budget decision likely in Q2..."
            />
          </div>
        </section>

        {/* Generate Button */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Generate MOU</h2>
              <p className="text-sm text-gray-500">
                AI will analyze the transcript and create a structured MOU with challenges, value alignment, and next steps.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || !inputs.callTranscripts.trim()}
              className="px-6 py-3 bg-[#4d65ff] text-white rounded-lg hover:bg-[#3d52cc] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : inputs.generatedContent ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerate
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate MOU
                </>
              )}
            </button>
          </div>

          {inputs.generatedContent && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-green-700 text-sm">
                  MOU content generated at {new Date(inputs.generatedContent.generatedAt).toLocaleString()}
                </p>
                <button
                  onClick={handleViewPreview}
                  className="text-green-700 hover:text-green-900 text-sm font-medium underline"
                >
                  View Preview &rarr;
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
