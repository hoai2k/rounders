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

  // One frame of a sheet, centred on (x, y), `u` running 0→1 across the strip.
  function draw(ctx, name, x, y, size, u = 0, opts = {}) {
    const img = image(name);
    if (!img) return false;
    const t = tune(name);
    const n = frames(name);
    const fw = img.width / n;
    const frame = Math.max(0, Math.min(n - 1, Math.floor(u * n)));
    const w = size * (t.scale || 1);
    const h = w * (img.height / fw);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opts.alpha === undefined ? 1 : opts.alpha));
    ctx.translate(x, y);
    const spin = (opts.rot || 0) + (t.rotation || 0) * Math.PI / 180;
    if (spin) ctx.rotate(spin);
    ctx.drawImage(img, frame * fw, 0, fw, img.height, -w / 2, -h / 2, w, h);
    ctx.restore();
    return true;
  }

  window.ROUNDERS.fx = { names: NAMES, image, tune, setTune, frames, warm, draw };
})();
