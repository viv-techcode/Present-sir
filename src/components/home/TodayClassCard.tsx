"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { markAttendanceAction } from "@/lib/actions/attendance";
import { formatTime, formatTimeRange } from "@/lib/dates";
import type { AttendanceStatus } from "@/lib/attendance-engine";
import type { Translator } from "@/lib/i18n/dictionaries";

export interface TodayClassCardProps {
  date: string;
  slotId: string;
  startTime: string;
  endTime: string;
  room: string | null;
  type: string;
  batch: string | null;
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  faculty: string | null;
  color: string;
  classroomId: string;
  recordStatus: AttendanceStatus | null;
  recordId: string | null;
  log: { id: string; topic: string; status: string } | null;
  phase: "completed" | "ongoing" | "upcoming";
}

export function logStatusLabel(status: string, t: Translator) {
  if (status === "published") return t("common.published");
  if (status === "pending") return t("common.pending");
  return t("common.rejected");
}

const DOT: Record<string, string> = {
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
};

export function TodayClassCard(props: TodayClassCardProps) {
  const { t, locale } = useI18n();
  const cancelled = props.recordStatus === "cancelled";

  const tone =
    props.recordStatus === "present" || props.recordStatus === "extra"
      ? "text-emerald-300"
      : props.recordStatus === "absent"
        ? "text-rose-300"
        : props.recordStatus === "medical"
          ? "text-sky-300"
          : "text-slate-400";

  return (
    <article className="today-class-card card card-pad">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[props.color] ?? "bg-slate-500"}`} />
            <h3 className="min-w-0 text-[14px] font-semibold leading-snug text-white">{props.subjectName}</h3>
            {props.subjectCode ? (
              <span className="hidden shrink-0 text-[11px] font-semibold text-slate-500 sm:inline">{props.subjectCode}</span>
            ) : null}
          </div>
          <p className="mt-1 text-[13px] text-slate-400">
            {formatTimeRange(props.startTime, props.endTime, locale)}
            {props.room ? ` · ${props.room}` : ""}
            {props.batch ? ` · ${props.batch}` : ""}
          </p>
          {props.faculty ? (
            <p className="mt-0.5 text-[12.5px] text-slate-500">
              {props.faculty} · {props.type}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`badge bg-white/5 ${tone}`}>
            {cancelled
              ? t("status.cancelled")
              : props.recordStatus
                ? t(`status.${props.recordStatus}` as const)
                : t("common.notPosted")}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {props.phase === "ongoing"
              ? t("common.ongoing")
              : props.phase === "completed"
                ? t("common.completed")
                : t("common.upcomingClass")}
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
        {props.log ? (
          <>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              {t("home.todaysTopics")}
            </p>
            <p className="mt-1 text-[14px] font-semibold text-slate-100">{props.log.topic}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className={`badge ${
                  props.log.status === "published"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-amber-500/15 text-amber-300"
                }`}
              >
                {logStatusLabel(props.log.status, t)}
              </span>
              <Link
                href={`/classrooms/${props.classroomId}/lecture-log/${props.log.id}`}
                className="text-[12.5px] font-semibold text-blue-400"
              >
                {t("home.catchUp")} →
              </Link>
            </div>
          </>
        ) : (
          <p className="text-[13px] text-slate-500">{t("log.noLogsForDay")}</p>
        )}
      </div>

      {!cancelled ? (
        <form action={markAttendanceAction} className="mt-3 grid grid-cols-3 gap-2">
          <input type="hidden" name="subjectId" value={props.subjectId} />
          <input type="hidden" name="date" value={props.date} />
          <input type="hidden" name="startTime" value={props.startTime} />
          <input type="hidden" name="slotId" value={props.slotId} />
          <input type="hidden" name="redirectTo" value="/home" />
          <button
            type="submit"
            name="status"
            value="present"
            className={`btn btn-sm ${props.recordStatus === "present" ? "btn-success" : "btn-ghost"}`}
          >
            {t("status.present")}
          </button>
          <button
            type="submit"
            name="status"
            value="absent"
            className={`btn btn-sm ${props.recordStatus === "absent" ? "btn-danger" : "btn-ghost"}`}
          >
            {t("status.absent")}
          </button>
          <button
            type="submit"
            name="status"
            value="cancelled"
            className={`btn btn-sm ${cancelled ? "btn-warn" : "btn-ghost"}`}
          >
            {t("status.cancelled")}
          </button>
        </form>
      ) : (
        <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-[13px] text-amber-300">
          {t("classroom.cancelIntro")}
        </p>
      )}
    </article>
  );
}

export function MissedClassCard({
  subjectName,
  topic,
  keyPoints,
  homework,
  logId,
  classroomId,
  startTime,
}: {
  subjectName: string;
  topic: string;
  keyPoints: string[];
  homework: string | null;
  logId: string;
  classroomId: string;
  startTime: string;
}) {
  const { t, locale } = useI18n();
  return (
    <article className="card card-pad border-rose-500/25">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-bold text-white">
          {t("log.missedClass")} · {formatTime(startTime, locale)}
        </h3>
        <span className="badge bg-rose-500/15 text-rose-300">{subjectName}</span>
      </div>
      <p className="mt-1 text-[13px] text-slate-400">{t("log.missedClassBody")}</p>
      <div className="mt-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
        <p className="text-[14px] font-semibold text-white">{topic}</p>
        {keyPoints.length > 0 ? (
          <ul className="mt-2 grid gap-1.5">
            {keyPoints.slice(0, 4).map((point) => (
              <li key={point} className="text-[13px] text-slate-300">
                • {point}
              </li>
            ))}
          </ul>
        ) : null}
        {homework ? (
          <p className="mt-2 text-[13px] text-amber-300">📌 {homework}</p>
        ) : null}
      </div>
      <Link href={`/classrooms/${classroomId}/lecture-log/${logId}`} className="btn btn-primary btn-sm mt-3">
        {t("log.catchUp")}
      </Link>
    </article>
  );
}
