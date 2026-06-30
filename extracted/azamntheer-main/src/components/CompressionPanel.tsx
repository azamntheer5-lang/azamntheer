import React, { useState } from "react";
import { Gauge, ArrowLeftRight, Check, RefreshCw, Sparkles } from "lucide-react";

interface CompressionPanelProps {
  onCompress: (level: "light" | "medium" | "aggressive") => Promise<void>;
  originalSize: number | null;
  compressedSize: number | null;
  isProcessing: boolean;
}

export const CompressionPanel: React.FC<CompressionPanelProps> = ({
  onCompress,
  originalSize,
  compressedSize,
  isProcessing
}) => {
  const [compressLevel, setCompressLevel] = useState<"light" | "medium" | "aggressive">("medium");

  const formatBytes = (bytes: number | null) => {
    if (bytes === null) return "—";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const calculateSavings = () => {
    if (!originalSize || !compressedSize) return null;
    const diff = originalSize - compressedSize;
    if (diff <= 0) return 0;
    return Math.round((diff / originalSize) * 100);
  };

  const savingsPercent = calculateSavings();

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-3xs max-w-3xl mx-auto select-none space-y-6">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-google-blue">
          <Gauge className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">تقليل ضغط حجم ملف PDF</h3>
          <p className="text-[10px] text-gray-400 font-semibold">تحسين وإعادة ضغط الملف لتوفير مساحة التخزين وسرعة المشاركة.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {[
          {
            id: "light",
            title: "ضغط خفيف",
            desc: "إزالة المخرجات والبيانات الزائدة والغير مرئية مع الاحتفاظ بدقة الصور الأصلية بالكامل."
          },
          {
            id: "medium",
            title: "متوسط (مستحسن)",
            desc: "ضغط الصور ومقاطع الدقة وإعادة ترتيب فهرسة الكائنات دون خسارة ملحوظة في جودة المستند."
          },
          {
            id: "aggressive",
            title: "ضغط قوي",
            desc: "تقليص دقة الصور والعناصر المكونة إلى الحد الأقصى للحصول على أصغر حجم ملف ممكن للمشاركة السريعة."
          }
        ].map(level => (
          <div
            key={level.id}
            onClick={() => setCompressLevel(level.id as any)}
            className={`cursor-pointer rounded-xl border p-4 transition-all relative flex flex-col justify-between ${
              compressLevel === level.id
                ? "border-google-blue bg-blue-50/20 shadow-xs"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-gray-800">{level.title}</span>
                {compressLevel === level.id && (
                  <span className="h-4.5 w-4.5 rounded-full bg-google-blue text-white flex items-center justify-center text-[10px] shadow-sm">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">{level.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Comparative Gauge */}
      {originalSize && (
        <div className="bg-gray-50/60 border border-gray-150 rounded-xl p-4.5 space-y-4">
          <div className="flex justify-between items-center text-xs font-bold text-gray-700">
            <span>مقياس مقارنة المساحة قبل وبعد الضغط:</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white border border-gray-100 rounded-lg p-3">
              <span className="text-[10px] text-gray-400 font-bold block mb-0.5">الحجم الأصلي:</span>
              <span className="text-base font-extrabold text-gray-800">{formatBytes(originalSize)}</span>
            </div>

            <div className="bg-white border border-gray-100 rounded-lg p-3">
              <span className="text-[10px] text-gray-400 font-bold block mb-0.5">الحجم الجديد:</span>
              <span className="text-base font-extrabold text-google-blue">
                {compressedSize ? formatBytes(compressedSize) : "قيد المعالجة"}
              </span>
            </div>

            <div className="bg-white border border-gray-100 rounded-lg p-3">
              <span className="text-[10px] text-gray-400 font-bold block mb-0.5">نسبة التوفير:</span>
              <span className="text-base font-extrabold text-google-green">
                {savingsPercent && savingsPercent > 0 ? `${savingsPercent}%` : "—"}
              </span>
            </div>
          </div>

          {savingsPercent && savingsPercent > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-google-green font-bold bg-green-50 border border-green-100 p-2.5 rounded-lg">
              <Sparkles className="h-4 w-4" />
              <span>مدهش! تم تقليص المستند وتوفير مساحة بمقدار {formatBytes(originalSize - (compressedSize || 0))}.</span>
            </div>
          ) : (
            <p className="text-[10px] text-gray-400 leading-normal font-semibold">
              💡 اضغط على زر تطبيق الضغط بالأدنى لبدء المعالجة. يعتمد التوفير الفعلي على حجم الصور والنقوش المرفوعة بالملف.
            </p>
          )}
        </div>
      )}

      <button
        onClick={() => onCompress(compressLevel)}
        disabled={isProcessing}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-google-blue hover:bg-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/10 transition-all cursor-pointer disabled:opacity-45"
      >
        {isProcessing ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : <Gauge className="h-4.5 w-4.5" />}
        <span>تطبيق ضغط حجم الملف الآن</span>
      </button>
    </div>
  );
};
