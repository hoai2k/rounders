// Rounders — regenerate js/bullet-art.js from the bullet PNGs.
//
// Each round's trail colour is taken from its own art: the mean of the opaque,
// saturated pixels, lifted a little so the streak reads brighter than the body.
// Scale/rotation tweaks are preserved from the existing config, so re-running
// this after new art lands keeps everything that was dialled in by hand.
//
//   node tools/bullet-colors.mjs
import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng } from "./png.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// keep whatever is already dialled in: this script only re-derives colours
const prev = await readFile(`${ROOT}/js/bullet-art.js`, "utf8").catch(() => "");
const TWEAKS = {};
for (const m of prev.matchAll(/"([\w-]+)":\s*\{([^}]*)\}/g)) {
  const s = m[2];
  const scale = /scale:\s*([\d.]+)/.exec(s);
  const rotation = /rotation:\s*(-?[\d.]+)/.exec(s);
  TWEAKS[m[1]] = {};
  if (scale) TWEAKS[m[1]].scale = Number(scale[1]);
  if (rotation) TWEAKS[m[1]].rotation = Number(rotation[1]);
}
// rounds that keep their hand-drawn look: the procedural one reads better than
// any sprite could at the size it is drawn
const PROCEDURAL = new Set(["supernova"]);

// where the drawn round does not look like its sprite, the trail follows the
// DRAWN round — Supernova flies as a white-hot star, so it trails white-hot
const COLOR_OVERRIDE = { supernova: "#fff0c0" };

const dir = `${ROOT}/assets/images/bullets`;
const files = (await readdir(dir)).filter(f => f.endsWith(".png")).sort();
const colours = {};
for (const f of files) {
  const img = decodePng(await readFile(`${dir}/${f}`));
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < img.rgba.length; i += 4) {
    if (img.rgba[i + 3] < 200) continue;
    const R = img.rgba[i], G = img.rgba[i + 1], B = img.rgba[i + 2];
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    if (mx < 60) continue;
    const w = (mx === 0 ? 0 : (mx - mn) / mx) * (mx / 255) + 0.05;
    r += R * w; g += G * w; b += B * w; n += w;
  }
  const lift = c => Math.min(255, Math.round((c / (n || 1)) * 1.18));
  const hex = v => v.toString(16).padStart(2, "0");
  colours[f.replace(".png", "")] = n ? `#${hex(lift(r))}${hex(lift(g))}${hex(lift(b))}` : "#ffffff";
}

const ids = [...new Set([...Object.keys(colours), ...Object.keys(TWEAKS), ...PROCEDURAL])].sort();
const rows = ids.map(id => {
  const t = TWEAKS[id] || {};
  const bits = [];
  const colour = COLOR_OVERRIDE[id] || colours[id];
  if (colour) bits.push(`color: "${colour}"`);
  if (t.scale != null && t.scale !== 1) bits.push(`scale: ${t.scale}`);
  if (t.rotation != null && t.rotation !== 0) bits.push(`rotation: ${t.rotation}`);
  if (PROCEDURAL.has(id)) bits.push("procedural: true");
  return `    "${id}": { ${bits.join(", ")} }`;
});

const file = `// Rounders — how each card's round is DRAWN.
//
// One entry per card that ships a painted bullet, plus any card that should
// keep a procedural round instead. The game, the card workbench's preview and
// its bullet pane all read from here, so a round looks the same in all three.
//
//   color       the round's trail colour. Derived from the sprite itself (the
//               mean of its opaque, saturated pixels, lifted a little so the
//               streak reads brighter than the body) — a flaming round trails
//               fire, a venom round trails green. Regenerate with
//               tools/bullet-colors.mjs if the art changes.
//   scale       size multiplier for the sprite, dialled in the workbench
//   rotation    degrees to turn the sprite so its barrel points along flight
//   procedural  ignore the sprite; the hand-drawn round reads better
//
// Cards absent from this table fall back to the player's colour and an
// untransformed sprite, so a new bullet PNG works without an entry.
(() => {
  "use strict";
  window.ROUNDERS = window.ROUNDERS || {};

  window.ROUNDERS.BULLET_ART = {
${rows.join(",\n")}
  };

  // What to draw a given card's round with. Never returns null.
  window.ROUNDERS.bulletArtFor = id => window.ROUNDERS.BULLET_ART[id] || {};
})();
`;
await writeFile(`${ROOT}/js/bullet-art.js`, file);
console.log(`${ids.length} entries written`);
