"use client";

import { useState } from "react";
import { evaluate, project, formatPct } from "@/lib/attendance-engine";
import { useI18n } from "@/lib/i18n/client";
import { ProductIcon } from "@/components/shared/Brand";

/** Explicit demo records. Every visible value comes from the product's real attendance engine. */
export function AttendancePreview() {
  const { t } = useI18n();
  const [skips, setSkips] = useState(0);
  const baseline = { attended: 27, total: 30 };
  const projection = project(baseline,75,skips);
  const result = evaluate({ attended: projection.attended, total: projection.total },75);

  return (
    <div className="design-engine-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="design-eyebrow">{t("design.demoSubject")}</p>
        <ProductIcon name="attendance" />
      </div>
      <div className="design-demo-meter">
        <div>
          <p className="design-eyebrow mb-3">{t("attendance.projected")}</p>
          <output className="design-demo-meter-value" aria-live="polite" htmlFor="landing-skips">
            {formatPct(result.pct,0)}
          </output>
        </div>
        <div>
          <div className="design-meter-track"><span style={{ width: `${result.pct ?? 0}%` }} /></div>
          <p className="design-meter-note">{result.attended}/{result.total} {t("common.classes")}<br />{t("attendance.threshold",{ pct: 75 })}</p>
        </div>
      </div>
      <div className="design-demo-stats">
        <div><p className="design-eyebrow">{t("common.attended")}</p><strong>{result.attended}</strong></div>
        <div><p className="design-eyebrow">{t("common.total")}</p><strong>{result.total}</strong></div>
        <div><p className="design-eyebrow">{t("design.safeSkips")}</p><strong>{result.safeSkips}</strong></div>
      </div>
      <label htmlFor="landing-skips" className="mt-6 flex items-center justify-between gap-4 text-[11px] text-slate-400">
        <span className="uppercase tracking-[.07em]">{t("attendance.skipNext")}</span>
        <span className="text-white">{skips}</span>
      </label>
      <input
        id="landing-skips"
        type="range"
        min="0"
        max="12"
        step="1"
        value={skips}
        onChange={(event) => setSkips(Number(event.target.value))}
        className="mt-1 h-11 w-full cursor-pointer accent-white"
        aria-valuetext={t("attendance.resultAfterSkip",{ skips, attends: 0 })}
      />
      <p className={`mt-2 flex items-center gap-2 text-[11px] ${result.risk === "danger" ? "text-rose-300" : "text-slate-300"}`}>
        <ProductIcon name={result.risk === "danger" ? "shield" : "check"} className="!h-4 !w-4" />
        {result.risk === "danger" ? t("attendance.fallsBelow") : t("attendance.stillMeets")}
      </p>
    </div>
  );
}
