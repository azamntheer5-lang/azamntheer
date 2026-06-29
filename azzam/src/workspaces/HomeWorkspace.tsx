import React, { useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText, FileCode, FileSpreadsheet, Image as ImageIcon,
  ScanLine, Camera, GitCompare, QrCode, ArrowLeft,
  UploadCloud, ShieldCheck, Sparkles, Clock, Zap,
  ChevronRight, Star, TrendingUp, Files, Code2, Type,
  ArrowLeftRight, Lock, Calendar, Calculator, Search,
  Crown, Layers, Rocket, Award, Users,
} from "lucide-react";
import { useUIStore } from "../store/uiStore";
import { useHistoryStore } from "../store/historyStore";
import { usePdfStore } from "../store/pdfStore";
import { CloudApiService } from "../services/api";
import type { WorkspaceId } from "../store/uiStore";

/* ────────────────────────────────── data ── */

interface ToolCard {
  id: WorkspaceId;
  title: string;
  subtitle: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  glow: string;
  border: string;
  iconBg: string;
  tag: string;
  tagColor: string;
  isNew?: boolean;
}

const MAIN_TOOLS: ToolCard[] = [
  {
    id: "pdf",
    title: "PDF Expert",
    subtitle: "أدوات متكاملة",
    desc: "دمج · تقسيم · تنظيم · علامات مائية · محرر متقدم · ضغط وتحويل",
    icon: FileText,
    gradient: "from-blue-600 to-blue-500",
    glow: "glow-blue",
    border: "border-blue-500/20",
    iconBg: "bg-blue-500/10 text-blue-400",
    tag: "الأكثر استخداماً",
    tagColor: "badge-blue",
  },
  {
    id: "word",
    title: "Word Tools",
    subtitle: "معالجة DOCX",
    desc: "قراءة · تحليل · إحصاءات · تصدير PDF · محرر متكامل",
    icon: FileCode,
    gradient: "from-violet-600 to-purple-500",
    glow: "glow-purple",
    border: "border-violet-500/20",
    iconBg: "bg-violet-500/10 text-violet-400",
    tag: "محرر كامل",
    tagColor: "badge-purple",
  },
  {
    id: "excel",
    title: "Excel Studio",
    subtitle: "جداول البيانات",
    desc: "XLSX · CSV · تصفح تفاعلي · بحث وتصفية · تصدير HTML",
    icon: FileSpreadsheet,
    gradient: "from-emerald-600 to-green-500",
    glow: "glow-emerald",
    border: "border-emerald-500/20",
    iconBg: "bg-emerald-500/10 text-emerald-400",
    tag: "جداول ذكية",
    tagColor: "badge-green",
  },
  {
    id: "image",
    title: "الصور",
    subtitle: "استوديو متكامل",
    desc: "تحويل صيغ · ضغط · دمج في PDF · فلاتر · تغيير الأبعاد",
    icon: ImageIcon,
    gradient: "from-orange-600 to-amber-500",
    glow: "glow-orange",
    border: "border-orange-500/20",
    iconBg: "bg-orange-500/10 text-orange-400",
    tag: "فلاتر ذكية",
    tagColor: "badge-amber",
  },
];

const QUICK_TOOLS = [
  { id: "ocr"         as const, label: "OCR — استخراج النص",   desc: "من صور أو PDF ممسوح",   icon: ScanLine,         color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/20" },
  { id: "scanner"     as const, label: "الماسح الضوئي",         desc: "كاميرا + فلاتر",         icon: Camera,           color: "text-pink-400",    bg: "bg-pink-500/10 border-pink-500/20" },
  { id: "compare"     as const, label: "مقارنة المستندات",      desc: "PDF أو صور",             icon: GitCompare,       color: "text-indigo-400",  bg: "bg-indigo-500/10 border-indigo-500/20" },
  { id: "qr-tools"    as const, label: "QR / Barcode",          desc: "توليد وقراءة",           icon: QrCode,           color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20" },
];

const PRO_TOOLS = [
  { id: "dev-tools"   as const, label: "أدوات المطور",          desc: "JSON · Base64 · Hash · JWT · Regex",   icon: Code2,            color: "text-pink-400",    bg: "bg-pink-500/10 border-pink-500/20", count: "9 أدوات" },
  { id: "text-tools"  as const, label: "أدوات النصوص",          desc: "عدّاد · حالة · لوريم · فرز · تكرار",   icon: Type,             color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/20", count: "8 أدوات" },
  { id: "converters"  as const, label: "محوّلات",                desc: "وحدات · ألوان · أرقام · روماني",       icon: ArrowLeftRight,   color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20", count: "4 أدوات" },
  { id: "crypto"      as const, label: "تشفير وكلمات سر",        desc: "توليد · AES · قوة · توكنز",            icon: Lock,             color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20", count: "5 أدوات" },
  { id: "time-tools"  as const, label: "وقت وتاريخ",             desc: "فارق تواريخ · عمر · عدّاد · ساعة",     icon: Calendar,         color: "text-teal-400",    bg: "bg-teal-500/10 border-teal-500/20", count: "5 أدوات" },
  { id: "calc-tools"  as const, label: "حاسبات",                 desc: "علمي · BMI · نسبة · قرض · إكرامية",    icon: Calculator,       color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", count: "6 أدوات" },
];

const STATS = [
  { label: "أداة متخصصة",    value: "60+",  icon: Zap,         color: "text-blue-400" },
  { label: "مساحة عمل",      value: "18",   icon: Layers,      color: "text-violet-400" },
  { label: "معالجة محلية",   value: "100%", icon: ShieldCheck, color: "text-emerald-400" },
  { label: "صيغة مدعومة",    value: "20+",  icon: Files,       color: "text-amber-400" },
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
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const allTools = useMemo(() => [
    ...MAIN_TOOLS.map(t => ({ id: t.id, label: t.title, subtitle: t.subtitle, desc: t.desc })),
    ...QUICK_TOOLS.map(t => ({ id: t.id, label: t.label, subtitle: t.desc, desc: t.desc })),
    ...PRO_TOOLS.map(t => ({ id: t.id, label: t.label, subtitle: t.desc, desc: t.desc })),
  ], []);

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    return allTools.filter(t =>
      t.label.toLowerCase().includes(q) ||
      t.subtitle.toLowerCase().includes(q) ||
      t.desc.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    );
  }, [searchQuery, allTools]);

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
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#04070f] pointer-events-none" />

        <div className="relative px-8 pt-10 pb-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className="inline-flex flex-col items-center gap-4 mb-6"
          >
            {/* Logo with crown */}
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-[0_0_60px_rgba(99,102,241,0.5)] border border-white/20">
                <Crown className="h-9 w-9 text-white" />
              </div>
              <div className="absolute inset-[-8px] rounded-2xl border border-dashed border-indigo-500/25 spin-slow pointer-events-none" />
              <div className="absolute inset-[-16px] rounded-3xl border border-dashed border-purple-500/15 spin-slow-rev pointer-events-none" />
              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-2 -right-6 badge badge-new text-[10px] pulse-soft"
              >
                <Rocket className="h-2.5 w-2.5" />
                NEW v2.0
              </motion.div>
            </div>

            <div className="space-y-1">
              <span className="badge badge-new mb-1">
                <Sparkles className="h-2.5 w-2.5" />
                الإصدار 2.0 — وحش الأدوات
              </span>
              <h1 className="text-5xl font-black tracking-wide gradient-text leading-tight font-display">
                عـزَّام برو
              </h1>
              <p className="text-xl font-bold text-slate-400">
                Azzam Pro — All-in-One Toolbox
              </p>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed font-medium mt-2">
                منصة احترافية متكاملة: PDF · Word · Excel · صور · تطوير · تشفير · حساب · وقت —<br />
                بأمان تام داخل متصفحك بدون رفع أي ملف.
              </p>
            </div>
          </motion.div>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="max-w-xl mx-auto mt-6 relative"
          >
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في 18 أداة... (مثال: PDF, Hash, Base64, BMI)"
              className="w-full pr-12 pl-4 py-3.5 rounded-xl glass-card border border-white/[0.08] text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-indigo-500/40 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                مسح ✕
              </button>
            )}
          </motion.div>

          {/* Filtered results dropdown */}
          <AnimatePresence>
            {filteredTools && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="max-w-xl mx-auto mt-2 glass-card rounded-xl border border-white/[0.08] p-2 text-left"
              >
                {filteredTools.length > 0 ? (
                  filteredTools.slice(0, 6).map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => { setActive(tool.id); setSearchQuery(""); }}
                      className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.05] transition-colors text-right"
                    >
                      <Search className="h-3.5 w-3.5 text-slate-500 mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-slate-200">{tool.label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">{tool.desc}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-600 rotate-180 shrink-0" />
                    </button>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs text-slate-500">لا توجد نتائج مطابقة</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center justify-center gap-8 mt-6 flex-wrap"
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
            className={`upload-zone glass-card rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center relative overflow-hidden ${
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
            <span className="badge badge-blue text-[9px]">CORE</span>
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
                  <div className="flex items-start justify-between">
                    <div className={`h-11 w-11 rounded-xl ${tool.iconBg} border ${tool.border} flex items-center justify-center`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`badge ${tool.tagColor}`}>{tool.tag}</span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-white leading-tight">{tool.title}</h3>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{tool.subtitle}</p>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium flex-1">
                    {tool.desc}
                  </p>

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

        {/* ── Pro Tools Section (NEW) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.45 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-pink-400" />
              <h2 className="text-sm font-black text-slate-200">الأدوات الاحترافية</h2>
              <span className="badge badge-new text-[9px]">
                <Sparkles className="h-2.5 w-2.5" />
                جديد
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold">6 مساحات · 37+ أداة</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PRO_TOOLS.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <motion.button
                  key={tool.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 + i * 0.05 }}
                  onClick={() => setActive(tool.id)}
                  className={`glass-card rounded-2xl p-4 border ${tool.bg} flex items-start gap-3 text-right cursor-pointer group relative overflow-hidden`}
                >
                  {/* Decorative gradient blob */}
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl opacity-30 pointer-events-none"
                       style={{ background: `var(--glow-${tool.id.split('-')[0]}, rgba(99,102,241,0.3))` }} />

                  <div className={`h-11 w-11 rounded-xl ${tool.bg} border flex items-center justify-center ${tool.color} shrink-0`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 relative">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[13px] font-black text-slate-100 truncate">{tool.label}</p>
                      <span className="badge badge-new text-[8px] px-1.5">جديد</span>
                    </div>
                    <p className="text-[10.5px] text-slate-500 truncate mb-1.5">{tool.desc}</p>
                    <p className="text-[9px] text-slate-600 font-bold">{tool.count}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 rotate-180 mt-1" />
                </motion.button>
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

        {/* ── Footer Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-premium rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 text-center md:text-right">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-pink-500/20 border border-amber-500/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-100">جاهز للمنافسة عالمياً</p>
              <p className="text-[11px] text-slate-500">منصة شاملة تنافس iLovePDF و SmallPDF و Adobe — بأمان كامل</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-amber"><Star className="h-2.5 w-2.5" /> 4.9</span>
            <span className="badge badge-emerald"><ShieldCheck className="h-2.5 w-2.5" /> 100% Local</span>
            <span className="badge badge-blue"><Zap className="h-2.5 w-2.5" /> 60+ Tools</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
