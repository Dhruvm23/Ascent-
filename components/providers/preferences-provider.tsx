"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { DEFAULT_MODE, type PresentationMode } from "@/lib/constants";

type Preferences = {
  mode: PresentationMode;
  motion: boolean; // true = animations on
  dyslexia: boolean;
  fontScale: number; // 0.9 .. 1.4
};

type PreferencesContextValue = Preferences & {
  setMode: (m: PresentationMode) => void;
  setMotion: (v: boolean) => void;
  setDyslexia: (v: boolean) => void;
  setFontScale: (v: number) => void;
};

const STORAGE_KEY = "ascent.prefs.v1";

const defaults: Preferences = {
  mode: DEFAULT_MODE,
  motion: true,
  dyslexia: false,
  fontScale: 1,
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({
  children,
  initialMode,
}: {
  children: React.ReactNode;
  initialMode?: PresentationMode;
}) {
  const [prefs, setPrefs] = useState<Preferences>({
    ...defaults,
    ...(initialMode ? { mode: initialMode } : {}),
  });

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Preferences>;
        // Hydrate from localStorage after mount: required to keep the first
        // client render identical to SSR (defaults), then apply saved prefs.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPrefs((p) => ({ ...p, ...parsed, ...(initialMode ? { mode: initialMode } : {}) }));
      }
    } catch {
      /* ignore malformed storage */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect preferences onto <html> as data-attrs + font scale, and persist.
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.mode = prefs.mode;
    el.dataset.motion = prefs.motion ? "on" : "off";
    el.dataset.dyslexia = prefs.dyslexia ? "on" : "off";
    el.style.setProperty("--step-base", `${prefs.fontScale}rem`);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* storage may be unavailable */
    }
  }, [prefs]);

  const setMode = useCallback((mode: PresentationMode) => setPrefs((p) => ({ ...p, mode })), []);
  const setMotion = useCallback((motion: boolean) => setPrefs((p) => ({ ...p, motion })), []);
  const setDyslexia = useCallback((dyslexia: boolean) => setPrefs((p) => ({ ...p, dyslexia })), []);
  const setFontScale = useCallback(
    (fontScale: number) => setPrefs((p) => ({ ...p, fontScale })),
    [],
  );

  return (
    <PreferencesContext.Provider
      value={{ ...prefs, setMode, setMotion, setDyslexia, setFontScale }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
