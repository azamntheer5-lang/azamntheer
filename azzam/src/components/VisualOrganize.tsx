import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, RotateCw, RotateCcw, ArrowRight, ArrowLeft, RefreshCw, Layers, Scissors } from "lucide-react";
import { ErrorBoundary } from "./ErrorBoundary";
import { useSharedPdfDocument } from "../hooks/useSharedPdfDocument";

interface VisualOrganizeProps {
  pdfBytes: Uint8Array;
  totalPages: number;
  onDeletePage: (pageNum: number) => void;
  onRotatePage: (pageNum: number, angle: number) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
  onReversePages: () => void;
  onSplitPdf: (range: string) => void;
  isProcessing: boolean;
}

// useSharedPdfDocument now lives in src/hooks/useSharedPdfDocument.ts — it used
// to be copy-pasted separately in this file AND in InteractiveCanvas.tsx, and
// BOTH copies leaked a full pdf.js document on every edit because the cleanup
// function never called doc.destroy() on the previously-loaded document. See
// that file for the full explanation. Importing the shared, fixed version here
// closes the leak for the "تنظيم وترتيب" (organize) tab specifically.

// Sub-component to render the thumbnail canvas using the SHARED pdf document
const ThumbnailRenderer: React.FC<{ pdf: any; pageNum: number; refreshTrigger: number }> = ({
  pdf,
  pageNum,
  refreshTrigger
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    if (!pdf) return;
    setLoading(true);
    setError(false);

    const render = async () => {
      try {
        if (!active) return;
        const page = await pdf.getPage(pageNum);

        if (!active) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Render at very small scale to optimize speed and memory
        const viewport = page.getViewport({ scale: 0.22 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas,
        };

        await page.render(renderContext).promise;
        // Cleanup page resources to free memory
        try { page.cleanup(); } catch {}
        if (active) setLoading(false);
      } catch (err) {
        console.error("Thumbnail rendering error:", err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    };

    render();

    return () => {
      active = false;
    };
  }, [pdf, pageNum, refreshTrigger]);

  return (
    <div className="relative w-full h-[140px] bg-white/[0.04] rounded-lg overflow-hidden border border-white/[0.08] flex items-center justify-center">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/[0.02]/80">
          <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-500/10 text-red-400 text-[10px] p-2">
          <span>فشل المعاينة</span>
        </div>
      )}
      <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
    </div>
  );
};

const VisualOrganizeInner: React.FC<VisualOrganizeProps> = ({
  pdfBytes,
  totalPages,
  onDeletePage,
  onRotatePage,
  onMovePage,
  onReversePages,
  onSplitPdf,
  isProcessing
}) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [splitRange, setSplitRange] = useState("1-" + Math.min(3, totalPages));
  const [visibleCount, setVisibleCount] = useState(12);  // virtualize: only render first 12 thumbnails initially
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Load the PDF document ONCE for all thumbnails (huge performance win)
  const { pdf, loading: pdfLoading, error: pdfError } = useSharedPdfDocument(pdfBytes);

  // Force re-render of thumbnails when bytes change
  useEffect(() => {
    setRefreshTrigger(prev => prev + 1);
    setVisibleCount(12);  // reset pagination on new file
  }, [pdfBytes]);

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pageNumbers.slice(0, visibleCount);

  // Lazy-load more thumbnails automatically as the user scrolls near the
  // bottom of the grid, instead of requiring a manual "load more" tap.
  // A single observer watches a 1px sentinel placed after the grid; once it
  // enters the viewport (with a 600px lookahead margin so the next batch is
  // ready slightly before it's actually visible) we grow visibleCount by 12.
  useEffect(() => {
    if (!pdf || visibleCount >= totalPages) return; // nothing more to load
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + 12, totalPages));
        }
      },
      { root: null, rootMargin: "600px 0px", threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [pdf, visibleCount, totalPages]);

  const applyPreset = (type: "first_half" | "second_half" | "odds" | "evens") => {
    if (totalPages === 0) return;
    if (type === "first_half") {
      const half = Math.ceil(totalPages / 2);
      setSplitRange(`1-${half}`);
    } else if (type === "second_half") {
      const start = Math.ceil(totalPages / 2) + 1;
      if (start <= totalPages) {
        setSplitRange(`${start}-${totalPages}`);
      } else {
        setSplitRange(`${totalPages}`);
      }
    } else if (type === "odds") {
      const odds = pageNumbers.filter(p => p % 2 !== 0).join(",");
      setSplitRange(odds);
    } else if (type === "evens") {
      const evens = pageNumbers.filter(p => p % 2 === 0).join(",");
      setSplitRange(evens || "2");
    }
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* Split PDF interactive panel */}
      <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/20 border border-blue-500/20 rounded-2xl p-5 shadow-3xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Scissors className="h-4.5 w-4.5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">تقسيم واستخراج صفحات PDF</h3>
              <p className="text-[10px] text-slate-500 font-bold">استخرج أوراق أو فصول محددة من الملف في ثوانٍ معدودة.</p>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => applyPreset("first_half")}
              className="px-2.5 py-1 text-[10px] font-bold text-blue-700 bg-blue-500/10 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
            >
              النصف الأول (1-{Math.ceil(totalPages / 2)})
            </button>
            <button
              onClick={() => applyPreset("second_half")}
              className="px-2.5 py-1 text-[10px] font-bold text-blue-700 bg-blue-500/10 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
            >
              النصف الثاني
            </button>
            <button
              onClick={() => applyPreset("odds")}
              className="px-2.5 py-1 text-[10px] font-bold text-blue-700 bg-blue-500/10 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
            >
              الصفحات الفردية
            </button>
            <button
              onClick={() => applyPreset("evens")}
              className="px-2.5 py-1 text-[10px] font-bold text-blue-700 bg-blue-500/10 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
            >
              الصفحات الزوجية
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={splitRange}
              onChange={(e) => setSplitRange(e.target.value)}
              placeholder="مثال: 1-3, 5, 7-9"
              className="w-full pr-4 pl-4 py-3 text-xs font-black rounded-xl border border-white/[0.08] bg-white/[0.04] focus:border-blue-500 outline-none text-right placeholder-gray-300"
            />
          </div>

          <button
            onClick={() => onSplitPdf(splitRange)}
            disabled={isProcessing || !splitRange}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md shadow-blue-500/10 cursor-pointer whitespace-nowrap active:scale-98 transition-all"
          >
            ✂️ استخراج وتحميل الجزء المحدد
          </button>
        </div>
      </div>

      {/* Top Quick Actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 shadow-3xs">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-400 animate-pulse" />
          <div>
            <h3 className="text-sm font-bold text-white">مخطط صفحات المستند</h3>
            <p className="text-[10px] text-slate-500 font-medium">
              اضغط على الأدوات في كرت كل صفحة لحذفها، تدويرها، أو تحريك ترتيبها بسهولة.
            </p>
          </div>
        </div>

        <button
          onClick={onReversePages}
          disabled={isProcessing || totalPages <= 1}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-gray-55 px-4 py-2 text-xs font-bold text-slate-300 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
        >
          <Layers className="h-3.5 w-3.5 rotate-180" />
          عكس ترتيب كل الصفحات
        </button>
      </div>

      {/* Slide deck grid */}
      {pdfLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-blue-400 animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-semibold">جاري تحميل المستند للمعاينة...</p>
        </div>
      )}
      {pdfError && (
        <div className="glass-card rounded-xl p-4 border border-amber-500/20 text-amber-300 text-xs">
          ⚠ تعذّر تحميل المعاينة المرئية. يمكنك استعمال أدوات التعديل أعلاه.
        </div>
      )}
      {pdf && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <AnimatePresence mode="popLayout">
            {visiblePages.map((pageNum, idx) => (
              <motion.div
                key={`page-${pageNum}`}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                transition={{ duration: 0.2 }}
                className="group flex flex-col bg-white/[0.04] border border-white/[0.08] rounded-2xl p-2.5 shadow-3xs hover:border-google-blue transition-colors relative"
              >
                {/* Thumbnail Rendering using shared pdf */}
                <ThumbnailRenderer pdf={pdf} pageNum={pageNum} refreshTrigger={refreshTrigger} />

              {/* Page indicator badge */}
              <div className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold shadow-sm">
                {pageNum}
              </div>

              {/* Action Buttons on individual slide */}
              <div className="mt-3 grid grid-cols-4 gap-1">
                {/* Rotate CCW */}
                <button
                  onClick={() => onRotatePage(pageNum, 270)}
                  disabled={isProcessing}
                  title="تدوير لليسار"
                  className="flex h-7 items-center justify-center rounded-lg border border-white/[0.08] text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>

                {/* Rotate CW */}
                <button
                  onClick={() => onRotatePage(pageNum, 90)}
                  disabled={isProcessing}
                  title="تدوير لليمين"
                  className="flex h-7 items-center justify-center rounded-lg border border-white/[0.08] text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>

                {/* Delete Page */}
                <button
                  onClick={() => onDeletePage(pageNum)}
                  disabled={isProcessing || totalPages <= 1}
                  title="حذف هذه الصفحة"
                  className="flex h-7 items-center justify-center rounded-lg border border-white/[0.08] text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 hover:border-red-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                {/* Move Actions (grouped left/right) */}
                <div className="flex gap-0.5 col-span-1">
                  <button
                    onClick={() => onMovePage(idx, idx - 1)}
                    disabled={isProcessing || idx === 0}
                    title="تحريك للأمام"
                    className="flex-1 flex h-7 items-center justify-center rounded-lg border border-white/[0.08] text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 cursor-pointer"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onMovePage(idx, idx + 1)}
                    disabled={isProcessing || idx === totalPages - 1}
                    title="تحريك للخلف"
                    className="flex-1 flex h-7 items-center justify-center rounded-lg border border-white/[0.08] text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      )}

      {/* Auto-loading sentinel (virtualization via IntersectionObserver) —
          replaces the old manual "load more" button. As soon as this comes
          within 600px of the viewport, the effect above grows visibleCount,
          so scrolling down the grid loads more thumbnails by itself. A manual
          button is kept as a fallback for the rare case IntersectionObserver
          isn't available. */}
      {pdf && visibleCount < totalPages && (
        <div ref={sentinelRef} className="flex justify-center pt-4">
          <button
            onClick={() => setVisibleCount(c => Math.min(c + 12, totalPages))}
            className="btn-secondary px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <Layers className="h-4 w-4" />
            جاري تحميل المزيد تلقائياً... ({totalPages - visibleCount} صفحة متبقية)
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Public export — wraps the organize panel in an error boundary so that an
 * unexpected exception while rendering thumbnails (a malformed page, a
 * pdf.js internal error, etc.) shows a small recoverable card instead of
 * freezing or blanking the entire PDF workspace.
 */
export const VisualOrganize: React.FC<VisualOrganizeProps> = (props) => (
  <ErrorBoundary label="معاينة الصفحات">
    <VisualOrganizeInner {...props} />
  </ErrorBoundary>
);
