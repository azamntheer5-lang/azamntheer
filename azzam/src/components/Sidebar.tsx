import React from "react";
import {
  Home, FileText, FileCode, FileSpreadsheet, Image as ImageIcon, ScanLine,
  Camera, GitCompare, QrCode, Clock, Settings, HelpCircle,
  ChevronLeft, ChevronRight, ShieldCheck, Command as CommandIcon,
} from "lucide-react";
import { useUIStore, type WorkspaceId } from "../store/uiStore";

interface NavItem {
  id: WorkspaceId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { id: "home", label: "الرئيسية", icon: Home },
  { id: "pdf", label: "أدوات PDF", icon: FileText },
  { id: "word", label: "أدوات Word", icon: FileCode },
  { id: "excel", label: "جداول Excel", icon: FileSpreadsheet },
  { id: "image", label: "استوديو الصور", icon: ImageIcon },
  { id: "ocr", label: "OCR — استخراج نص", icon: ScanLine },
  { id: "scanner", label: "الماسح الضوئي", icon: Camera },
  { id: "compare", label: "مقارنة المستندات", icon: GitCompare },
  { id: "qr-tools", label: "أدوات QR / Barcode", icon: QrCode },
  { id: "history", label: "سجل العمليات", icon: Clock },
  { id: "settings", label: "الإعدادات", icon: Settings },
  { id: "help", label: "مركز المساعدة", icon: HelpCircle },
];

export const Sidebar: React.FC = () => {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const active = useUIStore((s) => s.activeWorkspace);
  const setActive = useUIStore((s) => s.setActiveWorkspace);
  const setPalette = useUIStore((s) => s.setCommandPaletteOpen);

  return (
    <aside
      className={`glass-panel border-l border-white/10 flex flex-col justify-between shrink-0 transition-all duration-300 z-20 relative select-none ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex flex-col flex-1 overflow-y-auto safe-scrollbar p-4">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8 px-2 justify-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-white/20">
            <span className="font-black text-white text-lg font-serif">ع</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col text-right">
              <h2 className="text-lg font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                عـزَّام
              </h2>
              <span className="text-[10px] font-bold text-gray-400 tracking-wider">Azzam Suite • Pro</span>
            </div>
          )}
        </div>

        {/* Command Palette trigger */}
        <button
          onClick={() => setPalette(true)}
          className={`mb-4 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white transition-all cursor-pointer group ${
            collapsed ? "justify-center" : ""
          }`}
          title="فتح لوحة الأوامر (Ctrl+K)"
        >
          <CommandIcon className="h-4 w-4 text-blue-400 shrink-0" />
          {!collapsed && (
            <>
              <span className="text-xs font-bold flex-1 text-right">بحث وأوامر</span>
              <kbd className="text-[9px] text-gray-400 font-mono border border-white/10 rounded px-1 py-0.5">
                ⌘K
              </kbd>
            </>
          )}
        </button>

        {/* Navigation */}
        <nav className="space-y-1.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600/30 to-indigo-600/10 border-r-2 border-blue-500 text-white shadow-md shadow-blue-500/5 backdrop-blur-md"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
                title={item.label}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-blue-400" : "text-gray-400"}`} />
                {!collapsed && <span className="text-xs font-bold leading-none">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 space-y-4">
        {!collapsed && (
          <div className="glass-panel p-3 rounded-xl border border-white/5 text-center relative overflow-hidden">
            <div className="flex items-center gap-2 justify-center mb-1">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-[10px] font-extrabold text-emerald-400">خصوصية 100%</span>
            </div>
            <p className="text-[9px] text-gray-400 leading-relaxed font-semibold">
              جميع العمليات تتم داخل متصفحك بأمان تام.
            </p>
          </div>
        )}

        <button
          onClick={toggle}
          className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white cursor-pointer transition-all"
          title={collapsed ? "توسيع الشريط" : "طي الشريط"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
};
