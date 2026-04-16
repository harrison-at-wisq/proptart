'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLayoutMode } from './LayoutModeContext';

export interface DirectEditableTextProps {
  value: string;
  onChange: (value: string) => void;
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'span' | 'li' | 'div';
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  placeholder?: string;
  alwaysEditable?: boolean;
}

export function DirectEditableText({
  value,
  onChange,
  as: Component = 'p',
  className = '',
  style,
  multiline = false,
  placeholder = 'Click to edit...',
  alwaysEditable = false,
}: DirectEditableTextProps) {
  const { layoutMode: rawLayoutMode } = useLayoutMode();
  const layoutMode = alwaysEditable ? false : rawLayoutMode;
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (layoutMode) return;
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  const displayValue = localValue || placeholder;

  if (isEditing) {
    const inputClasses = `
      w-full bg-white border-2 border-[#03143B] rounded px-2 py-1
      focus:outline-none focus:ring-2 focus:ring-[#03143B]/50
      !text-black font-inherit
      ${className}
    `;

    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={inputClasses}
          rows={3}
          style={{ resize: 'vertical' }}
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={inputClasses}
      />
    );
  }

  return (
    <Component
      onClick={handleClick}
      className={`
        ${className}
        cursor-pointer
        hover:bg-[#03143B]/5 hover:outline hover:outline-2 hover:outline-dashed hover:outline-[#03143B]/30
        transition-all duration-150 rounded
        print:hover:bg-transparent print:hover:outline-none
      `}
      style={style}
      title="Click to edit"
    >
      {displayValue}
    </Component>
  );
}
