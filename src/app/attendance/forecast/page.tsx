import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getClassesForDate, getUserScope } from "@/lib/queries";
import { ForecastPanel } from "@/components/attendance/ForecastPanel";
import { LinkButton, PageHeader, SectionCard } from "@/components/shared/ui";
import { addDays, todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ForecastPage() {
  const user = await requireUser();
  const { t } = await getI18n();
  const scope = await getUserScope(user.id);
  const today = todayISO();

  const week = Array.from({ length: 7 }, (_, index) => addDays(today, index));
  const classesThisWeek = (
    await Promise.all(week.map((date) => getClassesForDate(user.id, date, scope.classroomIds)))
  ).flat();

  return (
    <div className="grid gap-4">
      <PageHeader
        title={t("attendance.forecast")}
        subtitle={t("attendance.forecastIntro")}
        action={<LinkButton href="/attendance">{t("nav.attendance")}</LinkButton>}
      />
      <SectionCard>
        <ForecastPanel
          counts={{ attended: scope.overall.attended, total: scope.overall.total }}
          minPct={scope.classrooms[0]?.classroom.minAttendance ?? user.minAttendance}
          classesPerWeek={classesThisWeek.length}
        />
      </SectionCard>
    </div>
  );
}
