// Rounders — art intake for cards, bullets and effects.
//
// The character pipeline (tools/intake.mjs) routes by character id; this is its
// sibling for everything else. Drop delivered art under intake/ in the same
// shape it is used:
//
//   intake/cards/<id>.png        -> assets/images/cards/<id>.png       (emblem)
//   intake/cards/art/<id>.png    -> assets/images/cards/art/<id>.png   (scene)
//   intake/bullets/<id>.png      -> assets/images/bullets/<id>.png
//   intake/fx/<name>.png         -> assets/images/fx/<name>.png
//
// Anything delivered on a solid backdrop is keyed to transparency with the same
// chroma pass the character intake uses, and the delivered original is kept in
// assets/images/archive/. Card SCENES are exempt: they are full-bleed paintings
// and are supposed to be opaque.
//
//   npm run intake-art -- --dry-run     see what it would do
//   npm run intake-art                  file everything
import { readFile, writeFile, mkdir, readdir, rename, copyFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng, encodePng } from "./png.mjs";
import "../js/chroma.js";

const chroma = globalThis.ROUNDERS_CHROMA;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const keepSource = argv.includes("--copy");

// where each intake folder lands, and whether its art wants a transparent cut
const ROUTES = [
  { from: "intake/cards/art", to: "assets/images/cards/art", key: false, label: "card scene" },
  { from: "intake/cards", to: "assets/images/cards", key: true, label: "card emblem" },
  { from: "intake/bullets", to: "assets/images/bullets", key: true, label: "bullet" },
  { from: "intake/fx", to: "assets/images/fx", key: true, label: "effect" }
];

const pct = v => `${(v * 100).toFixed(1)}%`;
const hex = c => `#${[c.r, c.g, c.b].map(v => v.toString(16).padStart(2, "0")).join("")}`;

const rows = [];
const problems = [];
let filed = 0, keyed = 0;

for (const route of ROUTES) {
  const dir = join(ROOT, route.from);
  if (!existsSync(dir)) continue;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".png")) continue;
    const source = join(dir, entry.name);
    let img;
    try {
      img = decodePng(await readFile(source));
    } catch (e) {
      problems.push(`${route.label} ${entry.name}: ${e.message}`);
      continue;
    }

    let detail = "opaque scene, left as delivered";
    let wasKeyed = false;
    if (route.key) {
      const res = chroma.process(img.rgba, img.width, img.height, { keepAlpha: true, connected: true });
      wasKeyed = res.action === "keyed";
      detail = wasKeyed
        ? `keyed ${hex(res.key)} · cut ${pct(res.cutFraction)}`
        : res.action === "kept"
          ? `already transparent (${pct(res.info.clearFraction)})`
          : res.reason || "left as-is";
      if (res.action === "skipped" && !res.info.hasAlpha) {
        problems.push(`${route.label} ${entry.name}: opaque and ${res.reason} — key it by hand at /workbench/intake.html`);
      }
    }

    rows.push([route.label, entry.name, `${img.width}×${img.height}`, detail]);
    if (wasKeyed) keyed += 1;
    if (dryRun) continue;

    const dest = join(ROOT, route.to, entry.name);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, encodePng(img.width, img.height, img.rgba));
    filed += 1;

    // keep the delivered file only when we rewrote it; an untouched original
    // would just be a byte-for-byte duplicate of what we filed
    if (wasKeyed) {
      const keep = join(ROOT, "assets/images/archive", route.from.replace("intake/", ""), entry.name);
      await mkdir(dirname(keep), { recursive: true });
      await copyFile(source, keep);
    }
    if (!keepSource) await unlink(source).catch(() => {});
  }
}

const w = [0, 1, 2].map(i => Math.max(...rows.map(r => r[i].length), 4));
for (const r of rows) {
  console.log(`${r[0].padEnd(w[0])}  ${r[1].padEnd(w[1])}  ${r[2].padEnd(w[2])}  ${r[3]}`);
}
console.log(`\n${rows.length} files${dryRun ? " (dry run — nothing written)" : `, ${filed} filed, ${keyed} keyed`}`);
if (problems.length) {
  console.log(`\n${problems.length} need a look:`);
  for (const p of problems) console.log("  " + p);
  process.exitCode = 1;
}
