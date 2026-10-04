import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getI18n, getLocale } from "@/lib/i18n/server";
import { getUserScope } from "@/lib/queries";
import { LinkButton, PageHeader, SectionCard } from "@/components/shared/ui";
import { setLocaleAction, updateProfileAction } from "@/lib/actions/auth";
import { MotionToggle } from "@/components/motion/Provider";
import { LOCALES } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  const { t } = await getI18n();
  const locale = await getLocale();
  const query = await searchParams;
  const scope = await getUserScope(user.id);

  return (
    <div className="grid gap-4">
      <PageHeader title={t("settings.title")} />

      {query.saved ? (
        <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-300">
          {t("settings.saved")}
        </p>
      ) : null}

      <SectionCard title={t("settings.language")}>
        <div className="flex flex-wrap gap-2">
          {LOCALES.map((code) => (
            <form key={code} action={setLocaleAction}>
              <input type="hidden" name="locale" value={code} />
              <button
                type="submit"
                className={`chip ${locale === code ? "chip-active" : ""}`}
              >
                {code === "en" ? "English" : "हिंदी"}
              </button>
            </form>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t("settings.motion")}>
        <p className="text-[13.5px] text-slate-400">{t("settings.motionHelp")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <MotionToggle />
          <span className="text-[12.5px] text-slate-500">{t("landing.motionNote")}</span>
        </div>
      </SectionCard>

      <SectionCard title={t("profile.edit")}>
        <form action={updateProfileAction} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="settings-name">{t("onboarding.yourName")}</label>
              <input id="settings-name" name="name" className="input" defaultValue={user.name} required />
            </div>
            <div>
              <label className="label" htmlFor="settings-min">{t("settings.attendanceThreshold")}</label>
              <input
                id="settings-min"
                name="minAttendance"
                type="number"
                min={0}
                max={100}
                className="input"
                defaultValue={user.minAttendance}
              />
            </div>
            <div>
              <label className="label" htmlFor="settings-college">{t("onboarding.college")}</label>
              <input id="settings-college" name="college" className="input" defaultValue={user.college ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="settings-branch">{t("onboarding.branch")}</label>
              <input id="settings-branch" name="branch" className="input" defaultValue={user.branch ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="settings-semester">{t("onboarding.semester")}</label>
              <input id="settings-semester" name="semester" className="input" defaultValue={user.semester ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="settings-section">{t("onboarding.section")}</label>
              <input id="settings-section" name="section" className="input" defaultValue={user.section ?? ""} />
            </div>
          </div>
          <p className="text-[12.5px] text-slate-500">{t("settings.thresholdHelp")}</p>
          <label className="flex items-center gap-2 rounded-2xl bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-slate-300">
            <input
              type="checkbox"
              name="notificationsEnabled"
              defaultChecked={user.notificationsEnabled}
              className="h-4 w-4 accent-blue-500"
            />
            {t("settings.notifications")}
          </label>
          <button type="submit" className="btn btn-primary">{t("action.save")}</button>
        </form>
      </SectionCard>

      <SectionCard title={t("settings.backup")}>
        <p className="text-[13.5px] text-slate-400">{t("settings.backupHelp")}</p>
        <a href="/api/export" className="btn btn-primary mt-3 w-fit" download>
          {t("settings.export")}
        </a>
      </SectionCard>

      <SectionCard title={t("settings.classroomSettings")}>
        {scope.classrooms.length === 0 ? (
          <p className="text-[13.5px] text-slate-400">{t("classroom.noClassrooms")}</p>
        ) : (
          <ul className="grid gap-2">
            {scope.classrooms.map(({ classroom, role }) => (
              <li key={classroom.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5">
                <div>
                  <p className="text-[14px] font-semibold text-white">{classroom.name}</p>
                  <p className="text-[12.5px] text-slate-400">
                    {t("classroom.lectureLogMode")}: {classroom.lectureLogMode} ·{" "}
                    {t("attendance.threshold", { pct: classroom.minAttendance })}
                  </p>
                </div>
                <Link href={`/classrooms/${classroom.id}/members`} className="text-[12.5px] font-semibold text-blue-400">
                  {role === "cr" || role === "co_admin" ? t("classroom.settings") : t("classroom.members")} →
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <LinkButton href="/classrooms/create">{t("classroom.createClassroom")}</LinkButton>
          <LinkButton href="/classrooms/join">{t("classroom.joinClassroom")}</LinkButton>
        </div>
      </SectionCard>
    </div>
  );
}
