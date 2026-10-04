import type { ReactNode } from "react";

/** Original Present Sir emblem. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 54" fill="none" className={className} aria-hidden="true">
      <path d="M24 2 45 14v26L24 52 3 40V14L24 2Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M14 35V18h7.5l4 4-4 5H14m15-9h7v6h-7l-4 5 4 6h7" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" />
    </svg>
  );
}

export function ArrowIcon({ direction = "right", className = "" }: {
  direction?: "right" | "down" | "diagonal";
  className?: string;
}) {
  const path = direction === "down"
    ? "M12 4v16m-6-6 6 6 6-6"
    : direction === "diagonal"
      ? "M5 19 19 5M5 5h14v14"
      : "M4 12h16m-6-6 6 6-6 6";
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`h-5 w-5 ${className}`} aria-hidden="true"><path d={path} /></svg>;
}

const paths: Record<string, ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5" /><path d="M10 21v-7h4v7" /></>,
  attendance: <><path d="M4 3v17h17M8 15l4-5 4 2 5-7" /></>,
  classroom: <><path d="M3 4h18v12H3zM8 21h8M12 16v5" /></>,
  lecture: <><path d="M4 3h12l4 4v14H4zM16 3v5h4M8 12h8M8 16h6" /></>,
  planner: <><path d="M4 6h16v15H4zM8 3v6M16 3v6M4 11h16M8 15h2M14 15h2" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  settings: <><path d="m12 2 3 2 4 1 1 4 2 3-2 3-1 4-4 1-3 2-3-2-4-1-1-4-2-3 2-3 1-4 4-1 3-2Z" /><circle cx="12" cy="12" r="3" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 22v-2a8 8 0 0 1 16 0v2" /></>,
  resources: <><path d="M3 4h7l2 3 2-3h7v16h-7l-2 2-2-2H3V4ZM12 7v15" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  shield: <><path d="m12 2 9 4v7c0 4-5 8-9 10-4-2-9-6-9-10V6l9-4Z" /><path d="m7 12 3 3 7-7" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></>,
  logout: <><path d="M9 3H4v18h5M9 12h12m-5-5 5 5-5 5" /></>,
};

export function ProductIcon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className={`h-5 w-5 shrink-0 ${className}`} aria-hidden="true">
      {paths[name] ?? paths.attendance}
    </svg>
  );
}
