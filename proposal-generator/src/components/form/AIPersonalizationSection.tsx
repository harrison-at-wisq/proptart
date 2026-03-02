'use client';

import React, { useState } from 'react';
import {
  AIPersonalizationInputs,
  UploadedDocument,
  GeneratedProposalContent,
  ProposalInputs,
} from '@/types/proposal';
import { DocumentUpload } from './DocumentUpload';

interface AIPersonalizationSectionProps {
  inputs: AIPersonalizationInputs;
  proposalInputs: ProposalInputs;
  onChange: (inputs: AIPersonalizationInputs) => void;
  onGenerate: (content: GeneratedProposalContent) => void;
}

type GenerationStep = 'idle' | 'researching' | 'generating' | 'complete' | 'error';

export function AIPersonalizationSection({
  inputs,
  proposalInputs,
  onChange,
  onGenerate,
}: AIPersonalizationSectionProps) {
  const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleDocumentsChange = (documents: UploadedDocument[]) => {
    onChange({ ...inputs, uploadedDocuments: documents });
  };

  const handleGenerate = async () => {
    setGenerationStep('researching');
    setError(null);

    try {
      // Step 1: Account research (if enabled)
      let accountResearch = undefined;
      if (inputs.enableAccountResearch && proposalInputs.company.companyName) {
        try {
          const researchResponse = await fetch('/api/research-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyName: proposalInputs.company.companyName,
              industry: proposalInputs.company.industry,
            }),
          });

          if (researchResponse.ok) {
            const researchData = await researchResponse.json();
            accountResearch = researchData.research;
          }
        } catch (e) {
          console.error('Research failed, continuing without:', e);
        }
      }

      // Step 2: Generate content
      setGenerationStep('generating');

      // Combine document content
      const documentContext = inputs.uploadedDocuments
        .map((doc) => `=== ${doc.name} ===\n${doc.content}`)
        .join('\n\n');

      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: proposalInputs,
          customInstructions: inputs.customInstructions,
          documentContext: documentContext || undefined,
          accountResearch,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const data = await response.json();

      if (data.success && data.content) {
        onGenerate(data.content);
        setGenerationStep('complete');
      } else {
        throw new Error('No content returned');
      }
    } catch (e) {
      console.error('Generation error:', e);
      setError(e instanceof Error ? e.message : 'Failed to generate content');
      setGenerationStep('error');
    }
  };

  const getStepLabel = () => {
    switch (generationStep) {
      case 'researching':
        return 'Researching account...';
      case 'generating':
        return 'Generating personalized content...';
      case 'complete':
        return 'Content generated!';
      case 'error':
        return 'Generation failed';
      default:
        return 'Ready to generate';
    }
  };

  return (
    <div className="space-y-6">
      {/* Custom Instructions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Personalization Instructions</h3>
        <p className="text-sm text-gray-500 mb-4">
          Provide context or specific guidance for personalizing this proposal
        </p>
        <textarea
          value={inputs.customInstructions}
          onChange={(e) => onChange({ ...inputs, customInstructions: e.target.value })}
          placeholder="e.g., Emphasize compliance and audit capabilities. They mentioned concerns about GDPR and data privacy. Focus on how we can help them scale their HR team without adding headcount..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03143B] resize-y"
        />
      </div>

      {/* Document Upload */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">RFI/RFP Documents</h3>
        <p className="text-sm text-gray-500 mb-4">
          Upload any RFI, RFP, or other documents from the prospect to help tailor the proposal
        </p>
        <DocumentUpload
          documents={inputs.uploadedDocuments}
          onDocumentsChange={handleDocumentsChange}
        />
      </div>

      {/* Account Research Toggle */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="enableResearch"
            checked={inputs.enableAccountResearch}
            onChange={(e) => onChange({ ...inputs, enableAccountResearch: e.target.checked })}
            className="mt-1 h-4 w-4 text-[#03143B] border-gray-300 rounded focus:ring-[#03143B]"
          />
          <div>
            <label htmlFor="enableResearch" className="text-lg font-semibold text-gray-900 cursor-pointer">
              Enable Account Research
            </label>
            <p className="text-sm text-gray-500 mt-1">
              Search the web for recent news and information about {proposalInputs.company.companyName || 'this company'} to personalize the proposal
            </p>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="bg-[#03143B]/5 rounded-lg p-6 border border-[#03143B]/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#03143B]">AI Content Generation</h3>
            <p className="text-sm text-gray-600 mt-1">{getStepLabel()}</p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generationStep === 'researching' || generationStep === 'generating'}
            className={`
              px-6 py-3 rounded-lg font-semibold transition-all
              ${generationStep === 'researching' || generationStep === 'generating'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#03143B] text-white hover:bg-[#03143B]/90'
              }
            `}
          >
            {generationStep === 'researching' || generationStep === 'generating' ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {generationStep === 'researching' ? 'Researching...' : 'Generating...'}
              </span>
            ) : generationStep === 'complete' ? (
              'Regenerate Content'
            ) : (
              'Generate with AI'
            )}
          </button>
        </div>

        {/* Progress indicator */}
        {(generationStep === 'researching' || generationStep === 'generating') && (
          <div className="mt-4">
            <div className="flex gap-2">
              <div className={`h-2 flex-1 rounded-full ${generationStep === 'researching' || generationStep === 'generating' ? 'bg-[#03143B]' : 'bg-gray-200'}`} />
              <div className={`h-2 flex-1 rounded-full ${generationStep === 'generating' ? 'bg-[#03143B]' : 'bg-gray-200'}`} />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Research</span>
              <span>Generate</span>
            </div>
          </div>
        )}

        {/* Success message */}
        {generationStep === 'complete' && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Content generated successfully! You can now generate the proposal and edit any text inline.
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
