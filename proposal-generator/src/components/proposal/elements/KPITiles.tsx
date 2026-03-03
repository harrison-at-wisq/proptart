'use client';

import React from 'react';

interface KPITile {
  value: string;
  label: string;
}

interface KPITilesProps {
  tiles?: KPITile[];
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

export function KPITiles({ tiles = KPI_TILES_PLACEHOLDER.tiles, darkTheme }: KPITilesProps) {
  const cols = tiles.length <= 2 ? 'grid-cols-2' : tiles.length === 3 ? 'grid-cols-3' : 'grid-cols-4';

  if (darkTheme) {
    return (
      <div className={`grid ${cols} gap-4`}>
        {tiles.map((tile, i) => (
          <div key={i} className="bg-white/10 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold mb-1">{tile.value}</div>
            <div className="text-white/70 text-sm">{tile.label}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${cols} gap-4`}>
      {tiles.map((tile, i) => (
        <div key={i} className="bg-gray-50 p-4 rounded-lg text-center border border-gray-200">
          <div className="text-3xl font-bold text-[#03143B] mb-1">{tile.value}</div>
          <div className="text-gray-500 text-sm">{tile.label}</div>
        </div>
      ))}
    </div>
  );
}
