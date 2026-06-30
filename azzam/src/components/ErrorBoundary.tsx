import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Short Arabic label for what this boundary protects, shown in the fallback UI. */
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Generic error boundary (must be a class component — React has no Hook
 * equivalent for getDerivedStateFromError / componentDidCatch).
 *
 * Used to wrap heavy/finicky panels (PDF thumbnail grids, canvas editors)
 * so that an unexpected render-time exception shows a small recoverable
 * card instead of taking down the entire app to a blank/frozen screen.
 * The person can press "إعادة المحاولة" to remount the subtree without a
 * full page reload.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // This project has no @types/react installed — the `react` import resolves
  // loosely throughout the codebase, which every OTHER component here never
  // notices because they're all function components. A class component is
  // the one place that actually needs React.Component's inherited
  // props/state/setState to be typed, so they're redeclared explicitly here.
  // `declare` fields are erased entirely at compile time (zero runtime
  // effect) — this only affects type-checking, not behavior.
  declare props: Readonly<ErrorBoundaryProps>;
  declare state: ErrorBoundaryState;
  declare setState: (state: Partial<ErrorBoundaryState>, callback?: () => void) => void;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
          <div className="space-y-1">
            <h3 className="text-sm font-black text-white">
              حدث خطأ غير متوقع{this.props.label ? ` في ${this.props.label}` : ""}
            </h3>
            <p className="max-w-sm text-[11px] text-slate-400">
              لم يتعطل التطبيق بالكامل — هذا الجزء فقط توقف. جرّب إعادة المحاولة، وإن تكرر الخطأ
              جرّب ملفاً آخر أو حدّث الصفحة.
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="mt-1 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-white/[0.1] active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            إعادة المحاولة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
