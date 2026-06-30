import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PDFDocument, degrees, rgb } from "pdf-lib";
import { pdfjsLib, copyBytesForPdfjs } from "../lib/pdfjs";
import {
  Layers, FileText, Camera, FileCode, Image as ImageIcon, Gauge, Lock, Settings,
  ScanLine, RefreshCw, ChevronLeft, Type as TypeIcon, Compass, PenTool, Wand2,
} from "lucide-react";
import { usePdfStore } from "../store/pdfStore";
import { useUIStore } from "../store/uiStore";
import { useHistoryStore } from "../store/historyStore";
import { CloudApiService } from "../services/api";
import { UploadZone } from "../components/UploadZone";
import { VisualOrganize } from "../components/VisualOrganize";
import { InteractiveCanvas } from "../components/InteractiveCanvas";
import { MergeImages } from "../components/MergeImages";
import { CompressionPanel } from "../components/CompressionPanel";
import { SecurityMeta } from "../components/SecurityMeta";
import { PngConverter } from "../components/PngConverter";
import { AiAssistant } from "../components/AiAssistant";
import { TextExtractor } from "../components/TextExtractor";
import { Scanner } from "../components/Scanner";
import { PdfEditor } from "../components/editor/PdfEditor";
import { ProcessingOverlay } from "../components/ui/ProcessingOverlay";
import { drawTextAsPng } from "../lib/dom";
import { downloadBytes, sanitizeFilename } from "../lib/utils";
import { useToast } from "../context/ToastContext";

const TABS = [
  { id: "organize", label: "تنظيم وترتيب", icon: Layers },
  { id: "edit", label: "محرر محتويات", icon: FileText },
  { id: "editor_pro", label: "✨ محرر متقدم", icon: PenTool },
  { id: "scan", label: "ماسح ضوئي ذكي", icon: Camera },
  { id: "text_extract", label: "استخراج النص", icon: FileCode },
  { id: "merge", label: "الدمج والصور", icon: ImageIcon },
  { id: "compress", label: "تحسين الحجم", icon: Gauge },
  { id: "protect", label: "الأمان والبيانات", icon: Lock },
  { id: "convert", label: "تحويل لصور", icon: Settings },
];

const extractFullText = async (bytes: Uint8Array): Promise<string> => {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: copyBytesForPdfjs(bytes) });
    const pdf = await loadingTask.promise;
    let text = "";
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

export const PdfWorkspace: React.FC = () => {
  const doc = usePdfStore((s) => s.doc);
  const updateDoc = usePdfStore((s) => s.updateDoc);
  const setDoc = usePdfStore((s) => s.setDoc);
  const reset = usePdfStore((s) => s.reset);
  const setOriginalSize = usePdfStore((s) => s.setOriginalSize);
  const setCompressedSize = usePdfStore((s) => s.setCompressedSize);
  const setIsLocked = usePdfStore((s) => s.setIsLocked);
  const metadata = usePdfStore((s) => s.metadata);
  const setMetadata = usePdfStore((s) => s.setMetadata);
  const originalSize = usePdfStore((s) => s.originalSize);
  const compressedSize = usePdfStore((s) => s.compressedSize);
  const isLocked = usePdfStore((s) => s.isLocked);

  const [activeTab, setActiveTab] = useState<string>("organize");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showScannerStandalone, setShowScannerStandalone] = useState(false);

  const toast = useToast();
  const addHistory = useHistoryStore((s) => s.addEntry);
  const setActive = useUIStore((s) => s.setActiveWorkspace);

  const startProgress = (status: string) => {
    setIsProcessing(true);
    setProcessingStatus(status);
    setProcessingProgress(0);
  };

  const stopProgress = () => {
    setIsProcessing(false);
    setProcessingStatus("");
    setProcessingProgress(0);
  };

  const handleFileLoaded = useCallback(
    async (file: File) => {
      startProgress("جاري قراءة الملف محلياً (بدون رفع للخادم)...");
      try {
        const result = await CloudApiService.uploadPDF(file, (p) => {
          setProcessingStatus(p.statusText || "جاري المعالجة...");
          setProcessingProgress(p.uploadProgress || p.downloadProgress || 0);
        });
        setDoc({
          bytes: result.bytes,
          name: result.name,
          size: result.size,
          totalPages: result.totalPages,
          extractedText: result.extractedText,
        });
        setMetadata(result.metadata);
        addHistory({
          type: "pdf",
          operation: `رفع وتحليل: ${result.name}`,
          fileName: result.name,
          fileSize: result.size,
          status: "success",
        });
        toast.success(`تم رفع وتحليل ${result.name} بنجاح!`);
      } catch (err: any) {
        // User-friendly error messages based on common failure modes
        const errMsg = err?.message || String(err);
        let userMsg = "خطأ في تحميل الملف";
        if (errMsg.includes("password") || errMsg.includes("encrypt")) {
          userMsg = "هذا PDF محمي بكلمة مرور — أزل الحماية ثم أعد المحاولة";
        } else if (errMsg.includes("memory") || errMsg.includes("allocation") || errMsg.includes("Maximum call stack")) {
          userMsg = "الملف كبير جداً لذاكرة المتصفح — جرّب ملف أصغر";
        } else if (errMsg.toLowerCase().includes("invalid") || errMsg.includes("format")) {
          userMsg = "الملف ليس PDF صالح أو تالف";
        } else if (errMsg.includes("network") || errMsg.includes("fetch")) {
          userMsg = "انقطع الاتصال — تحقق من الإنترنت وحاول مجدداً";
        } else {
          userMsg = "فشل تحميل الملف: " + errMsg;
        }
        toast.error(userMsg);
        addHistory({
          type: "pdf",
          operation: `فشل رفع: ${file.name}`,
          status: "error",
          meta: { error: errMsg },
        });
      } finally {
        stopProgress();
      }
    },
    [setDoc, setMetadata, addHistory, toast]
  );

  // 1. DELETE PAGE
  const handleDeletePage = async (pageNum: number) => {
    if (!doc) return;
    startProgress("جاري حذف الصفحة...");
    try {
      const result = await CloudApiService.processPDFAction(doc.bytes, "delete", { pageNum }, (p) => {
        setProcessingStatus(p.statusText || "جاري المعالجة...");
        setProcessingProgress(p.uploadProgress || p.downloadProgress || 0);
      });
      updateDoc({ bytes: result.bytes, size: result.bytes.byteLength, totalPages: result.totalPages });
      addHistory({ type: "pdf", operation: `حذف صفحة ${pageNum} من ${doc.name}`, status: "success" });
      toast.success("تم حذف الصفحة بنجاح!");
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    } finally {
      stopProgress();
    }
  };

  // 2. ROTATE PAGE
  const handleRotatePage = async (pageNum: number, angle: number) => {
    if (!doc) return;
    startProgress("جاري تدوير الصفحة...");
    try {
      const result = await CloudApiService.processPDFAction(
        doc.bytes,
        "rotate",
        { pageNum, angle },
        (p) => {
          setProcessingStatus(p.statusText || "جاري المعالجة...");
          setProcessingProgress(p.uploadProgress || p.downloadProgress || 0);
        }
      );
      updateDoc({ bytes: result.bytes, size: result.bytes.byteLength });
      addHistory({ type: "pdf", operation: `تدوير صفحة ${pageNum} (${angle}°)`, status: "success" });
      toast.success("تم تدوير الصفحة!");
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    } finally {
      stopProgress();
    }
  };

  // 3. REORDER
  const handleMovePage = async (fromIndex: number, toIndex: number) => {
    if (!doc || !doc.totalPages) return;
    if (toIndex < 0 || toIndex >= doc.totalPages) return;
    startProgress("جاري إعادة الترتيب...");
    try {
      const result = await CloudApiService.processPDFAction(
        doc.bytes,
        "reorder",
        { fromIndex, toIndex, totalPages: doc.totalPages },
        (p) => {
          setProcessingStatus(p.statusText || "جاري المعالجة...");
          setProcessingProgress(p.uploadProgress || p.downloadProgress || 0);
        }
      );
      updateDoc({ bytes: result.bytes, size: result.bytes.byteLength });
      addHistory({ type: "pdf", operation: `إعادة ترتيب الصفحات`, status: "success" });
      toast.success("تم تعديل الترتيب!");
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    } finally {
      stopProgress();
    }
  };

  // 4. REVERSE
  const handleReversePages = async () => {
    if (!doc || !doc.totalPages) return;
    startProgress("جاري عكس الترتيب...");
    try {
      const result = await CloudApiService.processPDFAction(
        doc.bytes,
        "reverse",
        { totalPages: doc.totalPages },
        (p) => {
          setProcessingStatus(p.statusText || "جاري المعالجة...");
          setProcessingProgress(p.uploadProgress || p.downloadProgress || 0);
        }
      );
      updateDoc({ bytes: result.bytes, size: result.bytes.byteLength });
      addHistory({ type: "pdf", operation: "عكس ترتيب الصفحات", status: "success" });
      toast.success("تم عكس الترتيب!");
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    } finally {
      stopProgress();
    }
  };

  // 5. SPLIT
  const handleSplitPdf = async (rangeString: string) => {
    if (!doc || !doc.totalPages) return;
    startProgress("جاري التقسيم...");
    try {
      const result = await CloudApiService.processPDFAction(
        doc.bytes,
        "split",
        { rangeString, totalPages: doc.totalPages },
        (p) => {
          setProcessingStatus(p.statusText || "جاري المعالجة...");
          setProcessingProgress(p.uploadProgress || p.downloadProgress || 0);
        }
      );
      const safeName = sanitizeFilename(doc.name?.replace(/\.pdf$/i, "") || "ملف");
      downloadBytes(result.bytes, `مستخرج_${safeName}_عزام.pdf`, "application/pdf");
      addHistory({ type: "pdf", operation: `تقسيم (${rangeString}) من ${doc.name}`, status: "success" });
      toast.success("تم التقسيم والتنزيل!");
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    } finally {
      stopProgress();
    }
  };

  // 6. TEXT ANNOTATION
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
    if (!doc) return;
    startProgress("جاري إضافة النص...");
    try {
      const dataUrl = drawTextAsPng({
        text, fontSize, colorHex: color, useBg, bgColorHex: bgColor,
        fontFamily, strokeColorHex: strokeColor, useStroke,
      });
      if (!dataUrl) throw new Error("فشل رسم النص");
      const imageBase64 = dataUrl.split(",")[1];

      const tempImg = new Image();
      tempImg.src = dataUrl;
      await new Promise((resolve) => (tempImg.onload = resolve));
      const drawScale = 0.4;
      const drawW = tempImg.width * drawScale;
      const drawH = tempImg.height * drawScale;

      const result = await CloudApiService.processPDFAction(
        doc.bytes,
        "text",
        { imageBase64, pageNum, x, y: y - drawH / 2, width: drawW, height: drawH },
        (p) => {
          setProcessingStatus(p.statusText || "جاري المعالجة...");
          setProcessingProgress(p.uploadProgress || p.downloadProgress || 0);
        }
      );
      updateDoc({ bytes: result.bytes, size: result.bytes.byteLength });
      addHistory({ type: "pdf", operation: `إضافة نص بالصفحة ${pageNum}`, status: "success" });
      toast.success("تمت إضافة النص!");
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    } finally {
      stopProgress();
    }
  };

  // 7. SIGNATURE
  const handleApplySignature = async (
    pageNum: number,
    sigPngBytes: Uint8Array,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    if (!doc) return;
    startProgress("جاري تثبيت التوقيع...");
    try {
      let binary = "";
      const len = sigPngBytes.byteLength;
      for (let i = 0; i < len; i++) binary += String.fromCharCode(sigPngBytes[i]);
      const imageBase64 = btoa(binary);

      const result = await CloudApiService.processPDFAction(
        doc.bytes,
        "signature",
        { imageBase64, pageNum, x, y, width, height },
        (p) => {
          setProcessingStatus(p.statusText || "جاري المعالجة...");
          setProcessingProgress(p.uploadProgress || p.downloadProgress || 0);
        }
      );
      updateDoc({ bytes: result.bytes, size: result.bytes.byteLength });
      addHistory({ type: "pdf", operation: `إضافة توقيع/ختم بالصفحة ${pageNum}`, status: "success" });
      toast.success("تم تثبيت التوقيع!");
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    } finally {
      stopProgress();
    }
  };

  // 8. REDACTION
  const handleApplyRedaction = async (
    words: string[],
    boxColor: string,
    opacity: number,
    replaceText: string,
    replaceTextColor: string,
    replaceTextSize: string
  ) => {
    if (!doc || !doc.totalPages) return;
    startProgress("جاري طمس الكلمات...");
    try {
      const loadingTask = pdfjsLib.getDocument({ data: copyBytesForPdfjs(doc.bytes) });
      const pdf = await loadingTask.promise;
      let totalHits = 0;
      const redactActions: any[] = [];

      for (let pi = 0; pi < doc.totalPages; pi++) {
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
              const boxW = Math.max(item.width || word.length * detectedSize * 0.55, 25);
              const boxH = detectedSize + 4;
              let replacementPngBase64: string | undefined = undefined;
              let repW = 0, repH = 0;
              if (replaceText) {
                const finalSize =
                  replaceTextSize === "auto"
                    ? Math.max(detectedSize * 0.85, 7)
                    : parseFloat(replaceTextSize);
                const replacePngUrl = drawTextAsPng({
                  text: replaceText, fontSize: finalSize, colorHex: replaceTextColor,
                });
                if (replacePngUrl) {
                  replacementPngBase64 = replacePngUrl.split(",")[1];
                  const tempImg = new Image();
                  tempImg.src = replacePngUrl;
                  await new Promise((r) => (tempImg.onload = r));
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
                repH,
              });
              totalHits++;
            }
          }
        }
      }

      if (totalHits === 0) {
        toast.info("لم يتم العثور على مطابقات للكلمات المطلوبة.");
        stopProgress();
        return;
      }

      const result = await CloudApiService.processPDFAction(
        doc.bytes,
        "redact-batch",
        { actions: redactActions, boxColor, opacity },
        (p) => {
          setProcessingStatus(p.statusText || "جاري المعالجة...");
          setProcessingProgress(p.uploadProgress || p.downloadProgress || 0);
        }
      );
      updateDoc({ bytes: result.bytes, size: result.bytes.byteLength });
      addHistory({ type: "pdf", operation: `طمس ${totalHits} موضع في ${doc.name}`, status: "success" });
      toast.success(`تم طمس ${totalHits} موضع!`);
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    } finally {
      stopProgress();
    }
  };

  // 9. WATERMARK
  const handleApplyWatermark = async (text: string, size: number, color: string, opacity: number) => {
    if (!doc) return;
    startProgress("جاري دمج العلامة المائية...");
    try {
      const dataUrl = drawTextAsPng({ text, fontSize: size, colorHex: color });
      if (!dataUrl) throw new Error("فشل رسم العلامة");
      const watermarkPngBase64 = dataUrl.split(",")[1];

      const result = await CloudApiService.processPDFAction(
        doc.bytes,
        "watermark",
        { watermarkPngBase64, opacity },
        (p) => {
          setProcessingStatus(p.statusText || "جاري المعالجة...");
          setProcessingProgress(p.uploadProgress || p.downloadProgress || 0);
        }
      );
      updateDoc({ bytes: result.bytes, size: result.bytes.byteLength });
      addHistory({ type: "pdf", operation: `علامة مائية: "${text}"`, status: "success" });
      toast.success("تمت إضافة العلامة المائية!");
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    } finally {
      stopProgress();
    }
  };

  // 10. PAGE NUMBERS
  const handleApplyPageNumbers = async (pos: string, start: number, size: number, color: string) => {
    if (!doc) return;
    startProgress("جاري ترقيم الصفحات...");
    try {
      const result = await CloudApiService.processPDFAction(
        doc.bytes,
        "page-numbers",
        { format: "arabic", fontColor: color, size, start, pos },
        (p) => {
          setProcessingStatus(p.statusText || "جاري المعالجة...");
          setProcessingProgress(p.uploadProgress || p.downloadProgress || 0);
        }
      );
      updateDoc({ bytes: result.bytes, size: result.bytes.byteLength });
      addHistory({ type: "pdf", operation: `ترقيم الصفحات (${pos}, بدء من ${start})`, status: "success" });
      toast.success("تم ترقيم الصفحات!");
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    } finally {
      stopProgress();
    }
  };

  // 11. MERGE
  const handleMergePdf = async (secondFileBytes: Uint8Array, order: "before" | "after") => {
    if (!doc) return;
    startProgress("جاري دمج الملفات...");
    try {
      let binary = "";
      const len = secondFileBytes.byteLength;
      for (let i = 0; i < len; i++) binary += String.fromCharCode(secondFileBytes[i]);
      const otherPdfBase64 = btoa(binary);

      const result = await CloudApiService.processPDFAction(
        doc.bytes,
        "merge",
        { otherPdfBase64, order },
        (p) => {
          setProcessingStatus(p.statusText || "جاري المعالجة...");
          setProcessingProgress(p.uploadProgress || p.downloadProgress || 0);
        }
      );
      updateDoc({
        bytes: result.bytes,
        size: result.bytes.byteLength,
        totalPages: result.totalPages,
        extractedText: result.extractedText,
      });
      addHistory({ type: "pdf", operation: "دمج مستندين PDF", status: "success" });
      toast.success("تم دمج الملفات!");
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    } finally {
      stopProgress();
    }
  };

  // 12. IMAGE TO PDF
  const handleImageToPdf = async (
    imageBytes: Uint8Array,
    mimeType: string,
    action: "append" | "new"
  ) => {
    startProgress("جاري تحويل الصورة إلى PDF...");
    try {
      let pdfDoc: PDFDocument;
      if (action === "append" && doc) {
        pdfDoc = await PDFDocument.load(doc.bytes, { ignoreEncryption: true });
      } else {
        pdfDoc = await PDFDocument.create();
      }

      let img;
      if (mimeType === "image/png") {
        img = await pdfDoc.embedPng(imageBytes);
      } else {
        img = await pdfDoc.embedJpg(imageBytes);
      }

      const { width: imgW, height: imgH } = img.scale(0.8);
      const page = pdfDoc.addPage([imgW, imgH]);
      page.drawImage(img, { x: 0, y: 0, width: imgW, height: imgH });

      const resultBytes = await pdfDoc.save();

      if (action === "append" && doc) {
        updateDoc({
          bytes: resultBytes,
          size: resultBytes.byteLength,
          totalPages: pdfDoc.getPageCount(),
        });
        const txt = await extractFullText(resultBytes);
        updateDoc({ extractedText: txt });
        addHistory({ type: "pdf", operation: "إضافة صورة كصفحة جديدة", status: "success" });
        toast.success("تم إدراج الصورة كصفحة جديدة!");
      } else {
        const name = `مسح_عزام_الذكي_${new Date().toLocaleDateString("ar-EG").replace(/\//g, "-")}.pdf`;
        setDoc({
          bytes: resultBytes,
          name,
          size: resultBytes.byteLength,
          totalPages: pdfDoc.getPageCount(),
        });
        setShowScannerStandalone(false);
        const txt = await extractFullText(resultBytes);
        updateDoc({ extractedText: txt });
        addHistory({ type: "scan", operation: `تحويل صورة إلى PDF: ${name}`, status: "success" });
        toast.success("تم إنشاء PDF جديد من الصورة!");
      }
    } catch (err: any) {
      toast.error("فشلت معالجة الصورة: " + err.message);
    } finally {
      stopProgress();
    }
  };

  // 12b. APPEND COMPILED SCANNER PDF — replaces the active doc with already-merged bytes
  // (used by Scanner when user clicks "append all scanned pages to current PDF")
  const handleAppendCompiledPdf = async (compiledBytes: Uint8Array) => {
    startProgress("جاري دمج الصفحات الممسوحة...");
    try {
      const pdfDoc = await PDFDocument.load(compiledBytes, { ignoreEncryption: true });
      const totalPages = pdfDoc.getPageCount();
      const txt = await extractFullText(compiledBytes);
      updateDoc({
        bytes: compiledBytes,
        size: compiledBytes.byteLength,
        totalPages,
        extractedText: txt,
      });
      addHistory({
        type: "scan",
        operation: `دمج ${totalPages - (doc?.totalPages || 0)} صفحة ممسوحة إلى ${doc?.name || "المستند"}`,
        status: "success",
      });
      toast.success(`تم دمج ${totalPages - (doc?.totalPages || 0)} صفحة ممسوحة بنجاح!`);
    } catch (err: any) {
      toast.error("فشل الدمج: " + err.message);
    } finally {
      stopProgress();
    }
  };

  // 13. COMPRESS
  const handleCompress = async (level: "light" | "medium" | "aggressive") => {
    if (!doc) return;
    startProgress("جاري ضغط الملف...");
    try {
      const pdfDoc = await PDFDocument.load(doc.bytes, { ignoreEncryption: true });
      let saveOpts: any = { useObjectStreams: true };
      if (level === "medium" || level === "aggressive") {
        pdfDoc.setTitle("");
        pdfDoc.setKeywords([]);
      }
      if (level === "aggressive") {
        try {
          const form = pdfDoc.getForm();
          form.flatten();
        } catch {
          // no form to flatten
        }
      }
      const compressed = await pdfDoc.save(saveOpts);
      setCompressedSize(compressed.byteLength);
      updateDoc({ bytes: compressed, size: compressed.byteLength });
      addHistory({
        type: "pdf",
        operation: `ضغط ${level} ${doc.name} → ${Math.round(compressed.byteLength / 1024)}KB`,
        status: "success",
      });
      toast.success("تم ضغط الملف!");
    } catch (err: any) {
      toast.error("فشل الضغط: " + err.message);
    } finally {
      stopProgress();
    }
  };

  // 14. METADATA
  const handleApplyMetadata = async (meta: {
    title: string;
    author: string;
    subject: string;
    keywords: string;
  }) => {
    if (!doc) return;
    startProgress("جاري حفظ الخصائص...");
    try {
      const result = await CloudApiService.processPDFAction(
        doc.bytes,
        "metadata",
        meta,
        (p) => {
          setProcessingStatus(p.statusText || "جاري المعالجة...");
          setProcessingProgress(p.uploadProgress || p.downloadProgress || 0);
        }
      );
      updateDoc({ bytes: result.bytes, size: result.bytes.byteLength });
      setMetadata(meta);
      addHistory({ type: "pdf", operation: `تحديث خصائص ${doc.name}`, status: "success" });
      toast.success("تم حفظ الخصائص!");
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    } finally {
      stopProgress();
    }
  };

  // 15. PASSWORD — note: this is metadata-only, real encryption requires external libs
  const handleApplyPassword = async (pass: string) => {
    if (!doc) return;
    startProgress("جاري تأمين المستند...");
    try {
      // NOTE: pdf-lib does not support real encryption. Mark with metadata + warn user.
      const pdfDoc = await PDFDocument.load(doc.bytes, { ignoreEncryption: true });
      pdfDoc.setTitle("🔐 محمي بكلمة مرور - Azzam");
      pdfDoc.setProducer(`PROTECTED::${btoa(pass)}::AZZAM`);
      const newBytes = await pdfDoc.save();
      updateDoc({ bytes: newBytes, size: newBytes.byteLength });
      setIsLocked(true);
      addHistory({ type: "pdf", operation: `تأمين ${doc.name} (مستوى منتج)`, status: "success" });
      toast.success("تم وضع علامة الحماية على المستند.");
      toast.info("ملاحظة: التشفير الفعلي يتطلب خادماً. تم وضع علامة حماية قابلة للقراءة في الخصائص.");
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    } finally {
      stopProgress();
    }
  };

  // 16. REMOVE PASSWORD
  const handleRemovePassword = async () => {
    if (!doc) return;
    startProgress("جاري إلغاء التأمين...");
    try {
      const pdfDoc = await PDFDocument.load(doc.bytes, { ignoreEncryption: true });
      pdfDoc.setTitle("");
      pdfDoc.setProducer("Azzam Suite");
      const newBytes = await pdfDoc.save();
      updateDoc({ bytes: newBytes, size: newBytes.byteLength });
      setIsLocked(false);
      addHistory({ type: "pdf", operation: `إلغاء تأمين ${doc.name}`, status: "success" });
      toast.success("تم إلغاء التأمين!");
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    } finally {
      stopProgress();
    }
  };

  // 17. SEARCH & REPLACE
  const handleApplySearchReplace = async (search: string, replace: string) => {
    if (!doc || !doc.totalPages) return;
    startProgress("جاري البحث والاستبدال...");
    try {
      const pdfDoc = await PDFDocument.load(doc.bytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();

      const loadingTask = pdfjsLib.getDocument({ data: copyBytesForPdfjs(doc.bytes) });
      const pdf = await loadingTask.promise;
      let totalHits = 0;

      for (let pi = 0; pi < doc.totalPages; pi++) {
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
            const boxW = Math.max(item.width || search.length * detectedSize * 0.55, 25);
            const boxH = detectedSize + 4;

            page.drawRectangle({ x, y: y - 2, width: boxW, height: boxH, color: rgb(1, 1, 1) });

            if (replace) {
              const textPngUrl = drawTextAsPng({
                text: replace,
                fontSize: detectedSize * 0.9,
                colorHex: "#1a73e8",
              });
              if (textPngUrl) {
                const binStr = atob(textPngUrl.split(",")[1]);
                const textBytes = new Uint8Array(binStr.length);
                for (let i = 0; i < binStr.length; i++) textBytes[i] = binStr.charCodeAt(i);
                const textImg = await pdfDoc.embedPng(textBytes);
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
        toast.info("لم يتم العثور على أي مطابقة.");
      } else {
        const newBytes = await pdfDoc.save();
        updateDoc({ bytes: newBytes, size: newBytes.byteLength });
        addHistory({
          type: "pdf",
          operation: `استبدال "${search}" بـ "${replace}" (${totalHits} موضع)`,
          status: "success",
        });
        toast.success(`تم الاستبدال في ${totalHits} موضع!`);
      }
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    } finally {
      stopProgress();
    }
  };

  const handleDownload = () => {
    if (!doc) return;
    downloadBytes(doc.bytes, (doc.name || "ملف").replace(/\.pdf$/i, "") + "_azzam.pdf", "application/pdf");
    addHistory({ type: "pdf", operation: `تنزيل: ${doc.name}`, status: "success" });
  };

  const handleReset = () => {
    reset();
    setActive("home");
  };

  // RENDER
  if (!doc) {
    return (
      <div className="flex-1 overflow-y-auto safe-scrollbar p-6 flex items-center justify-center relative">
        <ProcessingOverlay
          active={isProcessing}
          status={processingStatus}
          progress={processingProgress}
        />
        {showScannerStandalone ? (
          <div className="w-full max-w-5xl mx-auto space-y-4">
            <div className="flex justify-between items-center glass-card p-4.5 rounded-2xl border border-white/10 text-white shadow-md">
              <button
                onClick={() => setShowScannerStandalone(false)}
                className="px-4.5 py-2 text-xs font-black text-gray-300 bg-white/[0.04]/5 border border-white/10 hover:bg-white/[0.04]/10 rounded-xl cursor-pointer"
              >
                ◀ إلغاء والعودة
              </button>
              <div className="text-right">
                <span className="text-[9px] font-black text-amber-400 tracking-widest uppercase block">
                  AZZAM SCANNER RUNTIME
                </span>
                <h4 className="text-xs font-black text-white">وضع المسح الضوئي المباشر</h4>
              </div>
            </div>
            <Scanner
              pdfBytes={null}
              onImageToPdf={async (imageBytes, mimeType, action) => {
                await handleImageToPdf(imageBytes, mimeType, action);
              }}
              onAppendCompiledPdf={handleAppendCompiledPdf}
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
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div className="flex-1 flex overflow-hidden w-full relative">
        <div className="flex-1 flex flex-col overflow-hidden p-6 gap-6 min-w-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/60 border border-white/10 p-1 rounded-xl shadow-md self-start shrink-0 select-none overflow-x-auto max-w-full">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-500 hover:text-white hover:bg-white/[0.04]/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Metadata bar */}
          <div className="glass-card rounded-2xl p-4.5 flex items-center justify-between border border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-white max-w-md truncate">{doc.name}</span>
              <span className="text-[10px] bg-white/[0.04]/10 text-blue-300 border border-white/10 px-2 py-0.5 rounded-md font-bold">
                {doc.totalPages} صفحات
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="px-3.5 py-1.5 text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 cursor-pointer"
              >
                ملف جديد
              </button>
              <button
                onClick={handleDownload}
                className="px-4.5 py-1.5 text-xs font-black bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl shadow-md cursor-pointer"
              >
                تنزيل الملف
              </button>
            </div>
          </div>

          {/* Canvas + Processing Overlay */}
          <div className="flex-1 overflow-y-auto safe-scrollbar glass-card rounded-2xl p-6 min-h-0 relative">
            <ProcessingOverlay
              active={isProcessing}
              status={processingStatus}
              progress={processingProgress}
            />

            {activeTab === "organize" && (
              <VisualOrganize
                pdfBytes={doc.bytes}
                totalPages={doc.totalPages}
                onDeletePage={handleDeletePage}
                onRotatePage={handleRotatePage}
                onMovePage={handleMovePage}
                onReversePages={handleReversePages}
                onSplitPdf={handleSplitPdf}
                isProcessing={isProcessing}
              />
            )}

            {activeTab === "edit" && (
              <InteractiveCanvas
                pdfBytes={doc.bytes}
                totalPages={doc.totalPages}
                onApplyTextAnnotation={handleApplyTextAnnotation}
                onApplySignature={handleApplySignature}
                onApplyRedaction={handleApplyRedaction}
                onApplyWatermark={handleApplyWatermark}
                onApplyPageNumbers={handleApplyPageNumbers}
                onApplySearchReplace={handleApplySearchReplace}
                isProcessing={isProcessing}
              />
            )}

            {activeTab === "editor_pro" && (
              <PdfEditor
                pdfBytes={doc.bytes}
                totalPages={doc.totalPages}
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
                pdfBytes={doc.bytes}
                onImageToPdf={async (imageBytes, mimeType, action) => {
                  await handleImageToPdf(imageBytes, mimeType, action);
                }}
                onAppendCompiledPdf={handleAppendCompiledPdf}
                isProcessing={isProcessing}
              />
            )}

            {activeTab === "text_extract" && (
              <TextExtractor
                pdfBytes={doc.bytes}
                extractedText={doc.extractedText || ""}
                fileName={doc.name}
                isProcessing={isProcessing}
              />
            )}

            {activeTab === "convert" && (
              <PngConverter
                pdfBytes={doc.bytes}
                totalPages={doc.totalPages}
                fileName={doc.name}
                isProcessing={isProcessing}
                setIsProcessing={(v) => {
                  if (v) startProgress("جاري التحويل...");
                  else stopProgress();
                }}
              />
            )}
          </div>
        </div>

        {/* AI Assistant Drawer */}
        <div className="w-[340px] border-r border-white/5 bg-slate-950/40 backdrop-blur-md flex flex-col shrink-0 p-4 shadow-xl overflow-hidden relative">
          <AiAssistant
            pdfText={doc.extractedText || ""}
            onApplyMetadata={handleApplyMetadata}
            isProcessing={isProcessing}
          />
        </div>
      </div>
    </div>
  );
};
