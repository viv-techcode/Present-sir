"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  announcements,
  classroomMembers,
  lectureLogHelpful,
  lectureLogs,
  notifications,
  slots,
  subjects,
} from "@/db/schema";
import { canApproveLectureLogs, canCreateLectureLog, getCurrentUser, requireClassroom } from "@/lib/auth";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function list(formData: FormData, key: string): string[] {
  return text(formData, key)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function attachments(formData: FormData) {
  const titles = formData.getAll("attachmentTitle").map(String);
  const urls = formData.getAll("attachmentUrl").map(String);
  return titles
    .map((title, index) => ({ title: title.trim() || "Attachment", url: (urls[index] ?? "").trim() }))
    .filter((item) => item.url.length > 0);
}

function ids(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map(String)
    .filter((value) => value.length > 0);
}

export async function createLectureLogAction(formData: FormData) {
  const classroomId = text(formData, "classroomId");
  const { role, classroom } = await requireClassroom(classroomId);
  const permission = canCreateLectureLog(role, classroom.lectureLogMode);
  if (!permission.allowed) redirect(`/classrooms/${classroomId}/lecture-log?error=forbidden`);

  const subjectId = text(formData, "subjectId");
  const topic = text(formData, "topic");
  const date = text(formData, "date");
  if (!subjectId || !topic || !date) {
    redirect(`/classrooms/${classroomId}/lecture-log/new?error=required`);
  }

  const startTime = text(formData, "startTime") || "00:00";
  const endTime = text(formData, "endTime") || "00:00";
  const linkedResourceIds = ids(formData, "linkedResourceIds");
  const linkedPyqIds = ids(formData, "linkedPyqIds");

  const [log] = await db
    .insert(lectureLogs)
    .values({
      classroomId,
      subjectId,
      slotId: text(formData, "slotId") || null,
      date,
      startTime,
      endTime,
      topic,
      keyPoints: list(formData, "keyPoints"),
      homework: text(formData, "homework") || null,
      attachments: attachments(formData),
      linkedResourceIds,
      linkedPyqIds: linkedPyqIds.length > 0 ? linkedPyqIds : ids(formData, "linkedResourceIds"),
      postedBy: (await getCurrentUser())!.id,
      status: permission.requiresApproval ? "pending" : "published",
    })
    .returning();

  if (log.status === "published") {
    const subject = (await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1))[0];
    await db.insert(announcements).values({
      classroomId,
      authorId: log.postedBy,
      kind: "lecture_log",
      title: `Lecture log: ${topic}`,
      body: subject?.name ?? null,
      subjectId,
      link: `/classrooms/${classroomId}/lecture-log/${log.id}`,
    });
    const members = await db
      .select({ userId: classroomMembers.userId })
      .from(classroomMembers)
      .where(eq(classroomMembers.classroomId, classroomId));
    if (members.length > 0) {
      await db.insert(notifications).values(
        members.map((member) => ({
          userId: member.userId,
          classroomId,
          kind: "lecture_log",
          title: `Lecture log: ${topic}`,
          body: subject?.name ?? null,
          link: `/classrooms/${classroomId}/lecture-log/${log.id}`,
        })),
      );
    }
  }

  revalidatePath("/", "layout");
  redirect(`/classrooms/${classroomId}/lecture-log/${log.id}?saved=1`);
}

export async function updateLectureLogAction(formData: FormData) {
  const classroomId = text(formData, "classroomId");
  const logId = text(formData, "logId");
  const { role } = await requireClassroom(classroomId);
  const user = await getCurrentUser();
  const log = (await db.select().from(lectureLogs).where(eq(lectureLogs.id, logId)).limit(1))[0];
  if (!log || log.classroomId !== classroomId) redirect(`/classrooms/${classroomId}/lecture-log`);
  if (log.postedBy !== user?.id && !canApproveLectureLogs(role)) {
    redirect(`/classrooms/${classroomId}/lecture-log/${logId}?error=forbidden`);
  }
  await db
    .update(lectureLogs)
    .set({
      subjectId: text(formData, "subjectId") || log.subjectId,
      date: text(formData, "date") || log.date,
      startTime: text(formData, "startTime") || log.startTime,
      endTime: text(formData, "endTime") || log.endTime,
      topic: text(formData, "topic") || log.topic,
      keyPoints: list(formData, "keyPoints"),
      homework: text(formData, "homework") || null,
      attachments: attachments(formData),
      linkedResourceIds: ids(formData, "linkedResourceIds"),
      linkedPyqIds: ids(formData, "linkedPyqIds"),
      updatedAt: new Date(),
    })
    .where(eq(lectureLogs.id, logId));
  revalidatePath("/", "layout");
  redirect(`/classrooms/${classroomId}/lecture-log/${logId}?saved=1`);
}

export async function moderateLectureLogAction(formData: FormData) {
  const classroomId = text(formData, "classroomId");
  const logId = text(formData, "logId");
  const decision = text(formData, "decision");
  const { role } = await requireClassroom(classroomId);
  if (!canApproveLectureLogs(role)) redirect(`/classrooms/${classroomId}/lecture-log?error=forbidden`);
  const status = decision === "approve" ? "published" : "rejected";
  await db.update(lectureLogs).set({ status, updatedAt: new Date() }).where(eq(lectureLogs.id, logId));
  if (status === "published") {
    const log = (await db.select().from(lectureLogs).where(eq(lectureLogs.id, logId)).limit(1))[0];
    if (log) {
      await db.insert(announcements).values({
        classroomId,
        authorId: (await getCurrentUser())!.id,
        kind: "lecture_log",
        title: `Lecture log: ${log.topic}`,
        subjectId: log.subjectId,
        link: `/classrooms/${classroomId}/lecture-log/${logId}`,
      });
    }
  }
  revalidatePath("/", "layout");
  redirect(`/classrooms/${classroomId}/lecture-log/${logId}?moderated=1`);
}

export async function deleteLectureLogAction(formData: FormData) {
  const classroomId = text(formData, "classroomId");
  const logId = text(formData, "logId");
  const { role } = await requireClassroom(classroomId);
  const user = await getCurrentUser();
  const log = (await db.select().from(lectureLogs).where(eq(lectureLogs.id, logId)).limit(1))[0];
  if (!log) redirect(`/classrooms/${classroomId}/lecture-log`);
  if (log.postedBy !== user?.id && !canApproveLectureLogs(role)) {
    redirect(`/classrooms/${classroomId}/lecture-log/${logId}?error=forbidden`);
  }
  await db.delete(lectureLogs).where(eq(lectureLogs.id, logId));
  revalidatePath("/", "layout");
  redirect(`/classrooms/${classroomId}/lecture-log?deleted=1`);
}

export async function toggleLogHelpfulAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const logId = text(formData, "logId");
  const classroomId = text(formData, "classroomId");
  const existing = await db
    .select()
    .from(lectureLogHelpful)
    .where(and(eq(lectureLogHelpful.logId, logId), eq(lectureLogHelpful.userId, user.id)))
    .limit(1);
  if (existing[0]) {
    await db
      .delete(lectureLogHelpful)
      .where(and(eq(lectureLogHelpful.logId, logId), eq(lectureLogHelpful.userId, user.id)));
    await db
      .update(lectureLogs)
      .set({ helpfulCount: sql`greatest(${lectureLogs.helpfulCount} - 1, 0)` })
      .where(eq(lectureLogs.id, logId));
  } else {
    await db.insert(lectureLogHelpful).values({ logId, userId: user.id });
    await db
      .update(lectureLogs)
      .set({ helpfulCount: sql`${lectureLogs.helpfulCount} + 1` })
      .where(eq(lectureLogs.id, logId));
  }
  revalidatePath(`/classrooms/${classroomId}/lecture-log/${logId}`);
}

/** Used by the Add Log form to auto-fill the slot timing for a subject + date. */
export async function getSlotsForSubjectAction(subjectId: string) {
  return db.select().from(slots).where(eq(slots.subjectId, subjectId));
}
