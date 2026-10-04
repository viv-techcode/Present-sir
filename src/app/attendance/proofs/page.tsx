import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getUserScope } from "@/lib/queries";
import { db } from "@/db";
import { proofs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { EmptyState, LinkButton, PageHeader, SectionCard } from "@/components/shared/ui";
import { addProofAction, deleteProofAction } from "@/lib/actions/attendance";
import { formatDate, todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ProofsPage() {
  const user = await requireUser();
  const { t, locale } = await getI18n();
  const scope = await getUserScope(user.id);
  const rows = await db
    .select()
    .from(proofs)
    .where(eq(proofs.userId, user.id))
    .orderBy(desc(proofs.date));

  return (
    <div className="grid gap-4">
      <PageHeader
        title={t("attendance.proofs")}
        subtitle={t("attendance.proofsIntro")}
        action={<LinkButton href="/attendance">{t("nav.attendance")}</LinkButton>}
      />

      <SectionCard title={t("attendance.addProof")}>
        <form action={addProofAction} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="proof-title">{t("attendance.proofTitle")}</label>
              <input id="proof-title" name="title" className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="proof-kind">{t("attendance.proofKind")}</label>
              <select id="proof-kind" name="kind" className="select" defaultValue="medical">
                <option value="medical">{t("status.medical")}</option>
                <option value="event">{t("planner.personal")}</option>
                <option value="other">{t("common.other")}</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="proof-date">{t("common.date")}</label>
              <input id="proof-date" name="date" type="date" className="input" defaultValue={todayISO()} />
            </div>
            <div>
              <label className="label" htmlFor="proof-subject">{t("common.subject")}</label>
              <select id="proof-subject" name="subjectId" className="select" defaultValue="">
                <option value="">{t("common.none")}</option>
                {scope.subjects.map((item) => (
                  <option key={item.subject.id} value={item.subject.id}>
                    {item.subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="proof-url">{t("attendance.proofLink")}</label>
            <input id="proof-url" name="url" className="input" placeholder="https://drive.google.com/…" />
          </div>
          <div>
            <label className="label" htmlFor="proof-note">{t("common.notes")}</label>
            <textarea id="proof-note" name="note" className="textarea" />
          </div>
          <div>
            <button type="submit" className="btn btn-primary">{t("action.save")}</button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title={t("attendance.proofs")}>
        {rows.length === 0 ? (
          <EmptyState message={t("attendance.noProofs")} />
        ) : (
          <ul className="grid gap-2">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-white">{row.title}</p>
                  <p className="text-[12.5px] text-slate-400">
                    {formatDate(row.date, locale)} · {row.kind}
                    {row.url ? (
                      <>
                        {" · "}
                        <a href={row.url} target="_blank" rel="noreferrer" className="text-blue-400">
                          {t("action.open")}
                        </a>
                      </>
                    ) : null}
                  </p>
                  {row.note ? <p className="mt-1 text-[12.5px] text-slate-400">{row.note}</p> : null}
                </div>
                <form action={deleteProofAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <button type="submit" className="btn btn-sm btn-danger">{t("action.delete")}</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
