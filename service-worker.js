"use strict";

const CACHE_NAME = "memory-keep-note-shell-v2";
const APP_SHELL = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/favicon.svg",
  "/password-toggle.js",
  "/site-content.js",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/pwa-register.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL.map(url => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names
          .filter(name => name.startsWith("memory-keep-note-shell-") && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin ||
      url.pathname.startsWith("/api/")) return;

  const isAppShellPage = request.mode === "navigate" &&
    (url.pathname === "/" || url.pathname === "/index.html") &&
    url.search === "";
  const isAppShellAsset = APP_SHELL.includes(url.pathname) && url.pathname !== "/" &&
    url.pathname !== "/offline.html";

  if (!isAppShellPage && !isAppShellAsset) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    try {
      const response = await fetch(request, { cache: "no-store" });
      if (response.ok && response.type === "basic") {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;

      if (isAppShellPage) {
        const offline = await cache.match("/offline.html");
        if (offline) return offline;
      }

      throw error;
    }
  })());
});
