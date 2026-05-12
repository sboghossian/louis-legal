/**
 * End-of-Service Gratuity / Indemnité de fin de service calculator.
 *
 * Covers MENA jurisdictions where statutory gratuity applies on employment
 * termination. Each jurisdiction has different formulas.
 */

export interface EosInput {
  jurisdiction: "UAE" | "KSA" | "BH" | "QA" | "OM" | "KW";
  /**
   * Basic salary per month, in local currency (AED, SAR, BHD, etc.)
   * Note: housing/transport/bonuses excluded by most statutes — use BASIC only.
   */
  basicSalaryMonthly: number;
  /** Total service in days (we convert internally). */
  serviceDays: number;
  /** Did employee resign? Affects KSA & some others. */
  endedByResignation: boolean;
  /**
   * UAE only: limited / unlimited (post-2022 reform all UAE contracts unlimited
   * unless fixed-term renewable). Default unlimited.
   */
  uaeContractType?: "unlimited" | "limited";
  /** KSA / others may include this caveat — was the dismissal "for cause"? */
  dismissedForCause?: boolean;
  /**
   * KSA only: did employee complete probation? Always assume true unless told.
   */
  ksaPastProbation?: boolean;
}

export interface EosOutput {
  jurisdiction: string;
  serviceYears: number;
  basicSalaryMonthly: number;
  gratuity: number;
  currency: string;
  breakdown: { label: string; amount: number; note?: string }[];
  caveats: string[];
  citations: string[];
}

const DAYS_PER_YEAR = 365;

export function computeEOS(input: EosInput): EosOutput {
  const years = input.serviceDays / DAYS_PER_YEAR;
  switch (input.jurisdiction) {
    case "UAE":
      return computeUAE(input, years);
    case "KSA":
      return computeKSA(input, years);
    case "BH":
      return computeBH(input, years);
    case "QA":
      return computeQA(input, years);
    case "OM":
      return computeOM(input, years);
    case "KW":
      return computeKW(input, years);
    default:
      throw new Error("Unsupported jurisdiction");
  }
}

// ============== UAE ==============
// Federal Decree-Law 33/2021 (Labor Law) + Cabinet Resolution 1/2022
// Post 2022 reform: all employment contracts are limited-term (max 3yr, renewable) —
// but EOSB formula remains the historic "unlimited" formula, applied to all:
//
//  - For first 5 years: 21 days basic per year
//  - After 5 years: 30 days basic per year
//  - Total gratuity capped at 2 YEARS basic pay
//
// Minimum service for any gratuity: 1 year.
//
// Resignation: previously reduced gratuity; under FDL 33/2021 + Resolution 1/2022
// the reduction was removed — full gratuity applies on either side termination
// (provided service ≥ 1 year and not dismissed for Art. 44 reasons).
function computeUAE(input: EosInput, years: number): EosOutput {
  const monthlyBasic = input.basicSalaryMonthly;
  const dailyBasic = monthlyBasic / 30;
  const breakdown: { label: string; amount: number; note?: string }[] = [];
  let gratuity = 0;

  if (years < 1) {
    return {
      jurisdiction: "UAE",
      serviceYears: round2(years),
      basicSalaryMonthly: monthlyBasic,
      gratuity: 0,
      currency: "AED",
      breakdown: [{ label: "Service less than 1 year", amount: 0, note: "No statutory gratuity owed under FDL 33/2021 Art. 51." }],
      caveats: [
        "Service less than 1 year — no statutory gratuity owed.",
        "Confirm no contractual gratuity in the employment contract.",
        "Other accrued amounts may still be due: unused leave, last-month salary, repatriation ticket.",
      ],
      citations: ["UAE FDL 33/2021 Art. 51", "Cabinet Resolution 1/2022"],
    };
  }

  const firstFiveYears = Math.min(years, 5);
  const beyondFiveYears = Math.max(years - 5, 0);

  const first = firstFiveYears * 21 * dailyBasic;
  breakdown.push({
    label: `First 5 years × 21 days basic (${firstFiveYears.toFixed(2)} yrs)`,
    amount: round2(first),
  });
  gratuity += first;

  if (beyondFiveYears > 0) {
    const second = beyondFiveYears * 30 * dailyBasic;
    breakdown.push({
      label: `Beyond 5 years × 30 days basic (${beyondFiveYears.toFixed(2)} yrs)`,
      amount: round2(second),
    });
    gratuity += second;
  }

  const cap = monthlyBasic * 24; // 2 years
  if (gratuity > cap) {
    breakdown.push({
      label: "Statutory cap: 2 years' basic salary",
      amount: round2(cap),
      note: `Uncapped calculation was ${round2(gratuity)} AED.`,
    });
    gratuity = cap;
  }

  const caveats: string[] = [
    "Basic salary only — exclude housing allowance, transport allowance, bonuses, commissions.",
    "Maximum total gratuity capped at 2 years' basic salary.",
    "Cap not statutory text but established practice — reinforce with HR.",
    "Add unused annual leave (30 calendar days per year accrual) at basic + housing per Art. 29 if applicable.",
    "Add return-ticket entitlement (Art. 30) and notice-period pay if not served.",
  ];
  if (input.dismissedForCause) {
    caveats.unshift(
      "Termination for Art. 44 cause (gross misconduct) may forfeit gratuity entirely. Verify cause meets the strict list (Art. 44(a-l))."
    );
  }

  return {
    jurisdiction: "UAE",
    serviceYears: round2(years),
    basicSalaryMonthly: monthlyBasic,
    gratuity: round2(gratuity),
    currency: "AED",
    breakdown,
    caveats,
    citations: [
      "UAE FDL 33/2021 (Labor Law) Art. 51",
      "Cabinet Resolution 1/2022 (Implementing Regulations)",
      "MOHRE EOSB Calculator (official)",
    ],
  };
}

// ============== KSA ==============
// Saudi Labor Law (Royal Decree M/51 of 1426H, as amended) — Art. 84-87.
// Formula:
//  - First 5 years: HALF month basic per year
//  - From 6th year on: FULL month basic per year
//
// Resignation (prior to 2021 amendments):
//  - <2 yrs service: 0
//  - 2-5 yrs: 1/3 of total
//  - 5-10 yrs: 2/3 of total
//  - 10+ yrs: 100%
//
// Termination by employer (or end of contract): 100%.
// Dismissal under Art. 80 (gross misconduct): 0%.
//
// Note: "Basic salary" definition under KSA Sharia / Labor case law is broader
// than UAE — usually includes the "wage" which means base + housing allowance
// (if cash) + commissions (if regular). Confirm with payroll.
function computeKSA(input: EosInput, years: number): EosOutput {
  const monthlyWage = input.basicSalaryMonthly;
  const breakdown: { label: string; amount: number; note?: string }[] = [];
  let gratuity = 0;

  if (input.dismissedForCause) {
    return {
      jurisdiction: "KSA",
      serviceYears: round2(years),
      basicSalaryMonthly: monthlyWage,
      gratuity: 0,
      currency: "SAR",
      breakdown: [{ label: "Dismissal under Labor Law Art. 80 (just cause)", amount: 0, note: "Forfeits gratuity entirely." }],
      caveats: [
        "Art. 80 just-cause dismissal forfeits gratuity. Confirm cause meets statutory list.",
        "Wages owed up to termination + unused annual leave still due.",
      ],
      citations: ["KSA Labor Law Art. 80", "KSA Labor Law Art. 84"],
    };
  }

  const firstFive = Math.min(years, 5);
  const beyondFive = Math.max(years - 5, 0);

  const first = firstFive * 0.5 * monthlyWage;
  breakdown.push({
    label: `First 5 years × half month (${firstFive.toFixed(2)} yrs)`,
    amount: round2(first),
  });
  gratuity += first;

  if (beyondFive > 0) {
    const second = beyondFive * monthlyWage;
    breakdown.push({
      label: `Beyond 5 years × full month (${beyondFive.toFixed(2)} yrs)`,
      amount: round2(second),
    });
    gratuity += second;
  }

  const totalFull = gratuity;

  if (input.endedByResignation) {
    let factor = 1;
    let factorLabel = "100% (10+ yrs)";
    if (years < 2) {
      factor = 0;
      factorLabel = "0% (<2 yrs service on resignation)";
    } else if (years < 5) {
      factor = 1 / 3;
      factorLabel = "1/3 (2-5 yrs service on resignation)";
    } else if (years < 10) {
      factor = 2 / 3;
      factorLabel = "2/3 (5-10 yrs service on resignation)";
    }
    const reduced = totalFull * factor;
    breakdown.push({
      label: `Resignation reduction: ${factorLabel}`,
      amount: round2(reduced - totalFull),
      note: `Reduces from ${round2(totalFull)} to ${round2(reduced)} SAR.`,
    });
    gratuity = reduced;
  }

  const caveats: string[] = [
    "'Wage' under KSA Labor Law includes basic + cash housing allowance + regular commissions. Variable bonuses excluded.",
    "Resignation factor applies if employee terminates; not if employer terminates or fixed-term expires.",
    "Unused annual leave (21 days for <5yr service, 30 days for 5+) payable at full wage.",
    "Domestic workers governed by separate regulations (not this calculator).",
    "Foreign employees: confirm sponsorship (Iqama) closeout and final-exit visa procedure.",
  ];

  return {
    jurisdiction: "KSA",
    serviceYears: round2(years),
    basicSalaryMonthly: monthlyWage,
    gratuity: round2(gratuity),
    currency: "SAR",
    breakdown,
    caveats,
    citations: ["KSA Labor Law Art. 84", "KSA Labor Law Art. 85", "KSA Labor Law Art. 87"],
  };
}

// ============== BAHRAIN ==============
// Bahrain Labour Law for Private Sector (Law 36/2012) Art. 116:
//  - First 3 years: half month per year
//  - After 3 years: full month per year
function computeBH(input: EosInput, years: number): EosOutput {
  const monthlyWage = input.basicSalaryMonthly;
  const breakdown: { label: string; amount: number }[] = [];
  let gratuity = 0;

  const firstThree = Math.min(years, 3);
  const beyondThree = Math.max(years - 3, 0);

  const first = firstThree * 0.5 * monthlyWage;
  breakdown.push({ label: `First 3 years × half month (${firstThree.toFixed(2)} yrs)`, amount: round2(first) });
  gratuity += first;

  if (beyondThree > 0) {
    const second = beyondThree * monthlyWage;
    breakdown.push({ label: `Beyond 3 years × full month (${beyondThree.toFixed(2)} yrs)`, amount: round2(second) });
    gratuity += second;
  }

  return {
    jurisdiction: "BH",
    serviceYears: round2(years),
    basicSalaryMonthly: monthlyWage,
    gratuity: round2(gratuity),
    currency: "BHD",
    breakdown,
    caveats: [
      "Bahrainis: SIO (Social Insurance Organization) coverage replaces leaving indemnity — confirm enrollment.",
      "Non-Bahrainis: above EOSB formula applies for service from 1 May 2017 onwards (Law 17/2017).",
      "Pre-2017 service may follow earlier rules — calculate proportionally.",
    ],
    citations: ["Bahrain Labour Law (36/2012) Art. 116", "Bahrain Law 17/2017"],
  };
}

// ============== QATAR ==============
// Qatar Law 14/2004 Art. 54 — minimum 3 weeks per year, applied for the
// whole period.
// Recent reforms (Law 18/2020) — formula remains, but no kafala restrictions.
function computeQA(input: EosInput, years: number): EosOutput {
  const monthlyBasic = input.basicSalaryMonthly;
  const dailyBasic = monthlyBasic / 30;
  let gratuity = 0;
  const breakdown: { label: string; amount: number }[] = [];

  if (years < 1) {
    return {
      jurisdiction: "QA",
      serviceYears: round2(years),
      basicSalaryMonthly: monthlyBasic,
      gratuity: 0,
      currency: "QAR",
      breakdown: [{ label: "Service less than 1 year — no EOSB owed.", amount: 0 }],
      caveats: ["Minimum 1 year required for EOSB."],
      citations: ["Qatar Labour Law 14/2004 Art. 54"],
    };
  }

  // Minimum: 3 weeks per year
  // Parties can agree more in the contract.
  const eos = years * 21 * dailyBasic;
  breakdown.push({ label: `${years.toFixed(2)} yrs × 3 weeks (21 days) basic`, amount: round2(eos) });
  gratuity = eos;

  return {
    jurisdiction: "QA",
    serviceYears: round2(years),
    basicSalaryMonthly: monthlyBasic,
    gratuity: round2(gratuity),
    currency: "QAR",
    breakdown,
    caveats: [
      "Statutory minimum 3 weeks per year — contract may grant more.",
      "Basic salary only; allowances excluded unless contract says otherwise.",
      "Add accrued unused leave + end-of-contract air ticket if applicable.",
    ],
    citations: ["Qatar Labour Law (14/2004) Art. 54"],
  };
}

// ============== OMAN ==============
// Sultanate Labour Law (RD 35/2003 as amended; updated Law 53/2023):
//  - First 3 years: 15 days basic per year
//  - After 3 years: 1 month basic per year
function computeOM(input: EosInput, years: number): EosOutput {
  const monthlyBasic = input.basicSalaryMonthly;
  const dailyBasic = monthlyBasic / 30;
  let gratuity = 0;
  const breakdown: { label: string; amount: number }[] = [];

  if (years < 1) {
    return {
      jurisdiction: "OM",
      serviceYears: round2(years),
      basicSalaryMonthly: monthlyBasic,
      gratuity: 0,
      currency: "OMR",
      breakdown: [{ label: "Service less than 1 year — no EOSB owed.", amount: 0 }],
      caveats: ["Minimum 1 year required."],
      citations: ["Oman Labour Law"],
    };
  }

  const firstThree = Math.min(years, 3);
  const beyondThree = Math.max(years - 3, 0);

  const first = firstThree * 15 * dailyBasic;
  breakdown.push({ label: `First 3 years × 15 days basic`, amount: round2(first) });
  gratuity += first;

  if (beyondThree > 0) {
    const second = beyondThree * 30 * dailyBasic;
    breakdown.push({ label: `Beyond 3 years × 1 month basic`, amount: round2(second) });
    gratuity += second;
  }

  return {
    jurisdiction: "OM",
    serviceYears: round2(years),
    basicSalaryMonthly: monthlyBasic,
    gratuity: round2(gratuity),
    currency: "OMR",
    breakdown,
    caveats: [
      "Omanis: Public Authority for Social Insurance (PASI) covers separately.",
      "Non-Omanis: above formula applies.",
      "Oman Vision 2040: rules under review — verify against latest amendments.",
    ],
    citations: ["Oman Labour Law (RD 35/2003 as amended; Law 53/2023)"],
  };
}

// ============== KUWAIT ==============
// Kuwait Labour Law 6/2010 Art. 51:
//  - Monthly paid: 15 days for each of first 5 years; 1 month per year after
//  - Daily/hourly/piece-rate paid: 10 days per year for first 5; 15 days after
//
// Cap: 1.5 years of remuneration.
function computeKW(input: EosInput, years: number): EosOutput {
  const monthlyWage = input.basicSalaryMonthly;
  const dailyWage = monthlyWage / 30;
  let gratuity = 0;
  const breakdown: { label: string; amount: number; note?: string }[] = [];

  const firstFive = Math.min(years, 5);
  const beyondFive = Math.max(years - 5, 0);

  const first = firstFive * 15 * dailyWage;
  breakdown.push({ label: `First 5 years × 15 days remuneration`, amount: round2(first) });
  gratuity += first;

  if (beyondFive > 0) {
    const second = beyondFive * 30 * dailyWage;
    breakdown.push({ label: `Beyond 5 years × 1 month remuneration`, amount: round2(second) });
    gratuity += second;
  }

  const cap = monthlyWage * 18; // 1.5 years
  if (gratuity > cap) {
    breakdown.push({
      label: "Statutory cap: 1.5 years of remuneration",
      amount: round2(cap),
      note: `Uncapped calculation was ${round2(gratuity)} KWD.`,
    });
    gratuity = cap;
  }

  return {
    jurisdiction: "KW",
    serviceYears: round2(years),
    basicSalaryMonthly: monthlyWage,
    gratuity: round2(gratuity),
    currency: "KWD",
    breakdown,
    caveats: [
      "'Remuneration' under Kuwait Labour Law includes regular components beyond basic — check definition.",
      "Cap: 1.5 years of remuneration.",
      "Kuwaiti nationals: Social Security may apply separately.",
    ],
    citations: ["Kuwait Labour Law for the Private Sector (6/2010) Art. 51"],
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
