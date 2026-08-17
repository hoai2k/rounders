// Rounders — how each card's round is DRAWN.
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
    "bank-shot": { color: "#e6783c", rotation: 15 },
    "big-bore": { color: "#ff8811" },
    "black-mamba": { color: "#8ef812", rotation: 14 },
    "boomerang": { color: "#ff8618", rotation: 180 },
    "boxing-glove": { color: "#ff510e", rotation: 3 },
    "breakthrough": { color: "#ff7d11" },
    "buckshot-buttons": { color: "#ff6e12" },
    "bullet-ballet": { color: "#ff8310" },
    "cannonball": { scale: 1.4 },
    "chain-lightning": { color: "#ffd91b" },
    "cinder-shot": { color: "#ff9014", scale: 1.05 },
    "cluster-bomb": { color: "#ff831d" },
    "comet-trail": { color: "#1facff", rotation: 2 },
    "double-dutch": { color: "#ff8210", scale: 1.05 },
    "drill-rounds": { color: "#ff8b11" },
    "golden-gun": { color: "#ff910e" },
    "helium-rounds": { color: "#ff724d", scale: 1.05, rotation: 20 },
    "lowrider": { color: "#ff7e14", rotation: 2 },
    "magnet-fingers": { color: "#f47c2d", rotation: 12 },
    "permafrost": { color: "#30afff" },
    "pocket-void": { color: "#b61cff", rotation: 11 },
    "popcorn-payload": { color: "#ffa232" },
    "puppet-strings": { color: "#ff8112" },
    "railgun": { color: "#1896ff" },
    "ricochet-romance": { color: "#ff32b2" },
    "shrapnel-burst": { color: "#ff8213" },
    "stink-bomb": { color: "#8ff420" },
    "storm-caller": { color: "#1c9bff", rotation: 27 },
    "supernova": { color: "#fff0c0", procedural: true },
    "wasp-venom": { color: "#ffc30f", rotation: 180 }
  };

  // What to draw a given card's round with. Never returns null.
  window.ROUNDERS.bulletArtFor = id => window.ROUNDERS.BULLET_ART[id] || {};
})();
