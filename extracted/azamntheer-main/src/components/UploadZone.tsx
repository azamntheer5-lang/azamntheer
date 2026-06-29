import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { 
  Upload, FileText, ShieldAlert, Sparkles, CheckCircle2,
  Layers, Lock, EyeOff, PenTool, Image, Gauge, Sparkle, RefreshCw, Camera
} from "lucide-react";

interface UploadZoneProps {
  onFileLoaded: (file: File) => void;
  isProcessing: boolean;
  onStartScanner: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileLoaded, isProcessing, onStartScanner }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        onFileLoaded(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileLoaded(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 md:px-0 w-full max-w-5xl mx-auto select-none">
      
      {/* Elegantly decorated Azzam brand header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 relative"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 flex h-1.5 w-24 gap-1 items-center justify-center">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
          <span className="h-1 w-8 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500" />
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        </div>

        <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-50 to-amber-100 px-4 py-1.5 text-xs font-bold text-amber-700 border border-amber-200/60 mb-4 shadow-3xs">
          <Sparkle className="h-3.5 w-3.5 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
          <span>منصة عَـزَّام الذكية المتكاملة • لخدمات مستندات PDF</span>
        </span>

        {/* Decorated Azzam title with beautiful font treatments */}
        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 leading-normal mb-2">
          💎 عَـزَّام <span className="bg-clip-text text-transparent bg-gradient-to-r from-google-blue via-indigo-600 to-purple-600">Azzam PDF Expert</span> 💎
        </h2>
        
        <p className="text-[11px] md:text-xs font-bold text-gray-400 tracking-widest uppercase mb-4 flex items-center justify-center gap-1.5">
          <span>✦ السرعة والخصوصية المطلقة في معالجة وتعديل الملفات ✦</span>
        </p>

        <p className="mt-2 text-sm text-gray-500 max-w-2xl mx-auto leading-relaxed font-semibold">
          منصة واحدة، آمنة وموثوقة، تمنحك التحكم الكامل لترتيب، تحرير، حماية، ضغط، وتحويل مستنداتك محلياً بالكامل 100% دون مغادرة متصفحك.
        </p>
      </motion.div>

      {/* Upload card */}
      <motion.div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        className={`relative flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-google-blue bg-blue-50/40 shadow-md animate-pulse"
            : "border-gray-300 bg-white hover:border-google-blue hover:shadow-xs"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf"
          onChange={handleChange}
          disabled={isProcessing}
        />

        <div className="rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 p-4 border border-blue-100 shadow-3xs mb-4">
          <Upload className={`h-8 w-8 ${isDragActive ? "text-google-blue animate-bounce" : "text-gray-400"}`} />
        </div>

        <h3 className="text-lg font-bold text-gray-800 mb-1">
          اسحب ملف PDF الخاص بك هنا أو انقر للتصفح والتحميل
        </h3>
        <p className="text-xs text-gray-400 mb-5">
          يدعم ملفات PDF بكافة الأحجام • معالجة ذاتية فائقة السرعة وآمنة تماماً
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3.5 justify-center">
          <button
            type="button"
            onClick={onButtonClick}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 rounded-xl bg-google-blue hover:bg-blue-600 px-6 py-3.5 text-xs font-black text-white shadow-md shadow-blue-500/10 active:scale-98 cursor-pointer w-full sm:w-auto justify-center"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>جاري تحميل الملف...</span>
              </>
            ) : (
              <>
                <FileText className="h-4.5 w-4.5" />
                <span>اختر ملف الـ PDF للبدء فوراً</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onStartScanner(); }}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 px-6 py-3.5 text-xs font-black text-white shadow-md shadow-amber-500/15 active:scale-98 cursor-pointer w-full sm:w-auto justify-center"
          >
            <Camera className="h-4.5 w-4.5 animate-pulse text-white" />
            <span>📷 تشغيل ماسح عـزَّام الضوئي الاحترافي</span>
          </button>
        </div>

        {/* Security watermark */}
        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-semibold px-4">
          <ShieldAlert className="h-3.5 w-3.5 text-google-green shrink-0" />
          <span>خصوصية تامة: تتم معالجة وتعديل جميع الملفات داخل جهازك محلياً؛ لا نرفع مستنداتك لأي خوادم خارجية أبداً.</span>
        </div>
      </motion.div>

      {/* Title for the tools section */}
      <div className="w-full mt-10 text-right">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
          <Sparkles className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
          <span>أدوات عـزَّام الاحترافية المتكاملة لملفات الـ PDF ({7} أدوات):</span>
        </h3>
        <div className="h-0.5 w-20 bg-google-blue rounded-full mt-1" />
      </div>

      {/* Feature Grid with all 7 Tools displayed elegantly */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 w-full mt-5">
        {[
          {
            title: "تنظيم وترتيب الصفحات",
            desc: "حذف الصفحات غير المرغوبة، تدوير الصفحات بدقة، عكس الترتيب، أو نقل وإعادة ترتيب الصفحات بالسحب والإفلات بكل يسر وسهولة.",
            icon: Layers,
            bg: "bg-blue-50/60 text-google-blue border-blue-100/70"
          },
          {
            title: "محرر النصوص والتعليقات",
            desc: "كتابة نصوص وتعليقات عربية مخصصة بخطوط أنيقة، تحديد الألوان المناسبة ومقاسات الخط ووضعها في أي موضع تريده بالملف.",
            icon: PenTool,
            bg: "bg-indigo-50/60 text-indigo-600 border-indigo-100/70"
          },
          {
            title: "طمس البيانات والكلمات الحساسة",
            desc: "البحث التلقائي الذكي عن الكلمات السرية أو الأرقام وطمسها بمربعات ملونة آمنة مع ميزة إدراج نصوص بديلة مكانها.",
            icon: EyeOff,
            bg: "bg-red-50/60 text-google-red border-red-100/70"
          },
          {
            title: "توقيع المستند والعلامات المائية",
            desc: "لوحة مخصصة لرسم التوقيع اليدوي ثم تثبيته على المستند مع ميزة العلامات المائية المائلة والترقيم التلقائي لجميع الصفحات.",
            icon: CheckCircle2,
            bg: "bg-emerald-50/60 text-google-green border-emerald-100/70"
          },
          {
            title: "دمج الملفات وتحويل الصور",
            desc: "دمج مستندين PDF معاً وتنسيقهما في ملف واحد، أو تحويل ملفات الصور (JPG / PNG) وإدراجها كصفحات إضافية لملفك الحالي.",
            icon: Image,
            bg: "bg-amber-50/60 text-amber-600 border-amber-100/70"
          },
          {
            title: "تحسين الحجم وتصدير الصور",
            desc: "ضغط حجم الـ PDF بـ 3 مستويات مخصصة لتوفير المساحة، أو تصدير صفحات المستند واستخراجها كصور PNG ممتازة (ZIP).",
            icon: Gauge,
            bg: "bg-purple-50/60 text-purple-600 border-purple-100/70"
          },
          {
            title: "📸 ماسح عـزَّام الضوئي الذكي",
            desc: "التقاط صور المستندات بكاميرا الموبايل أو الكمبيوتر، معالجة حوافها، وتبييض الورق بفلاتر تباين ذكية فائقة النقاء.",
            icon: Camera,
            bg: "bg-amber-50/60 text-amber-700 border-amber-200/70"
          }
        ].map((feat, i) => {
          const Icon = feat.icon;
          return (
            <motion.div 
              key={i} 
              whileHover={{ y: -2 }}
              className="flex gap-3 bg-white border border-gray-150 rounded-2xl p-4.5 shadow-3xs transition-all hover:border-gray-300 hover:shadow-2xs text-right"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${feat.bg}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-800">{feat.title}</span>
                <span className="text-[11px] text-gray-400 mt-1 font-semibold leading-relaxed">{feat.desc}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
