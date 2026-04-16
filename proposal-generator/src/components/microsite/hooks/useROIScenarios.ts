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
    const contractYears = inputs.pricing.contractTermYears || 3;
    const hrInputs = inputs.hrOperations;

    // Adjust HR operations inputs — scale per-year deflection rates
    const adjustedHR: HROperationsInputs = {
      ...hrInputs,
      tier01DeflectionByYear: (hrInputs.tier01DeflectionByYear || []).map(v => Math.min(100, v * multipliers.deflection)),
      tier2Workflows: hrInputs.tier2Workflows.map(wf => ({
        ...wf,
        deflectionByYear: (wf.deflectionByYear || []).map(v => Math.min(100, v * multipliers.deflection)),
      })),
    };

    // Adjust employee experience inputs
    const adjustedEE: EmployeeExperienceInputs = {
      ...inputs.employeeExperience,
      adoptionRate: Math.min(100, inputs.employeeExperience.adoptionRate * multipliers.adoption),
    };

    const yearSettings = hrInputs.yearSettings?.length
      ? hrInputs.yearSettings
      : [
          { wisqEffectiveness: 30, workforceChange: 0 },
          { wisqEffectiveness: 60, workforceChange: 5 },
          { wisqEffectiveness: 75, workforceChange: 10 },
        ];

    const hrOutput = calculateHROperationsROI(adjustedHR);
    const tier2PlusConfiguredCases = adjustedHR.tier2Workflows.reduce((sum, w) => sum + w.volumePerYear, 0);
    const ncVol = adjustedHR.nonConfiguredWorkflow?.enabled ? (adjustedHR.nonConfiguredWorkflow.volumePerYear || 0) : 0;
    const tier2PlusTotalCases = adjustedHR.tier2PlusTotalCases || (tier2PlusConfiguredCases + ncVol) || tier2PlusConfiguredCases;
    const activeConfiguredCasesByYear = hrOutput.yearResults.map(yr => yr.activeConfiguredCases);
    const legalOutput = calculateLegalComplianceROI(
      inputs.legalCompliance, tier2PlusConfiguredCases, yearSettings, contractYears, tier2PlusTotalCases, activeConfiguredCasesByYear
    );
    const eeOutput = calculateEmployeeExperienceROI(adjustedEE, yearSettings, contractYears);
    const wisqLicenseCost = hrInputs.wisqLicenseCost || pricing.annualRecurringRevenue;
    const summary = calculateROISummary(hrOutput, legalOutput, eeOutput, wisqLicenseCost, contractYears);

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
