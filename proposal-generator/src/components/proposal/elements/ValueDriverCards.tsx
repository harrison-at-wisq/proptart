'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { WidgetGroup } from '@/components/ui/WidgetGroup';
import type { WidgetItem } from '@/types/proposal';

interface ValueDriverCardsProps {
  items?: WidgetItem[];
  onChange?: (items: WidgetItem[]) => void;
  darkTheme?: boolean;
}

export const VALUE_DRIVER_CARDS_PLACEHOLDER = {
  items: [
    { id: '1', key: 'driver-1', headline: 'Primary Value Driver', description: 'The most impactful benefit for the organization.', proof: 'Supporting evidence or data point.', isPrimary: true },
    { id: '2', key: 'driver-2', headline: 'Secondary Driver', description: 'Additional strategic benefit.', proof: 'Supporting evidence.', isPrimary: false },
    { id: '3', key: 'driver-3', headline: 'Tertiary Driver', description: 'Complementary benefit area.', proof: 'Supporting evidence.', isPrimary: false },
  ] as WidgetItem[],
};

export function ValueDriverCards({ items = VALUE_DRIVER_CARDS_PLACEHOLDER.items, onChange, darkTheme }: ValueDriverCardsProps) {
  return (
    <WidgetGroup
      items={items}
      onChange={onChange || (() => {})}
      layout="grid-3"
      minItems={1}
      maxItems={4}
      addLabel="Add value driver"
      createNewItem={() => ({
        id: crypto.randomUUID(),
        key: `custom-${Date.now()}`,
        headline: 'New Value Driver',
        description: 'Describe the value...',
        proof: 'Supporting evidence...',
        isPrimary: false,
      })}
      renderItem={(item, index) => {
        const isPrimary = index === 0;
        const cardClass = darkTheme
          ? `p-4 rounded-lg ${isPrimary ? 'bg-white/20 ring-2 ring-white/50' : 'bg-white/10'}`
          : `p-4 rounded-lg ${isPrimary ? 'ring-2' : 'bg-gray-50'}`;
        const cardStyle = (!darkTheme && isPrimary)
          ? { backgroundColor: 'rgba(var(--theme-primary-rgb), 0.1)', ringColor: 'var(--theme-primary)', '--tw-ring-color': 'var(--theme-primary)' } as React.CSSProperties
          : undefined;
        const numColor = darkTheme
          ? `text-3xl font-bold flex-shrink-0 ${isPrimary ? 'text-white' : 'text-white/30'}`
          : 'text-3xl font-bold flex-shrink-0';
        const numStyle = darkTheme
          ? undefined
          : isPrimary
            ? { color: 'var(--theme-primary)' } as React.CSSProperties
            : { color: 'rgba(var(--theme-primary-rgb), 0.2)' } as React.CSSProperties;
        const headlineColor = darkTheme ? 'text-white' : 'text-gray-900';
        const descColor = darkTheme ? 'text-white/70' : 'text-gray-600';
        const proofColor = darkTheme ? 'text-white font-semibold' : 'font-semibold';
        const proofStyle = darkTheme ? undefined : { color: 'var(--theme-primary)' } as React.CSSProperties;

        return (
          <div className={cardClass} style={cardStyle}>
            <div className="flex items-center gap-3 mb-2">
              <div className={numColor} style={numStyle}>{(index ?? 0) + 1}</div>
              <DirectEditableText
                value={item.headline as string}
                onChange={(value) => {
                  if (!onChange) return;
                  onChange(items.map(d => d.id === item.id ? { ...d, headline: value } : d));
                }}
                as="h4"
                className={`font-bold ${headlineColor} flex-1`}
              />
              {isPrimary && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded flex-shrink-0 ${darkTheme ? 'bg-white' : 'text-white'}`} style={darkTheme ? { color: 'var(--theme-primary)' } : { backgroundColor: 'var(--theme-primary)' }}>PRIMARY</span>
              )}
            </div>
            <DirectEditableText
              value={item.description as string}
              onChange={(value) => {
                if (!onChange) return;
                onChange(items.map(d => d.id === item.id ? { ...d, description: value } : d));
              }}
              as="p"
              className={`${descColor} text-sm mb-2`}
              multiline
            />
            <DirectEditableText
              value={(item.proof as string) || ''}
              onChange={(value) => {
                if (!onChange) return;
                onChange(items.map(d => d.id === item.id ? { ...d, proof: value } : d));
              }}
              as="p"
              className={`${proofColor} text-sm`}
              style={proofStyle}
            />
          </div>
        );
      }}
    />
  );
}
