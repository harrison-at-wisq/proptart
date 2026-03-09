import type { CSSProperties } from 'react';
import type { ColorPalette } from '@/types/proposal';
import { DEFAULT_COLOR_PALETTE } from '@/types/proposal';

export function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/** Lighten a hex color by mixing with white. factor 0 = original, 1 = white */
export function lightenHex(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.substring(0, 2), 16) + (255 - parseInt(h.substring(0, 2), 16)) * factor);
  const g = Math.round(parseInt(h.substring(2, 4), 16) + (255 - parseInt(h.substring(2, 4), 16)) * factor);
  const b = Math.round(parseInt(h.substring(4, 6), 16) + (255 - parseInt(h.substring(4, 6), 16)) * factor);
  return `${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

/** Generate CSS custom properties from a color palette */
export function getThemeVars(palette?: ColorPalette): CSSProperties {
  const p = palette || DEFAULT_COLOR_PALETTE;
  return {
    '--theme-primary': p.primary,
    '--theme-primary-rgb': hexToRgb(p.primary),
    '--theme-accent': p.accent,
    '--theme-accent-rgb': hexToRgb(p.accent),
    '--theme-bg': p.background,
  } as CSSProperties;
}
