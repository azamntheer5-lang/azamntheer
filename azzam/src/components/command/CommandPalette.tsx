import React, { useEffect, useMemo, useState } from "react";
import { Command as CommandPrimitive } from "cmdk";
import {
  Home, FileText, FileCode, FileSpreadsheet, Image as ImageIcon, ScanLine, Camera,
  GitCompare, QrCode, Clock, Settings, HelpCircle, Moon, Sidebar, Trash2,
  Upload, FilePlus, Search as SearchIcon, CornerDownLeft, ChevronRight,
  Code2, Type, ArrowLeftRight, Lock, Calendar, Calculator,
  Film, BarChart3, Languages,
} from "lucide-react";
import { useUIStore } from "../../store/uiStore";
import { useThemeStore } from "../../store/themeStore";
import { useI18nStore } from "../../store/i18nStore";
import { useHistoryStore } from "../../store/historyStore";
import {
  buildNavigationCommands, buildToolCommands, buildSettingsCommands, type Command,
} from "../../lib/commands";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home, pdf: FileText, word: FileCode, excel: FileSpreadsheet, image: ImageIcon,
  scan: ScanLine, camera: Camera, compare: GitCompare, qr: QrCode, history: Clock,
  settings: Settings, help: HelpCircle, moon: Moon, sidebar: Sidebar, trash: Trash2,
  upload: Upload, "file-plus": FilePlus,
  code: Code2, text: Type, convert: ArrowLeftRight, lock: Lock,
  time: Calendar, calc: Calculator,
  media: Film, chart: BarChart3, languages: Languages,
};

const GROUP_LABELS: Record<Command["group"], string> = {
  navigate: "التنقل بين المساحات",
  tools: "الأدوات",
  settings: "الإعدادات",
  ai: "الذكاء الاصطناعي",
  pdf: "PDF",
};

export const CommandPalette: React.FC = () => {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const setActive = useUIStore((s) => s.setActiveWorkspace);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const toggleLanguage = useI18nStore((s) => s.toggle);
  const clearHistory = useHistoryStore((s) => s.clearAll);

  const [query, setQuery] = useState("");

  // Reset query when opening
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  // Close on Escape handled by cmdk internally

  const commands = useMemo<Command[]>(() => {
    const close = () => setOpen(false);
    const nav = buildNavigationCommands(setActive, close);

    // Tool commands need app-level actions; we just route to workspaces
    const tools = buildToolCommands({
      newPdf: () => setActive("pdf"),
      openPdf: () => setActive("pdf"),
      openScanner: () => setActive("scanner"),
      openOcr: () => setActive("ocr"),
      openCompare: () => setActive("compare"),
      openQr: () => setActive("qr-tools"),
      openDevTools: () => setActive("dev-tools"),
      openTextTools: () => setActive("text-tools"),
      openConverters: () => setActive("converters"),
      openCrypto: () => setActive("crypto"),
      openTimeTools: () => setActive("time-tools"),
      openCalcTools: () => setActive("calc-tools"),
      openCodeTools: () => setActive("code-tools"),
      openMediaTools: () => setActive("media-tools"),
      openCharts: () => setActive("charts"),
      paletteClose: close,
    });

    const settings = buildSettingsCommands({
      toggleTheme,
      toggleSidebar,
      toggleLanguage,
      openSettings: () => setActive("settings"),
      clearHistory,
      paletteClose: close,
    });

    return [...nav, ...tools, ...settings];
  }, [setActive, setOpen, toggleTheme, toggleSidebar, toggleLanguage, clearHistory]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase().trim();
    return commands.filter((c) => {
      const haystack = [c.title, c.subtitle || "", ...(c.keywords || [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [commands, query]);

  // Group commands
  const grouped = useMemo(() => {
    const map = new Map<Command["group"], Command[]>();
    for (const c of filtered) {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <CommandPrimitive
          label="Command Palette"
          className="flex flex-col"
          shouldFilter={false}
        >
          <div className="flex items-center gap-3 border-b border-white/10 px-4">
            <SearchIcon className="h-4 w-4 text-slate-500 shrink-0" />
            <CommandPrimitive.Input
              value={query}
              onValueChange={setQuery}
              placeholder="ابحث عن أداة أو انتقل إلى مساحة عمل..."
              autoFocus
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none py-4 font-medium"
            />
            <kbd className="text-[10px] text-slate-500 font-mono border border-white/10 rounded px-1.5 py-0.5">
              ESC
            </kbd>
          </div>

          <CommandPrimitive.List className="max-h-[60vh] overflow-y-auto safe-scrollbar p-2">
            {grouped.length === 0 && (
              <CommandPrimitive.Empty className="py-12 text-center text-sm text-slate-500">
                لا توجد نتائج مطابقة
              </CommandPrimitive.Empty>
            )}

            {grouped.map(([group, items]) => (
              <CommandPrimitive.Group
                key={group}
                heading={GROUP_LABELS[group]}
                className="mb-2"
              >
                {items.map((c) => {
                  const Icon = ICONS[c.icon || ""] || FileText;
                  return (
                    <CommandPrimitive.Item
                      key={c.id}
                      value={c.id}
                      onSelect={() => c.action()}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-gray-200 aria-selected:bg-blue-600/20 aria-selected:text-white transition-colors"
                    >
                      <Icon className="h-4 w-4 text-blue-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{c.title}</div>
                        {c.subtitle && (
                          <div className="text-[11px] text-slate-500 truncate">{c.subtitle}</div>
                        )}
                      </div>
                      {c.shortcut && (
                        <div className="flex items-center gap-1" dir="ltr">
                          {c.shortcut.map((k, i) => (
                            <kbd
                              key={i}
                              className="text-[10px] text-slate-500 font-mono border border-white/10 rounded px-1.5 py-0.5"
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      )}
                      <CornerDownLeft className="h-3 w-3 text-slate-500 opacity-0 aria-selected:opacity-100" />
                    </CommandPrimitive.Item>
                  );
                })}
              </CommandPrimitive.Group>
            ))}
          </CommandPrimitive.List>

          <div className="border-t border-white/10 px-4 py-2.5 flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                <span>للتنقل</span>
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" />
                <span>للتفعيل</span>
              </span>
            </div>
            <span className="text-blue-400 font-bold">عـزَّام • Command Palette</span>
          </div>
        </CommandPrimitive>
      </div>
    </div>
  );
};
