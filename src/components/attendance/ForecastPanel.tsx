"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { forecast, formatPct, type AttendanceCounts } from "@/lib/attendance-engine";

export function ForecastPanel({
  counts,
  minPct,
  classesPerWeek,
}: {
  counts: AttendanceCounts;
  minPct: number;
  classesPerWeek: number;
}) {
  const { t } = useI18n();
  const [weeks, setWeeks] = useState(8);
  const [attendanceRate, setAttendanceRate] = useState(90);

  const scenarios = useMemo(() => {
    const totalPlanned = Math.max(0, classesPerWeek * weeks);
    const present = Math.round((totalPlanned * attendanceRate) / 100);
    return forecast(
      counts,
      [
        { label: `${attendanceRate}%`, plannedPresent: present, plannedAbsent: totalPlanned - present },
        { label: "100%", plannedPresent: totalPlanned, plannedAbsent: 0 },
        { label: "75%", plannedPresent: Math.round(totalPlanned * 0.75), plannedAbsent: Math.round(totalPlanned * 0.25) },
        { label: "50%", plannedPresent: Math.round(totalPlanned * 0.5), plannedAbsent: Math.round(totalPlanned * 0.5) },
      ],
      minPct,
    );
  }, [counts, minPct, weeks, attendanceRate, classesPerWeek]);

  return (
    <div className="grid gap-4">
      <p className="text-[13.5px] text-slate-400">{t("attendance.forecastIntro")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block rounded-2xl bg-white/[0.03] p-3">
          <span className="label">{t("planner.week")}: {weeks}</span>
          <input
            type="range"
            min={1}
            max={16}
            value={weeks}
            onChange={(event) => setWeeks(Number(event.target.value))}
            className="mt-1 w-full accent-blue-500"
          />
        </label>
        <label className="block rounded-2xl bg-white/[0.03] p-3">
          <span className="label">{t("status.present")}: {attendanceRate}%</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={attendanceRate}
            onChange={(event) => setAttendanceRate(Number(event.target.value))}
            className="mt-1 w-full accent-emerald-500"
          />
        </label>
      </div>

      <ul className="grid gap-2">
        {scenarios.map((scenario) => (
          <li
            key={scenario.label}
            className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5"
          >
            <div>
              <p className="text-[14px] font-semibold text-white">
                {t("attendance.scenario")}: {scenario.label}
              </p>
              <p className="text-[12.5px] text-slate-400">
                {scenario.attended}/{scenario.total} {t("common.classes")}
              </p>
            </div>
            <span
              className={`text-lg font-bold ${
                scenario.pct === null
                  ? "text-slate-400"
                  : scenario.meetsMinimum
                    ? "text-emerald-300"
                    : "text-rose-300"
              }`}
            >
              {formatPct(scenario.pct)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
