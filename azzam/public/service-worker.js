/**
 * "Killer" Service Worker — عزّام برو
 * =========================================================================
 * هذا التطبيق لا يستخدم Service Worker للعمل بدون إنترنت إطلاقاً. لكن تطبيقاً
 * قديماً كان يشغل نفس النطاق (azzam-z19t.onrender.com) سجّل Service Worker
 * (يبدو أنه مبني بـ Workbox) ما زال عالقاً وفعّالاً في متصفحات الزوار القدامى.
 * ذلك الـ SW القديم يعترض طلبات الشبكة ويُرجع نسخاً قديمة من JS، حتى لو
 * الخادم يقدّم كوداً جديداً تماماً — وهذا بالضبط سبب ظهور رسائل خطأ قديمة مثل
 * "فشل المعالجة" التي لم تعد موجودة في الكود الحالي إطلاقاً.
 *
 * This file is served at /sw.js AND /service-worker.js (see the explicit
 * Express routes in server.ts) specifically so that whichever path the OLD
 * service worker was registered under, the browser's normal SW update check
 * — which happens on navigation independently of whatever the active SW's
 * fetch handler does, and which a service worker is spec-forbidden from
 * intercepting for its OWN script URL — picks up THIS file, sees the bytes
 * differ, installs it, and lets it take over and erase everything.
 *
 * What it does, in order: skip the normal waiting period → claim every open
 * tab immediately → delete every Cache Storage bucket this origin owns →
 * tell every open tab to do one clean reload → unregister itself so no
 * service worker is left controlling this origin at all going forward.
 * =========================================================================
 */

self.addEventListener("install", () => {
  // Don't wait for old tabs to close — activate as soon as installed.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 1. Delete every cache bucket this origin owns, regardless of name
      //    (covers workbox-precache-*, workbox-runtime-*, azzam-*, or
      //    anything else a previous app might have created).
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch (err) {
        // Non-fatal — still proceed to claim + unregister below.
        console.warn("[azzam-sw-killer] cache cleanup failed:", err);
      }

      // 2. Take control of every open tab right now, without waiting for a
      //    fresh navigation.
      try {
        await self.clients.claim();
      } catch (err) {
        console.warn("[azzam-sw-killer] clients.claim failed:", err);
      }

      // 3. Tell every open tab to reload itself once, now that no service
      //    worker stands between it and the real server. main.tsx listens
      //    for this message and performs a single cache-busted reload.
      try {
        const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of allClients) {
          client.postMessage({ type: "AZZAM_SW_KILLED" });
        }
      } catch (err) {
        console.warn("[azzam-sw-killer] notifying clients failed:", err);
      }

      // 4. Finally, remove this service worker registration entirely — this
      //    app is not a PWA and should never be intercepted by a SW again.
      try {
        await self.registration.unregister();
      } catch (err) {
        console.warn("[azzam-sw-killer] unregister failed:", err);
      }
    })()
  );
});

// Belt-and-braces: never actually serve anything from cache while this
// worker is briefly alive — always pass requests straight to the network.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
