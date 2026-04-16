'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';

interface MetricRow {
  label: string;
  value: string;
  /** Small text shown directly under this row's label */
  subText?: string;
}

interface MetricTableProps {
  title?: string;
  rows?: MetricRow[];
  /** When false, all rows render uniformly (no special last-row styling). Default true. */
  showTotalRow?: boolean;
  onTitleChange?: (value: string) => void;
  onRowChange?: (index: number, field: 'label' | 'value', value: string) => void;
  darkTheme?: boolean;
}

export const METRIC_TABLE_PLACEHOLDER = {
  title: 'Key Metrics',
  rows: [
    { label: 'Annual Investment', value: '$0' },
    { label: 'Projected Annual Value', value: '$0' },
    { label: 'Return on Investment', value: '0%' },
    { label: 'Payback Period', value: '0 mo' },
  ],
};

export function MetricTable({ title = METRIC_TABLE_PLACEHOLDER.title, rows = METRIC_TABLE_PLACEHOLDER.rows, showTotalRow = true, onTitleChange, onRowChange, darkTheme }: MetricTableProps) {
  const bodyRows = showTotalRow ? rows.slice(0, -1) : rows;
  const totalRow = showTotalRow && rows.length > 0 ? rows[rows.length - 1] : null;
  const totalRowIndex = rows.length - 1;

  const renderLabel = (row: MetricRow, index: number, cls: string) =>
    onRowChange ? (
      <DirectEditableText value={row.label} onChange={(v) => onRowChange(index, 'label', v)} as="span" className={cls} />
    ) : (
      <span className={cls}>{row.label}</span>
    );

  const renderValue = (row: MetricRow, index: number, cls: string, style?: React.CSSProperties) =>
    onRowChange ? (
      <DirectEditableText value={row.value} onChange={(v) => onRowChange(index, 'value', v)} as="span" className={cls} style={style} />
    ) : (
      <span className={cls} style={style}>{row.value}</span>
    );

  if (darkTheme) {
    return (
      <div className="flex flex-col h-full">
        {title && (
          onTitleChange ? (
            <DirectEditableText value={title} onChange={onTitleChange} as="h3" className="text-lg font-semibold mb-4 text-white/80" />
          ) : (
            <h3 className="text-lg font-semibold mb-4 text-white/80">{title}</h3>
          )
        )}
        <div className="space-y-3">
          {bodyRows.map((row, i) => (
            <div key={i} className="pb-2 border-b border-white/20">
              <div className="flex justify-between">
                {renderLabel(row, i, 'text-white/80')}
                {renderValue(row, i, 'font-semibold')}
              </div>
              {row.subText && (
                <div className="text-white/40 text-xs mt-0.5">{row.subText}</div>
              )}
            </div>
          ))}
        </div>
        {totalRow && (
          <div className="flex justify-between pt-3 mt-auto">
            {renderLabel(totalRow, totalRowIndex, 'font-semibold')}
            {renderValue(totalRow, totalRowIndex, 'text-2xl font-bold')}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 h-full flex flex-col">
      {title && (
        onTitleChange ? (
          <DirectEditableText value={title} onChange={onTitleChange} as="h3" className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--theme-primary)' }} />
        ) : (
          <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--theme-primary)' }}>{title}</h3>
        )
      )}
      <div className="space-y-3">
        {bodyRows.map((row, i) => (
          <div key={i} className="pb-2 border-b border-gray-200">
            <div className="flex justify-between items-center">
              {renderLabel(row, i, 'text-gray-600 text-sm')}
              {renderValue(row, i, 'text-xl font-bold', { color: 'var(--theme-primary)' })}
            </div>
            {row.subText && (
              <div className="text-gray-400 text-xs mt-0.5">{row.subText}</div>
            )}
          </div>
        ))}
      </div>
      {totalRow && (
        <div className="flex justify-between items-center mt-auto pt-3">
          {renderLabel(totalRow, totalRowIndex, 'text-gray-600 text-sm')}
          {renderValue(totalRow, totalRowIndex, 'text-xl font-bold', { color: 'var(--theme-primary)' })}
        </div>
      )}
    </div>
  );
}
