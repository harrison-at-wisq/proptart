'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { WidgetGroup } from '@/components/ui/WidgetGroup';
import type { WidgetItem } from '@/types/proposal';

interface NumberedStepsProps {
  items?: WidgetItem[];
  onChange?: (items: WidgetItem[]) => void;
  darkTheme?: boolean;
}

export const NUMBERED_STEPS_PLACEHOLDER = {
  items: [
    { id: '1', title: 'Initial Discussion', description: 'Align on goals, success criteria, and key stakeholders.' },
    { id: '2', title: 'Technical Review', description: 'Evaluate integration requirements and security protocols.' },
    { id: '3', title: 'Pilot Program', description: 'Scoped deployment to validate outcomes before full rollout.' },
  ] as WidgetItem[],
};

export function NumberedSteps({ items = NUMBERED_STEPS_PLACEHOLDER.items, onChange, darkTheme }: NumberedStepsProps) {
  const badgeClass = darkTheme
    ? 'w-8 h-8 bg-white rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm'
    : 'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm';
  const badgeStyle = darkTheme
    ? { color: 'var(--theme-primary)' } as React.CSSProperties
    : { backgroundColor: 'var(--theme-primary)' } as React.CSSProperties;
  const titleColor = darkTheme ? 'text-white' : 'text-gray-900';
  const descColor = darkTheme ? 'text-white/70' : 'text-gray-600';

  return (
    <WidgetGroup
      items={items}
      onChange={onChange || (() => {})}
      layout="list"
      minItems={1}
      addLabel="Add next step"
      createNewItem={() => ({ id: crypto.randomUUID(), title: 'New Step', description: 'Describe the next step...' })}
      renderItem={(item, index) => (
        <div className="flex items-start gap-4">
          <div className={badgeClass} style={badgeStyle}>
            {(index ?? 0) + 1}
          </div>
          <div>
            <DirectEditableText
              value={item.title as string}
              onChange={(value) => {
                if (!onChange) return;
                onChange(items.map(s => s.id === item.id ? { ...s, title: value } : s));
              }}
              as="h3"
              className={`font-semibold ${titleColor}`}
            />
            <DirectEditableText
              value={item.description as string}
              onChange={(value) => {
                if (!onChange) return;
                onChange(items.map(s => s.id === item.id ? { ...s, description: value } : s));
              }}
              as="p"
              className={`${descColor} text-sm`}
              multiline
            />
          </div>
        </div>
      )}
    />
  );
}
