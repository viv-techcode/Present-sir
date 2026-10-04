import type { ReactNode } from "react";

/**
 * Remounts on every navigation — gives the app a fluid page transition
 * (fade + rise + de-blur) and a staggered entrance for the page's blocks.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
