import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getUserScope } from "@/lib/queries";
import { BigStat, EmptyState, LinkButton, PageHeader, ProgressBar, RiskBadge, SectionCard, SubjectDot } from "@/components/shared/ui";
import { formatPct } from "@/lib/attendance-engine";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const user = await requireUser();
  const { t } = await getI18n();
  const scope = await getUserScope(user.id);
  const totalBudget = scope.subjects.reduce((sum, item) => sum + item.evaluation.safeSkips, 0);
  const sorted = [...scope.subjects].sort((a, b) => a.evaluation.safeSkips - b.evaluation.safeSkips);

  return (
    <div className="grid gap-4">
      <PageHeader
        title={t("attendance.bunkBudget")}
        subtitle={t("attendance.bunkBudgetIntro")}
        action={<LinkButton href="/attendance/leave">{t("attendance.leavePlanner")}</LinkButton>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <BigStat value={String(totalBudget)} label={t("attendance.bunkBudget")} tone="text-blue-300" />
        <BigStat value={formatPct(scope.overall.pct)} label={t("attendance.overallPct")} />
        <BigStat
          value={String(scope.subjects.filter((s) => s.evaluation.risk === "danger").length)}
          label={t("risk.danger")}
          tone="text-rose-300"
        />
      </div>

      <SectionCard title={t("common.subjects")}>
        {sorted.length === 0 ? (
          <EmptyState message={t("attendance.noSubjects")} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {sorted.map((item) => (
              <li key={item.subject.id} className="rounded-2xl bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <SubjectDot color={item.subject.color} />
                    <Link
                      href={`/attendance/${item.subject.id}`}
                      className="truncate text-[14.5px] font-bold text-white"
                    >
                      {item.subject.name}
                    </Link>
                  </span>
                  <RiskBadge risk={item.evaluation.risk} t={t} />
                </div>
                <div className="mt-2">
                  <ProgressBar pct={item.evaluation.pct} minPct={item.evaluation.minPct} />
                </div>
                <p className="mt-2 text-[13px]">
                  {item.evaluation.safeSkips > 0 ? (
                    <span className="text-emerald-300">
                      {t("attendance.budgetLeft", { count: item.evaluation.safeSkips })}
                    </span>
                  ) : (
                    <span className="text-rose-300">{t("attendance.budgetEmpty")}</span>
                  )}
                  {item.evaluation.recoveryNeeded > 0 ? (
                    <span className="ml-2 text-amber-300">
                      {t("attendance.recommendedAction")}: {t("attendance.attendNextN", { count: item.evaluation.recoveryNeeded })}
                    </span>
                  ) : null}
                  {item.evaluation.recoveryImpossible ? (
                    <span className="ml-2 text-rose-300">{t("attendance.cannotRecover")}</span>
                  ) : null}
                </p>
                <p className="mt-1 text-[12.5px] text-slate-400">
                  {item.evaluation.attended}/{item.evaluation.total} · {formatPct(item.evaluation.pct)} ·{" "}
                  {t("attendance.threshold", { pct: item.evaluation.minPct })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
