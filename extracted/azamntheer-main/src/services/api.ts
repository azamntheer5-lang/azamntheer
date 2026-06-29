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
   * 1. PDF Upload & Analysis
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
    onProgress({ uploadProgress: 0, downloadProgress: 0, statusText: "جاري تجهيز وتحويل الملف..." });
    const fileBase64 = await fileToBase64(file);
    
    const payload = {
      fileBase64,
      fileName: file.name
    };

    const result = await makeProgressRequest("/api/files/pdf/upload-analyze", "POST", payload, onProgress);
    
    // Convert base64 response back to Uint8Array
    const binStr = atob(result.pdfBase64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }

    return {
      bytes,
      name: file.name,
      size: file.size,
      totalPages: result.totalPages,
      metadata: result.metadata,
      extractedText: result.extractedText
    };
  },

  /**
   * 2. Process specific PDF actions on the server
   */
  async processPDFAction(
    pdfBytes: Uint8Array,
    action: string,
    params: any,
    onProgress: ProgressCallback
  ): Promise<{ bytes: Uint8Array; totalPages: number; extractedText: string }> {
    // Generate a quick binary chunk base64
    let binary = "";
    const len = pdfBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(pdfBytes[i]);
    }
    const pdfBase64 = btoa(binary);

    const payload = {
      pdfBase64,
      action,
      params
    };

    const result = await makeProgressRequest("/api/files/pdf/process-action", "POST", payload, onProgress);

    const binStr = atob(result.pdfBase64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }

    return {
      bytes,
      totalPages: result.totalPages,
      extractedText: result.extractedText
    };
  },

  /**
   * 3. OCR (Image / Scan) Cloud processing using Gemini AI Vision
   */
  async ocrImageCloud(
    file: File,
    languageOrOnProgress?: string | ProgressCallback,
    maybeOnProgress?: ProgressCallback
  ): Promise<{ text: string }> {
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
    const fileBase64 = await fileToBase64(file);

    const payload = {
      fileBase64,
      fileName: file.name,
      language
    };

    return await makeProgressRequest("/api/files/ocr", "POST", payload, onProgress);
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
