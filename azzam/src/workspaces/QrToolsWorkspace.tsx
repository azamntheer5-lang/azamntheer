import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  QrCode, Barcode, Download, Copy, Check, Sparkles, RefreshCw, Camera,
  Upload, Trash2, Clipboard,
} from "lucide-react";
import QRCodeLib from "qrcode";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useToast } from "../context/ToastContext";
import { useHistoryStore } from "../store/historyStore";
import { downloadBlob } from "../lib/utils";

type Mode = "generate-qr" | "generate-barcode" | "scan";

const QR_COLORS = [
  { name: "أسود", value: "#000000" },
  { name: "أزرق", value: "#1e40af" },
  { name: "أحمر", value: "#b91c1c" },
  { name: "أخضر", value: "#15803d" },
  { name: "بنفسجي", value: "#6b21a8" },
];

const QR_SIZES = [
  { label: "صغير (256px)", value: 256 },
  { label: "متوسط (512px)", value: 512 },
  { label: "كبير (1024px)", value: 1024 },
  { label: "ضخم (2048px)", value: 2048 },
];

const PRESETS = [
  { label: "رابط URL", value: "https://example.com", icon: "🔗" },
  { label: "بريد إلكتروني", value: "mailto:info@example.com", icon: "✉️" },
  { label: "هاتف", value: "tel:+966500000000", icon: "📞" },
  { label: "رسالة SMS", value: "sms:+966500000000", icon: "💬" },
  { label: "Wi-Fi", value: "WIFI:S:MyNetwork;T:WPA;P:password;;", icon: "📶" },
  { label: "بطاقة اتصال vCard", value: "BEGIN:VCARD\nVERSION:3.0\nFN:الاسم\nTEL:+966500000000\nEMAIL:info@example.com\nEND:VCARD", icon: "👤" },
];

export const QrToolsWorkspace: React.FC = () => {
  const [mode, setMode] = useState<Mode>("generate-qr");
  const [text, setText] = useState("https://example.com");
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [size, setSize] = useState(512);
  const [eccLevel, setEccLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Scanner state
  const [scanResult, setScanResult] = useState<string>("");
  const [scanError, setScanError] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const toast = useToast();
  const addHistory = useHistoryStore((s) => s.addEntry);

  // Generate QR whenever inputs change
  useEffect(() => {
    if (mode !== "generate-qr") return;
    if (!text.trim()) {
      setQrDataUrl("");
      return;
    }
    QRCodeLib.toDataURL(text, {
      errorCorrectionLevel: eccLevel,
      width: size,
      margin: 2,
      color: {
        dark: fgColor,
        light: bgColor,
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => {
        console.error("QR generation error:", err);
        setQrDataUrl("");
      });
  }, [text, fgColor, bgColor, size, eccLevel, mode]);

  // Generate simple Code128-like barcode as PNG using canvas (visual representation)
  const generateBarcode = useCallback(() => {
    if (!text.trim()) return;
    const canvas = document.createElement("canvas");
    const w = 600;
    const h = 200;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    // Simple barcode visualization: each char produces 4 alternating bars
    const chars = text.split("");
    const barWidth = Math.max(2, Math.floor((w - 80) / (chars.length * 8)));
    let x = 40;
    ctx.fillStyle = fgColor;
    for (const ch of chars) {
      const code = ch.charCodeAt(0);
      for (let bit = 0; bit < 8; bit++) {
        const isOn = (code >> bit) & 1;
        if (isOn) {
          ctx.fillRect(x, 30, barWidth, h - 70);
        }
        x += barWidth + 1;
      }
      x += 2;
    }

    // Text label
    ctx.fillStyle = fgColor;
    ctx.font = `bold 16px "Cairo", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h - 18);

    setQrDataUrl(canvas.toDataURL("image/png"));
  }, [text, fgColor, bgColor]);

  useEffect(() => {
    if (mode === "generate-barcode") {
      generateBarcode();
    }
  }, [mode, generateBarcode]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    fetch(qrDataUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const ext = mode === "generate-qr" ? "png" : "png";
        downloadBlob(blob, `${mode}_${Date.now()}.${ext}`);
        addHistory({
          type: "image",
          operation: `تنزيل ${mode === "generate-qr" ? "QR" : "Barcode"}: ${text.slice(0, 30)}`,
          status: "success",
        });
        toast.success("تم التنزيل!");
      });
  };

  const handleCopyImage = async () => {
    if (!qrDataUrl) return;
    try {
      const blob = await fetch(qrDataUrl).then((r) => r.blob());
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("تم نسخ الصورة!");
    } catch (err) {
      toast.error("تعذر نسخ الصورة");
    }
  };

  // Scanner functions
  const startScanning = async () => {
    setScanResult("");
    setScanError("");
    setIsScanning(true);
    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Start decoding loop
      const decode = () => {
        if (!videoRef.current || !readerRef.current) return;
        try {
          const result = readerRef.current.decodeFromVideoElement(videoRef.current);
          // result is a Promise<Result>; handle both sync and promise
          Promise.resolve(result)
            .then((r) => {
              if (r) {
                setScanResult(r.getText());
                toast.success(`تمت قراءة: ${r.getText().slice(0, 40)}`);
                addHistory({
                  type: "image",
                  operation: `مسح QR/Barcode: ${r.getText().slice(0, 40)}`,
                  status: "success",
                });
                stopScanning();
              }
            })
            .catch((err) => {
              // Swallow "not found" errors (which are normal during continuous scanning),
              // surface others to console
              const errName = (err as Error)?.name || "";
              if (errName !== "NotFoundException" && errName !== "ChecksumException") {
                console.warn("Decode error:", err);
              }
            });
        } catch (err) {
          console.warn("Decode setup error:", err);
        }
      };
      decode();
    } catch (err: any) {
      setScanError("فشل تشغيل الكاميرا: " + err.message);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => stopScanning();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new BrowserMultiFormatReader();
      const url = URL.createObjectURL(file);
      const result = await reader.decodeFromImageUrl(url);
      setScanResult(result.getText());
      toast.success(`تمت قراءة: ${result.getText().slice(0, 40)}`);
      addHistory({
        type: "image",
        operation: `قراءة QR/Barcode من صورة`,
        status: "success",
      });
      URL.revokeObjectURL(url);
    } catch (err) {
      setScanError("لم يتم العثور على QR/Barcode في الصورة.");
      toast.error("تعذر قراءة الرمز من الصورة");
    }
  };

  const tabs: Array<{ id: Mode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "generate-qr", label: "توليد QR", icon: QrCode },
    { id: "generate-barcode", label: "توليد Barcode", icon: Barcode },
    { id: "scan", label: "ماسح الرموز", icon: Camera },
  ];

  return (
    <main className="flex-1 overflow-y-auto safe-scrollbar p-6 relative" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white">أدوات QR و Barcode</h2>
            <p className="text-[11px] text-slate-500 font-bold mt-0.5">
              توليد وقراءة الرموز بأنواعها — مع تصدير عالي الجودة
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/60 border border-white/10 p-1 rounded-xl self-start">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === t.id ? "bg-emerald-600 text-white shadow-md" : "text-slate-500 hover:text-white hover:bg-white/[0.04]/5"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {(mode === "generate-qr" || mode === "generate-barcode") && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Form */}
            <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">المحتوى / النص</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  placeholder="أدخل النص أو الرابط..."
                  className="w-full text-xs bg-slate-900/40 border border-white/10 rounded-lg p-3 font-bold text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Quick presets */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1.5">قوالب جاهزة</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setText(p.value)}
                      className="text-[10px] font-bold text-gray-300 bg-white/[0.04]/5 hover:bg-white/[0.04]/10 border border-white/5 rounded-lg p-2 cursor-pointer transition-all"
                    >
                      <span className="block text-sm mb-0.5">{p.icon}</span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {mode === "generate-qr" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">لون الرمز</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={fgColor}
                          onChange={(e) => setFgColor(e.target.value)}
                          className="h-8 w-12 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                        />
                        <select
                          value={fgColor}
                          onChange={(e) => setFgColor(e.target.value)}
                          className="flex-1 text-xs bg-slate-900/40 border border-white/10 rounded-lg p-1.5 font-bold text-white"
                        >
                          {QR_COLORS.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">لون الخلفية</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="h-8 w-12 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                        />
                        <span className="text-xs text-slate-500 font-bold">{bgColor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">الحجم</label>
                      <select
                        value={size}
                        onChange={(e) => setSize(parseInt(e.target.value))}
                        className="w-full text-xs bg-slate-900/40 border border-white/10 rounded-lg p-2 font-bold text-white"
                      >
                        {QR_SIZES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">مستوى تصحيح الأخطاء</label>
                      <select
                        value={eccLevel}
                        onChange={(e) => setEccLevel(e.target.value as any)}
                        className="w-full text-xs bg-slate-900/40 border border-white/10 rounded-lg p-2 font-bold text-white"
                      >
                        <option value="L">منخفض (L) — 7%</option>
                        <option value="M">متوسط (M) — 15%</option>
                        <option value="Q">ربع (Q) — 25%</option>
                        <option value="H">عالي (H) — 30%</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right: Preview & download */}
            <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col items-center justify-center">
              {qrDataUrl ? (
                <>
                  <div className="bg-white/[0.04] p-4 rounded-xl border border-white/10 shadow-lg">
                    <img src={qrDataUrl} alt="Generated QR" className="max-w-full max-h-[280px] object-contain" />
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all"
                    >
                      <Download className="h-4 w-4" />
                      <span>تنزيل</span>
                    </button>
                    <button
                      onClick={handleCopyImage}
                      className="flex items-center gap-1.5 text-xs font-bold bg-white/[0.04]/5 hover:bg-white/[0.04]/10 border border-white/10 text-white px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      <span>{copied ? "تم النسخ" : "نسخ"}</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-500">
                  <QrCode className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-bold">أدخل نصاً لتوليد الرمز</p>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === "scan" && (
          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-500 font-bold">
                وجّه الكاميرا نحو الرمز لقراءته تلقائياً، أو ارفع صورة تحتوي على QR/Barcode.
              </p>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg cursor-pointer hover:bg-emerald-500/20 transition-all">
                  <Upload className="h-3.5 w-3.5" />
                  <span>رفع صورة</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {!isScanning ? (
                  <button
                    onClick={startScanning}
                    className="flex items-center gap-1.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-all"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>تشغيل الكاميرا</span>
                  </button>
                ) : (
                  <button
                    onClick={stopScanning}
                    className="flex items-center gap-1.5 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>إيقاف</span>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-white/10 rounded-xl aspect-video max-w-2xl mx-auto overflow-hidden relative flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              {!isScanning && !scanResult && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <Camera className="h-10 w-10 mb-2 opacity-50" />
                  <span className="text-xs font-bold">الكاميرا متوقفة</span>
                </div>
              )}
              {isScanning && (
                <div className="absolute inset-12 border-2 border-emerald-400/60 rounded-xl pointer-events-none">
                  <div className="absolute top-0 left-0 h-6 w-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-md" />
                  <div className="absolute top-0 right-0 h-6 w-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-emerald-400 rounded-br-md" />
                </div>
              )}
            </div>

            {scanError && (
              <div className="text-xs font-bold text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
                {scanError}
              </div>
            )}

            {scanResult && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-black">
                  <Check className="h-4 w-4" />
                  <span>تمت القراءة بنجاح!</span>
                </div>
                <div className="bg-slate-950/60 border border-white/5 rounded-lg p-3 font-mono text-xs text-emerald-200 break-all">
                  {scanResult}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(scanResult);
                      toast.success("تم النسخ!");
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>نسخ النتيجة</span>
                  </button>
                  {scanResult.startsWith("http") && (
                    <a
                      href={scanResult}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-300 hover:text-blue-200 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>فتح الرابط</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};
