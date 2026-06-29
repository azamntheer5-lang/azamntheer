import React from "react";
import { Settings as SettingsIcon, Palette, Cpu, Keyboard, ShieldCheck, Save, RotateCcw } from "lucide-react";
import { useThemeStore, THEMES, type ThemeMode } from "../store/themeStore";
import { useSettingsStore } from "../store/settingsStore";
import { useToast } from "../context/ToastContext";

export const SettingsWorkspace: React.FC = () => {
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const settings = useSettingsStore();
  const toast = useToast();

  return (
    <main className="flex-1 overflow-y-auto safe-scrollbar p-6 relative" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white shadow-lg">
            <SettingsIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white">الإعدادات العامة</h2>
            <p className="text-[11px] text-gray-400 font-bold mt-0.5">
              خصص تجربتك في عـزَّام — ثيم، أداء، اختصارات.
            </p>
          </div>
        </div>

        {/* Theme */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
          <h3 className="text-xs font-black text-white flex items-center gap-2">
            <Palette className="h-4 w-4 text-blue-400" />
            <span>الثيم والمظهر</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(THEMES) as ThemeMode[]).map((key) => {
              const theme = THEMES[key];
              const colors = theme.colors;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setThemeMode(key);
                    toast.success(`تم تفعيل ثيم: ${theme.label}`);
                  }}
                  className={`rounded-xl p-3 border cursor-pointer transition-all text-right ${
                    themeMode === key ? "border-blue-500 bg-blue-500/10" : "border-white/10 hover:border-white/30"
                  }`}
                  style={{ background: colors.background }}
                >
                  <div className="flex gap-1 mb-2">
                    {[colors.primary, colors.accent, colors.success, colors.warning].map((c, i) => (
                      <div key={i} className="h-4 w-4 rounded-full border border-white/20" style={{ background: c }} />
                    ))}
                  </div>
                  <div className="text-[11px] font-black" style={{ color: colors.text }}>
                    {theme.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Performance */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
          <h3 className="text-xs font-black text-white flex items-center gap-2">
            <Cpu className="h-4 w-4 text-emerald-400" />
            <span>الأداء والمعالجة</span>
          </h3>

          <ToggleRow
            label="تسريع الأداء بواسطة المعالج الرسومي (GPU)"
            desc="تفعيل رندرة الصور ومعاينة الملفات على كرت الشاشة."
            checked={settings.gpuAcceleration}
            onChange={(v) => settings.update({ gpuAcceleration: v })}
          />

          <ToggleRow
            label="الحفظ التلقائي (Autosave)"
            desc="حفظ آخر ملفات قمت بمعالجتها محلياً لتفادي ضياع الجهد."
            checked={settings.autoSave}
            onChange={(v) => settings.update({ autoSave: v })}
          />

          <ToggleRow
            label="إظهار الشبكة (Grid) في المحرر"
            desc="إظهار شبكة خفيفة في خلفية محرر PDF."
            checked={settings.showGrid}
            onChange={(v) => settings.update({ showGrid: v })}
          />

          <ToggleRow
            label="إظهار أدلة المحاذاة (Guides)"
            desc="إظهار خطوط محاذاة ذكية عند تحريك العناصر."
            checked={settings.showGuides}
            onChange={(v) => settings.update({ showGuides: v })}
          />

          <ToggleRow
            label="الالتقاط للشبكة (Snap to Grid)"
            desc="التقاط العناصر تلقائياً لخطوط الشبكة عند السحب."
            checked={settings.snapToGrid}
            onChange={(v) => settings.update({ snapToGrid: v })}
          />

          <ToggleRow
            label="الالتقاط للعناصر (Snap to Objects)"
            desc="محاذاة العناصر تلقائياً مع بعضها البعض."
            checked={settings.snapToObjects}
            onChange={(v) => settings.update({ snapToObjects: v })}
          />

          <div className="bg-white/5 rounded-xl border border-white/5 p-4 space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-blue-400">{settings.imageQuality}%</span>
              <span className="text-white">جودة ضغط الصور الافتراضية</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={settings.imageQuality}
              onChange={(e) => settings.update({ imageQuality: parseInt(e.target.value) })}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Privacy */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
          <h3 className="text-xs font-black text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>الخصوصية والأمان</span>
          </h3>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-[11px] font-bold text-emerald-200 leading-relaxed">
            🔒 جميع عمليات المعالجة تتم محلياً داخل متصفحك. لا يتم رفع أي ملفات لخوادم خارجية إلا في
            الحالات التالية: استخراج النص بالـ OCR (Gemini Vision)، والمساعد الذكي. يمكنك تعطيل هذه
            الميزات من قائمة الإعدادات في أي وقت.
          </div>
        </div>

        {/* Shortcuts */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
          <h3 className="text-xs font-black text-white flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-amber-400" />
            <span>اختصارات لوحة المفاتيح</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {[
              { keys: ["Ctrl", "K"], action: "فتح لوحة الأوامر" },
              { keys: ["Ctrl", "B"], action: "طي/توسيع الشريط الجانبي" },
              { keys: ["Ctrl", "J"], action: "تبديل الثيم" },
              { keys: ["Ctrl", "Z"], action: "تراجع (في محرر PDF)" },
              { keys: ["Ctrl", "Y"], action: "إعادة (في محرر PDF)" },
              { keys: ["Ctrl", "O"], action: "فتح ملف PDF" },
              { keys: ["Esc"], action: "إغلاق النوافذ المنبثقة" },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-lg p-2.5">
                <span className="text-gray-300 font-bold">{s.action}</span>
                <div className="flex items-center gap-1" dir="ltr">
                  {s.keys.map((k, j) => (
                    <kbd
                      key={j}
                      className="text-[10px] font-mono text-gray-300 border border-white/10 rounded px-1.5 py-0.5"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reset */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              settings.reset();
              toast.success("تم إعادة ضبط الإعدادات");
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-300 hover:text-rose-200 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-lg cursor-pointer transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>إعادة ضبط الإعدادات</span>
          </button>
        </div>
      </div>
    </main>
  );
};

const ToggleRow: React.FC<{
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, desc, checked, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
    <div className="text-right">
      <h4 className="text-xs font-black text-white">{label}</h4>
      <p className="text-[10px] text-gray-400 leading-relaxed font-semibold mt-0.5">{desc}</p>
    </div>
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
    </label>
  </div>
);
