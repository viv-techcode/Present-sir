"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { formatPct, project, type SubjectEvaluation } from "@/lib/attendance-engine";
import { ProgressBar } from "@/components/shared/ui";

export interface SimSubject {
  id: string;
  name: string;
  evaluation: SubjectEvaluation;
}

export function WhatIfSimulator({ subjects }: { subjects: SimSubject[] }) {
  const { t } = useI18n();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [skips, setSkips] = useState(0);
  const [attends, setAttends] = useState(0);

  const subject = subjects.find((s) => s.id === subjectId) ?? subjects[0];
  const result = useMemo(() => {
    if (!subject) return null;
    return project(
      { attended: subject.evaluation.attended, total: subject.evaluation.total },
      subject.evaluation.minPct,
      skips,
      attends,
    );
  }, [subject, skips, attends]);

  if (!subject || !result) {
    return <p className="text-[13.5px] text-slate-400">{t("attendance.noSubjects")}</p>;
  }

  const currentPct = subject.evaluation.total > 0 ? subject.evaluation.pct : null;

  return (
    <div className="grid gap-4">
      <p className="text-[13.5px] text-slate-400">{t("attendance.whatIfIntro")}</p>

      <div className="scroll-x flex gap-2 pb-1">
        {subjects.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSubjectId(item.id);
              setSkips(0);
              setAttends(0);
            }}
            className={`chip ${item.id === subject.id ? "chip-active" : ""}`}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block rounded-2xl bg-white/[0.03] p-3">
          <span className="label">{t("attendance.skipNext")}</span>
          <input
            type="range"
            min={0}
            max={20}
            value={skips}
            onChange={(event) => setSkips(Number(event.target.value))}
            className="mt-1 w-full accent-blue-500"
          />
          <span className="mt-1 block text-lg font-bold text-white">{skips}</span>
        </label>
        <label className="block rounded-2xl bg-white/[0.03] p-3">
          <span className="label">{t("attendance.attendNext")}</span>
          <input
            type="range"
            min={0}
            max={20}
            value={attends}
            onChange={(event) => setAttends(Number(event.target.value))}
            className="mt-1 w-full accent-emerald-500"
          />
          <span className="mt-1 block text-lg font-bold text-white">{attends}</span>
        </label>
      </div>

      <div className="rounded-2xl bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label mb-1">{t("attendance.projected")}</p>
            <p
              className={`text-4xl font-black leading-none ${
                result.pct === null
                  ? "text-slate-400"
                  : result.meetsMinimum
                    ? "text-emerald-300"
                    : "text-rose-300"
              }`}
            >
              {formatPct(result.pct)}
            </p>
            <p className="mt-1 text-[13px] text-slate-400">
              {t("attendance.resultAfterSkip", { skips, attends })}
            </p>
          </div>
          <div className="text-right text-[13px] text-slate-400">
            <p>
              {t("common.attended")}: <span className="font-bold text-white">{result.attended}</span> /{" "}
              <span className="font-bold text-white">{result.total}</span>
            </p>
            <p>
              {t("common.minimum")}: <span className="font-bold text-white">{subject.evaluation.minPct}%</span>
            </p>
            <p>
              {t("attendance.threshold", { pct: subject.evaluation.minPct })}:{" "}
              {currentPct === null ? "—" : formatPct(currentPct)}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar pct={result.pct} minPct={subject.evaluation.minPct} />
        </div>
        <p
          className={`mt-2 text-[13px] font-semibold ${
            result.meetsMinimum ? "text-emerald-300" : "text-rose-300"
          }`}
        >
          {result.meetsMinimum ? t("attendance.stillMeets") : t("attendance.fallsBelow")}
        </p>
      </div>
    </div>
  );
}
