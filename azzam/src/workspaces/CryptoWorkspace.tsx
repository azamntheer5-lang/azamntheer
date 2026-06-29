import React, { useState, useMemo, useEffect } from "react";
import {
  Lock, KeyRound, Shield, Activity, RefreshCw, Copy, Eye, EyeOff, Check, AlertTriangle,
} from "lucide-react";
import { TabBar, ToolHeader, CopyButton } from "../components/ui/SharedUI";
import CryptoJS from "crypto-js";
import { nanoid } from "nanoid";

type TabId = "password" | "aes" | "strength" | "token" | "entropy";

const TABS = [
  { id: "password", label: "توليد كلمات سر", icon: KeyRound },
  { id: "aes",      label: "تشفير AES",      icon: Lock },
  { id: "strength", label: "فحص القوة",      icon: Shield },
  { id: "token",    label: "توليد توكنز",    icon: Activity },
  { id: "entropy",  label: "إنتروبيا",       icon: AlertTriangle },
];

export const CryptoWorkspace: React.FC = () => {
  const [active, setActive] = useState<TabId>("password");

  return (
    <div className="flex-1 overflow-y-auto safe-scrollbar p-6">
      <ToolHeader
        title="تشفير وكلمات سر"
        description="توليد · AES · فحص قوة · توكنز · إنتروبيا — أمان على مستوى البنوك"
        icon={Lock}
        color="bg-rose-500/10 text-rose-400"
      />
      <TabBar tabs={TABS} active={active} onChange={(id) => setActive(id as TabId)} />

      {active === "password" && <PasswordGenerator />}
      {active === "aes"      && <AesTool />}
      {active === "strength" && <StrengthChecker />}
      {active === "token"    && <TokenGenerator />}
      {active === "entropy"  && <EntropyTool />}
    </div>
  );
};

/* ─────────────────────────────────── Password Generator ────────── */

const PasswordGenerator: React.FC = () => {
  const [length, setLength] = useState(16);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers]     = useState(true);
  const [symbols, setSymbols]     = useState(false);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(true);

  const generate = () => {
    let charset = "";
    if (uppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (lowercase) charset += "abcdefghijklmnopqrstuvwxyz";
    if (numbers)   charset += "0123456789";
    if (symbols)   charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";
    if (excludeAmbiguous) charset = charset.replace(/[O0Il1|]/g, "");
    if (!charset) { setPassword(""); return; }

    // Use crypto.getRandomValues for cryptographic randomness
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    let pwd = "";
    for (let i = 0; i < length; i++) {
      pwd += charset[array[i] % charset.length];
    }
    setPassword(pwd);
  };

  useEffect(() => { generate(); /* eslint-disable-line */ }, [length, uppercase, lowercase, numbers, symbols, excludeAmbiguous]);

  const strength = useMemo(() => {
    if (!password) return { score: 0, label: "ضعيفة جداً", color: "text-rose-400", percent: 0 };
    let pool = 0;
    if (uppercase) pool += 26;
    if (lowercase) pool += 26;
    if (numbers)   pool += 10;
    if (symbols)   pool += 26;
    if (excludeAmbiguous) pool -= 4;
    const entropy = password.length * Math.log2(pool || 1);
    const score = Math.min(100, Math.round((entropy / 100) * 100));
    let label = "ضعيفة", color = "text-rose-400";
    if (entropy >= 100) { label = "قوية جداً"; color = "text-emerald-400"; }
    else if (entropy >= 80) { label = "قوية"; color = "text-emerald-400"; }
    else if (entropy >= 60) { label = "متوسطة"; color = "text-amber-400"; }
    else if (entropy >= 40) { label = "ضعيفة"; color = "text-rose-400"; }
    return { score, label, color, percent: score };
  }, [password, uppercase, lowercase, numbers, symbols, excludeAmbiguous]);

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-4 border border-white/[0.06]">
        <div className="flex items-center gap-2 mb-3">
          <input
            type={show ? "text" : "password"}
            value={password}
            readOnly
            dir="ltr"
            className="input-field flex-1 font-mono !text-lg !text-emerald-400"
          />
          <button
            onClick={() => setShow(!show)}
            className="btn-secondary h-9 w-9 rounded-lg flex items-center justify-center cursor-pointer"
            title={show ? "إخفاء" : "إظهار"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(password)}
            className="btn-secondary h-9 w-9 rounded-lg flex items-center justify-center cursor-pointer"
            title="نسخ"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={generate}
            className="btn-primary h-9 w-9 rounded-lg flex items-center justify-center cursor-pointer"
            title="توليد جديد"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Strength bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-400">القوة: <span className={strength.color}>{strength.label}</span></span>
            <span className="text-xs text-slate-500">{strength.percent}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${strength.percent}%`,
                background: strength.percent >= 80 ? "linear-gradient(90deg, #10b981, #34d399)" :
                          strength.percent >= 60 ? "linear-gradient(90deg, #f59e0b, #fbbf24)" :
                          "linear-gradient(90deg, #ef4444, #f87171)",
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-4 border border-white/[0.06]">
          <label className="text-xs font-bold text-slate-300 mb-2 block">الطول: <span className="text-emerald-400 font-black">{length}</span></label>
          <input
            type="range"
            min={4}
            max={64}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-[9px] text-slate-500 mt-1">
            <span>4</span><span>16</span><span>32</span><span>48</span><span>64</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-white/[0.06] space-y-2">
          {[
            { v: uppercase,        set: setUppercase,        label: "حروف كبيرة (A-Z)" },
            { v: lowercase,        set: setLowercase,        label: "حروف صغيرة (a-z)" },
            { v: numbers,          set: setNumbers,          label: "أرقام (0-9)" },
            { v: symbols,          set: setSymbols,          label: "رموز (!@#$)" },
            { v: excludeAmbiguous, set: setExcludeAmbiguous, label: "استبعاد المتشابهة (O, 0, I, l, 1)" },
          ].map(opt => (
            <label key={opt.label} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-slate-100">
              <input
                type="checkbox"
                checked={opt.v}
                onChange={(e) => opt.set(e.target.checked)}
                className="accent-indigo-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Generated password history */}
      <PasswordHistory password={password} />
    </div>
  );
};

const PasswordHistory: React.FC<{ password: string }> = ({ password }) => {
  const [history, setHistory] = useState<string[]>([]);
  const lastRef = React.useRef("");

  useEffect(() => {
    if (password && password !== lastRef.current) {
      setHistory(h => [password, ...h].slice(0, 5));
      lastRef.current = password;
    }
  }, [password]);

  if (history.length === 0) return null;

  return (
    <div className="glass-card rounded-xl p-3 border border-white/[0.06]">
      <p className="text-xs font-bold text-slate-400 mb-2">آخر 5 كلمات سر</p>
      <div className="space-y-1.5">
        {history.map((p, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
            <code className="flex-1 font-mono text-xs text-slate-300" dir="ltr">{p}</code>
            <button onClick={() => navigator.clipboard.writeText(p)} className="text-slate-500 hover:text-slate-300">
              <Copy className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────── AES Encrypt/Decrypt ────────── */

const AesTool: React.FC = () => {
  const [input, setInput] = useState("نص سرّي للتجربة");
  const [password, setPassword] = useState("mySecretKey123");
  const [mode, setMode] = useState<"encrypt" | "decrypt">("encrypt");

  const output = useMemo(() => {
    if (!input || !password) return "";
    try {
      if (mode === "encrypt") {
        return CryptoJS.AES.encrypt(input, password).toString();
      } else {
        const bytes = CryptoJS.AES.decrypt(input, password);
        const text = bytes.toString(CryptoJS.enc.Utf8);
        if (!text) return "⚠ فشل فك التشفير — كلمة سر خاطئة أو نص غير مشفّر";
        return text;
      }
    } catch (e: any) {
      return `⚠ خطأ: ${e.message}`;
    }
  }, [input, password, mode]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={() => setMode("encrypt")} className={`tab-button ${mode === "encrypt" ? "active" : ""}`}>
          🔒 تشفير
        </button>
        <button onClick={() => setMode("decrypt")} className={`tab-button ${mode === "decrypt" ? "active" : ""}`}>
          🔓 فك التشفير
        </button>
      </div>

      <div>
        <label className="text-[11px] font-bold text-slate-400 mb-1 block">
          {mode === "encrypt" ? "النص الأصلي" : "النص المشفّر"}
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          dir="auto"
          className="input-field w-full h-32 !text-sm resize-none"
        />
      </div>

      <div>
        <label className="text-[11px] font-bold text-slate-400 mb-1 block">كلمة السر / المفتاح</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          dir="ltr"
          className="input-field w-full font-mono !text-sm"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-bold text-slate-400">النتيجة</label>
          {output && !output.startsWith("⚠") && <CopyButton text={output} />}
        </div>
        <pre className={`code-block h-32 overflow-auto ${output.startsWith("⚠") ? "text-rose-400" : ""}`} dir="ltr">{output || "—"}</pre>
      </div>

      <div className="glass-card rounded-xl p-3 border border-amber-500/20">
        <p className="text-xs text-amber-300 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span><strong>تنبيه:</strong> التشفير يتم محلياً في متصفحك بالكامل باستخدام AES-256. لا يتم إرسال أي بيانات. احتفظ بكلمة السر بأمان — لا يمكن استرجاعها.</span>
        </p>
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Strength Checker ────────── */

const StrengthChecker: React.FC = () => {
  const [password, setPassword] = useState("");

  const analysis = useMemo(() => {
    if (!password) return null;
    const checks = {
      length8:    password.length >= 8,
      length12:   password.length >= 12,
      length16:   password.length >= 16,
      uppercase:  /[A-Z]/.test(password),
      lowercase:  /[a-z]/.test(password),
      numbers:    /[0-9]/.test(password),
      symbols:    /[^A-Za-z0-9]/.test(password),
      noCommon:   !/(password|123456|qwerty|admin|letmein|welcome)/i.test(password),
      noSequence: !/(.)\1{2,}/.test(password) && !/(abc|bcd|cde|123|234|345|456|567|678|789)/i.test(password),
    };

    const pool =
      (checks.uppercase ? 26 : 0) +
      (checks.lowercase ? 26 : 0) +
      (checks.numbers   ? 10 : 0) +
      (checks.symbols   ? 32 : 0);
    const entropy = password.length * Math.log2(pool || 1);

    let crackTime = "فوري";
    const guessesPerSec = 1e10; // 10 billion guesses/sec (offline attack)
    const seconds = Math.pow(2, entropy) / guessesPerSec;
    if (seconds < 1) crackTime = "فوري";
    else if (seconds < 60) crackTime = `${Math.round(seconds)} ثانية`;
    else if (seconds < 3600) crackTime = `${Math.round(seconds / 60)} دقيقة`;
    else if (seconds < 86400) crackTime = `${Math.round(seconds / 3600)} ساعة`;
    else if (seconds < 31536000) crackTime = `${Math.round(seconds / 86400)} يوم`;
    else if (seconds < 31536000 * 100) crackTime = `${Math.round(seconds / 31536000)} سنة`;
    else if (seconds < 31536000 * 1e6) crackTime = `${Math.round(seconds / 31536000 / 1000)} ألف سنة`;
    else if (seconds < 31536000 * 1e9) crackTime = `${Math.round(seconds / 31536000 / 1e6)} مليون سنة`;
    else crackTime = "مليارات السنين";

    let score = 0;
    Object.values(checks).forEach(v => { if (v) score++; });
    const percent = Math.min(100, Math.round((entropy / 100) * 100));

    let label = "ضعيفة جداً", color = "text-rose-400", bg = "bg-rose-500";
    if (entropy >= 100) { label = "قوية جداً"; color = "text-emerald-400"; bg = "bg-emerald-500"; }
    else if (entropy >= 80) { label = "قوية"; color = "text-emerald-400"; bg = "bg-emerald-500"; }
    else if (entropy >= 60) { label = "متوسطة"; color = "text-amber-400"; bg = "bg-amber-500"; }
    else if (entropy >= 40) { label = "ضعيفة"; color = "text-rose-400"; bg = "bg-rose-500"; }

    return { checks, entropy, crackTime, score, percent, label, color, bg };
  }, [password]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-bold text-slate-400 mb-1 block">اكتب كلمة السر لتحليلها</label>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          dir="ltr"
          className="input-field w-full font-mono !text-lg"
          placeholder="••••••••"
        />
      </div>

      {analysis ? (
        <>
          <div className="glass-card rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-300">القوة: <span className={analysis.color}>{analysis.label}</span></span>
              <span className="text-xs text-slate-500">{analysis.percent}%</span>
            </div>
            <div className="h-3 rounded-full bg-white/5 overflow-hidden">
              <div className={`h-full ${analysis.bg} transition-all duration-500`} style={{ width: `${analysis.percent}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
              <div>
                <p className="text-slate-500">الإنتروبيا</p>
                <p className="font-black text-blue-400">{analysis.entropy.toFixed(1)} bits</p>
              </div>
              <div>
                <p className="text-slate-500">زمن الكسر (هجوم offline)</p>
                <p className="font-black text-amber-400">{analysis.crackTime}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-3 border border-white/[0.06]">
            <p className="text-xs font-bold text-slate-400 mb-2">الفحوصات</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { v: analysis.checks.length8,    label: "8 أحرف على الأقل" },
                { v: analysis.checks.length12,   label: "12 حرف على الأقل" },
                { v: analysis.checks.length16,   label: "16 حرف على الأقل" },
                { v: analysis.checks.uppercase,  label: "يحتوي حروف كبيرة" },
                { v: analysis.checks.lowercase,  label: "يحتوي حروف صغيرة" },
                { v: analysis.checks.numbers,    label: "يحتوي أرقام" },
                { v: analysis.checks.symbols,    label: "يحتوي رموز" },
                { v: analysis.checks.noCommon,   label: "ليست كلمة سر شائعة" },
                { v: analysis.checks.noSequence, label: "خالية من التسلسلات" },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-2 text-xs">
                  {c.v
                    ? <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    : <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />}
                  <span className={c.v ? "text-slate-200" : "text-slate-500"}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-xs text-slate-500">اكتب كلمة سر للبدء</div>
      )}
    </div>
  );
};

/* ─────────────────────────────────── Token Generator ────────── */

const TokenGenerator: React.FC = () => {
  const [length, setLength] = useState(32);
  const [count, setCount]   = useState(5);
  const [type, setType]     = useState<"hex" | "base64" | "alphanumeric" | "url-safe">("hex");
  const [tokens, setTokens] = useState<string[]>([]);

  const generate = () => {
    const list: string[] = [];
    for (let i = 0; i < count; i++) {
      if (type === "hex") {
        const arr = new Uint8Array(length / 2);
        crypto.getRandomValues(arr);
        list.push(Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join(""));
      } else if (type === "base64") {
        const arr = new Uint8Array(length);
        crypto.getRandomValues(arr);
        list.push(btoa(String.fromCharCode(...Array.from(arr))));
      } else if (type === "alphanumeric") {
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const arr = new Uint32Array(length);
        crypto.getRandomValues(arr);
        list.push(Array.from(arr).map(n => charset[n % charset.length]).join(""));
      } else {
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~";
        const arr = new Uint32Array(length);
        crypto.getRandomValues(arr);
        list.push(Array.from(arr).map(n => charset[n % charset.length]).join(""));
      }
    }
    setTokens(list);
  };

  useEffect(() => { generate(); /* eslint-disable-line */ }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1">النوع</label>
          <select value={type} onChange={(e) => setType(e.target.value as any)} className="input-field !text-xs !py-1.5">
            <option value="hex">Hex (16-base)</option>
            <option value="base64">Base64</option>
            <option value="alphanumeric">Alphanumeric</option>
            <option value="url-safe">URL-Safe</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1">الطول</label>
          <input
            type="number"
            min={8}
            max={128}
            value={length}
            onChange={(e) => setLength(Math.min(128, Math.max(8, Number(e.target.value))))}
            className="input-field !text-xs !py-1.5 w-20"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1">العدد</label>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value))))}
            className="input-field !text-xs !py-1.5 w-20"
          />
        </div>
        <button onClick={generate} className="btn-primary px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer mt-4">
          <RefreshCw className="h-3 w-3" /> توليد
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(tokens.join("\n"))}
          className="btn-secondary px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer mt-4"
        >
          <Copy className="h-3 w-3" /> نسخ الكل
        </button>
      </div>

      <div className="space-y-1.5">
        {tokens.map((t, i) => (
          <div key={i} className="glass-card rounded-lg p-2.5 border border-white/[0.06] flex items-center justify-between gap-3">
            <span className="text-slate-500 text-xs font-mono">{String(i + 1).padStart(2, "0")}</span>
            <code className="flex-1 font-mono text-xs text-emerald-400 break-all" dir="ltr">{t}</code>
            <button onClick={() => navigator.clipboard.writeText(t)} className="text-slate-500 hover:text-slate-300 shrink-0">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Entropy / Randomness ────────── */

const EntropyTool: React.FC = () => {
  const [input, setInput] = useState("hello world");
  const [useShannon, setUseShannon] = useState(true);

  const analysis = useMemo(() => {
    if (!input) return null;
    const len = input.length;
    const freq: Record<string, number> = {};
    for (const c of input) freq[c] = (freq[c] || 0) + 1;
    const unique = Object.keys(freq).length;

    let entropy = 0;
    if (useShannon) {
      for (const c in freq) {
        const p = freq[c] / len;
        entropy -= p * Math.log2(p);
      }
    } else {
      // Min-entropy
      let maxP = 0;
      for (const c in freq) maxP = Math.max(maxP, freq[c] / len);
      entropy = -Math.log2(maxP);
    }

    const maxEntropy = Math.log2(unique);
    const efficiency = maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 0;

    return {
      length: len,
      unique,
      entropy,
      maxEntropy,
      efficiency,
      freq,
    };
  }, [input, useShannon]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-bold text-slate-400 mb-1 block">النص لتحليل الإنتروبيا</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          dir="auto"
          className="input-field w-full h-24 !text-sm resize-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setUseShannon(true)}  className={`tab-button ${useShannon ? "active" : ""}`}>Shannon</button>
        <button onClick={() => setUseShannon(false)} className={`tab-button ${!useShannon ? "active" : ""}`}>Min-Entropy</button>
      </div>

      {analysis && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="stat-card text-center">
              <p className="text-[10px] text-slate-500">الطول</p>
              <p className="text-xl font-black text-blue-400">{analysis.length}</p>
            </div>
            <div className="stat-card text-center">
              <p className="text-[10px] text-slate-500">رموز فريدة</p>
              <p className="text-xl font-black text-emerald-400">{analysis.unique}</p>
            </div>
            <div className="stat-card text-center">
              <p className="text-[10px] text-slate-500">الإنتروبيا</p>
              <p className="text-xl font-black text-amber-400">{analysis.entropy.toFixed(3)}</p>
            </div>
            <div className="stat-card text-center">
              <p className="text-[10px] text-slate-500">الكفاءة</p>
              <p className="text-xl font-black text-violet-400">{analysis.efficiency.toFixed(1)}%</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-3 border border-white/[0.06]">
            <p className="text-xs font-bold text-slate-400 mb-2">توزيع الرموز</p>
            <div className="space-y-1 max-h-60 overflow-y-auto safe-scrollbar">
              {Object.entries(analysis.freq)
                .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
                .map(([c, count]: [string, number]) => {
                  const pct = (count / analysis.length) * 100;
                  return (
                    <div key={c} className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-300 w-6 text-center bg-white/5 rounded px-1 py-0.5">
                        {c === " " ? "␣" : c === "\n" ? "↵" : c}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 w-12 text-right">{count}×</span>
                      <span className="text-[10px] text-slate-500 w-10 text-right">{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
