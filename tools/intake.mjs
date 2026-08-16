#!/usr/bin/env node
// Rounders — character art intake.
//
//   node tools/intake.mjs [inbox-dir] [options]
//
// Takes delivered character art, makes sure every file ends up as a
// transparent PNG, and files it where the game looks for it:
//
//   <id>.png                        -> assets/images/characters/canonical/<id>.png
//   <id>_body|_weapon|_arm.png      -> assets/images/characters/render/<id>_<part>.png
//
// Images that already have an alpha channel are copied through untouched.
// Images rendered on a solid backdrop (magenta/green/white screen) are keyed:
// the backdrop color is detected from the border, cut out with a soft edge,
// and its color bleed is removed from the outline. Only backdrop connected to
// the border is cut, so a magenta detail on a magenta screen survives.
//
// Files that had to be keyed are preserved as delivered in
// assets/images/characters/archive/, so a cutout can be redone later; files
// that already had alpha are simply moved into place unchanged.
//
// Options:
//   --dry-run             report what would happen, write nothing
//   --copy                copy originals to the archive instead of moving them
//   --archive <dir>       where originals are kept (default characters/archive)
//   --archive-all         archive every delivered file, not just keyed ones
//   --key #ff00ff         force the backdrop color instead of detecting it
//   --force               key even if the image already has transparency
//   --tolerance 0.16      how far from the key color still counts as backdrop
//   --softness 0.10       width of the soft edge ramp
//   --despill 1           how much color bleed to neutralize (0 disables)
//   --shrink 0.06         bias edge pixels toward transparent (kills halos)
//   --no-connected        cut every backdrop-colored pixel, not just the border region
//   --out <dir>           repository root (default: the repo this script lives in)
import { readdir, readFile, writeFile, mkdir, rename, copyFile, unlink, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { basename, extname, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng, encodePng } from "./png.mjs";
import "../js/chroma.js";

const chroma = globalThis.ROUNDERS_CHROMA;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ------------------------------------------------------------------ options

const argv = process.argv.slice(2);
const opts = {
  inbox: join(ROOT, "intake"),
  root: ROOT,
  dryRun: false,
  copy: false,
  archive: null,
  archiveAll: false,
  force: false,
  key: null,
  tolerance: undefined,
  softness: undefined,
  despill: undefined,
  shrink: undefined,
  connected: true
};
const numeric = { tolerance: 1, softness: 1, despill: 1, shrink: 1 };
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (a === "--dry-run") opts.dryRun = true;
  else if (a === "--copy") opts.copy = true;
  else if (a === "--archive") opts.archive = resolve(argv[++i]);
  else if (a === "--archive-all") opts.archiveAll = true;
  else if (a === "--force") opts.force = true;
  else if (a === "--no-connected") opts.connected = false;
  else if (a === "--key") opts.key = parseHex(argv[++i]);
  else if (a === "--out") opts.root = resolve(argv[++i]);
  else if (a.startsWith("--") && numeric[a.slice(2)]) opts[a.slice(2)] = Number(argv[++i]);
  else if (a.startsWith("--")) fail(`unknown option ${a}`);
  else opts.inbox = resolve(a);
}

const archiveDir = () => opts.archive || join(opts.root, "assets/images/characters/archive");

function fail(msg) {
  console.error(`intake: ${msg}`);
  process.exit(1);
}

function parseHex(s) {
  const m = /^#?([0-9a-f]{6})$/i.exec(s || "");
  if (!m) fail(`--key expects a hex color like #ff00ff, got "${s}"`);
  const v = parseInt(m[1], 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}
const hex = (c) => `#${[c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
const pct = (v) => `${(v * 100).toFixed(1)}%`;

// ------------------------------------------------------------------ routing

async function characterIds() {
  const src = await readFile(join(opts.root, "js/characters.js"), "utf8");
  return [...src.matchAll(/\{\s*id:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);
}

// "Vex Body v2.png" -> { id: "vex", part: "body" }
function route(file, ids) {
  const stem = basename(file, extname(file)).toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const parts = stem.split("_").filter(Boolean);
  const id = ids.find((c) => parts.includes(c))
    || ids.filter((c) => stem.startsWith(c)).sort((a, b) => b.length - a.length)[0];
  if (!id) return null;
  const part = ["body", "weapon", "arm"].find((p) => parts.includes(p)) || null;
  return { id, part };
}

function destination(r) {
  return r.part
    ? join(opts.root, "assets/images/characters/render", `${r.id}_${r.part}.png`)
    : join(opts.root, "assets/images/characters/canonical", `${r.id}.png`);
}

// ------------------------------------------------------------------ decode

const IMAGES = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".bmp", ".tif", ".tiff"]);

const CONVERTERS = [
  { bin: "magick", args: (i, o) => [i, o] },
  { bin: "convert", args: (i, o) => [i, o] },
  { bin: "ffmpeg", args: (i, o) => ["-y", "-loglevel", "error", "-i", i, o] }
];

// Non-PNG deliveries are converted with whatever is on PATH; if nothing is,
// the browser intake page handles them.
function toPng(file) {
  const out = join(opts.inbox, `.intake-${basename(file, extname(file))}.png`);
  for (const c of CONVERTERS) {
    const probe = spawnSync(c.bin, ["-version"], { stdio: "ignore" });
    if (probe.error) continue;
    const run = spawnSync(c.bin, c.args(file, out), { stdio: "ignore" });
    if (!run.error && run.status === 0) return out;
  }
  return null;
}

// -------------------------------------------------------------------- main

async function main() {
  let files;
  try {
    files = (await readdir(opts.inbox)).filter((f) => !f.startsWith("."));
  } catch {
    console.log(
      `Nothing to do — drop delivered art into ${opts.inbox.replace(`${ROOT}/`, "")}/ and run this again.\n\n`
      + `  <id>.png                     the canonical hero image\n`
      + `  <id>_body|_weapon|_arm.png   the composed render parts\n`
    );
    return;
  }
  const ids = await characterIds();
  const rows = [];
  const problems = [];
  let archived = 0;

  for (const name of files.sort()) {
    const file = join(opts.inbox, name);
    if (!(await stat(file)).isFile()) continue;
    if (!IMAGES.has(extname(name).toLowerCase())) continue;

    const r = route(name, ids);
    if (!r) {
      problems.push(`${name}: no character id in the filename (expected one of ${ids.slice(0, 4).join(", ")}, …)`);
      continue;
    }

    let source = file;
    let converted = null;
    if (extname(name).toLowerCase() !== ".png") {
      converted = toPng(file);
      if (!converted) {
        problems.push(`${name}: not a PNG and no converter found (install ImageMagick/ffmpeg, or use the browser intake page at /workbench/intake.html)`);
        continue;
      }
      source = converted;
    }

    let img;
    try {
      img = decodePng(await readFile(source));
    } catch (e) {
      problems.push(`${name}: ${e.message}`);
      continue;
    }

    const res = chroma.process(img.rgba, img.width, img.height, {
      key: opts.key,
      keepAlpha: !opts.force,
      connected: opts.connected,
      ...(opts.tolerance !== undefined ? { tolerance: opts.tolerance } : {}),
      ...(opts.softness !== undefined ? { softness: opts.softness } : {}),
      ...(opts.despill !== undefined ? { despill: opts.despill } : {}),
      ...(opts.shrink !== undefined ? { shrink: opts.shrink } : {})
    });

    const dest = destination(r);
    rows.push({
      name,
      target: dest.replace(`${opts.root}/`, ""),
      size: `${img.width}×${img.height}`,
      action: res.action,
      detail: res.action === "keyed"
        ? `${hex(res.key)} · cut ${pct(res.cutFraction)}`
        : res.action === "kept"
          ? `already transparent (${pct(res.info.clearFraction)})`
          : res.reason || "left as-is"
    });

    if (res.action === "skipped" && !res.info.hasAlpha) {
      problems.push(`${name}: opaque image and ${res.reason} — pass --key to force a backdrop color, or key it by hand at /workbench/intake.html`);
    }

    if (opts.dryRun) continue;

    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, encodePng(img.width, img.height, img.rgba));

    // Only art we actually rewrote needs its original kept; a file that already
    // had alpha went out byte-for-similar and would just be a duplicate.
    if (res.action === "keyed" || opts.archiveAll) {
      const keep = join(archiveDir(), name);
      await mkdir(dirname(keep), { recursive: true });
      if (opts.copy) await copyFile(file, keep);
      else await rename(file, keep).catch(async () => { await copyFile(file, keep); await unlink(file); });
      archived += 1;
    } else if (!opts.copy) {
      await unlink(file);
    }
    if (converted) await unlink(converted).catch(() => {});
  }

  if (rows.length) {
    const w = (k) => Math.max(...rows.map((x) => x[k].length));
    const pad = (s, n) => s.padEnd(n);
    console.log(`\n${pad("file", w("name"))}  ${pad("size", w("size"))}  ${pad("action", 7)}  ${pad("detail", w("detail"))}  target`);
    for (const x of rows) {
      console.log(`${pad(x.name, w("name"))}  ${pad(x.size, w("size"))}  ${pad(x.action, 7)}  ${pad(x.detail, w("detail"))}  ${x.target}`);
    }
  }
  console.log(
    `\n${rows.length} file(s) ${opts.dryRun ? "would be processed" : "processed"}`
    + `${archived ? `; ${archived} original(s) kept in ${archiveDir().replace(`${opts.root}/`, "")}/` : ""}.`
  );
  if (problems.length) {
    console.log(`\n${problems.length} needing attention:`);
    for (const p of problems) console.log(`  ! ${p}`);
  }
  if (rows.some((x) => x.action === "keyed")) {
    console.log(`\nCheck the cutouts at /workbench/intake.html (drop the originals in to tune tolerance) before committing.`);
  }
}

main().catch((e) => fail(e.stack || e.message));
