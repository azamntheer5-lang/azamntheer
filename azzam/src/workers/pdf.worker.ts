/**
 * Web Worker for heavy PDF operations using pdf-lib + pdfjs-dist.
 * Keeps page extraction, text extraction, and rendering off the main thread.
 */
/// <reference lib="webworker" />

import { PDFDocument, degrees, rgb } from "pdf-lib";

type RequestMessage =
  | { id: string; type: "ping" }
  | { id: string; type: "deletePage"; bytes: Uint8Array; pageNum: number }
  | { id: string; type: "rotatePage"; bytes: Uint8Array; pageNum: number; angle: number }
  | { id: string; type: "reversePages"; bytes: Uint8Array }
  | { id: string; type: "reorder"; bytes: Uint8Array; fromIndex: number; toIndex: number; totalPages: number }
  | { id: string; type: "split"; bytes: Uint8Array; pages: number[] }
  | { id: string; type: "compress"; bytes: Uint8Array }
  | { id: string; type: "merge"; a: Uint8Array; b: Uint8Array }
  | { id: string; type: "setMetadata"; bytes: Uint8Array; meta: { title?: string; author?: string; subject?: string; keywords?: string } }
  | { id: string; type: "countPages"; bytes: Uint8Array };

type ResponseMessage =
  | { id: string; ok: true; bytes?: Uint8Array; totalPages?: number; extractedText?: string; meta?: unknown }
  | { id: string; ok: false; error: string };

function post(msg: ResponseMessage) {
  (self as unknown as Worker).postMessage(msg);
}

async function run(req: RequestMessage): Promise<ResponseMessage> {
  try {
    switch (req.type) {
      case "ping":
        return { id: req.id, ok: true };

      case "countPages": {
        const doc = await PDFDocument.load(req.bytes, { ignoreEncryption: true });
        return { id: req.id, ok: true, totalPages: doc.getPageCount() };
      }

      case "deletePage": {
        const doc = await PDFDocument.load(req.bytes, { ignoreEncryption: true });
        doc.removePage(req.pageNum - 1);
        const out = await doc.save();
        return { id: req.id, ok: true, bytes: out, totalPages: doc.getPageCount() };
      }

      case "rotatePage": {
        const doc = await PDFDocument.load(req.bytes, { ignoreEncryption: true });
        const page = doc.getPage(req.pageNum - 1);
        const current = page.getRotation().angle;
        page.setRotation(degrees((current + req.angle) % 360));
        const out = await doc.save();
        return { id: req.id, ok: true, bytes: out, totalPages: doc.getPageCount() };
      }

      case "reversePages": {
        const doc = await PDFDocument.load(req.bytes, { ignoreEncryption: true });
        const total = doc.getPageCount();
        const newDoc = await PDFDocument.create();
        const indices = Array.from({ length: total }, (_, i) => total - 1 - i);
        const copied = await newDoc.copyPages(doc, indices);
        copied.forEach((p) => newDoc.addPage(p));
        const out = await newDoc.save();
        return { id: req.id, ok: true, bytes: out, totalPages: newDoc.getPageCount() };
      }

      case "reorder": {
        const doc = await PDFDocument.load(req.bytes, { ignoreEncryption: true });
        const newDoc = await PDFDocument.create();
        const indices = Array.from({ length: req.totalPages }, (_, i) => i);
        const [removed] = indices.splice(req.fromIndex, 1);
        indices.splice(req.toIndex, 0, removed);
        const copied = await newDoc.copyPages(doc, indices);
        copied.forEach((p) => newDoc.addPage(p));
        const out = await newDoc.save();
        return { id: req.id, ok: true, bytes: out, totalPages: newDoc.getPageCount() };
      }

      case "split": {
        const doc = await PDFDocument.load(req.bytes, { ignoreEncryption: true });
        const newDoc = await PDFDocument.create();
        const copied = await newDoc.copyPages(doc, req.pages);
        copied.forEach((p) => newDoc.addPage(p));
        const out = await newDoc.save();
        return { id: req.id, ok: true, bytes: out, totalPages: newDoc.getPageCount() };
      }

      case "compress": {
        const doc = await PDFDocument.load(req.bytes, { ignoreEncryption: true });
        const out = await doc.save({ useObjectStreams: true });
        return { id: req.id, ok: true, bytes: out, totalPages: doc.getPageCount() };
      }

      case "merge": {
        const docA = await PDFDocument.load(req.a, { ignoreEncryption: true });
        const docB = await PDFDocument.load(req.b, { ignoreEncryption: true });
        const merged = await PDFDocument.create();
        const aPages = await merged.copyPages(docA, Array.from({ length: docA.getPageCount() }, (_, i) => i));
        aPages.forEach((p) => merged.addPage(p));
        const bPages = await merged.copyPages(docB, Array.from({ length: docB.getPageCount() }, (_, i) => i));
        bPages.forEach((p) => merged.addPage(p));
        const out = await merged.save();
        return { id: req.id, ok: true, bytes: out, totalPages: merged.getPageCount() };
      }

      case "setMetadata": {
        const doc = await PDFDocument.load(req.bytes, { ignoreEncryption: true });
        if (req.meta.title !== undefined) doc.setTitle(req.meta.title);
        if (req.meta.author !== undefined) doc.setAuthor(req.meta.author);
        if (req.meta.subject !== undefined) doc.setSubject(req.meta.subject);
        if (req.meta.keywords !== undefined) {
          doc.setKeywords(
            req.meta.keywords
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean)
          );
        }
        const out = await doc.save();
        return { id: req.id, ok: true, bytes: out, totalPages: doc.getPageCount() };
      }

      default:
        return { id: (req as RequestMessage).id, ok: false, error: "Unknown request type" };
    }
  } catch (err) {
    return { id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

(self as unknown as Worker).addEventListener("message", async (e: MessageEvent<RequestMessage>) => {
  const res = await run(e.data);
  post(res);
});
