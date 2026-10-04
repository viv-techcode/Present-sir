import Link from "next/link";
import type { ReactNode } from "react";
import type { RiskLevel, AttendanceStatus } from "@/lib/attendance-engine";
import type { Translator } from "@/lib/i18n/dictionaries";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 md:mb-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card card-pad ${className}`}>
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold text-white">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function RiskBadge({ risk, t }: { risk: RiskLevel; t: Translator }) {
  const label =
    risk === "danger"
      ? t("risk.danger")
      : risk === "caution"
        ? t("risk.caution")
        : risk === "safe"
          ? t("risk.safe")
          : t("risk.noData");
  const tone =
    risk === "danger"
      ? "text-rose-300"
      : risk === "caution"
        ? "text-amber-300"
        : risk === "safe"
          ? "text-emerald-300"
          : "text-slate-400";
  return (
    <span className={`badge bg-white/5 ${tone}`} data-risk={risk}>
      {label}
    </span>
  );
}

export function StatusChip({ status, t }: { status: AttendanceStatus; t: Translator }) {
  const key = `status.${status}` as const;
  const tone =
    status === "present" || status === "extra"
      ? "text-emerald-300"
      : status === "absent"
        ? "text-rose-300"
        : status === "medical"
          ? "text-sky-300"
          : "text-slate-400";
  return <span className={`badge bg-white/5 ${tone}`}>{t(key)}</span>;
}

export function ProgressBar({ pct, minPct }: { pct: number | null; minPct: number }) {
  const value = pct ?? 0;
  const color =
    pct === null
      ? "bg-slate-600"
      : value < minPct
        ? "bg-rose-500"
        : value <= minPct + 5
          ? "bg-amber-400"
          : "bg-emerald-500";
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
      <div
        className="absolute top-0 h-full w-px bg-white/50"
        style={{ left: `${Math.min(100, Math.max(0, minPct))}%` }}
        aria-hidden
      />
    </div>
  );
}

export function EmptyState({
  message,
  hint,
  action,
}: {
  message: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center">
      <p className="text-sm font-semibold text-slate-200">{message}</p>
      {hint ? <p className="mx-auto mt-1 max-w-md text-[13px] text-slate-400">{hint}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    slate: "bg-white/5 text-slate-300",
    blue: "bg-blue-500/15 text-blue-300",
    green: "bg-emerald-500/15 text-emerald-300",
    amber: "bg-amber-500/15 text-amber-300",
    rose: "bg-rose-500/15 text-rose-300",
    violet: "bg-violet-500/15 text-violet-300",
  };
  return <span className={`badge ${tones[tone] ?? tones.slate}`}>{children}</span>;
}

export function LinkButton({
  href,
  children,
  variant = "ghost",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "success" | "danger" | "warn";
}) {
  return (
    <Link href={href} className={`btn btn-${variant}`}>
      {children}
    </Link>
  );
}

export function SubjectDot({ color }: { color: string }) {
  const map: Record<string, string> = {
    blue: "bg-blue-500",
    violet: "bg-violet-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    cyan: "bg-cyan-500",
  };
  return <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${map[color] ?? "bg-slate-500"}`} />;
}

export function BigStat({
  value,
  label,
  tone = "text-white",
}: {
  value: string;
  label: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
      <p className={`text-2xl font-extrabold leading-none ${tone}`}>{value}</p>
      <p className="mt-1 text-[12px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
