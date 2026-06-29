import React from "react";
import {
  Search, ChevronRight, Undo2, Redo2, Command as CommandIcon, Zap,
  Palette, Github, Star, Languages,
} from "lucide-react";
import { useUIStore, type WorkspaceId } from "../store/uiStore";
import { useThemeStore, THEMES, type ThemeMode } from "../store/themeStore";
import { useI18nStore } from "../store/i18nStore";
import { usePdfStore } from "../store/pdfStore";

const WORKSPACE_LABELS: Record<WorkspaceId, string> = {
  home:         "ws.home",
  pdf:          "ws.pdf",
  word:         "ws.word",
  excel:        "ws.excel",
  image:        "ws.image",
  ocr:          "ws.ocr",
  scanner:      "ws.scanner",
  compare:      "ws.compare",
  "qr-tools":   "ws.qr-tools",
  "dev-tools":  "ws.dev-tools",
  "text-tools": "ws.text-tools",
  "converters": "ws.converters",
  "crypto":     "ws.crypto",
  "time-tools": "ws.time-tools",
  "calc-tools": "ws.calc-tools",
  "code-tools": "ws.code-tools",
  "media-tools":"ws.media-tools",
  "charts":     "ws.charts",
  history:      "ws.history",
  settings:     "ws.settings",
  help:         "ws.help",
};

const THEME_ORDER: ThemeMode[] = ["dark", "light", "midnight", "aurora", "cyber", "ocean"];

export const Topbar: React.FC = () => {
  const setActive    = useUIStore((s) => s.setActiveWorkspace);
  const active       = useUIStore((s) => s.activeWorkspace);
  const setPalette   = useUIStore((s) => s.setCommandPaletteOpen);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const themeMode    = useThemeStore((s) => s.mode);

  const doc        = usePdfStore((s) => s.doc);
  const undo       = usePdfStore((s) => s.undo);
  const redo       = usePdfStore((s) => s.redo);
  const historyLen = usePdfStore((s) => s.history.length);
  const futureLen  = usePdfStore((s) => s.future.length);

  const { t, locale, toggle: toggleLocale } = useI18nStore();

  const wsKey = WORKSPACE_LABELS[active];
  const isHome = active === "home";

  const cycleTheme = () => {
    const idx = THEME_ORDER.indexOf(themeMode);
    setThemeMode(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
  };

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
              {t("topbar.home")}
            </button>
            <ChevronRight className="h-3 w-3 text-slate-600" />
          </>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-200 truncate">{t(wsKey)}</span>
        </div>

        {/* PDF undo/redo */}
        {doc && active === "pdf" && (
          <div className="flex items-center gap-0.5 mr-3 bg-white/[0.04] rounded-lg border border-white/[0.06] p-0.5">
            <button
              onClick={undo}
              disabled={historyLen === 0}
              title="Ctrl+Z"
              className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={futureLen === 0}
              title="Ctrl+Y"
              className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Pro badge */}
        {!isHome && (
          <span className="badge badge-new ml-2">
            <Zap className="h-2.5 w-2.5" />
            {t("badge.pro")}
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Tool count */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <Star className="h-3 w-3 text-amber-400" />
          <span className="text-[10px] font-bold text-slate-300">{locale === "ar" ? "21 أداة" : "21 tools"}</span>
        </div>

        {/* Search */}
        <button
          onClick={() => setPalette(true)}
          title={t("search.global")}
          className="flex items-center gap-2 h-8 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold hidden sm:inline text-slate-500">{t("search.command_palette")}</span>
          <kbd className="text-[9px] text-slate-600 font-mono border border-white/[0.08] rounded px-1 py-0.5 hidden sm:inline">
            ⌘K
          </kbd>
        </button>

        {/* Language toggle */}
        <button
          onClick={toggleLocale}
          title={locale === "ar" ? "Switch to English" : "التبديل للعربية"}
          className="flex items-center gap-2 h-8 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer"
        >
          <Languages className="h-3.5 w-3.5" />
          <span className="text-[11px] font-bold hidden lg:inline">
            {locale === "ar" ? "EN" : "ع"}
          </span>
        </button>

        {/* Theme cycle */}
        <button
          onClick={cycleTheme}
          title={`${t("topbar.theme")}: ${THEMES[themeMode].label} — ${t("topbar.theme.toggle")}`}
          className="flex items-center gap-2 h-8 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer"
        >
          <Palette className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold hidden lg:inline">
            {THEMES[themeMode].emoji} {THEMES[themeMode].label}
          </span>
        </button>

        {/* GitHub link */}
        <a
          href="https://github.com/azamntheer5-lang/azamntheer"
          target="_blank"
          rel="noreferrer"
          title="GitHub"
          className="h-8 w-8 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer"
        >
          <Github className="h-3.5 w-3.5" />
        </a>
      </div>
    </header>
  );
};
