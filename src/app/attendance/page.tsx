import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getUserScope } from "@/lib/queries";
import { AddSubjectForm } from "@/components/attendance/AddSubjectForm";
import {
  BigStat,
  EmptyState,
  LinkButton,
  PageHeader,
  ProgressBar,
  RiskBadge,
  SectionCard,
  SubjectDot,
} from "@/components/shared/ui";
import { formatPct } from "@/lib/attendance-engine";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const user = await requireUser();
  const { t } = await getI18n();
  const scope = await getUserScope(user.id);
  const sorted = [...scope.subjects].sort(
    (a, b) => (a.evaluation.pct ?? 0) - (b.evaluation.pct ?? 0),
  );

  return (
    <div className="grid gap-4">
      <PageHeader
        title={t("attendance.title")}
        subtitle={t("attendance.subtitle")}
        action={
          <>
            <LinkButton href="/attendance/budget">{t("attendance.bunkBudget")}</LinkButton>
            <LinkButton href="/attendance/leave">{t("attendance.leavePlanner")}</LinkButton>
            <LinkButton href="/attendance/what-if" variant="primary">
              {t("attendance.whatIf")}
            </LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <BigStat
          value={formatPct(scope.overall.pct)}
          label={t("attendance.overallPct")}
          tone={
            scope.overall.risk === "danger"
              ? "text-rose-300"
              : scope.overall.risk === "caution"
                ? "text-amber-300"
                : "text-emerald-300"
          }
        />
        <BigStat value={String(scope.overall.attended)} label={t("common.attended")} />
        <BigStat value={String(scope.overall.total)} label={t("common.total")} />
        <BigStat
          value={String(scope.subjects.reduce((sum, item) => sum + item.evaluation.safeSkips, 0))}
          label={t("attendance.bunkBudget")}
          tone="text-blue-300"
        />
      </div>

      <SectionCard
        title={t("common.subjects")}
        action={<AddSubjectForm defaultMin={user.minAttendance} />}
      >
        {sorted.length === 0 ? (
          <EmptyState
            message={t("attendance.noSubjects")}
            hint={t("onboarding.startSoloHelp")}
            action={<AddSubjectForm defaultMin={user.minAttendance} />}
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {sorted.map((item) => (
              <li key={item.subject.id} className="rounded-2xl bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/attendance/${item.subject.id}`} className="min-w-0">
                    <span className="flex items-center gap-2">
                      <SubjectDot color={item.subject.color} />
                      <span className="truncate text-[15px] font-bold text-white">
                        {item.subject.name}
                      </span>
                    </span>
                    <p className="mt-0.5 text-[12.5px] text-slate-400">
                      {item.subject.code ?? ""} {item.subject.faculty ? `· ${item.subject.faculty}` : ""}
                      {item.classroomName ? ` · ${item.classroomName}` : ""}
                    </p>
                  </Link>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{formatPct(item.evaluation.pct)}</p>
                    <RiskBadge risk={item.evaluation.risk} t={t} />
                  </div>
                </div>
                <div className="mt-2">
                  <ProgressBar pct={item.evaluation.pct} minPct={item.evaluation.minPct} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-slate-400">
                  <span>
                    {item.evaluation.attended}/{item.evaluation.total} {t("common.classes")}
                  </span>
                  <span>{t("attendance.threshold", { pct: item.evaluation.minPct })}</span>
                  {item.evaluation.risk === "danger" ? (
                    <span className="text-rose-300">
                      {t("home.recovery", { count: item.evaluation.recoveryNeeded })}
                    </span>
                  ) : (
                    <span className="text-emerald-300">
                      {t("home.safeSkips", { count: item.evaluation.safeSkips })}
                    </span>
                  )}
                  {item.logCount > 0 ? (
                    <Link
                      href={`/attendance/${item.subject.id}`}
                      className="font-semibold text-blue-400"
                    >
                      {item.logCount} {t("log.title")}
                    </Link>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <LinkButton href={`/attendance/${item.subject.id}`} variant="primary">
                    {t("attendance.history")}
                  </LinkButton>
                  <LinkButton href="/attendance/what-if">{t("attendance.whatIf")}</LinkButton>
                  {item.classroomId ? (
                    <LinkButton href={`/classrooms/${item.classroomId}/lecture-log`}>
                      {t("attendance.lectureHistory")}
                    </LinkButton>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
