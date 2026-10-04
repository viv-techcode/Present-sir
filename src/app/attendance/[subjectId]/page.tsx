import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getSubjectHistory, getSubjectLogs, getSubjectScope } from "@/lib/queries";
import {
  BigStat,
  EmptyState,
  LinkButton,
  PageHeader,
  ProgressBar,
  RiskBadge,
  SectionCard,
  StatusChip,
} from "@/components/shared/ui";
import { formatPct, type AttendanceStatus } from "@/lib/attendance-engine";
import { deleteAttendanceAction, deleteSubjectAction, markAttendanceAction } from "@/lib/actions/attendance";
import { formatDate, formatTime, todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

const MARK_OPTIONS: AttendanceStatus[] = ["present", "absent", "medical", "extra", "cancelled", "holiday"];

function Trend({ values, minPct }: { values: number[]; minPct: number }) {
  if (values.length < 2) return null;
  const width = 240;
  const height = 56;
  const step = width / (values.length - 1);
  const points = values
    .map((value, index) => `${(index * step).toFixed(1)},${(height - (value / 100) * height).toFixed(1)}`)
    .join(" ");
  const minLine = height - (minPct / 100) * height;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full" role="img" aria-label="attendance trend">
      <line x1="0" y1={minLine} x2={width} y2={minLine} stroke="rgba(244,63,94,0.5)" strokeDasharray="4 4" />
      <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  const user = await requireUser();
  const { t, locale } = await getI18n();
  const scope = await getSubjectScope(user.id, subjectId);
  if (!scope) notFound();

  const history = await getSubjectHistory(user.id, subjectId);
  const logs = await getSubjectLogs(subjectId, 12);
  const evaluation = scope.evaluation;
  const today = todayISO();

  let runningAttended = 0;
  let runningTotal = 0;
  const trend: number[] = [];
  for (const record of [...history].reverse()) {
    if (record.status === "present" || record.status === "extra" || record.status === "medical") {
      runningAttended += 1;
      runningTotal += 1;
    } else if (record.status === "absent") {
      runningTotal += 1;
    }
    if (runningTotal > 0) trend.push((runningAttended / runningTotal) * 100);
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title={scope.subject.name}
        subtitle={`${scope.subject.code ?? ""} ${scope.subject.faculty ? `· ${scope.subject.faculty}` : ""} ${
          scope.classroomName ? `· ${scope.classroomName}` : ""
        }`}
        action={
          <>
            <LinkButton href="/attendance">{t("nav.attendance")}</LinkButton>
            <LinkButton href="/attendance/what-if" variant="primary">
              {t("attendance.whatIf")}
            </LinkButton>
          </>
        }
      />

      <div className="card card-pad">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-4xl font-black leading-none text-white">{formatPct(evaluation.pct)}</p>
            <p className="mt-1 text-[13px] text-slate-400">
              {evaluation.attended}/{evaluation.total} {t("common.classes")} ·{" "}
              {t("attendance.threshold", { pct: evaluation.minPct })}
            </p>
          </div>
          <RiskBadge risk={evaluation.risk} t={t} />
        </div>
        <div className="mt-3">
          <ProgressBar pct={evaluation.pct} minPct={evaluation.minPct} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <BigStat
            value={String(evaluation.safeSkips)}
            label={t("attendance.bunkBudget")}
            tone="text-emerald-300"
          />
          <BigStat
            value={evaluation.recoveryImpossible ? "—" : String(evaluation.recoveryNeeded)}
            label={t("home.recovery", { count: evaluation.recoveryNeeded }).replace(/\d+/, "").trim() || t("risk.danger")}
            tone="text-rose-300"
          />
          <BigStat value={String(evaluation.classesToSafeBand)} label={t("risk.caution")} tone="text-amber-300" />
          <BigStat value={String(logs.length)} label={t("log.title")} tone="text-blue-300" />
        </div>
        {evaluation.recoveryImpossible ? (
          <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-[13px] text-rose-300">
            {t("attendance.cannotRecover")}
          </p>
        ) : null}
        {evaluation.recoveryNeeded > 0 ? (
          <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-[13px] text-amber-300">
            {t("attendance.recommendedAction")}: {t("attendance.attendNextN", { count: evaluation.recoveryNeeded })}
          </p>
        ) : null}
      </div>

      <SectionCard title={t("attendance.quickMark")}>
        <form action={markAttendanceAction} className="grid gap-3">
          <input type="hidden" name="subjectId" value={subjectId} />
          <input type="hidden" name="redirectTo" value={`/attendance/${subjectId}`} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="mark-date">{t("common.date")}</label>
              <input id="mark-date" name="date" type="date" className="input" defaultValue={today} required />
            </div>
            <div>
              <label className="label" htmlFor="mark-time">{t("common.time")}</label>
              <input id="mark-time" name="startTime" type="time" className="input" defaultValue="09:00" />
            </div>
          </div>
          <div className="scroll-x flex gap-2 pb-1">
            {MARK_OPTIONS.map((status) => (
              <button
                key={status}
                type="submit"
                name="status"
                value={status}
                className={`btn btn-sm ${
                  status === "present" || status === "extra"
                    ? "btn-success"
                    : status === "absent"
                      ? "btn-danger"
                      : "btn-ghost"
                }`}
              >
                {t(`status.${status}` as const)}
              </button>
            ))}
          </div>
        </form>
      </SectionCard>

      {trend.length > 1 ? (
        <SectionCard title={t("attendance.trend")}>
          <Trend values={trend} minPct={evaluation.minPct} />
          <p className="text-[12.5px] text-slate-400">
            {t("attendance.weekTrend", { weeks: history.length })}
          </p>
        </SectionCard>
      ) : null}

      <SectionCard title={t("attendance.history")}>
        {history.length === 0 ? (
          <EmptyState message={t("attendance.noHistory")} />
        ) : (
          <ul className="grid gap-2">
            {history.map((record) => (
              <li
                key={record.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-white">
                    {formatDate(record.date, locale)} · {formatTime(record.startTime, locale)}
                  </p>
                  {record.note ? (
                    <p className="text-[12.5px] text-slate-400">{record.note}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip status={record.status as AttendanceStatus} t={t} />
                  <form action={markAttendanceAction} className="flex gap-1">
                    <input type="hidden" name="subjectId" value={subjectId} />
                    <input type="hidden" name="date" value={record.date} />
                    <input type="hidden" name="startTime" value={record.startTime} />
                    <input type="hidden" name="redirectTo" value={`/attendance/${subjectId}`} />
                    <button type="submit" name="status" value="present" className="btn btn-sm btn-success">
                      {t("status.present")}
                    </button>
                    <button type="submit" name="status" value="absent" className="btn btn-sm btn-danger">
                      {t("status.absent")}
                    </button>
                  </form>
                  <form action={deleteAttendanceAction}>
                    <input type="hidden" name="id" value={record.id} />
                    <input type="hidden" name="subjectId" value={subjectId} />
                    <button type="submit" className="btn btn-sm btn-ghost">
                      ✕
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title={t("attendance.lectureHistory")}
        action={
          scope.classroomId ? (
            <Link
              href={`/classrooms/${scope.classroomId}/lecture-log`}
              className="text-[12.5px] font-semibold text-blue-400"
            >
              {t("classroom.lectureLog")} →
            </Link>
          ) : null
        }
      >
        {logs.length === 0 ? (
          <EmptyState
            message={t("log.noLogsForDay")}
            hint={scope.classroomId ? undefined : t("home.joinClassroomCta")}
          />
        ) : (
          <ul className="grid gap-2">
            {logs.map(({ log, author }) => (
              <li key={log.id} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                <Link
                  href={`/classrooms/${log.classroomId}/lecture-log/${log.id}`}
                  className="text-[14px] font-semibold text-white"
                >
                  {log.topic}
                </Link>
                <p className="mt-0.5 text-[12.5px] text-slate-400">
                  {formatDate(log.date, locale)} · {t("log.postedBy")} {author.name}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {scope.subject.classroomId === null ? (
        <SectionCard title={t("attendance.deleteSubject")}>
          <form action={deleteSubjectAction}>
            <input type="hidden" name="subjectId" value={subjectId} />
            <button type="submit" className="btn btn-danger">
              {t("action.delete")}
            </button>
          </form>
        </SectionCard>
      ) : null}
    </div>
  );
}
