// Derives the size-optimized WebP variants of the few large raster assets that
// ship on the chrome pages, from the originals kept in assets/_src/.
//
// Why: the originals are full-resolution PNG/JPEG (640² avatars, a 500² logo, a
// 1280×720 video poster ≈ 1.2 MB total) while the pages render them at 92–112
// CSS px. On Lighthouse's throttled mobile profile that payload alone consumed
// the whole link for ~5 s and pushed the hero's LCP past 6 s. Each target below
// is 2× its largest CSS box, which is the smallest size that still looks sharp
// on a 2 dppx screen.
//
// Requires ffmpeg with libwebp. Re-run only when an original changes:
//   node tools/optimize-assets.mjs
//
// The emitted .webp files are committed, exactly like assets/reviews/*.webp.

import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import { ROOT } from "./lib/format.mjs";

const run = promisify(execFile);
const SRC = path.join(ROOT, "assets", "_src");
// assets/ and docs/assets/ are two real directories held byte-identical (the
// builder only ever writes *.html). Emitting into both here keeps them from
// drifting; assets/_src/ is deliberately not mirrored, so the full-resolution
// originals never ship.
const OUT_DIRS = [path.join(ROOT, "assets"), path.join(ROOT, "docs", "assets")];

// [source, output, edge px, quality] — quality 82 for photos, higher for the
// flat-colour logo and the text-bearing poster where ringing is visible.
const TARGETS = [
  ["author-ilya.png", "author-ilya.webp", 184, 82], //  .author img — 92 CSS px
  ["author-timur.png", "author-timur.webp", 184, 82], //  .author img — 92 CSS px
  ["nexttick-logo.png", "nexttick-logo.webp", 224, 88], //  .hero-logo — 112 CSS px
  ["hero-poster.jpg", "hero-poster.webp", 960, 80], //  .hero-video — 480 CSS px
];

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

for (const [src, out, edge, quality] of TARGETS) {
  const inFile = path.join(SRC, src);
  // Keep the aspect ratio: -1 lets ffmpeg derive the short edge (the poster is
  // 16/9, the avatars and logo are square).
  for (const dir of OUT_DIRS) {
    await run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-i", inFile,
      "-vf", `scale=${edge}:-1:flags=lanczos`,
      "-c:v", "libwebp", "-quality", String(quality), "-y", path.join(dir, out),
    ]);
  }
  const [before, after] = await Promise.all([stat(inFile), stat(path.join(OUT_DIRS[0], out))]);
  console.log(
    `${out.padEnd(22)} ${kb(before.size).padStart(9)} -> ${kb(after.size).padStart(8)}` +
      `  (-${Math.round((1 - after.size / before.size) * 100)}%)`,
  );
}
