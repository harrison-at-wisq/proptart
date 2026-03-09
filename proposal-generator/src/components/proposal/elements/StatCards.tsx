'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { WidgetGroup } from '@/components/ui/WidgetGroup';
import type { WidgetItem } from '@/types/proposal';

interface StatCardsProps {
  items?: WidgetItem[];
  onChange?: (items: WidgetItem[]) => void;
  darkTheme?: boolean;
}

export const STAT_CARDS_PLACEHOLDER = {
  items: [
    { id: '1', stat: '94%', context: 'Accuracy rate' },
    { id: '2', stat: '<8 sec', context: 'Response time' },
    { id: '3', stat: '80%', context: 'Automation rate' },
  ] as WidgetItem[],
};

export function StatCards({ items = STAT_CARDS_PLACEHOLDER.items, onChange, darkTheme }: StatCardsProps) {
  const cardClass = darkTheme
    ? 'text-center p-4 bg-white/10 rounded-lg'
    : 'text-center p-4 bg-white border-2 rounded-lg';
  const cardStyle = darkTheme ? undefined : { borderColor: 'var(--theme-primary)' } as React.CSSProperties;

  const statColor = darkTheme ? 'text-white' : '';
  const statStyle = darkTheme ? undefined : { color: 'var(--theme-primary)' } as React.CSSProperties;
  const contextColor = darkTheme ? 'text-white/60' : 'text-gray-600';

  return (
    <WidgetGroup
      items={items}
      onChange={onChange || (() => {})}
      layout="grid-3"
      minItems={1}
      addLabel="Add stat"
      createNewItem={() => ({ id: crypto.randomUUID(), stat: '0%', context: 'New metric...' })}
      renderItem={(item) => (
        <div className={cardClass} style={cardStyle}>
          <DirectEditableText
            value={item.stat as string}
            onChange={(value) => {
              if (!onChange) return;
              onChange(items.map(s => s.id === item.id ? { ...s, stat: value } : s));
            }}
            as="div"
            className={`text-3xl font-bold ${statColor} mb-1`}
            style={statStyle}
          />
          <DirectEditableText
            value={item.context as string}
            onChange={(value) => {
              if (!onChange) return;
              onChange(items.map(s => s.id === item.id ? { ...s, context: value } : s));
            }}
            as="div"
            className={`text-xs ${contextColor}`}
          />
        </div>
      )}
    />
  );
}
