"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { REDUCED_MOTION_QUERY, FINE_POINTER_QUERY, clamp } from "@/lib/motion/hooks";
import { useI18n } from "@/lib/i18n/client";

const MOTION_KEY = "ps-motion";
interface MotionValue { enabled: boolean; toggle: () => void; ready: boolean; reduced: boolean }
const MotionContext = createContext<MotionValue>({ enabled: false, toggle: () => {}, ready: false, reduced: false });
export function useMotion() { return useContext(MotionContext); }

function subscribeReduced(callback: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function reducedSnapshot() { return window.matchMedia(REDUCED_MOTION_QUERY).matches; }
function serverReduced() { return false; }

/** Quiet, monochrome motion. System accessibility requests always take precedence. */
export function MotionProvider({ children }: { children: ReactNode }) {
  const reduced = useSyncExternalStore(subscribeReduced, reducedSnapshot, serverReduced);
  const [preferred, setPreferred] = useState(true);
  const [ready, setReady] = useState(false);
  const [finePointer, setFinePointer] = useState(false);
  const auraRef = useRef<HTMLSpanElement>(null);
  const enabled = ready && preferred && !reduced;

  useEffect(() => {
    const fine = window.matchMedia(FINE_POINTER_QUERY);
    const frame = requestAnimationFrame(() => {
      try { setPreferred(window.localStorage.getItem(MOTION_KEY) !== "off"); } catch { /* browser may block storage */ }
      setFinePointer(fine.matches);
      setReady(true);
    });
    const onFine = () => setFinePointer(fine.matches);
    const onStorage = (event: StorageEvent) => {
      if (event.key === MOTION_KEY) setPreferred(event.newValue !== "off");
    };
    fine.addEventListener("change", onFine);
    window.addEventListener("storage", onStorage);
    return () => {
      cancelAnimationFrame(frame);
      fine.removeEventListener("change", onFine);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("motion-off", !enabled);
    document.documentElement.dataset.motion = enabled ? "on" : "off";
  }, [enabled]);

  const toggle = useCallback(() => {
    if (reduced) return;
    setPreferred((previous) => {
      const next = !previous;
      try { window.localStorage.setItem(MOTION_KEY, next ? "on" : "off"); } catch { /* preference still works in memory */ }
      return next;
    });
  }, [reduced]);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const aura = auraRef.current;
    let frame = 0;
    let x = 0;
    let y = 0;
    let currentX = 0;
    let currentY = 0;
    let following = false;
    let previousScroll = window.scrollY;
    let velocity = 0;

    const readProgress = () => {
      const distance = root.scrollHeight - window.innerHeight;
      root.style.setProperty("--scroll-progress", distance > 0 ? String(clamp(window.scrollY / distance,0,1)) : "0");
    };
    const loop = () => {
      if (document.hidden) { following = false; return; }
      if (aura && finePointer) {
        currentX += (x - currentX) * .16;
        currentY += (y - currentY) * .16;
        aura.style.transform = `translate3d(${currentX.toFixed(1)}px,${currentY.toFixed(1)}px,0)`;
      }
      velocity *= .84;
      root.style.setProperty("--scroll-velocity", velocity.toFixed(2));
      if (Math.abs(currentX - x) < .15 && Math.abs(currentY - y) < .15 && Math.abs(velocity) < .2) {
        following = false;
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!following) { following = true; frame = requestAnimationFrame(loop); }
    };
    const onMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (aura) {
        aura.dataset.visible = "true";
        const target = event.target instanceof Element ? event.target : null;
        aura.dataset.hover = target?.closest("a,button,input,select,textarea") ? "true" : "false";
        const spot = target?.closest<HTMLElement>(".spotlight");
        if (spot) {
          const rect = spot.getBoundingClientRect();
          spot.style.setProperty("--mx", `${x - rect.left}px`);
          spot.style.setProperty("--my", `${y - rect.top}px`);
        }
      }
      start();
    };
    const onScroll = () => {
      velocity = clamp(window.scrollY - previousScroll,-75,75);
      previousScroll = window.scrollY;
      readProgress();
      start();
    };
    const onDown = () => { if (aura) aura.dataset.press = "true"; };
    const onUp = () => { if (aura) aura.dataset.press = "false"; };
    const onLeave = () => { if (aura) aura.dataset.visible = "false"; };
    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame); following = false; }
      else readProgress();
    };
    window.addEventListener("pointermove",onMove,{ passive: true });
    window.addEventListener("scroll",onScroll,{ passive: true });
    window.addEventListener("resize",readProgress,{ passive: true });
    window.addEventListener("pointerdown",onDown,{ passive: true });
    window.addEventListener("pointerup",onUp,{ passive: true });
    document.addEventListener("pointerleave",onLeave);
    document.addEventListener("visibilitychange",onVisibility);
    readProgress();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove",onMove);
      window.removeEventListener("scroll",onScroll);
      window.removeEventListener("resize",readProgress);
      window.removeEventListener("pointerdown",onDown);
      window.removeEventListener("pointerup",onUp);
      document.removeEventListener("pointerleave",onLeave);
      document.removeEventListener("visibilitychange",onVisibility);
      root.style.setProperty("--scroll-velocity","0");
    };
  }, [enabled,finePointer]);

  return (
    <MotionContext.Provider value={{ enabled, toggle, ready, reduced }}>
      <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <defs>
          <linearGradient id="ps-line-gradient"><stop offset="0%" stopColor="#969696" /><stop offset="100%" stopColor="#ffffff" /></linearGradient>
          <filter id="ps-displace" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency=".006 .018" numOctaves={2} seed={7} result="psNoise">
              {enabled ? <animate attributeName="baseFrequency" dur="16s" values=".006 .018;.018 .006;.006 .018" repeatCount="indefinite" /> : null}
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="psNoise" scale="8" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      {enabled ? <span className="scroll-progress" aria-hidden="true" /> : null}
      {enabled && finePointer ? <span ref={auraRef} className="cursor-aura" aria-hidden="true" data-visible="false" /> : null}
      {enabled ? <span className="grain-layer" aria-hidden="true" /> : null}
      {children}
    </MotionContext.Provider>
  );
}

export function MotionToggle() {
  const { enabled, toggle, ready, reduced } = useMotion();
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={reduced || !ready}
      aria-pressed={enabled}
      title={reduced ? t("landing.motionNote") : t("settings.motion")}
      className={`chip ${enabled ? "chip-active" : ""}`}
    >
      <span aria-hidden="true">{enabled ? "✦" : "○"}</span>
      {!ready ? t("design.settingsMotion") : enabled ? t("settings.motionOn") : t("settings.motionOff")}
    </button>
  );
}
