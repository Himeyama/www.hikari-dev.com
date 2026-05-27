import { useEffect, useRef } from "react";

const AUTOSAVE_DELAY_MS = 2000;
const STORAGE_PREFIX = "hikari-admin-draft:";

export function useAutoSave(id: string, value: string): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${id}`, value);
      } catch {
        // localStorage may be unavailable
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [id, value]);
}

export function loadDraft(id: string): string | null {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${id}`);
  } catch {
    return null;
  }
}

export function clearDraft(id: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
  } catch {
    // ignore
  }
}
