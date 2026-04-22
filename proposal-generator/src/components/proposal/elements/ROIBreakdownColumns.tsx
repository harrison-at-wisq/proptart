'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { AddItemButton, RemoveItemButton } from '@/components/ui/InlineItemControls';
import { ResolvedSpan } from '@/components/ui/ExportVariablesContext';

interface LineItem {
  label: string;
  value: string;
  explanation: string;
}

interface BreakdownColumn {
  title: string;
  total: string;
  items: LineItem[];
}

interface ROIBreakdownColumnsProps {
  columns?: BreakdownColumn[];
  onItemChange?: (colIndex: number, itemIndex: number, field: 'label' | 'value' | 'explanation', value: string) => void;
  onColumnChange?: (colIndex: number, field: 'title' | 'total', value: string) => void;
  onAddColumn?: () => void;
  onRemoveColumn?: (colIndex: number) => void;
  onAddItem?: (colIndex: number) => void;
  onRemoveItem?: (colIndex: number, itemIndex: number) => void;
  darkTheme?: boolean;
}

export const ROI_BREAKDOWN_COLUMNS_PLACEHOLDER = {
  columns: [
    {
      title: 'HR Operations',
      total: '$0/yr',
      items: [
        { label: 'Handler Savings', value: '$0', explanation: 'Placeholder explanation' },
      ],
    },
    {
      title: 'Legal & Compliance',
      total: '$0/yr',
      items: [
        { label: 'Risk Avoidance', value: '$0', explanation: 'Placeholder explanation' },
      ],
    },
    {
      title: 'Employee Experience',
      total: '$0/yr',
      items: [
        { label: 'Productivity Gains', value: '$0', explanation: 'Placeholder explanation' },
      ],
    },
  ],
};

export function ROIBreakdownColumns({
  columns = ROI_BREAKDOWN_COLUMNS_PLACEHOLDER.columns,
  onItemChange,
  onColumnChange,
  onAddColumn,
  onRemoveColumn,
  onAddItem,
  onRemoveItem,
  darkTheme,
}: ROIBreakdownColumnsProps) {
  return (
    <div>
      {/* Explicit grid-template-columns avoids a Tailwind md: breakpoint fallback
          to a single column when the PDF print viewport (~720px after padding)
          falls below 768px. Columns must stay as columns in both editor and print. */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))` }}
      >
        {columns.map((col, ci) => (
          <div
            key={ci}
            className={`rounded-lg p-5 flex flex-col relative group ${
              darkTheme
                ? 'bg-white/5 border border-white/10'
                : 'bg-gray-50 border border-gray-200'
            }`}
          >
            {onRemoveColumn && columns.length > 1 && (
              <RemoveItemButton onRemove={() => onRemoveColumn(ci)} title="Remove column" />
            )}
            {/* Column header */}
            {onColumnChange ? (
              <DirectEditableText
                value={col.title}
                onChange={(v) => onColumnChange(ci, 'title', v)}
                as="h4"
                className={`text-sm font-semibold uppercase tracking-wide mb-1 ${darkTheme ? 'text-white/60' : ''}`}
                style={!darkTheme ? { color: 'var(--theme-primary)' } : undefined}
              />
            ) : (
              <ResolvedSpan
                as="h4"
                className={`text-sm font-semibold uppercase tracking-wide mb-1 ${darkTheme ? 'text-white/60' : ''}`}
                style={!darkTheme ? { color: 'var(--theme-primary)' } : undefined}
              >
                {col.title}
              </ResolvedSpan>
            )}
            {onColumnChange ? (
              <DirectEditableText
                value={col.total}
                onChange={(v) => onColumnChange(ci, 'total', v)}
                as="div"
                className={`text-2xl font-bold mb-4 pb-3 border-b ${darkTheme ? 'text-white border-white/20' : 'border-gray-200'}`}
                style={!darkTheme ? { color: 'var(--theme-primary)' } : undefined}
              />
            ) : (
              <ResolvedSpan
                as="div"
                className={`text-2xl font-bold mb-4 pb-3 border-b ${darkTheme ? 'text-white border-white/20' : 'border-gray-200'}`}
                style={!darkTheme ? { color: 'var(--theme-primary)' } : undefined}
              >
                {col.total}
              </ResolvedSpan>
            )}

            {/* Line items */}
            <div className="flex flex-col gap-3 flex-1">
              {col.items.map((item, ii) => (
                <div key={ii} className="relative group/item">
                  {onRemoveItem && (
                    <RemoveItemButton
                      onRemove={() => onRemoveItem(ci, ii)}
                      className="opacity-0 group-hover/item:opacity-100"
                      title="Remove line item"
                    />
                  )}
                  <div className="flex justify-between items-baseline gap-2">
                    {onItemChange ? (
                      <>
                        <DirectEditableText
                          value={item.label}
                          onChange={(v) => onItemChange(ci, ii, 'label', v)}
                          as="span"
                          className={`text-sm font-medium ${darkTheme ? 'text-white/90' : 'text-gray-800'}`}
                        />
                        <DirectEditableText
                          value={item.value}
                          onChange={(v) => onItemChange(ci, ii, 'value', v)}
                          as="span"
                          className={`text-sm font-semibold whitespace-nowrap ${darkTheme ? 'text-white' : ''}`}
                          style={!darkTheme ? { color: 'var(--theme-primary)' } : undefined}
                        />
                      </>
                    ) : (
                      <>
                        <ResolvedSpan className={`text-sm font-medium ${darkTheme ? 'text-white/90' : 'text-gray-800'}`}>{item.label}</ResolvedSpan>
                        <ResolvedSpan className={`text-sm font-semibold whitespace-nowrap ${darkTheme ? 'text-white' : ''}`} style={!darkTheme ? { color: 'var(--theme-primary)' } : undefined}>{item.value}</ResolvedSpan>
                      </>
                    )}
                  </div>
                  {onItemChange ? (
                    <DirectEditableText
                      value={item.explanation}
                      onChange={(v) => onItemChange(ci, ii, 'explanation', v)}
                      as="p"
                      className={`text-xs mt-0.5 leading-snug ${darkTheme ? 'text-white/50' : 'text-gray-400'}`}
                    />
                  ) : (
                    <ResolvedSpan as="p" className={`text-xs mt-0.5 leading-snug ${darkTheme ? 'text-white/50' : 'text-gray-400'}`}>{item.explanation}</ResolvedSpan>
                  )}
                </div>
              ))}
              {onAddItem && (
                <AddItemButton onAdd={() => onAddItem(ci)} label="Add line item" darkTheme={darkTheme} className="mt-1" />
              )}
            </div>
          </div>
        ))}
      </div>
      {onAddColumn && (
        <div className="mt-3">
          <AddItemButton onAdd={onAddColumn} label="Add column" darkTheme={darkTheme} />
        </div>
      )}
    </div>
  );
}
