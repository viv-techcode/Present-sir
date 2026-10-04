"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { clamp } from "@/lib/motion/hooks";
import { useMotion } from "@/components/motion/Provider";
import { ProductIcon, ArrowIcon } from "@/components/shared/Brand";
import { useI18n } from "@/lib/i18n/client";

export interface StoryStep { title: string; body: string; pill?: string }
export function StickyStory({ steps, visual, label }: { steps: StoryStep[]; visual: ReactNode; label?: string }) {
  const [active,setActive] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { t } = useI18n();
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observers = stepRefs.current.map((element,index) => {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setActive(index);
      },{ rootMargin: "-35% 0px -35% 0px" });
      if (element) observer.observe(element);
      return observer;
    });
    return () => observers.forEach((observer) => observer.disconnect());
  },[steps.length]);
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="relative h-[50vh] lg:sticky lg:top-28 lg:h-[68vh]">
        {visual}
        <div className="absolute inset-x-0 bottom-0 bg-black/90 p-6"><p className="design-eyebrow">{label ?? t("landing.storyLabel")}</p><p className="mt-3 text-lg">{steps[active]?.title}</p></div>
      </div>
      <div>{steps.map((step,index) => <div key={step.title} ref={(element) => { stepRefs.current[index] = element; }} className="flex min-h-[48vh] flex-col justify-center border-b border-white/15 py-10"><p className="design-eyebrow">{step.pill ?? String(index + 1).padStart(2,"0")}</p><h3 className="mt-5 text-3xl font-normal uppercase">{step.title}</h3><p className="design-body mt-5">{step.body}</p></div>)}</div>
    </div>
  );
}

export interface HorizontalCard { title: string; body: string; icon?: string; emoji?: string; stat?: string }

/** Real pinned progress: 0 at pin start, 1 at pin end. Static scroll-snap when motion is off. */
export function HorizontalSection({ items, label, title, hint }: { items: HorizontalCard[]; label?: string; title?: string; hint?: string }) {
  const { t } = useI18n();
  const { enabled: motion } = useMotion();
  const [desktop,setDesktop] = useState(false);
  const [progress,setProgress] = useState(0);
  const hostRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const enabled = motion && desktop;

  useEffect(() => {
    const media = window.matchMedia("(min-width:1024px)");
    const read = () => setDesktop(media.matches);
    const frame = requestAnimationFrame(read);
    media.addEventListener("change",read);
    return () => { cancelAnimationFrame(frame); media.removeEventListener("change",read); };
  },[]);

  useEffect(() => {
    if (!enabled) return;
    const host = hostRef.current;
    const track = trackRef.current;
    if (!host || !track) return;
    let frame = 0;
    const read = () => {
      const rect = host.getBoundingClientRect();
      const range = Math.max(1,host.offsetHeight - window.innerHeight);
      const next = clamp(-rect.top / range,0,1);
      const distance = Math.max(0,track.scrollWidth - window.innerWidth);
      track.style.transform = `translate3d(${(-next * distance).toFixed(1)}px,0,0)`;
      setProgress(next);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(read); };
    const observer = new ResizeObserver(schedule);
    observer.observe(host);
    schedule();
    window.addEventListener("scroll",schedule,{ passive: true });
    window.addEventListener("resize",schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll",schedule);
      window.removeEventListener("resize",schedule);
      track.style.transform = "";
    };
  },[enabled,items.length]);

  const card = (item: HorizontalCard,index: number) => (
    <article key={item.title} className="journey-card">
      <div><ProductIcon name={item.icon ?? "attendance"} className="mb-7 !h-8 !w-8" /><h3>{item.title}</h3><p>{item.body}</p></div>
      <div className="journey-number"><span>{item.stat ?? String(index + 1).padStart(2,"0")}</span><ArrowIcon className="!h-4 !w-4" /></div>
    </article>
  );
  const heading = <div className="design-container"><p className="design-eyebrow">{label ?? t("landing.scrollPlayLabel")}</p><h2 className="design-heading">{title ?? t("landing.scrollPlayTitle")}</h2></div>;

  if (!enabled) return <div className="horizontal-story py-16 md:py-20">{heading}<div className="horizontal-fallback !flex">{items.map(card)}</div></div>;

  return (
    <div ref={hostRef} className="horizontal-story horizontal-viewport" style={{ height: `${Math.max(145,items.length * 34)}vh` }}>
      <div className="horizontal-sticky"><div className="w-full">{heading}<div ref={trackRef} className="horizontal-track">{items.map(card)}</div><div className="journey-progress"><div style={{ transform: `scaleX(${progress})` }} /></div><p className="design-container mt-4 !mb-0 text-right text-[9px] uppercase tracking-[.12em] text-slate-500">{hint ?? t("landing.scrollPlayHint")} / {Math.round(progress * 100)}%</p></div></div>
    </div>
  );
}
