import Link from "next/link";
import { canManageClassroom, getCurrentUser, requireClassroom } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getAssignments, getClassroomSubjects } from "@/lib/queries";
import { EmptyState, LinkButton, PageHeader, SectionCard } from "@/components/shared/ui";
import { addAssignmentAction, toggleAssignmentDoneAction } from "@/lib/actions/classroom";
import { formatDate, formatTime, todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ classroomId: string }>;
  searchParams: Promise<{ subject?: string; status?: string }>;
}) {
  const { classroomId } = await params;
  const { role } = await requireClassroom(classroomId);
  const user = await getCurrentUser();
  const { t, locale } = await getI18n();
  const query = await searchParams;
  const manager = canManageClassroom(role) || role === "contributor";

  const [subjects, all] = await Promise.all([
    getClassroomSubjects(classroomId),
    getAssignments(user!.id, [classroomId]),
  ]);

  const today = todayISO();
  let rows = all;
  if (query.subject) rows = rows.filter((row) => row.assignment.subjectId === query.subject);
  if (query.status === "pending") rows = rows.filter((row) => !row.done);
  if (query.status === "done") rows = rows.filter((row) => row.done);

  function countdown(dueAt: string) {
    const diff = Math.round(
      (new Date(`${dueAt.slice(0, 10)}T00:00`).getTime() - new Date(`${today}T00:00`).getTime()) / 86_400_000,
    );
    if (diff < 0)
      return { label: t("assignment.overdue", { count: Math.abs(diff) }), tone: "text-rose-300" };
    if (diff === 0) return { label: t("assignment.dueToday"), tone: "text-amber-300" };
    if (diff === 1) return { label: t("assignment.dueTomorrow"), tone: "text-amber-300" };
    if (diff <= 7) return { label: t("assignment.dueIn", { count: diff }), tone: "text-amber-300" };
    return { label: t("assignment.dueIn", { count: diff }), tone: "text-slate-400" };
  }

  return (
    <div className="grid gap-4">
      <PageHeader title={t("classroom.assignments")} />

      <SectionCard>
        <div className="scroll-x flex gap-2">
          <Link href={`/classrooms/${classroomId}/assignments`} className={`chip shrink-0 ${!query.subject && !query.status ? "chip-active" : ""}`}>
            {t("common.all")}
          </Link>
          <Link href={`/classrooms/${classroomId}/assignments?status=pending`} className={`chip shrink-0 ${query.status === "pending" ? "chip-active" : ""}`}>
            {t("assignment.pendingOnly")}
          </Link>
          <Link href={`/classrooms/${classroomId}/assignments?status=done`} className={`chip shrink-0 ${query.status === "done" ? "chip-active" : ""}`}>
            {t("common.done")}
          </Link>
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/classrooms/${classroomId}/assignments?subject=${subject.id}`}
              className={`chip shrink-0 ${query.subject === subject.id ? "chip-active" : ""}`}
            >
              {subject.name}
            </Link>
          ))}
        </div>
      </SectionCard>

      {manager ? (
        <SectionCard title={t("classroom.addAssignment")}>
          <form action={addAssignmentAction} className="grid gap-3">
            <input type="hidden" name="classroomId" value={classroomId} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="assignment-subject">{t("common.subject")}</label>
                <select id="assignment-subject" name="subjectId" className="select" required defaultValue="">
                  <option value="">—</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="assignment-title">{t("classroom.assignmentTitle")}</label>
                <input id="assignment-title" name="title" className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="assignment-date">{t("classroom.assignmentDue")}</label>
                <input id="assignment-date" name="dueDate" type="date" className="input" defaultValue={today} required />
              </div>
              <div>
                <label className="label" htmlFor="assignment-time">{t("common.time")}</label>
                <input id="assignment-time" name="dueTime" type="time" className="input" defaultValue="23:59" />
              </div>
              <div>
                <label className="label" htmlFor="assignment-attachment-title">{t("log.attachmentTitle")}</label>
                <input id="assignment-attachment-title" name="attachmentTitle" className="input" />
              </div>
              <div>
                <label className="label" htmlFor="assignment-attachment-url">{t("classroom.resourceUrl")}</label>
                <input id="assignment-attachment-url" name="attachmentUrl" className="input" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="assignment-description">{t("classroom.announcementBody")}</label>
              <textarea id="assignment-description" name="description" className="textarea" />
            </div>
            <button type="submit" className="btn btn-primary">{t("action.save")}</button>
          </form>
        </SectionCard>
      ) : null}

      <SectionCard>
        {rows.length === 0 ? (
          <EmptyState message={t("classroom.noAssignments")} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {rows.map(({ assignment, subject, done }) => {
              const state = countdown(assignment.dueAt);
              return (
                <li key={assignment.id} className={`rounded-2xl bg-white/[0.03] p-3 ${done ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[15px] font-bold text-white">{assignment.title}</p>
                    <span className={`badge bg-white/5 ${done ? "text-emerald-300" : state.tone}`}>
                      {done ? t("assignment.completed") : state.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-slate-400">
                    {subject.name} · {formatDate(assignment.dueAt.slice(0, 10), locale)} ·{" "}
                    {formatTime(assignment.dueAt.slice(11, 16), locale)}
                  </p>
                  {assignment.description ? (
                    <p className="mt-1.5 text-[13px] text-slate-300">{assignment.description}</p>
                  ) : null}
                  {assignment.attachments.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {assignment.attachments.map((attachment) => (
                        <a
                          key={attachment.url}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[12.5px] font-semibold text-blue-400"
                        >
                          📎 {attachment.title}
                        </a>
                      ))}
                    </div>
                  ) : null}
                  <form action={toggleAssignmentDoneAction} className="mt-3">
                    <input type="hidden" name="assignmentId" value={assignment.id} />
                    <input type="hidden" name="classroomId" value={classroomId} />
                    <button type="submit" className={`btn btn-sm ${done ? "btn-ghost" : "btn-success"}`}>
                      {done ? t("action.markUndone") : t("action.markDone")}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
