"use client";

import { SessionProvider } from "next-auth/react";
import { PreferencesProvider } from "./preferences-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PreferencesProvider>{children}</PreferencesProvider>
    </SessionProvider>
  );
}
