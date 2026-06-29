import React, { useState, useEffect, useRef } from "react";
import {
  GitCompare, UploadCloud, RefreshCw, Check, X, FileText, Image as ImageIcon,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { useToast } from "../context/ToastContext";
import { useHistoryStore } from "../store/historyStore";

interface LoadedDoc {
  name: string;
  size: number;
  type: "pdf" | "image";
  dataUrl: string;
  text?: string;
  bytes?: Uint8Array;
  pages?: number;
}

export const CompareWorkspace: React.FC = () => {
  const [docA, setDocA] = useState<LoadedDoc | null>(null);
  const [docB, setDocB] = useState<LoadedDoc | null>(null);
  const [diff, setDiff] = useState<Array<{ type: "same" | "added" | "removed"; text: string }> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const toast = useToast();
  const addHistory = useHistoryStore((s) => s.addEntry);

  const loadDoc = async (file: File): Promise<LoadedDoc> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const bytes = new Uint8Array(await file.arrayBuffer());

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      // Extract text from PDF
      const version = pdfjsLib.version || "4.0.379";
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`;
      const loadingTask = pdfjsLib.getDocument({ data: bytes.slice().buffer as ArrayBuffer });
      const pdf = await loadingTask.promise;
      let text = "";
      for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((it: any) => it.str).join(" ") + "\n";
      }
      return {
        name: file.name,
        size: file.size,
        type: "pdf" as const,
        dataUrl,
        text,
        bytes,
        pages: pdf.numPages,
      };
    } else {
      return {
        name: file.name,
        size: file.size,
        type: "image" as const,
        dataUrl,
        bytes,
      };
    }
  };

  const computeDiff = (a: string, b: string) => {
    const linesA = a.split("\n");
    const linesB = b.split("\n");
    const result: Array<{ type: "same" | "added" | "removed"; text: string }> = [];
    const maxLen = Math.max(linesA.length, linesB.length);
    for (let i = 0; i < maxLen; i++) {
      const la = linesA[i] ?? "";
      const lb = linesB[i] ?? "";
      if (la === lb) {
        result.push({ type: "same", text: la });
      } else {
        if (la) result.push({ type: "removed", text: la });
        if (lb) result.push({ type: "added", text: lb });
      }
    }
    return result;
  };

  const handleCompare = async () => {
    if (!docA || !docB) {
      toast.error("يجب رفع ملفين للمقارنة");
      return;
    }
    if (!docA.text || !docB.text) {
      toast.error("كلا الملفين يجب أن يحتويا على نص قابل للاستخراج");
      return;
    }
    setIsProcessing(true);
    try {
      const result = computeDiff(docA.text, docB.text);
      setDiff(result);
      addHistory({
        type: "pdf",
        operation: `مقارنة ${docA.name} مع ${docB.name}`,
        status: "success",
      });
      toast.success("تمت المقارنة!");
    } catch (err: any) {
      toast.error("فشلت المقارنة: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const stats = diff
    ? {
        same: diff.filter((d) => d.type === "same").length,
        added: diff.filter((d) => d.type === "added").length,
        removed: diff.filter((d) => d.type === "removed").length,
      }
    : null;

  return (
    <main className="flex-1 overflow-y-auto safe-scrollbar p-6 relative" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-panel rounded-2xl p-5 border border-white/10 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-lg">
            <GitCompare className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white">مقارنة المستندات</h2>
            <p className="text-[11px] text-gray-400 font-bold mt-0.5">
              قارن ملفي PDF لمعرفة الفروقات نصياً سطراً بسطر
            </p>
          </div>
        </div>

        {/* Two upload zones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UploadCard
            label="المستند الأول"
            doc={docA}
            onLoad={async (file) => setDocA(await loadDoc(file))}
            onClear={() => setDocA(null)}
            accent="border-blue-500/30"
          />
          <UploadCard
            label="المستند الثاني"
            doc={docB}
            onLoad={async (file) => setDocB(await loadDoc(file))}
            onClear={() => setDocB(null)}
            accent="border-rose-500/30"
          />
        </div>

        {/* Compare button */}
        <div className="flex justify-center">
          <button
            onClick={handleCompare}
            disabled={!docA || !docB || isProcessing}
            className="flex items-center gap-2 text-xs font-black bg-gradient-to-r from-blue-500 to-rose-500 hover:from-blue-600 hover:to-rose-600 text-white px-6 py-3 rounded-xl shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
            <span>{isProcessing ? "جاري المقارنة..." : "قارن المستندين"}</span>
          </button>
        </div>

        {/* Diff stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-panel rounded-xl p-4 border border-white/10 text-center">
              <div className="text-2xl font-black text-white">{stats.same}</div>
              <div className="text-[10px] text-gray-400 font-bold">أسطر متطابقة</div>
            </div>
            <div className="glass-panel rounded-xl p-4 border border-emerald-500/20 bg-emerald-500/5 text-center">
              <div className="text-2xl font-black text-emerald-400">{stats.added}</div>
              <div className="text-[10px] text-emerald-400 font-bold">أسطر مضافة (في الثاني)</div>
            </div>
            <div className="glass-panel rounded-xl p-4 border border-rose-500/20 bg-rose-500/5 text-center">
              <div className="text-2xl font-black text-rose-400">{stats.removed}</div>
              <div className="text-[10px] text-rose-400 font-bold">أسطر محذوفة (من الأول)</div>
            </div>
          </div>
        )}

        {/* Diff view */}
        {diff && (
          <div className="glass-panel rounded-2xl p-5 border border-white/10">
            <h3 className="text-xs font-black text-white mb-3">عرض الفروقات</h3>
            <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4 max-h-[500px] overflow-y-auto safe-scrollbar font-mono text-xs">
              {diff.map((d, i) => (
                <div
                  key={i}
                  className={`px-3 py-1.5 rounded mb-1 ${
                    d.type === "same"
                      ? "text-gray-400"
                      : d.type === "added"
                      ? "bg-emerald-500/10 text-emerald-300 border-r-2 border-emerald-500"
                      : "bg-rose-500/10 text-rose-300 border-r-2 border-rose-500"
                  }`}
                >
                  <span className="opacity-50 mr-2">
                    {d.type === "same" ? " " : d.type === "added" ? "+" : "-"}
                  </span>
                  <span className="whitespace-pre-wrap break-all">{d.text || " "}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

const UploadCard: React.FC<{
  label: string;
  doc: LoadedDoc | null;
  onLoad: (file: File) => void;
  onClear: () => void;
  accent: string;
}> = ({ label, doc, onLoad, onClear, accent }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={`glass-panel rounded-2xl p-4 border ${accent}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-black text-white">{label}</span>
        {doc && (
          <button
            onClick={onClear}
            className="text-xs font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
          >
            ✕ مسح
          </button>
        )}
      </div>
      {!doc ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-white/15 hover:border-white/30 rounded-xl p-6 text-center cursor-pointer transition-all"
        >
          <UploadCloud className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-xs text-gray-400 font-bold">اسحب ملف PDF هنا أو انقر للاختيار</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => e.target.files?.[0] && onLoad(e.target.files[0])}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2.5">
            <FileText className="h-5 w-5 text-blue-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{doc.name}</div>
              <div className="text-[10px] text-gray-400 font-bold">
                {(doc.size / 1024).toFixed(1)} KB {doc.pages ? `• ${doc.pages} صفحات` : ""}
              </div>
            </div>
            <Check className="h-4 w-4 text-emerald-400" />
          </div>
          {doc.text && (
            <div className="bg-slate-950/40 border border-white/5 rounded-lg p-2 max-h-32 overflow-y-auto safe-scrollbar text-[10px] font-bold text-gray-300">
              {doc.text.slice(0, 500)}{doc.text.length > 500 ? "..." : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
