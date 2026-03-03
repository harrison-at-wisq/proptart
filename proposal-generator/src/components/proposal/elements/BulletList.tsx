'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { WidgetGroup } from '@/components/ui/WidgetGroup';
import type { WidgetItem } from '@/types/proposal';

interface BulletListProps {
  items?: WidgetItem[];
  onChange?: (items: WidgetItem[]) => void;
  darkTheme?: boolean;
}

export const BULLET_LIST_PLACEHOLDER = {
  items: [
    { id: '1', text: 'First key insight or recommendation' },
    { id: '2', text: 'Second strategic observation' },
    { id: '3', text: 'Third supporting data point' },
  ] as WidgetItem[],
};

export function BulletList({ items = BULLET_LIST_PLACEHOLDER.items, onChange, darkTheme }: BulletListProps) {
  const bulletColor = darkTheme ? 'bg-white/70' : 'bg-[#03143B]';
  const textColor = darkTheme ? 'text-white/80' : 'text-gray-600';

  return (
    <WidgetGroup
      items={items}
      onChange={onChange || (() => {})}
      layout="list"
      minItems={1}
      addLabel="Add bullet"
      createNewItem={() => ({ id: crypto.randomUUID(), text: 'New insight...' })}
      renderItem={(item) => (
        <li className={`flex items-start gap-2 ${textColor} text-sm`}>
          <span className={`w-1.5 h-1.5 ${bulletColor} rounded-full mt-2 flex-shrink-0`}></span>
          <DirectEditableText
            value={item.text as string}
            onChange={(value) => {
              if (!onChange) return;
              onChange(items.map(b => b.id === item.id ? { ...b, text: value } : b));
            }}
            as="span"
          />
        </li>
      )}
    />
  );
}
