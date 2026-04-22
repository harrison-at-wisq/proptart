'use client';

import { createContext, useContext } from 'react';
import type { ExportVariables } from '@/lib/export-variables';
import { resolveTokens } from '@/lib/export-variables';

const ExportVariablesContext = createContext<ExportVariables | null>(null);

export function ExportVariablesProvider({
  value,
  children,
}: {
  value: ExportVariables;
  children: React.ReactNode;
}) {
  return <ExportVariablesContext.Provider value={value}>{children}</ExportVariablesContext.Provider>;
}

/** Returns the variables map, or null when not inside a provider. */
export function useExportVariables(): ExportVariables | null {
  return useContext(ExportVariablesContext);
}

/** Resolves `{{tokens}}` against the current provider. Pass-through when no provider. */
export function useResolveText(text: string | undefined): string {
  const vars = useContext(ExportVariablesContext);
  if (!text) return '';
  if (!vars) return text;
  return resolveTokens(text, vars);
}

type ResolvedTextTag = 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'li';

/**
 * Wrapper that renders its string content with `{{tokens}}` resolved against
 * the current ExportVariablesProvider. Use in read-only (non-editable) paths
 * wherever a template string that could contain tokens is rendered.
 */
export function ResolvedSpan({
  children,
  as = 'span',
  className,
  style,
}: {
  children: string;
  as?: ResolvedTextTag;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Component = as as React.ElementType;
  const resolved = useResolveText(children);
  return <Component className={className} style={style}>{resolved}</Component>;
}
