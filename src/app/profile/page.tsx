import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getUserScope } from "@/lib/queries";
import { BigStat, LinkButton, PageHeader, Pill, ProgressBar, RiskBadge, SectionCard } from "@/components/shared/ui";
import { formatPct } from "@/lib/attendance-engine";
import { signOutAction } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const { t } = await getI18n();
  const scope = await getUserScope(user.id);

  return (
    <div className="grid gap-4">
      <PageHeader
        title={t("profile.title")}
        subtitle={`${user.name}${user.email ? ` · ${user.email}` : ` · ${t("auth.guest")}`}`}
        action={
          <>
            <LinkButton href="/settings" variant="primary">{t("nav.settings")}</LinkButton>
            <form action={signOutAction}>
              <button type="submit" className="btn btn-ghost">{t("action.signOut")}</button>
            </form>
          </>
        }
      />

      <SectionCard title={t("profile.stats")}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <BigStat value={String(scope.subjects.length)} label={t("profile.subjectsTracked")} />
          <BigStat value={String(scope.overall.total)} label={t("profile.classesHeld")} />
          <BigStat value={String(scope.overall.attended)} label={t("profile.classesAttended")} />
          <BigStat
            value={formatPct(scope.overall.pct)}
            label={t("attendance.overallPct")}
            tone={scope.overall.risk === "danger" ? "text-rose-300" : "text-emerald-300"}
          />
        </div>
        <div className="mt-3">
          <ProgressBar pct={scope.overall.pct} minPct={user.minAttendance} />
        </div>
      </SectionCard>

      <SectionCard title={t("profile.classrooms")}>
        {scope.classrooms.length === 0 ? (
          <p className="text-[13.5px] text-slate-400">{t("classroom.noClassrooms")}</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {scope.classrooms.map(({ classroom, role }) => (
              <li key={classroom.id} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                <Link href={`/classrooms/${classroom.id}`} className="text-[14px] font-semibold text-white">
                  {classroom.name}
                </Link>
                <p className="mt-0.5 text-[12.5px] text-slate-400">{classroom.college}</p>
                <Pill tone="violet">{role === "cr" ? "CR" : role}</Pill>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={t("common.subjects")}>
        {scope.subjects.length === 0 ? (
          <p className="text-[13.5px] text-slate-400">{t("attendance.noSubjects")}</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {scope.subjects.map((item) => (
              <li key={item.subject.id} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/attendance/${item.subject.id}`} className="truncate text-[14px] font-semibold text-white">
                    {item.subject.name}
                  </Link>
                  <span className="text-[13.5px] font-bold text-white">{formatPct(item.evaluation.pct)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <RiskBadge risk={item.evaluation.risk} t={t} />
                  <span className="text-[12px] text-slate-400">
                    {item.evaluation.attended}/{item.evaluation.total}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
