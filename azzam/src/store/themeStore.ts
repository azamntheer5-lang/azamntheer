import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemeMode = "dark" | "light" | "midnight" | "aurora" | "cyber" | "ocean";

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceHover: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  /** Secondary accent for gradients & glows */
  secondary: string;
}

export const THEMES: Record<ThemeMode, { name: string; label: string; emoji: string; colors: ThemeColors }> = {
  dark: {
    name: "dark",
    label: "ليلي داكن",
    emoji: "🌙",
    colors: {
      background: "#040711",
      surface: "rgba(13, 17, 30, 0.45)",
      surfaceHover: "rgba(13, 17, 30, 0.65)",
      border: "rgba(255, 255, 255, 0.07)",
      text: "#f3f4f6",
      textMuted: "#9ca3af",
      primary: "#3b82f6",
      accent: "#a855f7",
      secondary: "#ec4899",
      success: "#10b981",
      warning: "#f59e0b",
      danger: "#ef4444",
    },
  },
  light: {
    name: "light",
    label: "نهاري فاتح",
    emoji: "☀️",
    colors: {
      background: "#f8fafc",
      surface: "rgba(255, 255, 255, 0.85)",
      surfaceHover: "rgba(255, 255, 255, 1)",
      border: "rgba(15, 23, 42, 0.08)",
      text: "#0f172a",
      textMuted: "#64748b",
      primary: "#2563eb",
      accent: "#7c3aed",
      secondary: "#db2777",
      success: "#059669",
      warning: "#d97706",
      danger: "#dc2626",
    },
  },
  midnight: {
    name: "midnight",
    label: "منتصف الليل",
    emoji: "🌌",
    colors: {
      background: "#020617",
      surface: "rgba(15, 23, 42, 0.55)",
      surfaceHover: "rgba(15, 23, 42, 0.75)",
      border: "rgba(99, 102, 241, 0.15)",
      text: "#e0e7ff",
      textMuted: "#818cf8",
      primary: "#6366f1",
      accent: "#a855f7",
      secondary: "#f472b6",
      success: "#34d399",
      warning: "#fbbf24",
      danger: "#f87171",
    },
  },
  aurora: {
    name: "aurora",
    label: "شفق قطبي",
    emoji: "🌠",
    colors: {
      background: "#0c0a1d",
      surface: "rgba(30, 27, 75, 0.45)",
      surfaceHover: "rgba(30, 27, 75, 0.65)",
      border: "rgba(167, 139, 250, 0.18)",
      text: "#ede9fe",
      textMuted: "#a5b4fc",
      primary: "#8b5cf6",
      accent: "#ec4899",
      secondary: "#22d3ee",
      success: "#10b981",
      warning: "#f59e0b",
      danger: "#ef4444",
    },
  },
  cyber: {
    name: "cyber",
    label: "سايبربانك",
    emoji: "🌃",
    colors: {
      background: "#0a0014",
      surface: "rgba(20, 6, 40, 0.55)",
      surfaceHover: "rgba(30, 10, 60, 0.75)",
      border: "rgba(217, 70, 239, 0.22)",
      text: "#fae8ff",
      textMuted: "#c084fc",
      primary: "#d946ef",
      accent: "#22d3ee",
      secondary: "#facc15",
      success: "#22c55e",
      warning: "#fbbf24",
      danger: "#f43f5e",
    },
  },
  ocean: {
    name: "ocean",
    label: "محيط استوائي",
    emoji: "🌊",
    colors: {
      background: "#00131f",
      surface: "rgba(2, 40, 64, 0.55)",
      surfaceHover: "rgba(2, 50, 80, 0.75)",
      border: "rgba(20, 184, 166, 0.22)",
      text: "#ccfbf1",
      textMuted: "#5eead4",
      primary: "#14b8a6",
      accent: "#0ea5e9",
      secondary: "#a3e635",
      success: "#22c55e",
      warning: "#fbbf24",
      danger: "#f43f5e",
    },
  },
};

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  colors: ThemeColors;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "dark",
      colors: THEMES.dark.colors,
      setMode: (mode) => set({ mode, colors: THEMES[mode].colors }),
      toggle: () => {
        const order: ThemeMode[] = ["dark", "light", "midnight", "aurora", "cyber", "ocean"];
        const idx = order.indexOf(get().mode);
        const next = order[(idx + 1) % order.length];
        set({ mode: next, colors: THEMES[next].colors });
      },
    }),
    {
      name: "azzam-theme",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
