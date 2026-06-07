import { useEffect, useRef } from "react";
import type { PendingDraft } from "./types";

const AUTOSAVE_DELAY_MS = 2000;
const STORAGE_PREFIX = "hikari-admin-draft:";
const PENDING_KEY = "hikari-admin-pending";

export function useAutoSave(id: string | null, value: string): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!id) return;
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

export function savePendingEdits(edits: Record<string, PendingDraft>): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(edits));
  } catch {
    // ignore
  }
}

export function loadPendingEdits(): Record<string, PendingDraft> {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, PendingDraft>;
  } catch {
    return {};
  }
}

export function clearPendingEdits(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}
