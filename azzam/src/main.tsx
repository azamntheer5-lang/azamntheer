import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// =============================================================================
// SERVICE WORKER CLEANUP
// =============================================================================
// The old app that previously occupied this domain registered a Service Worker
// (sw.js / workbox) for PWA offline caching. That SW is STILL active in users'
// browsers and intercepts requests for JS chunks, serving OLD cached versions
// even though the server now serves new code.
//
// This causes users to see OLD error messages ("فشل المعالجة", "خطأ في المعالجة")
// that don't exist in our current codebase, and OLD uploadPDF code that tries
// to POST to /api/files/pdf/upload-analyze (which fails with 413 on large files).
//
// Fix: On every page load, unregister ALL existing service workers and clear
// ALL caches. After cleanup, force a hard reload so the browser fetches fresh
// code from the server.
// =============================================================================

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        console.log(`[Azzam] Found ${registrations.length} old service worker(s), removing...`);
        await Promise.all(registrations.map(r => r.unregister()));
        console.log("[Azzam] All old service workers unregistered.");

        // Clear all caches
        if ("caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          console.log(`[Azzam] Cleared ${cacheNames.length} cache(s).`);
        }

        // Force hard reload to fetch fresh code (bypass any remaining cache)
        // Only reload once to avoid infinite loop
        if (!sessionStorage.getItem("azzam-sw-cleaned")) {
          sessionStorage.setItem("azzam-sw-cleaned", "1");
          window.location.reload();
          return;
        }
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
