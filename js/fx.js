// Rounders — the effect sheets, shared by the game and every preview.
//
// The game and the card workbench used to paint effects from separate code:
// the game reached for assets/images/fx/<name>.png and the preview drew its
// own procedural version, so an Event Horizon in a match looked nothing like
// an Event Horizon in the workbench. Both now come through here, which means
// a sheet that lands is picked up by both at once, and the per-file trim in
// js/fx-art.js applies to both as well.
//
// Every draw returns false when the file is missing, which is each caller's
// cue to keep its procedural drawing — art can still land piecemeal.
(() => {
  "use strict";
  window.ROUNDERS = window.ROUNDERS || {};

  const ART = () => window.ROUNDERS.FX_ART || {};
  const NAMES = () => Object.keys(ART());

  const cache = new Map();
  function image(name) {
    let entry = cache.get(name);
    if (!entry) {
      const img = new Image();
      entry = { img, ok: false };
      cache.set(name, entry);
      img.onload = () => { entry.ok = true; };
      img.onerror = () => { entry.ok = false; };
      img.src = `${window.ROUNDERS_ASSET_BASE || ""}assets/images/fx/${name}.png`;
    }
    return entry.ok ? entry.img : null;
  }

  const tune = name => ART()[name] || { scale: 1, rotation: 0 };
  const frames = name => tune(name).frames || 1;

  // Live edits from the workbench. They ride the same table the game reads, so
  // a slider moves the preview and the match art together.
  function setTune(name, patch) {
    const t = ART()[name] || (ART()[name] = { scale: 1, rotation: 0 });
    Object.assign(t, patch);
    return t;
  }

  // Lazy loading would mean the first explosion of a match is procedural and
  // the second is painted. A touch at boot costs nothing.
  function warm() { for (const n of NAMES()) image(n); }

  // ---------------------------------------------------------------- framing
  // A strip is nominally n equal cells, but the art is drawn by eye and does
  // not land on that grid: in explosion.png the first three blasts sit 36–77px
  // left of their cell centres, so slicing at exact sixths cuts through the
  // artwork and the animation jumps around as it plays.
  //
  // So the frames are FOUND rather than assumed. The column-alpha profile of
  // the strip gives runs of ink separated by gutters; those runs are the real
  // frames. Each one is sampled from a box centred on its own middle, trimmed
  // symmetrically where a neighbour is closer than half a cell so a frame can
  // never show a sliver of the one beside it. The box is drawn at a size in
  // proportion to its width, so a trimmed frame keeps the scale of its
  // neighbours — an explosion still grows through the strip.
  //
  // An entry in js/fx-art.js may carry `centres: [...]` (source-pixel x of each
  // frame) to override the detection outright.
  const layouts = new Map();

  function detect(img, n) {
    const cell = img.width / n;
    const cv = document.createElement("canvas");
    cv.width = img.width; cv.height = img.height;
    const c = cv.getContext("2d", { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    let data;
    try { data = c.getImageData(0, 0, cv.width, cv.height).data; } catch (e) { return null; }
    const col = new Array(cv.width).fill(0);
    let peak = 0;
    for (let x = 0; x < cv.width; x += 1) {
      let sum = 0;
      for (let y = 0; y < cv.height; y += 1) sum += data[((y * cv.width) + x) * 4 + 3];
      col[x] = sum;
      if (sum > peak) peak = sum;
    }
    if (!peak) return null;

    // Runs of ink separated by gutters are the frames as DRAWN. Faint haze is
    // ignored (2% of the busiest column) and only hairline gaps are closed up
    // — a stray speck beside a blast is not a frame boundary, but the gutters
    // in explosion-big.png are only 15px wide, so the tolerance has to stay
    // well under that.
    const thr = peak * 0.02;
    let runs = [];
    let start = -1;
    for (let x = 0; x < col.length; x += 1) {
      const ink = col[x] > thr;
      if (ink && start < 0) start = x;
      if (start >= 0 && (!ink || x === col.length - 1)) { runs.push([start, ink ? x : x - 1]); start = -1; }
    }
    if (!runs.length) return null;
    const merged = [runs[0]];
    for (let i = 1; i < runs.length; i += 1) {
      const prev = merged[merged.length - 1];
      if (runs[i][0] - prev[1] <= Math.max(4, cell * 0.02)) prev[1] = runs[i][1];
      else merged.push(runs[i]);
    }
    runs = merged;
    // Reconcile against the declared frame count, but only if the picture is
    // roughly right — a strip that came out wildly different is one the
    // detector has misread, and the nominal grid is the safer answer.
    if (runs.length < n - 2 || runs.length > n + 2) return null;
    while (runs.length > n) {                       // close the narrowest gap
      let at = 1, best = Infinity;
      for (let i = 1; i < runs.length; i += 1) {
        const gap = runs[i][0] - runs[i - 1][1];
        if (gap < best) { best = gap; at = i; }
      }
      runs[at - 1][1] = runs[at][1];
      runs.splice(at, 1);
    }
    while (runs.length < n) {                       // frames that touch: halve the widest
      let at = 0, best = -1;
      runs.forEach(([a, b], i) => { if (b - a > best) { best = b - a; at = i; } });
      const [a, b] = runs[at];
      const mid = Math.round((a + b) / 2);
      runs.splice(at, 1, [a, mid], [mid + 1, b]);
    }
    const centres = runs.map(([a, b]) => (a + b) / 2);
    // a frame that landed more than half a cell from where it was declared is
    // a misread, not art drawn that far out of place
    for (let i = 0; i < n; i += 1) {
      if (Math.abs(centres[i] - (i + 0.5) * cell) > cell * 0.5) return null;
    }
    return centres.map((centre, i) => {
      const prev = i > 0 ? centres[i - 1] : -Infinity;
      const next = i < n - 1 ? centres[i + 1] : Infinity;
      // reach no further than halfway to a neighbour, so a frame can never
      // show a sliver of the one beside it
      const half = Math.max(4, Math.min(
        cell / 2,
        (centre - prev) / 2,
        (next - centre) / 2,
        centre,
        img.width - centre
      ));
      return { sx: centre - half, sw: half * 2, centre };
    });
  }

  function layout(name, img, n) {
    const over = (ART()[name] || {}).centres;
    const cell = img.width / n;
    if (over && over.length === n) {
      return over.map((centre) => ({ sx: centre - cell / 2, sw: cell, centre }));
    }
    let l = layouts.get(name);
    if (!l) {
      l = detect(img, n) || Array.from({ length: n }, (_, f) => ({ sx: f * cell, sw: cell, centre: (f + 0.5) * cell }));
      layouts.set(name, l);
    }
    return l;
  }

  // One frame of a sheet, centred on (x, y), `u` running 0→1 across the strip.
  function draw(ctx, name, x, y, size, u = 0, opts = {}) {
    const img = image(name);
    if (!img) return false;
    const t = tune(name);
    const n = frames(name);
    const cell = img.width / n;
    const frame = Math.max(0, Math.min(n - 1, Math.floor(u * n)));
    const box = n > 1 ? layout(name, img, n)[frame] : { sx: 0, sw: img.width };
    // `size` is the width the engine wants a WHOLE cell drawn at; a trimmed
    // box is drawn narrower in the same proportion, so the scale never jumps
    const k = (size * (t.scale || 1)) / (n > 1 ? cell : img.width);
    const w = box.sw * k;
    const h = img.height * k;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opts.alpha === undefined ? 1 : opts.alpha));
    ctx.translate(x, y);
    const spin = (opts.rot || 0) + (t.rotation || 0) * Math.PI / 180;
    if (spin) ctx.rotate(spin);
    ctx.drawImage(img, box.sx, 0, box.sw, img.height, -w / 2, -h / 2, w, h);
    ctx.restore();
    return true;
  }

  // What the detector decided, for the workbench to draw over the strip.
  function boxes(name) {
    const img = image(name);
    const n = frames(name);
    if (!img || n < 2) return null;
    return layout(name, img, n);
  }

  window.ROUNDERS.fx = { names: NAMES, image, tune, setTune, frames, warm, draw, boxes };
})();
