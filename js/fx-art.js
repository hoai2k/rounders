// Rounders — how each effect sheet is DRAWN, in one place.
//
// The engine decides where an effect goes and how big the moment is; this file
// is the per-file trim on top of that: a scale multiplier and a rotation, the
// same shape `js/bullet-art.js` carries for painted rounds. Values are dialled
// in /workbench (Effects mode) and exported through rigs.json.
//
// scale     1 = draw at the size the engine asked for
// rotation  degrees, added to whatever spin the engine gives it
// frames    strip length for a sheet; 1 (the default) is a single image
// feather   0 = off. Otherwise the fraction of the sprite's radius over which
//           it fades to nothing at the outer edge — for art that runs to the
//           edge of its frame and ends in a hard straight cut
// offsets   per-frame [dx, dy] in SOURCE pixels, nudging where a frame lands
//           so a strip's stages line up. It moves the drawing, never the cut
// centres   per-frame x in source pixels, overriding where the strip is cut
(() => {
  "use strict";
  window.ROUNDERS = window.ROUNDERS || {};

  window.ROUNDERS.FX_ART = {
    "explosion":       { scale: 1, rotation: 0, frames: 6,
                         feather: 0.33,
                         offsets: [[-34, -21], [-59, -17], [0, 0], [8, 0], [7, 0], [0, 0]] },
    "explosion-big":   { scale: 1, rotation: 0, frames: 6,
                         feather: 0.4,
                         offsets: [[-2, -24], [0, -11], [0, -11], [0, -8], [0, -13], [0, -9]] },
    "shield-break":    { scale: 1, rotation: 0, frames: 5 },
    "shockwave-ring":  { scale: 1, rotation: 0 },
    "lightning-arc":   { scale: 1, rotation: 0 },
    "storm-nova":      { scale: 1, rotation: 0 },
    "shield-bubble":   { scale: 1, rotation: 0 },
    "stun-stars":      { scale: 1, rotation: 0 },
    "muzzle-flash":    { scale: 1, rotation: 0 },
    "chill-aura":      { scale: 1, rotation: 0 },
    "frost-burst":     { scale: 1, rotation: 0 },
    "black-hole":      { scale: 1, rotation: 0 },
    "poison-cloud":    { scale: 1, rotation: 0 },
    "sawblade":        { scale: 1, rotation: 0 },
    "angel":           { scale: 1, rotation: 0 },
    "lemonade":        { scale: 1, rotation: 0 },
    // drawn by nothing today — the engine won these arguments with its own
    // procedural versions — but kept so the workbench can show them
    "heal-field":      { scale: 1, rotation: 0 },
    "armor-plates":    { scale: 1, rotation: 0 },
    "bore-hole":       { scale: 1, rotation: 0 },
    "dust-puff":       { scale: 1, rotation: 0 }
  };
})();
