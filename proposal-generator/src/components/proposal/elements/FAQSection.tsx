'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  title?: string;
  faqs?: FAQItem[];
  onUpdate?: (index: number, field: 'question' | 'answer', value: string) => void;
  darkTheme?: boolean;
}

export const FAQ_SECTION_PLACEHOLDER = {
  title: 'Anticipated Questions',
  faqs: [
    { question: 'What does the implementation process look like?', answer: 'Our structured 12-week program includes discovery, configuration, testing, and launch phases with dedicated support throughout.' },
    { question: 'How does this integrate with our existing systems?', answer: 'We offer pre-built connectors for major HCM, identity, and communication platforms with SSO and SCIM support.' },
  ],
};

export function FAQSection({
  title = FAQ_SECTION_PLACEHOLDER.title,
  faqs = FAQ_SECTION_PLACEHOLDER.faqs,
  onUpdate,
  darkTheme,
}: FAQSectionProps) {
  if (!faqs || faqs.length === 0) return null;

  const borderColor = darkTheme ? 'border-white/20' : 'border-gray-200';
  const titleColor = darkTheme ? 'text-white/70' : 'text-[#03143B]';
  const qColor = darkTheme ? 'text-white' : 'text-gray-900';
  const aColor = darkTheme ? 'text-white/70' : 'text-gray-600';
  const itemBorder = darkTheme ? 'border-white/30' : 'border-gray-200';

  return (
    <div className={`mt-8 pt-6 border-t ${borderColor}`}>
      <h4 className={`text-sm font-semibold mb-3 uppercase tracking-wide ${titleColor}`}>{title}</h4>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className={`pl-4 border-l-2 ${itemBorder}`}>
            {onUpdate ? (
              <>
                <DirectEditableText
                  value={faq.question}
                  onChange={(value) => onUpdate(i, 'question', value)}
                  as="p"
                  className={`font-medium text-sm ${qColor}`}
                />
                <DirectEditableText
                  value={faq.answer}
                  onChange={(value) => onUpdate(i, 'answer', value)}
                  as="p"
                  className={`text-sm mt-1 ${aColor}`}
                  multiline
                />
              </>
            ) : (
              <>
                <p className={`font-medium text-sm ${qColor}`}>{faq.question}</p>
                <p className={`text-sm mt-1 ${aColor}`}>{faq.answer}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
