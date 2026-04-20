'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { pillarGridColsClass } from '@/lib/pillar-visibility';

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
  darkTheme,
}: ROIBreakdownColumnsProps) {
  return (
    <div className={`grid ${pillarGridColsClass(columns.length)} gap-3`}>
      {columns.map((col, ci) => (
        <div
          key={ci}
          className={`rounded-lg p-5 flex flex-col ${
            darkTheme
              ? 'bg-white/5 border border-white/10'
              : 'bg-gray-50 border border-gray-200'
          }`}
        >
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
            <h4
              className={`text-sm font-semibold uppercase tracking-wide mb-1 ${darkTheme ? 'text-white/60' : ''}`}
              style={!darkTheme ? { color: 'var(--theme-primary)' } : undefined}
            >
              {col.title}
            </h4>
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
            <div
              className={`text-2xl font-bold mb-4 pb-3 border-b ${darkTheme ? 'text-white border-white/20' : 'border-gray-200'}`}
              style={!darkTheme ? { color: 'var(--theme-primary)' } : undefined}
            >
              {col.total}
            </div>
          )}

          {/* Line items */}
          <div className="flex flex-col gap-3 flex-1">
            {col.items.map((item, ii) => (
              <div key={ii}>
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
                      <span className={`text-sm font-medium ${darkTheme ? 'text-white/90' : 'text-gray-800'}`}>{item.label}</span>
                      <span className={`text-sm font-semibold whitespace-nowrap ${darkTheme ? 'text-white' : ''}`} style={!darkTheme ? { color: 'var(--theme-primary)' } : undefined}>{item.value}</span>
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
                  <p className={`text-xs mt-0.5 leading-snug ${darkTheme ? 'text-white/50' : 'text-gray-400'}`}>{item.explanation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
