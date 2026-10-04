import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { asc, eq } from "drizzle-orm";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getUnreadNotificationCount } from "@/lib/queries";
import { db } from "@/db";
import { classroomMembers } from "@/db/schema";
import { I18nProvider } from "@/lib/i18n/client";
import { MotionProvider } from "@/components/motion/Provider";

export const metadata: Metadata = {
  title: { default: "Present Sir — Be present. Stay ahead.", template: "%s | Present Sir" },
  description: "Attendance under control. Every lecture accounted for. Your timetable, assignments, notes and exams in one student workspace.",
  applicationName: "Present Sir",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const { locale, t } = await getI18n();
  let classroomHref = "/classrooms";
  let unread = 0;

  if (user) {
    const memberships = await db
      .select({ classroomId: classroomMembers.classroomId })
      .from(classroomMembers)
      .where(eq(classroomMembers.userId, user.id))
      .orderBy(asc(classroomMembers.joinedAt))
      .limit(1);
    classroomHref = memberships[0] ? `/classrooms/${memberships[0].classroomId}` : "/classrooms";
    unread = await getUnreadNotificationCount(user.id);
  }

  return (
    <html lang={locale}>
      <body className="antialiased">
        <I18nProvider locale={locale}>
          <MotionProvider>
            <a href="#main-content" className="skip-link">{t("design.skip")}</a>
            {user ? (
              <AppShell
                user={{ name: user.name, isGuest: user.isGuest, email: user.email }}
                classroomHref={classroomHref}
                unread={unread}
              >
                {children}
              </AppShell>
            ) : children}
          </MotionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
