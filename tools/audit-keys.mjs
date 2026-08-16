#!/usr/bin/env node
// Rounders — leftover backdrop audit.
//
//   node tools/audit-keys.mjs [--fix] [--force <file>] [--dir assets/images]
//
// Keying cuts the backdrop that reaches the border, which is right for a
// silhouette but leaves everything the art encloses: the gap inside a pipe
// loop, the hole in a chain link, the space between two hair strands. Those
// pockets are still solid screen colour and show up in game as green holes.
//
// Two ways of finding them, and they are not equally trustworthy:
//
//   confirmed  the delivered original is still in characters/archive/, so the
//              screen colour is known and *which pixels were backdrop* is a
//              fact, not a guess. Anything the shipped file still draws there
//              is leftover. `--fix` cuts exactly these.
//   suspect    no original to compare against, so all that is left is colour:
//              flat pockets sitting on a pure key colour. Reported only —
//              plenty of art is legitimately neon green or magenta (pip's
//              irises, fizz's whole body, riot's paint spray), and cutting by
//              colour would punch holes straight through it. Check by eye and
//              pass --force <file> for the ones that really are backdrop.
//
// Cutting makes the pocket transparent and then feathers and despills its rim,
// so the new edge matches every other keyed edge instead of being green-lined.
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, resolve, relative, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng, encodePng } from "./png.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ARCHIVE = join(ROOT, "assets/images/characters/archive");

const argv = process.argv.slice(2);
const opts = { fix: false, dir: join(ROOT, "assets/images"), min: 24, tolerance: 0.13, flatness: 16, force: [] };
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (a === "--fix") opts.fix = true;
  else if (a === "--force") opts.force.push(argv[++i]);
  else if (a === "--dir") opts.dir = resolve(ROOT, argv[++i]);
  else if (a === "--min") opts.min = Number(argv[++i]);
  else if (a === "--tolerance") opts.tolerance = Number(argv[++i]);
  else if (a === "--help") {
    console.log("usage: node tools/audit-keys.mjs [--fix] [--force <file>] [--dir <path>] [--min <px>]");
    process.exit(0);
  }
}

// The screens the art pipeline uses. Colour is measured against these, not
// against "greenish": stylized art is full of greens and magentas.
const KEYS = [
  { name: "green", r: 0, g: 255, b: 0 },
  { name: "magenta", r: 255, g: 0, b: 255 },
  { name: "blue", r: 0, g: 0, b: 255 }
];

const dist = (r1, g1, b1, r2, g2, b2) =>
  Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2) / 441.6729559;

async function pngs(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    // The archive holds the delivered originals, screens and all — it is the
    // evidence, not a shipping asset.
    if (ent.isDirectory()) { if (p !== ARCHIVE) out.push(...await pngs(p)); }
    else if (ent.name.toLowerCase().endsWith(".png")) out.push(p);
  }
  return out.sort();
}

// Backdrop colour of a delivered original, from its border ring.
function borderKey(rgba, w, h) {
  const band = Math.max(1, Math.round(Math.min(w, h) * 0.02));
  let n = 0, sr = 0, sg = 0, sb = 0;
  for (let y = 0; y < h; y += 1) {
    const edgeRow = y < band || y >= h - band;
    for (let x = 0; x < w; x += 1) {
      if (!edgeRow && x >= band && x < w - band) continue;
      const i = (y * w + x) * 4;
      if (rgba[i + 3] < 128) continue;
      n += 1; sr += rgba[i]; sg += rgba[i + 1]; sb += rgba[i + 2];
    }
  }
  if (!n) return null;
  const key = { r: sr / n, g: sg / n, b: sb / n };
  // Only trust it if the border really is that one colour.
  let agree = 0, total = 0;
  for (let y = 0; y < h; y += 1) {
    const edgeRow = y < band || y >= h - band;
    for (let x = 0; x < w; x += 1) {
      if (!edgeRow && x >= band && x < w - band) continue;
      const i = (y * w + x) * 4;
      if (rgba[i + 3] < 128) continue;
      total += 1;
      if (dist(rgba[i], rgba[i + 1], rgba[i + 2], key.r, key.g, key.b) < 0.06) agree += 1;
    }
  }
  return total && agree / total > 0.9 ? key : null;
}

// Connected pockets of `hit` pixels, with their spread so flat screen can be
// told from painted art.
function components(hit, rgba, w, h) {
  const n = w * h;
  const seen = new Uint8Array(n);
  const out = [];
  const stack = [];
  for (let s = 0; s < n; s += 1) {
    if (!hit[s] || seen[s]) continue;
    const pixels = [];
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    let sr = 0, sg = 0, sb = 0, srr = 0, sgg = 0, sbb = 0;
    stack.push(s); seen[s] = 1;
    while (stack.length) {
      const p = stack.pop();
      pixels.push(p);
      const x = p % w, y = (p / w) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      const i = p * 4;
      sr += rgba[i]; sg += rgba[i + 1]; sb += rgba[i + 2];
      srr += rgba[i] ** 2; sgg += rgba[i + 1] ** 2; sbb += rgba[i + 2] ** 2;
      if (x > 0 && hit[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
      if (x < w - 1 && hit[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
      if (y > 0 && hit[p - w] && !seen[p - w]) { seen[p - w] = 1; stack.push(p - w); }
      if (y < h - 1 && hit[p + w] && !seen[p + w]) { seen[p + w] = 1; stack.push(p + w); }
    }
    const c = pixels.length;
    const sd = (sum, sq) => Math.sqrt(Math.max(0, sq / c - (sum / c) ** 2));
    out.push({
      pixels, area: c,
      box: [x0, y0, x1 - x0 + 1, y1 - y0 + 1],
      mean: [Math.round(sr / c), Math.round(sg / c), Math.round(sb / c)],
      flatness: Math.max(sd(sr, srr), sd(sg, sgg), sd(sb, sbb))
    });
  }
  return out.sort((a, b) => b.area - a.area);
}

// Pixels the *original* says were backdrop and the shipped file still draws.
function confirmedPockets(rgba, w, h, orig) {
  if (!orig || orig.width !== w || orig.height !== h) return null;
  const key = borderKey(orig.rgba, orig.width, orig.height);
  if (!key) return null;
  // Two ways for a pixel to be backdrop, both anchored on the original:
  // it *is* the screen colour there, or the original was near the screen and
  // the shipped file still looks like it — which is the soft edge of the same
  // pocket, half backdrop and half nothing.
  const hit = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p += 1) {
    const i = p * 4;
    if (rgba[i + 3] < 24) continue;
    const o = dist(orig.rgba[i], orig.rgba[i + 1], orig.rgba[i + 2], key.r, key.g, key.b);
    const s = dist(rgba[i], rgba[i + 1], rgba[i + 2], key.r, key.g, key.b);
    if (o <= 0.10 || (o <= 0.32 && s <= 0.16)) hit[p] = 1;
  }
  // No size floor here: the original is evidence, so a two-pixel speck of
  // backdrop is as certain as a two-thousand-pixel pocket. (The floor exists
  // for the colour-only guess, where small means noise.)
  return { key, comps: components(hit, rgba, w, h) };
}

// Colour-only guess, for files with no archived original.
function suspectPockets(rgba, w, h) {
  const found = [];
  for (const key of KEYS) {
    const hit = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p += 1) {
      const i = p * 4;
      if (rgba[i + 3] < 24) continue;
      if (dist(rgba[i], rgba[i + 1], rgba[i + 2], key.r, key.g, key.b) <= opts.tolerance) hit[p] = 1;
    }
    const comps = components(hit, rgba, w, h)
      .filter((c) => c.area >= opts.min && c.flatness <= opts.flatness);
    if (comps.length) found.push({ key, comps });
  }
  return found;
}

// Cut the pockets: transparent inside, and one ring of neighbours pulled toward
// transparent and stripped of the key's colour cast — the same idea chroma.js
// applies along a cut edge.
function cut(rgba, w, h, key, comps) {
  const doomed = new Uint8Array(w * h);
  for (const c of comps) for (const p of c.pixels) doomed[p] = 1;
  const rim = [];
  for (let p = 0; p < w * h; p += 1) {
    if (doomed[p] || rgba[p * 4 + 3] === 0) continue;
    const x = p % w, y = (p / w) | 0;
    if ((x > 0 && doomed[p - 1]) || (x < w - 1 && doomed[p + 1])
      || (y > 0 && doomed[p - w]) || (y < h - 1 && doomed[p + w])) rim.push(p);
  }
  for (let p = 0; p < w * h; p += 1) if (doomed[p]) rgba[p * 4 + 3] = 0;
  for (const p of rim) {
    const i = p * 4;
    const spill = Math.max(0, 1 - dist(rgba[i], rgba[i + 1], rgba[i + 2], key.r, key.g, key.b) / 0.45);
    if (spill <= 0.02) continue;
    for (let c = 0; c < 3; c += 1) {
      const k = [key.r, key.g, key.b][c];
      rgba[i + c] = Math.round(Math.max(0, Math.min(255, (rgba[i + c] - k * spill) / (1 - spill))));
    }
    rgba[i + 3] = Math.round(rgba[i + 3] * (1 - spill * 0.6));
  }
  return { cut: comps.reduce((n, c) => n + c.area, 0), rim: rim.length };
}

const archived = new Set();
try {
  for (const f of await readdir(ARCHIVE)) if (f.endsWith(".png")) archived.add(f);
} catch { /* no archive */ }

const describe = (label, key, comps, w, h) => {
  const total = comps.reduce((n, c) => n + c.area, 0);
  const worst = comps[0];
  return `  ${label} ${key.name || `rgb(${[key.r, key.g, key.b].map(Math.round).join(",")})`}: `
    + `${comps.length} pocket(s), ${total} px (${((total / (w * h)) * 100).toFixed(3)}% of frame) — `
    + `biggest ${worst.area} px at ${worst.box[0]},${worst.box[1]} ${worst.box[2]}×${worst.box[3]} `
    + `rgb(${worst.mean.join(",")})`;
};

const files = await pngs(opts.dir);
let confirmedFiles = 0, suspectFiles = 0, fixedFiles = 0, fixedPx = 0;
const suspects = [];
for (const file of files) {
  const png = decodePng(await readFile(file));
  const { width: w, height: h, rgba } = png;
  const name = relative(ROOT, file);
  const forced = opts.force.some((f) => name.endsWith(f) || basename(file) === f);

  let orig = null;
  if (archived.has(basename(file))) {
    const p = join(ARCHIVE, basename(file));
    if ((await stat(p)).isFile()) orig = decodePng(await readFile(p));
  }

  const confirmed = confirmedPockets(rgba, w, h, orig);
  if (confirmed && confirmed.comps.length) {
    confirmedFiles += 1;
    console.log(name);
    console.log(describe("confirmed against the original —", confirmed.key, confirmed.comps, w, h));
    if (opts.fix) {
      const r = cut(rgba, w, h, confirmed.key, confirmed.comps);
      console.log(`    cut ${r.cut} px, feathered ${r.rim} rim px`);
      await writeFile(file, encodePng(w, h, Buffer.from(rgba)));
      fixedFiles += 1; fixedPx += r.cut;
    }
    continue;
  }

  const guessed = suspectPockets(rgba, w, h);
  if (!guessed.length) continue;
  suspectFiles += 1;
  suspects.push(name);
  console.log(name);
  for (const { key, comps } of guessed) {
    console.log(describe("suspect —", key, comps, w, h));
    if (forced) {
      const r = cut(rgba, w, h, key, comps);
      console.log(`    forced: cut ${r.cut} px, feathered ${r.rim} rim px`);
      fixedPx += r.cut;
    }
  }
  if (forced) {
    await writeFile(file, encodePng(w, h, Buffer.from(rgba)));
    fixedFiles += 1;
  }
}

console.log(
  `\n${files.length} PNG(s) scanned`
  + ` · ${confirmedFiles} with confirmed leftover backdrop`
  + ` · ${suspectFiles} colour-only suspects (check by eye)`
  + (opts.fix || opts.force.length ? ` · ${fixedFiles} rewritten, ${fixedPx} px cut` : "")
);
if (!opts.fix && confirmedFiles) console.log("re-run with --fix to cut the confirmed ones");
