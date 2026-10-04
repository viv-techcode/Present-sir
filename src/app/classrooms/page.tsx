import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getUserScope } from "@/lib/queries";
import { EmptyState, LinkButton, PageHeader, SectionCard } from "@/components/shared/ui";
import { seedDemoForCurrentUserAction } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

export default async function ClassroomsPage() {
  const user = await requireUser();
  const { t } = await getI18n();
  const scope = await getUserScope(user.id);

  return (
    <div className="grid gap-4">
      <PageHeader
        title={t("classroom.myClassrooms")}
        subtitle={t("classroom.shareCode")}
        action={
          <>
            <LinkButton href="/classrooms/join">{t("classroom.joinClassroom")}</LinkButton>
            <LinkButton href="/classrooms/create" variant="primary">
              {t("classroom.createClassroom")}
            </LinkButton>
          </>
        }
      />

      <SectionCard>
        {scope.classrooms.length === 0 ? (
          <EmptyState
            message={t("classroom.noClassrooms")}
            hint={t("home.joinClassroomCta")}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <LinkButton href="/classrooms/join" variant="primary">
                  {t("classroom.joinClassroom")}
                </LinkButton>
                <form action={seedDemoForCurrentUserAction}>
                  <button type="submit" className="btn btn-ghost">
                    {t("action.loadDemo")}
                  </button>
                </form>
              </div>
            }
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {scope.classrooms.map(({ classroom, role }) => {
              const subjectCount = scope.subjects.filter(
                (item) => item.classroomId === classroom.id,
              ).length;
              return (
                <li key={classroom.id} className="rounded-2xl bg-white/[0.03] p-3">
                  <Link href={`/classrooms/${classroom.id}`} className="text-[15px] font-bold text-white">
                    {classroom.name}
                  </Link>
                  <p className="mt-0.5 text-[12.5px] text-slate-400">
                    {classroom.college} · {classroom.academicYear} · {subjectCount} {t("common.subjects")}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="badge bg-violet-500/15 text-violet-300">
                      {role === "cr" ? "CR" : role}
                    </span>
                    <span className="badge bg-emerald-500/15 text-emerald-300">
                      {classroom.joinCode}
                    </span>
                    <span className="badge bg-white/5 text-slate-300">
                      {t("attendance.threshold", { pct: classroom.minAttendance })}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <LinkButton href={`/classrooms/${classroom.id}`} variant="primary">
                      {t("classroom.feed")}
                    </LinkButton>
                    <LinkButton href={`/classrooms/${classroom.id}/timetable`}>
                      {t("classroom.timetable")}
                    </LinkButton>
                    <LinkButton href={`/classrooms/${classroom.id}/lecture-log`}>
                      {t("classroom.lectureLog")}
                    </LinkButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
