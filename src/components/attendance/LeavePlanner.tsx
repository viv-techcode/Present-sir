"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { planLeave, type AttendanceCounts, type LeaveVerdict } from "@/lib/attendance-engine";
import { formatDate } from "@/lib/dates";

export interface LeaveClass {
  id: string;
  subjectId: string;
  subjectName: string;
  date: string;
  startTime: string;
}

export function LeavePlanner({
  classes,
  baseline,
  minPct,
  defaultFrom,
  defaultTo,
}: {
  classes: LeaveClass[];
  baseline: Record<string, AttendanceCounts>;
  minPct: number;
  defaultFrom: string;
  defaultTo: string;
}) {
  const { t, locale } = useI18n();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const plan = useMemo(() => {
    const inRange = classes.filter((item) => item.date >= from && item.date <= to);
    return planLeave(
      baseline,
      inRange.map((item) => ({
        id: item.id,
        subjectId: item.subjectId,
        date: item.date,
        startTime: item.startTime,
      })),
      minPct,
    ).map((row, index) => ({ ...row, subjectName: inRange[index]?.subjectName ?? "" }));
  }, [classes, baseline, from, to, minPct]);

  const verdictTone: Record<LeaveVerdict, string> = {
    safe: "text-emerald-300",
    risky: "text-amber-300",
    dont_skip: "text-rose-300",
  };
  const verdictLabel: Record<LeaveVerdict, string> = {
    safe: t("attendance.verdictSafe"),
    risky: t("attendance.verdictRisky"),
    dont_skip: t("attendance.verdictDontSkip"),
  };

  return (
    <div className="grid gap-4">
      <p className="text-[13.5px] text-slate-400">{t("attendance.leaveIntro")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="leave-from">{t("attendance.fromDate")}</label>
          <input
            id="leave-from"
            type="date"
            className="input"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="leave-to">{t("attendance.toDate")}</label>
          <input
            id="leave-to"
            type="date"
            className="input"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>

      {plan.length === 0 ? (
        <p className="text-[13.5px] text-slate-400">{t("home.noClassesToday")}</p>
      ) : (
        <ul className="grid gap-2">
          {plan.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-white">{row.subjectName}</p>
                <p className="text-[12.5px] text-slate-400">
                  {formatDate(row.date, locale)} · {row.startTime} · {row.attended}/{row.total} →{" "}
                  {row.projectedPct === null ? "—" : `${row.projectedPct.toFixed(1)}%`}
                </p>
              </div>
              <span className={`badge bg-white/5 ${verdictTone[row.verdict]}`}>
                {verdictLabel[row.verdict]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
