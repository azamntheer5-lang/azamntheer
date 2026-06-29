import { useEffect, useRef } from "react";

type Handler = (e: KeyboardEvent) => void;

export interface ShortcutSpec {
  /** Lowercase key, e.g. "k", "Escape", "Enter" */
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: Handler;
  /** Prevent default before handler */
  preventDefault?: boolean;
  /** Disable when typing in input/textarea */
  ignoreInputs?: boolean;
}

function matches(e: KeyboardEvent, spec: ShortcutSpec): boolean {
  // Default behavior: don't fire in text inputs (except Escape)
  if (spec.ignoreInputs !== false) {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable)
    ) {
      if (spec.key !== "Escape") return false;
    }
  }

  const keyMatches = e.key.toLowerCase() === spec.key.toLowerCase();

  // For ctrl/meta: when both are required, accept either (cross-platform)
  const wantCtrl = !!spec.ctrl;
  const wantMeta = !!spec.meta;
  let modMatches = true;
  if (wantCtrl && wantMeta) {
    // Accept either Ctrl or Meta pressed
    modMatches = e.ctrlKey || e.metaKey;
  } else if (wantCtrl) {
    modMatches = e.ctrlKey && !e.metaKey;
  } else if (wantMeta) {
    modMatches = e.metaKey && !e.ctrlKey;
  } else {
    // No modifier requested — must have none of ctrl/meta
    modMatches = !e.ctrlKey && !e.metaKey;
  }

  const shiftMatches = spec.shift ? e.shiftKey : !e.shiftKey;
  const altMatches = spec.alt ? e.altKey : !e.altKey;

  return keyMatches && modMatches && shiftMatches && altMatches;
}

export function useKeyboardShortcuts(specs: ShortcutSpec[]): void {
  const specsRef = useRef(specs);
  specsRef.current = specs;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      for (const spec of specsRef.current) {
        if (matches(e, spec)) {
          if (spec.preventDefault !== false) e.preventDefault();
          spec.handler(e);
          break;
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
