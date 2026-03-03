'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { WidgetGroup } from '@/components/ui/WidgetGroup';
import type { WidgetItem } from '@/types/proposal';

interface TimelineCardGridProps {
  items?: WidgetItem[];
  onChange?: (items: WidgetItem[]) => void;
  darkTheme?: boolean;
}

export const TIMELINE_CARD_GRID_PLACEHOLDER = {
  items: [
    { id: '1', week: 'Weeks 1-3', title: 'Discovery & Setup', description: 'Initial assessment, goal setting, and environment configuration.' },
    { id: '2', week: 'Weeks 4-6', title: 'Configuration', description: 'Content setup, workflow design, and integration mapping.' },
    { id: '3', week: 'Weeks 7-9', title: 'Testing & Training', description: 'UAT, team training, and refinement cycles.' },
    { id: '4', week: 'Weeks 10-12', title: 'Launch & Optimize', description: 'Go-live, monitoring, and performance tuning.' },
  ] as WidgetItem[],
};

export function TimelineCardGrid({ items = TIMELINE_CARD_GRID_PLACEHOLDER.items, onChange, darkTheme }: TimelineCardGridProps) {
  const cardClass = darkTheme
    ? 'p-4 bg-white/10 rounded-lg border-t-4 border-white/50'
    : 'p-4 bg-gray-50 rounded-lg border-t-4 border-[#03143B]';
  const weekColor = darkTheme ? 'text-white/70' : 'text-[#03143B]';
  const titleColor = darkTheme ? 'text-white' : 'text-gray-900';
  const descColor = darkTheme ? 'text-white/60' : 'text-gray-600';

  return (
    <WidgetGroup
      items={items}
      onChange={onChange || (() => {})}
      layout="grid-4"
      minItems={1}
      addLabel="Add phase"
      createNewItem={() => ({ id: crypto.randomUUID(), week: 'Week X-Y', title: 'New Phase', description: 'Phase activities...' })}
      renderItem={(item) => (
        <div className={cardClass}>
          <DirectEditableText
            value={item.week as string}
            onChange={(value) => {
              if (!onChange) return;
              onChange(items.map(p => p.id === item.id ? { ...p, week: value } : p));
            }}
            as="div"
            className={`text-xs font-semibold ${weekColor} mb-1`}
          />
          <DirectEditableText
            value={item.title as string}
            onChange={(value) => {
              if (!onChange) return;
              onChange(items.map(p => p.id === item.id ? { ...p, title: value } : p));
            }}
            as="h4"
            className={`font-bold ${titleColor} text-sm mb-1`}
          />
          <DirectEditableText
            value={item.description as string}
            onChange={(value) => {
              if (!onChange) return;
              onChange(items.map(p => p.id === item.id ? { ...p, description: value } : p));
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
