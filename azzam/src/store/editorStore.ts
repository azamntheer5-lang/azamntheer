import { create } from "zustand";
import { nanoid } from "nanoid";
import type { EditorObject, EditorTool, TextEditorObject, ShapeEditorObject, ImageEditorObject } from "../components/editor/editorTypes";
import { DEFAULT_TEXT_PROPS, DEFAULT_SHAPE_PROPS } from "../components/editor/editorTypes";

interface EditorStoreState {
  objects: EditorObject[];
  selectedId: string | null;
  tool: EditorTool;
  zoom: number;
  showGrid: boolean;
  showGuides: boolean;
  snapToGrid: boolean;
  snapToObjects: boolean;
  gridSize: number;
  clipboard: EditorObject | null;

  // History snapshots (full state copies)
  undoStack: EditorObject[][];
  redoStack: EditorObject[][];

  // Setters
  setTool: (t: EditorTool) => void;
  setZoom: (z: number) => void;
  toggleGrid: () => void;
  toggleGuides: () => void;
  toggleSnapToGrid: () => void;
  toggleSnapToObjects: () => void;
  setGridSize: (n: number) => void;

  // Object ops (each pushes a snapshot for undo)
  addObject: (obj: Omit<EditorObject, "id" | "zIndex">) => string;
  updateObject: (id: string, patch: Partial<EditorObject>) => void;
  deleteObject: (id: string) => void;
  duplicateObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  toggleVisible: (id: string) => void;
  toggleLocked: (id: string) => void;
  renameObject: (id: string, name: string) => void;

  // Clipboard
  copy: (id: string) => void;
  paste: () => void;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Bulk
  clearObjects: () => void;
  loadObjects: (objs: EditorObject[]) => void;
}

const MAX_HISTORY = 50;

function snapshot(list: EditorObject[]): EditorObject[] {
  return list.map((o) => ({ ...o }));
}

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  objects: [],
  selectedId: null,
  tool: "select",
  zoom: 1.0,
  showGrid: false,
  showGuides: true,
  snapToGrid: true,
  snapToObjects: true,
  gridSize: 20,
  clipboard: null,
  undoStack: [],
  redoStack: [],

  setTool: (t) => set({ tool: t }),
  setZoom: (z) => set({ zoom: Math.max(0.25, Math.min(4, z)) }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),
  toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
  toggleSnapToObjects: () => set((s) => ({ snapToObjects: !s.snapToObjects })),
  setGridSize: (n) => set({ gridSize: Math.max(5, Math.min(80, n)) }),

  addObject: (objWithoutId) => {
    const id = nanoid(8);
    set((state) => {
      const maxZ = state.objects.reduce((m, o) => Math.max(m, o.zIndex), 0);
      const obj = {
        ...objWithoutId,
        id,
        zIndex: maxZ + 1,
      } as EditorObject;
      return {
        objects: [...state.objects, obj],
        selectedId: id,
        undoStack: [...state.undoStack, snapshot(state.objects)].slice(-MAX_HISTORY),
        redoStack: [],
      };
    });
    return id;
  },

  updateObject: (id, patch) =>
    set((state) => {
      const prev = state.objects;
      const next = prev.map((o) => (o.id === id ? ({ ...o, ...patch } as EditorObject) : o));
      // Avoid pushing to undo for every micro-update (e.g., during drag).
      // We push to undoStack only when this is a "commit" update — caller
      // can call pushUndo() explicitly if needed. For simplicity we push
      // on every update; with a max history of 50 this is acceptable.
      return {
        objects: next,
        undoStack: [...state.undoStack, snapshot(prev)].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }),

  deleteObject: (id) =>
    set((state) => ({
      objects: state.objects.filter((o) => o.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      undoStack: [...state.undoStack, snapshot(state.objects)].slice(-MAX_HISTORY),
      redoStack: [],
    })),

  duplicateObject: (id) =>
    set((state) => {
      const src = state.objects.find((o) => o.id === id);
      if (!src) return state;
      const newId = nanoid(8);
      const maxZ = state.objects.reduce((m, o) => Math.max(m, o.zIndex), 0);
      const clone = {
        ...src,
        id: newId,
        x: src.x + 20,
        y: src.y - 20,
        zIndex: maxZ + 1,
        name: `${src.name} (نسخة)`,
      } as EditorObject;
      return {
        objects: [...state.objects, clone],
        selectedId: newId,
        undoStack: [...state.undoStack, snapshot(state.objects)].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }),

  selectObject: (id) => set({ selectedId: id }),

  bringForward: (id) =>
    set((state) => {
      const obj = state.objects.find((o) => o.id === id);
      if (!obj) return state;
      const next = obj.zIndex + 1;
      return {
        objects: state.objects
          .map((o) => (o.id === id ? { ...o, zIndex: next } : o.zIndex === next ? { ...o, zIndex: next - 1 } : o))
          .sort((a, b) => a.zIndex - b.zIndex),
        undoStack: [...state.undoStack, snapshot(state.objects)].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }),

  sendBackward: (id) =>
    set((state) => {
      const obj = state.objects.find((o) => o.id === id);
      if (!obj) return state;
      const prev = obj.zIndex - 1;
      if (prev < 0) return state;
      return {
        objects: state.objects
          .map((o) => (o.id === id ? { ...o, zIndex: prev } : o.zIndex === prev ? { ...o, zIndex: prev + 1 } : o))
          .sort((a, b) => a.zIndex - b.zIndex),
        undoStack: [...state.undoStack, snapshot(state.objects)].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }),

  bringToFront: (id) =>
    set((state) => {
      const maxZ = state.objects.reduce((m, o) => Math.max(m, o.zIndex), 0);
      return {
        objects: state.objects.map((o) => (o.id === id ? { ...o, zIndex: maxZ + 1 } : o)),
        undoStack: [...state.undoStack, snapshot(state.objects)].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }),

  sendToBack: (id) =>
    set((state) => {
      const minZ = state.objects.reduce((m, o) => Math.min(m, o.zIndex), 0);
      return {
        objects: state.objects.map((o) => (o.id === id ? { ...o, zIndex: minZ - 1 } : o)),
        undoStack: [...state.undoStack, snapshot(state.objects)].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }),

  toggleVisible: (id) =>
    set((state) => ({
      objects: state.objects.map((o) => (o.id === id ? { ...o, visible: !o.visible } : o)),
    })),

  toggleLocked: (id) =>
    set((state) => ({
      objects: state.objects.map((o) => (o.id === id ? { ...o, locked: !o.locked } : o)),
    })),

  renameObject: (id, name) =>
    set((state) => ({
      objects: state.objects.map((o) => (o.id === id ? { ...o, name } : o)),
    })),

  copy: (id) => {
    const obj = get().objects.find((o) => o.id === id);
    if (obj) set({ clipboard: { ...obj } });
  },

  paste: () =>
    set((state) => {
      if (!state.clipboard) return state;
      const newId = nanoid(8);
      const maxZ = state.objects.reduce((m, o) => Math.max(m, o.zIndex), 0);
      const clone = {
        ...state.clipboard,
        id: newId,
        x: state.clipboard.x + 20,
        y: state.clipboard.y - 20,
        zIndex: maxZ + 1,
        name: `${state.clipboard.name} (لصق)`,
      } as EditorObject;
      return {
        objects: [...state.objects, clone],
        selectedId: newId,
        undoStack: [...state.undoStack, snapshot(state.objects)].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }),

  undo: () =>
    set((state) => {
      if (state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      const remaining = state.undoStack.slice(0, -1);
      return {
        objects: prev,
        undoStack: remaining,
        redoStack: [snapshot(state.objects), ...state.redoStack].slice(0, MAX_HISTORY),
        selectedId: null,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.redoStack.length === 0) return state;
      const next = state.redoStack[0];
      const remaining = state.redoStack.slice(1);
      return {
        objects: next,
        undoStack: [...state.undoStack, snapshot(state.objects)].slice(-MAX_HISTORY),
        redoStack: remaining,
        selectedId: null,
      };
    }),

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  clearObjects: () =>
    set((state) => ({
      objects: [],
      selectedId: null,
      undoStack: [...state.undoStack, snapshot(state.objects)].slice(-MAX_HISTORY),
      redoStack: [],
    })),

  loadObjects: (objs) =>
    set({
      objects: objs,
      selectedId: null,
      undoStack: [],
      redoStack: [],
    }),
}));

// Helper factory functions
export function createTextObject(
  page: number,
  x: number,
  y: number,
  partial?: Partial<TextEditorObject>
): Omit<TextEditorObject, "id" | "zIndex"> {
  return {
    kind: "text",
    page,
    x,
    y,
    width: 200,
    height: 40,
    rotation: 0,
    opacity: 1,
    name: "نص",
    visible: true,
    locked: false,
    ...DEFAULT_TEXT_PROPS,
    ...partial,
  };
}

export function createShapeObject(
  page: number,
  kind: ShapeEditorObject["kind"],
  x: number,
  y: number,
  width: number,
  height: number,
  partial?: Partial<ShapeEditorObject>
): Omit<ShapeEditorObject, "id" | "zIndex"> {
  return {
    kind,
    page,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    name: kind === "rect" ? "مستطيل" : kind === "ellipse" ? "دائرة" : kind === "line" ? "خط" : "سهم",
    visible: true,
    locked: false,
    ...DEFAULT_SHAPE_PROPS,
    ...partial,
  };
}

export function createImageObject(
  page: number,
  x: number,
  y: number,
  width: number,
  height: number,
  pngBase64: string,
  partial?: Partial<ImageEditorObject>
): Omit<ImageEditorObject, "id" | "zIndex"> {
  return {
    kind: "image",
    page,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    name: "صورة",
    visible: true,
    locked: false,
    pngBase64,
    ...partial,
  };
}
