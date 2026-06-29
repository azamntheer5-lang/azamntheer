import React from "react";
import { FileText, RotateCcw, Download, Sparkles, Shield, Trash2 } from "lucide-react";

interface HeaderProps {
  fileName: string | null;
  fileSize: number | null;
  totalPages: number | null;
  onReset: () => void;
  onDownload: () => void;
  isProcessing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  fileName,
  fileSize,
  totalPages,
  onReset,
  onDownload,
  isProcessing
}) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-6 shadow-xs select-none">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
          <FileText className="h-5.5 w-5.5 animate-pulse" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-black tracking-tight text-gray-900 flex items-center gap-2">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-950 to-indigo-900">عَـزَّام SuperApp</span>
            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold text-amber-700 border border-amber-200">
              <Sparkles className="h-2.5 w-2.5 animate-spin" style={{ animationDuration: '4s' }} />
              الشامل
            </span>
          </h1>
          <span className="text-[9px] font-bold text-gray-400 tracking-widest uppercase">
            AZZAM SMART DOCUMENT WORKSPACE
          </span>
        </div>
      </div>

      {/* File Stats / Status */}
      {fileName && (
        <div className="hidden md:flex items-center gap-4 rounded-xl border border-gray-150 bg-gray-50/50 py-1.5 px-4 text-sm text-gray-700 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-google-green animate-ping" />
            <span className="font-semibold text-gray-900 max-w-[200px] truncate" title={fileName}>
              {fileName}
            </span>
          </div>
          <span className="h-4 w-px bg-gray-300" />
          <div className="flex items-center gap-1.5 text-gray-500">
            <span className="rounded-md bg-white px-2 py-0.5 text-xs font-bold border border-gray-100 text-google-blue shadow-2xs">
              {totalPages} صفحات
            </span>
            <span className="text-xs font-medium text-gray-400">
              ({formatBytes(fileSize || 0)})
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {fileName && (
          <>
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white py-2 px-3.5 text-xs font-semibold text-gray-600 transition-all hover:bg-gray-55 hover:text-google-red hover:border-red-200"
              disabled={isProcessing}
              title="تفريغ المستند والبدء من جديد"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">ملف جديد</span>
            </button>

            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 rounded-lg bg-google-blue py-2 px-4.5 text-xs font-bold text-white shadow-md shadow-blue-500/10 transition-all hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/20 active:scale-98"
              disabled={isProcessing}
            >
              <Download className="h-4 w-4" />
              <span>تنزيل الملف</span>
            </button>
          </>
        )}
        {!fileName && (
          <div className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
            <Shield className="h-3.5 w-3.5 text-google-green" />
            <span>تشفير محلي آمن 100% 🔒</span>
          </div>
        )}
      </div>
    </header>
  );
};
