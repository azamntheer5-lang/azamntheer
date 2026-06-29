import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { 
  Image, Sparkles, Sliders, Minimize2, Move, Download, RefreshCw, FileImage, Layers, Trash2, ArrowUp, ArrowDown, FileCheck
} from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { CloudApiService } from "../services/api";

interface ImageFile {
  id: string;
  file: File;
  name: string;
  size: number;
  dataUrl: string;
  width: number;
  height: number;
}

export const ImageTools: React.FC = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Network HUD Progress
  const [networkProgress, setNetworkProgress] = useState<{
    uploadProgress: number;
    downloadProgress: number;
    speedKbps?: number;
    statusText?: string;
    isActive: boolean;
  }>({
    uploadProgress: 0,
    downloadProgress: 0,
    isActive: false
  });

  // Conversion & Compression settings (for single image operation)
  const [targetFormat, setTargetFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [compressionQuality, setCompressionQuality] = useState<number>(85); // 1-100
  const [resizeWidth, setResizeWidth] = useState<number>(0);
  const [resizeHeight, setResizeHeight] = useState<number>(0);
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);
  const [activeSingleIdx, setActiveSingleIdx] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (type: "success" | "error" | "info", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const readImageStats = (file: File, dataUrl: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = document.createElement("img");
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
      };
      img.src = dataUrl;
    });
  };

  const processImageFiles = async (fileList: FileList) => {
    const validFiles: ImageFile[] = [];
    setIsProcessing(true);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.type.startsWith("image/")) {
        continue;
      }

      try {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        const dims = await readImageStats(file, dataUrl);

        validFiles.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          name: file.name,
          size: file.size,
          dataUrl,
          width: dims.width,
          height: dims.height
        });
      } catch (err) {
        console.error("Error reading image:", err);
      }
    }

    if (validFiles.length > 0) {
      setImages(prev => {
        const next = [...prev, ...validFiles];
        // Initialize resize values for the first newly added active image
        if (next.length > 0) {
          const active = next[activeSingleIdx] || next[0];
          setResizeWidth(active.width);
          setResizeHeight(active.height);
        }
        return next;
      });
      showNotification("success", `تمت إضافة ${validFiles.length} صور إلى مساحة العمل.`);
    } else {
      showNotification("error", "يرجى اختيار ملفات صور صالحة فقط.");
    }
    setIsProcessing(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processImageFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processImageFiles(e.target.files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = (id: string, idx: number) => {
    setImages(prev => {
      const next = prev.filter(img => img.id !== id);
      if (activeSingleIdx >= next.length) {
        setActiveSingleIdx(Math.max(0, next.length - 1));
      }
      return next;
    });
    showNotification("info", "تمت إزالة الصورة.");
  };

  const handleMoveImage = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === images.length - 1) return;

    const swapIdx = direction === "up" ? index - 1 : index + 1;
    const next = [...images];
    const temp = next[index];
    next[index] = next[swapIdx];
    next[swapIdx] = temp;

    setImages(next);
  };

  const handleWidthChange = (val: number) => {
    setResizeWidth(val);
    const activeImg = images[activeSingleIdx];
    if (maintainAspect && activeImg && activeImg.width > 0) {
      const aspect = activeImg.height / activeImg.width;
      setResizeHeight(Math.round(val * aspect));
    }
  };

  const handleHeightChange = (val: number) => {
    setResizeHeight(val);
    const activeImg = images[activeSingleIdx];
    if (maintainAspect && activeImg && activeImg.height > 0) {
      const aspect = activeImg.width / activeImg.height;
      setResizeWidth(Math.round(val * aspect));
    }
  };

  // Convert & Compress Single Image
  const handleProcessSingleImage = async () => {
    const activeImg = images[activeSingleIdx];
    if (!activeImg) return;

    setIsProcessing(true);
    setNetworkProgress({
      uploadProgress: 0,
      downloadProgress: 0,
      speedKbps: 0,
      statusText: "جاري تهيئة رفع الصورة للمعالجة السحابية...",
      isActive: true
    });

    try {
      const result = await CloudApiService.convertImage(
        activeImg.file,
        targetFormat,
        compressionQuality,
        resizeWidth || activeImg.width,
        resizeHeight || activeImg.height,
        (p) => {
          setNetworkProgress({
            uploadProgress: p.uploadProgress,
            downloadProgress: p.downloadProgress,
            speedKbps: p.speedKbps,
            statusText: p.statusText,
            isActive: true
          });
        }
      );

      // Create download from returned arrayBuffer bytes
      const blob = new Blob([result.bytes], { type: `image/${targetFormat}` });
      const downloadUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = downloadUrl;
      const origBaseName = activeImg.name.substring(0, activeImg.name.lastIndexOf("."));
      a.download = `${origBaseName}_عزام.${targetFormat}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

      showNotification("success", "تمت معالجة الصورة سحابياً بنجاح وتنزيلها بالصيغة والجودة المطلوبة!");
    } catch (err: any) {
      console.error(err);
      showNotification("error", "فشلت معالجة الصورة سحابياً: " + err.message);
    } finally {
      setIsProcessing(false);
      setNetworkProgress(prev => ({ ...prev, isActive: false }));
    }
  };

  // Convert all listed images into a single combined PDF!
  const handleExportAllToPdf = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    showNotification("info", "جاري رص وتضمين كافة الصور داخل ملف PDF موحد...");

    try {
      const pdfDoc = await PDFDocument.create();

      for (const imgItem of images) {
        const imgEl = document.createElement("img");
        await new Promise<void>((resolve, reject) => {
          imgEl.onload = () => resolve();
          imgEl.onerror = () => reject();
          imgEl.src = imgItem.dataUrl;
        });

        // Add page matching the image aspect ratio
        const page = pdfDoc.addPage([imgItem.width, imgItem.height]);
        
        // Fetch raw image bytes
        const imageBytes = await fetch(imgItem.dataUrl).then(res => res.arrayBuffer());
        
        // Determine PNG vs JPG embedding
        let pdfImg;
        if (imgItem.file.type === "image/png" || imgItem.dataUrl.startsWith("data:image/png")) {
          pdfImg = await pdfDoc.embedPng(imageBytes);
        } else {
          pdfImg = await pdfDoc.embedJpg(imageBytes);
        }

        page.drawImage(pdfImg, {
          x: 0,
          y: 0,
          width: imgItem.width,
          height: imgItem.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ألبوم_صور_عزام_${new Date().toLocaleDateString("ar-EG").replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      showNotification("success", "تم دمج كافة الصور وتصديرها كملف PDF موحد ومكتمل بنجاح!");
    } catch (err: any) {
      console.error(err);
      showNotification("error", "فشل تصدير الصور إلى PDF: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const activeImg = images[activeSingleIdx] || null;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-slate-900/95 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-lg border border-slate-800 animate-slide-up">
          <span className={`h-2.5 w-2.5 rounded-full ${
            notification.type === "success" ? "bg-emerald-500 animate-ping" : 
            notification.type === "error" ? "bg-rose-500 animate-pulse" : "bg-blue-500 animate-pulse"
          }`} />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Upload Zone vs Active Studio */}
      {images.length === 0 ? (
        <div className="w-full max-w-4xl mx-auto">
          {/* Section Description Card */}
          <div className="bg-gradient-to-r from-purple-50 to-purple-100/30 border border-purple-100 p-6 rounded-2xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-purple-900 flex items-center gap-1.5 justify-end">
                <span>استوديو عـزَّام المتكامل لمعالجة وتحويل الصور</span>
                <Sparkles className="h-4.5 w-4.5 text-purple-500 animate-pulse" />
              </h3>
              <p className="text-xs font-bold text-purple-700/80 leading-relaxed">
                استوديو متقدم للتعامل مع الصور؛ قم بضغط حجمها، تغيير أبعادها بدقة مع الحفاظ على الأبعاد، تحويلها إلى صيغ PNG أو WebP أو JPG، أو دمج مجموعة صور كاملة في ملف PDF واحد منسق.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-purple-100/80 shadow-3xs shrink-0">
              <span className="text-[10px] font-black text-purple-600">CANVAS GPU ENGINE</span>
              <div className="h-2 w-2 rounded-full bg-purple-500" />
            </div>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer ${
              dragActive 
                ? "border-purple-500 bg-purple-50/50 scale-[1.01]" 
                : "border-gray-200 bg-white hover:border-purple-400 hover:bg-gray-50/30"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />
            
            <div className="p-4.5 bg-purple-50 rounded-2xl text-purple-600 mb-4 shadow-3xs">
              <Image className="h-10 w-10 animate-pulse" />
            </div>

            <h3 className="text-sm font-black text-gray-800 mb-1">اسحب الصور هنا أو اضغط للتصفح والرفع</h3>
            <p className="text-[11px] font-bold text-gray-400">يدعم رفع مجموعة صور متعددة معاً للتحويل والدمج المباشر</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Image files manager / List (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Global Actions Card */}
            <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <button
                  onClick={() => setImages([])}
                  className="text-[11px] font-black text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100/50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  إفراغ الاستوديو
                </button>
                <h3 className="text-xs font-black text-gray-800">قائمة الصور المرفوعة ({images.length})</h3>
              </div>

              {/* PDF Compiler button for multiple images */}
              <button
                onClick={handleExportAllToPdf}
                disabled={isProcessing}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-4 py-3.5 text-xs font-black text-white shadow-md shadow-indigo-500/10 active:scale-98 cursor-pointer"
              >
                <Layers className="h-4.5 w-4.5" />
                <span>دمج كافة الصور وتصديرها كـ PDF</span>
              </button>

              <button
                onClick={triggerFileInput}
                className="w-full text-center py-2 border border-dashed border-gray-200 hover:border-purple-300 text-xs font-bold text-gray-500 hover:text-purple-600 rounded-xl cursor-pointer"
              >
                + إضافة المزيد من الصور
              </button>
            </div>

            {/* List items with visually interactive thumbnail reordering */}
            <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-3xs space-y-3.5 max-h-[380px] overflow-y-auto safe-scrollbar">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  onClick={() => {
                    setActiveSingleIdx(idx);
                    setResizeWidth(img.width);
                    setResizeHeight(img.height);
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    activeSingleIdx === idx 
                      ? "bg-purple-50/50 border-purple-200" 
                      : "bg-transparent border-gray-100/60 hover:bg-gray-50/50"
                  }`}
                >
                  {/* Sorting & Deletion controllers */}
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <button 
                        disabled={idx === 0}
                        onClick={(e) => { e.stopPropagation(); handleMoveImage(idx, "up"); }}
                        className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-800 rounded-md cursor-pointer disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        disabled={idx === images.length - 1}
                        onClick={(e) => { e.stopPropagation(); handleMoveImage(idx, "down"); }}
                        className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-800 rounded-md cursor-pointer disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveImage(img.id, idx); }}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Thumbnail & Dimensions */}
                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-700 line-clamp-1 max-w-[120px]">{img.name}</h4>
                      <span className="text-[9px] text-gray-400 font-bold block">{img.width}x{img.height} px • {(img.size / 1024).toFixed(0)} KB</span>
                    </div>
                    <img
                      src={img.dataUrl}
                      alt="Thumbnail"
                      className="h-10 w-10 rounded-lg object-cover border border-gray-150"
                    />
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Right panel: Active selected image editor studio (8 cols) */}
          {activeImg && (
            <div className="lg:col-span-8 bg-white border border-gray-150 rounded-2xl p-6 shadow-3xs space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ACTIVE IMAGE RUNTIME</span>
                <h3 className="text-sm font-black text-gray-800 flex items-center gap-1.5">
                  <FileCheck className="h-4.5 w-4.5 text-purple-600 animate-pulse" />
                  <span>لوحة معالجة الصورة النشطة: {activeImg.name}</span>
                </h3>
              </div>

              {/* Dynamic canvas wrapper & original info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-gray-50/50 border border-gray-100 p-5 rounded-2xl">
                <div className="flex justify-center">
                  <img
                    src={activeImg.dataUrl}
                    alt="Active Preview"
                    className="max-h-[220px] rounded-xl object-contain shadow-sm border border-gray-200"
                  />
                </div>

                <div className="space-y-3.5">
                  <h4 className="text-xs font-black text-gray-700">بيانات الصورة الأصلية:</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white border border-gray-150 p-2.5 rounded-xl text-center shadow-3xs">
                      <span className="text-[9px] font-bold text-gray-400 block mb-0.5">الحجم الحالي</span>
                      <span className="text-xs font-black text-gray-800">{(activeImg.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <div className="bg-white border border-gray-150 p-2.5 rounded-xl text-center shadow-3xs">
                      <span className="text-[9px] font-bold text-gray-400 block mb-0.5">الأبعاد الأصلية</span>
                      <span className="text-xs font-black text-gray-800">{activeImg.width} x {activeImg.height}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversion, quality & resize controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Format and Compression */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-black text-gray-800 mb-2 flex items-center gap-1.5 justify-end">
                      <span>صيغة الصورة المطلوبة</span>
                      <Sliders className="h-4 w-4 text-purple-600" />
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {(["png", "jpeg", "webp"] as const).map(fmt => (
                        <button
                          key={fmt}
                          onClick={() => setTargetFormat(fmt)}
                          className={`py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                            targetFormat === fmt 
                              ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/10" 
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {targetFormat !== "png" && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-purple-600">{compressionQuality}%</span>
                        <span className="text-xs font-black text-gray-700">جودة وضغط الصورة (توفير مساحة)</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={compressionQuality}
                        onChange={(e) => setCompressionQuality(Number(e.target.value))}
                        className="w-full accent-purple-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] font-bold text-gray-400">
                        <span>أعلى ضغط (حجم أصغر)</span>
                        <span>أعلى جودة (حجم أكبر)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Resize control */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-1">
                    <button
                      onClick={() => setMaintainAspect(!maintainAspect)}
                      className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        maintainAspect 
                          ? "bg-purple-50 border-purple-200 text-purple-700" 
                          : "bg-gray-50 border-gray-200 text-gray-400"
                      }`}
                    >
                      {maintainAspect ? "🔒 تناسب الأبعاد مفعّل" : "🔓 أبعاد حرة"}
                    </button>
                    <h3 className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                      <span>تغيير الأبعاد (Resize)</span>
                      <Minimize2 className="h-4 w-4 text-purple-600" />
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400">العرض (Width - px)</label>
                      <input
                        type="number"
                        value={resizeWidth}
                        onChange={(e) => handleWidthChange(Number(e.target.value))}
                        className="w-full p-2.5 text-xs font-black rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white text-center outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400">الارتفاع (Height - px)</label>
                      <input
                        type="number"
                        value={resizeHeight}
                        onChange={(e) => handleHeightChange(Number(e.target.value))}
                        className="w-full p-2.5 text-xs font-black rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white text-center outline-none"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Action process button */}
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={handleProcessSingleImage}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-6 py-3.5 text-xs font-black text-white shadow-md shadow-purple-500/10 active:scale-98 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>جاري معالجة الصورة...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>معالجة وتنزيل الصورة المحددة</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
