/**
 * Present Sir — Attendance Engine
 *
 * Deterministic, dependency-free, pure math. No AI, no heuristics.
 * Everything the UI shows about attendance comes from these functions.
 */

export type AttendanceStatus =
  | "present"
  | "absent"
  | "cancelled"
  | "holiday"
  | "medical"
  | "extra";

export type RiskLevel = "none" | "danger" | "caution" | "safe";

export interface StatusPolicy {
  /** whether medical / approved leave counts as attended (classroom configurable) */
  medicalCountsAttended: boolean;
}

export const DEFAULT_STATUS_POLICY: StatusPolicy = { medicalCountsAttended: true };

export interface StatusEffect {
  countsInTotal: boolean;
  countsAsAttended: boolean;
}

/**
 * The single source of truth for whether a status changes the denominator.
 * Cancelled and holiday classes NEVER count as held classes.
 */
export function statusEffect(
  status: AttendanceStatus,
  policy: StatusPolicy = DEFAULT_STATUS_POLICY,
): StatusEffect {
  switch (status) {
    case "present":
      return { countsInTotal: true, countsAsAttended: true };
    case "extra":
      return { countsInTotal: true, countsAsAttended: true };
    case "absent":
      return { countsInTotal: true, countsAsAttended: false };
    case "medical":
      return policy.medicalCountsAttended
        ? { countsInTotal: true, countsAsAttended: true }
        : { countsInTotal: false, countsAsAttended: false };
    case "cancelled":
      return { countsInTotal: false, countsAsAttended: false };
    case "holiday":
      return { countsInTotal: false, countsAsAttended: false };
    default:
      return { countsInTotal: false, countsAsAttended: false };
  }
}

export interface AttendanceRecordLike {
  status: AttendanceStatus;
  subjectId?: string;
}

export interface AttendanceCounts {
  attended: number;
  total: number;
}

export function countsFromRecords(
  records: AttendanceRecordLike[],
  policy: StatusPolicy = DEFAULT_STATUS_POLICY,
): AttendanceCounts {
  let attended = 0;
  let total = 0;
  for (const record of records) {
    const effect = statusEffect(record.status, policy);
    if (effect.countsInTotal) total += 1;
    if (effect.countsAsAttended) attended += 1;
  }
  return { attended, total };
}

export interface SubjectEvaluation {
  attended: number;
  total: number;
  /** null when no classes were held yet — "No data" */
  pct: number | null;
  minPct: number;
  risk: RiskLevel;
  /** how many future classes can be skipped while staying >= minimum */
  safeSkips: number;
  /** how many future classes must be attended consecutively to reach the minimum */
  recoveryNeeded: number;
  /** true when the minimum is 100% and recovery is mathematically impossible */
  recoveryImpossible: boolean;
  /** classes to attend to reach the "safe" band (minimum + 5pp) */
  classesToSafeBand: number;
}

export function evaluate(counts: AttendanceCounts, minPct: number): SubjectEvaluation {
  const attended = Math.max(0, Math.round(counts.attended));
  const total = Math.max(0, Math.round(counts.total));
  const minimum = clampPercent(minPct);
  const empty: SubjectEvaluation = {
    attended,
    total,
    pct: null,
    minPct: minimum,
    risk: "none",
    safeSkips: 0,
    recoveryNeeded: 0,
    recoveryImpossible: false,
    classesToSafeBand: 0,
  };
  if (total <= 0) return empty;

  const pct = (attended / total) * 100;
  const m = minimum / 100;
  const safeBand = minimum + 5;

  let safeSkips: number;
  if (m >= 1) {
    safeSkips = Math.max(0, attended - total);
  } else {
    safeSkips = Math.max(0, Math.floor((attended - m * total) / m));
  }

  let recoveryNeeded = 0;
  let recoveryImpossible = false;
  if (pct < minimum - 1e-9) {
    if (m >= 1) {
      recoveryImpossible = true;
      recoveryNeeded = 0;
    } else {
      recoveryNeeded = Math.ceil((m * total - attended) / (1 - m));
    }
  }

  const safeBandTarget = Math.min(99, safeBand);
  const ms = safeBandTarget / 100;
  let classesToSafeBand = 0;
  if (pct < safeBandTarget - 1e-9) {
    classesToSafeBand = Math.ceil((ms * total - attended) / (1 - ms));
  }

  const risk: RiskLevel = pct < minimum ? "danger" : pct <= safeBand + 1e-9 ? "caution" : "safe";

  return {
    attended,
    total,
    pct,
    minPct: minimum,
    risk,
    safeSkips,
    recoveryNeeded,
    recoveryImpossible,
    classesToSafeBand,
  };
}

export function evaluateRecords(
  records: AttendanceRecordLike[],
  minPct: number,
  policy: StatusPolicy = DEFAULT_STATUS_POLICY,
): SubjectEvaluation {
  return evaluate(countsFromRecords(records, policy), minPct);
}

export function overallEvaluation(
  evaluations: SubjectEvaluation[],
  minPct: number,
): SubjectEvaluation {
  const counts = evaluations.reduce(
    (acc, item) => ({ attended: acc.attended + item.attended, total: acc.total + item.total }),
    { attended: 0, total: 0 },
  );
  return evaluate(counts, minPct);
}

/* ------------------------------------------------------------------ */
/* Simulation                                                          */
/* ------------------------------------------------------------------ */

export interface Projection {
  attended: number;
  total: number;
  pct: number | null;
  meetsMinimum: boolean;
  risk: RiskLevel;
}

/** Live what-if: skip `skips` future classes, attend `attends` future classes. */
export function project(
  counts: AttendanceCounts,
  minPct: number,
  skips = 0,
  attends = 0,
): Projection {
  const attended = counts.attended + attends;
  const total = counts.total + skips + attends;
  if (total <= 0) {
    return { attended, total: 0, pct: null, meetsMinimum: true, risk: "none" };
  }
  const pct = (attended / total) * 100;
  const risk: RiskLevel = pct < minPct ? "danger" : pct <= minPct + 5 + 1e-9 ? "caution" : "safe";
  return { attended, total, pct, meetsMinimum: pct >= minPct - 1e-9, risk };
}

/** How many consecutive classes must be attended to reach a target percentage. */
export function classesToReach(
  counts: AttendanceCounts,
  targetPct: number,
): number | null {
  const target = clampPercent(targetPct) / 100;
  if (target >= 1) return counts.attended >= counts.total ? 0 : null;
  if (counts.total <= 0) return 0;
  const needed = Math.ceil((target * counts.total - counts.attended) / (1 - target));
  return Math.max(0, needed);
}

export type LeaveVerdict = "safe" | "risky" | "dont_skip";

export interface LeaveClassInput {
  id: string;
  subjectId: string;
  date: string;
  startTime: string;
}

export interface LeaveClassPlan extends LeaveClassInput {
  verdict: LeaveVerdict;
  projectedPct: number | null;
  /** attendance in this subject after skipping everything up to and including this class */
  attended: number;
  total: number;
}

/**
 * Cumulative leave planning: each class in the range is simulated as absent,
 * carrying the running totals forward so the Nth day reflects the whole trip.
 */
export function planLeave(
  baseline: Record<string, AttendanceCounts>,
  classes: LeaveClassInput[],
  minPct: number,
): LeaveClassPlan[] {
  const running: Record<string, AttendanceCounts> = Object.fromEntries(
    Object.entries(baseline).map(([key, value]) => [key, { ...value }]),
  );
  const ordered = [...classes].sort(compareClassOrder);

  return ordered.map((item) => {
    const current = running[item.subjectId] ?? { attended: 0, total: 0 };
    const nextTotal = current.total + 1;
    const pct = nextTotal > 0 ? (current.attended / nextTotal) * 100 : null;
    let verdict: LeaveVerdict = "dont_skip";
    if (pct !== null) {
      if (pct >= minPct + 5) verdict = "safe";
      else if (pct >= minPct) verdict = "risky";
    }
    const plan: LeaveClassPlan = {
      ...item,
      verdict,
      projectedPct: pct,
      attended: current.attended,
      total: nextTotal,
    };
    running[item.subjectId] = { attended: current.attended, total: nextTotal };
    return plan;
  });
}

export function compareClassOrder(a: LeaveClassInput, b: LeaveClassInput): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0;
}

export interface ForecastInput {
  label: string;
  plannedPresent: number;
  plannedAbsent: number;
}

export interface ForecastScenario {
  label: string;
  attended: number;
  total: number;
  pct: number | null;
  meetsMinimum: boolean;
  risk: RiskLevel;
}

export function forecast(
  counts: AttendanceCounts,
  scenarios: ForecastInput[],
  minPct: number,
): ForecastScenario[] {
  return scenarios.map((scenario) => {
    const projection = project(
      {
        attended: counts.attended + scenario.plannedPresent,
        total: counts.total + scenario.plannedPresent + scenario.plannedAbsent,
      },
      minPct,
    );
    return {
      label: scenario.label,
      attended: projection.attended,
      total: projection.total,
      pct: projection.pct,
      meetsMinimum: projection.meetsMinimum,
      risk: projection.risk,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function formatPct(pct: number | null, digits = 1): string {
  if (pct === null || !Number.isFinite(pct)) return "—";
  return `${pct.toFixed(digits)}%`;
}

export const RISK_STYLES: Record<RiskLevel, string> = {
  none: "bg-white/5 text-slate-300 ring-white/10",
  danger: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  caution: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  safe: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
};
