import React, { useState, useMemo } from "react";
import {
  ArrowLeftRight, Ruler, Palette, Binary, Hash,
} from "lucide-react";
import { TabBar, ToolHeader, CopyButton } from "../components/ui/SharedUI";

type TabId = "units" | "color" | "number" | "roman";

const TABS = [
  { id: "units",  label: "محوّل الوحدات",     icon: Ruler },
  { id: "color",  label: "محوّل الألوان",      icon: Palette },
  { id: "number", label: "محوّل الأرقام",      icon: Binary },
  { id: "roman",  label: "الأرقام الرومانية",  icon: Hash },
];

export const ConvertersWorkspace: React.FC = () => {
  const [active, setActive] = useState<TabId>("units");

  return (
    <div className="flex-1 overflow-y-auto safe-scrollbar p-6">
      <ToolHeader
        title="محوّلات شاملة"
        description="وحدات · ألوان · أرقام · رومانية — تحويل سريع ودقيق"
        icon={ArrowLeftRight}
        color="bg-amber-500/10 text-amber-400"
      />
      <TabBar tabs={TABS} active={active} onChange={(id) => setActive(id as TabId)} />

      {active === "units"  && <UnitConverter />}
      {active === "color"  && <ColorConverter />}
      {active === "number" && <NumberBaseConverter />}
      {active === "roman"  && <RomanConverter />}
    </div>
  );
};

/* ─────────────────────────────────── Unit Converter ────────── */

interface UnitDef {
  name: string;
  toBase: (v: number) => number;
  fromBase: (v: number) => number;
}

const UNITS: Record<string, Record<string, UnitDef>> = {
  // Length (base: meter)
  length: {
    "متر (m)":      { name: "متر",      toBase: v => v,             fromBase: v => v },
    "كيلومتر (km)": { name: "كيلومتر",  toBase: v => v * 1000,      fromBase: v => v / 1000 },
    "سنتيمتر (cm)": { name: "سنتيمتر",  toBase: v => v / 100,       fromBase: v => v * 100 },
    "مليمتر (mm)":  { name: "مليمتر",   toBase: v => v / 1000,      fromBase: v => v * 1000 },
    "ميل (mi)":     { name: "ميل",      toBase: v => v * 1609.34,   fromBase: v => v / 1609.34 },
    "ياردة (yd)":   { name: "ياردة",    toBase: v => v * 0.9144,    fromBase: v => v / 0.9144 },
    "قدم (ft)":     { name: "قدم",      toBase: v => v * 0.3048,    fromBase: v => v / 0.3048 },
    "بوصة (in)":    { name: "بوصة",     toBase: v => v * 0.0254,    fromBase: v => v / 0.0254 },
    "ميل بحري":      { name: "ميل بحري", toBase: v => v * 1852,     fromBase: v => v / 1852 },
  },
  // Weight (base: kilogram)
  weight: {
    "كيلوجرام (kg)":   { name: "كيلوجرام",  toBase: v => v,           fromBase: v => v },
    "جرام (g)":        { name: "جرام",      toBase: v => v / 1000,    fromBase: v => v * 1000 },
    "مليجرام (mg)":    { name: "مليجرام",   toBase: v => v / 1e6,     fromBase: v => v * 1e6 },
    "طن (t)":          { name: "طن",        toBase: v => v * 1000,    fromBase: v => v / 1000 },
    "رطل (lb)":        { name: "رطل",       toBase: v => v * 0.4536,  fromBase: v => v / 0.4536 },
    "أونصة (oz)":      { name: "أونصة",     toBase: v => v * 0.02835, fromBase: v => v / 0.02835 },
    "قيراط":           { name: "قيراط",     toBase: v => v * 0.0002,  fromBase: v => v / 0.0002 },
  },
  // Temperature (base: Celsius)
  temperature: {
    "مئوية (°C)":     { name: "مئوية",     toBase: v => v,                   fromBase: v => v },
    "فهرنهايت (°F)":  { name: "فهرنهايت",  toBase: v => (v - 32) * 5/9,      fromBase: v => v * 9/5 + 32 },
    "كلفن (K)":       { name: "كلفن",      toBase: v => v - 273.15,          fromBase: v => v + 273.15 },
  },
  // Volume (base: liter)
  volume: {
    "لتر (L)":        { name: "لتر",       toBase: v => v,            fromBase: v => v },
    "ميليلتر (mL)":   { name: "ميليلتر",   toBase: v => v / 1000,     fromBase: v => v * 1000 },
    "جالون (gal)":    { name: "جالون",     toBase: v => v * 3.7854,   fromBase: v => v / 3.7854 },
    "كوب":            { name: "كوب",       toBase: v => v * 0.2366,   fromBase: v => v / 0.2366 },
    "ملعقة طعام":     { name: "ملعقة طعام", toBase: v => v * 0.01479, fromBase: v => v / 0.01479 },
    "ملعقة صغيرة":    { name: "ملعقة صغيرة", toBase: v => v * 0.004929, fromBase: v => v / 0.004929 },
  },
  // Speed (base: m/s)
  speed: {
    "متر/ثانية (m/s)":   { name: "m/s",  toBase: v => v,            fromBase: v => v },
    "كيلومتر/ساعة (km/h)": { name: "km/h", toBase: v => v / 3.6,    fromBase: v => v * 3.6 },
    "ميل/ساعة (mph)":     { name: "mph",  toBase: v => v * 0.447,   fromBase: v => v / 0.447 },
    "عقدة (knot)":        { name: "knot", toBase: v => v * 0.5144,  fromBase: v => v / 0.5144 },
    "ماخ":                 { name: "Mach", toBase: v => v * 343,     fromBase: v => v / 343 },
  },
  // Area (base: square meter)
  area: {
    "متر مربع (m²)":    { name: "م²",     toBase: v => v,            fromBase: v => v },
    "كيلومتر مربع (km²)": { name: "km²",  toBase: v => v * 1e6,      fromBase: v => v / 1e6 },
    "هكتار (ha)":       { name: "ha",     toBase: v => v * 10000,    fromBase: v => v / 10000 },
    "قدم مربع (ft²)":   { name: "ft²",    toBase: v => v * 0.0929,   fromBase: v => v / 0.0929 },
    "فدان":             { name: "فدان",   toBase: v => v * 4200,     fromBase: v => v / 4200 },
    "ميل مربع (mi²)":   { name: "mi²",    toBase: v => v * 2.59e6,   fromBase: v => v / 2.59e6 },
  },
  // Time (base: second)
  time: {
    "ثانية (s)":     { name: "ثانية",    toBase: v => v,            fromBase: v => v },
    "دقيقة (min)":   { name: "دقيقة",    toBase: v => v * 60,       fromBase: v => v / 60 },
    "ساعة (h)":      { name: "ساعة",     toBase: v => v * 3600,     fromBase: v => v / 3600 },
    "يوم (d)":       { name: "يوم",      toBase: v => v * 86400,    fromBase: v => v / 86400 },
    "أسبوع":          { name: "أسبوع",    toBase: v => v * 604800,   fromBase: v => v / 604800 },
    "سنة":            { name: "سنة",      toBase: v => v * 31536000, fromBase: v => v / 31536000 },
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  length: "الطول",
  weight: "الوزن",
  temperature: "الحرارة",
  volume: "الحجم",
  speed: "السرعة",
  area: "المساحة",
  time: "الوقت",
};

const UnitConverter: React.FC = () => {
  const [category, setCategory] = useState("length");
  const [fromUnit, setFromUnit] = useState(Object.keys(UNITS.length)[0] || "متر (m)");
  const [toUnit, setToUnit] = useState("كيلومتر (km)");
  const [value, setValue] = useState(1);

  const units = Object.keys(UNITS[category]);
  const safeFrom = units.includes(fromUnit) ? fromUnit : units[0];
  const safeTo   = units.includes(toUnit)   ? toUnit   : units[1] || units[0];

  const result = useMemo(() => {
    const fromDef = UNITS[category][safeFrom];
    const toDef   = UNITS[category][safeTo];
    if (!fromDef || !toDef) return 0;
    return toDef.fromBase(fromDef.toBase(value));
  }, [value, category, safeFrom, safeTo]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 flex-wrap">
        {Object.keys(UNITS).map(cat => (
          <button
            key={cat}
            onClick={() => {
              setCategory(cat);
              const keys = Object.keys(UNITS[cat]);
              setFromUnit(keys[0]);
              setToUnit(keys[1] || keys[0]);
            }}
            className={`tab-button ${category === cat ? "active" : ""}`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/[0.06]">
          <label className="text-[11px] font-bold text-slate-400 mb-2 block">من</label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="input-field w-full !text-2xl font-black mb-3 text-right"
          />
          <select value={safeFrom} onChange={(e) => setFromUnit(e.target.value)} className="input-field w-full !text-sm">
            {units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <div className="glass-card rounded-xl p-4 border border-emerald-500/20">
          <label className="text-[11px] font-bold text-slate-400 mb-2 block">إلى</label>
          <div className="text-2xl font-black text-emerald-400 mb-3 text-right break-all">
            {Number.isFinite(result) ? result.toLocaleString("en-US", { maximumFractionDigits: 8 }) : "—"}
          </div>
          <select value={safeTo} onChange={(e) => setToUnit(e.target.value)} className="input-field w-full !text-sm">
            {units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="glass-card rounded-xl p-3 border border-white/[0.06] text-center">
        <p className="text-sm text-slate-300">
          <span className="font-black text-blue-400">{value}</span> {safeFrom}
          <span className="text-slate-500 mx-2">=</span>
          <span className="font-black text-emerald-400">{Number.isFinite(result) ? result.toLocaleString("en-US", { maximumFractionDigits: 8 }) : "—"}</span> {safeTo}
        </p>
      </div>

      {/* Quick reference table */}
      <div className="glass-card rounded-xl p-3 border border-white/[0.06]">
        <p className="text-xs font-bold text-slate-400 mb-2">جدول مرجعي سريع</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
          {units.map(u => {
            const def = UNITS[category][u];
            const r = def.fromBase(UNITS[category][safeFrom].toBase(value));
            return (
              <div key={u} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] text-xs">
                <span className="text-slate-400">{u}</span>
                <span className="font-bold text-slate-200">{Number.isFinite(r) ? r.toLocaleString("en-US", { maximumFractionDigits: 4 }) : "—"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Color Converter ────────── */

const ColorConverter: React.FC = () => {
  const [hex, setHex] = useState("#6366f1");

  const allFormats = useMemo(() => {
    const h = hex.replace("#", "");
    if (h.length !== 6) return null;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

    // RGB
    const rgb = `rgb(${r}, ${g}, ${b})`;
    const rgba = (a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;

    // HSL
    const r1 = r / 255, g1 = g / 255, b1 = b / 255;
    const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
    const l = (max + min) / 2;
    let hh = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r1: hh = ((g1 - b1) / d + (g1 < b1 ? 6 : 0)); break;
        case g1: hh = ((b1 - r1) / d + 2); break;
        case b1: hh = ((r1 - g1) / d + 4); break;
      }
      hh /= 6;
    }
    const hsl = `hsl(${Math.round(hh * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;

    // HSV
    const v = max;
    const sv = max === 0 ? 0 : (max - min) / max;
    const hsv = `hsv(${Math.round(hh * 360)}, ${Math.round(sv * 100)}%, ${Math.round(v * 100)}%)`;

    return {
      hex: `#${h.toUpperCase()}`,
      rgb, rgba50: rgba(0.5), rgba80: rgba(0.8),
      hsl, hsv,
      r, g, b,
    };
  }, [hex]);

  const shades = useMemo(() => {
    if (!allFormats) return [];
    const { r, g, b } = allFormats;
    const shades: { label: string; color: string }[] = [];
    for (let i = 0.1; i <= 0.9; i += 0.1) {
      const rr = Math.round(r + (255 - r) * (1 - i));
      const gg = Math.round(g + (255 - g) * (1 - i));
      const bb = Math.round(b + (255 - b) * (1 - i));
      shades.push({
        label: `${Math.round(i * 100)}%`,
        color: `#${[rr, gg, bb].map(v => v.toString(16).padStart(2, "0")).join("")}`,
      });
    }
    return shades;
  }, [allFormats]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold text-slate-400 mb-1 block">اختر اللون</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              className="h-12 w-20 rounded-lg border border-white/10 bg-transparent cursor-pointer"
            />
            <input
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              dir="ltr"
              className="input-field flex-1 font-mono !text-sm uppercase"
            />
          </div>
          <div
            className="h-32 mt-3 rounded-xl border border-white/10 shadow-inner"
            style={{ background: hex }}
          />
        </div>

        <div className="space-y-2">
          {allFormats ? (
            <>
              {[
                { label: "HEX",       value: allFormats.hex },
                { label: "RGB",       value: allFormats.rgb },
                { label: "RGBA 50%",  value: allFormats.rgba50 },
                { label: "RGBA 80%",  value: allFormats.rgba80 },
                { label: "HSL",       value: allFormats.hsl },
                { label: "HSV",       value: allFormats.hsv },
              ].map(({ label, value }) => (
                <div key={label} className="glass-card rounded-xl p-3 border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="badge badge-amber uppercase">{label}</span>
                    <CopyButton text={value} />
                  </div>
                  <code className="font-mono text-xs text-slate-200" dir="ltr">{value}</code>
                </div>
              ))}
            </>
          ) : (
            <div className="code-block text-rose-400">⚠ لون غير صالح</div>
          )}
        </div>
      </div>

      {shades.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-400 mb-2">تدرّجات اللون</p>
          <div className="grid grid-cols-5 md:grid-cols-9 gap-1.5">
            {shades.map(s => (
              <div key={s.label} className="text-center">
                <div
                  className="h-12 rounded-lg border border-white/10 cursor-pointer hover:scale-105 transition-transform"
                  style={{ background: s.color }}
                  onClick={() => setHex(s.color)}
                  title={s.color}
                />
                <p className="text-[9px] text-slate-500 mt-1 font-mono">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────── Number Base Converter ────────── */

const NumberBaseConverter: React.FC = () => {
  const [value, setValue] = useState("255");
  const [fromBase, setFromBase] = useState(10);

  const results = useMemo(() => {
    try {
      const num = parseInt(value, fromBase);
      if (isNaN(num)) return null;
      return {
        binary:      num.toString(2),
        octal:       num.toString(8),
        decimal:     num.toString(10),
        hexadecimal: num.toString(16).toUpperCase(),
        base36:      num.toString(36).toUpperCase(),
      };
    } catch {
      return null;
    }
  }, [value, fromBase]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          dir="ltr"
          className="input-field flex-1 min-w-[200px] font-mono !text-lg"
          placeholder="أدخل الرقم"
        />
        <select value={fromBase} onChange={(e) => setFromBase(Number(e.target.value))} className="input-field !text-sm">
          <option value={2}>Binary (2)</option>
          <option value={8}>Octal (8)</option>
          <option value={10}>Decimal (10)</option>
          <option value={16}>Hex (16)</option>
          <option value={36}>Base36 (36)</option>
        </select>
      </div>

      {results ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { label: "Binary",      value: results.binary,      color: "border-blue-500/20" },
            { label: "Octal",       value: results.octal,       color: "border-emerald-500/20" },
            { label: "Decimal",     value: results.decimal,     color: "border-amber-500/20" },
            { label: "Hexadecimal", value: results.hexadecimal, color: "border-rose-500/20" },
            { label: "Base36",      value: results.base36,      color: "border-purple-500/20" },
          ].map(({ label, value: v, color }) => (
            <div key={label} className={`glass-card rounded-xl p-3 border ${color}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="badge badge-cyan uppercase">{label}</span>
                <CopyButton text={v} />
              </div>
              <code className="font-mono text-lg font-black text-slate-100" dir="ltr">{v}</code>
            </div>
          ))}
        </div>
      ) : (
        <div className="code-block text-rose-400">⚠ رقم غير صالح للقاعدة المختارة</div>
      )}

      <div className="glass-card rounded-xl p-3 border border-white/[0.06]">
        <p className="text-xs text-slate-400">
          <span className="font-bold text-slate-300">ملاحظة:</span> القاعدة 36 تستخدم 0-9 ثم A-Z.
          تأكد من أن الرقم المدخل صالح للقاعدة المختارة.
        </p>
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Roman Numerals ────────── */

const ROMAN_VALUES: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
  [100,  "C"], [90,  "XC"], [50,  "L"], [40,  "XL"],
  [10,   "X"], [9,   "IX"], [5,   "V"], [4,   "IV"],
  [1,    "I"],
];

function toRoman(num: number): string {
  if (num <= 0 || num >= 4000) return "غير مدعوم (1-3999)";
  let result = "";
  for (const [v, sym] of ROMAN_VALUES) {
    while (num >= v) {
      result += sym;
      num -= v;
    }
  }
  return result;
}

function fromRoman(s: string): number | null {
  const upper = s.toUpperCase().trim();
  if (!/^[MDCLXVI]+$/.test(upper)) return null;
  const map: Record<string, number> = { M: 1000, D: 500, C: 100, L: 50, X: 10, V: 5, I: 1 };
  let total = 0;
  for (let i = 0; i < upper.length; i++) {
    const curr = map[upper[i]];
    const next = map[upper[i + 1]] || 0;
    if (curr < next) {
      total -= curr;
    } else {
      total += curr;
    }
  }
  // Validate by round-trip
  if (toRoman(total) !== upper) return null;
  return total;
}

const RomanConverter: React.FC = () => {
  const [mode, setMode] = useState<"to-roman" | "from-roman">("to-roman");
  const [input, setInput] = useState("2024");

  const output = useMemo(() => {
    if (!input.trim()) return "";
    if (mode === "to-roman") {
      const num = Number(input);
      if (isNaN(num)) return "⚠ رقم غير صالح";
      return toRoman(num);
    } else {
      const result = fromRoman(input);
      if (result === null) return "⚠ رمز روماني غير صالح";
      return String(result);
    }
  }, [input, mode]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setMode("to-roman")} className={`tab-button ${mode === "to-roman" ? "active" : ""}`}>
          رقم → روماني
        </button>
        <button onClick={() => setMode("from-roman")} className={`tab-button ${mode === "from-roman" ? "active" : ""}`}>
          روماني → رقم
        </button>
      </div>

      <div>
        <label className="text-[11px] font-bold text-slate-400 mb-1 block">
          {mode === "to-roman" ? "رقم عربي/عشري (1-3999)" : "رمز روماني (مثل: MMXXIV)"}
        </label>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          dir="ltr"
          className="input-field w-full !text-2xl font-black uppercase"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-bold text-slate-400">النتيجة</label>
          <CopyButton text={output} />
        </div>
        <div className="glass-card rounded-xl p-6 border border-amber-500/20 text-center">
          <p className="text-5xl font-black gradient-text-warm" dir="ltr">{output || "—"}</p>
        </div>
      </div>

      <div className="glass-card rounded-xl p-3 border border-white/[0.06]">
        <p className="text-xs font-bold text-slate-300 mb-2">الرموز الرومانية الأساسية:</p>
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
          {ROMAN_VALUES.filter(([v]) => [1, 5, 10, 50, 100, 500, 1000].includes(v)).map(([v, s]) => (
            <div key={s} className="text-center p-2 rounded-lg bg-white/[0.03]">
              <p className="text-lg font-black text-amber-400" dir="ltr">{s}</p>
              <p className="text-[10px] text-slate-500">{v.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
