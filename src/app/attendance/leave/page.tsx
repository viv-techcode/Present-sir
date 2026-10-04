import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getClassesForDate, getUserScope } from "@/lib/queries";
import { LeavePlanner } from "@/components/attendance/LeavePlanner";
import { EmptyState, LinkButton, PageHeader, SectionCard } from "@/components/shared/ui";
import { addDays, todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function LeavePage() {
  const user = await requireUser();
  const { t } = await getI18n();
  const scope = await getUserScope(user.id);
  const today = todayISO();
  const days = Array.from({ length: 28 }, (_, index) => addDays(today, index));

  const dayResults = await Promise.all(
    days.map(async (date) => ({ date, classes: await getClassesForDate(user.id, date, scope.classroomIds) })),
  );

  const classes = dayResults.flatMap(({ date, classes: dayClasses }) =>
    dayClasses
      .filter((item) => item.record?.status !== "cancelled")
      .map((item) => ({
        id: `${date}-${item.slot.id}-${item.slot.startTime}`,
        subjectId: item.subject.id,
        subjectName: item.subject.name,
        date,
        startTime: item.slot.startTime,
      })),
  );

  const baseline: Record<string, { attended: number; total: number }> = {};
  for (const item of scope.subjects) {
    baseline[item.subject.id] = {
      attended: item.evaluation.attended,
      total: item.evaluation.total,
    };
  }

  const minPct = scope.classrooms[0]?.classroom.minAttendance ?? user.minAttendance;

  return (
    <div className="grid gap-4">
      <PageHeader
        title={t("attendance.leavePlanner")}
        subtitle={t("attendance.leaveIntro")}
        action={<LinkButton href="/attendance">{t("nav.attendance")}</LinkButton>}
      />
      <SectionCard>
        {classes.length === 0 ? (
          <EmptyState
            message={t("home.noClassesToday")}
            hint={t("home.joinClassroomCta")}
            action={<LinkButton href="/classrooms/join" variant="primary">{t("classroom.joinClassroom")}</LinkButton>}
          />
        ) : (
          <LeavePlanner
            classes={classes}
            baseline={baseline}
            minPct={minPct}
            defaultFrom={today}
            defaultTo={addDays(today, 6)}
          />
        )}
      </SectionCard>
    </div>
  );
}
