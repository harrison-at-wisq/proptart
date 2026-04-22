'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { AddItemButton, RemoveItemButton } from '@/components/ui/InlineItemControls';

interface ProjectionColumn {
  label: string;
  value: string;
}

interface ProjectionPanelProps {
  title?: string;
  columns?: ProjectionColumn[];
  onTitleChange?: (value: string) => void;
  onColumnChange?: (index: number, field: 'label' | 'value', value: string) => void;
  onAddColumn?: () => void;
  onRemoveColumn?: (index: number) => void;
  darkTheme?: boolean;
}

export const PROJECTION_PANEL_PLACEHOLDER = {
  title: '3-Year Value Projection',
  columns: [
    { label: 'Year 1 (50% adoption)', value: '$0' },
    { label: 'Year 2 (75% adoption)', value: '$0' },
    { label: 'Year 3 (100% adoption)', value: '$0' },
  ],
};

export function ProjectionPanel({
  title = PROJECTION_PANEL_PLACEHOLDER.title,
  columns = PROJECTION_PANEL_PLACEHOLDER.columns,
  onTitleChange,
  onColumnChange,
  onAddColumn,
  onRemoveColumn,
  darkTheme,
}: ProjectionPanelProps) {
  const count = Math.max(1, columns.length);
  // Tailwind's JIT doesn't see computed grid-cols-${n}, so resolve explicitly
  const gridColsClass =
    count === 1 ? 'grid-cols-1'
    : count === 2 ? 'grid-cols-2'
    : count === 3 ? 'grid-cols-3'
    : count === 4 ? 'grid-cols-4'
    : 'grid-cols-5';

  const containerCls = darkTheme ? 'bg-white/5 rounded-lg p-4' : 'bg-gray-50 rounded-lg p-4 border border-gray-200';
  const titleCls = darkTheme
    ? 'text-sm font-semibold text-white/70 mb-3 uppercase tracking-wide text-center'
    : 'text-sm font-semibold mb-3 uppercase tracking-wide text-center';
  const titleStyle = darkTheme ? undefined : { color: 'var(--theme-primary)' } as React.CSSProperties;
  const labelCls = darkTheme ? 'text-white/60 text-xs mb-1' : 'text-gray-500 text-xs mb-1';
  const valueCls = 'text-xl font-bold';
  const valueStyle = darkTheme ? undefined : { color: 'var(--theme-primary)' } as React.CSSProperties;

  return (
    <div className={containerCls}>
      {title !== undefined && (
        onTitleChange ? (
          <DirectEditableText value={title} onChange={onTitleChange} as="h4" className={titleCls} style={titleStyle} />
        ) : (
          <h4 className={titleCls} style={titleStyle}>{title}</h4>
        )
      )}
      <div className={`grid ${gridColsClass} gap-4 text-center`}>
        {columns.map((col, i) => (
          <div key={i} className="relative group">
            {onRemoveColumn && columns.length > 1 && (
              <RemoveItemButton onRemove={() => onRemoveColumn(i)} title="Remove column" />
            )}
            {onColumnChange ? (
              <>
                <DirectEditableText value={col.label} onChange={(v) => onColumnChange(i, 'label', v)} as="div" className={labelCls} />
                <DirectEditableText value={col.value} onChange={(v) => onColumnChange(i, 'value', v)} as="div" className={valueCls} style={valueStyle} />
              </>
            ) : (
              <>
                <div className={labelCls}>{col.label}</div>
                <div className={valueCls} style={valueStyle}>{col.value}</div>
              </>
            )}
          </div>
        ))}
      </div>
      {onAddColumn && (
        <div className="mt-3 flex justify-center">
          <AddItemButton onAdd={onAddColumn} label="Add column" darkTheme={darkTheme} />
        </div>
      )}
    </div>
  );
}
