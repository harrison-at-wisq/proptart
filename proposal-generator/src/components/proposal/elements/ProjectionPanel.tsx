'use client';

import React from 'react';

interface ProjectionColumn {
  label: string;
  value: string;
}

interface ProjectionPanelProps {
  title?: string;
  columns?: ProjectionColumn[];
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
  darkTheme,
}: ProjectionPanelProps) {
  if (darkTheme) {
    return (
      <div className="bg-white/5 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wide text-center">{title}</h4>
        <div className={`grid grid-cols-${columns.length} gap-4 text-center`}>
          {columns.map((col, i) => (
            <div key={i}>
              <div className="text-white/60 text-xs mb-1">{col.label}</div>
              <div className="text-xl font-bold">{col.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <h4 className="text-sm font-semibold mb-3 uppercase tracking-wide text-center" style={{ color: 'var(--theme-primary)' }}>{title}</h4>
      <div className={`grid grid-cols-${columns.length} gap-4 text-center`}>
        {columns.map((col, i) => (
          <div key={i}>
            <div className="text-gray-500 text-xs mb-1">{col.label}</div>
            <div className="text-xl font-bold" style={{ color: 'var(--theme-primary)' }}>{col.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
