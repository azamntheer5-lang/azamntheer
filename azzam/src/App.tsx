import React, { useEffect, lazy, Suspense } from "react";
import { useUIStore } from "./store/uiStore";
import { usePdfStore } from "./store/pdfStore";
import { useThemeStore } from "./store/themeStore";
import { useI18nStore } from "./store/i18nStore";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { ToastProvider, useToast } from "./context/ToastContext";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { CommandPalette } from "./components/command/CommandPalette";
import { ServerWakeStatus } from "./components/ServerWakeStatus";

// Eagerly loaded (always visible)
import { HomeWorkspace } from "./workspaces/HomeWorkspace";

// Lazily loaded (on demand)
const PdfWorkspace          = lazy(() => import("./workspaces/PdfWorkspace").then(m => ({ default: m.PdfWorkspace })));
const WordWorkspace         = lazy(() => import("./workspaces/WordWorkspace").then(m => ({ default: m.WordWorkspace })));
const ExcelWorkspace        = lazy(() => import("./workspaces/ExcelWorkspace").then(m => ({ default: m.ExcelWorkspace })));
const ImageWorkspace        = lazy(() => import("./workspaces/ImageWorkspace").then(m => ({ default: m.ImageWorkspace })));
const OcrWorkspace          = lazy(() => import("./workspaces/OcrWorkspace").then(m => ({ default: m.OcrWorkspace })));
const ScannerWorkspace      = lazy(() => import("./workspaces/ScannerWorkspace").then(m => ({ default: m.ScannerWorkspace })));
const CompareWorkspace      = lazy(() => import("./workspaces/CompareWorkspace").then(m => ({ default: m.CompareWorkspace })));
const QrToolsWorkspace      = lazy(() => import("./workspaces/QrToolsWorkspace").then(m => ({ default: m.QrToolsWorkspace })));
const DevToolsWorkspace     = lazy(() => import("./workspaces/DevToolsWorkspace").then(m => ({ default: m.DevToolsWorkspace })));
const TextToolsWorkspace    = lazy(() => import("./workspaces/TextToolsWorkspace").then(m => ({ default: m.TextToolsWorkspace })));
const ConvertersWorkspace   = lazy(() => import("./workspaces/ConvertersWorkspace").then(m => ({ default: m.ConvertersWorkspace })));
const CryptoWorkspace       = lazy(() => import("./workspaces/CryptoWorkspace").then(m => ({ default: m.CryptoWorkspace })));
const TimeToolsWorkspace    = lazy(() => import("./workspaces/TimeToolsWorkspace").then(m => ({ default: m.TimeToolsWorkspace })));
const CalcToolsWorkspace    = lazy(() => import("./workspaces/CalcToolsWorkspace").then(m => ({ default: m.CalcToolsWorkspace })));
const CodeToolsWorkspace    = lazy(() => import("./workspaces/CodeToolsWorkspace").then(m => ({ default: m.CodeToolsWorkspace })));
const MediaToolsWorkspace   = lazy(() => import("./workspaces/MediaToolsWorkspace").then(m => ({ default: m.MediaToolsWorkspace })));
const ChartsWorkspace       = lazy(() => import("./workspaces/ChartsWorkspace").then(m => ({ default: m.ChartsWorkspace })));
const HistoryWorkspace      = lazy(() => import("./workspaces/HistoryWorkspace").then(m => ({ default: m.HistoryWorkspace })));
const SettingsWorkspace     = lazy(() => import("./workspaces/SettingsWorkspace").then(m => ({ default: m.SettingsWorkspace })));
const HelpWorkspace         = lazy(() => import("./workspaces/HelpWorkspace").then(m => ({ default: m.HelpWorkspace })));

// Fallback while workspace is loading
const WorkspaceSkeleton: React.FC = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
      <span className="text-xs text-slate-500 font-semibold">تحميل...</span>
    </div>
  </div>
);

function ActiveWorkspace() {
  const active = useUIStore((s) => s.activeWorkspace);
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      {active === "home"         && <HomeWorkspace />}
      {active === "pdf"          && <PdfWorkspace />}
      {active === "word"         && <WordWorkspace />}
      {active === "excel"        && <ExcelWorkspace />}
      {active === "image"        && <ImageWorkspace />}
      {active === "ocr"          && <OcrWorkspace />}
      {active === "scanner"      && <ScannerWorkspace />}
      {active === "compare"      && <CompareWorkspace />}
      {active === "qr-tools"     && <QrToolsWorkspace />}
      {active === "dev-tools"    && <DevToolsWorkspace />}
      {active === "text-tools"   && <TextToolsWorkspace />}
      {active === "converters"   && <ConvertersWorkspace />}
      {active === "crypto"       && <CryptoWorkspace />}
      {active === "time-tools"   && <TimeToolsWorkspace />}
      {active === "calc-tools"   && <CalcToolsWorkspace />}
      {active === "code-tools"   && <CodeToolsWorkspace />}
      {active === "media-tools"  && <MediaToolsWorkspace />}
      {active === "charts"       && <ChartsWorkspace />}
      {active === "history"      && <HistoryWorkspace />}
      {active === "settings"     && <SettingsWorkspace />}
      {active === "help"         && <HelpWorkspace />}
    </Suspense>
  );
}

function AppShell() {
  const setActive      = useUIStore((s) => s.setActiveWorkspace);
  const toggleSidebar  = useUIStore((s) => s.toggleSidebar);
  const togglePalette  = useUIStore((s) => s.toggleCommandPalette);
  const setPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const toggleTheme    = useThemeStore((s) => s.toggle);
  const undo           = usePdfStore((s) => s.undo);
  const redo           = usePdfStore((s) => s.redo);
  const doc            = usePdfStore((s) => s.doc);
  const themeColors    = useThemeStore((s) => s.colors);
  const themeMode      = useThemeStore((s) => s.mode);
  const locale         = useI18nStore((s) => s.locale);
  const toggleLocale   = useI18nStore((s) => s.toggle);
  const toast = useToast();

  // If main.tsx just performed a one-time reload after cleaning up a stale
  // service worker from a previous app on this domain, let the person know
  // why the page refreshed instead of leaving it silent.
  useEffect(() => {
    if (sessionStorage.getItem("azzam-show-update-toast")) {
      sessionStorage.removeItem("azzam-show-update-toast");
      toast.success("تم تحديث التطبيق إلى أحدث إصدار ✅");
    }
  }, [toast]);

  // Apply theme CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--azzam-bg",   themeColors.background);
    root.style.setProperty("--azzam-text", themeColors.text);
    root.dataset.theme = themeMode;
    document.body.style.backgroundColor = themeColors.background;
    document.body.style.color           = themeColors.text;
    // Apply direction based on locale
    root.dir = locale === "ar" ? "rtl" : "ltr";
    root.lang = locale;
  }, [themeColors, themeMode, locale]);

  useKeyboardShortcuts([
    { key: "k", ctrl: true, meta: true, handler: togglePalette },
    { key: "b", ctrl: true,             handler: toggleSidebar },
    { key: "j", ctrl: true,             handler: toggleTheme },
    { key: "l", ctrl: true,             handler: toggleLocale, ignoreInputs: true },
    { key: "z", ctrl: true,             handler: () => doc && undo(), ignoreInputs: true },
    { key: "y", ctrl: true,             handler: () => doc && redo(), ignoreInputs: true },
    { key: "o", ctrl: true,             handler: () => setActive("pdf"),   ignoreInputs: true },
    { key: "Escape",                     handler: () => setPaletteOpen(false) },
  ]);

  return (
    <div
      className="flex h-screen w-screen overflow-hidden relative font-sans"
      dir={locale === "ar" ? "rtl" : "ltr"}
      style={{ background: themeColors.background, color: themeColors.text }}
    >
      {/* Ambient background glows */}
      <div className="absolute top-[-15%] left-[-15%] w-[55%] h-[55%] rounded-full blur-[160px] ambient-glow-1 pointer-events-none z-0" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[55%] h-[55%] rounded-full blur-[160px] ambient-glow-2 pointer-events-none z-0" />
      <div className="absolute top-[35%] left-[25%] w-[40%] h-[40%] rounded-full blur-[140px] ambient-glow-3 pointer-events-none z-0" />
      <div className="absolute bottom-[20%] right-[30%] w-[35%] h-[35%] rounded-full blur-[140px] ambient-glow-4 pointer-events-none z-0" />

      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <Topbar />
        <ActiveWorkspace />
      </div>

      <CommandPalette />
      <ServerWakeStatus />
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
