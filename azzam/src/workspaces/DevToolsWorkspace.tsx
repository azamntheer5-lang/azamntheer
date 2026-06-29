import React, { useState, useMemo, useEffect } from "react";
import {
  Code2, Braces, Binary, Hash, Fingerprint, Regex, Palette, KeyRound,
  Copy, Check, Play, Trash2, Download,
} from "lucide-react";
import { TabBar, ToolHeader, CopyButton } from "../components/ui/SharedUI";
import CryptoJS from "crypto-js";
import { nanoid } from "nanoid";

type TabId = "json" | "base64" | "hash" | "uuid" | "jwt" | "regex" | "color";

const TABS = [
  { id: "json",     label: "JSON Formatter", icon: Braces },
  { id: "base64",   label: "Base64",         icon: Binary },
  { id: "hash",     label: "Hash",           icon: Hash },
  { id: "uuid",     label: "UUID",           icon: Fingerprint },
  { id: "jwt",      label: "JWT Decoder",    icon: KeyRound },
  { id: "regex",    label: "Regex Tester",   icon: Regex },
  { id: "color",    label: "Color Picker",   icon: Palette },
];

export const DevToolsWorkspace: React.FC = () => {
  const [active, setActive] = useState<TabId>("json");

  return (
    <div className="flex-1 overflow-y-auto safe-scrollbar p-6">
      <ToolHeader
        title="أدوات المطور"
        description="JSON · Base64 · Hash · UUID · JWT · Regex · Color — كل ما يحتاجه المطور"
        icon={Code2}
        color="bg-pink-500/10 text-pink-400"
      />
      <TabBar tabs={TABS} active={active} onChange={(id) => setActive(id as TabId)} />

      {active === "json"     && <JsonFormatter />}
      {active === "base64"   && <Base64Tool />}
      {active === "hash"     && <HashTool />}
      {active === "uuid"     && <UuidTool />}
      {active === "jwt"      && <JwtTool />}
      {active === "regex"    && <RegexTool />}
      {active === "color"    && <ColorTool />}
    </div>
  );
};

/* ─────────────────────────────────── JSON Formatter ────────── */

const JsonFormatter: React.FC = () => {
  const [input, setInput] = useState(`{"name":"عزام","version":2,"tools":["pdf","word","excel"],"pro":true}`);
  const [indent, setIndent] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    try {
      const parsed = JSON.parse(input);
      setError(null);
      return JSON.stringify(parsed, null, indent);
    } catch (e: any) {
      setError(e.message);
      return "";
    }
  }, [input, indent]);

  const stats = useMemo(() => {
    try {
      const parsed = JSON.parse(input);
      const count = (obj: any): number => {
        if (Array.isArray(obj)) return obj.reduce((acc, v) => acc + count(v), 0);
        if (obj && typeof obj === "object") return Object.keys(obj).length + Object.values(obj).reduce<number>((acc, v) => acc + count(v as any), 0);
        return 0;
      };
      return {
        keys: count(parsed),
        size: new Blob([input]).size,
        valid: true,
      };
    } catch {
      return { keys: 0, size: new Blob([input]).size, valid: false };
    }
  }, [input]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs font-semibold text-slate-400">المسافة البادئة:</label>
        <select value={indent} onChange={(e) => setIndent(Number(e.target.value))} className="input-field !text-xs !py-1.5">
          <option value={2}>2 مسافات</option>
          <option value={4}>4 مسافات</option>
          <option value={0}>مضغوط</option>
        </select>
        <button
          onClick={() => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          disabled={!output}
          className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          نسخ
        </button>
        <button onClick={() => setInput("")} className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer">
          <Trash2 className="h-3 w-3" /> مسح
        </button>
        <div className="flex items-center gap-2 ml-auto">
          {stats.valid ? (
            <span className="badge badge-emerald">✓ صالح · {stats.keys} مفتاح · {stats.size}B</span>
          ) : (
            <span className="badge badge-rose">✗ غير صالح</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-slate-400 mb-1 block">الإدخال</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            dir="ltr"
            className="input-field w-full h-80 font-mono !text-xs resize-none"
            placeholder='{"hello":"world"}'
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-400 mb-1 block">الإخراج المنسق</label>
          {error ? (
            <div className="code-block h-80 overflow-auto text-rose-400 text-xs">⚠ {error}</div>
          ) : (
            <pre className="code-block h-80 overflow-auto" dir="ltr">{output}</pre>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Base64 ────────── */

const Base64Tool: React.FC = () => {
  const [input, setInput] = useState("Hello, عزام! 👋");
  const [mode, setMode] = useState<"encode" | "decode">("encode");

  const output = useMemo(() => {
    try {
      if (mode === "encode") {
        // Handle Unicode safely
        return btoa(unescape(encodeURIComponent(input)));
      } else {
        return decodeURIComponent(escape(atob(input)));
      }
    } catch (e: any) {
      return `⚠ خطأ: ${e.message}`;
    }
  }, [input, mode]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode("encode")}
          className={`tab-button ${mode === "encode" ? "active" : ""}`}
        >
          تشفير (Encode)
        </button>
        <button
          onClick={() => setMode("decode")}
          className={`tab-button ${mode === "decode" ? "active" : ""}`}
        >
          فك التشفير (Decode)
        </button>
      </div>

      <div>
        <label className="text-[11px] font-bold text-slate-400 mb-1 block">الإدخال</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          dir="ltr"
          className="input-field w-full h-32 font-mono !text-xs resize-none"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-bold text-slate-400">الإخراج</label>
          <CopyButton text={output} />
        </div>
        <pre className="code-block h-32 overflow-auto" dir="ltr">{output}</pre>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="stat-card">
          <p className="text-slate-500 text-[10px]">طول الإدخال</p>
          <p className="text-blue-400 font-black text-lg">{input.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-slate-500 text-[10px]">طول الإخراج</p>
          <p className="text-emerald-400 font-black text-lg">{output.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-slate-500 text-[10px]">حجم الإخراج</p>
          <p className="text-amber-400 font-black text-lg">{new Blob([output]).size}B</p>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Hash ────────── */

const HashTool: React.FC = () => {
  const [input, setInput] = useState("أهلًا بالعالم!");

  const hashes = useMemo(() => {
    if (!input) return { md5: "", sha1: "", sha256: "", sha512: "", sha224: "", sha384: "" };
    return {
      md5:    CryptoJS.MD5(input).toString(),
      sha1:   CryptoJS.SHA1(input).toString(),
      sha224: CryptoJS.SHA224(input).toString(),
      sha256: CryptoJS.SHA256(input).toString(),
      sha384: CryptoJS.SHA384(input).toString(),
      sha512: CryptoJS.SHA512(input).toString(),
    };
  }, [input]);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-bold text-slate-400 mb-1 block">النص</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          dir="ltr"
          className="input-field w-full h-24 font-mono !text-xs resize-none"
        />
      </div>

      <div className="space-y-2">
        {Object.entries(hashes).map(([algo, hash]) => (
          <div key={algo} className="glass-card rounded-xl p-3 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="badge badge-purple uppercase">{algo}</span>
              <CopyButton text={hash} />
            </div>
            <pre className="code-block text-[10px] break-all" dir="ltr">{hash || "—"}</pre>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────── UUID ────────── */

const UuidTool: React.FC = () => {
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>([]);

  const generate = () => {
    const list: string[] = [];
    for (let i = 0; i < count; i++) {
      list.push(nanoid(36).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5"));
    }
    setUuids(list);
  };

  useEffect(() => { generate(); // eslint-disable-line
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs font-semibold text-slate-400">العدد:</label>
        <input
          type="number"
          min={1}
          max={50}
          value={count}
          onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value))))}
          className="input-field !text-xs !py-1.5 w-20"
        />
        <button onClick={generate} className="btn-primary px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer">
          <Play className="h-3 w-3" /> توليد
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(uuids.join("\n"))}
          className="btn-secondary px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Copy className="h-3 w-3" /> نسخ الكل
        </button>
      </div>

      <div className="space-y-1.5">
        {uuids.map((uuid, i) => (
          <div key={i} className="glass-card rounded-lg p-2.5 border border-white/[0.06] flex items-center justify-between gap-3">
            <span className="text-slate-500 text-xs font-mono">{String(i + 1).padStart(2, "0")}</span>
            <code className="flex-1 font-mono text-xs text-emerald-400" dir="ltr">{uuid}</code>
            <button
              onClick={() => navigator.clipboard.writeText(uuid)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────── JWT ────────── */

const JwtTool: React.FC = () => {
  const [token, setToken] = useState(
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
  );

  const decoded = useMemo(() => {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) throw new Error("الرمز غير صالح (يجب أن يحتوي على 3 أجزاء مفصولة بنقطة)");
      const decodeB64 = (s: string) => {
        const padded = s + "=".repeat((4 - s.length % 4) % 4);
        return JSON.parse(decodeURIComponent(escape(atob(padded.replace(/-/g, "+").replace(/_/g, "/")))));
      };
      return {
        header: decodeB64(parts[0]),
        payload: decodeB64(parts[1]),
        signature: parts[2],
        error: null as string | null,
      };
    } catch (e: any) {
      return { header: null, payload: null, signature: null, error: e.message };
    }
  }, [token]);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-bold text-slate-400 mb-1 block">JWT Token</label>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          dir="ltr"
          className="input-field w-full h-24 font-mono !text-[10px] resize-none"
        />
      </div>

      {decoded.error ? (
        <div className="code-block text-rose-400">⚠ {decoded.error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="glass-card rounded-xl p-3 border border-rose-500/20">
            <span className="badge badge-rose mb-2">Header</span>
            <pre className="code-block text-[10px] overflow-auto max-h-60" dir="ltr">{JSON.stringify(decoded.header, null, 2)}</pre>
          </div>
          <div className="glass-card rounded-xl p-3 border border-purple-500/20">
            <span className="badge badge-purple mb-2">Payload</span>
            <pre className="code-block text-[10px] overflow-auto max-h-60" dir="ltr">{JSON.stringify(decoded.payload, null, 2)}</pre>
          </div>
          <div className="glass-card rounded-xl p-3 border border-blue-500/20">
            <span className="badge badge-blue mb-2">Signature</span>
            <pre className="code-block text-[10px] break-all max-h-60 overflow-auto" dir="ltr">{decoded.signature}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────── Regex ────────── */

const RegexTool: React.FC = () => {
  const [pattern, setPattern] = useState("\\b\\w+@\\w+\\.\\w+\\b");
  const [flags, setFlags] = useState("g");
  const [testText, setTestText] = useState("تواصل معنا: info@azzam.com أو support@azzam.pro للدعم");
  const [error, setError] = useState<string | null>(null);

  const matches = useMemo(() => {
    if (!pattern) { setError(null); return []; }
    try {
      const re = new RegExp(pattern, flags);
      setError(null);
      const results: Array<{ match: string; index: number; groups?: string[] }> = [];
      if (flags.includes("g")) {
        let m: RegExpExecArray | null;
        while ((m = re.exec(testText)) !== null) {
          results.push({ match: m[0], index: m.index, groups: m.slice(1) });
          if (m.index === re.lastIndex) re.lastIndex++;
        }
      } else {
        const m = re.exec(testText);
        if (m) results.push({ match: m[0], index: m.index, groups: m.slice(1) });
      }
      return results;
    } catch (e: any) {
      setError(e.message);
      return [];
    }
  }, [pattern, flags, testText]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 font-mono">
          <span className="text-slate-500">/</span>
          <input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            dir="ltr"
            className="input-field !text-xs !py-1.5 w-72 font-mono"
            placeholder="regex pattern"
          />
          <span className="text-slate-500">/</span>
          <input
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            dir="ltr"
            className="input-field !text-xs !py-1.5 w-12 font-mono"
            placeholder="gim"
          />
        </div>
        {error && <span className="badge badge-rose">⚠ {error}</span>}
      </div>

      <div>
        <label className="text-[11px] font-bold text-slate-400 mb-1 block">النص</label>
        <textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          className="input-field w-full h-32 !text-xs resize-none"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400">التطابقات: <span className="text-emerald-400">{matches.length}</span></span>
      </div>

      <div className="space-y-1.5 max-h-60 overflow-y-auto safe-scrollbar">
        {matches.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">لا توجد تطابقات</div>
        ) : (
          matches.map((m, i) => (
            <div key={i} className="glass-card rounded-lg p-2.5 border border-white/[0.06] flex items-center gap-3">
              <span className="text-slate-500 text-xs font-mono w-8">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex-1 min-w-0">
                <code className="font-mono text-xs text-emerald-400" dir="ltr">{m.match}</code>
                <p className="text-[10px] text-slate-600 mt-0.5">الموضع: {m.index}</p>
              </div>
              {m.groups && m.groups.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {m.groups.map((g, gi) => (
                    <span key={gi} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                      ${gi + 1}: {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Color Picker ────────── */

const ColorTool: React.FC = () => {
  const [color, setColor] = useState("#3b82f6");

  const conversions = useMemo(() => {
    // Hex to RGB
    const hex = color.replace("#", "");
    if (hex.length !== 6) return { rgb: "", hsl: "", hsv: "", cmyk: "", invalid: true };
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return { rgb: "", hsl: "", hsv: "", cmyk: "", invalid: true };

    const rgb = `rgb(${r}, ${g}, ${b})`;

    // HSL
    const r1 = r / 255, g1 = g / 255, b1 = b / 255;
    const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r1: h = ((g1 - b1) / d + (g1 < b1 ? 6 : 0)); break;
        case g1: h = ((b1 - r1) / d + 2); break;
        case b1: h = ((r1 - g1) / d + 4); break;
      }
      h /= 6;
    }
    const hsl = `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;

    // HSV
    const v = max;
    const sv = max === 0 ? 0 : (max - min) / max;
    const hsv = `hsv(${Math.round(h * 360)}, ${Math.round(sv * 100)}%, ${Math.round(v * 100)}%)`;

    // CMYK
    const k = 1 - max;
    const c = (1 - r1 - k) / (1 - k || 1);
    const m = (1 - g1 - k) / (1 - k || 1);
    const y = (1 - b1 - k) / (1 - k || 1);
    const cmyk = `cmyk(${Math.round(c * 100)}%, ${Math.round(m * 100)}%, ${Math.round(y * 100)}%, ${Math.round(k * 100)}%)`;

    return { rgb, hsl, hsv, cmyk, invalid: false };
  }, [color]);

  const complementary = useMemo(() => {
    const hex = color.replace("#", "");
    if (hex.length !== 6) return "";
    const r = 255 - parseInt(hex.slice(0, 2), 16);
    const g = 255 - parseInt(hex.slice(2, 4), 16);
    const b = 255 - parseInt(hex.slice(4, 6), 16);
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`;
  }, [color]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 block">اللون</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-16 rounded-lg border border-white/10 bg-transparent cursor-pointer"
              />
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                dir="ltr"
                className="input-field flex-1 font-mono !text-xs uppercase"
              />
            </div>
          </div>

          <div
            className="h-32 rounded-xl border border-white/10 shadow-inner"
            style={{ background: color }}
          />

          <div>
            <p className="text-[11px] font-bold text-slate-400 mb-2">اللون المكمل</p>
            <div className="flex items-center gap-2">
              <div className="h-10 w-16 rounded-lg border border-white/10" style={{ background: complementary }} />
              <code className="font-mono text-xs text-emerald-400" dir="ltr">{complementary}</code>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {conversions.invalid ? (
            <div className="code-block text-rose-400">⚠ لون غير صالح</div>
          ) : (
            <>
              {[
                { label: "HEX",     value: color.toUpperCase() },
                { label: "RGB",     value: conversions.rgb },
                { label: "HSL",     value: conversions.hsl },
                { label: "HSV",     value: conversions.hsv },
                { label: "CMYK",    value: conversions.cmyk },
              ].map(({ label, value }) => (
                <div key={label} className="glass-card rounded-xl p-3 border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="badge badge-cyan uppercase">{label}</span>
                    <CopyButton text={value} />
                  </div>
                  <code className="font-mono text-xs text-slate-200" dir="ltr">{value}</code>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
