import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { LinkButton, PageHeader, SectionCard } from "@/components/shared/ui";
import { joinClassroomByCodeAction } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

export default async function JoinClassroomPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { t } = await getI18n();
  const params = await searchParams;

  return (
    <div className="grid gap-4">
      <PageHeader
        title={t("classroom.joinClassroom")}
        subtitle={t("classroom.joinHelp")}
        action={<LinkButton href="/classrooms">{t("action.back")}</LinkButton>}
      />
      <SectionCard>
        {params.error ? (
          <p className="mb-3 rounded-xl bg-rose-500/10 px-3 py-2 text-[13px] text-rose-300">
            {t("classroom.invalidCode")}
          </p>
        ) : null}
        <form action={joinClassroomByCodeAction} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="code">{t("classroom.joinCode")}</label>
            <input
              id="code"
              name="code"
              className="input font-mono uppercase tracking-[0.2em]"
              placeholder="CSE5A1"
              maxLength={6}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            {t("action.join")}
          </button>
        </form>
        <p className="mt-3 text-[13px] text-slate-500">
          {t("classroom.shareCode")} — CSE5A1
        </p>
      </SectionCard>
    </div>
  );
}
