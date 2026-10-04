import Link from "next/link";
import { BrandMark } from "@/components/shared/Brand";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { startSoloAction } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/home");
  const { t } = await getI18n();

  return (
    <main id="main-content" className="mx-auto w-full max-w-xl px-4 py-8 md:py-14">
      <div className="mb-6 flex items-center gap-3">
<BrandMark className="h-12 w-10" />
        <p className="text-[15px] font-bold text-white">{t("app.name")}</p>
      </div>

      <div className="card card-pad">
        <h1 className="text-lg font-bold text-white">{t("onboarding.title")}</h1>
        <p className="mt-1 text-[13.5px] text-slate-400">{t("onboarding.intro")}</p>

        <form action={startSoloAction} className="mt-5 grid gap-3">
          <div>
            <label className="label" htmlFor="name">
              {t("onboarding.yourName")}
            </label>
            <input id="name" name="name" className="input" placeholder="Riya Sharma" required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="college">
                {t("onboarding.college")}
              </label>
              <input id="college" name="college" className="input" placeholder="Netaji Institute of Technology" />
            </div>
            <div>
              <label className="label" htmlFor="branch">
                {t("onboarding.branch")}
              </label>
              <input id="branch" name="branch" className="input" placeholder="CSE" />
            </div>
            <div>
              <label className="label" htmlFor="semester">
                {t("onboarding.semester")}
              </label>
              <input id="semester" name="semester" className="input" placeholder="5" />
            </div>
            <div>
              <label className="label" htmlFor="section">
                {t("onboarding.section")}
              </label>
              <input id="section" name="section" className="input" placeholder="A" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="minAttendance">
              {t("onboarding.minAttendance")}
            </label>
            <input
              id="minAttendance"
              name="minAttendance"
              type="number"
              min={0}
              max={100}
              defaultValue={75}
              className="input"
            />
          </div>

          <div className="rounded-2xl bg-white/[0.03] p-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
              {t("onboarding.stepAccount")}
            </p>
            <p className="mt-1 text-[13px] text-slate-400">{t("onboarding.accountHelp")}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input name="email" type="email" className="input" placeholder={t("onboarding.accountEmail")} />
              <input name="password" type="password" className="input" placeholder={t("onboarding.accountPassword")} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block">
            {t("onboarding.startSolo")}
          </button>
        </form>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Link href="/classrooms/join" className="btn btn-ghost btn-block">
            {t("onboarding.joinInstead")}
          </Link>
          <Link href="/classrooms/create" className="btn btn-ghost btn-block">
            {t("onboarding.createInstead")}
          </Link>
        </div>
        <p className="mt-4 text-center text-[13px] text-slate-400">
          <Link href="/login" className="font-semibold text-blue-400">
            {t("action.signIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}
