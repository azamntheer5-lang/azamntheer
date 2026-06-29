import { create } from "zustand";

export type WorkspaceId =
  // Core
  | "home"
  | "pdf"
  | "word"
  | "excel"
  | "image"
  // Media & Recognition
  | "ocr"
  | "scanner"
  | "compare"
  | "qr-tools"
  // NEW: Monster Tools Suite
  | "dev-tools"      // JSON, Base64, Hash, UUID, JWT, Regex, Color picker
  | "text-tools"     // Counter, Case converter, Lorem, Diff, Sort, Dedupe
  | "converters"     // Units, Color, Number base, Roman
  | "crypto"         // Password gen, AES, Hash calc, Strength checker
  | "time-tools"     // Date diff, Age, Countdown, Stopwatch, World clock
  | "calc-tools"     // Basic, Scientific, BMI, Percentage, Loan, Tip
  // System
  | "history"
  | "settings"
  | "help";

export interface UIState {
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
