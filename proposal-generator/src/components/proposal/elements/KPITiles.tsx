'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';

interface KPITile {
  value: string;
  label: string;
}

interface KPITilesProps {
  tiles?: KPITile[];
  onTileChange?: (index: number, field: 'value' | 'label', value: string) => void;
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

export function KPITiles({ tiles = KPI_TILES_PLACEHOLDER.tiles, onTileChange, darkTheme }: KPITilesProps) {
  const cols = tiles.length <= 2 ? 'grid-cols-2' : tiles.length === 3 ? 'grid-cols-3' : 'grid-cols-4';

  if (darkTheme) {
    return (
      <div className={`grid ${cols} gap-4`}>
        {tiles.map((tile, i) => (
          <div key={i} className="bg-white/10 p-4 rounded-lg text-center">
            {onTileChange ? (
              <>
                <DirectEditableText value={tile.value} onChange={(v) => onTileChange(i, 'value', v)} as="div" className="text-3xl font-bold mb-1" />
                <DirectEditableText value={tile.label} onChange={(v) => onTileChange(i, 'label', v)} as="div" className="text-white/70 text-sm" />
              </>
            ) : (
              <>
                <div className="text-3xl font-bold mb-1">{tile.value}</div>
                <div className="text-white/70 text-sm">{tile.label}</div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${cols} gap-4`}>
      {tiles.map((tile, i) => (
        <div key={i} className="bg-gray-50 p-4 rounded-lg text-center border border-gray-200">
          {onTileChange ? (
            <>
              <DirectEditableText value={tile.value} onChange={(v) => onTileChange(i, 'value', v)} as="div" className="text-3xl font-bold mb-1" style={{ color: 'var(--theme-primary)' }} />
              <DirectEditableText value={tile.label} onChange={(v) => onTileChange(i, 'label', v)} as="div" className="text-gray-500 text-sm" />
            </>
          ) : (
            <>
              <div className="text-3xl font-bold mb-1" style={{ color: 'var(--theme-primary)' }}>{tile.value}</div>
              <div className="text-gray-500 text-sm">{tile.label}</div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
