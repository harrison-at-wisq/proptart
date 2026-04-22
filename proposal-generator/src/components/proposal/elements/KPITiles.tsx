'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { AddItemButton, RemoveItemButton } from '@/components/ui/InlineItemControls';
import { ResolvedSpan } from '@/components/ui/ExportVariablesContext';

interface KPITile {
  value: string;
  label: string;
}

interface KPITilesProps {
  tiles?: KPITile[];
  onTileChange?: (index: number, field: 'value' | 'label', value: string) => void;
  onAddTile?: () => void;
  onRemoveTile?: (index: number) => void;
  darkTheme?: boolean;
}

export const KPI_TILES_PLACEHOLDER = {
  tiles: [
    { value: '0%', label: 'ROI' },
    { value: '0 mo', label: 'Payback' },
    { value: '$0', label: '3-Year Value' },
    { value: '$0', label: '3-Year Net' },
  ],
};

export function KPITiles({
  tiles = KPI_TILES_PLACEHOLDER.tiles,
  onTileChange,
  onAddTile,
  onRemoveTile,
  darkTheme,
}: KPITilesProps) {
  const cols = tiles.length <= 2 ? 'grid-cols-2' : tiles.length === 3 ? 'grid-cols-3' : 'grid-cols-4';
  const tileBg = darkTheme ? 'bg-white/10' : 'bg-gray-50 border border-gray-200';
  const valueStyle = darkTheme ? undefined : { color: 'var(--theme-primary)' } as React.CSSProperties;
  const labelCls = darkTheme ? 'text-white/70 text-sm' : 'text-gray-500 text-sm';

  return (
    <>
      <div className={`grid ${cols} gap-4`}>
        {tiles.map((tile, i) => (
          <div key={i} className={`${tileBg} p-4 rounded-lg text-center relative group`}>
            {onRemoveTile && <RemoveItemButton onRemove={() => onRemoveTile(i)} title="Remove tile" />}
            {onTileChange ? (
              <>
                <DirectEditableText value={tile.value} onChange={(v) => onTileChange(i, 'value', v)} as="div" className="text-3xl font-bold mb-1" style={valueStyle} />
                <DirectEditableText value={tile.label} onChange={(v) => onTileChange(i, 'label', v)} as="div" className={labelCls} />
              </>
            ) : (
              <>
                <ResolvedSpan as="div" className="text-3xl font-bold mb-1" style={valueStyle}>{tile.value}</ResolvedSpan>
                <ResolvedSpan as="div" className={labelCls}>{tile.label}</ResolvedSpan>
              </>
            )}
          </div>
        ))}
      </div>
      {onAddTile && (
        <div className="mt-3">
          <AddItemButton onAdd={onAddTile} label="Add tile" darkTheme={darkTheme} />
        </div>
      )}
    </>
  );
}
