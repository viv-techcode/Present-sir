import Link from "next/link";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { canApproveLectureLogs, canCreateLectureLog, requireClassroom } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getLectureLog } from "@/lib/queries";
import { EmptyState, LinkButton, PageHeader, Pill, SectionCard } from "@/components/shared/ui";
import { LectureLogForm } from "@/components/lecture-log/LectureLogForm";
import {
  deleteLectureLogAction,
  moderateLectureLogAction,
  toggleLogHelpfulAction,
} from "@/lib/actions/lecture-log";
import { formatDate, formatTimeRange, todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function LectureLogDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ classroomId: string; logId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { classroomId, logId } = await params;
  const { classroom, role } = await requireClassroom(classroomId);
  const { t, locale } = await getI18n();
  const query = await searchParams;
  const row = await getLectureLog(classroomId, logId);
  if (!row) {
    return <EmptyState message={t("log.noLogsForDay")} action={<LinkButton href={`/classrooms/${classroomId}/lecture-log`}>{t("action.back")}</LinkButton>} />;
  }

  const { log, subject, author } = row;
  const linkedIds = [...log.linkedResourceIds, ...log.linkedPyqIds];
  const linked = linkedIds.length > 0 ? await db.select().from(resources).where(inArray(resources.id, linkedIds)) : [];

  if (query.edit === "1") {
    const canEdit = log.postedBy === author.id || canApproveLectureLogs(role);
    if (!canEdit) {
      return <EmptyState message={t("log.notAllowed")} />;
    }
    return (
      <div className="grid gap-4">
        <PageHeader
          title={t("log.editLog")}
          action={<LinkButton href={`/classrooms/${classroomId}/lecture-log/${logId}`}>{t("action.cancel")}</LinkButton>}
        />
        <SectionCard>
          <LectureLogForm
            classroomId={classroomId}
            subjects={[{ id: subject.id, name: subject.name }]}
            slots={[]}
            resources={linked.map((item) => ({
              id: item.id,
              title: item.title,
              type: item.type,
              subjectId: item.subjectId,
            }))}
            defaultDate={todayISO()}
            initial={{
              logId: log.id,
              subjectId: log.subjectId,
              date: log.date,
              startTime: log.startTime,
              endTime: log.endTime,
              topic: log.topic,
              keyPoints: log.keyPoints,
              homework: log.homework,
              linkedResourceIds: log.linkedResourceIds,
              linkedPyqIds: log.linkedPyqIds,
              attachments: log.attachments,
            }}
          />
        </SectionCard>
      </div>
    );
  }

  const permission = canCreateLectureLog(role, classroom.lectureLogMode);

  return (
    <div className="grid gap-4">
      <PageHeader
        title={log.topic}
        subtitle={`${subject.name} · ${formatDate(log.date, locale)} · ${formatTimeRange(log.startTime, log.endTime, locale)}`}
        action={
          <>
            <LinkButton href={`/classrooms/${classroomId}/lecture-log`}>{t("log.title")}</LinkButton>
            {log.postedBy === author.id || canApproveLectureLogs(role) ? (
              <LinkButton href={`/classrooms/${classroomId}/lecture-log/${logId}?edit=1`} variant="primary">
                {t("action.edit")}
              </LinkButton>
            ) : null}
          </>
        }
      />

      {log.status !== "published" ? (
        <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-[13px] text-amber-300">
          {t("log.pendingNote")}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={t("log.keyPoints")}>
          {log.keyPoints.length === 0 ? (
            <p className="text-[13.5px] text-slate-400">{t("common.none")}</p>
          ) : (
            <ol className="grid gap-2">
              {log.keyPoints.map((point, index) => (
                <li key={point} className="rounded-xl bg-white/[0.03] px-3 py-2 text-[13.5px] text-slate-200">
                  <span className="mr-2 font-bold text-blue-400">{index + 1}.</span>
                  {point}
                </li>
              ))}
            </ol>
          )}
          {log.homework ? (
            <div className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2.5">
              <p className="label mb-1">{t("log.homework")}</p>
              <p className="text-[13.5px] text-amber-200">{log.homework}</p>
            </div>
          ) : null}
        </SectionCard>

        <div className="grid gap-4">
          <SectionCard title={t("common.status")}>
            <div className="flex flex-wrap gap-2">
              <Pill tone={log.status === "published" ? "green" : "amber"}>
                {log.status === "published" ? t("log.logStatusPublished") : t("log.logStatusPending")}
              </Pill>
              <Pill tone="blue">{t("log.helpfulCount", { count: log.helpfulCount })}</Pill>
              <Pill tone="violet">
                {t("log.postedBy")} {author.name}
              </Pill>
            </div>
            <form action={toggleLogHelpfulAction} className="mt-3">
              <input type="hidden" name="logId" value={log.id} />
              <input type="hidden" name="classroomId" value={classroomId} />
              <button type="submit" className="btn btn-ghost btn-sm">
                👍 {t("action.helpful")}
              </button>
            </form>

            {canApproveLectureLogs(role) && log.status !== "published" ? (
              <div className="mt-3 flex gap-2">
                <form action={moderateLectureLogAction}>
                  <input type="hidden" name="classroomId" value={classroomId} />
                  <input type="hidden" name="logId" value={log.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <button type="submit" className="btn btn-sm btn-success">
                    {t("log.approve")}
                  </button>
                </form>
                <form action={moderateLectureLogAction}>
                  <input type="hidden" name="classroomId" value={classroomId} />
                  <input type="hidden" name="logId" value={log.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <button type="submit" className="btn btn-sm btn-danger">
                    {t("log.reject")}
                  </button>
                </form>
              </div>
            ) : null}

            {log.postedBy === author.id || canApproveLectureLogs(role) ? (
              <form action={deleteLectureLogAction} className="mt-3">
                <input type="hidden" name="classroomId" value={classroomId} />
                <input type="hidden" name="logId" value={log.id} />
                <button type="submit" className="btn btn-sm btn-danger">
                  {t("log.deleteLog")}
                </button>
              </form>
            ) : null}
          </SectionCard>

          <SectionCard title={t("log.attachments")}>
            {log.attachments.length === 0 ? (
              <p className="text-[13.5px] text-slate-400">{t("common.none")}</p>
            ) : (
              <ul className="grid gap-2">
                {log.attachments.map((attachment) => (
                  <li key={attachment.url} className="rounded-xl bg-white/[0.03] px-3 py-2">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13.5px] font-semibold text-blue-400"
                    >
                      {attachment.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title={t("log.relatedNotes")}>
            {linked.filter((item) => item.type !== "pyq").length === 0 ? (
              <p className="text-[13.5px] text-slate-400">{t("common.none")}</p>
            ) : (
              <ul className="grid gap-2">
                {linked
                  .filter((item) => item.type !== "pyq")
                  .map((item) => (
                    <li key={item.id} className="rounded-xl bg-white/[0.03] px-3 py-2">
                      <a href={item.url} target="_blank" rel="noreferrer" className="text-[13.5px] font-semibold text-blue-400">
                        {item.title}
                      </a>
                      <p className="text-[12px] text-slate-500">{item.unit ?? ""}</p>
                    </li>
                  ))}
              </ul>
            )}
            <p className="label mt-3">{t("log.relatedPyqs")}</p>
            {linked.filter((item) => item.type === "pyq").length === 0 ? (
              <p className="text-[13.5px] text-slate-400">{t("common.none")}</p>
            ) : (
              <ul className="grid gap-2">
                {linked
                  .filter((item) => item.type === "pyq")
                  .map((item) => (
                    <li key={item.id} className="rounded-xl bg-white/[0.03] px-3 py-2">
                      <a href={item.url} target="_blank" rel="noreferrer" className="text-[13.5px] font-semibold text-blue-400">
                        {item.title}
                      </a>
                    </li>
                  ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <LinkButton href={`/classrooms/${classroomId}/resources?type=pyq`}>
                {t("exam.openPyqs")}
              </LinkButton>
              <LinkButton href={`/search?q=${encodeURIComponent(log.topic.split(" ")[0])}`}>
                {t("nav.search")}
              </LinkButton>
            </div>
          </SectionCard>
        </div>
      </div>

      {!permission.allowed ? null : (
        <p className="text-[12.5px] text-slate-500">
          <Link href={`/classrooms/${classroomId}/lecture-log/new`} className="text-blue-400">
            + {t("log.addLog")}
          </Link>
        </p>
      )}
    </div>
  );
}
