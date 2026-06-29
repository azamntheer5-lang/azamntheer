import React, { useState, useMemo } from "react";
import {
  Home, FileText, FileCode, FileSpreadsheet, Image as ImageIcon,
  ScanLine, Camera, GitCompare, QrCode, Clock, Settings, HelpCircle,
  ChevronLeft, ChevronRight, ShieldCheck, Command as CommandIcon,
  Code2, Type, ArrowLeftRight, Lock, Calendar, Calculator,
  Search, Zap, Sparkles, Crown,
} from "lucide-react";
import { useUIStore, type WorkspaceId } from "../store/uiStore";
import { useThemeStore } from "../store/themeStore";

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavItem {
  id: WorkspaceId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeClass?: string;
  color?: string;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "الرئيسية",
    items: [
      { id: "home", label: "لوحة التحكم", icon: Home, color: "text-blue-400" },
    ],
  },
  {
    label: "أدوات المستندات",
    items: [
      { id: "pdf",   label: "PDF Expert", icon: FileText, badge: "متقدم", badgeClass: "badge-blue", color: "text-blue-400" },
      { id: "word",  label: "Word Tools", icon: FileCode, color: "text-violet-400" },
      { id: "excel", label: "Excel Studio", icon: FileSpreadsheet, color: "text-emerald-400" },
    ],
  },
  {
    label: "الوسائط والذكاء",
    items: [
      { id: "image",    label: "استوديو الصور", icon: ImageIcon, color: "text-orange-400" },
      { id: "ocr",      label: "استخراج النص", icon: ScanLine, color: "text-cyan-400" },
      { id: "scanner",  label: "الماسح الضوئي", icon: Camera, color: "text-pink-400" },
      { id: "compare",  label: "مقارنة المستندات", icon: GitCompare, color: "text-indigo-400" },
      { id: "qr-tools", label: "QR / Barcode", icon: QrCode, color: "text-yellow-400" },
    ],
  },
  {
    label: "أدوات احترافية",
    items: [
      { id: "dev-tools",   label: "أدوات المطور", icon: Code2, badge: "جديد", badgeClass: "badge-pink", color: "text-pink-400" },
      { id: "text-tools",  label: "أدوات النصوص", icon: Type, badge: "جديد", badgeClass: "badge-pink", color: "text-cyan-400" },
      { id: "converters",  label: "محوّلات", icon: ArrowLeftRight, badge: "جديد", badgeClass: "badge-pink", color: "text-amber-400" },
      { id: "crypto",      label: "تشفير وكلمات سر", icon: Lock, badge: "جديد", badgeClass: "badge-pink", color: "text-rose-400" },
      { id: "time-tools",  label: "وقت وتاريخ", icon: Calendar, badge: "جديد", badgeClass: "badge-pink", color: "text-teal-400" },
      { id: "calc-tools",  label: "حاسبات", icon: Calculator, badge: "جديد", badgeClass: "badge-pink", color: "text-emerald-400" },
    ],
  },
  {
    label: "النظام",
    items: [
      { id: "history",  label: "السجل", icon: Clock, color: "text-slate-400" },
      { id: "settings", label: "الإعدادات", icon: Settings, color: "text-slate-400" },
      { id: "help",     label: "المساعدة", icon: HelpCircle, color: "text-slate-400" },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items);

export const Sidebar: React.FC = () => {
  const collapsed   = useUIStore((s) => s.sidebarCollapsed);
  const toggle      = useUIStore((s) => s.toggleSidebar);
  const active      = useUIStore((s) => s.activeWorkspace);
  const setActive   = useUIStore((s) => s.setActiveWorkspace);
  const setPalette  = useUIStore((s) => s.setCommandPaletteOpen);
  const themeMode   = useThemeStore((s) => s.mode);
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return NAV_GROUPS;
    const q = query.toLowerCase().trim();
    return NAV_GROUPS
      .map(g => ({
        ...g,
        items: g.items.filter(it => it.label.toLowerCase().includes(q) || it.id.toLowerCase().includes(q)),
      }))
      .filter(g => g.items.length > 0);
  }, [query]);

  return (
    <aside
      className={`glass-panel border-l border-white/[0.06] flex flex-col shrink-0 transition-all duration-300 ease-in-out z-20 relative select-none ${
        collapsed ? "w-[72px]" : "w-[270px]"
      }`}
    >
      {/* Brand */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/[0.06] ${collapsed ? "justify-center" : ""}`}>
        <div className="relative shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-white/20">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#04070f] dot-online" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black tracking-wide leading-tight gradient-text-static font-display">
              عـزَّام برو
            </h2>
            <p className="text-[10px] font-semibold text-slate-500 leading-tight mt-0.5 flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5 text-amber-400" />
              Azzam Pro v2.0
            </p>
          </div>
        )}
      </div>

      {/* Command trigger */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => setPalette(true)}
          title="بحث وأوامر (Ctrl+K)"
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-all duration-200 group ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <CommandIcon className="h-4 w-4 text-blue-400 shrink-0" />
          {!collapsed && (
            <>
              <span className="text-xs font-semibold flex-1 text-right text-slate-400">بحث سريع...</span>
              <kbd className="text-[9px] text-slate-500 font-mono border border-white/10 rounded-md px-1.5 py-0.5 bg-white/[0.04]">
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Local search (only when expanded) */}
      {!collapsed && (
        <div className="px-3 pt-1 pb-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="تصفية الأدوات..."
              className="input-field w-full !text-[11px] !py-2 !pr-9 !pl-3"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto safe-scrollbar px-3 py-2 space-y-1">
        {filteredGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-3 py-2">
                {group.label}
              </p>
            )}
            {collapsed && <div className="separator my-2" />}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon   = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActive(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer nav-item ${
                      isActive ? "nav-active text-white" : "text-slate-400 hover:text-slate-200"
                    } ${collapsed ? "justify-center" : ""}`}
                  >
                    <Icon className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                      isActive ? "text-blue-400" : (item.color || "text-slate-500")
                    }`} />
                    {!collapsed && (
                      <span className="text-[12.5px] font-semibold flex-1 text-right leading-none truncate">
                        {item.label}
                      </span>
                    )}
                    {!collapsed && item.badge && (
                      <span className={`badge ${item.badgeClass || "badge-blue"}`}>{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {filteredGroups.length === 0 && !collapsed && (
          <div className="text-center py-6 text-xs text-slate-500">
            لا توجد نتائج
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.06] p-3 space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-emerald-400">معالجة محلية 100%</p>
              <p className="text-[9px] text-slate-500 leading-tight mt-0.5 font-medium">
                ملفاتك لا تغادر متصفحك
              </p>
            </div>
            <span className="badge badge-emerald text-[9px]">{themeMode}</span>
          </div>
        )}

        <button
          onClick={toggle}
          title={collapsed ? "توسيع" : "طي"}
          className="w-full flex items-center justify-center py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.05] text-slate-500 hover:text-slate-300 transition-all duration-200 cursor-pointer"
        >
          {collapsed
            ? <ChevronLeft className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />
          }
        </button>
      </div>
    </aside>
  );
};
