'use client';

import React, { useState, useEffect } from 'react';
import { PricingInputs, PRICING_TIERS, YearlySoftwareConfig, createDefaultYearlyConfig } from '@/types/proposal';
import { calculatePricing, formatCurrency } from '@/lib/pricing-calculator';

interface PricingCalculatorProps {
  inputs: PricingInputs;
  onChange: (inputs: Partial<PricingInputs>) => void;
}

interface LineItemRowProps {
  label: string;
  included: boolean;
  discount: number;
  onIncludedChange: (included: boolean) => void;
  onDiscountChange: (discount: number) => void;
  listPrice: number;
  netPrice: number;
  required?: boolean;
  children?: React.ReactNode;
  customAmount?: number;
  onCustomAmountChange?: (amount: number | undefined) => void;
  calculatedAmount?: number; // The auto-calculated amount before any custom override
}

function LineItemRow({
  label,
  included,
  discount,
  onIncludedChange,
  onDiscountChange,
  listPrice,
  netPrice,
  required,
  children,
  customAmount,
  onCustomAmountChange,
  calculatedAmount,
}: LineItemRowProps) {
  const hasCustomOverride = customAmount !== undefined;

  return (
    <div className={`p-4 rounded-lg border ${included ? 'border-[#03143B]/20 bg-white' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={included}
            onChange={(e) => onIncludedChange(e.target.checked)}
            disabled={required}
            className="w-4 h-4 text-[#03143B] rounded focus:ring-[#03143B]"
          />
          <span className={`text-sm font-medium ${included ? 'text-gray-900' : 'text-gray-500'}`}>
            {label}
            {required && <span className="text-xs text-gray-400 ml-1">(Required)</span>}
          </span>
        </label>
        {included && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Discount:</span>
            <input
              type="number"
              value={discount}
              onChange={(e) => onDiscountChange(Math.min(100, Math.max(0, Number(e.target.value))))}
              min={0}
              max={100}
              className="w-16 px-2 py-1 text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#03143B]"
            />
            <span className="text-gray-500">%</span>
          </div>
        )}
      </div>

      {included && children && <div className="mb-3">{children}</div>}

      {/* Custom Amount Override */}
      {included && onCustomAmountChange && (
        <div className="mb-3 flex items-center gap-3">
          <span className="text-sm text-gray-600">Custom Override:</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">$</span>
            <input
              type="text"
              value={hasCustomOverride ? customAmount.toLocaleString() : ''}
              onChange={(e) => {
                const value = e.target.value.replace(/,/g, '');
                if (value === '') {
                  onCustomAmountChange(undefined);
                } else if (!isNaN(Number(value))) {
                  onCustomAmountChange(Number(value));
                }
              }}
              placeholder={calculatedAmount !== undefined ? `Auto: ${formatCurrency(calculatedAmount)}` : 'Auto'}
              className={`w-32 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-[#03143B] ${
                hasCustomOverride ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
              }`}
            />
          </div>
          {hasCustomOverride && (
            <button
              onClick={() => onCustomAmountChange(undefined)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Reset to auto
            </button>
          )}
        </div>
      )}

      {included && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">
            List: {formatCurrency(listPrice)}
            {discount > 0 && <span className="text-red-500 ml-2">-{discount}%</span>}
            {hasCustomOverride && <span className="text-blue-500 ml-2">(custom)</span>}
          </span>
          <span className="font-medium text-[#03143B]">Net: {formatCurrency(netPrice)}</span>
        </div>
      )}
    </div>
  );
}

export function PricingCalculator({ inputs, onChange }: PricingCalculatorProps) {
  const [activeYear, setActiveYear] = useState(1);
  const pricing = calculatePricing(inputs);

  // Ensure yearlyConfig has the right number of entries when contract term changes
  useEffect(() => {
    if (inputs.yearlyConfig.length !== inputs.contractTermYears) {
      const newConfig = [...inputs.yearlyConfig];
      while (newConfig.length < inputs.contractTermYears) {
        // Copy the last year's config as default for new years
        const lastConfig = newConfig[newConfig.length - 1] || createDefaultYearlyConfig();
        newConfig.push({
          platform: { ...lastConfig.platform },
          workflows: { ...lastConfig.workflows },
        });
      }
      // Trim if contract term decreased
      while (newConfig.length > inputs.contractTermYears) {
        newConfig.pop();
      }
      onChange({ yearlyConfig: newConfig });
    }
  }, [inputs.contractTermYears, inputs.yearlyConfig.length, onChange]);

  // Reset active year if it exceeds contract term
  useEffect(() => {
    if (activeYear > inputs.contractTermYears) {
      setActiveYear(inputs.contractTermYears);
    }
  }, [activeYear, inputs.contractTermYears]);

  // Ensure agent engineering arrays match contract term
  useEffect(() => {
    if (inputs.agentEngineering) {
      const { yearlyHours, yearlyDiscounts } = inputs.agentEngineering;
      let needsUpdate = false;
      const newHours = [...yearlyHours];
      const newDiscounts = [...yearlyDiscounts];

      while (newHours.length < inputs.contractTermYears) {
        newHours.push(newHours[newHours.length - 1] || 0);
        needsUpdate = true;
      }
      while (newDiscounts.length < inputs.contractTermYears) {
        newDiscounts.push(newDiscounts[newDiscounts.length - 1] || 0);
        needsUpdate = true;
      }

      if (needsUpdate) {
        onChange({
          agentEngineering: {
            ...inputs.agentEngineering,
            yearlyHours: newHours,
            yearlyDiscounts: newDiscounts,
          },
        });
      }
    }
  }, [inputs.contractTermYears, inputs.agentEngineering, onChange]);

  const handleEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    if (!isNaN(Number(value)) && value !== '') {
      onChange({ employeeCount: Number(value) });
    } else if (value === '') {
      onChange({ employeeCount: 0 });
    }
  };

  const updateYearConfig = (year: number, updates: Partial<YearlySoftwareConfig>) => {
    const newConfig = [...inputs.yearlyConfig];
    const index = year - 1;
    if (newConfig[index]) {
      newConfig[index] = {
        ...newConfig[index],
        ...updates,
        platform: updates.platform
          ? { ...newConfig[index].platform, ...updates.platform }
          : newConfig[index].platform,
        workflows: updates.workflows
          ? { ...newConfig[index].workflows, ...updates.workflows }
          : newConfig[index].workflows,
      };
      onChange({ yearlyConfig: newConfig });
    }
  };

  const updateImplementation = (updates: Partial<typeof inputs.implementation>) => {
    onChange({ implementation: { ...inputs.implementation, ...updates } });
  };

  const updateServicesHours = (updates: Partial<typeof inputs.servicesHours>) => {
    onChange({ servicesHours: { ...inputs.servicesHours, ...updates } });
  };

  const updateIntegrations = (updates: Partial<typeof inputs.integrations>) => {
    onChange({ integrations: { ...inputs.integrations, ...updates } });
  };

  const updateAgentEngineering = (updates: Partial<typeof inputs.agentEngineering>) => {
    const current = inputs.agentEngineering || {
      included: false,
      hourlyRate: 250,
      yearlyHours: [0],
      yearlyDiscounts: [0],
    };
    onChange({ agentEngineering: { ...current, ...updates } });
  };

  const updateAgentEngineeringYear = (yearIndex: number, field: 'hours' | 'discount', value: number) => {
    const current = inputs.agentEngineering || {
      included: false,
      hourlyRate: 250,
      yearlyHours: [0],
      yearlyDiscounts: [0],
    };
    if (field === 'hours') {
      const newHours = [...current.yearlyHours];
      while (newHours.length <= yearIndex) newHours.push(0);
      newHours[yearIndex] = value;
      onChange({ agentEngineering: { ...current, yearlyHours: newHours } });
    } else {
      const newDiscounts = [...current.yearlyDiscounts];
      while (newDiscounts.length <= yearIndex) newDiscounts.push(0);
      newDiscounts[yearIndex] = Math.min(100, Math.max(0, value));
      onChange({ agentEngineering: { ...current, yearlyDiscounts: newDiscounts } });
    }
  };

  // Get current year's config
  const currentYearConfig = inputs.yearlyConfig[activeYear - 1] || createDefaultYearlyConfig();
  const currentYearPricing = pricing.yearlyBreakdown[activeYear - 1];

  // Calculate auto amounts (tiered pricing without custom overrides) for current year
  const calculateAutoSoftwareAmounts = () => {
    let platformAuto = 0;
    let workflowsAuto = 0;
    let remainingEmployees = inputs.employeeCount;

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

      platformAuto += employeesInTier * tier.platformPPEY;
      workflowsAuto += employeesInTier * tier.workflowsPPEY;
      remainingEmployees -= employeesInTier;
    }

    return { platformAuto, workflowsAuto };
  };

  const autoAmounts = calculateAutoSoftwareAmounts();

  // Calculate auto amounts for services
  const servicesAutoAmount = inputs.servicesHours.hours * inputs.servicesHours.hourlyRate;
  const integrationsAutoAmount = inputs.integrations.count * inputs.integrations.costPerIntegration;
  const implementationAutoAmount = pricing.softwareListPrice * (inputs.implementation.percentOfSoftware / 100);

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-[#03143B] mb-4">Pricing Configuration</h3>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left column - basic inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee Count
              </label>
              <input
                type="text"
                value={inputs.employeeCount.toLocaleString()}
                onChange={handleEmployeeChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03143B] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract Term
              </label>
              <div className="flex gap-2">
                {([1, 2, 3] as const).map((years) => (
                  <button
                    key={years}
                    onClick={() => onChange({ contractTermYears: years })}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      inputs.contractTermYears === years
                        ? 'bg-[#03143B] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {years} Year{years > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>

            {inputs.contractTermYears > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Annual Price Escalation
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={inputs.annualEscalationPercent || 0}
                    onChange={(e) => onChange({
                      annualEscalationPercent: Math.min(20, Math.max(0, Number(e.target.value)))
                    })}
                    min={0}
                    max={20}
                    step={0.5}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03143B] focus:border-transparent"
                  />
                  <span className="text-sm text-gray-500">% per year</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Applied to Year 2+ software pricing (compounding)
                </p>
              </div>
            )}
          </div>

          {/* Right column - pricing tiers reference */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Pricing Tiers</h4>
            <div className="bg-gray-50 rounded-md p-3 text-xs">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-2">Employees</th>
                    <th className="pb-2">Platform</th>
                    <th className="pb-2">Workflows</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICING_TIERS.map((tier, index) => (
                    <tr key={index} className="text-gray-700">
                      <td className="py-1">
                        {tier.minEmployees.toLocaleString()}-
                        {tier.maxEmployees === Infinity ? '+' : tier.maxEmployees.toLocaleString()}
                      </td>
                      <td className="py-1">${tier.platformPPEY}/EE</td>
                      <td className="py-1">${tier.workflowsPPEY}/EE</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Software Line Items (Recurring) - Per Year */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-[#03143B]">Recurring Software</h3>
          {inputs.contractTermYears > 1 && (
            <span className="text-xs text-gray-500">Configure entitlements per year</span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">Annual recurring fees</p>

        {/* Year Tabs - only show if multi-year */}
        {inputs.contractTermYears > 1 && (
          <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg">
            {Array.from({ length: inputs.contractTermYears }, (_, i) => i + 1).map((year) => {
              const yearConfig = inputs.yearlyConfig[year - 1];
              const hasWorkflows = yearConfig?.workflows.included;
              return (
                <button
                  key={year}
                  onClick={() => setActiveYear(year)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    activeYear === year
                      ? 'bg-white text-[#03143B] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>Year {year}</span>
                  {year > 1 && (
                    <span className={`ml-2 text-xs ${hasWorkflows ? 'text-green-600' : 'text-gray-400'}`}>
                      {hasWorkflows ? '+Workflows' : 'Platform'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="space-y-4">
          <LineItemRow
            label="Platform Fee"
            included={currentYearConfig.platform.included}
            discount={currentYearConfig.platform.discount}
            onIncludedChange={(included) =>
              updateYearConfig(activeYear, { platform: { ...currentYearConfig.platform, included } })
            }
            onDiscountChange={(discount) =>
              updateYearConfig(activeYear, { platform: { ...currentYearConfig.platform, discount } })
            }
            listPrice={currentYearPricing?.platformListPrice || 0}
            netPrice={currentYearPricing?.platformNetPrice || 0}
            required
            customAmount={currentYearConfig.platform.customAmount}
            onCustomAmountChange={(amount) =>
              updateYearConfig(activeYear, { platform: { ...currentYearConfig.platform, customAmount: amount } })
            }
            calculatedAmount={autoAmounts.platformAuto}
          />

          <LineItemRow
            label="Agentic Workflows Software"
            included={currentYearConfig.workflows.included}
            discount={currentYearConfig.workflows.discount}
            onIncludedChange={(included) =>
              updateYearConfig(activeYear, { workflows: { ...currentYearConfig.workflows, included } })
            }
            onDiscountChange={(discount) =>
              updateYearConfig(activeYear, { workflows: { ...currentYearConfig.workflows, discount } })
            }
            listPrice={currentYearPricing?.workflowsListPrice || 0}
            netPrice={currentYearPricing?.workflowsNetPrice || 0}
            customAmount={currentYearConfig.workflows.customAmount}
            onCustomAmountChange={(amount) =>
              updateYearConfig(activeYear, { workflows: { ...currentYearConfig.workflows, customAmount: amount } })
            }
            calculatedAmount={autoAmounts.workflowsAuto}
          />
        </div>

        {/* Year-by-year summary for multi-year contracts */}
        {inputs.contractTermYears > 1 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Multi-Year Software Summary</h4>
            <div className="bg-gray-50 rounded-md p-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-2">Year</th>
                    <th className="pb-2">Products</th>
                    <th className="pb-2 text-right">Net Price</th>
                  </tr>
                </thead>
                <tbody>
                  {pricing.yearlyBreakdown.map((year) => {
                    const config = inputs.yearlyConfig[year.year - 1];
                    const products = [
                      config?.platform.included && 'Platform',
                      config?.workflows.included && 'Workflows',
                    ].filter(Boolean).join(' + ');
                    const escalationPercent = year.year > 1 && inputs.annualEscalationPercent
                      ? ((Math.pow(1 + inputs.annualEscalationPercent / 100, year.year - 1) - 1) * 100).toFixed(1)
                      : null;
                    return (
                      <tr key={year.year} className={`text-gray-700 ${year.year === activeYear ? 'font-medium' : ''}`}>
                        <td className="py-1">
                          Year {year.year}
                          {escalationPercent && (
                            <span className="text-xs text-orange-600 ml-1">(+{escalationPercent}%)</span>
                          )}
                        </td>
                        <td className="py-1 text-gray-500">{products || 'None'}</td>
                        <td className="py-1 text-right">{formatCurrency(year.softwareNetPrice)}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-gray-200 font-medium">
                    <td className="pt-2">Total</td>
                    <td className="pt-2"></td>
                    <td className="pt-2 text-right">{formatCurrency(pricing.totalRecurringNetPrice)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Agent Engineering (Yearly Recurring) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-[#03143B]">Agent Engineering</h3>
          <span className="text-xs text-gray-500">Yearly recurring professional services</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">Configure professional services hours per contract year</p>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={inputs.agentEngineering?.included || false}
            onChange={(e) => updateAgentEngineering({ included: e.target.checked })}
            className="w-4 h-4 text-[#03143B] rounded focus:ring-[#03143B]"
          />
          <span className="text-sm text-gray-700">Include Agent Engineering Hours</span>
        </div>

        {inputs.agentEngineering?.included && (
          <>
            {/* Hourly Rate */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">$</span>
                <input
                  type="number"
                  value={inputs.agentEngineering.hourlyRate}
                  onChange={(e) => updateAgentEngineering({ hourlyRate: Number(e.target.value) })}
                  min={0}
                  className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#03143B]"
                />
                <span className="text-sm text-gray-500">/hr</span>
              </div>
            </div>

            {/* Per-Year Configuration */}
            <div className="space-y-3">
              {Array.from({ length: inputs.contractTermYears }, (_, i) => {
                const hours = inputs.agentEngineering!.yearlyHours[i] ?? 0;
                const discount = inputs.agentEngineering!.yearlyDiscounts[i] ?? 0;
                const yearPricing = pricing.yearlyBreakdown[i];

                return (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700">Year {i + 1}</span>
                      {yearPricing && yearPricing.agentEngineeringNetPrice > 0 && (
                        <span className="text-sm text-[#03143B] font-semibold">
                          Net: {formatCurrency(yearPricing.agentEngineeringNetPrice)}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Hours</label>
                        <input
                          type="number"
                          value={hours}
                          onChange={(e) => updateAgentEngineeringYear(i, 'hours', Number(e.target.value))}
                          min={0}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#03143B]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Discount %</label>
                        <input
                          type="number"
                          value={discount}
                          onChange={(e) => updateAgentEngineeringYear(i, 'discount', Number(e.target.value))}
                          min={0}
                          max={100}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#03143B]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-700">
                  Total Agent Engineering ({inputs.contractTermYears} year{inputs.contractTermYears > 1 ? 's' : ''})
                </span>
                <span className="font-semibold text-[#03143B]">
                  {formatCurrency(pricing.totalAgentEngineeringNetPrice)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Services Line Items (One-Time) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-[#03143B] mb-1">One-Time Services</h3>
        <p className="text-sm text-gray-500 mb-4">Implementation and integrations</p>

        <div className="space-y-4">
          <LineItemRow
            label="Implementation"
            included={inputs.implementation.included}
            discount={inputs.implementation.discount}
            onIncludedChange={(included) => updateImplementation({ included })}
            onDiscountChange={(discount) => updateImplementation({ discount })}
            listPrice={pricing.implementationListPrice}
            netPrice={pricing.implementationNetPrice}
            customAmount={inputs.implementation.customAmount}
            onCustomAmountChange={(amount) => updateImplementation({ customAmount: amount })}
            calculatedAmount={implementationAutoAmount}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">% of Year 1 Software:</span>
              <input
                type="number"
                value={inputs.implementation.percentOfSoftware}
                onChange={(e) => updateImplementation({
                  percentOfSoftware: Number(e.target.value),
                  customAmount: undefined
                })}
                min={0}
                max={100}
                className="w-16 px-2 py-1 text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#03143B]"
              />
              <span className="text-sm text-gray-500">%</span>
              <span className="text-xs text-gray-400 ml-2">
                (= {formatCurrency(implementationAutoAmount)})
              </span>
            </div>
          </LineItemRow>


          <LineItemRow
            label="Additional System Integrations"
            included={inputs.integrations.included}
            discount={inputs.integrations.discount}
            onIncludedChange={(included) => updateIntegrations({ included })}
            onDiscountChange={(discount) => updateIntegrations({ discount })}
            listPrice={pricing.integrationsListPrice}
            netPrice={pricing.integrationsNetPrice}
            customAmount={inputs.integrations.customAmount}
            onCustomAmountChange={(amount) => updateIntegrations({ customAmount: amount })}
            calculatedAmount={integrationsAutoAmount}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Count:</span>
                <input
                  type="number"
                  value={inputs.integrations.count}
                  onChange={(e) => updateIntegrations({ count: Number(e.target.value), customAmount: undefined })}
                  min={0}
                  className="w-16 px-2 py-1 text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#03143B]"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Cost each:</span>
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="text"
                  value={inputs.integrations.costPerIntegration.toLocaleString()}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, '');
                    if (!isNaN(Number(value))) {
                      updateIntegrations({ costPerIntegration: Number(value), customAmount: undefined });
                    }
                  }}
                  className="w-20 px-2 py-1 text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#03143B]"
                />
              </div>
              <span className="text-xs text-gray-400">(beyond standard integrations)</span>
            </div>
          </LineItemRow>
        </div>
      </div>

      {/* Investment Summary */}
      <div className="bg-gradient-to-br from-[#03143B] to-[#020e29] rounded-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Investment Summary</h3>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left column - Recurring */}
          <div>
            <h4 className="text-sm font-medium text-white/60 uppercase tracking-wide mb-3">
              {inputs.contractTermYears > 1 ? 'Year 1 Recurring' : 'Annual Recurring (ARR)'}
            </h4>
            <div className="space-y-2">
              {inputs.yearlyConfig[0]?.platform.included && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">Platform</span>
                  <span>{formatCurrency(pricing.platformNetPrice)}</span>
                </div>
              )}
              {inputs.yearlyConfig[0]?.workflows.included && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">Agentic Workflows</span>
                  <span>{formatCurrency(pricing.workflowsNetPrice)}</span>
                </div>
              )}
              {inputs.agentEngineering?.included && pricing.yearlyBreakdown[0]?.agentEngineeringNetPrice > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">Agent Engineering (Y1)</span>
                  <span>{formatCurrency(pricing.yearlyBreakdown[0].agentEngineeringNetPrice)}</span>
                </div>
              )}
              <div className="border-t border-white/20 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-white/80">Year 1 Total</span>
                  <span className="text-xl font-bold">{formatCurrency(pricing.annualRecurringRevenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Software Per Employee Per Year</span>
                  <span className="text-white/80">{formatCurrency(pricing.effectivePPEY, 2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right column - One-Time */}
          <div>
            <h4 className="text-sm font-medium text-white/60 uppercase tracking-wide mb-3">
              One-Time Fees
            </h4>
            <div className="space-y-2">
              {inputs.implementation.included && pricing.implementationNetPrice > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">Implementation</span>
                  <span>{formatCurrency(pricing.implementationNetPrice)}</span>
                </div>
              )}
              {inputs.integrations.included && pricing.integrationsNetPrice > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">Integrations</span>
                  <span>{formatCurrency(pricing.integrationsNetPrice)}</span>
                </div>
              )}
              {pricing.totalOneTimeNetPrice === 0 && (
                <div className="text-sm text-white/50 italic">No one-time fees</div>
              )}
              <div className="border-t border-white/20 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-white/80">Total One-Time</span>
                  <span className="text-xl font-bold">{formatCurrency(pricing.totalOneTimeNetPrice)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grand Total */}
        <div className="mt-6 pt-4 border-t border-white/30">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-white/80 text-lg">First Year Investment</span>
              <p className="text-white/50 text-sm">Year 1 ARR + One-Time Fees</p>
            </div>
            <span className="text-3xl font-bold">{formatCurrency(pricing.totalFirstYearInvestment)}</span>
          </div>
          {inputs.contractTermYears > 1 && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-white/80 text-lg">{inputs.contractTermYears}-Year Total Contract Value</span>
                  <p className="text-white/50 text-sm">All years software + one-time fees</p>
                </div>
                <span className="text-2xl font-bold">{formatCurrency(pricing.totalContractValue)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
