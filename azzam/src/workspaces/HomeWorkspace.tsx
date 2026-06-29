import React from "react";
import { motion } from "motion/react";
import {
  FileText, FileCode, FileSpreadsheet, Image as ImageIcon, ScanLine, Camera,
  GitCompare, QrCode, ArrowLeft, UploadCloud, Sparkles, ShieldCheck,
} from "lucide-react";
import { useUIStore } from "../store/uiStore";
import { useHistoryStore } from "../store/historyStore";
import { usePdfStore } from "../store/pdfStore";
import { CloudApiService } from "../services/api";

const CARDS = [
  {
    id: "pdf" as const,
    title: "أدوات PDF المتطورة",
    items: ["دمج وتقسيم", "تنظيم وترتيب", "علامات مائية وتوقيع", "استخراج النصوص"],
    icon: FileText,
    glow: "glow-blue",
    iconBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    accent: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  },
  {
    id: "word" as const,
    title: "أدوات Word",
    items: ["قراءة ملفات DOCX", "حساب الكلمات", "تصدير إلى PDF", "محرر متكامل"],
    icon: FileCode,
    glow: "glow-purple",
    iconBg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    accent: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  },
  {
    id: "excel" as const,
    title: "جداول Excel",
    items: ["قراءة XLSX و CSV", "تصفح الجداول", "تصدير HTML/PDF", "بحث وتصفية"],
    icon: FileSpreadsheet,
    glow: "glow-green",
    iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    accent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  {
    id: "image" as const,
    title: "استوديو الصور",
    items: ["تحويل الصيغ", "ضغط وتغيير الأبعاد", "دمج صور في PDF", "فلاتر ذكية"],
    icon: ImageIcon,
    glow: "glow-orange",
    iconBg: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    accent: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  },
];

const TOOLS = [
  { id: "ocr" as const, title: "OCR — استخراج النص", desc: "من صور أو PDF ممسوح ضوئياً", icon: ScanLine },
  { id: "scanner" as const, title: "ماسح ضوئي", desc: "كاميرا + فلاتر ذكية", icon: Camera },
  { id: "compare" as const, title: "مقارنة المستندات", desc: "PDF أو صور", icon: GitCompare },
  { id: "qr-tools" as const, title: "أدوات QR / Barcode", desc: "توليد وقراءة الرموز", icon: QrCode },
];

export const HomeWorkspace: React.FC = () => {
  const setActive = useUIStore((s) => s.setActiveWorkspace);
  const setProcessing = useUIStore((s) => s.setProcessing);
  const setDoc = usePdfStore((s) => s.setDoc);
  const addHistory = useHistoryStore((s) => s.addEntry);
  const entries = useHistoryStore((s) => s.entries);
  const recent = entries.slice(0, 4);

  const handleQuickUpload = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") {
      setActive("pdf");
      setProcessing(true, "جاري رفع وتحليل ملف PDF...", 10);
      try {
        const result = await CloudApiService.uploadPDF(file, (p) => {
          setProcessing(true, p.statusText || "جاري الرفع...", p.uploadProgress || 0);
        });
        setDoc({
          bytes: result.bytes,
          name: result.name,
          size: result.size,
          totalPages: result.totalPages,
          extractedText: result.extractedText,
        });
        addHistory({
          type: "pdf",
          operation: `رفع ملف PDF: ${result.name}`,
          fileName: result.name,
          fileSize: result.size,
          status: "success",
        });
      } catch (err: any) {
        addHistory({
          type: "pdf",
          operation: `فشل رفع PDF: ${file.name}`,
          status: "error",
          meta: { error: err.message },
        });
      } finally {
        setProcessing(false);
      }
    } else if (ext === "docx") {
      setActive("word");
    } else if (ext === "xlsx" || ext === "csv") {
      setActive("excel");
    } else if (["png", "jpg", "jpeg", "webp", "tiff", "heic"].includes(ext || "")) {
      setActive("image");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto safe-scrollbar p-6 space-y-10">
      {/* Hero */}
      <div className="text-center space-y-4 pt-4 relative">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-[0_0_40px_rgba(99,102,241,0.5)] border border-white/20 select-none"
        >
          <span className="font-black text-white text-5xl font-serif">ع</span>
        </motion.div>

        <div className="space-y-1">
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-normal font-sans mb-1">عـزَّام</h1>
          <h2 className="text-2xl md:text-3xl font-black text-gray-100 tracking-wide">
            Azzam File Processing Suite
          </h2>
          <p className="text-xs md:text-sm font-bold text-gray-400 tracking-wider">
            منصة احترافية متكاملة لمعالجة PDF و Word و Excel و الصور — بأمان وسرعة داخل متصفحك.
          </p>
        </div>
      </div>

      {/* 4 Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`glass-panel rounded-2xl p-5 shadow-sm border border-white/10 ${c.glow} hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-between h-56`}
            >
              <div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.iconBg} mb-4`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-black text-white mb-2">{c.title}</h3>
                <ul className="text-[11px] text-gray-400 space-y-1 font-semibold">
                  {c.items.map((it) => (
                    <li key={it}>• {it}</li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-end pt-2">
                <div className={`h-7 w-7 rounded-full border flex items-center justify-center ${c.accent}`}>
                  <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Specialized tools row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-7xl mx-auto">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className="glass-panel rounded-xl p-4 border border-white/5 hover:border-white/15 text-right transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/10">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-white truncate">{t.title}</div>
                  <div className="text-[10px] text-gray-400 truncate">{t.desc}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Recent activity (only if any) */}
      {recent.length > 0 && (
        <div className="max-w-7xl mx-auto w-full">
          <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span>النشاط الأخير</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {recent.map((entry) => (
              <div
                key={entry.id}
                className="glass-panel rounded-xl p-3 border border-white/5 flex items-center gap-3"
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black ${
                  entry.status === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : entry.status === "error" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                }`}>
                  {entry.type.toUpperCase().slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-white truncate">{entry.operation}</div>
                  <div className="text-[9px] text-gray-400">
                    {new Date(entry.timestamp).toLocaleString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Zone */}
      <div className="max-w-7xl mx-auto w-full pb-8">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleQuickUpload(e.dataTransfer.files[0]);
            }
          }}
          className="glass-panel border-2 border-dashed border-blue-500/30 hover:border-blue-400/60 rounded-3xl p-14 flex flex-col items-center justify-center text-center cursor-pointer relative overflow-hidden group transition-all"
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 group-hover:opacity-30 transition-all">
            <div className="w-56 h-56 rounded-full border border-dashed border-blue-400/30 animate-spin" style={{ animationDuration: "12s" }} />
            <div
              className="absolute w-80 h-80 rounded-full border border-dashed border-indigo-400/20 animate-spin"
              style={{ animationDuration: "25s", animationDirection: "reverse" }}
            />
          </div>

          <div className="p-4.5 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-4 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <UploadCloud className="h-10 w-10 animate-pulse" />
          </div>

          <h3 className="text-base font-black text-white mb-1.5 z-10">اسحب أي ملف هنا للتحليل التلقائي</h3>
          <p className="text-xs text-gray-400 mb-6 font-semibold max-w-lg leading-relaxed z-10">
            يدعم PDF و Word و Excel و صور بكافة الصيغ. سيتم تحويلك تلقائياً للمساحة الصحيحة.
          </p>

          <label className="z-10 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.3)] cursor-pointer select-none">
            اختر ملفاً من جهازك
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) handleQuickUpload(e.target.files[0]);
              }}
            />
          </label>

          <div className="z-10 mt-6 flex items-center gap-1.5 text-[10px] text-gray-400 font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>كل المعالجة تتم محلياً داخل متصفحك بأمان تام</span>
          </div>
        </div>
      </div>
    </div>
  );
};
