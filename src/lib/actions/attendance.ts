"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendance, personalEvents, proofs, subjects } from "@/db/schema";
import { getCurrentUser, requireUser } from "@/lib/auth";
import type { AttendanceStatus } from "@/lib/attendance-engine";

const VALID_STATUSES: AttendanceStatus[] = [
  "present",
  "absent",
  "cancelled",
  "holiday",
  "medical",
  "extra",
];

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function num(formData: FormData, key: string, fallback = 0): number {
  const value = Number(text(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

async function ownedSubject(userId: string, subjectId: string) {
  const rows = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
  return rows[0] ?? null;
}

export async function createSubjectAction(formData: FormData) {
  const user = await requireUser();
  const name = text(formData, "name");
  if (!name) redirect("/attendance?error=name");
  const min = Math.min(100, Math.max(0, Math.round(num(formData, "minAttendance", user.minAttendance))));
  await db.insert(subjects).values({
    name,
    code: text(formData, "code") || null,
    faculty: text(formData, "faculty") || null,
    kind: text(formData, "kind") || "lecture",
    minAttendance: min,
    ownerId: user.id,
    color: ["blue", "violet", "emerald", "amber", "rose", "cyan"][
      Math.floor(Math.random() * 6)
    ],
  });
  revalidatePath("/attendance");
  revalidatePath("/home");
  redirect("/attendance?saved=1");
}

export async function deleteSubjectAction(formData: FormData) {
  const user = await requireUser();
  const subjectId = text(formData, "subjectId");
  const subject = await ownedSubject(user.id, subjectId);
  if (subject && (subject.ownerId === user.id || subject.classroomId === null)) {
    await db.delete(subjects).where(eq(subjects.id, subjectId));
  }
  revalidatePath("/attendance");
  redirect("/attendance?deleted=1");
}

/** Upsert one attendance entry. Also used by the Home "mark" buttons. */
export async function markAttendanceAction(formData: FormData) {
  const user = await requireUser();
  const subjectId = text(formData, "subjectId");
  const status = text(formData, "status") as AttendanceStatus;
  const date = text(formData, "date");
  const startTime = text(formData, "startTime") || "00:00";
  const slotId = text(formData, "slotId") || null;
  const redirectTo = text(formData, "redirectTo");

  if (!VALID_STATUSES.includes(status) || !subjectId || !date) {
    redirect(redirectTo || "/attendance?error=invalid");
  }

  await db
    .insert(attendance)
    .values({
      userId: user.id,
      subjectId,
      slotId,
      date,
      startTime,
      status,
      note: text(formData, "note") || null,
    })
    .onConflictDoUpdate({
      target: [attendance.userId, attendance.subjectId, attendance.date, attendance.startTime],
      set: { status, slotId, updatedAt: new Date() },
    });

  revalidatePath("/home");
  revalidatePath("/attendance");
  revalidatePath(`/attendance/${subjectId}`);
  if (redirectTo) redirect(redirectTo);
}

export async function deleteAttendanceAction(formData: FormData) {
  const user = await requireUser();
  const id = text(formData, "id");
  await db
    .delete(attendance)
    .where(and(eq(attendance.id, id), eq(attendance.userId, user.id)));
  revalidatePath("/attendance");
  const subjectId = text(formData, "subjectId");
  if (subjectId) revalidatePath(`/attendance/${subjectId}`);
}

export async function addProofAction(formData: FormData) {
  const user = await requireUser();
  const title = text(formData, "title");
  if (!title) redirect("/attendance/proofs?error=title");
  await db.insert(proofs).values({
    userId: user.id,
    subjectId: text(formData, "subjectId") || null,
    title,
    kind: text(formData, "kind") || "medical",
    url: text(formData, "url") || null,
    date: text(formData, "date") || new Date().toISOString().slice(0, 10),
    note: text(formData, "note") || null,
  });
  revalidatePath("/attendance/proofs");
  redirect("/attendance/proofs?saved=1");
}

export async function deleteProofAction(formData: FormData) {
  const user = await requireUser();
  await db
    .delete(proofs)
    .where(and(eq(proofs.id, text(formData, "id")), eq(proofs.userId, user.id)));
  revalidatePath("/attendance/proofs");
}

export async function addPersonalEventAction(formData: FormData) {
  const user = await requireUser();
  const title = text(formData, "title");
  if (!title) redirect("/planner?error=title");
  await db.insert(personalEvents).values({
    userId: user.id,
    title,
    kind: text(formData, "kind") || "personal",
    date: text(formData, "date") || new Date().toISOString().slice(0, 10),
    startTime: text(formData, "startTime") || "09:00",
    endTime: text(formData, "endTime") || "10:00",
  });
  revalidatePath("/planner");
  redirect("/planner?saved=1");
}

export async function deletePersonalEventAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await db
    .delete(personalEvents)
    .where(and(eq(personalEvents.id, text(formData, "id")), eq(personalEvents.userId, user.id)));
  revalidatePath("/planner");
}
