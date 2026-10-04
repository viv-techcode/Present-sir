import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { LinkButton, PageHeader, SectionCard } from "@/components/shared/ui";
import { createClassroomAction } from "@/lib/actions/classroom";

export const dynamic = "force-dynamic";

export default async function CreateClassroomPage() {
  const user = await requireUser();
  const { t } = await getI18n();

  return (
    <div className="grid gap-4">
      <PageHeader
        title={t("classroom.createClassroom")}
        subtitle={t("classroom.shareCode")}
        action={<LinkButton href="/classrooms">{t("action.back")}</LinkButton>}
      />

      <SectionCard>
        <form action={createClassroomAction} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="college">{t("onboarding.college")}</label>
              <input id="college" name="college" className="input" defaultValue={user.college ?? ""} required />
            </div>
            <div>
              <label className="label" htmlFor="branch">{t("onboarding.branch")}</label>
              <input id="branch" name="branch" className="input" defaultValue={user.branch ?? "CSE"} required />
            </div>
            <div>
              <label className="label" htmlFor="semester">{t("onboarding.semester")}</label>
              <input id="semester" name="semester" className="input" defaultValue={user.semester ?? "5"} required />
            </div>
            <div>
              <label className="label" htmlFor="section">{t("onboarding.section")}</label>
              <input id="section" name="section" className="input" defaultValue={user.section ?? "A"} />
            </div>
            <div>
              <label className="label" htmlFor="academicYear">{t("common.year")}</label>
              <input id="academicYear" name="academicYear" className="input" defaultValue="2025-26" />
            </div>
            <div>
              <label className="label" htmlFor="minAttendance">{t("attendance.minAttendance")}</label>
              <input
                id="minAttendance"
                name="minAttendance"
                type="number"
                min={0}
                max={100}
                defaultValue={user.minAttendance}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="lectureLogMode">{t("classroom.lectureLogMode")}</label>
            <select id="lectureLogMode" name="lectureLogMode" className="select" defaultValue="cr_contributors">
              <option value="cr_only">{t("classroom.modeCrOnly")}</option>
              <option value="cr_contributors">{t("classroom.modeCrContributors")}</option>
              <option value="open_approved">{t("classroom.modeOpenApproved")}</option>
              <option value="open">{t("classroom.modeOpen")}</option>
            </select>
          </div>

          <label className="flex items-center gap-2 rounded-2xl bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-slate-300">
            <input type="checkbox" name="medicalCountsAttended" defaultChecked className="h-4 w-4 accent-blue-500" />
            {t("classroom.medicalCounts")}
          </label>

          <div>
            <label className="label" htmlFor="subjects">
              {t("common.subjects")} — code | name | faculty
            </label>
            <textarea
              id="subjects"
              name="subjects"
              className="textarea font-mono text-[13px]"
              defaultValue={`CS301 | Database Management Systems | Prof. R. Sharma
CS302 | Operating Systems | Prof. A. Verma
CS303 | Data Structures & Algorithms | Prof. S. Iyer
CS304 | Computer Networks | Prof. M. Nair
CS305 | Theory of Computation | Prof. K. Das
CS306 | Artificial Intelligence | Prof. P. Rao`}
            />
            <p className="mt-1 text-[12px] text-slate-500">{t("classroom.selectSubject")}</p>
          </div>

          <button type="submit" className="btn btn-primary btn-block">
            {t("action.create")}
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
