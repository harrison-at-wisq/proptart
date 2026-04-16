'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';

interface PieSlice {
  label: string;
  value: number;
  formattedValue: string;
}

interface ROIPieChartProps {
  slices?: PieSlice[];
  title?: string;
  onTitleChange?: (value: string) => void;
  darkTheme?: boolean;
}

export const ROI_PIE_CHART_PLACEHOLDER = {
  slices: [
    { label: 'HR Operations', value: 1, formattedValue: '$0' },
    { label: 'Legal & Compliance', value: 1, formattedValue: '$0' },
    { label: 'Employee Experience', value: 1, formattedValue: '$0' },
  ],
  title: 'Your Return',
};

const SLICE_COLORS_LIGHT = ['var(--theme-primary)', 'var(--theme-accent)', '#64748b'];
const SLICE_COLORS_DARK = ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.30)'];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function ROIPieChart({
  slices = ROI_PIE_CHART_PLACEHOLDER.slices,
  title,
  onTitleChange,
  darkTheme,
}: ROIPieChartProps) {
  const colors = darkTheme ? SLICE_COLORS_DARK : SLICE_COLORS_LIGHT;
  const sum = slices.reduce((s, sl) => s + Math.max(0, sl.value), 0);

  const cx = 180;
  const cy = 120;
  const r = 82;
  let currentAngle = 0;

  const segments: {
    d: string;
    color: string;
    midAngle: number;
    slice: PieSlice;
  }[] = [];

  slices.forEach((slice, i) => {
    const fraction = sum > 0 ? Math.max(0, slice.value) / sum : 1 / slices.length;
    const sweep = fraction * 360;
    const clampedSweep = Math.min(sweep, 359.99);
    const startAngle = currentAngle;
    const endAngle = currentAngle + clampedSweep;
    const midAngle = startAngle + sweep / 2;

    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = clampedSweep > 180 ? 1 : 0;

    const d = [
      `M ${cx} ${cy}`,
      `L ${end.x} ${end.y}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${start.x} ${start.y}`,
      'Z',
    ].join(' ');

    segments.push({ d, color: colors[i % colors.length], midAngle, slice });
    currentAngle += sweep;
  });

  const leaderR1 = r + 10;
  const leaderR2 = r + 24;

  const labels = segments.map((seg, i) => {
    const edgePt = polarToCartesian(cx, cy, leaderR1, seg.midAngle);
    const elbowPt = polarToCartesian(cx, cy, leaderR2, seg.midAngle);
    const isRight = elbowPt.x >= cx;
    const lineEndX = isRight ? 348 : 12;

    return { edgePt, elbowPt, lineEndX, isRight, slice: seg.slice, color: seg.color, index: i };
  });

  const textColor = darkTheme ? 'rgba(255,255,255,0.8)' : '#374151';
  const valueColor = darkTheme ? '#fff' : 'var(--theme-primary)';
  const lineColor = darkTheme ? 'rgba(255,255,255,0.3)' : '#9ca3af';

  return (
    <div className="flex flex-col items-center h-full">
      {title && (
        onTitleChange ? (
          <DirectEditableText
            value={title}
            onChange={onTitleChange}
            as="h3"
            className={`text-lg font-semibold mb-3 self-start ${darkTheme ? 'text-white/80' : ''}`}
            style={darkTheme ? undefined : { color: 'var(--theme-primary)' }}
          />
        ) : (
          <h3
            className={`text-lg font-semibold mb-3 self-start ${darkTheme ? 'text-white/80' : ''}`}
            style={darkTheme ? undefined : { color: 'var(--theme-primary)' }}
          >
            {title}
          </h3>
        )
      )}
      <svg viewBox="0 0 360 240" className="w-full flex-1">
        {segments.map((seg, i) => (
          <path key={i} d={seg.d} fill={seg.color} />
        ))}

        {labels.map((lbl) => (
          <g key={lbl.index}>
            <line
              x1={lbl.edgePt.x} y1={lbl.edgePt.y}
              x2={lbl.elbowPt.x} y2={lbl.elbowPt.y}
              stroke={lineColor} strokeWidth={1}
            />
            <line
              x1={lbl.elbowPt.x} y1={lbl.elbowPt.y}
              x2={lbl.lineEndX} y2={lbl.elbowPt.y}
              stroke={lineColor} strokeWidth={1}
            />
            <text
              x={lbl.lineEndX + (lbl.isRight ? -4 : 4)}
              y={lbl.elbowPt.y - 3}
              textAnchor={lbl.isRight ? 'end' : 'start'}
              dominantBaseline="alphabetic"
              fontSize={12}
              fill={textColor}
            >
              {lbl.slice.label}
            </text>
            <text
              x={lbl.lineEndX + (lbl.isRight ? -4 : 4)}
              y={lbl.elbowPt.y + 14}
              textAnchor={lbl.isRight ? 'end' : 'start'}
              dominantBaseline="alphabetic"
              fontSize={14}
              fontWeight={700}
              fill={valueColor}
            >
              {lbl.slice.formattedValue}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
