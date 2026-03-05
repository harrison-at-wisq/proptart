'use client';

import React from 'react';
import { ProposalInputs } from '@/types/proposal';
import { MicrositeNav } from './MicrositeNav';
import { MicrositeCover } from './sections/MicrositeCover';
import { MicrositeVision } from './sections/MicrositeVision';
import { MicrositeExecutiveSummary } from './sections/MicrositeExecutiveSummary';
import { MicrositeHarper } from './sections/MicrositeHarper';
import { MicrositeValueDrivers } from './sections/MicrositeValueDrivers';
import { MicrositeInvestment } from './sections/MicrositeInvestment';
import { MicrositeROIExplorer } from './sections/MicrositeROIExplorer';
import { MicrositeSecurity } from './sections/MicrositeSecurity';
import { MicrositeWhyNow } from './sections/MicrositeWhyNow';
import { MicrositeFooter } from './sections/MicrositeFooter';
import './MicrositeDocument.css';

interface Props {
  inputs: ProposalInputs;
}

export function MicrositeDocument({ inputs }: Props) {
  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-geist-sans)]">
      <MicrositeNav customerLogoBase64={inputs.company.customerLogoBase64} />
      <MicrositeCover inputs={inputs} />
      <MicrositeVision inputs={inputs} />
      <MicrositeExecutiveSummary inputs={inputs} />
      <MicrositeHarper inputs={inputs} />
      <MicrositeValueDrivers inputs={inputs} />
      <MicrositeInvestment inputs={inputs} />
      <MicrositeROIExplorer inputs={inputs} />
      <MicrositeSecurity inputs={inputs} />
      <MicrositeWhyNow inputs={inputs} />
      <MicrositeFooter customerLogoBase64={inputs.company.customerLogoBase64} />
    </div>
  );
}
