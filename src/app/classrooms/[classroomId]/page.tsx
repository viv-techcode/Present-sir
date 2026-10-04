import Link from "next/link";
import { requireClassroom, canManageClassroom, getCurrentUser, roleLabel } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import {
  getClassroomActivity,
  getClassroomSlots,
  getClassroomSubjects,
  getClassesForDate,
  getLectureLogs,
} from "@/lib/queries";
import { EmptyState, LinkButton, SectionCard } from "@/components/shared/ui";
import { TodayClassCard } from "@/components/home/TodayClassCard";
import { cancelClassAction, postAnnouncementAction } from "@/lib/actions/classroom";
import { formatDate, nowTime, todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ClassroomFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ classroomId: string }>;
  searchParams: Promise<{ created?: string; cancelled?: string }>;
}) {
  const { classroomId } = await params;
  const { classroom, role } = await requireClassroom(classroomId);
  const user = await getCurrentUser();
  const { t, locale } = await getI18n();
  const query = await searchParams;
  const manager = canManageClassroom(role);

  const [subjects, slots, activity, logs, todayClasses] = await Promise.all([
    getClassroomSubjects(classroomId),
    getClassroomSlots(classroomId),
    getClassroomActivity([classroomId], 12),
    getLectureLogs(classroomId, { status: "pending" }),
    getClassesForDate(user!.id, todayISO(), [classroomId]),
  ]);

  const feed = activity;

  const today = todayISO();
  const now = nowTime();

  return (
    <div className="grid gap-4">
      {query.created ? (
        <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-300">
          {t("classroom.created")} — <span className="font-mono">{classroom.joinCode}</span>
        </p>
      ) : null}
      {query.cancelled ? (
        <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-[13px] text-amber-300">
          {t("classroom.classCancelled")} · {t("classroom.cancelIntro")}
        </p>
      ) : null}

      <SectionCard
        title={`${t("home.todaysClasses")} · ${formatDate(today, locale)}`}
        action={
          <Link href={`/classrooms/${classroomId}/timetable`} className="text-[12.5px] font-semibold text-blue-400">
            {t("classroom.timetable")} →
          </Link>
        }
      >
        {todayClasses.length === 0 ? (
          <EmptyState message={t("home.noClassesToday")} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {todayClasses.map((item) => (
              <TodayClassCard
                key={`${item.slot.id}-${item.slot.startTime}`}
                date={today}
                slotId={item.slot.id}
                startTime={item.slot.startTime}
                endTime={item.slot.endTime}
                room={item.slot.room}
                type={item.slot.type}
                batch={item.slot.batch}
                subjectId={item.subject.id}
                subjectName={item.subject.name}
                subjectCode={item.subject.code}
                faculty={item.subject.faculty}
                color={item.subject.color}
                classroomId={classroomId}
                recordStatus={(item.record?.status as never) ?? null}
                recordId={item.record?.id ?? null}
                log={item.log ? { id: item.log.id, topic: item.log.topic, status: item.log.status } : null}
                phase={
                  now >= item.slot.endTime ? "completed" : now >= item.slot.startTime ? "ongoing" : "upcoming"
                }
              />
            ))}
          </div>
        )}
      </SectionCard>

      {logs.length > 0 ? (
        <SectionCard title={t("log.approvalQueue")}>
          <ul className="grid gap-2">
            {logs.map(({ log, subject, author }) => (
              <li
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <Link
                    href={`/classrooms/${classroomId}/lecture-log/${log.id}`}
                    className="truncate text-[14px] font-semibold text-white"
                  >
                    {log.topic}
                  </Link>
                  <p className="text-[12.5px] text-slate-300">
                    {subject.name} · {formatDate(log.date, locale)} · {author.name}
                  </p>
                </div>
                <LinkButton href={`/classrooms/${classroomId}/lecture-log/${log.id}`} variant="warn">
                  {t("log.approve")}
                </LinkButton>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {manager ? (
          <SectionCard title={t("classroom.postAnnouncement")}>
            <form action={postAnnouncementAction} className="grid gap-3">
              <input type="hidden" name="classroomId" value={classroomId} />
              <div>
                <label className="label" htmlFor="announcement-title">
                  {t("classroom.announcementTitle")}
                </label>
                <input id="announcement-title" name="title" className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="announcement-body">
                  {t("classroom.announcementBody")}
                </label>
                <textarea id="announcement-body" name="body" className="textarea" />
              </div>
              <div>
                <label className="label" htmlFor="announcement-subject">
                  {t("common.subject")}
                </label>
                <select id="announcement-subject" name="subjectId" className="select" defaultValue="">
                  <option value="">{t("common.none")}</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary">
                {t("action.save")}
              </button>
            </form>
          </SectionCard>
        ) : null}

        {manager ? (
          <SectionCard title={t("classroom.cancelClass")}>
            <p className="mb-3 text-[13px] text-slate-400">{t("classroom.cancelIntro")}</p>
            <form action={cancelClassAction} className="grid gap-3">
              <input type="hidden" name="classroomId" value={classroomId} />
              <div>
                <label className="label" htmlFor="cancel-subject">
                  {t("common.subject")}
                </label>
                <select id="cancel-subject" name="subjectId" className="select" required defaultValue="">
                  <option value="">—</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="cancel-date">
                    {t("common.date")}
                  </label>
                  <input id="cancel-date" name="date" type="date" className="input" defaultValue={today} required />
                </div>
                <div>
                  <label className="label" htmlFor="cancel-time">
                    {t("common.time")}
                  </label>
                  <select id="cancel-time" name="startTime" className="select" defaultValue="09:00">
                    {Array.from(new Set(slots.map((row) => row.slot.startTime))).map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="cancel-reason">
                  {t("classroom.cancelReason")}
                </label>
                <input id="cancel-reason" name="reason" className="input" placeholder="Faculty on leave" />
              </div>
              <button type="submit" className="btn btn-warn">
                {t("classroom.cancelClass")}
              </button>
            </form>
          </SectionCard>
        ) : (
          <SectionCard title={t("classroom.role")}>
            <p className="text-[13.5px] text-slate-400">
              {t("classroom.youAre", { role: roleLabel(role) })} · {t("classroom.onlyCrCan")}
            </p>
          </SectionCard>
        )}
      </div>

      <SectionCard title={t("classroom.feed")}>
        {feed.length === 0 ? (
          <EmptyState message={t("classroom.noAnnouncements")} />
        ) : (
          <ul className="grid gap-2">
            {feed.map(({ announcement, author }) => (
              <li key={announcement.id} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[14px] font-semibold text-white">{announcement.title}</p>
                  <span className="badge bg-blue-500/15 text-blue-300">
                    {announcement.kind.replaceAll("_", " ")}
                  </span>
                </div>
                {announcement.body ? (
                  <p className="mt-1 text-[13px] text-slate-400">{announcement.body}</p>
                ) : null}
                <p className="mt-1 text-[12px] text-slate-500">
                  {author.name} · {formatDate(announcement.createdAt.toISOString().slice(0, 10), locale)}
                  {announcement.link ? (
                    <>
                      {" · "}
                      <Link href={announcement.link} className="text-blue-400">
                        {t("action.open")}
                      </Link>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
