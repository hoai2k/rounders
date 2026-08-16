#!/usr/bin/env node
// Rounders — fit composed rigs against the canonical art.
//
//   node tools/fitrig.mjs [id ...] [--out <file>] [--quiet]
//
// The delivered render parts are each drawn full-frame on their own canvas:
// the body fills 512×512, and so does the weapon, and so do the arms. Nothing
// is in composite position and nothing shares a scale.
//
// Body and weapon don't need the canonical to sort that out — js/rig.js sizes
// them to the same geometry the procedural renderer uses (ball = collision
// circle, grip 0.55r out along the aim, 1.5r of barrel), which is what keeps
// the weapon readable as an aim indicator.
//
// The hands are the exception: how big a character's hands are is a drawing
// decision, and the only place it is recorded is the canonical hero image. So
// this matches the arm art into the canonical silhouette and writes just the
// measured hand size and grip position per character to
// assets/images/characters/render/rigs.json, which the game merges over its
// auto-detection. Everything else stays automatic. Tune in /workbench.
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

// Largest circle that fits inside a silhouette — the body's ball, ignoring
// horns, ears and antennae. Mirrors ball() in js/rig.js.
function ball(comp, m) {
  const { w, h } = m;
  const inside = new Uint8Array(w * h);
  for (const p of comp.pixels) inside[p] = 1;
  const D = new Float32Array(w * h);
  const d1 = 1, d2 = Math.SQRT2, BIG = 1e6;
  for (let i = 0; i < w * h; i += 1) D[i] = inside[i] ? BIG : 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      if (!inside[i]) continue;
      let v = D[i];
      if (x > 0) v = Math.min(v, D[i - 1] + d1);
      if (y > 0) v = Math.min(v, D[i - w] + d1);
      if (x > 0 && y > 0) v = Math.min(v, D[i - w - 1] + d2);
      if (x < w - 1 && y > 0) v = Math.min(v, D[i - w + 1] + d2);
      D[i] = Math.min(v, Math.min(x, y) + d1);
    }
  }
  let best = 0;
  for (let y = h - 1; y >= 0; y -= 1) {
    for (let x = w - 1; x >= 0; x -= 1) {
      const i = y * w + x;
      if (!inside[i]) continue;
      let v = D[i];
      if (x < w - 1) v = Math.min(v, D[i + 1] + d1);
      if (y < h - 1) v = Math.min(v, D[i + w] + d1);
      if (x < w - 1 && y < h - 1) v = Math.min(v, D[i + w + 1] + d2);
      if (x > 0 && y < h - 1) v = Math.min(v, D[i + w - 1] + d2);
      v = Math.min(v, Math.min(w - 1 - x, h - 1 - y) + d1);
      D[i] = v;
      if (v > best) best = v;
    }
  }
  let n = 0, mx = 0, my = 0;
  for (let i = 0; i < w * h; i += 1) {
    if (D[i] < best * 0.96) continue;
    n += 1; mx += i % w; my += (i / w) | 0;
  }
  return {
    center: n ? { x: (mx / n + 0.5) * m.sx, y: (my / n + 0.5) * m.sy } : { x: comp.cx, y: comp.cy },
    radius: best * (m.sx + m.sy) / 2
  };
}

// Grip and muzzle on the weapon's long axis, plus how far off level the barrel
// is drawn. Mirrors barrel() in js/rig.js.
function barrel(comp) {
  const { pixels, w, sx, sy, cx, cy } = comp;
  const ax = axis(comp);
  let ux = ax.hand.x - ax.shoulder.x, uy = ax.hand.y - ax.shoulder.y;
  const ulen = Math.hypot(ux, uy);
  if (ulen < 1e-6) { ux = 1; uy = 0; } else { ux /= ulen; uy /= ulen; }
  const proj = new Float32Array(pixels.length);
  let lo = Infinity, hi = -Infinity, perp = 0;
  for (let i = 0; i < pixels.length; i += 1) {
    const p = pixels[i];
    const dx = ((p % w) + 0.5) * sx - cx, dy = (((p / w) | 0) + 0.5) * sy - cy;
    const a = dx * ux + dy * uy;
    proj[i] = a;
    if (a < lo) lo = a;
    if (a > hi) hi = a;
    perp = Math.max(perp, Math.abs(-dx * uy + dy * ux));
  }
  const span = Math.max(1e-3, hi - lo);
  const end = (from, to) => {
    let n = 0, mx = 0, my = 0;
    for (let i = 0; i < pixels.length; i += 1) {
      const t = (proj[i] - lo) / span;
      if (t < from || t > to) continue;
      const p = pixels[i];
      n += 1; mx += ((p % w) + 0.5) * sx; my += (((p / w) | 0) + 0.5) * sy;
    }
    return n ? { x: mx / n, y: my / n } : { x: cx, y: cy };
  };
  const grip = end(0.02, 0.12), muzzle = end(0.94, 1);
  return {
    grip, muzzle, thickness: perp * 2,
    angle: Math.atan2(muzzle.y - grip.y, muzzle.x - grip.x)
  };
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

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
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
  const bodyAnalysis = mask(bodyImg, MAX_DIM, 0.5);
  const bodyComp = components(bodyAnalysis)[0];
  const weaponComp = components(mask(weaponImg, MAX_DIM, 0.5))[0];
  if (!bodyComp || !weaponComp) return { id, error: "no body or weapon silhouette" };
  const bodyBall = ball(bodyComp, bodyAnalysis);
  const body = { pivot: bodyBall.center, radius: bodyBall.radius };
  const bar = barrel(weaponComp);
  const weapon = { grip: bar.grip, muzzle: bar.muzzle };
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

  // ---- what the canonical says about the hands
  const srcB = { cx: Pb.cx, cy: Pb.cy };
  const srcW = { cx: Pw.cx, cy: Pw.cy };
  const srcA = Pa ? { cx: Pa.cx, cy: Pa.cy } : null;

  const conf = (p) => round(p ? p.cover / Math.max(1, p.hit + p.miss) : 0, 3);
  const confidence = { body: conf(bodyPlace), weapon: conf(weaponPlace), arm: armPlace ? conf(armPlace) : null };

  const R = body.radius;
  const gripToMuzzle = {
    x: weapon.muzzle.x - weapon.grip.x,
    y: weapon.muzzle.y - weapon.grip.y
  };
  const barrelLen = Math.max(1, Math.hypot(gripToMuzzle.x, gripToMuzzle.y));
  const holdAt = (t) => ({
    x: weapon.grip.x + gripToMuzzle.x * t,
    y: weapon.grip.y + gripToMuzzle.y * t
  });

  // Hand size relative to the body, as drawn in the canonical. The arm part is
  // drawn full-frame, so its own radius says nothing; the fit against the
  // canonical is what pins the real proportion down.
  const armFit = armPlace && confidence.arm >= 0.45 ? armPlace.s / bodyPlace.s : null;

  const specs = armComps.map((comp, i) => {
    const ax = axis(comp);
    return { comp, ax, nub: ax.elongation < MIN_ELONGATION, sprite: i };
  });
  if (specs.length === 1 && specs[0].nub) specs.push({ ...specs[0] });

  const arms = specs.map((spec, i) => {
    const { comp, ax, nub } = spec;
    // Where the canonical puts this hand along the barrel, if it could be
    // found there; otherwise the grip and the fore-grip.
    let t = specs.length > 1 ? 0.06 + i * 0.24 : 0.1;
    if (armPlace && confidence.arm >= 0.45 && i < armComps.length) {
      const hand = nub ? { x: comp.cx, y: comp.cy } : ax.hand;
      const inWeapon = fromCanon(toCanon(hand, armPlace, srcA, fitScale), weaponPlace, srcW, fitScale);
      const along = ((inWeapon.x - weapon.grip.x) * gripToMuzzle.x
        + (inWeapon.y - weapon.grip.y) * gripToMuzzle.y) / (barrelLen * barrelLen);
      if (along > -0.1 && along < 0.7) t = clamp(along, 0.02, 0.55);
    }
    const scale = nub
      ? round(clamp(armFit ?? (0.16 * R) / Math.max(1, comp.radius), 0.06, 0.5), 3)
      : round(clamp(armFit ?? 1, 0.15, 1.2), 3);
    return { sprite: spec.sprite, hold: pt(holdAt(t)), scale };
  });

  return { id, confidence, rig: arms.length ? { rig: { arms } } : {} };
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

const out = {
  version: 1,
  note: "Hand size and grip position measured against the canonical art by tools/fitrig.mjs. Everything else is auto-detected by js/rig.js. Tune in /workbench.",
  characters: { ...existing.characters }
};
const report = [];
for (const id of ids) {
  const started = process.hrtime.bigint();
  let res;
  try {
    res = await fitCharacter(id);
  } catch (e) {
    report.push([id, "error", `${e.message}\n${e.stack.split("\n")[1] || ""}`]);
    continue;
  }
  if (res.error) { report.push([id, "error", res.error]); continue; }
  if (Object.keys(res.rig).length) out.characters[id] = res.rig;
  else delete out.characters[id];
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  const hands = res.rig.rig ? res.rig.rig.arms : [];
  report.push([
    id,
    `arm fit ${res.confidence.arm ?? "—"}`,
    `${hands.length} hand(s) · size ${hands.map((h) => h.scale).join("/") || "—"} · ${ms.toFixed(0)}ms`
  ]);
  if (!quiet) console.log(`${id.padEnd(10)} ${report.at(-1)[1].padEnd(42)} ${report.at(-1)[2]}`);
}

await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`\nwrote ${OUT.replace(`${ROOT}/`, "")} (${Object.keys(out.characters).length} characters)`);
const weak = report.filter((r) => r[1].includes("error") || /arm (?:—|0\.[0-3])/.test(r[1]));
if (weak.length) {
  console.log(`\n${weak.length} worth checking in /workbench:`);
  for (const r of weak) console.log(`  ! ${r[0]} — ${r[1]} ${r[2] || ""}`);
}
