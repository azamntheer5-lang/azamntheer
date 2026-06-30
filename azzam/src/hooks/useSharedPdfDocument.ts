import { useEffect, useMemo, useState } from "react";
import { pdfjsLib, copyBytesForPdfjs } from "../lib/pdfjs";

/**
 * Shared PDF.js document loader — single source of truth.
 *
 * هذا الـ hook كان مكرراً (نسخة طبق الأصل) في VisualOrganize.tsx و
 * InteractiveCanvas.tsx، وكلتا النسختين فيهما تسريب ذاكرة (memory leak):
 *
 * THE BUG: the old cleanup function only set a `cancelled` flag — it never
 * called `doc.destroy()` on the PDF.js document that was already sitting in
 * React state from the *previous* run. Every time `pdfBytes` changed (a new
 * upload, or literally any single edit — rotate/delete/move all produce a
 * fresh Uint8Array from pdf-lib) a brand-new pdf.js document was parsed and
 * loaded into its worker, while the old one was simply dropped on the floor.
 * pdf.js documents hold non-trivial memory in the worker thread (decoded
 * page caches, transferred buffers) that a plain JS reference drop does NOT
 * reliably reclaim — only `.destroy()` does. A user rotating/deleting a few
 * pages of a large PDF in one session would silently accumulate several
 * un-released full document instances, which is exactly what froze the tab.
 *
 * THE FIX: capture the loaded doc in a closure variable and destroy it
 * (a) if the load was cancelled mid-flight, (b) when the effect re-runs for
 * a new `bytesKey`, and (c) when the component unmounts. All three cases are
 * handled by a single cleanup function.
 */
export interface SharedPdfDocumentResult {
  pdf: any | null;
  loading: boolean;
  error: string | null;
}

export function useSharedPdfDocument(pdfBytes: Uint8Array): SharedPdfDocumentResult {
  const [pdf, setPdf] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cheap fingerprint so we don't reload on every re-render — only when the
  // actual bytes identity changes (new file, or an edit that re-saved them).
  const bytesKey = useMemo(
    () => `${pdfBytes.byteLength}_${pdfBytes[0]}_${pdfBytes[pdfBytes.length - 1]}`,
    [pdfBytes]
  );

  useEffect(() => {
    let cancelled = false;
    // Holds a reference to whichever pdf.js document THIS effect run loads,
    // so the cleanup function below can always destroy the right instance.
    let loadedDoc: any = null;

    setLoading(true);
    setError(null);
    setPdf(null);

    const load = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ data: copyBytesForPdfjs(pdfBytes) });
        const doc = await loadingTask.promise;
        loadedDoc = doc;

        if (!cancelled) {
          setPdf(doc);
          setLoading(false);
        } else {
          // Effect was cleaned up while the load was in flight — release
          // immediately instead of leaving an orphaned document. Cast to any:
          // pdfjs-dist's bundled PDFDocumentProxy type doesn't declare
          // destroy(), even though it's a real, documented runtime method.
          try { (doc as any)?.destroy?.(); } catch { /* already gone, ignore */ }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load PDF");
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      // This is the line that was missing before: release the document this
      // effect run owns, whether it finished loading or not, every time —
      // on bytesKey change AND on unmount.
      if (loadedDoc) {
        try { loadedDoc.destroy?.(); } catch { /* already gone, ignore */ }
      }
    };
  }, [bytesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { pdf, loading, error };
}
