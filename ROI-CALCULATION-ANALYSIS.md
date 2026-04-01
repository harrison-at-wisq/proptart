# Wisq ROI Calculation System - Deep Analysis

## Table of Contents

1. [System Overview](#system-overview)
2. [Entry Point: Company Profile & Auto-Estimation](#entry-point-company-profile--auto-estimation)
3. [Tab 1: HR Operations ROI](#tab-1-hr-operations-roi)
4. [Tab 2: Legal & Compliance ROI](#tab-2-legal--compliance-roi)
5. [Tab 3: Employee Experience ROI](#tab-3-employee-experience-roi)
6. [Summary Tab: Consolidated ROI](#summary-tab-consolidated-roi)
7. [3-Year Projection](#3-year-projection)
8. [Scenario Modeling (Microsite)](#scenario-modeling-microsite)
9. [Key Assumptions & Constants](#key-assumptions--constants)
10. [Industry Benchmarks Reference](#industry-benchmarks-reference)
11. [Architecture & Data Flow](#architecture--data-flow)

---

## System Overview

The ROI calculator is a **4-tab interface** that calculates value across three independent streams, then consolidates them into a unified business case. The three value streams are:

| Stream | What it Measures | Key Output |
|--------|-----------------|------------|
| **HR Operations** | Headcount reduction & time savings from case deflection | Net savings after Wisq license cost |
| **Legal & Compliance** | Risk reduction from improved accuracy on high-stakes cases | Total avoided costs (legal, admin, audit) |
| **Employee Experience** | Productivity gains from faster employee self-service | Monetary value of time returned to employees & managers |

**Key files:**
- `src/lib/roi-calculator.ts` — All calculation functions
- `src/lib/benchmarks.ts` — Industry benchmarks and auto-estimation logic
- `src/lib/pricing-calculator.ts` — Wisq pricing tiers
- `src/components/calculators/ROICalculator.tsx` — Main UI (4-tab calculator)
- `src/components/microsite/hooks/useROIScenarios.ts` — Scenario multipliers
- `src/types/proposal.ts` — All type definitions and default values

---

## Entry Point: Company Profile & Auto-Estimation

Before any manual input, the calculator offers a **Quick ROI Assessment** mode. The user provides four fields:

| Field | Options | Default |
|-------|---------|---------|
| Employee Count | Any number | 5,000 |
| Industry | Healthcare, Retail, Hospitality, Manufacturing, Financial Services, Technology, Professional Services, Other | Technology |
| Workforce Type | Frontline-Heavy, Mixed, Knowledge-Worker | — |
| Org Model | Centralized, Federated | — |

### How Auto-Estimation Works (`generateEstimates()` in `benchmarks.ts`)

From these four inputs, the system populates **every field** across all three ROI tabs using industry benchmarks and adjustment multipliers.

#### Step 1: HR Headcount Estimation

The system uses an **HR-to-employee ratio** that varies by company size:

| Employee Band | HR:Employee Ratio | Cases/Employee/Year | Min HR Staff | Max HR Staff |
|---------------|-------------------|---------------------|--------------|--------------|
| 1,000–2,500 | 1:80 | 2.5 | 12 | 31 |
| 2,500–5,000 | 1:120 | 2.2 | 21 | 42 |
| 5,000–10,000 | 1:150 | 2.0 | 33 | 67 |
| 10,000–25,000 | 1:200 | 1.8 | 50 | 125 |
| 25,000+ | 1:250 | 1.5 | 100 | 250 |

HR headcount = `employeeCount / ratio`, clamped between min and max.

#### Step 2: Case Volume Estimation

```
Base cases = casesPerEmployeePerYear × employeeCount
```

Adjusted by:
- **Workforce type**: Frontline-heavy gets +15%, Knowledge-worker gets -15%
- **Industry seasonal factor**: e.g., Hospitality 1.5×, Retail 1.4×, most others 1.0–1.1×

#### Step 3: Case Split (Tier 0-1 vs. Tier 2+)

Each industry has a base Tier 0-1 percentage (simple cases), further adjusted by workforce type:
- Frontline-heavy: +8% (more simple questions)
- Knowledge-worker: -5% (fewer simple, more complex)

#### Step 4: Tier 2+ Workflow Generation

Industry-specific workflows are auto-created. Each has a name, hours per case, and % of total Tier 2+ volume. Examples:

**Healthcare:** Policy Violations (4h, 30%), Leave Mgmt (6h, 30%), Accommodations (5h, 15%), Credentialing (3h, 25%)

**Retail:** Policy Violations (3h, 40%), Leave Mgmt (5h, 25%), Accommodations (4h, 10%), Seasonal Workforce (2h, 25%)

*(Full list in Industry Benchmarks section below)*

#### Step 5: Salary & Rate Estimation

Base salaries come from industry benchmarks, then scale by workforce type:
- **Frontline-heavy**: 85% of base (lower wage environment)
- **Knowledge-worker**: 110–115% of base (higher wage environment)

#### Step 6: Multipliers

| Multiplier | Centralized | Federated |
|-----------|------------|-----------|
| Seepage (hidden case volume) | 1.2× | 1.4× |
| Case overhead | Depends on workforce type | Same |

| Workforce Type | Overhead Multiplier |
|---------------|-------------------|
| Frontline-heavy | 1.4× |
| Knowledge-worker | 1.6× |
| Mixed | 1.5× |

#### Step 7: Optional Features Auto-Enabled

- **Manager HR time savings**: Enabled if federated org model (1 manager per 50 employees, 4 hrs/week @ $45/hr)
- **Triage role elimination**: Enabled if federated AND ≥5,000 employees (1 FTE per 5,000 employees)
- **Audit prep**: Enabled if industry compliance risk is not "LOW"

#### Step 8: Wisq License Cost

Auto-calculated from employee count using PEPM (per employee per month) pricing:

| Size | PEPM | Annual Formula |
|------|------|---------------|
| Small (<2,500) | $5 | employees × $5 × 12 |
| Mid (2,500–10,000) | $4 | employees × $4 × 12 |
| Large (10,000+) | $3 | employees × $3 × 12 |

---

## Tab 1: HR Operations ROI

**Source:** `calculateHROperationsROI()` in `roi-calculator.ts`

This is the core value stream. It calculates how much HR staff time and cost Wisq eliminates through case deflection and effort reduction.

### Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `currentHeadcount` | Current HR ops team size | 5 |
| `totalCasesPerYear` | Annual case volume | 12,000 |
| `tier01Percent` | % of cases that are simple (Tier 0-1) | 65% |
| `tier01AvgHandleTime` | Minutes per simple case | 9 min |
| `tier01DeflectionRate` | % of simple cases Wisq fully handles | 80% |
| `tier01HandlerSalary` | Annual salary for Tier 0-1 handlers | $60,000 |
| `tier2PlusDeflectionRate` | Global fallback deflection for complex cases | 40% |
| `tier2PlusEffortReduction` | % effort reduction on non-deflected complex cases | 80% |
| `tier2PlusHandlerSalary` | Annual salary for Tier 2+ handlers | $100,000 |
| `tier2Workflows[]` | Array of complex workflow definitions | [] |
| `wisqLicenseCost` | Annual Wisq license | 0 |
| `seepageMultiplier` | Hidden volume multiplier | 1.0 |
| `caseOverheadMultiplier` | Handle time overhead multiplier | 1.5 |

**Per Tier 2+ Workflow:**
- `name` — e.g., "Leave Management"
- `volumePerYear` — Annual case count
- `timePerWorkflowHours` — Hours per case
- `deflectionRate` — Optional per-workflow override (falls back to global)
- `effortReduction` — Optional per-workflow override (falls back to global)

**Optional add-ons:**
- `managerHRTime` — Managers spending time on HR tasks (enabled, count, hours/week, hourly cost)
- `triageRole` — Dedicated triage FTEs that can be reduced (enabled, FTE count, salary)
- `salaryRegions[]` — Regional salary weightings

### Calculation Flow

#### 1. Apply Volume Multipliers

```
Tier 0-1 cases = totalCases × (tier01Percent / 100) × seepageMultiplier
Tier 2+ cases  = totalCases × (1 - tier01Percent / 100) × seepageMultiplier
```

The **seepage multiplier** accounts for untracked/hidden cases — higher in federated orgs where cases slip through cracks.

#### 2. Calculate Handle Times with Overhead

```
Effective T0-1 handle time = tier01AvgHandleTime × caseOverheadMultiplier
Effective T2+ handle time  = weighted average of workflow hours × 60 × caseOverheadMultiplier
```

The **overhead multiplier** accounts for context switching, documentation, follow-ups, etc. that aren't captured in raw handle time.

#### 3. Current State Workload (minutes)

```
Current T0-1 minutes      = tier01Cases × effectiveTier01HandleTime
Current T2+ minutes       = tier2Cases × effectiveTier2HandleTime
Current Total minutes     = sum of above
```

For Tier 2+, configured and unconfigured workflows are calculated separately.

#### 4. Future State with Wisq (minutes)

**Tier 0-1:**
```
Future T0-1 = tier01Cases × (1 - deflectionRate/100) × handleTime
```

**Per Tier 2+ workflow:**
```
Not deflected = workflowCases × (1 - workflowDeflectionRate/100)
Future minutes = notDeflected × handleTime × (1 - effortReduction/100)
```

This is a **two-stage reduction**: first, some cases are fully deflected (handled entirely by Wisq). Second, the remaining cases take less time because Wisq assists.

**Unconfigured Tier 2+ cases** get **no reduction** — they pass through unchanged.

#### 5. Calculate Savings

```
Minutes saved = currentTotal - futureTotal
Workload reduction % = minutesSaved / currentTotal
FTE reduction = minutesSaved / 124,800 (minutes per FTE per year)
```

#### 6. Cost Savings

```
T0-1 hourly rate = tier01HandlerSalary / 2,080
T2+ hourly rate  = tier2PlusHandlerSalary / 2,080
Headcount savings = (T0-1 hours saved × T0-1 rate) + (T2+ hours saved × T2+ rate)
```

#### 7. Optional: Manager Time Savings

```
Manager savings = managers × hoursPerWeek × 52 × (deflectionRate/100) × 0.6 × hourlyRate
```

The **0.6 factor** is a conservative assumption — only 60% of manager time freed up is considered productive savings.

#### 8. Optional: Triage Role Savings

```
Triage savings = triageFTEs × triageSalary × workloadReductionPercent × 0.8
```

The **0.8 factor** assumes triage roles only benefit 80% as much as direct handlers from the workload reduction.

#### 9. Final Outputs

```
Total operational savings = headcount reduction + manager time + triage savings
Net savings = total operational savings - wisqLicenseCost
ROI % = (netSavings / wisqLicenseCost) × 100
```

---

## Tab 2: Legal & Compliance ROI

**Source:** `calculateLegalComplianceROI()` in `roi-calculator.ts`

This stream quantifies the value of **reduced legal risk** through improved accuracy on high-stakes cases.

### Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `highStakesPercent` | % of cases that are high-risk | 2% |
| `useManualCaseVolume` | Override auto-calculated volume | false |
| `manualHighStakesCases` | Manual case count if override | 50 |
| `currentAccuracyRate` | Current handling accuracy | 90% |
| `wisqAccuracyRate` | Wisq-enhanced accuracy | 99% |
| `avgLegalCostPerIncident` | Cost per legal incident | $75,000 |
| `adminHoursPerCase` | Admin hours per high-stakes case | 8 |
| `adminHourlyRate` | Hourly rate for admin work | $75 |

**Optional add-ons:**
- `auditPrep` — audits/year, prep hours/audit, hourly rate, Wisq reduction %
- `riskPatternDetection` — Estimated annual value of early risk detection
- `proactiveAlerts` — Estimated annual value of compliance alerts

### Calculation Flow

#### 1. Determine High-Stakes Case Volume

```
Auto mode: highStakesCases = tier2PlusConfiguredCases × (highStakesPercent / 100)
Manual mode: uses manualHighStakesCases directly
```

Note: This calculation receives `tier2PlusConfiguredCases` from the HR Operations tab, creating a **dependency between tabs**.

#### 2. Avoided Legal Incidents

```
Baseline errors    = highStakesCases × (1 - currentAccuracy/100)    // e.g., 10% error rate
With Wisq errors   = highStakesCases × (1 - wisqAccuracy/100)       // e.g., 1% error rate
Avoided incidents  = baselineErrors - wisqErrors
Avoided legal cost = avoidedIncidents × avgLegalCostPerIncident
```

**Example:** 100 high-stakes cases, 90% → 99% accuracy = 10 errors → 1 error = 9 avoided × $75K = **$675K avoided**

#### 3. Admin Time Savings

```
Baseline admin hours = highStakesCases × adminHoursPerCase
Wisq admin hours     = baselineHours × (1 - 0.60)                    // 60% reduction constant
Hours saved          = baseline - wisqHours
Admin cost savings   = hoursSaved × adminHourlyRate
```

The **60% admin time reduction** (`ADMIN_TIME_SAVINGS_PERCENT`) is a fixed constant — Wisq automates 60% of the administrative burden on high-stakes cases.

#### 4. Audit Preparation Savings (if enabled)

```
Total prep hours = auditsPerYear × prepHoursPerAudit
Savings = totalPrepHours × prepHourlyRate × (wisqReductionPercent / 100)
```

#### 5. Risk Pattern Detection & Proactive Alerts (if enabled)

These are **direct dollar value inputs** — not calculated from formulas. They represent estimated annual value that the user sets based on their judgment.

#### 6. Total

```
Total avoided costs = avoidedLegalCosts + adminSavings + auditPrepSavings + riskValue + proactiveValue
```

---

## Tab 3: Employee Experience ROI

**Source:** `calculateEmployeeExperienceROI()` in `roi-calculator.ts`

This stream measures the **productivity value** of employees and managers spending less time on HR inquiries.

### Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `totalEmployeePopulation` | Total employees | 2,000 |
| `inquiriesPerEmployeePerYear` | HR inquiries per employee/year | 3 |
| `avgTimePerInquiry` | Minutes per inquiry | 15 |
| `timeReductionPercent` | % faster with Wisq | 75% |
| `adoptionRate` | % of employees using Wisq | 70% |
| `avgEmployeeHourlyRate` | Employee hourly rate | $50 |
| `avgManagerHourlyRate` | Manager hourly rate | $75 |
| `employeeSatisfactionImprovement` | Tracking metric only (not in calc) | 25% |

### Calculation Flow

```
Total inquiries   = population × inquiriesPerYear
Baseline minutes  = totalInquiries × avgTimePerInquiry
Minutes saved     = baselineMinutes × (timeReduction/100) × (adoptionRate/100)
Hours saved       = minutesSaved / 60
```

**Time split:**
```
Employee hours = hoursSaved × 0.70    (70% of savings go to employees)
Manager hours  = hoursSaved × 0.30    (30% of savings go to managers)
```

**Monetary value:**
```
Employee value = employeeHours × avgEmployeeHourlyRate
Manager value  = managerHours × avgManagerHourlyRate
Total          = employeeValue + managerValue
```

The **70/30 split** is a fixed assumption — 70% of the time savings from faster HR inquiries accrues to the employees asking questions, 30% to managers who would otherwise be pulled in.

---

## Summary Tab: Consolidated ROI

**Source:** `calculateROISummary()` in `roi-calculator.ts`

### Consolidation Logic

```
Gross annual value = (HR ops gross savings) + (legal avoided costs) + (EX monetary value)
Net annual benefit = (HR ops net savings) + (legal avoided costs) + (EX monetary value)
Total ROI %        = (netAnnualBenefit / wisqLicenseCost) × 100
```

Where:
- **HR ops gross** = headcount savings + manager time savings + triage savings (before license)
- **HR ops net** = gross - wisqLicenseCost

### Payback Period

```
Monthly gross value = grossAnnualValue / 12
Payback months      = (wisqLicenseCost / monthlyGrossValue) + 3
```

The **+3 months constant** accounts for implementation and ramp-up time before value realization begins.

### Business Case Narrative Generation

The summary tab generates a contextual narrative based on which value stream dominates:

| Condition | Narrative Focus |
|-----------|----------------|
| Legal > 50% of total | Risk & compliance value story |
| Manager time > headcount savings | Manager productivity story |
| HR ops > 50% of total | Operational efficiency story |
| Otherwise | Balanced multi-stream value story |

The narrative incorporates industry name, org model, and percentage breakdowns.

---

## 3-Year Projection

**Source:** `calculate3YearProjection()` in `roi-calculator.ts`

The projection applies a **ramp-up schedule** to account for adoption maturity:

| Year | Value Realization | Rationale |
|------|-------------------|-----------|
| Year 1 | **50%** of annual value | Implementation + initial adoption |
| Year 2 | **75%** of annual value | Growing adoption and optimization |
| Year 3 | **100%** of annual value | Full maturity |

```
Year 1 value = annualValue × 0.50
Year 2 value = annualValue × 0.75
Year 3 value = annualValue × 1.00
3-year total = Y1 + Y2 + Y3 = annualValue × 2.25
Net 3-year   = total - (wisqLicenseCost × 3)
```

---

## Scenario Modeling (Microsite)

**Source:** `useROIScenarios.ts` and `MicrositeROIExplorer.tsx`

The microsite presents three pre-configured scenarios that multiply key rates:

| Scenario | Deflection Rate Multiplier | Adoption Rate Multiplier |
|----------|---------------------------|-------------------------|
| **Conservative** | × 0.80 | × 0.70 |
| **Recommended** | × 1.00 (baseline) | × 1.00 (baseline) |
| **Optimistic** | × 1.15 | × 1.20 |

These multipliers apply to:
- `tier01DeflectionRate` (Tier 0-1 deflection)
- `tier2PlusDeflectionRate` (global Tier 2+ deflection)
- Each individual workflow's `deflectionRate`
- `adoptionRate` (Employee Experience)

All three ROI streams are recalculated per scenario, and the summary updates accordingly.

---

## Key Assumptions & Constants

### Hard-Coded Constants

| Constant | Value | Used In |
|----------|-------|---------|
| Minutes per FTE per year | 124,800 | HR Ops headcount calculation |
| Hours per FTE per year | 2,080 | Salary → hourly rate conversion |
| Admin time savings % | 60% | Legal compliance admin reduction |
| Manager time recovery factor | 0.60 | HR Ops manager savings |
| Triage recovery factor | 0.80 | HR Ops triage savings |
| Employee/manager time split | 70/30 | Employee Experience |
| Payback period buffer | +3 months | Summary payback calculation |
| 3-year ramp: Y1/Y2/Y3 | 50%/75%/100% | 3-year projection |

### Default Deflection & Reduction Rates

| Parameter | Default | Meaning |
|-----------|---------|---------|
| Tier 0-1 deflection | 80% | 80% of simple cases handled entirely by Wisq |
| Tier 2+ deflection | 40% | 40% of complex cases handled entirely by Wisq |
| Tier 2+ effort reduction | 80% | Non-deflected complex cases take 80% less effort |

### Estimation Defaults (from `generateEstimates()`)

| Parameter | Frontline-Heavy | Mixed | Knowledge-Worker |
|-----------|----------------|-------|-----------------|
| Case volume modifier | +15% | baseline | -15% |
| Tier 0-1 % modifier | +8% | baseline | -5% |
| Salary modifier | × 0.85 | × 1.00 | × 1.10–1.15 |
| Overhead multiplier | 1.4× | 1.5× | 1.6× |
| Inquiries/employee/year | 3.5 | 3.0 | 2.5 |

---

## Industry Benchmarks Reference

### Salary Benchmarks by Industry

| Industry | T0-1 Handler | T2+ Handler | Avg Employee |
|----------|-------------|-------------|-------------|
| Healthcare | $55,000 | $90,000 | $55,000 |
| Retail | $50,000 | $85,000 | $38,000 |
| Hospitality | $48,000 | $80,000 | $35,000 |
| Manufacturing | $55,000 | $90,000 | $50,000 |
| Financial Services | $65,000 | $110,000 | $85,000 |
| Technology | $70,000 | $115,000 | $100,000 |
| Professional Services | $60,000 | $100,000 | $80,000 |

### Legal Risk Profile by Industry

| Industry | Compliance Risk | Avg Legal Cost/Incident | Audits/Year |
|----------|---------------|------------------------|-------------|
| Healthcare | HIGH | $100,000 | 3 |
| Retail | MEDIUM | $60,000 | 2 |
| Hospitality | MEDIUM | $50,000 | 2 |
| Manufacturing | HIGH | $80,000 | 2 |
| Financial Services | HIGH | $120,000 | 4 |
| Technology | LOW | $90,000 | 1 |
| Professional Services | MEDIUM | $75,000 | 2 |

### Tier 2+ Workflow Templates by Industry

| Industry | Workflow 1 | Workflow 2 | Workflow 3 | Workflow 4 |
|----------|-----------|-----------|-----------|-----------|
| Healthcare | Policy Violations (4h, 30%) | Leave Mgmt (6h, 30%) | Accommodations (5h, 15%) | Credentialing (3h, 25%) |
| Retail | Policy Violations (3h, 40%) | Leave Mgmt (5h, 25%) | Accommodations (4h, 10%) | Seasonal Workforce (2h, 25%) |
| Hospitality | Policy Violations (3h, 40%) | Leave Mgmt (5h, 20%) | Accommodations (4h, 10%) | Seasonal Workforce (2h, 30%) |
| Manufacturing | Policy Violations (4h, 25%) | Leave Mgmt (6h, 25%) | Accommodations (5h, 15%) | Safety & Injury (5h, 35%) |
| Financial Svcs | Policy Violations (5h, 15%) | Leave Mgmt (5h, 30%) | Accommodations (4h, 15%) | Regulatory/Ethics (7h, 40%) |
| Technology | Policy Violations (4h, 20%) | Leave Mgmt (5h, 35%) | Accommodations (4h, 20%) | Equity/Comp Reviews (3h, 25%) |
| Prof. Services | Policy Violations (5h, 20%) | Leave Mgmt (5h, 30%) | Accommodations (4h, 15%) | Client Disputes (3h, 35%) |

---

## Architecture & Data Flow

```
┌─────────────────────────────────────────────────────┐
│                  ENTRY POINT                         │
│  Company Profile (4 fields)                          │
│  employeeCount, industry, workforceType, orgModel    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │   generateEstimates()   │
         │   (benchmarks.ts)       │
         │                         │
         │ Auto-populates ALL      │
         │ inputs across 3 tabs    │
         └──────────┬──────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐
   │ Tab 1:  │ │ Tab 2:  │ │ Tab 3:  │
   │ HR Ops  │ │ Legal & │ │ Employee│
   │         │─┤Compliance│ │  Exp    │
   │ Cases,  │ │         │ │         │
   │ Deflect,│ │ Risk,   │ │ Inquiry │
   │ Effort  │ │ Accuracy│ │ Volume, │
   │ Reduce  │ │ Audit   │ │ Adoption│
   └────┬────┘ └────┬────┘ └────┬────┘
        │           │           │
        │    T2+ cases flow ──► │
        │           │           │
        ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐
   │ HR Ops  │ │ Legal   │ │ EX      │
   │ Output  │ │ Output  │ │ Output  │
   │         │ │         │ │         │
   │ Net     │ │ Avoided │ │ Time    │
   │ Savings │ │ Costs   │ │ Value   │
   └────┬────┘ └────┬────┘ └────┬────┘
        │           │           │
        └───────────┼───────────┘
                    ▼
         ┌─────────────────────┐
         │  calculateROISummary │
         │                     │
         │ • Gross annual value│
         │ • Net annual benefit│
         │ • Total ROI %       │
         │ • Payback period    │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │ 3-Year Projection   │
         │ Y1: 50% │ Y2: 75%  │
         │ Y3: 100%            │
         └─────────────────────┘
```

### Cross-Tab Dependencies

- **Tab 2 depends on Tab 1**: Legal & Compliance uses `tier2PlusConfiguredCases` from HR Operations to calculate high-stakes case volume (unless manual override is enabled).
- **Summary depends on all three tabs**: Consolidates outputs from all streams.
- **Wisq license cost** is deducted only once, in the HR Operations stream. Legal and EX values are additive.

### Scenario Layer (Microsite only)

The microsite wraps the entire calculation in a scenario multiplier layer:
```
scenarioInputs = baseInputs × scenarioMultipliers
scenarioOutputs = calculateAll(scenarioInputs)
```

This allows switching between Conservative/Recommended/Optimistic without changing any underlying assumptions — only deflection and adoption rates are scaled.
