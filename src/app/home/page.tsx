import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { addDays, formatDate, formatTime, nowTime, todayISO } from "@/lib/dates";
import {
  getAssignments,
  getClassroomActivity,
  getClassesForDate,
  getExams,
  getUserScope,
} from "@/lib/queries";
import { MissedClassCard, TodayClassCard } from "@/components/home/TodayClassCard";
import { EmptyState, LinkButton, PageHeader, ProgressBar, RiskBadge, SectionCard, SubjectDot } from "@/components/shared/ui";
import { formatPct } from "@/lib/attendance-engine";
import { toggleAssignmentDoneAction } from "@/lib/actions/classroom";
import { createTranslator, type TranslationKey } from "@/lib/i18n/dictionaries";

type TranslatorFn = ReturnType<typeof createTranslator>;

export const dynamic = "force-dynamic";

function phaseOf(
  date: string,
  startTime: string,
  endTime: string,
): "completed" | "ongoing" | "upcoming" {
  const today = todayISO();
  if (date < today) return "completed";
  if (date > today) return "upcoming";
  const now = nowTime();
  if (now >= endTime) return "completed";
  if (now >= startTime) return "ongoing";
  return "upcoming";
}

function assignmentCountdown(dueAt: string, t: TranslatorFn) {
  const dueDate = dueAt.slice(0, 10);
  const today = todayISO();
  const diff = Math.round(
    (new Date(`${dueDate}T00:00`).getTime() - new Date(`${today}T00:00`).getTime()) / 86_400_000,
  );
  if (diff < 0) return { label: t("assignment.overdue", { count: Math.abs(diff) }), tone: "text-rose-300" };
  if (diff === 0) return { label: t("assignment.dueToday"), tone: "text-amber-300" };
  if (diff === 1) return { label: t("assignment.dueTomorrow"), tone: "text-amber-300" };
  return { label: t("assignment.dueIn", { count: diff }), tone: diff <= 3 ? "text-amber-300" : "text-slate-400" };
}

export default async function HomePage() {
  const user = await requireUser();
  const { t, locale } = await getI18n();
  const today = todayISO();

  const scope = await getUserScope(user.id);
  const classes = await getClassesForDate(user.id, today, scope.classroomIds);
  // On a free day, show the most recent teaching day instead of an empty screen.
  let fallbackDate: string | null = null;
  if (classes.length === 0 && scope.classroomIds.length > 0) {
    for (let back = 1; back <= 7; back += 1) {
      const date = addDays(today, -back);
      const dayClasses = await getClassesForDate(user.id, date, scope.classroomIds);
      if (dayClasses.length > 0) {
        fallbackDate = date;
        break;
      }
    }
  }
  const [assignments, examRows, activity] = await Promise.all([
    getAssignments(user.id, scope.classroomIds),
    getExams(scope.classroomIds),
    getClassroomActivity(scope.classroomIds, 6),
  ]);

  const dueSoon = assignments
    .filter((item) => !item.done)
    .slice(0, 5);
  const nextExam = examRows[0] ?? null;
  const risky = [...scope.subjects]
    .filter((item) => item.evaluation.total > 0)
    .sort((a, b) => (a.evaluation.pct ?? 0) - (b.evaluation.pct ?? 0))
    .slice(0, 5);
  const displayClasses =
    classes.length > 0 ? classes : fallbackDate
      ? await getClassesForDate(user.id, fallbackDate, scope.classroomIds)
      : [];
  const missedClasses = displayClasses.filter(
    (item) => item.record?.status === "absent" && item.log && item.log.status === "published",
  );

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t("home.greetingMorning") : hour < 17 ? t("home.greetingAfternoon") : t("home.greetingEvening");

  return (
    <div className="grid gap-4">
      <PageHeader
        title={`${greeting}, ${user.name.split(" ")[0]} 👋`}
        subtitle={`${formatDate(today, locale)}${
          user.branch ? ` · ${user.branch} ${user.semester ? `Sem ${user.semester}` : ""}` : ""
        } — ${t("home.subtitle")}`}
        action={
          <LinkButton href="/attendance/what-if" variant="primary">
            {t("attendance.whatIf")}
          </LinkButton>
        }
      />

      <SectionCard
        title={classes.length > 0 ? t("home.todaysClasses") : t("home.lastClasses", { date: fallbackDate ? formatDate(fallbackDate, locale) : "" })}
        action={
          scope.classroomIds.length > 0 ? (
            <Link
              href={`/classrooms/${scope.classroomIds[0]}/timetable`}
              className="text-[12.5px] font-semibold text-blue-400"
            >
              {t("classroom.timetable")} →
            </Link>
          ) : null
        }
      >
        {displayClasses.length === 0 ? (
          <EmptyState
            message={t("home.noClassesToday")}
            hint={scope.classroomIds.length === 0 ? t("home.joinClassroomCta") : undefined}
            action={
              scope.classroomIds.length === 0 ? (
                <LinkButton href="/classrooms/join" variant="primary">
                  {t("classroom.joinClassroom")}
                </LinkButton>
              ) : null
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {displayClasses.map((item) => (
              <TodayClassCard
                key={`${item.slot.id}-${item.slot.startTime}`}
                date={classes.length > 0 ? today : fallbackDate!}
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
                classroomId={item.classroomId}
                recordStatus={(item.record?.status as never) ?? null}
                recordId={item.record?.id ?? null}
                log={
                  item.log
                    ? { id: item.log.id, topic: item.log.topic, status: item.log.status }
                    : null
                }
                phase={phaseOf(
                  classes.length > 0 ? today : fallbackDate ?? today,
                  item.slot.startTime,
                  item.slot.endTime,
                )}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {displayClasses.some((item) => item.log) ? (
        <SectionCard title={t("home.todaysTopics")}>
          <ul className="grid gap-2">
            {displayClasses
              .filter((item) => item.log)
              .map((item) => (
                <li
                  key={item.log!.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-white">{item.log!.topic}</p>
                    <p className="text-[12.5px] text-slate-400">
                      {item.subject.name} · {formatTime(item.slot.startTime, locale)}
                    </p>
                  </div>
                  <Link
                    href={`/classrooms/${item.classroomId}/lecture-log/${item.log!.id}`}
                    className="text-[12.5px] font-semibold text-blue-400"
                  >
                    {t("action.open")} →
                  </Link>
                </li>
              ))}
          </ul>
        </SectionCard>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title={t("home.attendanceRisk")}
          action={
            <Link href="/attendance" className="text-[12.5px] font-semibold text-blue-400">
              {t("action.viewAll")} →
            </Link>
          }
        >
          {risky.length === 0 ? (
            <EmptyState
              message={t("attendance.noSubjects")}
              action={<LinkButton href="/attendance" variant="primary">{t("attendance.addSubject")}</LinkButton>}
            />
          ) : (
            <ul className="grid gap-3">
              {risky.map((item) => (
                <li key={item.subject.id}>
                  <Link
                    href={`/attendance/${item.subject.id}`}
                    className="block rounded-xl bg-white/[0.03] px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <SubjectDot color={item.subject.color} />
                        <span className="truncate text-[14px] font-semibold text-white">
                          {item.subject.name}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-white">
                          {formatPct(item.evaluation.pct)}
                        </span>
                        <RiskBadge risk={item.evaluation.risk} t={t} />
                      </span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar pct={item.evaluation.pct} minPct={item.evaluation.minPct} />
                    </div>
                    <p className="mt-1.5 text-[12.5px] text-slate-400">
                      {t("home.attendanceSummary", {
                        attended: item.evaluation.attended,
                        total: item.evaluation.total,
                      })}
                      {" · "}
                      {item.evaluation.risk === "danger"
                        ? t("home.recovery", { count: item.evaluation.recoveryNeeded })
                        : t("home.safeSkips", { count: item.evaluation.safeSkips })}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <div className="grid gap-4">
          <SectionCard
            title={t("home.dueSoon")}
            action={
              scope.classroomIds.length > 0 ? (
                <Link
                  href={`/classrooms/${scope.classroomIds[0]}/assignments`}
                  className="text-[12.5px] font-semibold text-blue-400"
                >
                  {t("action.viewAll")} →
                </Link>
              ) : null
            }
          >
            {dueSoon.length === 0 ? (
              <p className="text-[13.5px] text-slate-400">{t("home.noAssignmentsDue")}</p>
            ) : (
              <ul className="grid gap-2">
                {dueSoon.map((item) => {
                  const countdown = assignmentCountdown(item.assignment.dueAt, t);
                  return (
                    <li
                      key={item.assignment.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-white">
                          {item.assignment.title}
                        </p>
                        <p className="text-[12.5px] text-slate-400">{item.subject.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[12.5px] font-semibold ${countdown.tone}`}>
                          {countdown.label}
                        </span>
                        <form action={toggleAssignmentDoneAction}>
                          <input type="hidden" name="assignmentId" value={item.assignment.id} />
                          <input type="hidden" name="classroomId" value={item.assignment.classroomId} />
                          <button type="submit" className="btn btn-sm btn-success">
                            {t("action.markDone")}
                          </button>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title={t("home.nextExam")}
            action={
              scope.classroomIds.length > 0 ? (
                <Link
                  href={`/classrooms/${scope.classroomIds[0]}/exams`}
                  className="text-[12.5px] font-semibold text-blue-400"
                >
                  {t("classroom.exams")} →
                </Link>
              ) : null
            }
          >
            {nextExam ? (
              <div>
                <p className="text-[15px] font-bold text-white">{nextExam.subject.name}</p>
                <p className="mt-0.5 text-[13px] text-slate-400">
                  {t(("exam.type." + nextExam.exam.examType) as TranslationKey)} · {formatDate(nextExam.exam.date, locale)} ·{" "}
                  {formatTime(nextExam.exam.startTime, locale)}
                  {nextExam.exam.room ? ` · ${nextExam.exam.room}` : ""}
                </p>
                <p className="mt-2 text-[13px] font-semibold text-amber-300">
                  {t("exam.countdown", {
                    count: Math.round(
                      (new Date(`${nextExam.exam.date}T00:00`).getTime() -
                        new Date(`${today}T00:00`).getTime()) /
                        86_400_000,
                    ),
                  })}
                </p>
                {nextExam.exam.syllabus ? (
                  <p className="mt-2 rounded-xl bg-white/[0.03] px-3 py-2 text-[13px] text-slate-300">
                    {nextExam.exam.syllabus}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <LinkButton
                    href={`/classrooms/${nextExam.exam.classroomId}/resources?type=pyq`}
                    variant="primary"
                  >
                    {t("exam.openPyqs")}
                  </LinkButton>
                  <LinkButton href={`/classrooms/${nextExam.exam.classroomId}/resources?type=notes`}>
                    {t("exam.openNotes")}
                  </LinkButton>
                </div>
              </div>
            ) : (
              <p className="text-[13.5px] text-slate-400">{t("home.noExamsScheduled")}</p>
            )}
          </SectionCard>
        </div>
      </div>

      {missedClasses.length > 0 ? (
        <SectionCard title={t("home.missedToday")}>
          <div className="grid gap-3 md:grid-cols-2">
            {missedClasses.map((item) => (
              <MissedClassCard
                key={item.log!.id}
                subjectName={item.subject.name}
                topic={item.log!.topic}
                keyPoints={item.log!.keyPoints}
                homework={item.log!.homework}
                logId={item.log!.id}
                classroomId={item.classroomId}
                startTime={item.slot.startTime}
              />
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title={t("home.classroomActivity")}
        action={
          scope.classroomIds.length > 0 ? (
            <Link
              href={`/classrooms/${scope.classroomIds[0]}`}
              className="text-[12.5px] font-semibold text-blue-400"
            >
              {t("classroom.feed")} →
            </Link>
          ) : null
        }
      >
        {activity.length === 0 ? (
          <p className="text-[13.5px] text-slate-400">{t("home.noActivity")}</p>
        ) : (
          <ul className="grid gap-2">
            {activity.map((item) => (
              <li key={item.announcement.id} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[14px] font-semibold text-white">{item.announcement.title}</p>
                  <span className="badge bg-blue-500/15 text-blue-300">
                    {item.announcement.kind.replaceAll("_", " ")}
                  </span>
                </div>
                {item.announcement.body ? (
                  <p className="mt-1 text-[13px] text-slate-400">{item.announcement.body}</p>
                ) : null}
                <p className="mt-1 text-[12px] text-slate-500">
                  {item.author.name} · {formatDate(item.announcement.createdAt.toISOString().slice(0, 10), locale)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
