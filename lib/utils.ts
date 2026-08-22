import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Map a 0..1 mastery probability to a human elevation figure (metres). */
export function masteryToElevation(pKnown: number, summit = 4000): number {
  return Math.round(clamp(pKnown, 0, 1) * summit);
}

/** Elevation-scale colour for a mastery probability (valley -> summit). */
export function masteryColor(pKnown: number): string {
  const p = clamp(pKnown, 0, 1);
  if (p < 0.5) return mix("#1f6f6b", "#a7a24e", p / 0.5);
  return mix("#a7a24e", "#f0b429", (p - 0.5) / 0.5);
}

function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function slugifySubject(subject: string): string {
  return subject
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}
