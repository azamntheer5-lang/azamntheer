import React, { useState, useMemo } from "react";
import {
  Type, AlignLeft, CaseSensitive, FileText, ListOrdered, Copy, Trash2,
  Hash, Repeat, GitCompare, ArrowDownUp, Scissors,
} from "lucide-react";
import { TabBar, ToolHeader, CopyButton } from "../components/ui/SharedUI";

type TabId = "counter" | "case" | "lorem" | "reverse" | "sort" | "dedupe" | "find-replace" | "diff";

const TABS = [
  { id: "counter",     label: "عدّاد الكلمات",     icon: Hash },
  { id: "case",        label: "تحويل الحالة",      icon: CaseSensitive },
  { id: "lorem",       label: "Lorem Ipsum",       icon: FileText },
  { id: "reverse",     label: "عكس النص",          icon: Repeat },
  { id: "sort",        label: "فرز الأسطر",        icon: ListOrdered },
  { id: "dedupe",      label: "إزالة التكرار",     icon: ArrowDownUp },
  { id: "find-replace",label: "بحث واستبدال",     icon: AlignLeft },
  { id: "diff",        label: "مقارنة نصين",       icon: GitCompare },
];

export const TextToolsWorkspace: React.FC = () => {
  const [active, setActive] = useState<TabId>("counter");

  return (
    <div className="flex-1 overflow-y-auto safe-scrollbar p-6">
      <ToolHeader
        title="أدوات النصوص"
        description="عدّاد · حالة · لوريم · عكس · فرز · تكرار · بحث · مقارنة"
        icon={Type}
        color="bg-cyan-500/10 text-cyan-400"
      />
      <TabBar tabs={TABS} active={active} onChange={(id) => setActive(id as TabId)} />

      {active === "counter"      && <Counter />}
      {active === "case"         && <CaseConverter />}
      {active === "lorem"        && <LoremGenerator />}
      {active === "reverse"      && <ReverseText />}
      {active === "sort"         && <SortLines />}
      {active === "dedupe"       && <DedupeLines />}
      {active === "find-replace" && <FindReplace />}
      {active === "diff"         && <TextDiff />}
    </div>
  );
};

/* ─────────────────────────────────── Counter ────────── */

const Counter: React.FC = () => {
  const [text, setText] = useState("اكتب أو الصق نصك هنا لتحليله فورياً.");

  const stats = useMemo(() => {
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, "").length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const sentences = text.trim() ? (text.match(/[.!?…]+/g) || []).length || 1 : 0;
    const paragraphs = text.trim() ? text.split(/\n+/).filter(p => p.trim()).length : 0;
    const lines = text ? text.split("\n").length : 0;
    const readingTime = Math.ceil(words / 200); // ~200 wpm
    return { chars, charsNoSpace, words, sentences, paragraphs, lines, readingTime };
  }, [text]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { label: "أحرف",        value: stats.chars,        color: "text-blue-400" },
          { label: "بدون مسافات",  value: stats.charsNoSpace, color: "text-cyan-400" },
          { label: "كلمات",        value: stats.words,        color: "text-emerald-400" },
          { label: "جمل",          value: stats.sentences,    color: "text-violet-400" },
          { label: "فقرات",        value: stats.paragraphs,   color: "text-amber-400" },
          { label: "أسطر",         value: stats.lines,        color: "text-pink-400" },
          { label: "دقيقة قراءة",  value: stats.readingTime,  color: "text-rose-400" },
        ].map(s => (
          <div key={s.label} className="stat-card text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div>
        <label className="text-[11px] font-bold text-slate-400 mb-1 block">النص</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input-field w-full h-64 !text-sm resize-none"
          placeholder="اكتب نصك هنا..."
        />
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Case Converter ────────── */

const CaseConverter: React.FC = () => {
  const [text, setText] = useState("Hello World From Azzam Pro");

  const cases = useMemo(() => ({
    upper:      text.toUpperCase(),
    lower:      text.toLowerCase(),
    title:      text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),
    sentence:   text.toLowerCase().replace(/(^\w|\.\s+\w)/g, c => c.toUpperCase()),
    camel:      text.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()),
    pascal:     (text.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/^./, c => c.toUpperCase())),
    snake:      text.trim().toLowerCase().replace(/\s+/g, "_"),
    kebab:      text.trim().toLowerCase().replace(/\s+/g, "-"),
    constant:   text.trim().toUpperCase().replace(/\s+/g, "_"),
    alternating:text.split("").map((c, i) => i % 2 ? c.toUpperCase() : c.toLowerCase()).join(""),
    inverse:    text.split("").map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join(""),
  }), [text]);

  const labels: Record<string, string> = {
    upper: "UPPERCASE",
    lower: "lowercase",
    title: "Title Case",
    sentence: "Sentence case",
    camel: "camelCase",
    pascal: "PascalCase",
    snake: "snake_case",
    kebab: "kebab-case",
    constant: "CONSTANT_CASE",
    alternating: "aLtErNaTiNg",
    inverse: "iNVERSE",
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-bold text-slate-400 mb-1 block">النص الأصلي</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input-field w-full h-24 !text-sm resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {Object.entries(cases).map(([key, value]) => (
          <div key={key} className="glass-card rounded-xl p-3 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="badge badge-cyan">{labels[key]}</span>
              <CopyButton text={value} />
            </div>
            <p className="text-xs text-slate-200 break-words" dir="auto">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Lorem Ipsum ────────── */

const WORDS = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(" ");

const LoremGenerator: React.FC = () => {
  const [count, setCount] = useState(3);
  const [type, setType] = useState<"paragraphs" | "sentences" | "words">("paragraphs");

  const text = useMemo(() => {
    const rand = (n: number) => Math.floor(Math.random() * n);
    const word = () => WORDS[rand(WORDS.length)];
    const sentence = () => {
      const len = 8 + rand(12);
      const words = Array.from({ length: len }, word);
      return words.join(" ").replace(/^./, c => c.toUpperCase()) + ".";
    };
    const paragraph = () => {
      const len = 3 + rand(4);
      return Array.from({ length: len }, sentence).join(" ");
    };
    if (type === "words") return Array.from({ length: count }, word).join(" ");
    if (type === "sentences") return Array.from({ length: count }, sentence).join(" ");
    return Array.from({ length: count }, paragraph).join("\n\n");
  }, [count, type]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs font-semibold text-slate-400">النوع:</label>
        <select value={type} onChange={(e) => setType(e.target.value as any)} className="input-field !text-xs !py-1.5">
          <option value="paragraphs">فقرات</option>
          <option value="sentences">جمل</option>
          <option value="words">كلمات</option>
        </select>
        <label className="text-xs font-semibold text-slate-400 ml-2">العدد:</label>
        <input
          type="number"
          min={1}
          max={50}
          value={count}
          onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value))))}
          className="input-field !text-xs !py-1.5 w-20"
        />
        <CopyButton text={text} label="نسخ" />
      </div>

      <div className="glass-card rounded-xl p-4 border border-white/[0.06] max-h-96 overflow-y-auto safe-scrollbar">
        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap" dir="ltr">{text}</p>
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Reverse ────────── */

const ReverseText: React.FC = () => {
  const [text, setText] = useState("عزام برو");
  const [mode, setMode] = useState<"chars" | "words" | "lines">("chars");

  const output = useMemo(() => {
    if (mode === "chars") return text.split("").reverse().join("");
    if (mode === "words") return text.split(/\s+/).reverse().join(" ");
    return text.split("\n").reverse().join("\n");
  }, [text, mode]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(["chars", "words", "lines"] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`tab-button ${mode === m ? "active" : ""}`}
          >
            {m === "chars" ? "أحرف" : m === "words" ? "كلمات" : "أسطر"}
          </button>
        ))}
      </div>

      <div>
        <label className="text-[11px] font-bold text-slate-400 mb-1 block">الإدخال</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input-field w-full h-24 !text-sm resize-none"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-bold text-slate-400">الإخراج</label>
          <CopyButton text={output} />
        </div>
        <pre className="code-block h-24 overflow-auto" dir="auto">{output}</pre>
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Sort ────────── */

const SortLines: React.FC = () => {
  const [text, setText] = useState("banana\napple\ncherry\napple\ndate");
  const [mode, setMode] = useState<"asc" | "desc" | "length-asc" | "length-desc" | "random">("asc");

  const output = useMemo(() => {
    const lines = text.split("\n");
    switch (mode) {
      case "asc":         return [...lines].sort((a, b) => a.localeCompare(b, "ar")).join("\n");
      case "desc":        return [...lines].sort((a, b) => b.localeCompare(a, "ar")).join("\n");
      case "length-asc":  return [...lines].sort((a, b) => a.length - b.length).join("\n");
      case "length-desc": return [...lines].sort((a, b) => b.length - a.length).join("\n");
      case "random":      return [...lines].sort(() => Math.random() - 0.5).join("\n");
    }
  }, [text, mode]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { v: "asc",         l: "تصاعدي A-Z" },
          { v: "desc",        l: "تنازلي Z-A" },
          { v: "length-asc",  l: "بالطول ↑" },
          { v: "length-desc", l: "بالطول ↓" },
          { v: "random",      l: "عشوائي" },
        ] as const).map(m => (
          <button
            key={m.v}
            onClick={() => setMode(m.v)}
            className={`tab-button ${mode === m.v ? "active" : ""}`}
          >
            {m.l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-slate-400 mb-1 block">الإدخال</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            dir="ltr"
            className="input-field w-full h-48 font-mono !text-xs resize-none"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-400">الإخراج</label>
            <CopyButton text={output} />
          </div>
          <pre className="code-block h-48 overflow-auto" dir="ltr">{output}</pre>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Dedupe ────────── */

const DedupeLines: React.FC = () => {
  const [text, setText] = useState("apple\nbanana\napple\ncherry\nbanana\ndate");
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [trim, setTrim] = useState(true);

  const { output, removedCount, originalCount } = useMemo(() => {
    let lines = text.split("\n");
    if (trim) lines = lines.map(l => l.trim());
    const seen = new Set<string>();
    const result: string[] = [];
    for (const line of lines) {
      const key = caseSensitive ? line : line.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(line);
      }
    }
    return {
      output: result.join("\n"),
      removedCount: lines.length - result.length,
      originalCount: lines.length,
    };
  }, [text, caseSensitive, trim]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 cursor-pointer">
          <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} className="accent-indigo-500" />
          حساس للحالة
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 cursor-pointer">
          <input type="checkbox" checked={trim} onChange={(e) => setTrim(e.target.checked)} className="accent-indigo-500" />
          إزالة المسافات الزائدة
        </label>
        <div className="ml-auto flex items-center gap-2">
          <span className="badge badge-amber">قبل: {originalCount}</span>
          <span className="badge badge-emerald">بعد: {originalCount - removedCount}</span>
          <span className="badge badge-rose">محذوف: {removedCount}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-slate-400 mb-1 block">الإدخال</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            dir="ltr"
            className="input-field w-full h-48 font-mono !text-xs resize-none"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-400">الإخراج</label>
            <CopyButton text={output} />
          </div>
          <pre className="code-block h-48 overflow-auto" dir="ltr">{output}</pre>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Find & Replace ────────── */

const FindReplace: React.FC = () => {
  const [text, setText] = useState("أهلاً بك في عزام برو. عزام برو تطبيق احترافي.");
  const [find, setFind] = useState("عزام");
  const [replace, setReplace] = useState("Azzam");
  const [useRegex, setUseRegex] = useState(false);
  const [caseInsensitive, setCaseInsensitive] = useState(true);

  const { output, count } = useMemo(() => {
    if (!find) return { output: text, count: 0 };
    try {
      const flags = caseInsensitive ? "gi" : "g";
      const pattern = useRegex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(pattern, flags);
      const matches = text.match(re);
      return { output: text.replace(re, replace), count: matches ? matches.length : 0 };
    } catch {
      return { output: text, count: 0 };
    }
  }, [text, find, replace, useRegex, caseInsensitive]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-slate-400 mb-1 block">بحث عن</label>
          <input value={find} onChange={(e) => setFind(e.target.value)} dir="auto" className="input-field w-full !text-sm" />
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-400 mb-1 block">استبدال بـ</label>
          <input value={replace} onChange={(e) => setReplace(e.target.value)} dir="auto" className="input-field w-full !text-sm" />
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 cursor-pointer">
          <input type="checkbox" checked={useRegex} onChange={(e) => setUseRegex(e.target.checked)} className="accent-indigo-500" />
          استخدام Regex
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 cursor-pointer">
          <input type="checkbox" checked={caseInsensitive} onChange={(e) => setCaseInsensitive(e.target.checked)} className="accent-indigo-500" />
          غير حساس للحالة
        </label>
        <span className="badge badge-emerald ml-auto">{count} استبدال</span>
      </div>

      <div>
        <label className="text-[11px] font-bold text-slate-400 mb-1 block">النص</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input-field w-full h-32 !text-sm resize-none"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-bold text-slate-400">النتيجة</label>
          <CopyButton text={output} />
        </div>
        <pre className="code-block h-32 overflow-auto" dir="auto">{output}</pre>
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Diff ────────── */

const TextDiff: React.FC = () => {
  const [text1, setText1] = useState("Hello World\nThis is line 2\nLine 3");
  const [text2, setText2] = useState("Hello Azzam\nThis is line 2\nLine 3 changed\nLine 4 new");

  const diff = useMemo(() => {
    const a = text1.split("\n");
    const b = text2.split("\n");
    const maxLen = Math.max(a.length, b.length);
    const rows: Array<{ type: "same" | "added" | "removed" | "modified"; a?: string; b?: string; lineNum: number }> = [];

    for (let i = 0; i < maxLen; i++) {
      const aLine = a[i];
      const bLine = b[i];
      if (aLine === undefined && bLine !== undefined) {
        rows.push({ type: "added", b: bLine, lineNum: i + 1 });
      } else if (aLine !== undefined && bLine === undefined) {
        rows.push({ type: "removed", a: aLine, lineNum: i + 1 });
      } else if (aLine === bLine) {
        rows.push({ type: "same", a: aLine, b: bLine, lineNum: i + 1 });
      } else {
        rows.push({ type: "modified", a: aLine, b: bLine, lineNum: i + 1 });
      }
    }
    return rows;
  }, [text1, text2]);

  const stats = useMemo(() => ({
    added:    diff.filter(r => r.type === "added").length,
    removed:  diff.filter(r => r.type === "removed").length,
    modified: diff.filter(r => r.type === "modified").length,
    same:     diff.filter(r => r.type === "same").length,
  }), [diff]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-slate-400 mb-1 block">النص الأصلي</label>
          <textarea
            value={text1}
            onChange={(e) => setText1(e.target.value)}
            dir="ltr"
            className="input-field w-full h-32 font-mono !text-xs resize-none"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-400 mb-1 block">النص المعدّل</label>
          <textarea
            value={text2}
            onChange={(e) => setText2(e.target.value)}
            dir="ltr"
            className="input-field w-full h-32 font-mono !text-xs resize-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="badge badge-emerald">+ {stats.added} مضاف</span>
        <span className="badge badge-rose">- {stats.removed} محذوف</span>
        <span className="badge badge-amber">~ {stats.modified} معدّل</span>
        <span className="badge badge-blue">= {stats.same} ثابت</span>
      </div>

      <div className="glass-card rounded-xl border border-white/[0.06] overflow-hidden">
        {diff.map((row, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.04] font-mono text-xs ${
              row.type === "same" ? "" :
              row.type === "added" ? "bg-emerald-500/10" :
              row.type === "removed" ? "bg-rose-500/10" :
              "bg-amber-500/10"
            }`}
          >
            <span className="text-slate-600 w-8 text-right shrink-0">{row.lineNum}</span>
            <span className="w-4 shrink-0">
              {row.type === "added" && <span className="text-emerald-400">+</span>}
              {row.type === "removed" && <span className="text-rose-400">-</span>}
              {row.type === "modified" && <span className="text-amber-400">~</span>}
              {row.type === "same" && <span className="text-slate-600">=</span>}
            </span>
            <span className="flex-1 break-all" dir="ltr">
              {row.type === "added" ? row.b : row.type === "removed" ? row.a : row.type === "modified" ? (
                <span><span className="text-rose-400 line-through">{row.a}</span> <span className="text-emerald-400">→ {row.b}</span></span>
              ) : row.a}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
