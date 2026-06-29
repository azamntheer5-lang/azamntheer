import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastIdCounter = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = ++toastIdCounter;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => remove(id), 5000);
    },
    [remove]
  );

  const api: ToastContextValue = {
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onClose={() => remove(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

const Toast: React.FC<{ toast: ToastItem; onClose: () => void }> = ({ toast, onClose }) => {
  const colors = {
    success: "bg-emerald-950/90 border-emerald-500/40 text-emerald-300 shadow-emerald-900/10",
    error: "bg-rose-950/90 border-rose-500/40 text-rose-300 shadow-rose-900/10",
    info: "bg-indigo-950/90 border-indigo-500/40 text-indigo-300 shadow-indigo-900/10",
  };
  const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? AlertCircle : Info;
  const dotColor = toast.type === "success" ? "bg-emerald-400" : toast.type === "error" ? "bg-rose-400" : "bg-indigo-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: -30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`pointer-events-auto px-5 py-3 rounded-xl border font-bold text-xs flex items-center gap-2.5 shadow-xl backdrop-blur-md transition-all duration-300 max-w-md ${colors[toast.type]}`}
    >
      <div className={`h-2.5 w-2.5 rounded-full ${dotColor} shrink-0`} />
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={onClose}
        className="text-current opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback no-op for SSR or contexts without provider
    return {
      success: (m) => console.log("✅", m),
      error: (m) => console.error("❌", m),
      info: (m) => console.info("ℹ️", m),
    };
  }
  return ctx;
}
