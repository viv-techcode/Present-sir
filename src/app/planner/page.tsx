import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getPlannerRange, getUserScope } from "@/lib/queries";
import { EmptyState, LinkButton, PageHeader, Pill, SectionCard } from "@/components/shared/ui";
import { addPersonalEventAction, deletePersonalEventAction } from "@/lib/actions/attendance";
import {
  DAY_LABELS_EN,
  DAY_LABELS_HI,
  addDays,
  formatDate,
  formatTime,
  monthLabel,
  startOfWeek,
  todayISO,
  weekDates,
  monthMatrix,
} from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const user = await requireUser();
  const { t, locale } = await getI18n();
  const query = await searchParams;
  const view = query.view === "week" ? "week" : "month";
  const anchor = query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : todayISO();
  const today = todayISO();

  const scope = await getUserScope(user.id);
  const ids = scope.classroomIds.join(",");

  const from = view === "week" ? startOfWeek(anchor) : monthMatrix(anchor)[0][0];
  const to = view === "week" ? addDays(from, 6) : monthMatrix(anchor).at(-1)!.at(-1)!;
  const days = await getPlannerRange(user.id, ids, from, to);

  const dayLabels = locale === "hi" ? DAY_LABELS_HI : DAY_LABELS_EN;
  const prevHref = `/planner?view=${view}&date=${addDays(anchor, view === "week" ? -7 : -28)}`;
  const nextHref = `/planner?view=${view}&date=${addDays(anchor, view === "week" ? 7 : 28)}`;

  return (
    <div className="grid gap-4">
      <PageHeader
        title={t("planner.title")}
        subtitle={t("planner.subtitle")}
        action={
          <>
            <LinkButton href={prevHref}>{t("planner.prev")}</LinkButton>
            <LinkButton href={`/planner?view=${view === "week" ? "month" : "week"}&date=${anchor}`} variant="primary">
              {view === "week" ? t("planner.month") : t("planner.week")}
            </LinkButton>
            <LinkButton href={nextHref}>{t("planner.next")}</LinkButton>
          </>
        }
      />

      <SectionCard title={view === "week" ? `${t("planner.week")} · ${formatDate(from, locale)}` : monthLabel(anchor, locale)}>
        {view === "month" ? (
          <div className="grid grid-cols-7 gap-1 text-center">
            {dayLabels.map((label) => (
              <p key={label} className="pb-1 text-[11px] font-bold uppercase text-slate-500">
                {label.slice(0, 2)}
              </p>
            ))}
            {monthMatrix(anchor)
              .flat()
              .map((date) => {
                const day = days.find((item) => item.date === date);
                const count =
                  (day?.classes.length ?? 0) +
                  (day?.assignmentItems.length ?? 0) +
                  (day?.examItems.length ?? 0) +
                  (day?.events.length ?? 0);
                const inMonth = date.slice(0, 7) === anchor.slice(0, 7);
                return (
                  <Link
                    key={date}
                    href={`/planner?view=week&date=${date}`}
                    className={`min-h-[54px] rounded-lg border p-1 text-left md:min-h-[76px] ${
                      date === today ? "border-blue-500/60 bg-blue-500/10" : "border-white/10 bg-white/[0.02]"
                    } ${inMonth ? "" : "opacity-40"}`}
                  >
                    <p className="text-[11px] font-bold text-slate-300">{Number(date.slice(8, 10))}</p>
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {day?.classes.length ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      ) : null}
                      {day?.assignmentItems.length ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      ) : null}
                      {day?.examItems.length ? <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> : null}
                      {day?.events.length ? <span className="h-1.5 w-1.5 rounded-full bg-violet-400" /> : null}
                    </div>
                    {count > 0 ? (
                      <p className="mt-1 hidden text-[10px] text-slate-400 md:block">{count}</p>
                    ) : null}
                  </Link>
                );
              })}
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {weekDates(anchor).map((date) => {
              const day = days.find((item) => item.date === date);
              const empty =
                !day ||
                (day.classes.length === 0 &&
                  day.assignmentItems.length === 0 &&
                  day.examItems.length === 0 &&
                  day.events.length === 0);
              return (
                <li key={date} className={`rounded-2xl bg-white/[0.03] p-3 ${date === today ? "ring-1 ring-blue-500/50" : ""}`}>
                  <p className="text-[13.5px] font-bold text-white">
                    {formatDate(date, locale)} · {dayLabels[new Date(`${date}T00:00`).getDay()]}
                  </p>
                  {empty ? (
                    <p className="mt-1 text-[13px] text-slate-500">{t("planner.noItems")}</p>
                  ) : (
                    <ul className="mt-2 grid gap-1.5">
                      {day!.classes.map((item) => (
                        <li key={`${item.slot.id}-${item.slot.startTime}`} className="text-[13px] text-slate-200">
                          🔵 {item.slot.startTime} {item.subject.name}
                          {item.slot.room ? ` · ${item.slot.room}` : ""}
                        </li>
                      ))}
                      {day!.assignmentItems.map((item) => (
                        <li key={item.assignment.id} className="text-[13px] text-amber-200">
                          🟡 {t("classroom.assignments")}: {item.assignment.title}
                        </li>
                      ))}
                      {day!.examItems.map((item) => (
                        <li key={item.exam.id} className="text-[13px] text-rose-200">
                          🔴 {t("classroom.exams")}: {item.subject.name} ({item.exam.examType})
                        </li>
                      ))}
                      {day!.events.map((event) => (
                        <li key={event.id} className="flex items-center justify-between gap-2 text-[13px] text-violet-200">
                          <span>
                            🟣 {event.title} · {formatTime(event.startTime, locale)}
                          </span>
                          <form action={deletePersonalEventAction}>
                            <input type="hidden" name="id" value={event.id} />
                            <button type="submit" className="text-[12px] text-slate-400">✕</button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill tone="blue">{t("common.lecture")}</Pill>
          <Pill tone="amber">{t("classroom.assignments")}</Pill>
          <Pill tone="rose">{t("classroom.exams")}</Pill>
          <Pill tone="violet">{t("planner.personal")}</Pill>
        </div>
      </SectionCard>

      <SectionCard title={t("planner.addEvent")}>
        <form action={addPersonalEventAction} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="event-title">{t("planner.eventTitle")}</label>
              <input id="event-title" name="title" className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="event-kind">{t("common.type")}</label>
              <select id="event-kind" name="kind" className="select" defaultValue="personal">
                <option value="personal">{t("planner.personal")}</option>
                <option value="leave">{t("planner.leave")}</option>
                <option value="holiday">{t("planner.holiday")}</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="event-date">{t("common.date")}</label>
              <input id="event-date" name="date" type="date" className="input" defaultValue={anchor} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="event-start">{t("classroom.startTime")}</label>
                <input id="event-start" name="startTime" type="time" className="input" defaultValue="09:00" />
              </div>
              <div>
                <label className="label" htmlFor="event-end">{t("classroom.endTime")}</label>
                <input id="event-end" name="endTime" type="time" className="input" defaultValue="10:00" />
              </div>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">{t("action.save")}</button>
        </form>
      </SectionCard>

      {scope.classroomIds.length === 0 ? (
        <EmptyState
          message={t("home.noClassesToday")}
          hint={t("home.joinClassroomCta")}
          action={<LinkButton href="/classrooms/join" variant="primary">{t("classroom.joinClassroom")}</LinkButton>}
        />
      ) : null}
    </div>
  );
}
