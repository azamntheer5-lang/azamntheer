import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";

export interface HistoryEntry {
  id: string;
  type: "pdf" | "word" | "excel" | "image" | "scan" | "ocr" | "ai";
  operation: string;
  fileName?: string;
  fileSize?: number;
  timestamp: number;
  status: "success" | "error" | "info";
  meta?: Record<string, unknown>;
}

interface HistoryState {
  entries: HistoryEntry[];
  addEntry: (entry: Omit<HistoryEntry, "id" | "timestamp">) => void;
  removeEntry: (id: string) => void;
  clearAll: () => void;
  getRecent: (limit?: number) => HistoryEntry[];
}

const MAX_ENTRIES = 200;

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],
      addEntry: (entry) =>
        set((state) => ({
          entries: [
            { ...entry, id: nanoid(), timestamp: Date.now() },
            ...state.entries,
          ].slice(0, MAX_ENTRIES),
        })),
      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),
      clearAll: () => set({ entries: [] }),
      getRecent: (limit = 20) => get().entries.slice(0, limit),
    }),
    {
      name: "azzam-history",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
