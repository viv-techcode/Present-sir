import Link from "next/link";
import { BrandMark } from "@/components/shared/Brand";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { loadDemoAction, signInAction } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/home");
  const { t } = await getI18n();
  const params = await searchParams;

  return (
    <main id="main-content" className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
<BrandMark className="h-12 w-10" />
        <p className="text-[15px] font-bold text-white">{t("app.name")}</p>
      </div>

      <div className="card card-pad">
        <h1 className="text-lg font-bold text-white">{t("auth.title")}</h1>
        {params.error ? (
          <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-[13px] text-rose-300">
            {t("auth.invalid")}
          </p>
        ) : null}
        <form action={signInAction} className="mt-4 grid gap-3">
          <div>
            <label className="label" htmlFor="email">
              {t("auth.email")}
            </label>
            <input id="email" name="email" type="email" className="input" autoComplete="email" required />
          </div>
          <div>
            <label className="label" htmlFor="password">
              {t("auth.password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            {t("auth.submit")}
          </button>
        </form>

        <div className="my-4 h-px bg-white/10" />

        <form action={loadDemoAction}>
          <button type="submit" className="btn btn-ghost btn-block">
            ▶ {t("landing.demoCta")}
          </button>
        </form>

        <p className="mt-4 text-center text-[13px] text-slate-400">
          {t("auth.noAccount")}{" "}
          <Link href="/onboarding" className="font-semibold text-blue-400">
            {t("auth.createAccount")}
          </Link>
        </p>
      </div>
    </main>
  );
}
