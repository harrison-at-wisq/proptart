'use client';

import React from 'react';
import { RFPAppendix as RFPAppendixType, RFPCategory, RFP_CATEGORY_LABELS } from '@/types/proposal';

interface RFPAppendixProps {
  appendix: RFPAppendixType;
  onAnswerChange?: (questionId: string, newAnswer: string) => void;
}

export function RFPAppendix({ appendix, onAnswerChange }: RFPAppendixProps) {
  if (!appendix.enabled || appendix.answers.length === 0) {
    return null;
  }

  // Group answers by category
  const questionMap = new Map(appendix.questions.map(q => [q.id, q]));

  const answersByCategory = appendix.answers.reduce((acc, answer) => {
    const question = questionMap.get(answer.questionId);
    if (!question || !question.included) return acc;

    const category = question.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ question, answer });
    return acc;
  }, {} as Record<RFPCategory, Array<{ question: typeof appendix.questions[0]; answer: typeof appendix.answers[0] }>>);

  // Sort categories for display
  const categoryOrder: RFPCategory[] = [
    'security', 'compliance', 'data_protection', 'access_control',
    'ai', 'integration', 'implementation', 'support', 'pricing',
    'company', 'other'
  ];

  const sortedCategories = Object.keys(answersByCategory)
    .sort((a, b) => categoryOrder.indexOf(a as RFPCategory) - categoryOrder.indexOf(b as RFPCategory)) as RFPCategory[];

  return (
    <section className="page bg-white p-8 break-before-page">
      {/* Appendix Header */}
      <div className="mb-8 pb-4 border-b-2 border-[#03143B]">
        <h1 className="text-3xl font-bold text-[#03143B] mb-2">Appendix: RFP Response</h1>
        <p className="text-gray-600">
          Detailed responses to {appendix.answers.filter(a => questionMap.get(a.questionId)?.included).length} questions
        </p>
      </div>

      {/* Q&A by Category */}
      <div className="space-y-8">
        {sortedCategories.map((category) => {
          const items = answersByCategory[category];
          if (!items || items.length === 0) return null;

          return (
            <div key={category}>
              <h2 className="text-xl font-bold text-[#03143B] mb-4 pb-2 border-b border-gray-200">
                {RFP_CATEGORY_LABELS[category]}
              </h2>

              <div className="space-y-6">
                {items.map(({ question, answer }, index) => (
                  <div key={question.id} className="pl-4 border-l-2 border-gray-200">
                    <div className="mb-2">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Q{index + 1}
                      </span>
                      <p className="text-gray-900 font-medium">
                        {question.originalText}
                      </p>
                    </div>
                    <div>
                      {onAnswerChange ? (
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => onAnswerChange(question.id, e.currentTarget.textContent || '')}
                          className="text-gray-700 text-sm leading-relaxed outline-none hover:bg-gray-50 p-1 -m-1 rounded"
                        >
                          {answer.answer || '[Answer required]'}
                        </div>
                      ) : (
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {answer.answer || '[Answer required]'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500">
        <p>Wisq RFP Response Appendix</p>
        {appendix.generatedAt && (
          <p>Generated: {new Date(appendix.generatedAt).toLocaleDateString()}</p>
        )}
      </div>
    </section>
  );
}
