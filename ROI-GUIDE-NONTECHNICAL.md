# How the Wisq ROI Calculator Works
### A Plain-Language Walkthrough

---

## What This Tool Does

The ROI calculator helps answer a simple question: **"If we buy Wisq, how much money will we save (or avoid spending) each year?"**

It builds that answer in stages, walking through four sections of a form. By the end, you get a dollar figure for annual savings, a return-on-investment percentage, and a payback timeline.

---

## Stage 1: The Quick Estimate

Before diving into details, the calculator asks four basic questions about the company:

1. **How many employees do you have?**
2. **What industry are you in?** (Healthcare, Retail, Hospitality, Manufacturing, Financial Services, Technology, Professional Services)
3. **What kind of workforce?**
   - *Frontline-heavy* — mostly hourly, on-site workers (think retail stores, hospital staff, factory floors)
   - *Knowledge-worker* — mostly salaried, office/remote workers (think software engineers, consultants, analysts)
   - *Mixed* — a blend of both
4. **How is your HR team organized?**
   - *Centralized* — one HR team handles everything
   - *Federated* — HR responsibilities are spread across business units or regions

### What happens behind the scenes

From just these four answers, the system fills in reasonable starting values for everything else in the calculator. It does this using **industry benchmarks** — data about what's typical for companies of your size and type.

For example:
- A 5,000-person healthcare company will have different HR staffing levels, case volumes, and salary ranges than a 5,000-person tech company
- Frontline-heavy workforces tend to generate more (but simpler) HR questions than knowledge-worker teams
- Federated HR orgs tend to have more "hidden" cases that fall through the cracks, so the system assumes a higher volume

**These are just starting points.** Every number can be adjusted manually in the next stages. The quick estimate just saves time by giving you a reasonable baseline instead of a blank form.

### How the license cost is estimated

The system also estimates what Wisq would cost based on company size:
- Smaller companies (under 2,500 employees): ~$5 per employee per month
- Mid-size companies (2,500–10,000): ~$4 per employee per month
- Larger companies (10,000+): ~$3 per employee per month

This becomes the "cost" side of the ROI equation.

---

## Stage 2: HR Operations Savings

This is the biggest section and typically the largest source of savings. It answers: **"How much HR staff time and cost does Wisq eliminate?"**

### The basic idea

HR teams spend their time handling employee cases — questions, requests, issues. These cases fall into two categories:

**Simple cases (Tier 0-1):** Routine questions with straightforward answers. "How do I update my direct deposit?" "What's our PTO policy?" "Where do I find my pay stub?" These are high-volume but quick to resolve.

**Complex cases (Tier 2+):** Situations that require judgment, investigation, or multi-step processes. Things like leave of absence management, policy violations, workplace accommodations, or safety incidents. These are lower volume but take much longer per case.

### How savings are calculated

Wisq reduces HR workload in two ways:

1. **Deflection** — Wisq handles the case entirely, so no HR person needs to touch it. The calculator assumes Wisq can fully deflect about 80% of simple cases and about 40% of complex cases.

2. **Effort reduction** — For complex cases that still need a human, Wisq does the prep work (gathering info, pulling up policies, drafting responses), so the HR person spends less time. The calculator assumes about 80% less effort on these assisted cases.

The math works like this:
- Figure out how many total minutes HR spends on cases today
- Figure out how many minutes they'd spend with Wisq (after deflection and effort reduction)
- The difference is the time saved
- Convert that time into dollar savings using salary data

### Volume adjustments

Two multipliers make the case volume more realistic:

- **Seepage multiplier** — Not every HR interaction gets logged as a formal "case." People ask questions in hallways, Slack messages, or quick emails that never hit the ticketing system. This multiplier inflates the volume to account for that hidden work (20% extra for centralized orgs, 40% extra for federated ones).

- **Overhead multiplier** — Raw handle time doesn't capture the full picture. There's context switching, looking things up, documenting the case, following up. This multiplier inflates handle time to be more realistic (typically 1.4x to 1.6x depending on workforce type).

### Optional add-ons

Two optional features can be turned on to capture additional savings:

- **Manager time savings** — In many organizations (especially federated ones), line managers end up handling HR questions that should go to HR. If enabled, this calculates the value of giving managers that time back. It applies a conservative 60% recovery factor — not all freed-up time translates to productive work.

- **Triage role elimination** — Some larger federated orgs have dedicated people whose job is just to route HR cases to the right team. If Wisq handles routing automatically, those roles can be reduced. This uses an 80% recovery factor.

### The bottom line

The final output is **net savings**: total operational savings minus the Wisq license cost. This is also expressed as an ROI percentage (net savings divided by license cost).

---

## Stage 3: Legal & Compliance Savings

This section answers: **"How much do we save by making fewer mistakes on high-risk cases?"**

### The basic idea

Some HR cases carry real legal risk — terminations, discrimination complaints, leave denials, policy violations. When these are handled incorrectly, the consequences can be expensive: lawsuits, settlements, regulatory fines, or failed audits.

The calculator models the value of **improved accuracy** on these high-stakes cases.

### How it works

First, the system identifies how many cases are "high-stakes." By default, it takes a small percentage (typically 2-3%, depending on industry) of the complex cases from the HR Operations section.

Then it compares error rates:
- **Without Wisq:** Assume a 90% accuracy rate (meaning 10% of high-stakes cases have some kind of error)
- **With Wisq:** Assume a 99% accuracy rate (Wisq provides guardrails, policy checks, and documentation trails)

The difference in error rate, multiplied by the average cost of a legal incident, gives you the **avoided legal costs**.

**Example:** If you have 100 high-stakes cases per year, going from 90% to 99% accuracy means 9 fewer errors. At $75,000 per incident, that's $675,000 in avoided costs.

### Admin time savings

High-stakes cases also require heavy documentation — audit trails, compliance forms, evidence gathering. The calculator assumes Wisq automates 60% of that administrative burden, and values the time saved at the admin hourly rate.

### Optional add-ons

- **Audit preparation** — If your industry requires compliance audits (healthcare, financial services, manufacturing), Wisq can reduce the time spent preparing for them by automating documentation and report generation.

- **Risk pattern detection** — An estimated annual value for Wisq's ability to spot trends early (e.g., a spike in similar complaints at one location), allowing you to intervene before problems escalate.

- **Proactive compliance alerts** — An estimated annual value for Wisq flagging policy changes or regulatory updates that require action.

The risk detection and proactive alerts values are entered as direct dollar estimates rather than calculated from a formula — they represent the user's judgment about what early warning is worth to their organization.

### Important note

Unlike the HR Operations section, legal & compliance savings are **not reduced by the Wisq license cost**. The license cost is only deducted once (in HR Ops). This section is purely additive value.

---

## Stage 4: Employee Experience Savings

This section answers: **"How much productive time do employees and managers get back when HR questions are answered faster?"**

### The basic idea

Every time an employee has an HR question, they spend time finding the answer — searching the intranet, emailing HR, waiting for a response, following up. Their manager often gets pulled in too. With Wisq, employees get instant answers to most questions, and the ones that do need human help get resolved faster.

### How it works

The calculation is straightforward:

1. **Total inquiries** = number of employees × average inquiries per employee per year (typically 2.5–3.5 depending on workforce type)
2. **Time saved per inquiry** = current time × reduction percentage (typically 75% faster with Wisq)
3. **Adoption adjustment** = not everyone will use the new tool immediately, so savings are scaled by an adoption rate (typically 70-80%)
4. **Dollar value** = hours saved × hourly rates

### The 70/30 split

The time savings are split between employees (70%) and managers (30%). This reflects the reality that when an employee has an HR question, their manager often spends time on it too — answering what they can, escalating what they can't, or just being interrupted.

Because managers are paid more per hour, the 30% of time they save is worth proportionally more than the 70% employees save.

### What this section does NOT claim

The `employeeSatisfactionImprovement` field (default 25%) is tracked but **not used in any financial calculation**. It's a qualitative metric for the narrative, not a dollar figure. The financial value here comes purely from time savings.

---

## The Summary: Putting It All Together

The summary tab combines all three streams into a single business case.

### Total annual value

```
Gross annual value = HR Ops savings (before license) + Legal savings + Employee Experience savings
Net annual benefit = HR Ops savings (after license)  + Legal savings + Employee Experience savings
```

The Wisq license cost is subtracted only once, from the HR Operations stream.

### ROI percentage

```
ROI = Net annual benefit ÷ Wisq license cost × 100
```

For example, if net annual benefit is $1.5M and the license costs $300K, the ROI is 500%.

### Payback period

```
Payback = (License cost ÷ Monthly gross value) + 3 months
```

The extra 3 months accounts for implementation time — it takes time to set up Wisq, configure workflows, and train the team before value starts flowing.

### 3-year projection

The calculator doesn't assume full value from day one. Instead, it uses a ramp-up schedule:

| Year | % of Full Value | Why |
|------|----------------|-----|
| Year 1 | 50% | Implementation, initial adoption, learning curve |
| Year 2 | 75% | Growing adoption, workflows being refined |
| Year 3 | 100% | Full maturity, all workflows live, high adoption |

So if the annual value at maturity is $1M, the 3-year total is $500K + $750K + $1M = **$2.25M** (minus 3 years of license costs).

### The narrative

The summary also generates a written business case paragraph. The tone and focus shift depending on which value stream is the biggest contributor:

- If legal/compliance dominates → the narrative leads with risk reduction
- If manager time savings are large → the narrative emphasizes manager productivity
- If HR ops dominates → the narrative focuses on operational efficiency
- If balanced → the narrative tells a multi-faceted value story

---

## Scenario Modeling

When the ROI results are presented on the client-facing microsite, they're shown with three confidence levels:

| Scenario | What Changes | Purpose |
|----------|-------------|---------|
| **Conservative** | Deflection rates reduced by 20%, adoption reduced by 30% | "Even if things don't go perfectly..." |
| **Recommended** | No changes (baseline) | "This is what we expect based on benchmarks" |
| **Optimistic** | Deflection rates increased by 15%, adoption increased by 20% | "If adoption is strong and workflows are well-configured..." |

Only deflection rates and adoption rates change between scenarios. All other assumptions (salaries, case volumes, handle times, etc.) stay the same. This makes it easy to see how sensitive the ROI is to those two key variables.

---

## How Pricing Works

The pricing page is separate from the ROI calculator but feeds into it (the license cost used in ROI comes from here). Here's how Wisq pricing is structured.

### Software pricing: tiered by company size

Wisq charges annually based on employee count. The per-employee price decreases as the company gets larger:

| Employee Range | Platform (per employee/year) | Workflows Add-on (per employee/year) |
|---------------|------------------------------|--------------------------------------|
| First 1,000 | $80 | $20 |
| 1,001–3,000 | $48 | $12 |
| 3,001–10,000 | $32 | $8 |
| 10,001–25,000 | $28 | $7 |
| 25,001+ | $24 | $6 |

**This is tiered, not flat.** A 5,000-employee company doesn't pay $32 for all 5,000 — they pay $80 for the first 1,000, $48 for the next 2,000, and $32 for the remaining 2,000. Think of it like tax brackets.

Both the Platform and Workflows lines can be individually included or excluded, and each can have its own discount percentage applied. There's also an option to override the calculated price with a custom amount for special deals.

The **effective PPEY** (price per employee per year) shown on the proposal is the blended rate: total net software price divided by total employees.

### One-time costs

These are charged once at the start of the engagement:

- **Implementation** — Defaults to 10% of Year 1 software cost. Covers setup, configuration, and go-live support. Can be overridden with a custom amount.
- **Professional services** — Billed at $250/hour for consulting, training, or custom work. Can also be a custom flat amount.
- **Integrations** — $5,000 per integration (HRIS, ticketing systems, etc.). Can also be a custom amount.

Each one-time line item can have its own discount applied.

### Recurring costs beyond software

- **Agent engineering** — Ongoing configuration and optimization work, billed at $250/hour. Hours and discounts can be set differently for each year of the contract. This is a yearly recurring cost, not one-time.

### Annual escalation

For multi-year contracts, an **annual escalation percentage** can be applied. This compounds starting in Year 2 — if escalation is 3%, Year 2 software costs are 1.03× Year 1, Year 3 is 1.03× Year 2 (i.e., 1.0609× Year 1), and so on.

### Key totals on the pricing page

| Metric | What It Means |
|--------|--------------|
| **Annual Recurring Revenue (ARR)** | Year 1 software + Year 1 agent engineering |
| **Total Contract Value (TCV)** | All recurring costs across all years + all one-time costs |
| **Total First Year Investment** | Year 1 software + Year 1 agent engineering + all one-time costs |
| **Effective PPEY** | Year 1 net software price ÷ employee count (the blended per-employee rate) |

### How pricing connects to ROI

The **Year 1 software net price** (after discounts) is what gets used as the `wisqLicenseCost` in the ROI calculator. This is the number that gets subtracted from HR Operations savings to produce the net benefit, and it's the denominator in the ROI percentage calculation.

---

## Quick Reference: What Drives ROI Up or Down

| Factor | Higher ROI When... | Lower ROI When... |
|--------|--------------------|-------------------|
| Employee count | More employees (more cases to deflect) | Fewer employees |
| Case volume | Higher volume (more opportunities for automation) | Lower volume |
| Tier 0-1 % | Higher (more simple cases Wisq can fully handle) | Lower |
| Deflection rates | Higher (Wisq handles more cases end-to-end) | Lower |
| Salaries | Higher (each hour saved is worth more) | Lower |
| Legal risk | Higher-risk industry (more value from accuracy) | Lower-risk |
| Workforce type | Frontline-heavy (higher volume, more simple cases) | Knowledge-worker (lower volume) |
| Org model | Federated (more seepage, manager time, triage roles) | Centralized |
| License cost | Lower (smaller denominator in ROI %) | Higher |
