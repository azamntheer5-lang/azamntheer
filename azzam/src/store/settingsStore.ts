import { create } from "zustand";

export interface Settings {
  autoSave: boolean;
  gpuAcceleration: boolean;
  imageQuality: number; // 10-100
  defaultOcrLanguage: string;
  showGrid: boolean;
  showGuides: boolean;
  snapToGrid: boolean;
  snapToObjects: boolean;
  commandPaletteShortcut: string;
  highContrast: boolean;
  reduceMotion: boolean;
}

interface SettingsState extends Settings {
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

const DEFAULTS: Settings = {
  autoSave: true,
  gpuAcceleration: true,
  imageQuality: 85,
  defaultOcrLanguage: "ar",
  showGrid: false,
  showGuides: true,
  snapToGrid: true,
  snapToObjects: true,
  commandPaletteShortcut: "cmd+k",
  highContrast: false,
  reduceMotion: false,
};

export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULTS,
  update: (patch) => set(patch),
  reset: () => set(DEFAULTS),
}));
