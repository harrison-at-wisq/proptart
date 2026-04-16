'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';

interface Integration {
  category: string;
  name: string;
}

interface IntegrationPillsProps {
  title?: string;
  integrations?: Integration[];
  onTitleChange?: (value: string) => void;
  onIntegrationChange?: (index: number, field: 'category' | 'name', value: string) => void;
  darkTheme?: boolean;
}

export const INTEGRATION_PILLS_PLACEHOLDER = {
  title: 'Your Integration Landscape',
  integrations: [
    { category: 'HCM', name: 'Workday' },
    { category: 'Identity', name: 'Okta' },
    { category: 'Communication', name: 'Slack' },
  ],
};

export function IntegrationPills({
  title = INTEGRATION_PILLS_PLACEHOLDER.title,
  integrations = INTEGRATION_PILLS_PLACEHOLDER.integrations,
  onTitleChange,
  onIntegrationChange,
  darkTheme,
}: IntegrationPillsProps) {
  const pillClass = darkTheme
    ? 'px-4 py-2 bg-white/20 text-white rounded-full text-sm'
    : 'px-4 py-2 text-white rounded-full text-sm';
  const pillStyle = darkTheme ? undefined : { backgroundColor: 'var(--theme-primary)' } as React.CSSProperties;
  const titleColor = darkTheme ? 'text-white' : '';
  const titleStyle = darkTheme ? undefined : { color: 'var(--theme-primary)' } as React.CSSProperties;
  const categoryOpacity = darkTheme ? 'opacity-60' : 'opacity-70';

  return (
    <>
      {title && (
        onTitleChange ? (
          <DirectEditableText value={title} onChange={onTitleChange} as="h3" className={`text-lg font-semibold ${titleColor} mb-4`} style={titleStyle} />
        ) : (
          <h3 className={`text-lg font-semibold ${titleColor} mb-4`} style={titleStyle}>{title}</h3>
        )
      )}
      {integrations.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {integrations.map((integration, i) => (
            <div key={i} className={pillClass} style={pillStyle}>
              {onIntegrationChange ? (
                <>
                  <DirectEditableText value={integration.category} onChange={(v) => onIntegrationChange(i, 'category', v)} as="span" className={`${categoryOpacity} mr-2`} />
                  <DirectEditableText value={integration.name} onChange={(v) => onIntegrationChange(i, 'name', v)} as="span" className="font-medium" />
                </>
              ) : (
                <>
                  <span className={`${categoryOpacity} mr-2`}>{integration.category}</span>
                  <span className="font-medium">{integration.name}</span>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className={`text-sm italic ${darkTheme ? 'text-white/50' : 'text-gray-500'}`}>
          Integration requirements to be discussed
        </p>
      )}
    </>
  );
}
