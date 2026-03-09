'use client';

import React from 'react';

interface MetricRow {
  label: string;
  value: string;
}

interface MetricTableProps {
  title?: string;
  rows?: MetricRow[];
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

export function MetricTable({ title = METRIC_TABLE_PLACEHOLDER.title, rows = METRIC_TABLE_PLACEHOLDER.rows, darkTheme }: MetricTableProps) {
  const bodyRows = rows.slice(0, -1);
  const totalRow = rows.length > 0 ? rows[rows.length - 1] : null;

  if (darkTheme) {
    return (
      <div className="flex flex-col h-full">
        {title && (
          <h3 className="text-lg font-semibold mb-4 text-white/80">{title}</h3>
        )}
        <div className="space-y-3">
          {bodyRows.map((row, i) => (
            <div key={i} className="flex justify-between pb-2 border-b border-white/20">
              <span className="text-white/80">{row.label}</span>
              <span className="font-semibold">{row.value}</span>
            </div>
          ))}
        </div>
        {totalRow && (
          <div className="flex justify-between pt-3 mt-auto">
            <span className="font-semibold">{totalRow.label}</span>
            <span className="text-xl font-bold">{totalRow.value}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 h-full flex flex-col">
      {title && (
        <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--theme-primary)' }}>{title}</h3>
      )}
      <div className="space-y-3">
        {bodyRows.map((row, i) => (
          <div key={i} className="flex justify-between items-center pb-2 border-b border-gray-200">
            <span className="text-gray-600 text-sm">{row.label}</span>
            <span className="text-xl font-bold" style={{ color: 'var(--theme-primary)' }}>{row.value}</span>
          </div>
        ))}
      </div>
      {totalRow && (
        <div className="flex justify-between items-center mt-auto pt-3">
          <span className="text-gray-600 text-sm">{totalRow.label}</span>
          <span className="text-xl font-bold" style={{ color: 'var(--theme-primary)' }}>{totalRow.value}</span>
        </div>
      )}
    </div>
  );
}
