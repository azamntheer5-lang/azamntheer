import React, { useState } from "react";
import { Link, Image, AlertCircle, FilePlus, ChevronRight, ArrowUpDown, RefreshCw, Sparkles } from "lucide-react";

interface MergeImagesProps {
  onMergePdf: (secondFileBytes: Uint8Array, order: "before" | "after") => Promise<void>;
  onImageToPdf: (imageBytes: Uint8Array, mimeType: string, action: "append" | "new") => Promise<void>;
  isProcessing: boolean;
}

export const MergeImages: React.FC<MergeImagesProps> = ({
  onMergePdf,
  onImageToPdf,
  isProcessing
}) => {
  const [secondFile, setSecondFile] = useState<File | null>(null);
  const [mergeOrder, setMergeOrder] = useState<"before" | "after" | any>("after");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageAction, setImageAction] = useState<"append" | "new" | any>("append");

  const handleSecondFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSecondFile(e.target.files[0]);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const triggerMerge = async () => {
    if (!secondFile) {
      alert("⚠️ يرجى اختيار ملف PDF الثاني للدمج!");
      return;
    }
    const ab = await secondFile.arrayBuffer();
    const bytes = new Uint8Array(ab);
    await onMergePdf(bytes, mergeOrder);
    setSecondFile(null);
  };

  const triggerImageConvert = async () => {
    if (!imageFile) {
      alert("⚠️ يرجى اختيار صورة واحدة على الأقل!");
      return;
    }
    const ab = await imageFile.arrayBuffer();
    const bytes = new Uint8Array(ab);
    await onImageToPdf(bytes, imageFile.type, imageAction);
    setImageFile(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
      
      {/* SECTION 1: MERGE PDFs */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-3xs flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-google-blue">
              <FilePlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">دمج ملف PDF آخر</h3>
              <p className="text-[10px] text-gray-400 font-semibold">دمج مستندين معاً وتنسيقهما في ملف واحد.</p>
            </div>
          </div>

          <div className="border border-dashed border-gray-300 rounded-xl p-4 text-center bg-gray-50/50">
            <input
              type="file"
              id="secondPdfInput"
              accept=".pdf"
              onChange={handleSecondFileChange}
              className="hidden"
            />
            {secondFile ? (
              <div className="space-y-2 animate-fade-in">
                <span className="text-xs font-bold text-gray-800 block truncate">{secondFile.name}</span>
                <span className="text-[10px] text-gray-400 font-semibold block">({(secondFile.size / 1024).toFixed(1)} KB)</span>
                <button
                  onClick={() => setSecondFile(null)}
                  className="text-[10px] font-bold text-google-red hover:underline"
                >
                  إلغاء وتغيير الملف
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => document.getElementById("secondPdfInput")?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2 text-xs font-bold text-gray-700 cursor-pointer shadow-3xs"
              >
                اختر الملف الثاني للدمج
              </button>
            )}
          </div>

          {secondFile && (
            <div className="space-y-3 animate-fade-in">
              <div>
                <label className="text-[10px] text-gray-400 font-bold block mb-1">ترتيب المستند المدمج:</label>
                <select
                  value={mergeOrder}
                  onChange={e => setMergeOrder(e.target.value as any)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 font-bold"
                >
                  <option value="after">إضافة الملف المرفوع بعد الملف الحالي</option>
                  <option value="before">إضافة الملف المرفوع قبل الملف الحالي</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={triggerMerge}
          disabled={isProcessing || !secondFile}
          className="w-full mt-6 flex items-center justify-center gap-1.5 rounded-xl bg-google-blue hover:bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/10 transition-all disabled:opacity-40 cursor-pointer"
        >
          {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
          <span>دمج المستندين الآن</span>
        </button>
      </div>

      {/* SECTION 2: CONVERT IMAGES TO PDF */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-3xs flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-google-green">
              <Image className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">تحويل الصور إلى PDF</h3>
              <p className="text-[10px] text-gray-400 font-semibold">تحويل الصور (JPG/PNG) وإدراجها كصفحات.</p>
            </div>
          </div>

          <div className="border border-dashed border-gray-300 rounded-xl p-4 text-center bg-gray-50/50">
            <input
              type="file"
              id="imageToPdfInput"
              accept="image/jpeg,image/png"
              onChange={handleImageChange}
              className="hidden"
            />
            {imageFile ? (
              <div className="space-y-2 animate-fade-in">
                <span className="text-xs font-bold text-gray-800 block truncate">{imageFile.name}</span>
                <span className="text-[10px] text-gray-400 font-semibold block">({(imageFile.size / 1024).toFixed(1)} KB)</span>
                <button
                  onClick={() => setImageFile(null)}
                  className="text-[10px] font-bold text-google-red hover:underline"
                >
                  إلغاء الصورة
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => document.getElementById("imageToPdfInput")?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2 text-xs font-bold text-gray-700 cursor-pointer shadow-3xs"
              >
                اختر صورة (JPG / PNG)
              </button>
            )}
          </div>

          {imageFile && (
            <div className="space-y-3 animate-fade-in">
              <div>
                <label className="text-[10px] text-gray-400 font-bold block mb-1">الإجراء:</label>
                <select
                  value={imageAction}
                  onChange={e => setImageAction(e.target.value as any)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 font-bold"
                >
                  <option value="append">إدراج الصورة كصفحة إضافية للملف الحالي</option>
                  <option value="new">إنشاء مستند PDF منفصل ومستقل للصورة</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={triggerImageConvert}
          disabled={isProcessing || !imageFile}
          className="w-full mt-6 flex items-center justify-center gap-1.5 rounded-xl bg-google-green hover:bg-green-600 py-2.5 text-xs font-bold text-white shadow-md shadow-green-500/10 transition-all disabled:opacity-40 cursor-pointer"
        >
          {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
          <span>تحويل الصورة الآن</span>
        </button>
      </div>

    </div>
  );
};
