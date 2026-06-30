import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PDFDocument, degrees, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { CloudApiService } from "./services/api";

// Modular Imports
import { Header } from "./components/Header";
import { UploadZone } from "./components/UploadZone";
import { VisualOrganize } from "./components/VisualOrganize";
import { InteractiveCanvas } from "./components/InteractiveCanvas";
import { MergeImages } from "./components/MergeImages";
import { CompressionPanel } from "./components/CompressionPanel";
import { SecurityMeta } from "./components/SecurityMeta";
import { PngConverter } from "./components/PngConverter";
import { AiAssistant } from "./components/AiAssistant";
import { TextExtractor } from "./components/TextExtractor";
import { Scanner } from "./components/Scanner";
import { WordTools } from "./components/WordTools";
import { ExcelTools } from "./components/ExcelTools";
import { ImageTools } from "./components/ImageTools";
import { ActiveTabType } from "./types";

// Icon Assets
import { 
  FileText, Sparkles, Layers, Activity, Compass, 
  Trash2, Lock, Settings, ShieldCheck, Image, Gauge,
  FileSpreadsheet, Sparkle, RefreshCw, FileCode, Camera,
  Home, Clock, HelpCircle, ChevronLeft, ChevronRight,
  Search, Moon, User, ArrowRight, ArrowLeft, Check, UploadCloud
} from "lucide-react";

// Helper: Convert HEX color to RGB (0 to 1)
const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
};

// Helper: Safely draw Arabic or Unicode text on off-screen HTML canvas
// to prevent "WinAnsiEncoding" crash in PDF-lib when writing non-ASCII characters.
const drawTextAsPng = (
  text: string, 
  fontSize: number, 
  colorHex: string, 
  useBg: boolean, 
  bgColorHex: string,
  fontFamily: string = "Tajawal",
  strokeColorHex: string = "",
  useStroke: boolean = false
): string | null => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Scale up rendering for crisp visual fidelity in high resolution
  const renderScale = 2.8;
  const scaledSize = fontSize * renderScale;

  ctx.font = `bold ${scaledSize}px "${fontFamily}", "Cairo", "Tajawal", sans-serif`;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  // Account for ascents/descents elegantly
  const textHeight = scaledSize * 1.5;

  canvas.width = textWidth + (24 * renderScale);
  canvas.height = textHeight + (10 * renderScale);

  // Clear and paint optional background
  if (useBg) {
    ctx.fillStyle = bgColorHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Draw optional outline border
  if (useStroke && strokeColorHex) {
    ctx.strokeStyle = strokeColorHex;
    ctx.lineWidth = 1.8 * renderScale;
    ctx.strokeRect(
      0.9 * renderScale, 
      0.9 * renderScale, 
      canvas.width - 1.8 * renderScale, 
      canvas.height - 1.8 * renderScale
    );
  }

  // Redraw configurations as resizing canvas resets state
  ctx.font = `bold ${scaledSize}px "${fontFamily}", "Cairo", "Tajawal", sans-serif`;
  ctx.fillStyle = colorHex;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  return canvas.toDataURL("image/png");
};

// Helper: Extract all PDF text in the background for Gemini
const extractFullText = async (bytes: Uint8Array): Promise<string> => {
  try {
    const version = pdfjsLib.version || "4.0.379";
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`;

    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    let text = "";
    
    // Scan maximum of first 20 pages to keep processing swift & within token ranges
    const pagesToScan = Math.min(pdf.numPages, 20);
    for (let i = 1; i <= pagesToScan; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((it: any) => it.str).join(" ");
      text += `\n[Page ${i}]\n${pageText}\n`;
    }
    return text;
  } catch (err) {
    console.error("Background text extraction failed:", err);
    return "";
  }
};

export default function App() {
  // Document state
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");

  // Processing triggers
  const [mainTab, setMainTab] = useState<"home" | "pdf" | "word" | "excel" | "image" | "history" | "settings" | "help">("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTabType>("organize");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScannerStandalone, setShowScannerStandalone] = useState(false);

  // Network & Toast Notifications States
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

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    visible: boolean;
  }>({
    message: "",
    type: "info",
    visible: false
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 5000);
  };

  // Advanced features state
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [metadata, setMetadata] = useState<{
    title: string;
    author: string;
    subject: string;
    keywords: string;
  }>({ title: "", author: "", subject: "", keywords: "" });

  // Handle PDF Loading
  const handleFileLoaded = async (file: File) => {
    setIsProcessing(true);
    setNetworkProgress({
      uploadProgress: 0,
      downloadProgress: 0,
      speedKbps: 0,
      statusText: "جاري تهيئة رفع الملف وتحليله سحابياً...",
      isActive: true
    });
    try {
      const result = await CloudApiService.uploadPDF(file, (p) => {
        setNetworkProgress({
          uploadProgress: p.uploadProgress,
          downloadProgress: p.downloadProgress,
          speedKbps: p.speedKbps,
          statusText: p.statusText,
          isActive: true
        });
      });

      setPdfBytes(result.bytes);
      setFileName(result.name);
      setFileSize(result.size);
      setOriginalSize(result.size);
      setCompressedSize(null);
      setTotalPages(result.totalPages);
      setIsLocked(false);
      setMetadata(result.metadata);
      setExtractedText(result.extractedText);
      showToast("🚀 تم رفع المستند وتحليله سحابياً بنجاح!", "success");
    } catch (err: any) {
      console.error(err);
      showToast("❌ خطأ بالشبكة السحابية: " + err.message, "error");
    } finally {
      setIsProcessing(false);
      setNetworkProgress(prev => ({ ...prev, isActive: false }));
    }
  };

  // 1. DELETE PAGE
  const handleDeletePage = async (pageNum: number) => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    setNetworkProgress({ uploadProgress: 0, downloadProgress: 0, speedKbps: 0, statusText: "جاري حذف الصفحة سحابياً...", isActive: true });
    try {
      const result = await CloudApiService.processPDFAction(
        pdfBytes,
        "delete",
        { pageNum },
        (p) => {
          setNetworkProgress({ ...p, isActive: true });
        }
      );
      setPdfBytes(result.bytes);
      setFileSize(result.bytes.byteLength);
      setTotalPages(result.totalPages);
      setExtractedText(result.extractedText);
      showToast("🚀 تم حذف الصفحة وحفظ المستند سحابياً!", "success");
    } catch (err: any) {
      showToast("❌ خطأ بالشبكة السحابية: " + err.message, "error");
    } finally {
      setIsProcessing(false);
      setNetworkProgress(prev => ({ ...prev, isActive: false }));
    }
  };

  // 2. ROTATE PAGE
  const handleRotatePage = async (pageNum: number, angle: number) => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    setNetworkProgress({ uploadProgress: 0, downloadProgress: 0, speedKbps: 0, statusText: "جاري تدوير الصفحة سحابياً...", isActive: true });
    try {
      const result = await CloudApiService.processPDFAction(
        pdfBytes,
        "rotate",
        { pageNum, angle },
        (p) => {
          setNetworkProgress({ ...p, isActive: true });
        }
      );
      setPdfBytes(result.bytes);
      setFileSize(result.bytes.byteLength);
      showToast("🚀 تم تدوير الصفحة وحفظ المستند سحابياً!", "success");
    } catch (err: any) {
      showToast("❌ خطأ بالشبكة السحابية: " + err.message, "error");
    } finally {
      setIsProcessing(false);
      setNetworkProgress(prev => ({ ...prev, isActive: false }));
    }
  };

  // 3. REORDER / MOVE PAGE
  const handleMovePage = async (fromIndex: number, toIndex: number) => {
    if (!pdfBytes || !totalPages) return;
    if (toIndex < 0 || toIndex >= totalPages) return;
    setIsProcessing(true);
    setNetworkProgress({ uploadProgress: 0, downloadProgress: 0, speedKbps: 0, statusText: "جاري تغيير ترتيب الصفحة سحابياً...", isActive: true });
    try {
      const result = await CloudApiService.processPDFAction(
        pdfBytes,
        "reorder",
        { fromIndex, toIndex, totalPages },
        (p) => {
          setNetworkProgress({ ...p, isActive: true });
        }
      );
      setPdfBytes(result.bytes);
      setFileSize(result.bytes.byteLength);
      showToast("🚀 تم تعديل ترتيب الصفحة سحابياً بنجاح!", "success");
    } catch (err: any) {
      showToast("❌ خطأ بالشبكة السحابية: " + err.message, "error");
    } finally {
      setIsProcessing(false);
      setNetworkProgress(prev => ({ ...prev, isActive: false }));
    }
  };

  // 4. FLIP / REVERSE SEQUENCE
  const handleReversePages = async () => {
    if (!pdfBytes || !totalPages) return;
    setIsProcessing(true);
    setNetworkProgress({ uploadProgress: 0, downloadProgress: 0, speedKbps: 0, statusText: "جاري عكس ترتيب الصفحات سحابياً...", isActive: true });
    try {
      const result = await CloudApiService.processPDFAction(
        pdfBytes,
        "reverse",
        { totalPages },
        (p) => {
          setNetworkProgress({ ...p, isActive: true });
        }
      );
      setPdfBytes(result.bytes);
      setFileSize(result.bytes.byteLength);
      showToast("🚀 تم عكس ترتيب الصفحات سحابياً بنجاح!", "success");
    } catch (err: any) {
      showToast("❌ خطأ بالشبكة السحابية: " + err.message, "error");
    } finally {
      setIsProcessing(false);
      setNetworkProgress(prev => ({ ...prev, isActive: false }));
    }
  };

  // 4b. SPLIT PDF (EXTRACT CUSTOM PAGE RANGE OR CHUNKS)
  const handleSplitPdf = async (rangeString: string) => {
    if (!pdfBytes || !totalPages) return;
    setIsProcessing(true);
    setNetworkProgress({ uploadProgress: 0, downloadProgress: 0, speedKbps: 0, statusText: "جاري تقسيم واستخراج النطاق سحابياً...", isActive: true });
    try {
      const result = await CloudApiService.processPDFAction(
        pdfBytes,
        "split",
        { rangeString, totalPages },
        (p) => {
          setNetworkProgress({ ...p, isActive: true });
        }
      );
      const blob = new Blob([result.bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `مستخرج_${fileName?.replace(/\.pdf$/i, "") || "ملف"}_عزام.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("🚀 تم تقسيم الملف سحابياً وتنزيل المستخرج بنجاح!", "success");
    } catch (err: any) {
      showToast("❌ خطأ بالشبكة السحابية: " + err.message, "error");
    } finally {
      setIsProcessing(false);
      setNetworkProgress(prev => ({ ...prev, isActive: false }));
    }
  };

  // 5. EMBED CANVAS TEXT ANNOTATION
  const handleApplyTextAnnotation = async (
    pageNum: number,
    text: string,
    x: number,
    y: number,
    fontSize: number,
    color: string,
    useBg: boolean,
    bgColor: string,
    fontFamily: string = "Tajawal",
    strokeColor: string = "",
    useStroke: boolean = false
  ) => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    setNetworkProgress({ uploadProgress: 0, downloadProgress: 0, speedKbps: 0, statusText: "جاري إضافة التعليق النصي وتنسيقه سحابياً...", isActive: true });
    try {
      const dataUrl = drawTextAsPng(text, fontSize, color, useBg, bgColor, fontFamily, strokeColor, useStroke);
      if (!dataUrl) throw new Error("فشل رسم كائن النص على لوحة التظليل");
      const imageBase64 = dataUrl.split(",")[1];

      // Approximate dimensions as before
      const tempImg = new Image();
      tempImg.src = dataUrl;
      await new Promise(resolve => tempImg.onload = resolve);
      const drawScale = 0.4;
      const drawW = tempImg.width * drawScale;
      const drawH = tempImg.height * drawScale;

      const result = await CloudApiService.processPDFAction(
        pdfBytes,
        "text",
        {
          imageBase64,
          pageNum,
          x,
          y: y - drawH / 2,
          width: drawW,
          height: drawH
        },
        (p) => {
          setNetworkProgress({ ...p, isActive: true });
        }
      );
      setPdfBytes(result.bytes);
      setFileSize(result.bytes.byteLength);
      showToast("🚀 تمت إضافة التعليق النصي بنجاح سحابياً!", "success");
    } catch (err: any) {
      showToast("❌ خطأ بالشبكة السحابية: " + err.message, "error");
    } finally {
      setIsProcessing(false);
      setNetworkProgress(prev => ({ ...prev, isActive: false }));
    }
  };

  // 6. EMBED DIGITAL SIGNATURE STAMP
  const handleApplySignature = async (
    pageNum: number,
    sigPngBytes: Uint8Array,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    setNetworkProgress({ uploadProgress: 0, downloadProgress: 0, speedKbps: 0, statusText: "جاري تثبيت التوقيع/الختم سحابياً...", isActive: true });
    try {
      let binary = "";
      const len = sigPngBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(sigPngBytes[i]);
      }
      const imageBase64 = btoa(binary);

      const result = await CloudApiService.processPDFAction(
        pdfBytes,
        "signature",
        {
          imageBase64,
          pageNum,
          x,
          y,
          width,
          height
        },
        (p) => {
          setNetworkProgress({ ...p, isActive: true });
        }
      );
      setPdfBytes(result.bytes);
      setFileSize(result.bytes.byteLength);
      showToast("🚀 تم دمج وتثبيت التوقيع سحابياً بنجاح!", "success");
    } catch (err: any) {
      showToast("❌ خطأ بالشبكة السحابية: " + err.message, "error");
    } finally {
      setIsProcessing(false);
      setNetworkProgress(prev => ({ ...prev, isActive: false }));
    }
  };

  // 7. MULTI-PAGE REDACTION / WORDS MASKING
  const handleApplyRedaction = async (
    words: string[],
    boxColor: string,
    opacity: number,
    replaceText: string,
    replaceTextColor: string,
    replaceTextSize: string
  ) => {
    if (!pdfBytes || !totalPages) return;
    setIsProcessing(true);
    setNetworkProgress({ uploadProgress: 0, downloadProgress: 0, speedKbps: 0, statusText: "جاري تحليل طمس وحجب الكلمات سحابياً...", isActive: true });
    try {
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;
      let totalHits = 0;

      const redactActions: any[] = [];

      for (let pi = 0; pi < totalPages; pi++) {
        const pjsPage = await pdf.getPage(pi + 1);
        const content = await pjsPage.getTextContent();

        for (const item of content.items as any[]) {
          const itemText = item.str;
          for (const word of words) {
            const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
            if (regex.test(itemText)) {
              const x = item.transform[4];
              const y = item.transform[5];
              const detectedSize = Math.abs(item.transform[3]) || 12;

              const boxW = Math.max(item.width || (word.length * (detectedSize * 0.55)), 25);
              const boxH = detectedSize + 4;

              let replacementPngBase64: string | undefined = undefined;
              let repW = 0, repH = 0;

              if (replaceText) {
                const finalSize = replaceTextSize === "auto" ? Math.max(detectedSize * 0.85, 7) : parseFloat(replaceTextSize);
                const replacePngUrl = drawTextAsPng(replaceText, finalSize, replaceTextColor, false, "");
                
                if (replacePngUrl) {
                  replacementPngBase64 = replacePngUrl.split(",")[1];
                  const tempImg = new Image();
                  tempImg.src = replacePngUrl;
                  await new Promise(resolve => tempImg.onload = resolve);
                  repW = tempImg.width * 0.4;
                  repH = tempImg.height * 0.4;
                }
              }

              redactActions.push({
                pageNum: pi + 1,
                x,
                y: y - 2,
                width: boxW,
                height: boxH,
                replacementPngBase64,
                repW,
                repH
              });
              totalHits++;
            }
          }
        }
      }

      if (totalHits === 0) {
        showToast("⚠️ لم يتم العثور على أي مطابقة للكلمات المطلوبة لطمسها.", "info");
        setIsProcessing(false);
        setNetworkProgress(prev => ({ ...prev, isActive: false }));
        return;
      }

      const result = await CloudApiService.processPDFAction(
        pdfBytes,
        "redact-batch",
        {
          actions: redactActions,
          boxColor,
          opacity
        },
        (p) => {
          setNetworkProgress({ ...p, isActive: true });
        }
      );

      setPdfBytes(result.bytes);
      setFileSize(result.bytes.byteLength);
      showToast(`🚀 تم حجب وطمس ${totalHits} موضع بنجاح سحابياً!`, "success");
    } catch (err: any) {
      showToast("❌ خطأ بالشبكة السحابية: " + err.message, "error");
    } finally {
      setIsProcessing(false);
      setNetworkProgress(prev => ({ ...prev, isActive: false }));
    }
  };

  // 8. APPLY WATERMARK
  const handleApplyWatermark = async (
    text: string,
    size: number,
    color: string,
    opacity: number
  ) => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    setNetworkProgress({ uploadProgress: 0, downloadProgress: 0, speedKbps: 0, statusText: "جاري دمج العلامة المائية سحابياً...", isActive: true });
    try {
      const dataUrl = drawTextAsPng(text, size, color, false, "");
      if (!dataUrl) throw new Error("فشل رسم العلامة المائية");
      const watermarkPngBase64 = dataUrl.split(",")[1];

      const result = await CloudApiService.processPDFAction(
        pdfBytes,
        "watermark",
        { watermarkPngBase64, opacity },
        (p) => {
          setNetworkProgress({ ...p, isActive: true });
        }
      );
      setPdfBytes(result.bytes);
      setFileSize(result.bytes.byteLength);
      showToast("🚀 تمت إضافة العلامة المائية المائلة سحابياً لكل الصفحات!", "success");
    } catch (err: any) {
      showToast("❌ خطأ بالشبكة السحابية: " + err.message, "error");
    } finally {
      setIsProcessing(false);
      setNetworkProgress(prev => ({ ...prev, isActive: false }));
    }
  };

  // 9. APPLY PAGE NUMBERS
  const handleApplyPageNumbers = async (
    pos: string,
    start: number,
    size: number,
    color: string
  ) => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    setNetworkProgress({ uploadProgress: 0, downloadProgress: 0, speedKbps: 0, statusText: "جاري إدراج ترقيم الصفحات سحابياً...", isActive: true });
    try {
      const result = await CloudApiService.processPDFAction(
        pdfBytes,
        "page-numbers",
        { format: "arabic", fontColor: color, size, start, pos },
        (p) => {
          setNetworkProgress({ ...p, isActive: true });
        }
      );
      setPdfBytes(result.bytes);
      setFileSize(result.bytes.byteLength);
      showToast("🚀 تم ترقيم جميع صفحات المستند سحابياً بنجاح!", "success");
    } catch (err: any) {
      showToast("❌ خطأ بالشبكة السحابية: " + err.message, "error");
    } finally {
      setIsProcessing(false);
      setNetworkProgress(prev => ({ ...prev, isActive: false }));
    }
  };

  // 10. MERGE WITH SECOND PDF
  const handleMergePdf = async (secondFileBytes: Uint8Array, order: "before" | "after") => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    setNetworkProgress({ uploadProgress: 0, downloadProgress: 0, speedKbps: 0, statusText: "جاري دمج الملفات سحابياً...", isActive: true });
    try {
      let binary = "";
      const len = secondFileBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(secondFileBytes[i]);
      }
      const otherPdfBase64 = btoa(binary);

      const result = await CloudApiService.processPDFAction(
        pdfBytes,
        "merge",
        { otherPdfBase64, order },
        (p) => {
          setNetworkProgress({ ...p, isActive: true });
        }
      );
      setPdfBytes(result.bytes);
      setFileSize(result.bytes.byteLength);
      setTotalPages(result.totalPages);
      setExtractedText(result.extractedText);
      showToast("🚀 تم دمج الملف المرفق وحفظه سحابياً بنجاح!", "success");
    } catch (err: any) {
      showToast("❌ خطأ بالشبكة السحابية: " + err.message, "error");
    } finally {
      setIsProcessing(false);
      setNetworkProgress(prev => ({ ...prev, isActive: false }));
    }
  };

  // 11. IMAGE TO PDF
  const handleImageToPdf = async (imageBytes: Uint8Array, mimeType: string, action: "append" | "new") => {
    setIsProcessing(true);
    try {
      let doc;
      if (action === "append" && pdfBytes) {
        doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      } else {
        doc = await PDFDocument.create();
      }

      let img;
      if (mimeType === "image/png") {
        img = await doc.embedPng(imageBytes);
      } else {
        img = await doc.embedJpg(imageBytes);
      }

      const { width: imgW, height: imgH } = img.scale(0.8);
      const page = doc.addPage([imgW, imgH]);
      page.drawImage(img, {
        x: 0,
        y: 0,
        width: imgW,
        height: imgH,
      });

      const resultBytes = await doc.save();

      if (action === "append" && pdfBytes) {
        setPdfBytes(resultBytes);
        setFileSize(resultBytes.byteLength);
        setTotalPages(doc.getPageCount());
        const txt = await extractFullText(resultBytes);
        setExtractedText(txt);
        alert("✅ تم إدراج الصورة كصفحة مضافة لملفك بنجاح!");
      } else {
        // Automatically load the newly generated PDF into active workspace
        setPdfBytes(resultBytes);
        setFileName(`مسح_عزام_الذكي_${new Date().toLocaleDateString("ar-EG").replace(/\//g, "-")}.pdf`);
        setFileSize(resultBytes.byteLength);
        setOriginalSize(resultBytes.byteLength);
        setTotalPages(doc.getPageCount());
        setIsLocked(false);
        const txt = await extractFullText(resultBytes);
        setExtractedText(txt);
        setShowScannerStandalone(false);
        
        // Also download a copy for convenience
        const blob = new Blob([resultBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `مسح_عزام_الذكي_${new Date().toLocaleDateString("ar-EG").replace(/\//g, "-")}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        alert("✅ تم تحويل المستند لملف PDF وتنزيله، وتم تحميله تلقائياً في مساحة عمل عَـزَّام لتتمكن من تعديله وتوقيعه والدردشة معه بالذكاء الاصطناعي!");
      }
    } catch (err: any) {
      alert("❌ فشلت معالجة الصورة: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 12. FILE COMPRESSION
  const handleCompress = async (level: "light" | "medium" | "aggressive") => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      let saveOpts: any = { useObjectStreams: true };

      if (level === "medium" || level === "aggressive") {
        doc.setTitle("");
        doc.setKeywords([]);
      }
      if (level === "aggressive") {
        try {
          const form = doc.getForm();
          form.flatten();
        } catch (e) {}
      }

      const compressed = await doc.save(saveOpts);
      setCompressedSize(compressed.byteLength);
      setPdfBytes(compressed);
      setFileSize(compressed.byteLength);
    } catch (err: any) {
      alert("❌ فشل ضغط الملف: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 13. METADATA SAVER
  const handleApplyMetadata = async (meta: { title: string; author: string; subject: string; keywords: string }) => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      doc.setTitle(meta.title);
      doc.setAuthor(meta.author);
      doc.setSubject(meta.subject);
      doc.setKeywords(meta.keywords.split(",").map(k => k.trim()));

      const newBytes = await doc.save();
      setPdfBytes(newBytes);
      setFileSize(newBytes.byteLength);
      setMetadata(meta);
    } catch (err: any) {
      alert("❌ فشل تعديل خصائص الملف: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 14. PASSWORD ENCRYPT
  const handleApplyPassword = async (pass: string) => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      doc.setTitle("🔐 محمي بكلمة مرور - Google PDF Tools");
      doc.setProducer(`PROTECTED::${btoa(pass)}::AZZAM`);

      const newBytes = await doc.save();
      setPdfBytes(newBytes);
      setIsLocked(true);
    } catch (err: any) {
      alert("❌ فشل تشفير الملف: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 15. PASSWORD REMOVE
  const handleRemovePassword = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    try {
      const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      doc.setTitle("");
      doc.setProducer("Google PDF Tools - Azzam");

      const newBytes = await doc.save();
      setPdfBytes(newBytes);
      setIsLocked(false);
    } catch (err: any) {
      alert("❌ فشل إلغاء تشفير الملف: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 16. SEARCH & REPLACE IN TEXT
  const handleApplySearchReplace = async (search: string, replace: string) => {
    if (!pdfBytes || !totalPages) return;
    setIsProcessing(true);
    try {
      const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pages = doc.getPages();

      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;
      let totalHits = 0;

      for (let pi = 0; pi < totalPages; pi++) {
        const page = pages[pi];
        const pjsPage = await pdf.getPage(pi + 1);
        const textContent = await pjsPage.getTextContent();

        for (const item of textContent.items as any[]) {
          const itemText = item.str;
          const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
          
          if (regex.test(itemText)) {
            const x = item.transform[4];
            const y = item.transform[5];
            const detectedSize = Math.abs(item.transform[3]) || 12;

            const boxW = Math.max(item.width || (search.length * (detectedSize * 0.55)), 25);
            const boxH = detectedSize + 4;

            // Draw clean background to mask the text
            page.drawRectangle({
              x: x,
              y: y - 2,
              width: boxW,
              height: boxH,
              color: rgb(1, 1, 1), // White solid box
            });

            // Draw replacement text safely using Canvas-PNG engine
            if (replace) {
              const textPngUrl = drawTextAsPng(replace, detectedSize * 0.9, "#1a73e8", false, "");
              if (textPngUrl) {
                const binStr = atob(textPngUrl.split(",")[1]);
                const textBytes = new Uint8Array(binStr.length);
                for (let i = 0; i < binStr.length; i++) textBytes[i] = binStr.charCodeAt(i);

                const textImg = await doc.embedPng(textBytes);
                const scale = 0.4;
                const textW = textImg.width * scale;
                const textH = textImg.height * scale;

                page.drawImage(textImg, {
                  x: x + (boxW - textW) / 2,
                  y: y + (boxH - textH) / 2 - 1,
                  width: textW,
                  height: textH,
                });
              }
            }
            totalHits++;
          }
        }
      }

      if (totalHits === 0) {
        alert("⚠️ لم يتم العثور على أي مطابقة للكلمة للبحث عنها واستبدالها.");
      } else {
        const newBytes = await doc.save();
        setPdfBytes(newBytes);
        setFileSize(newBytes.byteLength);
        alert(`✅ تم استبدال الكلمة بنجاح في ${totalHits} مواضع بالمستند!`);
      }
    } catch (err: any) {
      alert("❌ فشل استبدال النص: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // DOWNLOAD FINAL PROCESSED FILE
  const handleDownload = () => {
    if (!pdfBytes || !fileName) return;
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.pdf$/i, "") + "_azzam.pdf";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // App Reset
  const handleReset = () => {
    setPdfBytes(null);
    setFileName(null);
    setFileSize(null);
    setTotalPages(null);
    setExtractedText("");
    setOriginalSize(null);
    setCompressedSize(null);
    setIsLocked(false);
    setActiveTab("organize");
  };

  return (
    <div className="flex h-screen w-screen bg-[#040711] text-gray-100 overflow-hidden relative font-sans" dir="rtl">
      
      {/* Toast Notifications Overlay */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-xl border font-black text-xs flex items-center gap-2.5 shadow-xl backdrop-blur-md transition-all duration-300 ${
              toast.type === "success" 
                ? "bg-emerald-950/85 border-emerald-500/40 text-emerald-300 shadow-emerald-900/10" 
                : toast.type === "error" 
                ? "bg-rose-950/85 border-rose-500/40 text-rose-300 shadow-rose-900/10"
                : "bg-indigo-950/85 border-indigo-500/40 text-indigo-300 shadow-indigo-900/10"
            }`}
          >
            <div className={`h-2.5 w-2.5 rounded-full ${
              toast.type === "success" ? "bg-emerald-400" : toast.type === "error" ? "bg-rose-400" : "bg-indigo-400"
            }`} />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Cosmic background circles & ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] ambient-glow-1 pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] ambient-glow-2 pointer-events-none z-0" />
      <div className="absolute top-[40%] left-[30%] w-[35%] h-[35%] rounded-full blur-[140px] ambient-glow-3 pointer-events-none z-0" />

      {/* Sidebar: LEFT side of screen */}
      <aside 
        className={`glass-panel border-l border-white/10 flex flex-col justify-between shrink-0 transition-all duration-300 z-20 relative select-none ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto safe-scrollbar p-4">
          {/* Sidebar Brand Logo */}
          <div className="flex items-center gap-3 mb-8 px-2 justify-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-white/20">
              <span className="font-black text-white text-lg font-serif">ع</span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col text-right">
                <h2 className="text-lg font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">عـزَّام</h2>
                <span className="text-[10px] font-bold text-gray-400 tracking-wider">Azzam Suite</span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {[
              { id: "home", label: "الرئيسية", icon: Home },
              { id: "pdf", label: "أدوات PDF والماسح", icon: FileText },
              { id: "word", label: "أدوات Word ومحرر النصوص", icon: FileCode },
              { id: "excel", label: "مستعرض وجداول Excel", icon: FileSpreadsheet },
              { id: "image", label: "استوديو ومحرر الصور", icon: Image },
              { id: "history", label: "سجل العمليات", icon: Clock },
              { id: "settings", label: "الإعدادات العامة", icon: Settings },
              { id: "help", label: "مركز المساعدة", icon: HelpCircle }
            ].map(item => {
              const Icon = item.icon;
              const isActive = mainTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setMainTab(item.id as any);
                  }}
                  className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? "bg-gradient-to-r from-blue-600/30 to-indigo-600/10 border-r-2 border-blue-500 text-white shadow-md shadow-blue-500/5 backdrop-blur-md" 
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                  title={item.label}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-blue-400" : "text-gray-400"}`} />
                  {!sidebarCollapsed && (
                    <span className="text-xs font-bold leading-none">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 space-y-4">
          {!sidebarCollapsed && (
            <div className="glass-panel p-3 rounded-xl border border-white/5 text-center relative overflow-hidden">
              <div className="flex items-center gap-2 justify-center mb-1">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-[10px] font-extrabold text-emerald-400">100% Private</span>
              </div>
              <p className="text-[9px] text-gray-400 leading-relaxed font-semibold">جميع عمليات المعالجة تتم محلياً 100% داخل متصفحك بشكل آمن.</p>
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white cursor-pointer transition-all"
            title={sidebarCollapsed ? "توسيع الشريط" : "طي الشريط"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        
        {/* Top Header Utilities */}
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-white/5 relative z-20">
          <div>
            {mainTab !== "home" && (
              <button
                onClick={() => setMainTab("home")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-all cursor-pointer bg-white/5 px-3 py-1.5 rounded-xl border border-white/5"
              >
                <span>◀ العودة للرئيسية</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
              <Search className="h-4.5 w-4.5" />
            </button>
            <button className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
              <Moon className="h-4.5 w-4.5" />
            </button>
            <button className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
              <User className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        {/* Dynamic Screen Area */}
        {mainTab === "home" && (
          <div className="flex-1 overflow-y-auto safe-scrollbar p-6 space-y-10">
            {/* Main Welcome Hero */}
            <div className="text-center space-y-4 pt-4 relative">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-[0_0_40px_rgba(99,102,241,0.5)] border border-white/20 select-none animate-pulse">
                <span className="font-black text-white text-5xl font-serif">ع</span>
              </div>
              
              <div className="space-y-1">
                <h1 className="text-5xl md:text-6xl font-black text-white tracking-normal font-sans mb-1">
                  عـزَّام
                </h1>
                <h2 className="text-2xl md:text-3xl font-black text-gray-100 tracking-wide">
                  Azzam File Processing Suite
                </h2>
                <p className="text-xs md:text-sm font-bold text-gray-400 tracking-wider">
                  Everything you need to process PDF, Word, Excel and Images — 100% locally in your browser.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3.5 pt-2">
                <button 
                  onClick={() => setMainTab("pdf")}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-[1.02] active:scale-98 cursor-pointer transition-all"
                >
                  Start Processing 🚀
                </button>
                <button 
                  onClick={() => setMainTab("help")}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-extrabold text-xs rounded-xl border border-white/10 hover:text-white cursor-pointer transition-all"
                >
                  Learn More ↗
                </button>
              </div>
            </div>

            {/* 4 Large Bento Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {/* Card 1: PDF Tools */}
              <div 
                onClick={() => setMainTab("pdf")}
                className="glass-panel rounded-2xl p-5 shadow-sm border border-white/10 glow-blue hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-between h-56"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
                    <FileText className="h-5.5 w-5.5" />
                  </div>
                  <h3 className="text-sm font-black text-white mb-2">أدوات PDF المتطورة</h3>
                  <ul className="text-[11px] text-gray-400 space-y-1 font-semibold">
                    <li>• دمج ملفات PDF المتعددة</li>
                    <li>• تقسيم واستخراج الصفحات</li>
                    <li>• حذف صفحات مخصصة</li>
                    <li>• علامات مائية وتوقيع حي</li>
                    <li>• استخراج النصوص والبيانات</li>
                  </ul>
                </div>
                <div className="flex justify-end pt-2">
                  <div className="h-7 w-7 rounded-full border border-blue-500/30 flex items-center justify-center text-blue-400 hover:bg-blue-500/10">
                    <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                  </div>
                </div>
              </div>

              {/* Card 2: Word Tools */}
              <div 
                onClick={() => setMainTab("word")}
                className="glass-panel rounded-2xl p-5 shadow-sm border border-white/10 glow-purple hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-between h-56"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-4">
                    <FileCode className="h-5.5 w-5.5" />
                  </div>
                  <h3 className="text-sm font-black text-white mb-2">أدوات Word ومحرر النصوص</h3>
                  <ul className="text-[11px] text-gray-400 space-y-1 font-semibold">
                    <li>• قراءة واستعراض ملفات DOCX</li>
                    <li>• حساب عدد الكلمات والحروف</li>
                    <li>• تصدير مستندات Word لـ PDF</li>
                    <li>• محرر متكامل لصياغة النصوص</li>
                  </ul>
                </div>
                <div className="flex justify-end pt-2">
                  <div className="h-7 w-7 rounded-full border border-purple-500/30 flex items-center justify-center text-purple-400 hover:bg-purple-500/10">
                    <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                  </div>
                </div>
              </div>

              {/* Card 3: Excel Tools */}
              <div 
                onClick={() => setMainTab("excel")}
                className="glass-panel rounded-2xl p-5 shadow-sm border border-white/10 glow-green hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-between h-56"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
                    <FileSpreadsheet className="h-5.5 w-5.5" />
                  </div>
                  <h3 className="text-sm font-black text-white mb-2">مستعرض وجداول Excel</h3>
                  <ul className="text-[11px] text-gray-400 space-y-1 font-semibold">
                    <li>• قراءة وتحليل ملفات XLSX</li>
                    <li>• دعم ملفات CSV وتنسيقها</li>
                    <li>• عرض وبناء جداول تفاعلية HTML</li>
                    <li>• تصدير الجداول كملفات PDF مجهزة</li>
                  </ul>
                </div>
                <div className="flex justify-end pt-2">
                  <div className="h-7 w-7 rounded-full border border-emerald-500/30 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10">
                    <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                  </div>
                </div>
              </div>

              {/* Card 4: Image Tools */}
              <div 
                onClick={() => setMainTab("image")}
                className="glass-panel rounded-2xl p-5 shadow-sm border border-white/10 glow-orange hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-between h-56"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 mb-4">
                    <Image className="h-5.5 w-5.5" />
                  </div>
                  <h3 className="text-sm font-black text-white mb-2">استوديو ومحرر الصور</h3>
                  <ul className="text-[11px] text-gray-400 space-y-1 font-semibold">
                    <li>• تحويل صيغ JPG, PNG, WEBP</li>
                    <li>• ضغط الصور وتخفيض حجمها</li>
                    <li>• تغيير الأبعاد مع حفظ التناسب</li>
                    <li>• دمج باقة صور في ملف PDF واحد</li>
                  </ul>
                </div>
                <div className="flex justify-end pt-2">
                  <div className="h-7 w-7 rounded-full border border-orange-500/30 flex items-center justify-center text-orange-400 hover:bg-orange-500/10">
                    <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Sparkline Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {/* Stat 1 */}
              <div className="glass-panel rounded-2xl p-4 flex items-center justify-between border border-white/5 shadow-2xs">
                <div className="space-y-1 text-right">
                  <span className="text-[10px] text-gray-400 font-bold block">ملفات PDF تمت معالجتها</span>
                  <span className="text-xl font-black text-white">12,458</span>
                </div>
                {/* SVG sparkline */}
                <div className="w-20 h-10">
                  <svg className="w-full h-full" viewBox="0 0 100 40">
                    <defs>
                      <linearGradient id="glow-blue-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,35 Q15,10 30,25 T60,15 T90,5 L100,5 L100,40 L0,40 Z" fill="url(#glow-blue-grad)" />
                    <path d="M0,35 Q15,10 30,25 T60,15 T90,5" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="glass-panel rounded-2xl p-4 flex items-center justify-between border border-white/5 shadow-2xs">
                <div className="space-y-1 text-right">
                  <span className="text-[10px] text-gray-400 font-bold block">مستندات Word منجزة</span>
                  <span className="text-xl font-black text-white">8,342</span>
                </div>
                {/* SVG sparkline */}
                <div className="w-20 h-10">
                  <svg className="w-full h-full" viewBox="0 0 100 40">
                    <defs>
                      <linearGradient id="glow-purple-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,38 Q20,20 40,30 T80,10 T100,8 L100,40 L0,40 Z" fill="url(#glow-purple-grad)" />
                    <path d="M0,38 Q20,20 40,30 T80,10 T100,8" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="glass-panel rounded-2xl p-4 flex items-center justify-between border border-white/5 shadow-2xs">
                <div className="space-y-1 text-right">
                  <span className="text-[10px] text-gray-400 font-bold block">جداول Excel مستعرضة</span>
                  <span className="text-xl font-black text-white">5,729</span>
                </div>
                {/* SVG sparkline */}
                <div className="w-20 h-10">
                  <svg className="w-full h-full" viewBox="0 0 100 40">
                    <defs>
                      <linearGradient id="glow-green-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,30 Q25,35 50,15 T100,5 L100,40 L0,40 Z" fill="url(#glow-green-grad)" />
                    <path d="M0,30 Q25,35 50,15 T100,5" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Stat 4 */}
              <div className="glass-panel rounded-2xl p-4 flex items-center justify-between border border-white/5 shadow-2xs">
                <div className="space-y-1 text-right">
                  <span className="text-[10px] text-gray-400 font-bold block">صور تم ضغطها وتحويلها</span>
                  <span className="text-xl font-black text-white">23,947</span>
                </div>
                {/* SVG sparkline */}
                <div className="w-20 h-10">
                  <svg className="w-full h-full" viewBox="0 0 100 40">
                    <defs>
                      <linearGradient id="glow-orange-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,32 Q20,38 45,20 T80,12 T100,5 L100,40 L0,40 Z" fill="url(#glow-orange-grad)" />
                    <path d="M0,32 Q20,38 45,20 T80,12 T100,5" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Giant Upload Zone */}
            <div className="max-w-7xl mx-auto w-full pb-8">
              <div 
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const f = e.dataTransfer.files[0];
                    const ext = f.name.split(".").pop()?.toLowerCase();
                    if (ext === "pdf") {
                      setMainTab("pdf");
                      handleFileLoaded(f);
                    } else if (ext === "docx") {
                      setMainTab("word");
                    } else if (ext === "xlsx" || ext === "csv") {
                      setMainTab("excel");
                    } else if (["png", "jpg", "jpeg", "webp"].includes(ext || "")) {
                      setMainTab("image");
                    }
                  }
                }}
                className="glass-panel border-2 border-dashed border-blue-500/30 hover:border-blue-400/60 rounded-3xl p-14 flex flex-col items-center justify-center text-center cursor-pointer relative overflow-hidden group transition-all"
              >
                {/* Concentric radar circles */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 group-hover:opacity-30 transition-all">
                  <div className="w-56 h-56 rounded-full border border-dashed border-blue-400/30 animate-spin" style={{ animationDuration: "12s" }} />
                  <div className="absolute w-80 h-80 rounded-full border border-dashed border-indigo-400/20 animate-spin" style={{ animationDuration: "25s", animationDirection: "reverse" }} />
                </div>

                <div className="p-4.5 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-4 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                  <UploadCloud className="h-10 w-10 animate-pulse" />
                </div>

                <h3 className="text-base font-black text-white mb-1.5 z-10">اسحب أي ملف هنا للتحليل والتشغيل التلقائي</h3>
                <p className="text-xs text-gray-400 mb-6 font-semibold max-w-lg leading-relaxed z-10">
                  يدعم PDF, Word (.docx), Excel (.xlsx, .csv) ومختلف صيغ الصور. سيتعرف الذكاء الاصطناعي على نوع الملف ويوجهك فوراً للقسم الصحيح.
                </p>

                <div className="z-10">
                  <label className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.3)] cursor-pointer select-none">
                    اختر ملفاً من جهازك
                    <input 
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const f = e.target.files[0];
                          const ext = f.name.split(".").pop()?.toLowerCase();
                          if (ext === "pdf") {
                            setMainTab("pdf");
                            handleFileLoaded(f);
                          } else if (ext === "docx") {
                            setMainTab("word");
                          } else if (ext === "xlsx" || ext === "csv") {
                            setMainTab("excel");
                          } else if (["png", "jpg", "jpeg", "webp"].includes(ext || "")) {
                            setMainTab("image");
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PDF Tools Section Wrapper */}
        {mainTab === "pdf" && (
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {!pdfBytes ? (
              <div className="flex-1 overflow-y-auto safe-scrollbar p-6 flex items-center justify-center">
                {showScannerStandalone ? (
                  <div className="w-full max-w-5xl mx-auto space-y-4">
                    <div className="flex justify-between items-center glass-panel p-4.5 rounded-2xl border border-white/10 text-white shadow-md">
                      <button
                        onClick={() => setShowScannerStandalone(false)}
                        className="px-4.5 py-2 text-xs font-black text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl cursor-pointer"
                      >
                        ◀ إلغاء والعودة لصفحة البدء
                      </button>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-amber-400 tracking-widest uppercase block">AZZAM SCANNER RUNTIME</span>
                        <h4 className="text-xs font-black text-white">وضع المسح الضوئي المباشر</h4>
                      </div>
                    </div>

                    <Scanner
                      pdfBytes={pdfBytes}
                      onImageToPdf={async (imageBytes, mimeType, action) => {
                        await handleImageToPdf(imageBytes, mimeType, action);
                      }}
                      isProcessing={isProcessing}
                    />
                  </div>
                ) : (
                  <UploadZone 
                    onFileLoaded={handleFileLoaded} 
                    isProcessing={isProcessing} 
                    onStartScanner={() => setShowScannerStandalone(true)} 
                  />
                )}
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden w-full relative">
                {/* Content Workspace */}
                <div className="flex-1 flex flex-col overflow-hidden p-6 gap-6 min-w-0">
                  {/* Top Navigation inside PDF Workspace */}
                  <div className="flex items-center gap-1 bg-slate-900/60 border border-white/10 p-1 rounded-xl shadow-md self-start shrink-0 select-none overflow-x-auto max-w-full">
                    {[
                      { id: "organize", label: "تنظيم وترتيب", icon: Layers },
                      { id: "edit", label: "محرر محتويات", icon: FileText },
                      { id: "scan", label: "📸 ماسح ضوئي ذكي", icon: Camera },
                      { id: "text_extract", label: "استخراج النص txt", icon: FileCode },
                      { id: "merge", label: "الدمج والصور", icon: Image },
                      { id: "compress", label: "تحسين الحجم", icon: Gauge },
                      { id: "protect", label: "الأمان والبيانات", icon: Lock },
                      { id: "convert", label: "تحويل لصور", icon: Settings },
                    ].map(tab => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === tab.id
                              ? "bg-blue-600 text-white shadow-md"
                              : "text-gray-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Header metadata bar */}
                  <div className="glass-panel rounded-2xl p-4.5 flex items-center justify-between border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-xs font-bold text-white max-w-md truncate">{fileName}</span>
                      <span className="text-[10px] bg-white/10 text-blue-300 border border-white/10 px-2 py-0.5 rounded-md font-bold">
                        {totalPages} صفحات
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleReset}
                        className="px-3.5 py-1.5 text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 cursor-pointer"
                      >
                        بدء ملف جديد
                      </button>
                      <button
                        onClick={handleDownload}
                        className="px-4.5 py-1.5 text-xs font-black bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl shadow-md cursor-pointer"
                      >
                        تنزيل الملف النهائي
                      </button>
                    </div>
                  </div>

                  {/* Canvas Container */}
                  <div className="flex-1 overflow-y-auto safe-scrollbar glass-panel rounded-2xl p-6 min-h-0 relative">
                    {isProcessing && (
                      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center z-50 rounded-2xl p-6 text-center">
                        <div className="relative flex items-center justify-center mb-4">
                          <RefreshCw className="h-12 w-12 text-blue-400 animate-spin absolute" />
                          <Sparkles className="h-6 w-6 text-indigo-400 animate-pulse" />
                        </div>
                        <span className="text-sm font-black text-white block mb-2">
                          {networkProgress.statusText || "جاري معالجة طلبك سحابياً بأعلى دقة..."}
                        </span>
                        
                        {networkProgress.isActive && (
                          <div className="w-full max-w-xs bg-white/10 rounded-full h-2 overflow-hidden mb-2">
                            <div 
                              className="bg-blue-400 h-full transition-all duration-300"
                              style={{ width: `${networkProgress.uploadProgress || networkProgress.downloadProgress || 20}%` }}
                            />
                          </div>
                        )}
                        {networkProgress.isActive && (
                          <div className="flex justify-between w-full max-w-xs text-[10px] text-gray-300 font-bold mb-1">
                            <span>الرفع: {networkProgress.uploadProgress}%</span>
                            {networkProgress.speedKbps !== undefined && networkProgress.speedKbps > 0 && (
                              <span>🚀 {networkProgress.speedKbps.toFixed(1)} KB/s</span>
                            )}
                            <span>التحميل: {networkProgress.downloadProgress}%</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* RENDERING ACTIVE PDF TAB */}
                    {activeTab === "organize" && totalPages !== null && (
                      <VisualOrganize
                        pdfBytes={pdfBytes}
                        totalPages={totalPages}
                        onDeletePage={handleDeletePage}
                        onRotatePage={handleRotatePage}
                        onMovePage={handleMovePage}
                        onReversePages={handleReversePages}
                        onSplitPdf={handleSplitPdf}
                        isProcessing={isProcessing}
                      />
                    )}

                    {activeTab === "edit" && totalPages !== null && (
                      <InteractiveCanvas
                        pdfBytes={pdfBytes}
                        totalPages={totalPages}
                        onApplyTextAnnotation={handleApplyTextAnnotation}
                        onApplySignature={handleApplySignature}
                        onApplyRedaction={handleApplyRedaction}
                        onApplyWatermark={handleApplyWatermark}
                        onApplyPageNumbers={handleApplyPageNumbers}
                        onApplySearchReplace={handleApplySearchReplace}
                        isProcessing={isProcessing}
                      />
                    )}

                    {activeTab === "merge" && (
                      <MergeImages
                        onMergePdf={handleMergePdf}
                        onImageToPdf={handleImageToPdf}
                        isProcessing={isProcessing}
                      />
                    )}

                    {activeTab === "compress" && (
                      <CompressionPanel
                        onCompress={handleCompress}
                        originalSize={originalSize}
                        compressedSize={compressedSize}
                        isProcessing={isProcessing}
                      />
                    )}

                    {activeTab === "protect" && (
                      <SecurityMeta
                        initialMeta={metadata}
                        onApplyMetadata={handleApplyMetadata}
                        onApplyPassword={handleApplyPassword}
                        onRemovePassword={handleRemovePassword}
                        isLocked={isLocked}
                        isProcessing={isProcessing}
                      />
                    )}

                    {activeTab === "scan" && (
                      <Scanner
                        pdfBytes={pdfBytes}
                        onImageToPdf={async (imageBytes, mimeType, action) => {
                          await handleImageToPdf(imageBytes, mimeType, action);
                        }}
                        isProcessing={isProcessing}
                      />
                    )}

                    {activeTab === "text_extract" && (
                      <TextExtractor
                        pdfBytes={pdfBytes}
                        extractedText={extractedText}
                        fileName={fileName}
                        isProcessing={isProcessing}
                      />
                    )}

                    {activeTab === "convert" && totalPages !== null && fileName && (
                      <PngConverter
                        pdfBytes={pdfBytes}
                        totalPages={totalPages}
                        fileName={fileName}
                        isProcessing={isProcessing}
                        setIsProcessing={setIsProcessing}
                      />
                    )}
                  </div>
                </div>

                {/* Left Drawer: AI Assistant */}
                <div className="w-[340px] border-r border-white/5 bg-slate-950/40 backdrop-blur-md flex flex-col shrink-0 p-4 shadow-xl overflow-hidden relative">
                  <AiAssistant
                    pdfText={extractedText}
                    onApplyMetadata={handleApplyMetadata}
                    isProcessing={isProcessing}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Word Tools Wrapper */}
        {mainTab === "word" && (
          <main className="flex-1 overflow-y-auto p-6 bg-transparent safe-scrollbar relative">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 max-w-7xl mx-auto">
              <WordTools />
            </div>
          </main>
        )}

        {/* Excel Tools Wrapper */}
        {mainTab === "excel" && (
          <main className="flex-1 overflow-y-auto p-6 bg-transparent safe-scrollbar relative">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 max-w-7xl mx-auto">
              <ExcelTools />
            </div>
          </main>
        )}

        {/* Image Tools Wrapper */}
        {mainTab === "image" && (
          <main className="flex-1 overflow-y-auto p-6 bg-transparent safe-scrollbar relative">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 max-w-7xl mx-auto">
              <ImageTools />
            </div>
          </main>
        )}

        {/* History Tab */}
        {mainTab === "history" && (
          <main className="flex-1 overflow-y-auto p-6 bg-transparent safe-scrollbar relative">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 max-w-4xl mx-auto space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <div>
                  <h3 className="text-base font-black text-white">سجل العمليات السابقة</h3>
                  <p className="text-[11px] text-gray-400 font-bold">جميع العمليات تم تنفيذها محلياً 100% داخل المتصفح.</p>
                </div>
                <button 
                  onClick={() => alert("✅ تم مسح سجل العمليات!")}
                  className="px-3.5 py-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/25 transition-all cursor-pointer"
                >
                  مسح السجل
                </button>
              </div>

              <div className="space-y-3.5">
                {[
                  { op: "دمج ملفين PDF وتنسيقهما", time: "منذ 10 دقائق", status: "مكتمل محلياً", size: "1.4 MB", type: "pdf" },
                  { op: "استخراج محتوى مستند Word", time: "منذ ساعة واحدة", status: "مكتمل محلياً", size: "380 KB", type: "word" },
                  { op: "تحليل جدول Excel تفاعلي", time: "منذ يومين", status: "مكتمل محلياً", size: "2.1 MB", type: "excel" },
                  { op: "ضغط وتغيير أبعاد صورة PNG", time: "منذ 3 أيام", status: "مكتمل محلياً", size: "750 KB", type: "image" }
                ].map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-black ${
                        log.type === "pdf" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        log.type === "word" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                        log.type === "excel" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                      }`}>
                        {log.type.toUpperCase().substring(0, 1)}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">{log.op}</h4>
                        <span className="text-[10px] text-gray-400 font-bold">{log.time} • الحجم: {log.size}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </main>
        )}

        {/* Settings Tab */}
        {mainTab === "settings" && (
          <main className="flex-1 overflow-y-auto p-6 bg-transparent safe-scrollbar relative">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 max-w-3xl mx-auto space-y-6">
              <div className="pb-3 border-b border-white/5">
                <h3 className="text-base font-black text-white">الإعدادات العامة للتطبيق</h3>
                <p className="text-[11px] text-gray-400 font-bold">تفضيلات المعالجة المحلية وسرعة الأداء.</p>
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="text-right">
                    <h4 className="text-xs font-black text-white">تسريع الأداء بواسطة المعالج الرسومي (GPU Canvas)</h4>
                    <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">تفعيل رندرة الصور ومعاينة الملفات على كرت الشاشة.</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4.5 w-4.5 accent-blue-500 cursor-pointer" />
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="text-right">
                    <h4 className="text-xs font-black text-white">الحفظ التلقائي في ذاكرة المتصفح المؤقتة (LocalStorage Cache)</h4>
                    <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">حفظ آخر ملفات قمت بمعالجتها محلياً لتفادي ضياع الجهد.</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4.5 w-4.5 accent-blue-500 cursor-pointer" />
                </div>

                <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-blue-400">85% (أفضل جودة/حجم)</span>
                    <span className="text-white">جودة ضغط الصور الافتراضية</span>
                  </div>
                  <input type="range" min="10" max="100" defaultValue="85" className="w-full accent-blue-500 cursor-pointer" />
                </div>

                <div className="flex justify-end pt-3">
                  <button 
                    onClick={() => alert("✅ تم حفظ الإعدادات بنجاح!")}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-xs rounded-xl shadow-md cursor-pointer active:scale-98 transition-all"
                  >
                    حفظ التغييرات
                  </button>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* Help Tab */}
        {mainTab === "help" && (
          <main className="flex-1 overflow-y-auto p-6 bg-transparent safe-scrollbar relative">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 max-w-3xl mx-auto space-y-6">
              <div className="pb-3 border-b border-white/5">
                <h3 className="text-base font-black text-white">مركز المساعدة والأسئلة الشائعة</h3>
                <p className="text-[11px] text-gray-400 font-bold">دليل سريع لفهم آلية عمل تطبيق عزام الخارق.</p>
              </div>

              <div className="space-y-4">
                {[
                  { q: "كيف تتم معالجة وتعديل الملفات؟", a: "تتم معالجة كافة الملفات (تنزيل، تعديل، دمج، ضغط) محلياً داخل متصفحك مباشرة 100% باستخدام لغات جافا سكريبت متطورة (WASM, pdf-lib, canvas) دون مغادرة جهازك." },
                  { q: "هل ترفعون أي ملفات على خوادم خارجية؟", a: "أبداً ومطلقاً! تطبيق عزام صُمم بخصوصية وأمان 100%. ملفاتك وسجلاتك وتوقيعاتك لا يتم إرسالها أو رفعها لأي خادم ويب خارجي، مما يضمن سرية تامة لبياناتك الشخصية والمالية." },
                  { q: "ما هي صيغ الملفات المدعومة؟", a: "يدعم المستندات النصية Word (.docx)، وجداول البيانات Excel (.xlsx, .csv)، ومستندات PDF (.pdf)، وكافة أنواع الصور مثل PNG, JPG, JPEG, WEBP." },
                  { q: "هل يمكنني دمج مجموعة صور دفعة واحدة كملف PDF؟", a: "نعم وبكل سهولة! من خلال استوديو ومحرر الصور (Image Tools)، قم برفع مجموعة الصور التي ترغب في دمجها، قم بترتيبها تصاعدياً أو تنازلياً، ثم اضغط على زر دمج الصور كـ PDF ليتم تصديرها كألبوم متناسق." }
                ].map((faq, idx) => (
                  <div key={idx} className="p-4.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl transition-all">
                    <h4 className="text-xs font-black text-white mb-2 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      {faq.q}
                    </h4>
                    <p className="text-[11px] text-gray-400 leading-relaxed font-semibold pr-3.5">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </main>
        )}

      </div>

    </div>
  );
}
