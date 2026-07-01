/**
 * Local OCR using Tesseract.js — 100% client-side, no API, no limits.
 *
 * Features:
 *  - Supports Arabic + English + 100+ languages
 *  - No file size limit (runs in browser via Web Worker)
 *  - No API key required
 *  - Works offline once language data is cached
 *  - Progressive: downloads language data on first use (~10MB for Arabic)
 *
 * Trade-off: Lower accuracy than Gemini AI for complex layouts, but
 * excellent for clean text documents (printed text, screenshots, scans).
 */

import Tesseract from "tesseract.js";

/** Map our language codes to Tesseract language data codes */
const LANG_MAP: Record<string, string> = {
  ar: "ara",
  en: "eng",
  "ar+en": "ara+eng",
  fr: "fra",
  es: "spa",
  de: "deu",
  tr: "tur",
  auto: "eng", // Tesseract doesn't auto-detect; default to English
};

export interface LocalOcrProgress {
  progress: number; // 0-100
  status: string;
}

/**
 * Extract text from an image File/Blob using Tesseract.js.
 *
 * @param file Image file (PNG, JPG, WebP, etc.)
 * @param language Language code (ar, en, ar+en, fr, es, de, tr, auto)
 * @param onProgress Optional progress callback
 * @returns Extracted text string
 */
export async function ocrImageLocally(
  file: File | Blob,
  language: string = "ar",
  onProgress?: (p: LocalOcrProgress) => void
): Promise<string> {
  const lang = LANG_MAP[language] || "eng";

  onProgress?.({ progress: 5, status: "جاري تحميل بيانات اللغة..." });

  const result = await Tesseract.recognize(file, lang, {
    logger: (m: any) => {
      if (m.status === "recognizing text") {
        const progress = Math.round((m.progress || 0) * 100);
        onProgress?.({ progress, status: `جاري استخراج النص... ${progress}%` });
      } else if (m.status === "loading tesseract core") {
        onProgress?.({ progress: 10, status: "جاري تحميل محرك OCR..." });
      } else if (m.status === "initializing tesseract") {
        onProgress?.({ progress: 20, status: "جاري تهيئة المحرك..." });
      } else if (m.status === "loading language traineddata") {
        const progress = 20 + Math.round((m.progress || 0) * 30);
        onProgress?.({ progress, status: `جاري تحميل بيانات اللغة... ${progress - 20}%` });
      } else if (m.status === "initializing api") {
        onProgress?.({ progress: 55, status: "جاري تجهيز المعالجة..." });
      }
    },
  });

  const text = result?.data?.text || "";

  if (!text.trim()) {
    return "[لم يتم العثور على نص في الصورة]\n\nقد يكون السبب:\n- صورة بدون نص واضح\n- نص غير واضح أو مائل\n- لغة غير مدعومة\n\nجرّب صورة أوضح أو لغة مختلفة.";
  }

  return text.trim();
}

/**
 * Extract text from a PDF file locally using Tesseract.js.
 * Converts each PDF page to an image first (via pdfjs canvas render),
 * then runs OCR on each page.
 *
 * Note: For PDFs with embedded text (not scanned), use extractPdfTextLocally()
 * from OcrWorkspace instead — it's much faster (no OCR needed).
 *
 * @param file PDF file
 * @param language Language code
 * @param onProgress Optional progress callback
 * @returns Extracted text from all pages (joined)
 */
export async function ocrPdfLocally(
  file: File,
  language: string = "ar",
  onProgress?: (p: LocalOcrProgress) => void
): Promise<string> {
  const { pdfjsLib, copyBytesForPdfjs } = await import("./pdfjs");

  onProgress?.({ progress: 5, status: "جاري قراءة ملف PDF..." });

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: copyBytesForPdfjs(bytes) });
  const pdfDoc = await loadingTask.promise;

  const maxPages = Math.min(pdfDoc.numPages, 30); // cap at 30 pages for performance
  const allText: string[] = [];

  for (let i = 1; i <= maxPages; i++) {
    onProgress?.({
      progress: Math.round((i / maxPages) * 100),
      status: `جاري معالجة الصفحة ${i} من ${maxPages}...`,
    });

    const page = await pdfDoc.getPage(i);

    // Render page to canvas at 2x scale for OCR accuracy
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    // White background (PDFs may have transparency)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85);
    });

    // OCR the page
    try {
      const pageText = await ocrImageLocally(blob, language);
      allText.push(`--- صفحة ${i} ---\n${pageText}`);
    } catch (err) {
      console.warn(`OCR failed for page ${i}:`, err);
      allText.push(`--- صفحة ${i} ---\n[فشل استخراج النص من هذه الصفحة]`);
    }

    // Cleanup
    try { page.cleanup(); } catch {}
  }

  try { (pdfDoc as any).destroy?.(); } catch {}

  return allText.join("\n\n") || "[لم يتم العثور على نص في PDF]";
}

/**
 * Check if Tesseract.js is available (browser supports Web Workers).
 */
export function isLocalOcrSupported(): boolean {
  return typeof Worker !== "undefined" && typeof Blob !== "undefined";
}
