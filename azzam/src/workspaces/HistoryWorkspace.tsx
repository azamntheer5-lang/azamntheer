import React, { useState, useMemo } from "react";
import {
  Clock, Trash2, Search, Filter, FileText, FileCode, FileSpreadsheet,
  Image as ImageIcon, ScanLine, Bot, RefreshCw,
} from "lucide-react";
import { useHistoryStore, type HistoryEntry } from "../store/historyStore";
import { useToast } from "../context/ToastContext";

const TYPE_META: Record<HistoryEntry["type"], { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  pdf: { label: "PDF", icon: FileText, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  word: { label: "Word", icon: FileCode, color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  excel: { label: "Excel", icon: FileSpreadsheet, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  image: { label: "صورة", icon: ImageIcon, color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  scan: { label: "مسح", icon: ScanLine, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  ocr: { label: "OCR", icon: ScanLine, color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  ai: { label: "AI", icon: Bot, color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
};

export const HistoryWorkspace: React.FC = () => {
  const entries = useHistoryStore((s) => s.entries);
  const clearAll = useHistoryStore((s) => s.clearAll);
  const removeEntry = useHistoryStore((s) => s.removeEntry);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HistoryEntry["type"] | "all">("all");

  const toast = useToast();

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filter !== "all" && e.type !== filter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          e.operation.toLowerCase().includes(q) ||
          (e.fileName || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entries, query, filter]);

  const stats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      map[e.type] = (map[e.type] || 0) + 1;
    }
    return map;
  }, [entries]);

  return (
    <main className="flex-1 overflow-y-auto safe-scrollbar p-6 relative" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">سجل العمليات</h2>
              <p className="text-[11px] text-gray-400 font-bold mt-0.5">
                {entries.length} عملية مسجلة — تتم محلياً داخل متصفحك
              </p>
            </div>
          </div>
          {entries.length > 0 && (
            <button
              onClick={() => {
                if (confirm("هل أنت متأكد من مسح كامل السجل؟")) {
                  clearAll();
                  toast.success("تم مسح السجل");
                }
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-300 hover:text-rose-200 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg cursor-pointer transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>مسح الكل</span>
            </button>
          )}
        </div>

        {/* Stats by type */}
        {Object.keys(stats).length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(stats).map(([type, count]) => {
              const meta = TYPE_META[type as HistoryEntry["type"]];
              const Icon = meta.icon;
              return (
                <div
                  key={type}
                  onClick={() => setFilter(filter === type ? "all" : (type as any))}
                  className={`glass-card rounded-xl p-3 border cursor-pointer transition-all ${
                    filter === type ? "border-white/30 bg-white/10" : "border-white/5 hover:border-white/15"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center border ${meta.color} mb-2`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-lg font-black text-white">{count}</div>
                  <div className="text-[10px] text-gray-400 font-bold">{meta.label}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Search & filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في السجل..."
              className="w-full text-xs bg-slate-900/40 border border-white/10 rounded-lg pr-9 pl-4 py-2.5 font-bold text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          {filter !== "all" && (
            <button
              onClick={() => setFilter("all")}
              className="flex items-center gap-1 text-xs font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-lg cursor-pointer"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>{TYPE_META[filter as HistoryEntry["type"]]?.label}</span>
              <span className="text-gray-400">✕</span>
            </button>
          )}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 border border-white/10 text-center">
            <Clock className="h-10 w-10 text-gray-500 mx-auto mb-3" />
            <h3 className="text-sm font-black text-gray-300">
              {entries.length === 0 ? "لا يوجد سجل بعد" : "لا توجد نتائج مطابقة"}
            </h3>
            <p className="text-[11px] text-gray-500 mt-1">
              {entries.length === 0
                ? "ستظهر هنا كل العمليات التي تقوم بها في التطبيق."
                : "جرب تغيير البحث أو الفلتر."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((entry) => {
              const meta = TYPE_META[entry.type];
              const Icon = meta.icon;
              return (
                <div
                  key={entry.id}
                  className="glass-card rounded-xl p-4 border border-white/5 hover:border-white/10 flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center border shrink-0 ${meta.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{entry.operation}</div>
                      <div className="text-[10px] text-gray-400 font-bold flex items-center gap-2">
                        <span>{new Date(entry.timestamp).toLocaleString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}</span>
                        {entry.fileName && <span>• {entry.fileName}</span>}
                        {entry.fileSize && <span>• {(entry.fileSize / 1024).toFixed(1)} KB</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                        entry.status === "success"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : entry.status === "error"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {entry.status === "success" ? "نجاح" : entry.status === "error" ? "خطأ" : "معلومة"}
                    </span>
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="text-gray-500 hover:text-rose-400 transition-colors p-1.5"
                      title="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};
