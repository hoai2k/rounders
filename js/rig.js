// Rounders — composed character rigs.
//
// A character can ship three extra images in
// assets/images/characters/render/:
//
//   <id>_body.png    the body, facing right, no weapon
//   <id>_weapon.png  the weapon alone, aimed right
//   <id>_arm.png     one or two arms/hands, facing right (shoulder end left,
//                    hand end right) — a round nub hand works too
//
// When those exist the character is drawn as a composition: the body mirrors
// with facing, and the weapon rotates to the aim direction. Each arm bridges
// the two: its shoulder end stays pinned to a socket on the *body* and its
// hand end rides a hold point on the *weapon*, so the arm swings (and stretches
// a little, within limits) as the weapon tracks the aim. A stubby blob with no
// direction to it degrades to the old behaviour — a hand rigidly parented to
// the weapon.
//
// Anchors (body pivot/radius/mount/sockets, weapon grip/muzzle, arm
// shoulder/hand) are detected automatically from the alpha channel and can be
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
        // Parts that arrived without going through intake may still carry a
        // solid backdrop; key it before anything measures the alpha channel.
        const chroma = window.ROUNDERS.chroma;
        e[part] = (chroma && chroma.keyImage(img)) || img;
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
  const MIN_ELONGATION = 1.45; // below this an arm blob is treated as a bare hand

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

  // Principal axis of a component, oriented rightwards (art faces right, so the
  // shoulder is the trailing end and the hand the leading one). Returns the two
  // end points in image px plus how elongated the blob is.
  function axis(comp) {
    const { pixels, w, sx, sy, cx, cy } = comp;
    let xx = 0, yy = 0, xy = 0;
    for (const p of pixels) {
      const dx = ((p % w) + 0.5) * sx - cx;
      const dy = (((p / w) | 0) + 0.5) * sy - cy;
      xx += dx * dx; yy += dy * dy; xy += dx * dy;
    }
    const n = pixels.length;
    xx /= n; yy /= n; xy /= n;
    // Major eigenvector of the 2x2 covariance matrix.
    const t = (xx + yy) / 2;
    const d = Math.sqrt(Math.max(0, ((xx - yy) / 2) ** 2 + xy * xy));
    const l1 = t + d, l2 = Math.max(1e-6, t - d);
    let ux = xy, uy = l1 - xx;
    if (Math.hypot(ux, uy) < 1e-6) { ux = 1; uy = 0; }
    const len = Math.hypot(ux, uy);
    ux /= len; uy /= len;
    if (ux < 0) { ux = -ux; uy = -uy; } // point along +x: shoulder → hand

    let lo = Infinity, hi = -Infinity, perp = 0;
    for (const p of pixels) {
      const dx = ((p % w) + 0.5) * sx - cx;
      const dy = (((p / w) | 0) + 0.5) * sy - cy;
      const a = dx * ux + dy * uy;
      if (a < lo) lo = a;
      if (a > hi) hi = a;
      perp = Math.max(perp, Math.abs(-dx * uy + dy * ux));
    }
    // Pull the ends in by half the blob's width so the anchors sit inside the
    // ink rather than on the silhouette's tip.
    const inset = Math.min(perp, (hi - lo) * 0.25);
    const at = (a) => ({ x: cx + ux * a, y: cy + uy * a });
    return {
      shoulder: at(lo + inset),
      hand: at(hi - inset),
      elongation: Math.sqrt(l1 / l2)
    };
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

    // Arms: every blob in the arm image becomes one arm sprite with a shoulder
    // end and a hand end. Same-frame exports place themselves (the shoulder is
    // already touching the body and the hand already on the weapon); otherwise
    // sockets sit on the body's mount side and holds spread along the barrel.
    const arms = [];
    const sprites = [];
    const anchors = [];
    if (e.arm) {
      const armComps = components(alphaMask(e.arm)).sort((p, q) => p.cx - q.cx);
      const armSame = e.arm.width === e.weapon.width && e.arm.height === e.weapon.height;
      const dx = weapon.muzzle.x - weapon.grip.x;
      const dy = weapon.muzzle.y - weapon.grip.y;
      armComps.forEach((comp, i) => {
        const sprite = cropSprite(e.arm, comp);
        const ax = axis(comp);
        // A round nub has no direction worth trusting: collapse it to a hand.
        const nub = ax.elongation < MIN_ELONGATION;
        sprites.push(sprite);
        anchors.push({
          shoulder: nub ? { x: comp.cx, y: comp.cy } : ax.shoulder,
          hand: nub ? { x: comp.cx, y: comp.cy } : ax.hand,
          radius: comp.radius
        });
        const along = armComps.length > 1 ? 0.12 + i * 0.3 : 0.18;
        const hold = armSame
          ? { x: nub ? comp.cx : ax.hand.x, y: nub ? comp.cy : ax.hand.y }
          : { x: weapon.grip.x + dx * along, y: weapon.grip.y + dy * along };
        const socket = armSame && !nub
          ? { x: ax.shoulder.x, y: ax.shoulder.y }
          : {
            x: body.pivot.x + (body.mount.x - body.pivot.x) * 0.55,
            y: body.pivot.y + (body.mount.y - body.pivot.y) * 0.55
          };
        arms.push({
          sprite: i,
          socket, hold,
          scale: 1,
          stretch: !nub,
          minStretch: 0.8,
          maxStretch: 1.5,
          // With two arms the left-hand blob is the far one: it reads better
          // tucked behind the body and the weapon.
          z: armComps.length > 1 && i === 0 ? "back" : "front"
        });
      });
    }

    e.auto = {
      body, weapon,
      arm: { sprites, anchors },
      rig: {
        bodyScale: 1,
        weapon: { scale: 1, rotation: 0, offset: { x: 0, y: 0 }, behind: false },
        arms
      },
      meta: { sameFrame, bodySize: [e.body.width, e.body.height], weaponSize: [e.weapon.width, e.weapon.height] }
    };
    return e.auto;
  }

  // ---------------------------------------------------------- rig overrides

  function num(a, b) { return typeof a === "number" && isFinite(a) ? a : b; }
  function pt(a, b) { return a ? { x: num(a.x, b.x), y: num(a.y, b.y) } : { ...b }; }

  const DEFAULT_ARM = {
    sprite: 0, socket: { x: 0, y: 0 }, hold: { x: 0, y: 0 },
    scale: 1, stretch: false, minStretch: 0.8, maxStretch: 1.5, z: "front"
  };
  const Z = ["back", "mid", "front"];

  // Saved arms merge slot-by-slot over the detected ones. Rig files written
  // before arms existed carry `hands` (a sprite parented straight to the
  // weapon) — those still load, as rigid arms holding at the same point.
  function mergeArms(auto, sr) {
    const saved = Array.isArray(sr.arms) && sr.arms.length
      ? sr.arms
      : Array.isArray(sr.hands) && sr.hands.length
        ? sr.hands.map((h) => ({
          sprite: h.sprite, hold: { x: h.x, y: h.y }, scale: h.scale,
          stretch: false, z: h.behind ? "mid" : "front"
        }))
        : null;
    if (!saved) return auto.rig.arms;
    return saved.map((a, i) => {
      const d = auto.rig.arms[i] || auto.rig.arms[0] || DEFAULT_ARM;
      return {
        sprite: num(a.sprite, d.sprite),
        socket: pt(a.socket, d.socket),
        hold: pt(a.hold, d.hold),
        scale: num(a.scale, d.scale),
        stretch: a.stretch ?? d.stretch,
        minStretch: num(a.minStretch, d.minStretch),
        maxStretch: num(a.maxStretch, d.maxStretch),
        z: Z.includes(a.z) ? a.z : d.z
      };
    });
  }

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
        anchors: auto.arm.anchors.map((a, i) => {
          const s = saved.arm && saved.arm.anchors && saved.arm.anchors[i];
          return s
            ? { shoulder: pt(s.shoulder, a.shoulder), hand: pt(s.hand, a.hand), radius: num(s.radius, a.radius) }
            : a;
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
        arms: mergeArms(auto, sr)
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

  function drawWeapon(ctx, T) {
    const { R, kw, angle, mount } = T;
    ctx.save();
    ctx.translate(mount.x, mount.y);
    ctx.rotate(angle);
    ctx.drawImage(
      T.weaponImg,
      -R.weapon.grip.x * kw, -R.weapon.grip.y * kw,
      T.weaponImg.width * kw, T.weaponImg.height * kw
    );
    ctx.restore();
  }

  // Where a hold point (weapon-image px) ends up in the mirrored rig frame.
  function holdPoint(T, p) {
    const { R, kw, angle, mount } = T;
    const x = (p.x - R.weapon.grip.x) * kw;
    const y = (p.y - R.weapon.grip.y) * kw;
    return {
      x: mount.x + x * Math.cos(angle) - y * Math.sin(angle),
      y: mount.y + x * Math.sin(angle) + y * Math.cos(angle)
    };
  }

  // Solve one arm: shoulder pinned to the body socket, hand riding the weapon.
  // Everything is in the mirrored rig frame, so it works for either facing.
  // Returns null when the arm has no sprite to draw.
  function armPose(T, a) {
    const { R, k, wob } = T;
    const sprite = R.arm.sprites[a.sprite];
    if (!sprite) return null;
    const anchor = R.arm.anchors[a.sprite] || { shoulder: { x: sprite.cx, y: sprite.cy }, hand: { x: sprite.cx, y: sprite.cy } };
    const s = k * a.scale;
    // The socket rides the body, so it takes the body's bob with it.
    const socket = {
      x: (a.socket.x - R.body.pivot.x) * k,
      y: (a.socket.y - R.body.pivot.y) * k + wob
    };
    const hold = holdPoint(T, a.hold);
    const rest = Math.hypot(anchor.hand.x - anchor.shoulder.x, anchor.hand.y - anchor.shoulder.y) * s;

    // A hand (or an arm explicitly pinned) is simply parented to the weapon.
    if (!a.stretch || rest < 1e-3) {
      return { sprite, anchor, s, socket, hold, pivot: "hand", angle: T.angle, stretch: 1 };
    }
    const dist = Math.hypot(hold.x - socket.x, hold.y - socket.y);
    const stretch = Math.min(a.maxStretch, Math.max(a.minStretch, dist / rest));
    return {
      sprite, anchor, s, socket, hold, pivot: "shoulder",
      angle: Math.atan2(hold.y - socket.y, hold.x - socket.x),
      // The sprite's own shoulder→hand direction, so art drawn at any angle
      // still lines up along the socket→hold line.
      rest: Math.atan2(anchor.hand.y - anchor.shoulder.y, anchor.hand.x - anchor.shoulder.x),
      stretch
    };
  }

  function drawArm(ctx, T, a) {
    const P = armPose(T, a);
    if (!P) return;
    const { sprite, anchor, s } = P;
    ctx.save();
    if (P.pivot === "hand") {
      // Rigid: the sprite's hand anchor lands on the hold point and the whole
      // thing turns with the weapon.
      ctx.translate(P.hold.x, P.hold.y);
      ctx.rotate(P.angle);
      ctx.translate(-anchor.hand.x * s, -anchor.hand.y * s);
    } else {
      // Bridged: pivot at the shoulder, swing to face the hold point, then
      // stretch along that line so the hand reaches it.
      ctx.translate(P.socket.x, P.socket.y);
      ctx.rotate(P.angle);
      ctx.scale(P.stretch, 1);
      ctx.rotate(-P.rest);
      ctx.translate(-anchor.shoulder.x * s, -anchor.shoulder.y * s);
    }
    ctx.drawImage(
      sprite.canvas,
      sprite.frame.x * s, sprite.frame.y * s,
      sprite.frame.w * s, sprite.frame.h * s
    );
    ctx.restore();
  }

  function drawArms(ctx, T, z) {
    for (const a of T.R.rig.arms) if (a.z === z) drawArm(ctx, T, a);
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
    drawArms(ctx, T, "back");
    if (T.R.rig.weapon.behind) drawWeapon(ctx, T);
    ctx.drawImage(
      e.body,
      -T.R.body.pivot.x * T.k, -T.R.body.pivot.y * T.k + T.wob,
      e.body.width * T.k, e.body.height * T.k
    );
    drawArms(ctx, T, "mid");
    if (!T.R.rig.weapon.behind) drawWeapon(ctx, T);
    drawArms(ctx, T, "front");
    ctx.restore();
    return true;
  }

  // World-space muzzle position for a character drawn at (0,0), useful for
  // spawning shots and muzzle flashes exactly at the barrel.
  function muzzle(ch, r, aimX = 1, aimY = 0, wob = 0) {
    const id = typeof ch === "string" ? ch : ch.id;
    const T = transform(id, r, aimX, aimY, wob);
    if (!T) return null;
    const p = holdPoint(T, T.R.weapon.muzzle);
    return { x: p.x * T.facing, y: p.y };
  }

  window.ROUNDERS.rig = {
    dir: DIR,
    preload, assets, hasRig,
    analyze: (id) => analyze(entry(id)),
    resolved: getResolved,
    transform, draw, muzzle, armPose, holdPoint,
    setRigs, setCharacterRig, getRigFile, loadRigs, invalidate
  };
})();
