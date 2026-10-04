"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion, useVisible } from "@/lib/motion/hooks";

interface Particle {
  x: number;
  y: number;
  hx: number;
  hy: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

const PALETTE = ["#ffffff", "#e6e6e6", "#c6c6c6", "#a1a1a1", "#969696"];

/**
 * Particle typography (canvas 2D — no WebGL dependency).
 * Text is rasterised, sampled into particles that spring home and repel the pointer.
 */
export function ParticleText({
  text,
  className = "",
  weight = 900,
  maxParticles = 1500,
}: {
  text: string;
  className?: string;
  weight?: number;
  maxParticles?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { ref: wrapRef, visible } = useVisible<HTMLDivElement>("120px");
  const pointer = useRef({ x: Number.NaN, y: Number.NaN, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapRef.current;
    if (!canvas || !wrapper) return;
    if (prefersReducedMotion()) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let particles: Particle[] = [];
    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const build = () => {
      const rect = wrapper.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = Math.max(320, Math.round(rect.width));
      height = Math.max(160, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const offscreen = document.createElement("canvas");
      offscreen.width = width;
      offscreen.height = height;
      const off = offscreen.getContext("2d");
      if (!off) return;

      let fontSize = Math.min(height * 0.34, width / Math.max(6, text.length) * 1.65);
      off.textAlign = "center";
      off.textBaseline = "middle";
      off.fillStyle = "#fff";
      off.font = `${weight} ${fontSize}px system-ui, sans-serif`;
      const measured = off.measureText(text);
      if (measured.width > width * 0.92) {
        fontSize *= (width * 0.92) / measured.width;
        off.font = `${weight} ${fontSize}px system-ui, sans-serif`;
      }
      off.fillText(text, width / 2, height / 2);

      const data = off.getImageData(0, 0, width, height).data;
      let step = width < 640 ? 5 : 4;
      let collected: { x: number; y: number }[] = [];
      const collect = (currentStep: number) => {
        collected = [];
        for (let y = 0; y < height; y += currentStep) {
          for (let x = 0; x < width; x += currentStep) {
            const alpha = data[(Math.round(y) * width + Math.round(x)) * 4 + 3];
            if (alpha > 128) collected.push({ x, y });
          }
        }
      };
      collect(step);
      while (collected.length > maxParticles && step < 14) {
        step += 1;
        collect(step);
      }

      particles = collected.map((point, index) => ({
        x: width / 2 + (Math.random() - 0.5) * width,
        y: height / 2 + (Math.random() - 0.5) * height,
        hx: point.x,
        hy: point.y,
        vx: 0,
        vy: 0,
        size: Math.max(1.1, step * 0.34),
        color: PALETTE[index % PALETTE.length],
      }));
    };

    const render = () => {
      context.clearRect(0, 0, width, height);
      const pointerState = pointer.current;
      for (const particle of particles) {
        particle.vx += (particle.hx - particle.x) * 0.014;
        particle.vy += (particle.hy - particle.y) * 0.014;
        if (pointerState.active) {
          const dx = particle.x - pointerState.x;
          const dy = particle.y - pointerState.y;
          const distance2 = dx * dx + dy * dy;
          if (distance2 < 14400 && distance2 > 0.01) {
            const distance = Math.sqrt(distance2);
            const force = (120 - distance) / 120;
            particle.vx += (dx / distance) * force * 3.4;
            particle.vy += (dy / distance) * force * 3.4;
          }
        }
        particle.vx *= 0.9;
        particle.vy *= 0.9;
        particle.x += particle.vx;
        particle.y += particle.vy;
        context.fillStyle = particle.color;
        context.fillRect(particle.x, particle.y, particle.size, particle.size);
      }
    };

    const loop = () => {
      if (visible && !document.hidden) render();
      frame = requestAnimationFrame(loop);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        active: true,
      };
    };
    const onPointerLeave = () => {
      pointer.current = { x: Number.NaN, y: Number.NaN, active: false };
    };
    const onResize = () => build();

    build();
    frame = requestAnimationFrame(loop);
    wrapper.addEventListener("pointermove", onPointerMove);
    wrapper.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      wrapper.removeEventListener("pointermove", onPointerMove);
      wrapper.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", onResize);
    };
  }, [text, weight, maxParticles, visible, wrapRef]);

  if (prefersReducedMotion()) {
    return (
      <div ref={wrapRef} className={`relative ${className}`}>
        <span className="text-3xl font-black tracking-tight text-white md:text-6xl">{text}</span>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <span className="sr-only">{text}</span>
      <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
    </div>
  );
}
