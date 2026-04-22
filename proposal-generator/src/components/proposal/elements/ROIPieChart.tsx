'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';
import { AddItemButton, RemoveItemButton } from '@/components/ui/InlineItemControls';
import { ResolvedSpan } from '@/components/ui/ExportVariablesContext';

interface PieSlice {
  label: string;
  value: number;
  formattedValue: string;
}

interface ROIPieChartProps {
  slices?: PieSlice[];
  title?: string;
  onTitleChange?: (value: string) => void;
  onSliceChange?: (index: number, field: 'label' | 'formattedValue', value: string) => void;
  onAddSlice?: () => void;
  onRemoveSlice?: (index: number) => void;
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

const SLICE_COLORS_LIGHT = ['var(--theme-primary)', 'var(--theme-accent)', '#64748b', '#94a3b8', '#cbd5e1'];
const SLICE_COLORS_DARK = ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.30)', 'rgba(255,255,255,0.20)', 'rgba(255,255,255,0.15)'];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function ROIPieChart({
  slices = ROI_PIE_CHART_PLACEHOLDER.slices,
  title,
  onTitleChange,
  onSliceChange,
  onAddSlice,
  onRemoveSlice,
  darkTheme,
}: ROIPieChartProps) {
  const colors = darkTheme ? SLICE_COLORS_DARK : SLICE_COLORS_LIGHT;
  const sum = slices.reduce((s, sl) => s + Math.max(0, sl.value), 0);

  const labelCls = darkTheme ? 'text-white/80' : 'text-gray-700';
  const valueCls = darkTheme ? 'text-white font-bold' : 'font-bold';
  const valueStyle = darkTheme ? undefined : { color: 'var(--theme-primary)' } as React.CSSProperties;

  const renderTitle = () =>
    title !== undefined && (
      onTitleChange ? (
        <DirectEditableText
          value={title}
          onChange={onTitleChange}
          as="h3"
          className={`text-lg font-semibold mb-3 self-start ${darkTheme ? 'text-white/80' : ''}`}
          style={darkTheme ? undefined : { color: 'var(--theme-primary)' }}
        />
      ) : (
        <ResolvedSpan
          as="h3"
          className={`text-lg font-semibold mb-3 self-start ${darkTheme ? 'text-white/80' : ''}`}
          style={darkTheme ? undefined : { color: 'var(--theme-primary)' }}
        >
          {title}
        </ResolvedSpan>
      )
    );

  // Single-slice fallback: render a clean stat card rather than a full-circle "pie" of one color.
  if (slices.length === 1) {
    const only = slices[0];
    return (
      <div className="flex flex-col h-full">
        {renderTitle()}
        <div
          className={`flex-1 flex flex-col items-center justify-center rounded-xl p-6 relative group ${
            darkTheme ? 'bg-white/10 border border-white/10' : 'bg-gray-50 border border-gray-200'
          }`}
        >
          {onRemoveSlice && <RemoveItemButton onRemove={() => onRemoveSlice(0)} title="Remove slice" />}
          {onSliceChange ? (
            <DirectEditableText
              value={only.label}
              onChange={(v) => onSliceChange(0, 'label', v)}
              as="div"
              className={`text-sm font-semibold uppercase tracking-wide mb-2 ${darkTheme ? 'text-white/60' : ''}`}
              style={!darkTheme ? { color: 'var(--theme-primary)' } : undefined}
            />
          ) : (
            <ResolvedSpan
              as="div"
              className={`text-sm font-semibold uppercase tracking-wide mb-2 ${darkTheme ? 'text-white/60' : ''}`}
              style={!darkTheme ? { color: 'var(--theme-primary)' } : undefined}
            >
              {only.label}
            </ResolvedSpan>
          )}
          {onSliceChange ? (
            <DirectEditableText
              value={only.formattedValue}
              onChange={(v) => onSliceChange(0, 'formattedValue', v)}
              as="div"
              className={`text-4xl font-bold ${darkTheme ? 'text-white' : ''}`}
              style={!darkTheme ? { color: 'var(--theme-primary)' } : undefined}
            />
          ) : (
            <ResolvedSpan
              as="div"
              className={`text-4xl font-bold ${darkTheme ? 'text-white' : ''}`}
              style={!darkTheme ? { color: 'var(--theme-primary)' } : undefined}
            >
              {only.formattedValue}
            </ResolvedSpan>
          )}
        </div>
        {onAddSlice && (
          <div className="mt-3">
            <AddItemButton onAdd={onAddSlice} label="Add slice" darkTheme={darkTheme} />
          </div>
        )}
      </div>
    );
  }

  // Multi-slice pie with leader-line labels — labels anchor to each slice
  // from the outside (nearest to the slice), so the legend doesn't cover the pie.
  const viewW = 440;
  const viewH = 240;
  const cx = viewW / 2;
  const cy = viewH / 2;
  const r = 72;
  const leaderStart = r + 3;
  const leaderElbow = r + 18;
  const leaderEnd = r + 36;
  let currentAngle = 0;

  const segments: {
    d: string;
    color: string;
    midAngle: number;
    slice: PieSlice;
    index: number;
    leader: { start: { x: number; y: number }; elbow: { x: number; y: number }; end: { x: number; y: number } };
    labelSide: 'left' | 'right';
    labelX: number;
    labelY: number;
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

    // Leader line: radial from slice edge to an "elbow", then horizontal to the label
    const leaderStartPt = polarToCartesian(cx, cy, leaderStart, midAngle);
    const elbowPt = polarToCartesian(cx, cy, leaderElbow, midAngle);
    const labelSide: 'left' | 'right' = elbowPt.x >= cx ? 'right' : 'left';
    const horizExtend = labelSide === 'right' ? leaderEnd : -leaderEnd;
    const labelTipX = cx + horizExtend;
    const leaderEndPt = { x: labelTipX, y: elbowPt.y };

    segments.push({
      d,
      color: colors[i % colors.length],
      midAngle,
      slice,
      index: i,
      leader: { start: leaderStartPt, elbow: elbowPt, end: leaderEndPt },
      labelSide,
      labelX: labelTipX + (labelSide === 'right' ? 4 : -4),
      labelY: elbowPt.y,
    });
    currentAngle += sweep;
  });

  const leaderStroke = darkTheme ? 'rgba(255,255,255,0.45)' : '#94a3b8';

  return (
    <div className="flex flex-col h-full">
      {renderTitle()}
      <div className="relative w-full flex-1" style={{ aspectRatio: `${viewW} / ${viewH}` }}>
        <svg viewBox={`0 0 ${viewW} ${viewH}`} className="absolute inset-0 w-full h-full overflow-visible">
          {segments.map((seg, i) => (
            <path key={`slice-${i}`} d={seg.d} fill={seg.color} />
          ))}
          {segments.map((seg, i) => (
            <polyline
              key={`leader-${i}`}
              points={`${seg.leader.start.x},${seg.leader.start.y} ${seg.leader.elbow.x},${seg.leader.elbow.y} ${seg.leader.end.x},${seg.leader.end.y}`}
              fill="none"
              stroke={leaderStroke}
              strokeWidth={1}
            />
          ))}
          {segments.map((seg, i) => (
            <circle
              key={`dot-${i}`}
              cx={seg.leader.end.x}
              cy={seg.leader.end.y}
              r={2}
              fill={seg.color}
            />
          ))}
        </svg>

        {/* Absolutely-positioned label blocks — editable via DirectEditableText */}
        {segments.map((seg) => (
          <div
            key={`label-${seg.index}`}
            className="absolute group"
            style={{
              left: `${(seg.labelX / viewW) * 100}%`,
              top: `${(seg.labelY / viewH) * 100}%`,
              transform: `translate(${seg.labelSide === 'left' ? '-100%' : '0'}, -50%)`,
              maxWidth: '32%',
              textAlign: seg.labelSide === 'left' ? 'right' : 'left',
            }}
          >
            {onRemoveSlice && slices.length > 1 && (
              <RemoveItemButton onRemove={() => onRemoveSlice(seg.index)} title="Remove slice" />
            )}
            {onSliceChange ? (
              <DirectEditableText
                value={seg.slice.label}
                onChange={(v) => onSliceChange(seg.index, 'label', v)}
                as="div"
                className={`text-xs leading-tight ${labelCls}`}
              />
            ) : (
              <ResolvedSpan as="div" className={`text-xs leading-tight ${labelCls}`}>{seg.slice.label}</ResolvedSpan>
            )}
            {onSliceChange ? (
              <DirectEditableText
                value={seg.slice.formattedValue}
                onChange={(v) => onSliceChange(seg.index, 'formattedValue', v)}
                as="div"
                className={`text-sm leading-tight ${valueCls}`}
                style={valueStyle}
              />
            ) : (
              <ResolvedSpan as="div" className={`text-sm leading-tight ${valueCls}`} style={valueStyle}>{seg.slice.formattedValue}</ResolvedSpan>
            )}
          </div>
        ))}
      </div>
      {onAddSlice && (
        <div className="mt-3">
          <AddItemButton onAdd={onAddSlice} label="Add slice" darkTheme={darkTheme} />
        </div>
      )}
    </div>
  );
}
