'use client';

import React, { useState, useCallback } from 'react';
import {
  RFPAppendix,
  RFPQuestion,
  RFPAnswer,
  RFPCategory,
  RFP_CATEGORY_LABELS,
  UploadedDocument,
  CompanyInfo,
  AccountResearchResult,
} from '@/types/proposal';

interface RFPResponseSectionProps {
  appendix: RFPAppendix;
  uploadedDocuments: UploadedDocument[];
  company: CompanyInfo;
  accountResearch?: AccountResearchResult;
  onChange: (appendix: RFPAppendix) => void;
}

type ProcessingState = 'idle' | 'extracting' | 'generating';

export function RFPResponseSection({
  appendix,
  uploadedDocuments,
  company,
  accountResearch,
  onChange,
}: RFPResponseSectionProps) {
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionCategory, setNewQuestionCategory] = useState<RFPCategory>('other');
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  const handleToggleEnabled = useCallback(() => {
    onChange({ ...appendix, enabled: !appendix.enabled });
  }, [appendix, onChange]);

  const handleExtractQuestions = useCallback(async () => {
    if (uploadedDocuments.length === 0) return;

    setProcessingState('extracting');
    try {
      const response = await fetch('/api/extract-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: uploadedDocuments }),
      });

      if (!response.ok) throw new Error('Failed to extract questions');

      const data = await response.json();
      onChange({
        ...appendix,
        questions: data.questions,
        answers: [], // Clear any previous answers
      });
    } catch (error) {
      console.error('Extract questions error:', error);
    } finally {
      setProcessingState('idle');
    }
  }, [uploadedDocuments, appendix, onChange]);

  const handleGenerateAnswers = useCallback(async () => {
    if (appendix.questions.length === 0) return;

    setProcessingState('generating');
    try {
      const response = await fetch('/api/generate-rfp-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: appendix.questions,
          companyContext: {
            name: company.companyName,
            industry: company.industry,
          },
          accountResearch,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate answers');

      const data = await response.json();
      onChange({
        ...appendix,
        answers: data.answers,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Generate answers error:', error);
    } finally {
      setProcessingState('idle');
    }
  }, [appendix, company, accountResearch, onChange]);

  const handleToggleQuestion = useCallback((questionId: string) => {
    const updatedQuestions = appendix.questions.map(q =>
      q.id === questionId ? { ...q, included: !q.included } : q
    );
    onChange({ ...appendix, questions: updatedQuestions });
  }, [appendix, onChange]);

  const handleRemoveQuestion = useCallback((questionId: string) => {
    const updatedQuestions = appendix.questions.filter(q => q.id !== questionId);
    const updatedAnswers = appendix.answers.filter(a => a.questionId !== questionId);
    onChange({ ...appendix, questions: updatedQuestions, answers: updatedAnswers });
  }, [appendix, onChange]);

  const handleStartEditQuestion = useCallback((question: RFPQuestion) => {
    setEditingQuestionId(question.id);
    setEditText(question.originalText);
  }, []);

  const handleSaveQuestion = useCallback(() => {
    if (!editingQuestionId || !editText.trim()) return;
    const updatedQuestions = appendix.questions.map(q =>
      q.id === editingQuestionId ? { ...q, originalText: editText.trim() } : q
    );
    onChange({ ...appendix, questions: updatedQuestions });
    setEditingQuestionId(null);
    setEditText('');
  }, [editingQuestionId, editText, appendix, onChange]);

  const handleAddQuestion = useCallback(() => {
    if (!newQuestionText.trim()) return;
    const newQuestion: RFPQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      originalText: newQuestionText.trim(),
      category: newQuestionCategory,
      sourceFile: 'Manual',
      included: true,
    };
    onChange({
      ...appendix,
      questions: [...appendix.questions, newQuestion],
    });
    setNewQuestionText('');
    setShowAddQuestion(false);
  }, [newQuestionText, newQuestionCategory, appendix, onChange]);

  const handleStartEditAnswer = useCallback((answer: RFPAnswer) => {
    setEditingAnswerId(answer.questionId);
    setEditText(answer.answer);
  }, []);

  const handleSaveAnswer = useCallback(() => {
    if (!editingAnswerId) return;
    const updatedAnswers = appendix.answers.map(a =>
      a.questionId === editingAnswerId
        ? { ...a, answer: editText, source: 'user_edited' as const, needsReview: false }
        : a
    );
    onChange({ ...appendix, answers: updatedAnswers });
    setEditingAnswerId(null);
    setEditText('');
  }, [editingAnswerId, editText, appendix, onChange]);

  const getQuestion = (questionId: string) =>
    appendix.questions.find(q => q.id === questionId);

  const getAnswer = (questionId: string) =>
    appendix.answers.find(a => a.questionId === questionId);

  const includedCount = appendix.questions.filter(q => q.included).length;
  const needsManualCount = appendix.answers.filter(a => a.source === 'needs_manual').length;

  return (
    <div className="space-y-6">
      {/* Header with toggle */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">RFP Response Appendix</h3>
            <p className="text-sm text-gray-500 mt-1">
              Generate grounded answers to RFP questions from uploaded documents
            </p>
          </div>
          <button
            onClick={handleToggleEnabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              appendix.enabled ? 'bg-[#03143B]' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                appendix.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {appendix.enabled && (
        <>
          {/* Document status */}
          {uploadedDocuments.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h4 className="font-medium text-yellow-800">No documents uploaded</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Upload RFP/RFI documents in the AI Personalization tab to extract questions.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Questions Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      Extracted Questions ({appendix.questions.length})
                    </h4>
                    {appendix.questions.length > 0 && (
                      <p className="text-sm text-gray-500">
                        {includedCount} included, {appendix.questions.length - includedCount} excluded
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleExtractQuestions}
                    disabled={processingState !== 'idle'}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    {processingState === 'extracting' ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Extracting...
                      </span>
                    ) : appendix.questions.length > 0 ? 'Re-extract' : 'Extract Questions'}
                  </button>
                </div>

                {appendix.questions.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {appendix.questions.map((question) => (
                      <div
                        key={question.id}
                        className={`p-3 rounded-lg border ${
                          question.included
                            ? 'bg-white border-gray-200'
                            : 'bg-gray-50 border-gray-100 opacity-60'
                        }`}
                      >
                        {editingQuestionId === question.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveQuestion}
                                className="px-3 py-1 text-sm bg-[#03143B] text-white rounded hover:bg-[#03143B]/90"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingQuestionId(null)}
                                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleToggleQuestion(question.id)}
                              className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                question.included
                                  ? 'bg-[#03143B] border-[#03143B]'
                                  : 'border-gray-300'
                              }`}
                            >
                              {question.included && (
                                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12">
                                  <path fill="currentColor" d="M10.28 2.28L4.5 8.06 1.72 5.28a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l6.5-6.5a.75.75 0 00-1.06-1.06z" />
                                </svg>
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900">{question.originalText}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                  {RFP_CATEGORY_LABELS[question.category]}
                                </span>
                                <span className="text-xs text-gray-400">{question.sourceFile}</span>
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleStartEditQuestion(question)}
                                className="p-1 text-gray-400 hover:text-gray-600"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleRemoveQuestion(question.id)}
                                className="p-1 text-gray-400 hover:text-red-500"
                                title="Remove"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">
                    Click &quot;Extract Questions&quot; to find questions in your uploaded documents.
                  </p>
                )}

                {/* Add question manually */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {showAddQuestion ? (
                    <div className="space-y-3">
                      <textarea
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        placeholder="Enter a question..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        rows={2}
                      />
                      <div className="flex items-center gap-3">
                        <select
                          value={newQuestionCategory}
                          onChange={(e) => setNewQuestionCategory(e.target.value as RFPCategory)}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          {Object.entries(RFP_CATEGORY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleAddQuestion}
                          disabled={!newQuestionText.trim()}
                          className="px-4 py-2 text-sm bg-[#03143B] text-white rounded-lg hover:bg-[#03143B]/90 disabled:opacity-50"
                        >
                          Add Question
                        </button>
                        <button
                          onClick={() => { setShowAddQuestion(false); setNewQuestionText(''); }}
                          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddQuestion(true)}
                      className="text-sm text-[#03143B] hover:underline flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add question manually
                    </button>
                  )}
                </div>
              </div>

              {/* Generate Answers Button */}
              {appendix.questions.length > 0 && includedCount > 0 && (
                <div className="flex justify-center">
                  <button
                    onClick={handleGenerateAnswers}
                    disabled={processingState !== 'idle'}
                    className="px-6 py-3 bg-[#03143B] text-white rounded-lg hover:bg-[#03143B]/90 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {processingState === 'generating' ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Generating Answers...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Generate Answers ({includedCount} questions)
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Answers Section */}
              {appendix.answers.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">Generated Answers</h4>
                      <p className="text-sm text-gray-500">
                        {appendix.answers.filter(a => a.source === 'knowledge_base').length} KB matched,{' '}
                        {appendix.answers.filter(a => a.source === 'ai_generated').length} AI generated,{' '}
                        {needsManualCount} need manual input
                      </p>
                    </div>
                    {needsManualCount > 0 && (
                      <div className="px-3 py-1 bg-red-50 text-red-700 text-sm rounded-full">
                        {needsManualCount} need attention
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {appendix.answers.map((answer) => {
                      const question = getQuestion(answer.questionId);
                      if (!question) return null;

                      return (
                        <div
                          key={answer.questionId}
                          className={`p-4 rounded-lg border ${
                            answer.source === 'needs_manual'
                              ? 'border-red-200 bg-red-50'
                              : answer.needsReview
                              ? 'border-yellow-200 bg-yellow-50'
                              : 'border-green-200 bg-green-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 mb-2">
                                Q: {question.originalText}
                              </p>
                              {editingAnswerId === answer.questionId ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                                    rows={4}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={handleSaveAnswer}
                                      className="px-3 py-1 text-sm bg-[#03143B] text-white rounded hover:bg-[#03143B]/90"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingAnswerId(null)}
                                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-700">
                                  {answer.answer || (
                                    <span className="italic text-gray-400">
                                      No verified answer available. Please provide a response.
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                            {editingAnswerId !== answer.questionId && (
                              <button
                                onClick={() => handleStartEditAnswer(answer)}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded"
                                title="Edit Answer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            {answer.source === 'knowledge_base' && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                KB Match {Math.round(answer.confidence * 100)}%
                              </span>
                            )}
                            {answer.source === 'ai_generated' && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                AI Generated - Review
                              </span>
                            )}
                            {answer.source === 'user_edited' && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Edited
                              </span>
                            )}
                            {answer.source === 'needs_manual' && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Needs Manual Response
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {RFP_CATEGORY_LABELS[question.category]}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {appendix.generatedAt && (
                    <p className="text-xs text-gray-400 mt-4 text-right">
                      Generated at: {new Date(appendix.generatedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
