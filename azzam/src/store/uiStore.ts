import { create } from "zustand";

export type WorkspaceId =
  | "home"
  | "pdf"
  | "word"
  | "excel"
  | "image"
  | "ocr"
  | "scanner"
  | "compare"
  | "qr-tools"
  | "history"
  | "settings"
  | "help";

interface UIState {
  activeWorkspace: WorkspaceId;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  pdfActiveTab: string;
  isProcessing: boolean;
  processingStatus: string;
  processingProgress: number;
  setActiveWorkspace: (id: WorkspaceId) => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (v: boolean) => void;
  toggleCommandPalette: () => void;
  setPdfActiveTab: (tab: string) => void;
  setProcessing: (processing: boolean, status?: string, progress?: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeWorkspace: "home",
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  pdfActiveTab: "organize",
  isProcessing: false,
  processingStatus: "",
  processingProgress: 0,
  setActiveWorkspace: (id) => set({ activeWorkspace: id }),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  setPdfActiveTab: (tab) => set({ pdfActiveTab: tab }),
  setProcessing: (processing, status = "", progress = 0) =>
    set({
      isProcessing: processing,
      processingStatus: status,
      processingProgress: progress,
    }),
}));
