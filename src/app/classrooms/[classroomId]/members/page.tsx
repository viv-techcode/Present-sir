import { canManageClassroom, requireClassroom, roleLabel } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getClassroomMembers } from "@/lib/queries";
import { EmptyState, PageHeader, Pill, SectionCard } from "@/components/shared/ui";
import { setMemberRoleAction, updateClassroomSettingsAction } from "@/lib/actions/classroom";
import { formatDate, todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function MembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ classroomId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { classroomId } = await params;
  const { classroom, role } = await requireClassroom(classroomId);
  const { t, locale } = await getI18n();
  const query = await searchParams;
  const manager = canManageClassroom(role);
  const members = await getClassroomMembers(classroomId);

  return (
    <div className="grid gap-4">
      <PageHeader title={t("classroom.members")} />

      {manager ? (
        <SectionCard title={t("settings.classroomSettings")}>
          {query.saved ? (
            <p className="mb-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-300">
              {t("settings.saved")}
            </p>
          ) : null}
          <form action={updateClassroomSettingsAction} className="grid gap-3">
            <input type="hidden" name="classroomId" value={classroomId} />
            <div>
              <label className="label" htmlFor="classroom-name">{t("classroom.title")}</label>
              <input id="classroom-name" name="name" className="input" defaultValue={classroom.name} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="classroom-min">{t("attendance.minAttendance")}</label>
                <input
                  id="classroom-min"
                  name="minAttendance"
                  type="number"
                  min={0}
                  max={100}
                  className="input"
                  defaultValue={classroom.minAttendance}
                />
              </div>
              <div>
                <label className="label" htmlFor="classroom-logmode">{t("classroom.lectureLogMode")}</label>
                <select
                  id="classroom-logmode"
                  name="lectureLogMode"
                  className="select"
                  defaultValue={classroom.lectureLogMode}
                >
                  <option value="cr_only">{t("classroom.modeCrOnly")}</option>
                  <option value="cr_contributors">{t("classroom.modeCrContributors")}</option>
                  <option value="open_approved">{t("classroom.modeOpenApproved")}</option>
                  <option value="open">{t("classroom.modeOpen")}</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 rounded-2xl bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-slate-300">
              <input
                type="checkbox"
                name="medicalCountsAttended"
                defaultChecked={classroom.medicalCountsAttended}
                className="h-4 w-4 accent-blue-500"
              />
              {t("classroom.medicalCounts")}
            </label>
            <button type="submit" className="btn btn-primary">{t("action.save")}</button>
          </form>
        </SectionCard>
      ) : null}

      <SectionCard title={`${t("classroom.membersCount", { count: members.length })}`}>
        {members.length === 0 ? (
          <EmptyState message={t("classroom.noClassrooms")} />
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {members.map(({ member, user }) => (
              <li key={member.id} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-white">{user.name}</p>
                    <p className="text-[12.5px] text-slate-400">
                      {user.email ?? t("auth.guest")} ·{" "}
                      {formatDate(member.joinedAt.toISOString().slice(0, 10), locale)}
                    </p>
                  </div>
                  <Pill tone={member.role === "cr" ? "green" : member.role === "member" ? "slate" : "violet"}>
                    {roleLabel(member.role)}
                  </Pill>
                </div>
                {manager && member.userId !== classroom.createdBy ? (
                  <form action={setMemberRoleAction} className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="classroomId" value={classroomId} />
                    <input type="hidden" name="memberId" value={member.id} />
                    <select name="role" className="select !min-h-[36px] !w-auto" defaultValue={member.role}>
                      <option value="member">{roleLabel("member")}</option>
                      <option value="contributor">{roleLabel("contributor")}</option>
                      <option value="co_admin">{roleLabel("co_admin")}</option>
                    </select>
                    <button type="submit" className="btn btn-sm btn-ghost">
                      {t("classroom.promote")}
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[12.5px] text-slate-500">
          {t("classroom.codeLabel")}: <span className="font-mono">{classroom.joinCode}</span> ·{" "}
          {formatDate(todayISO(), locale)}
        </p>
      </SectionCard>
    </div>
  );
}
