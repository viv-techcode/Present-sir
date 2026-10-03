"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { classroomMembers, classrooms, users } from "@/db/schema";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { LOCALE_COOKIE } from "@/lib/i18n/server";
import { seedDemoWorld } from "@/lib/seed";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optional(formData: FormData, key: string): string | null {
  const value = text(formData, key);
  return value.length > 0 ? value : null;
}

/** Solo start: no classroom, no login wall. Blank email = guest on this device. */
export async function startSoloAction(formData: FormData) {
  const name = text(formData, "name") || "Student";
  const email = optional(formData, "email")?.toLowerCase() ?? null;
  const password = optional(formData, "password");

  if (email) {
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing[0]) {
      if (!existing[0].passwordHash || !password || !verifyPassword(password, existing[0].passwordHash)) {
        redirect("/onboarding?error=exists");
      }
      await createSession(existing[0].id);
      redirect("/home");
    }
  }

  const [created] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: email && password ? hashPassword(password) : null,
      isGuest: !email,
      college: optional(formData, "college"),
      branch: optional(formData, "branch"),
      semester: optional(formData, "semester"),
      section: optional(formData, "section"),
      minAttendance: Number(text(formData, "minAttendance")) || 75,
    })
    .returning();

  await createSession(created.id);
  revalidatePath("/", "layout");
  redirect("/attendance?welcome=1");
}

export async function signInAction(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  if (!email || !password) redirect("/login?error=invalid");

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    redirect("/login?error=invalid");
  }
  await createSession(user.id);
  revalidatePath("/", "layout");
  redirect("/home");
}

export async function signOutAction() {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function setLocaleAction(formData: FormData) {
  const locale = text(formData, "locale") === "hi" ? "hi" : "en";
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  const user = await getCurrentUser();
  if (user) await db.update(users).set({ locale }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
}

export async function updateProfileAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const minAttendance = Number(text(formData, "minAttendance"));
  await db
    .update(users)
    .set({
      name: text(formData, "name") || user.name,
      college: optional(formData, "college"),
      branch: optional(formData, "branch"),
      semester: optional(formData, "semester"),
      section: optional(formData, "section"),
      minAttendance: Number.isFinite(minAttendance)
        ? Math.min(100, Math.max(0, Math.round(minAttendance)))
        : user.minAttendance,
      notificationsEnabled: text(formData, "notificationsEnabled") === "on",
    })
    .where(eq(users.id, user.id));
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}

/** Seeds the demo classroom world once, then signs in as the demo student. */
export async function loadDemoAction(formData?: FormData) {
  const demo = await seedDemoWorld();
  if (!demo) redirect("/login?error=demo");
  const existing = await db
    .select()
    .from(classroomMembers)
    .where(
      and(eq(classroomMembers.classroomId, demo.classroomId), eq(classroomMembers.userId, demo.studentId)),
    )
    .limit(1);
  if (!existing[0]) {
    await db.insert(classroomMembers).values({
      classroomId: demo.classroomId,
      userId: demo.studentId,
      role: "member",
    });
  }
  await createSession(demo.studentId);
  revalidatePath("/", "layout");
  // Only known internal destinations are allowed; never accept an arbitrary redirect URL.
  const view = formData ? text(formData, "view") : "home";
  const destinations: Record<string, string> = {
    home: "/home",
    "what-if": "/attendance/what-if",
    "lecture-log": `/classrooms/${demo.classroomId}/lecture-log`,
    timetable: `/classrooms/${demo.classroomId}/timetable`,
    assignments: `/classrooms/${demo.classroomId}/assignments`,
    exams: `/classrooms/${demo.classroomId}/exams`,
    resources: `/classrooms/${demo.classroomId}/resources`,
    groups: `/classrooms/${demo.classroomId}/groups`,
  };
  let destination = destinations[view] ?? "/home";
  const type = formData ? text(formData, "type") : "";
  if (view === "resources" && ["notes", "pyq", "book", "video", "other"].includes(type)) {
    destination += `?type=${type}`;
  }
  redirect(destination);
}

export async function seedDemoForCurrentUserAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const demo = await seedDemoWorld();
  if (!demo) redirect("/classrooms");
  const existing = await db
    .select()
    .from(classroomMembers)
    .where(and(eq(classroomMembers.classroomId, demo.classroomId), eq(classroomMembers.userId, user.id)))
    .limit(1);
  if (!existing[0]) {
    await db.insert(classroomMembers).values({
      classroomId: demo.classroomId,
      userId: user.id,
      role: "member",
    });
  }
  revalidatePath("/", "layout");
  redirect(`/classrooms/${demo.classroomId}`);
}

export async function joinClassroomByCodeAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const code = text(formData, "code").toUpperCase();
  const rows = await db.select().from(classrooms).where(eq(classrooms.joinCode, code)).limit(1);
  const classroom = rows[0];
  if (!classroom) redirect("/classrooms/join?error=invalid");
  const existing = await db
    .select()
    .from(classroomMembers)
    .where(and(eq(classroomMembers.classroomId, classroom.id), eq(classroomMembers.userId, user.id)))
    .limit(1);
  if (!existing[0]) {
    await db.insert(classroomMembers).values({
      classroomId: classroom.id,
      userId: user.id,
      role: "member",
    });
  }
  revalidatePath("/", "layout");
  redirect(`/classrooms/${classroom.id}`);
}
