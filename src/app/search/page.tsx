import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { searchAll, getUserScope } from "@/lib/queries";
import { EmptyState, PageHeader, Pill, SectionCard } from "@/components/shared/ui";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { t, locale } = await getI18n();
  const query = await searchParams;
  const q = (query.q ?? "").trim();

  const scope = await getUserScope(user.id);
  const results = await searchAll(user.id, scope.classroomIds, q);
  const total =
    results.logs.length +
    results.resourceItems.length +
    results.pyqItems.length +
    results.assignmentItems.length +
    results.examItems.length +
    results.announcementItems.length;

  return (
    <div className="grid gap-4">
      <PageHeader title={t("search.title")} subtitle={t("search.intro")} />

      <SectionCard>
        <form action="/search" className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input name="q" className="input" placeholder={t("search.placeholder")} defaultValue={q} autoFocus />
          <button type="submit" className="btn btn-primary">{t("nav.search")}</button>
        </form>
        <p className="mt-2 text-[12.5px] text-slate-500">{t("search.tryExample")}</p>
      </SectionCard>

      {q.length < 2 ? (
        <EmptyState message={t("common.noResults")} hint={t("search.intro")} />
      ) : total === 0 ? (
        <EmptyState message={t("common.noResults")} />
      ) : (
        <div className="grid gap-4">
          {results.logs.length > 0 ? (
            <SectionCard title={`${t("search.logs")} · ${results.logs.length}`}>
              <ul className="grid gap-2">
                {results.logs.map(({ log, subject }) => (
                  <li key={log.id} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                    <Link
                      href={`/classrooms/${log.classroomId}/lecture-log/${log.id}`}
                      className="text-[14.5px] font-semibold text-white"
                    >
                      {log.topic}
                    </Link>
                    <p className="mt-0.5 text-[12.5px] text-slate-400">
                      {subject.name} · {formatDate(log.date, locale)} · {log.startTime}
                    </p>
                    {log.keyPoints.length > 0 ? (
                      <p className="mt-1 text-[13px] text-slate-400">• {log.keyPoints[0]}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          {results.pyqItems.length > 0 || results.resourceItems.length > 0 ? (
            <SectionCard title={`${t("search.resources")} + ${t("search.pyqs")}`}>
              <ul className="grid gap-2 md:grid-cols-2">
                {[...results.resourceItems, ...results.pyqItems].map(({ resource, subject }) => (
                  <li key={resource.id} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                    <a href={resource.url} target="_blank" rel="noreferrer" className="text-[14px] font-semibold text-blue-400">
                      {resource.title}
                    </a>
                    <p className="mt-0.5 text-[12.5px] text-slate-400">
                      {subject.name} {resource.unit ? `· ${resource.unit}` : ""}
                    </p>
                    <Pill tone={resource.type === "pyq" ? "amber" : "blue"}>{resource.type}</Pill>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          {results.assignmentItems.length > 0 ? (
            <SectionCard title={t("search.assignments")}>
              <ul className="grid gap-2">
                {results.assignmentItems.map(({ assignment, subject }) => (
                  <li key={assignment.id} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                    <Link
                      href={`/classrooms/${assignment.classroomId}/assignments`}
                      className="text-[14px] font-semibold text-white"
                    >
                      {assignment.title}
                    </Link>
                    <p className="text-[12.5px] text-slate-400">
                      {subject.name} · {formatDate(assignment.dueAt.slice(0, 10), locale)}
                    </p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          {results.examItems.length > 0 ? (
            <SectionCard title={t("search.exams")}>
              <ul className="grid gap-2">
                {results.examItems.map(({ exam, subject }) => (
                  <li key={exam.id} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                    <Link
                      href={`/classrooms/${exam.classroomId}/exams`}
                      className="text-[14px] font-semibold text-white"
                    >
                      {subject.name} · {exam.examType}
                    </Link>
                    <p className="text-[12.5px] text-slate-400">{formatDate(exam.date, locale)}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          {results.announcementItems.length > 0 ? (
            <SectionCard title={t("search.announcements")}>
              <ul className="grid gap-2">
                {results.announcementItems.map(({ announcement }) => (
                  <li key={announcement.id} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                    <p className="text-[14px] font-semibold text-white">{announcement.title}</p>
                    {announcement.body ? (
                      <p className="text-[12.5px] text-slate-400">{announcement.body}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
        </div>
      )}
    </div>
  );
}
