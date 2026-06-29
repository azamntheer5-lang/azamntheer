import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Type, Square, Circle, Minus as MinusIcon, ArrowRight, MousePointer2, Image as ImageIcon,
  Trash2, Copy, Clipboard, Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown,
  ZoomIn, ZoomOut, Grid3x3, Ruler, Magnet, Undo2, Redo2, BringToFront,
  SendToBack, Bold, Italic, Underline, AlignRight, AlignCenter, AlignLeft,
  Plus, Minus, Download, RefreshCw,
} from "lucide-react";
import { pdfjsLib, copyBytesForPdfjs } from "../../lib/pdfjs";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import { useEditorStore, createTextObject, createShapeObject, createImageObject } from "../../store/editorStore";
import { usePdfStore } from "../../store/pdfStore";
import { useToast } from "../../context/ToastContext";
import { drawTextAsPng, loadImage } from "../../lib/dom";
import { downloadBytes, sanitizeFilename } from "../../lib/utils";
import type { EditorObject, EditorTool, TextEditorObject, ShapeEditorObject, ImageEditorObject } from "./editorTypes";
import { FONT_WEIGHTS } from "./editorTypes";

interface PdfEditorProps {
  pdfBytes: Uint8Array;
  totalPages: number;
  isProcessing: boolean;
}

interface PageRender {
  canvas: HTMLCanvasElement;
  width: number;  // PDF units
  height: number; // PDF units
  renderWidth: number;  // canvas px
  renderHeight: number; // canvas px
}

const PAGE_PADDING = 24;

export const PdfEditor: React.FC<PdfEditorProps> = ({ pdfBytes, totalPages, isProcessing }) => {
  // Editor store
  const objects = useEditorStore((s) => s.objects);
  const selectedId = useEditorStore((s) => s.selectedId);
  const tool = useEditorStore((s) => s.tool);
  const zoom = useEditorStore((s) => s.zoom);
  const showGrid = useEditorStore((s) => s.showGrid);
  const showGuides = useEditorStore((s) => s.showGuides);
  const snapToGrid = useEditorStore((s) => s.snapToGrid);
  const gridSize = useEditorStore((s) => s.gridSize);

  const setTool = useEditorStore((s) => s.setTool);
  const setZoom = useEditorStore((s) => s.setZoom);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const toggleGuides = useEditorStore((s) => s.toggleGuides);
  const toggleSnapToGrid = useEditorStore((s) => s.toggleSnapToGrid);
  const addObject = useEditorStore((s) => s.addObject);
  const updateObject = useEditorStore((s) => s.updateObject);
  const updateObjectLive = useEditorStore((s) => s.updateObjectLive);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const deleteObject = useEditorStore((s) => s.deleteObject);
  const duplicateObject = useEditorStore((s) => s.duplicateObject);
  const selectObject = useEditorStore((s) => s.selectObject);
  const copy = useEditorStore((s) => s.copy);
  const paste = useEditorStore((s) => s.paste);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.undoStack.length > 0);
  const canRedo = useEditorStore((s) => s.redoStack.length > 0);

  const updateDoc = usePdfStore((s) => s.updateDoc);
  const toast = useToast();

  const [activePage, setActivePage] = useState(1);
  const [pageRender, setPageRender] = useState<PageRender | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const pageContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selected = useMemo(() => objects.find((o) => o.id === selectedId) || null, [objects, selectedId]);
  const pageObjects = useMemo(() => objects.filter((o) => o.page === activePage).sort((a, b) => a.zIndex - b.zIndex), [objects, activePage]);

  // Render PDF page when activePage or pdfBytes changes
  useEffect(() => {
    let cancelled = false;
    setPageLoading(true);
    (async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ data: copyBytesForPdfjs(pdfBytes) });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        const page = await pdf.getPage(activePage);
        if (cancelled) return;
        const rawViewport = page.getViewport({ scale: 1.0 });

        // Render at base scale * zoom
        const scale = 1.5 * zoom;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        if (cancelled) return;

        setPageRender({
          canvas,
          width: rawViewport.width,
          height: rawViewport.height,
          renderWidth: viewport.width,
          renderHeight: viewport.height,
        });
        setPageLoading(false);
      } catch (err) {
        console.error("Failed to render page:", err);
        if (!cancelled) setPageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfBytes, activePage, zoom]);

  // Convert screen coordinates (px relative to canvas) to PDF coordinates
  const screenToPdf = useCallback(
    (clientX: number, clientY: number) => {
      if (!pageRender || !canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      // Convert local canvas px to PDF units (rawViewport coords)
      const scaleX = pageRender.width / pageRender.renderWidth;
      const scaleY = pageRender.height / pageRender.renderHeight;
      const pdfX = localX * scaleX;
      // PDF Y is bottom-up
      const pdfY = pageRender.height - localY * scaleY;
      return { x: pdfX, y: pdfY };
    },
    [pageRender]
  );

  // Snap a value to grid if enabled
  const snap = useCallback(
    (v: number) => {
      if (!snapToGrid) return v;
      return Math.round(v / gridSize) * gridSize;
    },
    [snapToGrid, gridSize]
  );

  // Add a text box at the center of the currently visible canvas area.
  // Triggered by the prominent "إضافة مربع نص" button in the toolbar.
  const addTextBoxAtCenter = useCallback(() => {
    if (!pageRender) {
      toast.info("يرجى الانتظار حتى تُرسم الصفحة أولاً");
      return;
    }
    // Center of the PDF page in PDF coordinates
    const cx = pageRender.width / 2;
    const cy = pageRender.height / 2;
    // Default text box dimensions match createTextObject (240×48)
    const id = addObject(
      createTextObject(activePage, cx - 120, cy - 24, {
        text: "نص جديد",
      })
    );
    selectObject(id);
    setTool("select");
    toast.success("تمت إضافة مربع النص — اسحبه بحرية فوق الصفحة");
  }, [pageRender, activePage, addObject, selectObject, setTool, toast]);

  // Click on canvas to add new object when a tool is active
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (tool === "select") return;
      const { x, y } = screenToPdf(e.clientX, e.clientY);
      const sx = snap(x);
      const sy = snap(y);

      if (tool === "text") {
        addObject(
          createTextObject(activePage, sx - 100, sy - 20, {
            text: "نص جديد",
          })
        );
        setTool("select");
      } else if (tool === "rect") {
        addObject(createShapeObject(activePage, "rect", sx - 50, sy - 25, 100, 50));
        setTool("select");
      } else if (tool === "ellipse") {
        addObject(createShapeObject(activePage, "ellipse", sx - 50, sy - 25, 100, 50));
        setTool("select");
      } else if (tool === "line") {
        addObject(createShapeObject(activePage, "line", sx - 50, sy, 100, 0));
        setTool("select");
      } else if (tool === "arrow") {
        addObject(createShapeObject(activePage, "arrow", sx - 50, sy, 100, 0));
        setTool("select");
      } else if (tool === "image") {
        // Trigger image upload
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,image/jpeg,image/webp";
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result as string);
              r.onerror = reject;
              r.readAsDataURL(file);
            });
            // Convert to PNG (canvas roundtrip)
            const img = await loadImage(dataUrl);
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0);
            const pngDataUrl = canvas.toDataURL("image/png");
            const pngBase64 = pngDataUrl.split(",")[1];
            const aspect = img.naturalHeight / img.naturalWidth;
            const w = 150;
            const h = w * aspect;
            addObject(createImageObject(activePage, sx - w / 2, sy - h / 2, w, h, pngBase64));
            setTool("select");
            toast.success("تمت إضافة الصورة!");
          } catch (err: any) {
            toast.error("فشل تحميل الصورة: " + err.message);
          }
        };
        input.click();
      }
    },
    [tool, screenToPdf, snap, activePage, addObject, setTool, toast]
  );

  // Drag state
  const dragRef = useRef<{
    id: string;
    mode: "move" | "resize" | "rotate";
    handle?: string; // for resize: "nw"|"ne"|"sw"|"se"|"n"|"s"|"e"|"w"
    startX: number;
    startY: number;
    origObj: EditorObject;
  } | null>(null);

  const handleObjectMouseDown = (e: React.MouseEvent, obj: EditorObject, mode: "move" | "resize" | "rotate", handle?: string) => {
    e.stopPropagation();
    if (obj.locked) return;
    e.preventDefault(); // prevent text selection during drag
    selectObject(obj.id);
    // Snapshot the current state ONCE at gesture start so undo restores
    // the pre-drag/pre-resize position. During the gesture we use
    // updateObjectLive() which is silent (no per-move undo pushes).
    pushHistory();
    dragRef.current = {
      id: obj.id,
      mode,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origObj: { ...obj },
    };
    // Disable text selection on the whole document during drag
    document.body.style.userSelect = "none";
    document.body.style.cursor = mode === "move" ? "grabbing" : mode === "rotate" ? "grabbing" : "nwse-resize";
    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
  };

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag || !pageRender) return;
      const dxScreen = e.clientX - drag.startX;
      const dyScreen = e.clientY - drag.startY;
      const scaleX = pageRender.width / pageRender.renderWidth;
      const scaleY = pageRender.height / pageRender.renderHeight;
      const dx = dxScreen * scaleX;
      const dy = -dyScreen * scaleY; // invert Y for PDF coords
      const orig = drag.origObj;

      if (drag.mode === "move") {
        let newX = orig.x + dx;
        let newY = orig.y + dy;
        if (snapToGrid) {
          newX = snap(newX);
          newY = snap(newY);
        }
        // Use updateObjectLive — no undo push on every move (we already
        // snapshotted at gesture start). This is the key smoothness fix.
        updateObjectLive(drag.id, { x: newX, y: newY });
      } else if (drag.mode === "resize") {
        const h = drag.handle!;
        let { x, y, width, height } = orig;
        // For each handle, adjust the appropriate edges
        if (h.includes("e")) width = Math.max(10, orig.width + dx);
        if (h.includes("w")) {
          width = Math.max(10, orig.width - dx);
          x = orig.x + dx;
        }
        if (h.includes("n")) {
          height = Math.max(10, orig.height + dy);
          y = orig.y + dy;
        }
        if (h.includes("s")) {
          height = Math.max(10, orig.height - dy);
        }
        if (snapToGrid) {
          x = snap(x);
          y = snap(y);
          width = snap(width);
          height = snap(height);
        }
        updateObjectLive(drag.id, { x, y, width, height });
      } else if (drag.mode === "rotate") {
        // Calculate angle from object center to current mouse position
        const obj = objects.find((o) => o.id === drag.id);
        if (!obj) return;
        // Object center in screen coords
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const centerXScreen = rect.left + ((obj.x + obj.width / 2) / pageRender.width) * pageRender.renderWidth;
        const centerYScreen = rect.top + (pageRender.height - (obj.y + obj.height / 2)) / pageRender.height * pageRender.renderHeight;
        const angle = Math.atan2(e.clientY - centerYScreen, e.clientX - centerXScreen) * (180 / Math.PI);
        // Normalize to 0..360, snap to 15° if shift held
        let deg = (angle + 90 + 360) % 360;
        if (e.shiftKey) deg = Math.round(deg / 15) * 15;
        updateObjectLive(drag.id, { rotation: deg });
      }
    },
    [pageRender, objects, snapToGrid, snap, updateObjectLive]
  );

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
    // Restore normal cursor + selection
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    window.removeEventListener("mousemove", handleDragMove);
    window.removeEventListener("mouseup", handleDragEnd);
  }, [handleDragMove]);

  // Delete key handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          e.preventDefault();
          deleteObject(selectedId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "c" && selectedId) {
        e.preventDefault();
        copy(selectedId);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        paste();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "d" && selectedId) {
        e.preventDefault();
        duplicateObject(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, deleteObject, undo, redo, copy, paste, duplicateObject]);

  // Export: render all objects onto the PDF
  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();

      // Group objects by page
      const byPage = new Map<number, EditorObject[]>();
      for (const o of objects) {
        if (!byPage.has(o.page)) byPage.set(o.page, []);
        byPage.get(o.page)!.push(o);
      }

      for (const [pageNum, objs] of byPage) {
        if (pageNum < 1 || pageNum > pages.length) continue;
        const page = pages[pageNum - 1];
        const sorted = [...objs].sort((a, b) => a.zIndex - b.zIndex);

        for (const obj of sorted) {
          if (!obj.visible) continue;

          if (obj.kind === "text") {
            await drawTextObject(pdfDoc, page, obj);
          } else if (obj.kind === "rect" || obj.kind === "ellipse" || obj.kind === "line" || obj.kind === "arrow") {
            drawShapeObject(page, obj);
          } else if (obj.kind === "image") {
            await drawImageObject(pdfDoc, page, obj);
          }
        }
      }

      const out = await pdfDoc.save();
      updateDoc({ bytes: out, size: out.byteLength });
      toast.success("تم تصدير التعديلات إلى PDF!");
    } catch (err: any) {
      toast.error("فشل التصدير: " + err.message);
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();

      const byPage = new Map<number, EditorObject[]>();
      for (const o of objects) {
        if (!byPage.has(o.page)) byPage.set(o.page, []);
        byPage.get(o.page)!.push(o);
      }

      for (const [pageNum, objs] of byPage) {
        if (pageNum < 1 || pageNum > pages.length) continue;
        const page = pages[pageNum - 1];
        const sorted = [...objs].sort((a, b) => a.zIndex - b.zIndex);

        for (const obj of sorted) {
          if (!obj.visible) continue;
          if (obj.kind === "text") await drawTextObject(pdfDoc, page, obj);
          else if (obj.kind === "rect" || obj.kind === "ellipse" || obj.kind === "line" || obj.kind === "arrow") drawShapeObject(page, obj);
          else if (obj.kind === "image") await drawImageObject(pdfDoc, page, obj);
        }
      }

      const out = await pdfDoc.save();
      const name = "مستند_عزام_محرر.pdf";
      downloadBytes(out, name, "application/pdf");
      toast.success("تم تنزيل الملف!");
    } catch (err: any) {
      toast.error("فشل التنزيل: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // ============ RENDER ============
  const TOOLBAR_GROUPS: Array<{ tools: Array<{ id: EditorTool; icon: React.ComponentType<{ className?: string }>; label: string }> }> = [
    {
      tools: [
        { id: "select", icon: MousePointer2, label: "تحديد" },
        { id: "text", icon: Type, label: "نص" },
      ],
    },
    {
      tools: [
        { id: "rect", icon: Square, label: "مستطيل" },
        { id: "ellipse", icon: Circle, label: "دائرة" },
        { id: "line", icon: MinusIcon, label: "خط" },
        { id: "arrow", icon: ArrowRight, label: "سهم" },
      ],
    },
    {
      tools: [{ id: "image", icon: ImageIcon, label: "صورة" }],
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 select-none">
      {/* LEFT: Tools + Properties (3 cols) */}
      <div className="lg:col-span-3 space-y-3">
        {/* ★ Prominent "Add Text Box" button — adds a text box at center of page */}
        <button
          onClick={addTextBoxAtCenter}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 cursor-pointer transition-all active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة مربع نص</span>
        </button>

        {/* Toolbar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-3">
          <div className="text-[10px] font-black text-gray-300 uppercase tracking-wider">الأدوات</div>
          {TOOLBAR_GROUPS.map((group, gi) => (
            <div key={gi} className="grid grid-cols-4 gap-1.5">
              {group.tools.map((t) => {
                const Icon = t.icon;
                const isActive = tool === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id)}
                    title={t.label}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* History + View controls */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
          <div className="text-[10px] font-black text-gray-300 uppercase tracking-wider">سجل وعرض</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white disabled:opacity-30 cursor-pointer transition-all"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>تراجع</span>
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white disabled:opacity-30 cursor-pointer transition-all"
            >
              <Redo2 className="h-3.5 w-3.5" />
              <span>إعادة</span>
            </button>
            <button
              onClick={toggleGrid}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                showGrid ? "bg-blue-600 text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              <Grid3x3 className="h-3.5 w-3.5" />
              <span>شبكة</span>
            </button>
            <button
              onClick={toggleGuides}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                showGuides ? "bg-blue-600 text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              <Ruler className="h-3.5 w-3.5" />
              <span>أدلة</span>
            </button>
            <button
              onClick={toggleSnapToGrid}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                snapToGrid ? "bg-blue-600 text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              <Magnet className="h-3.5 w-3.5" />
              <span>التقاط</span>
            </button>
            <button
              onClick={() => setZoom(zoom - 0.25)}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer transition-all"
            >
              <ZoomOut className="h-3.5 w-3.5" />
              <span>تصغير</span>
            </button>
            <button
              onClick={() => setZoom(zoom + 0.25)}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer transition-all"
            >
              <ZoomIn className="h-3.5 w-3.5" />
              <span>تكبير</span>
            </button>
            <div className="flex items-center justify-center py-2 rounded-lg text-[10px] font-black bg-white/5 text-white">
              {Math.round(zoom * 100)}%
            </div>
          </div>
        </div>

        {/* Properties panel (only when object selected) */}
        {selected && <PropertiesPanel obj={selected} onUpdate={(patch) => updateObject(selected.id, patch)} />}

        {/* Object actions */}
        {selected && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
            <div className="text-[10px] font-black text-gray-300 uppercase tracking-wider">إجراءات</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => duplicateObject(selected.id)}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer transition-all"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>تكرار</span>
              </button>
              <button
                onClick={() => {
                  copy(selected.id);
                  toast.success("تم النسخ");
                }}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer transition-all"
              >
                <Clipboard className="h-3.5 w-3.5" />
                <span>نسخ</span>
              </button>
              <button
                onClick={paste}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer transition-all"
              >
                <Clipboard className="h-3.5 w-3.5" />
                <span>لصق</span>
              </button>
              <button
                onClick={() => deleteObject(selected.id)}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 cursor-pointer transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>حذف</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CENTER: Canvas (6 cols) */}
      <div className="lg:col-span-6 flex flex-col">
        {/* Page nav */}
        <div className="flex items-center justify-between mb-3 bg-white/5 border border-white/10 rounded-xl p-2">
          <button
            onClick={() => setActivePage((p) => Math.max(1, p - 1))}
            disabled={activePage === 1}
            className="px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 text-white rounded-lg cursor-pointer disabled:opacity-30 transition-all"
          >
            ◀ السابق
          </button>
          <span className="text-xs font-bold text-white">
            صفحة {activePage} من {totalPages}
          </span>
          <button
            onClick={() => setActivePage((p) => Math.min(totalPages, p + 1))}
            disabled={activePage === totalPages}
            className="px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 text-white rounded-lg cursor-pointer disabled:opacity-30 transition-all"
          >
            التالي ▶
          </button>
        </div>

        {/* Canvas area */}
        <div className="flex-1 bg-slate-950/60 border border-white/10 rounded-2xl p-4 flex items-center justify-center min-h-[600px] relative overflow-auto safe-scrollbar">
          {pageLoading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
              <RefreshCw className="h-8 w-8 text-blue-400 animate-spin" />
            </div>
          )}
          {pageRender && (
            <div
              ref={pageContainerRef}
              className="relative shadow-2xl"
              style={{ width: pageRender.renderWidth, height: pageRender.renderHeight }}
              onClick={(e) => {
                if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "CANVAS") {
                  if (tool === "select") selectObject(null);
                  else handleCanvasClick(e);
                }
              }}
            >
              {/* PDF canvas */}
              <canvas
                ref={canvasRef}
                width={pageRender.canvas.width}
                height={pageRender.canvas.height}
                className="absolute inset-0 w-full h-full bg-white"
                style={{ width: pageRender.renderWidth, height: pageRender.renderHeight }}
              />

              {/* Grid overlay */}
              {showGrid && (
                <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
                  <defs>
                    <pattern id="grid" width={gridSize * (pageRender.renderWidth / pageRender.width)} height={gridSize * (pageRender.renderHeight / pageRender.height)} patternUnits="userSpaceOnUse">
                      <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              )}

              {/* Objects overlay */}
              <ObjectOverlay
                objects={pageObjects}
                pageRender={pageRender}
                selectedId={selectedId}
                tool={tool}
                showGuides={showGuides}
                onMouseDownObject={handleObjectMouseDown}
                onSelect={selectObject}
              />
            </div>
          )}
        </div>

        {/* Export bar */}
        <div className="mt-3 flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-xl p-2">
          <div className="text-[10px] text-gray-400 font-bold">
            {objects.length} عنصر في {new Set(objects.map((o) => o.page)).size} صفحة
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={isExporting || objects.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer disabled:opacity-40 transition-all"
            >
              {isExporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <BringToFront className="h-3.5 w-3.5" />}
              <span>تطبيق على المستند</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer disabled:opacity-40 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              <span>تنزيل</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: Layers panel (3 cols) */}
      <div className="lg:col-span-3">
        <LayersPanel activePage={activePage} />
      </div>
    </div>
  );
};

// ============ OBJECT OVERLAY (renders objects as SVG/DIV over the canvas) ============

interface ObjectOverlayProps {
  objects: EditorObject[];
  pageRender: PageRender;
  selectedId: string | null;
  tool: EditorTool;
  showGuides: boolean;
  onMouseDownObject: (e: React.MouseEvent, obj: EditorObject, mode: "move" | "resize" | "rotate", handle?: string) => void;
  onSelect: (id: string) => void;
}

const ObjectOverlay: React.FC<ObjectOverlayProps> = ({
  objects, pageRender, selectedId, tool, showGuides, onMouseDownObject, onSelect,
}) => {
  const scaleX = pageRender.renderWidth / pageRender.width;
  const scaleY = pageRender.renderHeight / pageRender.height;

  return (
    <div className="absolute inset-0" style={{ width: pageRender.renderWidth, height: pageRender.renderHeight }}>
      {objects.map((obj) => {
        if (!obj.visible) return null;
        const left = obj.x * scaleX;
        const top = (pageRender.height - obj.y - obj.height) * scaleY;
        const w = obj.width * scaleX;
        const h = obj.height * scaleY;
        const isSelected = obj.id === selectedId;
        const cursor = tool === "select" ? (obj.locked ? "not-allowed" : "move") : "crosshair";

        return (
          <div
            key={obj.id}
            className={`absolute ${isSelected ? "ring-2 ring-blue-500" : ""} ${obj.locked ? "ring-1 ring-amber-500/40" : ""}`}
            style={{
              left, top, width: w, height: h,
              // Use translate3d for GPU acceleration + rotate
              transform: `translate3d(0, 0, 0) rotate(${obj.rotation}deg)`,
              transformOrigin: "center center",
              // Hint to the browser that this element will animate —
              // promotes it to its own compositor layer for smooth dragging.
              willChange: "transform",
              // NOTE: opacity is applied inside <ObjectContent> on the
              // content layer only, NOT on this bounding container.
              // Applying opacity here would dim the selection ring too
              // and create a stacking context that hurts text rendering.
              cursor,
            }}
            onMouseDown={(e) => {
              if (tool === "select") {
                onMouseDownObject(e, obj, "move");
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(obj.id);
            }}
          >
            {/* Render object content */}
            <ObjectContent obj={obj} width={w} height={h} />

            {/* Selection handles */}
            {isSelected && !obj.locked && (
              <>
                {/* Resize handles */}
                {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((h) => {
                  const isCorner = h.length === 2;
                  const style: React.CSSProperties = {
                    position: "absolute",
                    width: 10, height: 10,
                    background: "white",
                    border: "1.5px solid #3b82f6",
                    borderRadius: isCorner ? "2px" : "50%",
                    zIndex: 10,
                  };
                  if (h.includes("n")) style.top = -5;
                  if (h.includes("s")) style.bottom = -5;
                  if (h.includes("w")) style.left = -5;
                  if (h.includes("e")) style.right = -5;
                  if (h === "n" || h === "s") { style.left = "50%"; style.marginLeft = -5; }
                  if (h === "e" || h === "w") { style.top = "50%"; style.marginTop = -5; }
                  const cursorMap: Record<string, string> = {
                    nw: "nwse-resize", se: "nwse-resize",
                    ne: "nesw-resize", sw: "nesw-resize",
                    n: "ns-resize", s: "ns-resize",
                    e: "ew-resize", w: "ew-resize",
                  };
                  return (
                    <div
                      key={h}
                      style={{ ...style, cursor: cursorMap[h] }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onMouseDownObject(e, obj, "resize", h);
                      }}
                    />
                  );
                })}
                {/* Rotate handle */}
                <div
                  style={{
                    position: "absolute",
                    top: -28, left: "50%", marginLeft: -7,
                    width: 14, height: 14,
                    background: "white",
                    border: "1.5px solid #3b82f6",
                    borderRadius: "50%",
                    cursor: "grab",
                    zIndex: 10,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onMouseDownObject(e, obj, "rotate");
                  }}
                  title="تدوير"
                >
                  <RefreshCw style={{ width: 8, height: 8, margin: "2px auto", color: "#3b82f6" }} />
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============ OBJECT CONTENT (renders the visual content inside the bounding box) ============

const ObjectContent: React.FC<{ obj: EditorObject; width: number; height: number }> = ({ obj, width, height }) => {
  if (obj.kind === "text") {
    const t = obj as TextEditorObject;
    // Use the explicit fontWeight field (300..900) as the source of truth.
    // The legacy `bold` boolean is kept for backward compat but does NOT
    // override fontWeight — otherwise weights 800/900 would be capped at 700.
    const fontWeight = t.fontWeight || (t.bold ? 700 : 400);
    // Subtle shadow for legibility over busy PDF backgrounds. Off by default
    // but the user can toggle it. Uses a small blur + slight offset.
    const textShadow = t.useShadow
      ? `0 1px 2px rgba(0,0,0,0.35), 0 0 1px rgba(0,0,0,0.6)`
      : "none";
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: t.useBg ? t.bgColor : "transparent",
          border: t.useStroke ? `${1.5}px solid ${t.strokeColor}` : "none",
          display: "flex",
          alignItems: "center",
          justifyContent:
            t.align === "center" ? "center" : t.align === "left" ? "flex-start" : "flex-end",
          padding: "0 6px",
          overflow: "hidden",
          fontFamily: t.fontFamily,
          textDecoration: t.underline ? "underline" : "none",
          // Apply opacity HERE (on the content layer) rather than on the
          // bounding container — keeps the selection ring crisp at full
          // opacity even when the content is faded.
          opacity: t.opacity,
          // Crisp Arabic text rendering
          textRendering: "geometricPrecision",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        }}
      >
        <span
          style={{
            // Use individual font properties instead of the `font` shorthand
            // to avoid React warnings about mixing shorthand + non-shorthand.
            fontFamily: t.fontFamily,
            fontSize: `${t.fontSize}px`,
            fontWeight,
            fontStyle: t.italic ? "italic" : "normal",
            color: t.color,
            whiteSpace: "pre-wrap",
            textOverflow: "ellipsis",
            lineHeight: 1.2,
            direction: "rtl",
            textAlign: t.align,
            textShadow,
            // Prevents the text from looking "thin" due to subpixel rendering
            letterSpacing: "0",
            display: "inline-block",
            maxWidth: "100%",
          }}
        >
          {t.text || "نص"}
        </span>
      </div>
    );
  }
  if (obj.kind === "rect" || obj.kind === "ellipse") {
    const s = obj as ShapeEditorObject;
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          border: `${s.strokeWidth}px solid ${s.strokeColor}`,
          background: s.useFill ? s.fillColor : "transparent",
          borderRadius: obj.kind === "ellipse" ? "50%" : "0",
          opacity: s.opacity,
        }}
      />
    );
  }
  if (obj.kind === "line" || obj.kind === "arrow") {
    const s = obj as ShapeEditorObject;
    return (
      <svg
        width="100%"
        height="100%"
        style={{ overflow: "visible", opacity: s.opacity }}
      >
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={s.strokeColor}
          strokeWidth={s.strokeWidth}
          strokeLinecap="round"
        />
        {obj.kind === "arrow" && (
          <polygon
            points={`${width - 8},${height / 2 - 5} ${width},${height / 2} ${width - 8},${height / 2 + 5}`}
            fill={s.strokeColor}
          />
        )}
      </svg>
    );
  }
  if (obj.kind === "image") {
    const im = obj as ImageEditorObject;
    return (
      <img
        src={`data:image/png;base64,${im.pngBase64}`}
        alt={im.name}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          pointerEvents: "none",
          opacity: im.opacity,
        }}
        draggable={false}
      />
    );
  }
  return null;
};

// ============ PROPERTIES PANEL ============

const PropertiesPanel: React.FC<{ obj: EditorObject; onUpdate: (patch: Partial<EditorObject>) => void }> = ({ obj, onUpdate }) => {
  if (obj.kind === "text") {
    const t = obj as TextEditorObject;
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-3">
        <div className="text-[10px] font-black text-gray-300 uppercase tracking-wider">خصائص النص</div>
        <textarea
          value={t.text}
          onChange={(e) => onUpdate({ text: e.target.value } as any)}
          rows={2}
          className="w-full text-xs bg-slate-950/60 border border-white/10 rounded-lg p-2 font-bold text-white resize-none focus:outline-none focus:border-blue-500"
          placeholder="اكتب النص..."
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-gray-400 font-bold block mb-1">الخط</label>
            <select
              value={t.fontFamily}
              onChange={(e) => onUpdate({ fontFamily: e.target.value } as any)}
              className="w-full text-[10px] bg-slate-950/60 border border-white/10 rounded-lg p-1.5 font-bold text-white"
            >
              <option value="Cairo">Cairo</option>
              <option value="Tajawal">Tajawal</option>
              <option value="Amiri">Amiri</option>
              <option value="Almarai">Almarai</option>
              <option value="Inter">Inter</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] text-gray-400 font-bold block mb-1">الحجم</label>
            <input
              type="number"
              value={t.fontSize}
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 12 } as any)}
              className="w-full text-[10px] bg-slate-950/60 border border-white/10 rounded-lg p-1.5 font-bold text-white"
            />
          </div>
        </div>
        {/* Font weight selector — critical for Arabic text legibility */}
        <div>
          <label className="text-[9px] text-gray-400 font-bold block mb-1">سُمك الخط</label>
          <select
            value={t.fontWeight}
            onChange={(e) => onUpdate({ fontWeight: parseInt(e.target.value) } as any)}
            className="w-full text-[10px] bg-slate-950/60 border border-white/10 rounded-lg p-1.5 font-bold text-white"
          >
            {FONT_WEIGHTS.map((w) => (
              <option key={w.value} value={w.value} style={{ fontWeight: w.value }}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-gray-400 font-bold block mb-1">لون النص</label>
            <input
              type="color"
              value={t.color}
              onChange={(e) => onUpdate({ color: e.target.value } as any)}
              className="w-full h-8 rounded-lg border border-white/10 bg-transparent cursor-pointer"
            />
          </div>
          <div>
            <label className="text-[9px] text-gray-400 font-bold block mb-1">لون الخلفية</label>
            <input
              type="color"
              value={t.bgColor}
              onChange={(e) => onUpdate({ bgColor: e.target.value } as any)}
              className="w-full h-8 rounded-lg border border-white/10 bg-transparent cursor-pointer"
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate({ bold: !t.bold } as any)}
            className={`flex-1 py-1.5 rounded-md text-[10px] font-black cursor-pointer transition-all ${t.bold ? "bg-blue-600 text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"}`}
          >
            <Bold className="h-3.5 w-3.5 mx-auto" />
          </button>
          <button
            onClick={() => onUpdate({ italic: !t.italic } as any)}
            className={`flex-1 py-1.5 rounded-md text-[10px] font-black cursor-pointer transition-all ${t.italic ? "bg-blue-600 text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"}`}
          >
            <Italic className="h-3.5 w-3.5 mx-auto" />
          </button>
          <button
            onClick={() => onUpdate({ underline: !t.underline } as any)}
            className={`flex-1 py-1.5 rounded-md text-[10px] font-black cursor-pointer transition-all ${t.underline ? "bg-blue-600 text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"}`}
          >
            <Underline className="h-3.5 w-3.5 mx-auto" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate({ align: "right" } as any)}
            className={`flex-1 py-1.5 rounded-md cursor-pointer transition-all ${t.align === "right" ? "bg-blue-600 text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"}`}
          >
            <AlignRight className="h-3.5 w-3.5 mx-auto" />
          </button>
          <button
            onClick={() => onUpdate({ align: "center" } as any)}
            className={`flex-1 py-1.5 rounded-md cursor-pointer transition-all ${t.align === "center" ? "bg-blue-600 text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"}`}
          >
            <AlignCenter className="h-3.5 w-3.5 mx-auto" />
          </button>
          <button
            onClick={() => onUpdate({ align: "left" } as any)}
            className={`flex-1 py-1.5 rounded-md cursor-pointer transition-all ${t.align === "left" ? "bg-blue-600 text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"}`}
          >
            <AlignLeft className="h-3.5 w-3.5 mx-auto" />
          </button>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-gray-300">
          <input
            type="checkbox"
            checked={t.useBg}
            onChange={(e) => onUpdate({ useBg: e.target.checked } as any)}
            className="h-3.5 w-3.5 accent-blue-500 cursor-pointer"
          />
          <span>خلفية ملونة</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-gray-300">
          <input
            type="checkbox"
            checked={t.useStroke}
            onChange={(e) => onUpdate({ useStroke: e.target.checked } as any)}
            className="h-3.5 w-3.5 accent-blue-500 cursor-pointer"
          />
          <span>إطار</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-gray-300">
          <input
            type="checkbox"
            checked={t.useShadow}
            onChange={(e) => onUpdate({ useShadow: e.target.checked } as any)}
            className="h-3.5 w-3.5 accent-blue-500 cursor-pointer"
          />
          <span>ظل خفيف (لوضوح النص فوق خلفيات مزدحمة)</span>
        </label>
        <div>
          <label className="text-[9px] text-gray-400 font-bold block mb-1">الشفافية: {Math.round(t.opacity * 100)}%</label>
          <input
            type="range" min="0" max="100" value={t.opacity * 100}
            onChange={(e) => onUpdate({ opacity: parseInt(e.target.value) / 100 } as any)}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>
      </div>
    );
  }
  if (obj.kind === "rect" || obj.kind === "ellipse" || obj.kind === "line" || obj.kind === "arrow") {
    const s = obj as ShapeEditorObject;
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-3">
        <div className="text-[10px] font-black text-gray-300 uppercase tracking-wider">خصائص الشكل</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-gray-400 font-bold block mb-1">لون الحدود</label>
            <input
              type="color"
              value={s.strokeColor}
              onChange={(e) => onUpdate({ strokeColor: e.target.value } as any)}
              className="w-full h-8 rounded-lg border border-white/10 bg-transparent cursor-pointer"
            />
          </div>
          <div>
            <label className="text-[9px] text-gray-400 font-bold block mb-1">لون التعبئة</label>
            <input
              type="color"
              value={s.fillColor}
              onChange={(e) => onUpdate({ fillColor: e.target.value } as any)}
              className="w-full h-8 rounded-lg border border-white/10 bg-transparent cursor-pointer"
            />
          </div>
        </div>
        <div>
          <label className="text-[9px] text-gray-400 font-bold block mb-1">سماكة الحدود: {s.strokeWidth}px</label>
          <input
            type="range" min="1" max="20" value={s.strokeWidth}
            onChange={(e) => onUpdate({ strokeWidth: parseInt(e.target.value) } as any)}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-gray-300">
          <input
            type="checkbox"
            checked={s.useFill}
            onChange={(e) => onUpdate({ useFill: e.target.checked } as any)}
            className="h-3.5 w-3.5 accent-blue-500 cursor-pointer"
          />
          <span>تعبئة لونية</span>
        </label>
        <div>
          <label className="text-[9px] text-gray-400 font-bold block mb-1">الشفافية: {Math.round(s.opacity * 100)}%</label>
          <input
            type="range" min="0" max="100" value={s.opacity * 100}
            onChange={(e) => onUpdate({ opacity: parseInt(e.target.value) / 100 } as any)}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-gray-400 font-bold block mb-1">X</label>
            <input
              type="number" value={Math.round(s.x)}
              onChange={(e) => onUpdate({ x: parseInt(e.target.value) || 0 } as any)}
              className="w-full text-[10px] bg-slate-950/60 border border-white/10 rounded-lg p-1.5 font-bold text-white"
            />
          </div>
          <div>
            <label className="text-[9px] text-gray-400 font-bold block mb-1">Y</label>
            <input
              type="number" value={Math.round(s.y)}
              onChange={(e) => onUpdate({ y: parseInt(e.target.value) || 0 } as any)}
              className="w-full text-[10px] bg-slate-950/60 border border-white/10 rounded-lg p-1.5 font-bold text-white"
            />
          </div>
          <div>
            <label className="text-[9px] text-gray-400 font-bold block mb-1">العرض</label>
            <input
              type="number" value={Math.round(s.width)}
              onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 10 } as any)}
              className="w-full text-[10px] bg-slate-950/60 border border-white/10 rounded-lg p-1.5 font-bold text-white"
            />
          </div>
          <div>
            <label className="text-[9px] text-gray-400 font-bold block mb-1">الارتفاع</label>
            <input
              type="number" value={Math.round(s.height)}
              onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 10 } as any)}
              className="w-full text-[10px] bg-slate-950/60 border border-white/10 rounded-lg p-1.5 font-bold text-white"
            />
          </div>
        </div>
        <div>
          <label className="text-[9px] text-gray-400 font-bold block mb-1">التدوير: {Math.round(s.rotation)}°</label>
          <input
            type="range" min="0" max="360" value={s.rotation}
            onChange={(e) => onUpdate({ rotation: parseInt(e.target.value) } as any)}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>
      </div>
    );
  }
  if (obj.kind === "image") {
    const im = obj as ImageEditorObject;
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-3">
        <div className="text-[10px] font-black text-gray-300 uppercase tracking-wider">خصائص الصورة</div>
        <div>
          <label className="text-[9px] text-gray-400 font-bold block mb-1">العرض</label>
          <input
            type="number" value={Math.round(im.width)}
            onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 10 } as any)}
            className="w-full text-[10px] bg-slate-950/60 border border-white/10 rounded-lg p-1.5 font-bold text-white"
          />
        </div>
        <div>
          <label className="text-[9px] text-gray-400 font-bold block mb-1">الارتفاع</label>
          <input
            type="number" value={Math.round(im.height)}
            onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 10 } as any)}
            className="w-full text-[10px] bg-slate-950/60 border border-white/10 rounded-lg p-1.5 font-bold text-white"
          />
        </div>
        <div>
          <label className="text-[9px] text-gray-400 font-bold block mb-1">الشفافية: {Math.round(im.opacity * 100)}%</label>
          <input
            type="range" min="0" max="100" value={im.opacity * 100}
            onChange={(e) => onUpdate({ opacity: parseInt(e.target.value) / 100 } as any)}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>
        <div>
          <label className="text-[9px] text-gray-400 font-bold block mb-1">التدوير: {Math.round(im.rotation)}°</label>
          <input
            type="range" min="0" max="360" value={im.rotation}
            onChange={(e) => onUpdate({ rotation: parseInt(e.target.value) } as any)}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>
      </div>
    );
  }
  return null;
};

// ============ LAYERS PANEL ============

const LayersPanel: React.FC<{ activePage: number }> = ({ activePage }) => {
  const objects = useEditorStore((s) => s.objects);
  const selectedId = useEditorStore((s) => s.selectedId);
  const selectObject = useEditorStore((s) => s.selectObject);
  const toggleVisible = useEditorStore((s) => s.toggleVisible);
  const toggleLocked = useEditorStore((s) => s.toggleLocked);
  const bringForward = useEditorStore((s) => s.bringForward);
  const sendBackward = useEditorStore((s) => s.sendBackward);
  const bringToFront = useEditorStore((s) => s.bringToFront);
  const sendToBack = useEditorStore((s) => s.sendToBack);
  const renameObject = useEditorStore((s) => s.renameObject);

  const pageObjects = objects.filter((o) => o.page === activePage).sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2 h-full">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black text-gray-300 uppercase tracking-wider">الطبقات</div>
        <span className="text-[10px] font-bold text-gray-400">{pageObjects.length}</span>
      </div>
      <div className="text-[10px] text-gray-400 font-bold">صفحة {activePage}</div>
      <div className="space-y-1 max-h-[500px] overflow-y-auto safe-scrollbar">
        {pageObjects.length === 0 ? (
          <div className="text-center text-[10px] text-gray-500 font-bold py-8">
            لا توجد طبقات بعد.
            <br />
            استخدم أدوات اليسار لإضافة عناصر.
          </div>
        ) : (
          pageObjects.map((obj) => (
            <div
              key={obj.id}
              onClick={() => selectObject(obj.id)}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                selectedId === obj.id ? "bg-blue-600/20 border border-blue-500/40" : "bg-white/5 hover:bg-white/10 border border-transparent"
              }`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleVisible(obj.id);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {obj.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLocked(obj.id);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {obj.locked ? <Lock className="h-3.5 w-3.5 text-amber-400" /> : <Unlock className="h-3.5 w-3.5" />}
              </button>
              <span className="text-[10px] text-gray-300">
                {obj.kind === "text" ? "📝" : obj.kind === "image" ? "🖼️" : obj.kind === "rect" ? "⬜" : obj.kind === "ellipse" ? "⭕" : obj.kind === "line" ? "➖" : "➡️"}
              </span>
              <input
                type="text"
                value={obj.name}
                onChange={(e) => renameObject(obj.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-transparent text-[10px] font-bold text-white outline-none border-b border-transparent focus:border-blue-500"
              />
              <div className="flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    bringToFront(obj.id);
                  }}
                  title="للأمام"
                  className="text-gray-400 hover:text-white p-0.5"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    sendToBack(obj.id);
                  }}
                  title="للخلف"
                  className="text-gray-400 hover:text-white p-0.5"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ============ PDF RENDERING HELPERS ============

async function drawTextObject(pdfDoc: PDFDocument, page: any, obj: TextEditorObject) {
  const dataUrl = drawTextAsPng({
    text: obj.text,
    fontSize: obj.fontSize,
    colorHex: obj.color,
    useBg: obj.useBg,
    bgColorHex: obj.bgColor,
    fontFamily: obj.fontFamily,
    strokeColorHex: obj.strokeColor,
    useStroke: obj.useStroke,
    bold: obj.bold,
    fontWeight: obj.fontWeight,
    italic: obj.italic,
    align: obj.align,
    renderScale: 2.8,
    useShadow: obj.useShadow,
  });
  if (!dataUrl) return;

  const base64 = dataUrl.split(",")[1];
  const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const embedded = await pdfDoc.embedPng(imgBytes);

  // The PNG is high-res; scale down to fit the requested width
  const aspect = embedded.width / embedded.height;
  const drawW = obj.width;
  const drawH = drawW / aspect;

  // obj.x, obj.y is top-left in PDF coords (Y from bottom). drawImage uses bottom-left origin.
  page.drawImage(embedded, {
    x: obj.x,
    y: obj.y, // since obj.y is already the BOTTOM in our convention (top-left = y), and drawImage y is bottom-left
    width: drawW,
    height: drawH,
    opacity: obj.opacity,
    rotate: degrees(obj.rotation),
  });
}

function drawShapeObject(page: any, obj: ShapeEditorObject) {
  const hexToRgb = (hex: string) => {
    const clean = hex.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    return {
      r: parseInt(full.slice(0, 2), 16) / 255,
      g: parseInt(full.slice(2, 4), 16) / 255,
      b: parseInt(full.slice(4, 6), 16) / 255,
    };
  };

  const stroke = hexToRgb(obj.strokeColor);
  const fill = hexToRgb(obj.fillColor);

  if (obj.kind === "rect") {
    page.drawRectangle({
      x: obj.x,
      y: obj.y,
      width: obj.width,
      height: obj.height,
      borderColor: rgb(stroke.r, stroke.g, stroke.b),
      borderWidth: obj.strokeWidth,
      color: obj.useFill ? rgb(fill.r, fill.g, fill.b) : undefined,
      opacity: obj.opacity,
      rotate: degrees(obj.rotation),
    });
  } else if (obj.kind === "ellipse") {
    page.drawEllipse({
      x: obj.x + obj.width / 2,
      y: obj.y + obj.height / 2,
      xScale: obj.width / 2,
      yScale: obj.height / 2,
      borderColor: rgb(stroke.r, stroke.g, stroke.b),
      borderWidth: obj.strokeWidth,
      color: obj.useFill ? rgb(fill.r, fill.g, fill.b) : undefined,
      opacity: obj.opacity,
      rotate: degrees(obj.rotation),
    });
  } else if (obj.kind === "line") {
    page.drawLine({
      start: { x: obj.x, y: obj.y + obj.height / 2 },
      end: { x: obj.x + obj.width, y: obj.y + obj.height / 2 },
      thickness: obj.strokeWidth,
      color: rgb(stroke.r, stroke.g, stroke.b),
      opacity: obj.opacity,
    });
  } else if (obj.kind === "arrow") {
    // Line + triangle for arrow head
    page.drawLine({
      start: { x: obj.x, y: obj.y + obj.height / 2 },
      end: { x: obj.x + obj.width - 8, y: obj.y + obj.height / 2 },
      thickness: obj.strokeWidth,
      color: rgb(stroke.r, stroke.g, stroke.b),
      opacity: obj.opacity,
    });
    // Arrow head as a triangle (approximate with a polygon via drawSquare + rotation)
    const headSize = Math.max(8, obj.strokeWidth * 3);
    page.drawRectangle({
      x: obj.x + obj.width - headSize,
      y: obj.y + obj.height / 2 - headSize / 4,
      width: headSize,
      height: headSize / 2,
      color: rgb(stroke.r, stroke.g, stroke.b),
      opacity: obj.opacity,
      rotate: degrees(45),
    });
  }
}

async function drawImageObject(pdfDoc: PDFDocument, page: any, obj: ImageEditorObject) {
  const imgBytes = Uint8Array.from(atob(obj.pngBase64), (c) => c.charCodeAt(0));
  const embedded = await pdfDoc.embedPng(imgBytes);
  page.drawImage(embedded, {
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    opacity: obj.opacity,
    rotate: degrees(obj.rotation),
  });
}
