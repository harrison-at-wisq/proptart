'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { WidgetGroup } from '@/components/ui/WidgetGroup';
import type { WidgetItem } from '@/types/proposal';

interface TableOfContentsProps {
  heading?: string;
  onHeadingChange?: (value: string) => void;
  items?: WidgetItem[];
  onChange?: (items: WidgetItem[]) => void;
  darkTheme?: boolean;
}

export const TABLE_OF_CONTENTS_PLACEHOLDER = {
  heading: "What's Inside",
  items: [
    { id: '1', num: '01', title: 'Executive Summary', description: 'Strategic vision and key outcomes' },
    { id: '2', num: '02', title: 'Meet Harper', description: 'Your AI-powered HR assistant' },
    { id: '3', num: '03', title: 'Investment Case', description: 'ROI breakdown and payback timeline' },
    { id: '4', num: '04', title: 'Security & Integrations', description: 'Enterprise-grade compliance' },
    { id: '5', num: '05', title: 'Why Now', description: 'Cost of delay and momentum' },
    { id: '6', num: '06', title: 'Next Steps', description: 'Your path forward' },
  ] as WidgetItem[],
};

export function TableOfContents({
  heading = TABLE_OF_CONTENTS_PLACEHOLDER.heading,
  onHeadingChange,
  items = TABLE_OF_CONTENTS_PLACEHOLDER.items,
  onChange,
  darkTheme,
}: TableOfContentsProps) {
  const headingColor = darkTheme ? 'text-white' : '';
  const headingStyle = darkTheme ? undefined : { color: 'var(--theme-primary)' } as React.CSSProperties;
  const titleColor = darkTheme ? 'text-white' : 'text-gray-900';
  const descColor = darkTheme ? 'text-white/60' : 'text-gray-600';
  const borderColor = darkTheme ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)';

  const nextNum = () => {
    const max = items.reduce((m, item) => {
      const n = parseInt(item.num as string, 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    return String(max + 1).padStart(2, '0');
  };

  return (
    <div>
      {onHeadingChange ? (
        <DirectEditableText
          value={heading}
          onChange={onHeadingChange}
          as="div"
          className={`text-xs font-semibold tracking-widest uppercase mb-3 ${headingColor}`}
          style={headingStyle}
        />
      ) : (
        <div className={`text-xs font-semibold tracking-widest uppercase mb-3 ${headingColor}`} style={headingStyle}>
          {heading}
        </div>
      )}
      <WidgetGroup
        items={items}
        onChange={onChange || (() => {})}
        layout="grid-2"
        minItems={1}
        addLabel="Add section"
        createNewItem={() => ({ id: crypto.randomUUID(), num: nextNum(), title: 'New Section', description: 'Section description' })}
        renderItem={(item, index) => {
          const lastRowStart = items.length % 2 === 0 ? items.length - 2 : items.length - 1;
          const isLastRow = index >= lastRowStart;
          return (
            <div
              className="flex items-baseline gap-3 py-1.5"
              style={isLastRow ? undefined : { borderBottom: `1px solid ${borderColor}` }}
            >
              {onChange ? (
                <DirectEditableText
                  value={item.num as string}
                  onChange={(value) => onChange(items.map(i => i.id === item.id ? { ...i, num: value } : i))}
                  as="span"
                  className={`text-sm font-bold ${headingColor}`}
                  style={headingStyle}
                />
              ) : (
                <span className={`text-sm font-bold ${headingColor}`} style={headingStyle}>{item.num as string}</span>
              )}
              <div>
                {onChange ? (
                  <>
                    <DirectEditableText
                      value={item.title as string}
                      onChange={(value) => onChange(items.map(i => i.id === item.id ? { ...i, title: value } : i))}
                      as="span"
                      className={`text-sm font-semibold ${titleColor}`}
                    />
                    <DirectEditableText
                      value={item.description as string}
                      onChange={(value) => onChange(items.map(i => i.id === item.id ? { ...i, description: value } : i))}
                      as="span"
                      className={`text-xs ${descColor} ml-2`}
                    />
                  </>
                ) : (
                  <>
                    <span className={`text-sm font-semibold ${titleColor}`}>{item.title as string}</span>
                    <span className={`text-xs ${descColor} ml-2`}>{item.description as string}</span>
                  </>
                )}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
