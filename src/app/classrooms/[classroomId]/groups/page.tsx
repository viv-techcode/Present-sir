import { canManageClassroom, requireClassroom } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getClassroomSubjects, getStudyGroups } from "@/lib/queries";
import { EmptyState, PageHeader, SectionCard } from "@/components/shared/ui";
import { createStudyGroupAction, toggleGroupMembershipAction } from "@/lib/actions/classroom";

export const dynamic = "force-dynamic";

export default async function GroupsPage({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = await params;
  const { role, classroom } = await requireClassroom(classroomId);
  const { t } = await getI18n();
  const manager = canManageClassroom(role);

  const [subjects, groups] = await Promise.all([
    getClassroomSubjects(classroomId),
    getStudyGroups(classroomId, classroom.createdBy),
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader title={t("classroom.groups")} />

      <SectionCard title={t("classroom.newGroup")}>
        <form action={createStudyGroupAction} className="grid gap-3">
          <input type="hidden" name="classroomId" value={classroomId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="group-name">{t("classroom.groupName")}</label>
              <input id="group-name" name="name" className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="group-subject">{t("common.subject")}</label>
              <select id="group-subject" name="subjectId" className="select" defaultValue="">
                <option value="">{t("common.none")}</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="group-description">{t("classroom.announcementBody")}</label>
            <textarea id="group-description" name="description" className="textarea" />
          </div>
          <button type="submit" className="btn btn-primary">{t("action.create")}</button>
        </form>
      </SectionCard>

      <SectionCard>
        {groups.length === 0 ? (
          <EmptyState message={t("classroom.noGroups")} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {groups.map(({ group, subject, joined, memberCount }) => (
              <li key={group.id} className="rounded-2xl bg-white/[0.03] p-3">
                <p className="text-[15px] font-bold text-white">{group.name}</p>
                <p className="mt-0.5 text-[12.5px] text-slate-400">
                  {subject?.name ?? t("common.none")} ·{" "}
                  {t("classroom.membersInGroup", { count: memberCount })}
                </p>
                {group.description ? (
                  <p className="mt-1.5 text-[13px] text-slate-300">{group.description}</p>
                ) : null}
                <form action={toggleGroupMembershipAction} className="mt-3">
                  <input type="hidden" name="groupId" value={group.id} />
                  <input type="hidden" name="classroomId" value={classroomId} />
                  <button type="submit" className={`btn btn-sm ${joined ? "btn-ghost" : "btn-success"}`}>
                    {joined ? t("classroom.leaveGroup") : t("classroom.joinGroup")}
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
