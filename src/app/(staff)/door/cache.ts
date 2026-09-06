// The door's memory. Tonight's list and any check-ins taken while the signal
// was gone live in IndexedDB, so a phone in a basement still knows who is
// expected and never loses an entry it has already taken.
"use client";

import type { DoorState } from "@/lib/door/roster";

const DB_NAME = "door-65";
const VERSION = 1;
const STATE = "state";
const HELD = "held";

export interface HeldEntry {
  key: string;
  subject: "ROSE" | "STEM";
  id: string;
  code?: string;
  reason?: string;
  offlineAt: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STATE)) db.createObjectStore(STATE);
      if (!db.objectStoreNames.contains(HELD)) db.createObjectStore(HELD, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(
  store: string,
  mode: IDBTransactionMode,
  work: (s: IDBObjectStore) => IDBRequest,
): Promise<T | null> {
  try {
    const db = await open();
    return await new Promise<T | null>((resolve, reject) => {
      const request = work(db.transaction(store, mode).objectStore(store));
      request.onsuccess = () => resolve((request.result as T) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    // a browser with storage switched off still works, it just forgets
    return null;
  }
}

export const saveState = (state: DoorState) =>
  run(STATE, "readwrite", (s) => s.put(state, "tonight"));

export const loadState = () => run<DoorState>(STATE, "readonly", (s) => s.get("tonight"));

export const hold = (entry: HeldEntry) => run(HELD, "readwrite", (s) => s.put(entry));

export const heldEntries = () => run<HeldEntry[]>(HELD, "readonly", (s) => s.getAll());

export const release = (key: string) => run(HELD, "readwrite", (s) => s.delete(key));
