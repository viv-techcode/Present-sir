"use client";

import { useEffect, useRef } from "react";
import { hasFinePointer, prefersReducedMotion, useVisible } from "@/lib/motion/hooks";

/**
 * Text pressure — letters compress and stretch based on pointer proximity.
 * Falls back to static text for touch devices and reduced motion.
 */
export function TextPressure({
  text,
  className = "",
  radius = 200,
  boost = 0.42,
}: {
  text: string;
  className?: string;
  radius?: number;
  boost?: number;
}) {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const { ref: wrapRef, visible } = useVisible<HTMLDivElement>("60px");

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !visible) return;
    if (prefersReducedMotion() || !hasFinePointer()) return;

    const chars = Array.from(host.children) as HTMLElement[];
    let frame = 0;
    let active = false;
    let pointerX = Number.NEGATIVE_INFINITY;
    let centres: number[] = [];
    let values: number[] = chars.map(() => 0);

    const measure = () => {
      centres = chars.map((char) => {
        const rect = char.getBoundingClientRect();
        return rect.left + rect.width / 2;
      });
    };

    const loop = () => {
      for (let index = 0; index < chars.length; index += 1) {
        const centre = centres[index] ?? 0;
        const distance = Math.abs(pointerX - centre);
        const target = pointerX === Number.NEGATIVE_INFINITY ? 0 : Math.max(0, 1 - distance / radius);
        values[index] += (target - values[index]) * 0.18;
        const value = values[index];
        if (value < 0.004) {
          chars[index].style.transform = "";
          chars[index].style.color = "";
          continue;
        }
        chars[index].style.transform = `scaleX(${(1 + value * boost).toFixed(3)}) scaleY(${(
          1 - value * boost * 0.52
        ).toFixed(3)})`;
        chars[index].style.color = value > 0.6 ? "#ffffff" : "";
      }
      frame = requestAnimationFrame(loop);
    };

    const start = () => {
      if (active) return;
      active = true;
      measure();
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      active = false;
      cancelAnimationFrame(frame);
      values = chars.map(() => 0);
      chars.forEach((char) => {
        char.style.transform = "";
        char.style.color = "";
      });
    };

    const onMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      start();
    };
    const onLeave = () => {
      pointerX = Number.NEGATIVE_INFINITY;
    };
    const onResize = () => {
      if (active) measure();
    };

    const wrapper = wrapRef.current;
    wrapper?.addEventListener("pointermove", onMove);
    wrapper?.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);
    return () => {
      stop();
      wrapper?.removeEventListener("pointermove", onMove);
      wrapper?.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, [visible, radius, boost, wrapRef]);

  return (
    <div ref={wrapRef} className="w-full">
      <span ref={hostRef} className={`pressure ${className}`} aria-label={text}>
        {text.split("").map((char, index) => (
          <span key={`${char}-${index}`} aria-hidden="true" className="pressure-char">
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </span>
    </div>
  );
}
