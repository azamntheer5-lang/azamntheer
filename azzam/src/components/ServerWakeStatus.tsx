import React, { useCallback, useEffect, useRef, useState } from "react";
import { Server, CheckCircle2, RotateCw } from "lucide-react";

type WakeState = "checking" | "waking" | "awake" | "error";

/**
 * Render's free tier spins the server down after ~15 minutes of inactivity;
 * the first request after that takes 30-60 seconds while it cold-starts
 * (see server.ts for the matching optional server-side keep-alive, and the
 * README for plan/alternative comparisons).
 *
 * This component pings /api/health the moment the app loads — in parallel
 * with everything else, so by the time the person actually picks a file the
 * server has had a head start waking up — and shows a small, unobtrusive
 * status pill ONLY when it's actually worth telling them something:
 *   - nothing at all for the first ~1.8s (covers the common case where the
 *     server was already awake and responds almost instantly — no need to
 *     flash a UI element for that)
 *   - a "waking up, this can take up to a minute" pill once it's taking
 *     longer than that
 *   - a brief "ready" confirmation once it succeeds, then it fades away
 *   - a persistent retry pill if every attempt fails (e.g. genuinely offline)
 *
 * The pill itself doubles as the manual "wake up" button — tapping it during
 * the waking/error state re-fires the check immediately.
 */
export const ServerWakeStatus: React.FC = () => {
  const [state, setState] = useState<WakeState>("checking");
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ping = useCallback(async (showImmediately: boolean) => {
    setState("checking");

    if (showImmediately) {
      setVisible(true);
    } else {
      // Don't flash the pill for the common "already awake" case — only
      // reveal it if the check is still running after ~1.8s.
      showDelayRef.current = setTimeout(() => setVisible(true), 1800);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 65_000); // cold start can take ~60s

    try {
      const res = await fetch("/api/health", { signal: controller.signal, cache: "no-store" });
      if (showDelayRef.current) clearTimeout(showDelayRef.current);

      if (res.ok) {
        setState("awake");
        setVisible(true);
        hideTimerRef.current = setTimeout(() => setVisible(false), 2500);
      } else {
        setState("error");
        setVisible(true);
      }
    } catch {
      if (showDelayRef.current) clearTimeout(showDelayRef.current);
      setState("error");
      setVisible(true);
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    // First check on app load — silent unless it turns out to take a while.
    ping(false);

    // If the first attempt is still pending after 1.8s, switch the visible
    // pill into "waking" mode so the message matches what's happening.
    const wakingTimer = setTimeout(() => {
      setState((current) => (current === "checking" ? "waking" : current));
    }, 1800);

    return () => {
      clearTimeout(wakingTimer);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (showDelayRef.current) clearTimeout(showDelayRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  const isBusy = state === "checking" || state === "waking";

  return (
    <button
      onClick={() => ping(true)}
      disabled={isBusy}
      className={`fixed bottom-4 left-4 z-[60] flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-bold shadow-lg backdrop-blur-md transition-all cursor-pointer ${
        state === "error"
          ? "border-amber-500/30 bg-amber-950/90 text-amber-300 hover:bg-amber-900/90"
          : state === "awake"
          ? "border-emerald-500/30 bg-emerald-950/90 text-emerald-300"
          : "border-indigo-500/30 bg-indigo-950/90 text-indigo-300"
      }`}
      title={isBusy ? "جاري التحقق من حالة الخادم" : "اضغط لإعادة المحاولة"}
    >
      {state === "awake" ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : isBusy ? (
        <Server className="h-3.5 w-3.5 animate-pulse" />
      ) : (
        <RotateCw className="h-3.5 w-3.5" />
      )}
      <span>
        {state === "awake" && "الخادم جاهز"}
        {state === "waking" && "جاري إيقاظ الخادم من وضع السكون… قد يستغرق حتى دقيقة"}
        {state === "checking" && "جاري التحقق من الخادم..."}
        {state === "error" && "تعذّر الوصول للخادم — اضغط لإعادة المحاولة"}
      </span>
    </button>
  );
};
