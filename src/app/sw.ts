/// <reference lib="webworker" />

import { defaultCache, PAGES_CACHE_NAME } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const THIRTY_DAYS = 30 * 24 * 60 * 60;

function pageExpiration() {
  return new ExpirationPlugin({
    maxEntries: 64,
    maxAgeSeconds: THIRTY_DAYS,
    maxAgeFrom: "last-used",
  });
}

const neverCacheMethods = ["POST", "PUT", "PATCH", "DELETE"] as const;
const neverCacheMutations: RuntimeCaching[] = neverCacheMethods.map(
  (method) => ({
    matcher: /.*/i,
    method,
    handler: new NetworkOnly(),
  }),
);

const runtimeCaching: RuntimeCaching[] = [
  ...neverCacheMutations,
  {
    matcher: ({ sameOrigin, url }) =>
      sameOrigin && url.pathname.startsWith("/api/"),
    method: "GET",
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ sameOrigin }) => !sameOrigin,
    method: "GET",
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ request, sameOrigin, url }) =>
      sameOrigin &&
      !url.pathname.startsWith("/api/") &&
      request.headers.get("RSC") === "1" &&
      request.headers.get("Next-Router-Prefetch") === "1",
    handler: new NetworkFirst({
      cacheName: PAGES_CACHE_NAME.rscPrefetch,
      plugins: [pageExpiration()],
    }),
  },
  {
    matcher: ({ request, sameOrigin, url }) =>
      sameOrigin &&
      !url.pathname.startsWith("/api/") &&
      request.headers.get("RSC") === "1",
    handler: new NetworkFirst({
      cacheName: PAGES_CACHE_NAME.rsc,
      plugins: [pageExpiration()],
    }),
  },
  {
    matcher: ({ request, sameOrigin, url }) =>
      sameOrigin &&
      !url.pathname.startsWith("/api/") &&
      request.mode === "navigate",
    handler: new NetworkFirst({
      cacheName: PAGES_CACHE_NAME.html,
      plugins: [pageExpiration()],
    }),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
    concurrency: 10,
  },
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
