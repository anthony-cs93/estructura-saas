import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAutoSaveOptions {
  save: () => Promise<void>;
  calculate?: () => Promise<void>;
  deps: unknown[];
  intervalMs?: number;
  minFeedbackMs?: number;
}

interface UseAutoSaveResult {
  isSaving: boolean;
  isCalculating: boolean;
  lastSavedAt: number | null;
  saveNow: () => Promise<void>;
}

export function useAutoSave({
  save,
  calculate,
  deps,
  intervalMs = 5 * 60 * 1000,
  minFeedbackMs = 1000,
}: UseAutoSaveOptions): UseAutoSaveResult {
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const saveRef = useRef(save);
  const calculateRef = useRef(calculate);
  saveRef.current = save;
  calculateRef.current = calculate;

  const saveNow = useCallback(async () => {
    const start = Date.now();
    setIsSaving(true);
    try {
      await saveRef.current();
      setLastSavedAt(Date.now());
    } finally {
      const remaining = minFeedbackMs - (Date.now() - start);
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
      setIsSaving(false);
    }
  }, [minFeedbackMs]);

  useEffect(() => {
    const id = setInterval(() => {
      saveNow();
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, saveNow]);

  useEffect(() => {
    if (!calculateRef.current) return;
    let inner: ReturnType<typeof setTimeout> | undefined;
    const debounce = setTimeout(() => {
      inner = setTimeout(async () => {
        setIsCalculating(true);
        try {
          await calculateRef.current?.();
        } finally {
          setIsCalculating(false);
        }
      }, 1000);
    }, 200);
    return () => {
      clearTimeout(debounce);
      if (inner) clearTimeout(inner);
    };
  }, deps);

  return { isSaving, isCalculating, lastSavedAt, saveNow };
}