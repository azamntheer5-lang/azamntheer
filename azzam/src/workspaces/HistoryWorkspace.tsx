import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock, Trash2, Search, FileText, FileCode, FileSpreadsheet,
  Image as ImageIcon, ScanLine, Bot, CheckCircle2, XCircle, Info,
  BarChart3, Filter,
} from "lucide-react";
import { useHistoryStore, type HistoryEntry } from "../store/historyStore";
import { useToast } from "../context/ToastContext";

const TYPE_META: Record<HistoryEntry["type"], {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = {
  pdf:   { label: "PDF",   icon: FileText,        color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  word:  { label: "Word",  icon: FileCode,        color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  excel: { label: "Excel", icon: FileSpreadsheet, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  image: { label: "صورة",  icon: ImageIcon,       color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  scan:  { label: "مسح",   icon: ScanLine,        color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  ocr:   { label: "OCR",   icon: ScanLine,        color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  ai:    { label: "AI",    icon: Bot,             color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
};

const STATUS_META = {
  success: { label: "نجاح",    icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  error:   { label: "خطأ",     icon: XCircle,      className: "bg-rose-500/10 text-rose-400 border border-rose-500/20" },
  info:    { label: "معلومة",  icon: Info,         className: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
};

const fmt = (ts: number) =>
  new Date(ts).toLocaleString("ar-EG", {
    hour: "2-digit", minute: "2-digit",
    day: "numeric", month: "short", year: "numeric",
  });

const fmtSize = (bytes?: number) =>
  bytes ? (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`) : null;

export const HistoryWorkspace: React.FC = () => {
  const entries     = useHistoryStore((s) => s.entries);
  const clearAll    = useHistoryStore((s) => s.clearAll);
  const removeEntry = useHistoryStore((s) => s.removeEntry);
  const toast       = useToast();

  const [query,  setQuery]  = useState("");
  const [filter, setFilter] = useState<HistoryEntry["type"] | "all">("all");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filter !== "all" && e.type !== filter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return e.operation.toLowerCase().includes(q) || (e.fileName ?? "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [entries, query, filter]);

  const stats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) map[e.type] = (map[e.type] ?? 0) + 1;
    const success = entries.filter((e) => e.status === "success").length;
    return { map, success, errors: entries.filter((e) => e.status === "error").length };
  }, [entries]);

  const handleClearAll = () => {
    clearAll();
    toast.success("تم مسح السجل بالكامل");
  };

  return (
    <main className="flex-1 overflow-y-auto safe-scrollbar p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">سجل العمليات</h2>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{entries.length} عملية محفوظة</p>
            </div>
          </div>
          {entries.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl hover:bg-rose-500/20 transition-all cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              مسح الكل
            </button>
          )}
        </div>

        {/* Stats */}
        {entries.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "إجمالي العمليات", value: entries.length, icon: BarChart3, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
              { label: "ناجحة",           value: stats.success,  icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
              { label: "أخطاء",           value: stats.errors,   icon: XCircle, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
              { label: "أنواع الملفات",   value: Object.keys(stats.map).length, icon: Filter, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className={`glass-card rounded-xl p-4 border ${s.bg} flex items-center gap-3`}>
                  <div className={`h-9 w-9 rounded-lg ${s.bg} border flex items-center justify-center ${s.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-slate-500 font-semibold leading-tight">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filter chips */}
        {entries.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={`badge cursor-pointer transition-all ${filter === "all" ? "badge-blue" : "bg-white/[0.04]/5 text-slate-400 border border-white/10"}`}
            >
              الكل ({entries.length})
            </button>
            {(Object.keys(stats.map) as HistoryEntry["type"][]).map((type) => {
              const meta = TYPE_META[type];
              return (
                <button
                  key={type}
                  onClick={() => setFilter(filter === type ? "all" : type)}
                  className={`badge cursor-pointer transition-all ${filter === type ? "badge-blue" : "bg-white/[0.04]/5 text-slate-400 border border-white/10"}`}
                >
                  {meta.label} ({stats.map[type]})
                </button>
              );
            })}
          </div>
        )}

        {/* Search */}
        {entries.length > 0 && (
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في السجل..."
              className="w-full text-xs bg-white/[0.04]/[0.04] border border-white/[0.08] rounded-xl pr-9 pl-4 py-2.5 font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
        )}

        {/* Empty state */}
        {entries.length === 0 && (
          <div className="glass-card rounded-2xl p-16 border border-white/[0.06] text-center">
            <Clock className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-sm font-black text-slate-300 mb-2">لا يوجد سجل بعد</h3>
            <p className="text-xs text-slate-600 font-medium">
              ستظهر هنا جميع العمليات التي تقوم بها في التطبيق.
            </p>
          </div>
        )}

        {/* No results */}
        {entries.length > 0 && filtered.length === 0 && (
          <div className="glass-card rounded-2xl p-12 border border-white/[0.06] text-center">
            <Search className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-black text-slate-300">لا توجد نتائج</h3>
            <p className="text-xs text-slate-600 mt-1 font-medium">جرب تغيير البحث أو الفلتر.</p>
          </div>
        )}

        {/* Entry list */}
        <AnimatePresence>
          {filtered.length > 0 && (
            <div className="space-y-2">
              {filtered.map((entry, i) => {
                const meta   = TYPE_META[entry.type];
                const status = STATUS_META[entry.status];
                const Icon   = meta.icon;
                const StatusIcon = status.icon;
                const size   = fmtSize(entry.fileSize);

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass-card rounded-xl p-4 border border-white/[0.06] hover:border-white/[0.1] flex items-center gap-3 transition-all"
                  >
                    {/* Type icon */}
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center border shrink-0 ${meta.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate leading-tight">{entry.operation}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-600 font-medium flex-wrap">
                        <span>{fmt(entry.timestamp)}</span>
                        {entry.fileName && <><span>•</span><span className="truncate max-w-[120px]">{entry.fileName}</span></>}
                        {size && <><span>•</span><span>{size}</span></>}
                      </div>
                    </div>

                    {/* Status + delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`badge text-[9px] flex items-center gap-1 ${status.className}`}>
                        <StatusIcon className="h-2.5 w-2.5" />
                        {status.label}
                      </span>
                      <button
                        onClick={() => removeEntry(entry.id)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};
