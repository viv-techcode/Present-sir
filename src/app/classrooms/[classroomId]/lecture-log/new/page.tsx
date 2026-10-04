import { redirect } from "next/navigation";
import { canCreateLectureLog, requireClassroom } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getClassroomResources, getClassroomSlots, getClassroomSubjects } from "@/lib/queries";
import { LinkButton, PageHeader, SectionCard } from "@/components/shared/ui";
import { LectureLogForm } from "@/components/lecture-log/LectureLogForm";
import { todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function NewLectureLogPage({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = await params;
  const { classroom, role } = await requireClassroom(classroomId);
  const { t } = await getI18n();
  const permission = canCreateLectureLog(role, classroom.lectureLogMode);
  if (!permission.allowed) redirect(`/classrooms/${classroomId}/lecture-log?error=forbidden`);

  const [subjects, slotRows, resourceRows] = await Promise.all([
    getClassroomSubjects(classroomId),
    getClassroomSlots(classroomId),
    getClassroomResources(classroomId),
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title={t("log.addLog")}
        subtitle={permission.requiresApproval ? t("log.pendingNote") : t("log.addLogIntro")}
        action={<LinkButton href={`/classrooms/${classroomId}/lecture-log`}>{t("action.back")}</LinkButton>}
      />
      <SectionCard>
        <LectureLogForm
          classroomId={classroomId}
          subjects={subjects.map((subject) => ({ id: subject.id, name: subject.name }))}
          slots={slotRows.map(({ slot }) => ({
            id: slot.id,
            subjectId: slot.subjectId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            room: slot.room,
          }))}
          resources={resourceRows.map(({ resource }) => ({
            id: resource.id,
            title: resource.title,
            type: resource.type,
            subjectId: resource.subjectId,
          }))}
          defaultDate={todayISO()}
        />
      </SectionCard>
    </div>
  );
}
