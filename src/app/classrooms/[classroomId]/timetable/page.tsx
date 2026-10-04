import Link from "next/link";
import { canManageClassroom, requireClassroom } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getClassroomSlots, getClassroomSubjects } from "@/lib/queries";
import { EmptyState, LinkButton, PageHeader, SectionCard } from "@/components/shared/ui";
import { addClassroomSubjectAction, addSlotAction, deleteSlotAction } from "@/lib/actions/classroom";
import { DAY_LABELS_EN, DAY_LABELS_HI, formatTimeRange } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TimetablePage({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = await params;
  const { role } = await requireClassroom(classroomId);
  const { t, locale } = await getI18n();
  const manager = canManageClassroom(role);

  const [subjects, slotRows] = await Promise.all([
    getClassroomSubjects(classroomId),
    getClassroomSlots(classroomId),
  ]);

  const days = [1, 2, 3, 4, 5, 6].filter(
    (day) => slotRows.some((row) => row.slot.dayOfWeek === day),
  );
  const dayLabels = locale === "hi" ? DAY_LABELS_HI : DAY_LABELS_EN;

  return (
    <div className="grid gap-4">
      <PageHeader
        title={t("classroom.timetable")}
        subtitle={t("classroom.timetable")}
        action={
          manager ? (
            <LinkButton href={`/classrooms/${classroomId}/members`} variant="primary">
              {t("classroom.settings")}
            </LinkButton>
          ) : null
        }
      />

      {manager ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title={t("classroom.addSlot")}>
            <form action={addSlotAction} className="grid gap-3">
              <input type="hidden" name="classroomId" value={classroomId} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="slot-subject">{t("common.subject")}</label>
                  <select id="slot-subject" name="subjectId" className="select" required defaultValue="">
                    <option value="">—</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="slot-day">{t("classroom.day")}</label>
                  <select id="slot-day" name="dayOfWeek" className="select" defaultValue="1">
                    {dayLabels.map((label, index) => (
                      <option key={label} value={index}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="slot-start">{t("classroom.startTime")}</label>
                  <input id="slot-start" name="startTime" type="time" className="input" defaultValue="09:00" required />
                </div>
                <div>
                  <label className="label" htmlFor="slot-end">{t("classroom.endTime")}</label>
                  <input id="slot-end" name="endTime" type="time" className="input" defaultValue="10:00" required />
                </div>
                <div>
                  <label className="label" htmlFor="slot-room">{t("common.room")}</label>
                  <input id="slot-room" name="room" className="input" placeholder="L-201" />
                </div>
                <div>
                  <label className="label" htmlFor="slot-type">{t("common.type")}</label>
                  <select id="slot-type" name="type" className="select" defaultValue="lecture">
                    <option value="lecture">{t("common.lecture")}</option>
                    <option value="lab">{t("common.lab")}</option>
                    <option value="tutorial">{t("common.tutorial")}</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="slot-parity">{t("classroom.weekParity")}</label>
                  <select id="slot-parity" name="weekParity" className="select" defaultValue="all">
                    <option value="all">{t("classroom.allWeeks")}</option>
                    <option value="odd">{t("classroom.oddWeeks")}</option>
                    <option value="even">{t("classroom.evenWeeks")}</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="slot-batch">{t("classroom.batch")}</label>
                  <input id="slot-batch" name="batch" className="input" placeholder="Batch A" />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">{t("action.save")}</button>
            </form>
          </SectionCard>

          <SectionCard title={t("classroom.addSubjectClassroom")}>
            <form action={addClassroomSubjectAction} className="grid gap-3">
              <input type="hidden" name="classroomId" value={classroomId} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="new-subject-name">{t("attendance.subjectName")}</label>
                  <input id="new-subject-name" name="name" className="input" required />
                </div>
                <div>
                  <label className="label" htmlFor="new-subject-code">{t("attendance.subjectCode")}</label>
                  <input id="new-subject-code" name="code" className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="new-subject-faculty">{t("common.faculty")}</label>
                  <input id="new-subject-faculty" name="faculty" className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="new-subject-min">{t("attendance.minAttendance")}</label>
                  <input id="new-subject-min" name="minAttendance" type="number" min={0} max={100} defaultValue={75} className="input" />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">{t("action.save")}</button>
            </form>
          </SectionCard>
        </div>
      ) : null}

      <SectionCard>
        {slotRows.length === 0 ? (
          <EmptyState
            message={t("classroom.noTimetable")}
            hint={manager ? undefined : t("classroom.onlyCrCan")}
          />
        ) : (
          <div className="grid-timetable">
            {(days.length > 0 ? days : [1, 2, 3, 4, 5]).map((day) => (
              <div key={day} className="min-w-0">
                <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-slate-400">
                  {dayLabels[day]}
                </h3>
                <ul className="grid gap-2">
                  {slotRows
                    .filter((row) => row.slot.dayOfWeek === day)
                    .map(({ slot, subject }) => (
                      <li key={slot.id} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                        <p className="text-[13.5px] font-semibold text-white">{subject.name}</p>
                        <p className="text-[12.5px] text-slate-400">
                          {formatTimeRange(slot.startTime, slot.endTime, locale)}
                          {slot.room ? ` · ${slot.room}` : ""}
                        </p>
                        <p className="text-[12px] text-slate-500">
                          {slot.type}
                          {slot.batch ? ` · ${slot.batch}` : ""}
                          {slot.weekParity !== "all" ? ` · ${slot.weekParity}` : ""}
                        </p>
                        {manager ? (
                          <form action={deleteSlotAction} className="mt-2">
                            <input type="hidden" name="classroomId" value={classroomId} />
                            <input type="hidden" name="slotId" value={slot.id} />
                            <button type="submit" className="btn btn-sm btn-ghost">✕</button>
                          </form>
                        ) : null}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title={t("common.subjects")}>
        <ul className="grid gap-2 md:grid-cols-2">
          {subjects.map((subject) => (
            <li key={subject.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-white">{subject.name}</p>
                <p className="text-[12.5px] text-slate-400">
                  {subject.code ?? ""} {subject.faculty ? `· ${subject.faculty}` : ""} ·{" "}
                  {t("attendance.threshold", { pct: subject.minAttendance })}
                </p>
              </div>
              <Link href={`/attendance/${subject.id}`} className="text-[12.5px] font-semibold text-blue-400">
                {t("nav.attendance")} →
              </Link>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
