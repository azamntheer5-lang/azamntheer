import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { useUIStore } from "../../store/uiStore";

interface ProcessingOverlayProps {
  /** When provided, overrides the global processing state. */
  active?: boolean;
  status?: string;
  progress?: number; // 0..100
  onCancel?: () => void;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  active,
  status,
  progress,
  onCancel,
}) => {
  const globalActive = useUIStore((s) => s.isProcessing);
  const globalStatus = useUIStore((s) => s.processingStatus);
  const globalProgress = useUIStore((s) => s.processingProgress);

  const isActive = active ?? globalActive;
  const statusText = status ?? globalStatus;
  const progressVal = progress ?? globalProgress;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center z-50 rounded-2xl p-6 text-center"
        >
          <div className="relative flex items-center justify-center mb-4">
            <RefreshCw className="h-12 w-12 text-blue-400 animate-spin absolute" />
            <Sparkles className="h-6 w-6 text-indigo-400 animate-pulse" />
          </div>
          <span className="text-sm font-black text-white block mb-3 max-w-md">
            {statusText || "جاري المعالجة..."}
          </span>

          {progressVal > 0 && (
            <div className="w-full max-w-xs bg-white/10 rounded-full h-2 overflow-hidden mb-2">
              <div
                className="bg-blue-400 h-full transition-all duration-300"
                style={{ width: `${progressVal}%` }}
              />
            </div>
          )}
          {progressVal > 0 && (
            <span className="text-[10px] text-gray-300 font-bold">{progressVal}%</span>
          )}

          {onCancel && (
            <button
              onClick={onCancel}
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-rose-300 hover:text-rose-200 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
            >
              <X className="h-3.5 w-3.5" />
              <span>إلغاء العملية</span>
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
