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
  if (darkTheme) {
    return (
      <div>
        {title && (
          <h3 className="text-lg font-semibold mb-4 text-white/80">{title}</h3>
        )}
        <div className="space-y-3">
          {rows.map((row, i) => {
            const isLast = i === rows.length - 1;
            return (
              <div key={i} className={`flex justify-between ${isLast ? 'pt-1' : 'pb-2 border-b border-white/20'}`}>
                <span className={isLast ? 'font-semibold' : 'text-white/80'}>{row.label}</span>
                <span className={isLast ? 'text-xl font-bold' : 'font-semibold'}>{row.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 h-full">
      {title && (
        <h3 className="text-sm font-semibold text-[#03143B] mb-3 uppercase tracking-wide">{title}</h3>
      )}
      <div className="space-y-3">
        {rows.map((row, i) => {
          const isLast = i === rows.length - 1;
          return (
            <div key={i} className={`flex justify-between items-center ${isLast ? '' : 'pb-2 border-b border-gray-200'}`}>
              <span className="text-gray-600 text-sm">{row.label}</span>
              <span className="text-xl font-bold text-[#03143B]">{row.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
