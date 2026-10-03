import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { classroomMembers, classrooms, sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "ps_session";
const SESSION_DAYS = 60;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
  jar.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/* ------------------------------------------------------------------ */
/* Classroom authorization — enforced on the server, never only in UI  */
/* ------------------------------------------------------------------ */

export type ClassroomRole = "cr" | "co_admin" | "contributor" | "member";

export interface ClassroomContext {
  classroom: typeof classrooms.$inferSelect;
  role: ClassroomRole;
  member: typeof classroomMembers.$inferSelect;
}

export async function getMembership(userId: string, classroomId: string) {
  const rows = await db
    .select()
    .from(classroomMembers)
    .where(and(eq(classroomMembers.classroomId, classroomId), eq(classroomMembers.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Any member (or the creator) can read classroom content. */
export async function requireClassroom(classroomId: string): Promise<ClassroomContext> {
  const user = await requireUser();
  const rows = await db.select().from(classrooms).where(eq(classrooms.id, classroomId)).limit(1);
  const classroom = rows[0];
  if (!classroom) redirect("/classrooms");
  const member =
    (await getMembership(user.id, classroomId)) ??
    (classroom.createdBy === user.id
      ? {
          id: "creator",
          classroomId,
          userId: user.id,
          role: "cr" as const,
          joinedAt: new Date(),
        }
      : null);
  if (!member) redirect(`/classrooms?error=not-a-member`);
  return { classroom, role: member.role as ClassroomRole, member };
}

export function canManageClassroom(role: ClassroomRole): boolean {
  return role === "cr" || role === "co_admin";
}

export function isContributor(role: ClassroomRole): boolean {
  return role === "cr" || role === "co_admin" || role === "contributor";
}

/**
 * Lecture log permission modes.
 * cr_only | cr_contributors | open_approved | open
 */
export function canCreateLectureLog(
  role: ClassroomRole,
  mode: string,
): { allowed: boolean; requiresApproval: boolean } {
  if (role === "cr" || role === "co_admin") return { allowed: true, requiresApproval: false };
  if (mode === "cr_only") return { allowed: false, requiresApproval: false };
  if (mode === "cr_contributors") {
    return role === "contributor"
      ? { allowed: true, requiresApproval: false }
      : { allowed: false, requiresApproval: false };
  }
  if (mode === "open_approved") return { allowed: true, requiresApproval: true };
  if (mode === "open") return { allowed: true, requiresApproval: false };
  return { allowed: false, requiresApproval: false };
}

export function canApproveLectureLogs(role: ClassroomRole): boolean {
  return canManageClassroom(role);
}

export function roleLabel(role: string): string {
  if (role === "cr") return "CR";
  if (role === "co_admin") return "Co-admin";
  if (role === "contributor") return "Contributor";
  return "Member";
}
