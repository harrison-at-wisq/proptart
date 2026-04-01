# HR Operations ROI — Multi-Year Formula Spec

## Phase 1: Workload Model (No cost, no headcount — pure hours)

This phase models current vs. Wisq workload across contract years. Output is **hours saved per year**.

### Global Inputs

| Parameter | Description | Default (3-year) |
|---|---|---|
| $\text{contractYears}$ | Number of contract years | 3 |
| $\text{wisqEffectiveness}[y]$ | Wisq effectiveness in year $y$ (slider, 0–100%) | Year 1 = 30%, Year 2 = 60%, Year 3 = 75% |
| $\text{workforceChange}[y]$ | Workforce growth/shrink in year $y$ relative to today | Year 1 = 0%, Year 2 = +5%, Year 3 = +10% |

### Case & Workflow Inputs (entered once, represent current state)

| Parameter | Description |
|---|---|
| $\text{tier01CasesPerYear}$ | Tier 0-1 cases per year (current) |
| $\text{tier01HandleTime}$ | Tier 0-1 avg handle time (minutes) |
| $\text{tier01MaxDeflection}$ | Tier 0-1 max deflection rate (%) — ceiling at full effectiveness |

Each Tier 2+ workflow $w$:

| Parameter | Description |
|---|---|
| $\text{wf.volume}$ | Cases per year (current) |
| $\text{wf.hoursPerCase}$ | Hours per case |
| $\text{wf.maxDeflection}$ | Max deflection rate (%) |
| $\text{wf.maxEffortReduction}$ | Max effort reduction rate (%) |

---

### Volume Scaling

$$
\text{volumeMultiplier}[y] = 1 + \frac{\text{workforceChange}[y]}{100}
$$

$$
\text{tier01Cases}[y] = \text{tier01CasesPerYear} \times \text{volumeMultiplier}[y]
$$

$$
\text{wf.volume}[y] = \text{wf.volume} \times \text{volumeMultiplier}[y]
$$

### Effective Rates (scaled by Wisq ramp-up)

$$
\text{tier01Deflection}[y] = \text{tier01MaxDeflection} \times \frac{\text{wisqEffectiveness}[y]}{100}
$$

$$
\text{wf.deflection}[y] = \text{wf.maxDeflection} \times \frac{\text{wisqEffectiveness}[y]}{100}
$$

$$
\text{wf.effortReduction}[y] = \text{wf.maxEffortReduction} \times \frac{\text{wisqEffectiveness}[y]}{100}
$$

### Current State Workload (No Wisq, per year)

$$
\text{currentTier01Minutes}[y] = \text{tier01Cases}[y] \times \text{tier01HandleTime}
$$

$$
\text{currentTier2Minutes}[y] = \sum_{\text{all workflows}} \text{wf.volume}[y] \times \text{wf.hoursPerCase} \times 60
$$

$$
\text{currentTotalMinutes}[y] = \text{currentTier01Minutes}[y] + \text{currentTier2Minutes}[y]
$$

### Future State Workload (With Wisq, per year)

$$
\text{futureTier01Minutes}[y] = \text{tier01Cases}[y] \times \left(1 - \frac{\text{tier01Deflection}[y]}{100}\right) \times \text{tier01HandleTime}
$$

$$
\text{futureTier2Minutes}[y] = \sum_{\text{all workflows}} \text{wf.volume}[y] \times \left(1 - \frac{\text{wf.deflection}[y]}{100}\right) \times \text{wf.hoursPerCase} \times 60 \times \left(1 - \frac{\text{wf.effortReduction}[y]}{100}\right)
$$

$$
\text{futureTotalMinutes}[y] = \text{futureTier01Minutes}[y] + \text{futureTier2Minutes}[y]
$$

### Phase 1 Output: Hours Saved Per Year

$$
\boxed{\text{hoursSaved}[y] = \frac{\text{currentTotalMinutes}[y] - \text{futureTotalMinutes}[y]}{60}}
$$

$$
\text{totalHoursSavedOverContract} = \sum_{y=1}^{\text{contractYears}} \text{hoursSaved}[y]
$$

Also useful for display:

$$
\text{casesDeflected}[y] = \text{tier01Cases}[y] \times \frac{\text{tier01Deflection}[y]}{100} + \sum_{\text{all workflows}} \text{wf.volume}[y] \times \frac{\text{wf.deflection}[y]}{100}
$$

$$
\text{workloadReduction}[y] = \frac{\text{currentTotalMinutes}[y] - \text{futureTotalMinutes}[y]}{\text{currentTotalMinutes}[y]}
$$

---

## Phase 2: Cost Translation (Plug in headcount + salaries)

Takes the hours saved from Phase 1 and translates into dollar savings.

### Cost Inputs

| Parameter | Description |
|---|---|
| $\text{hrOpsHeadcount}$ | Current HR ops headcount |
| $\text{tier01Salary}$ | Tier 0-1 handler annual salary |
| $\text{tier2Salary}$ | Tier 2+ handler annual salary |
| $\text{wisqLicenseCost}$ | Wisq annual license cost |

Optional:

| Parameter | Description |
|---|---|
| $\text{managerTime.enabled}$ | Manager/GM time savings toggle |
| $\text{managerTime.count}$ | Number of managers doing HR work |
| $\text{managerTime.hoursPerWeek}$ | Hours/week per manager on HR |
| $\text{managerTime.hourlyCost}$ | Manager hourly cost |
| $\text{triageRole.enabled}$ | Triage role toggle |
| $\text{triageRole.ftes}$ | Triage FTEs |
| $\text{triageRole.salary}$ | Triage salary |

### Hourly Rates

$$
\text{tier01HourlyRate} = \frac{\text{tier01Salary}}{2080}
$$

$$
\text{tier2HourlyRate} = \frac{\text{tier2Salary}}{2080}
$$

### Headcount Cost Savings Per Year

Tier 0-1 and Tier 2+ hours saved are tracked separately from Phase 1:

$$
\text{tier01HoursSaved}[y] = \frac{\text{currentTier01Minutes}[y] - \text{futureTier01Minutes}[y]}{60}
$$

$$
\text{tier2HoursSaved}[y] = \frac{\text{currentTier2Minutes}[y] - \text{futureTier2Minutes}[y]}{60}
$$

$$
\text{headcountSavings}[y] = \text{tier01HoursSaved}[y] \times \text{tier01HourlyRate} + \text{tier2HoursSaved}[y] \times \text{tier2HourlyRate}
$$

### FTE Reduction Per Year

$$
\text{fteReduction}[y] = \frac{\text{hoursSaved}[y]}{2080}
$$

### Manager Time Savings Per Year (if enabled)

$$
\text{managerSavings}[y] = \text{managerTime.count} \times \text{managerTime.hoursPerWeek} \times 52 \times \frac{\text{tier01Deflection}[y]}{100} \times 0.6 \times \text{managerTime.hourlyCost}
$$

### Triage Role Savings Per Year (if enabled)

$$
\text{triageSavings}[y] = \text{triageRole.ftes} \times \text{triageRole.salary} \times \text{workloadReduction}[y] \times 0.8
$$

### Total & Net Savings Per Year

$$
\text{totalSavings}[y] = \text{headcountSavings}[y] + \text{managerSavings}[y] + \text{triageSavings}[y]
$$

$$
\text{netSavings}[y] = \text{totalSavings}[y] - \text{wisqLicenseCost}
$$

### Contract-Level Totals

$$
\boxed{\text{totalNetSavings} = \sum_{y=1}^{\text{contractYears}} \text{netSavings}[y]}
$$

$$
\text{contractROI} = \frac{\text{totalNetSavings}}{\text{contractYears} \times \text{wisqLicenseCost}} \times 100\%
$$

---

## UI Section Order (HR Operations Tab)

1. **Contract & Wisq Effectiveness** — contract years, per-year effectiveness sliders (different colored bars), per-year workforce change sliders
2. **Tier 0-1: Simple Cases** — tier01CasesPerYear, tier01HandleTime, tier01MaxDeflection
3. **Tier 2+: Complex Workflows** — add/remove workflows, each with volume, hoursPerCase, maxDeflection, maxEffortReduction
4. **Cost Parameters** — tier01Salary, tier2Salary
5. **Federated / Distributed Model** — manager time, triage role toggles
6. **Results: Hours Saved Summary** — per-year hours saved, cases deflected, workload reduction % (Phase 1 output)
7. **Results: Cost Savings** — per-year headcount savings, FTE reduction, manager/triage savings, net savings, contract ROI (Phase 2 output)
