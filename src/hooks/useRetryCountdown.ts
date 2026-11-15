"use client";

import { useCallback, useEffect, useState } from "react";

export function useRetryCountdown() {
  const [seconds, setSeconds] = useState(0);
  const start = useCallback((value: unknown) => {
    const next = typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.ceil(value)) : 0;
    setSeconds(next);
  }, []);
  const clear = useCallback(() => setSeconds(0), []);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  return { seconds, start, clear };
}
