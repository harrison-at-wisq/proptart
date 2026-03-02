'use client';

import { useState, useMemo } from 'react';
import {
  ProposalInputs,
  HROperationsInputs,
  EmployeeExperienceInputs,
} from '@/types/proposal';
import {
  calculateHROperationsROI,
  calculateLegalComplianceROI,
  calculateEmployeeExperienceROI,
  calculateROISummary,
} from '@/lib/roi-calculator';
import { calculatePricing } from '@/lib/pricing-calculator';

export type Scenario = 'conservative' | 'recommended' | 'optimistic';

interface ScenarioMultipliers {
  deflection: number;
  adoption: number;
}

const SCENARIO_MULTIPLIERS: Record<Scenario, ScenarioMultipliers> = {
  conservative: { deflection: 0.8, adoption: 0.7 },
  recommended: { deflection: 1.0, adoption: 1.0 },
  optimistic: { deflection: 1.15, adoption: 1.2 },
};

export function useROIScenarios(inputs: ProposalInputs) {
  const [scenario, setScenario] = useState<Scenario>('recommended');

  const results = useMemo(() => {
    const multipliers = SCENARIO_MULTIPLIERS[scenario];
    const pricing = calculatePricing(inputs.pricing);

    // Adjust HR operations inputs
    const adjustedHR: HROperationsInputs = {
      ...inputs.hrOperations,
      tier01DeflectionRate: Math.min(100, inputs.hrOperations.tier01DeflectionRate * multipliers.deflection),
      tier2PlusDeflectionRate: Math.min(100, inputs.hrOperations.tier2PlusDeflectionRate * multipliers.deflection),
    };

    // Adjust employee experience inputs
    const adjustedEE: EmployeeExperienceInputs = {
      ...inputs.employeeExperience,
      adoptionRate: Math.min(100, inputs.employeeExperience.adoptionRate * multipliers.adoption),
    };

    const hrOutput = calculateHROperationsROI(adjustedHR);
    const tier2Cases = adjustedHR.tier2Workflows.reduce((sum, w) => sum + w.volumePerYear, 0);
    const legalOutput = calculateLegalComplianceROI(inputs.legalCompliance, tier2Cases);
    const eeOutput = calculateEmployeeExperienceROI(adjustedEE);
    const summary = calculateROISummary(hrOutput, legalOutput, eeOutput, pricing.annualRecurringRevenue);

    return {
      hrOutput,
      legalOutput,
      eeOutput,
      summary,
      pricing,
    };
  }, [inputs, scenario]);

  return {
    scenario,
    setScenario,
    ...results,
  };
}
