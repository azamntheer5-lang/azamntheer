import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText, FileCode, FileSpreadsheet, Image as ImageIcon,
  ScanLine, Camera, GitCompare, QrCode, ArrowLeft,
  UploadCloud, ShieldCheck, Sparkles, Clock, Zap,
  ChevronRight, Star, TrendingUp, Files,
} from "lucide-react";
import { useUIStore } from "../store/uiStore";
import { useHistoryStore } from "../store/historyStore";
import { usePdfStore } from "../store/pdfStore";
import { CloudApiService } from "../services/api";

/* ────────────────────────────────── data ── */

const MAIN_TOOLS = [
  {
    id: "pdf" as const,
    title: "PDF",
    subtitle: "أدوات متكاملة",
    desc: "دمج · تقسيم · تنظيم · علامات مائية · محرر متقدم · ضغط وتحويل",
    icon: FileText,
    gradient: "from-blue-600 to-blue-500",
    glow: "glow-blue",
    accent: "blue",
    border: "border-blue-500/20",
    iconBg: "bg-blue-500/10 text-blue-400",
    tag: "الأكثر استخداماً",
    tagColor: "badge-blue",
  },
  {
    id: "word" as const,
    title: "Word",
    subtitle: "معالجة DOCX",
    desc: "قراءة · تحليل · إحصاءات · تصدير PDF · محرر متكامل",
    icon: FileCode,
    gradient: "from-violet-600 to-purple-500",
    glow: "glow-purple",
    accent: "violet",
    border: "border-violet-500/20",
    iconBg: "bg-violet-500/10 text-violet-400",
    tag: "محرر كامل",
    tagColor: "badge-purple",
  },
  {
    id: "excel" as const,
    title: "Excel",
    subtitle: "جداول البيانات",
    desc: "XLSX · CSV · تصفح تفاعلي · بحث وتصفية · تصدير HTML",
    icon: FileSpreadsheet,
    gradient: "from-emerald-600 to-green-500",
    glow: "glow-green",
    accent: "emerald",
    border: "border-emerald-500/20",
    iconBg: "bg-emerald-500/10 text-emerald-400",
    tag: "جداول ذكية",
    tagColor: "badge-green",
  },
  {
    id: "image" as const,
    title: "الصور",
    subtitle: "استوديو متكامل",
    desc: "تحويل صيغ · ضغط · دمج في PDF · فلاتر · تغيير الأبعاد",
    icon: ImageIcon,
    gradient: "from-orange-600 to-amber-500",
    glow: "glow-orange",
    accent: "orange",
    border: "border-orange-500/20",
    iconBg: "bg-orange-500/10 text-orange-400",
    tag: "فلاتر ذكية",
    tagColor: "badge-amber",
  },
] as const;

const QUICK_TOOLS = [
  { id: "ocr"      as const, label: "OCR — استخراج النص", desc: "من صور أو PDF ممسوح", icon: ScanLine,   color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/20" },
  { id: "scanner"  as const, label: "الماسح الضوئي",       desc: "كاميرا + فلاتر",    icon: Camera,     color: "text-pink-400",   bg: "bg-pink-500/10 border-pink-500/20" },
  { id: "compare"  as const, label: "مقارنة المستندات",    desc: "PDF أو صور",        icon: GitCompare, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
  { id: "qr-tools" as const, label: "QR / Barcode",        desc: "توليد وقراءة",      icon: QrCode,     color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
];

const STATS = [
  { label: "صيغة مدعومة",  value: "15+", icon: Files,      color: "text-blue-400" },
  { label: "معالجة محلية", value: "100%", icon: ShieldCheck, color: "text-emerald-400" },
  { label: "أداة متخصصة",  value: "20+", icon: Zap,         color: "text-violet-400" },
  { label: "تقييم المستخدمين", value: "4.9", icon: Star,    color: "text-amber-400" },
];

/* ────────────────────────────────── helpers ── */

const typeColor = (type: string) => {
  const map: Record<string, string> = {
    pdf:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
    word:  "bg-violet-500/10 text-violet-400 border-violet-500/20",
    excel: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    image: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  };
  return map[type] ?? "bg-white/5 text-slate-400 border-white/10";
};

/* ────────────────────────────────── component ── */

export const HomeWorkspace: React.FC = () => {
  const setActive     = useUIStore((s) => s.setActiveWorkspace);
  const setProcessing = useUIStore((s) => s.setProcessing);
  const setDoc        = usePdfStore((s) => s.setDoc);
  const addHistory    = useHistoryStore((s) => s.addEntry);
  const entries       = useHistoryStore((s) => s.entries);
  const recent        = entries.slice(0, 4);

  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "pdf") {
      setActive("pdf");
      setProcessing(true, "جاري تحليل الملف...", 10);
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
        addHistory({ type: "pdf", operation: `رفع: ${result.name}`, fileName: result.name, fileSize: result.size, status: "success" });
      } catch (err: any) {
        addHistory({ type: "pdf", operation: `فشل رفع: ${file.name}`, status: "error", meta: { error: err.message } });
      } finally {
        setProcessing(false);
      }
    } else if (ext === "docx") {
      setActive("word");
    } else if (ext === "xlsx" || ext === "csv") {
      setActive("excel");
    } else if (["png","jpg","jpeg","webp","tiff","heic","bmp"].includes(ext)) {
      setActive("image");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto safe-scrollbar">
      {/* ── Hero Section ── */}
      <div className="relative overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        {/* Radial fade overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#04070f] pointer-events-none" />

        <div className="relative px-8 pt-12 pb-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className="inline-flex flex-col items-center gap-4 mb-6"
          >
            {/* Logo */}
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-[0_0_60px_rgba(99,102,241,0.5)] border border-white/20">
                <span className="font-black text-white text-4xl font-serif leading-none">ع</span>
              </div>
              {/* Rotating ring */}
              <div className="absolute inset-[-8px] rounded-2xl border border-dashed border-indigo-500/25 spin-slow pointer-events-none" />
              <div className="absolute inset-[-16px] rounded-3xl border border-dashed border-purple-500/15 spin-slow-rev pointer-events-none" />
            </div>

            <div className="space-y-1">
              <span className="badge badge-blue mb-1">
                <Sparkles className="h-2.5 w-2.5" />
                الإصدار 1.0 — مستقر
              </span>
              <h1 className="text-5xl font-black tracking-wide gradient-text leading-tight">
                عـزَّام
              </h1>
              <p className="text-xl font-bold text-slate-400">
                Azzam File Processing Suite
              </p>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed font-medium mt-2">
                منصة احترافية متكاملة لمعالجة PDF و Word و Excel والصور —<br />
                بأمان تام داخل متصفحك بدون رفع أي ملف.
              </p>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center justify-center gap-8 mt-4"
          >
            {STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex flex-col items-center gap-1">
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                    <Icon className={`h-3 w-3 ${s.color}`} />
                    {s.label}
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>

      <div className="px-6 md:px-8 space-y-8 pb-12">

        {/* ── Upload Zone ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45 }}
        >
          <div
            className={`upload-zone glass-card rounded-2xl border-2 border-dashed p-10 flex flex-col items-center justify-center text-center relative overflow-hidden ${
              isDragging ? "drag-over border-indigo-400/50" : "border-white/10"
            }`}
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragOver={(e)  => { e.preventDefault(); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
            }}
            onClick={() => inputRef.current?.click()}
          >
            {/* Decorative rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
              <div className="h-64 w-64 rounded-full border border-dashed border-indigo-400/50 spin-slow" />
              <div className="absolute h-96 w-96 rounded-full border border-dashed border-purple-400/30 spin-slow-rev" />
            </div>

            <motion.div
              animate={{ y: isDragging ? -6 : [0, -4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10 mb-4"
            >
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                <UploadCloud className={`h-7 w-7 text-indigo-400 transition-transform ${isDragging ? "scale-110" : ""}`} />
              </div>
            </motion.div>

            <div className="relative z-10 space-y-2">
              <h3 className="text-base font-black text-white">
                {isDragging ? "أفلت الملف هنا ✨" : "اسحب أي ملف للتحليل الفوري"}
              </h3>
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                PDF · Word · Excel · PNG · JPG · WebP · TIFF وأكثر
              </p>
            </div>

            <button
              className="relative z-10 mt-5 btn-primary px-6 py-2.5 rounded-xl text-white text-xs font-bold cursor-pointer select-none"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            >
              اختر ملفاً من جهازك
            </button>

            <div className="relative z-10 mt-4 flex items-center gap-1.5 text-[10px] text-slate-600 font-semibold">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              <span>معالجة محلية — ملفاتك لا تغادر متصفحك أبداً</span>
            </div>

            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
          </div>
        </motion.div>

        {/* ── Main Tools Grid ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-black text-slate-200">الأدوات الرئيسية</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {MAIN_TOOLS.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.07 }}
                  onClick={() => setActive(tool.id)}
                  className={`feature-card glass-card rounded-2xl p-5 border ${tool.border} ${tool.glow} flex flex-col gap-3 h-52`}
                >
                  {/* Icon + tag */}
                  <div className="flex items-start justify-between">
                    <div className={`h-11 w-11 rounded-xl ${tool.iconBg} border ${tool.border} flex items-center justify-center`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`badge ${tool.tagColor}`}>{tool.tag}</span>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="text-base font-black text-white leading-tight">{tool.title}</h3>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{tool.subtitle}</p>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium flex-1">
                    {tool.desc}
                  </p>

                  {/* Arrow */}
                  <div className="flex justify-end">
                    <div className={`h-7 w-7 rounded-full ${tool.iconBg} border ${tool.border} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Quick Tools Row ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.45 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-black text-slate-200">أدوات متخصصة</h2>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {QUICK_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActive(tool.id)}
                  className={`glass-card rounded-xl p-4 border ${tool.bg} flex items-center gap-3 text-right cursor-pointer group`}
                >
                  <div className={`h-9 w-9 rounded-lg ${tool.bg} border flex items-center justify-center ${tool.color} shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-slate-200 truncate leading-tight">{tool.label}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{tool.desc}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 rotate-180" />
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Recent Activity ── */}
        <AnimatePresence>
          {recent.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.45 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <h2 className="text-sm font-black text-slate-200">النشاط الأخير</h2>
                </div>
                <button
                  onClick={() => setActive("history")}
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  عرض الكل →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {recent.map((entry) => (
                  <div
                    key={entry.id}
                    className="glass-card rounded-xl p-3 border border-white/[0.06] flex items-center gap-3"
                  >
                    <div className={`h-8 w-8 rounded-lg border flex items-center justify-center text-[10px] font-black shrink-0 ${typeColor(entry.type)}`}>
                      {entry.type.toUpperCase().slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-200 truncate leading-tight">{entry.operation}</p>
                      <p className="text-[9px] text-slate-600 mt-0.5">
                        {new Date(entry.timestamp).toLocaleString("ar-EG", {
                          hour: "2-digit", minute: "2-digit", day: "numeric", month: "short",
                        })}
                      </p>
                    </div>
                    <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      entry.status === "success" ? "bg-emerald-400" : entry.status === "error" ? "bg-rose-400" : "bg-blue-400"
                    }`} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
