#!/usr/bin/env node
// Rounders — placeholder render parts.
//
//   node tools/mock-parts.mjs [id ...]
//
// Writes crude but correctly-shaped <id>_body.png / <id>_weapon.png /
// <id>_arm.png into assets/images/characters/render/ on one shared 512×512
// canvas, exactly like a real split-parts delivery: body facing right, weapon
// aimed right, two arms reaching from the body to the weapon.
//
// It exists so the composed rig (js/rig.js) and /workbench can be exercised
// before the real art lands — and so a delivery can be sanity-checked against
// a known-good layout. These files are placeholders: delete them (or overwrite
// them with the real parts) before shipping.
import { writeFile, mkdir } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng } from "./png.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets/images/characters/render");
const S = 512;

// The shared layout, in canvas px. Everything the rig detects — body center and
// radius, grip, muzzle, shoulder and hand ends — falls out of these numbers.
const L = {
  body: { x: 200, y: 300, r: 112 },
  weapon: { grip: { x: 300, y: 296 }, muzzle: { x: 484, y: 282 }, half: 15 },
  arms: [
    { from: { x: 256, y: 366 }, to: { x: 330, y: 350 }, half: 12 }, // far arm
    { from: { x: 274, y: 296 }, to: { x: 366, y: 288 }, half: 15 }  // near arm
  ]
};

function frame() { return new Uint8Array(S * S * 4); }

// Plain source-over compositing, so a fill lands on top of the outline under it.
function plot(px, x, y, cover, [r, g, b]) {
  if (x < 0 || y < 0 || x >= S || y >= S || cover <= 0) return;
  const i = (y * S + x) * 4;
  const a = Math.min(1, cover);
  const da = px[i + 3] / 255;
  const out = a + da * (1 - a);
  if (out <= 0) return;
  px[i] = Math.round((r * a + px[i] * da * (1 - a)) / out);
  px[i + 1] = Math.round((g * a + px[i + 1] * da * (1 - a)) / out);
  px[i + 2] = Math.round((b * a + px[i + 2] * da * (1 - a)) / out);
  px[i + 3] = Math.round(out * 255);
}

// Signed-distance fills, so the edges are antialiased and the alpha analysis in
// rig.js sees the same kind of soft outline real art has.
function fill(px, color, sdf) {
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const d = sdf(x + 0.5, y + 0.5);
      if (d < 1) plot(px, x, y, Math.min(1, 1 - d), color);
    }
  }
}

const disc = (c, r) => (x, y) => Math.hypot(x - c.x, y - c.y) - r;

const capsule = (a, b, r) => (x, y) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2));
  return Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t)) - r;
};

async function write(name, px) {
  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, name), encodePng(S, S, Buffer.from(px)));
  return name;
}

async function parts(id) {
  const body = frame();
  fill(body, [64, 58, 92], disc(L.body, L.body.r + 6));
  fill(body, [126, 214, 255], disc(L.body, L.body.r));
  fill(body, [255, 255, 255], disc({ x: L.body.x - 38, y: L.body.y - 46 }, 22));

  const weapon = frame();
  fill(weapon, [40, 38, 56], capsule(L.weapon.grip, L.weapon.muzzle, L.weapon.half + 5));
  fill(weapon, [150, 156, 178], capsule(L.weapon.grip, L.weapon.muzzle, L.weapon.half));
  fill(weapon, [255, 214, 77], disc(L.weapon.muzzle, 12));

  const arm = frame();
  for (const a of L.arms) {
    fill(arm, [40, 38, 56], capsule(a.from, a.to, a.half + 5));
    fill(arm, [96, 176, 214], capsule(a.from, a.to, a.half));
    fill(arm, [72, 140, 176], disc(a.to, a.half + 2)); // the fist end
  }

  return [
    await write(`${id}_body.png`, body),
    await write(`${id}_weapon.png`, weapon),
    await write(`${id}_arm.png`, arm)
  ];
}

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error("usage: node tools/mock-parts.mjs <character-id> [...]");
  process.exit(1);
}
for (const id of ids) {
  const written = await parts(id);
  console.log(`${id}: ${written.join(", ")}`);
}
