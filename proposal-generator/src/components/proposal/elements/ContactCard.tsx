'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';

interface ContactCardProps {
  prompt?: string;
  name?: string;
  email?: string;
  onPromptChange?: (value: string) => void;
  onNameChange?: (value: string) => void;
  onEmailChange?: (value: string) => void;
  darkTheme?: boolean;
}

export const CONTACT_CARD_PLACEHOLDER = {
  prompt: "Questions? Let's talk.",
  name: 'Your Contact Name',
  email: 'contact@company.com',
};

export function ContactCard({
  prompt = CONTACT_CARD_PLACEHOLDER.prompt,
  name = CONTACT_CARD_PLACEHOLDER.name,
  email = CONTACT_CARD_PLACEHOLDER.email,
  onPromptChange,
  onNameChange,
  onEmailChange,
  darkTheme,
}: ContactCardProps) {
  const bgClass = darkTheme
    ? 'bg-white/10 p-5 rounded-lg'
    : 'bg-gray-50 p-5 rounded-lg border border-gray-200';
  const promptColor = darkTheme ? 'text-white/70' : 'text-gray-600';
  const nameColor = darkTheme ? 'text-white' : '';
  const nameStyle = darkTheme ? undefined : { color: 'var(--theme-primary)' } as React.CSSProperties;

  return (
    <div className={bgClass}>
      {onPromptChange ? (
        <DirectEditableText
          value={prompt}
          onChange={onPromptChange}
          as="p"
          className={`${promptColor} mb-1`}
        />
      ) : (
        <p className={`${promptColor} mb-1`}>{prompt}</p>
      )}
      {name && (onNameChange ? (
        <DirectEditableText
          value={name}
          onChange={onNameChange}
          as="p"
          className={`text-xl font-semibold ${nameColor}`}
          style={nameStyle}
        />
      ) : (
        <p className={`text-xl font-semibold ${nameColor}`} style={nameStyle}>{name}</p>
      ))}
      {email && (onEmailChange ? (
        <DirectEditableText
          value={email}
          onChange={onEmailChange}
          as="p"
          className={`text-lg ${nameColor}`}
          style={nameStyle}
        />
      ) : (
        <p className={`text-lg ${nameColor}`} style={nameStyle}>{email}</p>
      ))}
    </div>
  );
}
