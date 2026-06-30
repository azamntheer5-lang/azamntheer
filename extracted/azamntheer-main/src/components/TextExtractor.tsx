import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, Download, Copy, Check, Search, Sparkles, RefreshCw, FileCode, Upload, Eye 
} from "lucide-react";
import { CloudApiService } from "../services/api";

interface TextExtractorProps {
  pdfBytes: Uint8Array | null;
  extractedText: string;
  fileName: string | null;
  isProcessing: boolean;
}

export const TextExtractor: React.FC<TextExtractorProps> = ({
  pdfBytes,
  extractedText,
  fileName,
  isProcessing
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);
  const [pageTexts, setPageTexts] = useState<{ pageNum: number; text: string }[]>([]);
  const [activeView, setActiveView] = useState<"full" | "pages">("full");
  const [activePage, setActivePage] = useState<number>(1);

  // Mode Selection: "pdf" vs "ocr"
  const [mode, setMode] = useState<"pdf" | "ocr">("pdf");

  // Cloud OCR States
  const [ocrText, setOcrText] = useState("");
  const [ocrFileName, setOcrFileName] = useState("");
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [networkProgress, setNetworkProgress] = useState<{
    uploadProgress: number;
    downloadProgress: number;
    speedKbps?: number;
    statusText?: string;
    isActive: boolean;
  }>({
    uploadProgress: 0,
    downloadProgress: 0,
    isActive: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!extractedText) {
      setPageTexts([]);
      return;
    }

    // Parse page texts based on "[Page X]" markers
    const pages: { pageNum: number; text: string }[] = [];
    const pageSplits = extractedText.split(/\[Page (\d+)\]/);
    
    for (let i = 1; i < pageSplits.length; i += 2) {
      const pageNum = parseInt(pageSplits[i], 10);
      const text = pageSplits[i + 1] ? pageSplits[i + 1].trim() : "";
      if (pageNum) {
        pages.push({ pageNum, text });
      }
    }

    setPageTexts(pages);
    if (pages.length > 0) {
      setActivePage(pages[0].pageNum);
    }
  }, [extractedText]);

  // Handle image file input for OCR
  const handleOcrFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("⚠️ يرجى اختيار ملف صورة صالح (PNG, JPEG, WEBP) لتطبيق الـ OCR.");
      return;
    }

    setOcrFileName(file.name);
    setIsOcrProcessing(true);
    setOcrText("");
    setNetworkProgress({
      uploadProgress: 0,
      downloadProgress: 0,
      speedKbps: 0,
      statusText: "جاري رفع الصورة للمسح الضوئي سحابياً والتحليل...",
      isActive: true
    });

    try {
      const result = await CloudApiService.ocrImageCloud(file, (p) => {
        setNetworkProgress({
          uploadProgress: p.uploadProgress,
          downloadProgress: p.downloadProgress,
          speedKbps: p.speedKbps,
          statusText: p.statusText,
          isActive: true
        });
      });

      setOcrText(result.text);
    } catch (err: any) {
      console.error(err);
      alert("❌ فشلت معالجة الـ OCR السحابية: " + err.message);
    } finally {
      setIsOcrProcessing(false);
      setNetworkProgress(prev => ({ ...prev, isActive: false }));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleOcrFile(e.dataTransfer.files[0]);
    }
  };

  const handleCopy = () => {
    const textToCopy = mode === "pdf"
      ? (activeView === "full" ? extractedText.replace(/\[Page \d+\]/g, "") : (pageTexts.find(p => p.pageNum === activePage)?.text || ""))
      : ocrText;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const textToSave = mode === "pdf"
      ? extractedText.replace(/\[Page \d+\]/g, (match) => `\n--- ${match} ---\n`)
      : ocrText;

    const blob = new Blob([textToSave], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const name = mode === "pdf"
      ? (fileName ? fileName.replace(/\.pdf$/i, "") : "مستند_مستخرج")
      : (ocrFileName ? ocrFileName.replace(/\.[^/.]+$/, "") : "صورة_ممسوحة");
    
    a.download = `${name}_عزام_مستخرج.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const activeText = mode === "pdf"
    ? (activeView === "full" ? extractedText.replace(/\[Page \d+\]/g, "") : (pageTexts.find(p => p.pageNum === activePage)?.text || ""))
    : ocrText;

  const characterCount = activeText.length;
  const wordCount = activeText.trim() ? activeText.trim().split(/\s+/).length : 0;

  const highlightSearch = (text: string) => {
    if (!searchTerm.trim()) return text;
    const parts = text.split(new RegExp(`(${searchTerm})`, "gi"));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 text-gray-900 rounded-sm px-0.5 font-bold animate-pulse">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-3xs max-w-4xl mx-auto select-none space-y-6 text-right">
      
      {/* Brand Header & Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 border border-indigo-200/50">
            <FileText className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-800">منظومة استخراج وقراءة النصوص الذكية</h3>
            <p className="text-[10px] text-gray-400 font-bold leading-normal">
              تحليل وقراءة مستندات PDF رقمياً، أو تطبيق الـ OCR السحابي الشامل للصور الممسوحة ضوئياً.
            </p>
          </div>
        </div>

        {/* Mode Selector Tab */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 self-start md:self-auto">
          <button
            onClick={() => setMode("pdf")}
            className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
              mode === "pdf"
                ? "bg-white text-indigo-600 shadow-3xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            استخراج نصوص PDF رقمياً
          </button>
          <button
            onClick={() => setMode("ocr")}
            className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === "ocr"
                ? "bg-white text-indigo-600 shadow-3xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>قارئ الصور والمسح الضوئي (OCR)</span>
          </button>
        </div>
      </div>

      {/* Network HUD Progress Alert */}
      {networkProgress.isActive && (
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 text-indigo-900 animate-pulse text-xs font-bold flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
              <span>{networkProgress.statusText}</span>
            </span>
            {networkProgress.speedKbps !== undefined && networkProgress.speedKbps > 0 && (
              <span className="font-mono bg-indigo-100/80 px-2 py-0.5 rounded-md text-[10px]">
                🚀 {networkProgress.speedKbps.toFixed(1)} KB/s
              </span>
            )}
          </div>
          <div className="w-full bg-indigo-200/40 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${networkProgress.uploadProgress || networkProgress.downloadProgress || 10}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-indigo-500 font-semibold">
            <span>الرفع: {networkProgress.uploadProgress}%</span>
            <span>التحميل: {networkProgress.downloadProgress}%</span>
          </div>
        </div>
      )}

      {/* Main Body per Mode */}
      {mode === "pdf" ? (
        <>
          {/* Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 p-3 rounded-xl border border-gray-150">
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-lg shadow-3xs self-start">
              <button
                onClick={() => setActiveView("full")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  activeView === "full"
                    ? "bg-indigo-600 text-white shadow-3xs"
                    : "text-gray-550 hover:text-gray-900"
                }`}
              >
                النص الكامل للمستند
              </button>
              <button
                onClick={() => setActiveView("pages")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  activeView === "pages"
                    ? "bg-indigo-600 text-white shadow-3xs"
                    : "text-gray-550 hover:text-gray-900"
                }`}
              >
                تصفح صفحة بصفحة
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث عن كلمة أو عبارة داخل النص المستخرج..."
                className="w-full text-xs bg-white border border-gray-200 rounded-lg pr-9 pl-4 py-2 font-bold placeholder-gray-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Page Selector */}
          {activeView === "pages" && pageTexts.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 safe-scrollbar border-b border-gray-100 max-w-full">
              {pageTexts.map((p) => (
                <button
                  key={p.pageNum}
                  onClick={() => setActivePage(p.pageNum)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shrink-0 ${
                    activePage === p.pageNum
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-extrabold"
                      : "border-gray-200 bg-white hover:border-gray-300 text-gray-600"
                  }`}
                >
                  الصفحة {p.pageNum}
                </button>
              ))}
            </div>
          )}

          {/* Text Area */}
          <div className="relative bg-gray-50/50 border border-gray-200 rounded-xl p-5 h-[340px] flex flex-col justify-between">
            <div className="overflow-y-auto safe-scrollbar flex-1 text-xs font-bold text-gray-700 leading-relaxed whitespace-pre-wrap font-sans text-right select-text">
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 animate-pulse">
                  <RefreshCw className="h-7 w-7 text-indigo-600 animate-spin" />
                  <span className="text-gray-400">جاري مسح ومعالجة المستند رقمياً...</span>
                </div>
              ) : !extractedText ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-2">
                  <FileCode className="h-10 w-10 text-gray-300" />
                  <span className="text-gray-400 font-extrabold">لا يوجد نصوص قابلة للاستخراج في هذا المستند!</span>
                  <p className="text-[10px] text-gray-400 max-w-md font-semibold">
                    قم برفع ملف PDF يحتوي على نصوص مدمجة رقمياً في قسم التعديل، أو انتقل إلى علامة التبويب "قارئ الصور والمسح الضوئي" لمعالجة الصور والصفحات الممسوحة ضوئياً.
                  </p>
                </div>
              ) : (
                <div className="pr-1 pl-1">
                  {highlightSearch(activeText)}
                </div>
              )}
            </div>

            {/* Actions Footer */}
            {extractedText && !isProcessing && (
              <div className="border-t border-gray-200/80 pt-3 mt-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-gray-400 font-extrabold shrink-0">
                <span className="flex items-center gap-1 text-indigo-600">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>تم استخراج النص رقمياً بنجاح وسرعة فائقة.</span>
                </span>
                <div className="flex items-center gap-4">
                  <span>عدد الكلمات: <strong className="text-gray-700 font-black">{wordCount}</strong></span>
                  <span>عدد الرموز: <strong className="text-gray-700 font-black">{characterCount}</strong></span>
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-black transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-google-green" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? "تم النسخ!" : "نسخ النص"}</span>
                  </button>
                  <button 
                    onClick={handleDownloadTxt}
                    className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-black transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>تحميل النص (TXT)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Cloud OCR Panel */}
          <div className="space-y-4">
            {!ocrText && !isOcrProcessing ? (
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 ${
                  dragActive 
                    ? "border-indigo-600 bg-indigo-50/50 scale-[0.99]" 
                    : "border-gray-200 hover:border-indigo-500 hover:bg-gray-50/50"
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleOcrUpload}
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="h-14 w-14 rounded-full bg-indigo-50 border border-indigo-100/50 text-indigo-600 flex items-center justify-center shadow-3xs">
                  <Upload className="h-6 w-6 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-800">اسحب وأفلت صورة مستندك هنا لتطبيق الـ OCR</h4>
                  <p className="text-[10px] text-gray-400 mt-1 font-bold">
                    يدعم الملفات ممسوحة ضوئياً وصور المخطوطات والكتب بصيغ PNG, JPEG, WebP.
                  </p>
                </div>
                <button className="px-5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/10 cursor-pointer">
                  اختر صورة المستند سحابياً
                </button>
              </div>
            ) : (
              <div className="relative bg-gray-50/50 border border-gray-200 rounded-xl p-5 h-[340px] flex flex-col justify-between">
                <div className="overflow-y-auto safe-scrollbar flex-1 text-xs font-bold text-gray-700 leading-relaxed whitespace-pre-wrap font-sans text-right select-text">
                  {isOcrProcessing ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 animate-pulse">
                      <RefreshCw className="h-7 w-7 text-indigo-600 animate-spin" />
                      <span className="text-gray-400">جاري قراءة وتحليل الكلمات بالكامل سحابياً...</span>
                    </div>
                  ) : (
                    <div className="pr-1 pl-1">
                      {highlightSearch(ocrText)}
                    </div>
                  )}
                </div>

                {/* OCR Actions Footer */}
                {ocrText && !isOcrProcessing && (
                  <div className="border-t border-gray-200/80 pt-3 mt-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-gray-400 font-extrabold shrink-0">
                    <span className="flex items-center gap-1 text-indigo-600">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>الملف: <strong className="text-gray-700 font-black">{ocrFileName}</strong></span>
                    </span>
                    <div className="flex items-center gap-4">
                      <span>عدد الكلمات: <strong className="text-gray-700 font-black">{wordCount}</strong></span>
                      <span>عدد الرموز: <strong className="text-gray-700 font-black">{characterCount}</strong></span>
                      <button 
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-black transition-colors cursor-pointer"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-google-green" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copied ? "تم النسخ!" : "نسخ النص"}</span>
                      </button>
                      <button 
                        onClick={handleDownloadTxt}
                        className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-black transition-colors cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>تحميل النص (TXT)</span>
                      </button>
                      <button 
                        onClick={() => {
                          setOcrText("");
                          setOcrFileName("");
                        }}
                        className="flex items-center gap-1.5 text-rose-600 hover:text-rose-800 font-black transition-colors cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>مسح صورة جديدة</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Guidance box */}
      <div className="p-3.5 bg-indigo-50/40 border border-indigo-100/60 rounded-xl text-[11px] font-bold text-indigo-800 leading-relaxed flex items-start gap-2">
        <Sparkles className="h-4.5 w-4.5 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
        <div>
          <span>ميزة تصدير وقراءة النصوص الذكية من عزَّام:</span>
          <p className="text-[10px] text-indigo-700 mt-1 font-semibold leading-normal">
            يعتمد قارئ الصور والمسح الضوئي (OCR) على خوارزميات الذكاء الاصطناعي السحابية Gemini 2.5 Pro، مما يتيح التعرف على الكتابات العربية الصعبة، النصوص اليدوية، والصفحات المصورة الرديئة بنسبة دقة فائقة وبشكل فوري.
          </p>
        </div>
      </div>

    </div>
  );

  async function handleOcrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      await handleOcrFile(e.target.files[0]);
    }
  }
};
