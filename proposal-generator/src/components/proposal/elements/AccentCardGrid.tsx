'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { WidgetGroup } from '@/components/ui/WidgetGroup';
import type { WidgetItem } from '@/types/proposal';

interface AccentCardGridProps {
  items?: WidgetItem[];
  onChange?: (items: WidgetItem[]) => void;
  darkTheme?: boolean;
}

export const ACCENT_CARD_GRID_PLACEHOLDER = {
  items: [
    { id: '1', headline: 'Key Challenge', description: 'Describe the specific business impact and urgency of this challenge.' },
    { id: '2', headline: 'Critical Gap', description: 'Explain how this gap affects operations, compliance, or employee experience.' },
  ] as WidgetItem[],
};

export function AccentCardGrid({ items = ACCENT_CARD_GRID_PLACEHOLDER.items, onChange, darkTheme }: AccentCardGridProps) {
  const cardClass = darkTheme
    ? 'p-4 bg-white/10 border-l-4 border-white/50'
    : 'p-4 bg-white border-l-4 shadow-sm';
  const cardStyle = darkTheme ? undefined : { borderColor: 'var(--theme-primary)' } as React.CSSProperties;
  const headlineColor = darkTheme ? 'text-white' : 'text-gray-900';
  const descColor = darkTheme ? 'text-white/70' : 'text-gray-600';

  return (
    <WidgetGroup
      items={items}
      onChange={onChange || (() => {})}
      layout="grid-2"
      minItems={1}
      addLabel="Add card"
      createNewItem={() => ({ id: crypto.randomUUID(), headline: 'New challenge...', description: 'Describe the business impact...' })}
      renderItem={(item) => (
        <div className={cardClass} style={cardStyle}>
          <DirectEditableText
            value={item.headline as string}
            onChange={(value) => {
              if (!onChange) return;
              onChange(items.map(p => p.id === item.id ? { ...p, headline: value } : p));
            }}
            as="h4"
            className={`font-semibold ${headlineColor} mb-1`}
          />
          <DirectEditableText
            value={item.description as string}
            onChange={(value) => {
              if (!onChange) return;
              onChange(items.map(p => p.id === item.id ? { ...p, description: value } : p));
            }}
            as="p"
            className={`${descColor} text-sm`}
            multiline
          />
        </div>
      )}
    />
  );
}
