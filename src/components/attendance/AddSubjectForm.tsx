"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { createSubjectAction } from "@/lib/actions/attendance";

export function AddSubjectForm({ defaultMin }: { defaultMin: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className="btn btn-primary btn-sm">
        {open ? t("action.close") : `+ ${t("attendance.addSubject")}`}
      </button>
      {open ? (
        <form action={createSubjectAction} className="mt-3 grid gap-3 rounded-2xl bg-white/[0.03] p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="subject-name">{t("attendance.subjectName")}</label>
              <input id="subject-name" name="name" className="input" required placeholder="DBMS" />
            </div>
            <div>
              <label className="label" htmlFor="subject-code">{t("attendance.subjectCode")}</label>
              <input id="subject-code" name="code" className="input" placeholder="CS301" />
            </div>
            <div>
              <label className="label" htmlFor="subject-faculty">{t("common.faculty")}</label>
              <input id="subject-faculty" name="faculty" className="input" placeholder="Prof. R. Sharma" />
            </div>
            <div>
              <label className="label" htmlFor="subject-min">{t("attendance.minAttendance")}</label>
              <input id="subject-min" name="minAttendance" type="number" min={0} max={100} defaultValue={defaultMin} className="input" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="subject-kind">{t("common.type")}</label>
            <select id="subject-kind" name="kind" className="select" defaultValue="lecture">
              <option value="lecture">{t("common.lecture")}</option>
              <option value="lab">{t("common.lab")}</option>
              <option value="tutorial">{t("common.tutorial")}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm">{t("action.save")}</button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">
              {t("action.cancel")}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
