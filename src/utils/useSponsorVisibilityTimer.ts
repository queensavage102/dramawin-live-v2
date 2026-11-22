import { useCallback, useEffect, useRef, useState } from 'react';

export interface SponsorTimerSnapshot {
  remainingMs: number;
  secondsLeft: number;
  progressPct: number;
  isCompleting: boolean;
}

interface InternalTimerEntry {
  runId: number;
  durationMs: number;
  endsAt: number;
  isCompleting: boolean;
}

/**
 * Tracks 20s sponsor verification countdowns with smooth progress percentage,
 * wall-clock completion accuracy when viewing an external tab, and strict
 * cancellation tokens so tapping Cancel (✕) never advances progress or awards coins.
 */
export function useSponsorVisibilityTimers<K extends string>(
  onComplete: (key: K) => void | Promise<void>
) {
  const entriesRef = useRef<Partial<Record<K, InternalTimerEntry>>>({});
  const activeRunIdRef = useRef<Partial<Record<K, number>>>({});
  const nextRunIdRef = useRef(1);
  const onCompleteRef = useRef(onComplete);
  const [snapshots, setSnapshots] = useState<Partial<Record<K, SponsorTimerSnapshot>>>({});

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const syncSnapshots = useCallback((now: number) => {
    const next: Partial<Record<K, SponsorTimerSnapshot>> = {};
    const keys = Object.keys(entriesRef.current) as K[];

    for (const key of keys) {
      const entry = entriesRef.current[key];
      if (!entry || activeRunIdRef.current[key] !== entry.runId) {
        continue;
      }

      if (entry.isCompleting) {
        next[key] = {
          remainingMs: 0,
          secondsLeft: 0,
          progressPct: 100,
          isCompleting: true,
        };
        continue;
      }

      const remainingMs = Math.max(0, entry.endsAt - now);
      const elapsedMs = Math.max(0, entry.durationMs - remainingMs);
      const progressPct =
        entry.durationMs > 0
          ? Math.min(100, Math.max(0, (elapsedMs / entry.durationMs) * 100))
          : 100;

      if (remainingMs <= 0) {
        const completedRunId = entry.runId;
        entry.isCompleting = true;
        next[key] = {
          remainingMs: 0,
          secondsLeft: 0,
          progressPct: 100,
          isCompleting: true,
        };

        void Promise.resolve(onCompleteRef.current(key)).finally(() => {
          if (entriesRef.current[key]?.runId === completedRunId) {
            delete entriesRef.current[key];
          }
          if (activeRunIdRef.current[key] === completedRunId) {
            delete activeRunIdRef.current[key];
          }
          setSnapshots((prev) => {
            if (!prev[key]) return prev;
            const copy = { ...prev };
            delete copy[key];
            return copy;
          });
        });
        continue;
      }

      next[key] = {
        remainingMs,
        secondsLeft: Math.max(1, Math.ceil(remainingMs / 1000)),
        progressPct,
        isCompleting: false,
      };
    }

    setSnapshots(next);
  }, []);

  const hasAnyActive = Object.keys(snapshots).length > 0;

  useEffect(() => {
    if (!hasAnyActive) return;

    const handleResumeSync = () => {
      syncSnapshots(Date.now());
    };

    window.addEventListener('focus', handleResumeSync);
    document.addEventListener('visibilitychange', handleResumeSync);

    const intervalId = window.setInterval(() => {
      syncSnapshots(Date.now());
    }, 100);

    return () => {
      window.removeEventListener('focus', handleResumeSync);
      document.removeEventListener('visibilitychange', handleResumeSync);
      window.clearInterval(intervalId);
    };
  }, [hasAnyActive, syncSnapshots]);

  const startTimer = useCallback(
    (key: K, durationMs: number) => {
      const existing = entriesRef.current[key];
      if (existing) return;

      const now = Date.now();
      const runId = nextRunIdRef.current++;
      activeRunIdRef.current[key] = runId;

      entriesRef.current[key] = {
        runId,
        durationMs,
        endsAt: now + durationMs,
        isCompleting: false,
      };

      syncSnapshots(now);
    },
    [syncSnapshots]
  );

  const cancelTimer = useCallback((key: K) => {
    const existing = entriesRef.current[key];
    if (!existing || existing.isCompleting) return;

    delete activeRunIdRef.current[key];
    delete entriesRef.current[key];

    setSnapshots((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }, []);

  const resetAllTimers = useCallback(() => {
    entriesRef.current = {};
    activeRunIdRef.current = {};
    setSnapshots({});
  }, []);

  return {
    timers: snapshots,
    startTimer,
    cancelTimer,
    resetAllTimers,
  };
}
