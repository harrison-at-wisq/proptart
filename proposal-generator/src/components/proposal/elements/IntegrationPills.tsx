'use client';

import React from 'react';

interface Integration {
  category: string;
  name: string;
}

interface IntegrationPillsProps {
  title?: string;
  integrations?: Integration[];
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
  darkTheme,
}: IntegrationPillsProps) {
  const pillClass = darkTheme
    ? 'px-4 py-2 bg-white/20 text-white rounded-full text-sm'
    : 'px-4 py-2 bg-[#03143B] text-white rounded-full text-sm';
  const titleColor = darkTheme ? 'text-white' : 'text-[#03143B]';
  const categoryOpacity = darkTheme ? 'opacity-60' : 'opacity-70';

  return (
    <>
      {title && (
        <h3 className={`text-lg font-semibold ${titleColor} mb-4`}>{title}</h3>
      )}
      {integrations.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {integrations.map((integration, i) => (
            <div key={i} className={pillClass}>
              <span className={`${categoryOpacity} mr-2`}>{integration.category}</span>
              <span className="font-medium">{integration.name}</span>
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
