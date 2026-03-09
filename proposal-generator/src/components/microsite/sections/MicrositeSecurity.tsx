'use client';

import React from 'react';
import { ProposalInputs, resolveOtherValue } from '@/types/proposal';
import { SECURITY_FEATURES, IMPLEMENTATION_TIMELINE } from '@/lib/content-templates';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { MicrositeQuote } from '../MicrositeQuote';

interface Props {
  inputs: ProposalInputs;
}

export function MicrositeSecurity({ inputs }: Props) {
  const sectionRef = useScrollAnimation<HTMLElement>();
  const secRef = useScrollAnimation<HTMLDivElement>(0.1);
  const intRef = useScrollAnimation<HTMLDivElement>(0.1);
  const timeRef = useScrollAnimation<HTMLDivElement>(0.1);

  const customerIntegrations = [
    inputs.integrations.hcm && { name: resolveOtherValue(inputs.integrations.hcm, inputs.integrations.customHcm), category: 'HCM' },
    inputs.integrations.identity && { name: resolveOtherValue(inputs.integrations.identity, inputs.integrations.customIdentity), category: 'Identity' },
    inputs.integrations.documents && { name: resolveOtherValue(inputs.integrations.documents, inputs.integrations.customDocuments), category: 'Documents' },
    ...(Array.isArray(inputs.integrations.communication)
      ? inputs.integrations.communication.filter(Boolean).map(v => ({ name: resolveOtherValue(v, inputs.integrations.customCommunication), category: 'Communication' }))
      : inputs.integrations.communication ? [{ name: resolveOtherValue(inputs.integrations.communication, inputs.integrations.customCommunication), category: 'Communication' }] : []),
    inputs.integrations.ticketing && inputs.integrations.ticketing !== 'None / Not applicable' && { name: resolveOtherValue(inputs.integrations.ticketing, inputs.integrations.customTicketing), category: 'Ticketing' },
  ].filter(Boolean) as { name: string; category: string }[];

  return (
    <section id="security" className="py-20 sm:py-28 bg-[#f3f4f6]" ref={sectionRef}>
      <div className="max-w-5xl mx-auto px-6 ms-fade-up">
        <h2 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--theme-primary)' }}>Security & Integration</h2>
        <div className="w-16 h-0.5 mb-10" style={{ backgroundColor: 'var(--theme-primary)' }} />

        {/* Security features */}
        <div ref={secRef} className="mb-12 ms-fade-up">
          <h3 className="text-lg font-semibold mb-5" style={{ color: 'var(--theme-primary)' }}>Enterprise Security</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ms-stagger">
            {SECURITY_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
              >
                <h4 className="font-semibold mb-1 text-sm" style={{ color: 'var(--theme-primary)' }}>{feature.title}</h4>
                <p className="text-gray-600 text-xs">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Integration landscape */}
        <div ref={intRef} className="mb-12 ms-fade-up">
          <h3 className="text-lg font-semibold mb-5" style={{ color: 'var(--theme-primary)' }}>Your Integration Landscape</h3>
          {customerIntegrations.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {customerIntegrations.map((integration) => (
                <div
                  key={integration.name}
                  className="px-4 py-2 text-white rounded-full text-sm"
                  style={{ backgroundColor: 'var(--theme-primary)' }}
                >
                  <span className="opacity-60 mr-2">{integration.category}</span>
                  <span className="font-medium">{integration.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm italic">Integration requirements to be discussed</p>
          )}
        </div>

        <MicrositeQuote selectedQuotes={inputs.selectedQuotes} section="security" />

        {/* Implementation timeline */}
        <div ref={timeRef} className="ms-fade-up">
          <h3 className="text-lg font-semibold mb-5" style={{ color: 'var(--theme-primary)' }}>Implementation Timeline (12 weeks)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ms-stagger">
            {IMPLEMENTATION_TIMELINE.map((phase) => (
              <div
                key={phase.week}
                className="p-5 bg-white rounded-lg border-t-4"
                style={{ borderColor: 'var(--theme-primary)' }}
              >
                <div className="text-xs font-semibold mb-1" style={{ color: 'var(--theme-primary)' }}>{phase.week}</div>
                <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--theme-primary)' }}>{phase.title}</h4>
                <p className="text-gray-600 text-xs">{phase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
