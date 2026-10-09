"use client";

import clsx from "clsx";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GLOBE_DOTS } from "./globe-dots";

export interface GlobeHub {
  name: string;
  lat: number;
  lng: number;
}

type Vec = [number, number, number];

const DEG = Math.PI / 180;
const SPIN_DEG_PER_S = 5;
const TILT_DEG = 16;

/** Unit vector for a lat/lng. y = north, z = towards lng 0 on the equator. */
function toVec(lat: number, lng: number): Vec {
  const la = lat * DEG;
  const lo = lng * DEG;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
}

function decodeDots(): Float32Array {
  const bin = atob(GLOBE_DOTS);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ints = new Int16Array(bytes.buffer);
  const out = new Float32Array((ints.length / 2) * 3);
  for (let i = 0; i < ints.length / 2; i++) {
    const v = toVec(ints[i * 2] / 100, ints[i * 2 + 1] / 100);
    out.set(v, i * 3);
  }
  return out;
}

/** Plane seen from above, nose pointing up (-y), about 20 units long. */
const PLANE_PATH =
  "M0,-10 C1,-10 1.6,-9 1.6,-7.5 L1.6,-3 L9,1.5 L9,3.5 L1.6,1.6 L1.6,6 L4,8 L4,9.6 L0,8.6 L-4,9.6 L-4,8 L-1.6,6 L-1.6,1.6 L-9,3.5 L-9,1.5 L-1.6,-3 L-1.6,-7.5 C-1.6,-9 -1,-10 0,-10 Z";

interface Flight {
  from: number;
  to: number;
  /** ms timestamp when the plane leaves the runway. */
  start: number;
  duration: number;
  omega: number;
  arc: number;
}

function slerp(a: Vec, b: Vec, omega: number, t: number): Vec {
  if (omega < 1e-6) return a;
  const s = Math.sin(omega);
  const k1 = Math.sin((1 - t) * omega) / s;
  const k2 = Math.sin(t * omega) / s;
  return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
}

/**
 * Decorative spinning dotted globe with planes taking off, flying great-circle
 * arcs between hubs, and landing. Canvas only; hidden from assistive tech.
 */
export function Globe({
  hubs,
  startLng = 10,
  maxFlights = 6,
  showLabels = true,
  showControl = true,
  className,
  controlClassName,
}: {
  hubs: GlobeHub[];
  startLng?: number;
  maxFlights?: number;
  showLabels?: boolean;
  showControl?: boolean;
  className?: string;
  controlClassName?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  const controlsRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || hubs.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dots = decodeDots();
    const hubVecs = hubs.map((h) => toVec(h.lat, h.lng));
    const plane = new Path2D(PLANE_PATH);
    const monoFamily =
      getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains").trim() || "ui-monospace, monospace";

    let width = 0;
    let height = 0;
    let dpr = 1;
    let cx = 0;
    let cy = 0;
    let radius = 0;
    let lambda = startLng;
    let last = performance.now();
    let frame = 0;
    let visible = true;

    // --- flights ---------------------------------------------------------
    const makeFlight = (from: number, start: number): Flight => {
      let to = from;
      let omega = 0;
      for (let tries = 0; tries < 20; tries++) {
        to = Math.floor(Math.random() * hubs.length);
        if (to === from) continue;
        const a = hubVecs[from];
        const b = hubVecs[to];
        omega = Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
        if (omega > 0.15 && omega < 2.6) break;
      }
      return {
        from,
        to,
        start,
        omega,
        duration: 3200 + 5200 * (omega / Math.PI),
        arc: 0.05 + 0.32 * (omega / Math.PI),
      };
    };
    const now0 = performance.now();
    const flights: Flight[] = Array.from({ length: Math.min(maxFlights, hubs.length) }, (_, i) => {
      const f = makeFlight(Math.floor(Math.random() * hubs.length), now0);
      // Stagger so some planes are already in the air on load (or frozen mid-flight with reduced motion).
      f.start = now0 - f.duration * (reduceMotion ? 0.25 + (0.5 * i) / maxFlights : Math.random() * 0.9);
      return f;
    });

    // --- projection --------------------------------------------------------
    let cosL = 1;
    let sinL = 0;
    const cosT = Math.cos(TILT_DEG * DEG);
    const sinT = Math.sin(TILT_DEG * DEG);
    const project = (v: Vec, out: Vec) => {
      const x1 = v[0] * cosL - v[2] * sinL;
      const z1 = v[0] * sinL + v[2] * cosL;
      out[0] = x1;
      out[1] = v[1] * cosT - z1 * sinT;
      out[2] = v[1] * sinT + z1 * cosT;
      return out;
    };
    const tmp: Vec = [0, 0, 0];

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, width < 640 ? 1.5 : 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      if (width < 768) {
        radius = width * 0.74;
        cx = width * 0.74;
        cy = Math.min(height * 0.3, radius + 70);
      } else {
        radius = Math.min(height * 0.44, width * 0.34);
        cx = width * 0.7;
        cy = height * 0.48;
      }
    };

    const draw = (now: number) => {
      const W = canvas.width;
      const H = canvas.height;
      const R = radius * dpr;
      const CX = cx * dpr;
      const CY = cy * dpr;
      // Bring longitude `lambda` to the centre, then tilt the north pole towards the viewer.
      cosL = Math.cos(lambda * DEG);
      sinL = Math.sin(lambda * DEG);

      ctx.clearRect(0, 0, W, H);

      // Atmosphere glow.
      const glow = ctx.createRadialGradient(CX, CY, R * 0.9, CX, CY, R * 1.35);
      glow.addColorStop(0, "rgba(77, 80, 255, 0.32)");
      glow.addColorStop(0.45, "rgba(77, 80, 255, 0.08)");
      glow.addColorStop(1, "rgba(77, 80, 255, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(CX, CY, R * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // Sphere body.
      const body = ctx.createRadialGradient(CX - R * 0.35, CY - R * 0.4, R * 0.1, CX, CY, R);
      body.addColorStop(0, "#1a2160");
      body.addColorStop(0.55, "#0b0f2e");
      body.addColorStop(1, "#05060f");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.fill();

      // Land dots, bucketed by depth so each bucket is a single fill.
      const buckets: number[][] = [[], [], [], []];
      for (let i = 0; i < dots.length; i += 3) {
        tmp[0] = dots[i];
        tmp[1] = dots[i + 1];
        tmp[2] = dots[i + 2];
        project(tmp, tmp);
        if (tmp[2] <= 0.02) continue;
        const b = Math.min(3, Math.floor(tmp[2] * 4));
        buckets[b].push(CX + tmp[0] * R, CY - tmp[1] * R);
      }
      const dotSize = Math.max(1, R / 210);
      buckets.forEach((pts, b) => {
        ctx.fillStyle = `rgba(190, 200, 255, ${0.2 + b * 0.2})`;
        ctx.beginPath();
        for (let i = 0; i < pts.length; i += 2) ctx.rect(pts[i] - dotSize / 2, pts[i + 1] - dotSize / 2, dotSize, dotSize);
        ctx.fill();
      });

      // Rim light: warm on top, cool below.
      const rim = ctx.createLinearGradient(CX, CY - R, CX, CY + R);
      rim.addColorStop(0, "rgba(255, 122, 92, 0.95)");
      rim.addColorStop(0.45, "rgba(255, 122, 92, 0.15)");
      rim.addColorStop(1, "rgba(77, 80, 255, 0.7)");
      ctx.save();
      ctx.strokeStyle = rim;
      ctx.lineWidth = 1.6 * dpr;
      ctx.shadowColor = "rgba(255, 110, 80, 0.7)";
      ctx.shadowBlur = 18 * dpr;
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Flights.
      const planes: Array<{ x: number; y: number; angle: number; scale: number; alpha: number }> = [];
      const ripples: Array<{ hub: number; k: number }> = [];
      const point = (f: Flight, t: number, out: Vec): Vec => {
        const p = slerp(hubVecs[f.from], hubVecs[f.to], f.omega, t);
        const h = 1 + f.arc * Math.sin(Math.PI * t);
        out[0] = p[0] * h;
        out[1] = p[1] * h;
        out[2] = p[2] * h;
        return project(out, out);
      };
      const isVisible = (v: Vec) => v[2] > 0 || v[0] * v[0] + v[1] * v[1] > 1;

      for (const f of flights) {
        const t = (now - f.start) / f.duration;
        if (t < 0) {
          ripples.push({ hub: f.from, k: 0 });
          continue;
        }
        if (t > 1) continue;

        // Faint planned route.
        ctx.save();
        ctx.setLineDash([2 * dpr, 5 * dpr]);
        ctx.strokeStyle = "rgba(255, 140, 110, 0.22)";
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        let pen = false;
        for (let i = 0; i <= 40; i++) {
          const v = point(f, i / 40, tmp);
          if (!isVisible(v)) {
            pen = false;
            continue;
          }
          const x = CX + v[0] * R;
          const y = CY - v[1] * R;
          if (pen) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
          pen = true;
        }
        ctx.stroke();
        ctx.restore();

        // Bright trail behind the plane.
        const t0 = Math.max(0, t - 0.32);
        let prev: { x: number; y: number; ok: boolean } | null = null;
        ctx.lineCap = "round";
        for (let i = 0; i <= 24; i++) {
          const tt = t0 + ((t - t0) * i) / 24;
          const v = point(f, tt, tmp);
          const ok = isVisible(v);
          const x = CX + v[0] * R;
          const y = CY - v[1] * R;
          if (prev && prev.ok && ok) {
            ctx.strokeStyle = `rgba(255, 122, 92, ${(0.85 * i) / 24})`;
            ctx.lineWidth = (0.6 + (1.4 * i) / 24) * dpr;
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(x, y);
            ctx.stroke();
          }
          prev = { x, y, ok };
        }

        // The plane itself: small on the runway, larger at cruise altitude.
        const here = point(f, t, [0, 0, 0]);
        if (isVisible(here)) {
          const ahead = point(f, Math.min(1, t + 0.01), [0, 0, 0]);
          const behind = point(f, Math.max(0, t - 0.01), [0, 0, 0]);
          const dx = (ahead[0] - behind[0]) * R;
          const dy = -(ahead[1] - behind[1]) * R;
          const altitude = Math.sin(Math.PI * t);
          planes.push({
            x: CX + here[0] * R,
            y: CY - here[1] * R,
            angle: Math.atan2(dy, dx) + Math.PI / 2,
            scale: dpr * (0.45 + 0.6 * altitude) * Math.max(0.7, R / (dpr * 320)),
            alpha: here[2] > 0 ? 1 : 0.55,
          });
        }
        if (t < 0.12) ripples.push({ hub: f.from, k: t / 0.12 });
        if (t > 0.88) ripples.push({ hub: f.to, k: (t - 0.88) / 0.12 });
      }

      // Hubs, take-off / landing ripples and labels (skipping labels that would overlap).
      const placed: Array<[number, number, number]> = [];
      ctx.font = `${10 * dpr}px ${monoFamily}`;
      ctx.textBaseline = "middle";
      if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${dpr}px`;
      hubVecs.forEach((v, i) => {
        project(v, tmp);
        if (tmp[2] <= 0.05) return;
        const x = CX + tmp[0] * R;
        const y = CY - tmp[1] * R;
        const depth = Math.min(1, tmp[2] * 1.6);
        ctx.fillStyle = `rgba(255, 90, 54, ${0.35 * depth})`;
        ctx.beginPath();
        ctx.arc(x, y, 5 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 140, 110, ${depth})`;
        ctx.beginPath();
        ctx.arc(x, y, 2.2 * dpr, 0, Math.PI * 2);
        ctx.fill();
        if (showLabels && tmp[2] > 0.25) {
          const text = hubs[i].name.toUpperCase();
          const lx = x + 8 * dpr;
          const ly = y - 8 * dpr;
          const w = ctx.measureText(text).width;
          const clash = placed.some(([px, py, pw]) => lx < px + pw + 6 * dpr && px < lx + w + 6 * dpr && Math.abs(ly - py) < 14 * dpr);
          if (!clash) {
            placed.push([lx, ly, w]);
            ctx.fillStyle = `rgba(226, 232, 255, ${0.6 * depth})`;
            ctx.fillText(text, lx, ly);
          }
        }
      });
      for (const r of ripples) {
        project(hubVecs[r.hub], tmp);
        if (tmp[2] <= 0.05) continue;
        ctx.strokeStyle = `rgba(255, 122, 92, ${0.8 * (1 - r.k)})`;
        ctx.lineWidth = 1.2 * dpr;
        ctx.beginPath();
        ctx.arc(CX + tmp[0] * R, CY - tmp[1] * R, (4 + 14 * r.k) * dpr, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (const p of planes) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.scale(p.scale, p.scale);
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = "rgba(255, 255, 255, 0.55)";
        ctx.shadowBlur = 6 * dpr;
        ctx.fillStyle = "#ffffff";
        ctx.fill(plane);
        ctx.restore();
      }

      // Land, wait on the ground, then take off again from where it landed.
      for (let i = 0; i < flights.length; i++) {
        const f = flights[i];
        if (now - f.start > f.duration) flights[i] = makeFlight(f.to, now + 500 + Math.random() * 1400);
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      // West to east, like the real Earth: the centre longitude decreases.
      lambda = (lambda - (SPIN_DEG_PER_S * dt) / 1000) % 360;
      draw(now);
      frame = requestAnimationFrame(loop);
    };

    const start = () => {
      if (frame || reduceMotion || pausedRef.current || !visible) return;
      last = performance.now();
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    resize();
    draw(performance.now());
    start();

    const ro = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    ro.observe(wrap);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(wrap);
    controlsRef.current = { start, stop };

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      controlsRef.current = null;
    };
  }, [hubs, startLng, maxFlights, showLabels]);

  function togglePause() {
    const next = !paused;
    pausedRef.current = next;
    setPaused(next);
    if (next) controlsRef.current?.stop();
    else controlsRef.current?.start();
  }

  return (
    <>
      <div ref={wrapRef} className={clsx("pointer-events-none", className)} aria-hidden>
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
      {showControl && (
        <button
          type="button"
          onClick={togglePause}
          aria-pressed={paused}
          className={clsx(
            "inline-flex size-9 items-center justify-center border border-white/20 bg-ink-900/60 text-white/80 backdrop-blur hover:border-white/40 hover:text-white",
            controlClassName,
          )}
        >
          {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
          <span className="sr-only">{paused ? "Play globe animation" : "Pause globe animation"}</span>
        </button>
      )}
    </>
  );
}
