import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useUIStore } from "../../store/uiStore";

interface ProcessingOverlayProps {
  active?: boolean;
  status?: string;
  progress?: number;
  onCancel?: () => void;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  active, status, progress, onCancel,
}) => {
  const globalActive   = useUIStore((s) => s.isProcessing);
  const globalStatus   = useUIStore((s) => s.processingStatus);
  const globalProgress = useUIStore((s) => s.processingProgress);

  const isActive    = active    ?? globalActive;
  const statusText  = status    ?? globalStatus;
  const progressVal = progress  ?? globalProgress;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl"
          style={{ background: "rgba(4,7,15,0.75)", backdropFilter: "blur(8px)" }}
        >
          {/* Spinner */}
          <div className="relative mb-5">
            <div className="h-14 w-14 rounded-full border-2 border-white/10" />
            <div className="absolute inset-0 h-14 w-14 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
            <div className="absolute inset-2 h-10 w-10 rounded-full border-2 border-transparent border-t-indigo-400 animate-spin" style={{ animationDuration: "0.75s", animationDirection: "reverse" }} />
          </div>

          {/* Status text */}
          <p className="text-sm font-bold text-white mb-3 max-w-xs text-center px-6 leading-relaxed">
            {statusText || "جاري المعالجة..."}
          </p>

          {/* Progress bar */}
          {progressVal > 0 && (
            <div className="w-48 space-y-1.5">
              <div className="h-1.5 rounded-full bg-white/[0.04]/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressVal}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-[10px] text-center text-slate-500 font-semibold">{progressVal}%</p>
            </div>
          )}

          {onCancel && (
            <button
              onClick={onCancel}
              className="mt-5 flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
            >
              <X className="h-3.5 w-3.5" />
              إلغاء
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
