import { create } from "zustand";
import type { PdfDocState } from "../types";

interface PdfWorkspaceState {
  doc: PdfDocState | null;
  originalSize: number | null;
  compressedSize: number | null;
  isLocked: boolean;
  metadata: { title: string; author: string; subject: string; keywords: string };
  history: PdfDocState[]; // undo stack
  future: PdfDocState[]; // redo stack

  setDoc: (doc: PdfDocState | null) => void;
  updateDoc: (patch: Partial<PdfDocState>) => void;
  setOriginalSize: (size: number | null) => void;
  setCompressedSize: (size: number | null) => void;
  setIsLocked: (v: boolean) => void;
  setMetadata: (m: { title: string; author: string; subject: string; keywords: string }) => void;

  // Undo / Redo
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  reset: () => void;
}

const MAX_HISTORY = 30;

export const usePdfStore = create<PdfWorkspaceState>((set, get) => ({
  doc: null,
  originalSize: null,
  compressedSize: null,
  isLocked: false,
  metadata: { title: "", author: "", subject: "", keywords: "" },
  history: [],
  future: [],

  setDoc: (doc) =>
    set({
      doc,
      history: [],
      future: [],
      originalSize: doc?.size ?? null,
      compressedSize: null,
      isLocked: false,
    }),

  updateDoc: (patch) =>
    set((state) => {
      if (!state.doc) return state;
      // Push current to history before mutating
      const nextHistory = [...state.history, state.doc].slice(-MAX_HISTORY);
      return {
        doc: { ...state.doc, ...patch },
        history: nextHistory,
        future: [],
      };
    }),

  setOriginalSize: (size) => set({ originalSize: size }),
  setCompressedSize: (size) => set({ compressedSize: size }),
  setIsLocked: (v) => set({ isLocked: v }),
  setMetadata: (m) => set({ metadata: m }),

  pushHistory: () =>
    set((state) => {
      if (!state.doc) return state;
      return {
        history: [...state.history, state.doc].slice(-MAX_HISTORY),
        future: [],
      };
    }),

  undo: () =>
    set((state) => {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1];
      const remaining = state.history.slice(0, -1);
      if (!state.doc) return state;
      return {
        doc: prev,
        history: remaining,
        future: [state.doc, ...state.future].slice(0, MAX_HISTORY),
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const remaining = state.future.slice(1);
      if (!state.doc) return state;
      return {
        doc: next,
        history: [...state.history, state.doc].slice(-MAX_HISTORY),
        future: remaining,
      };
    }),

  canUndo: () => get().history.length > 0,
  canRedo: () => get().future.length > 0,

  reset: () =>
    set({
      doc: null,
      originalSize: null,
      compressedSize: null,
      isLocked: false,
      metadata: { title: "", author: "", subject: "", keywords: "" },
      history: [],
      future: [],
    }),
}));
