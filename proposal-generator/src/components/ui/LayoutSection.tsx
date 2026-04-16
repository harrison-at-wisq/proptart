'use client';

import React, { useCallback, useState } from 'react';
import { useLayoutMode } from './LayoutModeContext';
import { LayoutBlock } from './LayoutBlock';
import { BlockInserter } from './BlockInserter';
import { BlockLayout, SectionLayout, CustomBlockType } from '@/types/proposal';

/** Default block definition for a section */
export interface BlockDef {
  blockId: string;
  label?: string;
  defaultColSpan: number;
  render: () => React.ReactNode;
}

interface LayoutSectionProps {
  sectionKey: string;
  blocks: BlockDef[];
  blockRegistry?: Record<string, BlockDef>;
  layout?: SectionLayout;
  onLayoutChange: (sectionKey: string, layout: SectionLayout) => void;
  onCrossSectionDrop?: (
    targetSection: string,
    fromSection: string,
    blockIds: string[],
    targetIndex: number
  ) => void;
  onInsertBlock?: (sectionKey: string, type: CustomBlockType, insertAtOrder: number) => void;
  className?: string;
}

export function LayoutSection({
  sectionKey,
  blocks,
  blockRegistry,
  layout,
  onLayoutChange,
  onCrossSectionDrop,
  onInsertBlock,
  className = '',
}: LayoutSectionProps) {
  const { layoutMode } = useLayoutMode();
  const [draggingGroupIds, setDraggingGroupIds] = useState<string[]>([]);
  const [isSectionDragOver, setIsSectionDragOver] = useState(false);

  // Build resolved block list: merge saved layout with defaults
  // If layout exists, it may contain blocks from other sections (via cross-section move)
  const resolvedBlocks = (() => {
    if (!layout?.blocks?.length) {
      return blocks.map((def, defaultOrder) => ({
        ...def,
        colSpan: def.defaultColSpan,
        order: defaultOrder,
      }));
    }
    const saved = layout.blocks.map(bl => {
      const def = blocks.find(b => b.blockId === bl.blockId)
                  || blockRegistry?.[bl.blockId];
      if (!def) return null;
      return { ...def, colSpan: bl.colSpan, order: bl.order };
    }).filter(Boolean) as Array<BlockDef & { colSpan: number; order: number }>;

    const savedIds = new Set(layout.blocks.map(bl => bl.blockId));
    const maxOrder = saved.length > 0 ? Math.max(...saved.map(b => b.order)) : -1;
    const newBlocks = blocks
      .filter(b => !savedIds.has(b.blockId))
      .map((def, i) => ({
        ...def,
        colSpan: def.defaultColSpan,
        order: maxOrder + 1 + i,
      }));

    return [...saved, ...newBlocks];
  })();

  // Sort by order for rendering
  const sortedBlocks = [...resolvedBlocks].sort((a, b) => a.order - b.order);

  // Compute row groups for each block
  const rowGroups = computeAllRowGroups(sortedBlocks);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    const newBlocks: BlockLayout[] = sortedBlocks.map((b, i) => ({
      blockId: b.blockId,
      colSpan: b.colSpan,
      order: i,
    }));

    // Swap the two blocks' orders
    const fromOrder = newBlocks[fromIndex].order;
    newBlocks[fromIndex].order = newBlocks[toIndex].order;
    newBlocks[toIndex].order = fromOrder;

    onLayoutChange(sectionKey, { blocks: newBlocks });
  }, [sortedBlocks, sectionKey, onLayoutChange]);

  const handleResize = useCallback((blockId: string, newSpan: number) => {
    const blockIndex = sortedBlocks.findIndex(b => b.blockId === blockId);
    if (blockIndex === -1) return;

    const rowBlocks = findRowBlocks(sortedBlocks, blockIndex);
    if (rowBlocks.length < 2) return;

    const totalRowSpan = rowBlocks.reduce((sum, b) => sum + b.colSpan, 0);
    const resizedBlock = rowBlocks.find(b => b.blockId === blockId)!;
    const delta = newSpan - resizedBlock.colSpan;

    if (delta === 0) return;

    const others = rowBlocks.filter(b => b.blockId !== blockId);
    const adjustment = -delta / others.length;
    let valid = true;
    const adjustedOthers = others.map(b => {
      const adjusted = Math.round(b.colSpan + adjustment);
      if (adjusted < 3 || adjusted > 12) valid = false;
      return { ...b, colSpan: adjusted };
    });

    if (!valid) return;

    const newTotal = newSpan + adjustedOthers.reduce((s, b) => s + b.colSpan, 0);
    if (newTotal !== totalRowSpan) return;

    const newBlocks: BlockLayout[] = sortedBlocks.map((b, i) => {
      if (b.blockId === blockId) return { blockId, colSpan: newSpan, order: i };
      const adjusted = adjustedOthers.find(a => a.blockId === b.blockId);
      if (adjusted) return { blockId: b.blockId, colSpan: adjusted.colSpan, order: i };
      return { blockId: b.blockId, colSpan: b.colSpan, order: i };
    });

    onLayoutChange(sectionKey, { blocks: newBlocks });
  }, [sortedBlocks, sectionKey, onLayoutChange]);

  const handleCrossSectionDrop = useCallback((fromSection: string, blockIds: string[], toIndex: number) => {
    onCrossSectionDrop?.(sectionKey, fromSection, blockIds, toIndex);
  }, [sectionKey, onCrossSectionDrop]);

  // Section-level drop zone handlers (for dropping at end of section)
  const handleSectionDragOver = (e: React.DragEvent) => {
    if (!layoutMode) return;
    // Only react if dropping from a different section
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsSectionDragOver(true);
  };

  const handleSectionDragLeave = () => {
    setIsSectionDragOver(false);
  };

  const handleSectionDrop = (e: React.DragEvent) => {
    if (!layoutMode) return;
    e.preventDefault();
    setIsSectionDragOver(false);

    const raw = e.dataTransfer.getData('application/layout-block');
    if (!raw) return;

    try {
      const data = JSON.parse(raw) as {
        sectionKey: string;
        blockId: string;
        index: number;
        groupBlockIds: string[];
      };

      if (data.sectionKey !== sectionKey) {
        // Cross-section drop at end of section
        onCrossSectionDrop?.(sectionKey, data.sectionKey, data.groupBlockIds, sortedBlocks.length);
      }
    } catch {
      // Ignore
    }
  };

  const handleGroupDragStart = useCallback((blockIds: string[]) => {
    setDraggingGroupIds(blockIds);
  }, []);

  const handleGroupDragEnd = useCallback(() => {
    setDraggingGroupIds([]);
  }, []);

  return (
    <div
      className={`grid grid-cols-12 gap-x-6 gap-y-4 ${
        layoutMode ? 'bg-gray-200/50 rounded-lg p-3 -mx-3' : ''
      } ${className}`}
    >
      {sortedBlocks.map((block, index) => {
        const content = block.render();
        if (!content) return null;

        const group = rowGroups.get(block.blockId);
        const groupIds = group && group.length > 1 ? group : undefined;

        return (
          <React.Fragment key={block.blockId}>
            <LayoutBlock
              blockId={block.blockId}
              sectionKey={sectionKey}
              label={block.label}
              colSpan={block.colSpan}
              order={block.order}
              index={index}
              groupBlockIds={groupIds}
              isDraggingAsGroup={
                draggingGroupIds.length > 0 &&
                draggingGroupIds.includes(block.blockId) &&
                !draggingGroupIds.includes(block.blockId + '__self')
              }
              onReorder={handleReorder}
              onResize={block.colSpan < 12 ? handleResize : undefined}
              onCrossSectionDrop={handleCrossSectionDrop}
              onGroupDragStart={handleGroupDragStart}
              onGroupDragEnd={handleGroupDragEnd}
            >
              {content}
            </LayoutBlock>
            {onInsertBlock && (
              <BlockInserter
                sectionKey={sectionKey}
                insertAtOrder={block.order + 1}
                onInsert={onInsertBlock}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* Section-level drop zone — visible when dragging from another section */}
      {layoutMode && (
        <div
          onDragOver={handleSectionDragOver}
          onDragLeave={handleSectionDragLeave}
          onDrop={handleSectionDrop}
          className={`col-span-12 transition-all duration-150 rounded-lg border-2 border-dashed ${
            isSectionDragOver
              ? 'border-blue-400 bg-blue-50/50 min-h-[3rem]'
              : 'border-transparent min-h-[1rem]'
          }`}
        />
      )}
    </div>
  );
}

/** Find all blocks that share a row with the block at the given index */
function findRowBlocks(
  blocks: Array<{ blockId: string; colSpan: number; order: number }>,
  targetIndex: number
): Array<{ blockId: string; colSpan: number; order: number }> {
  let rowStart = 0;
  let rowSpan = 0;

  for (let i = 0; i < blocks.length; i++) {
    if (rowSpan + blocks[i].colSpan > 12 && i > rowStart) {
      if (targetIndex >= rowStart && targetIndex < i) {
        return blocks.slice(rowStart, i);
      }
      rowStart = i;
      rowSpan = 0;
    }
    rowSpan += blocks[i].colSpan;
  }

  return blocks.slice(rowStart);
}

/** Compute row groups: map each blockId to the array of blockIds in its row */
function computeAllRowGroups(
  blocks: Array<{ blockId: string; colSpan: number }>
): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  let rowStart = 0;
  let rowSpan = 0;

  const assignGroup = (start: number, end: number) => {
    const ids = blocks.slice(start, end).map(b => b.blockId);
    ids.forEach(id => groups.set(id, ids));
  };

  for (let i = 0; i < blocks.length; i++) {
    if (rowSpan + blocks[i].colSpan > 12 && i > rowStart) {
      assignGroup(rowStart, i);
      rowStart = i;
      rowSpan = 0;
    }
    rowSpan += blocks[i].colSpan;
  }

  assignGroup(rowStart, blocks.length);
  return groups;
}
