import type { ReactNode } from "react";
import { requireClassroom, roleLabel } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { ClassroomTabs } from "@/components/classroom/ClassroomTabs";
import { Pill } from "@/components/shared/ui";
import { getClassroomMembers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ClassroomLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = await params;
  const { classroom, role } = await requireClassroom(classroomId);
  const { t } = await getI18n();
  const members = await getClassroomMembers(classroomId);

  return (
    <div className="grid gap-3">
      <header className="card card-pad">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-white md:text-xl">{classroom.name}</h1>
            <p className="mt-0.5 text-[13px] text-slate-400">
              {classroom.college} · {classroom.branch} · {t("onboarding.semester")} {classroom.semester} ·{" "}
              {classroom.academicYear}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="blue">{t("classroom.membersCount", { count: members.length })}</Pill>
            <Pill tone="violet">
              {t("classroom.youAre", { role: roleLabel(role) })}
            </Pill>
            <Pill tone="green">
              {t("classroom.codeLabel")}: {classroom.joinCode}
            </Pill>
          </div>
        </div>
      </header>
      <ClassroomTabs classroomId={classroomId} />
      {children}
    </div>
  );
}
