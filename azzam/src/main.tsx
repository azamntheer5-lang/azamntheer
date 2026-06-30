import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// =============================================================================
// SERVICE WORKER CLEANUP
// =============================================================================
// The app that previously occupied this exact Render URL registered a Service
// Worker (looks Workbox-based) for offline caching. That SW can still be
// active in returning visitors' browsers and intercepts requests for JS
// chunks, serving OLD cached code even though the server now serves
// something completely different. That's why some users were seeing error
// strings like "فشل المعالجة" / "خطأ في المعالجة" that don't exist anywhere
// in this codebase, and an old uploadPDF() that POSTs to
// /api/files/pdf/upload-analyze and fails with HTTP 413 on large files.
//
// THE CATCH: if the old SW serves a fully cached HTML+JS bundle, this exact
// cleanup code (because it's part of the NEW bundle) never even runs — the
// browser is executing OLD code that doesn't contain it. So this can only be
// a partial fix; the real fix is server.ts + public/sw.js, which serve a
// self-deleting "killer" service worker at /sw.js and /service-worker.js.
// Browsers check a registered SW's script for byte changes on navigation
// independently of what that SW's fetch handler does (a SW is spec-forbidden
// from intercepting the request for its OWN update check), so the killer
// script gets picked up even for users stuck on fully-cached old code —
// it just may take one extra visit for the browser's normal update check to
// fire. This file's job is to handle everything else: clean up for users
// whose browsers ARE running this fresh bundle, and react to the killer SW's
// signal once it has done its job.
// =============================================================================

const RELOAD_ONCE_KEY = "azzam-sw-cleaned";
const UPDATE_TOAST_KEY = "azzam-show-update-toast";

/** Clears every Cache Storage bucket this origin owns, regardless of name
 * (workbox-precache-*, workbox-runtime-*, azzam-*, or anything else). */
async function clearAllCaches(): Promise<number> {
  if (!("caches" in window)) return 0;
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  return cacheNames.length;
}

/** Clears localStorage/sessionStorage keys that might belong to a previous
 * app on this domain (anything not under our own "azzam-" namespace), so a
 * stale session token or cached flag from the old app can't confuse this
 * one. Keeps our own settings (theme, locale, etc.) intact. */
function clearForeignSessionKeys() {
  try {
    for (const store of [window.localStorage, window.sessionStorage]) {
      const foreignKeys: string[] = [];
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (key && !key.startsWith("azzam-")) foreignKeys.push(key);
      }
      foreignKeys.forEach((k) => store.removeItem(k));
    }
  } catch (err) {
    console.warn("[Azzam] clearing foreign session keys failed:", err);
  }
}

/** One-time hard reload with a cache-busting query param, guarded so it can
 * never loop more than once per tab session. */
function reloadOnceWithCacheBust(reason: string) {
  if (sessionStorage.getItem(RELOAD_ONCE_KEY)) return;
  sessionStorage.setItem(RELOAD_ONCE_KEY, "1");
  sessionStorage.setItem(UPDATE_TOAST_KEY, "1");
  console.log(`[Azzam] reloading once (${reason})`);
  const url = new URL(window.location.href);
  url.searchParams.set("v", Date.now().toString(36));
  window.location.replace(url.toString());
}

if ("serviceWorker" in navigator) {
  // 1. If the killer SW (public/sw.js) is already active and managed to
  //    install, it will postMessage every controlled tab once it has wiped
  //    caches and unregistered itself. React immediately instead of waiting
  //    for the `load` cleanup pass below.
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event?.data?.type === "AZZAM_SW_KILLED") {
      reloadOnceWithCacheBust("killer service worker signaled completion");
    }
  });

  window.addEventListener("load", async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();

      if (registrations.length > 0) {
        console.log(`[Azzam] Found ${registrations.length} old service worker(s), removing...`);

        // Unregister everything in parallel.
        await Promise.all(registrations.map((r) => r.unregister()));
        console.log("[Azzam] All old service workers unregistered.");

        const clearedCount = await clearAllCaches();
        console.log(`[Azzam] Cleared ${clearedCount} cache(s).`);

        clearForeignSessionKeys();

        // A registration existed, so this page load was very possibly
        // served by it — do the one-time reload so the NEXT load is
        // guaranteed clean, now that nothing is registered any more.
        reloadOnceWithCacheBust("found and removed stale registrations");
        return;
      }

      // No registrations found at all — also proactively ask the browser to
      // re-check /sw.js and /service-worker.js for an update, in case a
      // registration exists but just hasn't been reported yet on this very
      // first paint. This is a no-op (resolves to undefined) if nothing is
      // registered at those scopes, so it's safe to call unconditionally.
      try {
        const reg = await navigator.serviceWorker.getRegistration("/");
        await reg?.update();
      } catch {
        /* not registered here — fine, nothing to update */
      }
    } catch (err) {
      console.warn("[Azzam] Service worker cleanup failed:", err);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
