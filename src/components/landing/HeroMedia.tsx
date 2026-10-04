"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useMotion } from "@/components/motion/Provider";
import { useI18n } from "@/lib/i18n/client";
import { clamp } from "@/lib/motion/hooks";

/** A photo, not a pretend video: slow camera motion and an honest pause control. */
export function HeroMedia() {
  const { enabled } = useMotion();
  const { t } = useI18n();
  const [paused, setPaused] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const playing = enabled && !paused;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !playing) return;
    let frame = 0;
    const read = () => {
      if (window.scrollY > window.innerHeight * 1.5) return;
      host.style.transform = `translate3d(0,${clamp(window.scrollY * .055,0,60)}px,0)`;
    };
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(read); };
    window.addEventListener("scroll",onScroll,{ passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll",onScroll);
      host.style.transform = "";
    };
  }, [playing]);

  return (
    <>
      <div ref={hostRef} className="design-hero-media" data-playing={playing}>
        <Image src="/images/academic-hero.jpg" alt={t("design.artAlt")} fill sizes="100vw" priority quality={90} />
      </div>
      <button
        type="button"
        className="hex-control hero-motion-control"
        onClick={() => setPaused((value) => !value)}
        disabled={!enabled}
        aria-label={playing ? t("design.pause") : t("design.play")}
        aria-pressed={paused}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          {playing ? <path d="M6 4v10M12 4v10" /> : <path d="m6 4 7 5-7 5V4Z" />}
        </svg>
      </button>
    </>
  );
}
