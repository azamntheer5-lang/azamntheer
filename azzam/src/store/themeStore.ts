import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemeMode = "dark" | "light" | "midnight" | "aurora";

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
}

export const THEMES: Record<ThemeMode, { name: string; label: string; colors: ThemeColors }> = {
  dark: {
    name: "dark",
    label: "ليلي داكن",
    colors: {
      background: "#040711",
      surface: "rgba(13, 17, 30, 0.45)",
      surfaceHover: "rgba(13, 17, 30, 0.65)",
      border: "rgba(255, 255, 255, 0.07)",
      text: "#f3f4f6",
      textMuted: "#9ca3af",
      primary: "#3b82f6",
      accent: "#a855f7",
      success: "#10b981",
      warning: "#f59e0b",
      danger: "#ef4444",
    },
  },
  light: {
    name: "light",
    label: "نهاري فاتح",
    colors: {
      background: "#f8fafc",
      surface: "rgba(255, 255, 255, 0.85)",
      surfaceHover: "rgba(255, 255, 255, 1)",
      border: "rgba(15, 23, 42, 0.08)",
      text: "#0f172a",
      textMuted: "#64748b",
      primary: "#2563eb",
      accent: "#7c3aed",
      success: "#059669",
      warning: "#d97706",
      danger: "#dc2626",
    },
  },
  midnight: {
    name: "midnight",
    label: "منتصف الليل",
    colors: {
      background: "#020617",
      surface: "rgba(15, 23, 42, 0.55)",
      surfaceHover: "rgba(15, 23, 42, 0.75)",
      border: "rgba(99, 102, 241, 0.15)",
      text: "#e0e7ff",
      textMuted: "#818cf8",
      primary: "#6366f1",
      accent: "#a855f7",
      success: "#34d399",
      warning: "#fbbf24",
      danger: "#f87171",
    },
  },
  aurora: {
    name: "aurora",
    label: "شفق قطبي",
    colors: {
      background: "#0c0a1d",
      surface: "rgba(30, 27, 75, 0.45)",
      surfaceHover: "rgba(30, 27, 75, 0.65)",
      border: "rgba(167, 139, 250, 0.18)",
      text: "#ede9fe",
      textMuted: "#a5b4fc",
      primary: "#8b5cf6",
      accent: "#ec4899",
      success: "#10b981",
      warning: "#f59e0b",
      danger: "#ef4444",
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
        const next = get().mode === "dark" ? "light" : "dark";
        set({ mode: next, colors: THEMES[next].colors });
      },
    }),
    {
      name: "azzam-theme",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
