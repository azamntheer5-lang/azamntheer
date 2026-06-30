import React, { useState } from "react";
import { Gauge, Check, RefreshCw, Sparkles, TrendingDown } from "lucide-react";

interface CompressionPanelProps {
  onCompress: (level: "light" | "medium" | "aggressive") => Promise<void>;
  originalSize: number | null;
  compressedSize: number | null;
  isProcessing: boolean;
}

const LEVELS = [
  {
    id: "light" as const,
    title: "ضغط خفيف",
    desc: "إزالة البيانات الزائدة مع الاحتفاظ بجودة الصور الأصلية.",
    badge: "جودة 100%",
    color: "border-emerald-500/30 bg-emerald-500/5",
    activeBg: "border-emerald-500 bg-emerald-500/10",
    dotColor: "bg-emerald-400",
  },
  {
    id: "medium" as const,
    title: "متوسط (مُوصَى به)",
    desc: "ضغط الصور ومقاطع الدقة مع الحفاظ على الجودة بشكل ملحوظ.",
    badge: "الأفضل توازناً",
    color: "border-blue-500/30 bg-blue-500/5",
    activeBg: "border-blue-500 bg-blue-500/10",
    dotColor: "bg-blue-400",
  },
  {
    id: "aggressive" as const,
    title: "ضغط قوي",
    desc: "أقصى تقليص ممكن للحجم للمشاركة السريعة.",
    badge: "أصغر حجم",
    color: "border-amber-500/30 bg-amber-500/5",
    activeBg: "border-amber-500 bg-amber-500/10",
    dotColor: "bg-amber-400",
  },
] as const;

const fmt = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};

export const CompressionPanel: React.FC<CompressionPanelProps> = ({
  onCompress, originalSize, compressedSize, isProcessing,
}) => {
  const [level, setLevel] = useState<"light" | "medium" | "aggressive">("medium");

  const savings =
    originalSize && compressedSize && compressedSize < originalSize
      ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
      : null;

  return (
    <div className="max-w-3xl mx-auto space-y-5 select-none">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <Gauge className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-xs font-black text-white">ضغط حجم ملف PDF</h3>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">تقليص الحجم مع الحفاظ على الجودة</p>
        </div>
      </div>

      {/* Level selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLevel(l.id)}
            className={`cursor-pointer rounded-xl border p-4 transition-all text-right relative ${
              level === l.id ? l.activeBg : l.color + " hover:brightness-110"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`badge text-[9px] ${level === l.id ? "badge-blue" : "bg-white/[0.04]/5 text-slate-500 border border-white/10"}`}>
                {l.badge}
              </span>
              {level === l.id && (
                <div className={`h-5 w-5 rounded-full ${l.dotColor} flex items-center justify-center`}>
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <p className="text-xs font-black text-white mb-1">{l.title}</p>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">{l.desc}</p>
          </button>
        ))}
      </div>

      {/* Stats */}
      {originalSize && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "الحجم الأصلي", value: fmt(originalSize), color: "text-white" },
            { label: "الحجم الجديد",  value: compressedSize ? fmt(compressedSize) : "—",  color: "text-blue-400" },
            { label: "التوفير",        value: savings ? `${savings}%` : "—",              color: "text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-3 border border-white/[0.06] text-center">
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Savings callout */}
      {savings && savings > 0 && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-300 font-bold">
            تم توفير {fmt(originalSize! - compressedSize!)} — {savings}% تقليص في الحجم
          </p>
        </div>
      )}

      {/* Action */}
      <button
        onClick={() => onCompress(level)}
        disabled={isProcessing}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl btn-primary text-white text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing
          ? <RefreshCw className="h-4 w-4 animate-spin" />
          : <TrendingDown className="h-4 w-4" />
        }
        {isProcessing ? "جاري الضغط..." : "تطبيق الضغط الآن"}
      </button>
    </div>
  );
};
