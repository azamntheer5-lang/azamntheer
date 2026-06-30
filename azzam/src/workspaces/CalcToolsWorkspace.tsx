import React, { useState, useMemo } from "react";
import {
  Calculator, Percent, DollarSign, Heart, Utensils, Sigma,
} from "lucide-react";
import { TabBar, ToolHeader } from "../components/ui/SharedUI";

type TabId = "basic" | "scientific" | "bmi" | "percentage" | "loan" | "tip";

const TABS = [
  { id: "basic",      label: "حاسبة أساسية",     icon: Calculator },
  { id: "scientific", label: "علمية",             icon: Sigma },
  { id: "bmi",        label: "مؤشر كتلة الجسم",  icon: Heart },
  { id: "percentage", label: "نِسب مئوية",        icon: Percent },
  { id: "loan",       label: "قروض وأقساط",      icon: DollarSign },
  { id: "tip",        label: "إكرامية",           icon: Utensils },
];

export const CalcToolsWorkspace: React.FC = () => {
  const [active, setActive] = useState<TabId>("basic");

  return (
    <div className="flex-1 overflow-y-auto safe-scrollbar p-6">
      <ToolHeader
        title="حاسبات متخصصة"
        description="أساسية · علمية · BMI · نسب · قروض · إكرامية"
        icon={Calculator}
        color="bg-emerald-500/10 text-emerald-400"
      />
      <TabBar tabs={TABS} active={active} onChange={(id) => setActive(id as TabId)} />

      {active === "basic"      && <BasicCalculator />}
      {active === "scientific" && <ScientificCalculator />}
      {active === "bmi"        && <BMICalculator />}
      {active === "percentage" && <PercentageCalculator />}
      {active === "loan"       && <LoanCalculator />}
      {active === "tip"        && <TipCalculator />}
    </div>
  );
};

/* ─────────────────────────────────── Basic Calculator ────────── */

const BasicCalculator: React.FC = () => {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [reset, setReset] = useState(false);

  const inputDigit = (d: string) => {
    if (reset || display === "0") {
      setDisplay(d);
      setReset(false);
    } else {
      setDisplay(display + d);
    }
  };

  const inputDot = () => {
    if (reset) {
      setDisplay("0.");
      setReset(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const clear = () => { setDisplay("0"); setPrev(null); setOp(null); setReset(false); };

  const toggleSign = () => setDisplay(d => d.startsWith("-") ? d.slice(1) : d === "0" ? d : "-" + d);

  const percent = () => setDisplay(d => String(parseFloat(d) / 100));

  const compute = (a: number, b: number, op: string): number => {
    switch (op) {
      case "+": return a + b;
      case "−": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? NaN : a / b;
      default:  return b;
    }
  };

  const handleOp = (newOp: string) => {
    const current = parseFloat(display);
    if (prev !== null && op && !reset) {
      const result = compute(prev, current, op);
      setPrev(result);
      setDisplay(String(result));
    } else {
      setPrev(current);
    }
    setOp(newOp);
    setReset(true);
  };

  const equals = () => {
    if (prev === null || op === null) return;
    const current = parseFloat(display);
    const result = compute(prev, current, op);
    setDisplay(Number.isFinite(result) ? String(result) : "خطأ");
    setPrev(null);
    setOp(null);
    setReset(true);
  };

  const Btn: React.FC<{ label: string; onClick: () => void; variant?: "default" | "op" | "accent" | "equals"; wide?: boolean }> =
    ({ label, onClick, variant = "default", wide }) => (
      <button
        onClick={onClick}
        className={`h-14 rounded-xl font-bold text-lg transition-all cursor-pointer active:scale-95 ${
          wide ? "col-span-2" : ""
        } ${
          variant === "op"     ? "bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25" :
          variant === "accent" ? "bg-rose-500/15 text-rose-400 border border-rose-500/25 hover:bg-rose-500/25" :
          variant === "equals" ? "btn-primary text-white" :
          "bg-white/[0.04] text-slate-200 border border-white/8 hover:bg-white/[0.08]"
        }`}
      >
        {label}
      </button>
    );

  return (
    <div className="max-w-sm mx-auto space-y-3">
      <div className="glass-card rounded-2xl p-5 border border-white/[0.06]">
        <div className="text-right text-xs text-slate-500 mb-1 h-4">
          {prev !== null && op ? `${prev} ${op}` : ""}
        </div>
        <div className="text-right text-4xl font-black text-slate-100 font-mono break-all" dir="ltr">
          {display}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Btn label="AC" onClick={clear} variant="accent" />
        <Btn label="±"  onClick={toggleSign} variant="op" />
        <Btn label="%"  onClick={percent} variant="op" />
        <Btn label="÷"  onClick={() => handleOp("÷")} variant="op" />

        <Btn label="7" onClick={() => inputDigit("7")} />
        <Btn label="8" onClick={() => inputDigit("8")} />
        <Btn label="9" onClick={() => inputDigit("9")} />
        <Btn label="×" onClick={() => handleOp("×")} variant="op" />

        <Btn label="4" onClick={() => inputDigit("4")} />
        <Btn label="5" onClick={() => inputDigit("5")} />
        <Btn label="6" onClick={() => inputDigit("6")} />
        <Btn label="−" onClick={() => handleOp("−")} variant="op" />

        <Btn label="1" onClick={() => inputDigit("1")} />
        <Btn label="2" onClick={() => inputDigit("2")} />
        <Btn label="3" onClick={() => inputDigit("3")} />
        <Btn label="+" onClick={() => handleOp("+")} variant="op" />

        <Btn label="0" onClick={() => inputDigit("0")} wide />
        <Btn label="." onClick={inputDot} />
        <Btn label="=" onClick={equals} variant="equals" />
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Scientific Calculator ────────── */

const ScientificCalculator: React.FC = () => {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState("0");

  const append = (s: string) => setExpr(e => e + s);
  const clear  = () => { setExpr(""); setResult("0"); };
  const back   = () => setExpr(e => e.slice(0, -1));

  const evaluate = () => {
    if (!expr.trim()) return;
    try {
      // Safe evaluation: only allow numbers, operators, parentheses, and math functions
      const safe = expr
        .replace(/sin\(/g, "Math.sin(")
        .replace(/cos\(/g, "Math.cos(")
        .replace(/tan\(/g, "Math.tan(")
        .replace(/log\(/g, "Math.log10(")
        .replace(/ln\(/g, "Math.log(")
        .replace(/sqrt\(/g, "Math.sqrt(")
        .replace(/abs\(/g, "Math.abs(")
        .replace(/π/g, "Math.PI")
        .replace(/e\b/g, "Math.E")
        .replace(/\^/g, "**")
        .replace(/(\d+)!/g, (_, n) => {
          let f = 1;
          for (let i = 2; i <= Number(n); i++) f *= i;
          return String(f);
        });
      // Validate
      if (!/^[\d+\-*/().\s*MathPIEsincotanlgqrbsE,]+$/.test(safe)) throw new Error("Invalid");
      // eslint-disable-next-line no-new-func
      const r = Function(`"use strict"; return (${safe})`)();
      if (typeof r !== "number" || !Number.isFinite(r)) throw new Error("Invalid");
      setResult(String(r));
    } catch {
      setResult("⚠ خطأ");
    }
  };

  const sciBtns = [
    "sin(", "cos(", "tan(", "π",
    "log(", "ln(", "sqrt(", "e",
    "(", ")", "^", "!",
    "abs(", "7", "8", "9",
    "+", "4", "5", "6",
    "−", "1", "2", "3",
    "×", "0", ".", "=",
    "÷", "AC", "⌫",
  ];

  const handleClick = (label: string) => {
    if (label === "=")      return evaluate();
    if (label === "AC")     return clear();
    if (label === "⌫")      return back();
    if (label === "−")      return append("-");
    if (label === "×")      return append("*");
    if (label === "÷")      return append("/");
    return append(label);
  };

  return (
    <div className="max-w-md mx-auto space-y-3">
      <div className="glass-card rounded-2xl p-4 border border-white/[0.06]">
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          dir="ltr"
          className="input-field w-full text-right text-lg font-mono mb-2"
          placeholder="مثل: sin(π/4) + 2^3"
        />
        <div className="text-right text-3xl font-black text-emerald-400 font-mono break-all" dir="ltr">{result}</div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {sciBtns.map((b, i) => {
          const isOp    = ["+", "−", "×", "÷", "^", "!", "=", "(", ")"].includes(b);
          const isFunc  = ["sin(", "cos(", "tan(", "log(", "ln(", "sqrt(", "abs("].includes(b);
          const isConst = ["π", "e"].includes(b);
          const isClear = ["AC", "⌫"].includes(b);
          return (
            <button
              key={i}
              onClick={() => handleClick(b)}
              className={`h-12 rounded-xl font-bold text-sm transition-all cursor-pointer active:scale-95 ${
                b === "=" ? "btn-primary text-white col-span-1" :
                isClear   ? "bg-rose-500/15 text-rose-400 border border-rose-500/25 hover:bg-rose-500/25" :
                isOp      ? "bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25" :
                isFunc    ? "bg-violet-500/15 text-violet-400 border border-violet-500/25 hover:bg-violet-500/25 text-xs" :
                isConst   ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/25" :
                "bg-white/[0.04] text-slate-200 border border-white/8 hover:bg-white/[0.08]"
              }`}
            >
              {b}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────────────────────────── BMI Calculator ────────── */

const BMICalculator: React.FC = () => {
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(170);

  const bmi = useMemo(() => {
    const h = height / 100;
    if (h <= 0) return 0;
    return weight / (h * h);
  }, [weight, height]);

  const category = useMemo(() => {
    if (bmi < 18.5)  return { label: "نحافة",          color: "text-blue-400",    bg: "bg-blue-500/20",     range: "< 18.5" };
    if (bmi < 25)    return { label: "وزن طبيعي",      color: "text-emerald-400", bg: "bg-emerald-500/20",  range: "18.5 — 24.9" };
    if (bmi < 30)    return { label: "زيادة وزن",      color: "text-amber-400",   bg: "bg-amber-500/20",    range: "25 — 29.9" };
    if (bmi < 35)    return { label: "سمنة درجة 1",    color: "text-orange-400",  bg: "bg-orange-500/20",   range: "30 — 34.9" };
    if (bmi < 40)    return { label: "سمنة درجة 2",    color: "text-rose-400",    bg: "bg-rose-500/20",     range: "35 — 39.9" };
    return            { label: "سمنة مفرطة",            color: "text-rose-400",    bg: "bg-rose-500/20",     range: "≥ 40" };
  }, [bmi]);

  // BMI scale: 15 to 40
  const scalePct = Math.min(100, Math.max(0, ((bmi - 15) / 25) * 100));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-4 border border-white/[0.06]">
          <label className="text-xs font-bold text-slate-400 mb-2 block">
            الوزن: <span className="text-emerald-400 font-black">{weight} كجم</span>
          </label>
          <input type="range" min={30} max={200} value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-full accent-emerald-500" />
          <div className="flex justify-between text-[9px] text-slate-500 mt-1"><span>30</span><span>115</span><span>200</span></div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/[0.06]">
          <label className="text-xs font-bold text-slate-400 mb-2 block">
            الطول: <span className="text-blue-400 font-black">{height} سم</span>
          </label>
          <input type="range" min={100} max={220} value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-full accent-blue-500" />
          <div className="flex justify-between text-[9px] text-slate-500 mt-1"><span>100</span><span>160</span><span>220</span></div>
        </div>
      </div>

      <div className={`glass-card rounded-2xl p-6 border ${category.bg.replace("/20", "/30")} text-center`}>
        <p className="text-xs text-slate-500 mb-1">مؤشر كتلة الجسم</p>
        <p className={`text-6xl font-black ${category.color}`}>{bmi.toFixed(1)}</p>
        <p className={`text-lg font-black ${category.color} mt-2`}>{category.label}</p>
        <p className="text-xs text-slate-500 mt-1">({category.range})</p>
      </div>

      {/* Scale visualization */}
      <div className="glass-card rounded-xl p-4 border border-white/[0.06]">
        <p className="text-xs font-bold text-slate-400 mb-3">مقياس BMI</p>
        <div className="relative h-3 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 via-emerald-500 via-amber-500 via-orange-500 to-rose-500">
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
            style={{ left: `${scalePct}%`, transform: "translateX(-50%)" }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-500 mt-1">
          <span>15</span><span>18.5</span><span>25</span><span>30</span><span>35</span><span>40</span>
        </div>
      </div>

      <div className="glass-card rounded-xl p-3 border border-white/[0.06]">
        <p className="text-xs text-slate-400">
          <strong className="text-slate-300">ملاحظة:</strong> مؤشر كتلة الجسم هو مقياس تقريبي ولا يفرّق بين العضلات والدهون.
          استشر طبيبك للحصول على تقييم صحي شامل.
        </p>
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Percentage Calculator ────────── */

const PercentageCalculator: React.FC = () => {
  const [mode, setMode] = useState<"basic" | "of-what" | "what-percent" | "change">("basic");

  // Basic: X% of Y
  const [x1, setX1] = useState(20);
  const [y1, setY1] = useState(150);

  // X is what % of Y
  const [x2, setX2] = useState(30);
  const [y2, setY2] = useState(150);

  // % change
  const [from, setFrom] = useState(100);
  const [to, setTo] = useState(125);

  const results = useMemo(() => {
    return {
      basic:        (x1 / 100) * y1,
      ofWhat:       y2 === 0 ? 0 : (x2 / y2) * 100,
      whatPercent:  y2 === 0 ? 0 : (x2 / y2) * 100,
      change:       from === 0 ? 0 : ((to - from) / from) * 100,
    };
  }, [x1, y1, x2, y2, from, to]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 flex-wrap">
        {[
          { v: "basic",        l: "X% من Y" },
          { v: "what-percent", l: "X هو كم % من Y" },
          { v: "change",       l: "% التغيّر" },
        ].map(m => (
          <button key={m.v} onClick={() => setMode(m.v as any)} className={`tab-button ${mode === m.v ? "active" : ""}`}>
            {m.l}
          </button>
        ))}
      </div>

      {mode === "basic" && (
        <div className="glass-card rounded-xl p-5 border border-white/[0.06] space-y-3">
          <div className="flex items-center gap-2">
            <input type="number" value={x1} onChange={(e) => setX1(Number(e.target.value))} className="input-field flex-1 !text-lg font-bold" />
            <span className="text-slate-400">%</span>
            <span className="text-slate-400">من</span>
            <input type="number" value={y1} onChange={(e) => setY1(Number(e.target.value))} className="input-field flex-1 !text-lg font-bold" />
            <span className="text-slate-400">=</span>
            <div className="flex-1 text-center">
              <span className="text-2xl font-black text-emerald-400">{results.basic.toLocaleString("en-US", { maximumFractionDigits: 4 })}</span>
            </div>
          </div>
        </div>
      )}

      {mode === "what-percent" && (
        <div className="glass-card rounded-xl p-5 border border-white/[0.06] space-y-3">
          <div className="flex items-center gap-2">
            <input type="number" value={x2} onChange={(e) => setX2(Number(e.target.value))} className="input-field flex-1 !text-lg font-bold" />
            <span className="text-slate-400">كم % من</span>
            <input type="number" value={y2} onChange={(e) => setY2(Number(e.target.value))} className="input-field flex-1 !text-lg font-bold" />
            <span className="text-slate-400">=</span>
            <div className="flex-1 text-center">
              <span className="text-2xl font-black text-emerald-400">{results.whatPercent.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      )}

      {mode === "change" && (
        <div className="glass-card rounded-xl p-5 border border-white/[0.06] space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">من</span>
            <input type="number" value={from} onChange={(e) => setFrom(Number(e.target.value))} className="input-field flex-1 !text-lg font-bold" />
            <span className="text-slate-400">إلى</span>
            <input type="number" value={to} onChange={(e) => setTo(Number(e.target.value))} className="input-field flex-1 !text-lg font-bold" />
            <span className="text-slate-400">=</span>
            <div className="flex-1 text-center">
              <span className={`text-2xl font-black ${results.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {results.change >= 0 ? "+" : ""}{results.change.toFixed(2)}%
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center">
            {results.change > 0 ? "📈 زيادة" : results.change < 0 ? "📉 انخفاض" : "= لا تغيير"}
          </p>
        </div>
      )}

      <div className="glass-card rounded-xl p-3 border border-white/[0.06]">
        <p className="text-xs font-bold text-slate-400 mb-2">أمثلة سريعة</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-white/[0.03]"><strong className="text-blue-400">20%</strong> من 150 = <strong className="text-emerald-400">30</strong></div>
          <div className="p-2 rounded-lg bg-white/[0.03]"><strong className="text-blue-400">30</strong> هو <strong className="text-emerald-400">20%</strong> من 150</div>
          <div className="p-2 rounded-lg bg-white/[0.03]">من 100 إلى 125 = <strong className="text-emerald-400">+25%</strong></div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Loan Calculator ────────── */

const LoanCalculator: React.FC = () => {
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate]           = useState(5);
  const [years, setYears]         = useState(5);

  const calc = useMemo(() => {
    const n = years * 12;
    const r = rate / 100 / 12;
    if (r === 0) {
      const monthly = principal / n;
      return {
        monthly,
        totalPaid: monthly * n,
        totalInterest: 0,
      };
    }
    const monthly = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPaid = monthly * n;
    const totalInterest = totalPaid - principal;
    return { monthly, totalPaid, totalInterest };
  }, [principal, rate, years]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 border border-white/[0.06]">
          <label className="text-xs font-bold text-slate-400 mb-2 block">المبلغ ($)</label>
          <input type="number" min={0} value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} className="input-field w-full !text-lg font-bold" />
          <input type="range" min={1000} max={1000000} step={1000} value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} className="w-full mt-2 accent-indigo-500" />
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/[0.06]">
          <label className="text-xs font-bold text-slate-400 mb-2 block">الفائدة السنوية (%)</label>
          <input type="number" min={0} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="input-field w-full !text-lg font-bold" />
          <input type="range" min={0} max={30} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full mt-2 accent-amber-500" />
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/[0.06]">
          <label className="text-xs font-bold text-slate-400 mb-2 block">المدة (سنوات)</label>
          <input type="number" min={1} max={30} value={years} onChange={(e) => setYears(Number(e.target.value))} className="input-field w-full !text-lg font-bold" />
          <input type="range" min={1} max={30} value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full mt-2 accent-emerald-500" />
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 border border-emerald-500/20 text-center">
        <p className="text-xs text-slate-500 mb-1">القسط الشهري</p>
        <p className="text-5xl font-black gradient-text-cool">
          ${calc.monthly.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="stat-card text-center">
          <p className="text-[10px] text-slate-500">إجمالي المدفوع</p>
          <p className="text-xl font-black text-blue-400">${calc.totalPaid.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-[10px] text-slate-500">إجمالي الفوائد</p>
          <p className="text-xl font-black text-amber-400">${calc.totalInterest.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-[10px] text-slate-500">عدد الأقساط</p>
          <p className="text-xl font-black text-violet-400">{years * 12}</p>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Tip Calculator ────────── */

const TipCalculator: React.FC = () => {
  const [bill, setBill]         = useState(100);
  const [tipPercent, setTipPercent] = useState(15);
  const [people, setPeople]     = useState(1);

  const calc = useMemo(() => {
    const tipAmount = bill * (tipPercent / 100);
    const total = bill + tipAmount;
    const perPerson = total / Math.max(1, people);
    return { tipAmount, total, perPerson };
  }, [bill, tipPercent, people]);

  const presets = [10, 12, 15, 18, 20, 25];

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="glass-card rounded-xl p-4 border border-white/[0.06]">
        <label className="text-xs font-bold text-slate-400 mb-2 block">قيمة الفاتورة ($)</label>
        <input type="number" min={0} value={bill} onChange={(e) => setBill(Number(e.target.value))} className="input-field w-full !text-xl font-bold" />
      </div>

      <div className="glass-card rounded-xl p-4 border border-white/[0.06]">
        <label className="text-xs font-bold text-slate-400 mb-2 block">
          الإكرامية: <span className="text-amber-400 font-black">{tipPercent}%</span>
        </label>
        <div className="grid grid-cols-6 gap-1.5 mb-3">
          {presets.map(p => (
            <button
              key={p}
              onClick={() => setTipPercent(p)}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tipPercent === p
                  ? "btn-primary text-white"
                  : "bg-white/[0.04] text-slate-300 border border-white/8 hover:bg-white/[0.08]"
              }`}
            >
              {p}%
            </button>
          ))}
        </div>
        <input type="range" min={0} max={50} value={tipPercent} onChange={(e) => setTipPercent(Number(e.target.value))} className="w-full accent-amber-500" />
      </div>

      <div className="glass-card rounded-xl p-4 border border-white/[0.06]">
        <label className="text-xs font-bold text-slate-400 mb-2 block">عدد الأشخاص</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPeople(Math.max(1, people - 1))}
            className="h-10 w-10 rounded-lg bg-white/[0.04] border border-white/8 text-slate-200 hover:bg-white/[0.08] cursor-pointer font-black"
          >−</button>
          <input type="number" min={1} value={people} onChange={(e) => setPeople(Math.max(1, Number(e.target.value)))} className="input-field flex-1 !text-center !text-xl font-bold" />
          <button
            onClick={() => setPeople(people + 1)}
            className="h-10 w-10 rounded-lg bg-white/[0.04] border border-white/8 text-slate-200 hover:bg-white/[0.08] cursor-pointer font-black"
          >+</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="glass-card rounded-xl p-4 border border-amber-500/20 text-center">
          <p className="text-[10px] text-slate-500">الإكرامية</p>
          <p className="text-xl font-black text-amber-400">${calc.tipAmount.toFixed(2)}</p>
        </div>
        <div className="glass-card rounded-xl p-4 border border-emerald-500/20 text-center">
          <p className="text-[10px] text-slate-500">الإجمالي</p>
          <p className="text-xl font-black text-emerald-400">${calc.total.toFixed(2)}</p>
        </div>
        <div className="glass-card rounded-xl p-4 border border-blue-500/20 text-center">
          <p className="text-[10px] text-slate-500">للشخص</p>
          <p className="text-xl font-black text-blue-400">${calc.perPerson.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};
