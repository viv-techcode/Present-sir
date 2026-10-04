import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getUserScope } from "@/lib/queries";
import { WhatIfSimulator } from "@/components/attendance/WhatIfSimulator";
import { LinkButton, PageHeader, SectionCard } from "@/components/shared/ui";

export const dynamic = "force-dynamic";

export default async function WhatIfPage() {
  const user = await requireUser();
  const { t } = await getI18n();
  const scope = await getUserScope(user.id);

  return (
    <div className="grid gap-4">
      <PageHeader
        title={t("attendance.whatIf")}
        subtitle={t("attendance.whatIfIntro")}
        action={<LinkButton href="/attendance">{t("nav.attendance")}</LinkButton>}
      />
      <SectionCard>
        <WhatIfSimulator
          subjects={scope.subjects.map((item) => ({
            id: item.subject.id,
            name: item.subject.name,
            evaluation: item.evaluation,
          }))}
        />
      </SectionCard>
    </div>
  );
}
