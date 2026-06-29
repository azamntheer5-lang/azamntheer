import React from "react";
import {
  Search, Moon, Sun, Command as CommandIcon, ChevronLeft, RotateCcw, Undo2, Redo2,
} from "lucide-react";
import { useUIStore } from "../store/uiStore";
import { useThemeStore } from "../store/themeStore";
import { usePdfStore } from "../store/pdfStore";

export const Topbar: React.FC = () => {
  const setActive = useUIStore((s) => s.setActiveWorkspace);
  const active = useUIStore((s) => s.activeWorkspace);
  const setPalette = useUIStore((s) => s.setCommandPaletteOpen);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const themeMode = useThemeStore((s) => s.mode);

  const doc = usePdfStore((s) => s.doc);
  const undo = usePdfStore((s) => s.undo);
  const redo = usePdfStore((s) => s.redo);
  const historyLen = usePdfStore((s) => s.history.length);
  const futureLen = usePdfStore((s) => s.future.length);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-white/5 relative z-20 glass-panel">
      <div className="flex items-center gap-3">
        {active !== "home" && (
          <button
            onClick={() => setActive("home")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-all cursor-pointer bg-white/5 px-3 py-1.5 rounded-xl border border-white/5"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>الرئيسية</span>
          </button>
        )}

        {/* Undo / Redo — only shown when a PDF is loaded */}
        {doc && active === "pdf" && (
          <div className="flex items-center gap-1.5 bg-white/5 rounded-xl border border-white/5 p-1">
            <button
              onClick={undo}
              disabled={historyLen === 0}
              title="تراجع (Ctrl+Z)"
              className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={redo}
              disabled={futureLen === 0}
              title="إعادة (Ctrl+Y)"
              className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setPalette(true)}
          className="h-9 px-3 flex items-center gap-2 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          title="بحث وأوامر (Ctrl+K)"
        >
          <Search className="h-4 w-4" />
          <span className="text-[11px] font-bold hidden sm:inline">بحث...</span>
          <kbd className="text-[9px] text-gray-400 font-mono border border-white/10 rounded px-1 py-0.5 hidden sm:inline">
            ⌘K
          </kbd>
        </button>

        <button
          onClick={toggleTheme}
          className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          title="تبديل الثيم (Ctrl+J)"
        >
          {themeMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
};
