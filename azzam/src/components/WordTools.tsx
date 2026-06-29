import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { 
  FileText, Sparkles, BookOpen, Clock, Copy, Download, RefreshCw, AlertCircle, FileCheck
} from "lucide-react";
import { PDFDocument, PageSizes, rgb } from "pdf-lib";
import { CloudApiService } from "../services/api";

export const WordTools: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [textContent, setTextContent] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  
  // Document Stats
  const [stats, setStats] = useState({
    words: 0,
    charsWithSpaces: 0,
    charsNoSpaces: 0,
    paragraphs: 0,
    readingTime: 0
  });

  // Network HUD Progress
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

  const showNotification = (type: "success" | "error" | "info", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const calculateStats = (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) {
      setStats({ words: 0, charsWithSpaces: 0, charsNoSpaces: 0, paragraphs: 0, readingTime: 0 });
      return;
    }

    const words = cleanText.split(/\s+/).filter(w => w.length > 0).length;
    const charsWithSpaces = text.length;
    const charsNoSpaces = text.replace(/\s/g, "").length;
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0).length;
    const readingTime = Math.ceil(words / 150); // average Arabic reading speed is ~150 words/min

    setStats({
      words,
      charsWithSpaces,
      charsNoSpaces,
      paragraphs,
      readingTime
    });
  };

  const processWordFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".docx")) {
      showNotification("error", "يرجى اختيار ملف بصيغة DOCX فقط.");
      return;
    }

    setIsProcessing(true);
    setFile(selectedFile);
    setNetworkProgress({
      uploadProgress: 0,
      downloadProgress: 0,
      speedKbps: 0,
      statusText: "جاري تهيئة رفع ملف Word للمعالجة السحابية...",
      isActive: true
    });

    try {
      const result = await CloudApiService.convertWord(selectedFile, (p) => {
        setNetworkProgress({
          uploadProgress: p.uploadProgress,
          downloadProgress: p.downloadProgress,
          speedKbps: p.speedKbps,
          statusText: p.statusText,
          isActive: true
        });
      });

      setHtmlContent(result.html);
      setTextContent(result.text);
      
      setStats({
        words: result.wordCount,
        charsWithSpaces: result.charCount,
        charsNoSpaces: Math.max(result.charCount - result.wordCount, 0),
        paragraphs: result.paraCount,
        readingTime: Math.ceil(result.wordCount / 150)
      });

      showNotification("success", "تم تحليل ملف Word سحابياً واستيراده بنجاح!");
    } catch (err: any) {
      console.error(err);
      showNotification("error", "فشلت المعالجة السحابية للملف: " + err.message);
    } finally {
      setIsProcessing(false);
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
      await processWordFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processWordFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleCopyText = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    showNotification("success", "تم نسخ نص المستند بالكامل إلى الحافظة!");
  };

  // Helper: Safely render Text Lines as crisp PNGs to embed in PDF
  // This guarantees gorgeous, uncorrupted Arabic lettering inside the PDF
  const drawArabicLineToPng = (text: string, fontSize: number = 18): string | null => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const renderScale = 3.0; // scale for high DPI
    const scaledSize = fontSize * renderScale;

    ctx.font = `normal ${scaledSize}px "Cairo", "Tajawal", "Inter", sans-serif`;
    const metrics = ctx.measureText(text);
    const width = Math.max(metrics.width + 40, 200);
    const height = scaledSize * 1.5;

    canvas.width = width;
    canvas.height = height;

    // Reset properties after canvas resize
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `normal ${scaledSize}px "Cairo", "Tajawal", "Inter", sans-serif`;
    ctx.fillStyle = "#1e293b"; // dark slate text color
    ctx.textBaseline = "middle";
    ctx.textAlign = "right"; // Arabic text orientation

    // Draw text (fill from right side of canvas)
    ctx.fillText(text, width - 20, height / 2);

    return canvas.toDataURL("image/png");
  };

  const handleExportToPdf = async () => {
    if (!textContent) return;
    setIsProcessing(true);
    showNotification("info", "جاري توليد ملف الـ PDF وتنسيق الصفحات...");

    try {
      const pdfDoc = await PDFDocument.create();
      const lines = textContent.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      
      const linesPerPage = 20;
      let currentPage = pdfDoc.addPage(PageSizes.A4);
      let currentY = currentPage.getHeight() - 60;
      const pageWidth = currentPage.getWidth();

      // Simple header
      currentPage.drawRectangle({
        x: 40,
        y: currentPage.getHeight() - 40,
        width: pageWidth - 80,
        height: 2,
        color: rgb(0.1, 0.45, 0.93) // Blue Accent
      });

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Chunk long lines to fit page width
        const words = line.split(" ");
        let currentChunk = "";
        const chunks: string[] = [];

        for (const word of words) {
          if ((currentChunk + " " + word).length > 60) {
            chunks.push(currentChunk.trim());
            currentChunk = word;
          } else {
            currentChunk += " " + word;
          }
        }
        if (currentChunk) chunks.push(currentChunk.trim());

        for (const chunk of chunks) {
          if (currentY < 60) {
            currentPage = pdfDoc.addPage(PageSizes.A4);
            currentY = currentPage.getHeight() - 60;
          }

          const lineImgDataUrl = drawArabicLineToPng(chunk, 16);
          if (lineImgDataUrl) {
            const imageBytes = await fetch(lineImgDataUrl).then(res => res.arrayBuffer());
            const embeddedImage = await pdfDoc.embedPng(imageBytes);
            const aspect = embeddedImage.width / embeddedImage.height;
            const drawHeight = 22;
            const drawWidth = drawHeight * aspect;

            // Align to right for Arabic text
            currentPage.drawImage(embeddedImage, {
              x: pageWidth - drawWidth - 40,
              y: currentY - drawHeight,
              width: drawWidth,
              height: drawHeight,
            });
            currentY -= 32;
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file?.name.replace(/\.docx$/i, "") || "مستند_مترجم"}_عزام.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      showNotification("success", "تم تصدير مستند Word إلى ملف PDF منسق وبجودة فائقة بنجاح!");
    } catch (err: any) {
      console.error(err);
      showNotification("error", "فشل تصدير المستند لـ PDF: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setHtmlContent("");
    setTextContent("");
    setStats({ words: 0, charsWithSpaces: 0, charsNoSpaces: 0, paragraphs: 0, readingTime: 0 });
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-slate-900/95 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-lg border border-slate-800 animate-slide-up">
          <span className={`h-2.5 w-2.5 rounded-full ${
            notification.type === "success" ? "bg-emerald-500 animate-ping" : 
            notification.type === "error" ? "bg-rose-500 animate-pulse" : "bg-blue-500 animate-pulse"
          }`} />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Upload or Active View */}
      {!file ? (
        <div className="w-full max-w-4xl mx-auto">
          {/* Section Description Card */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100/30 border border-blue-500/20 p-6 rounded-2xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-blue-200 flex items-center gap-1.5 justify-end">
                <span>أدوات عـزَّام الذكية لمعالجة مستندات Word</span>
                <Sparkles className="h-4.5 w-4.5 text-blue-500 animate-pulse" />
              </h3>
              <p className="text-xs font-bold text-blue-700/80 leading-relaxed">
                قم برفع مستندات Word (.docx) للقيام باستخراج النصوص منها وتدقيقها بالكامل وتحويلها إلى مستندات PDF احترافية بسرعة وأمان تام داخل متصفحك.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-blue-500/20/80 shadow-3xs shrink-0">
              <span className="text-[10px] font-black text-blue-600">CLIENT-SIDE PROCESSING</span>
              <div className="h-2 w-2 rounded-full bg-blue-500" />
            </div>
          </div>

          {/* Upload Box */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer ${
              dragActive 
                ? "border-blue-500 bg-blue-500/10/50 scale-[1.01]" 
                : "border-white/[0.08] bg-white/[0.04] hover:border-blue-400 hover:bg-white/[0.02]/30"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".docx"
              className="hidden"
            />
            
            <div className="p-4.5 bg-blue-500/10 rounded-2xl text-blue-600 mb-4 shadow-3xs">
              <FileText className="h-10 w-10 animate-bounce" />
            </div>

            <h3 className="text-sm font-black text-white mb-1">اسحب ملف Word (.docx) هنا أو اضغط للتصفح</h3>
            <p className="text-[11px] font-bold text-slate-500">يدعم مستندات Microsoft Word بدقة قراءة فائقة للغة العربية</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: File Analytics and Operations (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Document Profile Card */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 shadow-3xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-white/[0.08]">
                <button
                  onClick={handleReset}
                  className="text-[11px] font-black text-red-500 hover:text-red-600 bg-rose-500/10 hover:bg-red-100/50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  حذف وإغلاق
                </button>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <h4 className="text-xs font-black text-white line-clamp-1 max-w-[150px]">{file.name}</h4>
                    <span className="text-[10px] text-slate-500 font-bold">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
                    <FileText className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleExportToPdf}
                  disabled={isProcessing}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-3.5 text-xs font-black text-white shadow-md shadow-blue-500/10 active:scale-98 cursor-pointer disabled:opacity-55"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>جاري التوليد...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>تحويل المستند لملف PDF تنزيل</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCopyText}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.05] px-4 py-3 text-xs font-bold text-slate-300 active:scale-98 cursor-pointer"
                >
                  <Copy className="h-4 w-4" />
                  <span>نسخ النص الكامل للمستند</span>
                </button>
              </div>
            </div>

            {/* Live Statistics Cards */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 shadow-3xs space-y-4">
              <h3 className="text-xs font-black text-white pb-2 border-b border-white/[0.08] flex items-center gap-1.5 justify-end">
                <span>إحصائيات وتحليل المستند</span>
                <BookOpen className="h-4 w-4 text-amber-500 animate-pulse" />
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.02]/50 border border-white/[0.08] p-3.5 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-slate-500 block mb-0.5">عدد الكلمات</span>
                  <span className="text-sm font-black text-white">{stats.words}</span>
                </div>
                <div className="bg-white/[0.02]/50 border border-white/[0.08] p-3.5 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-slate-500 block mb-0.5">عدد الفقرات</span>
                  <span className="text-sm font-black text-white">{stats.paragraphs}</span>
                </div>
                <div className="bg-white/[0.02]/50 border border-white/[0.08] p-3.5 rounded-xl text-center col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 block mb-0.5">عدد الحروف (مع المسافات)</span>
                  <span className="text-sm font-black text-white">{stats.charsWithSpaces}</span>
                </div>
                <div className="bg-white/[0.02]/50 border border-white/[0.08] p-3.5 rounded-xl text-center col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 block mb-0.5">عدد الحروف (بدون مسافات)</span>
                  <span className="text-sm font-black text-white">{stats.charsNoSpaces}</span>
                </div>
              </div>

              <div className="bg-blue-500/10/60 border border-blue-500/20 p-3.5 rounded-xl flex items-center justify-between gap-3 text-right">
                <Clock className="h-4 w-4 text-blue-600 animate-pulse shrink-0" />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-blue-500 block">وقت القراءة المتوقع</span>
                  <span className="text-xs font-black text-blue-200">{stats.readingTime} دقيقة تقريباً</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Panel: Rendered HTML/Text Document (8 cols) */}
          <div className="lg:col-span-8 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 shadow-3xs space-y-4 min-h-[500px] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.08] shrink-0">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">LIVE INTERACTIVE VIEW</span>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <FileCheck className="h-4.5 w-4.5 text-emerald-500 animate-pulse" />
                <span>مستعرض محتويات المستند</span>
              </h3>
            </div>

            {/* Document Text Box */}
            <div className="flex-1 overflow-y-auto safe-scrollbar max-h-[600px] p-4 bg-white/[0.02]/30 border border-white/[0.08] rounded-xl text-right leading-relaxed text-sm font-medium text-slate-300 whitespace-pre-wrap select-text">
              {htmlContent ? (
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} className="word-docx-viewer" />
              ) : (
                <p className="text-center text-slate-500 my-10 font-bold">يرجى رفع ملف لرؤية المحتويات هنا.</p>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
