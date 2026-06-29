/**
 * Centralized PDF.js setup.
 *
 * Vite handles `?url` imports by emitting the asset and giving us a stable
 * URL at runtime — this means the worker is bundled with our app, served
 * from our own origin, and never loaded from a CDN. Achieves true 100%
 * offline / privacy-friendly behavior.
 */
import * as pdfjsLib from "pdfjs-dist";
// Vite-specific: emits the worker as a separate asset and returns its URL.
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

let initialized = false;

export function setupPdfjs(): void {
  if (initialized) return;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  initialized = true;
}

// Auto-initialize on first import.
setupPdfjs();

/**
 * Returns a fresh Uint8Array copy of `bytes`. Use this whenever you need to
 * pass bytes to pdfjs.getDocument() — pdfjs transfers (detaches) the
 * underlying ArrayBuffer to its worker, so the original bytes become
 * unusable afterwards. Always pass a copy to keep the source intact for
 * subsequent operations.
 */
export function copyBytesForPdfjs(bytes: Uint8Array): Uint8Array {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

export { pdfjsLib };
