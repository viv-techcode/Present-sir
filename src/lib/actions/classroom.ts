"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  announcements,
  assignmentCompletions,
  assignments,
  attendance,
  cancellations,
  classroomMembers,
  classrooms,
  exams,
  groupMembers,
  notifications,
  resources,
  slots,
  studyGroups,
  subjects,
  users,
} from "@/db/schema";
import { canManageClassroom, getCurrentUser, requireClassroom, requireUser } from "@/lib/auth";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function generateJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    let code = "";
    for (let i = 0; i < 6; i += 1) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    const existing = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(eq(classrooms.joinCode, code))
      .limit(1);
    if (!existing[0]) return code;
  }
  return `PS${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

function parseSubjectLines(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((line) => {
      const [code, name, faculty] = line.split("|").map((part) => part?.trim() ?? "");
      return {
        code: code || null,
        name: name || code || line,
        faculty: faculty || null,
      };
    })
    .filter((item) => item.name);
}

async function notifyMembers(classroomId: string, payload: {
  kind: string;
  title: string;
  body?: string | null;
  link?: string | null;
}) {
  const members = await db
    .select({ userId: classroomMembers.userId })
    .from(classroomMembers)
    .where(eq(classroomMembers.classroomId, classroomId));
  if (members.length === 0) return;
  await db.insert(notifications).values(
    members.map((member) => ({
      userId: member.userId,
      classroomId,
      kind: payload.kind,
      title: payload.title,
      body: payload.body ?? null,
      link: payload.link ?? null,
    })),
  );
}

export async function createClassroomAction(formData: FormData) {
  const user = await requireUser();
  const branch = text(formData, "branch");
  const semester = text(formData, "semester");
  if (!branch || !semester) redirect("/classrooms/create?error=required");

  const college = text(formData, "college") || user.college || "College";
  const section = text(formData, "section") || "A";
  const subjectLines = parseSubjectLines(text(formData, "subjects"));
  const joinCode = await generateJoinCode();

  const [classroom] = await db
    .insert(classrooms)
    .values({
      name: `${branch} Sem ${semester} · Section ${section}`,
      college,
      branch,
      semester,
      section,
      academicYear: text(formData, "academicYear") || "2025-26",
      joinCode,
      minAttendance: Math.min(100, Math.max(0, Number(text(formData, "minAttendance")) || 75)),
      lectureLogMode: text(formData, "lectureLogMode") || "cr_contributors",
      medicalCountsAttended: text(formData, "medicalCountsAttended") === "on",
      createdBy: user.id,
    })
    .returning();

  await db.insert(classroomMembers).values({
    classroomId: classroom.id,
    userId: user.id,
    role: "cr",
  });

  if (subjectLines.length > 0) {
    await db.insert(subjects).values(
      subjectLines.map((line, index) => ({
        classroomId: classroom.id,
        name: line.name,
        code: line.code,
        faculty: line.faculty,
        minAttendance: classroom.minAttendance,
        color: ["blue", "violet", "emerald", "amber", "rose", "cyan"][index % 6],
      })),
    );
  }

  if (user.college !== college || user.branch !== branch) {
    await db
      .update(users)
      .set({ college, branch, semester, section })
      .where(eq(users.id, user.id));
  }

  revalidatePath("/", "layout");
  redirect(`/classrooms/${classroom.id}?created=1`);
}

export async function updateClassroomSettingsAction(formData: FormData) {
  const classroomId = text(formData, "classroomId");
  const { role } = await requireClassroom(classroomId);
  if (!canManageClassroom(role)) redirect(`/classrooms/${classroomId}?error=forbidden`);
  await db
    .update(classrooms)
    .set({
      name: text(formData, "name"),
      minAttendance: Math.min(100, Math.max(0, Number(text(formData, "minAttendance")) || 75)),
      lectureLogMode: text(formData, "lectureLogMode") || "cr_contributors",
      medicalCountsAttended: text(formData, "medicalCountsAttended") === "on",
    })
    .where(eq(classrooms.id, classroomId));
  revalidatePath(`/classrooms/${classroomId}`);
  redirect(`/classrooms/${classroomId}/members?saved=1`);
}

export async function addClassroomSubjectAction(formData: FormData) {
  const classroomId = text(formData, "classroomId");
  const { role } = await requireClassroom(classroomId);
  if (!canManageClassroom(role)) redirect(`/classrooms/${classroomId}?error=forbidden`);
  const name = text(formData, "name");
  if (!name) redirect(`/classrooms/${classroomId}/timetable?error=name`);
  await db.insert(subjects).values({
    classroomId,
    name,
    code: text(formData, "code") || null,
    faculty: text(formData, "faculty") || null,
    kind: text(formData, "kind") || "lecture",
    minAttendance: Math.min(100, Math.max(0, Number(text(formData, "minAttendance")) || 75)),
    color: ["blue", "violet", "emerald", "amber", "rose", "cyan"][Math.floor(Math.random() * 6)],
  });
  revalidatePath(`/classrooms/${classroomId}`);
  redirect(`/classrooms/${classroomId}/timetable?saved=1`);
}

export async function addSlotAction(formData: FormData) {
  const classroomId = text(formData, "classroomId");
  const { role } = await requireClassroom(classroomId);
  if (!canManageClassroom(role)) redirect(`/classrooms/${classroomId}/timetable?error=forbidden`);
  const subjectId = text(formData, "subjectId");
  if (!subjectId || !text(formData, "startTime") || !text(formData, "endTime")) {
    redirect(`/classrooms/${classroomId}/timetable?error=required`);
  }
  await db.insert(slots).values({
    classroomId,
    subjectId,
    dayOfWeek: Number(text(formData, "dayOfWeek")) || 1,
    startTime: text(formData, "startTime"),
    endTime: text(formData, "endTime"),
    room: text(formData, "room") || null,
    type: text(formData, "type") || "lecture",
    weekParity: text(formData, "weekParity") || "all",
    batch: text(formData, "batch") || null,
  });
  revalidatePath(`/classrooms/${classroomId}/timetable`);
  revalidatePath("/home");
  redirect(`/classrooms/${classroomId}/timetable?saved=1`);
}

export async function deleteSlotAction(formData: FormData) {
  const classroomId = text(formData, "classroomId");
  const { role } = await requireClassroom(classroomId);
  if (!canManageClassroom(role)) redirect(`/classrooms/${classroomId}/timetable?error=forbidden`);
  await db
    .delete(slots)
    .where(and(eq(slots.id, text(formData, "slotId")), eq(slots.classroomId, classroomId)));
  revalidatePath(`/classrooms/${classroomId}/timetable`);
}

/**
 * Cancel a class: adds a cancellation record, converts every member's entry for
 * that slot to "cancelled" (so it leaves the denominator) and posts to the feed.
 */
export async function cancelClassAction(formData: FormData) {
  const classroomId = text(formData, "classroomId");
  const { role, classroom } = await requireClassroom(classroomId);
  if (!canManageClassroom(role)) redirect(`/classrooms/${classroomId}?error=forbidden`);

  const subjectId = text(formData, "subjectId");
  const date = text(formData, "date");
  const startTime = text(formData, "startTime") || "00:00";
  const reason = text(formData, "reason") || "Class cancelled";
  if (!subjectId || !date) redirect(`/classrooms/${classroomId}?error=required`);

  const slotId = text(formData, "slotId") || null;
  await db.insert(cancellations).values({
    classroomId,
    subjectId,
    slotId,
    date,
    startTime,
    reason,
    createdBy: (await getCurrentUser())!.id,
  });

  const existing = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.subjectId, subjectId),
        eq(attendance.date, date),
        eq(attendance.startTime, startTime),
      ),
    );
  for (const row of existing) {
    await db
      .update(attendance)
      .set({ status: "cancelled", source: "cr", updatedAt: new Date() })
      .where(eq(attendance.id, row.id));
  }
  const covered = new Set(existing.map((row) => row.userId));
  const members = await db
    .select({ userId: classroomMembers.userId })
    .from(classroomMembers)
    .where(eq(classroomMembers.classroomId, classroomId));
  const missing = members.filter((member) => !covered.has(member.userId));
  if (missing.length > 0) {
    await db.insert(attendance).values(
      missing.map((member) => ({
        userId: member.userId,
        subjectId,
        slotId,
        date,
        startTime,
        status: "cancelled",
        source: "cr",
      })),
    );
  }

  const subject = (await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1))[0];
  await db.insert(announcements).values({
    classroomId,
    authorId: (await getCurrentUser())!.id,
    kind: "cancellation",
    title: `${subject?.name ?? "Class"} cancelled — ${date}`,
    body: reason,
    subjectId,
    link: `/classrooms/${classroomId}`,
  });
  await notifyMembers(classroomId, {
    kind: "cancellation",
    title: `${subject?.name ?? "Class"} cancelled`,
    body: reason,
    link: `/classrooms/${classroomId}`,
  });

  revalidatePath("/", "layout");
  redirect(`/classrooms/${classroomId}?cancelled=1`);
}

export async function postAnnouncementAction(formData: FormData) {
  const classroomId = text(formData, "classroomId");
  const { role } = await requireClassroom(classroomId);
  if (!canManageClassroom(role) && role !== "contributor") {
    redirect(`/classrooms/${classroomId}?error=forbidden`);
  }
  const title = text(formData, "title");
  if (!title) redirect(`/classrooms/${classroomId}?error=title`);
  await db.insert(announcements).values({
    classroomId,
    authorId: (await getCurrentUser())!.id,
    kind: "announcement",
    title,
    body: text(formData, "body") || null,
    subjectId: text(formData, "subjectId") || null,
  });
  await notifyMembers(classroomId, { kind: "announcement", title, body: text(formData, "body") });
  revalidatePath(`/classrooms/${classroomId}`);
  redirect(`/classrooms/${classroomId}?posted=1`);
}

export async function addAssignmentAction(formData: FormData) {
  const classroomId = text(formData, "classroomId");
  const { role } = await requireClassroom(classroomId);
  if (!canManageClassroom(role) && role !== "contributor") {
    redirect(`/classrooms/${classroomId}/assignments?error=forbidden`);
  }
  const title = text(formData, "title");
  const subjectId = text(formData, "subjectId");
  const dueDate = text(formData, "dueDate");
  const dueTime = text(formData, "dueTime") || "23:59";
  if (!title || !subjectId || !dueDate) {
    redirect(`/classrooms/${classroomId}/assignments?error=required`);
  }
  await db.insert(assignments).values({
    classroomId,
    subjectId,
    title,
    description: text(formData, "description") || null,
    dueAt: `${dueDate}T${dueTime}`,
    attachments: text(formData, "attachmentUrl")
      ? [{ title: text(formData, "attachmentTitle") || "Attachment", url: text(formData, "attachmentUrl") }]
      : [],
    postedBy: (await getCurrentUser())!.id,
  });
  await db.insert(announcements).values({
    classroomId,
    authorId: (await getCurrentUser())!.id,
    kind: "assignment",
    title: `New assignment: ${title}`,
    body: text(formData, "description") || null,
    subjectId,
    link: `/classrooms/${classroomId}/assignments`,
  });
  await notifyMembers(classroomId, {
    kind: "assignment",
    title: `New assignment: ${title}`,
    link: `/classrooms/${classroomId}/assignments`,
  });
  revalidatePath("/", "layout");
  redirect(`/classrooms/${classroomId}/assignments?saved=1`);
}

export async function toggleAssignmentDoneAction(formData: FormData) {
  const user = await requireUser();
  const assignmentId = text(formData, "assignmentId");
  const existing = await db
    .select()
    .from(assignmentCompletions)
    .where(
      and(
        eq(assignmentCompletions.assignmentId, assignmentId),
        eq(assignmentCompletions.userId, user.id),
      ),
    )
    .limit(1);
  if (existing[0]) {
    const done = !existing[0].done;
    await db
      .update(assignmentCompletions)
      .set({ done, doneAt: done ? new Date() : null })
      .where(
        and(
          eq(assignmentCompletions.assignmentId, assignmentId),
          eq(assignmentCompletions.userId, user.id),
        ),
      );
  } else {
    await db.insert(assignmentCompletions).values({
      assignmentId,
      userId: user.id,
      done: true,
      doneAt: new Date(),
    });
  }
  revalidatePath("/home");
  const classroomId = text(formData, "classroomId");
  if (classroomId) revalidatePath(`/classrooms/${classroomId}/assignments`);
}

export async function addExamAction(formData: FormData) {
  const classroomId = text(formData, "classroomId");
  const { role } = await requireClassroom(classroomId);
  if (!canManageClassroom(role) && role !== "contributor") {
    redirect(`/classrooms/${classroomId}/exams?error=forbidden`);
  }
  const subjectId = text(formData, "subjectId");
  const date = text(formData, "date");
  const examType = text(formData, "examType") || "midterm";
  if (!subjectId || !date) redirect(`/classrooms/${classroomId}/exams?error=required`);
  await db.insert(exams).values({
    classroomId,
    subjectId,
    examType,
    date,
    startTime: text(formData, "startTime") || "10:00",
    endTime: text(formData, "endTime") || "12:00",
    room: text(formData, "room") || null,
    syllabus: text(formData, "syllabus") || null,
  });
  await db.insert(announcements).values({
    classroomId,
    authorId: (await getCurrentUser())!.id,
    kind: "exam",
    title: `${examType} added to the datesheet`,
    subjectId,
    link: `/classrooms/${classroomId}/exams`,
  });
  await notifyMembers(classroomId, {
    kind: "exam",
    title: `${examType} scheduled on ${date}`,
    link: `/classrooms/${classroomId}/exams`,
  });
  revalidatePath("/", "layout");
  redirect(`/classrooms/${classroomId}/exams?saved=1`);
}

export async function addResourceAction(formData: FormData) {
  const classroomId = text(formData, "classroomId");
  const { role } = await requireClassroom(classroomId);
  const title = text(formData, "title");
  const url = text(formData, "url");
  const subjectId = text(formData, "subjectId");
  if (!title || !url || !subjectId) {
    redirect(`/classrooms/${classroomId}/resources?error=required`);
  }
  await db.insert(resources).values({
    classroomId,
    subjectId,
    title,
    type: text(formData, "type") || "notes",
    unit: text(formData, "unit") || null,
    year: text(formData, "year") || null,
    url,
    description: text(formData, "description") || null,
    uploadedBy: (await getCurrentUser())!.id,
    verified: canManageClassroom(role),
  });
  await db.insert(announcements).values({
    classroomId,
    authorId: (await getCurrentUser())!.id,
    kind: "resource",
    title: `New resource: ${title}`,
    subjectId,
    link: `/classrooms/${classroomId}/resources`,
  });
  revalidatePath(`/classrooms/${classroomId}/resources`);
  revalidatePath("/search");
  redirect(`/classrooms/${classroomId}/resources?saved=1`);
}

export async function resourceHelpfulAction(formData: FormData) {
  const user = await requireUser();
  const id = text(formData, "id");
  await db
    .update(resources)
    .set({ helpfulCount: sql`${resources.helpfulCount} + 1` })
    .where(eq(resources.id, id));
  const classroomId = text(formData, "classroomId");
  if (classroomId) revalidatePath(`/classrooms/${classroomId}/resources`);
  void user;
}

export async function setMemberRoleAction(formData: FormData) {
  const classroomId = text(formData, "classroomId");
  const { role, classroom } = await requireClassroom(classroomId);
  if (!canManageClassroom(role)) redirect(`/classrooms/${classroomId}/members?error=forbidden`);
  const memberId = text(formData, "memberId");
  const nextRole = text(formData, "role");
  if (!["co_admin", "contributor", "member"].includes(nextRole)) {
    redirect(`/classrooms/${classroomId}/members?error=role`);
  }
  const rows = await db
    .select()
    .from(classroomMembers)
    .where(eq(classroomMembers.id, memberId))
    .limit(1);
  if (!rows[0] || rows[0].classroomId !== classroomId) {
    redirect(`/classrooms/${classroomId}/members?error=notfound`);
  }
  if (rows[0].userId === classroom.createdBy) {
    redirect(`/classrooms/${classroomId}/members?error=creator`);
  }
  await db
    .update(classroomMembers)
    .set({ role: nextRole })
    .where(eq(classroomMembers.id, memberId));
  revalidatePath(`/classrooms/${classroomId}/members`);
}

export async function createStudyGroupAction(formData: FormData) {
  const classroomId = text(formData, "classroomId");
  await requireClassroom(classroomId);
  const name = text(formData, "name");
  if (!name) redirect(`/classrooms/${classroomId}/groups?error=name`);
  const [group] = await db
    .insert(studyGroups)
    .values({
      classroomId,
      subjectId: text(formData, "subjectId") || null,
      name,
      description: text(formData, "description") || null,
      createdBy: (await getCurrentUser())!.id,
    })
    .returning();
  await db.insert(groupMembers).values({
    groupId: group.id,
    userId: (await getCurrentUser())!.id,
  });
  revalidatePath(`/classrooms/${classroomId}/groups`);
  redirect(`/classrooms/${classroomId}/groups?saved=1`);
}

export async function toggleGroupMembershipAction(formData: FormData) {
  const user = await requireUser();
  const groupId = text(formData, "groupId");
  const classroomId = text(formData, "classroomId");
  const existing = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)))
    .limit(1);
  if (existing[0]) {
    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)));
  } else {
    await db.insert(groupMembers).values({ groupId, userId: user.id });
  }
  revalidatePath(`/classrooms/${classroomId}/groups`);
}

export async function markNotificationsReadAction() {
  const user = await requireUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  revalidatePath("/home");
}
