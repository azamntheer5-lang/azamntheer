import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  UploadCloud, Sparkles, RefreshCw, Search, Copy, Check, Download,
  FileText, Image as ImageIcon, ScanLine, Languages, Eye, Wand2, Sliders,
  Trash2, X, Plus, ChevronLeft, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CloudApiService } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useHistoryStore } from "../store/historyStore";
import { downloadText } from "../lib/utils";

interface OcrResult {
  id: string;
  fileName: string;
  fileSize: number;
  text: string;
  language: string;
  previewUrl: string;
  timestamp: number;
  status: "processing" | "done" | "error";
  errorMsg?: string;
}

const LANGUAGES = [
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "en", label: "الإنجليزية", flag: "🇬🇧" },
  { code: "ar+en", label: "عربي + إنجليزي", flag: "🌐" },
  { code: "fr", label: "الفرنسية", flag: "🇫🇷" },
  { code: "es", label: "الإسبانية", flag: "🇪🇸" },
  { code: "de", label: "الألمانية", flag: "🇩🇪" },
  { code: "tr", label: "التركية", flag: "🇹🇷" },
  { code: "auto", label: "تلقائي", flag: "🤖" },
];

const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.webp,.tiff,.tif,.heic,.heif,.bmp,.gif";

export const OcrWorkspace: React.FC = () => {
  const [results, setResults] = useState<OcrResult[]>([]);
  const [activeResultId, setActiveResultId] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>("ar");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [smartPreprocess, setSmartPreprocess] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toast = useToast();
  const addHistory = useHistoryStore((s) => s.addEntry);

  const activeResult = results.find((r) => r.id === activeResultId) || null;

  const runOcr = useCallback(
    async (file: File) => {
      const id = Math.random().toString(36).slice(2, 9);
      const previewUrl = URL.createObjectURL(file);
      const newResult: OcrResult = {
        id,
        fileName: file.name,
        fileSize: file.size,
        text: "",
        language,
        previewUrl,
        timestamp: Date.now(),
        status: "processing",
      };
      setResults((prev) => [newResult, ...prev]);
      setActiveResultId(id);

      try {
        const result = await CloudApiService.ocrImageCloud(file, language, (p) => {
          // could surface progress to UI; we keep it simple
        });
        setResults((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, text: result.text, status: "done" as const } : r
          )
        );
        addHistory({
          type: "ocr",
          operation: `OCR على ${file.name}`,
          fileName: file.name,
          fileSize: file.size,
          status: "success",
        });
        toast.success(`اكتمل OCR على ${file.name}`);
      } catch (err: any) {
        setResults((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, status: "error" as const, errorMsg: err.message } : r
          )
        );
        addHistory({
          type: "ocr",
          operation: `فشل OCR على ${file.name}`,
          status: "error",
          meta: { error: err.message },
        });
        toast.error("فشل OCR: " + err.message);
      }
    },
    [language, toast, addHistory]
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;
      for (const file of arr) {
        await runOcr(file);
      }
    },
    [runOcr]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const handleCopy = () => {
    if (!activeResult?.text) return;
    navigator.clipboard.writeText(activeResult.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("تم نسخ النص!");
  };

  const handleDownloadTxt = () => {
    if (!activeResult?.text) return;
    const name = activeResult.fileName.replace(/\.[^/.]+$/, "");
    downloadText(activeResult.text, `${name}_OCR_عزام.txt`);
    toast.success("تم تنزيل النص!");
  };

  const handleDownloadAll = () => {
    const done = results.filter((r) => r.status === "done" && r.text);
    if (done.length === 0) {
      toast.info("لا توجد نتائج جاهزة للتنزيل.");
      return;
    }
    const merged = done
      .map((r) => `=== ${r.fileName} ===\n\n${r.text}\n\n`)
      .join("\n");
    downloadText(merged, `نتائج_OCR_جماعية_${Date.now()}.txt`);
    toast.success(`تم تنزيل ${done.length} ملف نصي مجمع!`);
  };

  const handleDelete = (id: string) => {
    setResults((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((r) => r.id !== id);
    });
    if (activeResultId === id) {
      const remaining = results.filter((r) => r.id !== id);
      setActiveResultId(remaining[0]?.id || null);
    }
  };

  const highlightSearch = (text: string) => {
    if (!search.trim()) return text;
    const parts = text.split(new RegExp(`(${search})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <mark key={i} className="bg-yellow-300 text-white rounded px-0.5 font-bold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      results.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = {
    total: results.length,
    done: results.filter((r) => r.status === "done").length,
    processing: results.filter((r) => r.status === "processing").length,
    errors: results.filter((r) => r.status === "error").length,
  };

  return (
    <main className="flex-1 overflow-y-auto safe-scrollbar p-6 relative" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <ScanLine className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <span>محرك OCR الذكي الاحترافي</span>
                <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                  Gemini Vision
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                استخرج النصوص من الصور وملفات PDF الممسوحة — يدعم العربية والإنجليزية ولغات متعددة
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-[10px] font-bold">
            <div className="bg-white/[0.04]/5 border border-white/10 rounded-lg px-3 py-1.5">
              <span className="text-slate-500">إجمالي: </span>
              <span className="text-white font-black">{stats.total}</span>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-1.5">
              <span className="text-emerald-400">مكتمل: </span>
              <span className="text-emerald-300 font-black">{stats.done}</span>
            </div>
            {stats.processing > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-1.5">
                <span className="text-amber-400">قيد المعالجة: </span>
                <span className="text-amber-300 font-black">{stats.processing}</span>
              </div>
            )}
            {stats.errors > 0 && (
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg px-3 py-1.5">
                <span className="text-rose-400">أخطاء: </span>
                <span className="text-rose-300 font-black">{stats.errors}</span>
              </div>
            )}
          </div>
        </div>

        {/* Upload Zone */}
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
          }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            dragActive
              ? "border-indigo-400 bg-indigo-500/10 scale-[1.01]"
              : "border-white/15 hover:border-indigo-400/60 hover:bg-white/[0.04]/5"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
          <div className="h-14 w-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300 mb-3">
            <UploadCloud className="h-7 w-7 animate-pulse" />
          </div>
          <h3 className="text-sm font-black text-white mb-1">اسحب وأفلت صوراً أو ملفات PDF هنا</h3>
          <p className="text-[11px] text-slate-500 mb-4 max-w-md leading-relaxed">
            يدعم: PDF, JPG, PNG, WEBP, TIFF, HEIC, BMP — رفع جماعي مدعوم
          </p>
          <div className="flex flex-wrap items-center gap-2 justify-center">
            {["📄 PDF", "🖼️ صور", "📱 HEIC", "🎞️ TIFF", "🌐 متعدد اللغات", "⚡ رفع جماعي"].map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Settings row */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <label className="text-[10px] text-slate-500 font-bold block mb-1 flex items-center gap-1">
              <Languages className="h-3 w-3" />
              <span>لغة الاستخراج</span>
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full text-xs bg-slate-900/60 border border-white/10 rounded-lg p-2.5 font-bold text-white"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/40 border border-white/10 rounded-lg p-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
              <input
                type="checkbox"
                checked={smartPreprocess}
                onChange={(e) => setSmartPreprocess(e.target.checked)}
                className="h-4 w-4 accent-indigo-500 cursor-pointer"
              />
              <Wand2 className="h-4 w-4 text-indigo-400" />
              <span>معالجة ذكية مسبقة</span>
            </label>
            <span className="text-[10px] text-slate-500 font-semibold">
              (deskew + إزالة الظلال + تحسين التباين)
            </span>
          </div>

          <button
            onClick={handleDownloadAll}
            disabled={stats.done === 0}
            className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-black rounded-xl shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span>تنزيل كل النتائج (TXT)</span>
          </button>
        </div>

        {/* Results list + active result view */}
        {results.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 border border-white/10 text-center">
            <Eye className="h-10 w-10 text-slate-500 mx-auto mb-3" />
            <h3 className="text-sm font-black text-gray-300">لا توجد نتائج بعد</h3>
            <p className="text-[11px] text-slate-500 mt-1">ارفع صورة أو ملف PDF لبدء الاستخراج.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Thumbnails list */}
            <div className="lg:col-span-4 space-y-2 max-h-[600px] overflow-y-auto safe-scrollbar pl-1">
              {results.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setActiveResultId(r.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                    activeResultId === r.id
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-white/5 bg-white/[0.04]/5 hover:border-white/15"
                  }`}
                >
                  <div className="h-12 w-12 rounded-lg bg-slate-900/60 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                    {r.fileName.toLowerCase().endsWith(".pdf") ? (
                      <FileText className="h-5 w-5 text-indigo-400" />
                    ) : (
                      <img src={r.previewUrl} alt={r.fileName} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">{r.fileName}</div>
                    <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-2">
                      {r.status === "processing" && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <RefreshCw className="h-3 w-3 animate-spin" /> قيد المعالجة
                        </span>
                      )}
                      {r.status === "done" && (
                        <span className="text-emerald-400">
                          {r.text.length} حرف
                        </span>
                      )}
                      {r.status === "error" && <span className="text-rose-400">فشل</span>}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(r.id);
                    }}
                    className="text-slate-500 hover:text-rose-400 transition-colors p-1.5"
                    title="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Active result viewer */}
            <div className="lg:col-span-8 glass-card rounded-2xl border border-white/10 p-5 min-h-[500px] flex flex-col">
              {activeResult ? (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white truncate max-w-[300px]">
                        {activeResult.fileName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        ({(activeResult.fileSize / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleCopy}
                        disabled={!activeResult.text}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1.5 rounded-lg cursor-pointer disabled:opacity-40 transition-all"
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        <span>{copied ? "تم النسخ" : "نسخ"}</span>
                      </button>
                      <button
                        onClick={handleDownloadTxt}
                        disabled={!activeResult.text}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg cursor-pointer disabled:opacity-40 transition-all"
                      >
                        <Download className="h-3 w-3" />
                        <span>TXT</span>
                      </button>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="ابحث داخل النص المستخرج..."
                      className="w-full text-xs bg-slate-900/40 border border-white/10 rounded-lg pr-9 pl-4 py-2 font-bold text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Text content */}
                  <div className="flex-1 overflow-y-auto safe-scrollbar bg-slate-950/40 border border-white/5 rounded-xl p-4">
                    {activeResult.status === "processing" ? (
                      <div className="flex flex-col items-center justify-center h-full gap-2">
                        <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
                        <span className="text-xs text-gray-300 font-bold">
                          جاري استخراج النص بالذكاء الاصطناعي...
                        </span>
                        <span className="text-[10px] text-slate-500">قد يستغرق هذا بضع ثوانٍ</span>
                      </div>
                    ) : activeResult.status === "error" ? (
                      <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                        <X className="h-8 w-8 text-rose-400" />
                        <span className="text-xs text-rose-300 font-bold">فشل الاستخراج</span>
                        <span className="text-[10px] text-slate-500 max-w-sm">{activeResult.errorMsg}</span>
                      </div>
                    ) : activeResult.text ? (
                      <div className="text-xs font-bold text-gray-200 leading-relaxed whitespace-pre-wrap text-right select-text">
                        {highlightSearch(activeResult.text)}
                      </div>
                    ) : (
                      <div className="text-center text-slate-500 text-xs font-bold py-12">
                        لم يتم العثور على نص في هذا الملف.
                      </div>
                    )}
                  </div>

                  {/* Word count footer */}
                  {activeResult.text && (
                    <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                      <span>
                        الكلمات: <strong className="text-white">{activeResult.text.trim().split(/\s+/).filter(Boolean).length}</strong>
                      </span>
                      <span>
                        الأحرف: <strong className="text-white">{activeResult.text.length}</strong>
                      </span>
                      <span>اللغة: {activeResult.language}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                  اختر ملفاً من القائمة لعرض النتيجة
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
