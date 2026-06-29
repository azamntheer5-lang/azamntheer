import React, { useState, useEffect, useRef } from "react";
import { pdfjsLib, copyBytesForPdfjs } from "../lib/pdfjs";
import { 
  Sparkles, PenTool, Type, Search, Eye, ShieldCheck, 
  Trash2, Plus, Info, Check, RefreshCw, Type as TextIcon,
  Layers, Lock, Compass, HelpCircle
} from "lucide-react";

interface InteractiveCanvasProps {
  pdfBytes: Uint8Array;
  totalPages: number;
  onApplyTextAnnotation: (
    pageNum: number,
    text: string,
    x: number,
    y: number,
    fontSize: number,
    color: string,
    useBg: boolean,
    bgColor: string,
    fontFamily?: string,
    strokeColor?: string,
    useStroke?: boolean
  ) => Promise<void>;
  onApplySignature: (
    pageNum: number,
    sigPngBytes: Uint8Array,
    x: number,
    y: number,
    width: number,
    height: number
  ) => Promise<void>;
  onApplyRedaction: (
    words: string[],
    boxColor: string,
    opacity: number,
    replaceText: string,
    replaceTextColor: string,
    replaceTextSize: string
  ) => Promise<void>;
  onApplyWatermark: (
    text: string,
    size: number,
    color: string,
    opacity: number
  ) => Promise<void>;
  onApplyPageNumbers: (
    pos: string,
    start: number,
    size: number,
    color: string
  ) => Promise<void>;
  onApplySearchReplace: (
    search: string,
    replace: string
  ) => Promise<void>;
  isProcessing: boolean;
}

export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  pdfBytes,
  totalPages,
  onApplyTextAnnotation,
  onApplySignature,
  onApplyRedaction,
  onApplyWatermark,
  onApplyPageNumbers,
  onApplySearchReplace,
  isProcessing
}) => {
  // Page selector state
  const [selectedPage, setSelectedPage] = useState(1);
  const [pageLoading, setPageLoading] = useState(false);
  const [activeEditorMode, setActiveEditorMode] = useState<"signature" | "text" | "redact" | "search_replace" | "watermark">("signature");

  // Page Dimension caches for scaling coordinate translations
  const [pdfPageWidth, setPdfPageWidth] = useState(595); // default A4 width
  const [pdfPageHeight, setPdfPageHeight] = useState(842); // default A4 height
  const [canvasRenderWidth, setCanvasRenderWidth] = useState(400);
  const [canvasRenderHeight, setCanvasRenderHeight] = useState(600);

  // References
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);

  // Signature states
  const [sigColor, setSigColor] = useState("#000000");
  const [sigPenSize, setSigPenSize] = useState(2.5);
  const [isDrawingSig, setIsDrawingSig] = useState(false);
  const [sigHasInk, setSigHasInk] = useState(false);

  // Text inputs
  const [textToInsert, setTextToInsert] = useState("");
  const [textFontSize, setTextFontSize] = useState(14);
  const [textHexColor, setTextHexColor] = useState("#ea4335");
  const [textUseBg, setTextUseBg] = useState(false);
  const [textBgColor, setTextBgColor] = useState("#ffffff");
  const [textFontFamily, setTextFontFamily] = useState("Tajawal");
  const [textUseStroke, setTextUseStroke] = useState(false);
  const [textStrokeColor, setTextStrokeColor] = useState("#000000");

  // Signature & Custom Image states
  const [signatureType, setSignatureType] = useState<"draw" | "upload">("draw");
  const [uploadedImageBytes, setUploadedImageBytes] = useState<Uint8Array | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [uploadedImageWidth, setUploadedImageWidth] = useState(120);
  const [uploadedImageHeight, setUploadedImageHeight] = useState(120);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setUploadedImagePreview(dataUrl);

        // Load into an HTML Image to preserve aspect ratio and serialize as PNG bytes
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const pngUrl = canvas.toDataURL("image/png");
            const base64 = pngUrl.split(",")[1];
            const binStr = atob(base64);
            const bytes = new Uint8Array(binStr.length);
            for (let i = 0; i < binStr.length; i++) {
              bytes[i] = binStr.charCodeAt(i);
            }
            setUploadedImageBytes(bytes);
            
            const aspect = img.naturalHeight / img.naturalWidth;
            setUploadedImageWidth(140);
            setUploadedImageHeight(Math.round(140 * aspect));
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  // Redaction inputs
  const [redactWords, setRedactWords] = useState("");
  const [redactBoxColor, setRedactBoxColor] = useState("#202124");
  const [redactOpacity, setRedactOpacity] = useState(100);
  const [redactUseReplace, setRedactUseReplace] = useState(false);
  const [redactReplaceText, setRedactReplaceText] = useState("");
  const [redactReplaceTextColor, setRedactReplaceTextColor] = useState("#ffffff");
  const [redactReplaceTextSize, setRedactReplaceTextSize] = useState("auto");

  // Search & Replace inputs
  const [searchText, setSearchText] = useState("");
  const [replaceText, setReplaceText] = useState("");

  // Watermark inputs
  const [wmText, setWmText] = useState("");
  const [wmSize, setWmSize] = useState(48);
  const [wmColor, setWmColor] = useState("#ea4335");
  const [wmOpacity, setWmOpacity] = useState(25);

  // Page numbering inputs
  const [numPosition, setNumPosition] = useState("bottom-center");
  const [numStart, setNumStart] = useState(1);
  const [numSize, setNumSize] = useState(11);
  const [numColor, setNumColor] = useState("#202124");

  // --- RENDER SELECTED PAGE ON PREVIEW CANVAS ---
  useEffect(() => {
    let active = true;
    setPageLoading(true);

    const renderPage = async () => {
      try {
        // Worker configured centrally via ../lib/pdfjs

        const loadingTask = pdfjsLib.getDocument({ data: copyBytesForPdfjs(pdfBytes) });
        const pdf = await loadingTask.promise;

        if (!active) return;
        const page = await pdf.getPage(selectedPage);

        if (!active) return;
        const canvas = previewCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Save native PDF point dimensions
        const rawViewport = page.getViewport({ scale: 1.0 });
        setPdfPageWidth(rawViewport.width);
        setPdfPageHeight(rawViewport.height);

        // Render at suitable viewing size (max 520px wide or max 650px high)
        let scale = 520 / rawViewport.width;
        if (rawViewport.height * scale > 650) {
          scale = 650 / rawViewport.height;
        }

        const viewport = page.getViewport({ scale });
        setCanvasRenderWidth(viewport.width);
        setCanvasRenderHeight(viewport.height);

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas,
        };

        await page.render(renderContext).promise;
        if (active) setPageLoading(false);
      } catch (err) {
        console.error("Failed to render page:", err);
        if (active) setPageLoading(false);
      }
    };

    renderPage();

    return () => {
      active = false;
    };
  }, [pdfBytes, selectedPage]);

  // --- SIGNATURE DRAWING CANVAS LOGIC ---
  useEffect(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset with grid background
    resetSigCanvas();
  }, [activeEditorMode]);

  const resetSigCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Light guidelines
    ctx.strokeStyle = "#f1f3f4";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Baseline indicator
    ctx.strokeStyle = "#dadce0";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 35);
    ctx.lineTo(canvas.width - 20, canvas.height - 35);
    ctx.stroke();
    ctx.setLineDash([]);

    setSigHasInk(false);
  };

  const getEventCoords = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startSigDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawingSig(true);
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getEventCoords(e.nativeEvent, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = sigColor;
    ctx.lineWidth = sigPenSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setSigHasInk(true);
  };

  const drawSig = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingSig) return;
    e.preventDefault();
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getEventCoords(e.nativeEvent, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopSigDrawing = () => {
    setIsDrawingSig(false);
  };

  // --- CLICK PAGE PREVIEW TO STAMP/ANNOTATE ---
  const handlePageClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isProcessing) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    // Get click coords on rendering canvas scale
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Translate coordinates to standard PDF coordinate space (BOTTOM-LEFT origin!)
    // PDF width: pdfPageWidth, PDF height: pdfPageHeight
    // Canvas render width: canvasRenderWidth, height: canvasRenderHeight
    const scaleX = pdfPageWidth / canvasRenderWidth;
    const scaleY = pdfPageHeight / canvasRenderHeight;

    const pdfX = clickX * scaleX;
    // In PDF space, Y=0 is at the BOTTOM of the page
    const pdfY = (canvasRenderHeight - clickY) * scaleY;

    if (activeEditorMode === "text") {
      if (!textToInsert.trim()) {
        alert("⚠️ يرجى كتابة نص التعليق أولاً في الحقل الجانبي!");
        return;
      }
      setPageLoading(true);
      await onApplyTextAnnotation(
        selectedPage,
        textToInsert,
        pdfX,
        pdfY,
        textFontSize,
        textHexColor,
        textUseBg,
        textBgColor,
        textFontFamily,
        textStrokeColor,
        textUseStroke
      );
      setTextToInsert(""); // Clear text input after insertion
    } else if (activeEditorMode === "signature") {
      if (signatureType === "upload") {
        if (!uploadedImageBytes || !uploadedImagePreview) {
          alert("⚠️ يرجى تحميل صورة أو ختم أولاً من اللوحة الجانبية!");
          return;
        }
        setPageLoading(true);
        await onApplySignature(
          selectedPage,
          uploadedImageBytes,
          pdfX - uploadedImageWidth / 2,
          pdfY - uploadedImageHeight / 2,
          uploadedImageWidth,
          uploadedImageHeight
        );
      } else {
        const sigCanvas = sigCanvasRef.current;
        if (!sigCanvas || !sigHasInk) {
          alert("⚠️ يرجى رسم توقيعك على اللوحة الجانبية أولاً قبل لصقه!");
          return;
        }
        
        setPageLoading(true);

        // Convert drawing to raw PNG bytes
        const dataUrl = sigCanvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        const binStr = atob(base64);
        const pngBytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
          pngBytes[i] = binStr.charCodeAt(i);
        }

        // Stamp with size around width=140pt
        const sigW = 140;
        const aspect = sigCanvas.height / sigCanvas.width;
        const sigH = sigW * aspect;

        // Adjust Y so the signature centers around the clicked point
        await onApplySignature(
          selectedPage,
          pngBytes,
          pdfX - sigW / 2,
          pdfY - sigH / 2,
          sigW,
          sigH
        );
      }
    }
  };

  // Redact Action
  const triggerRedact = async () => {
    if (!redactWords.trim()) {
      alert("⚠️ يرجى إدخال كلمات للطمس أولاً!");
      return;
    }
    const list = redactWords.split(",").map(w => w.trim()).filter(Boolean);
    setPageLoading(true);
    await onApplyRedaction(
      list,
      redactBoxColor,
      redactOpacity,
      redactUseReplace ? redactReplaceText : "",
      redactReplaceTextColor,
      redactReplaceTextSize
    );
    setRedactWords("");
  };

  // Search & Replace Action
  const triggerSearchReplace = async () => {
    if (!searchText.trim()) {
      alert("⚠️ أدخل الكلمة للبحث عنها أولاً!");
      return;
    }
    setPageLoading(true);
    await onApplySearchReplace(searchText.trim(), replaceText.trim());
    setSearchText("");
    setReplaceText("");
  };

  // Watermark Action
  const triggerWatermark = async () => {
    if (!wmText.trim()) {
      alert("⚠️ أدخل نص العلامة المائية أولاً!");
      return;
    }
    setPageLoading(true);
    await onApplyWatermark(wmText.trim(), wmSize, wmColor, wmOpacity);
    setWmText("");
  };

  // Page Numbers Action
  const triggerPageNumbers = async () => {
    setPageLoading(true);
    await onApplyPageNumbers(numPosition, numStart, numSize, numColor);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch select-none">
      
      {/* 1. LEFT SIDE: THE INTERACTIVE DOCUMENT PREVIEW STAGE (8 COLS) */}
      <div className="lg:col-span-7 flex flex-col items-center bg-gray-100 rounded-2xl border border-gray-200 p-4 min-h-[500px] justify-between shadow-inner">
        
        {/* Page selector bar */}
        <div className="flex items-center gap-3 w-full justify-between border-b border-gray-200 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-google-blue text-white text-xs font-bold">
              {selectedPage}
            </span>
            <span className="text-xs font-bold text-gray-700">معاينة وتعديل الصفحة الحالية</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedPage(p => Math.max(1, p - 1))}
              disabled={selectedPage === 1 || pageLoading}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
            >
              السابق
            </button>
            <span className="text-xs font-semibold text-gray-500">
              {selectedPage} / {totalPages}
            </span>
            <button
              onClick={() => setSelectedPage(p => Math.min(totalPages, p + 1))}
              disabled={selectedPage === totalPages || pageLoading}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
            >
              التالي
            </button>
          </div>
        </div>

        {/* The interactive canvas preview box */}
        <div className="relative border border-gray-200 bg-white shadow-md rounded-xl overflow-hidden max-w-full group">
          {pageLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center z-10">
              <RefreshCw className="h-8 w-8 text-google-blue animate-spin mb-2" />
              <span className="text-xs font-bold text-gray-700">جاري رسم وتحضير محتوى الصفحة...</span>
            </div>
          )}

          <canvas
            ref={previewCanvasRef}
            onClick={handlePageClick}
            className={`block max-w-full ${
              isProcessing ? "cursor-wait" : 
              activeEditorMode === "text" ? "cursor-text" : "cursor-crosshair"
            }`}
            title={activeEditorMode === "text" ? "انقر على أي مكان بالصفحة لوضع النص المكتوب" : "انقر لوضع التوقيع هنا"}
          />

          {/* Interactive cursor helper overlay */}
          {!pageLoading && !isProcessing && (
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-500/3 mix-blend-multiply" />
            </div>
          )}
        </div>

        {/* Action hints */}
        <div className="w-full flex items-center gap-2 mt-4 bg-blue-50 border border-blue-100 p-2.5 rounded-xl text-[11px] text-google-blue leading-relaxed font-semibold">
          <Info className="h-4 w-4 shrink-0" />
          {activeEditorMode === "signature" && (
            <span>💡 ارسم توقيعك أو حمّل صورتك/ختمك بالجانب، ثم **انقر بنقرة واحدة** على أي مكان في المعاينة أعلاه لتثبيته بدقة متناهية.</span>
          )}
          {activeEditorMode === "text" && (
            <span>💡 اكتب التعليق المطلوب بالجانب، حدد اللون والحجم، ثم **انقر بنقرة واحدة** على الصفحة أعلاه لوضعه في ذلك الموضع فوراً.</span>
          )}
          {activeEditorMode === "redact" && (
            <span>💡 التعقيم الأمني: يطمس الكلمات تلقائياً بكامل المستند ويدعم إدراج نصوص بديلة.</span>
          )}
          {activeEditorMode === "watermark" && (
            <span>💡 العلامة المائية تظهر بشكل مائل جذاب على كافة صفحات المستند.</span>
          )}
        </div>
      </div>

      {/* 2. RIGHT SIDE: TOOLBOX CONFIGURATIONS (5 COLS) */}
      <div className="lg:col-span-5 flex flex-col gap-4 select-none">
        
        {/* Editor tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-gray-100 rounded-xl">
          {[
            { id: "signature", label: "صور وتوقيع", icon: PenTool },
            { id: "text", label: "نصوص", icon: Type },
            { id: "redact", label: "طمس", icon: ShieldCheck },
            { id: "watermark", label: "إضافات", icon: Compass }
          ].map(btn => {
            const Icon = btn.icon;
            return (
              <button
                key={btn.id}
                onClick={() => setActiveEditorMode(btn.id as any)}
                className={`flex flex-col items-center py-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  activeEditorMode === btn.id
                    ? "bg-white text-google-blue shadow-xs"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon className="h-4 w-4 mb-1" />
                {btn.label}
              </button>
            );
          })}
        </div>

        {/* Active Tool Config panel */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-3xs flex-1 flex flex-col justify-between">
          
          {/* A. DIGITAL SIGNATURE & IMAGE STAMP WRAPPER */}
          {activeEditorMode === "signature" && (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div>
                {/* Segmented Control for Signature Type */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl mb-4">
                  <button
                    onClick={() => setSignatureType("draw")}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      signatureType === "draw"
                        ? "bg-white text-google-blue shadow-xs"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    ✍️ رسم توقيع يدوي
                  </button>
                  <button
                    onClick={() => setSignatureType("upload")}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      signatureType === "upload"
                        ? "bg-white text-google-blue shadow-xs"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    🖼️ رفع صورة أو ختم
                  </button>
                </div>

                {signatureType === "draw" ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-gray-800">ارسم توقيعك على اللوحة:</span>
                      <button
                        onClick={resetSigCanvas}
                        className="text-[10px] font-bold text-google-red hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                      >
                        مسح اللوحة
                      </button>
                    </div>

                    <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-inner relative h-[150px]">
                      <canvas
                        ref={sigCanvasRef}
                        width={450}
                        height={150}
                        onMouseDown={startSigDrawing}
                        onMouseMove={drawSig}
                        onMouseUp={stopSigDrawing}
                        onMouseLeave={stopSigDrawing}
                        onTouchStart={startSigDrawing}
                        onTouchMove={drawSig}
                        onTouchEnd={stopSigDrawing}
                        className="block w-full h-full cursor-crosshair touch-none"
                      />
                    </div>

                    {/* Draw parameters */}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="text-[10px] text-gray-400 font-semibold block mb-1">لون القلم:</label>
                        <div className="flex gap-1.5 items-center">
                          <input
                            type="color"
                            value={sigColor}
                            onChange={e => setSigColor(e.target.value)}
                            className="w-8 h-8 rounded-lg border border-gray-200 p-0.5 bg-white cursor-pointer"
                          />
                          <span className="text-xs font-semibold">{sigColor}</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 font-semibold block mb-1">سمك الخط:</label>
                        <select
                          value={sigPenSize}
                          onChange={e => setSigPenSize(parseFloat(e.target.value))}
                          className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 font-semibold"
                        >
                          <option value="1.5">رفيع جداً (1.5)</option>
                          <option value="2.5">متوسط (2.5)</option>
                          <option value="4">سميك (4.0)</option>
                          <option value="6">عريض (6.0)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl p-4 bg-gray-50 hover:bg-gray-100 transition-colors relative cursor-pointer group">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <Plus className="h-6 w-6 text-gray-400 mb-1.5 group-hover:text-google-blue transition-colors" />
                      <span className="text-xs font-bold text-gray-700">اضغط أو اسحب صورة/ختم هنا</span>
                      <span className="text-[10px] text-gray-400 mt-1">يدعم PNG, JPG, WEBP</span>
                    </div>

                    {uploadedImagePreview && (
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-150 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-700">معاينة الصورة المرفوعة:</span>
                          <button
                            onClick={() => {
                              setUploadedImagePreview(null);
                              setUploadedImageBytes(null);
                            }}
                            className="text-[10px] font-bold text-google-red hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                          >
                            حذف الصورة
                          </button>
                        </div>

                        <div className="flex justify-center bg-white p-2.5 rounded-lg border border-gray-200 max-h-[140px] overflow-hidden items-center">
                          <img
                            src={uploadedImagePreview}
                            alt="Uploaded Stamp"
                            className="max-h-[120px] object-contain rounded-sm"
                          />
                        </div>

                        {/* Image scale controller */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] text-gray-500 font-bold">عرض الصورة (نقطة):</label>
                            <span className="text-xs font-bold text-google-blue">{uploadedImageWidth}px × {uploadedImageHeight}px</span>
                          </div>
                          <input
                            type="range"
                            min={25}
                            max={450}
                            value={uploadedImageWidth}
                            onChange={e => {
                              const newW = parseInt(e.target.value);
                              setUploadedImageWidth(newW);
                              // Maintain aspect ratio
                              const img = new Image();
                              img.onload = () => {
                                const aspect = img.naturalHeight / img.naturalWidth;
                                setUploadedImageHeight(Math.round(newW * aspect));
                              };
                              if (uploadedImagePreview) img.src = uploadedImagePreview;
                            }}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-google-blue"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-purple-50 border border-purple-100 p-3 rounded-xl text-[11px] text-purple-800 leading-relaxed font-semibold mt-4">
                {signatureType === "draw" 
                  ? "✍️ بعد رسم التوقيع المطلوب، انقر فوق أي مكان بالصفحة في شاشة المعاينة اليسرى لإدراج التوقيع وتضمينه في الملف فوراً."
                  : "🖼️ بعد تحميل الصورة، انقر فوق أي مكان بالصفحة في شاشة المعاينة اليسرى لإدراج الختم أو الصورة وتثبيتها بدقة."}
              </div>
            </div>
          )}

          {/* B. TEXT ANNOTATION WRAPPER */}
          {activeEditorMode === "text" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">اكتب النص المراد إدراجه:</label>
                <textarea
                  value={textToInsert}
                  onChange={e => setTextToInsert(e.target.value)}
                  placeholder="مثال: تمت مراجعته والموافقة عليه"
                  rows={2}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-google-blue font-semibold text-gray-800 resize-none"
                />
              </div>

              {/* Font Family Selector */}
              <div>
                <label className="text-[10px] text-gray-400 font-bold block mb-1">نوع الخط:</label>
                <select
                  value={textFontFamily}
                  onChange={e => setTextFontFamily(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 font-bold"
                >
                  <option value="Cairo">Cairo (كايرو)</option>
                  <option value="Tajawal">Tajawal (تاجاوال)</option>
                  <option value="Amiri">Amiri (كلاسيكي أميري)</option>
                  <option value="Almarai">Almarai (المراعي)</option>
                  <option value="Inter">Inter (إنجليزي)</option>
                </select>
              </div>

              {/* Font Colors and Font Sizes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 font-bold block mb-1">لون النص:</label>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="color"
                      value={textHexColor}
                      onChange={e => setTextHexColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-gray-200 p-0.5 bg-white cursor-pointer"
                    />
                    <span className="text-xs font-semibold">{textHexColor}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold block mb-1">حجم الخط ({textFontSize}px):</label>
                  <input
                    type="range"
                    min={6}
                    max={72}
                    value={textFontSize}
                    onChange={e => setTextFontSize(parseInt(e.target.value) || 12)}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-google-blue"
                  />
                </div>
              </div>

              {/* Text background and Text border */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-150 space-y-3">
                {/* Background settings */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={textUseBg}
                      onChange={e => setTextUseBg(e.target.checked)}
                      className="h-4 w-4 text-google-blue rounded-xs accent-google-blue cursor-pointer"
                    />
                    <span>إضافة خلفية ملونة خلف النص</span>
                  </label>

                  {textUseBg && (
                    <div className="flex items-center gap-2 animate-fade-in pl-6">
                      <span className="text-[10px] text-gray-400 font-semibold">لون الخلفية:</span>
                      <input
                        type="color"
                        value={textBgColor}
                        onChange={e => setTextBgColor(e.target.value)}
                        className="w-6 h-6 rounded-md border border-gray-200 p-0.5 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Stroke/Border settings */}
                <div className="space-y-2 pt-1 border-t border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={textUseStroke}
                      onChange={e => setTextUseStroke(e.target.checked)}
                      className="h-4 w-4 text-google-blue rounded-xs accent-google-blue cursor-pointer"
                    />
                    <span>إضافة إطار/حدود لمربع النص</span>
                  </label>

                  {textUseStroke && (
                    <div className="flex items-center gap-2 animate-fade-in pl-6">
                      <span className="text-[10px] text-gray-400 font-semibold">لون الإطار:</span>
                      <input
                        type="color"
                        value={textStrokeColor}
                        onChange={e => setTextStrokeColor(e.target.value)}
                        className="w-6 h-6 rounded-md border border-gray-200 p-0.5 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* C. SECURITY REDACTION & SEARCH & REPLACE */}
          {activeEditorMode === "redact" && (
            <div className="space-y-4">
              
              {/* Redaction box */}
              <div className="space-y-3.5 bg-gray-50/60 p-3 rounded-xl border border-gray-150">
                <div className="flex items-center gap-1 text-xs font-bold text-google-red">
                  <ShieldCheck className="h-4 w-4" />
                  <span>طمس الكلمات الحساسة (عبر المستند بالكامل)</span>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 font-semibold block mb-1">الكلمات للطمس (افصل بينها بفاصلة):</label>
                  <input
                    type="text"
                    value={redactWords}
                    onChange={e => setRedactWords(e.target.value)}
                    placeholder="مثال: سري، مالي، 123456"
                    className="w-full text-xs bg-white border border-gray-200 rounded-lg p-2.5 font-semibold text-gray-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold block mb-1">لون الطمس:</label>
                    <input
                      type="color"
                      value={redactBoxColor}
                      onChange={e => setRedactBoxColor(e.target.value)}
                      className="w-full h-8 rounded-lg border border-gray-200 p-0.5 bg-white cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold block mb-1">الشفافية:</label>
                    <select
                      value={redactOpacity}
                      onChange={e => setRedactOpacity(parseInt(e.target.value))}
                      className="w-full text-xs bg-white border border-gray-200 rounded-lg p-2 font-semibold"
                    >
                      <option value="100">معتم بالكامل (100%)</option>
                      <option value="85">طمس خفيف (85%)</option>
                      <option value="50">طمس شفاف (50%)</option>
                    </select>
                  </div>
                </div>

                {/* Replacement options */}
                <div className="border-t border-gray-200 pt-2.5 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={redactUseReplace}
                      onChange={e => setRedactUseReplace(e.target.checked)}
                      className="h-4 w-4 rounded-xs accent-google-blue cursor-pointer"
                    />
                    <span>إدراج نص بديل فوق مكان الطمس</span>
                  </label>

                  {redactUseReplace && (
                    <div className="space-y-2 animate-fade-in">
                      <input
                        type="text"
                        value={redactReplaceText}
                        onChange={e => setRedactReplaceText(e.target.value)}
                        placeholder="مثال: [بيانات مطموسة]"
                        className="w-full text-xs bg-white border border-gray-200 rounded-lg p-2"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-gray-400 font-bold">لون النص:</span>
                        <input
                          type="color"
                          value={redactReplaceTextColor}
                          onChange={e => setRedactReplaceTextColor(e.target.value)}
                          className="w-6 h-6 rounded-md border border-gray-200 p-0.5 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={triggerRedact}
                  disabled={isProcessing}
                  className="w-full py-2 bg-google-red hover:bg-red-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  تطبيق الطمس الآمن
                </button>
              </div>

              {/* Search and Replace Box */}
              <div className="space-y-3 bg-blue-50/20 p-3 rounded-xl border border-blue-100">
                <div className="flex items-center gap-1 text-xs font-bold text-google-blue">
                  <Search className="h-4 w-4" />
                  <span>البحث والاستبدال (تجريبي)</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    placeholder="ابحث عن..."
                    className="text-xs bg-white border border-gray-200 rounded-lg p-2"
                  />
                  <input
                    type="text"
                    value={replaceText}
                    onChange={e => setReplaceText(e.target.value)}
                    placeholder="استبدل بـ..."
                    className="text-xs bg-white border border-gray-200 rounded-lg p-2"
                  />
                </div>

                <button
                  onClick={triggerSearchReplace}
                  disabled={isProcessing}
                  className="w-full py-2 bg-google-blue hover:bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  استبدال النص
                </button>
              </div>
            </div>
          )}

          {/* D. WATERMARK & PAGE NUMBERS CONFIG */}
          {activeEditorMode === "watermark" && (
            <div className="space-y-4">
              
              {/* Watermark panel */}
              <div className="space-y-3 bg-gray-50/60 p-3 rounded-xl border border-gray-150">
                <div className="text-xs font-bold text-gray-800 flex items-center gap-1">
                  <Layers className="h-4 w-4 text-google-blue animate-pulse" />
                  <span>إضافة علامة مائية مائلة (جميع الصفحات)</span>
                </div>

                <input
                  type="text"
                  value={wmText}
                  onChange={e => setWmText(e.target.value)}
                  placeholder="مثال: سري للغاية - COPY"
                  className="w-full text-xs bg-white border border-gray-200 rounded-lg p-2 font-bold"
                />

                <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
                  <div>
                    <label className="text-[9px] text-gray-400 block mb-0.5">الحجم:</label>
                    <input
                      type="number"
                      value={wmSize}
                      onChange={e => setWmSize(parseInt(e.target.value) || 24)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-1 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-400 block mb-0.5">الشفافية:</label>
                    <input
                      type="number"
                      value={wmOpacity}
                      min={5}
                      max={90}
                      onChange={e => setWmOpacity(parseInt(e.target.value) || 20)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-1 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-400 block mb-0.5">اللون:</label>
                    <input
                      type="color"
                      value={wmColor}
                      onChange={e => setWmColor(e.target.value)}
                      className="w-full h-7 rounded-lg border border-gray-200 p-0.5 bg-white cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  onClick={triggerWatermark}
                  disabled={isProcessing}
                  className="w-full py-2 bg-google-blue hover:bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  إضافة علامة مائية
                </button>
              </div>

              {/* Page numbers panel */}
              <div className="space-y-3 bg-blue-50/20 p-3 rounded-xl border border-blue-100">
                <div className="text-xs font-bold text-gray-800 flex items-center gap-1">
                  <TextIcon className="h-4 w-4 text-google-green" />
                  <span>ترقيم الصفحات التلقائي</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[9px] text-gray-400 block mb-0.5">الموضع:</label>
                    <select
                      value={numPosition}
                      onChange={e => setNumPosition(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-1.5"
                    >
                      <option value="bottom-center">أسفل الوسط</option>
                      <option value="bottom-right">أسفل اليمين</option>
                      <option value="bottom-left">أسفل اليسار</option>
                      <option value="top-center">أعلى الوسط</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] text-gray-400 block mb-0.5">رقم البداية:</label>
                    <input
                      type="number"
                      value={numStart}
                      min={1}
                      onChange={e => setNumStart(parseInt(e.target.value) || 1)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-1 text-center"
                    />
                  </div>
                </div>

                <button
                  onClick={triggerPageNumbers}
                  disabled={isProcessing}
                  className="w-full py-2 bg-google-green hover:bg-green-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  ترقيم الصفحات الآن
                </button>
              </div>

            </div>
          )}

        </div>
      </div>

    </div>
  );
};
