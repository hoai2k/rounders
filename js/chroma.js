// Rounders — background keying for incoming art.
//
// Generated character art arrives in two shapes: transparent PNGs, and flat
// images rendered on a solid backdrop (magenta, green, white…). This module
// turns the second kind into the first: it detects the backdrop color from the
// border, cuts it out with a soft edge, and removes the color that bleeds into
// the outline (despill).
//
// Two rules keep it safe on stylized art:
//   * only backdrop-colored pixels *connected to the border* are cut, so a
//     magenta accent inside the character survives a magenta screen;
//   * an image that already has real transparency is left completely alone.
//
// Works on a plain RGBA byte array, so the same code runs in the browser
// (workbench intake) and in Node (tools/intake.mjs).
(() => {
  "use strict";
  const root = typeof window !== "undefined" ? window : globalThis;

  const DEFAULTS = {
    tolerance: 0.16,   // 0..1 — how far from the key color still counts as backdrop
    softness: 0.10,    // 0..1 — width of the partial-alpha ramp past the tolerance
    despill: 1,        // 0..1 — how much key-colored fringe to neutralize
    shrink: 0.06,      // 0..1 — bias partial edge pixels toward transparent
    connected: true,   // only cut backdrop connected to the image border
    keepAlpha: true    // an image that already has alpha is passed through untouched
  };

  // --- color helpers ------------------------------------------------------

  const dist = (r1, g1, b1, r2, g2, b2) =>
    Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2) / 441.6729559;

  function toYCbCr(r, g, b) {
    return {
      y: 0.299 * r + 0.587 * g + 0.114 * b,
      cb: -0.168736 * r - 0.331264 * g + 0.5 * b,
      cr: 0.5 * r - 0.418688 * g - 0.081312 * b
    };
  }
  function fromYCbCr(y, cb, cr) {
    return [
      clamp255(y + 1.402 * cr),
      clamp255(y - 0.344136 * cb - 0.714136 * cr),
      clamp255(y + 1.772 * cb)
    ];
  }
  const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

  // --- inspection ---------------------------------------------------------

  // How much real transparency does this image already carry?
  function alphaInfo(rgba) {
    let clear = 0, partial = 0;
    for (let i = 3; i < rgba.length; i += 4) {
      if (rgba[i] < 8) clear += 1;
      else if (rgba[i] < 248) partial += 1;
    }
    const n = rgba.length / 4;
    return {
      clearFraction: clear / n,
      partialFraction: partial / n,
      // A handful of stray soft pixels is not a cutout; 2% clear is.
      hasAlpha: clear / n > 0.02
    };
  }

  // Guess the backdrop color from the border ring of the image.
  function detectKey(rgba, w, h) {
    const band = Math.max(1, Math.round(Math.min(w, h) * 0.02));
    const buckets = new Map();
    const add = (x, y) => {
      const i = (y * w + x) * 4;
      if (rgba[i + 3] < 128) return;
      const k = `${rgba[i] >> 4},${rgba[i + 1] >> 4},${rgba[i + 2] >> 4}`;
      let b = buckets.get(k);
      if (!b) buckets.set(k, (b = { n: 0, r: 0, g: 0, b: 0 }));
      b.n += 1; b.r += rgba[i]; b.g += rgba[i + 1]; b.b += rgba[i + 2];
    };
    for (let y = 0; y < h; y += 1) {
      const edgeRow = y < band || y >= h - band;
      for (let x = 0; x < w; x += 1) {
        if (edgeRow || x < band || x >= w - band) add(x, y);
      }
    }
    let best = null, total = 0;
    for (const b of buckets.values()) {
      total += b.n;
      if (!best || b.n > best.n) best = b;
    }
    if (!best || !total) return null;
    return {
      r: Math.round(best.r / best.n),
      g: Math.round(best.g / best.n),
      b: Math.round(best.b / best.n),
      // Share of the border that is this color — a real backdrop is near 1.
      coverage: best.n / total
    };
  }

  // --- keying -------------------------------------------------------------

  // Cuts the backdrop out of rgba in place. Returns a report.
  function key(rgba, w, h, options = {}) {
    const o = { ...DEFAULTS, ...options };
    const k = o.key || detectKey(rgba, w, h);
    if (!k) return { keyed: false, reason: "no backdrop color found" };

    const n = w * h;
    const raw = new Float32Array(n); // 1 = keep, 0 = cut
    for (let p = 0; p < n; p += 1) {
      const i = p * 4;
      const d = dist(rgba[i], rgba[i + 1], rgba[i + 2], k.r, k.g, k.b);
      raw[p] = smooth((d - o.tolerance) / Math.max(1e-4, o.softness));
    }

    // Only cut backdrop that reaches the border, so interior color that happens
    // to match the screen (a magenta visor on a magenta screen) stays put.
    let mask = raw;
    if (o.connected) {
      mask = new Float32Array(n).fill(1);
      const seen = new Uint8Array(n);
      const stack = [];
      const push = (p) => { if (!seen[p] && raw[p] < 1) { seen[p] = 1; stack.push(p); } };
      for (let x = 0; x < w; x += 1) { push(x); push((h - 1) * w + x); }
      for (let y = 0; y < h; y += 1) { push(y * w); push(y * w + w - 1); }
      while (stack.length) {
        const p = stack.pop();
        mask[p] = raw[p];
        const x = p % w, y = (p / w) | 0;
        if (x > 0) push(p - 1);
        if (x < w - 1) push(p + 1);
        if (y > 0) push(p - w);
        if (y < h - 1) push(p + w);
      }
    }

    const alpha = new Float32Array(n);
    let cut = 0;
    for (let p = 0; p < n; p += 1) {
      let a = mask[p];
      if (o.shrink > 0 && a < 1) a = Math.max(0, (a - o.shrink) / (1 - o.shrink));
      alpha[p] = a;
      cut += 1 - a;
    }

    const keyC = toYCbCr(k.r, k.g, k.b);
    const keyMag = Math.hypot(keyC.cb, keyC.cr);
    const despilling = o.despill > 0 && keyMag > 1;

    for (let p = 0; p < n; p += 1) {
      const i = p * 4;
      const a = alpha[p];
      if (a <= 0) { rgba[i + 3] = 0; continue; }

      // Despill only along the cut: pixels that ended up partly transparent,
      // and opaque pixels touching a cut pixel (the halo on hard-edged art).
      // Interior color that merely resembles the backdrop is never touched.
      if (despilling) {
        let fringe = a < 1;
        if (!fringe) {
          const x = p % w, y = (p / w) | 0;
          fringe = (x > 0 && alpha[p - 1] <= 0) || (x < w - 1 && alpha[p + 1] <= 0)
            || (y > 0 && alpha[p - w] <= 0) || (y < h - 1 && alpha[p + w] <= 0);
        }
        if (fringe) {
          const c = toYCbCr(rgba[i], rgba[i + 1], rgba[i + 2]);
          const proj = (c.cb * keyC.cb + c.cr * keyC.cr) / (keyMag * keyMag);
          if (proj > 0) {
            const amount = o.despill * Math.min(1, proj) * (a < 1 ? 1 : 0.5);
            const [r, g, b] = fromYCbCr(c.y, c.cb - keyC.cb * proj * amount, c.cr - keyC.cr * proj * amount);
            rgba[i] = Math.round(r); rgba[i + 1] = Math.round(g); rgba[i + 2] = Math.round(b);
          }
        }
      }
      rgba[i + 3] = Math.round(Math.min(rgba[i + 3], 255) * a);
    }

    return { keyed: true, key: k, cutFraction: cut / n, options: o };
  }

  // Decide what an image needs and do it: already-transparent images pass
  // through untouched, solid-backdrop images get keyed.
  function process(rgba, w, h, options = {}) {
    const o = { ...DEFAULTS, ...options };
    const info = alphaInfo(rgba);
    if (o.keepAlpha && info.hasAlpha) {
      return { action: "kept", info, ...(o.key ? {} : {}) };
    }
    const k = o.key || detectKey(rgba, w, h);
    // A border that is not mostly one color is probably real art, not a screen.
    if (!k || (!o.key && k.coverage < 0.7)) {
      return { action: "skipped", info, key: k, reason: "border is not a solid backdrop" };
    }
    const res = key(rgba, w, h, { ...o, key: k });
    return { action: res.keyed ? "keyed" : "skipped", info, ...res };
  }

  // --- runtime safety net -------------------------------------------------

  // Browser-side: if art was dropped in without going through intake and still
  // has its backdrop baked in, key it on load so the game never draws a
  // magenta box. Returns a canvas to draw instead of the image, or null when
  // the image is fine (or can't be inspected, e.g. a tainted file:// canvas).
  function keyImage(img, options = {}) {
    if (typeof document === "undefined" || !img.width || !img.height) return null;
    const cv = document.createElement("canvas");
    cv.width = img.width; cv.height = img.height;
    const c = cv.getContext("2d", { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    let data;
    try {
      data = c.getImageData(0, 0, cv.width, cv.height);
    } catch {
      return null;
    }
    const res = process(data.data, cv.width, cv.height, options);
    if (res.action !== "keyed") return null;
    c.putImageData(data, 0, 0);
    cv.chromaKey = res.key;
    return cv;
  }

  const API = { DEFAULTS, alphaInfo, detectKey, key, process, keyImage, dist };
  root.ROUNDERS = root.ROUNDERS || {};
  root.ROUNDERS.chroma = API;
  root.ROUNDERS_CHROMA = API;
})();
