// Rounders — composed character rigs.
//
// A character can ship three extra images in
// assets/images/characters/render/:
//
//   <id>_body.png    the body, facing right, no weapon
//   <id>_weapon.png  the weapon alone, aimed right
//   <id>_arm.png     one or two small blobs used as the hands on the weapon
//
// When those exist the character is drawn as a composition: the body mirrors
// with facing, and the weapon rotates to the aim direction with the hands
// riding along on it. Anchors (body pivot/radius/mount, weapon grip/muzzle,
// hand pivots) are detected automatically from the alpha channel and can be
// overridden by a rig file authored in /workbench.
//
// Everything degrades: no rig images -> the single canonical character PNG,
// no PNG at all -> the procedural drawing in characters.js.
(() => {
  "use strict";
  window.ROUNDERS = window.ROUNDERS || {};

  const BASE = window.ROUNDERS_ASSET_BASE || "";
  const DIR = `${BASE}assets/images/characters/render/`;
  const PARTS = ["body", "weapon", "arm"];

  // ---------------------------------------------------------------- assets

  // id -> { body, weapon, arm, state: "loading"|"ready"|"none", auto, rig }
  const entries = new Map();
  let rigFile = { version: 1, characters: {} };

  function entry(id) {
    let e = entries.get(id);
    if (e) return e;
    e = { id, body: null, weapon: null, arm: null, pending: 0, state: "loading", auto: null, analyzed: false };
    entries.set(id, e);
    for (const part of PARTS) {
      e.pending += 1;
      const img = new Image();
      img.onload = () => {
        e[part] = img;
        settle(e);
      };
      img.onerror = () => settle(e);
      img.src = `${DIR}${id}_${part}.png`;
    }
    return e;
  }

  function settle(e) {
    e.pending -= 1;
    if (e.pending > 0) return;
    // A rig needs at least a body and a weapon; the arm is optional.
    e.state = e.body && e.weapon ? "ready" : "none";
    e.analyzed = false;
  }

  // Kick off loading for every known character (called once characters exist).
  function preload(ids) {
    for (const id of ids) entry(id);
  }

  function assets(id) { return entry(id); }
  function hasRig(id) {
    const e = entry(id);
    return e.state === "ready";
  }

  // ------------------------------------------------------------- analysis

  const ALPHA = 24;       // alpha above this counts as ink
  const MAX_DIM = 320;    // analysis resolution cap
  const MIN_AREA = 0.0006; // component smaller than this fraction of the frame is noise

  function alphaMask(img) {
    const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const c = cv.getContext("2d", { willReadFrequently: true });
    c.drawImage(img, 0, 0, w, h);
    let px;
    try {
      px = c.getImageData(0, 0, w, h).data;
    } catch {
      return null; // tainted canvas (file:// in some browsers)
    }
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i += 1) mask[i] = px[i * 4 + 3] > ALPHA ? 1 : 0;
    return { w, h, mask, sx: img.width / w, sy: img.height / h };
  }

  // Connected components (4-way), returned in image pixel space, largest first.
  function components(m) {
    if (!m) return [];
    const { w, h, mask, sx, sy } = m;
    const label = new Int32Array(w * h).fill(-1);
    const stack = [];
    const out = [];
    for (let i = 0; i < w * h; i += 1) {
      if (!mask[i] || label[i] >= 0) continue;
      const id = out.length;
      let area = 0, sumX = 0, sumY = 0;
      let x0 = w, y0 = h, x1 = 0, y1 = 0;
      const pixels = [];
      stack.push(i);
      label[i] = id;
      while (stack.length) {
        const p = stack.pop();
        const x = p % w, y = (p / w) | 0;
        area += 1; sumX += x; sumY += y;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
        pixels.push(p);
        if (x > 0 && mask[p - 1] && label[p - 1] < 0) { label[p - 1] = id; stack.push(p - 1); }
        if (x < w - 1 && mask[p + 1] && label[p + 1] < 0) { label[p + 1] = id; stack.push(p + 1); }
        if (y > 0 && mask[p - w] && label[p - w] < 0) { label[p - w] = id; stack.push(p - w); }
        if (y < h - 1 && mask[p + w] && label[p + w] < 0) { label[p + w] = id; stack.push(p + w); }
      }
      out.push({
        area, pixels, w, sx, sy,
        px: { x0, y0, x1, y1 },
        cx: (sumX / area + 0.5) * sx,
        cy: (sumY / area + 0.5) * sy,
        x0: x0 * sx, y0: y0 * sy,
        x1: (x1 + 1) * sx, y1: (y1 + 1) * sy,
        radius: Math.sqrt((area * sx * sy) / Math.PI)
      });
    }
    const min = w * h * MIN_AREA;
    return out.filter((c) => c.area >= min).sort((a, b) => b.area - a.area);
  }

  // Mean y of the component's pixels inside a horizontal slab, in image px.
  function slabY(comp, from, to) {
    const { px, w, sx, sy } = comp;
    const spanX = px.x1 - px.x0 + 1;
    const lo = px.x0 + spanX * from;
    const hi = px.x0 + spanX * to;
    let sum = 0, n = 0;
    for (const p of comp.pixels) {
      const x = p % w;
      if (x < lo || x > hi) continue;
      sum += (p / w) | 0; n += 1;
    }
    return n ? ((sum / n) + 0.5) * sy : comp.cy;
  }

  // Crop a component out of the source image into its own canvas sprite.
  function cropSprite(img, comp) {
    const pad = 2;
    const x = Math.max(0, Math.floor(comp.x0 - pad));
    const y = Math.max(0, Math.floor(comp.y0 - pad));
    const w = Math.min(img.width - x, Math.ceil(comp.x1 - comp.x0 + pad * 2));
    const h = Math.min(img.height - y, Math.ceil(comp.y1 - comp.y0 + pad * 2));
    const cv = document.createElement("canvas");
    cv.width = Math.max(1, w); cv.height = Math.max(1, h);
    cv.getContext("2d").drawImage(img, x, y, cv.width, cv.height, 0, 0, cv.width, cv.height);
    return { canvas: cv, frame: { x, y, w: cv.width, h: cv.height }, cx: comp.cx, cy: comp.cy, radius: comp.radius };
  }

  // Detect anchors for one character. Pure function of the loaded images.
  function analyze(e) {
    if (e.analyzed) return e.auto;
    e.analyzed = true;
    if (e.state !== "ready") { e.auto = null; return null; }

    const bodyComps = components(alphaMask(e.body));
    const weaponComps = components(alphaMask(e.weapon));
    const b = bodyComps[0];
    const wc = weaponComps[0];
    if (!b || !wc) { e.auto = null; return null; }

    const sameFrame = e.body.width === e.weapon.width && e.body.height === e.weapon.height;

    const body = {
      pivot: { x: b.cx, y: b.cy },
      radius: b.radius,
      mount: null // filled below
    };
    const weapon = {
      grip: { x: wc.x0 + (wc.x1 - wc.x0) * 0.06, y: slabY(wc, 0, 0.2) },
      muzzle: { x: wc.x1 - (wc.x1 - wc.x0) * 0.02, y: slabY(wc, 0.82, 1) }
    };

    // If the weapon was exported on the same canvas as the body, the grip is
    // already in the right place relative to the body — use it directly.
    body.mount = sameFrame
      ? { x: weapon.grip.x, y: weapon.grip.y }
      : { x: body.pivot.x + body.radius * 0.5, y: body.pivot.y + body.radius * 0.2 };

    // Hands: every blob in the arm image becomes a hand sprite, positioned in
    // weapon space (same-frame exports place themselves; otherwise they get
    // spread along the barrel).
    const hands = [];
    const sprites = [];
    if (e.arm) {
      const armComps = components(alphaMask(e.arm)).sort((p, q) => p.cx - q.cx);
      const armSame = e.arm.width === e.weapon.width && e.arm.height === e.weapon.height;
      const dx = weapon.muzzle.x - weapon.grip.x;
      const dy = weapon.muzzle.y - weapon.grip.y;
      armComps.forEach((comp, i) => {
        sprites.push(cropSprite(e.arm, comp));
        const along = armComps.length > 1 ? 0.12 + i * 0.3 : 0.18;
        hands.push({
          sprite: i,
          x: armSame ? comp.cx : weapon.grip.x + dx * along,
          y: armSame ? comp.cy : weapon.grip.y + dy * along,
          scale: 1,
          behind: false
        });
      });
    }

    e.auto = {
      body, weapon,
      arm: { sprites, pivots: sprites.map((s) => ({ x: s.cx, y: s.cy, radius: s.radius })) },
      rig: {
        bodyScale: 1,
        weapon: { scale: 1, rotation: 0, offset: { x: 0, y: 0 }, behind: false },
        hands
      },
      meta: { sameFrame, bodySize: [e.body.width, e.body.height], weaponSize: [e.weapon.width, e.weapon.height] }
    };
    return e.auto;
  }

  // ---------------------------------------------------------- rig overrides

  function num(a, b) { return typeof a === "number" && isFinite(a) ? a : b; }
  function pt(a, b) { return a ? { x: num(a.x, b.x), y: num(a.y, b.y) } : { ...b }; }

  // Merge the saved (possibly sparse) override on top of detected anchors.
  function resolve(id) {
    const e = entry(id);
    const auto = analyze(e);
    if (!auto) return null;
    const saved = rigFile.characters ? rigFile.characters[id] : null;
    if (!saved) return auto;

    const sb = saved.body || {}, sw = saved.weapon || {}, sr = saved.rig || {};
    const srw = sr.weapon || {};
    const out = {
      body: {
        pivot: pt(sb.pivot, auto.body.pivot),
        radius: num(sb.radius, auto.body.radius),
        mount: pt(sb.mount, auto.body.mount)
      },
      weapon: {
        grip: pt(sw.grip, auto.weapon.grip),
        muzzle: pt(sw.muzzle, auto.weapon.muzzle)
      },
      arm: {
        sprites: auto.arm.sprites,
        pivots: auto.arm.pivots.map((p, i) => {
          const s = saved.arm && saved.arm.pivots && saved.arm.pivots[i];
          return s ? { x: num(s.x, p.x), y: num(s.y, p.y), radius: num(s.radius, p.radius) } : p;
        })
      },
      rig: {
        bodyScale: num(sr.bodyScale, auto.rig.bodyScale),
        weapon: {
          scale: num(srw.scale, auto.rig.weapon.scale),
          rotation: num(srw.rotation, auto.rig.weapon.rotation),
          offset: pt(srw.offset, auto.rig.weapon.offset),
          behind: srw.behind ?? auto.rig.weapon.behind
        },
        hands: Array.isArray(sr.hands) && sr.hands.length
          ? sr.hands.map((h, i) => {
            const d = auto.rig.hands[i] || auto.rig.hands[0] || { sprite: 0, x: 0, y: 0, scale: 1, behind: false };
            return {
              sprite: num(h.sprite, d.sprite),
              x: num(h.x, d.x), y: num(h.y, d.y),
              scale: num(h.scale, d.scale),
              behind: h.behind ?? d.behind
            };
          })
          : auto.rig.hands
      },
      meta: auto.meta
    };
    return out;
  }

  const resolved = new Map();
  function getResolved(id) {
    const e = entry(id);
    if (e.state === "loading") return null;
    let r = resolved.get(id);
    if (r === undefined || r === null || r.stamp !== rigStamp) {
      const base = resolve(id);
      r = base ? { ...base, stamp: rigStamp } : null;
      resolved.set(id, r);
    }
    return r;
  }

  let rigStamp = 0;
  function invalidate() { rigStamp += 1; }

  function setRigs(data) {
    rigFile = data && typeof data === "object" ? data : { version: 1, characters: {} };
    if (!rigFile.characters) rigFile.characters = {};
    invalidate();
  }
  function setCharacterRig(id, data) {
    rigFile.characters[id] = data;
    invalidate();
  }
  function getRigFile() { return rigFile; }

  // Rigs authored in /workbench land either as a JSON file (fetched) or as a
  // plain script that sets window.ROUNDERS_RIGS (works from file:// too).
  function loadRigs(url = `${DIR}rigs.json`) {
    if (window.ROUNDERS_RIGS) setRigs(window.ROUNDERS_RIGS);
    return fetch(url, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setRigs(d); return d; })
      .catch(() => null);
  }

  // ------------------------------------------------------------- rendering

  // Transform used by both the renderer and the workbench overlay.
  // Returns null when the character has no usable rig.
  function transform(id, r, aimX = 1, aimY = 0, wob = 0) {
    const R = getResolved(id);
    if (!R) return null;
    const facing = aimX < 0 ? -1 : 1;
    const k = (r / Math.max(1e-3, R.body.radius)) * R.rig.bodyScale;
    // In the mirrored frame the aim vector flips back on x.
    const angle = Math.atan2(aimY, aimX * facing) + (R.rig.weapon.rotation * Math.PI) / 180;
    const mount = {
      x: (R.body.mount.x - R.body.pivot.x) * k + R.rig.weapon.offset.x * r,
      y: (R.body.mount.y - R.body.pivot.y) * k + R.rig.weapon.offset.y * r + wob
    };
    return {
      R, facing, k, kw: k * R.rig.weapon.scale, angle, mount, wob,
      bodyImg: entry(id).body, weaponImg: entry(id).weapon
    };
  }

  function drawWeaponGroup(ctx, T) {
    const { R, kw, angle, mount } = T;
    ctx.save();
    ctx.translate(mount.x, mount.y);
    ctx.rotate(angle);
    const hands = R.rig.hands;
    const back = hands.filter((h) => h.behind);
    const front = hands.filter((h) => !h.behind);
    for (const h of back) drawHand(ctx, T, h);
    ctx.drawImage(
      T.weaponImg,
      -R.weapon.grip.x * kw, -R.weapon.grip.y * kw,
      T.weaponImg.width * kw, T.weaponImg.height * kw
    );
    for (const h of front) drawHand(ctx, T, h);
    ctx.restore();
  }

  function drawHand(ctx, T, h) {
    const { R, k, kw } = T;
    const sprite = R.arm.sprites[h.sprite];
    if (!sprite) return;
    const pivot = R.arm.pivots[h.sprite] || { x: sprite.cx, y: sprite.cy };
    const s = k * h.scale;
    ctx.save();
    // Hand coordinates are weapon-image pixels; the weapon frame's origin is
    // the grip, so they are placed relative to it.
    ctx.translate((h.x - R.weapon.grip.x) * kw, (h.y - R.weapon.grip.y) * kw);
    // The sprite's own pivot lands on the hand point.
    ctx.drawImage(
      sprite.canvas,
      (sprite.frame.x - pivot.x) * s, (sprite.frame.y - pivot.y) * s,
      sprite.frame.w * s, sprite.frame.h * s
    );
    ctx.restore();
  }

  // Draws the rigged character centered at (0,0). Returns false if unavailable.
  function draw(ctx, ch, r, opts = {}) {
    const id = typeof ch === "string" ? ch : ch.id;
    const e = entry(id);
    if (e.state !== "ready") return false;
    const T = transform(id, r, opts.aimX ?? 1, opts.aimY ?? 0, opts.wob || 0);
    if (!T) return false;

    ctx.save();
    ctx.scale(T.facing, 1);
    if (T.R.rig.weapon.behind) drawWeaponGroup(ctx, T);
    ctx.drawImage(
      e.body,
      -T.R.body.pivot.x * T.k, -T.R.body.pivot.y * T.k + T.wob,
      e.body.width * T.k, e.body.height * T.k
    );
    if (!T.R.rig.weapon.behind) drawWeaponGroup(ctx, T);
    ctx.restore();
    return true;
  }

  // World-space muzzle position for a character drawn at (0,0), useful for
  // spawning shots and muzzle flashes exactly at the barrel.
  function muzzle(ch, r, aimX = 1, aimY = 0, wob = 0) {
    const id = typeof ch === "string" ? ch : ch.id;
    const T = transform(id, r, aimX, aimY, wob);
    if (!T) return null;
    const { R, kw, angle, mount, facing } = T;
    const mx = (R.weapon.muzzle.x - R.weapon.grip.x) * kw;
    const my = (R.weapon.muzzle.y - R.weapon.grip.y) * kw;
    const x = mount.x + mx * Math.cos(angle) - my * Math.sin(angle);
    const y = mount.y + mx * Math.sin(angle) + my * Math.cos(angle);
    return { x: x * facing, y };
  }

  window.ROUNDERS.rig = {
    dir: DIR,
    preload, assets, hasRig,
    analyze: (id) => analyze(entry(id)),
    resolved: getResolved,
    transform, draw, muzzle,
    setRigs, setCharacterRig, getRigFile, loadRigs, invalidate
  };
})();
