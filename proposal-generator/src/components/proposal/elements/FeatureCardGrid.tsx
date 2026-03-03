'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { WidgetGroup } from '@/components/ui/WidgetGroup';
import type { WidgetItem } from '@/types/proposal';

interface FeatureCardGridProps {
  items?: WidgetItem[];
  onChange?: (items: WidgetItem[]) => void;
  darkTheme?: boolean;
}

export const FEATURE_CARD_GRID_PLACEHOLDER = {
  items: [
    { id: '1', title: 'Feature One', description: 'Brief description of this capability and its benefit.' },
    { id: '2', title: 'Feature Two', description: 'Brief description of this capability and its benefit.' },
    { id: '3', title: 'Feature Three', description: 'Brief description of this capability and its benefit.' },
  ] as WidgetItem[],
};

export function FeatureCardGrid({ items = FEATURE_CARD_GRID_PLACEHOLDER.items, onChange, darkTheme }: FeatureCardGridProps) {
  const cardClass = darkTheme
    ? 'p-3 bg-white/10 rounded-lg'
    : 'p-3 bg-white border border-gray-200 rounded-lg';
  const titleColor = darkTheme ? 'text-white' : 'text-[#03143B]';
  const descColor = darkTheme ? 'text-white/60' : 'text-gray-600';

  return (
    <WidgetGroup
      items={items}
      onChange={onChange || (() => {})}
      layout="grid-3"
      minItems={1}
      addLabel="Add feature"
      createNewItem={() => ({ id: crypto.randomUUID(), title: 'New Feature', description: 'Describe the security capability...' })}
      renderItem={(item) => (
        <div className={cardClass}>
          <DirectEditableText
            value={item.title as string}
            onChange={(value) => {
              if (!onChange) return;
              onChange(items.map(f => f.id === item.id ? { ...f, title: value } : f));
            }}
            as="h4"
            className={`font-semibold ${titleColor} mb-1 text-sm`}
          />
          <DirectEditableText
            value={item.description as string}
            onChange={(value) => {
              if (!onChange) return;
              onChange(items.map(f => f.id === item.id ? { ...f, description: value } : f));
            }}
            as="p"
            className={`${descColor} text-xs`}
            multiline
          />
        </div>
      )}
    />
  );
}
