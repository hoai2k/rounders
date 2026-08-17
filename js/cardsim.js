// Rounders — card preview simulator.
//
// A small, self-contained fight used by the card workbench to SHOW what a card
// does: one fighter shoots another a short distance away, with the scenario
// chosen to make that particular card's power visible — a wall to drill
// through, a diagonal shot for a seeker, a blocker for a block card, a second
// body for pierce and chain.
//
// It is deliberately NOT the game engine: it re-implements just enough
// ballistics and combat to illustrate, at a readable speed and scale, and it
// never touches game state. Numbers come from the card's own apply(), so the
// preview always reflects what the card really does.
(() => {
  "use strict";
  window.ROUNDERS = window.ROUNDERS || {};

  const rand = (min, max) => min + Math.random() * (max - min);

  // World is authored at this size and scaled to whatever canvas it gets.
  const W = 720, H = 320;
  const GROUND = 252;
  // The game's speeds would cross a 720px view instantly, so space and time are
  // scaled together (v and g both by SCALE, keeping trajectory shape).
  const SCALE = 0.42;
  const TIME = 0.8;

  // The baseline a card is applied on top of. The literal below carries the
  // full stat SHAPE; js/gameplay.js (when loaded) overrides just the numbers
  // it owns, so the preview and the game always agree on the baseline.
  function baseStats() {
    const st = literalStats();
    const GP = window.ROUNDERS.GAMEPLAY;
    if (GP) {
      const F = GP.fighter, G = GP.gun, B = GP.block;
      Object.assign(st, {
        maxHp: F.maxHp, speed: F.speed, accel: F.accel, airAccel: F.airAccel, brake: F.brake, jump: F.jump,
        radius: F.radius,
        damage: G.damage, bulletSpeed: G.bulletSpeed, bulletGravity: G.bulletGravity, bulletDrag: G.bulletDrag,
        bulletRestitution: G.bulletRestitution, bulletSize: G.bulletSize,
        maxAmmo: G.maxAmmo, reload: G.reload, fireDelay: G.fireDelay,
        pellets: G.pellets, spread: G.spread,
        blockCooldown: B.cooldown, blockDuration: B.duration
      });
    }
    return st;
  }

  function literalStats() {
    return {
      maxHp: 100, speed: 560, accel: 12, airAccel: 5.2, brake: 10, jump: 880,
      damage: 36, bulletSpeed: 1180, bulletGravity: 1050, bulletDrag: 0.997,
      bulletRestitution: 0.72, bulletSize: 1,
      maxAmmo: 3, reload: 2.0, fireDelay: 0.3,
      blockCooldown: 1.55, blockDuration: 0.25,
      radius: 27, pellets: 1, spread: 0.04,
      bounces: 0, explosive: 0, homing: 0, grow: 0, pierce: 0,
      poison: 0, burn: 0, chill: 0, chain: 0, shards: 0,
      groundHug: 0, voidPull: 0,
      lifesteal: 0, thorns: 0, regen: 0, rage: 0, adrenaline: 0,
      echoBlock: 0, blockPush: 0, blockDash: 0, warpBlock: 0, stormBlock: 0,
      guardian: 0, revives: 0, extraJumps: 0, kbResist: 0, shield: 0,
      goldenShot: false, killHeal: false,
      active: null, activeCooldown: 10,
      kbDeal: 0, bankShot: 0, stink: 0, dazzle: 0, silence: 0, wallPierce: 0, holePunch: 0,
      steer: 0, helium: 0, boomerang: 0, encore: 0, burstFire: 0,
      bloodMoney: 0, underdog: 0,
      blockReload: 0, healField: 0, frostBlock: 0, sawBlock: 0,
      empowerBlock: 0, autoBlock: 0, brickBlock: 0, decoy: 0, blockRefresh: 0,
      scavenge: 0, reloadPulse: 0, sugarRush: 0, hotStreak: 0, overflow: 0, floatTime: 0,
      decay: 0, freshCoat: 0, chillAura: 0, stomp: 0, jumpBlast: 0, repel: 0
    };
  }

  function statsFor(card) {
    const p = { stats: baseStats() };
    card.apply(p);
    return p.stats;
  }

  // The game's own bullet radius formula (game.js tryShoot/fireVolley), so the
  // preview and the bullet viewer show a round at true game size.
  function bulletRadius(st) {
    return (5.5 + Math.min(9, st.damage / 22)) * st.bulletSize;
  }

  // Which visual tells a card's bullet carries, for the bullet viewer.
  function bulletSpec(card) {
    const st = statsFor(card);
    const b = baseStats();
    const on = k => st[k] > b[k];
    return {
      r: bulletRadius(st),
      color: st.goldenShot ? "#ffd700" : "#ff5277",
      golden: Boolean(st.goldenShot),
      pierce: st.pierce > 0, wallPierce: st.wallPierce > 0, holePunch: st.holePunch > 0,
      explosive: st.explosive > 0, burn: on("burn"), poison: on("poison"), chill: on("chill"),
      chain: on("chain"), homing: on("homing") || on("steer"), grow: on("grow"),
      helium: on("helium"), boomerang: on("boomerang"), stink: on("stink"),
      voidPull: on("voidPull"), shards: st.shards > 0, bounces: st.bounces > 0,
      pellets: st.pellets, speed: st.bulletSpeed, damage: st.damage
    };
  }

  // ---------------------------------------------------------------- planning
  // What should this card's preview look like? Driven by the stats the card
  // actually changed, so a new card gets a sensible scene for free.
  function planFor(card) {
    const s = statsFor(card);
    const b = baseStats();
    const on = k => s[k] > b[k];
    const watch = [];

    const blocky = on("blockPush") || on("frostBlock") || on("healField") ||
      on("sawBlock") || on("blockReload") || on("decoy") || on("brickBlock") ||
      on("warpBlock") || on("blockDash") || on("stormBlock") || on("echoBlock") ||
      on("empowerBlock") || on("blockRefresh") || s.blockCooldown !== b.blockCooldown;
    const defensive = on("shield") || on("thorns") || on("regen") || on("kbResist") ||
      on("overflow") || on("freshCoat") || on("hotStreak") || on("decay") ||
      on("guardian") || on("revives") || on("chillAura") || on("repel") ||
      s.maxHp > b.maxHp * 1.05;
    const movement = on("speed") || on("jump") || on("extraJumps") || on("airAccel") ||
      on("accel") || on("stomp") || on("jumpBlast") || on("sugarRush") || on("adrenaline");

    // Who holds the card decides who we point the camera at: a shield or block
    // power is shown on the RECEIVER, taking fire and surviving it.
    // A Mythic's caster is the star of its own preview. Chronoshift is the
    // exception: it has to be the one taking fire for the rewind to mean
    // anything, so it holds the card on the receiving end.
    let holder;
    if (s.active) holder = s.active === "chronoshift" ? "target" : "shooter";
    else holder = (blocky || defensive) && !on("empowerBlock") ? "target" : "shooter";

    const plan = {
      card, stats: s, base: b, holder,
      wall: false, secondTarget: false, aimUp: 0, blockDemo: blocky,
      // effects that go off AROUND the blocker need someone standing in them,
      // or the nova fires into empty air and reads as nothing happening
      close: on("stormBlock") || on("blockPush") || on("frostBlock") ||
        on("sawBlock") || on("reloadPulse") || on("chillAura") || on("jumpBlast"),
      movementDemo: movement && !blocky && !defensive && holder === "shooter",
      watch
    };

    if (on("holePunch")) { plan.wall = "thin"; watch.push("each impact blows a permanent hole in the pillar — later shots fly through it"); }
    else if (on("wallPierce")) { plan.wall = "thin"; watch.push("the shot bores clean through the pillar"); }
    else if (on("pierce")) { plan.secondTarget = true; watch.push("one bullet passes through the first fighter into the second"); }
    // a skip shot off the floor: reliable to stage, and it reads as a bounce
    // far better than a bank off a floating slab, which lands anywhere
    else if (on("bounces") || on("bankShot")) { plan.skip = true; watch.push("the shot skips off the floor instead of dying on it"); }
    if (on("chain")) { plan.secondTarget = true; watch.push("lightning arcs from the victim to the next fighter"); }
    if (on("homing") || on("steer")) { plan.aimUp = -0.6; watch.push("fired well off-target, the bullet curves back onto them"); }
    if (on("helium")) { plan.aimUp = 0.12; watch.push("the bullet falls upward instead of dropping"); }
    if (on("grow")) watch.push("the bullet swells and hits harder the farther it flies");
    // a ground-hugger wants a flat shot: it only catches the floor if it is
    // fired near it, so lobbing it would just sail over the whole point
    if (on("groundHug")) { plan.flat = true; watch.push("the bullet drops to the floor and skims along it"); }
    if (on("boomerang")) { plan.aimUp = -0.75; watch.push("a miss turns around and flies back to the shooter"); }
    if (on("explosive")) watch.push("impacts detonate — the victim eats a share of the blast");
    if (on("shards")) watch.push("the bullet breaks into shrapnel");
    if (on("stink")) watch.push("impacts leave a lingering cloud");
    if (on("voidPull")) watch.push("impacts tear open a vortex that drags them in");
    if (on("poison") || on("burn")) watch.push("damage keeps ticking after the hit");
    if (on("chill") || on("frostBlock") || on("chillAura")) watch.push("the victim turns blue and slows down");
    if (on("dazzle")) watch.push("the victim is stunned stiff for a moment");
    if (on("silence")) watch.push("the victim's block is muted — watch it fail");
    if (on("lifesteal")) watch.push("the shooter heals from the damage dealt");
    if (on("thorns")) watch.push("the attacker takes damage back on every hit");
    if (on("shield") || on("overflow") || on("hotStreak") || on("freshCoat")) {
      watch.push("a shield bar soaks the hit before health moves");
    }
    if (on("decay")) watch.push("damage arrives as a slow drip, not all at once");
    if (on("regen")) watch.push("health climbs back on its own");
    if (on("kbResist")) watch.push("they barely budge when hit");
    if (on("kbDeal")) watch.push("the victim is launched much farther than usual");
    if (on("repel")) watch.push("incoming bullets bend away from them");
    if (on("guardian") || on("revives")) watch.push("a lethal hit doesn't finish them");
    if (on("pellets")) watch.push("one trigger pull throws several pellets");
    if (on("burstFire")) watch.push("each pull is followed by echo shots");
    if (on("encore")) watch.push("a ghost of the shot fires again a beat later");
    if (on("scavenge") || on("blockReload")) watch.push("watch the ammo pips refill");
    if (on("reloadPulse")) watch.push("pulses go off while reloading");
    if (on("decoy")) watch.push("a stand-in of them is left behind and takes the shots");
    if (on("brickBlock")) watch.push("blocking conjures a real slab of cover");
    if (on("healField")) watch.push("blocking plants a zone that heals them");
    if (on("sawBlock")) watch.push("a sawblade orbits them after the block");
    if (on("stormBlock")) watch.push("blocking throws lightning at whoever is near");
    if (on("blockPush")) watch.push("blocking shoves the attacker away");
    if (on("warpBlock")) watch.push("blocking teleports them out of the way");
    if (on("blockDash")) watch.push("blocking hurls them forward");
    if (on("echoBlock")) watch.push("the block fires a second time on its own");
    if (on("empowerBlock")) watch.push("after a block the next shot is gold and lands like a bomb");
    if (on("goldenShot")) watch.push("the first shot of the magazine is gold and triple damage");
    if (on("stomp")) watch.push("landing on a head deals damage and bounces them off it");
    if (on("jumpBlast")) watch.push("their mid-air jump detonates underneath them");
    if (s.damage > b.damage * 1.02) watch.push("bigger bite out of the health bar");
    if (s.damage < b.damage * 0.98) watch.push("softer hits — the trade for the rest of the card");
    if (s.maxHp > b.maxHp * 1.02) watch.push("a longer health bar");
    if (s.fireDelay < b.fireDelay * 0.98 || s.maxAmmo > b.maxAmmo) watch.push("faster, fuller volleys");
    if (s.bulletSpeed > b.bulletSpeed * 1.05) watch.push("a flatter, faster shot");
    if (s.active === "eventHorizon") watch.unshift("the black hole opens beside them and drags them in, crushing as it goes");
    else if (s.active === "chronoshift") watch.unshift("they take fire, then rewind to where they stood 2s ago and get the health back");
    else if (s.active === "starfall") watch.unshift("a volley of meteors comes down on them");
    else if (s.active) watch.unshift("the ability fires on its own here");
    if (movement) watch.push("the fighter runs and jumps so the movement reads");

    if (!watch.length) watch.push("the numbers on the card, applied to a real exchange");
    // Only cards that are actually about blocking make the receiver block. A
    // shield card must be shown soaking the hit, not parrying it away, and a
    // silence card needs the receiver to TRY to block so you see it fail.
    plan.blockDemo = blocky || on("silence");
    return plan;
  }

  // ------------------------------------------------------------------- sim
  function createSim(canvas, card, opts = {}) {
    const ctx = canvas.getContext("2d");
    const plan = planFor(card);
    const CH = window.ROUNDERS.CHARACTERS || [];
    const chA = CH[opts.shooterChar ?? 0] || null;
    const chB = CH[opts.targetChar ?? 3] || null;

    let a, bb, bullets, fields, parts, floaters, decoys, slabs, t, cycle, raf = 0, running = false;
    // holes Skylight blows in the preview's pillar, in the pillar's own space
    let pillarHoles = [];

    function makeFighter(x, holder, color, character, facing) {
      const st = holder ? plan.stats : baseStats();
      return {
        x, y: GROUND - st.radius, vx: 0, vy: 0,
        stats: st, hp: st.maxHp, maxHp: st.maxHp,
        shield: st.shield, temp: 0, decayPool: 0,
        color, character, facing, aimX: facing, aimY: 0,
        ammo: st.maxAmmo, reloadT: 0, fireT: 0,
        blockT: 0, blockCd: 0, echoT: 0, stunT: 0, silenceT: 0,
        chillT: 0, poisonT: 0, burnT: 0, dotDps: 0,
        grounded: true, jumps: 1 + st.extraJumps, guardian: st.guardian, revives: st.revives,
        empower: 0, holder
      };
    }

    function reset() {
      const holderIsTarget = plan.holder === "target";
      a = makeFighter(120, !holderIsTarget, "#ff5277", chA, 1);
      bb = makeFighter(plan.wall ? 600 : plan.close ? 300 : 545, holderIsTarget, "#52d7ff", chB, -1);
      a.temp = a.holder ? a.stats.maxHp * a.stats.freshCoat : 0;
      bb.temp = bb.holder ? bb.stats.maxHp * bb.stats.freshCoat : 0;
      bullets = []; fields = []; parts = []; floaters = []; decoys = []; slabs = [];
      pillarHoles = [];
      t = 0; cycle = 0;
    }

    // --------------------------------------------------------------- helpers
    const walls = () => {
      const list = [{ x: -40, y: GROUND, w: W + 80, h: 90, ground: true }];
      // Skylight's pillar is chunky, so a bored hole is unmistakable
      if (plan.wall === "thin") list.push({ x: 350, y: 118, w: plan.stats.holePunch ? 46 : 26, h: GROUND - 118, holes: pillarHoles });
      if (plan.wall === "bounce") list.push({ x: 360, y: 60, w: 30, h: 120 });
      for (const s of slabs) list.push({ x: s.x - s.w / 2, y: s.y - s.h / 2, w: s.w, h: s.h, slab: true });
      return list;
    };
    const hitRect = (x, y, r, w) =>
      x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h;
    const enemies = who => (who === a ? [bb] : [a]);

    function float(x, y, text, color) { floaters.push({ x, y, text, color, life: 0.9 }); }
    function puff(x, y, color, n = 8, sp = 150) {
      for (let i = 0; i < n; i += 1) {
        const ang = Math.random() * Math.PI * 2, v = Math.random() * sp;
        parts.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, life: 0.4, max: 0.4, r: 1 + Math.random() * 2.5, color });
      }
    }

    function heal(who, amount) {
      const room = who.maxHp - who.hp;
      const toHp = Math.min(room, amount);
      who.hp += toHp;
      const extra = amount - toHp;
      if (extra > 0 && who.stats.overflow) who.temp = Math.min(who.stats.overflow, who.temp + extra);
    }

    function damage(who, amount, from, kx = 0, ky = 0, direct = true) {
      if (who.blockT > 0 && direct) {
        puff(who.x, who.y, "#ffffff", 10, 220);
        float(who.x, who.y - 46, "BLOCK", "#ffffff");
        return;
      }
      // knockback, with the attacker's kbDeal and the victim's resistance
      const kb = (1 - Math.min(0.9, who.stats.kbResist)) * (from ? 1 + from.stats.kbDeal : 1);
      const mag = Math.hypot(kx, ky) || 1;
      who.vx += (kx / mag) * Math.min(620, amount * 16) * kb * SCALE;
      who.vy += ((ky / mag) * Math.min(320, amount * 8) - Math.min(220, amount * 2)) * kb * SCALE;

      if (from && from.stats.thorns && direct) {
        from.hp -= amount * from.stats.thorns * 0; // thorns belong to the victim
      }
      if (who.stats.thorns && from && direct) {
        from.hp = Math.max(1, from.hp - amount * who.stats.thorns);
        float(from.x, from.y - 52, `-${Math.round(amount * who.stats.thorns)}`, "#ff5f8f");
        parts.push({ bolt: true, x1: who.x, y1: who.y, x2: from.x, y2: from.y, life: 0.18, max: 0.18, color: "#ff5f8f" });
      }
      // shields first
      if (who.shield > 0) {
        const s = Math.min(who.shield, amount);
        who.shield -= s; amount -= s;
        puff(who.x, who.y, "#7fd8ff", 8, 200);
      }
      if (amount > 0 && who.temp > 0) {
        const s = Math.min(who.temp, amount);
        who.temp -= s; amount -= s;
        puff(who.x, who.y, "#ffd76e", 8, 200);
      }
      if (amount <= 0) return;
      if (who.stats.decay && direct) { who.decayPool += amount; float(who.x, who.y - 46, `${Math.round(amount)} over time`, "#c88fff"); return; }
      const lethal = who.hp - amount <= 0;
      if (lethal && who.guardian > 0) {
        who.guardian -= 1; who.hp = who.maxHp * 0.25;
        float(who.x, who.y - 52, "SAVED", "#ffd700"); puff(who.x, who.y, "#ffd700", 22, 380);
        return;
      }
      who.hp -= amount;
      float(who.x, who.y - 46, `-${Math.round(amount)}`, "#ffffff");
      puff(who.x, who.y, who.color, 10, 240);
      if (who.hp <= 0) {
        if (who.revives > 0) { who.revives -= 1; who.hp = who.maxHp * 0.5; float(who.x, who.y - 60, "REVIVED", "#ff9e3d"); }
        else who.hp = 0;
      }
    }

    // A shooter who aims dead at a distant target just plants the round in the
    // dirt — the drop over this range is most of a body height. Solve the low
    // ballistic arc instead, the way a player leads a lobbed shot, so previews
    // actually connect. Falls back to direct aim when the arc has no solution
    // (helium's upward gravity, or a target out of range).
    function aimAngle(who, target, speed, gravity) {
      const dx = target.x - who.x;
      const dyUp = -(target.y - who.y);
      const dir = Math.sign(dx) || 1;
      if (gravity <= 0 || Math.abs(dx) < 1) return Math.atan2(target.y - who.y, dx);
      const v2 = speed * speed;
      const disc = v2 * v2 - gravity * (gravity * dx * dx + 2 * dyUp * v2);
      if (disc < 0) return Math.atan2(target.y - who.y, dx);
      const theta = Math.atan2(v2 - Math.sqrt(disc), gravity * Math.abs(dx));
      return dir > 0 ? -theta : Math.PI + theta;
    }

    function fire(who, mul = 1, angleOverride = null, ghost = false) {
      const st = who.stats;
      const golden = st.goldenShot && who.ammo === st.maxAmmo;
      who.ammo = Math.max(0, who.ammo - 1);
      const target = enemies(who)[0];
      let ang = angleOverride;
      if (ang === null) {
        const speed = st.bulletSpeed * SCALE;
        const grav = (st.helium ? -st.bulletGravity * 0.35 : st.bulletGravity * (st.homing ? 0.4 : 1)) * SCALE;
        if (plan.flat) {
          ang = Math.sign(target.x - who.x) > 0 ? 0 : Math.PI;
        } else if (plan.skip) {
          // aim at the floor partway there; the bounce carries it the rest
          const mark = { x: who.x + (target.x - who.x) * 0.5, y: GROUND - 4 };
          ang = aimAngle(who, mark, speed, grav);
        } else {
          // Solve once from the body, then again from where the muzzle
          // actually is at that angle — the 26px of barrel is enough to make
          // a long shot sail over the target's head.
          ang = aimAngle(who, target, speed, grav);
          const muz = { x: who.x + Math.cos(ang) * 26, y: who.y + Math.sin(ang) * 26 };
          ang = aimAngle(muz, target, speed, grav);
        }
        // deliberate miss for the cards whose whole point is recovering from one
        if (plan.aimUp) ang += plan.aimUp * (who.facing > 0 ? 1 : -1);
      }
      const empower = who.empower; who.empower = 0;
      for (let i = 0; i < st.pellets; i += 1) {
        const sp = (i - (st.pellets - 1) / 2) * st.spread;
        const angle = ang + sp;
        const speed = st.bulletSpeed * SCALE;
        bullets.push({
          owner: who, x: who.x + Math.cos(angle) * 26, y: who.y + Math.sin(angle) * 26,
          ox: who.x, oy: who.y,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          r: bulletRadius(st),
          damage: st.damage * mul * (golden ? (st.pellets > 1 ? 2 : 3) : 1) * (empower ? 1 + 0.75 * empower : 1),
          gravity: (st.helium ? -st.bulletGravity * 0.35 : st.bulletGravity * (st.homing ? 0.4 : 1)) * SCALE,
          life: 3.4, bounces: st.bounces, pierce: st.pierce,
          wallPierce: st.wallPierce ? 70 + 50 * (st.wallPierce - 1) : 0,
          holePunch: st.holePunch,
          homing: st.homing, steer: st.steer, grow: st.grow, groundHug: st.groundHug,
          explosive: st.explosive, shards: st.shards, chain: st.chain,
          poison: st.poison, burn: st.burn, chill: st.chill, stink: st.stink,
          voidPull: st.voidPull, dazzle: st.dazzle, silence: st.silence,
          bankShot: st.bankShot, boomerang: st.boomerang, empowered: empower,
          golden, hit: new Set(), color: golden || empower ? "#ffd700" : who.color
        });
      }
      // only a real trigger pull spawns echoes — an echo that echoed itself
      // would feed back forever
      if (!ghost) {
        for (let i = 1; i <= st.burstFire; i += 1) who.queue.push({ t: i * 0.09, mul: 0.45 });
        for (let i = 1; i <= st.encore; i += 1) who.queue.push({ t: 0.8 * i, mul: 0.5, angle: ang });
      }
      if (who.ammo <= 0) { who.reloadT = st.reload; if (st.autoBlock) doBlock(who); }
    }

    function blockEffects(who, x, y) {
      const st = who.stats;
      if (st.blockPush) fields.push({ type: "push", owner: who, x, y, r: 110, life: 0.3 });
      if (st.frostBlock) { for (const e of enemies(who)) if (Math.hypot(e.x - x, e.y - y) < 150) e.chillT = 2.5; puff(x, y, "#8fd8ff", 16, 240); }
      if (st.healField) fields.push({ type: "heal", owner: who, x, y, r: 86, life: 3, hps: 10 * st.healField });
      if (st.stormBlock) {
        // a crown of lightning: a bright ring plus forked bolts to everyone in
        // it, held long enough to actually see
        fields.push({ type: "nova", owner: who, x, y, r: 170, life: 0.5 });
        for (let i = 0; i < 9; i += 1) {
          const ang = (i / 9) * Math.PI * 2;
          parts.push({
            bolt: true, x1: x, y1: y,
            x2: x + Math.cos(ang) * 150, y2: y + Math.sin(ang) * 150,
            life: 0.32, max: 0.32, color: "#ffe95e"
          });
        }
        for (const e of enemies(who)) if (Math.hypot(e.x - x, e.y - y) < 170) {
          parts.push({ bolt: true, x1: x, y1: y, x2: e.x, y2: e.y, life: 0.45, max: 0.45, color: "#fff6a8" });
          damage(e, 30, who, e.x - x, e.y - y - 60, false);
          float(e.x, e.y - 60, "ZAP", "#ffe95e");
        }
      }
    }

    function doBlock(who) {
      if (who.blockCd > 0 || who.silenceT > 0) return;
      const st = who.stats;
      who.blockT = st.blockDuration + 0.25;   // held a beat longer so it reads
      who.blockCd = st.blockCooldown;
      puff(who.x, who.y, "#ffffff", 12, 200);
      if (st.decoy) decoys.push({ x: who.x, y: who.y, hp: 20, maxHp: 20, character: who.character, color: who.color, owner: who });
      if (st.warpBlock) { who.x = Math.max(60, Math.min(W - 60, who.x + who.facing * 110)); puff(who.x, who.y, who.color, 14, 240); }
      if (st.blockDash) who.vx += who.facing * 320;
      if (st.blockReload) { who.ammo = st.maxAmmo; who.reloadT = 0; float(who.x, who.y - 56, "RELOADED", "#ffe169"); }
      if (st.sawBlock) fields.push({ type: "saw", owner: who, angle: 0, r: 58, life: 2, dmg: 9 });
      if (st.brickBlock && slabs.length < 2) slabs.push({ x: who.x + who.facing * 78, y: GROUND - 60, w: 96, h: 18, vy: 0 });
      if (st.empowerBlock) { who.empower = st.empowerBlock; float(who.x, who.y - 56, "EMPOWERED", "#ffd700"); }
      blockEffects(who, who.x, who.y);
      if (st.echoBlock) who.echoT = 0.35;
    }

    // ------------------------------------------------------------------ step
    function step(dt) {
      t += dt;
      for (const who of [a, bb]) {
        who.queue = who.queue || [];
        // 2 seconds of position history, so Chronoshift has somewhere to go
        who.past = who.past || [];
        who.past.push({ x: who.x, y: who.y });
        if (who.past.length > Math.round(2 / (1 / 60))) who.past.shift();
        if (who.rewind) { who.rewind.life -= dt; if (who.rewind.life <= 0) who.rewind = null; }
        who.fireT = Math.max(0, who.fireT - dt);
        who.blockT = Math.max(0, who.blockT - dt);
        who.blockCd = Math.max(0, who.blockCd - dt);
        who.stunT = Math.max(0, who.stunT - dt);
        who.silenceT = Math.max(0, who.silenceT - dt);
        who.chillT = Math.max(0, who.chillT - dt);
        if (who.echoT > 0) { who.echoT -= dt; if (who.echoT <= 0) { who.blockT = Math.max(who.blockT, 0.3); blockEffects(who, who.x, who.y); puff(who.x, who.y, "#fff", 10, 180); } }
        if (who.poisonT > 0) {
          who.poisonT -= dt; who.hp = Math.max(1, who.hp - who.dotDps * dt);
          if (Math.random() < dt * 14) parts.push({ x: who.x + rand(-14, 14), y: who.y + rand(-14, 14), vx: rand(-10, 10), vy: rand(-40, -12), life: 0.5, max: 0.5, r: rand(2, 3.5), color: "#63d43a" });
        }
        if (who.burnT > 0) {
          who.burnT -= dt; who.hp = Math.max(1, who.hp - who.dotDps * dt);
          // flames off the body and smoke peeling up, so "burning" reads
          for (let i = 0; i < 2; i += 1) {
            if (Math.random() > dt * 30) continue;
            const a = rand(0, Math.PI * 2), rr = who.stats.radius * rand(0.35, 1);
            parts.push({
              x: who.x + Math.cos(a) * rr, y: who.y + Math.sin(a) * rr * 0.8,
              vx: rand(-20, 20), vy: rand(-120, -60),
              life: 0.4, max: 0.4, r: rand(2.5, 5),
              color: Math.random() < 0.55 ? "#ffcf4d" : "#ff7a26", flame: true
            });
          }
          if (Math.random() < dt * 12) {
            parts.push({
              x: who.x + rand(-11, 11), y: who.y - who.stats.radius * 0.7,
              vx: rand(-14, 14), vy: rand(-60, -30),
              life: 1, max: 1, r: rand(4.5, 8), color: "rgba(70,66,72,0.55)", smoke: true
            });
          }
        }
        if (who.decayPool > 0) { const bite = Math.min(who.decayPool, Math.max(who.decayPool / 3, 3) * dt); who.decayPool -= bite; who.hp = Math.max(0, who.hp - bite); }
        if (who.stats.regen) heal(who, who.stats.regen * dt);
        if (who.stats.hotStreak && who.hotWant) { who.temp = Math.max(who.temp, 25 * who.stats.hotStreak); who.hotWant = false; }
        if (who.temp > 0 && who.stats.hotStreak) who.temp = Math.max(0, who.temp - 10 * dt);
        if (who.reloadT > 0) {
          who.reloadT -= dt;
          if (who.stats.reloadPulse) {
            who.pulse = (who.pulse || 0) + dt;
            if (who.pulse > 0.45) { who.pulse = 0; fields.push({ type: "push", owner: who, x: who.x, y: who.y, r: 80, life: 0.25 }); for (const e of enemies(who)) if (Math.hypot(e.x - who.x, e.y - who.y) < 80) damage(e, 8, who, 0, 0, false); }
          }
          if (who.reloadT <= 0) who.ammo = who.stats.maxAmmo;
        }
        // queued burst echoes / encore ghosts
        for (const q of who.queue) q.t -= dt;
        let guard = 0;
        while (who.queue.length && who.queue[0].t <= 0 && guard++ < 8) {
          const q = who.queue.shift();
          fire(who, q.mul, q.angle ?? null, true);
        }
        // physics
        who.vy += 1500 * SCALE * dt;
        who.x += who.vx * dt; who.y += who.vy * dt;
        const floor = GROUND - who.stats.radius;
        if (who.y >= floor) { who.y = floor; who.vy = 0; who.grounded = true; who.jumps = 1 + who.stats.extraJumps; }
        who.vx *= Math.pow(0.9, dt * 60);
        who.x = Math.max(50, Math.min(W - 50, who.x));
        const foe = enemies(who)[0];
        who.aimX = Math.sign(foe.x - who.x) || who.facing;
        who.facing = who.aimX;
      }

      // slabs fall
      for (const s of slabs) { s.vy += 900 * SCALE * dt; s.y += s.vy * dt; if (s.y > GROUND - s.h / 2) { s.y = GROUND - s.h / 2; s.vy = 0; } }

      // --- scripted beats -------------------------------------------------
      const shooter = plan.holder === "target" ? a : a;   // A always shoots
      const victim = bb;
      // Chronoshift needs a path worth undoing: its holder walks in while
      // taking fire, so the rewind visibly snaps them back to where they stood
      if (plan.stats.active === "chronoshift" && !plan._active) {
        const h = plan.holder === "target" ? bb : a;
        const foe = enemies(h)[0];
        h.vx += Math.sign(foe.x - h.x) * h.stats.speed * SCALE * dt * 3.2;
      }
      if (plan.movementDemo) {
        // the holder runs and hops so speed / jump / stomp read on screen
        const h = plan.holder === "target" ? bb : a;
        h.vx += (Math.sin(t * 1.6) > 0 ? 1 : -1) * h.stats.speed * SCALE * dt * 6;
        if (h.grounded && Math.sin(t * 3.1) > 0.985) { h.vy = -h.stats.jump * SCALE; h.grounded = false; }
      }
      if (shooter.fireT <= 0 && shooter.reloadT <= 0 && shooter.ammo > 0 && shooter.stunT <= 0 && t > 0.7) {
        fire(shooter);
        shooter.fireT = Math.max(0.55, shooter.stats.fireDelay);
      }
      // the receiver blocks incoming fire when blocking is what's on show
      if (plan.blockDemo) {
        const inc = bullets.find(b => b.owner !== bb && Math.hypot(b.x - bb.x, b.y - bb.y) < 105);
        if (inc && bb.blockCd <= 0) doBlock(bb);
      }
      // a mythic active fires itself once, mid-cycle
      const activeHolder = plan.holder === "target" ? bb : a;
      const activeReady = plan.stats.active === "chronoshift"
        ? (activeHolder.hp < activeHolder.maxHp * 0.7 || t > 3.4)
        : t > 1.4;
      if (plan.stats.active && !plan._active && activeReady) {
        plan._active = true;
        const who = plan.holder === "target" ? bb : a;
        if (plan.stats.active === "eventHorizon") {
          // opened on the OTHER fighter, off to their far side, so they are
          // visibly hauled across the floor into it and crushed
          const foe = enemies(who)[0];
          // opened between the two of them (and kept fully in frame), so the
          // victim is hauled bodily across the floor into it
          fields.push({
            type: "void", owner: who,
            x: Math.max(180, Math.min(W - 180, (who.x + foe.x) / 2 + 70)),
            y: foe.y - 30,
            r: 165, life: 3
          });
          float(foe.x, foe.y - 70, "EVENT HORIZON", "#c88fff");
        } else if (plan.stats.active === "chronoshift") {
          // rewind to where they stood 2s ago, leaving a ghost trail of the
          // path being undone, and give the health back
          const past = who.past && who.past[0];
          who.rewind = { from: { x: who.x, y: who.y }, to: past ? { x: past.x, y: past.y } : { x: who.x, y: who.y }, life: 0.9 };
          if (past) { who.x = past.x; who.y = past.y; who.vx = 0; who.vy = 0; }
          heal(who, 35);
          who.blockT = Math.max(who.blockT, 0.4);   // brief grace, as in game
          puff(who.x, who.y, "#8fd8ff", 24, 340);
          float(who.x, who.y - 62, "REWIND +35", "#8fd8ff");
        }
        else for (let i = 0; i < 5; i += 1) bullets.push({
          owner: who, x: victim.x + (i - 2) * 34, y: -20 - i * 30, ox: 0, oy: 0,
          vx: 0, vy: 420, r: 9, damage: 34, gravity: 300 * SCALE, life: 4,
          bounces: 0, pierce: 0, wallPierce: 0, homing: 0, steer: 0, grow: 0, groundHug: 0,
          explosive: 1.2, shards: 0, chain: 0, poison: 0, burn: 1, chill: 0, stink: 0,
          voidPull: 0, dazzle: 0, silence: 0, bankShot: 0, boomerang: 0, empowered: 0,
          golden: false, hit: new Set(), color: "#ff9e3d", meteor: true
        });
      }

      // --- bullets --------------------------------------------------------
      const wl = walls();
      for (const b of bullets) {
        const foe = enemies(b.owner)[0];
        if (b.returning) {
          const o = b.owner;
          const ang = Math.atan2(o.y - b.y, o.x - b.x);
          const sp = Math.hypot(b.vx, b.vy) || 300;
          b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp;
          if (Math.hypot(o.x - b.x, o.y - b.y) < 30) { b.life = -1; o.ammo = Math.min(o.stats.maxAmmo, o.ammo + 1); float(o.x, o.y - 56, "+1 AMMO", "#ffe169"); }
        } else if (b.steer || b.homing) {
          // both are shown as the bullet finding its mark
          const cur = Math.atan2(b.vy, b.vx);
          const want = Math.atan2(foe.y - b.y, foe.x - b.x);
          let dif = want - cur;
          while (dif > Math.PI) dif -= Math.PI * 2;
          while (dif < -Math.PI) dif += Math.PI * 2;
          const rate = Math.min((b.homing * 2.7 || 0) + (b.steer * 3.4 || 0), 7) * dt;
          const ang = cur + Math.max(-rate, Math.min(rate, dif));
          const sp = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp;
        }
        // repel: the holder bends incoming shots away
        if (foe.stats.repel) {
          const dx = b.x - foe.x, dy = b.y - foe.y, d = Math.hypot(dx, dy);
          if (d > 1 && d < 150) {
            const cur = Math.atan2(b.vy, b.vx), away = Math.atan2(dy, dx);
            let dif = away - cur;
            while (dif > Math.PI) dif -= Math.PI * 2;
            while (dif < -Math.PI) dif += Math.PI * 2;
            const rate = Math.min(foe.stats.repel * 1.3, 3) * (1 - d / 150) * dt;
            const ang = cur + Math.max(-rate, Math.min(rate, dif));
            const sp = Math.hypot(b.vx, b.vy);
            b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp;
          }
        }
        if (b.groundHug && b.vy > -20) {
          const gap = GROUND - b.r - 2 - b.y;
          if (Math.abs(gap) < 60) { b.y += gap * Math.min(1, 14 * dt); b.vy = 0; b.hug = true; }
        }
        if (!b.hug) b.vy += b.gravity * dt;
        b.px = b.x; b.py = b.y;
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.life -= dt;
        parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.2, max: 0.2, r: b.r * 0.5, color: b.burn ? "#ff9e3d" : b.color, trail: true });

        if (b.life <= 0 && b.boomerang && !b.returning && !b.hit.size) { b.returning = true; b.life = 2; b.gravity = 0; }

        // walls
        for (const w of wl) {
          if (b.life <= 0 || !hitRect(b.x, b.y, b.r, w)) continue;
          // a hole already bored here is a way through (same doorway rule the
          // game uses: measured across the slab's long axis)
          if (w.holes && w.holes.length) {
            const acrossX = w.w >= w.h;
            const through = w.holes.some(h => {
              const off = acrossX ? Math.abs(b.x - (w.x + h.lx)) : Math.abs(b.y - (w.y + h.ly));
              return off <= Math.max(2, h.r - b.r * 0.62);
            });
            if (through) continue;
          }
          if (b.holePunch && !w.ground && w.holes) {
            const lx = b.x - w.x, ly = b.y - w.y;
            const r = 30 + 8 * (b.holePunch - 1);
            const near = w.holes.find(h => Math.hypot(h.lx - lx, h.ly - ly) < Math.max(h.r, r) * 0.75);
            if (near) near.r = Math.min(w.h * 0.4, Math.hypot(near.r, r));
            else if (w.holes.length < 6) w.holes.push({ lx, ly, r });
            b.life = -1;
            puff(b.x, b.y, "#e8e2d4", 18, 300);
            boom(b);
            continue;
          }
          if (b.wallPierce > 0 && !w.ground) {
            // bore through: walk to the far side, spending thickness
            const mag = Math.hypot(b.vx, b.vy) || 1;
            const dx = b.vx / mag, dy = b.vy / mag;
            let x = b.x, y = b.y, dist = 0, out = false;
            while (dist < b.wallPierce) {
              x += dx * 3; y += dy * 3; dist += 3;
              if (!hitRect(x, y, b.r, w)) { out = true; break; }
            }
            if (out) { b.x = x + dx * 2; b.y = y + dy * 2; b.wallPierce -= dist; puff(b.x, b.y, "#e8e2d4", 6, 130); continue; }
          }
          if (b.bounces > 0) {
            const fromSide = b.px + b.r <= w.x || b.px - b.r >= w.x + w.w;
            if (fromSide) { b.vx = -b.vx * 0.75; b.x += Math.sign(b.vx) * (b.r + 2); }
            else { b.vy = -b.vy * 0.75; b.y += Math.sign(b.vy) * (b.r + 2); }
            b.bounces -= 1; b.hit = new Set();
            if (b.bankShot) { b.homing = Math.max(b.homing, 0.9 * b.bankShot); b.damage *= 1 + 0.3 * b.bankShot; puff(b.x, b.y, "#ffe169", 6, 140); }
            puff(b.x, b.y, "#ffffff", 5, 130);
          } else if (!(b.boomerang && !b.hit.size && (b.returning = true, b.life = 2, b.gravity = 0, true))) {
            b.life = -1; boom(b);
          }
        }

        // decoys eat shots
        for (const d of decoys) {
          if (b.life <= 0 || d.hp <= 0 || d.owner === b.owner) continue;
          if (Math.hypot(d.x - b.x, d.y - b.y) < 26 + b.r) { d.hp -= b.damage; puff(d.x, d.y, d.color, 8, 180); b.life = -1; boom(b); }
        }

        // fighters
        for (const who of [a, bb]) {
          if (b.life <= 0 || who === b.owner || b.hit.has(who)) continue;
          if (Math.hypot(who.x - b.x, who.y - b.y) > who.stats.radius + b.r) continue;
          if (who.blockT > 0) {
            // parried: send it back
            const mag = Math.hypot(b.vx, b.vy) || 1;
            b.vx = -(b.vx / mag) * 340; b.vy = -(b.vy / mag) * 340;
            b.owner = who; b.hit = new Set(); b.color = who.color;
            float(who.x, who.y - 46, "PARRY", "#ffffff");
            continue;
          }
          const travel = Math.hypot(b.x - b.ox, b.y - b.oy);
          const dmg = b.damage * (b.grow ? 1 + Math.min(1, travel / 420) : 1);
          damage(who, dmg, b.owner, b.vx, b.vy);
          if (b.owner.stats.lifesteal) { heal(b.owner, dmg * b.owner.stats.lifesteal); float(b.owner.x, b.owner.y - 56, `+${Math.round(dmg * b.owner.stats.lifesteal)}`, "#74f08b"); }
          if (b.owner.stats.hotStreak) b.owner.hotWant = true;
          if (b.owner.stats.scavenge) { b.owner.ammo = Math.min(b.owner.stats.maxAmmo, b.owner.ammo + 1); float(b.owner.x, b.owner.y - 56, "+1 AMMO", "#ffe169"); }
          if (b.owner.stats.sugarRush) b.owner.sugarT = 2.5;
          if (b.poison || b.burn) { who.poisonT = b.poison ? 3 : 0; who.burnT = b.burn ? 2.5 : 0; who.dotDps = (9 + b.damage * 0.1) * (b.poison || b.burn); }
          if (b.chill) { who.chillT = 2; puff(who.x, who.y, "#8fd8ff", 8, 180); }
          if (b.dazzle) { who.stunT = 0.6; float(who.x, who.y - 60, "STUNNED", "#ffffff"); }
          if (b.silence) { who.silenceT = 1.5; float(who.x, who.y - 60, "SILENCED", "#b8b8c8"); }
          if (b.chain) {
            const third = [a, bb].find(q => q !== who && q !== b.owner);
            if (third) { parts.push({ bolt: true, x1: who.x, y1: who.y, x2: third.x, y2: third.y, life: 0.22, max: 0.22, color: "#ffe95e" }); damage(third, dmg * 0.55, b.owner, 0, 0, false); }
          }
          if (b.empowered) { blockEffects(b.owner, who.x, who.y); b.empowered = 0; }
          b.hit.add(who);
          if (b.pierce > 0) b.pierce -= 1;
          else { b.life = -1; boom(b); }
        }
      }
      bullets = bullets.filter(b => b.life > 0 && b.x > -60 && b.x < W + 60 && b.y < H + 80);

      // fields
      for (const f of fields) {
        f.life -= dt;
        if (f.type === "heal") { const o = f.owner; if (Math.hypot(o.x - f.x, o.y - f.y) < f.r) heal(o, f.hps * dt); }
        if (f.type === "saw") {
          f.angle += dt * 7;
          const o = f.owner;
          f.x = o.x + Math.cos(f.angle) * f.r; f.y = o.y + Math.sin(f.angle) * f.r;
          for (const e of enemies(o)) if (Math.hypot(e.x - f.x, e.y - f.y) < e.stats.radius + 14 && (f.cd || 0) <= 0) { damage(e, f.dmg, o, e.x - o.x, -40, false); f.cd = 0.35; }
          f.cd = Math.max(0, (f.cd || 0) - dt);
        }
        if (f.type === "push") for (const who of [a, bb]) {
          if (who === f.owner) continue;
          const d = Math.hypot(who.x - f.x, who.y - f.y);
          if (d < f.r) { who.vx += ((who.x - f.x) / (d || 1)) * 900 * SCALE * dt; who.vy -= 120 * SCALE * dt; }
        }
        if (f.type === "void" || f.type === "vortex") {
          for (const who of [a, bb]) {
            if (who === f.owner) continue;
            const dx = f.x - who.x, dy = f.y - who.y, d = Math.hypot(dx, dy) || 1;
            if (d < f.r) {
              // hard enough to actually drag them off their feet
              who.vx += (dx / d) * 2600 * SCALE * dt;
              who.vy += (dy / d) * 1500 * SCALE * dt - 260 * SCALE * dt;
              who.hp = Math.max(1, who.hp - 16 * dt);
              if (Math.random() < dt * 8) float(who.x, who.y - 40, "-" + Math.round(16 * 0.5), "#c88fff");
            }
          }
          // debris spiralling in, so the pull is legible even with nobody near
          if (Math.random() < dt * 40) {
            const ang = rand(0, Math.PI * 2), rr = f.r * rand(0.55, 1);
            parts.push({
              x: f.x + Math.cos(ang) * rr, y: f.y + Math.sin(ang) * rr,
              vx: -Math.cos(ang) * 180 - Math.sin(ang) * 120,
              vy: -Math.sin(ang) * 180 + Math.cos(ang) * 120,
              life: 0.5, max: 0.5, r: rand(1.5, 3.5), color: "#d8a8ff", spark: true
            });
          }
        }
        if (f.type === "stink") for (const e of enemies(f.owner)) {
          if (Math.hypot(e.x - f.x, e.y - f.y) < f.r) { e.chillT = 0.5; e.poisonT = 0.6; e.dotDps = 8 * f.stink; }
        }
      }
      fields = fields.filter(f => f.life > 0);
      for (const p of parts) {
        p.life -= dt;
        if (p.trail || p.bolt) continue;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.smoke) { p.vy -= 55 * dt; p.vx *= Math.pow(0.9, dt * 60); }
        else if (p.flame) p.vy -= 120 * dt;
        else if (p.spark) { /* vortex debris flies its own way */ }
        else p.vy += 400 * dt;
      }
      parts = parts.filter(p => p.life > 0);
      for (const f of floaters) { f.life -= dt; f.y -= 26 * dt; }
      floaters = floaters.filter(f => f.life > 0);
      decoys = decoys.filter(d => d.hp > 0);

      // loop the scene once it has made its point
      const quiet = !bullets.length && !fields.length;
      if ((t > 4.6 && quiet) || t > 7.5) { const keep = cycle + 1; reset(); cycle = keep; }
    }

    function boom(b) {
      if (b.stink) fields.push({ type: "stink", owner: b.owner, x: b.x, y: b.y, r: 70, life: 2.5, stink: b.stink });
      if (b.voidPull) fields.push({ type: "vortex", owner: b.owner, x: b.x, y: b.y, r: 80, life: 0.8 });
      if (b.empowered && b.owner) { blockEffects(b.owner, b.x, b.y); b.empowered = 0; }
      if (b.explosive) {
        const share = Math.min(0.6, 0.25 + 0.12 * b.explosive);
        const radius = (105 + b.explosive * 12) * 0.6;
        for (const who of [a, bb]) {
          if (who === b.owner) continue;
          const d = Math.hypot(who.x - b.x, who.y - b.y);
          if (d < radius) {
            const dmg = (1 - d / radius) * (26 + b.explosive * 9) * (b.hit.has(who) ? share : 1);
            damage(who, dmg, b.owner, who.x - b.x, who.y - b.y, false);
          }
        }
        fields.push({ type: "push", owner: b.owner, x: b.x, y: b.y, r: radius, life: 0.22 });
        puff(b.x, b.y, "#ff9e3d", 26, 420);
      }
      if (b.shards && !b.isShard) {
        for (let i = 0; i < b.shards; i += 1) {
          const ang = -Math.PI / 2 + (i - (b.shards - 1) / 2) * 0.55;
          bullets.push({ ...b, isShard: true, x: b.x, y: b.y - 4, ox: b.x, oy: b.y,
            vx: Math.cos(ang) * 260, vy: Math.sin(ang) * 260, r: Math.max(3, b.r * 0.55),
            damage: b.damage * 0.4, life: 1.1, gravity: 700 * SCALE, bounces: 0, pierce: 0,
            explosive: 0, shards: 0, boomerang: 0, hit: new Set() });
        }
      }
      puff(b.x, b.y, b.color, b.explosive ? 16 : 8, b.explosive ? 320 : 180);
    }

    // ----------------------------------------------------------------- draw
    function drawFighter(who) {
      const ch = who.character;
      ctx.save();
      ctx.translate(who.x, who.y);
      if (who.chillT > 0) { ctx.shadowColor = "#8fd8ff"; ctx.shadowBlur = 16; }
      if (who.burnT > 0) { ctx.shadowColor = "#ff7a26"; ctx.shadowBlur = 18 + Math.sin(t * 22) * 6; }
      if (who.stunT > 0) ctx.rotate(Math.sin(t * 40) * 0.07);
      if (ch && window.ROUNDERS.drawCharacter) {
        window.ROUNDERS.drawCharacter(ctx, ch, who.stats.radius, { t, aimX: who.aimX, aimY: who.aimY });
      } else {
        ctx.fillStyle = who.color;
        ctx.beginPath(); ctx.arc(0, 0, who.stats.radius, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      // block bubble
      if (who.blockT > 0) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(who.x, who.y, who.stats.radius + 12, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.13)"; ctx.fill();
        ctx.restore();
      }
      if (who.shield > 0) {
        ctx.save();
        ctx.strokeStyle = "rgba(127,216,255,0.85)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(who.x, who.y, who.stats.radius + 7, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      // health bar (this is where damage/health cards read)
      const w = Math.max(34, Math.min(120, 52 * (who.maxHp / 100)));
      const x = who.x - w / 2, y = who.y - who.stats.radius - 22;
      ctx.fillStyle = "rgba(10,8,18,0.75)";
      ctx.beginPath(); ctx.roundRect(x, y, w, 7, 3.5); ctx.fill();
      const frac = Math.max(0, who.hp / who.maxHp);
      if (frac > 0) {
        ctx.fillStyle = frac < 0.28 ? "#ff5a6e" : who.color;
        ctx.beginPath(); ctx.roundRect(x + 1.5, y + 1.5, Math.max(2, (w - 3) * frac), 4, 2); ctx.fill();
      }
      const temp = who.temp + who.shield;
      if (temp > 0) {
        ctx.fillStyle = who.shield > 0 ? "#7fd8ff" : "#ffd76e";
        ctx.beginPath(); ctx.roundRect(x + 1, y - 5, Math.max(2, (w - 2) * Math.min(1, temp / who.maxHp)), 3, 1.5); ctx.fill();
      }
      if (who.decayPool > 0) {
        ctx.fillStyle = "rgba(200,143,255,0.85)";
        ctx.beginPath(); ctx.roundRect(x + 1, y + 8, Math.max(2, (w - 2) * Math.min(1, who.decayPool / who.maxHp)), 2.5, 1.2); ctx.fill();
      }
      // ammo pips
      const n = Math.min(10, Math.round(who.stats.maxAmmo));
      const filled = who.reloadT > 0 ? (1 - who.reloadT / who.stats.reload) * n : who.ammo;
      for (let i = 0; i < n; i += 1) {
        ctx.beginPath();
        ctx.arc(x + 3 + i * 7, y - 10, i < filled ? 2.6 : 1.8, 0, Math.PI * 2);
        ctx.fillStyle = i < filled ? "#ffe169" : "rgba(255,255,255,0.22)";
        ctx.fill();
      }
      if (who.holder) {
        // under the feet, where floating damage numbers never land
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = "700 10px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("HAS THE CARD", who.x, GROUND + 20);
      }
    }

    function draw() {
      const sx = canvas.width / W, sy = canvas.height / H;
      ctx.save();
      ctx.scale(sx, sy);
      // backdrop
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#232838"); g.addColorStop(1, "#12141c");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // ground + walls
      for (const w of walls()) {
        const holes = w.holes && w.holes.length ? w.holes : null;
        ctx.save();
        if (holes) {
          // even-odd clip so the bored holes are genuinely missing
          ctx.beginPath();
          ctx.rect(w.x - 6, w.y - 6, w.w + 12, w.h + 12);
          for (const h of holes) {
            ctx.moveTo(w.x + h.lx + h.r, w.y + h.ly);
            ctx.arc(w.x + h.lx, w.y + h.ly, h.r, 0, Math.PI * 2);
          }
          ctx.clip("evenodd");
        }
        ctx.fillStyle = w.ground ? "#3a4152" : w.slab ? "#6d6152" : "#4a5266";
        ctx.beginPath(); ctx.roundRect(w.x, w.y, w.w, w.h, w.ground ? 0 : 5); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.fillRect(w.x, w.y, w.w, 3);
        ctx.restore();
        if (holes) for (const h of holes) {
          ctx.strokeStyle = "rgba(20,16,12,0.75)"; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(w.x + h.lx, w.y + h.ly, h.r, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = "rgba(255,210,150,0.3)"; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(w.x + h.lx, w.y + h.ly, h.r - 2, 0, Math.PI * 2); ctx.stroke();
        }
      }
      // fields
      for (const f of fields) {
        if (f.type === "heal") {
          ctx.strokeStyle = `rgba(200,255,110,${0.5 * Math.min(1, f.life)})`; ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        } else if (f.type === "saw") {
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(t * 16);
          ctx.fillStyle = "#c8ccd8"; ctx.beginPath();
          for (let i = 0; i < 10; i += 1) {
            const a1 = (i / 10) * Math.PI * 2, a2 = ((i + 0.5) / 10) * Math.PI * 2;
            ctx.lineTo(Math.cos(a1) * 13, Math.sin(a1) * 13);
            ctx.lineTo(Math.cos(a2) * 8, Math.sin(a2) * 8);
          }
          ctx.closePath(); ctx.fill(); ctx.restore();
        } else if (f.type === "void" || f.type === "vortex") {
          const a01 = Math.min(1, f.life);
          const rg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
          rg.addColorStop(0, "rgba(6,3,14,0.96)");
          rg.addColorStop(0.35, "rgba(90,30,170,0.55)");
          rg.addColorStop(0.7, `rgba(150,70,230,${0.3 * a01})`);
          rg.addColorStop(1, "rgba(120,40,200,0)");
          ctx.fillStyle = rg;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
          // spinning accretion arcs
          ctx.save();
          ctx.translate(f.x, f.y);
          ctx.rotate(t * 3.4);
          ctx.strokeStyle = `rgba(216,168,255,${0.75 * a01})`;
          for (let i = 0; i < 3; i += 1) {
            ctx.lineWidth = 3 - i * 0.6;
            ctx.beginPath();
            ctx.arc(0, 0, f.r * (0.3 + i * 0.2), i * 1.9, i * 1.9 + Math.PI * 1.25);
            ctx.stroke();
          }
          ctx.restore();
          // hard event-horizon rim
          ctx.strokeStyle = `rgba(255,255,255,${0.5 * a01})`;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.3, 0, Math.PI * 2); ctx.stroke();
        } else if (f.type === "stink") {
          ctx.fillStyle = `rgba(110,190,60,${0.22 * Math.min(1, f.life)})`;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        } else if (f.type === "nova") {
          const k = 1 - Math.max(0, f.life) / 0.5;
          ctx.save();
          ctx.strokeStyle = `rgba(255,233,94,${(1 - k) * 0.95})`;
          ctx.lineWidth = 6 * (1 - k) + 1.5;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.25 + k * 0.85), 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.7})`;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.25 + k * 0.7), 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        } else if (f.type === "push") {
          ctx.strokeStyle = `rgba(255,255,255,${0.35 * Math.min(1, f.life / 0.25)})`; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.2 - f.life), 0, Math.PI * 2); ctx.stroke();
        }
      }
      for (const d of decoys) {
        ctx.save(); ctx.globalAlpha = 0.6; ctx.translate(d.x, d.y);
        if (d.character && window.ROUNDERS.drawCharacter) window.ROUNDERS.drawCharacter(ctx, d.character, 24, { t, aimX: 1, aimY: 0 });
        ctx.restore();
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "600 9px system-ui"; ctx.textAlign = "center";
        ctx.fillText("DECOY", d.x, d.y - 34);
      }
      for (const p of parts) {
        const al = p.life / p.max;
        if (p.bolt) {
          // forked, with a glow, so a zap reads at a glance
          ctx.save();
          ctx.globalAlpha = al;
          ctx.shadowColor = p.color; ctx.shadowBlur = 10;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(p.x1, p.y1);
          const segs = 4;
          for (let i = 1; i < segs; i += 1) {
            const k = i / segs;
            const mx = p.x1 + (p.x2 - p.x1) * k, my = p.y1 + (p.y2 - p.y1) * k;
            const nx = -(p.y2 - p.y1), ny = p.x2 - p.x1;
            const nl = Math.hypot(nx, ny) || 1;
            const j = (i % 2 ? 1 : -1) * 9 * (1 - k);
            ctx.lineTo(mx + (nx / nl) * j, my + (ny / nl) * j);
          }
          ctx.lineTo(p.x2, p.y2);
          ctx.stroke();
          ctx.restore();
        } else if (p.smoke) {
          ctx.globalAlpha = al * 0.55; ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.6 - al * 0.6), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        } else if (p.flame) {
          ctx.globalAlpha = al; ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * al * 1.15, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = al * 0.4; ctx.fillStyle = "#ffe9a8";
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * al * 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          ctx.globalAlpha = al; ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        }
      }
      // The bullet viewer's size/rotation tweaks are read live (opts.tweak is a
      // getter, not a snapshot), so dragging a slider re-sizes the rounds in
      // flight here without restarting the fight.
      const tweak = (opts.tweak && opts.tweak()) || null;
      const tScale = tweak && tweak.scale ? tweak.scale : 1;
      const tRot = tweak && tweak.rotation ? tweak.rotation * Math.PI / 180 : 0;
      for (const b of bullets) {
        ctx.save();
        if (b.golden || b.empowered) { ctx.shadowColor = "#ffd700"; ctx.shadowBlur = 12; }
        ctx.fillStyle = b.color; ctx.strokeStyle = "#15121c"; ctx.lineWidth = 2;
        const gr = b.grow ? 1 + Math.min(0.7, Math.hypot(b.x - b.ox, b.y - b.oy) / 600) : 1;
        const r = b.r * gr * tScale;
        if (tRot || b.art) {
          // a tweaked round is drawn in its own frame, turned to its flight
          // path plus the tweak, so rotation is visible on a moving bullet
          ctx.translate(b.x, b.y);
          ctx.rotate(Math.atan2(b.vy, b.vx) + tRot);
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          // a nose mark, so the rotation you dialled in is actually legible
          ctx.fillStyle = "rgba(255,255,255,0.65)";
          ctx.beginPath(); ctx.arc(r * 0.45, 0, Math.max(1.2, r * 0.22), 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
      }
      // Chronoshift: the undone path, drawn as a fading ghost of the fighter
      for (const who of [a, bb]) {
        if (!who.rewind) continue;
        const k = Math.max(0, who.rewind.life) / 0.9;
        const { from, to } = who.rewind;
        ctx.save();
        ctx.strokeStyle = `rgba(143,216,255,${0.8 * k})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 6]);
        ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
        ctx.setLineDash([]);
        // the ghost they left behind, where the damage happened
        ctx.globalAlpha = 0.45 * k;
        ctx.translate(from.x, from.y);
        if (who.character && window.ROUNDERS.drawCharacter) {
          window.ROUNDERS.drawCharacter(ctx, who.character, who.stats.radius, { t, aimX: who.aimX, aimY: 0 });
        }
        ctx.restore();
        // an arrow head at the destination so the direction of the rewind reads
        ctx.save();
        ctx.globalAlpha = k;
        ctx.fillStyle = "#8fd8ff";
        ctx.font = "800 12px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("◀ 2s", (from.x + to.x) / 2, (from.y + to.y) / 2 - 34);
        ctx.restore();
      }
      drawFighter(a); drawFighter(bb);
      for (const f of floaters) {
        ctx.globalAlpha = Math.min(1, f.life / 0.5);
        ctx.fillStyle = f.color; ctx.font = "800 13px system-ui, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(f.text, f.x, f.y); ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    let lastT = 0;
    function frame(now) {
      if (!running) return;
      const dt = Math.min(0.032, (now - lastT) / 1000) * TIME;
      lastT = now;
      step(dt || 0.016);
      draw();
      raf = requestAnimationFrame(frame);
    }

    reset();
    return {
      plan,
      start() { if (running) return; running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); },
      stop() { running = false; cancelAnimationFrame(raf); },
      replay() { reset(); plan._active = false; draw(); },
      drawOnce() { draw(); },
      // headless stepping, so the preview can be checked without a display
      step(dt) { step(dt); },
      // for the workbench's own checks: who is on screen and how they're doing
      inspect: () => ({
        shooter: { hp: a.hp, maxHp: a.maxHp, ammo: a.ammo },
        target: { hp: bb.hp, maxHp: bb.maxHp, shield: bb.shield, temp: bb.temp },
        bullets: bullets.map(b => ({ x: Math.round(b.x), y: Math.round(b.y), vx: Math.round(b.vx), vy: Math.round(b.vy), hug: Boolean(b.hug) })),
        fields: fields.length, cycle,
        pos: { ax: Math.round(a.x), ay: Math.round(a.y), bx: Math.round(bb.x), by: Math.round(bb.y) }
      })
    };
  }

  // Draw one bullet the way the game draws it, pointing right, centred at
  // (0,0) in the current transform. `art` is an optional loaded image that
  // replaces the procedural round; scale/rot are the viewer's tweaks.
  function drawBullet(ctx, spec, opts = {}) {
    const scale = opts.scale ?? 1;
    const rot = (opts.rotation ?? 0) * Math.PI / 180;
    const r = spec.r * scale;
    ctx.save();
    ctx.rotate(rot);
    if (opts.art) {
      const d = r * 2;
      ctx.drawImage(opts.art, -d / 2, -d / 2, d, d);
      ctx.restore();
      return;
    }
    if (spec.golden || spec.explosive) { ctx.shadowColor = spec.golden ? "#ffd700" : "#ff7a3d"; ctx.shadowBlur = 14; }
    const color = spec.burn ? "#ff9e3d" : spec.poison ? "#63d43a" : spec.chill ? "#8fd8ff" : spec.color;
    ctx.fillStyle = color;
    ctx.strokeStyle = "#15121c";
    ctx.lineWidth = 3;
    if (spec.pierce || spec.wallPierce) {
      // drill slugs read as elongated along their flight
      ctx.beginPath();
      ctx.roundRect(-r * 1.9, -r * 0.72, r * 3.8, r * 1.44, r * 0.7);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath(); ctx.roundRect(r * 0.5, -r * 0.3, r * 1.1, r * 0.6, r * 0.3); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    if (spec.poison) {
      ctx.strokeStyle = "rgba(99,212,58,0.9)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, Math.PI * 2); ctx.stroke();
    }
    if (spec.chill) {
      ctx.strokeStyle = "rgba(143,216,255,0.95)"; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i += 1) {
        const a = (i / 3) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5));
        ctx.stroke();
      }
    }
    if (spec.holePunch) {
      ctx.strokeStyle = "rgba(232,226,212,0.9)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r + 5, -0.6, 0.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r + 5, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
    }
    if (spec.chain) {
      ctx.strokeStyle = "rgba(255,233,94,0.9)"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r - 2, -r); ctx.lineTo(-r - 8, 0); ctx.lineTo(-r - 2, r);
      ctx.stroke();
    }
    ctx.restore();
  }

  window.ROUNDERS.CARD_SIM = { createSim, planFor, statsFor, baseStats, bulletSpec, bulletRadius, drawBullet };
})();
