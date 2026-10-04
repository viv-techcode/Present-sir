import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { attendance, personalEvents, proofs, subjects } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const subjectRows = await db.select().from(subjects).where(eq(subjects.ownerId, user.id));
  const subjectIds = subjectRows.map((row) => row.id);
  const attendanceRows =
    subjectIds.length > 0
      ? await db.select().from(attendance).where(inArray(attendance.subjectId, subjectIds))
      : [];
  const proofRows = await db.select().from(proofs).where(eq(proofs.userId, user.id));
  const eventRows = await db.select().from(personalEvents).where(eq(personalEvents.userId, user.id));

  const payload = {
    exportedAt: new Date().toISOString(),
    profile: {
      name: user.name,
      email: user.email,
      college: user.college,
      branch: user.branch,
      semester: user.semester,
      section: user.section,
      minAttendance: user.minAttendance,
      locale: user.locale,
    },
    subjects: subjectRows,
    attendance: attendanceRows,
    proofs: proofRows,
    personalEvents: eventRows,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="present-sir-${user.id.slice(0, 8)}.json"`,
    },
  });
}
