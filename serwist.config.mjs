import { serwist } from "@serwist/next/config";

export default serwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  precachePrerendered: true,
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  globIgnores: ["**/*.map", "data/**"],
});
