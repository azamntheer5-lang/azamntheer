import React, { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
import { Download, Image, Layers, RefreshCw, CheckCircle } from "lucide-react";

interface PngConverterProps {
  pdfBytes: Uint8Array;
  totalPages: number;
  fileName: string;
  isProcessing: boolean;
  setIsProcessing: (proc: boolean) => void;
}

export const PngConverter: React.FC<PngConverterProps> = ({
  pdfBytes,
  totalPages,
  fileName,
  isProcessing,
  setIsProcessing
}) => {
  const [qualityScale, setQualityScale] = useState(2); // 1 = 72DPI, 2 = 144DPI, 3 = 216DPI
  const [pageRange, setPageRange] = useState<"all" | "range">("all");
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(totalPages);
  const [downloadMode, setDownloadMode] = useState<"zip" | "individual">("zip");
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  const triggerExport = async () => {
    let start = 1;
    let end = totalPages;

    if (pageRange === "range") {
      if (fromPage < 1 || toPage > totalPages || fromPage > toPage) {
        alert(`⚠️ نطاق الصفحات المكتوب غير صالح (1 – ${totalPages})`);
        return;
      }
      start = fromPage;
      end = toPage;
    }

    setIsProcessing(true);
    setProgress(5);
    setStatusMessage("جاري تحميل محرك صور PDF...");

    try {
      const version = pdfjsLib.version || "4.0.379";
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`;

      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;
      const totalToRender = end - start + 1;
      const renderedCanvases: { canvas: HTMLCanvasElement; index: number }[] = [];

      for (let i = start; i <= end; i++) {
        setStatusMessage(`جاري تحويل الصفحة ${i} من ${end}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: qualityScale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const renderContext = {
            canvasContext: ctx,
            viewport: viewport,
            canvas: canvas,
          };
          await page.render(renderContext).promise;
          renderedCanvases.push({ canvas, index: i });
        }

        const currentProg = Math.round(5 + ((i - start + 1) / totalToRender) * 75);
        setProgress(currentProg);
      }

      setStatusMessage("جاري إعداد وتحزيم الصور للتنزيل...");

      if (downloadMode === "individual") {
        // Download individually one by one
        for (const { canvas, index } of renderedCanvases) {
          await new Promise<void>((resolve) => {
            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${fileName.replace(/\.pdf$/i, "")}_صفحة_${index}.png`;
                a.click();
                setTimeout(() => {
                  URL.revokeObjectURL(url);
                  resolve();
                }, 400);
              } else {
                resolve();
              }
            }, "image/png");
          });
        }
      } else {
        // ZIP bundling using local JSZip
        const zip = new JSZip();
        const imgFolder = zip.folder("images");

        for (const { canvas, index } of renderedCanvases) {
          const dataUrl = canvas.toDataURL("image/png");
          const base64 = dataUrl.split(",")[1];
          imgFolder?.file(`page_${String(index).padStart(3, "0")}.png`, base64, { base64: true });
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName.replace(/\.pdf$/i, "")}_صور_مجمعة.zip`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      setProgress(100);
      setStatusMessage("✅ تم تحويل وتنزيل الصور بنجاح!");
      setTimeout(() => {
        setProgress(0);
        setStatusMessage("");
      }, 3000);
    } catch (err: any) {
      console.error(err);
      alert("❌ حدث خطأ أثناء تحويل الملف لصور: " + err.message);
      setProgress(0);
      setStatusMessage("");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-3xs max-w-3xl mx-auto select-none space-y-5">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-google-blue">
          <Image className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">تصدير صفحات PDF إلى صور PNG</h3>
          <p className="text-[10px] text-gray-400 font-semibold">استخرج كل صفحة كملف صورة عالي الدقة بصيغة PNG لمشاركتها كصور.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">جودة وكثافة البكسل للصور:</label>
          <select
            value={qualityScale}
            onChange={(e) => setQualityScale(parseFloat(e.target.value))}
            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-bold"
          >
            <option value="1">جودة قياسية خفيفة (72 DPI)</option>
            <option value="2">جودة عالية ممتازة (144 DPI)</option>
            <option value="3">جودة فائقة الوضوح (216 DPI)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">طريقة التحميل والتنزيل:</label>
          <select
            value={downloadMode}
            onChange={(e) => setDownloadMode(e.target.value as any)}
            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-bold"
          >
            <option value="zip">تنزيل كملف مضغوط ZIP (جميع الصور مجمعة)</option>
            <option value="individual">تنزيل كل صورة منفردة تلقائياً</option>
          </select>
        </div>
      </div>

      <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-150">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-700">تحديد الصفحات المراد استخراجها:</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold">
              <input
                type="radio"
                name="pageRange"
                checked={pageRange === "all"}
                onChange={() => setPageRange("all")}
                className="accent-google-blue h-4 w-4 cursor-pointer"
              />
              <span>كامل المستند ({totalPages} صفحات)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold">
              <input
                type="radio"
                name="pageRange"
                checked={pageRange === "range"}
                onChange={() => setPageRange("range")}
                className="accent-google-blue h-4 w-4 cursor-pointer"
              />
              <span>نطاق مخصص</span>
            </label>
          </div>
        </div>

        {pageRange === "range" && (
          <div className="flex items-center gap-3 pt-2 border-t border-gray-200 animate-fade-in text-xs font-bold">
            <div className="flex items-center gap-2">
              <span>من صفحة:</span>
              <input
                type="number"
                value={fromPage}
                min={1}
                max={totalPages}
                onChange={(e) => setFromPage(parseInt(e.target.value) || 1)}
                className="w-16 bg-white border border-gray-200 rounded-lg p-1.5 text-center"
              />
            </div>
            <div className="flex items-center gap-2">
              <span>إلى صفحة:</span>
              <input
                type="number"
                value={toPage}
                min={1}
                max={totalPages}
                onChange={(e) => setToPage(parseInt(e.target.value) || totalPages)}
                className="w-16 bg-white border border-gray-200 rounded-lg p-1.5 text-center"
              />
            </div>
          </div>
        )}
      </div>

      {/* Progress display */}
      {progress > 0 && (
        <div className="space-y-1.5 animate-fade-in">
          <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold">
            <span className="flex items-center gap-1 text-google-blue">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              {statusMessage}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-google-blue to-blue-600 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={triggerExport}
        disabled={isProcessing}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-google-blue hover:bg-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/10 transition-all cursor-pointer disabled:opacity-45"
      >
        {isProcessing ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : <Layers className="h-4.5 w-4.5" />}
        <span>بدء تصدير وتحميل صفحات الـ PDF كصور</span>
      </button>
    </div>
  );
};
