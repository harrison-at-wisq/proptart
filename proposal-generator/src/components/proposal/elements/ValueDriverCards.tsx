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
          : `p-4 rounded-lg ${isPrimary ? 'bg-[#03143B]/10 ring-2 ring-[#03143B]' : 'bg-gray-50'}`;
        const numColor = darkTheme
          ? `text-3xl font-bold flex-shrink-0 ${isPrimary ? 'text-white' : 'text-white/30'}`
          : `text-3xl font-bold flex-shrink-0 ${isPrimary ? 'text-[#03143B]' : 'text-[#03143B]/20'}`;
        const headlineColor = darkTheme ? 'text-white' : 'text-gray-900';
        const descColor = darkTheme ? 'text-white/70' : 'text-gray-600';
        const proofColor = darkTheme ? 'text-white font-semibold' : 'text-[#03143B] font-semibold';

        return (
          <div className={cardClass}>
            <div className="flex items-center gap-3 mb-2">
              <div className={numColor}>{(index ?? 0) + 1}</div>
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
                <span className={`px-2 py-0.5 text-xs font-medium rounded flex-shrink-0 ${darkTheme ? 'bg-white text-[#03143B]' : 'bg-[#03143B] text-white'}`}>PRIMARY</span>
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
            />
          </div>
        );
      }}
    />
  );
}
