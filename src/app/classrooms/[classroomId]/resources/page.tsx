import Link from "next/link";
import { canManageClassroom, requireClassroom } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getClassroomResources, getClassroomSubjects } from "@/lib/queries";
import { EmptyState, LinkButton, PageHeader, Pill, SectionCard } from "@/components/shared/ui";
import { addResourceAction, resourceHelpfulAction } from "@/lib/actions/classroom";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

const TYPES = ["notes", "pyq", "book", "video", "other"];

export default async function ResourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ classroomId: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { classroomId } = await params;
  const { role } = await requireClassroom(classroomId);
  const { t } = await getI18n();
  const query = await searchParams;
  const manager = canManageClassroom(role) || role === "contributor";

  const [subjects, rows] = await Promise.all([
    getClassroomSubjects(classroomId),
    getClassroomResources(classroomId, query.type),
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader title={t("classroom.resources")} />

      <SectionCard>
        <div className="scroll-x flex gap-2">
          <Link
            href={`/classrooms/${classroomId}/resources`}
            className={`chip shrink-0 ${!query.type ? "chip-active" : ""}`}
          >
            {t("common.all")}
          </Link>
          {TYPES.map((type) => (
            <Link
              key={type}
              href={`/classrooms/${classroomId}/resources?type=${type}`}
              className={`chip shrink-0 ${query.type === type ? "chip-active" : ""}`}
            >
              {type === "pyq" ? t("search.pyqs") : type}
            </Link>
          ))}
        </div>
      </SectionCard>

      {manager ? (
        <SectionCard title={t("classroom.addResource")}>
          <form action={addResourceAction} className="grid gap-3">
            <input type="hidden" name="classroomId" value={classroomId} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="resource-subject">{t("common.subject")}</label>
                <select id="resource-subject" name="subjectId" className="select" required defaultValue="">
                  <option value="">—</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="resource-title">{t("classroom.resourceTitle")}</label>
                <input id="resource-title" name="title" className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="resource-type">{t("classroom.resourceType")}</label>
                <select id="resource-type" name="type" className="select" defaultValue="notes">
                  {TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type === "pyq" ? t("search.pyqs") : type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="resource-unit">{t("classroom.unit")}</label>
                <input id="resource-unit" name="unit" className="input" placeholder="Unit 3" />
              </div>
              <div>
                <label className="label" htmlFor="resource-year">{t("classroom.year")}</label>
                <input id="resource-year" name="year" className="input" placeholder="2024" />
              </div>
              <div>
                <label className="label" htmlFor="resource-url">{t("classroom.resourceUrl")}</label>
                <input id="resource-url" name="url" className="input" required />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="resource-description">{t("classroom.announcementBody")}</label>
              <textarea id="resource-description" name="description" className="textarea" />
            </div>
            <button type="submit" className="btn btn-primary">{t("action.save")}</button>
          </form>
        </SectionCard>
      ) : null}

      <SectionCard>
        {rows.length === 0 ? (
          <EmptyState message={t("classroom.noResources")} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {rows.map(({ resource, subject, uploader }) => (
              <li key={resource.id} className="rounded-2xl bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[15px] font-bold text-white"
                    >
                      {resource.title}
                    </a>
                    <p className="mt-0.5 text-[12.5px] text-slate-400">
                      {subject.name}
                      {resource.unit ? ` · ${resource.unit}` : ""}
                      {resource.year ? ` · ${resource.year}` : ""}
                    </p>
                  </div>
                  <Pill tone={resource.type === "pyq" ? "amber" : "blue"}>
                    {resource.type === "pyq" ? t("search.pyqs") : resource.type}
                  </Pill>
                </div>
                {resource.description ? (
                  <p className="mt-1.5 text-[13px] text-slate-300">{resource.description}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                  <span>{t("common.by")} {uploader.name}</span>
                  <span className={resource.verified ? "text-emerald-400" : "text-slate-500"}>
                    {resource.verified ? t("classroom.verified") : t("classroom.unverified")}
                  </span>
                  <span>👍 {resource.helpfulCount}</span>
                </div>
                <form action={resourceHelpfulAction} className="mt-2">
                  <input type="hidden" name="id" value={resource.id} />
                  <input type="hidden" name="classroomId" value={classroomId} />
                  <button type="submit" className="btn btn-sm btn-ghost">
                    {t("action.helpful")}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
