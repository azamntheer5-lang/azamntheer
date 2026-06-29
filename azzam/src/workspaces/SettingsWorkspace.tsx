import React from "react";
import {
  Settings as SettingsIcon, Palette, Cpu, Keyboard, ShieldCheck,
  RotateCcw, Check, Moon, Sun, Sparkles,
} from "lucide-react";
import { useThemeStore, THEMES, type ThemeMode } from "../store/themeStore";
import { useSettingsStore } from "../store/settingsStore";
import { useToast } from "../context/ToastContext";

const THEME_ICONS: Record<ThemeMode, React.ComponentType<{ className?: string }>> = {
  dark:       Moon,
  light:      Sun,
  midnight:   SettingsIcon,
  aurora:     Sparkles,
};

const ToggleRow: React.FC<{
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, desc, checked, onChange }) => (
  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.08] transition-colors">
    <div className="flex-1 min-w-0 ml-4">
      <p className="text-xs font-bold text-slate-200 leading-tight">{label}</p>
      <p className="text-[10px] text-slate-500 mt-0.5 font-medium leading-relaxed">{desc}</p>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition-all duration-200 cursor-pointer shrink-0 ${
        checked ? "bg-blue-500" : "bg-white/10"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
          checked ? "right-0.5" : "left-0.5"
        }`}
      />
    </button>
  </div>
);

export const SettingsWorkspace: React.FC = () => {
  const themeMode    = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const settings     = useSettingsStore();
  const toast        = useToast();

  const Section: React.FC<{
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    children: React.ReactNode;
  }> = ({ title, icon: Icon, iconColor, children }) => (
    <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-4">
      <h3 className={`text-xs font-black flex items-center gap-2.5 ${iconColor}`}>
        <Icon className="h-4 w-4" />
        <span className="text-white">{title}</span>
      </h3>
      {children}
    </div>
  );

  return (
    <main className="flex-1 overflow-y-auto safe-scrollbar p-6" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 border border-white/10 flex items-center justify-center text-white">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white">الإعدادات العامة</h2>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">خصص تجربتك في عـزَّام</p>
          </div>
        </div>

        {/* Theme */}
        <Section title="الثيم والمظهر" icon={Palette} iconColor="text-blue-400">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(THEMES) as ThemeMode[]).map((key) => {
              const theme   = THEMES[key];
              const colors  = theme.colors;
              const Icon    = THEME_ICONS[key] ?? Moon;
              const active  = themeMode === key;
              return (
                <button
                  key={key}
                  onClick={() => { setThemeMode(key); toast.success(`ثيم: ${theme.label}`); }}
                  className={`rounded-xl p-3.5 border cursor-pointer transition-all text-right relative overflow-hidden ${
                    active
                      ? "border-blue-500 ring-1 ring-blue-500/30"
                      : "border-white/[0.08] hover:border-white/20"
                  }`}
                  style={{ background: colors.background }}
                >
                  {active && (
                    <span className="absolute top-2 left-2 h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </span>
                  )}
                  <div className="flex gap-1 mb-2.5">
                    {[colors.primary, colors.accent, colors.success, colors.warning].map((c, i) => (
                      <div key={i} className="h-3.5 w-3.5 rounded-full border border-white/10" style={{ background: c }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3 w-3" style={{ color: colors.text }} />
                    <span className="text-[11px] font-black" style={{ color: colors.text }}>{theme.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Performance */}
        <Section title="الأداء والمعالجة" icon={Cpu} iconColor="text-emerald-400">
          <div className="space-y-2">
            <ToggleRow
              label="تسريع GPU"
              desc="رندرة الصور ومعاينة الملفات على المعالج الرسومي."
              checked={settings.gpuAcceleration}
              onChange={(v) => settings.update({ gpuAcceleration: v })}
            />
            <ToggleRow
              label="الحفظ التلقائي"
              desc="حفظ آخر الملفات محلياً لتفادي ضياع الجهد."
              checked={settings.autoSave}
              onChange={(v) => settings.update({ autoSave: v })}
            />
            <ToggleRow
              label="إظهار الشبكة في المحرر"
              desc="شبكة خفيفة في خلفية محرر PDF."
              checked={settings.showGrid}
              onChange={(v) => settings.update({ showGrid: v })}
            />
            <ToggleRow
              label="أدلة المحاذاة"
              desc="خطوط محاذاة ذكية عند تحريك العناصر."
              checked={settings.showGuides}
              onChange={(v) => settings.update({ showGuides: v })}
            />
            <ToggleRow
              label="الالتقاط للشبكة"
              desc="التقاط العناصر تلقائياً لخطوط الشبكة."
              checked={settings.snapToGrid}
              onChange={(v) => settings.update({ snapToGrid: v })}
            />
            <ToggleRow
              label="الالتقاط للعناصر"
              desc="محاذاة العناصر تلقائياً مع بعضها."
              checked={settings.snapToObjects}
              onChange={(v) => settings.update({ snapToObjects: v })}
            />
          </div>

          <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-blue-400">{settings.imageQuality}%</span>
              <span className="text-slate-300">جودة ضغط الصور الافتراضية</span>
            </div>
            <input
              type="range" min="10" max="100" value={settings.imageQuality}
              onChange={(e) => settings.update({ imageQuality: parseInt(e.target.value) })}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600 font-semibold">
              <span>أصغر حجم</span>
              <span>أعلى جودة</span>
            </div>
          </div>
        </Section>

        {/* Privacy */}
        <Section title="الخصوصية والأمان" icon={ShieldCheck} iconColor="text-emerald-400">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-200 font-semibold leading-relaxed">
              جميع عمليات PDF و Word و Excel والصور تتم محلياً داخل متصفحك.
              ميزات الذكاء الاصطناعي (OCR، المساعد الذكي) اختيارية وتتطلب مفتاح GEMINI_API_KEY.
            </p>
          </div>
        </Section>

        {/* Keyboard shortcuts */}
        <Section title="اختصارات لوحة المفاتيح" icon={Keyboard} iconColor="text-amber-400">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { keys: ["Ctrl", "K"],  action: "فتح لوحة الأوامر" },
              { keys: ["Ctrl", "B"],  action: "طي/توسيع الشريط الجانبي" },
              { keys: ["Ctrl", "J"],  action: "تبديل الثيم" },
              { keys: ["Ctrl", "Z"],  action: "تراجع (PDF)" },
              { keys: ["Ctrl", "Y"],  action: "إعادة (PDF)" },
              { keys: ["Ctrl", "O"],  action: "فتح ملف PDF" },
              { keys: ["Esc"],        action: "إغلاق النوافذ المنبثقة" },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.05] rounded-xl px-3 py-2.5">
                <span className="text-xs font-semibold text-slate-300">{s.action}</span>
                <div className="flex items-center gap-1" dir="ltr">
                  {s.keys.map((k, j) => (
                    <kbd key={j} className="text-[9px] font-mono text-slate-400 border border-white/[0.1] rounded-md px-1.5 py-0.5 bg-white/[0.04]">
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Reset */}
        <div className="flex justify-end pb-4">
          <button
            onClick={() => { settings.reset(); toast.success("تم إعادة ضبط الإعدادات"); }}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 rounded-xl cursor-pointer hover:bg-rose-500/20 transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            إعادة ضبط الإعدادات
          </button>
        </div>
      </div>
    </main>
  );
};
