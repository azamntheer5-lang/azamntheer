import { useEffect, useMemo } from "react";
import { useUIStore } from "./store/uiStore";
import { usePdfStore } from "./store/pdfStore";
import { useThemeStore } from "./store/themeStore";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { ToastProvider } from "./context/ToastContext";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { CommandPalette } from "./components/command/CommandPalette";
import { HomeWorkspace } from "./workspaces/HomeWorkspace";
import { PdfWorkspace } from "./workspaces/PdfWorkspace";
import { WordWorkspace } from "./workspaces/WordWorkspace";
import { ExcelWorkspace } from "./workspaces/ExcelWorkspace";
import { ImageWorkspace } from "./workspaces/ImageWorkspace";
import { OcrWorkspace } from "./workspaces/OcrWorkspace";
import { ScannerWorkspace } from "./workspaces/ScannerWorkspace";
import { CompareWorkspace } from "./workspaces/CompareWorkspace";
import { QrToolsWorkspace } from "./workspaces/QrToolsWorkspace";
import { HistoryWorkspace } from "./workspaces/HistoryWorkspace";
import { SettingsWorkspace } from "./workspaces/SettingsWorkspace";
import { HelpWorkspace } from "./workspaces/HelpWorkspace";

function AppShell() {
  const active = useUIStore((s) => s.activeWorkspace);
  const setActive = useUIStore((s) => s.setActiveWorkspace);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const togglePalette = useUIStore((s) => s.toggleCommandPalette);
  const setPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const undo = usePdfStore((s) => s.undo);
  const redo = usePdfStore((s) => s.redo);
  const doc = usePdfStore((s) => s.doc);

  // Apply theme CSS variables on mode change
  const themeColors = useThemeStore((s) => s.colors);
  const themeMode = useThemeStore((s) => s.mode);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--azzam-bg", themeColors.background);
    root.style.setProperty("--azzam-text", themeColors.text);
    root.dataset.theme = themeMode;
    // Update body background
    document.body.style.backgroundColor = themeColors.background;
    document.body.style.color = themeColors.text;
  }, [themeColors, themeMode]);

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    { key: "k", ctrl: true, meta: true, handler: () => togglePalette() },
    { key: "b", ctrl: true, handler: () => toggleSidebar() },
    { key: "j", ctrl: true, handler: () => toggleTheme() },
    { key: "z", ctrl: true, handler: () => doc && undo(), ignoreInputs: true },
    { key: "y", ctrl: true, handler: () => doc && redo(), ignoreInputs: true },
    { key: "o", ctrl: true, handler: () => setActive("pdf"), ignoreInputs: true },
    { key: "Escape", handler: () => setPaletteOpen(false) },
  ]);

  const workspace = useMemo(() => {
    switch (active) {
      case "home": return <HomeWorkspace />;
      case "pdf": return <PdfWorkspace />;
      case "word": return <WordWorkspace />;
      case "excel": return <ExcelWorkspace />;
      case "image": return <ImageWorkspace />;
      case "ocr": return <OcrWorkspace />;
      case "scanner": return <ScannerWorkspace />;
      case "compare": return <CompareWorkspace />;
      case "qr-tools": return <QrToolsWorkspace />;
      case "history": return <HistoryWorkspace />;
      case "settings": return <SettingsWorkspace />;
      case "help": return <HelpWorkspace />;
      default: return <HomeWorkspace />;
    }
  }, [active]);

  return (
    <div
      className="flex h-screen w-screen overflow-hidden relative font-sans"
      dir="rtl"
      style={{ background: themeColors.background, color: themeColors.text }}
    >
      {/* Ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] ambient-glow-1 pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] ambient-glow-2 pointer-events-none z-0" />
      <div className="absolute top-[40%] left-[30%] w-[35%] h-[35%] rounded-full blur-[140px] ambient-glow-3 pointer-events-none z-0" />

      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <Topbar />
        {workspace}
      </div>

      <CommandPalette />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}
