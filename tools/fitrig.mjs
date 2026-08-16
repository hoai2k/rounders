#!/usr/bin/env node
// Rounders — fit composed rigs against the canonical art.
//
//   node tools/fitrig.mjs [id ...] [--out <file>] [--quiet]
//
// The delivered render parts are each drawn full-frame on their own canvas:
// the body fills 512×512, and so does the weapon, and so do the arms. Nothing
// is in composite position and nothing shares a scale, so the "same canvas"
// shortcut in js/rig.js can't place them.
//
// The canonical hero image is the composition those parts came from, so this
// recovers the rig from it: each part's silhouette is matched into the
// canonical silhouette (scale, offset, and a little rotation for the weapon),
// and the winning placements are converted into rig anchors —
//
//   body.mount       where the weapon's grip sits, in body-image px
//   weapon.scale     the weapon's size relative to the body
//   arm socket/hold  the shoulder on the body, the grip point on the weapon
//
// The result is written to assets/images/characters/render/rigs.json, which
// the game merges over its own auto-detection. Values can be adjusted
// afterwards in /workbench without re-running this.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng } from "./png.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RENDER = join(ROOT, "assets/images/characters/render");
const CANON = join(ROOT, "assets/images/characters/canonical");

const argv = process.argv.slice(2);
const only = argv.filter((a) => !a.startsWith("--"));
const quiet = argv.includes("--quiet");
const outFlag = argv.indexOf("--out");
const OUT = outFlag >= 0 ? resolve(argv[outFlag + 1]) : join(RENDER, "rigs.json");

// Matches js/rig.js so sprite indices and anchors line up with the runtime.
const ALPHA = 24;
const MAX_DIM = 320;
const MIN_AREA = 0.0006;
const MIN_ELONGATION = 1.45;
const FIT = 128; // resolution the silhouette matching runs at

// ---------------------------------------------------------------- masks

function alphaAt(img, x, y) { return img.rgba[(y * img.width + x) * 4 + 3]; }

// Box-downsample the alpha channel to `dim`, then threshold.
function mask(img, dim, cover = 0.5) {
  const s = Math.min(1, dim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * s));
  const h = Math.max(1, Math.round(img.height * s));
  const acc = new Float32Array(w * h);
  const cnt = new Float32Array(w * h);
  for (let y = 0; y < img.height; y += 1) {
    const my = Math.min(h - 1, (y * h / img.height) | 0);
    for (let x = 0; x < img.width; x += 1) {
      const mx = Math.min(w - 1, (x * w / img.width) | 0);
      const i = my * w + mx;
      acc[i] += alphaAt(img, x, y) > ALPHA ? 1 : 0;
      cnt[i] += 1;
    }
  }
  const data = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i += 1) data[i] = acc[i] / cnt[i] >= cover ? 1 : 0;
  return { w, h, data, sx: img.width / w, sy: img.height / h };
}

function components(m) {
  const { w, h, data, sx, sy } = m;
  const label = new Int32Array(w * h).fill(-1);
  const out = [];
  const stack = [];
  for (let i = 0; i < w * h; i += 1) {
    if (!data[i] || label[i] >= 0) continue;
    const id = out.length;
    let area = 0, sumX = 0, sumY = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
    const pixels = [];
    stack.push(i); label[i] = id;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p / w) | 0;
      area += 1; sumX += x; sumY += y; pixels.push(p);
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && data[p - 1] && label[p - 1] < 0) { label[p - 1] = id; stack.push(p - 1); }
      if (x < w - 1 && data[p + 1] && label[p + 1] < 0) { label[p + 1] = id; stack.push(p + 1); }
      if (y > 0 && data[p - w] && label[p - w] < 0) { label[p - w] = id; stack.push(p - w); }
      if (y < h - 1 && data[p + w] && label[p + w] < 0) { label[p + w] = id; stack.push(p + w); }
    }
    out.push({
      area, pixels, w, sx, sy,
      px: { x0, y0, x1, y1 },
      cx: (sumX / area + 0.5) * sx, cy: (sumY / area + 0.5) * sy,
      x0: x0 * sx, y0: y0 * sy, x1: (x1 + 1) * sx, y1: (y1 + 1) * sy,
      radius: Math.sqrt((area * sx * sy) / Math.PI)
    });
  }
  return out.filter((c) => c.area >= w * h * MIN_AREA).sort((a, b) => b.area - a.area);
}

function slabY(comp, from, to) {
  const { px, w, sx, sy } = comp;
  const span = px.x1 - px.x0 + 1;
  const lo = px.x0 + span * from, hi = px.x0 + span * to;
  let sum = 0, n = 0;
  for (const p of comp.pixels) {
    const x = p % w;
    if (x < lo || x > hi) continue;
    sum += (p / w) | 0; n += 1;
  }
  return n ? ((sum / n) + 0.5) * sy : comp.cy;
}

// Principal axis, oriented rightwards (shoulder trailing, hand leading).
function axis(comp) {
  const { pixels, w, sx, sy, cx, cy } = comp;
  let xx = 0, yy = 0, xy = 0;
  for (const p of pixels) {
    const dx = ((p % w) + 0.5) * sx - cx, dy = (((p / w) | 0) + 0.5) * sy - cy;
    xx += dx * dx; yy += dy * dy; xy += dx * dy;
  }
  const n = pixels.length;
  xx /= n; yy /= n; xy /= n;
  const t = (xx + yy) / 2;
  const d = Math.sqrt(Math.max(0, ((xx - yy) / 2) ** 2 + xy * xy));
  const l1 = t + d, l2 = Math.max(1e-6, t - d);
  let ux = xy, uy = l1 - xx;
  if (Math.hypot(ux, uy) < 1e-6) { ux = 1; uy = 0; }
  const len = Math.hypot(ux, uy); ux /= len; uy /= len;
  if (ux < 0) { ux = -ux; uy = -uy; }
  let lo = Infinity, hi = -Infinity, perp = 0;
  for (const p of pixels) {
    const dx = ((p % w) + 0.5) * sx - cx, dy = (((p / w) | 0) + 0.5) * sy - cy;
    const a = dx * ux + dy * uy;
    if (a < lo) lo = a;
    if (a > hi) hi = a;
    perp = Math.max(perp, Math.abs(-dx * uy + dy * ux));
  }
  const inset = Math.min(perp, (hi - lo) * 0.25);
  const at = (a) => ({ x: cx + ux * a, y: cy + uy * a });
  return { shoulder: at(lo + inset), hand: at(hi - inset), elongation: Math.sqrt(l1 / l2) };
}

// ------------------------------------------------------------- matching

// Points of a mask, centered on its centroid, in fit-grid units.
function points(m, step = 1) {
  const pts = [];
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < m.h; y += 1) {
    for (let x = 0; x < m.w; x += 1) {
      if (!m.data[y * m.w + x]) continue;
      n += 1; sx += x; sy += y;
      if ((x + y) % step === 0) pts.push(x, y);
    }
  }
  if (!n) return null;
  const cx = sx / n, cy = sy / n;
  const out = new Float32Array(pts.length);
  for (let i = 0; i < pts.length; i += 2) { out[i] = pts[i] - cx; out[i + 1] = pts[i + 1] - cy; }
  return { pts: out, cx, cy, count: n, sampled: pts.length / 2 };
}

// Slide a point cloud over the target and score every placement.
// inside/outside are measured against `bounds` (the canonical silhouette);
// `want` is the region the part should cover (the canonical, or the residual).
//
// Scores are area-weighted (each sample stands for s² of target area),
// otherwise every scale would score identically — the point count doesn't
// change when the cloud is scaled, so the search would never grow a part to
// actually fill the region it belongs in.
function search(P, bounds, want, { scales, angles, cx, cy, span, step, penalty = 1.2, spill = 0 }) {
  const { w, h } = bounds;
  let best = null;
  const n = P.sampled;
  const px = new Float32Array(n), py = new Float32Array(n);
  for (const s of scales) {
    for (const th of angles) {
      const cos = Math.cos(th) * s, sin = Math.sin(th) * s;
      for (let i = 0; i < n; i += 1) {
        const x = P.pts[i * 2], y = P.pts[i * 2 + 1];
        px[i] = x * cos - y * sin;
        py[i] = x * sin + y * cos;
      }
      const area = s * s;
      for (let ty = cy - span; ty <= cy + span; ty += step) {
        for (let tx = cx - span; tx <= cx + span; tx += step) {
          let hit = 0, miss = 0, cover = 0;
          for (let i = 0; i < n; i += 1) {
            const x = (px[i] + tx) | 0, y = (py[i] + ty) | 0;
            if (x < 0 || y < 0 || x >= w || y >= h) { miss += 1; continue; }
            const idx = y * w + x;
            if (bounds.data[idx]) hit += 1; else miss += 1;
            if (want.data[idx]) cover += 1;
          }
          const score = (cover - penalty * miss - spill * (hit - cover)) * area;
          if (!best || score > best.score) best = { score, s, th, tx, ty, hit, miss, cover };
        }
      }
    }
  }
  return best;
}

// Coarse pass, then two tightening passes around the winner.
function locate(P, bounds, want, opts) {
  let b = search(P, bounds, want, opts);
  if (!b) return null;
  for (const [scaleStep, angleStep, span, step] of [[0.02, 4, opts.step * 2, Math.max(1, opts.step / 2)], [0.01, 2, 3, 1]]) {
    const scales = [-2, -1, 0, 1, 2].map((d) => b.s * (1 + d * scaleStep));
    const angles = opts.angles.length > 1
      ? [-2, -1, 0, 1, 2].map((d) => b.th + d * (Math.PI / 180) * angleStep)
      : [0];
    b = search(P, bounds, want, { ...opts, scales, angles, cx: b.tx, cy: b.ty, span, step }) || b;
  }
  return b;
}

// Paint a placed point cloud into a mask (used to build the residual).
function stamp(target, P, place, grow = 1) {
  const { w, h } = target;
  const cos = Math.cos(place.th) * place.s, sin = Math.sin(place.th) * place.s;
  for (let i = 0; i < P.sampled; i += 1) {
    const x0 = P.pts[i * 2], y0 = P.pts[i * 2 + 1];
    const x = Math.round(x0 * cos - y0 * sin + place.tx);
    const y = Math.round(x0 * sin + y0 * cos + place.ty);
    for (let dy = -grow; dy <= grow; dy += 1) {
      for (let dx = -grow; dx <= grow; dx += 1) {
        const px = x + dx, py = y + dy;
        if (px >= 0 && py >= 0 && px < w && py < h) target.data[py * w + px] = 0;
      }
    }
  }
}

const seq = (from, to, step) => {
  const out = [];
  for (let v = from; v <= to + 1e-9; v += step) out.push(v);
  return out;
};
const rad = (d) => (d * Math.PI) / 180;
const round = (v, p = 2) => Math.round(v * 10 ** p) / 10 ** p;
const pt = (p) => ({ x: round(p.x), y: round(p.y) });

// ------------------------------------------------------------------ fit

// Map a point from a part's own image px into canonical px, and back.
const toCanon = (p, place, src, fitScale) => {
  const x = p.x * fitScale - src.cx, y = p.y * fitScale - src.cy;
  const cos = Math.cos(place.th) * place.s, sin = Math.sin(place.th) * place.s;
  return { x: x * cos - y * sin + place.tx, y: x * sin + y * cos + place.ty };
};
const fromCanon = (p, place, src, fitScale) => {
  const x = p.x - place.tx, y = p.y - place.ty;
  const c = Math.cos(-place.th) / place.s, s = Math.sin(-place.th) / place.s;
  return { x: ((x * c - y * s) + src.cx) / fitScale, y: ((x * s + y * c) + src.cy) / fitScale };
};

async function fitCharacter(id) {
  const img = async (p) => decodePng(await readFile(p));
  const canonImg = await img(join(CANON, `${id}.png`));
  const bodyImg = await img(join(RENDER, `${id}_body.png`));
  const weaponImg = await img(join(RENDER, `${id}_weapon.png`));
  let armImg = null;
  try { armImg = await img(join(RENDER, `${id}_arm.png`)); } catch { /* optional */ }

  // Anchors inside each part, at the same resolution js/rig.js uses.
  const bodyComp = components(mask(bodyImg, MAX_DIM, 0.5))[0];
  const weaponComp = components(mask(weaponImg, MAX_DIM, 0.5))[0];
  if (!bodyComp || !weaponComp) return { id, error: "no body or weapon silhouette" };
  const body = { pivot: { x: bodyComp.cx, y: bodyComp.cy }, radius: bodyComp.radius };
  const weapon = {
    grip: { x: weaponComp.x0 + (weaponComp.x1 - weaponComp.x0) * 0.06, y: slabY(weaponComp, 0, 0.2) },
    muzzle: { x: weaponComp.x1 - (weaponComp.x1 - weaponComp.x0) * 0.02, y: slabY(weaponComp, 0.82, 1) }
  };
  const armComps = armImg ? components(mask(armImg, MAX_DIM, 0.5)).sort((a, b) => a.cx - b.cx) : [];

  // Silhouettes at matching resolution.
  const C = mask(canonImg, FIT, 0.4);
  const fitScale = C.w / canonImg.width;
  const B = mask(bodyImg, FIT, 0.4);
  const W = mask(weaponImg, FIT, 0.4);
  const A = armImg ? mask(armImg, FIT, 0.4) : null;
  const Pb = points(B, 2), Pw = points(W, 2), Pa = A ? points(A, 1) : null;
  if (!Pb || !Pw) return { id, error: "empty silhouette" };

  // 1) The body: biggest placement that stays inside the canonical.
  const bodyPlace = locate(Pb, C, C, {
    scales: seq(0.5, 1.1, 0.04), angles: [0],
    cx: C.w / 2, cy: C.h / 2, span: 24, step: 4, penalty: 2.5
  });

  // 2) The weapon: cover what the body doesn't, without leaving the silhouette.
  const residual = { w: C.w, h: C.h, data: Uint8Array.from(C.data) };
  stamp(residual, Pb, bodyPlace, 1);
  const weaponPlace = locate(Pw, C, residual, {
    scales: seq(0.2, 1.0, 0.05), angles: [-20, -10, 0, 10, 20].map(rad),
    cx: C.w / 2, cy: C.h / 2, span: 32, step: 4, penalty: 1.2, spill: 0.35
  });

  // 3) The arms: whatever residual is left after the weapon.
  let armPlace = null;
  if (Pa) {
    const left = { w: C.w, h: C.h, data: Uint8Array.from(residual.data) };
    stamp(left, Pw, weaponPlace, 1);
    armPlace = locate(Pa, C, left, {
      scales: seq(0.15, 0.8, 0.05), angles: [-25, -12, 0, 12, 25].map(rad),
      cx: C.w / 2, cy: C.h / 2, span: 32, step: 4, penalty: 1.2, spill: 0.5
    });
  }

  // ---- convert placements into rig anchors
  const srcB = { cx: Pb.cx, cy: Pb.cy };
  const srcW = { cx: Pw.cx, cy: Pw.cy };
  const srcA = Pa ? { cx: Pa.cx, cy: Pa.cy } : null;

  const gripCanon = toCanon(weapon.grip, weaponPlace, srcW, fitScale);
  const fitted = fromCanon(gripCanon, bodyPlace, srcB, fitScale);
  const weaponScale = weaponPlace.s / bodyPlace.s;

  // The canonical pose is a portrait: plenty of characters hold the weapon
  // across the chest, over a shoulder, or behind the back. In the game the
  // weapon swings from this mount to wherever the player aims, so it has to sit
  // on the forward side of the body. Keep the reach the artwork implies, mirror
  // it to the front, and keep it inside a sane band around the body's middle.
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const R = body.radius;
  // Mirror the reach to the front, keep the height the portrait used (that is
  // what puts the barrel at chin level instead of across the eyes), and stay
  // within a band around the body's middle.
  const dx = clamp(Math.abs(fitted.x - body.pivot.x), R * 0.08, R * 0.6);
  const dy = clamp(fitted.y - body.pivot.y, -R * 0.35, R * 0.5);
  const mount = { x: body.pivot.x + dx, y: body.pivot.y + dy };

  // How much of the weapon's own region it managed to cover — low means the
  // canonical hides the weapon (or the parts don't correspond) and the numbers
  // should be treated as a starting point, not gospel.
  const conf = (p) => round(p ? p.cover / Math.max(1, p.hit + p.miss) : 0, 3);
  const confidence = { body: conf(bodyPlace), weapon: conf(weaponPlace), arm: armPlace ? conf(armPlace) : null };

  // Arms follow the mount rather than the portrait: a shoulder on the body's
  // forward side and a hand on the weapon just past the grip. The arm then
  // bridges the two and swings with the weapon, which is the whole point of
  // splitting it out — matching the portrait would freeze it in a pose that
  // only reads at one aim angle.
  //
  // The arm art is drawn full-frame like everything else, so a "hand" arrives
  // as a ball half the size of the body. Its real size comes from the fit
  // against the canonical, falling back to a fraction of the body radius.
  const weaponLength = Math.hypot(weapon.muzzle.x - weapon.grip.x, weapon.muzzle.y - weapon.grip.y) * weaponScale;
  const armFitScale = armPlace && confidence.arm >= 0.5 ? armPlace.s / bodyPlace.s : null;

  const holdAt = (t) => ({
    x: weapon.grip.x + (weapon.muzzle.x - weapon.grip.x) * t,
    y: weapon.grip.y + (weapon.muzzle.y - weapon.grip.y) * t
  });
  const socketAt = (lift) => ({
    x: body.pivot.x + (mount.x - body.pivot.x) * 0.5,
    y: body.pivot.y + (mount.y - body.pivot.y) * 0.5 + lift * R
  });

  const specs = [];
  armComps.forEach((comp, i) => {
    const ax = axis(comp);
    const nub = ax.elongation < MIN_ELONGATION;
    specs.push({ comp, ax, nub, sprite: i });
  });
  // One bare hand and a weapon long enough for two: give it both, the way the
  // portraits hold them.
  if (specs.length === 1 && specs[0].nub && weaponLength > R * 0.8) {
    specs.push({ ...specs[0] });
  }

  const arms = specs.map((spec, i) => {
    const { comp, ax, nub } = spec;
    const many = specs.length > 1;
    const socket = socketAt(many ? (i === 0 ? -0.08 : 0.1) : 0);
    const hold = holdAt(many ? 0.08 + i * 0.26 : 0.12);
    const reachPx = Math.hypot(
      (hold.x - weapon.grip.x) * weaponScale + mount.x - socket.x,
      (hold.y - weapon.grip.y) * weaponScale + mount.y - socket.y
    );
    const restPx = Math.hypot(ax.hand.x - ax.shoulder.x, ax.hand.y - ax.shoulder.y);
    const scale = nub || restPx < 1
      ? round(clamp(armFitScale ?? (R * 0.15) / Math.max(1, comp.radius), 0.08, 0.6), 3)
      : round(clamp(reachPx / restPx, 0.15, 1.2), 3);
    return {
      sprite: spec.sprite,
      socket: pt(socket),
      hold: pt(hold),
      scale,
      stretch: !nub,
      minStretch: 0.75,
      maxStretch: 1.6,
      z: many && i === 0 ? "back" : "front"
    };
  });

  return {
    id,
    confidence,
    rig: {
      body: { pivot: pt(body.pivot), radius: round(body.radius), mount: pt(mount) },
      weapon: { grip: pt(weapon.grip), muzzle: pt(weapon.muzzle) },
      rig: {
        bodyScale: 1,
        weapon: { scale: round(weaponScale, 4), rotation: 0, offset: { x: 0, y: 0 }, behind: false },
        arms
      }
    }
  };
}

// ----------------------------------------------------------------- main

const files = await readdir(RENDER);
const ids = [...new Set(files.filter((f) => f.endsWith("_body.png")).map((f) => f.replace("_body.png", "")))]
  .filter((id) => !only.length || only.includes(id))
  .sort();

let existing = { version: 1, characters: {} };
try {
  existing = JSON.parse(await readFile(OUT, "utf8"));
  if (!existing.characters) existing.characters = {};
} catch { /* first run */ }

const out = { version: 1, note: "Fitted against the canonical art by tools/fitrig.mjs; tune in /workbench.", characters: { ...existing.characters } };
const report = [];
for (const id of ids) {
  const started = process.hrtime.bigint();
  let res;
  try {
    res = await fitCharacter(id);
  } catch (e) {
    report.push([id, "error", e.message]);
    continue;
  }
  if (res.error) { report.push([id, "error", res.error]); continue; }
  out.characters[id] = res.rig;
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  report.push([
    id,
    `body ${res.confidence.body} weapon ${res.confidence.weapon}${res.confidence.arm != null ? ` arm ${res.confidence.arm}` : ""}`,
    `wscale ${res.rig.rig.weapon.scale} · ${ms.toFixed(0)}ms`
  ]);
  if (!quiet) console.log(`${id.padEnd(10)} ${report.at(-1)[1].padEnd(42)} ${report.at(-1)[2]}`);
}

await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`\nwrote ${OUT.replace(`${ROOT}/`, "")} (${Object.keys(out.characters).length} characters)`);
const weak = report.filter((r) => r[1].includes("error") || /(?:body|weapon) 0\.[0-5]/.test(r[1]));
if (weak.length) {
  console.log(`\n${weak.length} worth checking in /workbench:`);
  for (const r of weak) console.log(`  ! ${r[0]} — ${r[1]}`);
}
