import React, { useState } from "react";
import {
  Search, Moon, Sun, ChevronRight, Undo2, Redo2, Bell, Zap,
} from "lucide-react";
import { useUIStore, type WorkspaceId } from "../store/uiStore";
import { useThemeStore } from "../store/themeStore";
import { usePdfStore } from "../store/pdfStore";

const WORKSPACE_LABELS: Record<WorkspaceId, { label: string; emoji: string }> = {
  home:      { label: "لوحة التحكم", emoji: "🏠" },
  pdf:       { label: "أدوات PDF", emoji: "📄" },
  word:      { label: "أدوات Word", emoji: "📝" },
  excel:     { label: "جداول Excel", emoji: "📊" },
  image:     { label: "استوديو الصور", emoji: "🖼️" },
  ocr:       { label: "استخراج النص", emoji: "🔍" },
  scanner:   { label: "الماسح الضوئي", emoji: "📷" },
  compare:   { label: "مقارنة المستندات", emoji: "⚖️" },
  "qr-tools":{ label: "أدوات QR", emoji: "🔲" },
  history:   { label: "السجل", emoji: "📋" },
  settings:  { label: "الإعدادات", emoji: "⚙️" },
  help:      { label: "المساعدة", emoji: "💡" },
};

export const Topbar: React.FC = () => {
  const setActive    = useUIStore((s) => s.setActiveWorkspace);
  const active       = useUIStore((s) => s.activeWorkspace);
  const setPalette   = useUIStore((s) => s.setCommandPaletteOpen);
  const toggleTheme  = useThemeStore((s) => s.toggle);
  const themeMode    = useThemeStore((s) => s.mode);

  const doc        = usePdfStore((s) => s.doc);
  const undo       = usePdfStore((s) => s.undo);
  const redo       = usePdfStore((s) => s.redo);
  const historyLen = usePdfStore((s) => s.history.length);
  const futureLen  = usePdfStore((s) => s.future.length);

  const ws = WORKSPACE_LABELS[active];
  const isHome = active === "home";

  return (
    <header className="glass flex h-14 shrink-0 items-center justify-between px-5 border-b border-white/[0.06] relative z-20">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        {!isHome && (
          <>
            <button
              onClick={() => setActive("home")}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              الرئيسية
            </button>
            <ChevronRight className="h-3 w-3 text-slate-600" />
          </>
        )}
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{ws.emoji}</span>
          <span className="text-[13px] font-bold text-slate-200 truncate">{ws.label}</span>
        </div>

        {/* PDF undo/redo */}
        {doc && active === "pdf" && (
          <div className="flex items-center gap-0.5 mr-3 bg-white/[0.04]/[0.04] rounded-lg border border-white/[0.06] p-0.5">
            <button
              onClick={undo}
              disabled={historyLen === 0}
              title="تراجع (Ctrl+Z)"
              className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-white/[0.04]/[0.08] disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={futureLen === 0}
              title="إعادة (Ctrl+Y)"
              className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-white/[0.04]/[0.08] disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          onClick={() => setPalette(true)}
          title="بحث وأوامر (Ctrl+K)"
          className="flex items-center gap-2 h-8 px-3 rounded-xl bg-white/[0.04]/[0.04] hover:bg-white/[0.04]/[0.08] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold hidden sm:inline text-slate-500">بحث سريع</span>
          <kbd className="text-[9px] text-slate-600 font-mono border border-white/[0.08] rounded px-1 py-0.5 hidden sm:inline">
            ⌘K
          </kbd>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title="تبديل الثيم"
          className="h-8 w-8 flex items-center justify-center rounded-xl bg-white/[0.04]/[0.04] hover:bg-white/[0.04]/[0.08] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer"
        >
          {themeMode === "dark"
            ? <Sun className="h-3.5 w-3.5" />
            : <Moon className="h-3.5 w-3.5" />
          }
        </button>
      </div>
    </header>
  );
};
