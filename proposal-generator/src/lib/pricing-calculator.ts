import { PricingInputs, PricingOutput, PRICING_TIERS, YearlyPricingBreakdown, YearlySoftwareConfig } from '@/types/proposal';

/**
 * Calculate software pricing for a single year based on config
 */
function calculateYearSoftware(
  employeeCount: number,
  config: YearlySoftwareConfig
): {
  platformListPrice: number;
  platformNetPrice: number;
  workflowsListPrice: number;
  workflowsNetPrice: number;
  softwareListPrice: number;
  softwareNetPrice: number;
  effectivePPEY: number;
} {
  let platformListPrice = 0;
  let workflowsListPrice = 0;
  let remainingEmployees = employeeCount;

  // Calculate tiered software pricing (used for list price or as base if no custom amount)
  for (const tier of PRICING_TIERS) {
    if (remainingEmployees <= 0) break;

    let employeesInTier: number;
    if (tier.minEmployees === 0) {
      employeesInTier = Math.min(1000, remainingEmployees);
    } else if (tier.maxEmployees === Infinity) {
      employeesInTier = remainingEmployees;
    } else {
      const tierCapacity = tier.maxEmployees - tier.minEmployees;
      employeesInTier = Math.min(tierCapacity, remainingEmployees);
    }

    if (config.platform.included) {
      platformListPrice += employeesInTier * tier.platformPPEY;
    }
    if (config.workflows.included) {
      workflowsListPrice += employeesInTier * tier.workflowsPPEY;
    }

    remainingEmployees -= employeesInTier;
  }

  // Use custom amounts if specified, otherwise use calculated list prices
  const effectivePlatformListPrice = config.platform.included
    ? (config.platform.customAmount !== undefined ? config.platform.customAmount : platformListPrice)
    : 0;
  const effectiveWorkflowsListPrice = config.workflows.included
    ? (config.workflows.customAmount !== undefined ? config.workflows.customAmount : workflowsListPrice)
    : 0;

  // Apply individual discounts
  const platformNetPrice = config.platform.included
    ? effectivePlatformListPrice * (1 - config.platform.discount / 100)
    : 0;
  const workflowsNetPrice = config.workflows.included
    ? effectiveWorkflowsListPrice * (1 - config.workflows.discount / 100)
    : 0;

  const softwareListPrice = effectivePlatformListPrice + effectiveWorkflowsListPrice;
  const softwareNetPrice = platformNetPrice + workflowsNetPrice;
  const effectivePPEY = employeeCount > 0 ? softwareNetPrice / employeeCount : 0;

  return {
    platformListPrice: effectivePlatformListPrice,
    platformNetPrice,
    workflowsListPrice: effectiveWorkflowsListPrice,
    workflowsNetPrice,
    softwareListPrice,
    softwareNetPrice,
    effectivePPEY,
  };
}

/**
 * Calculate tiered pricing based on employee count with year-by-year configuration
 */
export function calculatePricing(inputs: PricingInputs): PricingOutput {
  const { employeeCount, yearlyConfig, implementation, servicesHours, agentEngineering, integrations, contractTermYears, annualEscalationPercent = 0 } = inputs;

  // Calculate per-year software and agent engineering pricing with escalation
  const yearlyBreakdown: YearlyPricingBreakdown[] = [];
  let totalRecurringSoftwareListPrice = 0;
  let totalRecurringSoftwareNetPrice = 0;
  let totalAgentEngineeringListPrice = 0;
  let totalAgentEngineeringNetPrice = 0;

  for (let i = 0; i < contractTermYears; i++) {
    // Use the config for this year, or the last available config if not specified
    const config = yearlyConfig[i] || yearlyConfig[yearlyConfig.length - 1];
    const yearPricing = calculateYearSoftware(employeeCount, config);

    // Apply annual escalation for Year 2+ (compound)
    const escalationMultiplier = Math.pow(1 + annualEscalationPercent / 100, i);

    // Calculate agent engineering for this year
    const aeHours = agentEngineering?.included
      ? (agentEngineering.yearlyHours[i] ?? agentEngineering.yearlyHours[agentEngineering.yearlyHours.length - 1] ?? 0)
      : 0;
    const aeDiscount = agentEngineering?.yearlyDiscounts?.[i] ?? 0;
    const aeHourlyRate = agentEngineering?.hourlyRate ?? 250;
    const aeListPrice = aeHours * aeHourlyRate;
    const aeNetPrice = aeListPrice * (1 - aeDiscount / 100);

    yearlyBreakdown.push({
      year: i + 1,
      platformListPrice: yearPricing.platformListPrice * escalationMultiplier,
      platformNetPrice: yearPricing.platformNetPrice * escalationMultiplier,
      workflowsListPrice: yearPricing.workflowsListPrice * escalationMultiplier,
      workflowsNetPrice: yearPricing.workflowsNetPrice * escalationMultiplier,
      softwareListPrice: yearPricing.softwareListPrice * escalationMultiplier,
      softwareNetPrice: yearPricing.softwareNetPrice * escalationMultiplier,
      effectivePPEY: yearPricing.effectivePPEY * escalationMultiplier,
      agentEngineeringHours: aeHours,
      agentEngineeringListPrice: aeListPrice,
      agentEngineeringNetPrice: aeNetPrice,
    });

    totalRecurringSoftwareListPrice += yearPricing.softwareListPrice * escalationMultiplier;
    totalRecurringSoftwareNetPrice += yearPricing.softwareNetPrice * escalationMultiplier;
    totalAgentEngineeringListPrice += aeListPrice;
    totalAgentEngineeringNetPrice += aeNetPrice;
  }

  // Year 1 values for backward compatibility
  const year1 = yearlyBreakdown[0] || {
    platformListPrice: 0,
    platformNetPrice: 0,
    workflowsListPrice: 0,
    workflowsNetPrice: 0,
    softwareListPrice: 0,
    softwareNetPrice: 0,
    effectivePPEY: 0,
    agentEngineeringHours: 0,
    agentEngineeringListPrice: 0,
    agentEngineeringNetPrice: 0,
  };

  // Calculate Implementation (one-time, based on Year 1 software cost)
  let implementationListPrice = 0;
  let implementationNetPrice = 0;
  if (implementation.included) {
    implementationListPrice = implementation.customAmount !== undefined
      ? implementation.customAmount
      : year1.softwareListPrice * (implementation.percentOfSoftware / 100);
    implementationNetPrice = implementationListPrice * (1 - implementation.discount / 100);
  }

  // Calculate Professional Services (one-time)
  let servicesListPrice = 0;
  let servicesNetPrice = 0;
  if (servicesHours.included) {
    // Use custom amount if specified, otherwise calculate from hours * rate
    servicesListPrice = servicesHours.customAmount !== undefined
      ? servicesHours.customAmount
      : (servicesHours.hours > 0 ? servicesHours.hours * servicesHours.hourlyRate : 0);
    servicesNetPrice = servicesListPrice * (1 - servicesHours.discount / 100);
  }

  // Calculate Additional Integrations (one-time)
  let integrationsListPrice = 0;
  let integrationsNetPrice = 0;
  if (integrations.included) {
    // Use custom amount if specified, otherwise calculate from count * cost
    integrationsListPrice = integrations.customAmount !== undefined
      ? integrations.customAmount
      : (integrations.count > 0 ? integrations.count * integrations.costPerIntegration : 0);
    integrationsNetPrice = integrationsListPrice * (1 - integrations.discount / 100);
  }

  // Calculate totals
  // One-time: implementation + integrations + legacy services (not agent engineering)
  const totalOneTimeListPrice = implementationListPrice + servicesListPrice + integrationsListPrice;
  const totalOneTimeNetPrice = implementationNetPrice + servicesNetPrice + integrationsNetPrice;

  // Recurring: software + agent engineering across all years
  const totalRecurringListPrice = totalRecurringSoftwareListPrice + totalAgentEngineeringListPrice;
  const totalRecurringNetPrice = totalRecurringSoftwareNetPrice + totalAgentEngineeringNetPrice;

  return {
    // Per-year breakdown
    yearlyBreakdown,

    // Year 1 software (for backward compatibility)
    platformListPrice: year1.platformListPrice,
    platformNetPrice: year1.platformNetPrice,
    workflowsListPrice: year1.workflowsListPrice,
    workflowsNetPrice: year1.workflowsNetPrice,
    softwareListPrice: year1.softwareListPrice,
    softwareNetPrice: year1.softwareNetPrice,

    // Implementation (one-time)
    implementationListPrice,
    implementationNetPrice,

    // Professional Services (one-time) - LEGACY
    servicesListPrice,
    servicesNetPrice,

    // Agent Engineering (yearly recurring totals)
    totalAgentEngineeringListPrice,
    totalAgentEngineeringNetPrice,

    // Integrations (one-time)
    integrationsListPrice,
    integrationsNetPrice,

    // Totals
    totalOneTimeListPrice,
    totalOneTimeNetPrice,
    totalRecurringListPrice,
    totalRecurringNetPrice,

    // Summary
    annualRecurringRevenue: year1.softwareNetPrice + year1.agentEngineeringNetPrice,
    totalContractValue: totalRecurringNetPrice + totalOneTimeNetPrice,
    totalFirstYearInvestment: year1.softwareNetPrice + year1.agentEngineeringNetPrice + totalOneTimeNetPrice,
    effectivePPEY: year1.effectivePPEY,
  };
}

/**
 * Get the pricing tier for a given employee count
 */
export function getPricingTier(employeeCount: number) {
  return PRICING_TIERS.find(
    tier => employeeCount >= tier.minEmployees && employeeCount <= tier.maxEmployees
  ) || PRICING_TIERS[PRICING_TIERS.length - 1];
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format currency in compact form (e.g., $2.39M instead of $2,393,609)
 */
export function formatCompactCurrency(amount: number): string {
  const absAmount = Math.abs(amount);

  if (absAmount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `$${millions.toFixed(2)}M`;
  } else if (absAmount >= 1_000) {
    const thousands = amount / 1_000;
    return `$${thousands.toFixed(0)}K`;
  } else {
    return formatCurrency(amount);
  }
}

/**
 * Calculate multi-year pricing with potential discounts
 */
export function calculateMultiYearPricing(
  annualPrice: number,
  years: 1 | 2 | 3
): { totalPrice: number; annualizedPrice: number; discount: number } {
  // Optional: Add multi-year discounts
  const discounts: Record<number, number> = {
    1: 0,
    2: 0, // Could add 5% for 2-year
    3: 0, // Could add 10% for 3-year
  };

  const discount = discounts[years] || 0;
  const totalPrice = annualPrice * years * (1 - discount / 100);
  const annualizedPrice = totalPrice / years;

  return { totalPrice, annualizedPrice, discount };
}
