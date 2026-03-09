'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { useLayoutMode } from '@/components/ui/LayoutModeContext';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  title?: string;
  faqs?: FAQItem[];
  onUpdate?: (index: number, field: 'question' | 'answer', value: string) => void;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
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
  onAdd,
  onRemove,
  darkTheme,
}: FAQSectionProps) {
  const { layoutMode } = useLayoutMode();

  if (!faqs || faqs.length === 0) {
    if (layoutMode && onAdd) {
      return (
        <div className={`pt-4 border-t ${darkTheme ? 'border-white/20' : 'border-gray-200'}`}>
          <h4 className={`text-sm font-semibold mb-3 uppercase tracking-wide ${darkTheme ? 'text-white/70' : ''}`} style={darkTheme ? undefined : { color: 'var(--theme-primary)' }}>{title}</h4>
          <button
            onClick={onAdd}
            className={`flex items-center gap-2 text-sm transition-colors print:hidden ${darkTheme ? 'text-white/40 hover:text-white/70' : ''}`}
            style={darkTheme ? undefined : { color: 'rgba(var(--theme-primary-rgb), 0.5)' }}
          >
            <span className="w-6 h-6 border border-dashed border-current rounded flex items-center justify-center text-lg leading-none">+</span>
            Add FAQ
          </button>
        </div>
      );
    }
    return null;
  }

  const borderColor = darkTheme ? 'border-white/20' : 'border-gray-200';
  const titleColor = darkTheme ? 'text-white/70' : '';
  const titleStyle = darkTheme ? undefined : { color: 'var(--theme-primary)' } as React.CSSProperties;
  const qColor = darkTheme ? 'text-white' : 'text-gray-900';
  const aColor = darkTheme ? 'text-white/70' : 'text-gray-600';
  const itemBorder = darkTheme ? 'border-white/30' : 'border-gray-200';

  return (
    <div className={`pt-4 border-t ${borderColor}`}>
      <h4 className={`text-sm font-semibold mb-3 uppercase tracking-wide ${titleColor}`} style={titleStyle}>{title}</h4>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className={`pl-4 border-l-2 ${itemBorder} relative group`}>
            {layoutMode && onRemove && faqs.length > 1 && (
              <button
                onClick={() => onRemove(i)}
                className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-red-50 border border-red-200 rounded flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                title="Remove FAQ"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
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
      {layoutMode && onAdd && (
        <button
          onClick={onAdd}
          className={`mt-3 flex items-center gap-2 text-sm transition-colors print:hidden ${darkTheme ? 'text-white/40 hover:text-white/70' : ''}`}
          style={darkTheme ? undefined : { color: 'rgba(var(--theme-primary-rgb), 0.5)' }}
        >
          <span className="w-6 h-6 border border-dashed border-current rounded flex items-center justify-center text-lg leading-none">+</span>
          Add FAQ
        </button>
      )}
    </div>
  );
}
