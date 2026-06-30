import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  BarChart3, GitBranch, Brain, Clock as ClockIcon, Calendar, PieChart, Network, Download, Copy, Check, Trash2, Play,
} from "lucide-react";
import { TabBar, ToolHeader, CopyButton } from "../components/ui/SharedUI";
import { useI18nStore } from "../store/i18nStore";
import mermaid from "mermaid";

type ChartType = "flowchart" | "mindmap" | "sequence" | "gantt" | "pie" | "class" | "state" | "er";

const CHART_TYPES: { id: ChartType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "flowchart", label: "Flowchart",    icon: GitBranch },
  { id: "mindmap",   label: "Mind Map",     icon: Brain },
  { id: "sequence",  label: "Sequence",     icon: ClockIcon },
  { id: "gantt",     label: "Gantt",        icon: Calendar },
  { id: "pie",       label: "Pie Chart",    icon: PieChart },
  { id: "class",     label: "Class Diagram",icon: Network },
  { id: "state",     label: "State Diagram",icon: Play },
  { id: "er",        label: "ER Diagram",   icon: Network },
];

const TEMPLATES: Record<ChartType, string> = {
  flowchart: `flowchart TD
    A[Start] --> B{Is it raining?}
    B -- Yes --> C[Take umbrella]
    B -- No --> D[Enjoy sunshine]
    C --> E[Arrive dry]
    D --> E
    E --> F[End]

    style A fill:#10b981,stroke:#059669,color:#fff
    style F fill:#ef4444,stroke:#dc2626,color:#fff
    style B fill:#f59e0b,stroke:#d97706,color:#fff`,
  mindmap: `mindmap
  root((Azzam Pro))
    Documents
      PDF Expert
      Word Tools
      Excel Studio
    Media
      Image Studio
      Audio/Video
      OCR
    Developer
      Code Editor
      DevTools
      Charts
    Utilities
      Converters
      Calculators
      Time Tools`,
  sequence: `sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant D as Database

    U->>F: Click "Upload"
    F->>B: POST /api/upload
    B->>D: Save file
    D-->>B: File ID
    B-->>F: Success response
    F-->>U: Show success

    Note over U,D: All processing is local!`,
  gantt: `gantt
    title Azzam Pro v3.0 Development
    dateFormat YYYY-MM-DD
    axisFormat %m/%d

    section Foundation
    Design UI        :done, des1, 2026-01-01, 7d
    Setup stores     :done, des2, after des1, 5d
    i18n system      :active, des3, after des2, 5d

    section Features
    Code Editor      :active, feat1, 2026-01-15, 10d
    Media Tools      :feat2, after feat1, 8d
    Charts/Mermaid   :feat3, after feat2, 7d

    section Polish
    Testing          :test1, after feat3, 5d
    Documentation    :doc1, after test1, 3d
    Release          :milestone, rel1, after doc1, 0d`,
  pie: `pie title Azzam Pro Tool Distribution
    "Documents (PDF/Word/Excel)" : 15
    "Media (Image/Audio/Video)" : 12
    "Developer Tools" : 18
    "Calculators" : 8
    "Time & Date" : 6
    "Crypto" : 5
    "Converters" : 7`,
  class: `classDiagram
    class Workspace {
      +String id
      +String name
      +String icon
      +activate()
      +deactivate()
    }
    class PdfWorkspace {
      +Array pages
      +merge()
      +split()
      +compress()
    }
    class CodeWorkspace {
      +String language
      +String code
      +run()
      +format()
    }
    Workspace <|-- PdfWorkspace
    Workspace <|-- CodeWorkspace`,
  state: `stateDiagram-v2
    [*] --> Idle
    Idle --> Uploading : File selected
    Uploading --> Processing : Upload complete
    Processing --> Ready : Success
    Processing --> Error : Failed
    Error --> Idle : Retry
    Ready --> Idle : Reset
    Ready --> [*]`,
  er: `erDiagram
    USER ||--o{ WORKSPACE : owns
    USER ||--o{ HISTORY : has
    WORKSPACE ||--o{ TOOL : contains
    USER {
      int id PK
      string name
      string email
    }
    WORKSPACE {
      int id PK
      string slug
      string name
    }
    TOOL {
      int id PK
      string name
      string category
    }
    HISTORY {
      int id PK
      string operation
      timestamp created_at
    }`,
};

export const ChartsWorkspace: React.FC = () => {
  const { t } = useI18nStore();
  const [chartType, setChartType] = useState<ChartType>("flowchart");
  const [code, setCode] = useState(TEMPLATES.flowchart);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const renderCounter = useRef(0);

  // Initialize mermaid once
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      themeVariables: {
        primaryColor: "#3b82f6",
        primaryTextColor: "#fff",
        primaryBorderColor: "#1e40af",
        lineColor: "#94a3b8",
        secondaryColor: "#1e293b",
        tertiaryColor: "#0f172a",
        background: "#04070f",
        mainBkg: "#1e293b",
        secondBkg: "#0f172a",
        tertiaryBkg: "#020617",
        textColor: "#e2e8f0",
        fontSize: "14px",
      },
      securityLevel: "loose",
      flowchart: { curve: "basis", htmlLabels: true },
      sequence: { diagramMarginX: 20, diagramMarginY: 20 },
    });
  }, []);

  // Render chart on code/type change
  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try {
        setError(null);
        renderCounter.current += 1;
        const id = `azzam-chart-${renderCounter.current}`;
        const { svg: rendered } = await mermaid.render(id, code);
        if (!cancelled) setSvg(rendered);
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || "Invalid diagram syntax");
          setSvg("");
        }
      }
    };
    const debounce = setTimeout(render, 300);
    return () => { cancelled = true; clearTimeout(debounce); };
  }, [code, chartType]);

  const handleTypeChange = (type: ChartType) => {
    setChartType(type);
    setCode(TEMPLATES[type]);
  };

  const downloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `azzam-${chartType}-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPng = async () => {
    if (!svg) return;
    // Convert SVG to PNG via canvas
    const img = new Image();
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2; // 2x for retina
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#04070f";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const pngUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = pngUrl;
            a.download = `azzam-${chartType}-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(pngUrl);
          }
        }, "image/png");
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const stats = useMemo(() => ({
    lines: code.split("\n").length,
    chars: code.length,
  }), [code]);

  return (
    <div className="flex-1 overflow-y-auto safe-scrollbar p-6">
      <ToolHeader
        title={t("ws.charts")}
        description={t("ws.charts.desc")}
        icon={BarChart3}
        color="bg-indigo-500/10 text-indigo-400"
      />

      {/* Chart type picker */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {CHART_TYPES.map(ct => {
          const Icon = ct.icon;
          return (
            <button
              key={ct.id}
              onClick={() => handleTypeChange(ct.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                chartType === ct.id
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                  : "bg-white/[0.03] text-slate-400 border-white/8 hover:bg-white/[0.06] hover:text-slate-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {ct.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Editor */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <GitBranch className="h-3 w-3" /> Mermaid Code ({stats.lines}L)
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="btn-secondary px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                {copied ? t("common.copied") : t("common.copy")}
              </button>
              <button
                onClick={() => setCode(TEMPLATES[chartType])}
                className="btn-secondary px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="h-2.5 w-2.5" /> Reset
              </button>
            </div>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            dir="ltr"
            className="input-field w-full h-96 font-mono !text-xs resize-none"
            spellCheck={false}
          />
        </div>

        {/* Preview */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <PieChart className="h-3 w-3" /> Live Preview
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={downloadSvg}
                disabled={!svg}
                className="btn-secondary px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Download className="h-2.5 w-2.5" /> SVG
              </button>
              <button
                onClick={downloadPng}
                disabled={!svg}
                className="btn-primary px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Download className="h-2.5 w-2.5" /> PNG
              </button>
            </div>
          </div>
          <div
            ref={previewRef}
            className="code-block h-96 overflow-auto flex items-center justify-center p-4 bg-[#04070f]"
            dir="ltr"
          >
            {error ? (
              <div className="text-rose-400 text-xs whitespace-pre-wrap">{error}</div>
            ) : svg ? (
              <div dangerouslySetInnerHTML={{ __html: svg }} />
            ) : (
              <div className="text-slate-500 text-xs">Rendering...</div>
            )}
          </div>
        </div>
      </div>

      {/* Templates / Examples */}
      <div className="mt-5">
        <p className="text-xs font-bold text-slate-400 mb-2">Quick Templates</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {CHART_TYPES.map(ct => (
            <button
              key={ct.id}
              onClick={() => handleTypeChange(ct.id)}
              className="glass-card rounded-xl p-3 border border-white/[0.06] text-right hover:border-indigo-500/30 transition-all cursor-pointer"
            >
              <p className="text-xs font-bold text-slate-200">{ct.label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{ct.id}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Mermaid reference */}
      <div className="glass-card rounded-xl p-4 border border-white/[0.06] mt-5">
        <p className="text-xs font-bold text-slate-300 mb-2">📖 Mermaid Syntax Reference</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-400 font-mono" dir="ltr">
          <div><span className="text-emerald-400">A --&gt; B</span> : arrow</div>
          <div><span className="text-emerald-400">A -- Yes --&gt; B</span> : labeled arrow</div>
          <div><span className="text-emerald-400">A[Rectangle]</span> : rect node</div>
          <div><span className="text-emerald-400">A{`{Decision}`}</span> : diamond node</div>
          <div><span className="text-emerald-400">A((Circle))</span> : circle node</div>
          <div><span className="text-emerald-400">A&gt;Flag]</span> : flag node</div>
          <div><span className="text-emerald-400">A--&gt;|text|B</span> : alt labeled</div>
          <div><span className="text-emerald-400">style A fill:#f00</span> : style node</div>
        </div>
      </div>
    </div>
  );
};
