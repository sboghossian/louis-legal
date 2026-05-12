---
id: tool.calculator-end-of-service-gratuity
name: End-of-Service Gratuity / Award Calculator
category: tool
intent: ['calculate eosg', 'end of service', 'gratuity calculator']
priority: P0
status: drafted
version: 0.1
---
Compute end-of-service entitlements per jurisdiction.

# UAE federal (Decree-Law 33/2021)
- Base: **basic salary only** (excludes housing, transport, other allowances)
- Formula: 21 days basic per year for first 5 years; 30 days basic per year thereafter
- Pro-rated for partial years (1 month minimum vesting)
- Capped at 2 years basic salary total
- Computation in days: `daily_basic = monthly_basic × 12 / 365`

# DIFC (DEWS — DIFC Employee Workplace Savings)
- Replaces old EOSG with monthly employer contributions
- Employer contributes 5.83% (years 1-5) or 8.33% (year 6+) of monthly **basic salary** to DEWS or qualifying alternative
- On termination, vested DEWS balance is paid

# KSA (Labor Law Royal Decree M/51 Art 84)
- Base: **last salary** including allowances (broader than UAE)
- Formula: half-month per year for first 5 years; full month per year thereafter
- On termination by employer: full entitlement
- On resignation: partial (sliding scale: 0% if <2y, 1/3 if 2-5y, 2/3 if 5-10y, full if 10y+)

# LB (Labor Law Decree 207/1946)
- Statutory indemnity per Art 50
- Formula: one month of salary per year of service for first 5 years; half-month per year thereafter
- NSSF separately covers end-of-service supplement for registered workers
- Termination without cause: full indemnity; with cause: forfeited

# Output
For each calculation:
- Currency + amount
- Computation steps (transparency)
- Caveats (currency conversion if salary in foreign currency; tax treatment)
- Disclaimer: actual entitlement depends on contract terms and any waiver/settlement
