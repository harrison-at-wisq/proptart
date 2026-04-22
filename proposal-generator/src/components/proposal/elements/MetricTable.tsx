'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { AddItemButton, RemoveItemButton } from '@/components/ui/InlineItemControls';
import { ResolvedSpan } from '@/components/ui/ExportVariablesContext';

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
  /** When true, sub-text lines (and their edit-mode placeholders) are never rendered. */
  hideSubText?: boolean;
  onTitleChange?: (value: string) => void;
  onRowChange?: (index: number, field: 'label' | 'value' | 'subText', value: string) => void;
  onAddRow?: () => void;
  onRemoveRow?: (index: number) => void;
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

export function MetricTable({
  title = METRIC_TABLE_PLACEHOLDER.title,
  rows = METRIC_TABLE_PLACEHOLDER.rows,
  showTotalRow = true,
  hideSubText = false,
  onTitleChange,
  onRowChange,
  onAddRow,
  onRemoveRow,
  darkTheme,
}: MetricTableProps) {
  const bodyRows = showTotalRow ? rows.slice(0, -1) : rows;
  const totalRow = showTotalRow && rows.length > 0 ? rows[rows.length - 1] : null;
  const totalRowIndex = rows.length - 1;

  const renderLabel = (row: MetricRow, index: number, cls: string) =>
    onRowChange ? (
      <DirectEditableText value={row.label} onChange={(v) => onRowChange(index, 'label', v)} as="span" className={cls} />
    ) : (
      <ResolvedSpan className={cls}>{row.label}</ResolvedSpan>
    );

  const renderValue = (row: MetricRow, index: number, cls: string, style?: React.CSSProperties) =>
    onRowChange ? (
      <DirectEditableText value={row.value} onChange={(v) => onRowChange(index, 'value', v)} as="span" className={cls} style={style} />
    ) : (
      <ResolvedSpan className={cls} style={style}>{row.value}</ResolvedSpan>
    );

  const renderSubText = (row: MetricRow, index: number, cls: string) => {
    if (hideSubText) return null;
    // Only render when the row actually has sub-text content. We don't show an
    // empty "Click to add sub-text…" placeholder — the user found it noisy.
    const hasContent = row.subText !== undefined && row.subText !== '';
    if (!hasContent) return null;
    return onRowChange ? (
      <DirectEditableText
        value={row.subText ?? ''}
        onChange={(v) => onRowChange(index, 'subText', v)}
        as="div"
        className={`${cls} mt-0.5`}
      />
    ) : (
      <ResolvedSpan as="div" className={`${cls} mt-0.5`}>{row.subText ?? ''}</ResolvedSpan>
    );
  };

  if (darkTheme) {
    return (
      <div className="flex flex-col h-full">
        {title !== undefined && (
          onTitleChange ? (
            <DirectEditableText value={title} onChange={onTitleChange} as="h3" className="text-lg font-semibold mb-4 text-white/80" />
          ) : (
            <ResolvedSpan as="h3" className="text-lg font-semibold mb-4 text-white/80">{title}</ResolvedSpan>
          )
        )}
        <div className="space-y-3">
          {bodyRows.map((row, i) => (
            <div key={i} className="pb-2 border-b border-white/20 relative group">
              {onRemoveRow && <RemoveItemButton onRemove={() => onRemoveRow(i)} title="Remove row" />}
              <div className="flex justify-between">
                {renderLabel(row, i, 'text-white/80')}
                {renderValue(row, i, 'font-semibold')}
              </div>
              {renderSubText(row, i, 'text-white/40 text-xs')}
            </div>
          ))}
        </div>
        {totalRow && (
          <div className="flex justify-between pt-3 mt-auto relative group">
            {onRemoveRow && <RemoveItemButton onRemove={() => onRemoveRow(totalRowIndex)} title="Remove row" />}
            {renderLabel(totalRow, totalRowIndex, 'font-semibold')}
            {renderValue(totalRow, totalRowIndex, 'text-2xl font-bold')}
          </div>
        )}
        {onAddRow && (
          <div className="mt-3">
            <AddItemButton onAdd={onAddRow} label="Add row" darkTheme />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 h-full flex flex-col">
      {title !== undefined && (
        onTitleChange ? (
          <DirectEditableText value={title} onChange={onTitleChange} as="h3" className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--theme-primary)' }} />
        ) : (
          <ResolvedSpan as="h3" className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--theme-primary)' }}>{title}</ResolvedSpan>
        )
      )}
      <div className="space-y-3">
        {bodyRows.map((row, i) => (
          <div key={i} className="pb-2 border-b border-gray-200 relative group">
            {onRemoveRow && <RemoveItemButton onRemove={() => onRemoveRow(i)} title="Remove row" />}
            <div className="flex justify-between items-center">
              {renderLabel(row, i, 'text-gray-600 text-sm')}
              {renderValue(row, i, 'text-xl font-bold', { color: 'var(--theme-primary)' })}
            </div>
            {renderSubText(row, i, 'text-gray-400 text-xs')}
          </div>
        ))}
      </div>
      {totalRow && (
        <div className="flex justify-between items-center mt-auto pt-3 relative group">
          {onRemoveRow && <RemoveItemButton onRemove={() => onRemoveRow(totalRowIndex)} title="Remove row" />}
          {renderLabel(totalRow, totalRowIndex, 'text-gray-600 text-sm')}
          {renderValue(totalRow, totalRowIndex, 'text-xl font-bold', { color: 'var(--theme-primary)' })}
        </div>
      )}
      {onAddRow && (
        <div className="mt-3">
          <AddItemButton onAdd={onAddRow} label="Add row" />
        </div>
      )}
    </div>
  );
}
