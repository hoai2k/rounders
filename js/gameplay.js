// ===========================================================================
// Rounders — GAMEPLAY TUNING CONFIG
// ===========================================================================
// The base numbers a match starts from, in one editable place — the gameplay
// counterpart to js/strings.js. Change a value and reload; the engine and the
// card workbench both read from here.
//
// Cards MODIFY these baselines (multiply, add), so a change here shifts the
// whole game while card trade-offs keep their proportions.
// ===========================================================================
(() => {
  "use strict";
  window.ROUNDERS = window.ROUNDERS || {};

  window.ROUNDERS.GAMEPLAY = {

    // -------------------------------------------------------- FIGHTER BASELINE
    // What every fighter is before any cards.
    fighter: {
      maxHp: 100,
      radius: 27,     // body size (px)

      // movement
      speed: 560,     // top ground speed (px/s)
      accel: 12,      // how sharply you reach top speed
      airAccel: 5.2,  // steering strength while airborne
      brake: 10,      // how sharply you stop
      jump: 880       // jump launch speed (≈184px rise at normal gravity)
    },

    // ------------------------------------------------------------ THE GUN
    // Baseline: 3 hits to kill (36 a hit), so one full clip is exactly lethal
    // and a fight has room to turn around. Ballistics are tuned so lobbing is
    // a real tactic: max ballistic range is v²/g ≈ 1330px, so a 45° arc clears
    // mid-map cover, while flat shots still drop visibly at range.
    gun: {
      damage: 36,
      maxAmmo: 3,
      fireDelay: 0.27,        // seconds between shots (lower = faster follow-ups)
      reload: 2.0,            // seconds to refill the whole clip once it's empty
      bulletSpeed: 1180,      // px/s
      bulletGravity: 1050,    // how much shots arc
      bulletDrag: 0.997,
      bulletRestitution: 0.72,// bounciness of ricochet shots
      bulletSize: 1,          // visual + hitbox scale
      pellets: 1,
      spread: 0.04,

      // Floors, not baselines. Fire-rate cards multiply these down, and four
      // stacked copies of Blood Money reach a 0.0004s delay — the whole
      // magazine leaving the barrel inside a single 16ms frame, which turns a
      // fast gun into an instant clip dump. The engine refuses to go below
      // these however far the stats are pushed; the stats themselves are left
      // honest, so a card still reads as doing what it says.
      minFireDelay: 0.05,     // 20 rounds a second, ~3 frames apart at 60fps
      minReload: 0.3
    },

    // ------------------------------------------------------------- BLOCKING
    block: {
      cooldown: 1.55,   // seconds between blocks
      duration: 0.25    // the parry window
    },

    // ---------------------------------------------------------------- WORLD
    world: {
      gravity: 2100,    // px/s² pulling fighters down
      airDrag: 0.996,   // per-frame-at-60fps velocity keep while airborne
      floorDrag: 0.86   // ...and while grounded (lower = stops faster)
    },

    // ------------------------------------------------------- CHARGED JUMP
    // Grasshopper: hold jump on the ground to wind up, release to launch. A
    // tap is an ordinary jump; past `minHold` the launch speed climbs to
    // `maxMul` at `maxHold`. 2.15x on the baseline 880 clears ~850px, which is
    // the height of the board.
    chargeJump: {
      minHold: 0.5,     // seconds before winding up buys anything
      maxHold: 7,       // fully wound
      maxMul: 2.15,     // launch speed multiplier when fully wound
      squash: 0.3,      // how far they compress at full charge (fraction)
      bob: 3.5          // px of bob while winding
    },

    // ------------------------------------------------------------ WALL MOVES
    wall: {
      coyote: 0.12,     // seconds a wall touch stays "jumpable" after leaving it
      jumpPush: 300,    // sideways kick of a wall jump (small = same wall climbable)
      slideMax: 250     // fall speed cap while hugging a wall
    },

    // -------------------------------------------------------------- HAZARDS
    hazards: {
      touchDamage: 30,  // spikes/lava per touch (~3 touches from full health)
      touchGrace: 1.0,  // seconds of immunity to steer back to safety
      pitBounces: 2,    // times the bottom of the world throws you back in
      soakRate: 7       // HP per second while under water
    },

    // ------------------------------------------------------------- CONTROLS
    // The ACTION is what a card cares about, not the button. Cards are tagged
    // with the action they pay off from (shoot / block / jump / ability / aim)
    // and the badge on the card face is looked up here, so re-binding a button
    // moves every badge with it. `pad` are standard-mapping gamepad indices —
    // game.js reads its gamepad bindings from these same lists, so there is one
    // place to change and nothing can drift out of step.
    //   0 A · 1 B · 2 X · 3 Y · 4 LB · 5 RB · 6 LT · 7 RT · 9 Start
    controls: {
      jump:    { pad: [0], badge: "A",  label: "jump" },
      shoot:   { pad: [2, 5, 7], badge: "RT", label: "shoot" },
      block:   { pad: [1, 4, 6], badge: "LT", label: "block" },
      ability: { pad: [3], badge: "Y",  label: "ability" },
      aim:     { pad: [], badge: "RS", label: "aim" },
      pause:   { pad: [9], badge: "☰",  label: "pause" }
    }
  };

  // action -> the badge to print on a card face
  window.ROUNDERS.padBadge = action => {
    const c = window.ROUNDERS.GAMEPLAY.controls[action];
    return c ? c.badge : action;
  };
})();
