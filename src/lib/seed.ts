import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  announcements,
  assignments,
  attendance,
  cancellations,
  classroomMembers,
  classrooms,
  exams,
  groupMembers,
  lectureLogs,
  personalEvents,
  resources,
  slots,
  studyGroups,
  subjects,
  users,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { addDays, dayOfWeek, isValidISO, todayISO, weekParityMatches } from "@/lib/dates";

export const DEMO_JOIN_CODE = "CSE5A1";
const DEMO_PASSWORD = "presentsir";

/** Deterministic pseudo random so demo data never shifts between runs. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const SUBJECT_SEED = [
  { name: "Database Management Systems", code: "CS301", faculty: "Prof. R. Sharma", kind: "lecture", color: "blue", min: 75 },
  { name: "Operating Systems", code: "CS302", faculty: "Prof. A. Verma", kind: "lecture", color: "violet", min: 75 },
  { name: "Data Structures & Algorithms", code: "CS303", faculty: "Prof. S. Iyer", kind: "lecture", color: "emerald", min: 75 },
  { name: "Computer Networks", code: "CS304", faculty: "Prof. M. Nair", kind: "lecture", color: "amber", min: 75 },
  { name: "Theory of Computation", code: "CS305", faculty: "Prof. K. Das", kind: "lecture", color: "rose", min: 75 },
  { name: "Artificial Intelligence", code: "CS306", faculty: "Prof. P. Rao", kind: "lecture", color: "cyan", min: 75 },
];

const TIMETABLE: { day: number; start: string; end: string; code: string; room: string; type: string; batch?: string; parity?: string }[] = [
  { day: 1, start: "09:00", end: "10:00", code: "CS301", room: "L-201", type: "lecture" },
  { day: 1, start: "10:00", end: "11:00", code: "CS302", room: "L-201", type: "lecture" },
  { day: 1, start: "11:15", end: "12:15", code: "CS303", room: "L-203", type: "lecture" },
  { day: 1, start: "12:15", end: "13:15", code: "CS305", room: "L-203", type: "lecture" },
  { day: 1, start: "14:00", end: "16:00", code: "CS301", room: "DB Lab", type: "lab", batch: "Batch A" },

  { day: 2, start: "09:00", end: "10:00", code: "CS302", room: "L-204", type: "lecture" },
  { day: 2, start: "10:00", end: "11:00", code: "CS304", room: "L-204", type: "lecture" },
  { day: 2, start: "11:15", end: "12:15", code: "CS306", room: "L-202", type: "lecture" },
  { day: 2, start: "12:15", end: "13:15", code: "CS303", room: "L-202", type: "tutorial" },

  { day: 3, start: "09:00", end: "10:00", code: "CS303", room: "L-101", type: "lecture" },
  { day: 3, start: "10:00", end: "11:00", code: "CS305", room: "L-101", type: "lecture" },
  { day: 3, start: "11:15", end: "12:15", code: "CS301", room: "L-105", type: "lecture" },
  { day: 3, start: "14:00", end: "16:00", code: "CS303", room: "Prog Lab 2", type: "lab", batch: "Batch A" },

  { day: 4, start: "09:00", end: "10:00", code: "CS306", room: "L-206", type: "lecture" },
  { day: 4, start: "10:00", end: "11:00", code: "CS301", room: "L-206", type: "lecture" },
  { day: 4, start: "11:15", end: "12:15", code: "CS304", room: "L-207", type: "lecture" },
  { day: 4, start: "12:15", end: "13:15", code: "CS302", room: "L-207", type: "tutorial" },

  { day: 5, start: "09:00", end: "10:00", code: "CS305", room: "L-208", type: "lecture" },
  { day: 5, start: "10:00", end: "11:00", code: "CS304", room: "L-208", type: "lecture" },
  { day: 5, start: "11:15", end: "12:15", code: "CS302", room: "L-209", type: "lecture" },
  { day: 5, start: "14:00", end: "16:00", code: "CS306", room: "AI Lab", type: "lab", batch: "Batch A", parity: "odd" },

  { day: 6, start: "09:00", end: "10:00", code: "CS301", room: "L-301", type: "lecture" },
  { day: 6, start: "10:00", end: "11:00", code: "CS303", room: "L-301", type: "tutorial" },
];

const LOG_SEED: { code: string; topic: string; points: string[]; homework?: string }[] = [
  {
    code: "CS301",
    topic: "Normalization — 1NF, 2NF, 3NF with examples",
    points: [
      "Functional dependency and partial dependency",
      "Why 2NF removes partial dependency on composite keys",
      "Transitive dependency and 3NF decomposition",
      "BCNF vs 3NF — lossless join check",
    ],
    homework: "Solve Navathe exercise 12.5 to 12.9",
  },
  {
    code: "CS301",
    topic: "Transactions, ACID and concurrency control",
    points: ["ACID properties with banking example", "Serializability of schedules", "Two-phase locking and deadlock", "Timestamp ordering"],
    homework: "Prepare conflict-serializable schedules for the tutorial",
  },
  { code: "CS301", topic: "Indexing — B+ trees and hashing", points: ["Clustered vs non-clustered index", "B+ tree order and fanout", "Static vs dynamic hashing"], homework: "Draw a B+ tree of order 3 for 10 keys" },
  {
    code: "CS302",
    topic: "CPU scheduling — FCFS, SJF, Round Robin",
    points: ["Gantt chart practice", "Waiting time vs turnaround time", "Preemptive SJF is optimal for average waiting time", "Convoy effect in FCFS"],
    homework: "Numericals 5.2 to 5.6 from Galvin",
  },
  { code: "CS302", topic: "Deadlock — detection, avoidance, Banker's algorithm", points: ["Resource allocation graph", "Safe, unsafe and deadlock states", "Banker's algorithm worked example", "Starvation vs deadlock"], homework: "Solve Banker's algorithm for the given matrix" },
  { code: "CS302", topic: "Memory management and paging", points: ["Logical vs physical address", "Page table and TLB", "Page replacement — FIFO, LRU, Optimal", "Thrashing and working set"] },
  { code: "CS303", topic: "Binary search trees and AVL rotations", points: ["BST property and traversal", "LL, RR, LR, RL rotations", "Balance factor and height calculation"], homework: "Insert 12, 4, 20, 1, 6, 15, 25 into an AVL tree" },
  { code: "CS303", topic: "Graph algorithms — BFS, DFS, Dijkstra", points: ["Adjacency list vs matrix", "BFS gives shortest path in unweighted graphs", "Dijkstra fails with negative edges", "Topological sort using DFS"] },
  { code: "CS303", topic: "Heaps and priority queues", points: ["Heapify in O(n)", "Heap sort analysis", "Uses in Dijkstra and Huffman coding"] },
  { code: "CS304", topic: "OSI and TCP/IP model — layer by layer", points: ["Responsibility of each layer", "Encapsulation of headers", "Difference between a segment, packet and frame"], homework: "Map 5 real protocols to OSI layers" },
  { code: "CS304", topic: "Flow control and congestion control in TCP", points: ["Sliding window", "Slow start and congestion avoidance", "Fast retransmit and fast recovery", "Three-way handshake"] },
  { code: "CS305", topic: "Regular languages and finite automata", points: ["DFA design for divisibility", "NFA to DFA conversion", "Regular expressions and pumping lemma"] },
  { code: "CS306", topic: "Search strategies — BFS, DFS, A*", points: ["Uninformed vs informed search", "Admissible heuristics", "A* optimality proof sketch"], homework: "Solve the 8-puzzle with A*" },
  { code: "CS306", topic: "Decision trees and entropy", points: ["Information gain calculation", "ID3 algorithm walkthrough", "Overfitting and pruning"] },
];

const RESOURCE_SEED: { code: string; title: string; type: string; unit: string; year?: string; url: string; description: string }[] = [
  { code: "CS301", title: "Normalization full notes (Unit 3)", type: "notes", unit: "Unit 3", url: "https://drive.google.com/dbms-normalization-notes", description: "Handwritten + typed mix, covers 1NF to BCNF with university examples." },
  { code: "CS301", title: "DBMS PYQs 2019-2024", type: "pyq", unit: "All units", year: "2019-2024", url: "https://drive.google.com/dbms-pyq-bundle", description: "End-term papers with marking scheme." },
  { code: "CS301", title: "Transactions & concurrency cheatsheet", type: "notes", unit: "Unit 4", url: "https://drive.google.com/dbms-transactions-cheatsheet", description: "One page revision sheet before the mid-term." },
  { code: "CS302", title: "Deadlocks & Banker's algorithm solved set", type: "notes", unit: "Unit 5", url: "https://drive.google.com/os-deadlock-solved", description: "18 solved numericals." },
  { code: "CS302", title: "OS PYQs (Mid-term + End-term)", type: "pyq", unit: "All units", year: "2018-2024", url: "https://drive.google.com/os-pyq-bundle", description: "Includes 2024 end-term paper." },
  { code: "CS302", title: "Galvin chapter 5-8 summary video", type: "video", unit: "Unit 4", url: "https://youtube.com/watch?v=os-scheduling", description: "2 hour revision lecture." },
  { code: "CS303", title: "Trees & graphs notes", type: "notes", unit: "Unit 4-5", url: "https://drive.google.com/dsa-trees-graphs", description: "All traversals with code." },
  { code: "CS303", title: "DSA PYQ set with solutions", type: "pyq", unit: "All units", year: "2020-2024", url: "https://drive.google.com/dsa-pyq", description: "Section B is always graphs." },
  { code: "CS304", title: "OSI/TCP model notes", type: "notes", unit: "Unit 1", url: "https://drive.google.com/cn-osi-notes", description: "Layer-wise functions table." },
  { code: "CS304", title: "Computer Networks PYQs", type: "pyq", unit: "All units", year: "2019-2024", url: "https://drive.google.com/cn-pyq", description: "Numericals on sliding window included." },
  { code: "CS305", title: "Automata theory notes", type: "notes", unit: "Unit 2", url: "https://drive.google.com/toc-automata-notes", description: "DFA/NFA conversions practice." },
  { code: "CS306", title: "AI — search & decision trees notes", type: "notes", unit: "Unit 1-2", url: "https://drive.google.com/ai-search-notes", description: "A* worked examples." },
  { code: "CS306", title: "Russell & Norvig (reference book)", type: "book", unit: "All units", url: "https://example.com/russell-norvig", description: "Reference reading, chapters 3 and 18." },
];

export interface DemoWorld {
  classroomId: string;
  crId: string;
  studentId: string;
  subjects: { id: string; code: string | null }[];
}

/**
 * Creates (once) a realistic CSE Semester 5 Section A classroom with a CR,
 * a student, timetable, attendance history, lecture logs, assignments,
 * exams, notes/PYQs, announcements and a study group.
 */
export async function seedDemoWorld(): Promise<DemoWorld | null> {
  const existing = await db
    .select()
    .from(classrooms)
    .where(eq(classrooms.joinCode, DEMO_JOIN_CODE))
    .limit(1);

  if (existing[0]) {
    const classroom = existing[0];
    const subjectRows = await db
      .select()
      .from(subjects)
      .where(eq(subjects.classroomId, classroom.id));
    const student = await db
      .select()
      .from(users)
      .where(eq(users.email, "student@present.sir"))
      .limit(1);
    if (!student[0]) return null;
    return {
      classroomId: classroom.id,
      crId: classroom.createdBy,
      studentId: student[0].id,
      subjects: subjectRows.map((s) => ({ id: s.id, code: s.code })),
    };
  }

  const passwordHash = hashPassword(DEMO_PASSWORD);

  const [cr] = await db
    .insert(users)
    .values({
      name: "Aarav Mehta",
      email: "cr@present.sir",
      passwordHash,
      college: "Netaji Institute of Technology",
      branch: "CSE",
      semester: "5",
      section: "A",
    })
    .returning();

  const [student] = await db
    .insert(users)
    .values({
      name: "Riya Sharma",
      email: "student@present.sir",
      passwordHash,
      college: "Netaji Institute of Technology",
      branch: "CSE",
      semester: "5",
      section: "A",
    })
    .returning();

  const [classmate] = await db
    .insert(users)
    .values({
      name: "Kabir Singh",
      email: "kabir@present.sir",
      passwordHash,
      college: "Netaji Institute of Technology",
      branch: "CSE",
      semester: "5",
      section: "A",
    })
    .returning();

  const [classroom] = await db
    .insert(classrooms)
    .values({
      name: "CSE Sem 5 · Section A",
      college: "Netaji Institute of Technology",
      branch: "CSE",
      semester: "5",
      section: "A",
      academicYear: "2025-26",
      joinCode: DEMO_JOIN_CODE,
      minAttendance: 75,
      lectureLogMode: "cr_contributors",
      medicalCountsAttended: true,
      createdBy: cr.id,
    })
    .returning();

  await db.insert(classroomMembers).values([
    { classroomId: classroom.id, userId: cr.id, role: "cr" },
    { classroomId: classroom.id, userId: student.id, role: "member" },
    { classroomId: classroom.id, userId: classmate.id, role: "contributor" },
  ]);

  const subjectRows = await db
    .insert(subjects)
    .values(
      SUBJECT_SEED.map((s) => ({
        classroomId: classroom.id,
        name: s.name,
        code: s.code,
        faculty: s.faculty,
        kind: s.kind,
        minAttendance: s.min,
        color: s.color,
      })),
    )
    .returning();

  const byCode = new Map(subjectRows.map((s) => [s.code ?? s.name, s]));

  const slotRows = await db
    .insert(slots)
    .values(
      TIMETABLE.map((t) => ({
        classroomId: classroom.id,
        subjectId: byCode.get(t.code)!.id,
        dayOfWeek: t.day,
        startTime: t.start,
        endTime: t.end,
        room: t.room,
        type: t.type,
        batch: t.batch ?? null,
        weekParity: t.parity ?? "all",
      })),
    )
    .returning();

  const today = todayISO();
  const random = makeRandom(20260101);

  /* ---------------- attendance history (last 6 weeks) ---------------- */
  const attendanceValues: (typeof attendance.$inferInsert)[] = [];
  const logValues: (typeof lectureLogs.$inferInsert)[] = [];
  const cancellationValues: (typeof cancellations.$inferInsert)[] = [];
  /** per-subject attendance bias so the demo shows danger, caution and safe subjects */
  const bias: Record<string, number> = {
    CS301: 0.94,
    CS302: 0.6,
    CS303: 0.86,
    CS304: 0.78,
    CS305: 0.72,
    CS306: 0.9,
  };

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  for (let back = 42; back >= 0; back -= 1) {
    const date = addDays(today, -back);
    if (!isValidISO(date)) continue;
    const dow = dayOfWeek(date);
    for (const slot of slotRows) {
      if (slot.dayOfWeek !== dow) continue;
      if (!weekParityMatches(slot.weekParity, date)) continue;
      if (back === 0) {
        const [h, m] = slot.startTime.split(":").map(Number);
        if (h * 60 + (m || 0) > nowMinutes) continue;
      }
      const code = subjectRows.find((s) => s.id === slot.subjectId)?.code ?? "";
      const roll = random();

      // CR cancelled two classes in the last month — these never count.
      if ((date === addDays(today, -20) && slot.startTime === "10:00") ||
          (date === addDays(today, -9) && slot.startTime === "12:15")) {
        cancellationValues.push({
          classroomId: classroom.id,
          subjectId: slot.subjectId,
          slotId: slot.id,
          date,
          startTime: slot.startTime,
          reason: "Faculty on leave",
          createdBy: cr.id,
        });
        attendanceValues.push({
          userId: student.id,
          subjectId: slot.subjectId,
          slotId: slot.id,
          date,
          startTime: slot.startTime,
          status: "cancelled",
          source: "cr",
        });
        continue;
      }

      let status: "present" | "absent" | "medical" = roll < (bias[code] ?? 0.8) ? "present" : "absent";
      if (date === addDays(today, -14) && code === "CS302") status = "medical";
      attendanceValues.push({
        userId: student.id,
        subjectId: slot.subjectId,
        slotId: slot.id,
        date,
        startTime: slot.startTime,
        status,
        source: "self",
      });
    }
  }

  if (attendanceValues.length > 0) {
    // Guarantee the missed-class catch-up flow is demoable: the student was
    // absent in the last class of the most recent teaching day.
    const latestDate = attendanceValues.reduce(
      (latest, row) => (row.date > latest ? row.date : latest),
      attendanceValues[0].date,
    );
    const latestRows = attendanceValues
      .filter((row) => row.date === latestDate && row.status !== "cancelled")
      .sort((a, b) => ((a.startTime ?? "") < (b.startTime ?? "") ? 1 : -1));
    if (latestRows[0]) latestRows[0].status = "absent";
    await db.insert(attendance).values(attendanceValues).onConflictDoNothing();
  }
  if (cancellationValues.length > 0) {
    await db.insert(cancellations).values(cancellationValues);
  }

  /* ---------------- lecture logs ---------------- */
  const cursorByCode: Record<string, number> = {};
  const nextTopic = (code: string) => {
    const matches = LOG_SEED.map((entry, index) => ({ entry, index })).filter(
      (item) => item.entry.code === code,
    );
    if (matches.length === 0) return null;
    const cursor = cursorByCode[code] ?? 0;
    cursorByCode[code] = cursor + 1;
    return matches[cursor % matches.length].entry;
  };
  for (let back = 12; back >= 0; back -= 1) {
    const date = addDays(today, -back);
    const dow = dayOfWeek(date);
    const daySlots = slotRows.filter(
      (s) => s.dayOfWeek === dow && weekParityMatches(s.weekParity, date),
    );
    const classesHeld = daySlots.filter((slot) => {
      const record = attendanceValues.find(
        (a) => a.date === date && a.startTime === slot.startTime && a.subjectId === slot.subjectId,
      );
      return record && record.status !== "cancelled";
    });
    for (const slot of classesHeld) {
      const subject = subjectRows.find((s) => s.id === slot.subjectId)!;
      const seed = nextTopic(subject.code ?? "");
      if (!seed) continue;
      logValues.push({
        classroomId: classroom.id,
        subjectId: slot.subjectId,
        slotId: slot.id,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        topic: seed.topic,
        keyPoints: seed.points,
        homework: seed.homework ?? null,
        attachments: [],
        linkedResourceIds: [],
        linkedPyqIds: [],
        postedBy: cr.id,
        status: "published",
        helpfulCount: Math.floor(random() * 14) + 2,
      });
    }
  }

  // Make sure the flagship topics always exist for the demo subjects.
  const keyTopics = LOG_SEED.filter((l) => ["CS301", "CS302", "CS304"].includes(l.code));
  const codesWithLogs = new Set(logValues.map((l) => l.subjectId));
  for (const topic of keyTopics) {
    const subject = byCode.get(topic.code)!;
    if (codesWithLogs.has(subject.id)) continue;
    const slot = slotRows.find((s) => s.subjectId === subject.id);
    logValues.push({
      classroomId: classroom.id,
      subjectId: subject.id,
      slotId: slot?.id ?? null,
      date: addDays(today, -Math.floor(random() * 5) - 1),
      startTime: slot?.startTime ?? "09:00",
      endTime: slot?.endTime ?? "10:00",
      topic: topic.topic,
      keyPoints: topic.points,
      homework: topic.homework ?? null,
      attachments: [],
      linkedResourceIds: [],
      linkedPyqIds: [],
      postedBy: cr.id,
      status: "published",
      helpfulCount: Math.floor(random() * 18) + 3,
    });
  }

  if (logValues.length > 0) {
    const inserted = await db.insert(lectureLogs).values(logValues).returning();
    const resourceRows = await db
      .insert(resources)
      .values(
        RESOURCE_SEED.map((r) => ({
          classroomId: classroom.id,
          subjectId: byCode.get(r.code)!.id,
          title: r.title,
          type: r.type,
          unit: r.unit,
          year: r.year ?? null,
          url: r.url,
          description: r.description,
          uploadedBy: cr.id,
          verified: true,
          helpfulCount: Math.floor(random() * 20) + 1,
        })),
      )
      .returning();

    // Connect topic -> notes -> PYQ so a student can go from lecture to material.
    for (const log of inserted) {
      const linkedNotes = resourceRows
        .filter((r) => r.subjectId === log.subjectId && r.type === "notes")
        .map((r) => r.id);
      const linkedPyqs = resourceRows
        .filter((r) => r.subjectId === log.subjectId && r.type === "pyq")
        .map((r) => r.id);
      await db
        .update(lectureLogs)
        .set({ linkedResourceIds: linkedNotes, linkedPyqIds: linkedPyqs })
        .where(eq(lectureLogs.id, log.id));
    }
  } else {
    await db.insert(resources).values(
      RESOURCE_SEED.map((r) => ({
        classroomId: classroom.id,
        subjectId: byCode.get(r.code)!.id,
        title: r.title,
        type: r.type,
        unit: r.unit,
        year: r.year ?? null,
        url: r.url,
        description: r.description,
        uploadedBy: cr.id,
        verified: true,
        helpfulCount: 3,
      })),
    );
  }

  /* ---------------- assignments ---------------- */
  await db.insert(assignments).values([
    {
      classroomId: classroom.id,
      subjectId: byCode.get("CS301")!.id,
      title: "ER diagram + normalization assignment",
      description: "Design the schema for a railway reservation system and normalize it to 3NF.",
      dueAt: `${addDays(today, 2)}T23:59`,
      attachments: [{ title: "Assignment 3 brief", url: "https://drive.google.com/dbms-assignment-3" }],
      postedBy: cr.id,
    },
    {
      classroomId: classroom.id,
      subjectId: byCode.get("CS302")!.id,
      title: "Banker's algorithm numericals",
      description: "Solve the 4 processes / 3 resource types problem from the tutorial sheet.",
      dueAt: `${addDays(today, -1)}T23:59`,
      attachments: [],
      postedBy: cr.id,
    },
    {
      classroomId: classroom.id,
      subjectId: byCode.get("CS303")!.id,
      title: "Implement AVL rotations",
      description: "Submit a working repo with insert, delete and rotation visualisation.",
      dueAt: `${addDays(today, 6)}T23:59`,
      attachments: [{ title: "Starter code", url: "https://github.com/dsa-avl-starter" }],
      postedBy: cr.id,
    },
    {
      classroomId: classroom.id,
      subjectId: byCode.get("CS304")!.id,
      title: "Wireshark TCP handshake report",
      description: "Capture a handshake and explain every packet in the trace.",
      dueAt: `${addDays(today, 12)}T23:59`,
      attachments: [],
      postedBy: cr.id,
    },
    {
      classroomId: classroom.id,
      subjectId: byCode.get("CS306")!.id,
      title: "8-puzzle with A* — report + code",
      description: "Compare two heuristics on 20 random boards.",
      dueAt: `${addDays(today, 4)}T23:59`,
      attachments: [],
      postedBy: cr.id,
    },
  ]);

  /* ---------------- exams / datesheet ---------------- */
  await db.insert(exams).values([
    {
      classroomId: classroom.id,
      subjectId: byCode.get("CS301")!.id,
      examType: "midterm",
      date: addDays(today, 5),
      startTime: "10:00",
      endTime: "11:30",
      room: "Exam Hall 1",
      syllabus: "Unit 1-4: ER model, relational algebra, SQL, normalization, transactions",
    },
    {
      classroomId: classroom.id,
      subjectId: byCode.get("CS304")!.id,
      examType: "quiz",
      date: addDays(today, 2),
      startTime: "09:00",
      endTime: "09:45",
      room: "L-204",
      syllabus: "OSI model, TCP/IP, sliding window",
    },
    {
      classroomId: classroom.id,
      subjectId: byCode.get("CS302")!.id,
      examType: "endterm",
      date: addDays(today, 28),
      startTime: "14:00",
      endTime: "17:00",
      room: "Exam Hall 3",
      syllabus: "Full syllabus",
    },
    {
      classroomId: classroom.id,
      subjectId: byCode.get("CS303")!.id,
      examType: "practical",
      date: addDays(today, 9),
      startTime: "10:00",
      endTime: "12:00",
      room: "Prog Lab 2",
      syllabus: "Trees, graphs, heaps",
    },
  ]);

  /* ---------------- announcements ---------------- */
  await db.insert(announcements).values([
    {
      classroomId: classroom.id,
      authorId: cr.id,
      kind: "announcement",
      title: "DBMS mid-term syllabus finalized",
      body: "Unit 1 to Unit 4. Normalization and transactions carry the most weight. PYQ bundle is in Resources.",
      subjectId: byCode.get("CS301")!.id,
      link: `/classrooms/${classroom.id}/resources`,
    },
    {
      classroomId: classroom.id,
      authorId: cr.id,
      kind: "assignment",
      title: "New assignment: ER diagram + normalization",
      body: "Due in 2 days. Submit on the class portal.",
      subjectId: byCode.get("CS301")!.id,
      link: `/classrooms/${classroom.id}/assignments`,
    },
    {
      classroomId: classroom.id,
      authorId: cr.id,
      kind: "cancellation",
      title: "OS tutorial cancelled",
      body: "Prof. Verma is on leave. The class is removed from everyone's attendance count.",
      subjectId: byCode.get("CS302")!.id,
      link: `/classrooms/${classroom.id}`,
    },
    {
      classroomId: classroom.id,
      authorId: cr.id,
      kind: "exam",
      title: "CN quiz on OSI and TCP",
      body: "45 minutes, closed book. Check the datesheet for the room.",
      subjectId: byCode.get("CS304")!.id,
      link: `/classrooms/${classroom.id}/exams`,
    },
    {
      classroomId: classroom.id,
      authorId: cr.id,
      kind: "resource",
      title: "Uploaded: DBMS PYQ bundle 2019-2024",
      body: "Includes the 2024 end-term paper with the marking scheme.",
      subjectId: byCode.get("CS301")!.id,
      link: `/classrooms/${classroom.id}/resources`,
    },
    {
      classroomId: classroom.id,
      authorId: cr.id,
      kind: "lecture_log",
      title: "Lecture log posted: Normalization — 1NF, 2NF, 3NF",
      body: "Key points and homework are in the lecture log.",
      subjectId: byCode.get("CS301")!.id,
      link: `/classrooms/${classroom.id}/lecture-log`,
    },
  ]);

  /* ---------------- study group ---------------- */
  const [group] = await db
    .insert(studyGroups)
    .values({
      classroomId: classroom.id,
      subjectId: byCode.get("CS301")!.id,
      name: "DBMS Unit 3 squad",
      description: "Normalization + transactions revision before the mid-term.",
      createdBy: cr.id,
    })
    .returning();
  await db
    .insert(groupMembers)
    .values([
      { groupId: group.id, userId: cr.id },
      { groupId: group.id, userId: classmate.id },
    ]);

  await db.insert(personalEvents).values([
    {
      userId: student.id,
      title: "Hackathon registration deadline",
      kind: "personal",
      date: addDays(today, 3),
      startTime: "18:00",
      endTime: "19:00",
    },
    {
      userId: student.id,
      title: "Home for Diwali break",
      kind: "leave",
      date: addDays(today, 8),
      startTime: "00:00",
      endTime: "23:59",
    },
  ]);

  return {
    classroomId: classroom.id,
    crId: cr.id,
    studentId: student.id,
    subjects: subjectRows.map((s) => ({ id: s.id, code: s.code })),
  };
}

/** Used by `npx tsx src/db/seed.ts`. */
export async function seedScript() {
  const world = await seedDemoWorld();
  if (!world) {
    console.log("Demo world already seeded.");
    return;
  }
  const count = await db.select().from(subjects).where(inArray(subjects.id, world.subjects.map((s) => s.id)));
  console.log(
    `Seeded classroom ${world.classroomId} with ${count.length} subjects. Demo login: student@present.sir / presentsir`,
  );
}
