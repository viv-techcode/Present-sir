"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { createLectureLogAction, updateLectureLogAction } from "@/lib/actions/lecture-log";
import { dayOfWeek } from "@/lib/dates";

export interface LogFormSlot {
  id: string;
  subjectId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
}

export interface LogFormResource {
  id: string;
  title: string;
  type: string;
  subjectId: string;
}

export interface LogFormValues {
  logId?: string;
  subjectId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  topic?: string;
  keyPoints?: string[];
  homework?: string | null;
  linkedResourceIds?: string[];
  linkedPyqIds?: string[];
  attachments?: { title: string; url: string }[];
}

export function LectureLogForm({
  classroomId,
  subjects,
  slots,
  resources,
  defaultDate,
  initial,
}: {
  classroomId: string;
  subjects: { id: string; name: string }[];
  slots: LogFormSlot[];
  resources: LogFormResource[];
  defaultDate: string;
  initial?: LogFormValues;
}) {
  const { t } = useI18n();
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? subjects[0]?.id ?? "");
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [slotId, setSlotId] = useState("");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "10:00");
  const [attachments, setAttachments] = useState(initial?.attachments?.length ? initial.attachments : []);

  const matchingSlots = useMemo(() => {
    if (!subjectId || !date) return [];
    const dow = dayOfWeek(date);
    return slots.filter((slot) => slot.subjectId === subjectId && slot.dayOfWeek === dow);
  }, [slots, subjectId, date]);

  const subjectResources = useMemo(
    () => resources.filter((item) => item.subjectId === subjectId),
    [resources, subjectId],
  );
  const notes = subjectResources.filter((item) => item.type !== "pyq");
  const pyqs = subjectResources.filter((item) => item.type === "pyq");

  function applySlot(value: string) {
    setSlotId(value);
    const slot = matchingSlots.find((item) => item.id === value);
    if (slot) {
      setStartTime(slot.startTime);
      setEndTime(slot.endTime);
    }
  }

  return (
    <form
      action={initial?.logId ? updateLectureLogAction : createLectureLogAction}
      className="grid gap-3"
    >
      <input type="hidden" name="classroomId" value={classroomId} />
      {initial?.logId ? <input type="hidden" name="logId" value={initial.logId} /> : null}
      <input type="hidden" name="slotId" value={slotId} />

      <div className="grid gap-3 rounded-2xl bg-white/[0.03] p-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="log-subject">
            {t("common.subject")}
          </label>
          <select
            id="log-subject"
            name="subjectId"
            className="select"
            value={subjectId}
            onChange={(event) => {
              setSubjectId(event.target.value);
              setSlotId("");
            }}
            required
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="log-date">
            {t("common.date")}
          </label>
          <input
            id="log-date"
            name="date"
            type="date"
            className="input"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setSlotId("");
            }}
            required
          />
        </div>
        {matchingSlots.length > 0 ? (
          <div>
            <label className="label" htmlFor="log-slot">
              {t("classroom.timetable")}
            </label>
            <select id="log-slot" className="select" value={slotId} onChange={(event) => applySlot(event.target.value)}>
              <option value="">{t("common.none")}</option>
              {matchingSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.startTime}–{slot.endTime} {slot.room ? `· ${slot.room}` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="log-start">
              {t("classroom.startTime")}
            </label>
            <input
              id="log-start"
              name="startTime"
              type="time"
              className="input"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="log-end">
              {t("classroom.endTime")}
            </label>
            <input
              id="log-end"
              name="endTime"
              type="time"
              className="input"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="log-topic">
          {t("log.topic")} <span className="text-rose-400">({t("common.required")})</span>
        </label>
        <input
          id="log-topic"
          name="topic"
          className="input"
          placeholder={t("log.topicPlaceholder")}
          defaultValue={initial?.topic ?? ""}
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="log-keypoints">
          {t("log.keyPoints")} <span className="text-slate-500">({t("common.optional")})</span>
        </label>
        <textarea
          id="log-keypoints"
          name="keyPoints"
          className="textarea"
          placeholder={t("log.keyPointsHelp")}
          defaultValue={initial?.keyPoints?.join("\n") ?? ""}
        />
      </div>

      <div>
        <label className="label" htmlFor="log-homework">
          {t("log.homework")} <span className="text-slate-500">({t("common.optional")})</span>
        </label>
        <input id="log-homework" name="homework" className="input" defaultValue={initial?.homework ?? ""} />
      </div>

      <div className="rounded-2xl bg-white/[0.03] p-3">
        <p className="label">{t("log.attachments")}</p>
        {attachments.map((attachment, index) => (
          <div key={`attachment-${index}`} className="mb-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              name="attachmentTitle"
              className="input"
              placeholder={t("log.attachmentTitle")}
              defaultValue={attachment.title}
            />
            <input
              name="attachmentUrl"
              className="input"
              placeholder={t("log.attachmentUrl")}
              defaultValue={attachment.url}
            />
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setAttachments((rows) => rows.filter((_, i) => i !== index))}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => setAttachments((rows) => [...rows, { title: "", url: "" }])}
        >
          + {t("log.addAttachment")}
        </button>
      </div>

      {subjectResources.length > 0 ? (
        <div className="grid gap-3 rounded-2xl bg-white/[0.03] p-3 sm:grid-cols-2">
          <fieldset>
            <legend className="label">{t("log.linkedResources")}</legend>
            <div className="grid max-h-40 gap-1.5 overflow-y-auto">
              {notes.map((item) => (
                <label key={item.id} className="flex items-start gap-2 text-[13px] text-slate-300">
                  <input
                    type="checkbox"
                    name="linkedResourceIds"
                    value={item.id}
                    defaultChecked={initial?.linkedResourceIds?.includes(item.id)}
                    className="mt-0.5 h-4 w-4 accent-blue-500"
                  />
                  {item.title}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">{t("log.linkedPyqs")}</legend>
            <div className="grid max-h-40 gap-1.5 overflow-y-auto">
              {pyqs.map((item) => (
                <label key={item.id} className="flex items-start gap-2 text-[13px] text-slate-300">
                  <input
                    type="checkbox"
                    name="linkedPyqIds"
                    value={item.id}
                    defaultChecked={initial?.linkedPyqIds?.includes(item.id)}
                    className="mt-0.5 h-4 w-4 accent-blue-500"
                  />
                  {item.title}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}

      <button type="submit" className="btn btn-primary btn-block">
        {initial?.logId ? t("action.save") : t("log.addLog")}
      </button>
      <p className="text-[12.5px] text-slate-500">{t("log.addLogIntro")}</p>
    </form>
  );
}
