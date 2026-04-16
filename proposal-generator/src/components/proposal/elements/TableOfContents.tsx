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
  alwaysEditable?: boolean;
}

export const TABLE_OF_CONTENTS_PLACEHOLDER = {
  heading: "What's Inside",
  items: [
    { id: '1', num: '01', title: 'Executive Summary' },
    { id: '2', num: '02', title: 'Meet Harper' },
    { id: '3', num: '03', title: 'Investment Case' },
    { id: '4', num: '04', title: 'Security & Integrations' },
    { id: '5', num: '05', title: 'Why Now' },
    { id: '6', num: '06', title: 'Next Steps' },
  ] as WidgetItem[],
};

export function TableOfContents({
  heading = TABLE_OF_CONTENTS_PLACEHOLDER.heading,
  onHeadingChange,
  items = TABLE_OF_CONTENTS_PLACEHOLDER.items,
  onChange,
  darkTheme,
  alwaysEditable = false,
}: TableOfContentsProps) {
  const headingColor = darkTheme ? 'text-white' : '';
  const headingStyle = darkTheme ? undefined : { color: 'var(--theme-primary)' } as React.CSSProperties;
  const titleColor = darkTheme ? 'text-white' : 'text-gray-900';
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
          alwaysEditable={alwaysEditable}
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
        alwaysEditable={alwaysEditable}
        createNewItem={() => ({ id: crypto.randomUUID(), num: nextNum(), title: 'New Section' })}
        renderItem={(item, index) => {
          return (
            <div
              className="flex items-baseline gap-3 py-1.5"
              style={{ borderBottom: `1px solid ${borderColor}` }}
            >
              {onChange ? (
                <DirectEditableText
                  value={item.num as string}
                  onChange={(value) => onChange(items.map(i => i.id === item.id ? { ...i, num: value } : i))}
                  as="span"
                  className={`text-sm font-bold ${headingColor}`}
                  style={headingStyle}
                  alwaysEditable={alwaysEditable}
                />
              ) : (
                <span className={`text-sm font-bold ${headingColor}`} style={headingStyle}>{item.num as string}</span>
              )}
              <div>
                {onChange ? (
                  <DirectEditableText
                    value={item.title as string}
                    onChange={(value) => onChange(items.map(i => i.id === item.id ? { ...i, title: value } : i))}
                    as="span"
                    className={`text-sm font-semibold ${titleColor}`}
                    alwaysEditable={alwaysEditable}
                  />
                ) : (
                  <span className={`text-sm font-semibold ${titleColor}`}>{item.title as string}</span>
                )}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
