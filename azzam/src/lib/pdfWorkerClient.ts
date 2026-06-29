/**
 * Thin promise-based client around the PDF Web Worker.
 * Falls back to direct pdf-lib calls on the main thread if workers are unavailable.
 */
import type { PDFDocument } from "pdf-lib";
import { nanoid } from "nanoid";

let workerInstance: Worker | null = null;
let workerSupported = true;

function getWorker(): Worker | null {
  if (!workerSupported) return null;
  if (workerInstance) return workerInstance;
  try {
    workerInstance = new Worker(new URL("../workers/pdf.worker.ts", import.meta.url), { type: "module" });
    return workerInstance;
  } catch (err) {
    console.warn("PDF worker unavailable, falling back to main thread:", err);
    workerSupported = false;
    return null;
  }
}

interface PendingRequest {
  resolve: (msg: any) => void;
  reject: (err: Error) => void;
}

const pending = new Map<string, PendingRequest>();

function dispatch(req: any): Promise<any> {
  const worker = getWorker();
  if (worker) {
    const id = nanoid();
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ ...req, id }, req.bytes ? [req.bytes.buffer] : undefined);
    });
  }
  // Fallback: dynamic import pdf-lib and run inline (slow path)
  return fallbackRun(req);
}

if (typeof window !== "undefined") {
  const worker = getWorker();
  if (worker) {
    worker.addEventListener("message", (e: MessageEvent) => {
      const msg = e.data;
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.ok) p.resolve(msg);
      else p.reject(new Error(msg.error));
    });
    worker.addEventListener("error", (e) => {
      console.error("PDF worker error:", e);
    });
  }
}

async function fallbackRun(req: any): Promise<any> {
  const { PDFDocument, degrees } = await import("pdf-lib");
  const load = (b: Uint8Array) => PDFDocument.load(b, { ignoreEncryption: true });
  switch (req.type) {
    case "countPages": {
      const doc = await load(req.bytes);
      return { ok: true, totalPages: doc.getPageCount() };
    }
    case "deletePage": {
      const doc = await load(req.bytes);
      doc.removePage(req.pageNum - 1);
      const bytes = await doc.save();
      return { ok: true, bytes, totalPages: doc.getPageCount() };
    }
    case "rotatePage": {
      const doc = await load(req.bytes);
      const page = doc.getPage(req.pageNum - 1);
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + req.angle) % 360));
      const bytes = await doc.save();
      return { ok: true, bytes, totalPages: doc.getPageCount() };
    }
    case "reversePages": {
      const doc = await load(req.bytes);
      const total = doc.getPageCount();
      const newDoc = await PDFDocument.create();
      const indices = Array.from({ length: total }, (_, i) => total - 1 - i);
      const copied = await newDoc.copyPages(doc, indices);
      copied.forEach((p) => newDoc.addPage(p));
      const bytes = await newDoc.save();
      return { ok: true, bytes, totalPages: newDoc.getPageCount() };
    }
    case "reorder": {
      const doc = await load(req.bytes);
      const newDoc = await PDFDocument.create();
      const indices = Array.from({ length: req.totalPages }, (_, i) => i);
      const [removed] = indices.splice(req.fromIndex, 1);
      indices.splice(req.toIndex, 0, removed);
      const copied = await newDoc.copyPages(doc, indices);
      copied.forEach((p) => newDoc.addPage(p));
      const bytes = await newDoc.save();
      return { ok: true, bytes, totalPages: newDoc.getPageCount() };
    }
    case "split": {
      const doc = await load(req.bytes);
      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(doc, req.pages);
      copied.forEach((p) => newDoc.addPage(p));
      const bytes = await newDoc.save();
      return { ok: true, bytes, totalPages: newDoc.getPageCount() };
    }
    case "compress": {
      const doc = await load(req.bytes);
      const bytes = await doc.save({ useObjectStreams: true });
      return { ok: true, bytes, totalPages: doc.getPageCount() };
    }
    case "merge": {
      const docA = await load(req.a);
      const docB = await load(req.b);
      const merged = await PDFDocument.create();
      const aPages = await merged.copyPages(docA, Array.from({ length: docA.getPageCount() }, (_, i) => i));
      aPages.forEach((p) => merged.addPage(p));
      const bPages = await merged.copyPages(docB, Array.from({ length: docB.getPageCount() }, (_, i) => i));
      bPages.forEach((p) => merged.addPage(p));
      const bytes = await merged.save();
      return { ok: true, bytes, totalPages: merged.getPageCount() };
    }
    case "setMetadata": {
      const doc = await load(req.bytes);
      if (req.meta.title !== undefined) doc.setTitle(req.meta.title);
      if (req.meta.author !== undefined) doc.setAuthor(req.meta.author);
      if (req.meta.subject !== undefined) doc.setSubject(req.meta.subject);
      if (req.meta.keywords !== undefined) {
        doc.setKeywords(req.meta.keywords.split(",").map((k: string) => k.trim()).filter(Boolean));
      }
      const bytes = await doc.save();
      return { ok: true, bytes, totalPages: doc.getPageCount() };
    }
    default:
      throw new Error("Unknown request type");
  }
}

export const PdfWorker = {
  ping: () => dispatch({ type: "ping" }),
  countPages: (bytes: Uint8Array) => dispatch({ type: "countPages", bytes }),
  deletePage: (bytes: Uint8Array, pageNum: number) => dispatch({ type: "deletePage", bytes, pageNum }),
  rotatePage: (bytes: Uint8Array, pageNum: number, angle: number) =>
    dispatch({ type: "rotatePage", bytes, pageNum, angle }),
  reversePages: (bytes: Uint8Array) => dispatch({ type: "reversePages", bytes }),
  reorder: (bytes: Uint8Array, fromIndex: number, toIndex: number, totalPages: number) =>
    dispatch({ type: "reorder", bytes, fromIndex, toIndex, totalPages }),
  split: (bytes: Uint8Array, pages: number[]) => dispatch({ type: "split", bytes, pages }),
  compress: (bytes: Uint8Array) => dispatch({ type: "compress", bytes }),
  merge: (a: Uint8Array, b: Uint8Array) => dispatch({ type: "merge", a, b }),
  setMetadata: (bytes: Uint8Array, meta: { title?: string; author?: string; subject?: string; keywords?: string }) =>
    dispatch({ type: "setMetadata", bytes, meta }),
};

export type PdfWorkerType = typeof PdfWorker;
