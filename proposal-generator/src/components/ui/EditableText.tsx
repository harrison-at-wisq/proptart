'use client';

import React, { useState, useRef, useEffect } from 'react';

interface EditableTextProps {
  value: string;
  defaultValue: string;
  onChange: (value: string) => void;
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'span' | 'li' | 'div';
  className?: string;
  multiline?: boolean;
  placeholder?: string;
}

export function EditableText({
  value,
  defaultValue,
  onChange,
  as: Component = 'p',
  className = '',
  multiline = false,
  placeholder = 'Click to edit...',
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || defaultValue);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value || defaultValue);
  }, [value, defaultValue]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
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
      setLocalValue(value || defaultValue);
      setIsEditing(false);
    }
  };

  const displayValue = localValue || placeholder;
  const isModified = value && value !== defaultValue;

  if (isEditing) {
    const inputClasses = `
      w-full bg-white border-2 border-[#03143B] rounded px-2 py-1
      focus:outline-none focus:ring-2 focus:ring-[#03143B]/50
      text-inherit font-inherit
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
        ${isModified ? 'relative' : ''}
      `}
      title="Click to edit"
    >
      {displayValue}
      {isModified && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#03143B] rounded-full print:hidden" />
      )}
    </Component>
  );
}

// Wrapper for bullet lists
interface EditableBulletListProps {
  values: string[];
  defaultValues: string[];
  onChange: (values: string[]) => void;
  className?: string;
  bulletClassName?: string;
}

export function EditableBulletList({
  values,
  defaultValues,
  onChange,
  className = '',
  bulletClassName = '',
}: EditableBulletListProps) {
  const handleItemChange = (index: number, newValue: string) => {
    const newValues = [...(values.length ? values : defaultValues)];
    newValues[index] = newValue;
    onChange(newValues);
  };

  const displayValues = values.length ? values : defaultValues;

  return (
    <ul className={className}>
      {displayValues.map((item, index) => (
        <li key={index} className={bulletClassName}>
          <EditableText
            value={values[index] || ''}
            defaultValue={defaultValues[index] || ''}
            onChange={(newValue) => handleItemChange(index, newValue)}
            as="span"
          />
        </li>
      ))}
    </ul>
  );
}
