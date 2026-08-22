"use client";

import { useSyncExternalStore } from "react";
import { usePreferences } from "@/components/providers/preferences-provider";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

/**
 * Single source of truth for "should we animate?": true only when the in-app
 * motion toggle is on AND the OS isn't requesting reduced motion. Uses
 * useSyncExternalStore so it's SSR-safe and reacts to OS changes without
 * setState-in-effect churn.
 */
export function useMotionEnabled(): boolean {
  const { motion } = usePreferences();
  const osReduced = useSyncExternalStore(subscribe, getSnapshot, () => false);
  return motion && !osReduced;
}
