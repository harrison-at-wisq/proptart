'use client';

import React from 'react';
import { CustomBlock, WidgetItem } from '@/types/proposal';
import { DirectEditableText } from './DirectEditableText';
import { WidgetGroup } from './WidgetGroup';

interface CustomBlockRendererProps {
  block: CustomBlock;
  onUpdate: (blockId: string, data: CustomBlock['data']) => void;
  onRemove: (blockId: string) => void;
}

export function CustomBlockRenderer({ block, onUpdate, onRemove }: CustomBlockRendererProps) {
  const { type, data } = block;

  const updateItems = (items: WidgetItem[]) => {
    onUpdate(block.id, { ...data, items });
  };

  const updateText = (text: string) => {
    onUpdate(block.id, { ...data, text });
  };

  const updateItemField = (itemId: string, field: string, value: string) => {
    const updated = (data.items || []).map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    );
    updateItems(updated);
  };

  return (
    <div className="relative group/custom">
      {/* Remove button */}
      <button
        onClick={() => onRemove(block.id)}
        className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-red-50 border border-red-200 rounded flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-100 opacity-0 group-hover/custom:opacity-100 transition-opacity print:hidden"
        title="Remove block"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {type === 'text' && (
        <DirectEditableText
          value={data.text || ''}
          onChange={updateText}
          as="p"
          className="text-gray-700"
          multiline
          placeholder="Click to edit text..."
        />
      )}

      {type === 'heading' && (
        <div className="border-t border-gray-200 pt-4">
          <DirectEditableText
            value={data.text || ''}
            onChange={updateText}
            as="h3"
            className="text-xl font-semibold text-[#03143B]"
            placeholder="Click to edit heading..."
          />
        </div>
      )}

      {type === 'card-grid-2' && (
        <WidgetGroup
          items={data.items || []}
          onChange={updateItems}
          layout="grid-2"
          minItems={1}
          addLabel="Add card"
          createNewItem={() => ({ id: crypto.randomUUID(), headline: 'New headline...', description: 'Describe...' })}
          renderItem={(item) => (
            <div className="p-4 bg-white border-l-4 border-[#03143B] shadow-sm">
              <DirectEditableText
                value={item.headline as string}
                onChange={(value) => updateItemField(item.id, 'headline', value)}
                as="h4"
                className="font-semibold text-gray-900 mb-1"
              />
              <DirectEditableText
                value={item.description as string}
                onChange={(value) => updateItemField(item.id, 'description', value)}
                as="p"
                className="text-gray-600 text-sm"
                multiline
              />
            </div>
          )}
        />
      )}

      {type === 'card-grid-3' && (
        <WidgetGroup
          items={data.items || []}
          onChange={updateItems}
          layout="grid-3"
          minItems={1}
          addLabel="Add card"
          createNewItem={() => ({ id: crypto.randomUUID(), title: 'New title...', description: 'Describe...' })}
          renderItem={(item) => (
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <DirectEditableText
                value={item.title as string}
                onChange={(value) => updateItemField(item.id, 'title', value)}
                as="h4"
                className="font-semibold text-[#03143B] mb-1 text-sm"
              />
              <DirectEditableText
                value={item.description as string}
                onChange={(value) => updateItemField(item.id, 'description', value)}
                as="p"
                className="text-gray-600 text-xs"
                multiline
              />
            </div>
          )}
        />
      )}

      {type === 'bullet-list' && (
        <WidgetGroup
          items={data.items || []}
          onChange={updateItems}
          layout="list"
          minItems={1}
          addLabel="Add bullet"
          createNewItem={() => ({ id: crypto.randomUUID(), text: 'New item...' })}
          renderItem={(item) => (
            <li className="flex items-start gap-2 text-gray-600 text-sm">
              <span className="w-1.5 h-1.5 bg-[#03143B] rounded-full mt-2 flex-shrink-0"></span>
              <DirectEditableText
                value={item.text as string}
                onChange={(value) => updateItemField(item.id, 'text', value)}
                as="span"
              />
            </li>
          )}
        />
      )}

      {type === 'numbered-list' && (
        <WidgetGroup
          items={data.items || []}
          onChange={updateItems}
          layout="list"
          minItems={1}
          addLabel="Add step"
          createNewItem={() => ({ id: crypto.randomUUID(), title: 'New Step', description: 'Describe...' })}
          renderItem={(item, index) => (
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-[#03143B] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                {index + 1}
              </div>
              <div>
                <DirectEditableText
                  value={item.title as string}
                  onChange={(value) => updateItemField(item.id, 'title', value)}
                  as="h3"
                  className="font-semibold text-gray-900"
                />
                <DirectEditableText
                  value={item.description as string}
                  onChange={(value) => updateItemField(item.id, 'description', value)}
                  as="p"
                  className="text-gray-600 text-sm"
                  multiline
                />
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
