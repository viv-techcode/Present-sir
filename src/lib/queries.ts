import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  announcements,
  assignmentCompletions,
  assignments,
  attendance,
  classroomMembers,
  classrooms,
  exams,
  notifications,
  groupMembers,
  lectureLogs,
  personalEvents,
  resources,
  slots,
  studyGroups,
  subjects,
  users,
} from "@/db/schema";
import {
  countsFromRecords,
  evaluate,
  overallEvaluation,
  type AttendanceCounts,
  type AttendanceStatus,
  type SubjectEvaluation,
} from "@/lib/attendance-engine";
import { dayOfWeek, isValidISO, todayISO, weekParityMatches } from "@/lib/dates";

export interface SubjectWithStats {
  subject: typeof subjects.$inferSelect;
  classroomName: string | null;
  classroomId: string | null;
  evaluation: SubjectEvaluation;
  logCount: number;
}

export interface UserScope {
  userId: string;
  classrooms: { classroom: typeof classrooms.$inferSelect; role: string }[];
  classroomIds: string[];
  subjects: SubjectWithStats[];
  overall: SubjectEvaluation;
  medicalCountsAttended: boolean;
}

export async function getUserScope(userId: string, date = todayISO()): Promise<UserScope> {
  const memberships = await db
    .select({ classroom: classrooms, role: classroomMembers.role })
    .from(classroomMembers)
    .innerJoin(classrooms, eq(classrooms.id, classroomMembers.classroomId))
    .where(eq(classroomMembers.userId, userId))
    .orderBy(asc(classrooms.createdAt));

  const classroomIds = memberships.map((m) => m.classroom.id);

  const conditions = [eq(subjects.ownerId, userId)] as ReturnType<typeof eq>[];
  if (classroomIds.length > 0) conditions.push(inArray(subjects.classroomId, classroomIds));
  const subjectRows = await db
    .select()
    .from(subjects)
    .where(or(...conditions))
    .orderBy(asc(subjects.name));

  const subjectIds = subjectRows.map((s) => s.id);
  const records =
    subjectIds.length > 0
      ? await db.select().from(attendance).where(inArray(attendance.subjectId, subjectIds))
      : [];

  const logCounts =
    subjectIds.length > 0
      ? await db
          .select({ subjectId: lectureLogs.subjectId, count: sql<number>`count(*)::int` })
          .from(lectureLogs)
          .where(and(inArray(lectureLogs.subjectId, subjectIds), eq(lectureLogs.status, "published")))
          .groupBy(lectureLogs.subjectId)
      : [];
  const logCountMap = new Map(logCounts.map((row) => [row.subjectId, row.count]));

  const classroomNameMap = new Map(memberships.map((m) => [m.classroom.id, m.classroom.name]));
  const medicalCountsAttended = memberships.some((m) => m.classroom.medicalCountsAttended);

  const scoped: SubjectWithStats[] = subjectRows.map((subject) => {
    const subjectRecords = records.filter((r) => r.subjectId === subject.id);
    const counts = countsFromRecords(
      subjectRecords.map((r) => ({ status: r.status as AttendanceStatus })),
      { medicalCountsAttended: memberships.find((m) => m.classroom.id === subject.classroomId)?.classroom.medicalCountsAttended ?? true },
    );
    return {
      subject,
      classroomId: subject.classroomId,
      classroomName: subject.classroomId ? classroomNameMap.get(subject.classroomId) ?? null : null,
      evaluation: evaluate(counts, subject.minAttendance),
      logCount: logCountMap.get(subject.id) ?? 0,
    };
  });

  const minPct = memberships[0]?.classroom.minAttendance ?? 75;
  return {
    userId,
    classrooms: memberships,
    classroomIds,
    subjects: scoped,
    overall: overallEvaluation(scoped.map((s) => s.evaluation), minPct),
    medicalCountsAttended,
  };
}

export async function getSubjectScope(userId: string, subjectId: string) {
  const scope = await getUserScope(userId);
  return scope.subjects.find((s) => s.subject.id === subjectId) ?? null;
}

/* ------------------------------------------------------------------ */
/* Timetable / today                                                   */
/* ------------------------------------------------------------------ */

export interface TodayClass {
  slot: typeof slots.$inferSelect;
  subject: typeof subjects.$inferSelect;
  classroomId: string;
  classroomName: string;
  record: typeof attendance.$inferSelect | null;
  log: typeof lectureLogs.$inferSelect | null;
  cancelled: boolean;
}

export async function getClassesForDate(
  userId: string,
  date: string,
  classroomIds: string[],
): Promise<TodayClass[]> {
  if (!isValidISO(date) || classroomIds.length === 0) return [];
  const dow = dayOfWeek(date);
  const rows = await db
    .select({ slot: slots, subject: subjects, classroom: classrooms })
    .from(slots)
    .innerJoin(subjects, eq(subjects.id, slots.subjectId))
    .innerJoin(classrooms, eq(classrooms.id, slots.classroomId))
    .where(and(inArray(slots.classroomId, classroomIds), eq(slots.dayOfWeek, dow)))
    .orderBy(asc(slots.startTime));

  const filtered = rows.filter((row) => weekParityMatches(row.slot.weekParity, date));
  if (filtered.length === 0) return [];

  const records = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.userId, userId),
        eq(attendance.date, date),
        inArray(
          attendance.subjectId,
          filtered.map((row) => row.subject.id),
        ),
      ),
    );
  const logs = await db
    .select()
    .from(lectureLogs)
    .where(
      and(
        eq(lectureLogs.date, date),
        inArray(
          lectureLogs.subjectId,
          filtered.map((row) => row.subject.id),
        ),
      ),
    );

  return filtered
    .map((row) => {
      const record =
        records.find((r) => r.subjectId === row.subject.id && r.startTime === row.slot.startTime) ?? null;
      const log =
        logs.find(
          (l) =>
            l.subjectId === row.subject.id &&
            (l.startTime === row.slot.startTime || l.startTime === "00:00"),
        ) ?? null;
      const cancelled = record?.status === "cancelled";
      return {
        slot: row.slot,
        subject: row.subject,
        classroomId: row.classroom.id,
        classroomName: row.classroom.name,
        record,
        log: log && (log.status === "published" || log.postedBy === userId) ? log : null,
        cancelled,
      };
    })
    .sort((a, b) => (a.slot.startTime < b.slot.startTime ? -1 : 1));
}

/* ------------------------------------------------------------------ */
/* Assignments / exams                                                 */
/* ------------------------------------------------------------------ */

export interface AssignmentWithMeta {
  assignment: typeof assignments.$inferSelect;
  subject: typeof subjects.$inferSelect;
  done: boolean;
}

export async function getAssignments(
  userId: string,
  classroomIds: string[],
  range?: { from: string; to: string },
): Promise<AssignmentWithMeta[]> {
  if (classroomIds.length === 0) return [];
  const conditions = [inArray(assignments.classroomId, classroomIds)] as ReturnType<typeof eq>[];
  if (range) {
    conditions.push(gte(assignments.dueAt, `${range.from}T00:00`));
    conditions.push(lte(assignments.dueAt, `${range.to}T23:59`));
  }
  const rows = await db
    .select({ assignment: assignments, subject: subjects })
    .from(assignments)
    .innerJoin(subjects, eq(subjects.id, assignments.subjectId))
    .where(and(...conditions))
    .orderBy(asc(assignments.dueAt));
  if (rows.length === 0) return [];
  const completions = await db
    .select()
    .from(assignmentCompletions)
    .where(
      and(
        eq(assignmentCompletions.userId, userId),
        inArray(
          assignmentCompletions.assignmentId,
          rows.map((row) => row.assignment.id),
        ),
      ),
    );
  return rows.map((row) => ({
    assignment: row.assignment,
    subject: row.subject,
    done: completions.some((c) => c.assignmentId === row.assignment.id && c.done),
  }));
}

export async function getExams(classroomIds: string[], from = todayISO()) {
  if (classroomIds.length === 0) return [];
  const rows = await db
    .select({ exam: exams, subject: subjects })
    .from(exams)
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(and(inArray(exams.classroomId, classroomIds), gte(exams.date, from)))
    .orderBy(asc(exams.date), asc(exams.startTime));
  return rows;
}

export async function getClassroomActivity(classroomIds: string[], limit = 10) {
  if (classroomIds.length === 0) return [];
  const rows = await db
    .select({ announcement: announcements, author: users })
    .from(announcements)
    .innerJoin(users, eq(users.id, announcements.authorId))
    .where(inArray(announcements.classroomId, classroomIds))
    .orderBy(desc(announcements.createdAt))
    .limit(limit);
  return rows;
}

/* ------------------------------------------------------------------ */
/* Classroom pages                                                     */
/* ------------------------------------------------------------------ */

export async function getClassroomSubjects(classroomId: string) {
  return db
    .select()
    .from(subjects)
    .where(eq(subjects.classroomId, classroomId))
    .orderBy(asc(subjects.name));
}

export async function getClassroomSlots(classroomId: string) {
  return db
    .select({ slot: slots, subject: subjects })
    .from(slots)
    .innerJoin(subjects, eq(subjects.id, slots.subjectId))
    .where(eq(slots.classroomId, classroomId))
    .orderBy(asc(slots.dayOfWeek), asc(slots.startTime));
}

export async function getLectureLogs(classroomId: string, options?: { subjectId?: string; status?: string }) {
  const conditions = [eq(lectureLogs.classroomId, classroomId)] as ReturnType<typeof eq>[];
  if (options?.subjectId) conditions.push(eq(lectureLogs.subjectId, options.subjectId));
  if (options?.status) conditions.push(eq(lectureLogs.status, options.status));
  const rows = await db
    .select({ log: lectureLogs, subject: subjects, author: users })
    .from(lectureLogs)
    .innerJoin(subjects, eq(subjects.id, lectureLogs.subjectId))
    .innerJoin(users, eq(users.id, lectureLogs.postedBy))
    .where(and(...conditions))
    .orderBy(desc(lectureLogs.date), desc(lectureLogs.startTime));
  return rows;
}

export async function getLectureLog(classroomId: string, logId: string) {
  const rows = await db
    .select({ log: lectureLogs, subject: subjects, author: users })
    .from(lectureLogs)
    .innerJoin(subjects, eq(subjects.id, lectureLogs.subjectId))
    .innerJoin(users, eq(users.id, lectureLogs.postedBy))
    .where(and(eq(lectureLogs.classroomId, classroomId), eq(lectureLogs.id, logId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getClassroomResources(classroomId: string, type?: string) {
  const conditions = [eq(resources.classroomId, classroomId)] as ReturnType<typeof eq>[];
  if (type) conditions.push(eq(resources.type, type));
  const rows = await db
    .select({ resource: resources, subject: subjects, uploader: users })
    .from(resources)
    .innerJoin(subjects, eq(subjects.id, resources.subjectId))
    .innerJoin(users, eq(users.id, resources.uploadedBy))
    .where(and(...conditions))
    .orderBy(desc(resources.helpfulCount));
  return rows;
}

export async function getClassroomMembers(classroomId: string) {
  return db
    .select({ member: classroomMembers, user: users })
    .from(classroomMembers)
    .innerJoin(users, eq(users.id, classroomMembers.userId))
    .where(eq(classroomMembers.classroomId, classroomId))
    .orderBy(asc(classroomMembers.joinedAt));
}

export async function getStudyGroups(classroomId: string, userId: string) {
  const rows = await db
    .select({ group: studyGroups, subject: subjects })
    .from(studyGroups)
    .leftJoin(subjects, eq(subjects.id, studyGroups.subjectId))
    .where(eq(studyGroups.classroomId, classroomId))
    .orderBy(asc(studyGroups.name));
  const memberships =
    rows.length > 0
      ? await db
          .select()
          .from(groupMembers)
          .where(
            and(
              eq(groupMembers.userId, userId),
              inArray(
                groupMembers.groupId,
                rows.map((row) => row.group.id),
              ),
            ),
          )
      : [];
  const counts = await db
    .select({ groupId: groupMembers.groupId, count: sql<number>`count(*)::int` })
    .from(groupMembers)
    .groupBy(groupMembers.groupId);
  return rows.map((row) => ({
    ...row,
    joined: memberships.some((m) => m.groupId === row.group.id),
    memberCount: counts.find((c) => c.groupId === row.group.id)?.count ?? 0,
  }));
}

/* ------------------------------------------------------------------ */
/* Attendance history                                                  */
/* ------------------------------------------------------------------ */

export async function getSubjectHistory(userId: string, subjectId: string) {
  return db
    .select()
    .from(attendance)
    .where(and(eq(attendance.userId, userId), eq(attendance.subjectId, subjectId)))
    .orderBy(desc(attendance.date), desc(attendance.startTime));
}

export async function getSubjectLogs(subjectId: string, limit = 20) {
  return db
    .select({ log: lectureLogs, author: users })
    .from(lectureLogs)
    .innerJoin(users, eq(users.id, lectureLogs.postedBy))
    .where(and(eq(lectureLogs.subjectId, subjectId), eq(lectureLogs.status, "published")))
    .orderBy(desc(lectureLogs.date), desc(lectureLogs.startTime))
    .limit(limit);
}

export function baselineCounts(records: (typeof attendance.$inferSelect)[], policy = true): AttendanceCounts {
  return countsFromRecords(
    records.map((r) => ({ status: r.status as AttendanceStatus })),
    { medicalCountsAttended: policy },
  );
}

/* ------------------------------------------------------------------ */
/* Planner                                                             */
/* ------------------------------------------------------------------ */

export interface PlannerDay {
  date: string;
  classes: TodayClass[];
  assignmentItems: AssignmentWithMeta[];
  examItems: { exam: typeof exams.$inferSelect; subject: typeof subjects.$inferSelect }[];
  events: (typeof personalEvents.$inferSelect)[];
}

export async function getPlannerRange(
  userId: string,
  classroomIds: string,
  from: string,
  to: string,
): Promise<PlannerDay[]> {
  const ids = classroomIds.length > 0 ? classroomIds.split(",") : [];
  const dates: string[] = [];
  let cursor = from;
  while (cursor <= to && dates.length < 62) {
    dates.push(cursor);
    const [y, m, d] = cursor.split("-").map(Number);
    const next = new Date(y, m - 1, d + 1);
    cursor = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
  }

  const classByDate = new Map<string, TodayClass[]>();
  const examRows = await db
    .select({ exam: exams, subject: subjects })
    .from(exams)
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(ids.length > 0 ? and(inArray(exams.classroomId, ids), gte(exams.date, from), lte(exams.date, to)) : sql`false`);
  const examByDate = new Map<string, { exam: typeof exams.$inferSelect; subject: typeof subjects.$inferSelect }[]>();
  for (const row of examRows) {
    examByDate.set(row.exam.date, [...(examByDate.get(row.exam.date) ?? []), row]);
  }

  const eventRows = await db
    .select()
    .from(personalEvents)
    .where(and(eq(personalEvents.userId, userId), gte(personalEvents.date, from), lte(personalEvents.date, to)));

  for (const date of dates) {
    classByDate.set(date, await getClassesForDate(userId, date, ids));
  }

  const assignmentRows = await getAssignments(userId, ids, { from, to });
  const assignmentByDate = new Map<string, AssignmentWithMeta[]>();
  for (const row of assignmentRows) {
    const key = row.assignment.dueAt.slice(0, 10);
    assignmentByDate.set(key, [...(assignmentByDate.get(key) ?? []), row]);
  }

  return dates.map((date) => ({
    date,
    classes: classByDate.get(date) ?? [],
    assignmentItems: assignmentByDate.get(date) ?? [],
    examItems: examByDate.get(date) ?? [],
    events: eventRows.filter((event) => event.date === date),
  }));
}

/* ------------------------------------------------------------------ */
/* Global search                                                       */
/* ------------------------------------------------------------------ */

export async function searchAll(userId: string, classroomIds: string[], query: string) {
  const q = query.trim();
  if (q.length < 2 || classroomIds.length === 0) {
    return { logs: [], resourceItems: [], pyqItems: [], assignmentItems: [], examItems: [], announcementItems: [] };
  }
  const like = `%${q}%`;

  const logRows = await db
    .select({ log: lectureLogs, subject: subjects })
    .from(lectureLogs)
    .innerJoin(subjects, eq(subjects.id, lectureLogs.subjectId))
    .where(
      and(
        inArray(lectureLogs.classroomId, classroomIds),
        eq(lectureLogs.status, "published"),
        or(sql`${lectureLogs.topic} ilike ${like}`, sql`array_to_string(${lectureLogs.keyPoints}, ' ') ilike ${like}`),
      ),
    )
    .orderBy(desc(lectureLogs.date))
    .limit(25);

  const resourceRows = await db
    .select({ resource: resources, subject: subjects })
    .from(resources)
    .innerJoin(subjects, eq(subjects.id, resources.subjectId))
    .where(
      and(
        inArray(resources.classroomId, classroomIds),
        or(sql`${resources.title} ilike ${like}`, sql`${resources.description} ilike ${like}`),
      ),
    )
    .orderBy(desc(resources.helpfulCount))
    .limit(25);

  const assignmentRows = await db
    .select({ assignment: assignments, subject: subjects })
    .from(assignments)
    .innerJoin(subjects, eq(subjects.id, assignments.subjectId))
    .where(
      and(
        inArray(assignments.classroomId, classroomIds),
        or(sql`${assignments.title} ilike ${like}`, sql`${assignments.description} ilike ${like}`),
      ),
    )
    .limit(15);

  const examRows = await db
    .select({ exam: exams, subject: subjects })
    .from(exams)
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(
      and(
        inArray(exams.classroomId, classroomIds),
        or(sql`${exams.syllabus} ilike ${like}`, sql`${subjects.name} ilike ${like}`, sql`${exams.examType} ilike ${like}`),
      ),
    )
    .limit(15);

  const announcementRows = await db
    .select({ announcement: announcements, author: users })
    .from(announcements)
    .innerJoin(users, eq(users.id, announcements.authorId))
    .where(
      and(
        inArray(announcements.classroomId, classroomIds),
        or(sql`${announcements.title} ilike ${like}`, sql`${announcements.body} ilike ${like}`),
      ),
    )
    .orderBy(desc(announcements.createdAt))
    .limit(15);

  return {
    logs: logRows,
    resourceItems: resourceRows.filter((row) => row.resource.type !== "pyq"),
    pyqItems: resourceRows.filter((row) => row.resource.type === "pyq"),
    assignmentItems: assignmentRows,
    examItems: examRows,
    announcementItems: announcementRows,
  };
}

export async function getUnreadNotificationCount(userId: string) {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows[0]?.count ?? 0;
}

export async function getNotifications(userId: string, limit = 12) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}
