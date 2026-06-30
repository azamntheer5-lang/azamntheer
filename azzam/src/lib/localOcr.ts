/**
 * Local (client-side) OCR fallback using Tesseract.js.
 *
 * This is ONLY used when the server-side /api/files/ocr endpoint (Gemini
 * vision) fails completely — e.g. no GEMINI_API_KEY configured, the Gemini
 * API itself is down, or every model in the fallback chain in server.ts
 * errored out. Tesseract's accuracy — especially for Arabic — is generally
 * lower than Gemini's vision model, so this is deliberately a last resort,
 * not the primary path.
 *
 * Lazy-imported (not a top-level import) so the ~2-3MB Tesseract.js core +
 * its WASM binary are never downloaded unless this fallback actually runs.
 * Language traineddata is fetched by Tesseract.js itself from its default
 * CDN the first time each language is used — this one piece is technically
 * not "100% local", but it's still fully client-side (never touches our own
 * server), and is the standard, most reliable way to use Tesseract.js in a
 * browser without vendoring tens of MB of trained-data files into this repo.
 */

// Maps this app's OCR language codes (src/workspaces/OcrWorkspace.tsx) to
// Tesseract's ISO 639-2/T language codes.
const TESSERACT_LANG_MAP: Record<string, string> = {
  ar: "ara",
  en: "eng",
  "ar+en": "ara+eng",
  fr: "fra",
  es: "spa",
  de: "deu",
  tr: "tur",
  auto: "ara+eng", // best general-purpose default for this app's audience
};

export interface LocalOcrProgress {
  status: string;
  progress: number; // 0..1
}

/**
 * Runs OCR entirely in the browser via Tesseract.js. Throws on failure —
 * callers should already be in a fallback path with no further fallback
 * after this, so a thrown error here should be surfaced to the user as-is.
 */
export async function runLocalOcr(
  file: File | Blob,
  language: string,
  onProgress?: (p: LocalOcrProgress) => void
): Promise<string> {
  const tesseractLang = TESSERACT_LANG_MAP[language] || "ara+eng";

  const { createWorker } = await import("tesseract.js");

  onProgress?.({ status: "جاري تحميل محرك التعرف الضوئي المحلي...", progress: 0.05 });

  const worker = await createWorker(tesseractLang, undefined, {
    logger: (m: any) => {
      if (m?.status && typeof m?.progress === "number") {
        const statusLabel =
          m.status === "recognizing text" ? "جاري التعرف على النص محلياً..." :
          m.status === "loading tesseract core" ? "جاري تحميل محرك OCR..." :
          m.status === "initializing tesseract" ? "جاري تهيئة المحرك..." :
          m.status === "loading language traineddata" ? "جاري تحميل بيانات اللغة..." :
          m.status;
        onProgress?.({ status: statusLabel, progress: Math.min(0.95, m.progress) });
      }
    },
  });

  try {
    const { data } = await worker.recognize(file);
    onProgress?.({ status: "اكتمل الاستخراج المحلي", progress: 1 });
    return (data?.text || "").trim();
  } finally {
    // Always release the worker (it spawns a real background thread/WASM
    // instance) regardless of success or failure.
    try { await worker.terminate(); } catch { /* already gone */ }
  }
}
