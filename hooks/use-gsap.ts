"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";

type UseGSAPOptions = {
  scope?: RefObject<HTMLElement | null>;
  dependencies?: unknown[];
};

/**
 * Minimal useGSAP: runs the callback inside a gsap.context() scoped to a ref,
 * and reverts that context on cleanup so no ScrollTriggers or tweens leak.
 * (Same contract as @gsap/react's hook, without the extra dependency.)
 */
export function useGSAP(callback: () => void, options: UseGSAPOptions = {}) {
  const { scope, dependencies = [] } = options;
  const cbRef = useRef(callback);

  // Keep the latest callback in a ref (updated after render, not during it).
  useLayoutEffect(() => {
    cbRef.current = callback;
  });

  useLayoutEffect(() => {
    const ctx = gsap.context(() => cbRef.current(), scope?.current ?? undefined);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
