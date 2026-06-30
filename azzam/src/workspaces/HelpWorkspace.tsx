import React, { useState } from "react";
import {
  HelpCircle, ShieldCheck, FileText, FileCode, FileSpreadsheet,
  Image as ImageIcon, Sparkles, ChevronDown, Keyboard, Cpu,
  LifeBuoy, BookOpen,
} from "lucide-react";

const FAQS = [
  {
    q: "كيف تتم معالجة الملفات؟",
    a: "تتم معالجة كافة الملفات محلياً داخل متصفحك 100% باستخدام pdf-lib، WebAssembly، وWeb Workers — دون مغادرة جهازك.",
  },
  {
    q: "هل يتم رفع الملفات لخوادم خارجية؟",
    a: "لا. عـزَّام مصمم للخصوصية الكاملة. فقط ميزات الذكاء الاصطناعي (OCR، المساعد الذكي) اختيارية وتتطلب GEMINI_API_KEY.",
  },
  {
    q: "ما الصيغ المدعومة؟",
    a: "PDF، Word (DOCX)، Excel (XLSX, XLS, CSV)، والصور: PNG, JPG, JPEG, WebP, TIFF, HEIC, BMP.",
  },
  {
    q: "كيف أدمج مجموعة صور في ملف PDF؟",
    a: "انتقل لاستوديو الصور أو الماسح الضوئي، ارفع الصور ورتبها، ثم اضغط 'دمج كـ PDF'.",
  },
  {
    q: "كيف أستخدم لوحة الأوامر؟",
    a: "اضغط Ctrl+K (أو Cmd+K على Mac) لفتح لوحة الأوامر والبحث السريع.",
  },
  {
    q: "كيف يعمل التراجع/الإعادة؟",
    a: "في مساحة PDF يمكنك Ctrl+Z للتراجع و Ctrl+Y للإعادة. يُحفظ آخر 30 خطوة تلقائياً.",
  },
  {
    q: "هل يدعم النصوص العربية؟",
    a: "نعم بشكل كامل. المحرر يستخدم Canvas لرسم النص العربي وتضمينه كـ PNG عالية الجودة في الملف.",
  },
  {
    q: "ما متطلبات التشغيل؟",
    a: "متصفح حديث (Chrome, Edge, Firefox, Safari) — لا تثبيت ولا تسجيل مطلوب.",
  },
];

const TOOLS = [
  { icon: FileText,        label: "PDF",   desc: "تنظيم · دمج · ضغط · تعديل · أمان",         color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  { icon: FileCode,        label: "Word",  desc: "قراءة · تحليل · إحصاءات · تصدير PDF",      color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  { icon: FileSpreadsheet, label: "Excel", desc: "تصفح · بحث · تصفية · تصدير HTML",          color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { icon: ImageIcon,       label: "صور",   desc: "تحويل · ضغط · دمج · فلاتر",               color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
];

export const HelpWorkspace: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <main className="flex-1 overflow-y-auto safe-scrollbar p-6" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white">مركز المساعدة</h2>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">دليل سريع لتطبيق عـزَّام</p>
          </div>
        </div>

        {/* Tools overview */}
        <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-4">
          <h3 className="text-xs font-black text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            الميزات الرئيسية
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TOOLS.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.label} className={`flex items-center gap-3 p-3.5 rounded-xl border ${t.bg}`}>
                  <div className={`h-9 w-9 rounded-xl ${t.bg} border flex items-center justify-center ${t.color} shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={`text-xs font-black ${t.color}`}>{t.label}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">{t.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Privacy callout */}
        <div className="glass-card rounded-2xl p-5 border border-emerald-500/20 bg-emerald-500/[0.05]">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-black text-emerald-300 mb-1.5">خصوصيتك أولاً 🔒</h3>
              <p className="text-[11px] text-emerald-200/80 font-medium leading-relaxed">
                عـزَّام مصمم ليكون 100% محلي. PDF و Word و Excel والصور تُعالج داخل متصفحك تماماً.
                ميزات الذكاء الاصطناعي (OCR، المساعد الذكي) اختيارية وتتطلب مفتاح GEMINI_API_KEY.
              </p>
            </div>
          </div>
        </div>

        {/* Keyboard shortcuts quick ref */}
        <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-3">
          <h3 className="text-xs font-black text-white flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-blue-400" />
            الاختصارات السريعة
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { keys: ["Ctrl", "K"], label: "الأوامر" },
              { keys: ["Ctrl", "B"], label: "الشريط الجانبي" },
              { keys: ["Ctrl", "Z"], label: "تراجع" },
              { keys: ["Ctrl", "Y"], label: "إعادة" },
              { keys: ["Ctrl", "J"], label: "الثيم" },
              { keys: ["Esc"],       label: "إغلاق" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.05] rounded-xl px-3 py-2">
                <span className="text-[11px] font-semibold text-slate-400">{s.label}</span>
                <div className="flex items-center gap-0.5" dir="ltr">
                  {s.keys.map((k, i) => (
                    <kbd key={i} className="text-[9px] font-mono text-slate-500 border border-white/[0.08] rounded px-1.5 py-0.5 bg-white/[0.04]">{k}</kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-2">
          <h3 className="text-xs font-black text-white flex items-center gap-2 mb-4">
            <BookOpen className="h-4 w-4 text-violet-400" />
            الأسئلة الشائعة
          </h3>
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-white/[0.06] rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-right cursor-pointer hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  {faq.q}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-500 shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 pt-0 border-t border-white/[0.05]">
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium pt-3 pr-3.5">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[10px] text-slate-600 font-semibold">
            عـزَّام • Azzam File Processing Suite v1.0 — تطوير احترافي للملفات بأمان وسرعة
          </p>
        </div>
      </div>
    </main>
  );
};
