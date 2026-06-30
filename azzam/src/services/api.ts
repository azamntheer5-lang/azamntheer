/**
 * Azzam File Processing Suite - Cloud API Service
 * Handles server-side/API-driven processing with progress monitoring.
 */

export interface NetworkProgress {
  uploadProgress: number;
  downloadProgress: number;
  speedKbps?: number;
  statusText?: string;
}

export type ProgressCallback = (progress: NetworkProgress) => void;

/**
 * Error codes uploadPDF() can throw, attached as `.code` on the Error.
 * Callers can switch on `.code` for reliable categorization instead of
 * fragile string-matching on `.message` (which breaks easily — e.g. browser
 * out-of-memory errors don't reliably contain the word "memory" in every
 * browser/locale). `.message` is still a sensible Arabic fallback for any
 * caller that hasn't been updated to check `.code` yet.
 */
export type UploadPdfErrorCode =
  | "EMPTY_FILE"
  | "READ_FAILED"
  | "MODULE_LOAD_FAILED"
  | "UNREADABLE_PDF"
  | "TIMEOUT";

export class UploadPdfError extends Error {
  code: UploadPdfErrorCode;
  constructor(code: UploadPdfErrorCode, message: string) {
    super(message);
    this.name = "UploadPdfError";
    this.code = code;
  }
}

/** Rejects with a UploadPdfError("TIMEOUT", ...) if `promise` doesn't settle within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new UploadPdfError("TIMEOUT", `استغرقت عملية "${label}" وقتاً طويلاً جداً (أكثر من ${Math.round(ms / 1000)} ثانية). قد يكون الملف كبيراً جداً أو تالفاً.`));
    }, ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

/**
 * Helper to convert a File or Blob to a base64 string
 */
function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Custom helper to perform AJAX requests with upload & download progress support.
 */
function makeProgressRequest(
  url: string,
  method: "POST" | "GET",
  data: any,
  onProgress: ProgressCallback
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.responseType = "json";

    const startTime = Date.now();

    // Track upload progress
    if (xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const uploadProgress = Math.round((event.loaded / event.total) * 100);
          const duration = (Date.now() - startTime) / 1000;
          const speedKbps = duration > 0 ? Math.round((event.loaded / 1024) / duration) : 0;
          onProgress({
            uploadProgress,
            downloadProgress: 0,
            speedKbps,
            statusText: `جاري رفع البيانات السحابية... ${uploadProgress}%`
          });
        }
      };
    }

    // Track download progress
    xhr.onprogress = (event) => {
      if (event.lengthComputable) {
        const downloadProgress = Math.round((event.loaded / event.total) * 100);
        const duration = (Date.now() - startTime) / 1000;
        const speedKbps = duration > 0 ? Math.round((event.loaded / 1024) / duration) : 0;
        onProgress({
          uploadProgress: 100,
          downloadProgress,
          speedKbps,
          statusText: `جاري تحميل النتائج المعالجة... ${downloadProgress}%`
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress({ uploadProgress: 100, downloadProgress: 100, statusText: "اكتملت المعالجة بنجاح!" });
        resolve(xhr.response);
      } else {
        const errMsg = xhr.response?.error || `فشل في الاتصال بالخادم (رمز الحالة: ${xhr.status})`;
        reject(new Error(errMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error("انقطع الاتصال بالإنترنت أو فشل الوصول إلى الخادم. يرجى التحقق من الشبكة."));
    };

    xhr.ontimeout = () => {
      reject(new Error("انتهت مهلة الانتظار المقررة للاستجابة من الخادم (Timeout)."));
    };

    // Set timeout of 120 seconds for large files
    xhr.timeout = 120000;

    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(data));
  });
}

export const CloudApiService = {
  /**
   * 1. PDF Upload & Analysis — 100% LOCAL processing (no server upload)
   *
   * Why local: The original server-side flow base64-encoded the file and POSTed it
   * to /api/files/pdf/upload-analyze. This broke for files >~30MB because:
   *   - Base64 adds ~33% overhead (47MB file → ~63MB payload)
   *   - Render's free tier reverse proxy (Cloudflare + Render router) rejects
   *     bodies larger than ~50MB with HTTP 413 (Request Entity Too Large)
   *   - Express's `express.json({ limit: "50mb" })` would also reject it
   *
   * Solution: All PDF analysis (page count, metadata, text extraction) is now
   * performed in-browser using pdf-lib (already bundled) and pdfjs-dist
   * (already vendored). No network round-trip = no 413, no size limit beyond
   * the user's available RAM.
   */
  async uploadPDF(
    file: File,
    onProgress: ProgressCallback
  ): Promise<{
    bytes: Uint8Array;
    name: string;
    size: number;
    totalPages: number;
    metadata: { title: string; author: string; subject: string; keywords: string };
    extractedText: string;
  }> {
    if (!file || file.size === 0) {
      throw new UploadPdfError("EMPTY_FILE", "الملف فارغ أو غير صالح — اختر ملف PDF حقيقي.");
    }

    onProgress({ uploadProgress: 10, downloadProgress: 0, statusText: "جاري قراءة الملف محلياً..." });

    // Read file as ArrayBuffer — fully local, no upload. Wrapped in a
    // timeout: on some Android devices a corrupt file picker result or a
    // file picked from a flaky cloud-storage provider can hang here forever
    // instead of erroring, which used to just spin the progress bar forever.
    let bytes: Uint8Array;
    try {
      const arrayBuffer = await withTimeout(file.arrayBuffer(), 30_000, "قراءة الملف");
      bytes = new Uint8Array(arrayBuffer);
    } catch (e: any) {
      if (e instanceof UploadPdfError) throw e;
      throw new UploadPdfError("READ_FAILED", "تعذّرت قراءة الملف من الجهاز. جرّب اختيار الملف مرة أخرى.");
    }

    onProgress({ uploadProgress: 40, downloadProgress: 0, statusText: "جاري تحليل بنية PDF..." });

    // Use pdf-lib for metadata + page count (already bundled, runs in-browser).
    // The dynamic import itself is the step most likely to fail if a stale
    // Service Worker is serving an old/missing chunk for this module — give
    // that scenario its own specific message instead of a generic crash.
    let totalPages = 0;
    let metadata = { title: "", author: "", subject: "", keywords: "" };
    let pdfLibFailure: unknown = null;
    try {
      const { PDFDocument } = await withTimeout(import("pdf-lib"), 20_000, "تحميل أدوات معالجة PDF");
      try {
        const doc = await withTimeout(
          PDFDocument.load(bytes, { ignoreEncryption: true }),
          25_000,
          "تحليل بنية PDF"
        );
        totalPages = doc.getPageCount();
        metadata = {
          title: doc.getTitle() || "",
          author: doc.getAuthor() || "",
          subject: doc.getSubject() || "",
          keywords: doc.getKeywords() || "",
        };
      } catch (e) {
        // pdf-lib couldn't parse it (encrypted with a real password, unusual
        // structure, etc.) — non-fatal, pdfjs gets a turn below.
        pdfLibFailure = e;
        console.warn("[uploadPDF] pdf-lib load failed, falling back to pdfjs:", e);
      }
    } catch (e) {
      // The import() itself failed — almost always a network/cache problem.
      pdfLibFailure = e;
      console.warn("[uploadPDF] pdf-lib module failed to load, falling back to pdfjs only:", e);
    }

    onProgress({ uploadProgress: 70, downloadProgress: 0, statusText: "جاري استخراج النص..." });

    // Use pdfjs-dist (already vendored locally via src/lib/pdfjs.ts) for text
    // extraction, AND as the fallback source of truth for totalPages if
    // pdf-lib couldn't determine it above.
    let extractedText = "";
    let pdfjsFailure: unknown = null;
    try {
      const { copyBytesForPdfjs, pdfjsLib } = await withTimeout(
        import("../lib/pdfjs"),
        20_000,
        "تحميل أدوات قراءة PDF"
      );
      const loadingTask = pdfjsLib.getDocument({ data: copyBytesForPdfjs(bytes) });
      const pdfDoc = await withTimeout(loadingTask.promise, 25_000, "تحليل بنية PDF (المسار البديل)");

      if (totalPages === 0) totalPages = pdfDoc.numPages;

      // Cap extraction at first 50 pages to keep UI responsive on huge files
      const pagesToExtract = Math.min(totalPages || pdfDoc.numPages, 50);
      const parts: string[] = [];
      for (let i = 1; i <= pagesToExtract; i++) {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => (typeof item.str === "string" ? item.str : ""))
          .join(" ");
        parts.push(pageText);
      }
      extractedText = parts.join("\n\n");
    } catch (e) {
      pdfjsFailure = e;
      console.warn("[uploadPDF] pdfjs text extraction failed:", e);
      // Non-fatal BY ITSELF — text extraction is optional. Whether the
      // overall upload fails depends on whether we got a page count at all
      // (checked right below), not on this step alone.
      extractedText = "";
    }

    // If NEITHER engine could even determine a page count, this isn't a
    // usable PDF. The old behavior silently returned { totalPages: 0,
    // extractedText: "" } as if the upload had succeeded, which is worse
    // than an error — the user would see an empty, broken document with no
    // explanation. Fail loudly and specifically instead.
    if (totalPages === 0) {
      console.error("[uploadPDF] both pdf-lib and pdfjs failed to read this file", {
        pdfLibFailure,
        pdfjsFailure,
      });
      throw new UploadPdfError(
        "UNREADABLE_PDF",
        "تعذّرت قراءة هذا الملف كـ PDF صالح. قد يكون تالفاً، أو محمياً بتشفير غير مدعوم، أو ليس ملف PDF فعلياً — جرّب ملفاً آخر."
      );
    }

    onProgress({ uploadProgress: 100, downloadProgress: 100, statusText: "اكتملت المعالجة بنجاح!" });

    return {
      bytes,
      name: file.name,
      size: file.size,
      totalPages,
      metadata,
      extractedText,
    };
  },

  /**
   * 2. Process specific PDF actions — 100% LOCAL (no server upload)
   *
   * Original server-side flow had the same 413 problem as uploadPDF for large
   * files. Now all operations run in-browser via pdf-lib:
   *   - delete: remove a page
   *   - rotate: rotate a page (90/180/270 degrees)
   *   - reorder: rearrange page order
   *   - reverse: reverse page order
   *   - split: extract a page range into a new PDF
   *   - compress: re-save with compressed streams
   *   - merge: combine multiple PDFs
   *   - metadata: update title/author/subject/keywords
   *   - countPages: just return page count
   */
  async processPDFAction(
    pdfBytes: Uint8Array,
    action: string,
    params: any,
    onProgress: ProgressCallback
  ): Promise<{ bytes: Uint8Array; totalPages: number; extractedText: string }> {
    onProgress({ uploadProgress: 20, downloadProgress: 0, statusText: `جاري تنفيذ: ${action}...` });

    const { PDFDocument, degrees, rgb } = await import("pdf-lib");

    // pdf-lib can mutate in place, but we load fresh to avoid detachment issues
    const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    let resultBytes = pdfBytes;
    let totalPages = doc.getPageCount();

    switch (action) {
      case "delete": {
        const pageNum = Number(params?.pageNum);
        if (pageNum >= 1 && pageNum <= totalPages) {
          doc.removePage(pageNum - 1);
          totalPages = doc.getPageCount();
        }
        break;
      }
      case "rotate": {
        const pageNum = Number(params?.pageNum);
        const angle = Number(params?.angle) || 90;
        const pages = pageNum ? [doc.getPage(pageNum - 1)] : doc.getPages();
        pages.forEach(p => {
          const current = p.getRotation().angle;
          p.setRotation(degrees((current + angle) % 360));
        });
        break;
      }
      case "reorder": {
        const newOrder: number[] = params?.newOrder || [];
        if (newOrder.length === totalPages) {
          // pdf-lib doesn't have direct reorder; copy pages in new order
          const newDoc = await PDFDocument.create();
          for (const idx of newOrder) {
            const [copied] = await newDoc.copyPages(doc, [idx - 1]);
            newDoc.addPage(copied);
          }
          const saved = await newDoc.save();
          resultBytes = saved as Uint8Array;
          totalPages = newDoc.getPageCount();
          onProgress({ uploadProgress: 90, downloadProgress: 0, statusText: "اكتمل إعادة الترتيب" });
          onProgress({ uploadProgress: 100, downloadProgress: 100, statusText: "اكتملت المعالجة بنجاح!" });
          return { bytes: resultBytes, totalPages, extractedText: "" };
        }
        break;
      }
      case "reverse": {
        const newDoc = await PDFDocument.create();
        for (let i = totalPages - 1; i >= 0; i--) {
          const [copied] = await newDoc.copyPages(doc, [i]);
          newDoc.addPage(copied);
        }
        const saved = await newDoc.save();
        resultBytes = saved as Uint8Array;
        onProgress({ uploadProgress: 100, downloadProgress: 100, statusText: "اكتملت المعالجة بنجاح!" });
        return { bytes: resultBytes, totalPages: newDoc.getPageCount(), extractedText: "" };
      }
      case "split": {
        const from = Number(params?.from) || 1;
        const to = Number(params?.to) || totalPages;
        const newDoc = await PDFDocument.create();
        const pageIndices: number[] = [];
        for (let i = from; i <= Math.min(to, totalPages); i++) pageIndices.push(i - 1);
        const copied = await newDoc.copyPages(doc, pageIndices);
        copied.forEach(p => newDoc.addPage(p));
        const saved = await newDoc.save();
        resultBytes = saved as Uint8Array;
        onProgress({ uploadProgress: 100, downloadProgress: 100, statusText: "اكتمل التقسيم" });
        return { bytes: resultBytes, totalPages: newDoc.getPageCount(), extractedText: "" };
      }
      case "compress": {
        // Re-save with object streams and compressed xref
        const saved = await doc.save({ useObjectStreams: true });
        resultBytes = saved as Uint8Array;
        break;
      }
      case "merge": {
        const additionalBytes: Uint8Array[] = params?.additionalBytes || [];
        for (const src of additionalBytes) {
          const srcDoc = await PDFDocument.load(src, { ignoreEncryption: true });
          const copied = await doc.copyPages(srcDoc, srcDoc.getPageIndices());
          copied.forEach(p => doc.addPage(p));
        }
        const saved = await doc.save();
        resultBytes = saved as Uint8Array;
        totalPages = doc.getPageCount();
        break;
      }
      case "metadata": {
        if (params?.title !== undefined) doc.setTitle(params.title);
        if (params?.author !== undefined) doc.setAuthor(params.author);
        if (params?.subject !== undefined) doc.setSubject(params.subject);
        if (params?.keywords !== undefined) doc.setKeywords(params.keywords);
        const saved = await doc.save();
        resultBytes = saved as Uint8Array;
        break;
      }
      case "countPages": {
        // No mutation needed
        onProgress({ uploadProgress: 100, downloadProgress: 100, statusText: "اكتمل" });
        return { bytes: pdfBytes, totalPages, extractedText: "" };
      }
    }

    // If we mutated doc but didn't save yet (delete/rotate/metadata/compress already saved above
    // except delete which removes a page without save — let's save it here)
    if (action === "delete" || action === "rotate") {
      const saved = await doc.save();
      resultBytes = saved as Uint8Array;
    }

    onProgress({ uploadProgress: 100, downloadProgress: 100, statusText: "اكتملت المعالجة بنجاح!" });

    return {
      bytes: resultBytes,
      totalPages,
      extractedText: "",
    };
  },

  /**
   * 3. OCR (Image / Scan) Cloud processing using Gemini AI Vision, with an
   * automatic client-side fallback to Tesseract.js (see src/lib/localOcr.ts)
   * if the server call fails completely — no API key configured, Gemini
   * down, rate-limited, or every model in server.ts's fallback chain failed.
   * This means OCR keeps working (at reduced accuracy) even if the Gemini
   * side of things is having a bad day, instead of leaving the user with
   * nothing.
   */
  async ocrImageCloud(
    file: File,
    languageOrOnProgress?: string | ProgressCallback,
    maybeOnProgress?: ProgressCallback
  ): Promise<{ text: string; source?: "gemini" | "tesseract-local" }> {
    let language = "ar";
    let onProgress: ProgressCallback = () => {};

    if (typeof languageOrOnProgress === "function") {
      onProgress = languageOrOnProgress;
    } else {
      if (languageOrOnProgress) {
        language = languageOrOnProgress;
      }
      if (maybeOnProgress) {
        onProgress = maybeOnProgress;
      }
    }

    onProgress({ uploadProgress: 0, downloadProgress: 0, statusText: "جاري رفع الصورة سحابياً للـ OCR..." });

    try {
      const fileBase64 = await fileToBase64(file);
      const payload = { fileBase64, fileName: file.name, language };
      const result = await makeProgressRequest("/api/files/ocr", "POST", payload, onProgress);
      return { ...result, source: "gemini" };
    } catch (serverError) {
      console.warn("[ocrImageCloud] server OCR failed, falling back to local Tesseract.js:", serverError);
      onProgress({
        uploadProgress: 50,
        downloadProgress: 0,
        statusText: "تعذّر الوصول لخادم OCR — جاري المحاولة محلياً في المتصفح (دقة أقل)...",
      });

      try {
        const { runLocalOcr } = await import("../lib/localOcr");
        const text = await runLocalOcr(file, language, (p) => {
          onProgress({
            uploadProgress: 50 + Math.round(p.progress * 50),
            downloadProgress: 0,
            statusText: p.status,
          });
        });
        return {
          text: text || "[لم يُعثر على نص — جرّب صورة أوضح]",
          source: "tesseract-local",
        };
      } catch (localError) {
        console.error("[ocrImageCloud] local OCR fallback also failed:", localError);
        // Surface the ORIGINAL server error — it's usually more actionable
        // (e.g. "API key missing") than a generic Tesseract failure.
        throw serverError;
      }
    }
  },

  /**
   * 4. Word (DOCX/DOC) Cloud parsing and metadata analysis
   */
  async processWordCloud(
    file: File,
    action: string,
    onProgress: ProgressCallback
  ): Promise<{
    text: string;
    html: string;
    wordCount: number;
    charCount: number;
    paraCount: number;
  }> {
    onProgress({ uploadProgress: 0, downloadProgress: 0, statusText: "جاري تجهيز مستند Word..." });
    const fileBase64 = await fileToBase64(file);

    const payload = {
      fileBase64,
      fileName: file.name,
      action
    };

    return await makeProgressRequest("/api/files/word/convert", "POST", payload, onProgress);
  },

  async convertWord(
    file: File,
    onProgress: ProgressCallback
  ): Promise<{
    text: string;
    html: string;
    wordCount: number;
    charCount: number;
    paraCount: number;
  }> {
    return this.processWordCloud(file, "all", onProgress);
  },

  /**
   * 5. Excel (XLSX/CSV) Cloud processing
   */
  async processExcelCloud(
    file: File,
    action: string,
    onProgress: ProgressCallback
  ): Promise<{
    sheets: { name: string; rows: any[][] }[];
    sheetNames: string[];
    summary: { rowsCount: number; colsCount: number; sheetsCount: number; stats?: any };
  }> {
    onProgress({ uploadProgress: 0, downloadProgress: 0, statusText: "جاري قراءة ورقة Excel سحابياً..." });
    const fileBase64 = await fileToBase64(file);

    const payload = {
      fileBase64,
      fileName: file.name,
      action
    };

    const result = await makeProgressRequest("/api/files/excel/process", "POST", payload, onProgress);
    const sheetNames = (result.sheets || []).map((s: any) => s.name);
    return {
      sheets: result.sheets || [],
      sheetNames,
      summary: result.summary
    };
  },

  async processExcel(
    file: File,
    onProgress: ProgressCallback
  ): Promise<{
    sheets: { name: string; rows: any[][] }[];
    sheetNames: string[];
    summary: { rowsCount: number; colsCount: number; sheetsCount: number; stats?: any };
  }> {
    return this.processExcelCloud(file, "all", onProgress);
  },

  /**
   * 6. Image Cloud Convert & Resize
   */
  async convertImageCloud(
    file: File,
    targetFormat: string,
    options: { quality?: number; width?: number; height?: number; filter?: string },
    onProgress: ProgressCallback
  ): Promise<{ blob: Blob; url: string }> {
    onProgress({ uploadProgress: 0, downloadProgress: 0, statusText: "جاري تحويل وتعديل الصورة..." });
    const fileBase64 = await fileToBase64(file);

    const payload = {
      fileBase64,
      fileName: file.name,
      targetFormat,
      options
    };

    const result = await makeProgressRequest("/api/files/image/convert", "POST", payload, onProgress);
    
    const binStr = atob(result.fileBase64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }

    const mime = `image/${targetFormat.toLowerCase()}`;
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);

    return { blob, url };
  },

  async convertImage(
    file: File,
    format: "png" | "jpeg" | "webp",
    quality: number,
    width: number,
    height: number,
    onProgress: ProgressCallback
  ): Promise<{ bytes: Uint8Array }> {
    const result = await this.convertImageCloud(
      file,
      format,
      { quality, width, height },
      onProgress
    );
    const arrayBuffer = await result.blob.arrayBuffer();
    return { bytes: new Uint8Array(arrayBuffer) };
  }
};
