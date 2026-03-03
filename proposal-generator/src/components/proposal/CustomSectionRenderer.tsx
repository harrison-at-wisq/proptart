'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { CustomSectionConfig, SectionLayout, ProposalElementType } from '@/types/proposal';
import { ELEMENT_REGISTRY, ELEMENT_CATALOG } from './templates/registry';
import { getEditableDataKey } from './templates/element-defaults';
import { LayoutSection } from '@/components/ui/LayoutSection';
import type { BlockDef } from '@/components/ui/LayoutSection';
import { useLayoutMode } from '@/components/ui/LayoutModeContext';

interface CustomSectionRendererProps {
  section: CustomSectionConfig;
  onUpdateElement: (sectionId: string, elementId: string, data: Record<string, unknown>) => void;
  onRemoveElement: (sectionId: string, elementId: string) => void;
  onAddElement: (sectionId: string, elementType: ProposalElementType, colSpan: number, insertAt: number) => void;
  onLayoutChange: (sectionId: string, layout: SectionLayout) => void;
  onRemoveSection: (sectionId: string) => void;
  onRenameSection: (sectionId: string, name: string) => void;
}

export function CustomSectionRenderer({
  section,
  onUpdateElement,
  onRemoveElement,
  onAddElement,
  onLayoutChange,
  onRemoveSection,
  onRenameSection,
}: CustomSectionRendererProps) {
  const { layoutMode } = useLayoutMode();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const [showElementPicker, setShowElementPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleRename = () => {
    if (editName.trim() && editName !== section.name) {
      onRenameSection(section.id, editName.trim());
    }
    setIsEditing(false);
  };

  // Build BlockDef[] from section elements
  const blocks: BlockDef[] = section.elements.map((el) => {
    const Component = ELEMENT_REGISTRY[el.elementType];
    if (!Component) return null;

    const editableKey = getEditableDataKey(el.elementType);

    return {
      blockId: el.id,
      label: el.label,
      defaultColSpan: el.colSpan,
      render: () => {
        const props: Record<string, unknown> = {
          ...el.data,
          darkTheme: section.darkTheme,
        };

        // Inject onChange for editable elements
        if (editableKey === 'text') {
          props.onChange = (value: string) => {
            onUpdateElement(section.id, el.id, { ...el.data, text: value });
          };
        } else if (editableKey === 'items') {
          props.onChange = (items: unknown[]) => {
            onUpdateElement(section.id, el.id, { ...el.data, items });
          };
        }

        return <Component {...props} />;
      },
    };
  }).filter(Boolean) as BlockDef[];

  const handleSectionLayoutChange = (_sectionKey: string, layout: SectionLayout) => {
    onLayoutChange(section.id, layout);
  };

  const darkTheme = section.darkTheme;
  const headingColor = darkTheme ? 'text-white' : 'text-[#03143B]';
  const subtleColor = darkTheme ? 'text-white/50' : 'text-gray-400';
  const btnHover = darkTheme ? 'hover:bg-white/10' : 'hover:bg-gray-100';

  return (
    <div>
      {/* Section header bar — visible in layout mode */}
      {layoutMode && (
        <div className={`flex items-center justify-between mb-4 pb-2 border-b ${darkTheme ? 'border-white/20' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <input
                ref={inputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') { setEditName(section.name); setIsEditing(false); }
                }}
                className={`text-lg font-bold bg-transparent border-b-2 outline-none px-1 ${headingColor} ${darkTheme ? 'border-white/50' : 'border-[#03143B]'}`}
              />
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className={`text-lg font-bold ${headingColor} hover:underline`}
              >
                {section.name}
              </button>
            )}
            <span className={`text-xs ${subtleColor}`}>Custom Section</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowElementPicker(!showElementPicker)}
              className={`p-1.5 rounded ${subtleColor} ${btnHover} transition-colors`}
              title="Add element"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={() => onRemoveSection(section.id)}
              className={`p-1.5 rounded text-red-400 hover:text-red-600 ${btnHover} transition-colors`}
              title="Remove section"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Element picker dropdown */}
      {layoutMode && showElementPicker && (
        <ElementPicker
          darkTheme={darkTheme}
          onSelect={(elementType, colSpan) => {
            onAddElement(section.id, elementType, colSpan, section.elements.length);
            setShowElementPicker(false);
          }}
          onClose={() => setShowElementPicker(false)}
        />
      )}

      {/* Render elements via LayoutSection */}
      {blocks.length > 0 ? (
        <LayoutSection
          sectionKey={section.id}
          blocks={blocks}
          layout={section.layout}
          onLayoutChange={handleSectionLayoutChange}
        />
      ) : (
        layoutMode && (
          <div
            onClick={() => setShowElementPicker(true)}
            className={`flex items-center justify-center min-h-[200px] border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              darkTheme
                ? 'border-white/20 hover:border-white/40 text-white/40'
                : 'border-gray-300 hover:border-gray-400 text-gray-400'
            }`}
          >
            <div className="text-center">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <p className="text-sm font-medium">Add your first element</p>
            </div>
          </div>
        )
      )}

      {/* Remove element buttons in layout mode */}
      {layoutMode && blocks.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {section.elements.map((el) => (
            <button
              key={el.id}
              onClick={() => onRemoveElement(section.id, el.id)}
              className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                darkTheme
                  ? 'bg-white/10 text-white/60 hover:bg-red-500/20 hover:text-red-300'
                  : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
              }`}
              title={`Remove ${el.label}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {el.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Inline element type picker grouped by category */
function ElementPicker({
  darkTheme,
  onSelect,
  onClose,
}: {
  darkTheme?: boolean;
  onSelect: (type: ProposalElementType, colSpan: number) => void;
  onClose: () => void;
}) {
  const categories = ['text', 'data', 'cards', 'lists', 'layout'] as const;
  const categoryLabels: Record<string, string> = {
    text: 'Text',
    data: 'Data',
    cards: 'Cards',
    lists: 'Lists',
    layout: 'Layout',
  };

  const bgClass = darkTheme ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = darkTheme ? 'text-white' : 'text-gray-900';
  const subtextClass = darkTheme ? 'text-white/60' : 'text-gray-500';
  const itemHover = darkTheme ? 'hover:bg-white/10' : 'hover:bg-gray-50';
  const categoryColor = darkTheme ? 'text-white/40' : 'text-gray-400';

  return (
    <div className={`mb-4 rounded-lg border shadow-lg p-3 ${bgClass}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-sm font-semibold ${textClass}`}>Add Element</h4>
        <button onClick={onClose} className={`p-1 rounded ${subtextClass} ${itemHover}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 max-h-[300px] overflow-y-auto">
        {categories.map((cat) => {
          const items = ELEMENT_CATALOG.filter((e) => e.category === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat} className="mb-2">
              <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${categoryColor}`}>
                {categoryLabels[cat]}
              </div>
              {items.map((item) => (
                <button
                  key={item.type}
                  onClick={() => onSelect(item.type, item.defaultColSpan)}
                  className={`w-full text-left px-2 py-1 rounded text-xs ${textClass} ${itemHover} transition-colors`}
                >
                  <div className="font-medium">{item.name}</div>
                  <div className={`${subtextClass} text-[10px]`}>{item.description}</div>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
