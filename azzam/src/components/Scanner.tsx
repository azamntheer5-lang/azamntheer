import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Camera, Upload, Sliders, Crop, RotateCw, Check, AlertCircle, RefreshCw, 
  Trash2, Plus, FileText, Download, Sparkles, Image as ImageIcon, Sparkle,
  SlidersHorizontal, ZoomIn, Eye, List, ChevronRight, ChevronLeft, CheckSquare
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

interface ScannerProps {
  pdfBytes: Uint8Array | null;
  onImageToPdf: (imageBytes: Uint8Array, mimeType: string, action: "append" | "new") => Promise<void>;
  /**
   * Called when the user chooses to append all scanned pages to the open PDF.
   * Receives the freshly compiled PDF bytes (existing PDF + all scanned pages
   * already merged in order). The parent should just set this as the active
   * document — no further merging required.
   */
  onAppendCompiledPdf?: (pdfBytes: Uint8Array) => Promise<void>;
  isProcessing: boolean;
}

interface ScannedPage {
  id: string;
  originalDataUrl: string; // original source
  processedDataUrl: string; // after applying filter/crop
  filter: "original" | "magic" | "bw" | "gray" | "contrast";
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  rotation: number; // 0, 90, 180, 270
  cropRect: { x: number; y: number; w: number; h: number } | null;
}

export const Scanner: React.FC<ScannerProps> = ({
  pdfBytes,
  onImageToPdf,
  onAppendCompiledPdf,
  isProcessing
}) => {
  // Input sources
  const [source, setSource] = useState<"camera" | "upload" | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Scanned / Captured Pages
  const [scannedPages, setScannedPages] = useState<ScannedPage[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"capture" | "editor" | "gallery">("capture");

  // Filter & Adjust States for the page currently being edited
  const [activeFilter, setActiveFilter] = useState<"original" | "magic" | "bw" | "gray" | "contrast">("magic");
  const [brightness, setBrightness] = useState<number>(10);
  const [contrast, setContrast] = useState<number>(20);
  
  // Crop state
  const [isCropping, setIsCropping] = useState(false);
  const [cropPoints, setCropPoints] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize camera list
  useEffect(() => {
    if (source === "camera") {
      navigator.mediaDevices.enumerateDevices()
        .then(devs => {
          const videoDevs = devs.filter(d => d.kind === "videoinput");
          setDevices(videoDevs);
          if (videoDevs.length > 0) {
            setSelectedDeviceId(videoDevs[0].deviceId);
          }
        })
        .catch(err => {
          console.error("Error listing cameras:", err);
          setCameraError("لم يتم العثور على كاميرات متصلة أو تم رفض الإذن.");
        });
    }
    return () => stopCamera();
  }, [source]);

  // Handle camera start
  useEffect(() => {
    if (source === "camera" && selectedDeviceId) {
      startCamera();
    }
  }, [selectedDeviceId]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      // Fallback to general constraints if exact fails
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraActive(true);
        }
      } catch (innerErr) {
        setCameraError("فشل تشغيل الكاميرا. يرجى التحقق من أذونات المتصفح.");
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Capture Image
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Capture exact video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

    const newPage: ScannedPage = {
      id: Math.random().toString(36).substring(2, 9),
      originalDataUrl: dataUrl,
      processedDataUrl: dataUrl,
      filter: "magic",
      brightness: 10,
      contrast: 20,
      rotation: 0,
      cropRect: null
    };

    setScannedPages(prev => [...prev, newPage]);
    setCurrentPageId(newPage.id);
    setActiveFilter("magic");
    setBrightness(10);
    setContrast(20);
    setViewMode("editor");
    stopCamera();
  };

  // Upload Photo instead of camera
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        const newPage: ScannedPage = {
          id: Math.random().toString(36).substring(2, 9),
          originalDataUrl: event.target.result,
          processedDataUrl: event.target.result,
          filter: "magic",
          brightness: 10,
          contrast: 20,
          rotation: 0,
          cropRect: null
        };
        setScannedPages(prev => [...prev, newPage]);
        setCurrentPageId(newPage.id);
        setActiveFilter("magic");
        setBrightness(10);
        setContrast(20);
        setViewMode("editor");
      }
    };
    reader.readAsDataURL(file);
  };

  // Re-run filter rendering whenever parameters change
  useEffect(() => {
    if (currentPageId) {
      applyFiltersAndAdjustments();
    }
  }, [currentPageId, activeFilter, brightness, contrast, cropPoints]);

  const applyFiltersAndAdjustments = () => {
    const page = scannedPages.find(p => p.id === currentPageId);
    if (!page) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = page.originalDataUrl;
    img.onload = () => {
      const canvas = editCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Base width/height
      let width = img.width;
      let height = img.height;

      // Rotate dimension adjustments if 90 or 270 degrees
      if (page.rotation === 90 || page.rotation === 270) {
        canvas.width = height;
        canvas.height = width;
      } else {
        canvas.width = width;
        canvas.height = height;
      }

      // Draw rotated original
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((page.rotation * Math.PI) / 180);
      ctx.drawImage(img, -width / 2, -height / 2, width, height);
      ctx.restore();

      // Handle custom crop rect if isCropping or cropped
      let sourceRect = cropPoints || page.cropRect;
      if (sourceRect) {
        // Create secondary canvas to hold cropped content
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = sourceRect.w;
        cropCanvas.height = sourceRect.h;
        const cropCtx = cropCanvas.getContext("2d");
        if (cropCtx) {
          cropCtx.drawImage(
            canvas,
            sourceRect.x, sourceRect.y, sourceRect.w, sourceRect.h,
            0, 0, sourceRect.w, sourceRect.h
          );
          // Resize edit canvas to match cropped dimension
          canvas.width = sourceRect.w;
          canvas.height = sourceRect.h;
          ctx.drawImage(cropCanvas, 0, 0);
        }
      }

      // Read image pixels for advanced document enhancement filters
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Contrast factor calculation
      const cFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      // Brightness helper
      const bOffset = brightness;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 1. Grayscale value
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        if (activeFilter === "gray") {
          r = g = b = gray;
        } else if (activeFilter === "bw") {
          // Smart adaptive or hard thresholding for binary look
          const threshold = 128 + bOffset;
          const binary = gray > threshold ? 255 : 0;
          r = g = b = binary;
        } else if (activeFilter === "magic") {
          // "Magic Color": dramatic contrast boost & light correction
          // Boost and flatten whites
          let mr = (r - 128) * 1.55 + 128 + 25 + bOffset;
          let mg = (g - 128) * 1.55 + 128 + 25 + bOffset;
          let mb = (b - 128) * 1.55 + 128 + 25 + bOffset;

          // Push highlights to pure white to look like standard white sheet
          const maxVal = Math.max(mr, mg, mb);
          if (maxVal > 195) {
            mr = Math.min(255, mr + 35);
            mg = Math.min(255, mg + 35);
            mb = Math.min(255, mb + 35);
          }

          r = Math.max(0, Math.min(255, mr));
          g = Math.max(0, Math.min(255, mg));
          b = Math.max(0, Math.min(255, mb));
        } else if (activeFilter === "contrast") {
          // High Contrast Filter
          r = cFactor * (r - 128) + 128 + bOffset;
          g = cFactor * (g - 128) + 128 + bOffset;
          b = cFactor * (b - 128) + 128 + bOffset;
        } else {
          // Original with simple manual brightness/contrast adjustments
          r = cFactor * (r - 128) + 128 + bOffset;
          g = cFactor * (g - 128) + 128 + bOffset;
          b = cFactor * (b - 128) + 128 + bOffset;
        }

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }

      ctx.putImageData(imgData, 0, 0);

      // Save processed data URL to the page structure
      const processedUrl = canvas.toDataURL("image/jpeg", 0.92);
      setScannedPages(prev => prev.map(p => {
        if (p.id === currentPageId) {
          return {
            ...p,
            processedDataUrl: processedUrl,
            filter: activeFilter,
            brightness,
            contrast
          };
        }
        return p;
      }));
    };
  };

  // Helper to rotate active page
  const handleRotateActive = () => {
    setScannedPages(prev => prev.map(p => {
      if (p.id === currentPageId) {
        const nextRotation = (p.rotation + 90) % 360;
        return { ...p, rotation: nextRotation };
      }
      return p;
    }));
  };

  // Apply crop manually
  const triggerManualCropToggle = () => {
    if (isCropping) {
      // Finalize and apply
      setIsCropping(false);
    } else {
      // Set defaults for cropping
      const canvas = editCanvasRef.current;
      if (canvas) {
        setCropPoints({
          x: canvas.width * 0.05,
          y: canvas.height * 0.05,
          w: canvas.width * 0.9,
          h: canvas.height * 0.9
        });
        setIsCropping(true);
      }
    }
  };

  const handleResetCrop = () => {
    setCropPoints(null);
    setIsCropping(false);
    setScannedPages(prev => prev.map(p => {
      if (p.id === currentPageId) {
        return { ...p, cropRect: null };
      }
      return p;
    }));
  };

  // Save changes to current page and return to captures
  const handleSavePageEdits = () => {
    setViewMode("gallery");
  };

  // Delete page
  const handleDeletePage = (id: string) => {
    const updated = scannedPages.filter(p => p.id !== id);
    setScannedPages(updated);
    if (updated.length > 0) {
      setCurrentPageId(updated[0].id);
    } else {
      setCurrentPageId(null);
      setViewMode("capture");
      setSource(null);
    }
  };

  // Final compile to PDF
  const handleCompileScans = async (action: "append" | "new") => {
    if (scannedPages.length === 0) return;

    try {
      // Let's bundle all pages
      let destDoc;
      if (action === "append" && pdfBytes) {
        destDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      } else {
        destDoc = await PDFDocument.create();
      }

      for (const page of scannedPages) {
        // Fetch image bytes from dataUrl
        const res = await fetch(page.processedDataUrl);
        const blob = await res.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const imgBytes = new Uint8Array(arrayBuffer);

        // All processed pages are exported as JPEG for compression and performance
        const embeddedImg = await destDoc.embedJpg(imgBytes);
        const { width, height } = embeddedImg.scale(0.8);
        
        const pdfPage = destDoc.addPage([width, height]);
        pdfPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width,
          height
        });
      }

      const finalPdfBytes = await destDoc.save();

      if (action === "append") {
        // We've already merged the existing PDF + all scanned pages into
        // finalPdfBytes above. Pass those bytes directly to the parent so
        // it can replace the active document — bypassing the buggy old
        // flow that only inserted the first scanned page.
        if (onAppendCompiledPdf) {
          await onAppendCompiledPdf(finalPdfBytes);
        } else {
          // Fallback: download as a new file if parent didn't wire the new callback
          const blob = new Blob([finalPdfBytes], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `مسح_عزام_مدمج_${new Date().toLocaleDateString("ar-EG").replace(/\//g, "-")}.pdf`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        alert(`🎉 تم دمج وإدراج ${scannedPages.length} صفحة ممسوحة ضوئياً مباشرة في ملفك المفتوح!`);
      } else {
        const blob = new Blob([finalPdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `مسح_عزام_الذكي_${new Date().toLocaleDateString("ar-EG").replace(/\//g, "-")}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        alert(`🎉 تم تصدير مستند الـ PDF الممسوح ضوئياً بنجاح (${scannedPages.length} صفحات)!`);
      }
    } catch (err) {
      console.error("Failed to compile scans:", err);
      alert("عذراً، حدث خطأ أثناء تجميع صفحات المسح الضوئي.");
    }
  };

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 shadow-3xs max-w-5xl mx-auto select-none space-y-6 text-right">
      
      {/* Vip Brand Banner for Azzam's Scanner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20">
            <Camera className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black text-amber-700 border border-amber-200/50 mb-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              أداة مدمجة فائقة الدقة والوضوح
            </span>
            <h3 className="text-base font-black text-white flex items-center gap-1.5">
              <span>ماسح عـزَّام الضوئي الاحترافي</span>
              <span className="text-xs text-amber-600 font-bold">(Azzam Smart Scan)</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              أقوى ماسح ضوئي ذكي في متصفحك يعزز جودة الصور، يطهر الخلفيات، ويحول الأوراق لمستندات PDF مطبوعة ونقية تماماً.
            </p>
          </div>
        </div>

        {/* Counter */}
        {scannedPages.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-100 px-3.5 py-1.5 rounded-xl self-start">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            <span className="text-xs font-black text-amber-800">
              عدد الصفحات الملتقطة: {scannedPages.length}
            </span>
          </div>
        )}
      </div>

      {/* Main Mode Selection (If not started yet) */}
      {!source && scannedPages.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl"
          >
            {/* Live Camera Scanner */}
            <button
              onClick={() => setSource("camera")}
              className="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-amber-50/20 to-amber-50/5 hover:from-amber-50/40 border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-3xl transition-all shadow-3xs hover:shadow-md cursor-pointer group"
            >
              <div className="h-16 w-16 bg-amber-100 group-hover:bg-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mb-4 transition-colors">
                <Camera className="h-8 w-8" />
              </div>
              <h4 className="text-sm font-black text-white mb-1">فتح كاميرا الجهاز والموبايل</h4>
              <p className="text-xs text-slate-500 max-w-xs font-semibold leading-relaxed">
                مسح المستندات حياً باستخدام كاميرا الكمبيوتر أو الهاتف مع ميزة كشف الزوايا التلقائي وتصحيح الإضاءة.
              </p>
            </button>

            {/* Photo Scanner Upload */}
            <div className="relative flex flex-col items-center justify-center p-8 bg-gradient-to-b from-indigo-50/20 to-indigo-50/5 hover:from-indigo-50/40 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-3xl transition-all shadow-3xs hover:shadow-md cursor-pointer group">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="h-16 w-16 bg-indigo-500/10 group-hover:bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 transition-colors">
                <Upload className="h-8 w-8" />
              </div>
              <h4 className="text-sm font-black text-white mb-1">معالجة صورة مستند جاهزة</h4>
              <p className="text-xs text-slate-500 max-w-xs font-semibold leading-relaxed">
                ارفع صورة تم التقاطها مسبقاً من ألبوم الصور الخاص بك لتحسينها وتحويلها فوراً إلى صفحة مستند رسمية مبيّضة وممسوحة ضوئياً.
              </p>
            </div>
          </motion.div>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500 font-bold max-w-md">
            <Sparkle className="h-4 w-4 text-amber-500" />
            <span>يدعم معالجة متطورة بكسل تلو الآخر لتصفية الورق، إزالة الظلال، وجعل النصوص والخطوط فائقة الوضوح.</span>
          </div>
        </div>
      )}

      {/* VIEW: Capture Mode (Camera Active Feed) */}
      {source === "camera" && viewMode === "capture" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/[0.08]">
            <div className="flex items-center gap-2">
              <label className="text-xs font-black text-slate-300">اختر الكاميرا النشطة:</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="text-xs font-bold border border-white/[0.08] bg-white/[0.04] rounded-lg px-2 py-1 focus:outline-hidden"
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `كاميرا ${devices.indexOf(d) + 1}`}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => { setSource(null); stopCamera(); }}
              className="text-xs font-bold text-gray-550 hover:text-white border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 rounded-lg cursor-pointer"
            >
              إلغاء والعودة
            </button>
          </div>

          <div className="relative aspect-video max-w-2xl mx-auto bg-black rounded-2xl overflow-hidden border border-gray-800 flex items-center justify-center group shadow-md">
            {cameraActive ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover scale-x-[-1]"
                playsInline
                muted
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 gap-2">
                <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
                <span className="text-xs text-slate-500 font-bold">جاري تشغيل عدسة الكاميرا عالية الدقة...</span>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 bg-gray-900/95 flex flex-col items-center justify-center text-center p-6 gap-3 z-10">
                <AlertCircle className="h-10 w-10 text-rose-500" />
                <span className="text-sm font-black text-white">{cameraError}</span>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}

            {/* Capturing Reticle overlay */}
            {cameraActive && (
              <div className="absolute inset-6 border-2 border-white/20 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="h-8 w-8 border-t-2 border-r-2 border-white absolute top-0 right-0 rounded-tr-md" />
                <div className="h-8 w-8 border-t-2 border-l-2 border-white absolute top-0 left-0 rounded-tl-md" />
                <div className="h-8 w-8 border-b-2 border-r-2 border-white absolute bottom-0 right-0 rounded-br-md" />
                <div className="h-8 w-8 border-b-2 border-l-2 border-white absolute bottom-0 left-0 rounded-bl-md" />
                
                <span className="text-[10px] text-white/50 bg-black/40 px-3 py-1.5 rounded-full font-bold backdrop-blur-3xs">
                  وجه الكاميرا بانتظام نحو الورقة بشكل رأسي ومستقيم
                </span>
              </div>
            )}
          </div>

          {cameraActive && (
            <div className="flex items-center justify-center pt-2">
              <button
                onClick={handleCapture}
                className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 border-4 border-white shadow-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
                title="التقاط صورة المستند الآن"
              >
                <div className="h-6 w-6 rounded-full bg-white/[0.04] animate-pulse" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW: Editor Mode (Apply Premium Filters, Crop, Rotate, Adjust) */}
      {viewMode === "editor" && currentPageId && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Preview Canvas with filter/crop render */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4 flex items-center justify-center relative min-h-[400px]">
              
              {/* Filter rendering canvas */}
              <canvas
                ref={editCanvasRef}
                className="max-w-full max-h-[460px] object-contain rounded-lg shadow-sm bg-white/[0.04]"
              />

              {/* Crop control point overlay (Interactive mockup helper for perfect alignment) */}
              {isCropping && cropPoints && (
                <div 
                  className="absolute border-2 border-amber-500 bg-amber-500/10 rounded-xs pointer-events-auto cursor-move flex items-center justify-center shadow-md"
                  style={{
                    left: `${cropPoints.x / 4}%`,
                    top: `${cropPoints.y / 4}%`,
                    width: `${cropPoints.w / 4}%`,
                    height: `${cropPoints.h / 4}%`,
                  }}
                >
                  <div className="absolute top-0 left-0 h-4 w-4 bg-amber-500 border border-white rounded-full -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" />
                  <div className="absolute top-0 right-0 h-4 w-4 bg-amber-500 border border-white rounded-full translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" />
                  <div className="absolute bottom-0 left-0 h-4 w-4 bg-amber-500 border border-white rounded-full -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" />
                  <div className="absolute bottom-0 right-0 h-4 w-4 bg-amber-500 border border-white rounded-full translate-x-1/2 translate-y-1/2 cursor-nwse-resize" />
                  <span className="text-[9px] bg-amber-600 text-white font-extrabold px-1.5 py-0.5 rounded-md">تأطير المستند</span>
                </div>
              )}
            </div>

            {/* Micro adjustments panel */}
            <div className="flex flex-wrap items-center justify-center gap-4 bg-white/[0.02] border border-white/[0.08] p-3.5 rounded-xl">
              <button
                onClick={handleRotateActive}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] hover:border-white/10 rounded-lg text-xs font-bold text-slate-300 cursor-pointer shadow-3xs"
              >
                <RotateCw className="h-3.5 w-3.5 text-indigo-600" />
                <span>تدوير الصفحة 90°</span>
              </button>

              <button
                onClick={triggerManualCropToggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-bold cursor-pointer shadow-3xs transition-all ${
                  isCropping 
                    ? "bg-amber-500 border-amber-500 text-white font-black" 
                    : "bg-white/[0.04] border-white/[0.08] hover:border-white/10 text-slate-300"
                }`}
              >
                <Crop className="h-3.5 w-3.5" />
                <span>{isCropping ? "تأكيد وقص الصورة" : "تأطير وقص المستند"}</span>
              </button>

              {cropPoints && (
                <button
                  onClick={handleResetCrop}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-150 hover:border-rose-300 rounded-lg text-xs font-bold text-rose-700 cursor-pointer"
                >
                  <span>إعادة ضبط التأطير</span>
                </button>
              )}
            </div>
          </div>

          {/* Right panel: Filter Selections & Sliders */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* 1. Filter selectors */}
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4.5 space-y-3.5">
              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-amber-500" />
                <span>اختر فلتر التبييض والمسح:</span>
              </h4>

              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: "magic", label: "✨ فلتر عـزَّام السحري (موصى به)", desc: "تبييض الصفحة تماماً، إزالة الظلال وتثبيت الألوان" },
                  { id: "bw", label: "🖤 أبيض وأسود عالي التباين (B&W)", desc: "مناسب للمستندات والخطابات الرسمية والباركود" },
                  { id: "gray", label: "🌫️ رمادي ناعم (Grayscale)", desc: "درجات الرمادي الكلاسيكية للصور والرسومات" },
                  { id: "contrast", label: "⚡ تباين فائق (Contrast Boost)", desc: "تعزيز السطوع ووضوح النصوص الممسوحة" },
                  { id: "original", label: "📷 الصورة الأصلية غير المعدلة", desc: "يبقي الصورة بجودتها وألوانها الأساسية" }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id as any)}
                    className={`p-3 rounded-xl text-right border transition-all cursor-pointer flex flex-col ${
                      activeFilter === f.id
                        ? "border-amber-500 bg-amber-500/10/50 shadow-3xs"
                        : "border-white/[0.08] bg-white/[0.04] hover:border-white/10"
                    }`}
                  >
                    <span className={`text-xs font-black ${activeFilter === f.id ? "text-amber-800" : "text-slate-300"}`}>
                      {f.label}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold mt-1 leading-normal">{f.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Interactive Brightness & Contrast Sliders */}
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4.5 space-y-4">
              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                <SlidersHorizontal className="h-4 w-4 text-amber-500" />
                <span>تعديل السطوع والوضوح اليدوي:</span>
              </h4>

              {/* Brightness */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span>إضاءة الصفحة (Brightness)</span>
                  <span className="font-mono text-amber-600">{brightness > 0 ? `+${brightness}` : brightness}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span>حدة التباين (Contrast)</span>
                  <span className="font-mono text-amber-600">{contrast > 0 ? `+${contrast}` : contrast}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
                />
              </div>
            </div>

            {/* Actions for current page */}
            <div className="flex gap-2">
              <button
                onClick={handleSavePageEdits}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-3 text-xs font-black text-white shadow-md shadow-amber-500/10 cursor-pointer active:scale-98"
              >
                <Check className="h-4 w-4" />
                <span>حفظ الصفحة والانتقال</span>
              </button>

              <button
                onClick={() => handleDeletePage(currentPageId)}
                className="p-3 bg-rose-50 border border-rose-150 hover:bg-rose-100 hover:border-rose-300 text-rose-600 rounded-xl cursor-pointer"
                title="حذف هذه الصفحة والتقاط غيرها"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* VIEW: Gallery / Multi-Page manager */}
      {viewMode === "gallery" && scannedPages.length > 0 && (
        <div className="space-y-6">
          <div className="p-4 bg-amber-500/10/40 border border-amber-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-right">
              <h4 className="text-xs font-black text-amber-900">ترتيب صفحات المستند الممسوح ضوئياً</h4>
              <p className="text-[10px] text-amber-700 font-bold mt-0.5">
                تصفح الصفحات الملتقطة، أضف صفحات جديدة للمسح، أو قم بتصدير الملف المدمج بالكامل مباشرة.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setViewMode("capture"); setSource("camera"); }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] border border-amber-200 hover:border-amber-400 text-amber-700 rounded-lg text-xs font-bold cursor-pointer shadow-3xs"
              >
                <Plus className="h-4 w-4 text-amber-500" />
                <span>التقاط صفحة إضافية</span>
              </button>
              
              <label className="relative inline-flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] border border-indigo-200 hover:border-indigo-400 text-indigo-700 rounded-lg text-xs font-bold cursor-pointer shadow-3xs">
                <Upload className="h-4 w-4 text-indigo-500" />
                <span>رفع صورة كصفحة</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Grid of scanned pages */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {scannedPages.map((p, index) => (
              <motion.div
                key={p.id}
                whileHover={{ y: -3 }}
                className={`relative bg-white/[0.02] border rounded-2xl p-2.5 flex flex-col justify-between ${
                  currentPageId === p.id ? "border-amber-500 bg-amber-500/10/10 shadow-3xs" : "border-white/[0.08] hover:border-white/10"
                }`}
              >
                <div className="absolute top-2 right-2 bg-black/60 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md z-10">
                  الصفحة {index + 1}
                </div>

                {/* Edit Button overlay */}
                <button
                  onClick={() => { setCurrentPageId(p.id); setViewMode("editor"); }}
                  className="absolute bottom-11 right-2 p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg cursor-pointer z-10 shadow-xs"
                  title="تعديل الفلتر وتأطير الصفحة"
                >
                  <Sliders className="h-3 w-3" />
                </button>

                {/* Remove Button overlay */}
                <button
                  onClick={() => handleDeletePage(p.id)}
                  className="absolute bottom-11 left-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer z-10 shadow-xs"
                  title="حذف هذه الصفحة"
                >
                  <Trash2 className="h-3 w-3" />
                </button>

                {/* Thumbnail */}
                <div className="aspect-[3/4] bg-white/[0.04] rounded-lg border border-white/[0.08] overflow-hidden flex items-center justify-center p-1 cursor-pointer mb-2.5"
                     onClick={() => { setCurrentPageId(p.id); setViewMode("editor"); }}>
                  <img
                    src={p.processedDataUrl}
                    alt={`Scanned page ${index + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>

                <div className="text-[10px] text-slate-500 font-bold text-center border-t border-white/[0.08] pt-1.5">
                  فلتر: {p.filter === "magic" ? "عزَّام السحري" : p.filter === "bw" ? "أبيض وأسود" : p.filter === "gray" ? "رمادي" : "أصلية"}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Compile and Save Actions */}
          <div className="border-t border-white/[0.08] pt-5 mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleCompileScans("new")}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 px-5 py-3 text-xs font-black text-white shadow-md shadow-amber-500/15 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>تحميل كملف PDF مستقل وجديد</span>
              </button>

              {pdfBytes && (
                <button
                  onClick={() => handleCompileScans("append")}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-3 text-xs font-black text-white shadow-md shadow-indigo-500/15 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>إدراج وإلحاق بالـ PDF الحالي المفتوح</span>
                </button>
              )}
            </div>

            <button
              onClick={() => { setScannedPages([]); setCurrentPageId(null); setSource(null); }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 border border-rose-100 bg-rose-50/50 px-4 py-3 rounded-xl cursor-pointer"
            >
              تفريغ كل الصفحات والبدء من جديد
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
