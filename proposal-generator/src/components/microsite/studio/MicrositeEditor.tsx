'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProposalInputs, ColorPalette } from '@/types/proposal';
import { DEFAULT_COLOR_PALETTE } from '@/types/proposal';
import type { MicrositeData, MicrositeSection, MicrositeSectionType } from '@/types/microsite';
import { LayoutModeContext, LayoutModeProvider } from '@/components/ui/LayoutModeContext';
import { MicrositeDocument } from '@/components/microsite/MicrositeDocument';
import { MICROSITE_SECTION_CATALOG } from '@/components/microsite/registry';
import {
  buildDefaultMicrositeSections,
  cryptoRandomId,
  readMicrositeSections,
  writeMicrositeSections,
} from '@/lib/microsite-sections';
import { LayoutModeToggle } from './LayoutModeToggle';
import { UndoRedoControls } from './UndoRedoControls';
import { ColorPaletteControls } from './ColorPaletteControls';
import { SectionFrame } from './SectionFrame';
import { SectionPicker } from './SectionPicker';

const HISTORY_LIMIT = 100;
const SAVE_DEBOUNCE_MS = 600;

interface Props {
  slug: string;
  initialDraft: MicrositeData;
  onDraftSaved?: (draft: MicrositeData) => void;
}

type PickerTarget = { mode: 'append' } | { mode: 'insert-after'; sectionId: string };

export function MicrositeEditor({ slug, initialDraft, onDraftSaved }: Props) {
  const [draft, setDraft] = useState<MicrositeData>(() => ensureSections(initialDraft));
  const [layoutMode, setLayoutMode] = useState(false);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Undo / redo ─────────────────────────────────────────────────────────
  const undoStackRef = useRef<MicrositeData[]>([]);
  const redoStackRef = useRef<MicrositeData[]>([]);
  const isTimeTravelingRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, [initialDraft]);

  const applyDraft = useCallback(
    (updater: (prev: MicrositeData) => MicrositeData) => {
      setDraft((prev) => {
        const next = updater(prev);
        if (!isTimeTravelingRef.current) {
          undoStackRef.current.push(clone(prev));
          if (undoStackRef.current.length > HISTORY_LIMIT) undoStackRef.current.shift();
          redoStackRef.current = [];
          setCanUndo(true);
          setCanRedo(false);
        }
        return next;
      });
    },
    []
  );

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const prior = undoStackRef.current.pop()!;
    setDraft((current) => {
      redoStackRef.current.push(clone(current));
      isTimeTravelingRef.current = true;
      queueMicrotask(() => {
        isTimeTravelingRef.current = false;
      });
      return prior;
    });
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const future = redoStackRef.current.pop()!;
    setDraft((current) => {
      undoStackRef.current.push(clone(current));
      isTimeTravelingRef.current = true;
      queueMicrotask(() => {
        isTimeTravelingRef.current = false;
      });
      return future;
    });
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  // Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z keyboard shortcuts, only in layout mode.
  useEffect(() => {
    if (!layoutMode) return;
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [layoutMode, undo, redo]);

  // ── Debounced save ──────────────────────────────────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraftRef = useRef<MicrositeData>(draft);
  latestDraftRef.current = draft;

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      setSaveError(null);
      try {
        const res = await fetch(`/api/microsites/${slug}/draft`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft_data: latestDraftRef.current }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
        onDraftSaved?.(latestDraftRef.current);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Save failed');
      } finally {
        setSaving(false);
      }
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [draft, slug, onDraftSaved]);

  // ── Section operations ───────────────────────────────────────────────────
  const sections = useMemo(() => readMicrositeSections(draft), [draft]);

  const updateSections = useCallback(
    (updater: (prev: MicrositeSection[]) => MicrositeSection[]) => {
      applyDraft((prev) => writeMicrositeSections(prev, updater(readMicrositeSections(prev))));
    },
    [applyDraft]
  );

  function handleAddSection(type: MicrositeSectionType, afterSectionId?: string) {
    const newSection: MicrositeSection = { id: cryptoRandomId(), sectionType: type };
    updateSections((prev) => {
      if (!afterSectionId) return [...prev, newSection];
      const idx = prev.findIndex((s) => s.id === afterSectionId);
      if (idx === -1) return [...prev, newSection];
      const next = [...prev];
      next.splice(idx + 1, 0, newSection);
      return next;
    });
  }

  function handleDelete(sectionId: string) {
    updateSections((prev) => prev.filter((s) => s.id !== sectionId));
  }

  function handleDuplicate(sectionId: string) {
    updateSections((prev) => {
      const idx = prev.findIndex((s) => s.id === sectionId);
      if (idx === -1) return prev;
      const source = prev[idx];
      const copy: MicrositeSection = {
        id: cryptoRandomId(),
        sectionType: source.sectionType,
        data: source.data ? JSON.parse(JSON.stringify(source.data)) : undefined,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  function handleMove(sectionId: string, direction: -1 | 1) {
    updateSections((prev) => {
      const idx = prev.findIndex((s) => s.id === sectionId);
      if (idx === -1) return prev;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  }

  function handleSectionDataChange(sectionId: string, data: Record<string, unknown>) {
    updateSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, data } : s)));
  }

  function handleToggleTheme(sectionId: string) {
    updateSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        // Dark-by-default sections (like investment) cycle: undefined → light → dark → undefined.
        // Light sections cycle: undefined → dark → light → undefined.
        const investmentLikeDefault = s.sectionType === 'investment';
        const cycle = investmentLikeDefault
          ? [undefined, 'light' as const, 'dark' as const]
          : [undefined, 'dark' as const, 'light' as const];
        const idx = cycle.indexOf(s.theme);
        const nextTheme = cycle[(idx + 1) % cycle.length];
        return { ...s, theme: nextTheme };
      })
    );
  }

  function handleColorChange(palette: ColorPalette) {
    applyDraft((prev) => ({ ...prev, colorPalette: palette }));
  }

  // ── Drag-and-drop reorder ────────────────────────────────────────────────
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function handleReorderDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    updateSections((prev) => {
      const fromIdx = prev.findIndex((s) => s.id === draggingId);
      const toIdx = prev.findIndex((s) => s.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      const insertAt = fromIdx < toIdx ? toIdx : toIdx;
      next.splice(insertAt, 0, moved);
      return next;
    });
    setDraggingId(null);
    setDragOverId(null);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const palette = draft.colorPalette || DEFAULT_COLOR_PALETTE;

  return (
    <LayoutModeProvider>
      <LayoutModeBridge layoutMode={layoutMode} />
      <div className="relative">
        <MicrositeDocument
          inputs={draft}
          sections={sections}
          onSectionDataChange={handleSectionDataChange}
          renderSection={(section, body) => {
            const idx = sections.findIndex((s) => s.id === section.id);
            const label = MICROSITE_SECTION_CATALOG.find((c) => c.type === section.sectionType)?.name || section.sectionType;
            return (
              <SectionFrame
                section={section}
                label={label}
                layoutMode={layoutMode}
                isFirst={idx === 0}
                isLast={idx === sections.length - 1}
                isDragOver={dragOverId === section.id}
                dragging={draggingId === section.id}
                onMoveUp={() => handleMove(section.id, -1)}
                onMoveDown={() => handleMove(section.id, 1)}
                onDuplicate={() => handleDuplicate(section.id)}
                onDelete={() => handleDelete(section.id)}
                onToggleTheme={() => handleToggleTheme(section.id)}
                onInsertAfter={() => setPicker({ mode: 'insert-after', sectionId: section.id })}
                onDragStart={() => setDraggingId(section.id)}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDragOverId(null);
                }}
                onDragEnter={() => setDragOverId(section.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleReorderDrop(section.id)}
              >
                {body}
              </SectionFrame>
            );
          }}
        />

        {layoutMode && sections.length === 0 && (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <button
              onClick={() => setPicker({ mode: 'append' })}
              className="px-4 py-2 rounded-lg bg-[#03143B] text-white text-sm"
            >
              Add a section
            </button>
          </div>
        )}
      </div>

      {/* Fixed chrome (layout-mode only) */}
      <LayoutModeToggle active={layoutMode} onToggle={() => setLayoutMode((v) => !v)} />
      {layoutMode && (
        <>
          <UndoRedoControls canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />
          <ColorPaletteControls palette={palette} onChange={handleColorChange} />
          <button
            onClick={() => setPicker({ mode: 'append' })}
            className="fixed bottom-6 right-20 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#03143B] text-white rounded-full shadow-lg hover:bg-[#03143B]/90 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium">Add Section</span>
          </button>
        </>
      )}

      {/* Save indicator */}
      <div className="fixed top-20 left-4 z-40 text-[11px] text-gray-500">
        {saving ? 'Saving…' : saveError ? <span className="text-red-600">{saveError}</span> : 'Saved'}
      </div>

      {picker && (
        <SectionPicker
          onSelect={(type) => {
            handleAddSection(type, picker.mode === 'insert-after' ? picker.sectionId : undefined);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </LayoutModeProvider>
  );
}

// Bridges the editor's local layoutMode into the LayoutModeContext provider
// so section components (e.g. ValueDrivers) can subscribe without passing
// props through every level.
function LayoutModeBridge({ layoutMode }: { layoutMode: boolean }) {
  const ctx = React.useContext(LayoutModeContext);
  useEffect(() => {
    ctx.setLayoutMode(layoutMode);
  }, [ctx, layoutMode]);
  return null;
}

function ensureSections(draft: MicrositeData): MicrositeData {
  if (draft._layout?.sections?.length) return draft;
  return { ...draft, _layout: { sections: buildDefaultMicrositeSections() } };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
