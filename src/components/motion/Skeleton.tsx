import type { ReactNode } from "react";

/** Shimmering skeleton block (Level 1 — skeleton loading). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function LoaderDots() {
  return (
    <span className="flex items-center gap-1.5" aria-hidden="true">
      <i className="loader-dot block" />
      <i className="loader-dot block" />
      <i className="loader-dot block" />
    </span>
  );
}

/** Shared smooth loader used by every route's loading.tsx. */
export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="grid gap-4" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3">
        <LoaderDots />
        {label ? <p className="text-[13px] font-semibold uppercase tracking-widest text-slate-400">{label}</p> : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="card card-pad grid gap-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16 w-5/6" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
