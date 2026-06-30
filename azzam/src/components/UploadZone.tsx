import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import {
  UploadCloud, FileText, ShieldCheck, Camera, Layers, PenTool,
  EyeOff, Gauge, Lock, Image as ImageIcon, ScanLine, Sparkles,
} from "lucide-react";

interface UploadZoneProps {
  onFileLoaded: (file: File) => void;
  isProcessing: boolean;
  onStartScanner: () => void;
}

const FEATURES = [
  {
    icon: Layers,
    title: "تنظيم الصفحات",
    desc: "حذف، تدوير، عكس وإعادة ترتيب بالسحب والإفلات",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    icon: PenTool,
    title: "محرر النصوص",
    desc: "كتابة نصوص عربية بخطوط أنيقة في أي موضع",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/20",
  },
  {
    icon: EyeOff,
    title: "طمس البيانات",
    desc: "طمس ذكي للكلمات والأرقام الحساسة تلقائياً",
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
  },
  {
    icon: ImageIcon,
    title: "دمج وتحويل",
    desc: "دمج مستندات PDF وتحويل الصور لصفحات",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    icon: Gauge,
    title: "ضغط ذكي",
    desc: "تصغير حجم الملف مع الحفاظ على الجودة",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: Lock,
    title: "الأمان والحماية",
    desc: "كلمة مرور، علامات مائية وتوقيع رقمي",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  {
    icon: ScanLine,
    title: "استخراج النص",
    desc: "تحليل المحتوى واستخراج كل النصوص بدقة",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
  },
  {
    icon: Sparkles,
    title: "مساعد ذكي",
    desc: "ملخص وتحليل المستند بالذكاء الاصطناعي",
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/20",
  },
];

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFileLoaded,
  isProcessing,
  onStartScanner,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type === "application/pdf") onFileLoaded(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileLoaded(file);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8 select-none">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-bold text-blue-400 mb-2">
          <FileText className="h-3 w-3" />
          أدوات PDF الاحترافية
        </div>
        <h2 className="text-3xl font-black text-white">
          ارفع ملف PDF للبدء فوراً
        </h2>
        <p className="text-sm text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
          معالجة كاملة لملفاتك محلياً داخل المتصفح — سرعة فائقة وخصوصية 100%
        </p>
      </motion.div>

      {/* Upload drop zone */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`upload-zone glass-card rounded-2xl border-2 border-dashed p-12 flex flex-col items-center justify-center text-center relative overflow-hidden cursor-pointer ${
          isDragActive ? "drag-over border-indigo-400/50" : "border-white/10"
        }`}
      >
        {/* Decorative rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.07]">
          <div className="h-64 w-64 rounded-full border border-dashed border-blue-400 spin-slow" />
          <div className="absolute h-96 w-96 rounded-full border border-dashed border-indigo-400 spin-slow-rev" />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf"
          onChange={handleChange}
          disabled={isProcessing}
        />

        <motion.div
          animate={{ y: isDragActive ? -8 : [0, -5, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 mb-5"
        >
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(99,102,241,0.25)]">
            <UploadCloud className={`h-8 w-8 text-indigo-400 transition-all ${isDragActive ? "scale-110 text-indigo-300" : ""}`} />
          </div>
        </motion.div>

        <div className="relative z-10 space-y-2 mb-6">
          <h3 className="text-lg font-black text-white">
            {isDragActive ? "أفلت الملف هنا ✨" : "اسحب ملف PDF أو انقر للاختيار"}
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            يدعم ملفات PDF بكافة الأحجام — يتم المعالجة محلياً 100%
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            disabled={isProcessing}
            className="btn-primary px-6 py-2.5 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            {isProcessing ? "جاري التحميل..." : "اختر ملف PDF"}
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onStartScanner(); }}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold cursor-pointer hover:bg-amber-500/20 transition-all disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            تشغيل الماسح الضوئي
          </button>
        </div>

        <div className="relative z-10 mt-5 flex items-center gap-1.5 text-[10px] text-slate-600 font-semibold">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          ملفاتك لا تغادر متصفحك — خصوصية وأمان تام
        </div>
      </motion.div>

      {/* Features grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-black text-slate-200">أدوات PDF المتكاملة ({FEATURES.length} أداة)</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className={`glass-card rounded-xl p-4 border ${feat.bg} flex flex-col gap-2`}
              >
                <div className={`h-8 w-8 rounded-lg ${feat.bg} border flex items-center justify-center ${feat.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className={`text-[12px] font-bold ${feat.color} leading-tight`}>{feat.title}</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5 font-medium">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
