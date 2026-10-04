"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";

export function ClassroomTabs({ classroomId }: { classroomId: string }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const base = `/classrooms/${classroomId}`;

  const tabs = [
    { href: base, label: t("classroom.feed") },
    { href: `${base}/timetable`, label: t("classroom.timetable") },
    { href: `${base}/lecture-log`, label: t("classroom.lectureLog") },
    { href: `${base}/assignments`, label: t("classroom.assignments") },
    { href: `${base}/exams`, label: t("classroom.exams") },
    { href: `${base}/resources`, label: t("classroom.resources") },
    { href: `${base}/groups`, label: t("classroom.groups") },
    { href: `${base}/members`, label: t("classroom.members") },
  ];

  const isActive = (href: string) =>
    href === base ? pathname === base : pathname.startsWith(href);

  return (
    <div className="scroll-x -mx-1 mb-4 flex gap-2 px-1">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`chip shrink-0 ${isActive(tab.href) ? "chip-active" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
