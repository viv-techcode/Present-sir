import { canManageClassroom, requireClassroom } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getExams, getClassroomSubjects } from "@/lib/queries";
import { EmptyState, LinkButton, PageHeader, Pill, SectionCard } from "@/components/shared/ui";
import { addExamAction } from "@/lib/actions/classroom";
import { formatDate, formatTimeRange, todayISO } from "@/lib/dates";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function ExamsPage({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = await params;
  const { role } = await requireClassroom(classroomId);
  const { t, locale } = await getI18n();
  const manager = canManageClassroom(role) || role === "contributor";

  const [subjects, examRows] = await Promise.all([
    getClassroomSubjects(classroomId),
    getExams([classroomId], "2000-01-01"),
  ]);
  const today = todayISO();
  const upcoming = examRows.filter((row) => row.exam.date >= today);
  const past = examRows.filter((row) => row.exam.date < today);

  return (
    <div className="grid gap-4">
      <PageHeader title={t("classroom.exams")} />

      {manager ? (
        <SectionCard title={t("classroom.addExam")}>
          <form action={addExamAction} className="grid gap-3">
            <input type="hidden" name="classroomId" value={classroomId} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="exam-subject">{t("common.subject")}</label>
                <select id="exam-subject" name="subjectId" className="select" required defaultValue="">
                  <option value="">—</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="exam-type">{t("classroom.examType")}</label>
                <select id="exam-type" name="examType" className="select" defaultValue="midterm">
                  <option value="midterm">{t("exam.type.midterm")}</option>
                  <option value="endterm">{t("exam.type.endterm")}</option>
                  <option value="quiz">{t("exam.type.quiz")}</option>
                  <option value="practical">{t("exam.type.practical")}</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="exam-date">{t("common.date")}</label>
                <input id="exam-date" name="date" type="date" className="input" defaultValue={today} required />
              </div>
              <div>
                <label className="label" htmlFor="exam-room">{t("common.room")}</label>
                <input id="exam-room" name="room" className="input" placeholder="Exam Hall 1" />
              </div>
              <div>
                <label className="label" htmlFor="exam-start">{t("classroom.startTime")}</label>
                <input id="exam-start" name="startTime" type="time" className="input" defaultValue="10:00" />
              </div>
              <div>
                <label className="label" htmlFor="exam-end">{t("classroom.endTime")}</label>
                <input id="exam-end" name="endTime" type="time" className="input" defaultValue="12:00" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="exam-syllabus">{t("exam.syllabus")}</label>
              <textarea id="exam-syllabus" name="syllabus" className="textarea" />
            </div>
            <button type="submit" className="btn btn-primary">{t("action.save")}</button>
          </form>
        </SectionCard>
      ) : null}

      <SectionCard title={t("common.upcoming")}>
        {upcoming.length === 0 ? (
          <EmptyState message={t("classroom.noExams")} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {upcoming.map(({ exam, subject }) => {
              const days = Math.round(
                (new Date(`${exam.date}T00:00`).getTime() - new Date(`${today}T00:00`).getTime()) / 86_400_000,
              );
              return (
                <li key={exam.id} className="rounded-2xl bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-white">{subject.name}</p>
                      <p className="text-[12.5px] text-slate-400">
                        {t(("exam.type." + exam.examType) as TranslationKey)} ·{" "}
                        {formatDate(exam.date, locale)} · {formatTimeRange(exam.startTime, exam.endTime, locale)}
                        {exam.room ? ` · ${exam.room}` : ""}
                      </p>
                    </div>
                    <Pill tone={days <= 2 ? "rose" : days <= 7 ? "amber" : "blue"}>
                      {days === 0 ? t("exam.today") : days === 1 ? t("exam.tomorrow") : t("exam.countdown", { count: days })}
                    </Pill>
                  </div>
                  {exam.syllabus ? (
                    <p className="mt-2 rounded-xl bg-white/[0.03] px-3 py-2 text-[13px] text-slate-300">
                      {exam.syllabus}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <LinkButton href={`/classrooms/${classroomId}/resources?type=pyq`} variant="primary">
                      {t("exam.openPyqs")}
                    </LinkButton>
                    <LinkButton href={`/classrooms/${classroomId}/resources?type=notes`}>
                      {t("exam.openNotes")}
                    </LinkButton>
                    <LinkButton href={`/attendance/${subject.id}`}>{t("nav.attendance")}</LinkButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {past.length > 0 ? (
        <SectionCard title={t("common.completed")}>
          <ul className="grid gap-2 md:grid-cols-2">
            {past.map(({ exam, subject }) => (
              <li key={exam.id} className="rounded-xl bg-white/[0.02] px-3 py-2">
                <p className="text-[13.5px] font-semibold text-slate-300">
                  {subject.name} · {formatDate(exam.date, locale)}
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}
