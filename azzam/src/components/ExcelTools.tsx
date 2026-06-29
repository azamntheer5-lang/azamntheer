import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { 
  FileSpreadsheet, Sparkles, Search, CheckSquare, Square, Code, Download, RefreshCw, AlertCircle, FileCheck, ArrowRightLeft
} from "lucide-react";
import { PDFDocument, PageSizes } from "pdf-lib";
import { CloudApiService } from "../services/api";

export const ExcelTools: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sheetsData, setSheetsData] = useState<{ [sheetName: string]: any[][] }>({});
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Column extraction state
  const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
  const [showHtmlExport, setShowHtmlExport] = useState<boolean>(false);

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

  const processExcelFile = async (selectedFile: File) => {
    const isXlsx = selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls");
    const isCsv = selectedFile.name.endsWith(".csv");

    if (!isXlsx && !isCsv) {
      showNotification("error", "يرجى رفع ملف بصيغة Excel (.xlsx, .xls) أو CSV فقط.");
      return;
    }

    setIsProcessing(true);
    setFile(selectedFile);
    setNetworkProgress({
      uploadProgress: 0,
      downloadProgress: 0,
      speedKbps: 0,
      statusText: "جاري تهيئة رفع ملف الجداول للمعالجة السحابية...",
      isActive: true
    });

    try {
      const result = await CloudApiService.processExcel(selectedFile, (p) => {
        setNetworkProgress({
          uploadProgress: p.uploadProgress,
          downloadProgress: p.downloadProgress,
          speedKbps: p.speedKbps,
          statusText: p.statusText,
          isActive: true
        });
      });

      setSheetsData(result.sheets);
      setSheetNames(result.sheetNames);
      setActiveSheet(result.sheetNames[0] || "");
      setSelectedColumns([]);
      setShowHtmlExport(false);

      showNotification("success", `تم تحليل ملف Excel سحابياً بنجاح! تم استيراد ${result.sheetNames.length} أوراق عمل.`);
    } catch (err: any) {
      console.error(err);
      showNotification("error", "فشلت المعالجة السحابية لملف Excel: " + err.message);
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
      await processExcelFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processExcelFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Get current active sheet grid
  const currentRows = sheetsData[activeSheet] || [];
  const headerRow = currentRows[0] || [];
  const bodyRows = currentRows.slice(1) || [];

  // Filter rows by query
  const filteredBodyRows = bodyRows.filter(row => {
    if (!searchQuery) return true;
    return row.some(cell => 
      String(cell || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Toggle selected columns for HTML export
  const toggleColumnSelection = (colIndex: number) => {
    if (selectedColumns.includes(colIndex)) {
      setSelectedColumns(selectedColumns.filter(idx => idx !== colIndex));
    } else {
      setSelectedColumns([...selectedColumns, colIndex].sort((a, b) => a - b));
    }
  };

  const toggleAllColumns = () => {
    if (selectedColumns.length === headerRow.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(headerRow.map((_, i) => i));
    }
  };

  // Generate Extracted HTML Table Code
  const generateHtmlTableCode = (): string => {
    const colsToUse = selectedColumns.length > 0 ? selectedColumns : headerRow.map((_, i) => i);
    
    let html = `<table style="width: 100%; border-collapse: collapse; font-family: sans-serif; text-align: right; margin: 10px 0;" dir="rtl">\n`;
    
    // Header
    html += `  <thead>\n    <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">\n`;
    colsToUse.forEach(idx => {
      const headerVal = headerRow[idx] !== undefined ? String(headerRow[idx]) : `عمود ${idx + 1}`;
      html += `      <th style="padding: 12px; font-weight: bold; border: 1px solid #e2e8f0;">${headerVal}</th>\n`;
    });
    html += `    </tr>\n  </thead>\n`;

    // Body
    html += `  <tbody>\n`;
    filteredBodyRows.forEach((row, rIdx) => {
      const bgStyle = rIdx % 2 === 0 ? "" : ` style="background-color: #f8fafc;"`;
      html += `    <tr${bgStyle}>\n`;
      colsToUse.forEach(idx => {
        const val = row[idx] !== undefined ? String(row[idx]) : "";
        html += `      <td style="padding: 10px; border: 1px solid #e2e8f0;">${val}</td>\n`;
      });
      html += `    </tr>\n`;
    });
    html += `  </tbody>\n</table>`;
    
    return html;
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(generateHtmlTableCode());
    showNotification("success", "تم نسخ كود جدول الـ HTML المستخرج بنجاح!");
  };

  // Helper: Create PNG image of a grid row for elegant Arabic PDF rendering
  const drawExcelRowToPng = (cells: string[], colWidths: number[], isHeader: boolean = false): string | null => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const renderScale = 2.5;
    const cellPadding = 12 * renderScale;
    const fontSize = 13 * renderScale;
    const height = 40 * renderScale;

    // Estimate total row width based on columns
    const scaledWidths = colWidths.map(w => w * renderScale);
    const totalWidth = scaledWidths.reduce((sum, w) => sum + w, 0);

    canvas.width = totalWidth;
    canvas.height = height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Header Background
    if (isHeader) {
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(0, 0, totalWidth, height);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, totalWidth, height);
    }

    // Grid border
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1 * renderScale;
    ctx.strokeRect(0, 0, totalWidth, height);

    ctx.font = isHeader 
      ? `bold ${fontSize}px "Cairo", "Tajawal", "Inter", sans-serif` 
      : `normal ${fontSize}px "Cairo", "Tajawal", "Inter", sans-serif`;

    ctx.fillStyle = "#1e293b";
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";

    let currentX = totalWidth; // Draw from right to left for Arabic-friendly alignment
    
    cells.forEach((cell, idx) => {
      const cellW = scaledWidths[idx];
      // Draw inner right cell border
      ctx.beginPath();
      ctx.moveTo(currentX - cellW, 0);
      ctx.lineTo(currentX - cellW, height);
      ctx.stroke();

      // Draw cell text
      ctx.fillText(cell, currentX - 10, height / 2, cellW - 20);
      currentX -= cellW;
    });

    return canvas.toDataURL("image/png");
  };

  const handleExportToPdf = async () => {
    if (currentRows.length === 0) return;
    setIsProcessing(true);
    showNotification("info", "جاري إعداد وتصدير جداول البيانات لملف PDF...");

    try {
      const pdfDoc = await PDFDocument.create();
      
      const colsToUse = selectedColumns.length > 0 ? selectedColumns : headerRow.map((_, i) => i);
      const colsCount = colsToUse.length;
      
      // Target landscape for tables with many columns
      const useLandscape = colsCount > 5;
      const pageSize = useLandscape 
        ? [PageSizes.A4[1], PageSizes.A4[0]] as [number, number] 
        : PageSizes.A4;
      
      let page = pdfDoc.addPage(pageSize);
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();

      const tableWidth = pageWidth - 60;
      const colWidth = tableWidth / colsCount;
      const colWidths = Array(colsCount).fill(colWidth);

      // Simple Table Title
      const titlePng = drawExcelRowToPng([`${file?.name || "تقرير جداول عزام"} - ورقة عمل: ${activeSheet}`], [tableWidth], true);
      if (titlePng) {
        const imgBytes = await fetch(titlePng).then(res => res.arrayBuffer());
        const embeddedImg = await pdfDoc.embedPng(imgBytes);
        page.drawImage(embeddedImg, {
          x: 30,
          y: pageHeight - 65,
          width: tableWidth,
          height: 35,
        });
      }

      let currentY = pageHeight - 110;

      // Draw Headers
      const cellsHeader = colsToUse.map(idx => String(headerRow[idx] !== undefined ? headerRow[idx] : `عمود ${idx + 1}`));
      const headerPng = drawExcelRowToPng(cellsHeader, colWidths, true);
      if (headerPng) {
        const imgBytes = await fetch(headerPng).then(res => res.arrayBuffer());
        const embeddedImg = await pdfDoc.embedPng(imgBytes);
        page.drawImage(embeddedImg, {
          x: 30,
          y: currentY,
          width: tableWidth,
          height: 28,
        });
        currentY -= 28;
      }

      // Draw Rows
      for (let rIdx = 0; rIdx < filteredBodyRows.length; rIdx++) {
        if (currentY < 50) {
          page = pdfDoc.addPage(pageSize);
          currentY = pageHeight - 60;
        }

        const row = filteredBodyRows[rIdx];
        const cellsRow = colsToUse.map(idx => String(row[idx] !== undefined ? row[idx] : ""));
        const rowPng = drawExcelRowToPng(cellsRow, colWidths, false);

        if (rowPng) {
          const imgBytes = await fetch(rowPng).then(res => res.arrayBuffer());
          const embeddedImg = await pdfDoc.embedPng(imgBytes);
          page.drawImage(embeddedImg, {
            x: 30,
            y: currentY,
            width: tableWidth,
            height: 25,
          });
          currentY -= 25;
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `تقرير_جداول_${activeSheet}_عزام.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      showNotification("success", "تم تصدير الجدول لملف PDF منسق ومحاذى للغة العربية بنجاح!");
    } catch (err: any) {
      console.error(err);
      showNotification("error", "فشل التصدير لملف PDF: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSheetsData({});
    setSheetNames([]);
    setActiveSheet("");
    setSelectedColumns([]);
    setShowHtmlExport(false);
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

      {/* Upload Zone or Data Workspace */}
      {!file ? (
        <div className="w-full max-w-4xl mx-auto">
          {/* Section Description Card */}
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/30 border border-emerald-100 p-6 rounded-2xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-emerald-900 flex items-center gap-1.5 justify-end">
                <span>مستعرض ومحلل جداول Excel & CSV الذكي</span>
                <Sparkles className="h-4.5 w-4.5 text-emerald-500 animate-pulse" />
              </h3>
              <p className="text-xs font-bold text-emerald-700/80 leading-relaxed">
                ارفع جداول بيانات Excel (.xlsx, .xls) أو ملفات CSV لتصفح الجداول، واستخلاص الأعمدة، وتحويلها إلى كود HTML جاهز، بالإضافة إلى تحويلها وتصديرها كتقارير PDF أنيقة جداً.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-emerald-100/80 shadow-3xs shrink-0">
              <span className="text-[10px] font-black text-emerald-600">FULLY PRIVATE</span>
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          </div>

          {/* Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer ${
              dragActive 
                ? "border-emerald-500 bg-emerald-500/10/50 scale-[1.01]" 
                : "border-white/[0.08] bg-white/[0.04] hover:border-emerald-400 hover:bg-white/[0.02]/30"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            
            <div className="p-4.5 bg-emerald-500/10 rounded-2xl text-emerald-600 mb-4 shadow-3xs">
              <FileSpreadsheet className="h-10 w-10 animate-pulse" />
            </div>

            <h3 className="text-sm font-black text-white mb-1">اسحب ملف Excel أو CSV هنا أو اضغط للتصفح</h3>
            <p className="text-[11px] font-bold text-slate-500">يدعم تنسيق ورقات العمل المتعددة مع الترتيب والبحث فوري</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Workbook control & extraction toolkit (4 cols) */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* Control & Export Card */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 shadow-3xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-white/[0.08]">
                <button
                  onClick={handleReset}
                  className="text-[11px] font-black text-red-500 hover:text-red-600 bg-rose-500/10 hover:bg-red-100/50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  إغلاق الملف
                </button>
                <div className="flex items-center gap-2 text-right">
                  <div>
                    <h4 className="text-xs font-black text-white line-clamp-1 max-w-[150px]">{file.name}</h4>
                    <span className="text-[10px] text-slate-500 font-bold">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Action Operations */}
              <div className="space-y-2">
                <button
                  onClick={handleExportToPdf}
                  disabled={isProcessing}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-3.5 text-xs font-black text-white shadow-md shadow-emerald-500/10 active:scale-98 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>جاري تصدير PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>تصدير الجدول المعروض كـ PDF</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowHtmlExport(!showHtmlExport)}
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold transition-all active:scale-98 cursor-pointer ${
                    showHtmlExport 
                      ? "bg-amber-500/10 border-amber-300 text-amber-800"
                      : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] text-slate-300"
                  }`}
                >
                  <Code className="h-4 w-4" />
                  <span>توليد كود جدول HTML المخصص</span>
                </button>
              </div>
            </div>

            {/* Sheets Switcher Card */}
            {sheetNames.length > 1 && (
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 shadow-3xs space-y-3">
                <h3 className="text-xs font-black text-white pb-2 border-b border-white/[0.08] flex items-center gap-1.5 justify-end">
                  <span>أوراق العمل المتاحة</span>
                  <ArrowRightLeft className="h-4 w-4 text-emerald-500 animate-pulse" />
                </h3>
                <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto safe-scrollbar">
                  {sheetNames.map(name => (
                    <button
                      key={name}
                      onClick={() => {
                        setActiveSheet(name);
                        setSelectedColumns([]);
                      }}
                      className={`w-full text-right px-4.5 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        activeSheet === name 
                          ? "bg-emerald-500/10 border-emerald-200 text-emerald-700 shadow-3xs" 
                          : "bg-transparent border-transparent text-slate-400 hover:bg-white/[0.02]"
                      }`}
                    >
                      📄 {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Column Extraction Card (Interactive Selection) */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 shadow-3xs space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-white/[0.08]">
                <button 
                  onClick={toggleAllColumns}
                  className="text-[10px] font-black text-emerald-600 hover:underline cursor-pointer"
                >
                  {selectedColumns.length === headerRow.length ? "إلغاء الكل" : "تحديد الكل"}
                </button>
                <h3 className="text-xs font-black text-white">تحديد أعمدة مخصصة للاستخراج</h3>
              </div>

              <p className="text-[11px] font-bold text-slate-500">حدد الأعمدة التي تريد تصفيتها وتضمينها فقط في الجدول أو تصدير الـ HTML.</p>

              <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto safe-scrollbar">
                {headerRow.map((col, idx) => {
                  const label = col !== undefined ? String(col) : `عمود ${idx + 1}`;
                  const isSelected = selectedColumns.includes(idx) || selectedColumns.length === 0;

                  return (
                    <button
                      key={idx}
                      onClick={() => toggleColumnSelection(idx)}
                      className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-right transition-all cursor-pointer ${
                        isSelected 
                          ? "border-emerald-200 bg-emerald-500/10/40 text-emerald-800 font-bold" 
                          : "border-white/[0.08] text-slate-500"
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-300 shrink-0" />
                      )}
                      <span className="text-[11px] truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Panel: Rendered Spreadsheet Sheet or HTML Code box (8 cols) */}
          <div className="xl:col-span-8 space-y-6">
            
            {showHtmlExport ? (
              <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyHtml}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl shadow-md cursor-pointer transition-all"
                    >
                      نسخ كود الـ HTML
                    </button>
                    <button
                      onClick={() => setShowHtmlExport(false)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                    >
                      العودة للجدول
                    </button>
                  </div>
                  <h3 className="text-sm font-black text-slate-100">كود جدول HTML المستخرج</h3>
                </div>

                <p className="text-xs text-slate-400 font-bold leading-relaxed">
                  هذا الكود متوافق تماماً مع جميع مواقع الويب ومنسق بأسلوب حديث وسريع الاستجابة. يمكنك نسخه ولصقه في أي صفحة HTML أو محرر ووردبريس.
                </p>

                <pre className="p-4 bg-slate-950 rounded-xl overflow-x-auto text-[11px] font-mono text-emerald-400 max-h-[400px] text-left safe-scrollbar select-all">
                  {generateHtmlTableCode()}
                </pre>
              </div>
            ) : (
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 shadow-3xs space-y-4 flex flex-col">
                
                {/* Search and Metadata row */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-4 border-b border-white/[0.08]">
                  
                  {/* Search grid input */}
                  <div className="relative w-full md:w-80">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="بحث فوري في خلايا الجدول..."
                      className="w-full pr-9 pl-4 py-2.5 text-xs font-bold rounded-xl border border-white/[0.08] bg-white/[0.02]/50 focus:bg-white/[0.04] focus:border-emerald-500 outline-none text-right"
                    />
                    <Search className="absolute right-3 top-3 h-4 w-4 text-slate-500" />
                  </div>

                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <FileCheck className="h-4.5 w-4.5 text-emerald-500 animate-pulse" />
                    <span>مستعرض البيانات: {activeSheet} ({filteredBodyRows.length} صفّ)</span>
                  </h3>
                </div>

                {/* Main Interactive Spreadsheet Grid */}
                <div className="overflow-x-auto max-w-full rounded-xl border border-white/[0.08] shadow-2xs safe-scrollbar max-h-[500px] overflow-y-auto">
                  <table className="w-full text-right border-collapse">
                    <thead className="bg-white/[0.02]/80 sticky top-0 z-10 border-b border-white/[0.08]">
                      <tr>
                        {headerRow.map((col, idx) => {
                          const isSelected = selectedColumns.includes(idx) || selectedColumns.length === 0;
                          if (!isSelected) return null;

                          return (
                            <th 
                              key={idx} 
                              className="px-4 py-3 text-xs font-black text-slate-300 bg-white/[0.05]/90 border border-white/[0.08] select-none min-w-[120px]"
                            >
                              {col !== undefined ? String(col) : `عمود ${idx + 1}`}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBodyRows.length === 0 ? (
                        <tr>
                          <td 
                            colSpan={headerRow.length} 
                            className="px-4 py-12 text-center text-xs font-bold text-slate-500"
                          >
                            لا يوجد نتائج بحث مطابقة.
                          </td>
                        </tr>
                      ) : (
                        filteredBodyRows.map((row, rIdx) => (
                          <tr 
                            key={rIdx} 
                            className="hover:bg-emerald-500/10/15 transition-all even:bg-white/[0.02]/40"
                          >
                            {row.map((cell, cIdx) => {
                              const isSelected = selectedColumns.includes(cIdx) || selectedColumns.length === 0;
                              if (!isSelected) return null;

                              return (
                                <td 
                                  key={cIdx} 
                                  className="px-4 py-2.5 text-xs text-slate-300 font-medium border border-white/[0.08] max-w-[200px] truncate"
                                  title={cell !== undefined ? String(cell) : ""}
                                >
                                  {cell !== undefined ? String(cell) : ""}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};
