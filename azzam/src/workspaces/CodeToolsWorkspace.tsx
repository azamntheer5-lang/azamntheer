import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Code2, Play, Copy, Check, Trash2, Download, FileCode, Braces, FileType,
} from "lucide-react";
import { TabBar, ToolHeader, CopyButton } from "../components/ui/SharedUI";
import { useI18nStore } from "../store/i18nStore";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";

type Language = "javascript" | "typescript" | "jsx" | "tsx" | "css" | "json" | "markdown" | "python" | "bash" | "sql" | "yaml" | "go" | "rust";

const LANGUAGES: { id: Language; label: string; icon: string; color: string }[] = [
  { id: "javascript", label: "JavaScript", icon: "JS",  color: "text-amber-400" },
  { id: "typescript", label: "TypeScript", icon: "TS",  color: "text-blue-400" },
  { id: "jsx",        label: "JSX",        icon: "⚛",  color: "text-cyan-400" },
  { id: "tsx",        label: "TSX",        icon: "⚛",  color: "text-blue-400" },
  { id: "json",       label: "JSON",       icon: "{}", color: "text-emerald-400" },
  { id: "css",        label: "CSS",        icon: "#",  color: "text-pink-400" },
  { id: "markdown",   label: "Markdown",   icon: "M↓", color: "text-slate-400" },
  { id: "python",     label: "Python",     icon: "Py", color: "text-violet-400" },
  { id: "bash",       label: "Bash",       icon: "$",  color: "text-green-400" },
  { id: "sql",        label: "SQL",        icon: "DB", color: "text-rose-400" },
  { id: "yaml",       label: "YAML",       icon: "Y",  color: "text-orange-400" },
  { id: "go",         label: "Go",         icon: "Go", color: "text-cyan-400" },
  { id: "rust",       label: "Rust",       icon: "R",  color: "text-orange-400" },
];

const DEFAULT_CODE: Record<Language, string> = {
  javascript: `// Welcome to Azzam Code Editor
// Press Run to execute JavaScript

const fibonacci = (n) => {
  const seq = [0, 1];
  for (let i = 2; i < n; i++) {
    seq.push(seq[i - 1] + seq[i - 2]);
  }
  return seq;
};

console.log("First 10 Fibonacci numbers:");
console.log(fibonacci(10));
`,
  typescript: `// TypeScript with full type checking
interface User {
  id: number;
  name: string;
  email: string;
}

const greet = (user: User): string => \`Hello, \${user.name}!\`;

const user: User = {
  id: 1,
  name: "Azzam",
  email: "hello@azzam.pro",
};

console.log(greet(user));
`,
  jsx: `// JSX example (cannot run, only view)
function App() {
  return (
    <div className="container">
      <h1>Hello from JSX</h1>
      <p>Built with Azzam Pro</p>
    </div>
  );
}`,
  tsx: `// TSX example
import React from "react";

interface Props { title: string; }

const Card: React.FC<Props> = ({ title }) => (
  <div className="card">{title}</div>
);`,
  json: `{
  "name": "Azzam Pro",
  "version": "3.0.0",
  "workspaces": 21,
  "tools": 75,
  "themes": 6,
  "languages": ["ar", "en"],
  "features": {
    "codeEditor": true,
    "mediaTools": true,
    "charts": true,
    "i18n": true
  }
}`,
  css: `/* Modern glassmorphism card */
.glass-card {
  background: rgba(20, 27, 48, 0.55);
  backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.3s ease;
}

.glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 50px rgba(0, 0, 0, 0.45);
}`,
  markdown: `# Azzam Pro v3.0

## Features
- **21 Workspaces** — comprehensive tools
- **75+ Specialized tools**
- **6 Themes** — including cyber & ocean
- **i18n** — Arabic & English

## Code Example
\`\`\`javascript
const hello = () => "world";
\`\`\`

## Tables
| Workspace | Tools |
|-----------|-------|
| DevTools  | 7     |
| TextTools | 8     |`,
  python: `# Python example (view only — cannot run in browser)
def is_prime(n: int) -> bool:
    """Check if a number is prime."""
    if n < 2:
        return False
    for i in range(2, int(n ** 0.5) + 1):
        if n % i == 0:
            return False
    return True

primes = [n for n in range(2, 30) if is_prime(n)]
print(f"Primes < 30: {primes}")`,
  bash: `#!/bin/bash
# Azzam deployment script
set -e

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building project..."
npm run build

echo "🚀 Starting server..."
npm start

echo "✅ Deployment complete!"`,
  sql: `-- Azzam database schema
CREATE TABLE workspaces (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO workspaces (name, slug, icon) VALUES
  ('PDF Expert', 'pdf', 'file-text'),
  ('Code Editor', 'code-tools', 'code'),
  ('Charts', 'charts', 'bar-chart');`,
  yaml: `# Azzam Pro configuration
app:
  name: Azzam Pro
  version: 3.0.0
  locale: ar

workspaces:
  - id: pdf
    enabled: true
  - id: code-tools
    enabled: true
  - id: charts
    enabled: true

themes:
  - dark
  - light
  - cyber
  - ocean`,
  go: `// Go example (view only)
package main

import "fmt"

func fibonacci(n int) []int {
  seq := []int{0, 1}
  for i := 2; i < n; i++ {
    seq = append(seq, seq[i-1]+seq[i-2])
  }
  return seq
}

func main() {
  fmt.Println("First 10 Fibonacci numbers:")
  fmt.Println(fibonacci(10))
}`,
  rust: `// Rust example (view only)
fn is_prime(n: u32) -> bool {
    if n < 2 { return false; }
    for i in 2..=((n as f64).sqrt() as u32) {
        if n % i == 0 { return false; }
    }
    true
}

fn main() {
    let primes: Vec<u32> = (2..30).filter(|&n| is_prime(n)).collect();
    println!("Primes < 30: {:?}", primes);
}`,
};

const SNIPPETS = [
  { id: "fib", label: "Fibonacci", lang: "javascript" as Language, code: DEFAULT_CODE.javascript },
  { id: "obj", label: "JSON Sample", lang: "json" as Language, code: DEFAULT_CODE.json },
  { id: "css", label: "Glass Card CSS", lang: "css" as Language, code: DEFAULT_CODE.css },
  { id: "py",  label: "Python Primes", lang: "python" as Language, code: DEFAULT_CODE.python },
];

const formatJson = (code: string): string => {
  try { return JSON.stringify(JSON.parse(code), null, 2); }
  catch { return code; }
};

const formatJs = (code: string): string => {
  // Basic formatting: collapse multiple blank lines, fix indentation
  return code
    .split("\n")
    .map(line => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
};

export const CodeToolsWorkspace: React.FC = () => {
  const { t } = useI18nStore();
  const [language, setLanguage] = useState<Language>("javascript");
  const [code, setCode] = useState(DEFAULT_CODE.javascript);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [highlighted, setHighlighted] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  // Re-highlight whenever code or language changes
  useEffect(() => {
    try {
      const grammar = Prism.languages[language] || Prism.languages.javascript;
      const html = Prism.highlight(code, grammar, language);
      setHighlighted(html);
    } catch {
      setHighlighted(Prism.util.encode(code) as string);
    }
  }, [code, language]);

  // Handle sync scrolling
  const handleScroll = () => {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setCode(DEFAULT_CODE[lang]);
    setOutput("");
    setError(null);
  };

  const runCode = () => {
    setOutput("");
    setError(null);

    if (language !== "javascript") {
      setError(`⚠ ${language} cannot be executed in browser. Only JavaScript runs live.`);
      return;
    }

    // Capture console.log output
    const logs: string[] = [];
    const origLog = console.log;
    const origErr = console.error;
    const origWarn = console.warn;
    const customLog = (...args: any[]) => {
      logs.push(args.map(a => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" "));
    };
    console.log = customLog;
    console.error = customLog;
    console.warn = customLog;

    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(code);
      const result = fn();
      if (result !== undefined) {
        logs.push(`→ ${typeof result === "object" ? JSON.stringify(result, null, 2) : String(result)}`);
      }
      setOutput(logs.join("\n") || "✓ Executed successfully (no output)");
    } catch (e: any) {
      setError(`⚠ ${e.name}: ${e.message}`);
    } finally {
      console.log = origLog;
      console.error = origErr;
      console.warn = origWarn;
    }
  };

  const format = () => {
    if (language === "json") {
      setCode(formatJson(code));
    } else if (["javascript", "typescript", "jsx", "tsx", "css"].includes(language)) {
      setCode(formatJs(code));
    }
  };

  const stats = useMemo(() => ({
    lines: code.split("\n").length,
    chars: code.length,
    bytes: new Blob([code]).size,
  }), [code]);

  return (
    <div className="flex-1 overflow-y-auto safe-scrollbar p-6">
      <ToolHeader
        title={t("ws.code-tools")}
        description={t("ws.code-tools.desc")}
        icon={Code2}
        color="bg-violet-500/10 text-violet-400"
      />

      {/* Language picker */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {LANGUAGES.map(lang => (
          <button
            key={lang.id}
            onClick={() => handleLanguageChange(lang.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              language === lang.id
                ? "bg-violet-500/20 text-violet-300 border-violet-500/40"
                : "bg-white/[0.03] text-slate-400 border-white/8 hover:bg-white/[0.06] hover:text-slate-200"
            }`}
          >
            <span className={`font-mono text-[10px] ${lang.color}`}>{lang.icon}</span>
            {lang.label}
          </button>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button
          onClick={runCode}
          className="btn-primary px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          title="Run (JavaScript only)"
        >
          <Play className="h-3.5 w-3.5" /> {t("common.run")}
        </button>
        <button
          onClick={format}
          className="btn-secondary px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Braces className="h-3.5 w-3.5" /> {t("common.format")}
        </button>
        <button
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="btn-secondary px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? t("common.copied") : t("common.copy")}
        </button>
        <button
          onClick={() => {
            const blob = new Blob([code], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `azzam-snippet.${language === "javascript" ? "js" : language === "typescript" ? "ts" : language}`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="btn-secondary px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" /> {t("common.download")}
        </button>
        <button
          onClick={() => { setCode(DEFAULT_CODE[language]); setOutput(""); setError(null); }}
          className="btn-secondary px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" /> {t("common.clear")}
        </button>

        <div className="flex items-center gap-3 ml-auto">
          <span className="badge badge-violet"><FileCode className="h-2.5 w-2.5" />{stats.lines} lines</span>
          <span className="badge badge-blue">{stats.chars} chars</span>
          <span className="badge badge-emerald">{stats.bytes}B</span>
        </div>
      </div>

      {/* Code editor area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-slate-400 mb-1 block flex items-center gap-1.5">
            <FileCode className="h-3 w-3" /> {language.toUpperCase()}
          </label>
          <div className="relative h-96 rounded-xl overflow-hidden border border-white/8 bg-[#0d1117]">
            {/* Highlighted code (underlay) */}
            <pre
              ref={preRef}
              aria-hidden="true"
              className="absolute inset-0 m-0 p-4 font-mono text-xs leading-relaxed overflow-auto pointer-events-none text-slate-200"
              style={{ tabSize: 2 }}
              dangerouslySetInnerHTML={{ __html: highlighted + "\n" }}
            />
            {/* Transparent textarea overlay */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={handleScroll}
              spellCheck={false}
              dir="ltr"
              className="absolute inset-0 w-full h-full p-4 font-mono text-xs leading-relaxed bg-transparent text-transparent caret-white resize-none outline-none whitespace-pre overflow-auto"
              style={{ tabSize: 2 }}
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-400 mb-1 block flex items-center gap-1.5">
            <Play className="h-3 w-3" /> Console Output
          </label>
          <pre
            dir="ltr"
            className={`code-block h-96 overflow-auto whitespace-pre-wrap ${error ? "text-rose-400" : "text-emerald-300"}`}
          >
            {error || output || "// Output will appear here after running"}
          </pre>
        </div>
      </div>

      {/* Snippets */}
      <div className="mt-5">
        <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
          <FileType className="h-3 w-3" /> Quick Snippets
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {SNIPPETS.map(snip => (
            <button
              key={snip.id}
              onClick={() => handleLanguageChange(snip.lang)}
              className="glass-card rounded-xl p-3 border border-white/[0.06] text-right hover:border-violet-500/30 transition-all cursor-pointer"
            >
              <p className="text-xs font-bold text-slate-200">{snip.label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{snip.lang}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
