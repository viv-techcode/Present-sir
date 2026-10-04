import Link from "next/link";
import { canCreateLectureLog, canManageClassroom, requireClassroom } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getClassroomSubjects, getLectureLogs } from "@/lib/queries";
import { EmptyState, LinkButton, PageHeader, SectionCard } from "@/components/shared/ui";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function LectureLogListPage({
  params,
  searchParams,
}: {
  params: Promise<{ classroomId: string }>;
  searchParams: Promise<{ subject?: string; q?: string }>;
}) {
  const { classroomId } = await params;
  const { classroom, role } = await requireClassroom(classroomId);
  const { t, locale } = await getI18n();
  const query = await searchParams;

  const subjects = await getClassroomSubjects(classroomId);
  const allLogs = await getLectureLogs(classroomId, query.subject ? { subjectId: query.subject } : undefined);
  const search = (query.q ?? "").toLowerCase();
  const logs = search
    ? allLogs.filter(
        (row) =>
          row.log.topic.toLowerCase().includes(search) ||
          row.log.keyPoints.some((point) => point.toLowerCase().includes(search)),
      )
    : allLogs;
  const pending = allLogs.filter((row) => row.log.status === "pending");
  const permission = canCreateLectureLog(role, classroom.lectureLogMode);

  return (
    <div className="grid gap-4">
      <PageHeader
        title={t("log.title")}
        subtitle={t("log.addLogIntro")}
        action={
          permission.allowed ? (
            <LinkButton href={`/classrooms/${classroomId}/lecture-log/new`} variant="primary">
              + {t("log.addLog")}
            </LinkButton>
          ) : (
            <span className="badge bg-white/5 text-slate-400">{t("classroom.modeCrContributors")}</span>
          )
        }
      />

      <SectionCard>
        <form className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]" action={`/classrooms/${classroomId}/lecture-log`}>
          <input
            name="q"
            className="input"
            placeholder={t("log.searchLogs")}
            defaultValue={query.q ?? ""}
            aria-label={t("search.placeholder")}
          />
          <button type="submit" className="btn btn-ghost">
            {t("nav.search")}
          </button>
        </form>
        <div className="scroll-x flex gap-2">
          <Link
            href={`/classrooms/${classroomId}/lecture-log`}
            className={`chip shrink-0 ${!query.subject ? "chip-active" : ""}`}
          >
            {t("log.filterSubject")}
          </Link>
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/classrooms/${classroomId}/lecture-log?subject=${subject.id}`}
              className={`chip shrink-0 ${query.subject === subject.id ? "chip-active" : ""}`}
            >
              {subject.name}
            </Link>
          ))}
        </div>
      </SectionCard>

      {canManageClassroom(role) && pending.length > 0 ? (
        <SectionCard title={t("log.approvalQueue")}>
          <ul className="grid gap-2">
            {pending.map(({ log, subject, author }) => (
              <li key={log.id} className="rounded-xl bg-amber-500/10 px-3 py-2.5">
                <Link
                  href={`/classrooms/${classroomId}/lecture-log/${log.id}`}
                  className="text-[14px] font-semibold text-white"
                >
                  {log.topic}
                </Link>
                <p className="text-[12.5px] text-slate-300">
                  {subject.name} · {formatDate(log.date, locale)} · {author.name}
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <SectionCard>
        {logs.length === 0 ? (
          <EmptyState
            message={t("log.noLogsForDay")}
            hint={t("classroom.lectureLog")}
            action={
              permission.allowed ? (
                <LinkButton href={`/classrooms/${classroomId}/lecture-log/new`} variant="primary">
                  {t("log.addLog")}
                </LinkButton>
              ) : null
            }
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {logs.map(({ log, subject, author }) => (
              <li key={log.id} className="rounded-2xl bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/classrooms/${classroomId}/lecture-log/${log.id}`}
                    className="text-[15px] font-bold text-white"
                  >
                    {log.topic}
                  </Link>
                  <span
                    className={`badge ${
                      log.status === "published"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : log.status === "pending"
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    {log.status === "published"
                      ? t("log.logStatusPublished")
                      : log.status === "pending"
                        ? t("log.logStatusPending")
                        : t("common.rejected")}
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] text-slate-400">
                  {subject.name} · {formatDate(log.date, locale)} · {log.startTime}
                </p>
                {log.keyPoints.length > 0 ? (
                  <ul className="mt-2 grid gap-1">
                    {log.keyPoints.slice(0, 3).map((point) => (
                      <li key={point} className="text-[13px] text-slate-300">
                        • {point}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {log.homework ? (
                  <p className="mt-2 text-[12.5px] text-amber-300">📌 {log.homework}</p>
                ) : null}
                <p className="mt-2 text-[12px] text-slate-500">
                  {t("log.postedBy")} {author.name} · {t("log.helpfulCount", { count: log.helpfulCount })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
