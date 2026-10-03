import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Users, sessions, profiles                                           */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  passwordHash: text("password_hash"),
  isGuest: boolean("is_guest").notNull().default(false),
  locale: text("locale").notNull().default("en"),
  minAttendance: integer("min_attendance").notNull().default(75),
  college: text("college"),
  branch: text("branch"),
  semester: text("semester"),
  section: text("section"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("users_email_unique").on(t.email),
]);

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Classrooms                                                          */
/* ------------------------------------------------------------------ */

export const classrooms = pgTable("classrooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  college: text("college").notNull(),
  branch: text("branch").notNull(),
  semester: text("semester").notNull(),
  section: text("section").notNull(),
  academicYear: text("academic_year").notNull(),
  joinCode: text("join_code").notNull(),
  /** global minimum attendance % for the classroom, overridable per subject */
  minAttendance: integer("min_attendance").notNull().default(75),
  /** who may create lecture logs: cr_only | cr_contributors | open_approved | open */
  lectureLogMode: text("lecture_log_mode").notNull().default("cr_contributors"),
  /** whether medical / approved leave counts as attended */
  medicalCountsAttended: boolean("medical_counts_attended").notNull().default(true),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("classrooms_join_code_unique").on(t.joinCode),
]);

export const classroomMembers = pgTable("classroom_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  classroomId: uuid("classroom_id").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** cr | co_admin | contributor | member */
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("classroom_members_unique").on(t.classroomId, t.userId),
  index("classroom_members_user_idx").on(t.userId),
]);

/* ------------------------------------------------------------------ */
/* Subjects + timetable slots                                          */
/* ------------------------------------------------------------------ */

export const subjects = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** null classroomId = personal (solo) subject owned by ownerId */
  classroomId: uuid("classroom_id").references(() => classrooms.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code"),
  faculty: text("faculty"),
  /** lecture | lab | tutorial | practical */
  kind: text("kind").notNull().default("lecture"),
  minAttendance: integer("min_attendance").notNull().default(75),
  color: text("color").notNull().default("blue"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("subjects_owner_idx").on(t.ownerId),
  index("subjects_classroom_idx").on(t.classroomId),
]);

export const slots = pgTable("slots", {
  id: uuid("id").defaultRandom().primaryKey(),
  classroomId: uuid("classroom_id").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  /** 0 = Sunday ... 6 = Saturday */
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  room: text("room"),
  /** lecture | lab | tutorial */
  type: text("type").notNull().default("lecture"),
  /** all | odd | even (week parity) */
  weekParity: text("week_parity").notNull().default("all"),
  /** lab batch label, optional */
  batch: text("batch"),
}, (t) => [
  index("slots_classroom_idx").on(t.classroomId),
]);

/* ------------------------------------------------------------------ */
/* Attendance                                                          */
/* ------------------------------------------------------------------ */

export const attendance = pgTable("attendance", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  slotId: uuid("slot_id").references(() => slots.id, { onDelete: "set null" }),
  /** YYYY-MM-DD */
  date: text("date").notNull(),
  startTime: text("start_time").notNull().default("00:00"),
  /** present | absent | cancelled | holiday | medical | extra */
  status: text("status").notNull(),
  note: text("note"),
  source: text("source").notNull().default("self"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("attendance_unique_entry").on(t.userId, t.subjectId, t.date, t.startTime),
  index("attendance_user_subject_idx").on(t.userId, t.subjectId),
]);

/** CR-declared cancellations: excluded from every member's denominator */
export const cancellations = pgTable("cancellations", {
  id: uuid("id").defaultRandom().primaryKey(),
  classroomId: uuid("classroom_id").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  slotId: uuid("slot_id").references(() => slots.id, { onDelete: "set null" }),
  date: text("date").notNull(),
  startTime: text("start_time").notNull().default("00:00"),
  reason: text("reason"),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("cancellations_classroom_idx").on(t.classroomId, t.date),
]);

/* ------------------------------------------------------------------ */
/* Lecture log (flagship)                                              */
/* ------------------------------------------------------------------ */

export type Attachment = { title: string; url: string };

export const lectureLogs = pgTable("lecture_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  classroomId: uuid("classroom_id").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  slotId: uuid("slot_id").references(() => slots.id, { onDelete: "set null" }),
  /** YYYY-MM-DD */
  date: text("date").notNull(),
  startTime: text("start_time").notNull().default("00:00"),
  endTime: text("end_time").notNull().default("00:00"),
  topic: text("topic").notNull(),
  keyPoints: text("key_points").array().notNull().default([]),
  homework: text("homework"),
  attachments: jsonb("attachments").$type<Attachment[]>().notNull().default([]),
  linkedResourceIds: text("linked_resource_ids").array().notNull().default([]),
  linkedPyqIds: text("linked_pyq_ids").array().notNull().default([]),
  postedBy: uuid("posted_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** published | pending | rejected */
  status: text("status").notNull().default("published"),
  helpfulCount: integer("helpful_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("lecture_logs_classroom_idx").on(t.classroomId, t.date),
  index("lecture_logs_subject_idx").on(t.subjectId),
]);

export const lectureLogHelpful = pgTable("lecture_log_helpful", {
  logId: uuid("log_id").notNull().references(() => lectureLogs.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.logId, t.userId] })]);

/* ------------------------------------------------------------------ */
/* Assignments                                                         */
/* ------------------------------------------------------------------ */

export const assignments = pgTable("assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  classroomId: uuid("classroom_id").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  /** ISO timestamp */
  dueAt: text("due_at").notNull(),
  attachments: jsonb("attachments").$type<Attachment[]>().notNull().default([]),
  postedBy: uuid("posted_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("assignments_classroom_idx").on(t.classroomId, t.dueAt)]);

export const assignmentCompletions = pgTable("assignment_completions", {
  assignmentId: uuid("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  done: boolean("done").notNull().default(false),
  doneAt: timestamp("done_at", { withTimezone: true }),
}, (t) => [primaryKey({ columns: [t.assignmentId, t.userId] })]);

/* ------------------------------------------------------------------ */
/* Exams / datesheet                                                   */
/* ------------------------------------------------------------------ */

export const exams = pgTable("exams", {
  id: uuid("id").defaultRandom().primaryKey(),
  classroomId: uuid("classroom_id").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  examType: text("exam_type").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull().default("10:00"),
  endTime: text("end_time").notNull().default("12:00"),
  room: text("room"),
  syllabus: text("syllabus"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("exams_classroom_idx").on(t.classroomId, t.date)]);

/* ------------------------------------------------------------------ */
/* Resources (notes / PYQs / books / videos)                           */
/* ------------------------------------------------------------------ */

export const resources = pgTable("resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  classroomId: uuid("classroom_id").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  /** notes | pyq | book | video | other */
  type: text("type").notNull().default("notes"),
  unit: text("unit"),
  year: text("year"),
  url: text("url").notNull(),
  description: text("description"),
  uploadedBy: uuid("uploaded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  verified: boolean("verified").notNull().default(false),
  helpfulCount: integer("helpful_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("resources_classroom_idx").on(t.classroomId, t.type)]);

/* ------------------------------------------------------------------ */
/* Feed / announcements                                                */
/* ------------------------------------------------------------------ */

export const announcements = pgTable("announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  classroomId: uuid("classroom_id").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** announcement | cancellation | assignment | exam | resource | lecture_log | join */
  kind: text("kind").notNull().default("announcement"),
  title: text("title").notNull(),
  body: text("body"),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  link: text("link"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("announcements_classroom_idx").on(t.classroomId, t.createdAt)]);

/* ------------------------------------------------------------------ */
/* Personal data                                                       */
/* ------------------------------------------------------------------ */

export const proofs = pgTable("proofs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  /** medical | event | other */
  kind: text("kind").notNull().default("medical"),
  url: text("url"),
  /** YYYY-MM-DD */
  date: text("date").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("proofs_user_idx").on(t.userId, t.date)]);

export const personalEvents = pgTable("personal_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  /** class | assignment | exam | personal | leave | holiday */
  kind: text("kind").notNull().default("personal"),
  date: text("date").notNull(),
  startTime: text("start_time").notNull().default("09:00"),
  endTime: text("end_time").notNull().default("10:00"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("personal_events_user_idx").on(t.userId, t.date)]);

/* ------------------------------------------------------------------ */
/* Study groups                                                        */
/* ------------------------------------------------------------------ */

export const studyGroups = pgTable("study_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  classroomId: uuid("classroom_id").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupMembers = pgTable("group_members", {
  groupId: uuid("group_id").notNull().references(() => studyGroups.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.groupId, t.userId] })]);

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  classroomId: uuid("classroom_id").references(() => classrooms.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("info"),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)]);

export type User = typeof users.$inferSelect;
export type Classroom = typeof classrooms.$inferSelect;
export type ClassroomMember = typeof classroomMembers.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type Slot = typeof slots.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type LectureLog = typeof lectureLogs.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Exam = typeof exams.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type Proof = typeof proofs.$inferSelect;
export type PersonalEvent = typeof personalEvents.$inferSelect;
export type StudyGroup = typeof studyGroups.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
