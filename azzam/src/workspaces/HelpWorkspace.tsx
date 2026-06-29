import React from "react";
import { HelpCircle, ShieldCheck, FileText, FileCode, FileSpreadsheet, Image as ImageIcon, Sparkles } from "lucide-react";

const FAQS = [
  {
    q: "كيف تتم معالجة وتعديل الملفات؟",
    a: "تتم معالجة كافة الملفات (تنزيل، تعديل، دمج، ضغط) محلياً داخل متصفحك مباشرة 100% باستخدام لغات جافا سكريبت متطورة (WebAssembly, pdf-lib, canvas, Web Workers) دون مغادرة جهازك.",
  },
  {
    q: "هل ترفعون أي ملفات على خوادم خارجية؟",
    a: "تطبيق عزام مصمم بخصوصية وأمان 100% للعمليات المحلية. ميزات الذكاء الاصطناعي فقط (OCR، المساعد الذكي، التلخيص) تتطلب إرسال النصوص أو الصور إلى Gemini API، وهذا يحدث فقط عند تفعيلك لها بنفسك.",
  },
  {
    q: "ما هي صيغ الملفات المدعومة؟",
    a: "يدعم المستندات النصية Word (.docx)، جداول Excel (.xlsx, .xls, .csv)، مستندات PDF (.pdf)، وكافة أنواع الصور مثل PNG, JPG, JPEG, WEBP, TIFF, HEIC, BMP.",
  },
  {
    q: "هل يمكنني دمج مجموعة صور دفعة واحدة كملف PDF؟",
    a: "نعم! من خلال استوديو ومحرر الصور أو الماسح الضوئي، ارفع مجموعة الصور، رتبها تصاعدياً أو تنازلياً، ثم اضغط على زر الدمج كـ PDF ليتم تصديرها كألبوم متناسق.",
  },
  {
    q: "كيف أستخدم لوحة الأوامر؟",
    a: "اضغط Ctrl+K (أو Cmd+K على Mac) لفتح لوحة الأوامر. يمكنك البحث عن أي أداة أو الانتقال إلى أي مساحة عمل بسرعة.",
  },
  {
    q: "ما هي ميزة Undo/Redo؟",
    a: "في مساحة عمل PDF، يمكنك التراجع (Ctrl+Z) أو الإعادة (Ctrl+Y) لأي عملية قمت بها على المستند. يتم حفظ آخر 30 خطوة تلقائياً.",
  },
  {
    q: "هل يدعم المحرر النصوص العربية؟",
    a: "نعم! جميع أدوات عزام تدعم العربية بشكل كامل. محرر PDF يستخدم تقنية رسم النص على Canvas ثم تضمينه كصورة PNG عالية الجودة لضمان ظهور الحروف العربية بشكل صحيح في ملف PDF النهائي.",
  },
  {
    q: "ما هي متطلبات تشغيل التطبيق؟",
    a: "متطلب وحيد: متصفح حديث (Chrome, Edge, Firefox, Safari) بآخر إصدار. لا حاجة لأي تثبيت أو تسجيل.",
  },
];

const FEATURES = [
  { icon: FileText, label: "PDF: تنظيم، دمج، ضغط، تعديل", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { icon: FileCode, label: "Word: قراءة، تحليل، تصدير PDF", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { icon: FileSpreadsheet, label: "Excel: تصفح، بحث، تصدير", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { icon: ImageIcon, label: "صور: تحويل، ضغط، دمج", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
];

export const HelpWorkspace: React.FC = () => {
  return (
    <main className="flex-1 overflow-y-auto safe-scrollbar p-6 relative" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white">مركز المساعدة والأسئلة الشائعة</h2>
            <p className="text-[11px] text-gray-400 font-bold mt-0.5">
              دليل سريع لفهم آلية عمل تطبيق عـزَّام
            </p>
          </div>
        </div>

        {/* Features overview */}
        <div className="glass-card rounded-2xl p-5 border border-white/10">
          <h3 className="text-xs font-black text-white mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>الميزات الرئيسية</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center border ${f.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-gray-200">{f.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Privacy */}
        <div className="glass-card rounded-2xl p-5 border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-black text-emerald-200 mb-1">خصوصيتك أولاً</h3>
              <p className="text-[11px] text-emerald-100/80 font-bold leading-relaxed">
                تطبيق عـزَّام مصمم ليكون 100% محلي. معالجة PDF و Word و Excel و الصور تتم بالكامل داخل
                متصفحك ولا يتم رفع ملفاتك لأي خادم. ميزات الذكاء الاصطناعي (OCR، المساعد الذكي) اختيارية
                وتتطلب GEMINI_API_KEY.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
          <h3 className="text-xs font-black text-white mb-3">الأسئلة الشائعة</h3>
          {FAQS.map((faq, i) => (
            <details
              key={i}
              className="group bg-white/5 border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all"
            >
              <summary className="text-xs font-black text-white cursor-pointer list-none flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span className="flex-1">{faq.q}</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-[11px] text-gray-400 leading-relaxed font-semibold mt-3 pr-3.5">
                {faq.a}
              </p>
            </details>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[10px] text-gray-500 font-bold">
            عـزَّام • Azzam File Processing Suite — منتج احترافي لمعالجة الملفات بأمان وسرعة
          </p>
        </div>
      </div>
    </main>
  );
};
