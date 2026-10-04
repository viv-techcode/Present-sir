"use client";

import Image from "next/image";
import Link from "next/link";
import { useMotion } from "@/components/motion/Provider";
import { useI18n } from "@/lib/i18n/client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  clamp,
  prefersReducedMotion,
  useElementScrollProgress,
  useInView,
  useMagnetic,
  useTilt,
  useVisible,
} from "@/lib/motion/hooks";

function styleWith(vars: Record<string, string>): CSSProperties {
  return vars as CSSProperties;
}

/* ==================================================================
   LEVEL 1 — entrance reveals & text reveal
   ================================================================== */

const FROM: Record<string, string> = {
  up: "translate3d(0, 26px, 0)",
  down: "translate3d(0, -26px, 0)",
  left: "translate3d(34px, 0, 0)",
  right: "translate3d(-34px, 0, 0)",
  scale: "scale(0.92)",
  blur: "translate3d(0, 18px, 0)",
};

export function Reveal({
  children,
  direction = "up",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right" | "scale" | "blur";
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      data-direction={direction}
      className={`reveal ${inView ? "is-in" : ""} ${className}`}
      style={styleWith({
        "--reveal-delay": `${delay}ms`,
        "--reveal-from": FROM[direction] ?? FROM.up,
      })}
    >
      {children}
    </div>
  );
}

/** Staggered container — direct children reveal one after another. */
export function Stagger({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`stagger ${inView ? "is-in" : ""} ${className}`}
      style={styleWith({ "--reveal-delay": `${delay}ms` })}
    >
      {children}
    </div>
  );
}

/** Split-text entrance: every word rises out of its own mask. */
export function SplitText({
  text,
  className = "",
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>({ threshold: 0.3 });
  const words = text.split(" ");
  return (
    <span
      ref={ref}
      className={`split ${inView ? "is-in" : ""} ${className}`}
      style={styleWith({ "--reveal-delay": `${delay}ms` })}
    >
      {words.map((word, index) => (
        <span className="split-line" key={`${word}-${index}`}>
          <span className="split-word" style={styleWith({ "--i": String(index) })}>
            {word}
            {index < words.length - 1 ? "\u00A0" : ""}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Kinetic typography — continuous, subtle per-letter motion. */
export function Kinetic({ text, className = "" }: { text: string; className?: string }) {
  const letters = Array.from(text);
  return (
    <span className={`kinetic ${className}`} aria-label={text}>
      {letters.map((letter, index) => (
        <span key={`${letter}-${index}`} aria-hidden="true" style={styleWith({ "--i": String(index) })}>
          {letter === " " ? "\u00A0" : letter}
        </span>
      ))}
    </span>
  );
}

/* ==================================================================
   LEVEL 2 — magnetic, tilt, spotlight, parallax
   ================================================================== */

export function Magnetic({
  children,
  strength = 0.28,
  max = 16,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  max?: number;
  className?: string;
}) {
  const ref = useMagnetic<HTMLSpanElement>(strength, max);
  return (
    <span ref={ref} className={`magnetic ${className}`}>
      {children}
    </span>
  );
}

export function TiltCard({
  children,
  className = "",
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useTilt<HTMLDivElement>(max);
  return (
    <div ref={ref} className={`tilt ${className}`}>
      {children}
    </div>
  );
}

/** Spotlight + tilt + reveal combined — the premium card. */
export function SpotlightCard({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.12 });
  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "is-in" : ""} ${className}`}
      style={styleWith({ "--reveal-delay": `${delay}ms`, "--reveal-from": FROM.scale })}
    >
      <div className="card card-pad spotlight tilt h-full">{children}</div>
    </div>
  );
}

/** Scroll-linked parallax layer. */
export function Parallax({
  children,
  speed = 0.14,
  className = "",
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const { ref, progress } = useElementScrollProgress<HTMLDivElement>();
  const inner = useRef<HTMLDivElement | null>(null);
  const { ref: visibleRef, visible } = useVisible<HTMLDivElement>();

  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (!visible) return;
    const element = inner.current;
    if (!element) return;
    const shift = (progress - 0.5) * speed * 260;
    element.style.setProperty("--parallax-y", `${shift.toFixed(1)}px`);
  }, [progress, speed, visible]);

  return (
    <div ref={visibleRef} className={className}>
      <div ref={ref} className="h-full">
        <div ref={inner} className="parallax h-full">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ==================================================================
   LEVEL 3 — pixel transition, image masking, SVG paths, displacement
   ================================================================== */

function PixelCells({ cols = 10, rows = 6, color }: { cols?: number; rows?: number; color?: string }) {
  const cells = useMemo(
    () => Array.from({ length: cols * rows }, (_, index) => index),
    [cols, rows],
  );
  return (
    <span
      className="pixel-grid is-in"
      aria-hidden="true"
      style={styleWith({ "--cols": String(cols), "--rows": String(rows), "--pixel-color": color ?? "#969696" })}
    >
      {cells.map((index) => (
        <i key={index} style={styleWith({ "--i": String((index * 7) % (cols * rows)) })} />
      ))}
    </span>
  );
}

/** Re-runs a pixel sweep on every hover — used on primary CTAs. */
export function PixelHover({
  children,
  color,
  className = "",
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  const [key, setKey] = useState(0);
  return (
    <span
      className={`relative inline-flex ${className}`}
      onPointerEnter={() => setKey((value) => value + 1)}
    >
      {children}
      {key > 0 ? <PixelCells key={key} color={color} cols={12} rows={5} /> : null}
    </span>
  );
}

/** Pixel-dissolve media reveal with mask + zoom. */
export function PixelReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.2 });
  return (
    <div ref={ref} className={`relative overflow-hidden ${inView ? "is-in" : ""} ${className}`}>
      <div className="pixel-reveal-media zoom-media h-full w-full" style={styleWith({ "--reveal-delay": `${delay}ms` })}>
        {children}
      </div>
    </div>
  );
}

/** True displacement on hover (SVG feDisplacementMap), cross-faded for smoothness. */
export function DisplacementImage({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`displacement-wrap zoom-media relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 640px"
        className="object-cover"
        priority={priority}
      />
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        fill
        sizes="(max-width: 1024px) 100vw, 640px"
        className="displaced-copy object-cover"
      />
    </div>
  );
}

/** SVG path draw on scroll into view. */
export function PathDraw({
  d,
  className = "",
  duration = 1800,
  delay = 0,
  strokeWidth = 2,
}: {
  d: string;
  className?: string;
  duration?: number;
  delay?: number;
  strokeWidth?: number;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>({ threshold: 0.3 });
  return (
    <span ref={ref} className={`inline-flex ${inView ? "is-in" : ""} ${className}`}>
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="h-full w-full"
        aria-hidden="true"
      >
        <path
          d={d}
          fill="none"
          stroke="url(#ps-line-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          pathLength={1}
          className="path-draw"
          style={styleWith({
            "--draw-duration": `${duration}ms`,
            "--reveal-delay": `${delay}ms`,
          })}
        />
      </svg>
    </span>
  );
}

export function ScrollCue({ className = "" }: { className?: string }) {
  return <span className={`scroll-cue ${className}`} aria-hidden="true" />;
}

/* ==================================================================
   LEVEL 4 — infinite menu (velocity + drag + wrap-around)
   ================================================================== */

export interface InfiniteMenuItem {
  label: string;
  href?: string;
  emoji?: string;
}

export function InfiniteMenu({ items, speed = .45, className = "" }: { items: InfiniteMenuItem[]; speed?: number; className?: string }) {
  const { enabled } = useMotion();
  const { t } = useI18n();
  const wrapper = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const { ref: visibleRef, visible } = useVisible<HTMLDivElement>("60px");
  const [dragging,setDragging] = useState(false);

  useEffect(() => {
    const element = track.current;
    const container = wrapper.current;
    if (!element || !container || !enabled || !visible) return;
    let x = 0;
    let velocity = speed;
    let pointerX = 0;
    let dragDistance = 0;
    let isDragging = false;
    let paused = false;
    let frame = 0;
    const loop = () => {
      if (!document.hidden) {
        if (!isDragging) velocity += ((paused ? 0 : speed) - velocity) * .1;
        x -= velocity;
        const width = element.scrollWidth / 2;
        if (width > 0) { if (x <= -width) x += width; if (x > 0) x -= width; }
        element.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      }
      frame = requestAnimationFrame(loop);
    };
    const down = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      isDragging = true;
      moved.current = false;
      dragDistance = 0;
      pointerX = event.clientX;
      setDragging(true);
    };
    const move = (event: PointerEvent) => {
      if (!isDragging) return;
      const delta = event.clientX - pointerX;
      pointerX = event.clientX;
      dragDistance += Math.abs(delta);
      moved.current = dragDistance > 8;
      x += delta;
      velocity = clamp(-delta * .35,-18,18);
    };
    const up = () => { isDragging = false; setDragging(false); };
    const pause = () => { paused = true; };
    const resume = () => { paused = false; };
    frame = requestAnimationFrame(loop);
    container.addEventListener("pointerdown",down);
    container.addEventListener("pointerenter",pause);
    container.addEventListener("pointerleave",resume);
    container.addEventListener("focusin",pause);
    container.addEventListener("focusout",resume);
    window.addEventListener("pointermove",move);
    window.addEventListener("pointerup",up);
    window.addEventListener("pointercancel",up);
    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener("pointerdown",down);
      container.removeEventListener("pointerenter",pause);
      container.removeEventListener("pointerleave",resume);
      container.removeEventListener("focusin",pause);
      container.removeEventListener("focusout",resume);
      window.removeEventListener("pointermove",move);
      window.removeEventListener("pointerup",up);
      window.removeEventListener("pointercancel",up);
      element.style.transform = "";
    };
  },[enabled,visible,speed]);

  const item = (value: InfiniteMenuItem,index: number,clone = false) => value.href
    ? <Link key={`${index}-${clone}`} href={value.href} className="infinite-item chip" aria-hidden={clone || undefined} tabIndex={clone ? -1 : undefined}>{value.emoji ? <span aria-hidden="true">{value.emoji}</span> : null}{value.label}</Link>
    : <span key={`${index}-${clone}`} className="infinite-item chip" aria-hidden={clone || undefined}>{value.label}</span>;

  return (
    <div ref={visibleRef}>
      <div ref={wrapper} className={`${enabled ? "infinite-menu" : "px-5"} ${className}`} data-dragging={dragging} aria-label={t("landing.modulesTitle")} onClickCapture={(event) => { if (moved.current) { event.preventDefault(); moved.current = false; } }}>
        <div ref={track} className={enabled ? "infinite-track py-1" : "flex flex-wrap justify-center gap-3 py-1"}>
          {items.map((value,index) => item(value,index))}
          {enabled ? items.map((value,index) => item(value,index,true)) : null}
        </div>
      </div>
    </div>
  );
}
